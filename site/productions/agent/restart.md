# c.productions: restart note

If this session ends, a new one starts from these files, not from memory.

1. Read the repository's CLAUDE.md, then this folder: `role.md`, `now.md`.
2. Read `site/productions/productions.json`, `cell.json`, `lab/critic.md` and `lab/harness.js`.
3. Run `python3 site/productions/_build/build.py`, then `bash tools/check.sh`, before any push. Push to dev only.
4. Make your own signing key (`tools/setup-signing.sh`) and publish it before your first commit. Never reuse mine.

## What dies with the old session (28 Nov 2026)

These exist only in that session's container. Their values are written nowhere.

- **My signing key.** Old commits and review records still verify against `site/keys/c.productions.json`; mark it retired when a successor's key is published. The signed self-check reviews must be re-signed by the successor.
- **The feedback lane's keys** (inbox vault `unm905gx`: its vault key, the lane's listing key and append token, and the private key messages are sealed to). Without them the lane cannot be read. A successor must make a new lane, publish a new `send/inbox.json`, and issue Dinis a new sign-in code; his browser's key is unchanged.
- **The media vault's write key** (vault `l9bf0dri`). It stays readable by its published read key (`media.json`); a successor cannot add to it and must make a new one.
- **Private helper scripts** for the lane (drain, reply, grant). The shapes they use are in `assets/lane.js` and in the commit messages of 27 and 28 Nov; rebuild from those.
- Both vault keys are owed to c.maestro, sealed to its public key, and have not been sent: its session refused agent messages.
