# Build timing.json for a reel: key-word times, subtitle phrases, mouth cues (from loudness). Usage: timing.py dir keys.json
import json, sys, wave, re, numpy as np
d = sys.argv[1]; keys = json.load(open(sys.argv[2]))
ww = json.load(open(f"{d}/words.json"))
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
# script words carry the text; Whisper words carry the times (matched with difflib, gaps interpolated)
import difflib
sw = open(f"{d}/script.txt").read().replace("sovereignwebsite dot A I", "sovereignwebsite.ai").split()
wn = []; wt = []
for w in ww:
    for part in (["we","are"] if norm(w[0])=="were" else [norm(w[0])]): wn.append(part); wt.append((w[1], w[2]))
sn = [norm(x) for x in sw]; mp = {}
for b in difflib.SequenceMatcher(None, sn, wn, autojunk=False).get_matching_blocks():
    for k in range(b.size): mp[b.a+k] = wt[b.b+k]
known = sorted(mp); words = []
for i, x in enumerate(sw):
    if i in mp: a_, b_ = mp[i]
    else:
        prev = max([k for k in known if k < i], default=None); nxt = min([k for k in known if k > i], default=None)
        t0 = mp[prev][1] if prev is not None else 0.0; t1 = mp[nxt][0] if nxt is not None else t0 + 0.4
        a_ = t0; b_ = t1
    words.append([x, a_, b_])
print("matched", len(mp), "of", len(sw))
# key times: each key is a list of words to find in order after the previous key
times = {}; pos = 0
for name, phrase in keys:
    ph = [norm(x) for x in phrase.split()]
    for i in range(pos, len(words)):
        if [norm(w[0]) for w in words[i:i+len(ph)]] == ph:
            times[name] = words[i][1]; pos = i + 1; break
    else: raise SystemExit("key not found: " + name)
# subtitles: phrases of up to 6 words, broken after punctuation
subs = []; cur = []
for w in words:
    cur.append(w)
    if len(cur) >= 6 or re.search(r"[.,?!]$", w[0]) and len(cur) >= 3 or re.search(r"[.?!]$", w[0]):
        subs.append(cur); cur = []
if cur: subs.append(cur)
subs = [{"t0": s[0][1], "t1": s[-1][2], "words": [[w[0], w[1], w[2]] for w in s]} for s in subs]
# mouth cues from loudness, 60 ms steps
with wave.open(f"{d}/voice.wav") as wv: sr = wv.getframerate(); a = np.frombuffer(wv.readframes(wv.getnframes()), dtype=np.int16).astype(np.float32) / 32768
step = 0.06; n = int(len(a) / sr / step); cues = []; shapes = "BCDEFC"
rms = np.array([np.sqrt(np.mean(a[int(i*step*sr):int((i+1)*step*sr)]**2) + 1e-9) for i in range(n)]); top = np.percentile(rms, 95)
for i in range(n):
    r = rms[i] / top
    v = "X" if r < 0.08 else ("B" if r < 0.25 else shapes[(i * 7) % len(shapes)] if r < 0.7 else ("D" if i % 2 else "E"))
    if cues and cues[-1]["value"] == v: cues[-1]["end"] = round((i+1)*step, 3)
    else: cues.append({"start": round(i*step, 3), "end": round((i+1)*step, 3), "value": v})
dur = len(a) / sr
json.dump({"duration": dur, "keys": times, "subs": subs, "mouth": cues}, open(f"{d}/timing.json", "w"))
print(d, round(dur, 2), "s", len(subs), "subtitle phrases", len(cues), "mouth cues"); print(json.dumps({k: round(v, 2) for k, v in times.items()}))
