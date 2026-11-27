// Royce's cascade (1970): light pours down a run of steps, strictly downhill, and only at the bottom is it found to be
// wrong. The last step cracks and gives way, and what tries to climb back up cannot. Every frame is a pure function of t:
// all motion is computed in the shaders from the time uniform, all randomness is seeded once here. Apache-2.0. By c.productions.
export const meta = {
  id: 'royce-cascade',
  title: 'The cascade that only flows one way',
  beat: 'Royce drew work pouring from step to step, strictly downhill, and warned in the same breath that it invites failure: the mistake only shows at the bottom, where nothing can climb back up to fix it.',
  seconds: 12,
  sources: [{ title: 'Managing the Development of Large Software Systems (Royce, 1970)', url: 'https://www.praxisframework.org/files/royce1970.pdf' }],
};

const QUOTE_A = '“I believe in this concept, but the implementation described above is ';
const QUOTE_B = 'risky and invites failure.”';
const BY = 'Winston Royce, 1970';
const INK = '#f4f1e8', AMBER = '#ffc857', TEAL = '#5fd0c5', CORAL = '#ff6b5e';

// Geometry of the cascade, shared by JS and GLSL. A step is W along x and H down; the flow crosses a tread in TW seconds
// and falls to the next in TF. L is the index of the last step. The run starts out of sight, up and to the left.
const W = 2.0, H = 1.1, T = 0.7, TW = 0.42, TF = 0.28, V = W / T, LIP = V * TW, L = 13, DEPTH = 3.2, THICK = 0.2;
const T_ARR = 5.0, BIRTH0 = T_ARR - L * T, T_BREAK = 6.5, T_QUOTE = 7.8, T_STILL = 10.6;
const N_FLOW = 80000, N_EMBER = 2600;

const GL_CONST = `
const float W=${W.toFixed(3)}, H=${H.toFixed(3)}, T=${T.toFixed(3)}, TW=${TW.toFixed(3)}, TF=${TF.toFixed(3)}, V=${V.toFixed(5)};
const float L=${L.toFixed(1)}, T_ARR=${T_ARR.toFixed(3)}, T_BREAK=${T_BREAK.toFixed(3)};
const vec3 AMBER=vec3(1.0,0.784,0.341), TEAL=vec3(0.373,0.816,0.773), CORAL=vec3(1.0,0.42,0.369), WARM=vec3(1.0,0.93,0.78);
`;

const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const sstep = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * u * (u * (u * 6 - 15) + 10); };
const mix = (a, b, u) => a + (b - a) * u;

export async function create({ canvas, THREE, reduced }) {
  const rnd = mulberry(1970);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.autoClear = false;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.5, 200);
  const trash = [];
  const keep = (x) => { trash.push(x); return x; };
  const U = { uT: { value: 0 }, uFront: { value: 0 }, uPx: { value: 1000 }, uFadeX: { value: -100 }, uCam: { value: new THREE.Vector3() } };

  // Background: the house navy, lighter where the flow comes from.
  const bgC = document.createElement('canvas'); bgC.width = 256; bgC.height = 256;
  { const c = bgC.getContext('2d'); const g = c.createRadialGradient(60, 50, 10, 110, 110, 260); g.addColorStop(0, '#16304a'); g.addColorStop(0.45, '#12263a'); g.addColorStop(1, '#0b1420'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); }
  const bgT = keep(new THREE.CanvasTexture(bgC)); bgT.colorSpace = THREE.SRGBColorSpace; scene.background = bgT;

  // The steps. One shader: dark and cool until the flow front has passed, then lit amber by what runs over them.
  const slabVS = `
    varying vec3 vW; varying vec3 vN; varying vec3 vL;
    void main(){ vL=position; vN=normal; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
  const slabFS = `
    precision highp float;
    ${GL_CONST}
    uniform float uT, uFront, uFail, uGone, uFadeX; uniform vec3 uSize, uCam, uHome;
    varying vec3 vW; varying vec3 vN; varying vec3 vL;
    void main(){
      vec3 d=(0.5-abs(vL))*uSize+abs(vN)*1000.0; float e=min(d.x,min(d.y,d.z));
      float edge=1.0-smoothstep(0.0,0.045,e), soft=1.0-smoothstep(0.0,0.5,e);
      vec3 hw=uHome+vL*uSize;                      // where this point sat before anything broke
      float lit=smoothstep(-0.1,0.7,uFront-hw.x);
      float top=step(0.5,vN.y), lip=step(0.5,vN.x), under=step(0.5,-vN.y), side=step(0.5,abs(vN.z)), back=step(0.5,-vN.x);
      vec3 col=vec3(0.035,0.07,0.115)*(0.55+0.6*top+0.25*side);
      col+=TEAL*(0.16*edge+0.035*soft)*(1.0-lit*0.6);
      float inLane=1.0-smoothstep(1.25,1.5,abs(hw.z));
      float streak=0.5+0.5*sin(hw.z*21.0+sin(hw.z*6.3)*3.0);
      float run=0.6+0.4*sin((hw.x-V*uT)*5.0+hw.z*8.0);
      vec3 flow=mix(AMBER,CORAL,uFail);
      col+=flow*lit*top*inLane*(0.10+0.20*streak*run);
      col+=flow*lit*top*(1.0-inLane)*0.05;
      col+=flow*lit*lip*(0.30+0.25*streak)*inLane;
      col+=flow*lit*side*0.10*(0.4+0.6*smoothstep(-0.5,0.5,vL.y));
      col+=AMBER*under*0.10*smoothstep(0.0,1.0,uFront-(hw.x+W*0.6));
      col+=AMBER*back*0.05*lit;
      col+=flow*lit*edge*0.45;
      col+=CORAL*uFail*(edge*1.3+soft*0.25);
      float dist=length(vW-uCam); float fog=smoothstep(16.0,62.0,dist)*0.85;
      col=mix(col,vec3(0.062,0.125,0.195),fog);
      col*=1.0-uGone;
      gl_FragColor=vec4(col,smoothstep(uFadeX-4.0,uFadeX,hw.x));
    }`;
  const box = keep(new THREE.BoxGeometry(1, 1, 1));
  const slabMat = (size, home) => keep(new THREE.ShaderMaterial({ vertexShader: slabVS, fragmentShader: slabFS, transparent: true, uniforms: { uT: U.uT, uFront: U.uFront, uCam: U.uCam, uFadeX: U.uFadeX, uFail: { value: 0 }, uGone: { value: 0 }, uSize: { value: size.clone() }, uHome: { value: home.clone() } } }));
  for (let j = 0; j < L; j++) {
    const size = new THREE.Vector3(W, THICK, DEPTH), home = new THREE.Vector3(j * W + LIP - W / 2, -j * H - THICK / 2, 0);
    const m = new THREE.Mesh(box, slabMat(size, home)); m.scale.copy(size); m.position.copy(home); scene.add(m);
  }
  // The last step is made of pieces from the start; nobody can see the joins until it gives way.
  const shards = [];
  { const x0 = (L - 1) * W + LIP, len = W * 1.25, xs = [0, 0.27, 0.58, 1], zs = [[0, 0.44, 1], [0, 0.6, 1], [0, 0.38, 1]];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) {
      const sx = (xs[a + 1] - xs[a]) * len, sz = (zs[a][b + 1] - zs[a][b]) * DEPTH;
      const size = new THREE.Vector3(sx, THICK, sz), home = new THREE.Vector3(x0 + (xs[a] + xs[a + 1]) / 2 * len, -L * H - THICK / 2, -DEPTH / 2 + (zs[a][b] + zs[a][b + 1]) / 2 * DEPTH);
      const m = new THREE.Mesh(box, slabMat(size, home)); m.scale.copy(size); m.position.copy(home); scene.add(m);
      shards.push({ m, home, size, delay: rnd() * 0.22 + a * 0.05, vel: new THREE.Vector3((a - 0.8) * 0.3 + rnd() * 0.15, -0.12 - rnd() * 0.2, (b - 0.5) * 0.45 + (rnd() - 0.5) * 0.2), axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), spin: 0.15 + rnd() * 0.3, g: 0.04 + rnd() * 0.05 });
    } }

  // The flow. Each particle is born once, runs the whole cascade and never returns; its path is a function of (t - birth).
  const flowGeo = keep(new THREE.BufferGeometry());
  { const birth = new Float32Array(N_FLOW), seed = new Float32Array(N_FLOW * 4), pos = new Float32Array(N_FLOW * 3), span = meta.seconds + 0.5 - BIRTH0;
    for (let i = 0; i < N_FLOW; i++) { birth[i] = BIRTH0 + (i + rnd()) / N_FLOW * span; for (let k = 0; k < 4; k++) seed[i * 4 + k] = rnd(); }
    flowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); flowGeo.setAttribute('aBirth', new THREE.BufferAttribute(birth, 1)); flowGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4)); }
  const flowMat = keep(new THREE.ShaderMaterial({
    uniforms: { uT: U.uT, uPx: U.uPx, uCam: U.uCam, uFadeX: U.uFadeX }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      ${GL_CONST}
      attribute float aBirth; attribute vec4 aSeed; uniform float uT, uPx, uFadeX; uniform vec3 uCam;
      varying vec3 vCol; varying float vA;
      void main(){
        float age=uT-aBirth, vis=step(0.0,age);
        float lane=(aSeed.x*2.0-1.0)*1.3;
        float kf=min(floor(age/T),L-1.0), u=age-kf*T, s=max(u-TW,0.0);
        float ta=aBirth+L*T, tau=uT-ta;
        float mist=step(0.86,aSeed.w);
        vec3 p; float fail=0.0, a=1.0, size=0.05+0.05*aSeed.y+0.10*pow(aSeed.z,10.0);
        if(tau>0.0 && ta<T_BREAK){
          // It landed on the last step, and there is nowhere further to go: it piles up.
          float q=clamp((ta-T_ARR)/(T_BREAK-T_ARR),0.0,1.0);
          float ang=aSeed.z*6.2832, rad=sqrt(aSeed.w);
          float hgt=(0.05+0.95*pow(q,0.7))*(1.0-rad*rad)*(0.4+0.6*aSeed.y);
          vec3 home=vec3(L*W+1.0+cos(ang)*rad*1.0, -L*H+0.04+hgt, lane*0.35+sin(ang)*rad*1.05);
          float g=1.0-exp(-tau*5.0);
          p=mix(vec3(L*W+V*min(tau,0.2),-L*H+0.04,lane),home,g);
          p.y+=0.25*aSeed.y*exp(-tau*6.0)*abs(sin(tau*18.0));
          // Some of it throws itself back at the step above, and falls short every time.
          float leaper=step(aSeed.x*7.0-floor(aSeed.x*7.0),0.16);
          float lp=fract(max(tau-0.35,0.0)/(0.85+aSeed.y*0.5)), on=leaper*step(0.35,tau)*(1.0-smoothstep(T_BREAK,T_BREAK+0.25,uT));
          float up=4.0*lp*(1.0-lp);
          p+=on*vec3(-1.5*sin(lp*3.1416)*(0.5+0.5*aSeed.z), up*H*(0.45+0.5*aSeed.w), 0.0);
          fail=smoothstep(0.0,0.5,tau)*(0.55+0.45*q);
          a=0.4; size*=mix(1.0,1.35,on);
          // Then the step gives way and takes all of it down.
          float dt=max(uT-T_BREAK-aSeed.y*0.3,0.0);
          vec3 vel=vec3(cos(ang)*rad*1.3, 0.9*aSeed.w, sin(ang)*rad*1.6);
          p+=vel*dt*(1.0/(1.0+dt*0.9)); p.y-=1.5*dt*dt/(1.0+dt*0.5);
          fail=mix(fail,1.0,smoothstep(0.0,0.3,dt));
          a*=1.0-smoothstep(1.5,4.5,-(p.y+L*H));
        } else {
          float fy=s/TF;
          p=vec3(V*age,-kf*H-H*fy*fy,lane+0.04*sin(age*5.0+aSeed.z*40.0));
          float onTread=step(u,TW);
          p.y+=0.035+onTread*(0.02+0.26*aSeed.y*aSeed.y*exp(-u*6.0)*abs(sin(u*20.0+aSeed.z)))*step(0.5,kf);
          p.x+=(aSeed.z-0.5)*0.10;
          p+=mist*(1.0-onTread)*vec3((aSeed.y-0.5)*0.35,(aSeed.z-0.5)*0.3,0.0);
          float below=-(p.y+L*H);
          // Past the last step there is only the drop. Slow the far fall so the eye can follow it.
          float deep=max(below,0.0); float D=deep/(1.0+deep*0.14); p.y=-L*H-D+min(below,0.0)*-1.0;
          p.x-=deep*0.035*(1.0+aSeed.y);
          p.z+=deep*(aSeed.x-0.5)*0.3; p.x+=deep*(aSeed.w-0.5)*0.22;
          fail=smoothstep(0.1,1.6,below);
          a=mix(1.0,0.45,mist)*(1.0-smoothstep(1.4,4.3,D));
          a*=(mix(0.75,1.0,onTread)+0.35*(1.0-onTread))*mix(1.0,0.36,fail);
        }
        float head=1.0-smoothstep(0.0,0.5,aBirth-(${BIRTH0.toFixed(3)}));
        size*=1.0+head*0.4;
        vCol=mix(mix(AMBER*vec3(1.0,0.92,0.8),WARM,pow(aSeed.z,6.0)*0.8+head*0.5),CORAL,fail);
        vec4 mv=viewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
        float dist=-mv.z; float fog=smoothstep(16.0,62.0,dist);
        float px=size*uPx/dist; gl_PointSize=clamp(px,1.5,48.0);
        vA=vis*a*(0.26+0.6*pow(aSeed.z,6.0)+head*0.15)*(1.0-fog*0.8)*min(1.0,px/1.5)*smoothstep(uFadeX-4.0,uFadeX,p.x);
      }`,
    fragmentShader: `
      precision highp float; varying vec3 vCol; varying float vA;
      void main(){ float d=length(gl_PointCoord-0.5)*2.0; float a=1.0-smoothstep(0.0,1.0,d); gl_FragColor=vec4(vCol,a*a*vA); }`,
  }));
  const flow = new THREE.Points(flowGeo, flowMat); flow.frustumCulled = false; flow.renderOrder = 2; scene.add(flow);

  // After the break: sparks that rise out of the drop towards the last whole step, stall short of it and fall again.
  const emberGeo = keep(new THREE.BufferGeometry());
  { const seed = new Float32Array(N_EMBER * 4), pos = new Float32Array(N_EMBER * 3); for (let i = 0; i < N_EMBER * 4; i++) seed[i] = rnd();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); emberGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4)); }
  const emberMat = keep(new THREE.ShaderMaterial({
    uniforms: { uT: U.uT, uPx: U.uPx }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      ${GL_CONST}
      attribute vec4 aSeed; uniform float uT, uPx; varying vec3 vCol; varying float vA;
      void main(){
        float per=2.0+aSeed.x*1.2, ph=fract((uT-T_BREAK)/per+aSeed.y), r=ph*2.1;
        float lane=(aSeed.z*2.0-1.0)*1.25, reach=0.55+0.45*aSeed.w, f=max(r-1.0,0.0);
        vec3 start=vec3(L*W+0.3+aSeed.x*1.0,-L*H-1.3-aSeed.y*1.4,lane);
        vec3 goal=vec3((L-1.0)*W+0.1+aSeed.z*1.0,-(L-1.0)*H-${(THICK + 0.08).toFixed(3)},lane*0.9);
        vec3 p=start; p.xz+=(goal.xz-start.xz)*reach*(min(r,1.0)-0.35*f); p.y+=(goal.y-start.y)*reach*(2.0*r-r*r);
        float a=smoothstep(0.0,0.08,ph)*(1.0-smoothstep(0.75,1.0,ph))*smoothstep(0.3,1.4,uT-T_BREAK);
        vCol=mix(CORAL,vec3(1.0,0.62,0.5),aSeed.x*0.5*(1.0-min(f,1.0)));
        vec4 mv=viewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
        float px=(0.07+0.09*aSeed.x)*uPx/(-mv.z); gl_PointSize=clamp(px,2.0,40.0); vA=a;
      }`,
    fragmentShader: `
      precision highp float; varying vec3 vCol; varying float vA;
      void main(){ float d=length(gl_PointCoord-0.5)*2.0; float a=1.0-smoothstep(0.0,1.0,d); gl_FragColor=vec4(vCol,a*a*vA); }`,
  }));
  const embers = new THREE.Points(emberGeo, emberMat); embers.frustumCulled = false; embers.renderOrder = 3; scene.add(embers);

  // Cheap glow: one soft sprite where each fall lands, lit only once the flow has got there.
  const glowC = document.createElement('canvas'); glowC.width = glowC.height = 128;
  { const c = glowC.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.35)'); g.addColorStop(0.6, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); }
  const glowT = keep(new THREE.CanvasTexture(glowC));
  const halo = (color) => { const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowT, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }))); scene.add(s); return s; };
  const halos = []; for (let j = 1; j < L; j++) { const s = halo(AMBER); s.position.set(j * W + 0.25, -j * H + 0.2, 0); s.scale.set(4.6, 2.6, 1); halos.push({ s, j }); }
  const failHalo = halo(CORAL); failHalo.position.set(L * W + 0.9, -L * H + 0.4, 0);
  const voidHalo = halo(CORAL); voidHalo.position.set(L * W + 0.9, -L * H - 2.6, 0);

  // "1970", standing in the dark behind the steps the flow is crossing as the scene opens.
  const yearC = document.createElement('canvas'); yearC.width = 1024; yearC.height = 384;
  { const c = yearC.getContext('2d'); c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '200 300px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'; try { c.letterSpacing = '18px'; } catch (e) { /* older browsers */ } c.fillText('1970', 512, 205); }
  const yearT = keep(new THREE.CanvasTexture(yearC)); yearT.colorSpace = THREE.SRGBColorSpace; yearT.anisotropy = 4;
  const year = new THREE.Mesh(keep(new THREE.PlaneGeometry(8, 3)), keep(new THREE.MeshBasicMaterial({ map: yearT, transparent: true, opacity: 0, depthWrite: false }))); scene.add(year);

  // The quote, drawn in screen space over the finished picture.
  const overlay = new THREE.Scene(), ortho = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
  const quoteC = document.createElement('canvas'), quoteT = keep(new THREE.CanvasTexture(quoteC)); quoteT.colorSpace = THREE.SRGBColorSpace; quoteT.minFilter = THREE.LinearFilter; quoteT.generateMipmaps = false;
  const quoteMat = keep(new THREE.MeshBasicMaterial({ map: quoteT, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  const quote = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), quoteMat); overlay.add(quote);
  let quoteBox = { x: 0, y: 0, w: 1, h: 1 };
  const drawQuote = (w, h) => {
    const portrait = h > w, bw = Math.round(portrait ? w * 0.84 : w * 0.43), fs = Math.round(portrait ? w * 0.057 : h * 0.05), lh = Math.round(fs * 1.34), SS = 2;
    const c = quoteC.getContext('2d'), fontQ = `400 ${fs}px Georgia, "Times New Roman", serif`;
    c.font = fontQ;
    const words = QUOTE_A.trim().split(' ').map((x) => [x, INK]).concat(QUOTE_B.split(' ').map((x) => [x, CORAL]));
    const lines = [[]]; let lw = 0; const sp = c.measureText(' ').width;
    for (const [word, col] of words) { const ww = c.measureText(word).width; if (lw > 0 && lw + sp + ww > bw) { lines.push([]); lw = 0; } const x = lw > 0 ? lw + sp : 0; lines[lines.length - 1].push([word, col, x]); lw = x + ww; }
    const fb = Math.round(fs * 0.5), bh = lines.length * lh + Math.round(fs * 0.9) + fb * 2;
    quoteC.width = bw * SS; quoteC.height = bh * SS; c.setTransform(SS, 0, 0, SS, 0, 0); c.clearRect(0, 0, bw, bh); c.textBaseline = 'alphabetic'; c.font = fontQ;
    c.shadowColor = 'rgba(8,15,24,0.9)'; c.shadowBlur = fs * 0.5;
    lines.forEach((ln, i) => { for (const [word, col, x] of ln) { c.fillStyle = col; c.fillText(word, x, (i + 0.8) * lh); } });
    const yb = lines.length * lh + Math.round(fs * 0.95);
    c.shadowBlur = 0; c.fillStyle = AMBER; c.fillRect(0, yb - fb * 0.36 - 1, fs * 0.9, 2);
    c.font = `600 ${fb}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; try { c.letterSpacing = '0.06em'; } catch (e) { /* older browsers */ } c.fillText(BY, fs * 1.25, yb);
    quoteT.needsUpdate = true;
    quoteBox = portrait ? { x: w * 0.08, y: h * 0.065, w: bw, h: bh } : { x: w * 0.525, y: h * 0.085, w: bw, h: bh };
  };

  // Camera: follow the front downhill, crouch at the last step while it goes wrong, then stand back and see the whole of it.
  const stair = (s, out) => out.set(s * W + 0.3, -s * H, 0);
  const tgt = new THREE.Vector3(), off = new THREE.Vector3(), a3 = new THREE.Vector3(), b3 = new THREE.Vector3(), c3 = new THREE.Vector3();
  const place = (t, portrait) => {
    // The camera waits downstream and backs away more slowly than the flow descends, so the front comes to meet it.
    const u = Math.min(1, t / 5.6), sTrack = mix(6.7, L + 0.25, u * u * (3 - 2 * u) * 0.75 + u * 0.25);
    const close = sstep(0.3, 5.6, t), wide = sstep(6.75, 8.9, t), drift = t - 8;
    stair(portrait ? sTrack - 0.9 * (1 - u) : sTrack, a3); a3.y += 0.25;
    if (portrait) {
      off.set(mix(9.0, 5.6, close), mix(4.2, 1.6, close), mix(8.0, 8.6, close));
      b3.set(L * W - 3.7, -L * H + 1.3, 0); c3.set(18 + drift * 0.3, 7, 15);
    } else {
      off.set(mix(7.5, 3.6, close), mix(3.6, 0.9, close), mix(8.5, 7.4, close));
      b3.set(L * W - 3.4, -L * H + 0.9, 0); c3.set(2.5 + drift * 0.5, 2.4, 17.5);
    }
    tgt.lerpVectors(a3, b3, wide); off.lerp(c3, wide);
    camera.position.copy(tgt).add(off); camera.up.set(0, 1, 0); camera.lookAt(tgt);
  };

  let cw = 0, ch = 0;
  const q4 = new THREE.Quaternion();
  const render = (time, w, h) => {
    const t = reduced ? T_STILL : Math.min(Math.max(time, 0), meta.seconds), portrait = h > w;
    if (w !== cw || h !== ch) { cw = w; ch = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = portrait ? 40 : 36; camera.updateProjectionMatrix(); ortho.right = w; ortho.top = h; ortho.updateProjectionMatrix(); drawQuote(w, h); U.uPx.value = h / (2 * Math.tan(camera.fov * Math.PI / 360)); }
    place(t, portrait); U.uFadeX.value = portrait ? mix(-100, (L - 2.9) * W, sstep(6.6, 7.9, t)) : -100; U.uCam.value.copy(camera.position); U.uT.value = t; U.uFront.value = V * (t - BIRTH0);
    const sFront = (t - BIRTH0) / T, fail = sstep(T_ARR + 0.15, T_BREAK, t), since = t - T_BREAK;
    for (const { s, j } of halos) s.material.opacity = 0.2 * sstep(j - 0.2, j + 0.6, sFront);
    failHalo.material.opacity = Math.min(1, 0.55 * fail * (since < 0 ? 1 : Math.exp(-since * 1.6)) + (since > 0 ? 0.9 * Math.exp(-since * 5) : 0)); const fs = 3.5 + 2.5 * fail + (since > 0 ? 5 * Math.exp(-since * 4) : 0); failHalo.scale.set(fs * 1.4, fs, 1);
    voidHalo.material.opacity = 0.22 * sstep(0.2, 1.6, since); voidHalo.scale.set(7, 8, 1);
    for (const sh of shards) {
      const dt = Math.max(0, since - sh.delay), u = sh.m.material.uniforms; u.uFail.value = fail; u.uGone.value = sstep(4, 9, dt) * 0.5;
      const shrink = 1 - 0.035 * fail; sh.m.scale.set(sh.size.x * shrink, sh.size.y, sh.size.z * shrink);
      sh.m.position.copy(sh.home); sh.m.position.y -= 0.05 * fail * fail; sh.m.position.addScaledVector(sh.vel, dt); sh.m.position.y -= sh.g * dt * dt;
      sh.m.quaternion.copy(q4.setFromAxisAngle(sh.axis, sh.spin * dt + 0.02 * fail));
    }
    // Held far behind the steps, off to the side the flow has not reached yet, drifting slowly as the camera descends.
    a3.set(portrait ? 1.3 - t * 0.1 : 4.6 - t * 0.25, portrait ? 4.9 : 2.9, -19).applyQuaternion(camera.quaternion); year.position.copy(camera.position).add(a3); year.quaternion.copy(camera.quaternion);
    year.material.opacity = 0.5 * sstep(0.1, 0.9, t) * (1 - sstep(3.4, 4.6, t)); year.scale.setScalar(portrait ? 0.5 : 0.85);
    const qa = sstep(T_QUOTE, T_QUOTE + 0.7, t); quoteMat.opacity = qa;
    quote.scale.set(quoteBox.w, quoteBox.h, 1); quote.position.set(quoteBox.x + quoteBox.w / 2, h - quoteBox.y - quoteBox.h / 2 - (1 - qa) * h * 0.012, 0);
    renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(overlay, ortho);
  };
  const dispose = () => { for (const x of trash) x.dispose(); renderer.dispose(); };
  return { render, dispose };
}
