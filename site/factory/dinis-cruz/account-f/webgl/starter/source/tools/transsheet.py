"""Render each transition at several progress points into a contact sheet (shots/sheet_<name>.png).

usage: python3 tools/transsheet.py [name ...]      # default: line daybreak slam tear
Pairs and the exact frames used for A and B are defined in PAIRS below: [sceneId, beat, secondsIntoBeat].
"""
import sys, pathlib, io
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
DECK = (ROOT / "dist" / "deck.html").as_uri() + "?headless"
OUT = ROOT / "shots"; OUT.mkdir(exist_ok=True)
PAIRS = {
    "line":     (["title", 1, 2.5], ["field", 0, 3.5]),
    "daybreak": (["title", 1, 2.5], ["field", 0, 3.5]),
    "slam":     (["field", 1, 5.0], ["plain", 1, 3.0]),
    "tear":     (["plain", 1, 3.0], ["end", 1, 2.5]),
    "iris":     (["title", 1, 2.5], ["field", 0, 3.5]),
}
PS = [0.0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.78, 0.92]
PS_BY = {"slam": [0.0, 0.18, 0.27, 0.30, 0.34, 0.40, 0.50, 0.70]}
names = sys.argv[1:] or ["line", "daybreak", "slam", "tear"]

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    page = b.new_page(viewport={"width": 960, "height": 540})
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    page.goto(DECK); page.wait_for_function("window.ready === true", timeout=180_000)
    for n in names:
        A, B = PAIRS[n]
        tiles = []
        ps = PS_BY.get(n, PS)
        for pr in ps:
            page.evaluate("([a,b,n,p]) => window.__deck.test.transPair(a,b,n,p)", [A, B, n, pr])
            tiles.append(Image.open(io.BytesIO(page.screenshot())).convert("RGB"))
        W, H = 480, 270
        sheet = Image.new("RGB", (W * 4, H * 2), "black"); d = ImageDraw.Draw(sheet)
        for i, (im, pr) in enumerate(zip(tiles, ps)):
            x, y = (i % 4) * W, (i // 4) * H
            sheet.paste(im.resize((W, H)), (x, y)); d.rectangle([x, y, x + 74, y + 22], fill="black"); d.text((x + 6, y + 5), f"p = {pr:.2f}", fill="white")
        sheet.save(OUT / f"sheet_{n}.png"); print("wrote", f"shots/sheet_{n}.png")
    b.close()
for e in errs[:10]: print("ERR", e[:300])
