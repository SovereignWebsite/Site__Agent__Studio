// Last scene: the credits (who made this, how, and the source of every fact on screen), then the closing card.
// Held long enough to read; portrait keeps the bottom fifth clear.
import { NOISE } from "../glsl.js";
import { ease } from "../util.js";
import DATA from "../data.json";

const when = DATA.taken.replace("T", " at ").replace("Z", " UTC");

export default {
  id: "credits",
  title: "Credits",
  enterWith: "tear",
  beats: [{ dur: 4, hold: 10 }, { dur: 2.5, hold: 5 }],
  notes: ["Who made this, how, and where every fact on screen comes from.", "Sovereign Website, release 2: Signed."],
  create(ctx) {
    const { gfx } = ctx, V = ctx.view.portrait;
    const hdr = gfx.target({ scale: 0.5 });
    const bg = gfx.pass(NOISE + `void main(){
        vec2 p=(vUv-.5)*vec2(uRes.x/uRes.y,1.); float t=uTime*.03;
        float n=fbm(p*1.4+vec2(t,-t*.7));
        vec3 c=mix(vec3(.008,.010,.016),vec3(.014,.020,.032),vUv.y)+vec3(.05,.07,.12)*pow(n,3.)*.9;
        c+=vec3(1.,.75,.45)*exp(-length(p-vec2(.62,-.28))*3.2)*.08;
        o=vec4(c,1.); }`);
    const layer = ctx.overlay(), X = V ? 72 : 140;
    const SECTIONS = [
      ["MADE BY", V ? "Claude (Anthropic), working as cl-6.studio for\nSovereign Website, at the request of Dinis Cruz.\nDesign reviewed by a second Claude agent." : "Claude (Anthropic), working as cl-6.studio for Sovereign Website, at the request of Dinis Cruz.\nDesign reviewed by a second Claude agent."],
      ["HOW", V ? "Drawn live in the browser with WebGL (three.js).\nMusic made with ElevenLabs for this deck; sound\neffects made in code (Web Audio API).\nNo video files, no images, no recorded voice." : "Drawn live in the browser with WebGL (three.js). Music made with ElevenLabs for this deck;\nsound effects made in code (Web Audio API). No video files, no images, no recorded voice."],
      ["SOURCES", V ? `Files, commits, agents and signatures: the git\nhistory of SovereignWebsite/Site__Agent__Studio,\ndev branch, taken ${when}.\nThe five rules: this site's policy/abp.json.\n"Your files, your history, your address":\nthis site's start page.`
                     : `Files, commits, agents and signatures: the git history of SovereignWebsite/Site__Agent__Studio, dev branch,\ntaken ${when}. The five rules: this site's policy/abp.json.\n"Your files, your history, your address": this site's start page.`],
    ];
    const S = V ? { label: 30, body: 36, gap: 44, y: 210 } : { label: 24, body: 30, gap: 34, y: 150 };
    let y = S.y; const blocks = [];
    for (const [label, body] of SECTIONS) {
      const l = layer.add(ctx.text(label, { x: X + 4, y, size: S.label, font: "mono", color: "#ffd9c4" }));
      const lines = body.split("\n").length, b = layer.add(ctx.text(body, { x: X + 4, y: y + S.label * 1.7, size: S.body, font: "text", color: "#e3ebe7", leading: 1.42 }));
      blocks.push([l, b]); y += S.label * 1.7 + lines * S.body * 1.42 + S.gap;
    }
    const k2 = layer.add(ctx.text("SOVEREIGN WEBSITE · RELEASE 2", { x: X + 4, y: V ? 420 : 300, size: V ? 32 : 28, font: "mono", color: "#ffd9c4" }));
    const t2 = layer.add(ctx.text(V ? "Signed." : "Signed.", { x: X - 6, y: V ? 480 : 350, size: V ? 200 : 190, font: "display" }));
    const s2 = layer.add(ctx.text(V ? "Your website, your history,\nyour keys." : "Your website, your history, your keys.", { x: X + 4, y: V ? 740 : 590, size: V ? 50 : 46, font: "text", color: "#e3ebe7", leading: 1.3 }));
    const d2 = layer.add(ctx.text("sovereignwebsite.ai", { x: X + 4, y: V ? 920 : 700, size: V ? 46 : 40, font: "mono", color: "#ffd9c4" }));
    return {
      update(s) {
        bg.u.uTime.value = s.t;
        const out = s.k(1, 0, 0.8, ease.lin);
        blocks.forEach(([l, b], i) => { l.show(s.k(0, 0.3 + i * 0.6, 1.1 + i * 0.6, ease.lin), { style: "fade", q: out }); b.show(s.k(0, 0.5 + i * 0.6, 1.5 + i * 0.6, ease.lin), { style: "fade", q: out }); });
        k2.show(s.k(1, 0.6, 1.4, ease.lin), { style: "fade" }); t2.show(s.k(1, 0.7, 1.9, ease.lin), { stagger: 0.2 });
        s2.show(s.k(1, 1.2, 2.2, ease.lin), { style: "fade" }); d2.show(s.k(1, 1.5, 2.5, ease.lin), { style: "fade" });
      },
      render(out, s) {
        bg.render(hdr);
        gfx.post(hdr, out, { bloom: 0.3, threshold: 1, exposure: 1, vignette: 0.25, grain: 0.02, time: s.t });
        layer.render(out);
      },
    };
  },
};
