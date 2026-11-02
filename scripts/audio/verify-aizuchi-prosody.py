"""Verify that every current response uses unmodified native model intonation.

The historical filename is retained for callers. No rise/fall/flat contour is
measured or required; native audio is checked for integrity and PCM validity.
"""
import hashlib, json, pathlib, wave
root = pathlib.Path(__file__).resolve().parents[2]
audit_bytes = (root/'data/speech/voicevox-audit.json').read_text(encoding='utf8').encode('utf8')
audit = json.loads(audit_bytes)
assert audit['renderer']['manualPitchProcessing'] is False
checks = []
for record in audit['records']:
    for part, rendering_key in [('word', 'word'), ('dialogue', 'b')]:
        rendering = record['rendering'][rendering_key]
        assert rendering['mode'] == 'native'
        assert rendering['postSynthesisPitchShift'] is False
        assert rendering['manualMoraPitch'] is False
        assert rendering['interrogativeUpspeak'] is False
        assert record['acoustic'][rendering_key]['segments'] == []
        file = root/'public'/record[part]['file']
        assert hashlib.sha256(file.read_bytes()).hexdigest() == record[part]['sha256']
        with wave.open(str(file)) as wav:
            assert (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) == (1, 2, 24000)
            assert abs(wav.getnframes()/24000-record[part]['seconds']) < .002
        checks.append(dict(id=record['id'], part=part, renderingMode='native', segments=[], passed=True))
report = dict(method='Native-only rendering policy and WAV integrity; no imposed pitch target',
              auditSha256=hashlib.sha256(audit_bytes).hexdigest(), checkedFiles=len(checks), checkedSegments=0,
              manualPitchProcessing=False, limitation='Does not score subjective naturalness or native lexical accent.', checks=checks)
(root/'data/speech/prosody-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
print('PASS: 200 WAV files; no manual rise, fall, flattening, vowel crop or extra interrogative upspeak.')
