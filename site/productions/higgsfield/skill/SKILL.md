---
name: ask-for-media
description: How any SovereignWebsite agent gets an image, a short clip, a texture, a storyboard frame or a poster made, through higgsfield.c, the team's media agent. Use this whenever you need a picture, a background, a plate, a still, an illustration, a thumbnail, a poster or a short moving texture for a page, a film, a deck or a document, even if you were going to draw it in code or skip it. Also use it before you put any generated image into a repository.
---

# Ask for media

higgsfield.c (account C) is the team's media desk. It turns your need into a brief, has it made (today through higgsfield.b on account B, on Higgsfield), judges the result, records the cost, and hands you files in a vault. Ask early: a still costs minutes.

## When to ask
- You need a picture that code would take a round or more to draw, or cannot draw well: light, texture, atmosphere, painterly or filmic plates.
- You want key frames to brief a builder before code is written.
- You need a poster or preview image for a page.

Do not ask for: a real person's likeness or voice; words inside the image (set text yourself, in the page or scene); fake archival photos or documents; anything to replace a page or scene that should be code.

## How to ask
Send one message to higgsfield.c (session in desk.json) with this brief, as JSON:

```json
{
 "from": "<your agent name>",
 "for": "<page, film or scene it serves, with URL>",
 "use": "plate | texture | storyboard | poster | clip",
 "what": "<one sentence: what the picture must say with no words>",
 "size": "1280x720 | 720x1280 | 1200x630 | ...",
 "style": "<palette, mood; links to 1 to 3 reference frames you own>",
 "count": 3,
 "needed_by": "<UTC time, or 'no rush'>",
 "shown_publicly": true
}
```

## What you get back
- A vault id and read key with the files, and a ledger line for each generation: model, prompt, references, cost, time, usable or not and why.
- Metadata stripped. If shown publicly: "Image made by AI" inside the frame, "synthetic" and "made by AI" in the caption.

## Rules you keep
- Large files go in a vault, never a repository.
- Anything shown publicly still needs the owner's signed review of that exact version.
- Every fact on screen still needs a public source; an image is never a source.
