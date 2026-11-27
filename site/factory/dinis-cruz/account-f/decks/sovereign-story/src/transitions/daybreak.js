// "Daybreak": the picture defocuses into bokeh (bright points weigh more, so they bloom into discs),
// light floods in, and the next scene comes back into focus.
import { COLOR, HASH } from "../glsl.js";

export default {
  dur: 3.0,
  create({ gfx }) {
    const pass = gfx.pass(COLOR + HASH + `uniform sampler2D tA,tB; uniform float p;
      vec3 bokeh(sampler2D t,float r){
        vec2 asp=vec2(uRes.x/uRes.y,1.); vec3 acc=vec3(0); float ws=0.;
        for(int i=0;i<64;i++){ float fi=float(i); float rr=sqrt((fi+.5)/64.)*r; float th=fi*2.39996+hash12(gl_FragCoord.xy)*.25;
          vec3 c=toLin(texture(t,vUv+vec2(cos(th),sin(th))*rr/asp).rgb); float l=dot(c,vec3(.2126,.7152,.0722)); float w=1.+12.*l*l*l;
          acc+=c*w; ws+=w; }
        return acc/ws;
      }
      void main(){
        float u=smoothstep(0.,1.,p), out_=1.-smoothstep(.0,.55,p), in_=smoothstep(.45,1.,p);
        float rA=0.045*smoothstep(0.,.5,p), rB=0.045*(1.-smoothstep(.5,1.,p));
        vec3 a=bokeh(tA,rA), b=bokeh(tB,rB);
        float flood=exp(-pow((p-.5)/.16,2.));                                   // the light, peaking in the middle
        vec3 c=mix(a,b,smoothstep(.42,.58,p));
        c=c*(1.+flood*1.1)+vec3(1.,.84,.62)*flood*.12;
        c=c/(1.+c*flood*.2);                                                   // soft shoulder so the flood stays luminous, not clipped
        o=vec4(toSrgb(c),1.);
      }`, { tA: null, tB: null, p: 0 });
    return {
      render({ A, B, p, out }) {
        if (p <= 0) return gfx.copy(A, out);
        if (p >= 1) return gfx.copy(B, out);
        pass.u.tA.value = A.texture; pass.u.tB.value = B.texture; pass.u.p.value = p; pass.render(out);
      },
    };
  },
};
