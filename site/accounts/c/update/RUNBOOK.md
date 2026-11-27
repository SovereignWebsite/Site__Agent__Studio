# studio.c: the update Reel (twice a day)

Asked by Dinis Cruz in studio.c's session (https://claude.ai/code/session_01Kw9UwC3pdjxjDeK5WaZYUD), 23 November 2026: every 4 hours, one Reel telling the story of the last 4 hours of the team's work, a different synthetic presenter each time, made with a small team of sub-agents, published on Instagram (YouTube once connected). His answers the same night: spend cap 2 USD a day on OpenRouter; approval by a standing rule that instagram.c records and runs; this pipeline kept here.

Cadence: Dinis Cruz, 24 Nov 2026, chose twice a day, at 08:45 and 18:45 UTC (each Reel covers about 12 hours), so YouTube and LinkedIn, at two posts a day each, stop falling behind Instagram. The schedule had been paused at 01:59 UTC that day; nothing ran from 22:46 on 23 Nov to 18:45 on 24 Nov.

## One run
1. **Window:** from the last run's `last_until` in state.json (or 12 hours back) to the run's start, from `date -u`.
2. **Collect:** `python3 collect.py <since> <until> <workdir>/repos <workdir>/events.json` (read-only clones of every public SovereignWebsite repository).
3. **Researcher** (sub-agent): events.json -> facts.json: storylines with sources; no private people, prospects, keys or handles; no invented numbers.
4. **Journalist and designer** (sub-agent): facts.json -> storyboard.json (format below): an angle, a cover that makes people tap (date, punchy headline, what is inside), 6 to 9 beats of about 12 to 25 words each, a visual per beat, 45 to 75 seconds in all, and the presenter not used in the last runs (state.json).
5. **Check:** studio.c reads every beat against facts.json before any spend. Every beat that names a person, or says what a person did, needs a public source in its `facts` that says it; a private brief (even Dinis's own words in a session) is not a source for a public post (instagram.c, 24 Nov 2026, on the Galaxy Reel's Vicky line). Without one, drop the claim or ask for a public page first.
6. **Make:** `PRESENTERS_LIB=<checkout>/src/lib/presenters/v0.1.0 python3 make.py storyboard.json <workdir> <post-folder>`: voice (checked word for word), timing, render, cover.
7. **Ship:** commit the post folder (`site/posts/<date>__update-<hhmm>/`, post.json without an approved line) to Site__Platform__Instagram dev under the contributor role, signed; send instagram.c the commit and sha256s; update state.json; wait until the new video answers 200 on instagram.platform.sovereignweb.site (its Pages deploy takes a few minutes), then rebuild the review page here (`python3 update/review_page.py <instagram clone> site/index.html site/accounts/c/index.html`), tell design.c so it regenerates its designs, run this site's checks and test every exit status before pushing; tell conductor.c.
8. **Spend:** stop before step 6 if today's ledger in state.json plus the run's estimate would pass 2 USD.

## Checks before every push to this site
All four, with each exit status tested: `node .github/ci/build.mjs`, then `share-check.mjs _site`, `quality.mjs _site` and `axe.mjs _site` (axe with playwright 1.49.1 and @axe-core/playwright 4.10.1, as CI uses; locally, launch the browser at /opt/pw-browsers/chromium). A page that fails any of them fails the whole site's deploy, for every account (27 Nov 2026: a draft without a main landmark did).

## Drafts before the MP4
`make.py storyboard.json <work> <post> --draft site/accounts/c/drafts/<id>/` writes a page that plays the Reel in a browser with its voice, for Dinis to review before the video is cut. It never loads presenters.js (b.security's ruling of 26 Nov 2026); a labelled box stands in for the presenter. Render the MP4 only after the draft is seen.

## Synthetic presenters in public posts
b.security's ruling of 26 Nov 2026 (Site__Agent__Security site/decisions/opinions/2026-11-26__presenter-stills-in-public-posts.json, signed): rendered stills, covers and videos may be posted; a page that loads presenters.js stays a preview. Conditions, all applied by the pipeline or checked at step 5:
- A readable label, "Synthetic presenter · voice made by AI", inside every frame and the cover, where no crop can cut it (reel.html.tpl `#ai`, at y 1318 to 1360: inside the 3:4 grid crop and the 1:1 crop).
- Captions say "synthetic presenter" and "voice made by AI"; instagram.c adds each platform's AI label.
- Character names only, never a real person's; no impersonation of a real journalist or outlet (say "Teletext", not the library's "Ceefax"); stylised characters first; "realist" only clearly labelled and never in a frame that could pass for a real broadcast; characters unchanged; stock voices only.
- No EXIF or authoring metadata: render-reel.js drops tags and the x264 settings block, make.py remuxes with bitexact and stops if "Lavf", "Lavc" or "x264 - core" is left, and the cover is written bitexact.

## Voice
Mistral Voxtral Mini TTS, preset voice James (`"voice": "mistral:voxtral-mini-tts-3:voice_3150"`), for every presenter: Dinis's choice on 23 November 2026 after the tests in ../notes/2026-11-23__voice-quality/. gpt-audio's ballad and sage are retired. Speed: 25% faster with ffmpeg atempo (make.py SPEED 1.25; a storyboard may set "speed"), Dinis's choice on 24 November 2026 after the tests in ../notes/2026-11-24__speed-and-pauses/; the silence at each beat join grows with the speed so the heard pause stays at about 0.7 s or more. Sound chain: plain gain to -18 LUFS, soxr to 48 kHz, 4x-oversampled limiter at -2 dBTP, mono AAC 192 kb/s.

## Credits
Every Reel ends on a credits card (3.5 s, readable when paused), added by make.py, Dinis's rule of 23 Nov 2026: made by Claude (Anthropic) as studio.c with its sub-agents; the actual voice model, provider and voice; the presenter, synthetic, from the PrompTugal.news presenters library (bulletins.b), CC BY 4.0; music (none so far); sources (storyboard.json in the post folder); posted under a written rule that the owner reviews; riskmandate.ai.

## storyboard.json
`{ "window", "presenter" (library id), "presenter_name", "voice" (gpt-audio voice), "voice_direction", "cover": {"hold":1.2,"date","kicker","headline" (may use <em>),"sub"}, "beats": [{"id":"b1","narration","visual":{"kind", ...,"caption"?},"gesture"?,"facts":[source urls]}], "caption" (Instagram caption), "stats" (pages of [label,value] rows, filled by studio.c) }`

Visual kinds: `title {text,sub}`, `stat {value,label}`, `bars {items:[{label,value}]}`, `timeline {items:[{when,what}]}`, `flow {nodes:[...]}`, `list {items:[...]}`, `cards {items:[{title,sub,icon}]}` (icons: conductor, factory, sites, design, security, hub, obs, library, instagram, studio, key), `quote {text,by}`, `compare {left:{title,points},right:{...}}`, `agents {items:[{name,count}]}`, `image {src (raw.githubusercontent.com URL in a SovereignWebsite repository, pinned to a commit), alt, credit}` for real screen captures (for example from video.aws.c), drawn in the top panel.

## Sources
The presenters: PrompTugal presenters library v0.1.0 (PrompTugal/PrompTugal__News__Bulletins at 418b723, src/lib/presenters/v0.1.0), by bulletins.b@PrompTugal.dinis; code Apache-2.0, data CC BY 4.0, three.js MIT. Fetched at run time and used only inside a local headless browser to draw frames; not served from this site. Every presenter is labelled synthetic on screen.

Code here: Apache-2.0. Text: CC BY 4.0.
