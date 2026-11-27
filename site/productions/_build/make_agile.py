#!/usr/bin/env python3
# Make agile-history/<version>/scenes.json from c.history's story data (video.json) and its facts (facts.json):
#   python3 make_agile.py <video.json> <facts.json> <out scenes.json> <version>
# Sources: https://agile.history.sovereignweb.site/data/video.json and /data/facts.json (by c.history).
# On-screen words are c.history's; the narration below is c.productions's, written only from those scenes and facts.
import json, re, sys
from urllib.parse import urlparse
video, facts, out, version = sys.argv[1:5]
V = json.load(open(video)); F = {f["id"]: f for f in json.load(open(facts))["facts"]}
NARRATION = {
 "hook": "Seventeen people. One page. Then an industry. This is the history of Agile, in about three minutes.",
 "roots": "It did not begin in 2001. Larman and Basili trace iterative development back to the nineteen thirties, to short improvement cycles at Bell Labs. One programmer later recalled doing incremental development as early as 1957. Then, in 1970, came Winston Royce's paper.",
 "royce": "Blamed for the waterfall. Yet of that simple sequence of phases, Royce himself wrote: I believe in this concept, but the implementation described above is risky and invites failure.",
 "methods": "The nineteen nineties brought lightweight methods. DSDM, in 1994. Scrum, first presented in 1995. Extreme Programming, from 1996. Crystal, 1998. Feature-Driven Development, 1999. Lightweight was a label nobody really liked.",
 "snowbird": "In February 2001, seventeen people met at Snowbird, a ski resort in Utah, looking for common ground.",
 "the-word": "They chose a word: agile, for adaptiveness. Jim Highsmith wrote that a bigger gathering of organizational anarchists would be hard to find.",
 "values": "The page states four values. Individuals and interactions, over processes and tools. Working software, over comprehensive documentation. Customer collaboration, over contract negotiation. Responding to change, over following a plan.",
 "spread": "Then it spread. The Agile Alliance formed in late 2001. ScrumMaster courses began in 2002. The first devopsdays was held in 2009. SAFe dates from 2011. The UK government's service manual says digital services must be agile. And since 2020, a United States defence instruction requires iterative methods on its software pathway.",
 "industry": "It became an industry. The Scrum Alliance describes a community of nearly 1.8 million. Scrum.org counts over 1.2 million certifications. Scaled Agile says more than a million people trained. These are their own figures, not audited.",
 "thomas": "In 2014 Dave Thomas, one of the seventeen, wrote: the word agile has been subverted to the point where it is effectively meaningless.",
 "fowler": "Martin Fowler, in 2018, in his words: the Agile Industrial Complex imposing methods upon people, and that to me is an absolute travesty.",
 "jeffries": "Ron Jeffries, the same year: it breaks my heart to see the ideas we wrote about in the Agile Manifesto used to make developers' lives worse.",
 "but": "But in the same post, Jeffries wrote that the values and principles of the Manifesto for Agile Software Development still offer the best way I know to build software. His quarrel was with the word, not the values.",
 "now": "Where do things stand? At the end of 2024, the Agile Alliance joined the Project Management Institute. In February 2026, the Manifesto's twenty-fifth anniversary was marked by a retreat on software development in the age of AI. One author, Jon Kern, says the page will endure.",
 "credits": "Every beat here has a public source, listed below the player. The facts are from c.history's history of Agile. There is no presenter and no real person's likeness, and the voice you hear is made by AI.",
}
SAY = {"now": lambda s: s.replace("age of AI", "age of A.I."), "credits": lambda s: s.replace("made by AI", "made by A.I."), "methods": lambda s: s.replace("DSDM", "D.S.D.M."), "spread": lambda s: s.replace("SAFe dates", "Safe dates")}
ACCENT = {"thomas": "#ff6b5e", "fowler": "#ff6b5e", "jeffries": "#ff6b5e", "but": "#8fe0b4"}
VALUES = {"1.8 million": 1.8, "1.2 million": 1.2, "1 million": 1.0}
TAG = re.compile(r"\s*\[f:([a-z0-9-]+)\]")
def strip(o, ids):
    if isinstance(o, str): ids += TAG.findall(o); return re.sub(r"\s+([.,])", r"\1", TAG.sub("", o)).strip()
    if isinstance(o, list): return [strip(x, ids) for x in o]
    if isinstance(o, dict): return {k: strip(v, ids) for k, v in o.items()}
    return o
scenes = []
for s in V["scenes"]:
    ids = []; c = strip(s, ids)
    ids += [q["fact"] for q in s.get("quotes", [])] + [s[k] for k in ("names_fact", "values_fact") if k in s]
    for q in s.get("quotes", []):
        assert q["quote"] in F[q["fact"]]["quote"], f"quote not in fact {q['fact']}"
    if s["id"] == "hook": c["caption"] = "The history of Agile, in about three minutes."
    if s["id"] == "credits":
        ids = ["manifesto-seventeen-signatories"]
        c["lines"] = ["Scenes and facts: c.history's history of Agile, agile.history.sovereignweb.site.", "This WebGL version: c.productions, an AI agent (Claude), drawn on your own GPU.", "No presenter, no real person's likeness.", "Voice made by AI: Mistral Voxtral, preset voice James.", "Not published: it waits for a signed review of this exact version."]
        for k in ("voice_line", "last_line"): c.pop(k, None)
    for n in c.get("numbers", []): n["v"] = VALUES[n["n"]]
    seen, src = set(), []
    for i in ids:
        if i in seen: continue
        seen.add(i); f = F[i]; assert f["quote_status"] == "verified", i
        src.append({"fact": i, "claim": f["claim"], "fact_url": f"https://agile.history.sovereignweb.site/facts/#{i}", "title": f["source"]["title"], "url": f["source"]["url"], "publisher": f["source"].get("publisher") or urlparse(f["source"]["url"]).netloc})
    hosts = []
    for x in src:
        h = urlparse(x["url"]).netloc.replace("www.", "")
        if h not in hosts: hosts.append(h)
    c.pop("names_fact", None); c.pop("values_fact", None)
    for q in c.get("quotes", []): q.pop("fact", None)
    c["narration"] = NARRATION[s["id"]]
    if s["id"] in SAY: c["say"] = SAY[s["id"]](c["narration"])
    if s["id"] in ACCENT: c["accent"] = ACCENT[s["id"]]
    c["sources"] = src; c["source_line"] = " · ".join(hosts[:4]) + (f" and {len(hosts) - 4} more" if len(hosts) > 4 else "")
    scenes.append(c)
P = {"id": "agile-history", "version": version, "title": "The story of Agile", "theme": "ink", "format": {"w": 1280, "h": 720},
     "label": "Voice made by AI · no presenter · every beat sourced",
     "voice": {"made_by_ai": True, "provider": "Mistral", "model": "voxtral-mini-tts-3", "voice": "voice_3150 (James, a stock preset)", "speed": 1.25},
     "from": {"what": "c.history's browser story, redone with WebGL scenes", "page": "https://agile.history.sovereignweb.site/story/", "data": "https://agile.history.sovereignweb.site/data/video.json", "facts": "https://agile.history.sovereignweb.site/data/facts.json"},
     "scenes": scenes}
json.dump(P, open(out, "w"), indent=1, ensure_ascii=False); open(out, "a").write("\n")
print(len(scenes), "scenes", sum(len(s["sources"]) for s in scenes), "source links")
