# studio.c: the 4-hourly update Reel

Asked by Dinis Cruz in studio.c's session (https://claude.ai/code/session_01Kw9UwC3pdjxjDeK5WaZYUD), 23 November 2026: every 4 hours, one Reel telling the story of the last 4 hours of the team's work, a different synthetic presenter each time, made with a small team of sub-agents, published on Instagram (YouTube once connected). His answers the same night: spend cap 2 USD a day on OpenRouter; approval by a standing rule that instagram.c records and runs; this pipeline kept here.

## One run
1. **Window:** the 4 hours ending at the run's start hour (UTC), from `date -u`.
2. **Collect:** `python3 collect.py <since> <until> <workdir>/repos <workdir>/events.json` (read-only clones of every public SovereignWebsite repository).
3. **Researcher** (sub-agent): events.json -> facts.json: storylines with sources; no private people, prospects, keys or handles; no invented numbers.
4. **Journalist and designer** (sub-agent): facts.json -> storyboard.json (format below): an angle, a cover that makes people tap (date, punchy headline, what is inside), 6 to 9 beats of about 12 to 25 words each, a visual per beat, 45 to 75 seconds in all, and the presenter not used in the last runs (state.json).
5. **Check:** studio.c reads every beat against facts.json before any spend.
6. **Make:** `PRESENTERS_LIB=<checkout>/src/lib/presenters/v0.1.0 python3 make.py storyboard.json <workdir> <post-folder>`: voice (checked word for word), timing, render, cover.
7. **Ship:** commit the post folder (`site/posts/<date>__update-<hhmm>/`, post.json without an approved line) to Site__Platform__Instagram dev under the contributor role, signed; send instagram.c the commit and sha256s; update state.json; wait until the new video answers 200 on instagram.platform.sovereignweb.site (its Pages deploy takes a few minutes), then rebuild the review page here (`python3 update/review_page.py <instagram clone> site/index.html site/accounts/c/index.html`), tell design.c so it regenerates its designs, run this site's checks and test every exit status before pushing; tell conductor.c.
8. **Spend:** stop before step 6 if today's ledger in state.json plus the run's estimate would pass 2 USD.

## storyboard.json
`{ "window", "presenter" (library id), "presenter_name", "voice" (gpt-audio voice), "voice_direction", "cover": {"hold":1.2,"date","kicker","headline" (may use <em>),"sub"}, "beats": [{"id":"b1","narration","visual":{"kind", ...,"caption"?},"gesture"?,"facts":[source urls]}], "caption" (Instagram caption), "stats" (pages of [label,value] rows, filled by studio.c) }`

Visual kinds: `title {text,sub}`, `stat {value,label}`, `bars {items:[{label,value}]}`, `timeline {items:[{when,what}]}`, `flow {nodes:[...]}`, `list {items:[...]}`, `cards {items:[{title,sub,icon}]}` (icons: conductor, factory, sites, design, security, hub, obs, library, instagram, studio, key), `quote {text,by}`, `compare {left:{title,points},right:{...}}`, `agents {items:[{name,count}]}`, `image {src (raw.githubusercontent.com URL in a SovereignWebsite repository, pinned to a commit), alt, credit}` for real screen captures (for example from video.aws.c), drawn in the top panel.

## Sources
The presenters: PrompTugal presenters library v0.1.0 (PrompTugal/PrompTugal__News__Bulletins at 418b723, src/lib/presenters/v0.1.0), by bulletins.b@PrompTugal.dinis; code Apache-2.0, data CC BY 4.0, three.js MIT. Fetched at run time and used only inside a local headless browser to draw frames; not served from this site. Every presenter is labelled synthetic on screen.

Code here: Apache-2.0. Text: CC BY 4.0.
