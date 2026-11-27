// Snowbird, February 2001: seventeen lights cross a night mountain range from different directions, gather at a lodge
// and fuse into one luminous page that rises to the camera and writes its four lines.
// A lab scene component (see ../harness.js for the contract). render(t) is a pure function of t. Apache-2.0. By c.productions.
export const meta = {
  id: 'snowbird-page',
  title: 'Seventeen lights, one page',
  beat: 'Seventeen people who came from rival methods left a ski lodge with a single page of four values, and that page, not any one method, is what the industry took away.',
  seconds: 14,
  sources: [
    { title: 'History: The Agile Manifesto', url: 'https://agilemanifesto.org/history.html' },
    { title: 'Manifesto for Agile Software Development', url: 'https://agilemanifesto.org/' },
  ],
};

const LIGHTS = 17, TRAIL = 64, LAG = 0.024, TAU = Math.PI * 2;
const LINES = [
  ['Individuals and interactions', 'processes and tools'],
  ['Working software', 'comprehensive documentation'],
  ['Customer collaboration', 'contract negotiation'],
  ['Responding to change', 'following a plan'],
];
const T_FUSE = 6.5, FUSE_LEN = 1.2, T_PAGE = 7.55, PAGE_LEN = 2.2, T_WRITE = 9.25, ROW_STEP = 0.16, ROW_LEN = 0.4, T_SIGN = 9.55, STILL_T = 13.2;
const PAGE_AR = 1.1, FUSE_Y = 8;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- terrain: seeded value noise, a flat valley at the origin, low rolling snow toward the camera, peaks behind ----
function hash2(ix, iz) { let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz); return lerp(lerp(hash2(ix, iz), hash2(ix + 1, iz), ux), lerp(hash2(ix, iz + 1), hash2(ix + 1, iz + 1), ux), uz); }
function ridged(x, z) { let s = 0, a = 0.5, f = 1, n = 0; for (let o = 0; o < 5; o++) { const v = 1 - Math.abs(vnoise(x * f + 17.3 * o, z * f - 9.1 * o) * 2 - 1); s += v * v * a; n += a; a *= 0.5; f *= 2.03; } return s / n; }
function height(x, z) {
  const r = Math.hypot(x, z) + 1e-6, back = sstep((-z / r + 0.35) / 0.95);
  const amp = sstep((r - 11) / 78) * lerp(0.2, 1, back);
  const peaks = Math.pow(ridged(x * 0.017 + 3.1, z * 0.017 + 1.7), 1.5) * 62;
  const roll = (vnoise(x * 0.06 + 40, z * 0.06 + 11) - 0.5) * 3.2 * sstep((r - 9) / 20);
  return peaks * amp + roll;
}

const LIT_VERT = `
varying vec3 vWp; varying float vAux;
void main(){ vec4 p = vec4(position, 1.0); vAux = position.y;
#ifdef USE_INSTANCING
  p = instanceMatrix * p;
#endif
  vec4 wp = modelMatrix * p; vWp = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const LIT_FRAG = `
precision highp float;
uniform vec3 uL[${LIGHTS}]; uniform vec3 uLc[${LIGHTS}];
uniform vec4 uLodge; uniform vec4 uPageL; uniform vec3 uCam; uniform float uKind; uniform vec3 uAlb; uniform vec3 uEmis;
varying vec3 vWp; varying float vAux;
void main(){
  vec3 n = normalize(cross(dFdx(vWp), dFdy(vWp))); vec3 V = uCam - vWp; float dist = length(V);
  if (dot(n, V) < 0.0) n = -n;
  vec3 snow = vec3(0.60, 0.71, 0.84), alb = uAlb;
  if (uKind < 0.5) { float rock = smoothstep(0.78, 0.5, n.y) * smoothstep(5.0, 20.0, vWp.y); alb = mix(snow, vec3(0.05, 0.085, 0.14), rock); }
  else if (uKind < 1.5) { alb = mix(vec3(0.03, 0.07, 0.085), snow * 0.55, smoothstep(0.0, 0.5, vAux)); }
  else if (uKind > 2.5) { alb = mix(uAlb, snow, smoothstep(0.35, 0.6, n.y)); }
  vec3 moon = normalize(vec3(-0.55, 0.42, -0.72));
  float diff = max(dot(n, moon), 0.0);
  vec3 col = alb * (vec3(0.05, 0.085, 0.135) + vec3(0.36, 0.56, 0.74) * diff * 0.95 + vec3(0.02, 0.05, 0.07) * max(n.y, 0.0));
  vec3 lit = vec3(0.0);
  for (int i = 0; i < ${LIGHTS}; i++) { vec3 d = uL[i] - vWp; float a = 1.0 / (1.0 + dot(d, d) * 0.085); lit += uLc[i] * a * a * (0.3 + 0.7 * max(dot(n, normalize(d)), 0.0)); }
  { vec3 d = uLodge.xyz - vWp; float a = 1.0 / (1.0 + dot(d, d) * 0.0045); lit += vec3(1.0, 0.72, 0.30) * uLodge.w * a * a * (0.35 + 0.65 * max(dot(n, normalize(d)), 0.0)); }
  { vec3 d = uPageL.xyz - vWp; float a = 1.0 / (1.0 + dot(d, d) * 0.0011); lit += vec3(1.0, 0.80, 0.42) * uPageL.w * a * (0.4 + 0.6 * max(dot(n, normalize(d)), 0.0)); }
  col += alb * lit + uEmis;
  float f = 1.0 - exp(-pow(dist * 0.0062, 1.6));
  vec3 fog = mix(vec3(0.075, 0.155, 0.235), vec3(0.047, 0.085, 0.135), clamp(normalize(-V).y * 2.5 + 0.2, 0.0, 1.0));
  gl_FragColor = vec4(mix(col, fog, f), 1.0);
}`;

export async function create({ canvas, THREE, reduced }) {
  const V3 = THREE.Vector3, rnd = prng(20010211);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.3, 1200); scene.add(camera);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  // shared lighting uniforms
  const shared = {
    uL: { value: Array.from({ length: LIGHTS }, () => new V3()) }, uLc: { value: Array.from({ length: LIGHTS }, () => new V3()) },
    uLodge: { value: new THREE.Vector4(0, 3, 0, 0) }, uPageL: { value: new THREE.Vector4(0, 0, 0, 0) }, uCam: { value: new V3() },
  };
  const litMat = (kind, alb = [0, 0, 0], emis = null) => keep(new THREE.ShaderMaterial({
    vertexShader: LIT_VERT, fragmentShader: LIT_FRAG, side: THREE.DoubleSide,
    uniforms: { ...shared, uKind: { value: kind }, uAlb: { value: new V3(...alb) }, uEmis: emis || { value: new V3() } },
  }));

  // terrain
  const SIZE = 420, SEG = 230, tg = keep(new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG)); tg.rotateX(-Math.PI / 2);
  { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i))); p.needsUpdate = true; }
  scene.add(new THREE.Mesh(tg, litMat(0)));

  // trees: dark cones, clumped on the lower slopes
  const TREES = 1500, cone = keep(new THREE.ConeGeometry(1, 1, 5, 1)), trees = new THREE.InstancedMesh(cone, litMat(1), TREES), m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(); let placed = 0;
  for (let guard = 0; placed < TREES && guard < 60000; guard++) {
    const x = (rnd() - 0.5) * 260, z = (rnd() - 0.5) * 260 + 10, r = Math.hypot(x, z); if (r < 13 || r > 135) continue;
    if (vnoise(x * 0.045 + 7, z * 0.045 + 3) < 0.5 + 0.2 * rnd()) continue;
    const y = height(x, z); if (y > 17) continue;
    const slope = Math.abs(height(x + 1, z) - y) + Math.abs(height(x, z + 1) - y); if (slope > 1.3) continue;
    const hgt = 2.4 + rnd() * 3.4, rad = 0.7 + rnd() * 0.6;
    m4.compose(new V3(x, y + hgt * 0.45, z), q0, new V3(rad, hgt, rad)); trees.setMatrixAt(placed++, m4);
  }
  trees.count = placed; trees.instanceMatrix.needsUpdate = true; trees.frustumCulled = false; scene.add(trees);

  // the lodge: dark timber, a snowed roof, windows whose warmth grows as the lights arrive
  const lodge = new THREE.Group(), winEmis = { value: new V3() }; scene.add(lodge);
  const box = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, d)), mat); m.position.set(x, y, z); lodge.add(m); return m; };
  const timber = litMat(2, [0.11, 0.075, 0.05]), winMat = litMat(2, [0.2, 0.14, 0.06], winEmis);
  const LW = 8.4, LH = 2.9, LD = 4.6; box(LW, LH, LD, 0, LH / 2, 0, timber);
  { const hw = LW / 2 + 0.5, hd = LD / 2 + 0.5, rh = 2.3, g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute([-hw, LH, hd, hw, LH, hd, -hw, LH, -hd, hw, LH, -hd, -hw, LH + rh, 0, hw, LH + rh, 0], 3));
    g.setIndex([0, 1, 5, 0, 5, 4, 3, 2, 4, 3, 4, 5, 0, 4, 2, 1, 3, 5, 0, 2, 3, 0, 3, 1]); lodge.add(new THREE.Mesh(g, litMat(3, [0.11, 0.075, 0.05]))); }
  box(0.8, 2.0, 0.8, 2.4, LH + 1.6, -0.6, timber);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) box(0.72, 0.62, 0.06, -3.3 + i * 1.32, 0.75 + row * 1.25, LD / 2 + 0.02, winMat);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 3; i++) box(0.06, 0.62, 0.72, -LW / 2 - 0.02, 0.75 + row * 1.25, -1.3 + i * 1.3, winMat);
  lodge.position.y = height(0, 0); const GROUND = lodge.position.y;

  // sky dome and stars (follow the camera)
  const sky = new THREE.Group(); scene.add(sky);
  sky.add(new THREE.Mesh(keep(new THREE.SphereGeometry(900, 24, 16)), keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `precision highp float; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float y = clamp(d.y, -0.2, 1.0);
        vec3 col = mix(vec3(0.075, 0.155, 0.235), vec3(0.035, 0.065, 0.11), pow(clamp(y * 1.6 + 0.1, 0.0, 1.0), 0.6));
        col += vec3(0.10, 0.34, 0.33) * exp(-pow((y - 0.02) / 0.10, 2.0)) * 0.20 * (0.6 + 0.4 * sin(d.x * 5.0 + 1.0));
        vec3 md = normalize(vec3(-0.55, 0.42, -0.72)); float m = max(dot(d, md), 0.0);
        col += vec3(0.75, 0.86, 0.95) * (smoothstep(0.99965, 0.9998, m) * 0.9 + pow(m, 900.0) * 0.25 + pow(m, 40.0) * 0.06);
        gl_FragColor = vec4(col, 1.0); }`,
  }))));
  sky.children[0].renderOrder = -10;
  { const n = 700, pos = new Float32Array(n * 3), aux = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { const a = rnd() * TAU, y = 0.03 + rnd() * 0.95, r = Math.sqrt(1 - y * y); pos.set([Math.cos(a) * r * 850, y * 850, Math.sin(a) * r * 850], i * 3); aux.set([0.6 + rnd() * rnd() * 2.2, rnd() * TAU], i * 2); }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aAux', new THREE.BufferAttribute(aux, 2));
    var starMat = keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uPx: { value: 1 } },
      vertexShader: 'attribute vec2 aAux; uniform float uT, uPx; varying float vA; void main(){ vA = 0.55 + 0.45 * sin(uT * (0.8 + aAux.y) + aAux.y * 7.0); gl_PointSize = (1.2 + aAux.x) * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'precision highp float; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * vA * smoothstep(1.0, 0.2, d) * 0.8, 1.0); }' }));
    const st = new THREE.Points(g, starMat); st.frustumCulled = false; st.renderOrder = -9; sky.add(st); }

  // falling snow, wrapped in a box around the camera
  const SNOW = 1400; let snowMat;
  { const pos = new Float32Array(SNOW * 3), aux = new Float32Array(SNOW); for (let i = 0; i < SNOW; i++) { pos.set([rnd() * 70, rnd() * 46, rnd() * 70], i * 3); aux[i] = rnd(); }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aR', new THREE.BufferAttribute(aux, 1));
    snowMat = keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uCam: shared.uCam, uProj: { value: 800 }, uNear: { value: 0 }, uWarm: { value: 0 } },
      vertexShader: `attribute float aR; uniform float uT, uProj, uNear; uniform vec3 uCam; varying float vA;
        void main(){ vec3 box = vec3(70.0, 46.0, 70.0);
          vec3 p = position + vec3(uT * (0.9 + aR * 0.6) + sin(uT * 0.7 + aR * 30.0) * 0.4, -uT * (1.6 + aR * 1.4), uT * 0.3);
          p = mod(p - uCam, box) - box * 0.5 + uCam; vec4 mv = viewMatrix * vec4(p, 1.0); float dz = -mv.z;
          vA = smoothstep(34.0, 20.0, dz) * smoothstep(1.5, 5.0, dz) * mix(1.0, smoothstep(13.0, 19.0, dz), uNear) * (0.35 + 0.65 * aR);
          gl_PointSize = clamp((0.06 + aR * 0.07) * uProj / max(dz, 0.5), 1.0, 9.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: 'precision highp float; uniform float uWarm; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(mix(vec3(0.62, 0.74, 0.88), vec3(1.0, 0.84, 0.6), uWarm) * vA * smoothstep(1.0, 0.1, d) * 0.55, 1.0); }' }));
    const sn = new THREE.Points(g, snowMat); sn.frustumCulled = false; sn.renderOrder = 5; scene.add(sn); }

  // ---- the seventeen lights ----
  const AMBER = [1.0, 0.784, 0.341], TEAL = [0.373, 0.816, 0.773], INK = [0.957, 0.945, 0.91], DEEP = [1.0, 0.62, 0.22];
  const order = Array.from({ length: LIGHTS }, (_, i) => i); for (let i = LIGHTS - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const L = Array.from({ length: LIGHTS }, (_, i) => {
    const arr = 3.0 + 3.3 * (order[i] / (LIGHTS - 1)), dur = 4.6 + rnd() * 1.4, pal = [AMBER, TEAL, AMBER, INK, DEEP, TEAL, AMBER][i % 7], k = rnd() * 0.25;
    return { t0: arr - dur, dur, r0: 66 + rnd() * 34, swirl: (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 1.5), wob: rnd() * TAU, wobA: 0.05 + rnd() * 0.12, hover: 0.8 + rnd() * 0.7,
      col: pal.map((c, j) => lerp(c, AMBER[j], k)), size: 1.5 + rnd() * 0.9 };
  });
  if (L.length !== 17) throw new Error('there must be exactly seventeen lights');
  const RING = 9.2; let trailK = 1;
  const spin = (t) => 0.2 * t + 4.6 * Math.pow(clamp((t - T_FUSE) / FUSE_LEN), 2);

  // camera path (pure function of t and orientation)
  let portrait = false; const cq = new THREE.Quaternion(), cp = new V3(), cl = new V3(), UP = new V3(0, 1, 0), lm = new THREE.Matrix4();
  const KEYS = {
    land: { fov: 45, p: [[-50, 36, 96], [-12, 8.6, 32], [-10.5, 9.4, 37]], l: [[2, 12, -14], [0, 4.4, 0], [19, 9.8, 0]] },
    port: { fov: 62, p: [[-40, 40, 104], [-10, 9.5, 37], [-7, 10.5, 42]], l: [[0, 14, -14], [0, 5, 0], [0, 16.6, 0]] },
  };
  function camAt(t, pos, quat) {
    const K = portrait ? KEYS.port : KEYS.land, a = 1 - Math.pow(1 - clamp(t / 7.3), 2.4), b = sstep((t - 7.5) / 2.9), drift = Math.sin(t * 0.23) * 0.5;
    for (let j = 0; j < 3; j++) { cp.setComponent(j, lerp(lerp(K.p[0][j], K.p[1][j], a), K.p[2][j], b)); cl.setComponent(j, lerp(lerp(K.l[0][j], K.l[1][j], a), K.l[2][j], b)); }
    cp.x += drift; cp.y += Math.sin(t * 0.31 + 1) * 0.15;
    pos.copy(cp); lm.lookAt(cp, cl, UP); quat.setFromRotationMatrix(lm);
  }
  // the page's pose: from the fuse point above the lodge to a place in front of the camera
  let pageH = 1, pageOffY = 0; const PAGE_D = 10, fusePt = new V3(0, GROUND + FUSE_Y, 0), tq = new THREE.Quaternion(), te = new THREE.Euler(), tp = new V3(), tv = new V3();
  function pageAt(t, pos, quat) {
    const s = sstep((t - T_PAGE) / PAGE_LEN); camAt(t, tp, tq);
    tv.set(0, pageOffY, -PAGE_D).applyQuaternion(tq).add(tp); pos.lerpVectors(fusePt, tv, s); pos.y += Math.sin(s * Math.PI) * 2.0;
    const k = 1 - s; te.set(-1.15 * k + 0.012 * Math.sin(t * 0.5 + 1), 1.5 * k + 0.028 * Math.sin(t * 0.42), 0.3 * k);
    quat.copy(tq).multiply(q0.setFromEuler(te)); q0.identity(); return s;
  }
  const pq = new THREE.Quaternion(), pp = new V3(), lv = new V3();
  function lightAt(i, t, out) { // returns the size multiplier
    const o = L[i];
    if (t < T_PAGE + 0.1) {
      const u = clamp((t - o.t0) / o.dur), e = 1 - Math.pow(1 - u, 2.3), f = sstep((t - T_FUSE) / FUSE_LEN), k = 1 - e;
      const ang = TAU * i / LIGHTS + spin(t) + o.swirl * Math.pow(k, 1.3) + Math.sin(k * 9 + o.wob) * o.wobA * k;
      const r = lerp(RING, o.r0, k) * (1 - f * f * (3 - 2 * f) * 0.985), x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      const y = lerp(height(x, z) + o.hover + 0.7 * e * e + Math.sin(t * 1.3 + o.wob) * 0.15, GROUND + FUSE_Y, Math.pow(f, 1.6));
      out.set(x, y, z); trailK = 1; return (0.72 + 0.28 * Math.sin(e * Math.PI) - 0.14 * e) * (1 - 0.8 * Math.pow(f, 3));
    }
    const s = pageAt(t, pp, pq), e = sstep((t - (T_SIGN + i * 0.035)) / 0.9), sc = pageH * (0.03 + 0.97 * Math.pow(s, 1.4));
    const ang = TAU * i / LIGHTS + 1.2 + 5.2 * sstep((t - T_PAGE) / 2.9), rho = 0.78 * (1 - e), grow = sstep((t - T_PAGE - 0.1) / 0.5);
    lv.set(Math.cos(ang) * rho * (portrait ? 0.5 : 1.02) + ((i / (LIGHTS - 1)) - 0.5) * 0.86 / PAGE_AR * e, Math.sin(ang) * rho + (-0.5 - 0.05) * e, lerp(-0.09 + Math.sin(ang * 2.0 + i) * 0.05, 0.03, Math.pow(e, 6))).multiplyScalar(sc).applyQuaternion(pq);
    out.copy(pp).add(lv); trailK = 1 - e; return (lerp(0.42 * grow, 0.03 * pageH * (0.9 + 0.1 * Math.sin(t * 1.7 + i * 2.1)), e)) / o.size * 1.9;
  }

  // glow points: 17 heads with trails, plus the lodge glow and the fuse flash
  const NP = LIGHTS * TRAIL + 2, gPos = new Float32Array(NP * 3), gCol = new Float32Array(NP * 4), gSize = new Float32Array(NP);
  const gg = keep(new THREE.BufferGeometry()); gg.setAttribute('position', new THREE.BufferAttribute(gPos, 3)); gg.setAttribute('aCol', new THREE.BufferAttribute(gCol, 4)); gg.setAttribute('aSize', new THREE.BufferAttribute(gSize, 1));
  const glowMat = keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uProj: { value: 800 }, uPx: { value: 1 } },
    vertexShader: `attribute vec4 aCol; attribute float aSize; uniform float uProj, uPx; varying vec4 vC;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float s = aSize * uProj / max(-mv.z, 0.5), m = 3.4 * uPx; vC = aCol; vC.a *= min(1.0, s / m) ; gl_PointSize = clamp(max(s, m), 0.0, 520.0 * uPx); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'precision highp float; varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = (exp(-d * d * 5.0) * 0.55 + exp(-d * d * 42.0) * 1.3) * smoothstep(1.0, 0.75, d); gl_FragColor = vec4(mix(vC.rgb, vec3(1.0, 0.97, 0.9), exp(-d * d * 60.0) * 0.7) * vC.a * a, 1.0); }' }));
  const glow = new THREE.Points(gg, glowMat); glow.frustumCulled = false; glow.renderOrder = 8; scene.add(glow);

  // ---- the page ----
  const TW = 1024, TH = Math.round(TW * PAGE_AR), pc = document.createElement('canvas'); pc.width = TW; pc.height = TH; const rowC = new Array(8).fill(0); let rowH = 0.06;
  { const c = pc.getContext('2d'), FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'; c.clearRect(0, 0, TW, TH); c.textBaseline = 'middle';
    let F = 60; const widest = () => { let m = 0; for (const [a, b] of LINES) { c.font = `700 ${F}px ${FONT}`; m = Math.max(m, c.measureText(a).width); c.font = `400 ${F}px ${FONT}`; m = Math.max(m, c.measureText('over ' + b).width); } return m; };
    F = Math.floor(F * Math.min(1, (TW * 0.8) / widest())); const lh = F * 1.26, gap = F * 1.25, total = 4 * 2 * lh + 3 * gap, x0 = TW * 0.1; let y = (TH - total) / 2 - F * 0.1;
    LINES.forEach(([a, b], i) => {
      c.font = `700 ${F}px ${FONT}`; c.fillStyle = 'rgba(255,255,255,1)'; c.fillText(a, x0, y + lh / 2); rowC[i * 2] = 1 - (y + lh / 2) / TH; y += lh;
      c.font = `400 ${F}px ${FONT}`; c.fillStyle = 'rgba(255,255,255,0.56)'; c.fillText('over ' + b, x0, y + lh / 2); rowC[i * 2 + 1] = 1 - (y + lh / 2) / TH; y += lh + gap;
    }); rowH = lh / TH; }
  const pageTex = keep(new THREE.CanvasTexture(pc)); pageTex.colorSpace = THREE.NoColorSpace; pageTex.anisotropy = renderer.capabilities.getMaxAnisotropy(); pageTex.premultiplyAlpha = false;
  const pageU = { uBend: { value: 0 }, uT: { value: 0 }, uTex: { value: pageTex }, uP: { value: new Array(8).fill(0) }, uRowC: { value: rowC }, uRowH: { value: rowH }, uHot: { value: 1 } };
  const page = new THREE.Mesh(keep(new THREE.PlaneGeometry(1 / PAGE_AR, 1, 24, 24)), keep(new THREE.ShaderMaterial({ uniforms: pageU, side: THREE.DoubleSide,
    vertexShader: `uniform float uBend, uT; varying vec2 vUv; varying float vSh;
      void main(){ vUv = uv; vec3 p = position; float x = (uv.x - 0.5) * 2.0, y = (uv.y - 0.5) * 2.0, w = sin(y * 2.2 + x * 1.3 + uT * 1.6);
        p.z += uBend * (x * x * 0.5 + 0.22 * w * (0.4 + 0.6 * x * x) - 0.17); vSh = uBend * (x + 0.12 * w); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `precision highp float; uniform sampler2D uTex; uniform float uP[8]; uniform float uRowC[8]; uniform float uRowH, uHot; varying vec2 vUv; varying float vSh;
      void main(){ float a = texture2D(uTex, vUv).a, rev = 0.0, head = 0.0;
        for (int k = 0; k < 8; k++) { float inRow = step(abs(vUv.y - uRowC[k]), uRowH * 0.5), edge = mix(-0.08, 1.08, uP[k]);
          rev += inRow * (1.0 - smoothstep(edge - 0.035, edge, vUv.x));
          head += (1.0 - smoothstep(0.2, 0.5, abs(vUv.y - uRowC[k]) / uRowH)) * exp(-pow((vUv.x - edge) / 0.011, 2.0)) * step(0.001, uP[k]) * step(uP[k], 0.999); }
        vec2 q = abs(vUv - 0.5) * 2.0; float rim = pow(max(q.x, q.y), 6.0);
        vec3 paper = mix(vec3(0.972, 0.955, 0.905), vec3(1.0, 0.84, 0.50), rim * 0.75 + (1.0 - vUv.y) * 0.08) * (1.0 - clamp(vSh * 0.45, -0.06, 0.14));
        vec3 col = mix(paper, vec3(0.043, 0.078, 0.125), clamp(a * rev, 0.0, 1.0));
        col = mix(col, vec3(1.0, 0.72, 0.22), clamp(head, 0.0, 1.0) * 0.75);
        gl_FragColor = vec4(mix(col, vec3(1.0, 0.95, 0.80), uHot), 1.0); }` })));
  page.renderOrder = 6; page.frustumCulled = false; scene.add(page);
  const haloU = { uA: { value: 0 } };
  const halo = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.6 / PAGE_AR, 2.3)), keep(new THREE.ShaderMaterial({ uniforms: haloU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `precision highp float; uniform float uA; varying vec2 vUv;
      void main(){ vec2 p = (vUv - 0.5) * vec2(${(2.6 / PAGE_AR).toFixed(4)}, 2.3); vec2 d = max(abs(p) - vec2(${(0.5 / PAGE_AR).toFixed(4)}, 0.5), 0.0); float g = exp(-length(d) * 10.0) * 0.5 + exp(-length(d) * 4.5) * 0.06;
        vec2 e = abs(vUv - 0.5) * 2.0; g *= smoothstep(1.0, 0.7, max(e.x, e.y)); gl_FragColor = vec4(vec3(1.0, 0.76, 0.36) * g * uA, 1.0); }` })));
  halo.position.z = -0.3; halo.renderOrder = 5; page.add(halo);

  // the place and date, drawn in the canvas and pinned to the camera
  const lc = document.createElement('canvas'); lc.width = 1024; lc.height = 300;
  { const c = lc.getContext('2d'), FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#ffc857'; c.fillRect(8, 30, 8, 236); c.fillStyle = '#f4f1e8'; c.font = `700 124px ${FONT}`; c.fillText('Snowbird, Utah', 52, 142);
    c.fillStyle = '#ffc857'; c.font = `500 76px ${FONT}`; c.fillText('February 2001', 54, 250); }
  const labelTex = keep(new THREE.CanvasTexture(lc)); labelTex.colorSpace = THREE.SRGBColorSpace; labelTex.anisotropy = 4;
  const label = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 300 / 1024)), keep(new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })));
  label.renderOrder = 20; label.frustumCulled = false; camera.add(label);

  let cw = 0, ch = 0, proj = 800, visH2 = 1;
  function resize(w, h) {
    cw = w; ch = h; renderer.setSize(w, h, false); portrait = h > w; const K = portrait ? KEYS.port : KEYS.land;
    camera.fov = K.fov; camera.aspect = w / h; camera.updateProjectionMatrix();
    const tanH = Math.tan(K.fov * Math.PI / 360); proj = h / (2 * tanH); const visH = 2 * PAGE_D * tanH, visW = visH * w / h;
    pageH = Math.min(0.74 * visH, 0.86 * visW * PAGE_AR); pageOffY = (portrait ? 0.115 : 0.1) * visH;
    visH2 = 2 * 2 * tanH; const visW2 = visH2 * w / h, lw = (reduced ? (portrait ? 0.4 : 0.22) : (portrait ? 0.62 : 0.3)) * visW2;
    label.scale.set(lw, lw, 1); label.position.set(-visW2 / 2 + (portrait ? 0.07 : 0.045) * visW2 + lw / 2, visH2 * (portrait ? (reduced ? 0.455 : 0.4) : 0.36), -2);
    glowMat.uniforms.uProj.value = proj; glowMat.uniforms.uPx.value = h / 720 * (portrait ? 0.6 : 1); snowMat.uniforms.uProj.value = proj; starMat.uniforms.uPx.value = Math.max(1, Math.min(w, h) / 720);
  }

  const hp = new V3();
  function render(time, w, h) {
    if (w !== cw || h !== ch) resize(w, h);
    const t = reduced ? STILL_T : clamp(time, 0, meta.seconds);
    camAt(t, camera.position, camera.quaternion); camera.updateMatrixWorld(true); shared.uCam.value.copy(camera.position); sky.position.copy(camera.position);
    starMat.uniforms.uT.value = t; snowMat.uniforms.uT.value = t;

    // lights, their trails and their glow on the snow
    let arrived = 0; const f = sstep((t - T_FUSE) / FUSE_LEN);
    for (let i = 0; i < LIGHTS; i++) {
      const o = L[i]; arrived += sstep(((t - o.t0) / o.dur - 0.8) / 0.2);
      for (let k = 0; k < TRAIL; k++) {
        const j = i * TRAIL + k, tt = t - k * LAG, m = lightAt(i, tt, hp), kk = 1 - k / TRAIL; gPos.set([hp.x, hp.y, hp.z], j * 3);
        if (k === 0) { gSize[j] = o.size * m * 1.75; gCol.set([o.col[0], o.col[1], o.col[2], 1], j * 4); shared.uL.value[i].copy(hp); const li = (t < T_PAGE + 0.1 ? 0.75 * m : 0); shared.uLc.value[i].set(o.col[0] * li, o.col[1] * li, o.col[2] * li); }
        else { gSize[j] = o.size * m * (0.2 + 0.6 * kk * kk); gCol.set([o.col[0], o.col[1], o.col[2], 0.42 * kk * kk * trailK], j * 4); }
      }
    }
    const warm = 0.22 + 0.78 * arrived / LIGHTS, s = sstep((t - T_PAGE) / PAGE_LEN);
    // lodge glow and fuse flash
    let j = LIGHTS * TRAIL; gPos.set([0, GROUND + 2.2, 1.5], j * 3); gSize[j] = 20; gCol.set([1, 0.72, 0.3, 0.16 * warm], j * 4);
    j++; const flash = Math.exp(-Math.pow((t - (T_FUSE + FUSE_LEN)) / 0.42, 2)); gPos.set([0, GROUND + FUSE_Y, 0], j * 3); gSize[j] = 4 + 26 * flash; gCol.set([1, 0.86, 0.55, Math.min(1, f * f * 0.9 * (1 - s) + flash)], j * 4);
    gg.attributes.position.needsUpdate = gg.attributes.aCol.needsUpdate = gg.attributes.aSize.needsUpdate = true;
    winEmis.value.set(1.0 * warm, 0.70 * warm, 0.26 * warm); shared.uLodge.value.set(0, GROUND + 2.5, 2.6, 0.9 * warm + 2.2 * flash);

    // the page
    page.visible = t > T_PAGE;
    if (page.visible) {
      pageAt(t, page.position, page.quaternion); page.scale.setScalar(pageH * (0.03 + 0.97 * Math.pow(s, 1.4)));
      for (let k = 0; k < 8; k++) pageU.uP.value[k] = clamp((t - (T_WRITE + k * ROW_STEP)) / ROW_LEN);
      pageU.uHot.value = Math.pow(1 - s, 2); pageU.uBend.value = 0.035 + 0.3 * (1 - s); pageU.uT.value = t; haloU.uA.value = 0.55 + 0.45 * (1 - s);
      shared.uPageL.value.set(page.position.x, page.position.y, page.position.z, 0.3 + 0.2 * s);
    } else shared.uPageL.value.set(0, GROUND + FUSE_Y, 0, 0.9 * flash);
    snowMat.uniforms.uNear.value = s; snowMat.uniforms.uWarm.value = 0.5 * s;

    label.material.opacity = reduced ? 0.92 : sstep((t - 0.1) / 0.6) * (1 - sstep((t - 5.4) / 1.0)); label.visible = label.material.opacity > 0.003;
    renderer.render(scene, camera);
  }
  function dispose() { for (const d of disposables) d.dispose(); trees.dispose(); renderer.dispose(); }
  return { render, dispose };
}
