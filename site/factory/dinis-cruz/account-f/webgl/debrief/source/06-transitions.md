# 06 — Transitions

## Contract

```js
export const tear = {
  dur: 2.8,                                   // seconds (reverse plays at 0.55×)
  create(ctx) {                               // once; may allocate targets/meshes
    return {
      start() {},                             // optional, when a transition begins
      render({ A, B, p, out, a, b, sa, sb, time }) {
        // A, B: render targets holding THIS frame of the outgoing / incoming scene
        // p: 0→1 (already reversed when going back), out: target to write
        if (p <= 0) return ctx.gfx.copy(A, out);
        if (p >= 1) return ctx.gfx.copy(B, out);
        …
      },
    };
  },
};
```

The deck sets `from.s.exit = p` and `to.s.enter = p` (for non-fade transitions), so scenes can
cooperate — e.g. delay their own text until `s.enter` is high, or hand over geometry. A scene's
`enterWith` picks the transition; going backwards uses the *leaving* scene's `enterWith` reversed.

## Shared helpers

* `Rc(ctx)` shared 4× MSAA HDR target; `ia(ctx, k)` shared **mip-mapped linear copy** of a scene
  (for cheap blur / sampling at LOD); `G0(ctx)` separable-Gaussian **shadow mask** builder (near + far
  blur of an alpha mask) — all cached per gfx in a `WeakMap`.
* `h2(corners)` — **homography** from 4 NDC corners to a unit square (inverse 3×3, orientation fixed);
  `q0(ctx)` — draw a texture through a homography with analytic edge coverage, mip-blended
  minification and shading. Used for anything that moves a flat "sheet" in perspective.

## The ten transitions

| name | dur | idea | key techniques |
|---|---|---|---|
| `fade` | .7 | crossfade | smoothstep mix |
| `portal-in` / `portal-out` | — | slide becomes / leaves a quad in the next scene's 3D world | scene supplies `portal.in/out(s) → {c: 4 NDC corners, a, shade}`; homography draw |
| `fold` | 3.4 | sheet folds like paper (creases, plop into water) | homography + fold shading; crease/paper sounds |
| `wash` | — | a liquid wash over the frame | noise-displaced mask, drips |
| `flaps` | — | split-flap board flipping | many small flaps, instanced |
| `slam` | — | next slide is pressed onto the screen like a print block | *before contact*: incoming face as projective quad, outgoing zooms with radial blur, rim occlusion darkens; *after*: camera shake + roll + zoom spring, radial ripple ring with analytic derivative for refraction, ink-pressure front taking the "tooth" of paper first (fbm), wet-ink darkening that dries, dust ring, fibres |
| `daybreak` | 3.4 | defocus into bokeh, light floods, refocus | 40-tap golden-angle bokeh with cat-eye and highlight weighting from a mip pyramid; 680 instanced bokeh discs coloured from mip 4.2 of the source, onion rings, shrinking to stars; glow pass |
| `line` | 2.4 | picture collapses vertically into a vibrating string, then the next one grows out | per-column squeeze function with staggered timing; string = sum of 3 standing-wave modes; 12-sample motion blur over time; per-column average colour via reduction chain 1280×160 → 20 → 2; hot core + 3 glow falloffs; phosphor afterglow |
| `tear` | 2.8 | slide rips down the middle, halves curl away | two 121×97-vertex sheets; vertex shader curls each half around a cylinder whose radius and opening (`uYf`, `uW2`) are animated; tear line = low-freq `slow(y)` + fbm `tearFine(y)`; fibres sticking out of the edge (3 layers of hashed strands); white layered paper core at the edge whose width is shared asymmetrically between halves; back side printed dark; 46 instanced paper shards with tumbling; blurred shadow cast onto the incoming slide |

## Design rules visible in the transitions

1. **Physical metaphors** (paper, print, light, string) rather than abstract wipes.
2. **Every transition has a matching sound design** timed to the same curve (see `07-audio.md`).
3. **Easing is shaped by hand** — e.g. `tear` progress gets `ke(S)` blended 55% plus small sine wobbles
   so it feels torn by a hand, not a tween.
4. Work in **linear light** (`toLin` on inputs, `toSrgb` on output) inside the transition pass.
5. Early-out with `copy` at p≤0 / p≥1 so idle frames cost nothing.
