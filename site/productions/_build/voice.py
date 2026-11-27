#!/usr/bin/env python3
# Speak every scene of a version with Mistral Voxtral (the voice Dinis chose for studio.c, RUNBOOK.md) and time the scenes to it:
#   python3 voice.py <version folder> <work folder>
# Uses studio.c's mistral_tts.py (key from MISTRAL_API_KEY, never printed). Writes audio/<nn>-<id>.mp3 (no metadata)
# and sets each scene's "audio" and "seconds" in scenes.json. A scene already spoken with the same words is kept.
import hashlib, json, os, subprocess, sys
ver, work = sys.argv[1:3]; here = os.path.dirname(os.path.abspath(__file__))
tts = os.path.join(here, "..", "..", "accounts", "c", "update", "mistral_tts.py")
p = os.path.join(ver, "scenes.json"); P = json.load(open(p)); os.makedirs(work, exist_ok=True); os.makedirs(os.path.join(ver, "audio"), exist_ok=True)
speed = P["voice"].get("speed", 1.25); LEAD, TAIL = 0.25, 0.7
for n, s in enumerate(P["scenes"], 1):
    text = s.get("say") or s["narration"]; h = hashlib.sha256((text + str(speed)).encode()).hexdigest()[:10]
    name = f"audio/{n:02d}-{s['id']}.mp3"; wav = os.path.join(work, f"{n:02d}-{h}.wav"); mp3 = os.path.join(ver, name)
    if not os.path.exists(wav):
        open(wav + ".txt", "w").write(text)
        subprocess.run([sys.executable, tts, "voxtral-mini-tts-3", "voice_3150", wav + ".txt", wav], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-af", f"atempo={speed},loudnorm=I=-18:TP=-2:LRA=11,aresample=44100", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k",
                    "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", "-id3v2_version", "0", "-write_xing", "0", mp3], check=True)
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3], capture_output=True, text=True, check=True).stdout)
    s["audio"] = name; s["lead"] = LEAD; s["tail"] = TAIL; s["seconds"] = round(LEAD + d + TAIL, 2)
    print(f"{name} {d:.2f}s")
json.dump(P, open(p, "w"), indent=1, ensure_ascii=False); open(p, "a").write("\n")
print("total", round(sum(s["seconds"] for s in P["scenes"]), 1), "s")
