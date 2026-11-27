// DAYBREAK — the frame falls out of focus into bokeh, light floods in, and the next frame racks into focus.
// Phases (p 0..1):
//   0.03–0.50  A defocuses (golden-angle disc blur, highlights weighted up, cat-eye toward the corners)
//   0.04–0.70  a warm glow blooms from A's bright areas, peaking around 0.34
//   0.10–0.92  bokeh discs (instanced) pick their colour from A, swell, drift, then shrink to star points
//   0.40–0.985 B arrives defocused and racks into focus; everything is soft-clipped to avoid hard white
import { mipCopy, TLIB, THREE, smooth5, sstep } from "./lib.js";

const GX = 34, GY = 20;

export default {
  dur: 3.4,
  create({ gfx }) {
    const mA = mipCopy(gfx), mB = mipCopy(gfx);
    const bA = gfx.target({ scale: 0.5 }), bB = gfx.target({ scale: 0.5 }), tmp = gfx.target({ scale: 0.5 }), disc = gfx.target({ scale: 0.5 });

    // disc blur from a mip pyramid: 40 golden-angle taps, LOD chosen from the radius
    const blur = gfx.pass(TLIB + `uniform sampler2D tM; uniform float uR,uHi,uExp;
      void main(){ float j=hash12(gl_FragCoord.xy)*6.2831; float sy=float(textureSize(tM,0).y); float lod=max(0.,log2(uR*sy/4.6));
        vec2 asp=vec2(uRes.y/uRes.x,1.); vec2 fc=vUv-.5; float cat=clamp(length(fc*vec2(1.,.8))*1.15,0.,.75); vec2 cd=normalize(fc+1e-5);
        vec3 s=vec3(0.); float w=0.;
        for(int i=0;i<40;i++){ float f=(float(i)+.5)/40.; float a=float(i)*2.399963+j; vec2 d=vec2(cos(a),sin(a))*sqrt(f);
          d-=cd*dot(d,cd)*cat*.45;                                            // cat-eye: discs flatten toward the corners
          vec3 c=textureLod(tM,vUv+d*uR*asp,lod).rgb; float l=luma(c); float k=1.+uHi*l*l*l; c*=1.+uExp*l*l; s+=c*k; w+=k; }
        o=vec4(s/w,1.); }`, { tM: null, uR: 0, uHi: 0, uExp: 0 });
    const soften = gfx.pass("uniform sampler2D tM; uniform float uR; void main(){ vec3 s=texture(tM,vUv).rgb; for(int i=0;i<12;i++){ float f=(float(i)+.5)/12.; float a=float(i)*2.399963; s+=texture(tM,vUv+vec2(cos(a),sin(a))*sqrt(f)*uR*vec2(uRes.y/uRes.x,1.)).rgb; } o=vec4(s/13.,1.); }", { tM: null, uR: 0 });
    const defocus = (mip, r, hi, exp, dst) => { blur.u.uR.value = r; blur.u.tM.value = mip; blur.u.uHi.value = hi; blur.u.uExp.value = exp; blur.render(tmp); soften.u.tM.value = tmp.texture; soften.u.uR.value = r * 0.24; soften.render(dst); };

    // instanced bokeh discs: colour from A's mip, kept only where locally bright
    const quad = new THREE.InstancedBufferGeometry();
    quad.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2));
    quad.setIndex([0, 1, 2, 0, 2, 3]); quad.instanceCount = GX * GY; quad.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const dmat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      uniforms: { tM: { value: null }, p: { value: 0 }, uAsp: { value: 1 }, uTime: { value: 0 } },
      vertexShader: `precision highp float; in vec2 position; out vec2 vQ; flat out vec3 vC; flat out float vSoft; uniform sampler2D tM; uniform float p,uAsp,uTime;
        vec2 h22(vec2 q){ vec3 p3=fract(vec3(q.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
        void main(){ float i=float(gl_InstanceID); vec2 id=vec2(mod(i,${GX}.),floor(i/${GX}.)); vec2 h=h22(id+1.), h2=h22(id+51.);
          vec2 c=(id+.5+(h-.5)*1.1)/vec2(${GX}.,${GY}.);
          vec3 col=textureLod(tM,c,4.2).rgb; float l=dot(col,vec3(.2126,.7152,.0722)); float lf=dot(textureLod(tM,c,6.6).rgb,vec3(.2126,.7152,.0722));
          float keep=smoothstep(.03,.42,(l-.62*lf)*1.15+.16*(h2.x-.5))*step(.34,fract(h.x*7.+h2.y*3.)); float big=step(.8,h2.y)*smoothstep(.25,.8,l);
          float on=smoothstep(.10+.10*h.x,.34+.10*h.x,p), off=1.-smoothstep(.70+.10*h2.y,.92+.06*h2.x,p), shrink=smoothstep(.34+.08*h.y,.84+.10*h2.x,p);
          float R=mix(.020+.034*h2.y+.050*big,.0015+.0011*h.x,shrink)*mix(.25,1.,smoothstep(.08,.36,p));
          vec2 q=(c*2.-1.)*vec2(uAsp,1.); q*=1.+.22*smoothstep(.1,1.,p)*(.4+h2.y);
          q+=vec2((h.x-.5)*.32,(h.y-.35)*.44)*smoothstep(.05,1.,p)+vec2(.03*sin(uTime*.4+h.x*6.),.03*cos(uTime*.33+h.y*6.));
          float a=keep*on*off*mix(.62,.30,shrink)*min(pow(.030/max(R,.0012),.7),5.5);
          vec3 tint=mix(max(mix(vec3(l),col,2.3),0.)/max(l,.05)*.5,mix(vec3(1.,.72,.42),vec3(.75,.86,1.),h2.x),shrink*.75);
          vC=tint*a*(.45+.8*h2.y); vQ=position; vSoft=clamp(2.2/(R*1080.*.25),.03,1.);
          if(a<.0005){ gl_Position=vec4(2.); return; } gl_Position=vec4((q+position*R*1.06)/vec2(uAsp,1.),0.,1.); }`,
      fragmentShader: `precision highp float; in vec2 vQ; flat in vec3 vC; flat in float vSoft; out vec4 o;
        void main(){ float r=length(vQ)*1.06; float d=1.-smoothstep(1.-vSoft,1.,r); float ring=.82+.30*smoothstep(.62,.95,r)*(1.-vSoft);
          float core=mix(1.,exp(-r*r*3.)*2.2,smoothstep(.35,.9,vSoft)); o=vec4(vC*d*ring*(1.+.03*sin(r*26.))*core,0.); }`,
    });
    const dscene = new THREE.Scene(); const dmesh = new THREE.Mesh(quad, dmat); dmesh.frustumCulled = false; dscene.add(dmesh);
    const dcam = new THREE.Camera();

    const comp = gfx.pass(TLIB + `uniform sampler2D tA,tB,mA,hA,hB,tS; uniform float p,uRA,uRB,uWA,uWB,uGlow,uExpA;
      vec3 glow(vec2 uv){ vec3 s=vec3(0.); float w=0.; float asp=uRes.x/uRes.y; for(int i=-4;i<=4;i++){ float f=float(i)/4.; float k=exp(-f*f*2.2);
        vec3 c=textureLod(mA,uv+vec2(f*.30/asp*1.78,0.),5.5).rgb; float l=luma(c); s+=c*l*l*k; c=textureLod(mA,uv+vec2(f*.10,f*.07),4.5).rgb; l=luma(c); s+=c*l*l*l*k*1.1; w+=k; } return s/w; }
      void main(){ vec3 c=vec3(0.);
        if(uWA>0.){ vec3 s=toLin(clamp(texture(tA,vUv).rgb,0.,1.)); c+=mix(s,texture(hA,vUv).rgb,ss(.0012,.0045,uRA))*uWA*uExpA; }
        if(uWB>0.){ vec3 s=toLin(clamp(texture(tB,vUv).rgb,0.,1.)); c+=mix(s,texture(hB,vUv).rgb,ss(.0012,.0045,uRB))*uWB; }
        if(uGlow>0.){ vec3 g=glow(vUv+vec2(0.,-.01*p))+.55*textureLod(mA,vUv,6.5).rgb*vec3(1.05,.95,.85); c+=g*uGlow*(.75+.25*fbm(vec2(vUv.x*2.+p,vUv.y*5.)))*vec3(1.06,.94,.78); }
        c+=texture(tS,vUv).rgb;
        float k=ss(0.,.12,p)*(1.-ss(.86,.985,p)); vec3 soft=c/(1.+max(max(c.r,max(c.g,c.b))-.82,0.)); c=mix(c,min(soft,1.),k);
        o=vec4(toSrgb(min(c,1.)),1.); }`, { tA: null, tB: null, mA: mA.texture, hA: bA.texture, hB: bB.texture, tS: disc.texture, p: 0, uRA: 0, uRB: 0, uWA: 1, uWB: 0, uGlow: 0, uExpA: 1 });

    return {
      render({ A, B, p, out, time = 0 }) {
        if (p <= 0.002) return gfx.copy(A, out);
        if (p >= 0.998) return gfx.copy(B, out);
        const inA = smooth5((p - 0.03) / 0.47), outB = 1 - smooth5((p - 0.5) / 0.485);
        const rA = 0.085 * inA, rB = 0.07 * outB;
        const wA = 1 - sstep(0.24, 0.64, p), wB = sstep(0.4, 0.82, p);
        if (p < 0.74) mA.update(A);
        if (wB > 0) mB.update(B);
        if (wA > 0 && rA > 0.001) defocus(mA.texture, rA, 16 * inA, 1.2 * inA, bA);
        if (wB > 0 && rB > 0.001) defocus(mB.texture, rB, 22 * outB, 5 * outB, bB);
        dmat.uniforms.tM.value = mA.texture; dmat.uniforms.p.value = p; dmat.uniforms.uAsp.value = gfx.aspect; dmat.uniforms.uTime.value = time;
        gfx.draw(dscene, dcam, disc, { color: 0x000000 });
        const u = comp.u;
        u.tA.value = A.texture; u.tB.value = B.texture; u.p.value = p; u.uRA.value = rA; u.uRB.value = rB; u.uWA.value = wA; u.uWB.value = wB;
        u.uGlow.value = 0.95 * sstep(0.04, 0.34, p) * (1 - sstep(0.34, 0.7, p)); u.uExpA.value = 1 - 0.45 * sstep(0.2, 0.6, p);
        comp.render(out);
      },
    };
  },
};
