// "Burn": the slide catches near the middle and burns outward: charring paper, a white-hot front, flame tongues
// licking upward, embers drifting, heat shimmer, and the next scene showing through the holes.
import { NOISE, COLOR } from "../glsl.js";

export default {
  dur: 2.8,
  create({ gfx }) {
    const pass = gfx.pass(NOISE + COLOR + `uniform sampler2D tA,tB; uniform float p;
      vec2 asp(){ return vec2(uRes.x/uRes.y,1.); }
      float front(vec2 uv){                                         // < 0: burnt through
        vec2 a=uv*asp();
        float n=fbm(a*2.6)*.62+fbm(a*9.+3.)*.18+length((uv-vec2(.5,.42))*asp())*.46;
        return n-(p*1.55-.18);
      }
      vec3 heat(float h){ return h<.33?mix(vec3(.5,.04,0.),vec3(1.,.32,.02),h*3.):h<.66?mix(vec3(1.,.32,.02),vec3(1.,.75,.2),(h-.33)*3.):mix(vec3(1.,.75,.2),vec3(1.,.97,.85),(h-.66)*3.); }
      void main(){
        vec2 uv=vUv; float d=front(uv);
        float shimmer=exp(-max(d,0.)/.06)*(1.-step(d,0.));
        vec2 wob=vec2(vnoise(vec2(uv.y*40.,uTime*6.)),vnoise(vec2(uv.x*40.,uTime*6.+3.)))-.5;
        vec3 a=toLin(texture(tA,uv+wob*.006*shimmer).rgb), b=toLin(texture(tB,uv).rgb);
        // paper browns and chars ahead of the front
        float scorch=1.-smoothstep(0.,.09,d), charr=1.-smoothstep(0.,.03,d);
        a=mix(a,a*vec3(.62,.42,.24),scorch*.8); a=mix(a,vec3(.03,.02,.015),charr);
        float burnt=smoothstep(.004,-.004,d);
        vec3 c=mix(a,b*(1.-.5*exp(d/.05)),burnt);                     // smoke-dark near the hole edge
        // the glowing front
        float edge=exp(-pow(d/.006,2.)), glow=exp(-abs(d)/.025);
        c+=heat(.95)*edge*5.+heat(.5)*glow*.9;
        // flame tongues: fire just below this point rises through it
        float fl=0.;
        for(int i=1;i<7;i++){ float fi=float(i); vec2 s=uv-vec2(0.,.022*fi);
          float e=exp(-pow(front(s)/.02,2.));
          float tongue=smoothstep(.45,.85,fbm(vec2(uv.x*asp().x*14.,uv.y*5.-uTime*3.2+fi*.3)));
          fl+=e*tongue*exp(-fi*.42); }
        c+=heat(clamp(fl*.9,0.,1.))*fl*2.2;
        // embers drifting up and sideways
        vec2 g=vec2(uv.x*asp().x*70.+sin(uv.y*20.+uTime)*.6,uv.y*36.-uTime*5.); vec2 cell=floor(g), f=fract(g)-.5;
        float h=hash12(cell); float ember=step(.965,h)*exp(-dot(f,f)*40.)*exp(-abs(d)/.08);
        c+=heat(.7)*ember*6.*(.5+.5*sin(uTime*20.+h*60.));
        c*=1.;
        o=vec4(toSrgb(c/(1.+c*.08)),1.);
      }`, { tA: null, tB: null, p: 0 });
    return {
      render({ A, B, p, out, time }) {
        if (p <= 0) return gfx.copy(A, out);
        if (p >= 1) return gfx.copy(B, out);
        pass.u.tA.value = A.texture; pass.u.tB.value = B.texture; pass.u.p.value = p; pass.u.uTime.value = time || p * 3; pass.render(out);
      },
    };
  },
};
