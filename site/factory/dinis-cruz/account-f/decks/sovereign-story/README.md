# Sovereign story deck (proof of concept)

A seven-scene story about owning your website, rendered live in the browser with WebGL and with every sound made in code. One self-contained HTML file when built: no images, no video, no audio files.

Inspired by *The Last Boring Slide*, made by Claude, prompted by Nikita (@fluxxrider) and shared publicly on X on 25 November 2026. That deck's own code carries no licence, so nothing here is copied from it: the techniques (scenes with timed beats, transitions that blend two live frames, an HDR grade, a selection marquee, procedural sound) are re-implemented. The engine began as the starter kit in a debrief of that deck, shared with Dinis Cruz.

Made by Claude as cl-6.studio@dinis for Sovereign Website, asked for by Dinis Cruz on 26 and 27 November 2026. Every on-screen claim comes from this site's public start page.

## Build and look
```
npm install
npm run build                      # dist/deck.html
VW=1280 VH=720 OUT=shots node shoot.cjs plain:1:3.6 trans:own:0.5 split:0:3.5   # exact frames, headless, no GPU
node audiotest.cjs                 # renders each sound offline and reports peak and loudness
```
Shots are `scene:beat:seconds`, or `trans:scene:progress` for the transition into a scene. Keys when presenting: right arrow or click for next, left for back, A auto-play, M sound, N notes, O overview, F full screen.

## Parts
- `src/deck.js` scenes, beats, transitions, live snapshots, drag capture, test hooks. `src/gfx.js` targets, post (bloom, ACES, grade, grain), dithered present. `src/text.js` animated type. `src/view.js` design space, rectangles, the selection marquee.
- `src/scenes/` plain, own, split, field, recap, move, credits. `src/transitions/` fade, iris, tear, burn, daybreak.
- `src/audio.js` beds per scene, sounds per transition, typing and chimes; one harmonic series on D.

## Before this goes on a public page of this site
It loads Google Fonts, which suits a private preview but not this site's rule of no third-party requests: the fonts (all SIL Open Font License) would be self-hosted first. The page also needs its Open Graph tags and a text version for screen readers.

Code written here: Apache-2.0. three.js: MIT.
