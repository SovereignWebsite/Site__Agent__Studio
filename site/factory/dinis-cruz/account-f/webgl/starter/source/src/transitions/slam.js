// SLAM — the next slide is pressed onto the screen like a print block, then the ink takes.
// Phases (p 0..1), contact at P_CONTACT:
//   0.00–0.285  approach: A is pushed (zoom + radial blur), air is squeezed out (rim darkens),
//               a blank sheet sweeps in over it, throwing a soft shadow that tightens as it nears
//   0.285       IMPACT (sound: slam + boom here)
//   0.285–0.86  printed: camera shake/roll/zoom spring decaying, a radial ripple ring with real refraction,
//               the ink-pressure front spreads from the impact point and the paper's tooth takes ink first,
//               wet ink is darker with a bit of relief and dries, a ring of dust blows outward
//   0.86–1.00   settle into the exact B frame
import { mipCopy, TLIB, smooth5, sstep } from "./lib.js";

const P_CONTACT = 0.285;

export default {
  dur: 2.6,
  create({ gfx }) {
    const mA = mipCopy(gfx);
    const pass = gfx.pass(TLIB + `uniform sampler2D tA,tB,mA; uniform float uK,uTau,uFace,uRing,uFront,uEnd,uRot,uZoom; uniform vec2 uC,uShake;
      vec3 paper(vec2 q){ float f=fbm(q*vec2(70.,64.))-.5, g=vnoise(q*430.)-.5, m=fbm(q*3.)-.5; return vec3(.848,.838,.812)*(1.+f*.045+g*.03+m*.03); }
      void main(){ vec2 asp=vec2(uRes.x/uRes.y,1.);
        if(uTau<0.){                                    // ---------- approach ----------
          vec2 d=vUv-uC; float z=1.+.16*uK*uK+.62*uK*uK*uK*uK; float bl=.16*uK*uK*uK; float j=hash12(gl_FragCoord.xy); vec3 c=vec3(0.);
          for(int i=0;i<10;i++){ float f=(float(i)+j)/10.-.5; c+=toLin(clamp(texture(tA,uC+d/(z*(1.+bl*f))).rgb,0.,1.)); } c*=.1;
          float rim=ss(.25,.75,length(d*vec2(1.,.8))); c*=1.-.60*sm5(uK)*rim;          // air squeezed out from the rim inward
          // the sheet: a rectangle growing from just inside the frame to beyond it, with slight keystone
          float f=.93+.75*uK*uK*uK; vec2 n=(vUv*2.-1.)-vec2(0.,-.04); n.x/=1.+(1.-uK)*.16*(n.y/f);
          vec2 e2=(vec2(f)-abs(n))*asp*.5; float e=min(e2.x,e2.y); float soft=.004+.05*uK;
          float face=ss(-soft,soft,e); float sh=exp(-max(-e,0.)*(14.-6.*uK));
          c*=1.-.62*sh*uFace*uK;
          vec3 av=textureLod(mA,vec2(.5),9.).rgb; vec3 hue=clamp(av/max(luma(av),.12),.75,1.3);
          vec3 pt=paper((vUv-uC)*asp*(1.5-.5*uK))*(1.-.10*(1.-uK)); pt*=mix(hue,vec3(1.),.35+.65*ss(.5,1.,uK)); pt*=1.-.16*rim*uK;
          o=vec4(toSrgb(mix(c,pt,face*uFace)),1.); return; }
        // ---------- printed ----------
        vec2 d0=(vUv-.5)*asp; float cr=cos(uRot),sr=sin(uRot); d0=mat2(cr,sr,-sr,cr)*d0/uZoom; vec2 uv=d0/asp+.5+uShake;
        vec2 q=(uv-uC)*asp; float r=length(q); vec2 dir=q/max(r,1e-4);
        float x=r-uRing; float env=exp(-x*x*38.)*exp(-uTau*2.6); float wob=sin(x*34.)*env;
        float g=(cos(x*34.)*34.-76.*x*sin(x*34.))*env/34.;                              // derivative of the ring = refraction
        vec2 bu=uv-dir*g*.0085/asp;
        vec3 b=toLin(clamp(texture(tB,clamp(bu,0.,1.)).rgb,0.,1.)); vec3 pt=paper(q);
        float n=fbm(q*9.)*.5+vnoise(q*120.)*.22+vnoise(q*330.)*.28;                      // paper tooth
        float age=(uFront-r)*2.1+.55; float press=ss(n-.10,n+.34,age-.12); press=mix(press,1.,uEnd);
        float ink=1.-luma(b); float take=mix(press,ss(0.,.7,press),ink); vec3 c=mix(pt,b,take);
        float fresh=press*(1.-ss(.55,2.1,age))*(1.-uEnd); vec2 px=1.4/uRes;               // wet ink: darker, a little relief
        float lx=luma(texture(tB,clamp(bu+vec2(px.x,0.),0.,1.)).rgb)-luma(texture(tB,clamp(bu-vec2(px.x,0.),0.,1.)).rgb);
        float ly=luma(texture(tB,clamp(bu+vec2(0.,px.y),0.,1.)).rgb)-luma(texture(tB,clamp(bu-vec2(0.,px.y),0.,1.)).rgb);
        c*=1.+fresh*.30*(lx*.6-ly); c*=1.-.10*fresh*(1.-n);
        c*=1.+dot(dir,normalize(vec2(-.5,.85)))*g*.16+wob*.03; c*=1.-.10*exp(-uTau*5.)*ss(.2,1.2,r);
        float dr=.16+1.5*(1.-exp(-uTau*2.4)); float a=atan(q.y,q.x); vec2 pol=vec2(cos(a),sin(a))*2.2;   // dust ring
        float dx=(r-dr)/(.10+.34*uTau); float re=exp(-dx*dx*(dx>0.?3.2:1.1))*exp(-uTau*2.7)*(1.-uEnd);
        if(re>.006){ float dn=fbm(pol*1.6+r*5.-uTau*3.5)*.65+fbm(pol*5.+r*13.-uTau*5.)*.35; c=mix(c,vec3(.30,.28,.25)*(.7+.7*dn),clamp(re*ss(.38,.75,dn)*.5,0.,.45)); }
        if(uEnd>=1.){ o=vec4(texture(tB,vUv).rgb,1.); return; }
        o=vec4(toSrgb(c),1.); }`,
      { tA: null, tB: null, mA: mA.texture, uK: 0, uTau: -1, uFace: 0, uRing: 0, uFront: 0, uEnd: 0, uRot: 0, uZoom: 1, uC: new gfx.THREE.Vector2(0.5, 0.46), uShake: new gfx.THREE.Vector2() });
    return {
      render({ A, B, p, out }) {
        if (p <= 0) return gfx.copy(A, out);
        if (p >= 1) return gfx.copy(B, out);
        const u = pass.u, k = Math.min(1, p / P_CONTACT), tau = (p - P_CONTACT) / (1 - P_CONTACT) * 1.5; // tau = "seconds" after impact (shaped, not real time)
        mA.update(A);
        u.tA.value = A.texture; u.tB.value = B.texture; u.uK.value = k; u.uTau.value = p < P_CONTACT ? -1 : tau;
        u.uFace.value = smooth5((k - 0.42) / 0.58);
        if (p >= P_CONTACT) {
          const f = Math.exp(-tau * 6.5), h = tau * 34;
          u.uShake.value.set(Math.sin(h + 0.4) * 0.0085 * f, Math.cos(h * 1.27) * 0.016 * f);
          u.uRot.value = Math.sin(h * 0.9 + 1) * 0.007 * f;
          u.uZoom.value = 1 + 0.035 * Math.exp(-tau * 9) * Math.cos(tau * 26) + 0.004 * f;
          u.uRing.value = 0.06 + 1.75 * (1 - Math.exp(-tau * 2.3));
          u.uFront.value = 2.9 * (1 - Math.exp(-tau * 2.6)) - 0.42;
          u.uEnd.value = sstep(0.86, 0.985, p);
        }
        pass.render(out);
      },
    };
  },
};
