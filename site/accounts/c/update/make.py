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
            nxt = ge[last.b + last.size - 1] + 1   # never run into the next thing said (the "Thank you." decoy line)
            if nxt < len(w): end = min(end, max(w[ge[last.b + last.size - 1]][2] + 0.05, w[nxt][1] - 0.08))
            pieces.append((f + ".wav", max(0, start), end)); print(f"chunk {ci}: ok on take {attempt+1} ({matched}/{len(want)} words, {chars:.2f} of letters)"); break
        print(f"chunk {ci}: take {attempt+1} incomplete ({matched}/{len(want)}), retrying")
    else: raise SystemExit(f"chunk {ci} could not be voiced completely")
SPEED = float(sb.get("speed", 1.25))   # Dinis, 24 Nov 2026, after the ffmpeg atempo tests (0 to 25%): "I like 25% that works really well"
JOIN_PAD = 0.6 * SPEED   # silence at each beat join before the speed-up, so the heard pause stays about 0.7 s or more
fl = "".join(f"[{i}:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS" + (f",apad=pad_dur={JOIN_PAD}" if i < len(pieces) - 1 else "") + f"[s{i}];"
             for i, (_, a, b) in enumerate(pieces))
fl += "".join(f"[s{i}]" for i in range(len(pieces))) + f"concat=n={len(pieces)}:v=0:a=1[o]"
args = sum([["-i", p[0]] for p in pieces], [])
JOINS, _acc = [], 0.0   # where each beat starts in the joined voice (before tempo): the pause is measured here, not at word times
for _, a, b in pieces[:-1]: _acc += (b - a) + JOIN_PAD; JOINS.append(_acc - JOIN_PAD / 2)
run("ffmpeg", "-loglevel", "error", "-y", *args, "-filter_complex", fl, "-map", "[o]", "-ar", "24000", "-ac", "1", f"{work}/voice-raw.wav")
raw = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{work}/voice-raw.wav"],capture_output=True,text=True).stdout)
CREDITS_S = 3.5   # Dinis: every Reel ends on a credits card, readable when paused
STATS_S = 4.6 * len(sb.get("stats") or [])
room = 89.0 - sb["cover"].get("hold", 1.2) - 0.6 - STATS_S - CREDITS_S
tempo = max(SPEED, raw / room)   # the chosen speed, or a little more only if the Reel would not fit
wps = len(toks(script)) / raw   # a slow read (under 1.8 words a second) may be sped up a little more
if tempo > SPEED * (1.06 if wps < 1.8 else 1.03): raise SystemExit(f"too long for a Reel: voice {raw:.1f} s, room {room:.1f} s; shorten the storyboard and run again")
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
    # 20 ms frames under -30 dBFS within 0.8 s of the expected point (misheard words get interpolated times, so words alone mislead)
    T0 = json.load(open(f"{work}/timing.json")); W = [w for s_ in T0["subs"] for w in s_["words"]]
    sr, pcm, a = _audio(); fr = int(sr * 0.02); n = len(a) // fr
    quiet = _np.array([20 * _np.log10(_np.sqrt(_np.mean(a[i*fr:(i+1)*fr] ** 2)) + 1e-9) < -30 for i in range(n)])   # breath at -40 to -30 dBFS is heard as part of the pause
    dbs = _np.array([20 * _np.log10(_np.sqrt(_np.mean(a[i*fr:(i+1)*fr] ** 2)) + 1e-9) for i in range(n)])
    out, i = [], 0
    for bb in beats[:-1]:
        i += len(bb["narration"].split())
        if not 0 < i < len(W) and len(JOINS) != len(beats) - 1: continue
        known = len(JOINS) == len(beats) - 1
        te = JOINS[len(out)] / tempo + SHIFT[len(out)] if known else (W[i - 1][2] + W[i][1]) / 2
        r = 0.4 if known else 0.8   # a known join needs only a small window, so a comma pause nearby is not taken for it
        lo, hi = max(0, int((te - r) / 0.02)), min(n, int((te + r) / 0.02))
        best, cur, start, bs = 0, 0, lo, lo
        for k in range(lo, hi):
            if quiet[k]:
                if cur == 0: start = k
                cur += 1
                if cur > best: best, bs = cur, start
            else: cur = 0
        if known:   # a join is the only place with digital silence: anchor on it, then widen to the whole quiet run around it
            z = [k for k in range(max(0, int((te - 1.0) / 0.02)), min(n, int((te + 1.0) / 0.02))) if dbs[k] < -80]
            if z:
                c = min(z, key=lambda k: abs(k * 0.02 - te)); s0 = e0 = c
                while s0 > 0 and quiet[s0 - 1]: s0 -= 1
                while e0 < n - 1 and quiet[e0 + 1]: e0 += 1
                bs, best = s0, e0 + 1 - s0
        out.append((bb["id"], bs * 0.02, (bs + best) * 0.02))
    return out
SHIFT = [0.0] * len(beats)
gaps = beat_gaps(); cuts = [((x + y) / 2, max(0.0, BEAT_GAP - (y - x))) for _, x, y in gaps]
# with one take per beat the join is set by JOIN_PAD; inserting more here would land on a comma pause, so only older multi-beat takes are padded
if len(JOINS) != len(beats) - 1 and any(add > 0.01 for _, add in cuts):
    sr, pcm, _a = _audio(); out, last = bytearray(), 0
    for at, add in cuts:
        k = int(at * sr) * 2; out += pcm[last:k] + b"\x00\x00" * int(add * sr); last = k
    out += pcm[last:]
    _c = 0.0
    for k, (_, add) in enumerate(cuts): SHIFT[k] = _c + add / 2; _c += add
    with _w.open(f"{work}/voice.wav", "wb") as wv: wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(sr); wv.writeframes(bytes(out))
    words_of(f"{work}/voice.wav", f"{work}/words.json")
    run("python3", "-I", f"{HERE}/timing.py", work, f"{work}/keys.json")
gaps = beat_gaps(); report = [(i, round(y - x, 2)) for i, x, y in gaps]
print("joins (s):", [round(j / tempo, 2) for j in JOINS], "found:", [(round(x, 2), round(y, 2)) for _, x, y in gaps])
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
    ["Posting", "Under a written rule · riskmandate.ai"]] + [list(r) for r in (sb.get("credit_rows") or [])]}   # e.g. the maker of footage used
spec["stats"] = {"page": 4.6, "pages": list(sb.get("stats") or []) + [credits]}
os.makedirs(f"{work}/site", exist_ok=True)
CAST = sb.get("layout") == "cast"   # the character version: a deck film full frame with the cast keyed over it (cast.html.tpl)
shutil.copy(f"{HERE}/{'cast' if CAST else 'reel'}.html.tpl", f"{work}/site/reel.html"); shutil.copy(f"{HERE}/rm-mark.svg", f"{work}/site/rm-mark.svg"); shutil.copy(f"{work}/timing.json", f"{work}/site/timing.json")
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
        _ids = [x["id"] for x in beats]; _k = _ids.index(b["id"]); _keys = T["keys"]   # only as many frames as the beat is on screen
        _len = v.get("len") or ((_keys[_ids[_k + 1]] if _k + 1 < len(_ids) else dur) - _keys[b["id"]] + 1.5)
        for _old in os.listdir(fdir): os.remove(os.path.join(fdir, _old))
        run("ffmpeg", "-loglevel", "error", "-y", "-ss", str(v.get("start", 0)), "-t", f"{_len:.2f}", "-i", os.path.join(sb["media_dir"], v["src"][5:]), "-vf", vf, "-q:v", "5", f"{fdir}/f%04d.jpg")
        v["frames"] = len([x for x in os.listdir(fdir) if x.endswith(".jpg")]); v["dir"] = f"media/{b['id']}"; v["fps"] = fps
if CAST:
    spec.update({"cast": sb["cast"], "slots": sb.get("slots"), "title": sb.get("title", ""), "end_cues": sb.get("end_cues", []),
                 "label": "Synthetic presenters", "stage": sb.get("stage", {})})
    fd = sb["deck_frames"]; os.makedirs(f"{work}/site/media", exist_ok=True)   # a deck film's frames, as film.cjs writes them
    if not os.path.exists(f"{work}/site/media/film"): os.symlink(os.path.abspath(fd), f"{work}/site/media/film")
    spec["deck"] = {"dir": "media/film", "fps": sb.get("deck_fps", 30), "frames": len([x for x in os.listdir(fd) if x.endswith(".jpg")])}
    for b in beats:   # images used as props (screenshots): copied next to the page
        for pr in b.get("props", []):
            if pr.get("icon") == "img" and str(pr.get("src", "")).startswith("file:"):
                n = os.path.basename(pr["src"][5:]); shutil.copy(os.path.join(sb["media_dir"], pr["src"][5:]), f"{work}/site/media/{n}"); pr["src"] = f"media/{n}"
    if str(sb["cover"].get("image", "")).startswith("file:"):
        shutil.copy(os.path.join(sb["media_dir"], sb["cover"]["image"][5:]), f"{work}/site/cover.jpg"); spec["cover"] = {**sb["cover"], "image": "cover.jpg"}
json.dump(spec, open(f"{work}/site/spec.json", "w"), indent=1)
if "--draft" in sys.argv:   # a browser draft for review before the MP4 (Dinis, 24 Nov 2026): the page, its media and the voice; no presenters library
    ddir = sys.argv[sys.argv.index("--draft") + 1]; os.makedirs(ddir, exist_ok=True)
    shutil.copytree(f"{work}/site", ddir, dirs_exist_ok=True, ignore=shutil.ignore_patterns("lib"))
    os.makedirs(f"{ddir}/fonts", exist_ok=True)
    for fn in ("Inter-Bold.otf", "Inter-Medium.otf"): shutil.copy(f"/usr/share/fonts/opentype/inter/{fn}", f"{ddir}/fonts/{fn}")   # Inter: SIL Open Font Licence
    run("ffmpeg", "-loglevel", "error", "-y", "-i", f"{work}/voice-master.wav", "-af", f"adelay={int(sb['cover'].get('hold', 1.2) * 1000)}:all=1",
        "-c:a", "aac", "-b:a", "128k", "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", f"{ddir}/voice-draft.m4a")
    import html as _h
    _id = os.path.basename(os.path.normpath(ddir)); _url = f"https://studio.agents.sovereignweb.site/accounts/c/drafts/{_id}/"
    _title = "Draft: " + re.sub(r"<[^>]+>", "", sb["cover"]["headline"]); _desc = f"A draft Reel by studio.c for review before the video is cut: {sb['cover'].get('sub', '')}. Press play to hear it; the 3D presenter is drawn only in the final cut."
    _img = "https://studio.agents.sovereignweb.site/assets/share/card-1200x630.jpg"; E = lambda s: _h.escape(s, quote=True)
    _head = (f'<!doctype html><html lang="en-GB" data-draft="1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
             f'<title>{E(_title)}</title><meta name="description" content="{E(_desc)}"><meta name="robots" content="noindex">'
             f'<meta property="og:type" content="website"><meta property="og:site_name" content="Studio"><meta property="og:locale" content="en_GB">'
             f'<meta property="og:url" content="{_url}"><meta property="og:title" content="{E(_title)}"><meta property="og:description" content="{E(_desc)}">'
             f'<meta property="og:image" content="{_img}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Studio">'
             f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{E(_title)}"><meta name="twitter:description" content="{E(_desc)}"><meta name="twitter:image" content="{_img}">'
             f'<link rel="canonical" href="{_url}">')
    _page = open(f"{HERE}/reel.html.tpl").read()
    _page = _page.replace('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>reel</title>', _head, 1)
    assert 'data-draft="1"' in _page, "draft head not applied"
    _page = _page.replace("</style></head><body>", '</style></head><body><main id="main" aria-label="Draft Reel: press play to watch it with its voice">', 1).replace("</script></body></html>", "</script></main></body></html>", 1)   # one main landmark (axe)
    assert '<main id="main"' in _page and "</main></body>" in _page, "draft landmark not applied"
    open(f"{ddir}/index.html", "w").write(_page)
    if os.path.exists(f"{ddir}/reel.html"): os.remove(f"{ddir}/reel.html")
    print("draft", ddir); sys.exit(0)
lib = os.environ.get("PRESENTERS_LIB"); fonts = "/usr/share/fonts/opentype/inter"
if not lib or not os.path.exists(f"{lib}/presenters.js"): raise SystemExit("set PRESENTERS_LIB to <PrompTugal checkout>/src/lib/presenters/v0.1.0")
for src, dst in ((lib, "lib/presenters"), (fonts, "fonts")):
    shutil.copytree(src, f"{work}/site/{dst}", dirs_exist_ok=True)   # also mends a half-copied folder left by a failed run
port = "8766"; srv = subprocess.Popen(["python3", "-m", "http.server", port], cwd=f"{work}/site", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
    t0 = time.time()
    run("node", f"{HERE}/render-reel.js", "spec.json", f"{post}/video.mp4", f"{work}/voice-master.wav", env={**os.environ, "NODE_PATH": subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()})
    render_s = time.time() - t0
finally: srv.terminate()
# strip authoring metadata (b.security ruling of 26 Nov 2026: "strip EXIF and authoring metadata before upload"): a stream copy
# with bitexact drops the container's encoder name; render-reel.js already drops tags and the x264 settings block
run("ffmpeg", "-loglevel", "error", "-y", "-i", f"{post}/video.mp4", "-c", "copy", "-map_metadata", "-1", "-fflags", "+bitexact", "-movflags", "+faststart", f"{post}/video.clean.mp4")
os.replace(f"{post}/video.clean.mp4", f"{post}/video.mp4")
_left = subprocess.run(["grep", "-c", "-a", "-E", "Lavf|Lavc|x264 - core", f"{post}/video.mp4"], capture_output=True, text=True).stdout.strip()
if _left not in ("", "0"): raise SystemExit("authoring metadata left in video.mp4")
run("ffmpeg", "-loglevel", "error", "-y", "-ss", "0.2", "-i", f"{post}/video.mp4", "-frames:v", "1", "-q:v", "2", "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:v", "+bitexact", f"{post}/cover.jpg")   # no comment or EXIF block
shutil.copy(f"{work}/script.txt", f"{post}/script.txt"); shutil.copy(f"{work}/direction.txt", f"{post}/voice-direction.txt"); shutil.copy(sb_path, f"{post}/storyboard.json")
calls = [json.loads(l) for l in open(f"{work}/calls.jsonl")] if os.path.exists(f"{work}/calls.jsonl") else []
cost = sum((c.get("usage") or {}).get("cost", 0) for c in calls)
json.dump({"beat_pauses": report, "min_beat_pause": min([g for _, g in report], default=None), "render_seconds": round(render_s, 1), "duration": float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{post}/video.mp4"],capture_output=True,text=True).stdout),
           "voice_calls": len(calls), "voice_cost_usd": round(cost, 4)}, open(f"{work}/made.json", "w"))
print("made", post, round(render_s), "s render,", round(cost, 4), "USD voice")
