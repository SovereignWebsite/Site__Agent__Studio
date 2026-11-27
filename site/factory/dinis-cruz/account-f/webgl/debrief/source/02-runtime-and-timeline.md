# 02 — Runtime, scenes and the timeline

## The scene contract

A scene is a plain object. Definition (data) is separate from instance (closure returned by `create`):

```js
export default {
  id: "futures",                 // used in URL hash, audio bed lookup, snapshots
  title: "Two aims",             // overview grid label
  enterWith: "tear",             // transition used when ENTERING this scene (and reversed when leaving backwards)
  hud: { color: "#fff" | (s)=>…, font: "monoMed", alpha: .75 },   // page-number style
  beats: [                       // presenter clicks inside the scene
    { dur: 5, hold: 6, delay: 1.2, page: "∞" },
    { dur: 4, hold: 5, page: "∞" },
  ],
  notes: ["speaker note for beat 0", "…beat 1"],
  create(ctx) {                  // called once (lazily, or during warmAll)
    // allocate targets, build geometry/materials, text objects…
    return {
      async init() {},           // heavy one-off work (bake textures etc.), awaited
      enter(s) {},               // each time the scene becomes active (s.beat already set)
      exit(s) {},
      resize() {},               // canvas size / quality changed
      pointer(type, x, y, s) {}, // "down"|"move"|"up" in 1920×1080 coords; return true to capture
      update(s) {},              // per frame, before render
      render(outTarget, s) {},   // draw the frame into outTarget (or null = screen)
      portal: { in(s){…}, out(s){…} },  // optional: hand geometry to portal transitions
      page(s) { return "3"; },   // optional dynamic page label
    };
  },
};
```

## The per-frame state `s` (one per scene)

| Field | Meaning |
|---|---|
| `t`, `dt` | scene-local time and frame delta (clamped to ≤ 50 ms) |
| `beat` | current beat index |
| `p[i]` | progress 0→1 of beat *i*'s animation (`dur` seconds) |
| `_since[i]` | seconds since beat *i* became active (drives `delay` and auto-advance `hold`) |
| `enter`, `exit` | transition progress into / out of the scene (0→1), 1/0 when idle |
| `dir` | +1 forward, −1 backward (so sound effects only fire going forward) |
| `q` | current quality scale (see adaptive resolution) |
| `mouse` | smoothed pointer `{x,y}` in −1..1 plus `px,py` in design units, `down` |
| `at(i)` | `p[i]·dur[i]` — seconds into beat *i* |
| `k(i, t0, t1, ease=io3)` | **the workhorse**: eased 0→1 ramp between seconds t0 and t1 of beat *i* |

`s.k` is how every animation is keyframed: `text.show(s.k(0, 0.7, 2.5), …)`, camera moves with
`s.k(2, 0, 5, bt.io3)`, etc. There is no timeline editor — choreography lives in code as these ramps.

### Beat stepping rules (`SceneRunner.step`)

* For beats `≤ current`: after `delay`, `p[i]` advances at `dt/dur`; **earlier beats advance 3× faster**
  so a skipped beat catches up instead of popping.
* For beats `> current` (after going back): `p[i]` rewinds at 2.4× speed — going back un-plays.
* `reset(beat, filled)`: jump directly to a beat with all previous beats at p=1.

## Deck navigation (`deck` API)

* `advance()` — next beat; at last beat → `go(next, {with: next.enterWith})`. During a transition it
  speeds it up ×3.5 and queues the advance.
* `back()` — previous beat; at beat 0 → previous scene with the *current* scene's `enterWith`,
  `reverse:true`, played at 0.55× duration, landing on its last beat.
* `go(i, {with, reverse, beat})` — init target scene (if needed), un-park it, reset, `enter()`, take a
  640×360 **snapshot** of the outgoing scene into `ctx.snapshots[id]` (used by the recap scene), start
  the transition, emit an audio `transition` event.
* `jump(id|index, beat)` — fade-jump (overview grid, hash change, Home/End).
* `setAuto`, `toggleBlack` (fades to black via `present`), `mute`, `info()` (scene, beat, title, notes).
* Events: `deck.on("move"|"auto"|"mute", fn)`.

## The frame loop

```
raf → adaptiveQuality(frameMs) → step(dt) → draw()
step: smooth mouse; if transition: advance its p, step BOTH scenes with enter/exit set; else step current;
      auto-advance when _since > delay+dur+hold; audio.update(dt, {scene, beat})
draw: if transition: from.render(A); to.render(B); T.render({A,B,p,out,…}) else cur.render(A);
      HUD page number overlay; gfx.present(out, time, black)
```

Both scenes render every frame during a transition, so transitions composite *live* frames, not stills.

## Memory and warm-up

* **Parking:** each render target remembers its owner (`gfx.owner` is set while a scene's `create`
  runs). Scenes further than ±1 from the current are *parked*: their non-fixed targets shrink to 2×2.
  Transitions not needed for the neighbours are parked too. Un-parking restores size and calls `resize`.
* **Warm-up:** `warmAll` (at load) and `warm` of the next two scenes (300 ms/600 ms after each move)
  render every beat and the entry transition once with audio muted, so shader compiles and allocations
  never happen live.

## Adaptive resolution

Quality levels `[1, .84, .70, .58]` of the backing resolution (which is itself capped at ~2560×1600
pixels and DPR ≤ 2; `?px=` overrides DPR). Smoothed frame time > 21 ms for > 1.2 s → step down;
sustained < 18.5 ms for 5 s → step up (max 3 recoveries per level, never during a transition).
Scenes read `s.q` to scale their own expensive work (e.g. grass instance count, cloud march steps).

## Input

* Click/tap = next; right-click = back; horizontal swipe > 50 px = next/back.
* `pointer()` lets a scene capture a drag (the "Two aims" divider); captured gestures don't navigate.

## Presenter UI (`presenter.js`)

| Key | Action |
|---|---|
| → ↓ Space PgDn Enter | next |
| ← ↑ PgUp Backspace | back |
| Home / End | first / last scene |
| F | fullscreen |
| A | auto-play (uses `hold`) |
| M | sound on/off |
| N | notes panel (bottom bar: note text, elapsed time, scene x/n · beat y/m) |
| P | notes in a second window (pop-up, mirrors keys) |
| O | overview grid of all scenes (thumbnails, click to jump) |
| . or B | black screen |
| ? or H | help card |

Location hash is kept in sync (`#scene-beat`) and is navigable. Cursor hides after 2.2 s idle.

## Test hooks (for automated verification)

`deck.test.seek(sceneId, beat, seconds, {mx,my})` — deterministically simulate at 60 Hz to that
point and draw one frame. `deck.test.trans(sceneId, p)` — render the entry transition of a scene at
progress p. `deck.test.perf(sceneId, n)` — GPU-timed average frame cost (`gl.readPixels` fence).
`?headless` creates the renderer with `preserveDrawingBuffer` so screenshots work; `window.ready`
signals boot completion.
