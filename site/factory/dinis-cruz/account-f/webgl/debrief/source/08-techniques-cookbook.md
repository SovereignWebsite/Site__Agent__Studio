# 08 — Techniques cookbook

Generalised recipes extracted from the deck. Each is small enough to hand to one agent as a task.

## Animation and timing

* **Ramp keyframing:** `k(beat, t0, t1, ease)` = `ease(clamp((secondsIntoBeat − t0)/(t1 − t0)))`.
  Compose: `x = lerp(lerp(a, b, k(1,0,3)), c, k(2,0,4))`. Never animate with absolute time alone.
* **Frame-rate-independent smoothing:** `v += (target − v)·(1 − exp(−rate·dt))`.
* **Easing set:** in/out 2–5, io3/io4, expo, outBack(overshoot), spring(freq, damping).
* **Seeded randomness:** a 32-bit PRNG per system (`ze(seed)`), so every load looks identical (critical
  for rehearsing and for screenshot tests).
* **Catch-up / rewind:** earlier beats advance 3× when skipped; later beats rewind 2.4× when going back.

## Procedural worlds

* **Height function on CPU, mirrored in GLSL only when needed.** Keep `height(x,z)` in JS so you can
  place objects exactly on the ground; bake normals/AO from it.
* **Ridges from polylines:** for each segment, distance to the segment → Gaussian bump with
  interpolated height/width; combine with a smooth max `max(a,b) + (k−|a−b|)²/(4k)`.
* **Terraces:** `h' = lerp(h, (floor(h/s) + smoothstep(.62,.98, fract(h/s)))·s, mask)`.
* **Camera-fitted grid:** rows at `d = dmin·(dmax/dmin)^(v/N)`, width ∝ d. Uniform screen density.
* **Baked horizon shadows + AO:** render top-down height into a float target once; march toward the
  sun with growing steps keeping `max(H(q) − t·tanθ)`; AO from golden-angle samples of `atan(Δh/r)`.
* **Recursive trees:** branch = tube segments with jittered direction, radius taper 0.7–0.88, children
  spread on a cone (golden angle), leaves scattered in a sphere around terminal nodes; weld vertices;
  instance the whole tree with per-instance rotation/scale/aspect.
* **Grass:** 5-vertex blade, per-instance pos/height/width/angle/flower id; bend = gust field · y² ·
  height; lower `y` by |bend|² to conserve length.
* **Gust field:** a scrolling noise texture `gust(xz)` shared by grass, trees, water amplitude, boats,
  audio wind — one wind for everything makes the scene feel coherent.
* **Adaptive quadtree tiling** (the white slabs): subdivide a tile if slope, local noise or projected
  size exceed thresholds; snap heights to a distance-dependent step.

## Light and atmosphere

* **Volumetric clouds cheaply:** low-res target; slab bounds; geometric step growth `t *= 1+gr`;
  coverage from a few art-directed blobs × noise; 3D-texture density with erosion; 5 light taps;
  temporal reprojection with jitter. 34–46 steps total.
* **Aerial perspective:** `mix(c, skyColour(viewDir flattened), 1 − exp(−(d−d0)·k·heightFalloff))`.
* **Mirror reflections:** reflected camera + clip, low-res, offset by normal for ripples, Fresnel
  `0.03 + 0.97(1−N·V)^5` capped at 0.8.
* **Two-lobe light in volumes / foliage:** wrap diffuse `pow(sat(n·l·.6+.4),1.6)` + translucency
  toward the sun + ambient by normal.
* **HDR + filmic:** render everything in half-float, bloom with threshold > 1, AgX or ACES, add grain
  and a dithered present. This single step is responsible for much of the "film" look.

## 2D/compositing

* **Homography sheets:** compute the projective map from four corners; draw with analytic coverage
  (`uv/fwidth` edge distances) and mip blending — sharp edges at any angle, no MSAA needed.
* **Mip-sampled blur:** build a mipped linear copy once, sample `textureLod` for bokeh, glows and
  average colours instead of separable blur passes.
* **Reduction chains** for per-column or per-region averages (1280×160 → ×20 → ×2).
* **Scissored split-screen:** render each world only inside its half; captions likewise.
* **Live snapshots:** when leaving a scene, copy its last frame to a small target — free thumbnails
  for recap scenes and overview grids.

## Type

* **Glyph instancing** with per-glyph transform/alpha/blur/clip, laid out with Canvas2D metrics and
  rasterised at device resolution. Reveal by word with stagger; clip to line box for masked rises.
* **SDF from a word** via 2-pass Euclidean distance transform for raymarching or particles.

## Sound

* Offline synthesis in generators (`function*` + `yield` every N samples) scheduled in 3 ms slices.
* Modal resonators for hits, SVF-filtered noise for air/paper/water, PADsynth for pads, Karplus–Strong
  for plucks, synthetic IR reverb, a compressor + soft clipper on the master.
* Harmonic-series tuning on one root across the whole talk; look-ahead scheduling (~280 ms).
* Tie sound to the same curves as visuals (`param("mix", divider)`), and time transition hits to the
  exact visual event fraction.
