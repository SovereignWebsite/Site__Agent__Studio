# 01 — Architecture

## The file

```
<!doctype html>
<head>  host boilerplate (viewport, safe-area padding, base font)
<body>
  <title>The Last Boring Slide</title>
  <style>   ~25 lines: #stage canvas full-window, #ui overlay, .notes, .over (grid), .help, .toast, .load
  <canvas id="stage" tabindex="0">
  <div id="ui"></div>
  <script>
     /* three.js MIT header */
     window.__FONTS = { "GeistMono-latin.woff2": "data:font/woff2;base64,…", … }   // all fonts inlined
     (()=>{                                    // one IIFE = bundler output
        …three.js r187 (minified, ~5,200 lines)…
        …app: utils → GLSL libs → gfx → fonts → text → view → overlay → SelectBox
              → createDeck → presenter UI → boot(C3) → transitions → audio → scenes …
        C3({ createDeck, scenes:[13], transitions:{10}, makeAudio, headless })
     })();
  </script>
```

Everything is inside the one `<script>`. Optional external hooks exist but are unused in the
published file: `window.__ASSETS[name]` (falls back to `assets/<name>`), `fonts/<file>` fallback when
`__FONTS` lacks an entry, and `thumb-<sceneId>.jpg` for the overview grid.

## Module map (de-minified names → role)

| Minified | Suggested source name | Role |
|---|---|---|
| `Ct, K, Te, kt, Fn, bt.*, ze, Ys, Si, Mr, Do` | `util/math.js` | clamp, lerp, remap, smoothstep, smootherstep, easings, seeded PRNG (mulberry-style), 1D hash/noise, frame-rate-independent damping `1-exp(-k·dt)`, hex→rgb |
| `Bn, Fe, y3, Sn` | `gl/lib.glsl.js` | GLSL string chunks: hashes; value noise + fbm (2D/3D); SDF primitives + `smin` + `rot2`; colour (`toLin`, `toSrgb`, `luma`, `blackbody`) |
| `b3` | `gfx.js` | WebGLRenderer wrapper: `target`, `pass`, `draw`, `copy`, `post`, `present`, `resize`, `park`, `time` |
| `WT, Ln, M3` | `type/fonts.js` | font role table (`display`, `text`, `mono`, `serifIt`, `anton`, `pixel`, `arial`…), CSS font strings, `FontFace` loader |
| `S3` (class `TextBlock`) | `type/text.js` | glyph-instanced text with per-glyph animation |
| `E3` | `view.js` | 1920×1080 design space, letterboxed orthographic camera |
| `Gf` | `overlay.js` | a `Scene` drawn with the view camera (2D layer) |
| `t0` (`SelectBox`), `Qn` (`Rect`), `_3` (`rectOf`) | `ui/*.js` | selection-marquee shader widget, flat/texture rect, project 3D points to a 2D rect |
| `A3` | `deck.js` | **the runtime**: scenes, beats, transitions, loop, input, warm-up, test API |
| `R3` | `presenter.js` | keyboard, notes panel, notes window, overview grid, help, toasts, idle cursor, URL hash |
| `C3` | `main.js` | boot: create deck, loading bar + `warmAll`, start at hash, attach presenter |
| `P3, Xb, Yb, $b, Zb, tw, iw, sw, aw, lw` | `transitions/*.js` | fade, portal-in, portal-out, fold, wash, flaps, slam, daybreak, line, tear |
| `Sr, cc, k3, D3, U3, qi + subclasses, O3, V3, G3` | `audio/*.js` | sound recipes, pad recipes, bank, engine, scene beds, transition sounds, public audio API |
| `$3 … qb` | `scenes/*.js` | the 13 scenes |

## Boot sequence

1. `C3(...)` → `createDeck({canvas, scenes, transitions, headless, qs, makeAudio})`.
2. `createDeck` awaits `loadFonts()` (FontFace from `__FONTS` data URIs), creates `gfx`, `view`,
   the text system, audio, the shared context object `ctx`, three scratch targets, and wraps each
   scene definition in a `SceneRunner`.
3. If WebGL 2 fails → a help box: "This presentation needs WebGL 2…".
4. Unless `?quick` or headless: show "Opening presentation" + progress bar and run
   `deck.warmAll(progress)` — every scene is `init`-ed, every beat rendered once at p=0.5 and 1, and
   its entry transition rendered at p = .2/.5/.8 into scratch targets. This compiles all shaders and
   allocates all targets *before* the talk starts, so there are no hitches mid-presentation.
5. Start at the scene/beat from `location.hash` (`#futures-2`), else the first scene.
6. Attach presenter UI; set `window.ready = true` (a hook for headless capture tools).

## How the single file was most likely produced

The code shape says: ES modules + three.js imported from npm → bundled and minified (mangled
two-letter names, `var X=class{…}`, one IIFE, `__FONTS`/`__ASSETS` globals for inlined resources) →
a post-build step that base64-inlines fonts (and would inline assets) and writes one HTML file.
`?headless`, `window.__fdiv`, `window.ready` and `deck.test.{seek,trans,perf}` exist so an
automated browser can render any scene/beat/transition frame deterministically — which is how the
author verified the visuals and generated thumbnails. See `09-playbook-for-agents.md` for a
reproduction of that pipeline.
