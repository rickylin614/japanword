"""Read-only WAV verification using DIO (different from the rendering check).

Writes only speech/prosody-check.json, never audio. Requires numpy and pyworld.
"""
import hashlib, json, pathlib, wave
import numpy as np
import pyworld as pw

root = pathlib.Path(__file__).resolve().parents[2]
audit_bytes = (root/'data/speech/voicevox-audit.json').read_text(encoding='utf-8').encode('utf-8')
audit = json.loads(audit_bytes)
checks = []
for record in audit['records']:
    for part in ['word','dialogue']:
        file = root/'public'/record[part]['file']
        assert hashlib.sha256(file.read_bytes()).hexdigest() == record[part]['sha256']
        with wave.open(str(file),'rb') as wav:
            sr = wav.getframerate()
            data = np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2').astype(np.float64)/32768
        if part == 'dialogue':
            offset = record['dialogueSegments']['aSeconds'] + record['dialogueSegments']['pauseSeconds']
            data = data[round(offset*sr):].copy()
        f0,times = pw.dio(data,sr,f0_floor=160,f0_ceil=700,frame_period=5)
        f0 = pw.stonemask(data,f0,times,sr)
        key = 'word' if part == 'word' else 'b'
        segments = []
        for expected in record['acoustic'][key]['segments']:
            begin,end = expected['intervalSeconds']
            margin = min(.012,(end-begin)*.08)
            mask = (times >= begin+margin) & (times <= end-margin) & (f0>200) & (f0<650)
            phase = (times[mask]-begin)/(end-begin)
            pitch = f0[mask]
            # DIO can mark the fading/breathy end unvoiced. Compare the first and
            # last quartiles of actually measurable voiced frames, and report
            # their true span rather than pretending the silent tail has F0.
            quartile = max(2,len(pitch)//4)
            early,late = pitch[:quartile],pitch[-quartile:]
            assert len(early)>=2 and len(late)>=2, (record['id'],part,'unmeasurable')
            first,last = float(np.median(early)),float(np.median(late))
            delta = float(12*np.log2(last/first))
            c = expected['contour']
            if '尾升' in c or c == '短升 ↗':
                passed = delta>1.5
            elif '平持' in c or '前降後平持' in c:
                passed = abs(delta)<1.5
            elif '先升後降' in c or '輕升後收' in c:
                peak = float(np.median(pitch[(phase>=.3)&(phase<=.5)]))
                passed = peak>first*1.02 and peak>last*1.08
            else:
                passed = delta< -1.5
            segments.append(dict(contour=c,voicedIntervalSeconds=[round(float(times[mask][0]),4),round(float(times[mask][-1]),4)],startHz=round(first,1),endHz=round(last,1),deltaSemitones=round(delta,2),passed=bool(passed)))
            assert passed,(record['id'],part,segments[-1])
        checks.append(dict(id=record['id'],part=part,segments=segments))
report = dict(method='Independent DIO + StoneMask estimation of final-vowel waveform pitch',
              auditSha256=hashlib.sha256(audit_bytes).hexdigest(),
              checkedFiles=len(checks),checkedSegments=sum(len(c['segments']) for c in checks),
              limitation='Validates acoustic pitch direction, not emotion, lexical accent or native naturalness.',checks=checks)
(root/'data/speech/prosody-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"PASS: {report['checkedFiles']} WAV files / {report['checkedSegments']} voiced intervals checked with DIO, without changing audio.")
