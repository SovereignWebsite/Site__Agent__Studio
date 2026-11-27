// An "aperture" transition: the outgoing frame is pushed back and dimmed while the incoming one
// opens from the centre through a soft, glowing, chromatically split ring. Template for your own.
import { COLOR } from "../glsl.js";

export default {
  dur: 1.6,
  create({ gfx }) {
    const pass = gfx.pass(COLOR + `uniform sampler2D tA,tB; uniform float p;
      float io(float t){ t=clamp(t,0.,1.); return t<.5?4.*t*t*t:1.-pow(-2.*t+2.,3.)*.5; }
      void main(){
        vec2 asp=vec2(uRes.x/uRes.y,1.); vec2 d=(vUv-.5)*asp; float r=length(d);
        float R=io(p)*1.25;                                   // aperture radius
        vec2 za=(vUv-.5)/(1.+.12*io(p))+.5;                   // outgoing frame recedes
        vec3 a=toLin(texture(tA,za).rgb)*(1.-.6*io(p));
        vec2 zb=(vUv-.5)*(1.08-.08*io(p))+.5;                 // incoming frame settles in
        vec3 b; float sp=.012*(1.-p);                         // chromatic split near the ring
        b.r=toLin(texture(tB,zb+d*sp).rgb).r; b.g=toLin(texture(tB,zb).rgb).g; b.b=toLin(texture(tB,zb-d*sp).rgb).b;
        float m=smoothstep(R,R-.025,r);
        float ring=exp(-pow((r-R)/.012,2.))*(1.-smoothstep(.85,1.,p));
        vec3 c=mix(a,b,m)+vec3(1.,.82,.6)*ring*1.6;
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
