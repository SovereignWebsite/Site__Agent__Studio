# Debrief: "The Last Boring Slide" — how a cinematic WebGL deck is wired

This folder is a reverse-engineering debrief of the artifact *The Last Boring Slide (Copy)*:
a 13-scene talk rendered entirely in real time with WebGL 2 / three.js, with procedural
audio, speaker notes and a presenter UI, shipped as **one self-contained HTML file**
(~7,000 physical lines, several MB).

It is written for an agent (or engineer) who has to build decks of the same kind. Read in order:

| File | What it covers |
|---|---|
| [01-architecture.md](01-architecture.md) | File layout, boot sequence, module map, how the single file was produced |
| [02-runtime-and-timeline.md](02-runtime-and-timeline.md) | The scene contract, beats, the per-frame state object, deck navigation, warm-up, parking, adaptive resolution, test hooks, presenter UI |
| [03-rendering.md](03-rendering.md) | The `gfx` wrapper, render targets, full-screen passes, post stack (bloom / AgX / ACES / grain / dither), shared GLSL libraries, the 1920×1080 view |
| [04-text-and-ui.md](04-text-and-ui.md) | The glyph-instanced text system, fonts, reveal styles, SDF words, the SelectBox motif, rect primitives |
| [05-scenes.md](05-scenes.md) | Scene-by-scene catalogue, with a deep dive on the "Two aims" landscape, the recap curve and the closing slide |
| [06-transitions.md](06-transitions.md) | The transition contract and the ten transitions (tear, slam, daybreak, line, …) |
| [07-audio.md](07-audio.md) | The fully procedural audio engine: offline synthesis bank, WebAudio graph, per-scene "beds", transition sound design |
| [08-techniques-cookbook.md](08-techniques-cookbook.md) | Reusable recipes, extracted and generalised |
| [09-playbook-for-agents.md](09-playbook-for-agents.md) | **How to build a deck like this with agents**: repo layout, build, verification loop, task split, quality bar, pitfalls, effort |
| [10-transitions-deep-dive.md](10-transitions-deep-dive.md) | Phase-by-phase breakdowns of LINE, DAYBREAK, SLAM, TEAR with working code and reference renders |
| [11-sound-design-guide.md](11-sound-design-guide.md) | The procedural sound approach: rules, primitives, cue timelines, beds, measuring sound without ears |
| [12-replicating-for-video.md](12-replicating-for-video.md) | Rendering MP4s with sound, getting references from the original, what to copy first |
| [starter/](starter/) | A buildable implementation of the same architecture: engine, 4 scenes, 6 transitions (incl. line/daybreak/slam/tear), procedural audio, screenshot + video tools |

## TL;DR

* **Stack:** three.js r187 (used mostly as a WebGL2 state manager — nearly every material is a raw
  GLSL3 `ShaderMaterial`), hand-written GLSL, Canvas2D for glyph rasterisation, WebAudio for sound.
  No other runtime libraries. No images, video or audio files: everything is generated at load time.
* **Engine:** a small custom presentation runtime (`createDeck`) that owns the render loop,
  a *scene* contract (`create → {init, enter, exit, update, render, pointer, resize}`), timed
  *beats* inside each scene, and *transitions* that composite two scene render targets.
* **Look:** each scene renders HDR into its own targets, then a shared post pass (6-level bloom,
  AgX or ACES tonemap, contrast/saturation, vignette, grain) and a final dithered present.
* **Authoring style:** procedural everything — terrain from noise functions, trees from recursive
  tube geometry, clouds raymarched through a 3D noise texture, sounds synthesised sample-by-sample.
* **Packaging:** source was clearly a multi-module ES project, bundled + minified (esbuild-style IIFE),
  with three.js and base64 fonts inlined so the result is a single file publishable as an artifact.

## Provenance / licensing notes (not legal advice)

* three.js is MIT-licensed (its notice is preserved at the top of the script).
* Fonts embedded: Geist, Geist Mono, Newsreader, Unbounded ("Unb"), Anton, JetBrains Mono — all
  published under the SIL Open Font License. A font named "Pixel" is also loaded; its origin is not
  identifiable from the file, so check before reusing it.
* Everything else — engine, shaders, scenes, audio — is original code by the deck's author. There is
  no proprietary dependency, but there is also no licence attached to that code. The *techniques*
  are standard and free to reuse; copying the code verbatim is a question for its author.

## What was read

The debrief is based on reading the application code directly: the boot/engine section
(utilities, GLSL libraries, `gfx`, post stack, fonts, text system, view, overlays, SelectBox,
`createDeck`, presenter UI, boot), the complete audio engine, the "office" opener, the
"futures" landscape, the "pile" recap, the "questions" closer, and the slam / daybreak / line / tear
transitions. The bundled three.js (~5,200 lines) was skipped. The middle scenes (tower, boat, loop,
swarm, dominoes, calendar, lamp, selectall, aim) were only sampled, so the catalogue for those is
inferred from names, audio beds and fragments and is marked as such.
