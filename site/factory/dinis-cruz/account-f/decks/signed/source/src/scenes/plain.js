// Scene 1: the deliberately plain slide (white, Arial, grey rule, default-blue footer).
// Beat 2 borrows the original deck's motif: a caret types a question, then a design-tool marquee selects it
// and the words take on the deck's own type. Every rule and bar lives in design space, so it holds at any aspect.
import { Rect, SelectBox } from "../view.js";
import { ease } from "../util.js";

const ARIAL = (w) => w + " {px}px Arial, Helvetica, sans-serif";
const Q = "Whose is it?";

export default {
  id: "plain",
  title: "The usual website",
  enterWith: "fade",
  beats: [{ dur: 2.5, hold: 2 }, { dur: 3.6, hold: 2.4 }],
  notes: ["Most websites look like this slide: someone else's template, on someone else's server.", "So whose is it? (The question gets selected, like an object in a design tool.)"],
  create(ctx) {
    const { gfx, view } = ctx, V = view.portrait, M = V ? 72 : 140, RIGHT = V ? 1008 : 1780;
    const white = gfx.pass("void main(){ o=vec4(1.); }");
    const layer = ctx.overlay();
    const rule = layer.add(new Rect("#cfd2d8")), bar = layer.add(new Rect("#2b5cff")), caret = layer.add(new Rect("#111111"));
    const head = layer.add(ctx.text("Your website", { x: M, y: V ? 200 : 96, size: 80, font: ARIAL("700"), color: "#111111" }));
    const list = layer.add(ctx.text("•  On someone else's server\n•  On someone else's template\n•  On someone else's terms",
      { x: M + 6, y: V ? 420 : 290, size: V ? 46 : 44, font: ARIAL("400"), color: "#3a3d44", leading: 1.65 }));
    const QX = V ? 150 : 1100, QY = V ? 860 : 600, QS = V ? 120 : 112;
    const typed = layer.add(ctx.text(" ", { x: QX, y: QY, size: QS, font: ARIAL("400"), color: "#111111" }));
    const styled = layer.add(ctx.text(Q, { x: QX, y: QY, size: QS, font: "display", color: "#2b5cff" }));
    const box = layer.add(new SelectBox(view));
    const page = layer.add(ctx.text("1", { x: RIGHT, y: 0, size: 26, font: ARIAL("400"), color: "#ffffff", align: "right" }));
    let shown = -1;
    return {
      update(s) {
        rule.set(M, V ? 318 : 214, RIGHT - M, 2);
        const barY = V ? 1430 : view.y1 - 64;                 // in portrait, above the bottom 20% that a feed's own controls cover
        bar.set(view.x0, barY, view.w, 64); page.y = barY + 16; page.show(1, { style: "fade" });
        head.show(1, { style: "fade" });
        list.show(s.k(0, 0.4, 2.2, ease.lin), { style: "fade", stagger: 0.6 });
        // type the question, one character at a time
        const n = Math.round(s.k(1, 0.2, 1.5, ease.lin) * Q.length);
        if (n !== shown) { shown = n; typed.set(n ? Q.slice(0, n) : " "); }
        const sel = s.k(1, 2.0, 2.5, ease.lin), restyle = s.k(1, 2.5, 3.1, ease.io3);
        typed.show(n ? 1 : 0, { style: "fade" }); typed.mat.uniforms.uAlpha.value = 1 - restyle;
        styled.show(restyle, { style: "fade", stagger: 0 });
        const blink = n < Q.length ? 1 : (s.t * 1.7) % 1 < 0.55 ? 1 : 0;
        caret.set(QX + (n ? typed.width() : 0) + 8, QY + 6, 5, QS * 1.02).alpha(s.beat >= 1 && sel < 0.01 ? blink : 0);
        const w = Math.max(typed.width(), styled.width());
        if (sel > 0) box.set(QX - 22, QY - 10, w + 44, QS * 1.18 + 14, sel); else box.alpha(0);
      },
      render(out) { white.render(out); layer.render(out); },
    };
  },
};
