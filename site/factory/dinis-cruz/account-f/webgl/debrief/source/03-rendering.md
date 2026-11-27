# 03 — Rendering

## `gfx` — the thin layer over `WebGLRenderer`

Renderer settings: `antialias:false, alpha:false, stencil:false, powerPreference:"high-performance"`,
`autoClear=false`, `toneMapping=None` (tonemapping is done by the engine's own post pass). Extensions
`EXT_color_buffer_float`, `EXT_color_buffer_half_float`, `OES_texture_float_linear` are requested.

```js
gfx.target({ scale=1, w, h, samples=0, depth=false, depthTexture=false,
             type=HalfFloat, filter=Linear, wrap=Clamp, mips=false, count=1 })
  // scale is relative to the canvas; w/h make it fixed-size. HalfFloat by default = HDR everywhere.
  // Every target is tracked (resized on resize, parked with its owner scene).
gfx.pass(glslBody, uniforms, {blending, defines, transparent})
  // full-screen triangle; fragment preamble provides: in vec2 vUv; out vec4 o; uniform vec2 uRes; uniform float uTime;
  // returns { u: uniforms, render(target, clear=false), dispose() }
gfx.draw(scene, camera, target, {clear=true, color, alpha})
gfx.copy(src, dst)
gfx.post(src, dst, opts)      // see below
gfx.present(src, time, black) // final blit to screen with blue-noise-ish dither and fade-to-black
gfx.time(fn, n)               // GPU-synchronised timing
gfx.W, gfx.H, gfx.aspect, gfx.q, gfx.THREE, gfx.r (renderer), gfx.gl
```

Every material in the app is a `ShaderMaterial` with `glslVersion: GLSL3` and hand-written
`vertexShader`/`fragmentShader` strings that concatenate the shared libraries. three.js is used for:
WebGL2 state, render targets / MSAA resolve, geometry buffers + instancing, cameras and matrices,
`Data3DTexture`, `CanvasTexture`. It never uses three's lights, built-in materials or post-processing.

## Post stack (`gfx.post(src, dst, opts)`)

```js
{ exposure=1, bloom=0, threshold=1, radius=.85, tone="agx"|"aces"|"none",
  contrast=1, saturation=1, vignette=0, grain=0, ca=0 /*chromatic aberration*/,
  halation=0, lift=[0,0,0], gain=[1,1,1], fade=0, fadeColor=[0,0,0], time }
```

1. **Bloom** (if `bloom>0`): 6-level downsample chain (½ … 1/64), 13-tap filter; first level applies a
   soft threshold and luminance-weighted firefly suppression (clamp 400, `c/(1+luma·.12)`); upsample
   chain with a 3×3 tent, accumulated with `radius`.
2. **Composite:** optional radial chromatic aberration → add bloom (with optional red/blue halation tint)
   → exposure → **AgX** (full matrix + polynomial fit) or **ACES** (Narkowicz fit) → sRGB → contrast,
   saturation, lift/gain → vignette → fade → luminance-weighted film grain.
3. **Present:** ±1 LSB triangular dither (two hashes) to kill banding; pure white is left untouched;
   `uBlack` fades to black.

Scenes choose their own grade; e.g. "Two aims" uses
`{exposure:.86–.94, bloom:.2, threshold:1.3, radius:.8, tone:"aces", contrast:1.06, saturation:1.05, vignette:.16, grain:.016}`.

## Shared GLSL libraries (string chunks)

* `Bn` hashes: `hash11/12/13/21/22/33` (Dave Hoskins style, no sin()).
* `Fe` = `Bn` + quintic value noise `vnoise` (2D/3D) + `fbm` (5 octaves, rotated domain in 2D).
* `y3` SDFs: `sdBox`, `sdBox2`, `sdRound2`, `sdCapsule`, `sdSeg2`, `sdTorus`, `smin`, `rot2`.
* `Sn` colour: exact sRGB↔linear, `luma` (Rec.709), `blackbody(K)`.
* Scenes add their own domain chunks (e.g. the landscape's `skyBase`, `sunC`, `ambient`, `shadow`,
  `baked`, `air`, `gust`, `fin`).

## View: the 1920×1080 design space

`view` is an orthographic camera over a fixed 1920×1080 design canvas, **letterboxed by extension**:
on other aspects the visible area grows (`x0,y0,x1,y1,w,h`) instead of distorting or adding bars. All
2D layout (text, rects, SelectBox, pointer coordinates) uses design units; `view.scale` converts to
pixels; `toClip/fromClip` convert to NDC. Layouts that must hug edges use `view.x0/x1/y0/y1`.

## Overlays

`ctx.overlay()` returns a tiny layer: `.add(textBlock | rect | selectBox | mesh)`, `.render(target)`
draws it with the view camera. Scenes typically: draw 3D into an MSAA HDR target → `gfx.post` into
the output → render one or more overlays (text) on top, sometimes scissored (the split-screen captions).

## Patterns used across scenes

* **Render at reduced scale** for expensive effects (clouds at .42, reflections at .4–.5) and upsample.
* **Scissor** to render only the visible part (each half of a split screen; the cloud pass only
  renders the part of the screen not covered by the other world).
* **Mirror camera reflections:** reflect the camera about the water plane (`y → 2h−y`, `up=(0,−1,0)`),
  render with a clip uniform discarding fragments below the plane, sample with a projected matrix and
  a small normal-driven offset.
* **Baked top-down maps:** render an orthographic height pass once at init, then ray-march sun
  occlusion and AO into a texture used by every material (`baked(xz)`).
* **Instancing everywhere** via `InstancedBufferGeometry` with custom `iP/iA/iB` attributes; one draw
  call for 84k grass blades, all houses, all slabs, all people.
* **Temporal accumulation** for noisy passes (clouds): jitter per frame, reproject the previous frame
  with last frame's view-projection, blend 0.13.
