#!/usr/bin/env python3
"""Five designs of studio.agents.sovereignweb.site/accounts/c/ (studio.c's Reels review page).
design.c@SovereignWebsite.dinis, round 1. Same facts as the review page: read from the Instagram site's
post folders, exactly as the review page reads them.
Usage: build.py <Site__Platform__Instagram checkout> <Site__Agent__Studio site dir>"""
import json, os, sys, glob, html, subprocess, datetime

IG, SITE = sys.argv[1], sys.argv[2]
OUT = os.path.join(SITE, "accounts", "c", "designs")
IGHOST = "https://instagram.platform.sovereignweb.site"
IGREPO = "https://github.com/SovereignWebsite/Site__Platform__Instagram"
HERE = "https://studio.agents.sovereignweb.site/accounts/c/designs"
e = html.escape


def load():
    posts = []
    for f in sorted(glob.glob(os.path.join(IG, "site/posts/*/post.json"))):
        slug = f.split(os.sep)[-2]
        d = json.load(open(f))
        folder = os.path.dirname(f)
        name = slug.split("__", 1)[1].replace("-", " ")
        p = dict(slug=slug, title=name[:1].upper() + name[1:], kind=d.get("kind", ""),
                 caption=d.get("caption", ""), source=d.get("source", ""),
                 alt=(d.get("alt") or [""])[0], cover=d.get("cover"), media=(d.get("media") or [""])[0])
        sp = os.path.join(folder, "script.txt")
        p["script"] = open(sp).read().strip() if os.path.exists(sp) else ""
        pub, ap = d.get("published"), d.get("approved")
        if pub:
            when = pub.get("sent_at") or pub.get("scheduled_for") or ""
            p["state"], p["sort"] = "live", when
            p["label"] = f"Sent {when[:10]} {when[11:16]} UTC via {pub.get('via', '')}".strip()
        elif ap:
            p["state"], p["sort"], p["label"] = "approved", ap.get("at", ""), "Approved, not yet sent"
        else:
            p["state"], p["sort"], p["label"] = "awaiting", slug, "Waiting for Dinis's yes"
        # a small cover served from this site, so nothing loads from another host until play is pressed
        img = os.path.join(folder, p["cover"] or p["media"])
        p["thumb"] = f"/accounts/c/designs/media/{slug}.webp"
        os.makedirs(os.path.join(OUT, "media"), exist_ok=True)
        from PIL import Image
        im = Image.open(img).convert("RGB")
        im.thumbnail((540, 960))
        im.save(os.path.join(OUT, "media", f"{slug}.webp"), "WEBP", quality=70)
        p["w"], p["h"] = im.size
        posts.append(p)
    aw = sorted([p for p in posts if p["state"] in ("awaiting", "approved")], key=lambda p: p["sort"], reverse=True)
    lv = sorted([p for p in posts if p["state"] == "live"], key=lambda p: p["sort"], reverse=True)
    rev = subprocess.run(["git", "-C", IG, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    return aw, lv, rev


AW, LV, REV = load()
BUILT = datetime.datetime.now(datetime.timezone.utc).strftime("%d %B %Y, %H:%M UTC").lstrip("0")

INTRO = ("Made by studio.c, the studio agent on account C, for the team's Instagram. Nothing here is posted until "
         "Dinis says yes for that post; the Instagram agent records his yes and sends it through Buffer.")
AW_INTRO = ("Drafts in the Instagram site's post folders with no approval line yet. Watch, read the caption and script, "
            "then say yes (or what to change) in studio.c's or instagram.c's session.")
LV_INTRO = "Posts the Instagram agent has sent, with the record of when."
VIDEO_NOTE = f"The video loads from {IGHOST.split('//')[1]} only when you press play."

DESIGNS = [
    (1, "Screening Room", "A dark screening room: the drafts waiting for a yes on the big screens, the posts already out under Now showing."),
    (2, "Light Table", "Proofs laid out on a light table, each waiting for its stamp; the sent ones already stamped."),
    (3, "Call Sheet", "A production call sheet: every post in one table, then each one's caption, script and credits."),
    (4, "Inbox", "An approvals inbox: the list on the left, each post opened on the right, the unanswered ones first."),
    (5, "Brief", "Everything on one plain page, for reading fast or printing."),
]
FAMILY = [("https://sovereignwebsite.ai/", "Sovereign Website"), ("https://sovereignwebsite.org/", "Principles"),
          ("https://sovereignwebsite.site/", "Hosted"), ("https://hub.sovereignweb.site/", "Hub"),
          ("https://agents.sovereignweb.site/", "Agents"), ("https://vault.sovereignwebsite.site/", "Vault"),
          ("https://agenticcells.ai/", "AgentiCCells"), ("https://riskmandate.ai/", "RiskMandate"),
          ("https://newsroom.sgit.ai/", "Newsroom")]

BASE = """
*{box-sizing:border-box}
html{color-scheme:light dark;-webkit-text-size-adjust:100%}
body{margin:0;font:1.0625rem/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--fg);overflow-wrap:break-word}
img,video{max-width:100%;height:auto;display:block}
a{color:var(--link)}
:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.skip{position:absolute;left:-999px;top:.5rem;z-index:99;background:var(--bg);color:var(--fg);padding:.5rem .9rem;border:2px solid var(--focus)}
.skip:focus{left:1rem}
main *{min-width:0}
.chrome{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:flex-end;position:relative;z-index:5;padding-top:.5rem}
.chrome .by{margin:0 auto 0 0;font-size:.9rem;color:var(--muted)}
.chrome .by a{color:var(--fg)}
.chrome details{position:relative}
.chrome summary{cursor:pointer;list-style:none;min-height:44px;display:inline-flex;align-items:center;padding:.35rem .8rem;border:1px solid var(--ctl);border-radius:999px;font-size:.9rem;background:var(--bg);color:var(--fg)}
.chrome summary::-webkit-details-marker{display:none}
.chrome summary::after{content:"";width:.45rem;height:.45rem;margin-left:.5rem;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg) translateY(-2px)}
.chrome details[open] summary::after{transform:rotate(-135deg)}
.chrome ul{position:absolute;right:0;top:calc(100% + .35rem);margin:0;padding:.4rem;list-style:none;min-width:15rem;max-width:calc(100vw - 2rem);background:var(--bg);color:var(--fg);border:1px solid var(--ctl);border-radius:.6rem;box-shadow:0 .6rem 1.6rem rgba(0,0,0,.25)}
.chrome li a{display:block;padding:.55rem .7rem;border-radius:.4rem;color:var(--fg);text-decoration:none;font-size:.95rem}
.chrome li a:hover,.chrome li a:focus-visible{background:var(--hover)}
.chrome li a[aria-current]{font-weight:700;text-decoration:underline}
.chrome .gap{border-top:1px solid var(--ctl);margin-top:.3rem;padding-top:.3rem}
.chrome small{display:block;font-size:.85rem;color:var(--muted);font-weight:400}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.pre{white-space:pre-line}
details.more summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600}
footer{padding:2rem 0 3rem;font-size:.95rem}
footer nav{display:flex;flex-wrap:wrap;gap:.25rem 1.25rem}
footer nav a{min-height:44px;display:inline-flex;align-items:center}
@media print{.chrome,.skip{display:none}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
"""


def head(n, name, idea, css):
    title = f"{name}, design {n} of Studio account C" if n else "Five designs, Studio account C"
    desc = (f"Design {n} of studio.agents.sovereignweb.site/accounts/c/, {name}: {idea}" if n else
            "Five designs of studio.c's Reels review page, the same posts in five ideas, side by side.")
    url = f"{HERE}/{n}/" if n else f"{HERE}/"
    img = "https://studio.agents.sovereignweb.site/assets/share/card-1200x630.jpg"
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="robots" content="noindex">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Studio">
<meta property="og:locale" content="en_GB">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Studio">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{img}">
<link rel="canonical" href="{url}">
<style>{BASE}{css}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
"""


def chrome(n):
    d = "".join(f'<li><a href="/accounts/c/designs/{i}/"{" aria-current=\"page\"" if i == n else ""}>{i}. {nm}<small>{idea}</small></a></li>' for i, nm, idea in DESIGNS)
    fam = "".join(f'<li><a href="{u}">{t}</a></li>' for u, t in FAMILY)
    return f"""<nav class="chrome" aria-label="Designs and the Sovereign Website family">
<p class="by">Studio, account C</p>
<details><summary>Choose a design</summary><ul>{d}<li class="gap"><a href="/accounts/c/designs/">All five, side by side</a></li><li><a href="/accounts/c/">The page as it is now</a></li></ul></details>
<details><summary>Sovereign Website</summary><ul><li><a href="/start/">Start here</a></li><li><a href="/agents/">Use with your AI</a></li><li><a href="/admin/">How this site was made</a></li><li class="gap"><a href="/policy/">How this site is governed</a></li>{fam}</ul></details>
</nav>"""


def owner_nav(cls="own"):
    return (f'<nav class="{cls}" aria-label="This page"><a href="#awaiting">Awaiting approval ({len(AW)})</a>'
            f'<a href="#live">Live on Instagram ({len(LV)})</a><a href="/start/">Start here</a><a href="/agents/">Use with your AI</a></nav>')


def footer():
    return f"""<footer>
<p>Built {BUILT} from Site__Platform__Instagram at {REV}. A static page: no tracking, no token, nothing loaded from Instagram itself. Covers are copied here; each video loads from instagram.platform.sovereignweb.site only when you press play.</p>
<nav aria-label="Seed pages"><a href="/start/">Start here</a> <a href="/agents/">Use with your AI</a> <a href="/admin/">How this site was made</a> <a href="/policy/">How this site is governed</a></nav>
</footer>
</body>
</html>
"""


def media(p, cls="media"):
    alt = e(p["alt"])
    if p["kind"] == "reel":
        return (f'<div class="{cls}"><video controls preload="none" playsinline width="{p["w"]}" height="{p["h"]}" poster="{p["thumb"]}" '
                f'aria-label="{alt}"><source src="{IGHOST}/posts/{p["slug"]}/{p["media"]}" type="video/mp4"></video></div>')
    return f'<div class="{cls}"><img src="{p["thumb"]}" alt="{alt}" width="{p["w"]}" height="{p["h"]}" loading="lazy"></div>'


def texts(p, open_caption=True, hl="h4"):
    out = [f'<{hl}>Caption</{hl}><p class="pre">{e(p["caption"])}</p>']
    if p["script"]:
        out.append(f'<details class="more"><summary>Script<span class="vh"> of {e(p["title"])}</span></summary><p class="pre">{e(p["script"])}</p></details>')
    out.append(f'<details class="more"><summary>Made with, and licences<span class="vh">: {e(p["title"])}</span></summary><p>{e(p["source"])}</p></details>')
    out.append(f'<p><a href="{IGREPO}/tree/dev/site/posts/{p["slug"]}">Post folder<span class="vh">: {e(p["title"])}</span></a></p>')
    return "".join(out)


def page(n, css, body):
    name, idea = DESIGNS[n - 1][1], DESIGNS[n - 1][2]
    return head(n, name, idea, css) + body + footer()


# ------------------------------------------------------------- 1. Screening Room (dark first)
CSS1 = """
:root{--bg:#0e0e10;--fg:#f4f2ee;--muted:#bdb9b1;--link:#ffd27a;--focus:#ffd27a;--ctl:#8a867f;--hover:#1e1e22;--screen:#000;--seat:#18181b;--line:#2c2c31;--wait:#ffd27a;--ok:#7fdcae}
@media (prefers-color-scheme:light){:root{--bg:#f4f2ee;--fg:#141416;--muted:#4f4c47;--link:#7a4e00;--focus:#7a4e00;--ctl:#77736c;--hover:#e7e4dd;--screen:#141416;--seat:#ffffff;--line:#d9d5cc;--wait:#7a4e00;--ok:#1d6b45}}
.wrap{max-width:80rem;margin:0 auto;padding:0 1rem}
.mast{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:.5rem 1rem;padding:.5rem 0}
.brand{font:800 1.15rem/1 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--fg);text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
.own{display:flex;flex-wrap:wrap;gap:.25rem 1rem;font-size:.95rem}.own a{color:var(--fg);min-height:44px;display:inline-flex;align-items:center}
.marquee{text-align:center;padding:clamp(1.5rem,5vw,3.5rem) 0 1rem}
.marquee .k{font-size:.85rem;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin:0}
h1{font:700 clamp(2.1rem,6vw,3.8rem)/1.05 Georgia,"Iowan Old Style","Times New Roman",serif;margin:.5rem 0 1rem}
.marquee p.lede{max-width:44rem;margin:0 auto}
h2{font:700 clamp(1.45rem,3.6vw,2.1rem)/1.15 Georgia,serif;margin:0}
.hall{padding:clamp(2rem,5vw,3.5rem) 0;border-top:1px solid var(--line)}
.hall-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:.5rem 1rem;margin-bottom:.5rem}
.count{display:inline-grid;place-items:center;min-width:2.4rem;height:2.4rem;border-radius:999px;background:var(--wait);color:var(--bg);font-weight:800}
#live .count{background:var(--ok)}
.screens{display:grid;gap:1.5rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));margin-top:1.5rem}
.screen{background:var(--seat);border:1px solid var(--line);border-radius:.8rem;overflow:hidden}
.screen .media{background:var(--screen);display:grid;place-items:center;padding:1rem;box-shadow:inset 0 0 3rem rgba(255,210,122,.08)}
.screen video,.screen img{max-height:34rem;width:auto;border-radius:.4rem}
.screen .body{padding:1rem 1.1rem 1.2rem}
.screen h3{font:700 1.35rem Georgia,serif;margin:.4rem 0 .1rem}
.screen h4{font-size:.85rem;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin:1rem 0 .25rem}
.tag{display:inline-block;font-size:.85rem;font-weight:700;padding:.15rem .6rem;border-radius:999px;border:2px solid currentColor}
.awaiting .tag,.approved .tag{color:var(--wait)}.live .tag{color:var(--ok)}
.kind{color:var(--muted);font-size:.9rem;margin:0}
.now{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));margin-top:1.5rem}
.now .screen video,.now .screen img{max-height:22rem}
.note{color:var(--muted);font-size:.95rem}
footer{border-top:1px solid var(--line)}
"""


def screen(p, hl="h3"):
    return (f'<article class="screen {p["state"]}">{media(p)}<div class="body"><span class="tag">{e(p["label"])}</span>'
            f'<{hl}>{e(p["title"])}</{hl}><p class="kind">{e(p["kind"])}</p>{texts(p)}</div></article>')


def d1():
    return page(1, CSS1, f"""<div class="wrap">{chrome(1)}
<header class="mast"><a class="brand" href="/">Studio</a>{owner_nav()}</header></div>
<main id="main"><div class="wrap">
<div class="marquee"><p class="k">Studio · account C</p><h1>Reels and images for Instagram</h1><p class="lede">{INTRO}</p></div>
<section class="hall" id="awaiting" aria-labelledby="h-aw"><div class="hall-h"><h2 id="h-aw">Awaiting approval</h2><span class="count">{len(AW)}</span></div>
<p>{AW_INTRO}</p><p class="note">{VIDEO_NOTE}</p>
<div class="screens">{''.join(screen(p) for p in AW) or '<p>Nothing is waiting for a yes.</p>'}</div></section>
<section class="hall" id="live" aria-labelledby="h-lv"><div class="hall-h"><h2 id="h-lv">Live on Instagram: now showing</h2><span class="count">{len(LV)}</span></div>
<p>{LV_INTRO}</p>
<div class="now">{''.join(screen(p) for p in LV)}</div></section>
</div></main><div class="wrap">""").replace("</body>", "</div></body>")


# ------------------------------------------------------------- 2. Light Table
CSS2 = """
:root{--bg:#eef0f2;--fg:#15171a;--muted:#4b5058;--link:#0b5394;--focus:#0b5394;--ctl:#727985;--hover:#e1e5ea;--table:#ffffff;--glow:#fffdf6;--line:#cfd5dd;--stamp:#b3261e;--ok:#1d6b45}
@media (prefers-color-scheme:dark){:root{--bg:#111316;--fg:#eceef1;--muted:#b0b6bf;--link:#8cc4ff;--focus:#8cc4ff;--ctl:#7f8792;--hover:#1d2126;--table:#1a1d22;--glow:#22262c;--line:#323843;--stamp:#ff8a80;--ok:#86ddb3}}
.wrap{max-width:76rem;margin:0 auto;padding:0 1rem}
.mast{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:.5rem 1rem;padding:.5rem 0}
.brand{font-weight:800;font-size:1.2rem;color:var(--fg);text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
.own{display:flex;flex-wrap:wrap;gap:.25rem 1rem;font-size:.95rem}.own a{color:var(--fg);min-height:44px;display:inline-flex;align-items:center}
.hero{display:grid;gap:1.5rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));align-items:end;padding:clamp(1.5rem,5vw,3rem) 0}
.k{font-size:.85rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 .4rem}
h1{font-size:clamp(2.1rem,6vw,3.5rem);line-height:1.05;margin:0 0 1rem;letter-spacing:-.02em}
h2{font-size:clamp(1.45rem,3.4vw,2rem);margin:0 0 .4rem}
.tally{display:flex;gap:1rem;flex-wrap:wrap}
.tally a{flex:1 1 10rem;background:var(--table);border:1px solid var(--line);border-radius:.6rem;padding:1rem;color:var(--fg);text-decoration:none}
.tally b{display:block;font-size:2.4rem;line-height:1}
.tally a:first-child b{color:var(--stamp)}
.table{background:var(--table);border:1px solid var(--line);border-radius:1rem;padding:clamp(1rem,3vw,2rem);margin:1rem 0 2rem;background-image:radial-gradient(circle at 50% 0,var(--glow),transparent 70%)}
.proofs{display:grid;gap:1.5rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr));margin-top:1.25rem}
.proof{position:relative;background:var(--bg);border:1px solid var(--line);padding:.75rem;box-shadow:0 .5rem 1.2rem rgba(0,0,0,.12)}
.proof:nth-child(odd){transform:rotate(-.6deg)}.proof:nth-child(even){transform:rotate(.5deg)}
@media (prefers-reduced-motion:reduce){.proof{transform:none!important}}
.proof .media{display:grid;place-items:center;background:#000}
.proof video,.proof img{max-height:30rem;width:auto}
.stamp{position:absolute;top:1rem;right:1rem;z-index:2;font:800 .95rem/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;padding:.45rem .6rem;border:3px solid currentColor;background:var(--bg);color:var(--stamp);transform:rotate(6deg)}
.live .stamp{color:var(--ok);transform:rotate(-4deg)}
.proof h3{margin:.75rem 0 0;font-size:1.25rem}
.proof h4{margin:.9rem 0 .2rem;font-size:1rem}
.proof .kind,.proof .label{margin:0;color:var(--muted);font-size:.95rem}
footer{border-top:1px solid var(--line)}
"""


def proof(p):
    st = "Yes?" if p["state"] != "live" else "Sent"
    return (f'<article class="proof {p["state"]}"><span class="stamp" aria-hidden="true">{st}</span>{media(p)}'
            f'<h3>{e(p["title"])}</h3><p class="label">{e(p["label"])}</p><p class="kind">{e(p["kind"])}</p>{texts(p)}</article>')


def d2():
    return page(2, CSS2, f"""<div class="wrap">{chrome(2)}
<header class="mast"><a class="brand" href="/">Studio</a>{owner_nav()}</header>
<main id="main">
<div class="hero"><div><p class="k">Studio · account C</p><h1>Reels and images for Instagram</h1><p>{INTRO}</p></div>
<div class="tally"><a href="#awaiting"><b>{len(AW)}</b>awaiting approval</a><a href="#live"><b>{len(LV)}</b>live on Instagram</a></div></div>
<section class="table" id="awaiting" aria-labelledby="h-aw"><h2 id="h-aw">Awaiting approval</h2><p>{AW_INTRO}</p><p>{VIDEO_NOTE}</p>
<div class="proofs">{''.join(proof(p) for p in AW) or '<p>Nothing is waiting for a yes.</p>'}</div></section>
<section class="table" id="live" aria-labelledby="h-lv"><h2 id="h-lv">Live on Instagram</h2><p>{LV_INTRO}</p>
<div class="proofs">{''.join(proof(p) for p in LV)}</div></section>
</main>
""") .replace("</body>", "</div></body>")


# ------------------------------------------------------------- 3. Call Sheet
CSS3 = """
:root{--bg:#fbfaf6;--fg:#1b1a17;--muted:#56524a;--link:#7b2d12;--focus:#7b2d12;--ctl:#7f796e;--hover:#efece3;--line:#d7d1c3;--head:#1b1a17;--on-head:#fbfaf6;--wait:#7a4e00;--ok:#1d6b45}
@media (prefers-color-scheme:dark){:root{--bg:#161512;--fg:#efece4;--muted:#c0baae;--link:#ffab8a;--focus:#ffab8a;--ctl:#8b8578;--hover:#24221d;--line:#3b3831;--head:#efece4;--on-head:#161512;--wait:#ffcf6e;--ok:#86ddb3}}
.wrap{max-width:66rem;margin:0 auto;padding:0 1rem}
.mast{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:.5rem 1rem;padding:.5rem 0;border-bottom:3px solid var(--fg)}
.brand{font:700 1.2rem Georgia,"Times New Roman",serif;color:var(--fg);text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
.own{display:flex;flex-wrap:wrap;gap:.25rem 1rem;font-size:.95rem}.own a{color:var(--fg);min-height:44px;display:inline-flex;align-items:center}
.sheet-h{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));padding:1.5rem 0;border-bottom:1px solid var(--line)}
.k{font:700 .85rem ui-monospace,Menlo,Consolas,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0}
h1{font:700 clamp(2rem,5.6vw,3.2rem)/1.08 Georgia,"Times New Roman",serif;margin:.3rem 0 .75rem}
h2{font:700 1.5rem Georgia,serif;margin:2rem 0 .4rem}
h3{font:700 1.3rem Georgia,serif;margin:0}
.facts{margin:0;display:grid;grid-template-columns:auto 1fr;gap:.3rem 1rem;align-content:start}
.facts dt{font:700 .85rem ui-monospace,Menlo,Consolas,monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}.facts dd{margin:0}
.box{overflow-x:auto;margin:1rem 0}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:.6rem .5rem;border-bottom:1px solid var(--line);vertical-align:top}
thead th{background:var(--head);color:var(--on-head);font:700 .85rem ui-monospace,Menlo,Consolas,monospace;text-transform:uppercase;letter-spacing:.08em}
tbody th{font-weight:700}
.st{font-weight:700}.st.awaiting,.st.approved{color:var(--wait)}.st.live{color:var(--ok)}
@media (max-width:40rem){thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}tr{display:block;border-bottom:1px solid var(--line);padding:.5rem 0}th,td{display:block;border:0;padding:.1rem 0}}
.scene{display:grid;gap:1.5rem;grid-template-columns:minmax(0,15rem) 1fr;padding:1.5rem 0;border-top:1px solid var(--line)}
@media (max-width:40rem){.scene{grid-template-columns:1fr}}
.scene .media{background:#000;display:grid;place-items:center}
.scene video,.scene img{max-height:26rem;width:auto}
.scene h4{font:700 .85rem ui-monospace,Menlo,Consolas,monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:1rem 0 .2rem}
.scene .label{margin:.2rem 0 0;font-weight:700}
footer{border-top:3px solid var(--fg)}
"""


def d3():
    rows = "".join(f'<tr><th scope="row"><a href="#p-{p["slug"]}">{e(p["title"])}</a></th><td>{e(p["kind"])}</td>'
                   f'<td><span class="st {p["state"]}">{e(p["label"])}</span></td></tr>' for p in AW + LV)

    def scene(p):
        return (f'<article class="scene" id="p-{p["slug"]}">{media(p)}<div><h3>{e(p["title"])}</h3>'
                f'<p class="label st {p["state"]}">{e(p["label"])}</p><p>{e(p["kind"])}</p>{texts(p)}</div></article>')
    return page(3, CSS3, f"""<div class="wrap">{chrome(3)}
<header class="mast"><a class="brand" href="/">Studio</a>{owner_nav()}</header>
<main id="main">
<div class="sheet-h"><div><p class="k">Call sheet · Studio · account C</p><h1>Reels and images for Instagram</h1><p>{INTRO}</p></div>
<dl class="facts"><dt>Awaiting</dt><dd>{len(AW)} for Dinis's yes</dd><dt>Live</dt><dd>{len(LV)} on Instagram</dd><dt>Source</dt><dd>Site__Platform__Instagram at {REV}</dd></dl></div>
<h2>The sheet</h2>
<div class="box" tabindex="0" role="region" aria-label="Every post and its state"><table><thead><tr><th scope="col">Post</th><th scope="col">Kind</th><th scope="col">State</th></tr></thead><tbody>{rows}</tbody></table></div>
<section id="awaiting" aria-labelledby="h-aw"><h2 id="h-aw">Awaiting approval ({len(AW)})</h2><p>{AW_INTRO}</p><p>{VIDEO_NOTE}</p>{''.join(scene(p) for p in AW)}</section>
<section id="live" aria-labelledby="h-lv"><h2 id="h-lv">Live on Instagram ({len(LV)})</h2><p>{LV_INTRO}</p>{''.join(scene(p) for p in LV)}</section>
</main>
""").replace("</body>", "</div></body>")


# ------------------------------------------------------------- 4. Inbox (way out there)
CSS4 = """
:root{--bg:#f3f1fb;--fg:#17142a;--muted:#4e4a66;--link:#4b2bbf;--focus:#4b2bbf;--ctl:#77729a;--hover:#e6e2f6;--pane:#ffffff;--rail:#17142a;--on-rail:#f3f1fb;--rail-muted:#c9c4e6;--line:#d8d3ee;--wait:#8a4b00;--ok:#1d6b45;--unread:#ffcf6e}
@media (prefers-color-scheme:dark){:root{--bg:#0f0d1c;--fg:#efedf9;--muted:#bdb8d8;--link:#b7a6ff;--focus:#b7a6ff;--ctl:#7f7a9f;--hover:#1f1b36;--pane:#181530;--rail:#08070f;--on-rail:#efedf9;--rail-muted:#bdb8d8;--line:#2e2950;--wait:#ffcf6e;--ok:#86ddb3;--unread:#ffcf6e}}
.top{max-width:90rem;margin:0 auto;padding:0 1rem}
.mast{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:.5rem 1rem;padding:.5rem 0}
.brand{font-weight:800;font-size:1.15rem;color:var(--fg);text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
.own{display:flex;flex-wrap:wrap;gap:.25rem 1rem;font-size:.95rem}.own a{color:var(--fg);min-height:44px;display:inline-flex;align-items:center}
.app{max-width:90rem;margin:0 auto;padding:0 1rem 2rem;display:grid;gap:1rem;grid-template-columns:1fr}
@media (min-width:62rem){.app{grid-template-columns:20rem 1fr;align-items:start}.rail{position:sticky;top:1rem;max-height:calc(100vh - 2rem);overflow:auto}}
.rail{background:var(--rail);color:var(--on-rail);border-radius:1rem;padding:1rem}
.rail h1{font-size:1.5rem;line-height:1.15;margin:.2rem 0 .5rem}
.rail p{color:var(--rail-muted);font-size:.95rem;margin:.3rem 0 1rem}
.rail h2{font-size:.85rem;letter-spacing:.12em;text-transform:uppercase;color:var(--rail-muted);margin:1rem 0 .4rem}
.rail ul{list-style:none;margin:0;padding:0;display:grid;gap:.3rem}
.rail a{display:flex;gap:.6rem;align-items:center;color:var(--on-rail);text-decoration:none;padding:.5rem;border-radius:.6rem;min-height:44px}
.rail a:hover,.rail a:focus-visible{background:rgba(255,255,255,.08)}
.rail img{width:2.4rem;height:3.2rem;object-fit:cover;border-radius:.3rem;flex:none}
.rail .dot{width:.6rem;height:.6rem;border-radius:50%;background:var(--unread);flex:none}
.rail .t{display:block;font-weight:700}.rail .s{display:block;font-size:.85rem;color:var(--rail-muted)}
.pane{display:grid;gap:1rem}
.group{background:var(--pane);border:1px solid var(--line);border-radius:1rem;padding:clamp(1rem,3vw,1.75rem)}
.group>h2{font-size:clamp(1.4rem,3vw,1.8rem);margin:0 0 .3rem}
.msg{display:grid;gap:1.25rem;grid-template-columns:1fr;padding:1.25rem 0;border-top:1px solid var(--line);scroll-margin-top:1rem}
@media (min-width:48rem){.msg{grid-template-columns:minmax(0,16rem) 1fr}}
.msg .media{background:#000;border-radius:.6rem;overflow:hidden;display:grid;place-items:center}
.msg video,.msg img{max-height:28rem;width:auto}
.msg h3{font-size:1.3rem;margin:0}
.msg h4{font-size:1rem;margin:1rem 0 .2rem}
.from{color:var(--muted);font-size:.95rem;margin:.2rem 0}
.state{font-weight:700}.awaiting .state,.approved .state{color:var(--wait)}.live .state{color:var(--ok)}
.reply{margin-top:1rem;padding:.75rem 1rem;border-left:4px solid var(--link);background:var(--hover);border-radius:.4rem}
footer{max-width:90rem;margin:0 auto;padding:2rem 1rem 3rem}
"""


def d4():
    def item(p):
        dot = '<span class="dot" aria-hidden="true"></span>' if p["state"] != "live" else ""
        return (f'<li><a href="#p-{p["slug"]}">{dot}<img src="{p["thumb"]}" alt="" width="{p["w"]}" height="{p["h"]}">'
                f'<span><span class="t">{e(p["title"])}</span><span class="s">{e(p["label"])}</span></span></a></li>')

    def msg(p):
        reply = (f'<p class="reply">To answer: say yes, or what to change, in studio.c\'s or instagram.c\'s session.</p>'
                 if p["state"] != "live" else "")
        return (f'<article class="msg {p["state"]}" id="p-{p["slug"]}">{media(p)}<div><p class="state">{e(p["label"])}</p>'
                f'<h3>{e(p["title"])}</h3><p class="from">{e(p["kind"])}</p>{texts(p)}{reply}</div></article>')
    return page(4, CSS4, f"""<div class="top">{chrome(4)}
<header class="mast"><a class="brand" href="/">Studio</a>{owner_nav()}</header></div>
<main id="main" class="app">
<div class="rail"><p class="vh">Studio · account C</p><h1>Reels and images for Instagram</h1><p>{INTRO}</p>
<h2>Awaiting approval ({len(AW)})</h2><ul>{''.join(item(p) for p in AW)}</ul>
<h2>Live on Instagram ({len(LV)})</h2><ul>{''.join(item(p) for p in LV)}</ul></div>
<div class="pane">
<section class="group" id="awaiting" aria-labelledby="h-aw"><h2 id="h-aw">Awaiting approval</h2><p>{AW_INTRO}</p><p>{VIDEO_NOTE}</p>{''.join(msg(p) for p in AW)}</section>
<section class="group" id="live" aria-labelledby="h-lv"><h2 id="h-lv">Live on Instagram</h2><p>{LV_INTRO}</p>{''.join(msg(p) for p in LV)}</section>
</div></main>
""")


# ------------------------------------------------------------- 5. Brief
CSS5 = """
:root{--bg:#ffffff;--fg:#111111;--muted:#4a4a4a;--link:#0b4f8a;--focus:#0b4f8a;--ctl:#767676;--hover:#f0f0f0;--line:#d6d6d6}
@media (prefers-color-scheme:dark){:root{--bg:#121212;--fg:#f1f1f1;--muted:#bdbdbd;--link:#8cc4ff;--focus:#8cc4ff;--ctl:#8a8a8a;--hover:#222;--line:#333}}
.wrap{max-width:42rem;margin:0 auto;padding:0 1rem}
.brand{font:700 1.1rem Georgia,"Times New Roman",serif;color:var(--fg);text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
.own{display:flex;flex-wrap:wrap;gap:0 1rem;font-size:.95rem}.own a{min-height:44px;display:inline-flex;align-items:center}
h1{font:700 clamp(2rem,6vw,2.6rem)/1.15 Georgia,serif;margin:1.25rem 0 .75rem}
h2{font:700 1.45rem Georgia,serif;margin:2rem 0 .4rem;padding-top:1rem;border-top:1px solid var(--line)}
h3{font-size:1.15rem;margin:1.5rem 0 .2rem}
h4{font-size:1rem;margin:.75rem 0 .1rem}
.p{display:grid;gap:1rem;grid-template-columns:7rem 1fr}
.p .media{max-width:7rem}
@media print{.p{grid-template-columns:1fr}.p .media{display:none}details{display:block}}
.label{color:var(--muted);margin:0}
footer{border-top:1px solid var(--line);margin-top:2.5rem}
"""


def d5():
    def it(p):
        return f'<article class="p">{media(p)}<div><h3>{e(p["title"])}</h3><p class="label">{e(p["label"])}, {e(p["kind"])}</p>{texts(p)}</div></article>'
    return page(5, CSS5, f"""<div class="wrap">{chrome(5)}
<header><a class="brand" href="/">Studio</a>{owner_nav()}</header>
<main id="main"><h1>Reels and images for Instagram</h1><p>{INTRO}</p>
<section id="awaiting" aria-labelledby="h-aw"><h2 id="h-aw">Awaiting approval ({len(AW)})</h2><p>{AW_INTRO} {VIDEO_NOTE}</p>{''.join(it(p) for p in AW)}</section>
<section id="live" aria-labelledby="h-lv"><h2 id="h-lv">Live on Instagram ({len(LV)})</h2><p>{LV_INTRO}</p>{''.join(it(p) for p in LV)}</section>
</main>
""").replace("</body>", "</div></body>")


CSSI = """
:root{--bg:#f6f5f2;--fg:#151515;--muted:#4f4c47;--link:#7a4e00;--focus:#7a4e00;--ctl:#77736c;--hover:#e9e6df;--card:#fff;--line:#dcd8cf}
@media (prefers-color-scheme:dark){:root{--bg:#121212;--fg:#efede8;--muted:#bdb9b1;--link:#ffd27a;--focus:#ffd27a;--ctl:#85817a;--hover:#222;--card:#1c1c1c;--line:#333}}
.wrap{max-width:76rem;margin:0 auto;padding:0 1rem}
.brand{font-weight:800;color:var(--fg);text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
h1{font:700 clamp(2rem,5.5vw,3rem)/1.1 Georgia,serif;margin:1rem 0 .75rem}
.cards{list-style:none;margin:1.5rem 0 3rem;padding:0;display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))}
.cards li{background:var(--card);border:1px solid var(--line);border-radius:.6rem;overflow:hidden}
.cards img{aspect-ratio:16/10;object-fit:cover;object-position:top;width:100%;border-bottom:1px solid var(--line)}
.cards .b{padding:1rem}.cards h2{font-size:1.2rem;margin:0 0 .3rem}.cards p{margin:.3rem 0}
footer{border-top:1px solid var(--line)}
"""


def index(rec):
    cards = "".join(f'<li><img src="/accounts/c/designs/{i}/shot-1366.webp" alt="Design {i}, {nm}, at desktop width" width="1366" height="854" loading="lazy"><div class="b"><h2><a href="/accounts/c/designs/{i}/">{i}. {nm}</a></h2><p>{idea}</p>{"<p><strong>Recommended by the designer.</strong></p>" if i == rec else ""}</div></li>' for i, nm, idea in DESIGNS)
    return head(0, "", "", CSSI) + f"""<div class="wrap">{chrome(0)}
<header><a class="brand" href="/accounts/c/">Studio, account C</a></header>
<main id="main"><h1>Five designs of the Reels review page</h1>
<p>The same posts, in five ideas from the studio's own world. Each keeps the two areas: awaiting approval, and live on Instagram. The owner picks one; studio.c makes it the page.</p>
<ul class="cards">{cards}</ul></main>
""" + footer().replace("</body>", "</div></body>")


def fix(s):
    return s


if __name__ == "__main__":
    pages = {1: d1, 2: d2, 3: d3, 4: d4, 5: d5}
    for i, f in pages.items():
        os.makedirs(f"{OUT}/{i}", exist_ok=True)
        open(f"{OUT}/{i}/index.html", "w").write(f())
    open(f"{OUT}/index.html", "w").write(index(int(os.environ.get("RECOMMEND", "4"))))
    print("built", OUT, "awaiting", len(AW), "live", len(LV))
