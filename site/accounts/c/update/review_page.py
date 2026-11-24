# Build site/accounts/c/index.html for the Studio site from Site__Platform__Instagram's post folders.
# Static: run by studio.c and committed; no token, no handle, no script on the page.
# Posters are copied here as small WebP files (site/accounts/c/media/), so the page loads nothing from another host on open
# (design.c's change list, after Site__Agent__Design guidelines 1.2); the video loads only when played. Apache-2.0.
import json, sys, os, re, html, datetime, subprocess
from PIL import Image
ig, src_index, out = sys.argv[1:4]
IG = "https://instagram.platform.sovereignweb.site"
REPO = "https://github.com/SovereignWebsite/Site__Platform__Instagram/tree/dev/site/posts/"
e = lambda s: html.escape(str(s), quote=True)
posts = []
for d in sorted(os.listdir(f"{ig}/site/posts"), reverse=True):
    f = f"{ig}/site/posts/{d}/post.json"
    if not os.path.isfile(f): continue
    p = json.load(open(f)); p["id"] = d
    p["script"] = open(f"{ig}/site/posts/{d}/script.txt").read().strip() if os.path.isfile(f"{ig}/site/posts/{d}/script.txt") else ""
    posts.append(p)
# Post records keep one entry per channel under published.channels (instagram, youtube, linkedin), each with sent_at or
# scheduled_for; older records are one flat entry for Instagram. A post counts as live on Instagram only when its Instagram
# entry was sent, or its scheduled time has passed (said as "time passed"); a future slot stays under Not posted yet
# (design.c's change list, 24 Nov 2026, guidelines 1.6 and 10: say what is true).
NOW = datetime.datetime.now(datetime.timezone.utc)
CH = {"instagram": "Instagram", "youtube": "YouTube", "linkedin": "LinkedIn"}
def channels(p):
    pub = p.get("published") or {}
    return pub.get("channels") or ({"instagram": pub} if pub else {})
def _t(s): return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
def _f(s): return s[:16].replace("T", " ") + " UTC"
def on_instagram(p):
    c = channels(p).get("instagram") or {}
    if (p.get("published") or {}).get("deleted") or c.get("deleted"): return False
    return bool(c.get("sent_at") or (c.get("scheduled_for") and _t(c["scheduled_for"]) <= NOW))
def channel_lines(p):
    out = []
    for k, c in channels(p).items():
        name = CH.get(k, k.capitalize()); via = f" via {c['via']}" if c.get("via") else ""
        if c.get("sent_at"): out.append(f"{name}: sent {_f(c['sent_at'])}{via}")
        elif c.get("scheduled_for"):
            past = _t(c["scheduled_for"]) <= NOW
            out.append(f"{name}: scheduled for {_f(c['scheduled_for'])}{via}" + (" (time passed)" if past else ""))
    d = (p.get("published") or {}).get("deleted")
    if d: out.append(f"Deleted {d.get('at','')}" + (f": {d['why']}" if d.get("why") else ""))
    return out
removed = [p for p in posts if (p.get("published") or {}).get("deleted")]
live = [p for p in posts if on_instagram(p)]
approved = [p for p in posts if p.get("approved") and p not in live and p not in removed]
awaiting = [p for p in posts if not p.get("approved") and p not in live and p not in removed]
MEDIA = os.path.join(os.path.dirname(out), "media"); os.makedirs(MEDIA, exist_ok=True)
def local_poster(p):
    src = f"{ig}/site/posts/{p['id']}/" + (p.get("cover") or p["media"][0])
    if not os.path.isfile(src) or src.endswith(".mp4"): return None
    name = p["id"] + ".webp"; dst = os.path.join(MEDIA, name)
    if not os.path.exists(dst):
        im = Image.open(src).convert("RGB"); im.thumbnail((540, 960)); im.save(dst, "WEBP", quality=72)
    return "media/" + name
def media(p):
    m = p["media"][0]; u = f"{IG}/posts/{p['id']}/{m}"; alt = (p.get("alt") or [""])[0]; lp = local_poster(p)
    if m.endswith(".mp4"):
        poster = f' poster="{lp}"' if lp else ""
        return f'<video controls preload="none" playsinline width="540" height="960"{poster} aria-label="{e(alt)}"><source src="{e(u)}" type="video/mp4"></video>'
    return f'<img src="{e(lp or u)}" alt="{e(alt)}" width="540" height="675" loading="lazy">'
def card(p, state):
    cap = "".join(f"<p>{e(x)}</p>" for x in p.get("caption","").split("\n\n"))
    script = f'<details><summary>Script</summary><p class="script">{e(p["script"]).replace(chr(10)+chr(10), "<br><br>")}</p></details>' if p["script"] else ""
    lines = channel_lines(p)
    if state in ("live", "removed") or (state == "approved" and lines):
        st = "Instagram post deleted" if state == "removed" else ("On Instagram" if state == "live" else "Not on Instagram yet")
        st = e(st) + "".join(f"<br>{e(x)}" for x in lines)
    elif state == "approved":
        st = f'Approved by {e(p["approved"]["by"])}, {e(p["approved"]["at"])}; not sent yet'
    else:
        st = "Not posted yet"
    return f'''<article class="post">
<div class="frame{' tall' if p['media'][0].endswith('.mp4') else ''}">{media(p)}</div>
<div class="meta"><span class="state {state}">{st}</span>
<h3>{e(p['id'].split('__',1)[1].replace('-',' ').capitalize())} <small>{e(p['kind'])}</small></h3>
<details><summary>Caption</summary>{cap}</details>
{script}
<details><summary>Made with, and licences</summary><p>{e(p.get('source',''))}</p></details>
<p class="links"><a href="{REPO}{e(p['id'])}">Post folder</a> · the video loads from instagram.platform.sovereignweb.site only when played</p></div>
</article>'''
def section(title, intro, items, state, empty):
    body = "\n".join(card(p, state) for p in items) or f'<p class="empty">{e(empty)}</p>'
    return f'<section aria-labelledby="h-{state}"><h2 id="h-{state}">{e(title)} <span class="count">{len(items)}</span></h2><p>{e(intro)}</p><div class="grid">{body}</div></section>'
now = datetime.datetime.now(datetime.timezone.utc).strftime("%d %B %Y, %H:%M UTC")
igsha = subprocess.run(["git","-C",ig,"rev-parse","--short","HEAD"],capture_output=True,text=True).stdout.strip()
main = f'''<main id="main" class="wide">
<div class="mark">Studio · account C · <a href="designs/">Choose a design</a></div>
<h1>Reels and images for Instagram</h1>
<p class="lede">Made by studio.c, the studio agent on account C, for the team's Instagram. The Instagram agent posts them under a written posting rule, through Buffer, and the owner reviews what is published.</p>
{section("Not posted yet", "Made and in the Instagram site's post folders, not yet sent. Watch, read the caption and script, and say what to change in studio.c's or instagram.c's session.", awaiting, "awaiting", "Nothing waiting.")}
{section("Cleared, not on Instagram yet", "Cleared under the written posting rule; the Instagram agent has scheduled them, or has still to send them. Each card lists every channel and its time.", approved, "approved", "Nothing waiting for its slot.") if approved else ""}
{section("Live on Instagram", "Posts the Instagram agent has sent, or whose Instagram slot has passed, with every channel and its time.", live, "live", "Nothing posted yet.")}
{section("Deleted from Instagram", "Posts that were live and then taken down, with the reason recorded.", removed, "removed", "") if removed else ""}
<p class="note">Built {now} from Site__Platform__Instagram at {e(igsha)}. A static page: no tracking, no token, nothing loaded from Instagram itself.</p>
'''
CSS = '''
main.wide{max-width:72rem}
.top{max-width:72rem}
.note{margin-top:2rem}
.lede{font-size:1.1rem;max-width:44rem}
section{margin-top:3rem}
h2 .count{display:inline-block;min-width:1.6rem;padding:0 .45rem;margin-left:.4rem;border-radius:1rem;background:var(--line);color:var(--fg);font-size:.85rem;text-align:center;vertical-align:middle}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(17rem,1fr));gap:1.5rem;margin-top:1rem}
.post{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:rgba(127,127,127,.04);display:flex;flex-direction:column}
.frame{background:#0f1b2d;aspect-ratio:4/5}.frame.tall{aspect-ratio:9/16}
.frame video,.frame img{display:block;width:100%;height:100%;object-fit:cover}
.meta{padding:1rem 1.1rem 1.1rem}
.meta h3{margin:.5rem 0 .4rem;font-size:1.1rem}.meta h3 small{font-weight:400;color:var(--muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;margin-left:.3rem}
.state{display:inline-block;font-size:.78rem;font-weight:600;padding:.15rem .6rem;border-radius:1rem}
.state.awaiting{background:#f3e2b8;color:#5b4300}.state.approved{background:#d6e6f5;color:#123c63}.state.live{background:#d3eadc;color:#14452c}.state.removed{background:#eee;color:#444}
details{border-top:1px solid var(--line);padding:.45rem 0}details summary{cursor:pointer;font-weight:600;font-size:.92rem;min-height:24px}
details p{font-size:.92rem;margin:.5rem 0}.script{white-space:normal}
.links{margin:.6rem 0 0;font-size:.9rem}.empty,.note{font-size:.9rem}
'''
s = open(src_index).read()
s = s.replace("<title>Studio</title>", "<title>Studio: account C reels</title>")
desc = "Reels and images made by studio.c for the team's Instagram: drafts awaiting Dinis's approval, and the posts already live."
s = re.sub(r'content="The Studio agents\' own site:[^"]*"', f'content="{e(desc)}"', s)
s = s.replace('"https://studio.agents.sovereignweb.site/"', '"https://studio.agents.sovereignweb.site/accounts/c/"')
s = s.replace('<meta property="og:title" content="Studio">', '<meta property="og:title" content="Studio: account C reels">').replace('<meta name="twitter:title" content="Studio">', '<meta name="twitter:title" content="Studio: account C reels">')
s = s.replace("</style>", CSS + "</style>")
s = re.sub(r'<main id="main">.*?<footer>', main + "<footer>", s, flags=re.S)
assert "\u2014" not in s and "\u2013" not in s
os.makedirs(os.path.dirname(out), exist_ok=True); open(out, "w").write(s)
print("awaiting", len(awaiting), "cleared", len(approved), "live", len(live), "removed", len(removed))
