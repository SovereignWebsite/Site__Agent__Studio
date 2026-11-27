// Scene template #1: a full-screen shader background (HDR, so it blooms) + animated type.
import { NOISE } from "../glsl.js";
import { ease } from "../util.js";

export const makeTitle = ({ id = "title", title = "Title", enterWith = "fade", headline = "Slides that move.", subline = "Every frame is rendered live, in the browser." } = {}) => ({
  id,
  title,
  enterWith,
  beats: [
    { dur: 3, hold: 3 },
    { dur: 2.5, hold: 4 },
  ],
  notes: ["Open on the title. Let the light settle.", "Second click: the promise of the talk."],
  create(ctx) {
    const { gfx, view } = ctx;
    const hdr = gfx.target({ scale: 0.5 }); // the background is soft: render it at half res
    const bg = gfx.pass(NOISE + `uniform float uK,uL;
      void main(){
        vec2 p=(vUv-.5)*vec2(uRes.x/uRes.y,1.);
        float t=uTime*.05;
        vec2 q=p*1.6+vec2(fbm(p*2.+t),fbm(p*2.-t+4.))*.6;
        float band=exp(-pow((q.y+.12+.18*sin(q.x*2.+uTime*.2))*5.,2.));      // a ribbon of light
        float n=fbm(q*3.+t*2.);
        vec3 c=mix(vec3(.010,.012,.025),vec3(.02,.04,.09),vUv.y);
        c+=vec3(1.0,.55,.25)*band*(.15+1.1*n*n)*uL*1.4;                      // > 1.0 = it will bloom
        c+=vec3(.25,.45,1.)*pow(band,6.)*uK*2.;
        o=vec4(c,1.);
      }`, { uK: 0, uL: 0 });
    const layer = ctx.overlay();
    const title = layer.add(ctx.text(headline, { x: 160, y: 380, size: 150, font: "display" }));
    const sub = layer.add(ctx.text(subline, { x: 166, y: 600, size: 44, font: "text", color: "#c8cfdc" }));
    return {
      update(s) {
        bg.u.uTime.value = s.t;
        bg.u.uL.value = s.k(0, 0, 2.5, ease.out3) * (1 - 0.5 * s.exit);
        bg.u.uK.value = s.k(1, 0, 2, ease.io3);
        title.show(s.k(0, 0.6, 2.4, ease.lin), { stagger: 0.4 });
        sub.show(s.k(1, 0.2, 1.6, ease.lin), { style: "fade", stagger: 0.5 });
      },
      render(out, s) {
        bg.render(hdr);
        gfx.post(hdr, out, { bloom: 0.5, threshold: 1, exposure: 1, vignette: 0.2, grain: 0.02, time: s.t });
        layer.render(out);
      },
    };
  },
});

export default makeTitle();
