// Scene 4: back to the plain slide, pressed in by the slam. A caret types the question, the marquee selects it,
// then moves to the answer. The words come from this site's start page ("a repository you control").
import { Rect, SelectBox } from "../view.js";
import { ease, lerp } from "../util.js";

const ARIAL = (w) => w + " {px}px Arial, Helvetica, sans-serif";
const Q = "Who holds the keys?", A = "You do.";

export default {
  id: "end",
  title: "Who holds the keys",
  enterWith: "slam",
  beats: [{ dur: 2.5, hold: 1.5 }, { dur: 3.8, hold: 1.8 }, { dur: 2.6, hold: 4.5 }],
  notes: ["Back to a plain slide: your website.", "Who holds the keys?", "You do: the files, the history and the address are in a repository you control."],
  create(ctx) {
    const { gfx, view } = ctx, V = view.portrait, M = V ? 72 : 140, RIGHT = V ? 1008 : 1780;
    const white = gfx.pass("void main(){ o=vec4(1.); }");
    const layer = ctx.overlay();
    const rule = layer.add(new Rect("#cfd2d8")), bar = layer.add(new Rect("#2b5cff")), caret = layer.add(new Rect("#111111"));
    const head = layer.add(ctx.text("Your website", { x: M, y: V ? 200 : 96, size: 80, font: ARIAL("700"), color: "#111111" }));
    const list = layer.add(ctx.text("•  Your files\n•  Your history\n•  Your address", { x: M + 6, y: V ? 420 : 290, size: V ? 46 : 44, font: ARIAL("400"), color: "#3a3d44", leading: 1.65 }));
    const QX = V ? 72 : 700, QY = V ? 820 : 560, QS = V ? 88 : 96, AY = QY + QS * 1.5;
    const typed = layer.add(ctx.text(" ", { x: QX, y: QY, size: QS, font: ARIAL("400"), color: "#111111" }));
    const styled = layer.add(ctx.text(Q, { x: QX, y: QY, size: QS, font: "display", color: "#2b5cff" }));
    const answer = layer.add(ctx.text(A, { x: QX, y: AY, size: QS * 1.25, font: "display", color: "#111111" }));
    const box = layer.add(new SelectBox(view));
    const page = layer.add(ctx.text("4", { x: RIGHT, y: 0, size: 26, font: ARIAL("400"), color: "#ffffff", align: "right" }));
    let shown = -1, clicks = -1;
    return {
      update(s) {
        rule.set(M, V ? 318 : 214, RIGHT - M, 2);
        const barY = V ? 1430 : view.y1 - 64; bar.set(view.x0, barY, view.w, 64); page.y = barY + 16; page.show(1, { style: "fade" });
        head.show(1, { style: "fade" }); list.show(s.k(0, 0.3, 2.0, ease.lin), { style: "fade", stagger: 0.6 });
        const n = Math.round(s.k(1, 0.2, 1.7, ease.lin) * Q.length);
        if (n !== shown) { shown = n; typed.set(n ? Q.slice(0, n) : " "); }
        if (n > clicks && s.dir > 0 && s.beat === 1) { for (let i = Math.max(0, clicks) + 1; i <= n; i++) ctx.sound("tick", { g: 0.22, rate: 2.2 + (i % 3) * 0.15 }); clicks = n; }
        if (s.beat === 0) clicks = -1;
        const sel = s.k(1, 2.1, 2.6, ease.lin), restyle = s.k(1, 2.6, 3.2, ease.io3), move = s.k(2, 0.6, 1.6, ease.io3);
        typed.show(n ? 1 : 0, { style: "fade" }); typed.mat.uniforms.uAlpha.value = 1 - restyle;
        styled.show(restyle, { style: "fade", stagger: 0 });
        answer.show(s.k(2, 0.1, 1.1, ease.lin), { stagger: 0.2 });
        const blink = n < Q.length ? 1 : (s.t * 1.7) % 1 < 0.55 ? 1 : 0;
        caret.set(QX + (n ? typed.width() : 0) + 8, QY + 6, 5, QS * 1.02).alpha(s.beat >= 1 && sel < 0.01 ? blink : 0);
        // the marquee selects the question, then glides down to the answer
        const qw = Math.max(typed.width(), styled.width()), aw = answer.width();
        if (sel > 0) box.set(QX - 22, lerp(QY, AY, move) - 10, lerp(qw, aw, move) + 44, lerp(QS * 1.18, QS * 1.25 * 1.18, move) + 14, sel); else box.alpha(0);
      },
      render(out) { white.render(out); layer.render(out); },
    };
  },
};
