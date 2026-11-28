// The shelf: a heavy amber light at a desk of half-made tools sets three thin pages on a shelf, then rolls up with its
// long scroll into a dim shape; a small new light is spoken into the empty room and reads the shelf, not the scroll.
// Composed for 720x1280 first; 1280x720 is a second layout of the same objects.
// A lab scene component (see ../harness.js for the contract). render(t) is a pure function of t. Apache-2.0. By c.productions.
export const meta = {
  id: 'refresh-shelf',
  title: 'The shelf, not the scroll',
  beat: 'What matters is moved out of the old session onto a shelf of three pages, and the new session starts from the shelf, never from the old transcript.',
  seconds: 17,
  sources: [
    { title: 'How we refresh a session, sections 2, 3 and 5', url: 'https://studio.agents.sovereignweb.site/productions/session-refresh/how-we-refresh-a-session/' },
  ],
};

const LABELS = ['restart', 'role', 'now'], LINE = 'Read restart.md and continue.';
const LAND = [2.5, 4.0, 5.5], READ = [11.5, 13.0, 14.5], T_ROLL = 6.5, ROLL_LEN = 1.9, T_LINE = 9.45, T_BORN = 10.25, T_GO = 10.45, T_AT = 10.8, T_ON = 11.05, STILL_T = 15.3;
const DESK_Y = 1.5, RIB_N = 720, RIB_W = 0.46, TAU = Math.PI * 2;
const AMBER = [1.0, 0.784, 0.341], TEAL = [0.373, 0.816, 0.773], INK = [0.957, 0.945, 0.91];
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// Two layouts of the same objects. Portrait stacks: shelf as a ladder up the right, desk below, scroll at the foot.
const LAY = {
  port: { fov: 42, cam1: { p: [0, 4.5, 15.3], l: [0, 3.95, 0] },
    cams: [{ p: [-0.42, 4.0, 14.1], l: [-0.42, 3.55, 0] }, { p: [2.0, 5.6, 11.0], l: [2.0, 5.5, 0] }, { p: [1.1, 4.0, 13.6], l: [1.1, 3.65, 0] }],
    desk: { x: -0.75, w: 3.4 }, old: [-0.95, 3.3, 0], slots: [[2.0, 2.8], [2.0, 4.55], [2.0, 6.3]], slotZ: -0.5, pw: 1.3, ph: 1.65,
    planks: [[2.1, 2.8, 2.0], [2.1, 4.55, 2.0], [2.1, 6.3, 2.0]], ups: [1.15, 3.05], upH: 8.2, roll: [1.4, 0, 0.75], d: 1, mx: 0.2,
    text: { x0: -3.08, x1: 0.28, y: 1.85, z: 0.9 }, born: [0.48, 1.82, 0.9], hold: [1.42, 1.78, 1.0], readOff: [1.3, 1.0, 0.7], oldSize: 6.6, lineOut: 1, readSide: 1 },
  land: { fov: 30, cam1: { p: [2.2, 2.9, 11], l: [2.2, 2.15, 0] },
    cams: [{ p: [0.2, 2.7, 13.8], l: [0.2, 2.0, 0] }, { p: [0.2, 2.7, 13.8], l: [0.2, 2.0, 0] }, { p: [0.2, 2.7, 13.8], l: [0.2, 2.0, 0] }],
    desk: { x: 0.6, w: 4.4 }, old: [0.4, 3.1, 0], slots: [[3.8, 2.9], [4.95, 2.9], [6.1, 2.9]], slotZ: -0.6, pw: 1.0, ph: 1.35,
    planks: [[5.0, 2.9, 3.7]], ups: [3.2, 6.8], upH: 4.7, roll: [-2.1, 0, 0.7], d: -1, mx: -2.6,
    text: { x0: -5.85, x1: -3.0, y: 2.3, z: 0.5 }, born: [-2.82, 2.27, 0.5], hold: [-2.0, 2.2, 0.8], readOff: [-0.3, 1.75, 0.6], oldSize: 5.2, lineOut: 0.5, readSide: 0 },
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const FOG = `float f = 1.0 - exp(-pow(max(dist - 9.0, 0.0) * 0.03, 1.4)); col = mix(col, vec3(0.062, 0.128, 0.195), f);`;
const LIT_VERT = `varying vec3 vWp; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWp = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const LIT_FRAG = `precision highp float;
uniform vec3 uLp[3]; uniform vec3 uLc[3]; uniform vec3 uCam; uniform vec3 uAlb; uniform float uOp; uniform float uFloor;
varying vec3 vWp;
void main(){
  vec3 n = normalize(cross(dFdx(vWp), dFdy(vWp))); vec3 V = uCam - vWp; float dist = length(V); if (dot(n, V) < 0.0) n = -n;
  vec3 lit = vec3(0.055, 0.085, 0.125) * (0.6 + 0.4 * n.y);
  for (int i = 0; i < 3; i++) { vec3 d = uLp[i] - vWp; float a = 1.0 / (1.0 + dot(d, d) * 0.16); lit += uLc[i] * a * (0.3 + 0.7 * max(dot(n, normalize(d)), 0.0)); }
  vec3 col = uAlb * lit;
  if (uFloor > 0.5) { vec2 g = abs(fract(vWp.xz * 0.5) - 0.5); float line = smoothstep(0.012, 0.0, min(g.x, g.y)) * exp(-dist * 0.05); col += uAlb * lit * line * 0.35; }
  ${FOG}
  gl_FragColor = vec4(col, uOp);
}`;

export async function create({ canvas, THREE, reduced }) {
  const V3 = THREE.Vector3, rnd = prng(20261128);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 9 / 16, 0.3, 400); scene.add(camera);
  const disposables = [], keep = (x) => { disposables.push(x); return x; };
  const shared = { uLp: { value: [new V3(), new V3(), new V3()] }, uLc: { value: [new V3(), new V3(), new V3()] }, uCam: { value: new V3() } };
  const litMat = (alb, floor = 0) => keep(new THREE.ShaderMaterial({ vertexShader: LIT_VERT, fragmentShader: LIT_FRAG, side: THREE.DoubleSide, transparent: true,
    uniforms: { ...shared, uAlb: { value: new V3(...alb) }, uOp: { value: 1 }, uFloor: { value: floor } } }));
  const unitBox = keep(new THREE.BoxGeometry(1, 1, 1)), unitPlane = keep(new THREE.PlaneGeometry(1, 1));
  const box = (mat, parent = scene) => { const m = new THREE.Mesh(unitBox, mat); parent.add(m); return m; };

  // backdrop
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(300, 24, 12)), keep(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `precision highp float; varying vec3 vD; void main(){ float y = normalize(vD).y;
      vec3 col = mix(vec3(0.062, 0.128, 0.195), vec3(0.043, 0.078, 0.125), smoothstep(0.0, 0.45, abs(y))); gl_FragColor = vec4(col, 1.0); }` })));
  sky.renderOrder = -10; scene.add(sky);
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(400, 400)), litMat([0.30, 0.38, 0.48], 1)); floor.rotation.x = -Math.PI / 2; floor.material.transparent = false; scene.add(floor);

  // the desk and its half-made tools
  const deskG = new THREE.Group(); scene.add(deskG);
  const deskMat = litMat([0.34, 0.30, 0.27]), toolMat = litMat([0.42, 0.40, 0.40]);
  const slab = box(deskMat, deskG), legs = [0, 1, 2, 3].map(() => box(deskMat, deskG));
  const shapes = [new THREE.BoxGeometry(1, 1, 1), new THREE.IcosahedronGeometry(0.7, 0), new THREE.ConeGeometry(0.6, 1.2, 6), new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
    new THREE.TorusGeometry(0.55, 0.2, 6, 10), new THREE.OctahedronGeometry(0.75, 0), new THREE.TetrahedronGeometry(0.8, 0), new THREE.BoxGeometry(1.5, 0.35, 0.7)].map(keep);
  const TOOLS = 15, tools = [], edgeMats = [0, 1, 2].map(() => keep(new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, depthWrite: false })));
  for (let i = 0; i < TOOLS; i++) {
    const g = shapes[i % shapes.length], s = 0.26 + rnd() * 0.24, grp = i % 3, eg = keep(new THREE.EdgesGeometry(g, 20));
    const total = eg.attributes.position.count, part = Math.max(8, Math.floor(total * (0.45 + rnd() * 0.4) / 2) * 2); eg.setDrawRange(0, Math.min(total, part));
    const holder = new THREE.Group(), solid = new THREE.Mesh(g, toolMat), lines = new THREE.LineSegments(eg, edgeMats[grp]);
    solid.visible = i % 5 !== 3; holder.add(solid, lines); holder.scale.setScalar(s); holder.rotation.set(rnd() * 0.5, rnd() * TAU, rnd() * 0.5);
    deskG.add(holder); tools.push({ holder, fx: ((i + 0.5) / TOOLS) * 2 - 1 + (rnd() - 0.5) * 0.06, fz: (rnd() - 0.5) * 1.3, s, grp, wp: new V3() });
  }

  // the shelf
  const shelfMat = litMat([0.36, 0.44, 0.50]); shelfMat.transparent = false;
  const planks = [0, 1, 2].map(() => box(shelfMat)), ups = [0, 1].map(() => box(shelfMat));

  // the three pages: r = text lines, g = border, b = label
  const pages = LABELS.map((label, i) => {
    const c = document.createElement('canvas'); c.width = 260; c.height = 340; const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 260, 340); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = '#00ff00'; x.lineWidth = 5; x.strokeRect(5, 5, 250, 330);
    x.fillStyle = '#0000ff'; x.font = `600 58px ${FONT}`; x.textBaseline = 'alphabetic'; x.fillText(label, 26, 82);
    x.fillStyle = '#ff0000'; for (let r = 0; r < 6; r++) x.fillRect(26, 122 + r * 34, 208 * (r === 5 ? 0.45 : 0.72 + rnd() * 0.28), 10);
    const tex = keep(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 4;
    const u = { uTex: { value: tex }, uTeal: { value: 0 }, uFlash: { value: 0 }, uRead: { value: 0 }, uBright: { value: 1 } };
    const mat = keep(new THREE.ShaderMaterial({ side: THREE.DoubleSide, transparent: true, uniforms: u,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `precision highp float; uniform sampler2D uTex; uniform float uTeal, uFlash, uRead, uBright; varying vec2 vUv;
        void main(){ vec3 m = texture2D(uTex, vUv).rgb; vec3 pc = mix(vec3(${AMBER}), vec3(${TEAL}), uTeal);
          float edge = 1.0 - uRead * 1.12 + 0.06, on = step(0.001, uRead), band = exp(-pow((vUv.y - edge) / 0.045, 2.0)) * on * step(uRead, 0.995);
          float done = mix(0.5, 1.0, on * smoothstep(edge - 0.02, edge + 0.02, vUv.y));
          vec3 col = pc * (0.13 + 0.22 * uFlash + 0.07 * on) + pc * m.r * done * 0.95 + pc * m.g * (0.75 + 0.25 * on) + vec3(${INK}) * m.b * 1.05 + mix(pc, vec3(${INK}), 0.5) * band * 0.9;
          gl_FragColor = vec4(col * uBright, 1.0); }` }));
    const mesh = new THREE.Mesh(unitPlane, mat); mesh.renderOrder = 22; scene.add(mesh); return { mesh, u };
  });

  // glows (billboards)
  const glow = (col, core, halo = 0.5) => { const u = { uCol: { value: new V3(...col) }, uA: { value: 1 }, uCore: { value: core }, uH: { value: halo } };
    const m = new THREE.Mesh(unitPlane, keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: u,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `precision highp float; uniform vec3 uCol; uniform float uA, uCore, uH; varying vec2 vUv;
        void main(){ float d = length(vUv - 0.5) * 2.0; float g = (exp(-d * d * 5.0) * uH + exp(-d * d * uCore) * 1.6 + 0.10 / (1.0 + d * d * 30.0)) * smoothstep(1.0, 0.55, d);
          gl_FragColor = vec4(mix(uCol, vec3(1.0, 0.98, 0.92), exp(-d * d * uCore * 2.5)) * g * uA, 1.0); }` })));
    m.renderOrder = 20; scene.add(m); return { m, u }; };
  const oldGlow = glow([1.0, 0.72, 0.27], 22, 0.85), newGlow = glow([0.90, 0.97, 0.93], 34, 0.42), pageGlows = pages.map(() => glow(TEAL, 3));
  for (const g of pageGlows) g.m.renderOrder = 1; newGlow.m.renderOrder = 30;

  // the scroll: one long ribbon, unrolled along a path or wound into a standing roll
  const ribPos = new Float32Array((RIB_N + 1) * 6), ribUv = new Float32Array((RIB_N + 1) * 4), ribIdx = [];
  for (let j = 0; j <= RIB_N; j++) { ribUv.set([j / RIB_N, -1, j / RIB_N, 1], j * 4); if (j < RIB_N) { const a = j * 2; ribIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const ribGeo = keep(new THREE.BufferGeometry()); ribGeo.setAttribute('position', new THREE.BufferAttribute(ribPos, 3)); ribGeo.setAttribute('aUv', new THREE.BufferAttribute(ribUv, 2)); ribGeo.setIndex(ribIdx);
  const ribU = { ...shared, uLen: { value: 60 }, uGlow: { value: 1 }, uRolled: { value: 0 } };
  const ribbon = new THREE.Mesh(ribGeo, keep(new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: ribU,
    vertexShader: 'attribute vec2 aUv; varying vec2 vUv; varying vec3 vWp; void main(){ vUv = aUv; vWp = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }',
    fragmentShader: `precision highp float; uniform vec3 uLp[3]; uniform vec3 uLc[3]; uniform vec3 uCam; uniform float uLen, uGlow, uRolled; varying vec2 vUv; varying vec3 vWp;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ float s = vUv.y * 0.5 + 0.5, x = vUv.x * uLen * 3.2, row = floor(s * 7.0), fr = fract(s * 7.0);
        float hv = h(vec2(floor(x), row)), mark = step(0.28, fr) * step(fr, 0.62) * step(fract(x), 0.3 + 0.65 * hv) * step(0.18, hv) * step(0.5, row) * step(row, 5.5);
        float dist = length(uCam - vWp); vec3 lit = vec3(0.07, 0.085, 0.10);
        for (int i = 0; i < 3; i++) { vec3 d = uLp[i] - vWp; lit += uLc[i] * 0.55 * (i == 1 ? 0.22 : 1.0) / (1.0 + dot(d, d) * 0.16); }
        float near = uGlow * exp(-vUv.x * uLen / 7.0);
        vec3 paper = vec3(0.50, 0.40, 0.27), col = paper * (lit + vec3(1.0, 0.7, 0.3) * near * 0.5) * (1.0 - 0.45 * mark * uRolled);
        col += vec3(${AMBER}) * mark * (0.05 + 0.50 * uGlow + 0.8 * near) * (1.0 - uRolled);
        col *= mix(1.0, 0.55 + 0.45 * smoothstep(0.0, 0.25, 1.0 - abs(vUv.y)), 1.0);
        col += paper * vec3(1.0, 0.72, 0.36) * uGlow * 0.30 * (1.0 - uRolled);
        float f = 1.0 - exp(-pow(max(dist - 9.0, 0.0) * 0.016, 1.4)); col = mix(col, vec3(0.062, 0.128, 0.195), f);
        gl_FragColor = vec4(col, 1.0); }` })));
  ribbon.frustumCulled = false; scene.add(ribbon);
  const pathA = new Float32Array((RIB_N + 1) * 3), pathW = new Float32Array((RIB_N + 1) * 3); let lastTau = -1;

  // threads: the old light to a page it is writing, the new light to a page it is reading, and the new light's straight path
  const stripOf = (n, col, order = 15) => { const g = keep(new THREE.BufferGeometry()), side = new Float32Array(n * 2), idx = [];
    for (let k = 0; k < n; k++) { side[k * 2] = -1; side[k * 2 + 1] = 1; if (k < n - 1) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3)); g.setAttribute('aS', new THREE.BufferAttribute(side, 1)); g.setIndex(idx);
    const u = { uCol: { value: new V3(...col) }, uA: { value: 1 } };
    const m = new THREE.Mesh(g, keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: u,
      vertexShader: 'attribute float aS; varying float vS; void main(){ vS = aS; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'precision highp float; uniform vec3 uCol; uniform float uA; varying float vS; void main(){ gl_FragColor = vec4(uCol * uA * (1.0 - vS * vS), 1.0); }' })));
    m.frustumCulled = false; m.renderOrder = order; scene.add(m); return { m, u, n, pts: new Float32Array(n * 3) }; };
  const sv = new V3(), tv = new V3(), vv = new V3();
  function setStrip(st, width, camPos) { const P = st.pts, n = st.n, pos = st.m.geometry.attributes.position; sv.set(0, 0, 0);
    for (let k = 0; k < n; k++) { const a = Math.max(0, k - 1) * 3, b = Math.min(n - 1, k + 1) * 3, c = k * 3;
      tv.set(P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]); vv.set(camPos.x - P[c], camPos.y - P[c + 1], camPos.z - P[c + 2]); tv.cross(vv);
      if (tv.lengthSq() > 1e-10) sv.copy(tv).normalize().multiplyScalar(width);
      pos.setXYZ(k * 2, P[c] - sv.x, P[c + 1] - sv.y, P[c + 2] - sv.z); pos.setXYZ(k * 2 + 1, P[c] + sv.x, P[c + 1] + sv.y, P[c + 2] + sv.z); }
    if (n > 1) { pos.setXYZ(0, P[0] - pos.getX(2) + P[3], P[1] - pos.getY(2) + P[4], P[2] - pos.getZ(2) + P[5]); pos.setXYZ(1, P[0] - pos.getX(3) + P[3] + 0, P[1] - pos.getY(3) + P[4], P[2] - pos.getZ(3) + P[5]); }
    pos.needsUpdate = true; }
  const tethers = pages.map(() => stripOf(24, AMBER, 23)), readLine = stripOf(2, TEAL, 31), TRAIL = 160, trail = stripOf(TRAIL, [0.84, 0.95, 0.92]);

  // motes: what was in the tools, drawn out into each page as it is written
  const MOTES = 150, mPos = new Float32Array(MOTES * 3), mAux = new Float32Array(MOTES * 2), moteGeo = keep(new THREE.BufferGeometry());
  for (let i = 0; i < MOTES; i++) mAux.set([i % 3, rnd()], i * 2);
  moteGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3)); moteGeo.setAttribute('aAux', new THREE.BufferAttribute(mAux, 2));
  const moteU = { uT: { value: 0 }, uForm: { value: new V3() }, uPx: { value: 1 } };
  const motes = new THREE.Points(moteGeo, keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: moteU,
    vertexShader: `attribute vec2 aAux; uniform float uT, uPx; uniform vec3 uForm; varying float vA;
      void main(){ float L = aAux.x < 0.5 ? ${LAND[0].toFixed(2)} : (aAux.x < 1.5 ? ${LAND[1].toFixed(2)} : ${LAND[2].toFixed(2)});
        float p = clamp((uT - (L - 1.95) - aAux.y * 0.6) / 0.7, 0.0, 1.0), e = p * p * (3.0 - 2.0 * p);
        vec3 q = mix(position, uForm, e); q.y += sin(p * 3.14159) * (0.25 + 0.5 * aAux.y); vA = sin(p * 3.14159);
        gl_PointSize = (3.0 + 3.0 * aAux.y) * uPx; gl_Position = projectionMatrix * viewMatrix * vec4(q, 1.0); }`,
      fragmentShader: 'precision highp float; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(vec3(1.0, 0.82, 0.45) * vA * smoothstep(1.0, 0.1, d), 1.0); }' })));
  motes.frustumCulled = false; motes.renderOrder = 16; scene.add(motes);

  // the one spoken line
  const tc = document.createElement('canvas'); tc.width = 1400; tc.height = 130;
  { const x = tc.getContext('2d'); let F = 96; x.font = `500 ${F}px ${FONT}`; F = Math.floor(F * (tc.width - 24) / x.measureText(LINE).width); F = Math.min(F, 104);
    x.font = `500 ${F}px ${FONT}`; x.fillStyle = '#fff'; x.textBaseline = 'middle'; const wd = x.measureText(LINE).width; x.fillText(LINE, 12, 68); tc._frac = (wd + 24) / tc.width; }
  const lineTex = keep(new THREE.CanvasTexture(tc)); lineTex.colorSpace = THREE.NoColorSpace; lineTex.anisotropy = 4;
  const lineU = { uTex: { value: lineTex }, uReveal: { value: 0 }, uA: { value: 0 } };
  const lineMesh = new THREE.Mesh(unitPlane, keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, uniforms: lineU,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `precision highp float; uniform sampler2D uTex; uniform float uReveal, uA; varying vec2 vUv;
      void main(){ float m = texture2D(uTex, vUv).r, r = uReveal * 1.08 - 0.04, k = smoothstep(r + 0.03, r - 0.01, vUv.x), head = exp(-pow((vUv.x - r) / 0.03, 2.0)) * step(uReveal, 0.999);
        gl_FragColor = vec4(mix(vec3(${INK}), vec3(1.0), head), m * k * uA); }` })));
  lineMesh.renderOrder = 18; scene.add(lineMesh);

  // ---- layout ----
  let lay = null, isPortrait = null, jF = 40; const formP = new V3(), tmp = new V3(), tmp2 = new V3();
  function place(portrait) {
    isPortrait = portrait; lay = portrait ? LAY.port : LAY.land; lastTau = -1;
    const { desk, d } = lay;
    slab.scale.set(desk.w, 0.12, 2.0); slab.position.set(desk.x, DESK_Y - 0.06, 0);
    legs.forEach((l, i) => { l.scale.set(0.1, DESK_Y - 0.12, 0.1); l.position.set(desk.x + (i % 2 ? 1 : -1) * (desk.w / 2 - 0.15), (DESK_Y - 0.12) / 2, i < 2 ? 0.85 : -0.85); });
    for (const tl of tools) { tl.wp.set(desk.x + tl.fx * (desk.w / 2 - 0.3), DESK_Y + tl.s * 0.62, tl.fz * 0.62 + 0.1); tl.holder.position.copy(tl.wp); }
    for (let i = 0; i < MOTES; i++) { const tl = tools[(i * 7 + (i % 3)) % TOOLS], pick = tools[(Math.floor(i / 3) * 3 + tl.grp) % TOOLS]; const src = pick.grp === i % 3 ? pick : tools[(i % 3) + 3 * (Math.floor(i / 3) % 5)];
      mPos.set([src.wp.x + (mAux[i * 2 + 1] - 0.5) * 0.3, src.wp.y, src.wp.z], i * 3); }
    moteGeo.attributes.position.needsUpdate = true;
    planks.forEach((p, i) => { const k = lay.planks[i]; p.visible = !!k; if (k) { p.scale.set(k[2], 0.07, 0.6); p.position.set(k[0], k[1] - 0.035, lay.slotZ); } });
    ups.forEach((u, i) => { u.scale.set(0.07, lay.upH, 0.07); u.position.set(lay.ups[i], lay.upH / 2, lay.slotZ - 0.3); });
    const sgn = Math.sign(lay.slots[0][0] - lay.old[0]) || 1; formP.set(lay.old[0] + sgn * 0.75, lay.old[1] - 0.75, 0.7); moteU.uForm.value.copy(formP);
    // the scroll's path: from the light, along the desk, off its edge, then far back across the floor in widening folds
    const edge = desk.x + d * desk.w / 2, pts = [new V3(...lay.old), new V3(lay.old[0] + d * 0.5, DESK_Y + 0.35, 0.05), new V3(lay.old[0] + d * 1.0, DESK_Y + 0.04, 0.1), new V3(edge - d * 0.15, DESK_Y + 0.05, 0.2),
      new V3((edge + lay.roll[0]) / 2, 0.55, 0.5), new V3(lay.roll[0], 0.04, lay.roll[2]), new V3(lay.roll[0] + d * 0.7, 0.04, lay.roll[2] - 0.25)];
    for (let i = 1; i <= 15; i++) pts.push(new V3(lay.mx + d * (i % 2 ? -1 : 1) * (1.0 + 0.32 * i) + (i === 1 ? d * 0.6 : 0), 0.04, 0.4 - 2.3 * Math.pow(i, 1.18)));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), sp = curve.getSpacedPoints(RIB_N); ribU.uLen.value = curve.getLength();
    for (let j = 0; j <= RIB_N; j++) { const a = sp[Math.max(0, j - 1)], b = sp[Math.min(RIB_N, j + 1)]; let wx = -(b.z - a.z), wz = b.x - a.x; const n = Math.hypot(wx, wz); if (n < 1e-4) { wx = 0; wz = d; } else { wx /= n; wz /= n; }
      pathA.set([sp[j].x, sp[j].y, sp[j].z], j * 3); pathW.set([wx, 0, wz], j * 3); }
    { let best = 1e9; for (let j = 0; j <= RIB_N / 4; j++) { const dd = Math.hypot(sp[j].x - lay.roll[0], sp[j].y - 0.04, sp[j].z - lay.roll[2]); if (dd < best) { best = dd; jF = j; } } }
    const tx = lay.text, tw = (tx.x1 - tx.x0) / tc._frac; lineMesh.scale.set(tw, tw * tc.height / tc.width, 1); lineMesh.position.set(tx.x0 + tw / 2, tx.y, tx.z);
  }
  const ROLL_R = 0.56, TURNS = 9, rollC = new V3(), rollFace = new V3();
  const pathAt = (q, o, arr) => { q = clamp(q, 0, RIB_N); const j = Math.min(RIB_N - 1, Math.floor(q)), f = q - j, a = j * 3; o[0] = lerp(arr[a], arr[a + 3], f); o[1] = lerp(arr[a + 1], arr[a + 4], f); o[2] = lerp(arr[a + 2], arr[a + 5], f); return o; };
  const pa = [0, 0, 0], pw = [0, 0, 0];
  function buildRibbon(tau) {
    const uF = jF / RIB_N, kA = sstep(tau / 0.22), kB = clamp((tau - 0.12) / 0.88), uS = uF + (1 - uF) * kB * kB * (3 - 2 * kB), rS = 0.05 + (ROLL_R - 0.05) * Math.sqrt(uS), thS = Math.sqrt(uS) * TURNS * TAU;
    const fa = jF * 3, fx = pathA[fa], fz = pathA[fa + 2], wxF = pathW[fa], wzF = pathW[fa + 2]; let tx = pathA[fa + 3] - pathA[fa - 3], tz = pathA[fa + 5] - pathA[fa - 1]; const tn = Math.hypot(tx, tz) || 1; tx /= tn; tz /= tn;
    rollC.set(fx, rS + 0.04, fz); const sg = wzF >= 0 ? 1 : -1; rollFace.set(fx + wxF * sg * (RIB_W + 0.03), rS + 0.04, fz + wzF * sg * (RIB_W + 0.03));
    if (tau === lastTau) return; lastTau = tau;
    for (let j = 0; j <= RIB_N; j++) { const u = j / RIB_N; let x, y, z, wx, wz;
      const su = Math.sqrt(u), r = 0.05 + (ROLL_R - 0.05) * su, ang = -Math.PI / 2 - (thS - su * TURNS * TAU), sx = fx + tx * Math.cos(ang) * r, sy = rS + 0.04 + Math.sin(ang) * r, sz = fz + tz * Math.cos(ang) * r;
      if (u <= uS && j > jF) { x = sx; y = sy; z = sz; wx = wxF; wz = wzF; }
      else if (j > jF) { pathAt(jF + (u - uS) * RIB_N, pa, pathA); pathAt(jF + (u - uS) * RIB_N, pw, pathW); x = pa[0]; y = pa[1]; z = pa[2]; wx = pw[0]; wz = pw[2]; }
      else { const a = j * 3; x = lerp(pathA[a], sx, kA); y = lerp(pathA[a + 1], sy, kA); z = lerp(pathA[a + 2], sz, kA); wx = lerp(pathW[a], wxF, kA); wz = lerp(pathW[a + 2], wzF, kA); }
      ribPos.set([x - wx * RIB_W, y, z - wz * RIB_W, x + wx * RIB_W, y, z + wz * RIB_W], j * 6); }
    ribGeo.attributes.position.needsUpdate = true;
  }
  const readPos = (i, out) => out.set(lay.slots[i][0] + lay.readOff[0], lay.slots[i][1] + lay.readOff[1], lay.slotZ + lay.readOff[2]);
  const stops = [new V3(), new V3(), new V3(), new V3(), new V3()], oldP = new V3();
  const LEGS = [[T_GO, T_AT], [T_ON, READ[0]], [READ[0] + 0.95, READ[1]], [READ[1] + 0.95, READ[2]]];
  function newPos(t, out) { // straight legs: where the line lands, a beat beside the roll, then the three pages
    out.copy(stops[0]); for (let i = 0; i < 4; i++) if (t > LEGS[i][0]) out.lerpVectors(stops[i], stops[i + 1], sstep((t - LEGS[i][0]) / (LEGS[i][1] - LEGS[i][0])));
    return out;
  }

  const cp = new V3(), cl = new V3();
  function render(time, w, h) {
    const portrait = h > w; if (portrait !== isPortrait) place(portrait);
    if (canvas.width !== w || canvas.height !== h) renderer.setSize(w, h, false); renderer.setViewport(0, 0, w, h);
    const t = reduced ? STILL_T : clamp(time, 0, meta.seconds), px = h / (portrait ? 1280 : 720);

    // camera: a slow settle, then a move that opens the room for the second half
    const C = lay.cams, k0 = sstep((t - 8.3) / 1.6), k1 = sstep((t - 10.95) / 1.3), k2 = sstep((t - 15.1) / 1.3), dr = 0.25 * (1 - t / 9) * (1 - k0);
    cp.set(...lay.cam1.p).lerp(tmp.set(...C[0].p), k0).lerp(tmp.set(...C[1].p), k1).lerp(tmp.set(...C[2].p), k2);
    cl.set(...lay.cam1.l).lerp(tmp.set(...C[0].l), k0).lerp(tmp.set(...C[1].l), k1).lerp(tmp.set(...C[2].l), k2); cp.z -= dr * 1.6; cp.x += 0.1 * Math.sin(t * 0.23);
    camera.fov = lay.fov; camera.aspect = w / h; camera.position.copy(cp); camera.lookAt(cl); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); shared.uCam.value.copy(cp); sky.position.copy(cp);

    // the old light: gives a little away with each page, then rolls up
    const tau = clamp((t - T_ROLL) / ROLL_LEN), given = LAND.reduce((s, L) => s + sstep((t - (L - 1.0)) / 1.0), 0);
    const oldI = lerp(1 - 0.12 * given, 0.035, sstep(tau * 1.15)) * (1 + 0.035 * Math.sin(t * 2.1) * (1 - tau));
    buildRibbon(tau); const go = sstep(tau / 0.24); oldP.set(...lay.old); oldP.y += 0.06 * Math.sin(t * 0.9); oldP.lerp(rollFace, go);
    oldGlow.m.position.copy(oldP); oldGlow.m.quaternion.copy(camera.quaternion); oldGlow.m.scale.setScalar(lerp(lay.oldSize * (1 - 0.05 * given), 0.7, sstep(tau * 1.3))); oldGlow.u.uA.value = lerp(0.95 - 0.08 * given, 0.13, sstep(tau * 1.15));
    shared.uLp.value[0].copy(oldP); shared.uLc.value[0].set(1.0, 0.70, 0.30).multiplyScalar(2.6 * oldI);
    ribU.uGlow.value = oldI; ribU.uRolled.value = sstep((tau - 0.5) / 0.5);

    // desk and tools: each group loses its outline as its page is written; the desk goes with the light
    const deskOp = 1 - sstep((t - 7.9) / 1.3); deskG.visible = deskOp > 0.004; deskMat.uniforms.uOp.value = deskOp;
    let out = 0; edgeMats.forEach((m, g) => { const k = 1 - sstep((t - (LAND[g] - 1.9)) / 1.0); m.opacity = 0.95 * k * deskOp; out += k; });
    toolMat.uniforms.uOp.value = deskOp * (0.3 + 0.7 * out / 3); toolMat.uniforms.uAlb.value.setScalar(0.12 + 0.3 * out / 3);
    moteU.uT.value = t; moteU.uPx.value = px;

    // pages: written at the desk, carried to the shelf, teal on landing, read later
    let shelfI = 0.16, sx = 0, sy = 0;
    pages.forEach((pg, i) => {
      const L = LAND[i], slot = lay.slots[i], form = sstep((t - (L - 1.6)) / 0.6), fl = sstep((t - (L - 1.0)) / 1.0), landed = t >= L, dt = t - L;
      const ex = slot[0], ey = slot[1] + lay.ph / 2, ez = lay.slotZ + 0.08; sx += ex / 3; sy += ey / 3;
      pg.mesh.visible = form > 0.001;
      const a = 1 - fl, b = fl, mxp = (formP.x + ex) / 2, myp = Math.max(formP.y, ey) + 1.1, mzp = 1.6;
      pg.mesh.position.set(a * a * formP.x + 2 * a * b * mxp + b * b * ex, a * a * formP.y + 2 * a * b * myp + b * b * ey + (landed ? 0.07 * Math.exp(-dt * 7) * Math.sin(dt * 24) : 0), a * a * formP.z + 2 * a * b * mzp + b * b * ez);
      pg.mesh.rotation.set(-0.1 - 0.5 * a * (1 - form * 0.5), 0.9 * a * (i % 2 ? -1 : 1), 0.35 * Math.sin(a * Math.PI) * (i % 2 ? 1 : -1));
      const sc = (0.08 + 0.92 * form) * (0.72 + 0.28 * fl); pg.mesh.scale.set(lay.pw * sc, lay.ph * sc, 1);
      const teal = sstep(dt / 0.35), flash = landed ? Math.exp(-dt * 3.2) : 0, rk = clamp((t - READ[i]) / 0.85);
      pg.u.uTeal.value = teal; pg.u.uFlash.value = flash + 0.25 * (1 - fl) * form; pg.u.uRead.value = rk; const wait = 0.34 * sstep((t - 8.6) / 1.4) * (1 - rk), done = t > READ[i] + 0.85 ? Math.exp(-(t - READ[i] - 0.85) * 3) : 0;
      pg.u.uBright.value = 0.95 - wait + 0.3 * rk + 0.25 * flash + 0.3 * done;
      shelfI += teal * (0.42 - 0.2 * wait / 0.34 + 0.25 * rk) + flash * 0.8 + done * 0.5;
      const pgw = pageGlows[i]; pgw.m.visible = landed; pgw.m.position.set(ex, ey, ez - 0.05); pgw.m.quaternion.copy(camera.quaternion); pgw.m.scale.setScalar(lay.ph * 2.6); pgw.u.uA.value = (0.20 - 0.4 * wait) * teal + 0.4 * flash + 0.22 * rk + 0.3 * done;
      // the thread from the old light to the page it is setting down
      const th = tethers[i], ta = form * (1 - sstep(dt / 0.5)) * (1 - tau); th.m.visible = ta > 0.01; th.u.uA.value = 0.9 * ta;
      if (th.m.visible) { for (let k = 0; k < 24; k++) { const q = k / 23; th.pts.set([lerp(oldP.x, pg.mesh.position.x, q), lerp(oldP.y, pg.mesh.position.y, q) - Math.sin(q * Math.PI) * 0.25 * (1 - fl * 0.6), lerp(oldP.z, pg.mesh.position.z, q)], k * 3); } setStrip(th, 0.028, cp); }
    });
    shared.uLp.value[2].set(sx, sy, lay.slotZ + 1.3); shared.uLc.value[2].set(...TEAL).multiplyScalar(shelfI * 1.5);

    // the spoken line and the new light
    const rev = clamp((t - T_LINE) / (T_BORN - T_LINE)); lineU.uReveal.value = rev; lineU.uA.value = sstep((t - T_LINE) / 0.2) * (1 - lay.lineOut * sstep((t - 11.1) / 1.0)); lineMesh.visible = t > T_LINE; lineMesh.quaternion.copy(camera.quaternion);
    stops[0].set(...lay.born); stops[1].set(...lay.hold); for (let i = 0; i < 3; i++) readPos(i, stops[i + 2]);
    const np = newPos(t, tmp), born = sstep((t - T_BORN) / 0.3), pop = t > T_BORN ? Math.exp(-(t - T_BORN) * 5) : 0, lvl = READ.reduce((s, R) => s + sstep((t - R) / 0.85), 0);
    const pulse = READ.reduce((s, R) => s + (t > R + 0.85 ? Math.exp(-(t - R - 0.85) * 3.5) : 0), 0);
    np.y += 0.05 * Math.sin(t * 2.3) * born;
    newGlow.m.visible = born > 0.001; newGlow.m.position.copy(np); newGlow.m.quaternion.copy(camera.quaternion); newGlow.m.scale.setScalar((2.3 + 0.55 * lvl + 1.0 * pop + 0.8 * pulse) * born); newGlow.u.uA.value = (0.66 + 0.13 * lvl + 0.5 * pop + 0.25 * pulse) * born;
    shared.uLp.value[1].copy(np); shared.uLc.value[1].set(0.9, 0.96, 0.92).multiplyScalar((0.7 + 0.3 * lvl + 0.5 * pulse) * born);
    { const te = Math.max(T_GO, t); for (let k = 0; k < TRAIL; k++) { newPos(lerp(T_GO, te, k / (TRAIL - 1)), tmp2); trail.pts.set([tmp2.x, tmp2.y, tmp2.z], k * 3); } trail.m.visible = t > T_GO + 0.02; trail.u.uA.value = 0.5; if (trail.m.visible) setStrip(trail, 0.026, cp); }
    let ri = -1, rk = 0; READ.forEach((R, i) => { const k = (t - R) / 0.85; if (k > 0 && k < 1) { ri = i; rk = k; } });
    readLine.m.visible = ri >= 0; if (ri >= 0) { const pm = pages[ri].mesh.position; readLine.pts.set([np.x, np.y, np.z, pm.x + lay.readSide * lay.pw * 0.42, pm.y + lay.ph * (0.5 - rk) * 0.9, pm.z + 0.02]); setStrip(readLine, 0.035, cp); readLine.u.uA.value = 0.9 * Math.sin(Math.PI * rk); }

    renderer.render(scene, camera);
  }
  function dispose() { for (const d of disposables) d.dispose(); renderer.dispose(); }
  return { render, dispose };
}
