// Scene 7: credits. Quiet on purpose: a slow glow, the words, and where the idea came from.
import { NOISE } from "../glsl.js";
import { ease } from "../util.js";

export default {
  id: "credits",
  title: "Credits",
  enterWith: "fade",
  beats: [{ dur: 4, hold: 7 }],
  notes: ["Inspired by The Last Boring Slide, made by Claude, prompted by Nikita (@fluxxrider) and shared publicly on X."],
  create(ctx) {
    const { gfx } = ctx;
    const hdr = gfx.target({ scale: 0.5 });
    const bg = gfx.pass(NOISE + `void main(){
        vec2 p=(vUv-.5)*vec2(uRes.x/uRes.y,1.); float t=uTime*.03;
        float n=fbm(p*1.4+vec2(t,-t*.7));
        vec3 c=mix(vec3(.010,.014,.013),vec3(.016,.034,.030),vUv.y)+vec3(.10,.30,.20)*pow(n,3.)*.9;
        c+=vec3(1.,.75,.45)*exp(-length(p-vec2(.62,-.28))*3.2)*.10;
        o=vec4(c,1.); }`);
    const SERIF = "italic 400 {px}px 'Newsreader', Georgia, 'Times New Roman', serif";
    const layer = ctx.overlay(), X = 160;
    const lbl = layer.add(ctx.text("CREDITS", { x: X + 4, y: 250, size: 26, font: "mono", color: "#8fe0b4" }));
    const a = layer.add(ctx.text("Inspired by", { x: X, y: 320, size: 44, font: "text", color: "#b9cbc2" }));
    const title = layer.add(ctx.text("The Last Boring Slide", { x: X - 6, y: 375, size: 132, font: SERIF, color: "#ffffff" }));
    const b = layer.add(ctx.text("made by Claude, prompted by Nikita (@fluxxrider).", { x: X, y: 545, size: 44, font: "text", color: "#e6efe9" }));
    const c = layer.add(ctx.text("This deck was made by Claude as cl-6.studio for Sovereign Website:\nlive WebGL in one HTML file, with no images and no video.",
      { x: X, y: 760, size: 30, font: "text", color: "#93a89d", leading: 1.5 }));
    const url = layer.add(ctx.text("sovereignwebsite.org", { x: X, y: 880, size: 30, font: "mono", color: "#8fe0b4" }));
    return {
      update(s) {
        bg.u.uTime.value = s.t;
        lbl.show(s.k(0, 0.2, 1.0, ease.lin), { style: "fade" });
        a.show(s.k(0, 0.4, 1.4, ease.lin), { style: "fade" });
        title.show(s.k(0, 0.8, 2.6, ease.lin), { stagger: 0.35 });
        b.show(s.k(0, 1.8, 3.0, ease.lin), { style: "fade", stagger: 0.4 });
        c.show(s.k(0, 2.8, 3.8, ease.lin), { style: "fade" });
        url.show(s.k(0, 3.2, 4.0, ease.lin), { style: "fade" });
      },
      render(out, s) {
        bg.render(hdr);
        gfx.post(hdr, out, { bloom: 0.3, threshold: 1, exposure: 1, vignette: 0.25, grain: 0.02, time: s.t });
        layer.render(out);
      },
    };
  },
};
