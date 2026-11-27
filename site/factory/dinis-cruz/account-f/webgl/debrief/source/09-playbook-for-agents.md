# 09 — Playbook: building decks like this with agents

## 1. Be realistic about where the difficulty is

| Part | Difficulty for an agent | Why |
|---|---|---|
| Runtime (scenes, beats, transitions, presenter keys, build to one file) | **Low** | Well-specified plumbing. The `starter/` already does it. |
| Post stack, text system, SelectBox-style widgets | **Low–medium** | Known techniques; needs a few visual checks. |
| Transitions (tear, slam, daybreak…) | **Medium–high** | Each is 50–150 lines of dense GLSL whose quality lives in hand-shaped curves. Several look→fix loops each. |
| Hero 3D scenes (the "Two aims" valley) | **High** | Thousands of tuned constants: terrain shape, colours, densities, camera, light. Correctness is easy; *beauty* takes many iterations of looking at frames. |
| Procedural audio engine and per-scene scores | **High** | Agents can write the DSP; judging the result needs ears. Budget for a human listening pass, or ship without sound. |
| Narrative, pacing, the visual metaphor | **Human** | The deck works because of the idea (boring template ↔ spectacle, the selection marquee, two aims). Give the agent the script and the metaphor; don't ask it to invent the talk. |

Rough effort with agents, assuming a human director reviewing frames:
the engine plus 2–3 polished scenes is a few focused sessions; a 12–13 scene deck at this level is
weeks of iteration, dominated by look-development, not code.

## 2. The non-negotiable: a visual feedback loop

An agent can't tune what it can't see. Give every session:

1. `npm run build` → one HTML file.
2. `tools/shoot.py scene:beat:seconds …` → PNG frames, deterministic (seeded randomness, fixed
   60 Hz stepping via `deck.test.seek`), working without a GPU (Chrome + SwiftShader).
3. The agent **reads the PNGs** (as images) after every change, and compares against the brief.
4. Contact sheets (several frames tiled into one image) to judge motion and composition cheaply.
5. A perf probe (`deck.test.perf`) run on a real GPU machine before the talk; SwiftShader is ~50× slower
   and is only for correctness.

Rules for the loop: change one thing at a time; always shoot the same frame list before/after; keep
the shot list in the repo; never claim a scene is done without having looked at its frames.

## 3. Repo layout to give agents

```
deck/
  src/engine/        (from starter: util, glsl, gfx, view, text, deck, presenter)
  src/scenes/NN-id.js     one file per scene, self-contained
  src/transitions/name.js
  src/audio/         optional
  brief/
    script.md        the talk: per scene → beats → on-screen words → speaker notes → intent
    style.md         palette, fonts, grade (post settings), motion rules (see §5)
    shots.txt        frame list for review, e.g. "futures:0:3.0"
  build.mjs  tools/shoot.py  dist/deck.html
```

## 4. How to split work across agents

* **One agent = one scene** (or one transition). Scenes are isolated by contract, so they parallelise
  well. Each gets: the engine docs (`02`, `03`, `04`), `style.md`, its section of `script.md`, its shot
  list, and a frame budget (e.g. ≤ 8 ms on the target laptop GPU).
* **A director agent** (or you) owns `script.md`, `style.md`, integration, and reviews contact sheets.
* **An integration pass** at the end: transitions between neighbours, consistent type sizes and
  positions, notes, total timing, perf on the real machine.
* For high-stakes reviews, use a separate reviewer agent that only sees the brief and the frames.

### Scene brief template (hand this to a scene agent)

```md
# Scene: futures — "Two aims"
Intent: same power, different aim. Left: a world optimised into white tiles. Right: a living valley.
Beats:
  0 (5 s): split screen, divider drifts; captions "Same power." (left) / "Different aim." (right)
  1 (4 s): divider slides right; "The forecasters are asking for a pause." + source line
  2 (5 s): living world full screen; light opens; "It is not decided yet."
Interaction: divider draggable (pointer API), eases back to choreography on release.
Look: golden-hour, ACES, exposure .86–.94, bloom .2 / threshold 1.3, vignette .16, grain .016.
Type: display font 76 px captions, rise by word.
Budget: ≤ 10 ms/frame at 1440p on M1-class GPU; must scale with s.q.
Done when: shots futures:0:3, futures:1:3.5, futures:2:4.5 match the intent and pass review.
```

## 5. The quality bar (what makes it look like this and not like a demo)

* **HDR everywhere + filmic tonemap + bloom with threshold > 1 + grain + dither.** Non-negotiable.
* **One light, one wind, one palette per scene.** A shared gust field drives grass, trees, water and
  sound; a single sun direction drives every material and the baked shadows.
* **Everything eases; nothing pops.** Use `s.k(...)` with io3/io4/out4/expo; overlap ramps; stagger
  words. Skipped beats catch up quickly instead of jumping.
* **Type is choreography.** Real fonts, large sizes, per-word reveals, captions positioned in clear
  sky/negative space, text on top of the post (never tonemapped).
* **Physical metaphors for transitions** (paper, print, light, string), each with matching sound.
* **Density with restraint:** thousands of instances, but legible composition — one focal point.
* **Seeded randomness** so every run is identical (rehearsal + screenshot tests).
* **Warm-up before the talk** so no shader compiles mid-presentation; adaptive resolution as a safety net.
* **A deliberately plain frame** somewhere (the Arial slide) makes the spectacle land.

## 6. Pitfalls seen while reproducing

* Use `RawShaderMaterial` with `glslVersion: GLSL3` and declare your own `in`/`out`/uniforms; mixing
  with `ShaderMaterial`'s auto-prefix causes redeclaration errors.
* Instanced geometries with 2D `position` need a manual `boundingSphere` (three computes NaN).
* Render text *after* post, into the same output target, or it will be tonemapped and bloomed.
* Keep HalfFloat targets for anything before tonemapping; 8-bit only for snapshots/thumbnails.
* Overlays use a y-down orthographic camera (0…1920 × 0…1080); set `side: DoubleSide`.
* Canvas2D glyph rasters must be redone when device pixel ratio / window size changes.
* Bundle size: three.js minified ≈ 650 KB; inlined fonts add ~100–300 KB each. Fine for an artifact.
* Audio needs a user gesture before `AudioContext` will run; unlock on the first key/click.
* Don't trust SwiftShader timing; test perf on the presenting machine, at its resolution, on battery.

## 7. Step-by-step for a new deck

1. Write `brief/script.md` (scenes, beats, words, notes) and `brief/style.md`. Human-owned.
2. Copy `starter/` → run build + shoot → confirm the loop works in the agent's environment.
3. Block out every scene as a placeholder (background colour + the real text with real timings).
   Rehearse the talk on the placeholders. Fix pacing *now*.
4. Assign scenes to agents with the brief template; each iterates with shots until review passes.
5. Add transitions per scene boundary (start with fade/iris; upgrade the important ones).
6. Optional: audio (start with a few synthesised hits and one pad per scene; see `07-audio.md`).
7. Integration + perf pass on the real machine; tune `s.q` scaling; rehearse with the notes window.
8. Publish the single HTML file (artifact, static host, or USB stick — it runs offline).
