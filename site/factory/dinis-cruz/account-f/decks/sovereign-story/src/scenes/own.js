// Scene 2: light through a ribbon of noise (HDR, so it blooms) and the claim, revealed by word.
import { NOISE } from "../glsl.js";
import { ease } from "../util.js";

export default {
  id: "own",
  title: "A site you own",
  enterWith: "tear",
  beats: [{ dur: 3, hold: 2.5 }, { dur: 3, hold: 4 }],
  notes: ["A sovereign website is one its owner holds.", "The files, the history and the address: all in a repository they control."],
  create(ctx) {
    const { gfx } = ctx;
    const hdr = gfx.target({ scale: 0.5 });
    const bg = gfx.pass(NOISE + `uniform float uK,uL;
      float dens(vec2 q){
        float t=uTime*.035;
        vec2 w=vec2(fbm(q*1.1+vec2(t,0.)),fbm(q*1.1+vec2(5.2,-t)));
        float base=fbm(q*2.3+w*1.1+vec2(t*1.6,0.));
        float detail=fbm(q*7.+w*2.+vec2(t*3.,0.));
        float shape=exp(-pow((q.y+.42+.07*sin(q.x*1.6+uTime*.08))*2.3,2.));   // a bank of cloud low in the frame
        return smoothstep(.44,.86,base*.66+detail*.22+shape*.85-.34)*smoothstep(.62,.2,q.y+.5);
      }
      void main(){
        vec2 asp=vec2(uRes.x/uRes.y,1.), q=(vUv-.5)*asp;
        vec2 sun=vec2(.55,.05); vec2 L=normalize(sun-q);
        vec3 sky=mix(vec3(.004,.008,.012),vec3(.018,.036,.048),vUv.y);
        sky+=vec3(1.,.78,.5)*exp(-length(q-sun)*3.)*.35*uK+vec3(.9,.75,.55)*exp(-length(q-sun)*1.4)*.06*uL;
        float d=dens(q), d1=dens(q+L*.035), d2=dens(q+L*.09);
        float lit=clamp(1.-(d1*.6+d2*.5)*1.1,0.,1.);                            // light reaching this point through the cloud
        float rim=smoothstep(.0,.25,d)*(1.-smoothstep(.25,.7,d))*lit;            // silver lining on thin edges
        vec3 shade=vec3(.008,.012,.018), body=mix(vec3(.05,.08,.10),vec3(.95,.93,.88),lit*lit);
        vec3 cloud=mix(shade,body,lit*.85+.15)*(.25+.75*uL);
        cloud+=vec3(1.,.82,.55)*rim*(.6+2.4*uK)*uL;
        o=vec4(mix(sky,cloud,d),1.);
      }`, { uK: 0, uL: 0 });
    const layer = ctx.overlay();
    const title = layer.add(ctx.text("A site you own.", { x: 140, y: 180, size: 150, font: "display" }));
    const sub = layer.add(ctx.text("The files, the history and the address are yours.", { x: 144, y: 400, size: 46, font: "text", color: "#e3ebe7" }));
    const tag = layer.add(ctx.text("in a repository you control", { x: 144, y: 470, size: 30, font: "mono", color: "#c9d3ce" }));
    return {
      update(s) {
        bg.u.uTime.value = s.t;
        bg.u.uL.value = s.k(0, 0, 2.5, ease.out3) * (1 - 0.5 * s.exit);
        bg.u.uK.value = s.k(1, 0, 2.2, ease.io3);
        title.show(s.k(0, 0.6, 2.4, ease.lin), { stagger: 0.4 });
        sub.show(s.k(1, 0.1, 1.8, ease.lin), { stagger: 0.55 });
        tag.show(s.k(1, 1.4, 2.6, ease.lin), { style: "fade" });
      },
      render(out, s) {
        bg.render(hdr);
        gfx.post(hdr, out, { bloom: 0.55, threshold: 1, exposure: 1, vignette: 0.22, grain: 0.02, time: s.t });
        layer.render(out);
      },
    };
  },
};
