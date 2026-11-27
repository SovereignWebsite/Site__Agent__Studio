// The deliberately boring "default template" slide (white, Arial, blue footer bar, grey page number).
// The original deck opens and closes on this look; spectacle lands harder next to it.
import { Rect } from "../view.js";
import { ease } from "../util.js";

export default {
  id: "plain",
  title: "Any questions?",
  enterWith: "slam",
  beats: [{ dur: 1, hold: 3 }, { dur: 3, hold: 4 }],
  notes: ["Back to the dull template. Let people think it is over.", "Type the question."],
  create(ctx) {
    const { gfx, view } = ctx;
    const layer = ctx.overlay();
    const bg = layer.add(new Rect({ color: "#ffffff", order: -10 }));
    const bar = layer.add(new Rect({ color: "#3f6fb5", order: 1 }));
    const bar2 = layer.add(new Rect({ color: "#a9c0e2", order: 1 }));
    const head = layer.add(ctx.text("Any questions?", { x: 960, y: 380, size: 96, font: "arial", color: "#000000", align: "center" }));
    const ask = layer.add(ctx.text("What do you want?", { x: 960, y: 560, size: 60, font: "arial", color: "#000000", align: "center" }));
    const page = layer.add(ctx.text("14", { x: 1860, y: 1010, size: 22, font: "arial", color: "#7f7f7f", align: "right" }));
    return {
      update(s) {
        bg.set(view.x0, view.y0, view.w, view.h);
        bar.set(view.x0, view.y1 - 22, view.w, 22); bar2.set(view.x0, view.y1 - 30, view.w, 5);
        head.animate((w, o) => { o.alpha = 1; });
        page.animate((w, o) => { o.alpha = 1; });
        ask.show(s.k(1, 0.3, 2.4, ease.lin), { style: "fade", stagger: 0.6 });
      },
      render(out) { gfx.draw(layer.scene, view.cam, out, { color: 0xffffff }); },
    };
  },
};
