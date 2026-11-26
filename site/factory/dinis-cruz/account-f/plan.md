# cl-6.studio@dinis: plan for this week's videos

Written 2026-11-26 (Thursday), before any spend. Basis: this repository's pipeline (site/accounts/c/update/RUNBOOK.md, make.py, ship.py, state.json) as committed on dev. I could not see account B's live state, so anything marked "to confirm" is not checked.

## What the pipeline makes
One vertical Reel, 45 to 75 seconds: a synthetic presenter, an AI voice (Mistral Voxtral Mini TTS, preset voice James), 6 to 9 beats, a cover, a credits card, the on-screen label "Synthetic presenter · voice made by AI". A render stays inside the 3:4 and 1:1 crops, so the same file serves Instagram, YouTube (as a Short) and LinkedIn. Only the caption changes per platform, and cl-6.social@dinis drafts those. A person posts.

## Split with account B's studio agent
My assumption, to confirm with cl-6.maestro: account B's studio agent is studio.c, which owns the twice-daily update Reel (08:45 and 18:45 UTC) and the pipeline settings in site/accounts/c/update/.
- Account B keeps: the update Reels, its state.json, its spend ledger, its pipeline settings. I do not touch them.
- Account 6 makes: Sovereign Website videos that are not the update Reel, plus any extra update Reels B cannot fit, so the load moves off account B (at 73% of its capacity).
- Shared, read only for me: the list of presenters already used (state.json), so mine do not repeat B's recent ones. I keep my own list in now.md.
- No second pipeline. I run the same scripts, so a fix by either studio helps both. A change to a shared script goes in as a small signed commit, announced to cl-6.maestro, never as an edit to B's settings.

## This week (Fri 27 Nov to Wed 2 Dec): proposed
A number I can stand behind, not the most I could try: **four videos**, each one render posted to the three platforms.

| # | Video | Length | Needs from Dinis |
|---|---|---|---|
| 1 | What a Sovereign Website is (the owner holds the files, history and address) | 45 to 60 s | a yes on the angle; the wording comes from public pages on sovereignwebsite.org and sovereignwebsite.ai |
| 2 | One real change, start to finish: ask, commit to dev, checks, published | 60 s | a real example he is happy to show, with the public commit |
| 3 | The agents behind the site and what each one is not allowed to do (keys, dev only, a person posts) | 60 to 75 s | a yes; sourced from CLAUDE.md and published keys |
| 4 | A customer or visitor story | 45 to 60 s | only if Dinis supplies a real, public, consented story; otherwise this slot is not made. I will not invent one |

Drafts of 1 and 3 can be made from public material alone. 2 and 4 wait on Dinis. If he sends scripts of his own, they replace my drafts, and the fact check (every beat naming a person has a public source) still runs.

## What I need from Dinis
1. Scripts or topics, or a yes to the four above and which comes first.
2. Footage or real screen captures, if any, for the `image` beats (a public raw.githubusercontent.com URL pinned to a commit).
3. Presenter choice, or leave it to me: a stylised character first, never "realist" unless clearly labelled; character names only. Voice: James, as already chosen for the pipeline, unless he says otherwise.
4. A voice key and a daily spend cap for account F. I hold no token and will not ask for one in this chat: if he wants account F to spend, it comes through the credential route the maestro arranges. Account B's cap is 2 USD a day on OpenRouter; I will not assume that applies to me. Until a cap is set, I make scripts, storyboards and fact checks, which cost nothing, and stop before the voice step.
5. Where it renders: the pipeline needs ffmpeg, Playwright with Chromium, faster-whisper and the presenters library (PrompTugal/PrompTugal__News__Bulletins at 418b723, public). To confirm: whether this session's network allows that fetch. If not, I will say so rather than work round it.

## Platforms
- Instagram: Reel, the caption as drafted by cl-6.social, with Instagram's own AI label added by the poster.
- YouTube: the same file as a Short, title and description by cl-6.social. A channel is still to be confirmed to exist (B's runbook says "once connected").
- LinkedIn: the same file, a longer, plainer caption by cl-6.social.
Every caption says "synthetic presenter" and "voice made by AI".

## Order of work
1. Today: key, area, this plan (done once pushed).
2. On Dinis's answer: storyboard and fact check for video 1 and 3, no spend; then voice and render once a cap and key exist.
3. Each finished video: post folder committed under this repository's own rules and sent to cl-6.social for captions. I do not post.

## Proposed wake times (UTC)
Two a day, offset from account B's 08:45 and 18:45 so we do not collide on the same source material: **10:15 and 20:15**. Each wake: read now.md, check for Dinis's answers and signed records, move one video one step, push, update now.md. Wakes are cl-6.maestro's to set; these are proposals only.
