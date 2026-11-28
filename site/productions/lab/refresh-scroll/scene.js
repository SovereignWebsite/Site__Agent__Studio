// The scroll that is re-read from the top, every turn. First half: a scroll hangs in the dark, a light runs down it once
// per turn and the scroll grows by one message each time, so every pass is longer than the last. Second half: the scroll
// lies down and becomes the floor of a chart; each turn leaves one bar as tall as the light's run (a straight slope), and
// the bars then pile into the running total, whose outline is a curve that leaves the frame. Every frame is a pure
// function of t; the only randomness is a hash of position in the shader. Apache-2.0. By c.productions.
export const meta = {
  id: 'refresh-scroll',
  title: 'The scroll that re-reads itself',
  beat: 'One agent wrote 745,255 tokens and re-read 95,247,818 to do it. Every turn a chat re-reads itself from the top, so each message costs a little more than the last: a straight line per message, and a curve in total.',
  seconds: 17,
  sources: [{ title: 'How we refresh a session: the maths and one measured session', url: 'https://studio.agents.sovereignweb.site/productions/session-refresh/how-we-refresh-a-session/' }],
};

const WRITTEN = 745255, REREAD = 95247818;
const L_WRITTEN = 'written', L_REREAD = 're-read', L_LINE = 'one message: a line', L_CURVE = 'all of them: a curve';
const INK = '#f4f1e8', AMBER = '#ffc857', TEAL = '#5fd0c5';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

// N turns. The scroll is N long (one unit per message) and WD wide. Pass k of the light runs k units and takes A + B*k.
const N = 14, TRI = N * (N + 1) / 2, WD = 4.2;
const A0 = 0.35, A_A = 0.1, A_B = (5.3 - N * A_A) / TRI;          // first half: passes end at 5.65 s
const B0 = 8.35, B_A = 0.07, B_B = (3.3 - N * B_A) / TRI;         // second half: bars land between 8.4 and 11.65 s
const T_TURN0 = 6.95, T_TURN1 = 8.3, T_LINE = 11.9, T_STACK = 13.3, STACK_SPAN = 1.7, FLY = 0.5, LAG = 0.03, T_STILL = 16.3;
const BAR_W = 0.8, BAR_D = WD * 0.78;

const sstep = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * u * (u * (u * 6 - 15) + 10); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const mix = (a, b, u) => a + (b - a) * u;
// Where the light is at time t in a run of passes: k is the pass (1..N), f how far through it; k = N + 1 when all are done.
const passAt = (t, t0, a, b) => { let s = t0; if (t < t0) return { k: 0, f: 0 }; for (let k = 1; k <= N; k++) { const d = a + b * k; if (t < s + d) return { k, f: (t - s) / d }; s += d; } return { k: N + 1, f: 0 }; };
const passEnd = (k, t0, a, b) => t0 + a * k + b * k * (k + 1) / 2;
const group3 = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export async function create({ canvas, THREE, reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.autoClear = false;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.5, 400);
  const trash = [], keep = (x) => { trash.push(x); return x; };

  const bgC = document.createElement('canvas'); bgC.width = 256; bgC.height = 256;
  { const c = bgC.getContext('2d'), g = c.createRadialGradient(90, 80, 10, 120, 120, 250); g.addColorStop(0, '#15304a'); g.addColorStop(0.45, '#12263a'); g.addColorStop(1, '#0b1420'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); }
  const bgT = keep(new THREE.CanvasTexture(bgC)); bgT.colorSpace = THREE.SRGBColorSpace; scene.background = bgT;

  // The scroll. Local frame: length along +x (0 at the top, where reading starts), face up (+y), width along z.
  const roll = new THREE.Group(); scene.add(roll);
  const US = { uT: { value: 0 }, uLen: { value: 0 }, uHead: { value: -10 }, uHeadA: { value: 0 }, uTurns: { value: 0 }, uFloor: { value: 0 } };
  const scrollGeo = keep(new THREE.PlaneGeometry(N, WD, 1, 1)); scrollGeo.rotateX(-Math.PI / 2); scrollGeo.translate(N / 2, 0, 0);
  const scrollMat = keep(new THREE.ShaderMaterial({
    uniforms: US, side: THREE.DoubleSide, transparent: true,
    vertexShader: `varying vec2 vP; void main(){ vP=vec2(position.x, 0.5-position.z/${WD.toFixed(2)}); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      precision highp float; varying vec2 vP; uniform float uT, uLen, uHead, uHeadA, uTurns, uFloor;
      const vec3 AMBER=vec3(1.0,0.784,0.341), TEAL=vec3(0.373,0.816,0.773), INK=vec3(0.957,0.945,0.91), WARM=vec3(1.0,0.93,0.78);
      float h1(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){
        float s=vP.x, w=vP.y; if(s>uLen) discard;
        float seg=floor(s), f=fract(s), row=floor(f*4.0), rf=fract(f*4.0);
        // Lines of writing: three strokes per message, broken into words. No letters, only the grain of text.
        float lineEnd=0.35+0.55*h1(vec2(seg,row)+3.0);
        float word=step(0.22,h1(vec2(floor(w*17.0+h1(vec2(seg,row))*5.0),seg*7.0+row)));
        float ink=step(row,2.5)*smoothstep(0.26,0.4,rf)*(1.0-smoothstep(0.6,0.74,rf))*step(0.1,w)*step(w,lineEnd)*word;
        float edge=max(smoothstep(0.04,0.0,w),smoothstep(0.96,1.0,w));
        float tick=smoothstep(0.06,0.0,f)*0.5;
        float reads=clamp(uTurns-seg-1.0,0.0,${N.toFixed(1)})/${N.toFixed(1)};   // how often this message has been re-read
        float d=uHead-s; float glow=uHeadA*(exp(-d*d*9.0)+0.55*step(0.0,d)*exp(-d/(0.5+0.06*uHead)));
        float born=uT-(${A0.toFixed(3)}+${A_A.toFixed(4)}*(seg+1.0)+${A_B.toFixed(6)}*(seg+1.0)*(seg+2.0)*0.5);
        float fresh=(1.0-uFloor)*exp(-max(born,0.0)*2.2)*step(-0.3,born);
        vec3 paper=vec3(0.055,0.105,0.16)+AMBER*0.26*reads*reads+AMBER*0.06*reads+TEAL*0.05*(1.0-reads);
        vec3 col=paper+INK*ink*(0.30+0.25*reads);
        col+=TEAL*(edge*0.35+tick*0.4);
        col+=AMBER*reads*ink*0.35+AMBER*glow*(0.30+1.1*ink)+WARM*glow*glow*0.5;
        col+=TEAL*fresh*(0.35+0.9*ink);
        gl_FragColor=vec4(col,0.96);
      }`,
  }));
  roll.add(new THREE.Mesh(scrollGeo, scrollMat));
  const rodGeo = keep(new THREE.CylinderGeometry(0.11, 0.11, WD + 0.7, 12)); rodGeo.rotateX(Math.PI / 2);
  const rod = new THREE.Mesh(rodGeo, keep(new THREE.MeshBasicMaterial({ color: '#8fa3ad' }))); rod.position.set(-0.05, 0, 0); roll.add(rod);

  // Soft sprites: the reading light, and the mark it leaves where it writes.
  const glowC = document.createElement('canvas'); glowC.width = glowC.height = 128;
  { const c = glowC.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,0.4)'); g.addColorStop(0.55, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); }
  const glowT = keep(new THREE.CanvasTexture(glowC));
  const halo = (color) => { const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowT, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }))); s.renderOrder = 5; scene.add(s); return s; };
  const headHalo = halo(AMBER), headCore = halo('#fff3d6'), writeHalo = halo(TEAL);

  // The bars. One instanced box; position, size and look are set per frame from t alone.
  const M = N + N * (N - 1) / 2;
  const barGeo = keep(new THREE.InstancedBufferGeometry()); { const b = keep(new THREE.BoxGeometry(1, 1, 1)); barGeo.index = b.index; barGeo.setAttribute('position', b.getAttribute('position')); barGeo.setAttribute('normal', b.getAttribute('normal')); }
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(M * 3), 3), aSize = new THREE.InstancedBufferAttribute(new Float32Array(M * 3), 3), aLook = new THREE.InstancedBufferAttribute(new Float32Array(M * 2), 2);
  barGeo.setAttribute('aPos', aPos); barGeo.setAttribute('aSize', aSize); barGeo.setAttribute('aLook', aLook); barGeo.instanceCount = M;
  const barMat = keep(new THREE.ShaderMaterial({
    vertexShader: `attribute vec3 aPos, aSize; attribute vec2 aLook; varying vec3 vL, vN, vS; varying vec2 vK;
      void main(){ vL=position; vN=normal; vS=aSize; vK=aLook; gl_Position=projectionMatrix*viewMatrix*vec4(position*aSize+aPos,1.0); }`,
    fragmentShader: `precision highp float; varying vec3 vL, vN, vS; varying vec2 vK;
      const vec3 AMBER=vec3(1.0,0.784,0.341), WARM=vec3(1.0,0.93,0.78), DEEP=vec3(0.50,0.30,0.07);
      void main(){
        vec3 d=(0.5-abs(vL))*vS+abs(vN)*1000.0; float e=min(d.x,min(d.y,d.z)), edge=1.0-smoothstep(0.0,0.05,e);
        float top=step(0.5,vN.y), front=step(0.5,vN.z), side=step(0.5,abs(vN.x));
        float shade=top*1.0+front*0.74+side*0.4+step(0.5,-vN.z)*0.3;
        vec3 col=mix(DEEP,AMBER,0.35+0.65*vK.x)*shade*(0.82+0.18*(vL.y+0.5));
        col+=WARM*edge*0.22*shade+WARM*vK.y*0.8;
        gl_FragColor=vec4(col,1.0);
      }`,
  }));
  const bars = new THREE.Mesh(barGeo, barMat); bars.frustumCulled = false; scene.add(bars);

  // The straight line over the bars and the curve over the piles: ribbons a few pixels wide, drawn on from the left.
  const UR = { uU: { value: 0.15 }, uPix: { value: 0.03 } };
  const ribbon = (fn, x0, x1, color) => {
    const n = 96, pos = new Float32Array(n * 2 * 3), nxt = new Float32Array(n * 2 * 3), side = new Float32Array(n * 2), prog = new Float32Array(n * 2), idx = [];
    for (let i = 0; i < n; i++) { const u = i / (n - 1), x = mix(x0, x1, u), xb = x + (x1 - x0) / (n - 1); for (let k = 0; k < 2; k++) { const o = (i * 2 + k); pos.set([x, fn(x), 0], o * 3); nxt.set([xb, fn(xb), 0], o * 3); side[o] = k * 2 - 1; prog[o] = u; } if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aNext', new THREE.BufferAttribute(nxt, 3)); g.setAttribute('aSide', new THREE.BufferAttribute(side, 1)); g.setAttribute('aProg', new THREE.BufferAttribute(prog, 1)); g.setIndex(idx);
    const out = [];
    for (const [wide, strength] of [[5.5, 0.22], [1.25, 1.0]]) {
      const m = keep(new THREE.ShaderMaterial({
        uniforms: { uU: UR.uU, uPix: UR.uPix, uWide: { value: wide }, uA: { value: 0 }, uProg: { value: 0 }, uCol: { value: new THREE.Color(color) }, uSoft: { value: wide > 2 ? 1 : 0 } },
        transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: `attribute vec3 aNext; attribute float aSide, aProg; uniform float uU, uPix, uWide; varying float vS, vP;
          void main(){ vec2 p=vec2(position.x,position.y*uU), q=vec2(aNext.x,aNext.y*uU); vec2 t=normalize(q-p), nrm=vec2(-t.y,t.x);
            vS=aSide; vP=aProg; gl_Position=projectionMatrix*viewMatrix*vec4(p+nrm*aSide*uPix*uWide, ${(BAR_D / 2 + 0.03).toFixed(3)}, 1.0); }`,
        fragmentShader: `precision highp float; uniform float uA, uProg, uSoft; uniform vec3 uCol; varying float vS, vP;
          void main(){ float a=1.0-abs(vS); a=mix(smoothstep(0.0,0.45,a),a*a,uSoft); float tip=1.0+2.0*smoothstep(0.04,0.0,uProg-vP)*step(uProg,0.999);
            gl_FragColor=vec4(uCol*tip,a*uA*${strength.toFixed(2)}*step(vP,uProg)); }`,
      }));
      const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 8; scene.add(mesh); out.push(m);
    }
    return (a, p) => { for (const m of out) { m.uniforms.uA.value = a; m.uniforms.uProg.value = p; } };
  };
  const setLine = ribbon((x) => x + 0.5, -0.5, N + 0.9, TEAL);                       // tops of the single bars
  const setCurve = ribbon((x) => (x + 0.5) * (x + 1.5) / 2, -0.5, N + 0.4, '#ffd98a');  // tops of the piles

  // Words and numbers, in screen space.
  const overlay = new THREE.Scene(), ortho = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
  const txC = document.createElement('canvas'), txT = keep(new THREE.CanvasTexture(txC)); txT.colorSpace = THREE.SRGBColorSpace; txT.minFilter = THREE.LinearFilter; txT.generateMipmaps = false;
  const txMesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.MeshBasicMaterial({ map: txT, transparent: true, depthTest: false, depthWrite: false }))); overlay.add(txMesh);
  // Digits sit in fixed cells and the number is set from its right edge, so nothing jitters while it counts.
  const drawNumber = (c, value, xr, y, fs, weight, color, alpha) => {
    c.font = `${weight} ${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = color; c.globalAlpha = alpha;
    const cell = fs * 0.6, comma = fs * 0.27, str = group3(value); let x = xr;
    for (let i = str.length - 1; i >= 0; i--) { const ch = str[i], cw = ch === ',' ? comma : cell; c.fillText(ch, x - cw / 2, y); x -= cw; }
    c.globalAlpha = 1;
  };
  const numberWidth = (value, fs) => { const str = group3(value); let x = 0; for (const ch of str) x += ch === ',' ? fs * 0.27 : fs * 0.6; return x; };
  const label = (c, text, x, y, fs, color, alpha, align = 'left') => { if (alpha <= 0.002) return; c.font = `500 ${fs}px ${FONT}`; try { c.letterSpacing = `${(fs * 0.06).toFixed(1)}px`; } catch (e) { /* older browsers */ } c.textAlign = align; c.textBaseline = 'alphabetic'; c.globalAlpha = alpha; c.shadowColor = 'rgba(8,15,24,0.9)'; c.shadowBlur = fs * 0.4; c.fillStyle = color; c.fillText(text, x, y); c.shadowBlur = 0; c.globalAlpha = 1; try { c.letterSpacing = '0px'; } catch (e) { /* older browsers */ } };

  const qA = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0)));
  const qT = new THREE.Quaternion(), qI = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0);
  const tgtA = new THREE.Vector3(), offA = new THREE.Vector3(), tgtB = new THREE.Vector3(), offB = new THREE.Vector3(), v3 = new THREE.Vector3();
  const project = (x, y, z, w, h) => { v3.set(x, y, z).project(camera); return [(v3.x * 0.5 + 0.5) * w, (0.5 - v3.y * 0.5) * h]; };

  let cw = 0, ch = 0;
  const render = (time, w, h) => {
    const t = reduced ? T_STILL : Math.min(Math.max(time, 0), meta.seconds), portrait = h > w;
    if (w !== cw || h !== ch) { cw = w; ch = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = portrait ? 40 : 36; camera.updateProjectionMatrix(); ortho.right = w; ortho.top = h; ortho.updateProjectionMatrix(); txC.width = w; txC.height = h; txMesh.scale.set(w, h, 1); txMesh.position.set(w / 2, h / 2, 0); }
    const tanH = Math.tan(camera.fov * Math.PI / 360), U = portrait ? 0.55 : 0.2;   // height of one unit of re-reading
    const turn = sstep(T_TURN0, T_TURN1, t);

    // The scroll: hanging and a little turned to the light at first, then laid down as the floor.
    qT.setFromAxisAngle(X, (0.42 + 0.05 * Math.sin(t * 0.9)) * (1 - turn)); qI.copy(qA).multiply(qT); roll.quaternion.identity().slerp(qI, 1 - turn); roll.updateMatrixWorld(true);
    const pa = passAt(t, A0, A_A, A_B), pb = passAt(t, B0, B_A, B_B);
    let len = 0, head = -10, headA = 0, turns = 0, written = 0, reread = 0, writeA = 0;
    if (pa.k >= 1 && pa.k <= N) { const s = pa.k * pa.f; len = Math.max(pa.k - 1, s); head = s; headA = Math.min(1, pa.f * 8) * Math.min(1, (1 - pa.f) * 10 + 0.25); turns = pa.k - 1 + pa.f;
      written = WRITTEN * (pa.k - 1 + clamp01(s - (pa.k - 1))) / N; reread = REREAD * ((pa.k - 1) * pa.k / 2 + s) / TRI; writeA = clamp01(s - (pa.k - 1)); }
    else if (pa.k > N) { len = N; turns = N; written = WRITTEN; reread = REREAD; }
    if (pb.k >= 1 && pb.k <= N) { head = pb.k * pb.f; headA = Math.min(1, pb.f * 8) * 0.9; }
    written = pa.k > N ? WRITTEN : Math.round(written); reread = pa.k > N ? REREAD : Math.round(reread);
    US.uT.value = t; US.uLen.value = len; US.uHead.value = head; US.uHeadA.value = headA; US.uTurns.value = turns; US.uFloor.value = turn;

    // Camera: stand before the hanging scroll, then move round to see the chart, then back away as the total climbs.
    { const D = portrait ? 31 : 34, Hv = 2 * D * tanH, Wv = Hv * w / h;
      tgtA.set((portrait ? 0.2 : 0.27) * Wv, -(portrait ? 0.41 : 0.43) * Hv, 0); offA.set(0, 0, D); }
    const back = sstep(T_STACK - 0.2, 17.6, t), drift = sstep(T_TURN1, T_STACK, t);
    const DB = portrait ? mix(mix(40, 42, drift), 84, back) : mix(mix(15, 16, drift), 32, back), HvB = 2 * DB * tanH, WvB = HvB * w / h;
    tgtB.set(mix(N / 2, N + 1 - 0.45 * WvB, back), (portrait ? 0.27 : 0.23) * HvB, 0); offB.set(DB * (portrait ? 0.05 : 0.1), DB * 0.13, DB);
    tgtA.lerp(tgtB, turn); offA.lerp(offB, turn); camera.position.copy(tgtA).add(offA); camera.up.set(0, 1, 0); camera.lookAt(tgtA); camera.updateMatrixWorld(true);   // labels are placed from these matrices, so they must be this frame's
    UR.uU.value = U; UR.uPix.value = DB * tanH * 2 / h * 2.2;

    // The light itself.
    v3.set(Math.max(head, 0), 0.06, 0); roll.localToWorld(v3);
    const camD = camera.position.distanceTo(v3), hs = camD * 0.16;
    headHalo.position.copy(v3); headHalo.scale.set(hs * 1.5, hs, 1); headHalo.material.opacity = head > -5 ? 0.75 * headA : 0;
    headCore.position.copy(v3); headCore.scale.set(hs * 0.42, hs * 0.26, 1); headCore.material.opacity = head > -5 ? headA : 0;
    writeHalo.position.copy(v3); writeHalo.scale.set(hs * 1.0, hs * 0.7, 1); writeHalo.material.opacity = 0.8 * writeA * (1 - turn);

    // Bars: one per turn, landing as its pass ends. Then every bar sends a copy to each later column.
    let o = 0; const P = aPos.array, S = aSize.array, K = aLook.array;
    const put = (x, y, hgt, bright, flash, show) => { P[o * 3] = x; P[o * 3 + 1] = y + hgt / 2; P[o * 3 + 2] = 0; const g = show ? 1 : 0; S[o * 3] = BAR_W * g; S[o * 3 + 1] = hgt * g; S[o * 3 + 2] = BAR_D * g; K[o * 2] = bright; K[o * 2 + 1] = flash; o++; };
    for (let k = 1; k <= N; k++) {
      const end = passEnd(k, B0, B_A, B_B), d = B_A + B_B * k, p = clamp01((t - (end - d - 0.12)) / (d + 0.12)), fall = (1 - p * p) * (4 + 0.25 * k), since = t - end;
      put(k - 0.5, fall, U * k, 0.55 + 0.45 * k / N, since > 0 ? 0.6 * Math.exp(-since * 7) : 0, p > 0);
    }
    for (let k = 2; k <= N; k++) {
      const ts = T_STACK + (k - 2) / (N - 2) * STACK_SPAN;
      for (let j = 1; j < k; j++) {
        const p = sstep(0, 1, (t - ts - (k - 1 - j) * LAG) / FLY), rest = U * (k * (k + 1) / 2 - j * (j + 1) / 2);
        put(mix(j - 0.5, k - 0.5, p), rest * p + Math.sin(Math.PI * p) * U * k * 0.12, U * j, (0.55 + 0.45 * j / N) * (0.86 + 0.14 * ((j + k) % 2)), 0.25 * Math.sin(Math.PI * p), p > 0);
      }
    }
    aPos.needsUpdate = aSize.needsUpdate = aLook.needsUpdate = true;
    const lineP = sstep(T_LINE, T_LINE + 0.9, t), curveP = clamp01((2 + (t - T_STACK - FLY) / (STACK_SPAN / (N - 2) + LAG) - 0.2) / (N + 0.9));
    setLine(lineP > 0 ? mix(1, 0.75, sstep(T_STACK, T_STACK + 1, t)) : 0, lineP); setCurve(curveP > 0.06 ? 1 : 0, curveP);

    // Words.
    const c = txC.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    const ca = sstep(0.05, 0.6, t) * (1 - sstep(T_TURN0 - 0.1, T_TURN0 + 0.6, t));
    if (ca > 0.002) {
      const lab = portrait ? w * 0.04 : h * 0.04, small = portrait ? w * 0.06 : h * 0.062;
      // What was written sits beside the end of the scroll, where the writing happens, and travels down with it.
      v3.set(Math.max(len, 0.6), 0, -WD / 2); roll.localToWorld(v3); v3.project(camera);
      const tx = (v3.x * 0.5 + 0.5) * w + small * 0.7, ty = (0.5 - v3.y * 0.5) * h;
      label(c, L_WRITTEN, tx, ty - small * 1.0, lab, INK, 0.72 * ca); drawNumber(c, written, tx + numberWidth(written, small), ty + small * 0.1, small, 400, TEAL, ca);
      const big = portrait ? w * 0.165 : h * 0.168, bw = numberWidth(REREAD, big), xr = portrait ? w / 2 + bw / 2 : w * 0.95, yR = portrait ? h * 0.755 : h * 0.3;
      label(c, L_REREAD, xr - bw, yR, lab, INK, 0.72 * ca); drawNumber(c, reread, xr, yR + big * 0.98, big, 300, AMBER, ca);
    }
    const fsL = portrait ? w * 0.046 : h * 0.042;
    { const [x, y] = project(0, 0, WD / 2, w, h); label(c, L_LINE, x, y + fsL * 1.55, fsL, TEAL, sstep(T_LINE + 0.3, T_LINE + 1.0, t) * mix(1, 0.8, back)); }
    { const kk = portrait ? 9.6 : 9.6, [x, y] = project(kk - 0.5, U * kk * (kk + 1) / 2, BAR_D / 2, w, h); label(c, L_CURVE, x - fsL * 0.9, y, fsL * 1.25, AMBER, sstep(15.0, 15.7, t), 'right'); }
    txT.needsUpdate = true;

    renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(overlay, ortho);
  };
  const dispose = () => { for (const x of trash) x.dispose(); renderer.dispose(); };
  return { render, dispose };
}
