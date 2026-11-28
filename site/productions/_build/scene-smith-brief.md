# The brief a scene-smith sub-agent gets

One sub-agent per scene, started in the background, three or so at a time. This is the template the first session used for all seven lab scenes; fill the parts in brackets.

> You are a scene-smith: build ONE WebGL scene component, make it genuinely striking, and judge your own frames honestly. Work in the repository. Write ONLY inside site/productions/lab/[id]/ (scene.js, plus small helpers). Do not edit any other file, do not commit, do not push, do not start servers on ports other than 8770, do not call any external API or use any token.
>
> Read first: lab/harness.js (the contract), lab/critic.md (the rubric), and one or two finished scenes so yours belongs to the same film.
>
> Contract: export `meta = { id, title, beat, seconds, sources }` and `create({ canvas, THREE, reduced }) -> { render(t, w, h), dispose() }`. render must be a pure function of t (seed randomness once, with a fixed-seed PRNG). THREE is passed in; no other libraries, no network. Compose for 1280x720 and 720x1280. If reduced, one complete still.
>
> The scene: [the beat, its narration and exact segment timings if it is played under a voice; the IDEA to show as a picture; the exact words allowed on screen, with quotes character for character; what must not appear: people, faces, logos, names not allowed; the sources for meta].
>
> House look: navy #0b1420 to #12263a, ink #f4f1e8, amber #ffc857 main light, teal #5fd0c5 second, coral #ff6b5e only for failure. Keep the bottom 14% clear. Under about 100k points or instances, one pass.
>
> Test, repeatedly: serve site/ on 8770, then `node site/productions/_build/shoot.js [id] <out folder> t1,t2,...` and again with `portrait`. Fix every console error. LOOK at the PNGs and criticise them against critic.md, points 4 and 6 above all. At least three rounds.
>
> Report: what it shows by time, what changed between rounds, weaknesses that remain, a 0 to 2 score per rubric point with evidence, the final frame paths. Be honest if it still looks like a slide.

## Running the loop
1. Storyboard the beats first (the first session skipped this and Dinis and higgsfield.c both said it shows).
2. Start the scene-smiths. They take 9 to 17 minutes each and return a report.
3. Look at their frames yourself before registering a scene in `lab/scenes.json`. Check the file has no fetch, Math.random or Date in render.
4. Join scenes into a version: in the version's `scenes.json`, a scene with `"kind": "component", "component": "<lab id>", "span": [t0, t1]` plays that slice of the lab scene, stretched to the scene's `seconds`. Add `on_screen` text for the transcript.
5. Voice: write `narration` (and `say` for pronunciation) per scene, then `python3 _build/voice.py <version folder> <work folder>`: one MP3 per scene, and each scene's `seconds` set to its audio. Label the voice as made by AI in every frame (`label` in scenes.json).
6. Frames for the storyboard page: build the site, serve `_site` on 8765, `node _build/frames.js <production> <version> <vault folder>/frames`, then make 480-pixel JPEGs into `<version>/board/frames/` and copy `frames.json` to `<version>/board/`. Full-size frames go in the media vault.
7. Record each run in `cell.json`.
