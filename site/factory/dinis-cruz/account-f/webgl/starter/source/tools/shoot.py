"""Render deterministic frames of the deck headlessly, for visual review by an agent.

usage:  python3 tools/shoot.py                    # default shot list below
        python3 tools/shoot.py title:0:2.5 field:1:4.0 trans:field:0.5

Each shot is scene:beat:seconds (seconds into that beat), or trans:scene:p for the
entry transition of a scene at progress p. PNGs go to shots/.
Uses Chrome with SwiftShader so it works without a GPU (slow but exact).
"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
DECK = (ROOT / "dist" / "deck.html").as_uri() + "?headless"
OUT = ROOT / "shots"; OUT.mkdir(exist_ok=True)
SHOTS = sys.argv[1:] or ["title:0:3.0", "title:1:2.5", "trans:field:0.45", "field:0:3.5", "field:1:5.0"]
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    page = b.new_page(viewport={"width": 1280, "height": 720})
    logs = []
    page.on("console", lambda m: logs.append(f"[{m.type}] {m.text}"))
    page.on("pageerror", lambda e: logs.append(f"[pageerror] {e}"))
    page.goto(DECK)
    page.wait_for_function("window.ready === true", timeout=120_000)
    for s in SHOTS:
        parts = s.split(":")
        if parts[0] == "trans":
            page.evaluate("([id,p]) => window.__deck.test.trans(id, p)", [parts[1], float(parts[2])])
        else:
            page.evaluate("([id,b,t]) => window.__deck.test.seek(id, b, t)", [parts[0], int(parts[1]), float(parts[2])])
        path = OUT / (s.replace(":", "_") + ".png")
        page.screenshot(path=str(path))
        print("wrote", path.relative_to(ROOT))
    b.close()
for l in logs:
    if "error" in l.lower() or "warn" in l.lower():
        print(l)
