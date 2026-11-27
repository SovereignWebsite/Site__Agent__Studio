// LINE — the picture collapses vertically into a glowing, vibrating string; the next picture grows out of it.
// Phases (p 0..1):
//   0.00–0.45  columns of A squeeze toward a centre line, edges first (staggered by distance from centre)
//   0.10–0.86  the line vibrates as a sum of three standing waves; it glows with each column's average colour
//   0.44–0.60  the thread's colour crossfades from A's palette to B's
//   0.52–1.00  columns of B unfold from the thread, centre first
// Techniques: per-column squeeze function, coverage-based anti-aliasing, 10-sample temporal motion blur,
// column-average colour from a mip copy, hot core + three glow falloffs, phosphor afterglow.
import { mipCopy, TLIB } from "./lib.js";

export default {
  dur: 2.4,
  create({ gfx }) {
    const mA = mipCopy(gfx), mB = mipCopy(gfx);
    const colA = gfx.target({ w: 512, h: 1 }), colB = gfx.target({ w: 512, h: 1 });
    // average each column (32 samples down a pre-blurred mip)
    const colPass = gfx.pass("uniform sampler2D tM; void main(){ vec3 s=vec3(0.); for(int i=0;i<32;i++){ s+=textureLod(tM,vec2(vUv.x,(float(i)+.5)/32.),3.).rgb; } o=vec4(s/32.,1.); }", { tM: null });
    const pass = gfx.pass(TLIB + `
      uniform sampler2D tA,tB,mA,mB,cA,cB; uniform float p;
      // height (fraction of screen) of a column of A or B at progress q
      float hA(float x,float q){ float d=abs(x-.5)*2.; return mix(1.,.002,io5((q-.015-.13*d-.012*sin(x*40.))/.31)); }
      float hB(float x,float q){ float d=1.-abs(x-.5)*2.; return mix(.002,1.,sm5((q-.52-.13*d*d-.02*(vnoise(vec2(x*7.,3.))-.5))/.32)); }
      // the string: three standing-wave modes, pinned at the screen edges
      float yl(float x,float q){ float a=ss(.10,.40,q)*(1.-ss(.52,.86,q)); float t=q*15.; float pin=sin(3.14159*x);
        return .5+a*pin*(.060*sin(3.14159*x)*cos(t)+.034*sin(6.28318*x+.3)*cos(t*1.9+.6)+.016*sin(15.708*x)*cos(t*3.1)); }
      vec3 col(sampler2D t,sampler2D m,sampler2D c,vec2 u,float h){ // sharp when tall, column average when squashed
        vec3 s=toLin(clamp(texture(t,u).rgb,0.,1.)); s=mix(s,textureLod(m,u,3.).rgb,ss(.25,.04,h)); return mix(s,texture(c,vec2(u.x,.5)).rgb,ss(.04,.004,h)); }
      vec3 layer(bool isA,float x,float q){ float h=isA?hA(x,q):hB(x,q); float yc=mix(.5,yl(x,q),ss(1.,.4,h));
        float y=(vUv.y-yc)/h+.5; float cov=clamp(min(y,1.-y)*h*uRes.y+.5,0.,1.); if(cov<=0.) return vec3(0.);
        float gain=1.+1.6*pow(1.-h,6.)+.25*(1.-h);                 // light concentrates as the picture squashes
        return cov*gain*(isA?col(tA,mA,cA,vec2(x,clamp(y,0.,1.)),h):col(tB,mB,cB,vec2(x,clamp(y,0.,1.)),h)); }
      void main(){ float x=vUv.x; vec3 acc=vec3(0.); float j=hash12(gl_FragCoord.xy+floor(p*500.));
        const int N=10;                                                  // motion blur: shutter open over a short time window
        if(p<.62){ vec3 c=vec3(0.); for(int i=0;i<N;i++){ float f=(float(i)+.5+(j-.5)*.8)/float(N); c+=layer(true,x,p-.016*f); } acc+=c/float(N)*(1.-ss(.48,.60,p)); }
        if(p>.46){ vec3 c=vec3(0.); for(int i=0;i<N;i++){ float f=(float(i)+.5+(j-.5)*.8)/float(N); c+=layer(false,x,p-.014*f*(1.-ss(.93,.995,p))); } acc+=c/float(N)*ss(.47,.60,p); }
        // the thread
        float hold=ss(.16,.44,p)*(1.-ss(.62,.95,p));
        vec3 la=texture(cA,vec2(x,.5)).rgb, lb=texture(cB,vec2(x,.5)).rgb; vec3 lc=mix(la,lb,ss(.44,.60,p+.05*sin(x*9.)));
        lc=lc/(max(lc.r,max(lc.g,lc.b))+.06)*pow(luma(lc)+.015,.42);   // keep hue, compress brightness
        float y1=yl(x,p); float sl=(yl(x+.002,p)-yl(x-.002,p))/.004/(uRes.x/uRes.y); float dy=abs(vUv.y-y1)/sqrt(1.+sl*sl);
        float w=mix(.005,.0015,ss(.2,.45,p)); float core=1.-ss(w*.55,w*.55+1.6/uRes.y,dy);
        float glow=exp(-dy*80.)*.62+exp(-dy*15.)*.19+exp(-dy*4.2)*.055; float sweep=.85+.15*sin(x*26.-p*60.)*sin(x*7.+p*31.);
        acc+=hold*lc*(core*2.3+glow*sweep)*1.15+hold*core*luma(lc)*.5;
        acc+=textureLod(mA,vUv,1.).rgb*.10*pow(1.-ss(0.,.34,p-.12*abs(x-.5)),2.)*step(hA(x,p),.999)*step(p,.5); // phosphor afterglow
        acc=mix(acc,1.-exp(-acc*1.25),hold);                              // soft-clip the hot thread
        o=vec4(toSrgb(acc),1.); }`, { tA: null, tB: null, mA: mA.texture, mB: mB.texture, cA: colA.texture, cB: colB.texture, p: 0 });
    return {
      render({ A, B, p, out }) {
        if (p <= 0) return gfx.copy(A, out);
        if (p >= 1) return gfx.copy(B, out);
        if (p < 0.64) { mA.update(A); colPass.u.tM.value = mA.texture; colPass.render(colA); }
        if (p > 0.40) { mB.update(B); colPass.u.tM.value = mB.texture; colPass.render(colB); }
        pass.u.tA.value = A.texture; pass.u.tB.value = B.texture; pass.u.p.value = p;
        pass.render(out);
      },
    };
  },
};
