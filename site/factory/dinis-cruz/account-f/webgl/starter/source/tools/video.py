"""Render deterministic MP4s (picture + procedurally synthesised sound) of the deck.

usage:
  python3 tools/video.py line slam          # individual transition clips -> videos/<name>.mp4
  python3 tools/video.py reel               # the whole starter deck as a showreel -> videos/reel.mp4
options (env): FPS=30  SIZE=1280x720  CHROME=/usr/bin/google-chrome

How it works: the page is opened with ?headless. For each frame we call deck.test.step(1/FPS) which advances the REAL
deck (beats, transitions, audio events) and draws; we screenshot it. The audio engine logs every sound event with the
deck clock; at the end the page re-renders that log through an OfflineAudioContext (same synthesis code as live) and
returns a WAV. ffmpeg muxes frames + WAV. Same input -> byte-identical picture, every time.
"""
import os, sys, base64, pathlib, subprocess, shutil, tempfile
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
DECK = (ROOT / "dist" / "deck.html").as_uri() + "?headless"
OUT = ROOT / "videos"; OUT.mkdir(exist_ok=True)
FPS = int(os.environ.get("FPS", 30)); W, H = map(int, os.environ.get("SIZE", "1280x720").split("x"))
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")

# clip = (start scene [id, beat, secondsIntoBeat], target scene id, transition name, seconds held before the cut)
CLIPS = {
    "line":     (["title", 1, 2.5], "field", "line", 0.8),
    "daybreak": (["title", 1, 2.5], "field", "daybreak", 0.8),
    "slam":     (["field", 1, 5.0], "plain", "slam", 0.8),
    "tear":     (["plain", 1, 3.0], "end", "tear", 0.8),
    "iris":     (["title", 1, 2.5], "field", "iris", 0.8),
}
# reel = list of (time, action): "advance" presses next; the deck uses each scene's own enterWith
REEL = [(4.5, "advance"), (9.0, "advance"), (15.5, "advance"), (20.5, "advance"), (26.0, "advance"), (31.0, "advance"), (36.0, "advance")]
REEL_LEN = 41.0

def encode(frames_dir, wav, dst):
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(frames_dir / "f%05d.png"), "-i", str(wav),
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-shortest", str(dst)]
    subprocess.run(cmd, check=True)

def run(page, name):
    tmp = pathlib.Path(tempfile.mkdtemp())
    if name == "reel":
        page.evaluate("async () => { await window.__deck.test.prepare('title', 0, 0); }")
        total, actions = REEL_LEN, list(REEL)
    else:
        frm, to, trans, hold = CLIPS[name]
        page.evaluate("async (f) => { await window.__deck.test.prepare(f[0], f[1], f[2]); }", frm)
        total, actions = hold + 4.2, [(hold, ("go", to, trans))]
    page.evaluate("() => { window.__deck.ctx.audio.log.length = 0; }")
    t0 = page.evaluate("() => window.__deck.test.time")
    page.evaluate("() => { const a = window.__deck.ctx.audio; a.event('scene', { id: window.__deck.info().id, beat: window.__deck.info().beat, fade: 0.05 }, window.__deck.test.time); }")
    n = int(total * FPS)
    for i in range(n):
        t = i / FPS
        while actions and actions[0][0] <= t:
            _, act = actions.pop(0)
            if act == "advance": page.evaluate("() => window.__deck.advance()")
            else:
                page.evaluate("async ([to, w]) => { const i = window.__deck.scenes.findIndex(s => s.id === to); await window.__deck.go(i, { with: w }); }", [act[1], act[2]])
        page.evaluate(f"() => window.__deck.test.step({1 / FPS})")
        page.screenshot(path=str(tmp / f"f{i:05d}.png"))
        if i % FPS == 0: print(f"  {name}: {i}/{n} frames", flush=True)
    log = page.evaluate("(t0) => window.__deck.ctx.audio.log.map(e => ({ ...e, t: e.t - t0 }))", t0)
    b64 = page.evaluate("async ([log, sec]) => await window.__renderAudio(log, sec)", [log, total])
    wav = tmp / "a.wav"; wav.write_bytes(base64.b64decode(b64))
    dst = OUT / f"{name}.mp4"; encode(tmp, wav, dst)
    shutil.copy(wav, OUT / f"{name}.wav")
    shutil.rmtree(tmp); print("wrote", dst.relative_to(ROOT), f"({len(log)} sound events)")

names = sys.argv[1:] or list(CLIPS)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"])
    page = b.new_page(viewport={"width": W, "height": H})
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(DECK); page.wait_for_function("window.ready === true", timeout=180_000)
    for nm in names: run(page, nm)
    b.close()
for e in errs[:5]: print("ERR", e)
