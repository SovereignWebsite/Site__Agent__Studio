# c.productions: restart note

If this session ends, a new one starts from these files, not from memory. To start it, a person opens a new session on this repository and says one line:

> You are c.productions. Read site/productions/agent/restart.md in Site__Agent__Studio (dev) and continue.


1. Read the repository's CLAUDE.md, then this folder: `role.md`, `now.md`, `learnings.md`.
2. Read `site/productions/productions.json`, `cell.json`, `lab/critic.md` and `lab/harness.js`.
3. Run `python3 site/productions/_build/build.py`, then `bash tools/check.sh`, before any push. Push to dev only.
4. Make your own signing key (`tools/setup-signing.sh`) and publish it before your first commit. Never reuse mine.

## What dies with a session (learnt at the hand-over of 28 Nov 2026)

These exist only in the running session's container. Their values are written nowhere.

- **The signing key.** Before the old session stops it must move its own key file to `site/keys/retired/` in a signed commit: the signer check lets a key be published only as a NEW file `site/keys/<name>.json`, alone in its commit, so a successor cannot replace it. The successor then runs `tools/setup-signing.sh`, commits its key alone, and re-signs the self-check reviews (`_build/sign_review.py`).
- **The feedback lane's keys** (its vault key, listing key, append token, and the private key messages are sealed to). Either the old session seals them to the successor's published key while both are alive, or the successor makes a new lane: `sgit create` (output to a private file), a first commit and push, a private `~/.sg-send/lanes/productions.lane.json`, then `python3 _build/lane_agent.py anchors`, a new `send/inbox.json`, and a new sign-in code for each browser (`lane_agent.py grant <PK1 code> <name> <role> <file>`). Ask the old session for the owner's PK1 code before it stops: it is public, and saves asking him.
- **The media vault's write key.** The vault stays readable by its published read key; the successor makes a new one and lists the old under `earlier` in `media.json`. The read key is `sgit_public_read_` followed by the derived read key; test it with a read-only clone before publishing.
- Each new vault key is owed to c.maestro, sealed to its published encryption key (check the fingerprint, which is the first 16 hex digits of the SHA-256 of the key's DER form), as `agent/for-maestro/<date>.sealed.json`.
- Anything in the scratch folder: frames, voice work files, sub-agents' test shots.

## Research already paid for (in the old session's scratch space, so lost)
The sourced facts for the new Agile opening are summarised in the old session's reports only. The durable parts: the Agile film's facts are in `agile-history/v0.3/scenes.json`; the refresh facts are in `session-refresh/document.json`. For the new opening, re-derive from these public pages rather than trusting memory: survey.stackoverflow.co/2018 (85.4% Agile, self-selected); news.microsoft.com (Windows XP 25 Oct 2001, Vista 30 Jan 2007); devblogs.microsoft.com/oldnewthing/20050819-10 (Windows 95 on thirteen floppies); the Flickr talk '10 deploys per day', Velocity 2009; blog.chromium.org 22 Jul 2010 (six-week releases); the 2019 State of DevOps report; ronjeffries.com 'Dark Scrum' (2016); toolshed.com 'The Failure of Agile' (2015); blog.cleancoder.com 28 Aug 2018; theregister.com 16 Jul 2024 (Kern); Bell and Thayer 1976 for the word 'waterfall'; GAO-24-105506 (Royce never used the word). The Wayback Machine was not reachable; no snapshot was loaded.
