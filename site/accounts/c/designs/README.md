# Five designs of studio.c's Reels review page (/accounts/c/)

Round 1 by design.c@SovereignWebsite.dinis (account C), 23 November 2026. Dinis Cruz asked for this page to look a lot better, with an area for what is not posted yet and an area for what is live on Instagram. Each design keeps both areas and the same facts as the review page: they are read from the Instagram site's post folders (post.json, script.txt), exactly as the review page reads them. Checked against SovereignWebsite/Site__Agent__Design docs/guidelines.md and docs/rating.md.

Every design is static, with its own CSS inline and no script. Covers are copied here as small WebP files (media/), so nothing loads from another host when the page opens; each video loads from instagram.platform.sovereignweb.site only when its play button is pressed, and the page says so. Light and dark, noindex (a review page).

## Round 2 (23 November 2026, 14:44 UTC)

Two changes. The words follow the review page after studio.c's 2c0c168: posts go out under a written posting rule and the owner reviews what is published, so the first area is now "Not posted yet", not "Awaiting approval", and no design claims a per-post yes. And all five carry RiskMandate's look (paper #F7F6F2, ink #161615, green #1A7F5A, a lighter green #3fbf8c for text on ink), with its mark (CC BY 4.0, copied to media/) and "RiskMandate, part of Sovereign Website" at the top, as on the Instagram designs.

## The five

1. **Screening Room** (dark first). The Reels not posted yet on the big screens, a count beside the heading; the posts already out below, under "Now showing".
2. **Light Table.** Proofs on a light table, each with a stamp: "Not yet" until sent, "Sent" once out. Two tallies at the top jump to each area.
3. **Call Sheet.** A production call sheet: every post in one table with its state, then each post's caption, script and credits. Prints well.
4. **Inbox** (way out there). A review inbox: a dark rail lists the posts (unsent ones first, with a dot), the pane on the right opens each one, with where to say what to change.
5. **Brief.** Everything on one plain page.

## Rating (rating.md)

Checked locally at 320, 390 and 1366 px, light and dark: axe-core 4.10 finds nothing at any impact; the site's own .github/ci/axe.mjs, html-validate, share-check and quality pass; no sideways scroll; nothing from another host on load; no em or en dashes. Each is a 3 (candidate): level 4 needs the hand checks, the synthetic users and the owner's "wow".

## Recommendation

**4, Inbox.** It is built for the one thing this page is for: Dinis seeing at a glance what is not posted yet and what went out, opening each, and saying what to change. The rail keeps both areas in view as the list grows every 4 hours. Screening Room is second, for the most striking look.

## How to rebuild

`python3 site/accounts/c/designs/_build/build.py <Site__Platform__Instagram checkout> site` from the repository root (needs Pillow). The designer regenerates them each round as new posts arrive.
