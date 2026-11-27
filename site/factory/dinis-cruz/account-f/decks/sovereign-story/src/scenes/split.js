// Scene 3: two worlds on one screen, after the original's "Two aims". Left: rented, identical template cards on a belt,
// all moving at exactly one speed. Right: owned, a living landscape at golden hour. The divider drifts, can be dragged,
// and eases back to its choreography on release. One full-screen HDR pass, then the shared grade.
import { NOISE } from "../glsl.js";
import { clamp, damp, ease, lerp } from "../util.js";

export default {
  id: "split",
  title: "Rented or owned",
  enterWith: "burn",
  beats: [{ dur: 4, hold: 4 }, { dur: 4, hold: 4 }],
  notes: ["Same web. Two ways to be on it. (Drag the divider.)", "One of them you can take with you."],
  create(ctx) {
    const { gfx, view } = ctx;
    const hdr = gfx.target();
    const bg = gfx.pass(NOISE + `uniform float uD,uHot;
      float sdR(vec2 p,vec2 b,float r){ vec2 d=abs(p)-b+r; return length(max(d,0.))+min(max(d.x,d.y),0.)-r; }
      vec3 rented(vec2 sp){
        vec2 asp=vec2(uRes.x/uRes.y,1.); vec2 g=sp*asp*3.6; g.x+=uTime*.9;             // one belt, one speed
        vec2 f=fract(g)-.5; float px=3.6/uRes.y*1.5;
        vec3 c=mix(vec3(.035,.038,.045),vec3(.06,.064,.075),sp.y);
        float sh=sdR(f-vec2(.012,-.02),vec2(.40,.36),.035); c*=1.-.55*(1.-smoothstep(-.02,.06,sh)); // soft drop shadow
        float card=1.-smoothstep(-px,px,sdR(f,vec2(.40,.36),.035));
        vec3 k=mix(vec3(.80,.81,.84),vec3(.70,.71,.74),f.y+.5);                       // the same grey card, everywhere
        float head=step(.22,f.y); k=mix(k,vec3(.17,.33,.78),head);
        float ln=step(-.24,f.y)*step(f.y,.10)*step(.5,fract(f.y*7.5+.25))*step(-.32,f.x)*step(f.x,.18-.2*step(.5,fract(f.y*3.75)));
        k=mix(k,vec3(.55,.56,.6),ln);
        float bar=step(-.32,f.y)*step(f.y,-.26)*step(-.32,f.x)*step(f.x,.32);           // the same loading bar, in step on every card
        float fill=step(f.x,-.32+.64*fract(uTime*.35));
        k=mix(k,mix(vec3(.6,.62,.66),vec3(.17,.33,.78),fill),bar);
        c=mix(c,k*.92,card);
        return c*mix(1.,.1,smoothstep(.46,.8,sp.y));                                   // dim the top so the caption reads
      }
      vec3 owned(vec2 sp){
        vec2 asp=vec2(uRes.x/uRes.y,1.); float pan=uTime*.012;
        vec3 sky=mix(vec3(1.25,.62,.30),vec3(.06,.15,.24),smoothstep(.40,.86,sp.y));
        float sd=length((sp-vec2(.74,.47))*asp);
        sky+=vec3(1.,.72,.42)*(exp(-sd*sd*1600.)*7.+exp(-sd*6.)*.45);
        // high cloud streaks catching the light
        float cl=fbm(vec2(sp.x*asp.x*1.6-pan*2.,sp.y*7.)+vec2(uTime*.01,0.));
        sky=mix(sky,sky*1.25+vec3(.45,.25,.12)*.4,smoothstep(.55,.8,cl)*smoothstep(.55,.75,sp.y)*(1.-smoothstep(.85,1.,sp.y)));
        vec3 c=sky;
        // birds: a few small v shapes crossing
        for(int i=0;i<7;i++){ float fi=float(i); vec2 bp=vec2(fract(.13*fi+uTime*(.018+.006*fi)),.62+.1*sin(fi*2.3)+.012*sin(uTime*.7+fi));
          vec2 q=(sp-bp)*asp*vec2(1.,1.); q.x=abs(q.x); float flap=.5+.5*sin(uTime*9.+fi*3.);
          float w=abs(q.y-q.x*(.35+.5*flap)); float m=(1.-smoothstep(.0006,.0016,w))*step(q.x,.009);
          c=mix(c,vec3(.05,.04,.04),m*.9); }
        for(int i=0;i<4;i++){ float fi=float(i); float par=pan*(1.+fi*1.4);
          float h=.47-fi*.085+.10*(fbm(vec2((sp.x*asp.x+par)*(1.6+fi*.9)+fi*7.3,fi*3.1))-.45);
          float m=smoothstep(h+.0012,h-.0012,sp.y);
          vec3 lay=mix(vec3(.13,.34,.22),vec3(.015,.045,.03),fi/3.);
          lay=mix(lay,sky*.62,.62-fi*.19);
          lay+=vec3(1.,.7,.4)*.25*smoothstep(h-.012,h,sp.y)*(1.-fi/4.);                  // rim light on each ridge
          vec2 cell=floor(vec2((sp.x*asp.x+par)*150.,sp.y*150.)+fi*17.);
          float lamp=step(.986,hash12(cell))*step(sp.y,h-.008)*step(h-.07,sp.y);
          lay+=vec3(1.,.66,.32)*lamp*(2.2+1.5*sin(uTime*2.+hash12(cell)*40.));
          c=mix(c,lay,m);
        }
        return c;
      }
      void main(){
        vec2 px=vUv*uRes; float k=uRes.y/1080.;
        vec3 c=vUv.x<uD?rented(vUv):owned(vUv);
        float dx=abs(px.x-uD*uRes.x);
        c=mix(c,vec3(2.2),1.-smoothstep(1.*k,2.4*k,dx));
        c+=vec3(.9,.8,.6)*exp(-dx/(14.*k))*.18;                                            // a little glow on the seam
        for(int i=0;i<3;i++){ float y=(.25+.25*float(i))*uRes.y; float r=length(px-vec2(uD*uRes.x,y)); float R=(11.+5.*uHot)*k;
          float disc=1.-smoothstep(R-k,R+k,r); float ring=1.-smoothstep(1.2*k,2.6*k,abs(r-R));
          c=mix(c,vec3(.04,.05,.06),disc); c=mix(c,vec3(2.2),ring); }
        o=vec4(c,1.);
      }`, { uD: 0.5, uHot: 0 });
    const layer = ctx.overlay();
    const lt = layer.add(ctx.text("Rented.", { x: 0, y: 130, size: 104, font: "display", color: "#e9ecf2" }));
    const ls = layer.add(ctx.text("Their server, their template.", { x: 0, y: 270, size: 38, font: "text", color: "#aab1bf" }));
    const rt = layer.add(ctx.text("Owned.", { x: 0, y: 130, size: 104, font: "display", color: "#fff7ea" }));
    const rs = layer.add(ctx.text("Your files, your history, your address.", { x: 0, y: 270, size: 38, font: "text", color: "#ffe2c2" }));
    let d = 0.5, drag = false, dragD = 0.5, hot = 0;
    const divX = () => view.x0 + d * view.w;
    return {
      pointer(type, x) {
        if (type === "down" && Math.abs(x - divX()) < 70) { drag = true; dragD = d; return true; }
        if (type === "move" && drag) { dragD = clamp((x - view.x0) / view.w, 0.04, 0.96); return true; }
        if (type === "up") { drag = false; }
        return false;
      },
      update(s) {
        const choreo = lerp(0.5 + 0.09 * Math.sin(s.t * 0.55) + 0.03 * Math.sin(s.t * 1.7), 0.16, s.k(1, 0, 3.2, ease.io3));
        d = drag ? dragD : d + (choreo - d) * damp(drag ? 30 : 3.5, s.dt);
        hot += ((drag || Math.abs(s.mouse.px - divX()) < 70 ? 1 : 0) - hot) * damp(10, s.dt);
        bg.u.uTime.value = s.t; bg.u.uD.value = d; bg.u.uHot.value = hot; ctx.params.mix = d;
        const x = divX(), inL = s.k(0, 0.4, 2.2, ease.lin), inR = s.k(0, 1.2, 3.0, ease.lin);
        lt.x = ls.x = view.x0 + 90; rt.x = rs.x = x + 90;
        lt.show(inL, { stagger: 0.3 }); ls.show(inL, { style: "fade" });
        rt.show(inR, { stagger: 0.3 }); rs.show(inR, { style: "fade" });
        const roomL = clamp((x - view.x0 - 90 - lt.width()) / 120), roomLs = clamp((x - view.x0 - 90 - ls.width()) / 120);
        const roomR = clamp((view.x1 - x - 90 - rt.width()) / 120), roomRs = clamp((view.x1 - x - 90 - rs.width()) / 120);
        lt.mat.uniforms.uAlpha.value = roomL; ls.mat.uniforms.uAlpha.value = roomLs;
        rt.mat.uniforms.uAlpha.value = roomR; rs.mat.uniforms.uAlpha.value = roomRs;
      },
      render(out, s) {
        bg.render(hdr);
        gfx.post(hdr, out, { bloom: 0.4, threshold: 1.1, exposure: 0.95, contrast: 1.05, saturation: 1.05, vignette: 0.18, grain: 0.018, time: s.t });
        layer.render(out);
      },
    };
  },
};
