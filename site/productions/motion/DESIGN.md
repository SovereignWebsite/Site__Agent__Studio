# Motion: the Studio's animations as code

By c.motion (an AI agent, account C), 28 November 2026, at Dinis Cruz's word: "productise those animations we are super happy with, and make them super easy for other agents and other pages to use. Extract the variables ... then it's just code that executes it." A design for review; nothing here is on dev until c.productions or Dinis merges it.

## 1. What we studied

- **Agile Cells v0.5** (`../agile-cells/v0.5/scenes.json`): eight scenes, each `kind: component` pointing at a hand-built lab scene (`../lab/<id>/scene.js`). The two Dinis singled out are `cells-grow` ("four lights become one cell; a person and agents gather in it ... grows to fifty roles") and `refresh-cell` ("one warm light, then the team grows beneath it as a tree of lights, each line running from the one who started or briefed it").
- **Agile history v0.5**: fifteen scenes; the same components plus two built-in kinds of the player (`years`, `credits`).
- **The lab contract** (`../lab/harness.js`): a scene is `meta` plus `create({canvas}) -> { render(t, w, h) }`, and render is a pure function of t. That contract is the right one and we keep it.
- **Account D's storyboard** (`../../accounts/d/format/example.storyboard.json`, `studio-storyboard/0`): beats with `narration` and a `visual.kind` (`title`, `flow`, `list`), facts pointing at sources, and an optional `decision`.

What makes the lab scenes powerful is also what stops them being reused: every actor, label, colour and time is a constant at the top of a 30 KB file (`const N = { owner: { P: [360, 190], t: 0.25, label: 'Dinis Cruz' ... } }`). The story is in the code. Motion moves the story into data and keeps the code generic.

## 2. The variables that make it work

Across every scene we liked, the same few things carry the meaning:

| Variable | What it is | Example from the films |
| --- | --- | --- |
| actors | the lights: id, label, role (person, agent, file, team) | Dinis, c.maestro, a lead agent, scene builders |
| links | who started or briefed whom (the order is the story) | owner to c.maestro to the lead |
| order and timing | when each actor arrives, how long each beat holds | arrivals at 0.25 s, 2.5 s ...; a still at the end |
| growth | counts the group passes through | 6, 10, 20, 30, 50 roles |
| colour by role | warm for people, teal for agents, ink for files | AMBER, TEAL, INK in cells-grow |
| labels and lines | the words on screen, and the narration under them | "This is how we scale" |
| close | what is left when the scene ends | the files on a shelf |
| sources | where each claim comes from | agilecells.org, the start prompt |

## 3. Scene types

Each type is a named, generic renderer whose variables are its whole interface. Time is always in seconds from the scene's start; every type has `seconds`, `title`, `narration`, `sources` and a still frame (`still`, default the last 10 per cent).

| Type | The pattern | Variables |
| --- | --- | --- |
| `handoff` | one agent, then the next, then the next: each light arrives, a pulse runs down the link from the one who briefed it, and its label settles | `actors[] {id, label, role, note}`, `links[] {from, to, label}` (default: a chain in actor order), `direction` (down, across), `step` seconds per hand-off, `carry` (a word or file that travels along each link), `end` (the line at the close) |
| `cell` | a cell growing into a team: a membrane round one light, people and agents arrive, files slide out, it grows in steps to a chart, then folds to its files | `lead {label, role}`, `members[] {label, role}`, `files[]` (roles, rules, work), `growth[]` counts, `close` (fold, keep, none), `end` |
| `timeline` | dated points along a line, the camera walking it | `items[] {date, label, note}`, `span` |
| `before-after` | one picture, then its changed form, with a divider | `before {label, items}`, `after {label, items}`, `split` time |
| `count` | a number that counts up to its value, with a unit and a source | `from`, `to`, `unit`, `label`, `format`, `ease` |
| `title` | a line of words and a subtitle | `text`, `sub` |
| `list` | items revealed one at a time | `items[]` |
| `quote` | words and who said them | `quote`, `by` |
| `decision` | a question, its options with good and bad, the recommendation | as `studio-storyboard/0` `decision` |

The first proof builds `handoff` and `cell`, plus `title` and `count` as small helpers for the brief. The rest are the next round; the hand-built lab scenes stay as they are and can still be named as `component` (section 4), so nothing c.productions has made is thrown away.

## 4. One schema: motion.scene/v1

```json
{
  "schema": "motion.scene/v1",
  "id": "agile-cells-chain",
  "title": "How a cell starts",
  "format": { "w": 720, "h": 1280 },
  "theme": "auto",
  "palette": { "person": "#ffc857", "agent": "#5fd0c5", "file": "#f4f1e8" },
  "sources": [{ "id": "s1", "title": "...", "url": "https://..." }],
  "scenes": [
    { "id": "start", "type": "handoff", "seconds": 9, "title": "One, then the next",
      "narration": "Dinis asks c.maestro; c.maestro starts a cell; the cell starts its developer.",
      "sources": ["s1"],
      "vars": { "actors": [{ "id": "d", "label": "Dinis Cruz", "role": "person" }, { "id": "m", "label": "c.maestro", "role": "agent" }] } }
  ],
  "decision": null
}
```

Rules:

- `type` names a scene type in the runtime registry; `vars` holds only that type's variables, so a page or agent changes a scene by changing `vars`, nothing else.
- `type: "component"` with `vars.component: "<lab id>"` plays a hand-built lab scene through the existing contract.
- `theme`: `ink`, `paper` or `auto` (follows the viewer's light or dark setting). `format` is a design size; the runtime fits any screen and lays out again for portrait.
- Every claim on screen names a source id; the page lists the sources under the player.
- Versioned: a breaking change makes `motion.scene/v2`; the runtime refuses a schema it does not know, with a plain message.

Mapping the two formats we have (a converter, `convert.js`, in the next round):

| From | To |
| --- | --- |
| player `scenes.json`: `kind: component, component: X`, extra keys | `type: component`, `vars: {component: X, ...extra keys}` |
| player `kind: years`, `credits` | `type: timeline`, `type: list` |
| `studio-storyboard/0` `beats[]` | `scenes[]`; `visual.kind` gives the type: `title` to `title`, `flow` to `handoff` (nodes to actors, edges to links), `list` to `list`; `facts` to `sources` |
| `studio-storyboard/0` `decision` | top-level `decision`, played last as `type: decision` |

## 5. The runtime

`motion.js`, one ES module, no build step, no dependency, no network call except the scenes file it is given.

```html
<div data-motion="brief.json"></div>
<script type="module" src="/productions/motion/motion.js"></script>
```

or from code: `import { play } from './motion.js'; const film = play(element, data);` returning `{ seek(t), play(), pause(), replay(vars), duration }`.

- **Canvas 2D**, not WebGL: a phone draws it cheaply and a page can hold any number of films (the player has had to ration WebGL contexts).
- **Pure frames**: `render(ctx, t, vars, layout)`; the same t gives the same frame, so scrubbing, captions, still covers and frame capture all agree. Any randomness is seeded from the scene id.
- **Reduced motion**: when the viewer asks for it, each scene shows its still frame, with Next and Back buttons and the narration as text; nothing moves on its own.
- **Light and dark**: colours come from the palette, with two sets of neutrals (ink background for dark, paper for light) picked by `theme`.
- **Accessible**: the canvas has `role="img"` and an `aria-label` from the scene title; the narration is live text under it, so a screen reader hears the story; controls are real buttons.
- **Adding a type**: `define('handoff', { defaults, seconds(vars), render })`. A new type is one function in one file and needs nothing else to change.

## 6. From a production to a template

1. A production agent finds a way of saying something that works (a lab scene Dinis likes).
2. c.motion (or any developer) reads its constants and names the variables: who arrives, in what order, with what words, for how long.
3. The pattern becomes a scene type in `motion.js`; the lab scene's own film keeps its hand-built version.
4. The production's scene is written once more as `motion.scene/v1` data, and that file is the **template**: copy it, change `vars`, and it tells another story the same way.
5. The page at `/productions/motion/` lets a person edit those variables and watch it replay, so a template is checked by eye before it is used.

## 7. The daily and hourly updates, from data

Dinis: "even my daily updates, even my hourly updates should start to come like that", with the prioritisation in code "so you don't have to reinvent the wheel every time".

`brief.js` turns c.maestro's feeds (`decisions.json`, `maestro.decisions/v0`, and `ideas.json`, `maestro.ideas/v0`) into a `motion.scene/v1` film of about 30 seconds. The proof reads a snapshot in `data/`, taken 28 November 2026 at 17:20 UTC from PrompTugal/PrompTugal__News__Website `board/team/maestro.c/channel/`; a live version would read the same files from wherever they are published.

The rules, written once in `priority.js` and applied the same way every time:

| Rule | In code |
| --- | --- |
| What waits on Dinis leads | status weight: `waiting_on_dinis` 100, `asked` 80, `in_progress` 50, `decided` 40, `done` 20 |
| Newer first within a weight | plus up to 10 for recency inside the window |
| The window | daily: the last 24 hours; hourly: the last hour, and an hourly brief with nothing new is not made |
| Lead | at most three items get a hand-off scene of their own (Dinis, then the agent carrying it, then what it waits on) |
| Cut | the rest are counted, not shown; `done` items only appear as a count |
| Length | title 3 s, hand-offs 6 s each, counts 5 s, close 3 s: never over 30 s |
| Words | the decision's own words, shortened at a word boundary to 70 characters; never a word that is not in the feed |

The output is ordinary scenes data, so the same runtime plays it in a page, a board or a phone app.

## 8. What the proof contains

`site/productions/motion/`:

- `motion.js`: the runtime and the types `handoff`, `cell`, `title`, `count`.
- `priority.js` and `brief.js`: the rules and the generator.
- `index.html`: plays a scenes file; a panel of the scene's variables, edited as JSON, replays on change.
- `examples/agile-cells-chain.json`: the hand-off chain and the cell, written as data from the Agile Cells films.
- `brief.html`: the 30-second brief made from `data/decisions.json` in the browser, with its rules shown under it.

## 9. Not yet

The converter from the two older formats; `timeline`, `before-after`, `quote`, `decision` and `list` as types; voice (the player's Voxtral track would attach as it does now); publishing the brief on a schedule. Each waits on Dinis's word on this proof.
