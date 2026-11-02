"""Read-only acoustic regression checks for the three repaired interjections.

Periodicity checks catch weak/noisy vowel synthesis; they do not certify listening
quality, emotion or native naturalness. Dependencies: requirements-voicevox.txt.
"""
import hashlib, json, pathlib, wave
import numpy as np
import pyworld as pw

root = pathlib.Path(__file__).resolve().parents[2]
audit_bytes = (root/'data/speech/voicevox-audit.json').read_text(encoding='utf8').encode('utf8')
audit = json.loads(audit_bytes)
records = []
for rank, minimum in [(6, .65), (10, .55), (28, .4)]:
    record = next(r for r in audit['records'] if r['rank'] == rank)
    rendering = record['rendering']['word']
    assert rendering['postSynthesisPitchShift'] is False
    file = root/'public'/record['word']['file']
    assert hashlib.sha256(file.read_bytes()).hexdigest() == record['word']['sha256']
    with wave.open(str(file)) as wav:
        sr = wav.getframerate()
        x = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(float)/32768
    f0, times = pw.dio(x, sr, f0_floor=160, f0_ceil=700, frame_period=5)
    f0 = pw.stonemask(x, f0, times, sr)
    periodicity = []
    for start in range(0, len(x)-960, 240):
        frame = x[start:start+960]
        if np.sqrt(np.mean(frame*frame)) < .015:
            continue
        frame = frame-frame.mean()
        acf = np.correlate(frame, frame, 'full')[len(frame)-1:]
        periodicity.append(float(max(acf[34:151])/acf[0]))
    value = float(np.median(periodicity))
    voiced_frames = int(sum(f0 > 180))
    assert value > minimum and voiced_frames >= 25, (rank, value, voiced_frames)
    records.append(dict(rank=rank, file=record['word']['file'], sha256=record['word']['sha256'],
                        mode=rendering['mode'], medianPeriodicity=round(value, 4),
                        minimumPeriodicity=minimum, voicedFrames=voiced_frames, passed=True))
report = dict(auditSha256=hashlib.sha256(audit_bytes).hexdigest(),
              method='DIO + StoneMask voiced frames; median normalized autocorrelation in active 40ms windows',
              limitation='Checks signal periodicity and voicing, not subjective absence of noise or naturalness.', records=records)
(root/'data/speech/aizuchi-vowel-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
print('PASS: three native interjections have measurable voiced vowels and pass periodicity regression limits.')
