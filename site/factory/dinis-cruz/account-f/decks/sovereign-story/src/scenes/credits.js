// Scene 7: credits, then the policy card. Quiet on purpose: a slow glow and the words, held long enough to read.
// Portrait (1080x1920) has its own, larger layout and keeps the bottom fifth clear for a feed's own controls.
import { NOISE } from "../glsl.js";
import { ease } from "../util.js";

export default {
  id: "credits",
  title: "Credits",
  enterWith: "fade",
  beats: [{ dur: 4, hold: 9 }, { dur: 3, hold: 7 }],
  notes: ["Inspired by The Last Boring Slide, made by Claude, prompted by Nikita (@fluxxrider) and shared publicly on X.",
          "The agents that built this work under a written Agent Behaviour Policy, published on the site at /policy/."],
  create(ctx) {
    const { gfx } = ctx, V = ctx.view.portrait;
    const hdr = gfx.target({ scale: 0.5 });
    const bg = gfx.pass(NOISE + `void main(){
        vec2 p=(vUv-.5)*vec2(uRes.x/uRes.y,1.); float t=uTime*.03;
        float n=fbm(p*1.4+vec2(t,-t*.7));
        vec3 c=mix(vec3(.010,.014,.013),vec3(.016,.034,.030),vUv.y)+vec3(.06,.10,.14)*pow(n,3.)*.9;
        c+=vec3(1.,.75,.45)*exp(-length(p-vec2(.62,-.28))*3.2)*.10;
        o=vec4(c,1.); }`);
    const SERIF = "italic 400 {px}px 'Newsreader', Georgia, 'Times New Roman', serif";
    const layer = ctx.overlay(), X = V ? 72 : 140;
    // [text, x, y, size, font, colour, leading] for landscape and portrait
    const L = V ? {
      lbl: ["CREDITS", 0, 250, 32], a: ["Inspired by", 0, 320, 52], title: ["The Last\nBoring Slide", -4, 395, 150],
      b: ["made by Claude, prompted by\nNikita (@fluxxrider).", 0, 760, 52],
      c: ["This deck was made by Claude\nas cl-6.studio for Sovereign Website:\nlive WebGL in one HTML file,\nwith no images and no video.", 0, 960, 40],
      url: ["sovereignwebsite.org", 0, 1240, 40],
      p1: ["Built by AI agents\nworking under\na written Agent\nBehaviour Policy.", -2, 380, 96], p2: ["What they may and may not do\nis published on every site.", 0, 860, 46],
      u1: ["sovereignwebsite.org", 0, 1060, 44], u2: ["riskmandate.ai", 0, 1130, 44],
    } : {
      lbl: ["CREDITS", 4, 250, 26], a: ["Inspired by", 4, 320, 44], title: ["The Last Boring Slide", -4, 375, 132],
      b: ["made by Claude, prompted by Nikita (@fluxxrider).", 4, 545, 44],
      c: ["This deck was made by Claude as cl-6.studio for Sovereign Website:\nlive WebGL in one HTML file, with no images and no video.", 4, 760, 30],
      url: ["sovereignwebsite.org", 4, 880, 30],
      p1: ["Built by AI agents working under\na written Agent Behaviour Policy.", -2, 300, 96], p2: ["What they may and may not do is published on every site.", 4, 560, 40],
      u1: ["sovereignwebsite.org", 4, 760, 34], u2: ["riskmandate.ai", 520, 760, 34],
    };
    const T = (k, font, color, leading = 1.12) => { const [s, dx, y, size] = L[k]; return layer.add(ctx.text(s, { x: X + dx, y, size, font, color, leading })); };
    const lbl = T("lbl", "mono", "#8fe0b4"), a = T("a", "text", "#c9d3ce"), title = T("title", SERIF, "#ffffff", 1.0);
    const b = T("b", "text", "#f4f7f5", 1.3), c = T("c", "text", "#9aa8a1", 1.45), url = T("url", "mono", "#8fe0b4");
    const p1 = T("p1", "display", "#f4f7f5", 1.08), p2 = T("p2", "text", "#c9d3ce", 1.35), u1 = T("u1", "mono", "#8fe0b4"), u2 = T("u2", "mono", "#8fe0b4");
    return {
      update(s) {
        bg.u.uTime.value = s.t;
        const out = s.k(1, 0, 0.9, ease.lin);                            // credits leave as the policy card arrives
        lbl.show(s.k(0, 0.2, 1.0, ease.lin), { style: "fade", q: out });
        a.show(s.k(0, 0.4, 1.4, ease.lin), { style: "fade", q: out });
        title.show(s.k(0, 0.8, 2.6, ease.lin), { stagger: 0.35, q: out });
        b.show(s.k(0, 1.8, 3.0, ease.lin), { style: "fade", stagger: 0.4, q: out });
        c.show(s.k(0, 2.8, 3.8, ease.lin), { style: "fade", q: out });
        url.show(s.k(0, 3.2, 4.0, ease.lin), { style: "fade", q: out });
        p1.show(s.k(1, 0.8, 2.4, ease.lin), { stagger: 0.35 });
        p2.show(s.k(1, 1.6, 2.6, ease.lin), { style: "fade" });
        u1.show(s.k(1, 2.2, 3.0, ease.lin), { style: "fade" }); u2.show(s.k(1, 2.4, 3.0, ease.lin), { style: "fade" });
      },
      render(out, s) {
        bg.render(hdr);
        gfx.post(hdr, out, { bloom: 0.3, threshold: 1, exposure: 1, vignette: 0.25, grain: 0.02, time: s.t });
        layer.render(out);
      },
    };
  },
};
