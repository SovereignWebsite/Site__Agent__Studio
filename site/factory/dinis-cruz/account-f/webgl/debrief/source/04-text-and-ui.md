# 04 — Text and UI primitives

## Fonts

Role table (`WT`), resolved to CSS font strings by `Ln(role, px)`:

| Role | Family | Weight/style |
|---|---|---|
| `display` / `displayBold` | Unbounded ("Unb") | 300 / 800 |
| `text` / `textMed` / `textBold` | Geist | 400 / 500 / 650 |
| `mono` / `monoMed` | Geist Mono | 400 / 500 |
| `serif` / `serifIt` | Newsreader | 400 / italic |
| `anton` | Anton | 400 |
| `jb` | JetBrains Mono | 700 |
| `pixel` | "Pixel" | 400 |
| `arial` / `arialBold` | system Arial stack (raw) | 400 / 700 — used deliberately for the "boring template" look |

`loadFonts()` registers each with `new FontFace(name, url(dataURI), descriptors)`, awaited before
anything is laid out.

## `TextBlock` — glyph-instanced text

`ctx.text(str | [{t, size, font, color}…], opts)` with opts
`{x, y, size=48, font="display", color, align, valign:"top|middle|bottom|base", leading=1.12,
tracking=0, maxWidth=0, raster=1}`.

How it works:

1. **Layout on the CPU** with `CanvasRenderingContext2D.measureText`: rich runs, `\n`, word wrap at
   `maxWidth`, tracking, alignment. Produces `glyphs[]` with per-glyph `n` (index), `word`, `line`,
   `x, y, w, size, color, cx, cy, top, bot`, plus `box`, `lines`, `width`, `height`.
2. **Rasterise** each glyph into a private Canvas2D atlas at the *current pixels-per-unit*
   (`view.scale × raster`, ≤ 6), with padding for blur. Re-rasterised on resize → always pixel-sharp,
   no SDF artefacts.
3. **Draw** as one instanced quad mesh. Each instance has 24 floats: rect, uv, transform
   (dx, dy, scale, rot), alpha, blur radius, clip flag, skew, rgb, sx, sy, line top/bottom.
   The fragment shader does an optional 28-tap golden-angle blur (for blur reveals) and **line clipping**
   (glyphs outside their line box are discarded — that is how "rise" reveals slide up from behind a mask).
4. **Animate** with a callback run per glyph: `text.animate((g, out, block) => { out.dy = …; out.alpha = …; })`.

`text.show(progress, {style, q, stagger=.5, by:"glyph|word|line", seed})` is the standard reveal, where
`progress` is the in-ramp and `q` the out-ramp (both usually from `s.k`). Built-in styles:

| style | effect |
|---|---|
| `rise` | glyphs slide up from below their own line mask (clipped), exit upward |
| `blur` | fade + defocus + slight drift and scale |
| `type` | typewriter on/off |
| `fade` | plain alpha |
| `scatter` | fly in from random directions with spin |
| `track` | letter-spacing collapse with blur |
| `drop` | fall in with overshoot (`outBack`) and wobble |

`text.in3D(scale, {gain, depthTest})` re-parents the mesh into a 3D group (linear colour, flipped Y)
so the same text can live inside a 3D scene.

**Why this matters:** typography is a large part of why the deck feels designed. Every headline is
animated per word or per glyph, with real fonts, at native resolution, and can be distorted
procedurally (the "office" opener stretches the letters of BETTER with a sine wave, spirals 700 copies of
"better", bounces pixel-font letters on a quantised clock).

## SDF words (for 3D/shader use)

`W3(word, fontFn, {W=768, H=192, size=150})` draws a word into a canvas, then computes an exact
**signed distance field** with the Felzenszwalb–Huttenlocher 1D/2D Euclidean distance transform
(inside and outside separately, sub-pixel edge from coverage) into a `Float32` red texture. Used to
raymarch an extruded 3D word ("Better." in thick orange plastic with soft shadows and AO), to make a
liquid-chrome version with environment reflections, and to scatter 7,000 particles inside the glyph
mask.

## `SelectBox` — the recurring motif

A single-quad shader widget that draws a design-tool **selection marquee**: rounded box outline,
eight handle discs (white centre), an optional rotation knob with stem, optional fill, glow, marching
ants (`dash`), rotation. API: `.set(x,y,w,h,rot)`, `.alpha()`, `.size()`, `.appear(t)` (pop with
overshoot), `.around(textBlock, pad)`, `.color()`, `.glow()`, `.fill()`, `.knob()`, `.dash()`.
Colour default `#2b5cff`. The talk's visual metaphor ("select all", "the last boring slide", "what do
you want?") is built on this one widget appearing around words, slides and finally the whole screen.

`rectOf(points3D, camera, view)` projects 3D points to a design-space rect, so the marquee can frame a
3D object (e.g. "You are here" frames the current slide on the recap curve).

## `Rect` (`Qn`)

Flat colour or textured rectangle in design space (`set(x,y,w,h)`, `alpha`, `color`) — used for
backgrounds, the "template" bars of the dull slide, rule lines, the typing caret.
