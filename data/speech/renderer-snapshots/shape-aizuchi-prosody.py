"""Shape only the final voiced vowel with WORLD, then measure the rendered WAV.

Dependencies: numpy, pyworld. Input/output are temporary local files supplied by
generate-aizuchi-voicevox.cjs. Original samples outside the edited interval remain
unchanged. Pitch verification is not a test of emotion or linguistic correctness.
"""
import json, sys, wave
import numpy as np
import pyworld as pw

wav_path, config_path = sys.argv[1:]
config = json.load(open(config_path, encoding='utf-8'))
query, contour = config['query'], config['contour']
with wave.open(wav_path, 'rb') as wav:
    sr = wav.getframerate()
    assert sr == 24000 and wav.getnchannels() == 1 and wav.getsampwidth() == 2
    x = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(np.float64) / 32768

# Map requested phoneme durations to actual sample duration (the engine quantizes
# durations to synthesis frames). Locate a voiced vowel rather than trailing /s/.
cursor = query['prePhonemeLength']
vowels = []
group_ends = []
for phrase in query['accent_phrases']:
    for mora in phrase['moras']:
        cursor += mora.get('consonant_length') or 0
        if mora['pitch'] > 0:
            vowels.append((cursor, cursor + mora['vowel_length'], mora['pitch']))
        cursor += mora['vowel_length']
    if phrase.get('pause_mora'):
        if vowels:
            group_ends.append(vowels[-1])
        cursor += phrase['pause_mora']['vowel_length']
scale = (len(x) / sr) / (cursor + query['postPhonemeLength'])
f0, times = pw.harvest(x, sr, f0_floor=160, f0_ceil=700, frame_period=5)
f0 = pw.stonemask(x, f0, times, sr)
target = f0.copy()
regions = []
requested = []
if config['rank'] in [9,47,49,94,95,96,100]:
    requested.extend((v, '緩降 ↘') for v in group_ends if v != vowels[-1])
requested.append((vowels[-1],contour))
for (begin,end,pitch),direction in requested:
    begin,end = begin*scale,end*scale
    begin += min(.012,(end-begin)*.08)
    end -= min(.008,(end-begin)*.05)
    assert end-begin > .065, 'Insufficient voiced duration for contour'
    mask = (times >= begin) & (times <= end)
    near = f0[(times >= begin-.04) & (times <= end) & (f0 > 200) & (f0 < 600)]
    anchor = float(np.median(near)) if len(near) >= 4 else float(np.exp(pitch))
    anchor = float(np.clip(anchor,260,500))
    rising = '尾升' in direction or direction == '短升 ↗'
    arc = '先升後降' in direction or '輕升後收' in direction
    holding = '平持' in direction or '前降後平持' in direction
    phase = np.clip((times[mask]-begin)/(end-begin),0,1)
    if rising:
        semitones = np.interp(phase,[0,1],[-1,4])
    elif holding:
        semitones = np.interp(phase,[0,1],[0,-.2])
    elif arc:
        semitones = np.interp(phase,[0,.38,1],[-.5,2.5,-3])
    else:
        semitones = np.interp(phase,[0,1],[1,-4])
    target[mask] = anchor*2**(semitones/12)
    regions.append((begin,end,direction,rising,holding,arc))
spectrum = pw.cheaptrick(x, target, times, sr)
aperiodicity = pw.d4c(x, target, times, sr)
# A voiced vowel may have a breathy/creaky ending with an unreliable F0. Restore
# periodic energy locally, leaving high-frequency breath/noise and other phonemes.
low_bins = int(4000 / (sr / 2) * (aperiodicity.shape[1]-1))
for begin,end,*_ in regions:
    mask = (times >= begin) & (times <= end)
    aperiodicity[mask,:low_bins] = np.minimum(aperiodicity[mask,:low_bins],.12)
rendered = pw.synthesize(target, spectrum, aperiodicity, sr, frame_period=5)
rendered = rendered[:len(x)]
if len(rendered) < len(x):
    rendered = np.pad(rendered, (0,len(x)-len(rendered)))
sample_times = np.arange(len(x))/sr
blend = np.zeros(len(x))
for begin,end,*_ in regions:
    local = np.clip(np.minimum((sample_times-begin)/.015,(end-sample_times)/.015),0,1)
    blend = np.maximum(blend,.5-.5*np.cos(np.pi*local))
output = x*(1-blend) + rendered*blend
peak = float(np.max(np.abs(output)))
assert peak < 1, 'Pitch shaping caused clipping'
pcm = np.clip(np.rint(output*32768),-32768,32767).astype('<i2')

# Verify the actual waveform, not just the requested F0 or VOICEVOX query.
actual, at = pw.harvest(pcm.astype(np.float64)/32768, sr, f0_floor=160, f0_ceil=700, frame_period=5)
actual = pw.stonemask(pcm.astype(np.float64)/32768, actual, at, sr)
measurements = []
for begin,end,direction,rising,holding,arc in regions:
    margin = min(.012,(end-begin)*.08)
    valid = (at >= begin+margin) & (at <= end-margin) & (actual > 200) & (actual < 650)
    ph = (at[valid]-begin)/(end-begin)
    values = actual[valid]
    assert len(values) >= 5, f'Unable to measure final vowel: {len(values)} voiced frames'
    early,late = values[ph <= .35],values[ph >= .7]
    assert len(early) >= 2 and len(late) >= 2, 'Insufficient endpoint pitch measurements'
    start_hz,end_hz = float(np.median(early)),float(np.median(late))
    delta = float(12*np.log2(end_hz/start_hz))
    if rising:
        passed = delta > 1.5
    elif holding:
        passed = abs(delta) < 1.5
    elif arc:
        middle = values[(ph >= .3) & (ph <= .5)]
        peak_hz = float(np.median(middle)) if len(middle) else 0
        passed = peak_hz > start_hz*1.02 and peak_hz > end_hz*1.08
    else:
        passed = delta < -1.5
    result = dict(method='WORLD Harvest + StoneMask, measured after rendering',contour=direction,
                  intervalSeconds=[round(begin,4),round(end,4)],startHz=round(start_hz,1),
                  endHz=round(end_hz,1),deltaSemitones=round(delta,2),
                  voicedFrames=int(len(values)),passed=bool(passed))
    if arc:
        result['peakHz'] = round(peak_hz,1)
    assert passed, 'Rendered contour mismatch: '+json.dumps(result)
    measurements.append(result)
with wave.open(wav_path, 'wb') as wav:
    wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(sr);wav.writeframes(pcm.tobytes())
print(json.dumps({**measurements[-1],'segments':measurements}))
