# 05 — Scenes

Order (from the recap scene's list and the `scenes:[…]` array):

| # | id | Entry transition | What it is (confidence) |
|---|---|---|---|
| 1 | `office` | — | Opener. A dull "AI Progress (Projected)" chart drawn in Canvas2D in Arial with a default blue series, whose line bends into an exponential; "I can fix it." then a carousel of **"Better."** rendered eight ways (grid-lined white, red disc, serif italic, stretched Anton, pixel font, tunnel of repeated mono text, spiral of 700 words, raymarched 3D extruded word, liquid chrome, particles). Typing / selecting sounds. *(read)* |
| 2 | `tower` | ? | Architectural, windowed towers (window-grid shader fragment found); audio bed = Shepard-tone strings rising, wind. *(inferred)* |
| 3 | `boat` | ? | A ship at sea: brown/pink-noise sea, iron groans and creaks, a big chord "release" with a boom. *(inferred from audio)* |
| 4 | `loop` | ? | A marimba/pluck pattern that phases between voices — a feedback/loop metaphor. *(inferred)* |
| 5 | `swarm` | ? | Crowd murmur (granular vowel grains) + choir — many agents. *(inferred)* |
| 6 | `dominoes` | ? | Domino runs (click synthesis in bursts) and rising dread drones. *(inferred)* |
| 7 | `calendar` | ? | A clock whose ticks stretch exponentially ("dilation"), pages flipping — time compression. *(inferred)* |
| 8 | `lamp` | `daybreak`? | Glass tones, then a 16-voice sunrise chord, shimmer + boom + bell. *(inferred)* |
| 9 | `selectall` | ? | Organ chord pulsing faster and faster until it is a drone — "select all". *(inferred)* |
| 10 | `aim` | ? | A solo voice that detunes against itself — misalignment. *(inferred)* |
| 11 | `futures` | `tear` | **"Two aims"** split-screen landscape (deep dive below). *(read)* |
| 12 | `pile` | `portal-in` | **"You are here"**: every slide laid on an exponential curve (below). *(read)* |
| 13 | `questions` | `portal-out` | **"Any questions?"** — the deliberately boring closer (below). *(read)* |

## Narrative device worth copying

The deck *starts and ends* on a deliberately ugly default-template slide (Arial, grey page number,
blue default chart series, a blue footer bar via `Wf`). Everything in between is spectacle. The
contrast is the point, and the recurring **SelectBox** marquee ties them together.

## Deep dive — `futures` ("Two aims")

**Beats:** (1) "Same power. / Different aim." captions on each side; the divider drifts on its own
(sinusoid around the centre) and is draggable. (2) The divider slides right — the "living" world takes
over — "The forecasters are asking for a pause. / AI Futures Project, 10 November 2026". (3) Divider
goes to 0 (living world full screen), light opens up, "It is not decided yet."

**Two complete worlds, one terrain.** `uWorld` uniform = 1 (living) / 0 (optimised). Both share:

* **Noise textures** generated at init: a 256² RGBA (fbm, finer fbm, Worley, hash) rendered on GPU, and
  a 64³ two-channel `Data3DTexture` built on CPU (tiled 3D Worley + value noise) for clouds.
* **Height function** `Sh(x,z)` (CPU, also sampled for placing objects): domain-warped fbm; ridges as
  Gaussian "capsules" along hand-placed polylines (`[x,z,height,width]` control points); smooth-max
  blending; a mountain range only beyond z < −60; a carved riverbank; a raised plateau for the hero tree.
  `En(x,z)` adds **terraces** (quantise height to 0.42 steps with a smooth riser) in garden masks.
* **Camera-fitted terrain mesh**: 480 rows × 570 columns where row distance grows exponentially from
  the camera (`d = 4·(235/4)^(v/480)`) and width grows with distance — triangles are roughly constant in
  screen space. Normals by central differences. A 200×240 low-res copy is used for the reflection pass.
  Per-vertex `aM`: distance to footpath, garden mask, forest density, terrace mask.
* **Baked lighting**: orthographic top-down height render (1536²) → pass that marches 110 steps toward
  the sun (horizon shadow) and 40 golden-angle AO samples → texture `tBF` (far, 224×216 units) and
  `tBN` (near, 26×18 units) sampled through `baked(xz)` and `shadow(w, bias)`.

**Living world contents (all instanced):** procedural recursive trees (branching tubes with jitter,
leaf cards) in 2 species; ~4,300 placed trees; 84,000 grass blades that bend with a gust field and carry
flowers; hundreds of houses (a jittered 62×36 candidate grid filtered by terrace mask, slope and noise, plus clusters around villages) on terraced slopes (3 roof types, window grid shader, chimneys); three bridges
(arched and suspension, generated from a parametric deck curve); four waterfalls (noise-scrolled
ribbons + spray sprites); a hero tree on a plateau with per-leaf sway; boats with sails orbiting
ellipses and heeling in gusts; two kites with strings; seven gulls; three bird flocks (74 birds with
flapping); 170 drifting petals; 64 people walking a Catmull-Rom path or milling about, bobbing.

**Optimised world contents:** the same terrain covered by **white slabs** placed with an adaptive
quadtree (subdivide where slope, noise or screen size demand), heliostat-like tilting tops with travelling
"lift" waves, stone conveyors moving in lanes, a sea filled by tiles rising row by row, collectors
on stalks tracking the sun, crate trains, square-lattice "swarm" in the sky occulting the sun, a
glass-box pavilion around the hero tree, the hero tree bleached grey with one white leaf, glass-flat water.

**Water** (`l2`): grid in camera space; normals from three scrolling noise octaves with gust-scaled
amplitude and depth-scaled damping; Fresnel mix of baked-shadowed water colour (shallow→deep by baked
depth) and the mirror-camera reflection; sharp + broad sun specular; shoreline foam bands
`sin(depth·3.4 − t)` + whitecaps in gusts.

**Sky + clouds** (`Fb`, `r2`): sky gradient + sun disc; volumetric clouds raymarched at 0.42 res in a
15–54 unit slab, coverage = 13 drifting hand-placed blobs × noise, density = 3D texture eroded by two finer
octaves, 5-step light march, two-lobe extinction, ambient by height, distance haze; **temporal
reprojection** (jittered start, golden-ratio frame offset, previous VP matrix, blend 0.13, 16 warm-up
frames on reset). The optimised sky instead draws three layers of moving rectangles ("perfect lattices
overhead, all moving at exactly one speed").

**The split:** divider `T` ∈ [0,1]. Each frame: clouds only for the right part; `J(world, …, x0, x1)`
renders reflection then main pass for each world scissored to its side into a shared 4× MSAA HDR target;
one `gfx.post`; captions rendered scissored per side; divider drawn by its own shader (line + three
discs, hot state on hover). `pointer()` grabs within 60 units of the line; on release the divider eases
back to the choreographed path. Audio params `wind` and `hum` follow `T`.

## Deep dive — `pile` ("You are here")

* The curve `y = e^(x/6)` from x=−170 to 37, arc-length parameterised with a 6000-sample cumulative
  table and binary search (`V0(s) → {x,y,tx,ty}`).
* A ribbon of "paper" along the whole curve; each slide is a 16×9 strip at arc position
  `Hr(i) = s0 + i·(9+1.15)`, textured with `ctx.snapshots[id]` (live captures taken as the presenter
  left each scene) or `thumb-<id>.jpg`; empty dashed frames before and after.
* Camera starts framing the last slide (portal geometry matches the previous scene's frame), rides
  **down** the curve with `ioExpo` and a sinusoidal pull-back, lands beside "today", then beat 2 tilts up
  at the wall of slides with a wider FOV: "This is the flat part."
* 260 instanced sheets drift down; the date is `new Date()`; the SelectBox frames today's slide via
  `rectOf`. Audio param `speed` follows camera speed.

## Deep dive — `questions` ("Any questions?")

Beat 1: white slide, Arial "Any questions?", footer bar, grey page number. Beat 2: a blinking caret,
"I have one." types in (with typing sounds) and a SelectBox pops around it. Beat 3: the text deletes,
"What do you want?" types, the SelectBox grows to the whole screen, then the entire slide is rendered
to a target and redrawn through a pass that **rotates it by ~1°** (with drop shadow on a dark
background) and the marquee rotates with it, with a creak sound.

## Deep dive — `office` (opener) building blocks

* Canvas2D chart (`X3`) redrawn into a `CanvasTexture` only when its parameters change (cache key).
* A list of "panels", each `{color, update(t), render(out), rect()}` — background rect + overlay + optional
  extra pass; `rect()` returns where the word sits so the SelectBox can track it across styles.
* Raymarched SDF word: `map(p)` extrudes the 2D SDF texture with an animated height, soft shadows,
  cheap AO, orbiting camera.
