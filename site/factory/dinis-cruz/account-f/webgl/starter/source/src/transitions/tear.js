// TEAR — the slide rips down the middle from the top; each half curls away like paper, revealing the next slide.
// Phases (p 0..1):
//   0.02–0.56  the rip travels top→bottom (uYf), with a hand-made speed wobble; opened parts begin to curl
//   0.37–0.995 both halves roll outward around cylinders (uW2) and leave the frame
//   throughout  torn edge = slow wander + fine fbm; white layered paper core showing along the lip; fibres;
//               dark printed back side; 40 paper shards tumble from the rip; the sheets cast a soft shadow on B
// Geometry: two grids (left/right half) of 120x96 quads; ALL the motion happens in the vertex shader.
import { mipCopy, TLIB, THREE, smooth5, sstep } from "./lib.js";

const NX = 120, NY = 96, SHARDS = 40, DUR = 2.8;

const CURL = /* glsl */ `
uniform float uAsp,uP,uYf,uW2; const float CAM=3.0;
float slow(float y){ return .075*sin(y*2.1+.8)+.034*sin(y*5.3+2.)+.012*sin(y*13.+.5); }   // where the rip wanders
float openAt(float y){ return max(0.,y-uYf); }                                                // how long ago the rip passed here
// sheet point P of half sg (-1 left, +1 right) -> world position; phi = how far it has rolled
vec3 curl(vec2 P,float sg,out float phi,out float over){
  float h=openAt(P.y); float d=(P.x-slow(P.y))*sg;                                             // distance from the rip into this half
  float R=.21+.10*smoothstep(0.,1.6,uW2)+.03*P.y;                                              // roll radius
  float w=.36*pow(h,1.5)+uW2*smoothstep(0.,.3,h)*(1.+sg*.045+.10*P.y);                          // width of paper already rolled
  float s=w-d; float pull=sg*(.010*smoothstep(0.,.10,h)+.050*h+.02*h*h);
  float x=P.x,z=0.; phi=0.; over=exp(-max(d-w,0.)/(R*.9))*smoothstep(.15,1.5,w/R);
  if(s>0.){ phi=s/R; float xc=slow(P.y)+sg*w;
    if(phi<3.14159){ x=xc-sg*R*sin(phi); z=R*(1.-cos(phi)); }
    else { x=xc+sg*(s-3.14159*R); z=2.*R+.06*(s-3.14159*R); phi=3.14159; } }
  z+=.03*sin(P.y*4.+uP*17.+sg)*smoothstep(0.,1.,max(s,0.));                                   // the free flap flutters
  return vec3(x+pull,P.y-.02*max(s,0.)*smoothstep(.2,1.,h),z); }
vec4 proj(vec3 w){ float k=(CAM-w.z)/CAM; return vec4(w.x/uAsp,w.y,0.,k); }                  // cheap perspective
`;

export default {
  dur: DUR,
  create({ gfx }) {
    const sheetRT = gfx.target({ scale: 1 }), shadowMip = mipCopy(gfx, { scale: 0.5 });
    const uniforms = { uAsp: { value: 1 }, uP: { value: 0 }, uYf: { value: 2 }, uW2: { value: 0 }, uT: { value: 0 }, tA: { value: null }, tB: { value: null }, uRes: { value: new THREE.Vector2() } };
    const blendOver = { transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };

    // ---- the two halves ----
    const pos = [], idx = [];
    for (const sg of [-1, 1]) {
      const base = pos.length / 3;
      for (let i = 0; i <= NX; i++) for (let j = 0; j <= NY; j++) pos.push(i / NX, j / NY, sg);
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
        const a = base + i * (NY + 1) + j, b = a + NY + 1;
        sg < 0 ? idx.push(a, b, b + 1, a, b + 1, a + 1) : idx.push(a, b + 1, b, a, a + 1, b + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3)); geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const sheetMat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, uniforms, ...blendOver,
      vertexShader: `precision highp float; in vec3 position; out vec2 vP; out float vPhi,vOver; flat out float vSg; ${CURL}
        void main(){ float sg=position.z; float y=mix(-1.,1.,position.y); float outer=sg*uAsp, inner=slow(y)-sg*.085;
          vP=vec2(mix(outer,inner,position.x),y); vSg=sg; gl_Position=proj(curl(vP,sg,vPhi,vOver)); }`,
      fragmentShader: `precision highp float; in vec2 vP; in float vPhi,vOver; flat in float vSg; out vec4 o; uniform sampler2D tA,tB; uniform vec2 uRes; ${TLIB} ${CURL}
        float tearFine(float y){ return .022*(fbm(vec2(y*9.,3.))-.5)*2.+.007*(vnoise(vec2(y*60.,7.))-.5)+.003*(vnoise(vec2(y*190.,2.))-.5); }
        float fibres(float e,float y,float px,float seed){ float a=0.; for(int L=0;L<3;L++){ float n=L==0?70.:L==1?150.:260.; float c=floor(y*n);
          for(int j=-2;j<=2;j++){ float id=c+float(j); vec2 h=hash22(vec2(id,seed+float(L)*7.)), h2=hash22(vec2(id+31.,seed+float(L)*3.));
            float len=(L==0?.030:L==1?.016:.009)*h.y*h.y*(.4+.6*h2.y); float y0=(id+h.x)/n; float k=clamp(-e/max(len,1e-4),0.,1.);
            float yy=y0+(h2.x-.5)*len*1.3*k+(h2.y-.5)*len*1.6*k*k; float wd=(L==0?.0012:.0008)*(1.-.75*k);
            a=max(a,smoothstep(px*.7,-px*.5,abs(y-yy)-wd)*smoothstep(0.,.0025,len+e)*(L==0?.95:.8)); } } return a; }
        void main(){ float y=vP.y, h=openAt(y); float op=h>0.?smoothstep(.002,.05,h+.006*(vnoise(vec2(y*40.,1.))-.5)):0.;
          float e0=(vP.x-slow(y))*vSg; bool nr=e0<.15; float e=nr?(vP.x-slow(y)-tearFine(y))*vSg:e0; float px=max(fwidth(e0),1e-5);
          float al=1.; if(e<.16){ float f=e<.004?fibres(e,y,max(px,fwidth(y)),vSg*5.):0.; al=max(smoothstep(-px*.7,px*.7,e+mix(.02,0.,smoothstep(0.,.012,h))),f*op); }
          if(al<=.003) discard;
          vec2 uv=vec2(vP.x/uAsp,y)*.5+.5; bool front=gl_FrontFacing; vec3 n=vec3(vSg*sin(vPhi),0.,cos(vPhi)); const vec3 L=normalize(vec3(-.38,.42,.82));
          float core=0.; if(nr&&op>0.){ float share=smoothstep(.38,.62,fbm(vec2(y*5.5,11.)));                  // who keeps the white core
            float wide=.006+.050*(vSg<0.?share:1.-share)*(.55+.9*fbm(vec2(y*14.,vSg*5.))); core=(wide+.010*(fbm(vec2(y*38.,vSg*9.))-.5))*op; if(!front) core*=.42; }
          vec3 ink=front?toLin(clamp(texture(tA,uv).rgb,0.,1.)):vec3(.021,.021,.024)*(.75+.5*fbm(vP*vec2(70.,55.)));
          float edge=core>0.?smoothstep(-px,px,e-core):1.; vec3 c=ink;
          if(e<core+.02&&op>0.){ float q=clamp(e/max(core,.001),0.,1.); vec2 fq=vec2(e*70.,y*300.); float str=vnoise(fq)*.5+vnoise(fq*vec2(2.1,1.9)+7.)*.5;
            vec3 w=vec3(.93,.915,.885)*(.80+.16*str+.08*vnoise(vec2(e*900.,y*700.)));
            float l1=.34+.22*(fbm(vec2(y*24.,3.+vSg))-.5)*2.; w*=1.-.16*smoothstep(.10,0.,abs(q-l1))*step(q,l1); w*=mix(.90,1.,smoothstep(0.,.5,q));
            vec3 bl=toLin(clamp(texture(tB,gl_FragCoord.xy/uRes).rgb,0.,1.)); w=mix(w,w*(.35+.75*bl)+bl*.10,(1.-smoothstep(0.,.75,q))*.55);   // thin lip lets light through
            w*=1.-.30*exp(-max(core-e,0.)/.0045); c=mix(w,ink,edge); c+=edge*exp(-max(e-core,0.)/.0016)*vec3(.16)*op*(front?1.:.5); }
          vec3 N=front?n:-n; float dl=max(dot(N,L),0.); c*=front?mix(1.,.34+.66*dl/L.z,smoothstep(0.,.25,vPhi)):(.16+1.25*dl*dl);
          float gl=pow(max(dot(N,normalize(L+vec3(0.,0.,1.))),0.),front?26.:14.)*smoothstep(0.,.35,vPhi); c+=vec3(.9,.95,1.)*gl*.06;
          c*=1.-.72*vOver*(1.-smoothstep(0.,.9,vPhi));                                                            // self-shadow under the roll
          o=vec4(c*al,al); }`,
    });

    // ---- paper shards ----
    const sq = new THREE.InstancedBufferGeometry();
    sq.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2)); sq.setIndex([0, 1, 2, 0, 2, 3]);
    sq.instanceCount = SHARDS; sq.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const shardMat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, uniforms, ...blendOver,
      vertexShader: `precision highp float; in vec2 position; out vec2 vQ; flat out vec4 vS; out float vK; ${CURL}
        vec2 h21(float p){ vec3 p3=fract(vec3(p)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
        uniform float uT;
        void main(){ float i=float(gl_InstanceID); vec2 h=h21(i*1.7+2.), h2=h21(i*3.1+9.), h3=h21(i*5.7+4.);
          float y0=mix(-.98,1.02,(i+h.x)/${SHARDS}.); float t0=(.02+.54*clamp((1.08-y0)/2.4,0.,1.))*${DUR.toFixed(1)}+h.y*.12; float t=uT-t0;
          if(t<=0.){ gl_Position=vec4(2.); return; }                                       // born when the rip passes its height
          float sz=mix(.007,.034,h2.x*h2.x); float drag=1.-exp(-t*1.6);
          vec3 c=vec3(slow(y0)+(h2.y-.5)*1.1*drag+.05*sin(t*(5.+6.*h3.x)+i)*min(t,1.),y0+(.25*h3.x+.05)*drag-(.55+.5*h3.y)*t*t-.35*t*sz*8.,.05+.5*h3.x*drag);
          float a1=t*(4.+9.*h3.y)*(h.x>.5?1.:-1.)+i, a2=t*(5.+8.*h.y)+i*2.; vec2 q=position*sz*vec2(1.,.75);
          vec3 P=vec3(q.x*cos(a1)-q.y*sin(a1),q.x*sin(a1)+q.y*cos(a1),0.); P=vec3(P.x,P.y*cos(a2),P.y*sin(a2));
          gl_Position=proj(c+P); vQ=position; vS=vec4(h,h2); vK=sin(a2); }`,
      fragmentShader: `precision highp float; in vec2 vQ; flat in vec4 vS; in float vK; out vec4 o; ${TLIB}
        void main(){ float a=atan(vQ.y,vQ.x), r=length(vQ); float sd=3.+floor(vS.z*2.99); float R=.50/cos(mod(a+vS.w*6.28,6.2832/sd)-3.14159/sd)+.26*(vnoise(vec2(cos(a),sin(a))*1.7+vS.xy*40.)-.5);
          float px=fwidth(r); float al=smoothstep(R+px,R-px,r); if(al<.01) discard;
          float inkm=smoothstep(0.,px*1.5,R-.07-.26*vnoise(vQ*2.+vS.xy*9.)*step(0.,vQ.x)-r); vec3 w=vec3(.9,.885,.86)*(.82+.2*vnoise(vQ*9.));
          vec3 c=mix(w,gl_FrontFacing?vec3(.022,.022,.026):w*.96,inkm); c*=.62+.38*abs(vK)+.25*max(vK,0.); o=vec4(c*al,al); }`,
    });
    const scene = new THREE.Scene();
    const sheet = new THREE.Mesh(geo, sheetMat); sheet.frustumCulled = false; scene.add(sheet);
    const shards = new THREE.Mesh(sq, shardMat); shards.frustumCulled = false; shards.renderOrder = 1; scene.add(shards);
    const cam = new THREE.Camera();

    // ---- composite: B, darkened by the blurred sheet alpha (offset like a light from top-left), then the sheet ----
    const comp = gfx.pass(TLIB + `uniform sampler2D tB,tL,tS; uniform float uS;
      void main(){ vec4 l=texture(tL,vUv); vec2 asp=vec2(uRes.y/uRes.x,1.);
        float near=textureLod(tS,vUv+vec2(.006,.010)*asp,2.5).a, far=textureLod(tS,vUv+vec2(.020,.045)*asp,5.).a;
        float s=1.-(1.-.62*near*uS)*(1.-.55*far*uS);
        vec3 c=toLin(clamp(texture(tB,vUv).rgb,0.,1.))*mix(vec3(1.),vec3(.20,.23,.30),s); c=c*(1.-l.a)+l.rgb; o=vec4(toSrgb(c),1.); }`,
      { tB: null, tL: sheetRT.texture, tS: null, uS: 1 });
    const alphaCopy = gfx.pass("uniform sampler2D tA; void main(){ o=vec4(0.,0.,0.,texture(tA,vUv).a); }", { tA: sheetRT.texture });

    return {
      render({ A, B, p, out }) {
        if (p <= 0) return gfx.copy(A, out);
        if (p >= 1) return gfx.copy(B, out);
        let S = Math.min(1, Math.max(0, (p - 0.02) / 0.54));
        S = S + (smooth5(S) - S) * 0.55;                                           // part eased, part linear: feels pulled by a hand
        S += (0.012 * Math.sin(S * 26) + 0.005 * Math.sin(S * 61)) * Math.sin(Math.PI * S);
        const M = Math.min(1, Math.max(0, (p - 0.37) / 0.625));
        uniforms.uAsp.value = gfx.aspect; uniforms.uP.value = p; uniforms.uT.value = p * DUR;
        uniforms.uYf.value = 1.08 - 2.4 * S;
        uniforms.uW2.value = (gfx.aspect + 0.98) * Math.pow(M, 2.1) * (1.35 - 0.35 * M);
        uniforms.tA.value = A.texture; uniforms.tB.value = B.texture; uniforms.uRes.value.set(sheetRT.width, sheetRT.height);
        gfx.draw(scene, cam, sheetRT, { color: 0x000000, alpha: 0 });
        // alpha-only mip for the soft shadow
        alphaCopy.render(shadowMip.rt);
        comp.u.tB.value = B.texture; comp.u.tS.value = shadowMip.texture; comp.u.uS.value = 1 - sstep(0.88, 0.985, p);
        comp.render(out);
      },
    };
  },
};
