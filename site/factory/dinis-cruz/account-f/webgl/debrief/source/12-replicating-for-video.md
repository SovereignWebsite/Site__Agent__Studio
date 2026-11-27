# 12 — Replicating the look for a video

## Two ways to get footage

**A. Render it (recommended for quality).** `starter/tools/video.py` drives the deck deterministically:
`deck.test.step(1/FPS)` → screenshot → next frame, then re-renders the logged sound offline and muxes an MP4.
Because time is stepped, not real, frame rate never drops however heavy the scene is, and every render is identical.

```
cd starter && npm run build
python3 tools/video.py reel                      # whole deck  → videos/reel.mp4
python3 tools/video.py slam tear                 # single transitions
FPS=60 SIZE=1920x1080 python3 tools/video.py reel  # final quality
```

* Without a GPU it uses SwiftShader (~0.5 s per 1280×720 frame). On a machine with a GPU, drop the
  `--use-angle=swiftshader` flags in the script for real-time-ish speed.
* To script your own cut, edit `REEL` (times of each "next" press) and `REEL_LEN`, or add entries to `CLIPS`
  (`[from scene, beat, seconds]`, target scene, transition name).
* Export settings in the script: H.264 CRF 18, yuv420p, AAC 192k, loudness −16 LUFS / −1.5 dBTP (YouTube-friendly).

**B. Screen-record the live deck.** Open `dist/deck.html` (or the original artifact) full-screen and record with
OBS at 60 fps, capturing system audio. Press a key first so audio unlocks. Use `A` (auto-play) for consistent
timing. Easier, but frame drops on heavy scenes will show.

## Getting reference frames from the original

The original artifact couldn't be opened from this session (no browser was connected), so there are no screenshots
of it here. When you have it open:

* Press `O` for the overview grid of all 13 scenes; `N` shows the speaker notes; `#sceneId-beat` in the URL
  jumps straight to a beat (e.g. `#futures-2`, `#pile-1`, `#questions-3`).
* Scene ids in order: `office, tower, boat, loop, swarm, dominoes, calendar, lamp, selectall, aim, futures, pile, questions`.
* Transitions to study (enter each scene from the previous one): `futures` (tear), `pile` (portal-in), `questions`
  (portal-out); daybreak, slam, line, fold, wash and flaps are used between the middle scenes.
* Record each transition with OBS, then step through it frame by frame. Or, if you can run a headless browser
  against your own copy of the file, the original has the same hooks as the starter:
  `?headless`, `window.ready`, `window.__deck.test.seek(sceneId, beat, seconds)`,
  `window.__deck.test.trans(sceneId, p)` — the `tools/shoot.py` approach works on it unchanged.
* If you connect Claude in Chrome or the desktop app, an agent can do this capture for you.

## What to copy for a video (priority order)

1. **The grade**: HDR, bloom with threshold > 1, ACES/AgX, grain, vignette, dither (`gfx.post`). Instant "film".
2. **Typography in motion**: big real fonts, per-word masked rises with stagger, text over negative space.
3. **Two or three signature transitions** with matching sound cues — tear, slam and daybreak read best on video.
4. **Beds under everything**, 15–20 dB below the cues, all tuned to one harmonic series.
5. **One plain frame** (the Arial template) somewhere, so the spectacle has contrast.
6. Only then: a hero 3D scene. The "Two aims" landscape is weeks of look-development; a simpler instanced scene
   (like the starter's field) graded well gets most of the effect.

## Adapting to video formats

* **Vertical (9:16)**: the view is "letterboxed by extension", so 1080×1920 just shows more height; move captions with
  `view.y0/y1`. For `line`, consider swapping axes (collapse horizontally).
* **Square**: same; check that transitions with fixed screen-space geometry (tear's halves, slam's sheet) still cover.
* **Pacing**: video viewers can't click. Use `hold` values per beat and auto-advance (`REEL` times). A transition every
  5–8 s feels lively; slow beats (3–5 s) for reading text.
* **Loudness**: platforms normalise to around −14 to −16 LUFS; the tool already targets −16.
