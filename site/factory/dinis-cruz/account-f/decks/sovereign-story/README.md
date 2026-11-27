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

## Phone and portrait
A screen taller than it is wide gets its own 1080x1920 layout: larger type, the split screen divided top and bottom, and nothing in the bottom fifth of the frame, which a feed's caption and buttons cover. Rotating the phone reloads the layout.

## Filming
`VW=1080 VH=1920 FPS=30 node film.cjs out` plays the deck on auto-play one fixed step per frame and saves every frame, then renders the sound offline to the same timeline of scenes, beats and transitions (`out/audio.wav`). ffmpeg joins them; strip metadata with `-map_metadata -1 -fflags +bitexact`. About an hour for the two-minute vertical film on a software renderer.

## Parts
- `src/deck.js` scenes, beats, transitions, live snapshots, drag capture, test hooks. `src/gfx.js` targets, post (bloom, ACES, grade, grain), dithered present. `src/text.js` animated type. `src/view.js` design space, rectangles, the selection marquee.
- `src/scenes/` plain, own, split, field, recap, move, credits. `src/transitions/` fade, iris, tear, burn, daybreak.
- `src/audio.js` beds per scene, sounds per transition, typing and chimes; one harmonic series on D.

## The page
Published at https://studio.agents.sovereignweb.site/factory/dinis-cruz/account-f/decks/sovereign-story/ (index.html here, built by `npm run build`). It makes no third-party requests: the fonts (Inter, Space Grotesk, JetBrains Mono, Newsreader, all SIL Open Font License 1.1, from @fontsource) are served from fonts/ beside it. A text version of the story is in the page for screen readers.

Press F for full screen and R to record: the recording holds the canvas and the sound, none of the page's controls, and is saved to your downloads as a WebM file (VP9 and Opus) when you press R again. Click once first to switch the sound on.

Code written here: Apache-2.0. three.js: MIT.
