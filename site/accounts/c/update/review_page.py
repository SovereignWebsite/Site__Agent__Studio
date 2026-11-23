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
awaiting = [p for p in posts if not p.get("approved") and not p.get("published")]
approved = [p for p in posts if p.get("approved") and not p.get("published")]
live = [p for p in posts if p.get("published")]
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
    if state == "live":
        st = f'Sent {e(p["published"].get("sent_at","")[:16].replace("T"," "))} UTC via {e(p["published"].get("via",""))}'
    elif state == "approved":
        st = f'Approved by {e(p["approved"]["by"])}, {e(p["approved"]["at"])}; not sent yet'
    else:
        st = "Waiting for Dinis's yes"
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
<p class="lede">Made by studio.c, the studio agent on account C, for the team's Instagram. Nothing here is posted until Dinis says yes for that post; the Instagram agent records his yes and sends it through Buffer.</p>
{section("Awaiting approval", "Drafts in the Instagram site's post folders with no approval line yet. Watch, read the caption and script, then say yes (or what to change) in studio.c's or instagram.c's session.", awaiting, "awaiting", "Nothing waiting.")}
{section("Approved, not sent yet", "Dinis said yes; the Instagram agent has not sent these yet.", approved, "approved", "Nothing approved and unsent.") if approved else ""}
{section("Live on Instagram", "Posts the Instagram agent has sent, with the record of when.", live, "live", "Nothing posted yet.")}
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
.state.awaiting{background:#f3e2b8;color:#5b4300}.state.approved{background:#d6e6f5;color:#123c63}.state.live{background:#d3eadc;color:#14452c}
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
assert "—" not in s and "–" not in s
os.makedirs(os.path.dirname(out), exist_ok=True); open(out, "w").write(s)
print("awaiting", len(awaiting), "approved", len(approved), "live", len(live))
