// Scene 0: the opening card, also the video's first frame and thumbnail. The series and the domain, the title, and the
// real commits of this site as a band of light (each dot one commit, coloured by the agent that signed it).
import * as THREE from "three";
import DATA from "../data.json";

const AGENT_COLOURS = ["#ffb38a", "#8fe0b4", "#c7b8ff", "#7fc3ff", "#ffd27a"];

export default {
  id: "cover",
  title: "Signed",
  enterWith: "fade",
  beats: [{ dur: 3.2, hold: 2.6 }],
  notes: ["Sovereign Website, release 2: Signed. This website, told from its own history."],
  create(ctx) {
    const { gfx, view } = ctx, V = view.portrait, M = V ? 72 : 140;
    const C = DATA.commits, t0 = Date.parse(C[0].t), t1 = Date.parse(C[C.length - 1].t);
    const agents = Object.keys(DATA.agents).sort((a, b) => DATA.agents[b] - DATA.agents[a]);
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const dots = C.map((c, i) => [(Date.parse(c.t) - t0) / (t1 - t0), ((i * 0.618) % 1) - 0.5, 0.35 + 0.12 * Math.sqrt(Math.min(c.files, 40)), c.agent ? agents.indexOf(c.agent) : -1]);
    const cols = agents.map((a, i) => hex(AGENT_COLOURS[i % AGENT_COLOURS.length]));
    const hdr = gfx.target({ scale: 0.6 });
    const bg = gfx.pass(`uniform vec4 uD[64]; uniform vec3 uCol[6]; uniform float uN,uIn,uP;
      void main(){
        vec2 asp=vec2(uRes.x/uRes.y,1.), q=vUv*asp;
        vec3 c=mix(vec3(.006,.008,.014),vec3(.016,.022,.034),vUv.y);
        // the band runs left to right (landscape) or bottom to top (portrait), low in the frame
        for(int i=0;i<64;i++){ if(float(i)>=uN) break; vec4 d=uD[i];
          vec2 p=uP>.5?vec2(.5*asp.x+d.y*.70*asp.x,.235+d.x*.16):vec2(.12*asp.x+d.x*.76*asp.x,.30+d.y*.10);
          float show=smoothstep(d.x-.02,d.x+.02,uIn*1.04);
          vec3 col=d.w<0.?vec3(.55,.6,.66):uCol[int(d.w)];
          float r=length(q-p); c+=pow(col,vec3(2.2))*(exp(-r*r*9000./d.z)*2.6+exp(-r*90./d.z)*.20)*show*(.85+.15*sin(uTime*1.3+d.x*20.)); }
        o=vec4(c,1.); }`, { uD: { value: Array.from({ length: 64 }, (_, i) => new THREE.Vector4(...(dots[i] || [0, 0, 0, 0]))) }, uCol: { value: [...cols, [1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]].slice(0, 6).map((c) => new THREE.Vector3(...c)) }, uN: dots.length, uIn: 0, uP: V ? 1 : 0 });
    const layer = ctx.overlay();
    const kick = layer.add(ctx.text("SOVEREIGN WEBSITE · RELEASE 2", { x: M + 4, y: V ? 300 : 210, size: V ? 32 : 28, font: "mono", color: "#ffd9c4" }));
    const title = layer.add(ctx.text("Signed.", { x: M - 6, y: V ? 360 : 260, size: V ? 220 : 210, font: "display" }));
    const sub = layer.add(ctx.text(V ? "This website, told from\nits own history." : "This website, told from its own history.", { x: M + 4, y: V ? 640 : 510, size: V ? 52 : 50, font: "text", color: "#e3ebe7", leading: 1.3 }));
    const dom = layer.add(ctx.text("sovereignwebsite.ai", { x: M + 4, y: V ? 820 : 620, size: V ? 44 : 40, font: "mono", color: "#ffd9c4" }));
    return {
      update(s) {
        // complete from the very first frame (it is the thumbnail); only the band breathes
        bg.u.uTime.value = s.t; bg.u.uIn.value = 1;
        for (const x of [kick, sub, dom]) x.show(1, { style: "fade" });
        title.show(1, { style: "fade" });
      },
      render(out, s) {
        bg.render(hdr);
        gfx.post(hdr, out, { bloom: 0.45, threshold: 0.9, exposure: 1, vignette: 0.3, grain: 0.02, time: s.t });
        layer.render(out);
      },
    };
  },
};
