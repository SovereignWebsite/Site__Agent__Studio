# What we learnt making live WebGL decks

By cl-6.studio@dinis (Claude, account 6), with Dinis Cruz, 26 and 27 November 2026. Everything here was tried in this repository and checked by rendering or measuring; where something is a judgement, it says so.

## 1. What exists, and where
- **The debrief** of *The Last Boring Slide* (a deck made by Claude, prompted by Nikita, @fluxxrider), written by another Claude session for Dinis: twelve chapters and a starter kit. Published here as `debrief/` and `starter/`.
- **Sovereign story** (`../decks/sovereign-story/`): seven scenes about owning your website. First deck built here; procedural sound of our own; portrait layout; the R recorder; the filming rig.
- **Signed** (`../decks/signed/`): five scenes told from this repository's own data (its files, its commits, its signatures, its policy). Uses the debrief's second starter: its line, daybreak, slam and tear transitions and its sound engine.

## 2. The architecture in one paragraph
A deck is a list of scenes. A scene is a plain object: an id, beats (each with a duration and a hold), speaker notes, and `create(ctx)` that returns `update(s)` and `render(target, s)`. Every animation is a ramp, `s.k(beat, t0, t1, ease)`, eased from 0 to 1 between two moments of a beat; there is no timeline editor. A transition gets two live frames (the outgoing and incoming scenes keep animating) and blends them in a shader at progress `p`. Scenes render in half-float (HDR) targets, then one shared finishing pass adds bloom, a filmic tone curve, vignette and grain; text is drawn after that pass so it stays sharp and is never tone-mapped. three.js is used only as the WebGL plumbing; every material is a hand-written GLSL3 shader.

## 3. The loop that made it good: build, shoot, look, fix
- An agent cannot judge what it cannot see. Every change was followed by shooting exact frames in headless Chromium (software WebGL, no GPU) and looking at them as images.
- Frames are deterministic: the deck has test hooks (`deck.test.seek(scene, beat, seconds)`, `deck.test.trans(scene, p)`) and seeded randomness, so the same shot list gives the same pictures every time. Keep the shot list; shoot it before and after each change.
- Contact sheets (ffmpeg `xstack` with a label per tile) let you judge a whole deck in one image.
- Cost here: about 0.1 to 0.6 s per 1280x720 frame, about 1 s per 1080x1920 frame on the software renderer.

## 4. Design: review by measurement, not taste alone
- A separate reviewer agent, given only the frames and the brief, found what the maker had stopped seeing: peach text on a peach sky (1.9:1), green on green fog (2.6:1), green "No" over green boxes (1.9:1). It measured contrast with PIL against the pixels behind the text and gave exact fixes.
- Rules that came out of it, now used everywhere: the accent green is used only on near-black; one type scale (headline 150 or 112, body 38 to 46, mono 30) and one left margin (140 landscape, 72 portrait); a soft dark scrim behind text that sits over lit 3D; a darker sky band where captions sit. After the fixes, text measured 7:1 to 19:1 typically against a 4.5:1 target.
- Physical transitions (tear, burn, slam) need restraint: thin, hot edges read as premium; thick bright rims read as cartoon.

## 5. Portrait (phones, Reels, Shorts)
- A screen taller than wide gets its own 1080x1920 design space; scenes choose their layout once, when they are created, and the page reloads if the screen turns past square.
- Keep the bottom fifth of the frame empty: a feed's caption and buttons cover it. Check every scene against that line.
- Some ideas change shape: the split screen divides top and bottom instead of left and right; 3D cameras need a wider field of view.

## 6. Sound
- All sound is made in code with the Web Audio API: no audio files. One harmonic series (on D) for every pitch keeps everything consonant.
- Two engines were used: our own small one (oscillators, filtered noise, a synthetic reverb) and the debrief's second starter engine (PADsynth pads, modal hits, cues placed on each transition's own 0 to 1 timeline), which sounds richer. Use the second.
- Browsers start sound only after a click or key. Say so on screen.
- An agent cannot listen. Render offline and measure: every sound present, no clipping (peaks below about -1 dBFS), hits 15 to 20 dB above the beds. Then a person listens.

## 7. Video: three ways
1. **The R key** records the canvas and the sound with MediaRecorder to a WebM file (VP9 and Opus). Browsers do not write the duration into such files; remux with ffmpeg (`-c copy` to MKV) if an editor complains.
2. **Screen recording** works, but heavy scenes drop frames.
3. **The filming rig** (`film.cjs`): the deck plays on auto-play one fixed step per frame and every frame is saved; every scene, beat, transition and timed hit is logged with the deck's own clock; the sound is then rendered offline (OfflineAudioContext) from that log, so picture and sound match exactly. About an hour for two minutes at 1080x1920 on a software renderer. Encode with ffmpeg and strip metadata: `-map_metadata -1 -fflags +bitexact -flags:v +bitexact -flags:a +bitexact`.

## 8. Publishing on a Sovereign Website
- No third-party requests: serve fonts from the site (we used the @fontsource packages: Inter, Space Grotesk, JetBrains Mono, Newsreader, all SIL Open Font License).
- Every page needs its Open Graph and Twitter tags and a 1200x630 share card under 300 KB; a frame from the deck makes a good one.
- Put a text version of the story in the page for screen readers (visually hidden, inside `main`), give the canvas `role="img"` and a label, and do not put `aria-pressed` on plain text.
- `tools/check.sh` stops at the first failing step; when another area is failing, run each step on its own to see yours.
- The link checker reads inline scripts: `href="${...}"` inside a template string looks like a broken link. Build such links as elements instead.
- The accessibility check counts content outside landmarks; give loose blocks `role="region"` with a label.
- A claude.ai artifact is a good private preview (it allows Google Fonts), but it blocks downloads, so the recorder cannot save there.

## 9. Facts on screen
- Snapshot real data at build time and say when it was taken (`tools/data.mjs` in the Signed deck reads this repository's commits, trailers, signatures and files).
- Check every claim against its source before it goes on screen: for Signed, the commits that name an agent are exactly the signed ones (55 of 61); the five rules are quoted word for word from `policy/abp.json`, and the policy itself says agent rules are followed and reviewed, not yet all checked automatically.

## 10. Bugs that cost time (so they do not again)
- A canvas texture cannot change size once on the GPU: when text is re-set to a different length, dispose of the texture and make a new one, or the letters come from the wrong places.
- Instanced geometry with 2D positions needs a hand-set bounding sphere, or three.js computes NaN.
- Live snapshots of earlier scenes are already graded: show them without tone mapping, or they darken.
- A transition that samples outside the frame (a zoom of more than 1) streaks at the edges; scale inward.
- Screenshots include page controls; hide them when filming.
- Build output paths: a relative path is relative to where the build runs. Write into the repository with absolute paths.

## 11. Getting files from SG/Send without a browser
A share link such as `send.sgraph.ai/.../#word-word-1234` is a friendly token. The transfer id is the first 12 hex characters of SHA-256 of the token; the key is PBKDF2-SHA256 of the token with salt `sgraph-send-v1` and 600,000 rounds; the file is AES-256-GCM with its 12-byte IV first, and may start with an `SGMETA` envelope holding the file name. Large files come from `/api/presigned/download-url/<id>`. Anyone with the link can read the file: treat it as a password.

## 12. Credit and licences
- *The Last Boring Slide* was made by Claude, prompted by Nikita (@fluxxrider), and shared publicly on X on 25 November 2026. Its own code carries no licence, so none of it is copied here; only techniques are reused.
- The debrief and its starter kits were written by a Claude session for Dinis Cruz and are published here at his request.
- three.js: MIT. Fonts: SIL Open Font License 1.1. Code written here: Apache-2.0. Text: CC BY 4.0.
