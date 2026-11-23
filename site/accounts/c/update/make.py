# studio.c update pipeline, step 3: storyboard.json -> voiced, animated Reel in a post folder. Apache-2.0.
# Usage: python3 make.py <storyboard.json> <workdir> <post-folder-out>
# Needs: OPENROUTER_API_KEY in the environment (never printed), the presenters library checked out (see RUNBOOK.md),
# ffmpeg, faster-whisper, Playwright with Chromium.
import json, sys, os, re, subprocess, shutil, difflib, datetime, time
HERE = os.path.dirname(os.path.abspath(__file__))
sb_path, work, post = sys.argv[1:4]
sb = json.load(open(sb_path)); os.makedirs(work, exist_ok=True); os.makedirs(post, exist_ok=True)
_ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
_TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
def _num(n):
    n = int(n)
    if n < 20: return _ONES[n]
    if n < 100: return _TENS[n // 10] + ("" if n % 10 == 0 else " " + _ONES[n % 10])
    if n < 1000: return _ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + _num(n % 100))
    return str(n)
ALIAS = {"dennis": "dinis", "denis": "dinis", "deanie": "dinis"}
def norm(s):
    w = re.sub(r"[^a-z0-9]", "", s.lower().replace("-", ""))
    if any(c.isdigit() for c in w): return "#"   # any number: ignored by the word check (see is_num)
    return ALIAS.get(w, w)
def join_nums(ts):
    out = []
    for t in ts:
        if out and out[-1] in _TENS[2:] and t in _ONES[1:10]: out[-1] += t
        else: out.append(t)
    return out
_NUMW = set(_ONES + _TENS[2:] + ["hundred", "thousand", "and", "oh"])
def is_num(t): return t == "#" or t in _NUMW or any(t == a + b for a in _TENS[2:] for b in _ONES[1:10])
# numbers are compared by neither side: Whisper writes digits in many forms; the words around them carry the check
toks = lambda s: [t for t in join_nums([norm(x) for x in re.sub(r"(\w+) dot A I", r"\1 ai", s).split() if norm(x)]) if not is_num(t)]
def run(*a, **k): return subprocess.run(list(a), check=True, **k)
def words_of(wav, out):
    run("python3", "-I", f"{HERE}/align.py", wav, out, capture_output=True); return json.load(open(out))
voice, model = sb["voice"], sb.get("voice_model", "openai/gpt-audio")
open(f"{work}/direction.txt", "w").write("Voice direction: " + sb["voice_direction"])
beats = sb["beats"]; script = "\n\n".join(b["narration"] for b in beats); open(f"{work}/script.txt", "w").write(script + "\n")
# one take per beat (Dinis, 23 Nov 2026: paragraphs glued together felt rushed): a beat's pause is then set exactly at the join
# instead of being searched for in the audio, where word times can drift by half a second and land on a comma
chunks = [[b] for b in beats]
pieces = []
for ci, ch in enumerate(chunks):
    text = "\n\n".join(b["narration"] for b in ch); want = toks(text)
    for attempt in range(3):
        f = f"{work}/c{ci}-{attempt}"; open(f + ".txt", "w").write(text + "\n\nThank you.\n")
        same = os.path.exists(f + ".said") and open(f + ".said").read() == text   # reuse a take only for the same text
        if not (same and os.path.exists(f + ".wav") and os.path.exists(f + ".json")):   # reuse a take from an earlier run: no second spend
            if voice.startswith("mistral:"):   # "mistral:<model>:<voice slug>", e.g. mistral:voxtral-mini-tts-3:voice_3150 (James)
                _, mm, vv = voice.split(":")
                run("python3", "-I", f"{HERE}/mistral_tts.py", mm, vv, f + ".txt", f + ".wav", capture_output=True)
            else:
                run("python3", "-I", f"{HERE}/tts.py", model, voice, f + ".txt", f + ".wav", f"{work}/direction.txt", capture_output=True)
            words_of(f + ".wav", f + ".json"); open(f + ".said", "w").write(text)
        w = json.load(open(f + ".json")); got, gi, ge = [], [], []   # first and last index into w of each token
        for i, x in enumerate(w):
            t = norm(x[0])
            if not t or is_num(t): continue
            if got and got[-1] in _TENS[2:] and t in _ONES[1:10]: got[-1] += t; ge[-1] = i
            else: got.append(t); gi.append(i); ge.append(i)
        sm = difflib.SequenceMatcher(None, want, got, autojunk=False); blocks = [b for b in sm.get_matching_blocks() if b.size]
        matched = sum(b.size for b in blocks)
        chars = difflib.SequenceMatcher(None, "".join(want), "".join(got), autojunk=False).ratio()   # a split or joined word is not a missing word
        if blocks and (matched >= 0.9 * len(want) or chars >= 0.93) and blocks[-1].a + blocks[-1].size >= len(want) - 1:
            first, last = blocks[0], blocks[-1]
            start = w[gi[max(0, first.b - first.a - (1 if first.a else 0))]][1] - 0.12   # back up over script words Whisper misheard
            end = w[ge[last.b + last.size - 1]][2] + 0.35
            pieces.append((f + ".wav", max(0, start), end)); print(f"chunk {ci}: ok on take {attempt+1} ({matched}/{len(want)} words, {chars:.2f} of letters)"); break
        print(f"chunk {ci}: take {attempt+1} incomplete ({matched}/{len(want)}), retrying")
    else: raise SystemExit(f"chunk {ci} could not be voiced completely")
JOIN_PAD = 0.3   # each take keeps 0.12 s before and 0.35 s after its words; with this the pause between beats is about 0.75 s
fl = "".join(f"[{i}:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS" + (f",apad=pad_dur={JOIN_PAD}" if i < len(pieces) - 1 else "") + f"[s{i}];"
             for i, (_, a, b) in enumerate(pieces))
fl += "".join(f"[s{i}]" for i in range(len(pieces))) + f"concat=n={len(pieces)}:v=0:a=1[o]"
args = sum([["-i", p[0]] for p in pieces], [])
run("ffmpeg", "-loglevel", "error", "-y", *args, "-filter_complex", fl, "-map", "[o]", "-ar", "24000", "-ac", "1", f"{work}/voice-raw.wav")
raw = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{work}/voice-raw.wav"],capture_output=True,text=True).stdout)
CREDITS_S = 3.5   # Dinis: every Reel ends on a credits card, readable when paused
STATS_S = 4.6 * len(sb.get("stats") or [])
room = 89.0 - sb["cover"].get("hold", 1.2) - 0.6 - STATS_S - CREDITS_S
tempo = max(1.0, raw / room)
wps = len(toks(script)) / raw   # a slow read (under 1.8 words a second) may be sped up a little more
if tempo > (1.20 if wps < 1.8 else 1.10): raise SystemExit(f"too long for a Reel: voice {raw:.1f} s, room {room:.1f} s; shorten the storyboard and run again")
run("ffmpeg", "-loglevel", "error", "-y", "-i", f"{work}/voice-raw.wav", "-af", f"atempo={tempo:.4f}", "-ar", "24000", "-ac", "1", f"{work}/voice.wav")
print(f"voice {raw:.1f} s, tempo {tempo:.3f}")
# audio master (Dinis: "it feels like compressed ... a bit of a distortion"): no dynamic loudnorm. One plain gain to -18 LUFS,
# one soxr resample to 48 kHz, a lookahead limiter run at 4x oversampling (so it sees inter-sample peaks) that only catches the few peaks above -2 dBTP, leaving room for AAC's overshoot, mono. The renderer copies it as is.
meas = subprocess.run(["ffmpeg","-hide_banner","-i",f"{work}/voice.wav","-af","loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json","-f","null","-"],capture_output=True,text=True).stderr
inp = float(re.search(r'"input_i"\s*:\s*"(-?[0-9.]+)"', meas).group(1)); gain = -18.0 - inp
run("ffmpeg","-loglevel","error","-y","-i",f"{work}/voice.wav","-af",
    f"volume={gain:.2f}dB,aresample=192000:resampler=soxr:precision=28,alimiter=limit=0.7943:attack=5:release=60:level=false,aresample=48000:resampler=soxr:precision=28",
    "-ar","48000","-ac","1","-c:a","pcm_s16le",f"{work}/voice-master.wav")
print(f"master: {inp:.1f} LUFS in, gain {gain:+.1f} dB")
words_of(f"{work}/voice.wav", f"{work}/words.json")
json.dump([[b["id"], " ".join(b["narration"].split()[:3])] for b in beats], open(f"{work}/keys.json", "w"))
run("python3", "-I", f"{HERE}/timing.py", work, f"{work}/keys.json")
# Beat padding (Dinis, 23 Nov 2026: "the voice starts talking about what happens on the next slide when we're seeing the current
# slide ... the paragraphs ... don't have enough padding"). Every beat boundary gets at least BEAT_GAP s of silence, cut in at the
# middle of the existing pause; pauses inside a beat are left alone. Then the words are aligned again on the padded voice.
BEAT_GAP = 0.7
import wave as _w, numpy as _np
def _audio():
    with _w.open(f"{work}/voice.wav") as wv: sr = wv.getframerate(); pcm = wv.readframes(wv.getnframes())
    return sr, pcm, _np.frombuffer(pcm, dtype=_np.int16).astype(float) / 32768
def beat_gaps():
    # the expected boundary comes from the word timings; the pause itself is measured in the audio: the longest run of
    # 20 ms frames under -40 dBFS within 0.8 s of the expected point (misheard words get interpolated times, so words alone mislead)
    T0 = json.load(open(f"{work}/timing.json")); W = [w for s_ in T0["subs"] for w in s_["words"]]
    sr, pcm, a = _audio(); fr = int(sr * 0.02); n = len(a) // fr
    quiet = _np.array([20 * _np.log10(_np.sqrt(_np.mean(a[i*fr:(i+1)*fr] ** 2)) + 1e-9) < -40 for i in range(n)])
    out, i = [], 0
    for bb in beats[:-1]:
        i += len(bb["narration"].split())
        if not 0 < i < len(W): continue
        te = (W[i - 1][2] + W[i][1]) / 2; lo, hi = max(0, int((te - 0.8) / 0.02)), min(n, int((te + 0.8) / 0.02))
        best, cur, start, bs = 0, 0, lo, lo
        for k in range(lo, hi):
            if quiet[k]:
                if cur == 0: start = k
                cur += 1
                if cur > best: best, bs = cur, start
            else: cur = 0
        out.append((bb["id"], bs * 0.02, (bs + best) * 0.02))
    return out
gaps = beat_gaps(); cuts = [((x + y) / 2, max(0.0, BEAT_GAP - (y - x))) for _, x, y in gaps]
if any(add > 0.01 for _, add in cuts):
    sr, pcm, _a = _audio(); out, last = bytearray(), 0
    for at, add in cuts:
        k = int(at * sr) * 2; out += pcm[last:k] + b"\x00\x00" * int(add * sr); last = k
    out += pcm[last:]
    with _w.open(f"{work}/voice.wav", "wb") as wv: wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(sr); wv.writeframes(bytes(out))
    words_of(f"{work}/voice.wav", f"{work}/words.json")
    run("python3", "-I", f"{HERE}/timing.py", work, f"{work}/keys.json")
gaps = beat_gaps(); report = [(i, round(y - x, 2)) for i, x, y in gaps]
print("beat pauses (s):", report)
if report and min(g for _, g in report) < BEAT_GAP - 0.15: raise SystemExit(f"a beat boundary is still too tight: {report}")
# spec for the scene page
gest = ["present", "point", "nod", "count", "thumbsUp", "lookAt", "present", "point"]
cues = [{"t": 0.3, "do": "wave"}, {"t": beats[0]["id"], "dt": 1.2, "do": "expression", "name": "smile"}]
for i, b in enumerate(beats[1:]): cues.append({"t": b["id"], "dt": 0.2, "do": b.get("gesture") or gest[i % len(gest)], **({"n": 3} if (b.get("gesture") or gest[i % len(gest)]) == "count" else {})})
T = json.load(open(f"{work}/timing.json")); dur = T["duration"]
total = sb["cover"].get("hold", 1.2) + dur + 0.6 + STATS_S + CREDITS_S
if total > 89.5: raise SystemExit(f"too long for a Reel: {total:.1f} s (voice {dur:.1f} s); shorten the storyboard and run again")
print(f"length check: {total:.1f} s")
cues += [{"t": dur + 0.6, "do": "present"}, {"t": dur + 6, "do": "nod"}, {"t": dur + 12, "do": "wave"}]
spec = {"scene": "story", "presenter": sb["presenter"], "label": sb["presenter_name"] + " · synthetic", "timing": "timing.json", "tail": 0.6 + STATS_S + CREDITS_S,
        "stage": sb.get("stage", {"dist": 1.9, "h": 0.8, "lh": 0.8}), "beats": beats, "cover": sb["cover"], "cues": cues, "theme": sb.get("theme"), "beat_lead": 0.35}
vv = sb["voice"]
voice_credit = (f"Mistral Voxtral TTS, voice James" if vv.startswith("mistral:")
                else f"{sb.get('voice_model', 'openai/gpt-audio').split('/')[-1]}, voice {vv}, via OpenRouter")
credits = {"kicker": "Credits", "title": "Who made this", "seconds": CREDITS_S, "rows": [
    ["Made by", "Claude (Anthropic), as studio.c, with sub-agents"],
    ["Voice (AI-generated)", voice_credit],
    ["Presenter", f"{sb['presenter_name']}, synthetic, from PrompTugal.news"],
    ["Presenter library", "bulletins.b, CC BY 4.0"],
    ["Music and sources", "No music · facts in storyboard.json"],
    ["Posting", "Under a written rule · riskmandate.ai"]]}
spec["stats"] = {"page": 4.6, "pages": list(sb.get("stats") or []) + [credits]}
os.makedirs(f"{work}/site", exist_ok=True)
shutil.copy(f"{HERE}/reel.html.tpl", f"{work}/site/reel.html"); shutil.copy(f"{HERE}/rm-mark.svg", f"{work}/site/rm-mark.svg"); shutil.copy(f"{work}/timing.json", f"{work}/site/timing.json")
# image beats: fetch each capture once into site/media (pinned public URLs only), the page reads it locally
import urllib.request
os.makedirs(f"{work}/site/media", exist_ok=True)
for b in beats:
    v = b["visual"]
    if v.get("kind") == "image":
        if v["src"].startswith("file:"):   # a capture made for this Reel, in the storyboard's media_dir (checked by studio.c before use)
            name = re.sub(r"[^A-Za-z0-9._-]", "_", v["src"][5:]); dst = f"{work}/site/media/{b['id']}-{name}"
            shutil.copy(os.path.join(sb["media_dir"], v["src"][5:]), dst)
        else:
            if not v["src"].startswith("https://raw.githubusercontent.com/SovereignWebsite/"): raise SystemExit("image src must be file:<name> or a raw.githubusercontent.com URL in a SovereignWebsite repository: " + v["src"])
            name = re.sub(r"[^A-Za-z0-9._-]", "_", v["src"].split("/")[-1]); dst = f"{work}/site/media/{b['id']}-{name}"
            if not os.path.exists(dst): urllib.request.urlretrieve(v["src"], dst)
        v["local"] = f"media/{b['id']}-{name}"
    if v.get("kind") == "video":   # a screen recording, played frame by frame in step with the render: {"src":"file:<rec>","crop":"w:h:x:y","fps":15}
        fps = v.get("fps", 15); fdir = f"{work}/site/media/{b['id']}"; os.makedirs(fdir, exist_ok=True)
        vf = (f"crop={v['crop']}," if v.get("crop") else "") + f"fps={fps},scale=936:-2"
        run("ffmpeg", "-loglevel", "error", "-y", "-ss", str(v.get("start", 0)), "-i", os.path.join(sb["media_dir"], v["src"][5:]), "-vf", vf, "-q:v", "4", f"{fdir}/f%04d.jpg")
        v["frames"] = len([x for x in os.listdir(fdir) if x.endswith(".jpg")]); v["dir"] = f"media/{b['id']}"; v["fps"] = fps
json.dump(spec, open(f"{work}/site/spec.json", "w"), indent=1)
lib = os.environ.get("PRESENTERS_LIB"); fonts = "/usr/share/fonts/opentype/inter"
for src, dst in ((lib, "lib/presenters"), (fonts, "fonts")):
    if not os.path.exists(f"{work}/site/{dst}"): shutil.copytree(src, f"{work}/site/{dst}")
port = "8766"; srv = subprocess.Popen(["python3", "-m", "http.server", port], cwd=f"{work}/site", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
    t0 = time.time()
    run("node", f"{HERE}/render-reel.js", "spec.json", f"{post}/video.mp4", f"{work}/voice-master.wav", env={**os.environ, "NODE_PATH": subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()})
    render_s = time.time() - t0
finally: srv.terminate()
run("ffmpeg", "-loglevel", "error", "-y", "-ss", "0.2", "-i", f"{post}/video.mp4", "-frames:v", "1", "-q:v", "2", f"{post}/cover.jpg")
shutil.copy(f"{work}/script.txt", f"{post}/script.txt"); shutil.copy(f"{work}/direction.txt", f"{post}/voice-direction.txt"); shutil.copy(sb_path, f"{post}/storyboard.json")
calls = [json.loads(l) for l in open(f"{work}/calls.jsonl")] if os.path.exists(f"{work}/calls.jsonl") else []
cost = sum((c.get("usage") or {}).get("cost", 0) for c in calls)
json.dump({"beat_pauses": report, "min_beat_pause": min([g for _, g in report], default=None), "render_seconds": round(render_s, 1), "duration": float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{post}/video.mp4"],capture_output=True,text=True).stdout),
           "voice_calls": len(calls), "voice_cost_usd": round(cost, 4)}, open(f"{work}/made.json", "w"))
print("made", post, round(render_s), "s render,", round(cost, 4), "USD voice")
