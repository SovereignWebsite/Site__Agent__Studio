# The storyboard of the session-refresh film: one sketch per beat, drawn as SVG from session-refresh/document.json,
# so every number in a sketch is the document's own. Sketches, not frames: they fix what each scene must show before
# any scene is built. Used by build.py. Apache-2.0. By c.productions (an AI agent).
import html
e = lambda s: html.escape(str(s), quote=True)
W, H = 480, 270
BG, FG, DIM, KEEP, COST, LOST = "#0e1412", "#ecebe6", "#8d928c", "#8fe0b4", "#ffc857", "#ff9d9d"
T = lambda x, y, s, fill=FG, size=13, anchor="start", weight=400: f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" font-family="system-ui,sans-serif">{e(s)}</text>'
R = lambda x, y, w, h, fill="none", stroke="none", extra="": f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{fill}" stroke="{stroke}" {extra}/>'
L = lambda x1, y1, x2, y2, stroke=DIM, extra="": f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="2" {extra}/>'
def light(x, y, r=7, c=COST): return f'<circle cx="{x}" cy="{y}" r="{r * 2.4}" fill="{c}" opacity=".18"/><circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>'
def page_(x, y, label, c=KEEP): return R(x, y, 46, 58, BG, c, 'stroke-width="2" rx="3"') + "".join(L(x + 8, y + 14 + i * 9, x + 38, y + 14 + i * 9, c, 'opacity=".6"') for i in range(3)) + T(x + 23, y + 74, label, c, 11, "middle")
def scroll(x, y, w, h, c=FG, lines=True): return R(x, y, w, h, BG, c, 'stroke-width="2" rx="4"') + ("".join(L(x + 6, y + 10 + i * 8, x + w - 6, y + 10 + i * 8, c, 'opacity=".35"') for i in range(int((h - 14) / 8))) if lines else "")
def key(x, y, c): return f'<circle cx="{x}" cy="{y}" r="13" fill="none" stroke="{c}" stroke-width="4"/>' + L(x + 13, y, x + 58, y, c, 'stroke-width="4"') + L(x + 44, y, x + 44, y + 11, c) + L(x + 54, y, x + 54, y + 9, c)
def envelope(x, y, c): return R(x, y, 40, 26, BG, c, 'stroke-width="2"') + f'<polyline points="{x},{y} {x + 20},{y + 14} {x + 40},{y}" fill="none" stroke="{c}" stroke-width="2"/>'
num = lambda v: f"{v:,.0f}"
mil = lambda v: f"{v / 1e6:.1f} M" if v >= 1e7 else f"{v / 1e6:.2f} M"

def facts(D):
    M, Hd = D["measured"], D["measured_handover"]; b, a = Hd["before"], Hd["after"]
    return {"out": M["output_tokens"], "reread": M["cache_read_tokens"], "ctx": M["context_tokens"], "window": M["window_tokens"], "threshold": 300000,
            "evidenced": [484000, 518000, 600000, 600000, 845000],  # document.json, section 7
            "before": b["used"], "after": a["used"], "floor": 75000,  # document.json: "about 75,000 tokens in both sessions" (78,600 before, 74,700 after)
            "saving": round((1 - a["used"] / b["used"]) * 100)}

def sketch(bid, F):
    g = []
    if bid == "hook":
        g += [scroll(60, 24, 70, 222), light(95, 150), L(95, 30, 95, 138, COST, 'stroke-dasharray="4 5"'), T(95, 262, "re-read from the top, every turn", DIM, 11, "middle")]
        big = 190; small = max(3, big * F["out"] / F["reread"])
        g += [R(220, 232 - small, 60, small, KEEP), T(250, 252, "written", DIM, 12, "middle"), T(250, 222 - small, mil(F["out"]), KEEP, 15, "middle", 700),
              R(340, 232 - big, 60, big, COST), T(370, 252, "re-read", DIM, 12, "middle"), T(370, 34, mil(F["reread"]), COST, 15, "middle", 700)]
    elif bid == "why":
        x0, y0, x1, y1, n = 50, 230, 440, 30, 14
        g += [L(x0, y0, x1, y0), L(x0, y0, x0, y1)]
        for i in range(n):
            x = x0 + 6 + i * (x1 - x0 - 12) / n; h = 8 + i * 4.2; g.append(R(x, y0 - h, 18, h, COST, "none", 'opacity=".55"'))
        pts = " ".join(f"{x0 + t * (x1 - x0):.0f},{y0 - t * t * (y0 - y1 - 10):.0f}" for t in [i / 20 for i in range(21)])
        g += [f'<polyline points="{pts}" fill="none" stroke="{LOST}" stroke-width="3"/>', T(300, 216, "one message: a line", COST, 12), T(300, 70, "all of them: a curve", LOST, 12, "end"),
              T(x1, y0 + 18, f"context: {num(F['ctx'])}", DIM, 11, "end"), T(x0 + 4, y1 - 6, f"re-read: {mil(F['reread'])}", DIM, 11)]
    elif bid == "moment":
        x0, x1, y = 30, 450, 150; X = lambda v: x0 + v / F["window"] * (x1 - x0)
        g += [R(x0, y - 9, x1 - x0, 18, "none", DIM, 'rx="9"'), R(x0, y - 9, X(F["evidenced"][-1]) - x0, 18, COST, "none", 'rx="9" opacity=".35"'),
              L(X(F["threshold"]), y - 46, X(F["threshold"]), y + 34, KEEP), T(X(F["threshold"]), y - 54, f"hand over before {num(F['threshold'])}", KEEP, 12, "middle"),
              T(x0, y + 30, "0", DIM, 11), T(x1, y + 30, num(F["window"]), DIM, 11, "end")]
        for v in F["evidenced"]: g.append(L(X(v), y - 16, X(v), y + 16, LOST))
        g += [light(X(F["evidenced"][-1]), y), T(X(F["evidenced"][0]), y + 52, f"real hand-overs: {num(F['evidenced'][0])} to {num(F['evidenced'][-1])}", LOST, 12)]
    elif bid == "writes":
        g += [L(40, 200, 250, 200), T(145, 222, "the desk: scratch tools fade", DIM, 11, "middle"), light(150, 150)]
        for i, x in enumerate([60, 105, 200]): g.append(R(x, 168, 30, 26, "none", DIM, 'stroke-dasharray="3 4" stroke-width="2"'))
        g += [L(300, 150, 460, 150, KEEP), T(380, 40, "the shelf: the repository", KEEP, 12, "middle")] + [page_(308 + i * 52, 88, n) for i, n in enumerate(["role", "now", "restart"])]
        g += [L(175, 140, 296, 118, KEEP, 'stroke-dasharray="4 5"'), T(380, 180, "0.8 to 4.3 KB each", DIM, 11, "middle")]
    elif bid == "reads":
        g += [R(120, 30, 340, 210, "none", DIM, 'rx="6" stroke-dasharray="2 6" stroke-width="2"'), T(290, 56, "“You are … Read restart.md and continue.”", FG, 12, "middle"),
              scroll(36, 70, 44, 150, DIM), L(30, 64, 86, 226, DIM), T(58, 244, "never opened", DIM, 11, "middle")]
        g += [page_(250 + i * 62, 96, f"{i + 1}. {n}") for i, n in enumerate(["rules", "role", "state"])]
        g += [light(190, 130, 5, KEEP), L(204, 128, 244, 124, KEEP, 'stroke-dasharray="4 5"')]
    elif bid == "keys":
        g += [key(60, 80, DIM), T(96, 118, "RETIRED", LOST, 15, "middle", 700), key(300, 80, KEEP), T(336, 118, "new key", KEEP, 12, "middle")]
        g += [envelope(70, 170, DIM), envelope(120, 170, DIM), L(176, 183, 290, 183, KEEP, 'stroke-dasharray="4 5"'), envelope(304, 170, KEEP), envelope(356, 170, KEEP),
              T(376, 162, "✓ opens", KEEP, 12, "middle"), T(115, 222, "sealed to the old key", DIM, 11, "middle"), T(350, 222, "sealed again, and checked", KEEP, 11, "middle")]
    elif bid == "test":
        for x, c, who in [(70, DIM, "the old session"), (270, KEEP, "the new session")]:
            g += [R(x, 90, 140, 70, BG, c, 'stroke-width="2" rx="4"'), T(x + 70, 120, "what is next:", c, 12, "middle"), T(x + 70, 142, "the storyboard", FG, 13, "middle", 700), T(x + 70, 182, who, DIM, 11, "middle"), light(x + 70, 62, 5, c if c != DIM else COST)]
        g += [T(240, 132, "=", KEEP, 28, "middle", 700), T(240, 232, "a gap means a file is missing: fix the file", DIM, 12, "middle")]
    elif bid == "saving":
        y0, top = 230, 190; hb = top; ha = top * F["after"] / F["before"]; hf = top * F["floor"] / F["before"]
        g += [R(110, y0 - hb, 90, hb, COST, "none", 'opacity=".8"'), R(280, y0 - ha, 90, ha, KEEP, "none", 'opacity=".9"'), R(90, y0 - hf, 300, hf, "none", FG, 'stroke-dasharray="5 4" stroke-width="2"'),
              T(155, y0 - hb - 8, num(F["before"]), COST, 15, "middle", 700), T(325, y0 - ha - 8, num(F["after"]), KEEP, 15, "middle", 700), T(155, y0 + 18, "before", DIM, 12, "middle"), T(325, y0 + 18, "after", DIM, 12, "middle"),
              T(400, y0 - hf / 2 + 4, f"floor ≈ {num(F['floor'])}", FG, 11), T(325, 90, f"{F['saving']}% less", KEEP, 20, "middle", 700)]
    elif bid == "lesson":
        for i, (s, c) in enumerate([("Write it early.", FG), ("Keep state in files.", KEEP), ("Load only what you need.", COST)]): g.append(T(240, 92 + i * 38, s, c, 22, "middle", 700))
        g += [light(240, 216, 5, KEEP), T(240, 250, "sources: how-we-refresh-a-session", DIM, 11, "middle")]
    return f'<svg class="sb" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Sketch for the beat"><rect width="{W}" height="{H}" fill="{BG}" rx="8"/>{"".join(g)}<text x="{W - 8}" y="14" fill="{DIM}" font-size="9" text-anchor="end" font-family="system-ui,sans-serif">Voice made by AI</text></svg>'

def board_html(S, D):
    F = facts(D); named = {"measured.output_tokens": F["out"], "measured.cache_read_tokens": F["reread"], "measured.context_tokens": F["ctx"], "threshold": F["threshold"],
                           "measured_handover.before.used": F["before"], "measured_handover.after.used": F["after"], "floor": F["floor"]}
    def nums(b):
        out = []
        for k in b["numbers"]:
            if k in named: out.append(num(named[k]))
            elif k == "evidenced_handovers": out.append(", ".join(num(v) for v in F["evidenced"]))
            elif k == "saving_percent": out.append(f"{F['saving']}%")
            elif k == "note_size": out.append("0.8 to 4.3 KB")
        return "; ".join(out)
    t, cards = 0, ""
    for n, b in enumerate(S["beats"], 1):
        cards += f"""<li class="shot" id="b-{e(b["id"])}"><h2><span class="num">{n}</span> {e(b["title"])} <span class="meta">{t} to {t + b["seconds"]} s</span></h2>
{sketch(b["id"], F).replace('aria-label="Sketch for the beat"', f'aria-label="Sketch: {e(b["picture"])}"')}
<p class="voice"><strong>Words:</strong> {e(b["words"])}</p>
<p><strong>Picture:</strong> {e(b["picture"])}</p>
<p><strong>Motion:</strong> {e(b["motion"])}</p>
{f'<p><strong>Numbers on screen:</strong> {e(nums(b))}</p>' if b["numbers"] else ""}
<p><strong>So what:</strong> {e(b["so_what"])}</p>
<p class="meta">Source: {e(b["source"])}</p></li>
"""
        t += b["seconds"]
    words = sum(len(b["words"].split()) for b in S["beats"])
    return f"""<p class="meta"><a href="../../">Productions</a> / <a href="../how-we-refresh-a-session/">session refresh</a> / storyboard</p>
<h1>{e(S["title"])}: the storyboard</h1>
<p class="lede">{e(S["through_line"])}</p>
<p class="note">{e(S["status"])} {len(S["beats"])} beats, {t} seconds, {words} words of voice.</p>
<p>{e(S["look"])}</p>
<ol class="shots sbgrid">{cards}</ol>
<h2>Still open</h2>
<ul>{"".join(f"<li>{e(q)}</li>" for q in S["open_questions"])}</ul>
<p class="meta">Data: <a href="../storyboard.json">storyboard.json</a> and <a href="../document.json">document.json</a>. {e(S["numbers_from"])} To comment, use <a href="../../send/?about=session-refresh%20storyboard">the feedback lane</a>.</p>
"""
