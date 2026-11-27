"""Build releases/index.html from releases.json and releases.md.   python3 -I build_releases.py <releases dir>"""
import sys, os, json, html, re, markdown
R = os.path.abspath(sys.argv[1]); URL = "https://studio.agents.sovereignweb.site/factory/dinis-cruz/account-f/releases/"
data = json.load(open(f"{R}/releases.json")); intro = markdown.markdown(open(f"{R}/releases.md").read(), extensions=["fenced_code"])
e = html.escape
def release(r):
    sid = f"r{r['number']}"
    scenes = "".join(f"<li>{e(s)}</li>" for s in r["scenes"]); sources = "".join(f"<li>{e(s)}</li>" for s in r["sources"])
    return f"""<section class="release" id="{e(r['slug'])}" aria-labelledby="{sid}-h">
<p class="kicker">Release {r['number']} · {e(r['date'])}</p>
<h2 id="{sid}-h">{e(r['title'])}</h2>
<p class="tag">{e(r['tagline'])}</p>
<div class="player" data-src="{e(r['deck'])}" data-title="{e(r['title'])}, live deck">
<img src="{e(r['poster'])}" alt="{e(r['poster_alt'])}" width="1200" height="630" loading="lazy">
<button type="button" class="play">Play here</button>
</div>
<p class="links"><a href="{e(r['deck'])}">Open full screen</a> <a href="{e(r['deck'])}?size=1080x1920">Vertical player, 1080×1920</a> <a href="{e(r['source'])}">Source</a></p>
<p class="status">{e(r['status'])}</p>
<div class="cols">
<div><h3>Scenes</h3><ol>{scenes}</ol></div>
<div><h3>Made by</h3><p>{e(r['made_by'])}</p><h3>How</h3><p>{e(r['how'])}</p><h3>Sources</h3><ul>{sources}</ul></div>
</div>
</section>"""
body = intro.replace("<h1>", '<h1 id="top">', 1) + "\n".join(release(r) for r in data["releases"])
T = "Sovereign Website releases"; D = "Short live WebGL stories about owning your website, by cl-6.studio for Sovereign Website: play them here, full screen or vertical, and record your own copy."
page = f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{T}</title>
<meta name="description" content="{D}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Studio">
<meta property="og:locale" content="en_GB">
<meta property="og:url" content="{URL}">
<meta property="og:title" content="{T}">
<meta property="og:description" content="{D}">
<meta property="og:image" content="{URL}share.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="The opening card of Signed: this site's commits as a band of light, and sovereignwebsite.ai.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{T}">
<meta name="twitter:description" content="{D}">
<meta name="twitter:image" content="{URL}share.jpg">
<link rel="canonical" href="{URL}">
<style>
:root{{--bg:#0b0d12;--fg:#eef1ee;--muted:#b4c1ba;--accent:#ffd9c4;--line:#252a33;--card:#12151c;color-scheme:dark}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);font:17px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}}
.skip{{position:absolute;left:-999px}}.skip:focus{{left:1rem;top:1rem}}
header,main,footer{{max-width:62rem;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
header{{padding-top:1.4rem;display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;font-size:.95rem}}a{{color:var(--accent)}}
h1{{font-size:clamp(2rem,6vw,3.2rem);line-height:1.1;margin:1.2rem 0 .8rem;text-wrap:balance}}h2{{font-size:clamp(1.6rem,4vw,2.3rem);margin:.2rem 0}}h3{{font-size:1rem;margin:1rem 0 .3rem;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;font-weight:600}}
main>p,main>ul{{max-width:46rem;color:var(--muted)}}main li{{margin:.25rem 0}}
.release{{border-top:1px solid var(--line);margin-top:2.6rem;padding-top:1.6rem}}.kicker{{font:600 .8rem/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin:0}}
.tag{{color:var(--muted);margin:.2rem 0 1rem;font-size:1.1rem}}
.player{{position:relative;aspect-ratio:16/9;max-width:100%;background:#000;border-radius:8px;overflow:hidden}}.player img{{width:100%;height:100%;object-fit:cover;display:block;opacity:.85}}
.player iframe{{position:absolute;inset:0;width:100%;height:100%;border:0}}
.play{{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:600 1.05rem system-ui,sans-serif;padding:.8rem 1.4rem;border-radius:999px;border:0;background:var(--accent);color:#1b120c;cursor:pointer}}
.play:focus-visible{{outline:3px solid #fff;outline-offset:3px}}
.links{{display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;margin:.8rem 0 .2rem}}.status{{color:var(--muted);font-size:.92rem;margin:.2rem 0}}
.cols{{display:grid;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr));gap:0 2rem}}.cols p,.cols li{{color:var(--muted);font-size:.95rem}}
footer{{border-top:1px solid var(--line);margin-top:3rem;padding-top:1rem;padding-bottom:2rem;color:var(--muted);font-size:.85rem}}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header><a href="../webgl/">WebGL decks</a><a href="../webgl/learnings/">What we learnt</a><a href="https://sovereignwebsite.ai/">sovereignwebsite.ai</a></header>
<main id="main">
{body}
</main>
<footer>Kept by cl-6.studio@dinis. Built from <a href="releases.json">releases.json</a> and <a href="releases.md">releases.md</a>. Code: Apache-2.0. Text: CC BY 4.0.</footer>
<script>
// "Play here" swaps the poster for the live deck, one at a time (two live WebGL decks at once would share one GPU)
for (const p of document.querySelectorAll(".player")) p.querySelector(".play").addEventListener("click", () => {{
  for (const f of document.querySelectorAll(".player iframe")) f.remove();
  const f = document.createElement("iframe"); f.src = p.dataset.src; f.title = p.dataset.title; f.allow = "fullscreen; autoplay"; f.allowFullscreen = true;
  p.append(f); f.focus();
}});
</script>
</body>
</html>
"""
open(f"{R}/index.html", "w").write(page); print("built", len(data["releases"]), "releases")
