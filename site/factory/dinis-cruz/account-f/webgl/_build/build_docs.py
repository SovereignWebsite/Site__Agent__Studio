"""Build the WebGL knowledge section's pages from Markdown.
   python3 -I build_docs.py <webgl dir>    (needs the 'markdown' package)
Pages: index (the section), learnings/, debrief/ (README) and debrief/<chapter>/, starter/ (its README).
Em and en dashes are replaced to follow this site's house style; each debrief page says so."""
import sys, os, re, html, markdown
W = os.path.abspath(sys.argv[1]); GH = "https://github.com/SovereignWebsite/Site__Agent__Studio/tree/dev/site/factory/dinis-cruz/account-f/webgl/starter/source"; BASE = "https://studio.agents.sovereignweb.site/factory/dinis-cruz/account-f/webgl/"
MD = markdown.Markdown(extensions=["tables", "fenced_code", "toc"])
def dashless(s):
    s = re.sub(r"^(#+ *\d+) — ", r"\1: ", s, flags=re.M)            # "# 01 — Architecture" -> "# 01: Architecture"
    return s.replace(" — ", ", ").replace("—", ", ").replace("–", "-")
CHAPTERS = sorted(f[:-3] for f in os.listdir(f"{W}/debrief/source") if re.match(r"\d\d-.*\.md$", f))
def fix_links(h, depth):
    up = "../" * depth
    def rel(m):
        u = m.group(2)
        if re.match(r"^(https?:|#|mailto:)", u): return m.group(0)
        n = re.match(r"^(\d\d-[a-z0-9-]+)\.md$", u)
        if n: return f'{m.group(1)}="{up}debrief/{n.group(1)}/"'
        if u in ("README.md",): return f'{m.group(1)}="{up}debrief/"'
        s = re.match(r"^starter/shots/sheet_(\w+)\.png$", u)
        if s: return f'{m.group(1)}="{up}debrief/img/sheet_{s.group(1)}.webp"'
        if u.startswith("starter/") or u == "starter": return f'{m.group(1)}="{up}starter/"'
        if depth and u.startswith(("src/", "tools/")): return f'{m.group(1)}="{GH}/{u}"' if u.endswith("/") else f'{m.group(1)}="{up}starter/source/{u}"'
        return m.group(0)
    return re.sub(r'(href|src)="([^"]+)"', rel, h)
CSS = """:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#55544f;--accent:#2f6b4f;--line:#e4e1d8;--code:#f1efe8}
@media (prefers-color-scheme:dark){:root{--bg:#121412;--fg:#ecebe6;--muted:#b2b0a8;--accent:#8fe0b4;--line:#2c2d29;--code:#1c1f1c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.65 system-ui,-apple-system,Segoe UI,sans-serif}
.skip{position:absolute;left:-999px}.skip:focus{left:1rem;top:1rem}
header,main,footer{max-width:50rem;margin:0 auto;padding:0 max(16px,env(safe-area-inset-left,0px))}
header{padding-top:1.6rem;display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;font-size:.95rem}header a{color:var(--accent);font-weight:600}
main{padding-top:1rem;padding-bottom:3rem}h1{font-size:clamp(1.8rem,5vw,2.6rem);line-height:1.15;margin:.6rem 0 1rem;text-wrap:balance}
h2{font-size:1.35rem;margin:2.2rem 0 .6rem}h3{font-size:1.1rem;margin:1.6rem 0 .4rem}a{color:var(--accent)}
p,li{color:var(--fg)}.note{color:var(--muted);font-size:.92rem;border-left:3px solid var(--line);padding-left:.8rem}
code{font:.9em ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--code);padding:.08em .3em;border-radius:3px;overflow-wrap:anywhere}
pre{background:var(--code);padding:.9rem 1rem;border-radius:6px;overflow-x:auto}pre code{background:none;padding:0;overflow-wrap:normal}
.table{overflow-x:auto}table{border-collapse:collapse;font-size:.92rem;margin:1rem 0}th,td{border:1px solid var(--line);padding:.35rem .6rem;vertical-align:top;text-align:left}
img{max-width:100%;height:auto;border-radius:6px}footer{border-top:1px solid var(--line);padding-top:1rem;padding-bottom:2rem;color:var(--muted);font-size:.85rem}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:1rem;margin:1.2rem 0}.cards a{display:block;border:1px solid var(--line);border-radius:8px;padding:1rem;text-decoration:none;color:var(--fg)}
.cards a:hover,.cards a:focus-visible{border-color:var(--accent)}pre:focus-visible,.table:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.cards strong{display:block;color:var(--accent);margin-bottom:.3rem}"""
def page(path, title, desc, body, depth, note=""):
    url = BASE + path; up = "../" * depth
    head = f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Studio">
<meta property="og:locale" content="en_GB">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:image" content="{BASE}share.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Commits on a timeline, each joined by a thread of light to the key of the agent that signed it.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html.escape(title)}">
<meta name="twitter:description" content="{html.escape(desc)}">
<meta name="twitter:image" content="{BASE}share.jpg">
<link rel="canonical" href="{url}">
<style>{CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header><a href="{up}">WebGL decks</a><a href="{up}learnings/">What we learnt</a><a href="{up}debrief/">The debrief</a><a href="{up}starter/">Starter code</a><a href="{up}../decks/signed/">Signed</a><a href="{up}../decks/sovereign-story/">Sovereign story</a></header>
<main id="main">
{note}{body}
</main>
<footer>Part of the Studio site's WebGL section, kept by cl-6.studio@dinis. Code here: Apache-2.0 unless a file says otherwise. Text: CC BY 4.0. <a href="https://github.com/SovereignWebsite/Site__Agent__Studio/tree/dev/site/factory/dinis-cruz/account-f/webgl">Source</a>.</footer>
</body>
</html>
"""
    os.makedirs(os.path.dirname(f"{W}/{path}index.html"), exist_ok=True)
    open(f"{W}/{path}index.html", "w").write(head)
def render(md_text, depth):
    MD.reset(); h = MD.convert(dashless(md_text))
    n = iter(range(1, 999))
    h = re.sub(r"<table>", lambda m: f'<div class="table" tabindex="0" role="region" aria-label="Table {next(n)}, scrolls sideways">\n<table>', h).replace("</table>", "</table></div>")
    h = h.replace("<pre>", '<pre tabindex="0">')                       # scrollable blocks must take keyboard focus
    return fix_links(h, depth)
def title_of(md_text): return dashless(re.search(r"^# (.+)$", md_text, re.M).group(1)).strip()
CREDIT = ('<p class="note">From the debrief of <em>The Last Boring Slide</em> (made by Claude, prompted by Nikita, @fluxxrider), written by another Claude session '
          'for Dinis Cruz and published here at his request. Punctuation follows this site\'s house style (no dashes as separators); nothing else is changed. '
          '<a href="{up}debrief/source/{f}">Original Markdown</a>.</p>')
# debrief chapters
for c in CHAPTERS:
    t = open(f"{W}/debrief/source/{c}.md").read()
    page(f"debrief/{c}/", title_of(t) + " (debrief)", f"Chapter {c[:2]} of the debrief of The Last Boring Slide: {title_of(t)}.", render(t, 2), 2, CREDIT.format(up="../../", f=c + ".md"))
t = open(f"{W}/debrief/source/README.md").read()
page("debrief/", "The Last Boring Slide: the debrief", "How a cinematic WebGL deck is wired: architecture, runtime, rendering, type, scenes, transitions, sound and video, in twelve chapters.", render(t, 1), 1, CREDIT.format(up="../", f="README.md"))
t = open(f"{W}/starter/source/README.md").read()
page("starter/", "Starter code for live WebGL decks", "A working, buildable implementation of the deck architecture: engine, scenes, the line, daybreak, slam and tear transitions, procedural sound, screenshot and video tools.",
     render(t, 1).replace('href="src/', f'href="{GH}/src/').replace('href="tools/', f'href="{GH}/tools/'), 1,
     f'<p class="note">The starter kit from the debrief, written by a Claude session for Dinis Cruz. Its files: <a href="{GH}/">all of them on GitHub</a>, '
     f'<a href="{GH}/src">src</a>, <a href="{GH}/tools">tools</a>, <a href="source/build.mjs">build.mjs</a>, <a href="source/package.json">package.json</a>. '
     'The decks on this site are built on it: see <a href="../../decks/signed/">Signed</a>.</p>')
t = open(f"{W}/LEARNINGS.md").read()
page("learnings/", "What we learnt making live WebGL decks", "Lessons from building two live WebGL decks with agents: the shoot-and-look loop, design by measurement, portrait, procedural sound, three ways to make video, and publishing on a sovereign website.", render(t, 1), 1)
# the section's own index
chap = "".join(f'<li><a href="debrief/{c}/">{html.escape(title_of(open(f"{W}/debrief/source/{c}.md").read()))}</a></li>' for c in CHAPTERS)
body = f"""<h1>Live WebGL decks</h1>
<p>Presentations that are rendered live in the browser: every frame drawn by WebGL as it plays, every sound made in code, no video files and no images. Inspired by <em>The Last Boring Slide</em>, made by Claude, prompted by Nikita (@fluxxrider). This section keeps what we learnt, the material we learnt it from, and the decks we made.</p>
<div class="cards">
<a href="../releases/"><strong>Releases</strong>Every deck as a release: play it here, full screen or vertical, and press R to record your own copy.</a>
<a href="../decks/signed/"><strong>Signed</strong>This site told from its own data: its files, its commits, the agents' signatures, the rules they work under.</a>
<a href="../decks/sovereign-story/"><strong>Sovereign story</strong>Seven scenes about owning your website. Press F for full screen and R to record.</a>
<a href="learnings/"><strong>What we learnt</strong>The loop, the design rules, portrait, sound, video and publishing, with the bugs that cost time.</a>
<a href="starter/"><strong>Starter code</strong>A buildable engine with the line, daybreak, slam and tear transitions and procedural sound.</a>
</div>
<h2>The debrief, chapter by chapter</h2>
<p>Written by another Claude session for Dinis Cruz, from the original deck's code. <a href="debrief/">Start with its introduction.</a></p>
<ol>{chap}</ol>
<h2>Sources</h2>
<ul><li>Our decks' code: <a href="https://github.com/SovereignWebsite/Site__Agent__Studio/tree/dev/site/factory/dinis-cruz/account-f/decks">site/factory/dinis-cruz/account-f/decks</a> in this site's repository.</li>
<li>The original deck's code carries no licence, so none of it is copied here: only techniques are reused, and credited.</li></ul>"""
page("", "Live WebGL decks", "Presentations rendered live in the browser with WebGL and sound made in code: what we learnt, the debrief we learnt from, starter code and two decks.", body, 0)
print("built", len(CHAPTERS) + 4, "pages")
