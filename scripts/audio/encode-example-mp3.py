"""Persistent local MP3 encoder; JSON-lines stdin/stdout, no network calls.

Using one process avoids repeatedly starting a media executable for thousands of
short sentences. Requires lameenc==1.9.0. No raw WAV files are retained.
"""
import base64, io, json, os, sys, wave
import lameenc

for line in sys.stdin:
    item = json.loads(line)
    try:
        with wave.open(io.BytesIO(base64.b64decode(item['wav'])),'rb') as wav:
            assert wav.getnchannels()==1 and wav.getframerate()==24000 and wav.getsampwidth()==2
            pcm = wav.readframes(wav.getnframes())
        encoder = lameenc.Encoder()
        encoder.set_bit_rate(64)
        encoder.set_in_sample_rate(24000)
        encoder.set_out_sample_rate(24000)
        encoder.set_channels(1)
        encoder.set_quality(2)
        data = encoder.encode(pcm) + encoder.flush()
        temporary = item['target']+'.tmp.mp3'
        with open(temporary,'wb') as stream:
            stream.write(data)
        os.replace(temporary,item['target'])
        result = dict(id=item['id'],ok=True)
    except Exception as error:
        result = dict(id=item['id'],ok=False,error=str(error))
    print(json.dumps(result),flush=True)
