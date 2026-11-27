// "Tear": the slide rips from the top down a ragged line, then the halves swing away, lifting, with a white
// paper core and fibres along the edge and a soft shadow on the scene beneath. A 2D approximation of the
// original's curled-sheet tear, in one full-screen pass.
import { NOISE, COLOR } from "../glsl.js";

export default {
  dur: 2.8,
  create({ gfx }) {
    const pass = gfx.pass(NOISE + COLOR + `uniform sampler2D tA,tB; uniform float p;
      float tearX(float y){ return .5+.022*sin(y*5.7+1.3)+.011*sin(y*19.)+.02*(vnoise(vec2(y*34.,3.))-.5)+.008*(vnoise(vec2(y*150.,9.))-.5); }
      vec2 rot(vec2 v,float a){ float c=cos(a),s=sin(a); return vec2(c*v.x-s*v.y,s*v.x+c*v.y); }
      float run(){ return smoothstep(0.,.34,p); }                       // how far down the rip has gone
      float fly(){ float f=smoothstep(.26,1.,p); return f*f*(3.-2.*f); }
      // Where does screen point P (uv) come from on half 'side' (0 left, 1 right)? Returns source uv in q, mask as result.
      float half_(vec2 P,float side,out vec2 q,out float edge){
        vec2 asp=vec2(uRes.x/uRes.y,1.); float sg=side<.5?-1.:1., f=fly();
        vec2 piv=vec2(side<.5?0.:1.,-.1)*asp; float ang=-sg*f*.62, sc=1.+f*.1;
        vec2 off=vec2(sg*f*.95,f*.18)*asp;
        q=(rot(P*asp-off-piv,-ang)/sc+piv)/asp;
        float top=1.-q.y, torn=smoothstep(run()*1.08,run()*1.08-.06,top);  // 1 where the rip has reached
        float gap=.0015*torn*(1.-f), tx=tearX(q.y);
        float d=side<.5?tx-gap-q.x:q.x-tx-gap;                             // distance inside the half from the rip
        edge=torn>.01?d:1.;
        float inBox=step(0.,q.x)*step(q.x,1.)*step(0.,q.y)*step(q.y,1.);
        return step(0.,d)*inBox;
      }
      void main(){
        vec2 q,q2; float e,e2;
        vec3 c=toLin(texture(tB,vUv).rgb)*(.7+.3*fly());
        // shadow cast by the lifted halves onto the scene beneath
        vec2 so=vec2(.012,-.03)*fly();
        float sh=max(half_(vUv+so,0.,q2,e2),half_(vUv+so,1.,q2,e2));
        c*=1.-.5*sh*smoothstep(0.,.3,fly());
        for(int i=0;i<2;i++){
          float side=float(i), m=half_(vUv,side,q,e);
          float fib=.005+.008*vnoise(vec2(q.y*120.,side*7.+1.));
          // fibres just beyond the edge
          float strands=step(.72,vnoise(vec2(q.y*900.,side*3.)))*step(-fib*.8,e)*step(e,0.)*step(.0,1.-q.y)*(1.-step(1.,e));
          if(m>0.||strands>0.){
            vec3 a=toLin(texture(tA,q).rgb);
            float core=1.-smoothstep(fib*.6,fib,e);                            // white paper core at the rip
            a=mix(a,vec3(.97,.96,.93),max(core*step(e,.5),strands));
            a*=1.-.18*fly()*(side<.5?1.:.6);                                    // the lifted sheet turns from the light
            c=a;
          }
        }
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
