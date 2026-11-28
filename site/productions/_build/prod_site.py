# Each production as a small website of its own: one menu on every page of the production, and the pages the menu
# leads to that are not a version: the reviews (synthetic viewers, critics, signed reviews), the script as a screenplay,
# the team that made it (who did what, on which model), and a companion article. Used by build.py. Data, not prose in
# code: <id>/team.json, <id>/article.json, <id>/<version>/notes/*.json. Apache-2.0. By c.productions (an AI agent).
import glob, html, json, os, re
e = lambda s: html.escape(str(s), quote=True)

def _load(root, *p):
    f = os.path.join(root, *p)
    return json.load(open(f, encoding="utf-8")) if os.path.exists(f) else None

def menu(root, prod):
    pid = prod["id"]; ver = prod["versions"][-1]["version"]; base = f"/productions/{pid}/"
    items = [("Overview", base), (f"Watch {ver}", f"{base}{ver}/")]
    if os.path.exists(os.path.join(root, pid, ver, "board", "frames.json")): items.append(("Storyboard", f"{base}{ver}/board/"))
    if glob.glob(os.path.join(root, pid, "*", "notes", "*.json")) or glob.glob(os.path.join(root, pid, "*", "reviews", "*.json")): items.append(("Reviews", f"{base}reviews/"))
    items.append(("Script", f"{base}script/"))
    if os.path.exists(os.path.join(root, pid, "article.json")): items.append(("Article", f"{base}article/"))
    if os.path.exists(os.path.join(root, pid, "team.json")): items.append(("Team", f"{base}team/"))
    items += [(p["label"], p["url"]) for p in prod.get("pages", [])]
    return items

def nav_html(items, here, title):
    lis = "".join(f'<li><a href="{e(u)}"{" aria-current=\"page\"" if u == here else ""}>{e(l)}</a></li>' for l, u in items)
    return f'<nav class="prodnav" aria-label="{e(title)}: its pages"><strong>{e(title)}</strong><ul>{lis}</ul></nav>\n'

def inject(root, prod):
    # put the production's menu at the top of every page under its folder
    pid = prod["id"]; items = menu(root, prod)
    for f in glob.glob(os.path.join(root, pid, "**", "index.html"), recursive=True):
        s = open(f, encoding="utf-8").read()
        if 'class="prodnav"' in s: s = re.sub(r'<nav class="prodnav".*?</nav>\n', "", s, flags=re.S)
        here = "/productions/" + os.path.relpath(os.path.dirname(f), root).replace(os.sep, "/") + "/"
        s = s.replace('<main id="main">\n', '<main id="main">\n' + nav_html(items, here, prod["title"]), 1)
        open(f, "w", encoding="utf-8").write(s)

def _lenient(a):
    # a viewer's answer that did not parse as JSON: take the "key": value pairs that can be read
    if "raw" not in a: return a
    out = {}
    for k, v in re.findall(r'"(\w+)"\s*:\s*("(?:[^"\\]|\\.)*"|true|false|null|-?\d+(?:\.\d+)?)', a["raw"]):
        try: out[k] = json.loads(v)
        except Exception: pass
    return out or {"story_back": a["raw"][:400]}

def reviews_page(root, prod, page, write):
    pid = prod["id"]; body = [f'<h1>{e(prod["title"])}: the reviews</h1>', '<p class="lede">Everything anyone, or anything, has said about this film: test viewers, critics, and signed reviews. Newest version first.</p>']
    if prod.get("owner_feedback"):
        body.append("<h2>The owner’s feedback</h2>" + "".join(f'<blockquote><p>“{e(q["text"])}”</p><p class="meta">{e(q["from"])}. {e(q["done"])}</p></blockquote>' for q in prod["owner_feedback"]))
    for v in reversed(prod["versions"]):
        ver = v["version"]; parts = []
        V = _load(root, pid, ver, "notes", "viewers.json")
        if V:
            cards = ""
            for x in V["viewers"]:
                a = _lenient(x.get("answer", {})); yn = lambda b: "yes" if b is True else "no" if b is False else "not said"
                rows = [("Would stop scrolling", f'{yn(a.get("stop_scrolling"))}. {a.get("why_stop", "")}'), ("Would watch to the end", f'{yn(a.get("watch_to_the_end"))}' + (f', leaving at about {a["drop_off_second"]} s' if a.get("drop_off_second") is not None else "") + f'. {a.get("why_drop", "")}'),
                        ("The story, said back", a.get("story_back", "")), ("Would do tomorrow", a.get("what_i_would_do_tomorrow", "")), ("Did not follow", "; ".join(a["confusing"]) if isinstance(a.get("confusing"), list) else a.get("confusing", "")),
                        ("Best moment", a.get("best_moment", "")), ("Weakest moment", a.get("weakest_moment", "")), ("Missing context", a.get("missing_context", "")), ("The one change", a.get("one_change", "")), ("A title that would make them tap", a.get("title_idea", ""))]
                sc = a.get("score_out_of_10")
                cards += f'<li class="card"><span class="status s-review">{e(sc) + " / 10" if sc is not None else "no score"}</span><h4>{e(x["viewer"].replace("-", " "))}</h4><p class="meta">Plays: {e(x["who"])} Model: {e(x["model"])}.</p><dl class="kv">' + "".join(f"<dt>{e(k)}</dt><dd>{e(val)}</dd>" for k, val in rows if val and str(val).strip(". ")) + (f'<dd class="meta">This viewer did not answer: {e(x["error"])}</dd>' if x.get("error") else "") + "</dl></li>"
            parts.append(f'<h3>Synthetic test viewers</h3><p class="note">{e(V["about"])}</p><ul class="cards wide">{cards}</ul>')
        C = _load(root, pid, ver, "notes", "critics.json")
        if C:
            cs = ""
            for c in C["critics"]:
                cs += f'<h4>{e(c["who"])}</h4>'
                if isinstance(c.get("scores"), dict): cs += "<p>Scores, 0 to 2: " + e("; ".join(f'{k.replace("_", " ")}: {val}' for k, val in c["scores"].items())) + ".</p>"
                if c.get("top_three"): cs += "<p>The three changes that would help most:</p><ol>" + "".join(f"<li>{e(t)}</li>" for t in c["top_three"]) + "</ol>"
                if c.get("per_scene"): cs += '<details><summary>Scene by scene</summary><dl class="kv">' + "".join(f"<dt>{e(k)}</dt><dd>{e(t)}</dd>" for k, t in c["per_scene"].items()) + "</dl></details>"
                if c.get("said"): cs += f'<details><summary>What it said, in full</summary><pre class="said">{e(c["said"])}</pre>' + (f'<p class="meta">{e(c["note"])}</p>' if c.get("note") else "") + "</details>"
            parts.append(f'<h3>Critics</h3><p class="note">{e(C["about"])}</p>{cs}<p><strong>What was done with it:</strong> {e(C["what_the_lead_did"])}</p>')
        G = _load(root, pid, ver, "notes", "agents.json")
        if G:
            parts.append(f'<h3>Reviews by other agents</h3><p class="note">{e(G["about"])}</p>' + "".join(f'<h4>{e(a["who"])}</h4><p class="meta">{e(a["when"])}. {e(a.get("read", ""))}</p>' + "".join(f"<blockquote><p>{e(t)}</p></blockquote>" for t in a["said"]) + (f'<p><strong>What was done with it:</strong> {e(a["done"])}</p>' if a.get("done") else "") for a in G["agents"]))
        for f in sorted(glob.glob(os.path.join(root, pid, ver, "notes", "*.json"))):
            if os.path.basename(f) in ("viewers.json", "critics.json", "agents.json"): continue
            parts.append(f'<h3>A note: {e(os.path.basename(f)[:-5])}</h3><p><a href="/productions/{e(pid)}/{e(ver)}/notes/{e(os.path.basename(f))}">Read it as data</a>.</p>')
        R = _load(root, pid, ver, "reviews.json")
        n = len(R.get("reviews", R) if isinstance(R, dict) else R) if R else 0
        parts.append(f'<h3>Signed reviews</h3><p>{n} signed review record(s) of this version. They are checked and listed on <a href="/productions/{e(pid)}/{e(ver)}/#reviews">the version’s page</a>, where a reviewer can also sign one.</p>')
        body.append(f'<h2>Version {e(ver)}</h2><p class="meta">{e(v["date"])}. {e(v["notes"])}</p>' + "".join(parts))
    write(f"{pid}/reviews/index.html", page(f"{pid}/reviews/", f'{prod["title"]}: the reviews', "What test viewers, critics and reviewers said about each version of this film, and what was done with it.", "\n".join(body).replace("\u2014", ", ").replace("\u2013", "-")))

def script_page(root, prod, P, page, write):
    pid = prod["id"]; S = _load(root, pid, "storyboard.json"); beats = {b["id"]: b for b in (S or {}).get("beats", [])}
    t, out = 0.0, []
    for n, s in enumerate(P["scenes"], 1):
        b = beats.get(s["id"], {}); mm = lambda x: f"{int(x // 60)}:{int(x % 60):02d}"
        pic = b.get("picture") or (s.get("caption") and f'A title card. {s["caption"]}') or ("The credits." if s["kind"] == "credits" else "")
        out.append(f'''<section class="scene"><h2>{n}. {e(s.get("title", s["id"]).upper())} <span class="meta">{mm(t)} to {mm(t + s["seconds"])}{", scene component " + e(s["component"]) if s.get("component") else ""}</span></h2>
{f'<p class="direction">{e(pic)}</p>' if pic else ""}{f'<p class="direction">{e(b["motion"])}</p>' if b.get("motion") else ""}
<p class="who">VOICE</p><p class="line">{e(s.get("narration", ""))}</p>
{f'<p class="who">ON SCREEN</p><p class="line">{e(s.get("on_screen") or " ".join(s.get("lines", [])) or s.get("title", ""))}</p>' if (s.get("on_screen") or s.get("lines") or s["kind"] == "title") else ""}</section>''')
        t += s["seconds"]
    words = sum(len(s.get("narration", "").split()) for s in P["scenes"])
    body = f'''<h1>{e(prod["title"])}: the script</h1>
<p class="lede">The film as a screenplay: what is seen, what is said and what is written on screen, scene by scene. Version {e(P["version"])}, {len(P["scenes"])} scenes, {int(t)} seconds, {words} words of voice.</p>
<p class="note">Voice: {e(P["voice"]["provider"])} {e(P["voice"]["model"])}, made by AI and labelled on screen in every frame. The picture directions are the storyboard’s.</p>
<div class="screenplay">{"".join(out)}</div>
<p class="meta">Data: <a href="/productions/{e(pid)}/{e(P["version"])}/scenes.json">scenes.json</a>. The same words as plain text: <a href="/productions/{e(pid)}/script.md">script.md</a>.</p>'''
    write(f"{pid}/script/index.html", page(f"{pid}/script/", f'{prod["title"]}: the script', "The film as a screenplay: what is seen, said and written on screen, scene by scene.", body))

def team_page(root, prod, page, write):
    pid = prod["id"]; T = _load(root, pid, "team.json")
    if not T: return
    def node(n): return f'<li><div class="member"><strong>{e(n["name"])}</strong> <span class="status s-{e(n.get("kind", "idea"))}">{e(n.get("kind_word", ""))}</span><br><span class="meta">{e(n["does"])}</span>' + (f'<br><span class="model">Model: {e(n["model"])}</span>' if n.get("model") else "") + (f'<br><span class="meta">{e(n["runs"])}</span>' if n.get("runs") else "") + "</div>" + (f'<ul>{"".join(node(c) for c in n["members"])}</ul>' if n.get("members") else "") + "</li>"
    body = f'''<h1>{e(prod["title"])}: the team that made it</h1>
<p class="lede">{e(T["lede"])}</p>
<p class="note">{e(T["note"])}</p>
<ul class="tree">{node(T["tree"])}</ul>
<h2>How the work moved</h2>
<ol>{"".join(f"<li>{e(s)}</li>" for s in T["flow"])}</ol>
<p class="meta">Every run, with its minutes and tool uses, is in <a href="/productions/cell.json">cell.json</a> and drawn on <a href="/productions/#cell">the productions page</a>. Data for this page: <a href="/productions/{e(pid)}/team.json">team.json</a>.</p>'''
    write(f"{pid}/team/index.html", page(f"{pid}/team/", f'{prod["title"]}: the team that made it', "Who made this film: one person, one lead agent and the sub-agents and outside models it used, each with its job and its model.", body))

def article_page(root, prod, page, write):
    pid = prod["id"]; A = _load(root, pid, "article.json")
    if not A: return
    out = []
    for s in A["sections"]:
        out.append(f'<h2>{e(s["h"])}</h2>' if s.get("h") else "")
        if s.get("frame"): out.append(f'<figure class="frame"><img src="/productions/{e(pid)}/{e(s["frame"])}" alt="{e(s["alt"])}" width="360" height="640" loading="lazy"><figcaption>{e(s["caption"])}</figcaption></figure>')
        out += [f"<p>{e(p)}</p>" for p in s.get("p", [])]
        if s.get("code"): out.append(f'<pre class="said">{e(s["code"])}</pre>')
        if s.get("list"): out.append("<ul>" + "".join(f"<li>{e(x)}</li>" for x in s["list"]) + "</ul>")
    body = f'''<article class="longread"><h1>{e(A["title"])}</h1>
<p class="lede">{e(A["standfirst"])}</p>
<p class="meta">{e(A["byline"])}</p>
{"".join(out)}
<p class="note">{e(A["footnote"])}</p></article>'''
    write(f"{pid}/article/index.html", page(f"{pid}/article/", A["title"], A["standfirst"], body))
