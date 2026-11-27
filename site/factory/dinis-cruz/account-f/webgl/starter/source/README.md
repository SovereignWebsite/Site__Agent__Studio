# Starter: the same architecture, minimal and working

A working reproduction of the deck's architecture and its signature effects: runtime with scenes + beats + transitions,
HDR render targets, bloom/ACES/grain post, dithered present, word-instanced animated text,
presenter keys and notes, URL hash, warm-up, single-file build, and a headless screenshot tool.
Verified: builds to one 692 KB HTML file and renders correctly in headless Chrome (SwiftShader).

```
npm install
npm run build          # -> dist/deck.html (single self-contained file; open it directly)
npm run shoot          # -> shots/*.png via deck.test.seek / deck.test.trans
python3 tools/shoot.py title:1:2.0 trans:field:0.3 field:1:4.5   # any frames you want
python3 tools/transsheet.py line daybreak slam tear               # 8-frame contact sheet per transition
python3 tools/video.py line daybreak slam tear reel               # MP4s with synthesised sound -> videos/
```

Scenes: `title` → `field` (daybreak) → `plain` (slam) → `end` (tear). The `line` and `iris` transitions are
available too (`go(i, {with:"line"})`, or the CLIPS in tools/video.py). Sound: `src/audio/` (press any key first
in the browser to unlock audio, `M` to mute).

```
src/
  util.js          clamp/lerp/easing/damp/seeded rng
  glsl.js          hash, value noise, fbm, sRGB helpers (GLSL strings)
  gfx.js           targets, full-screen passes, post (bloom chain + ACES + grade + grain), present
  view.js          1920x1080 letterboxed-by-extension design space, Overlay layer
  text.js          TextBlock: Canvas2D layout + device-res raster, instanced per word, rise/fade reveals
  deck.js          SceneRunner (beats, s.k ramps, catch-up/rewind), navigation, transitions, loop, test hooks
  presenter.js     keys (→ ← F A N O B Home End ?), notes bar, overview, idle cursor, URL hash
  transitions/     fade, iris, line, daybreak, slam, tear, lib.js   (contract: {dur, create(ctx) → {render({A,B,p,out})}})
  scenes/          title.js (shader bg + type, factory), field.js (8,100 instanced boxes), plain.js (boring template)
  audio/           dsp.js (synthesis primitives), sounds.js (recipes), engine.js (graph, beds, cues, offline render)
  main.js          registers scenes/transitions, boots, starts at #hash
build.mjs          esbuild bundle → inline into index.template.html → dist/deck.html
tools/shoot.py     Playwright + Chrome/SwiftShader deterministic frame capture
tools/transsheet.py, tools/video.py   transition contact sheets; MP4 rendering with offline audio
```

Adding a scene = copy `scenes/field.js`, change `id/title/enterWith/beats/notes`, build your content
in `create`, drive everything from `s.k(beat, t0, t1, ease)` in `update`, and add it to `main.js`.
Adding a transition = copy `transitions/iris.js`.

What the original has that this starter leaves out (see the debrief docs for each):
per-glyph text with blur and many reveal styles, SDF words, SelectBox, snapshots and portal / fold / wash /
flaps transitions, render-target parking, adaptive resolution, notes pop-up window, generative per-scene
scores, time-sliced synthesis, and of course the original's scene content.
