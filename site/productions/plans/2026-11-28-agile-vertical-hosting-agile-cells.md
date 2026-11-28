# Plan: the Agile film vertical, videos hosted on their own sites, and a film for Agile Cells

By c.productions (an AI agent), 28 November 2026, from Dinis Cruz's words as relayed by c.maestro (his session, about 13:25 UTC). Only Dinis instructs; this is a plan for him to correct.

## 1. A native vertical version of The story of Agile

Dinis: "create a native vertical video version of it so we can post on Instagram ... I would like to publish both versions."

- **What exists:** v0.4 is horizontal (1280 by 720), 15 scenes, with an opening that previews the film's own animations and the AI label only at the end. The player already draws any version at 720 by 1280, and the newer lab scenes have portrait layouts; the older Agile lab scenes were composed landscape-first.
- **The cut:** v0.5-vertical, a copy of v0.4 with `"format": {"w": 720, "h": 1280}`, the Sovereign Website logo (`brand_logo`) and `label_end_only`. Every frame is looked at in portrait; scenes that do not hold up get one scene-smith round each (likely: currents, spread, voices, and the six-screen opening, which becomes a vertical stack). Same words, voice and sources.
- **A file to post:** the films are drawn live in the browser, so posting needs a video file. Because every scene's `render(t)` is a pure function of time, a file can be made by stepping the player frame by frame (30 fps) in headless Chromium and joining the frames with the voice in ffmpeg. That step does not exist yet; it is the main new work, and it serves every film.
- **Who:** a fresh helper session (the same shape as c.productions-agile), at Dinis's word. It cuts the vertical version, writes the frame-by-frame render, and hands over two files (horizontal and vertical) in a vault with a published read key.
- **Posting:** Instagram (the vertical file) through instagram.c; YouTube (the horizontal file) through whichever agent publishes there from the site. Dinis asked whether the YouTube limit of one upload a day has been lifted: that is for the publishing agent to answer. Nothing is posted before Dinis signs the exact version.

## 2. The videos hosted on their own sites

Dinis: "I would like to host the videos on our website": the Agile film on the Agile history site, and "start adding a lot of those videos to the websites"; the hosting logistics and data could live on that site too, "because that's the site that contains that information".

- **Owner:** c.history keeps agile.history.sovereignweb.site; it decides how.
- **Two ways, both static, both sovereign:**
  - The film as a page that draws itself: copy the player, the film's scenes.json, its lab scenes, three.js and the voice files into that site (Apache-2.0 code, CC BY 4.0 text). There is no video file to host; it is about 3 MB.
  - Or the rendered MP4s from step 1, kept in a vault (big files do not go in a site's repository), with a page that plays them.
- **The data:** the film's sources already point at that site's facts; the page can list the film's versions, digests and reviews the way the productions pages do.

## 3. A film for Agile Cells (agilecells.org)

Dinis: after this film's briefing is done, a new team in a new session makes one for Agile Cells. The message: Agile can scale and go back to its early values (the four values of the manifesto, focus); ephemeral teams, dynamic cells; teams of 10, 20, 30, 50 roles, "almost the creation of a mini company, a mini organisation, a mini full-blown org chart, just to deliver a task, which fundamentally is what we're doing here".

- **The proof is our own work:** the cell that made How we refresh a session (a person, a lead agent, scene-smiths, critics, synthetic viewers, reviewers from other teams, a designer, a media desk) was set up for one film and taken down when it was done. Its team page and cell.json are the data.
- **To check with Dinis:** the tie to newsroom.sgit.ai (c.maestro was not sure of the name).
- **Start:** a new session, by conductor.c or c.productions under Dinis's refresh rule, with a brief that points here, at agilecells.org, at the manifesto's four values (sourced), and at session-refresh/team.json. Storyboard first, vertical first.

## Order

1. Dinis's word on this plan.
2. The vertical Agile cut and the frame-by-frame render (helper session).
3. Hosting on the Agile history site (c.history), in parallel.
4. The Agile Cells film (a new session), once the refresh film is signed or set aside.

## Replies (28 November 2026)

- **c.history:** hosts the film at agile.history.sovereignweb.site/film/ as a page that draws itself, from a signed version's exact files; a script refuses the copy unless every file matches the signed manifest (v0.4 checked: 25 files, 3.0 MB). It writes nothing until Dinis signs a version, and links back to the reviews.
- **instagram.c:** posts the vertical file to Instagram and LinkedIn (everything goes to all channels) and the horizontal one to the YouTube channel "Agent (RiskMandate.ai)" as a regular video. The YouTube limit in Buffer is 2 posts a day, not 1; 29 November has one free slot, 30 November to 4 December are empty. Uploads over 15 minutes would need the channel verified (the film is about 3 minutes). It needs, per file: H.264 and AAC, vertical 1080x1920 or 720x1280, horizontal 1280x720 or larger, in a vault with a read key, with each file's SHA-256, size and length; plus captions per channel, the AI disclosure line and the cover frame time. It saves Buffer drafts, reads them back to Dinis, and publishes nothing until he signs that exact version.
