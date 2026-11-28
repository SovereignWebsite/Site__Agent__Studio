// An agile cell grows: four lights (the four values) shrink to points and drift together into one membrane; a warm light
// (a person) and teal lights (agents) come into it; three files slide out of it (roles, rules, work); then it grows in four
// steps to fifty lights arranged as an org chart, the membrane stretching to hold them; at the end the chart folds down onto
// a shelf as a neat stack of file cards, the membrane closes, and only the files stay.
// The membrane is one signed-distance field: a smooth union of a circle and of one small disc round every light, so it
// reaches out to take in a light that arrives, pinches off round a file that leaves, and swells as the chart grows.
// Composed for 720x1280 first; 1280x720 is a second layout of the same objects, in pixels, under an orthographic camera.
// A lab scene component (see ../harness.js for the contract). render(t) is a pure function of t. Apache-2.0. By c.productions.
export const meta = {
  id: 'cells-grow',
  title: 'An agile cell grows',
  beat: 'Four lights become one cell; a person and agents gather in it, its roles, rules and work written out as files; it grows to fifty roles, a whole org chart for one task, then folds onto a shelf, its files kept.',
  seconds: 32,
  sources: [
    { title: 'Agile Cells: what a cell is (the agilecells.org page as seeded by the AgileCells organisation)', url: 'https://github.com/AgileCells/AgileCells-AgileCells__IaC/blob/dev/seed/AgileCells__Site__Website/site/index.html' },
    { title: 'Dinis Cruz on Agile Cells, 28 November 2026 (start prompt of the film)', url: 'https://studio.agents.sovereignweb.site/productions/plans/2026-11-28-agile-cells-film-start-prompt.md' },
  ],
};

const AMBER = [1.0, 0.784, 0.341], TEAL = [0.373, 0.816, 0.773], INK = [0.957, 0.945, 0.91], VAL = [1.0, 0.93, 0.80];
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const STILL_T = 27.0, T_STEP = [18.5, 21.0, 23.5, 25.5], COUNTS = [6, 10, 20, 30, 50], NN = 50, MAXE = 56;
const ARR = [7.3, 8.7, 9.5, 10.3, 11.1, 11.9], CARD_T = [12.4, 13.3, 14.2], CARD_BACK = 18.0, FOLD0 = 28.2, FOLD1 = 29.4, FD = 1.8, FOLD_END = FOLD1 + FD;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const fract = (x) => x - Math.floor(x);
const backOut = (x) => { const c = 1.5, u = x - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const bez = (a, b, cv, k) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], cx = mx - dy * cv, cy = my + dx * cv, u = 1 - k;
  return [u * u * a[0] + 2 * u * k * cx + k * k * b[0], u * u * a[1] + 2 * u * k * cy + k * k * b[1]]; };

// The org chart: one warm light at the top (0), three heads (1-3, the first agents of the cell), nine leads (4-12), and
// members (13-49) handed out across the leads so every step of growth spreads over the whole chart.
const PARENT = new Int8Array(NN), DEPTH = new Int8Array(NN), LEADS = [4, 7, 10, 5, 8, 11, 6, 9, 12], CYCLE = [4, 5, 6, 7, 8, 9, 10, 11, 12];
PARENT[0] = -1; for (let i = 1; i < 4; i++) PARENT[i] = 0; for (let i = 4; i < 10; i++) PARENT[i] = 1 + ((i - 4) % 3); for (let i = 10; i < 13; i++) PARENT[i] = i - 9;
for (let i = 13; i < NN; i++) PARENT[i] = CYCLE[(i - 13) % 9];
for (let i = 1; i < NN; i++) DEPTH[i] = DEPTH[PARENT[i]] + 1;
const BORN = Array.from({ length: NN }, (_, i) => COUNTS.findIndex((c) => c > i));
const PREV_SIB = new Int8Array(NN).fill(-1); { const last = {}; for (let i = 13; i < NN; i++) { const p = PARENT[i]; if (last[p] !== undefined) PREV_SIB[i] = last[p]; last[p] = i; } }

const LAY = {
  port: { W: 720, H: 1280, bars: { x: 360, half: 236, ys: [334, 376, 418, 460] }, cell0: [360, 612], cell1: [360, 612], R: 132,
    cards: [[196, 912, -0.13], [360, 930, 0], [524, 912, 0.13]], card: [134, 166],
    chart: { cx: 360, top: 345, bot: 820, w: 535, maxSlot: 118, maxR: 118 },
    counter: [360, 978], countFs: 124, roles: [360, 1056], rolesFs: 36, shelf: [360, 1018], shelfW: 156 },
  land: { W: 1280, H: 720, bars: { x: 640, half: 300, ys: [196, 230, 264, 298] }, cell0: [640, 392], cell1: [540, 388], R: 118,
    cards: [[850, 380, -0.12], [1000, 396, 0], [1150, 380, 0.12]], card: [122, 152],
    chart: { cx: 500, top: 210, bot: 532, w: 640, maxSlot: 108, maxR: 100 },
    counter: [1070, 352], countFs: 150, roles: [1070, 446], rolesFs: 38, shelf: [640, 566], shelfW: 160 },
};

// one stage of the chart, laid out in design pixels inside the layout's chart region
function chartLayout(N, C) {
  const pos = [], leads = LEADS.filter((i) => i < N), kids = {};
  for (let i = 13; i < N; i++) (kids[PARENT[i]] = kids[PARENT[i]] || []).push(i);
  const mRows = Math.max(0, ...Object.values(kids).map((k) => k.length)), nS = leads.length;
  const slot = Math.min(C.maxSlot, C.w / nS), Hu = 2 + 0.5 * mRows, r = Math.min(C.maxR, (C.bot - C.top) / Hu), H = r * Hu, top = (C.top + C.bot) / 2 - H / 2;
  leads.forEach((l, j) => { pos[l] = [C.cx + (j - (nS - 1) / 2) * slot, top + 2 * r]; });
  for (let hd = 1; hd < 4; hd++) { const ch = leads.filter((l) => PARENT[l] === hd); pos[hd] = [ch.reduce((s, l) => s + pos[l][0], 0) / ch.length, top + r]; }
  pos[0] = [C.cx, top];
  for (const l of Object.keys(kids)) kids[l].forEach((m, k) => { pos[m] = [pos[l][0] + (k % 2 ? 1 : -1) * slot * 0.2, pos[l][1] + (k + 1) * r * 0.5]; });
  return { pos, slot, r, ls: clamp(slot / 112, 0.5, 1), rr: Math.max(slot * 0.62, r * 0.42), k: slot * 1.5 };
}

export async function create({ canvas, THREE, reduced }) {
  const rnd = prng(28112026);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(0, 720, 0, -1280, -10, 10);
  const disposables = [], keep = (x) => { disposables.push(x); return x; };
  const quad = keep(new THREE.PlaneGeometry(2, 2)), unitPlane = keep(new THREE.PlaneGeometry(1, 1));
  const FS_VERT = 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const fsMesh = (frag, uniforms, order) => { const m = new THREE.Mesh(quad, keep(new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }))); m.frustumCulled = false; m.renderOrder = order; scene.add(m); return m; };
  const uRes = { value: new THREE.Vector2(720, 1280) };

  // backdrop: house navy, a warm breath of light behind the cell that grows with it, a vignette, a little grain against banding
  const bgU = { uRes, uGlow: { value: new THREE.Vector3(360, 612, 200) }, uGlowA: { value: 0 } };
  const bg = fsMesh(`precision highp float; uniform vec2 uRes; uniform vec3 uGlow; uniform float uGlowA;
    void main(){ vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y), uv = p / uRes;
      vec3 top = vec3(0.043, 0.078, 0.125), mid = vec3(0.071, 0.149, 0.227);
      vec3 col = mix(top, mid, 0.85 * exp(-pow((uv.y - 0.5) / 0.42, 2.0)));
      float g = length(p - uGlow.xy) / max(uGlow.z, 1.0);
      col += vec3(0.11, 0.085, 0.045) * exp(-g * g * 1.3) * uGlowA + vec3(0.03, 0.075, 0.08) * exp(-g * g * 0.35) * uGlowA;
      vec2 c = (uv - 0.5) * vec2(uRes.x / max(uRes.x, uRes.y), uRes.y / max(uRes.x, uRes.y)) * 1.5;
      col *= 1.0 - 0.42 * smoothstep(0.25, 0.85, length(c));
      col += (fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 2.5 / 255.0;
      gl_FragColor = vec4(col, 1.0); }`, bgU, -10);
  bg.material.blending = THREE.NoBlending; bg.material.transparent = false;

  // the four values: each a capsule from A to B; as a bar it carries word-shaped blocks (the lines of text of the last scene),
  // as it travels it is a comet with a short tail, and at rest a small point
  const vU = { uRes, uSeg: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) }, uPar: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) } };
  const vals = fsMesh(`precision highp float; uniform vec2 uRes; uniform vec4 uSeg[4]; uniform vec4 uPar[4];
    float hash(float n){ return fract(sin(n * 91.345) * 47453.21); }
    void main(){ vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y); vec3 col = vec3(0.0);
      for (int i = 0; i < 4; i++) { vec4 sg = uSeg[i], pr = uPar[i]; if (pr.y < 0.002) continue;
        vec2 pa = p - sg.xy, ba = sg.zw - sg.xy; float l2 = dot(ba, ba), h = l2 > 1.0 ? clamp(dot(pa, ba) / l2, 0.0, 1.0) : 1.0;
        float d = length(pa - ba * h) - pr.x, len = sqrt(l2), nw = 9.0 + float(i) * 1.3, wx = h * nw, wc = floor(wx);
        float wl = 0.58 + 0.34 * hash(wc + float(i) * 17.0), mask = smoothstep(wl + 0.02, wl - 0.02, fract(wx)) * smoothstep(0.0, 0.04, fract(wx));
        mask = mix(mask, 0.8, smoothstep(9.0, 3.0, len / nw));
        float body = smoothstep(0.9, -0.9, d) * mix(1.0, mask, pr.z), fade = mix(1.0, h * h, pr.w);
        float halo = exp(-max(d, 0.0) / 8.0) * 0.30 + exp(-max(d, 0.0) / 34.0) * 0.09;
        col += (vec3(${VAL}) * (body * 1.05 + halo) + vec3(1.0) * body * 0.25) * pr.y * fade; }
      gl_FragColor = vec4(col, 1.0); }`, vU, 4);

  // the membrane: a smooth union of a circle and of small discs, wobbling, with a double edge, a halo and a faint fill
  const mU = { uRes, uP: { value: Array.from({ length: MAXE }, () => new THREE.Vector4()) }, uN: { value: 0 }, uCirc: { value: new THREE.Vector3() }, uEll: { value: new THREE.Vector4() }, uK: { value: 60 },
    uA: { value: 0 }, uFill: { value: 1 }, uT: { value: 0 }, uWob: { value: 1 }, uFlash: { value: 0 }, uCen: { value: new THREE.Vector2() } };
  const membrane = fsMesh(`precision highp float; uniform vec2 uRes, uCen; uniform vec4 uP[${MAXE}]; uniform int uN; uniform vec3 uCirc; uniform vec4 uEll; uniform float uK, uA, uFill, uT, uWob, uFlash;
    float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
    void main(){ vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y); float s = 1e4;
      if (uCirc.z > 0.5) s = length(p - uCirc.xy) - uCirc.z;
      if (uEll.z > 0.5) { vec2 e = (p - uEll.xy) / uEll.zw; s = min(s, (length(e) - 1.0) * min(uEll.z, uEll.w)); }
      for (int i = 0; i < ${MAXE}; i++) { if (i >= uN) break; vec4 c = uP[i]; if (c.z < 0.5) continue; s = smin(s, length(p - c.xy) - c.z, uK); }
      if (s > 400.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
      vec2 d = p - uCen; float ang = atan(d.y, d.x);
      s += uWob * (sin(ang * 5.0 + uT * 1.1) * 2.0 + sin(ang * 9.0 - uT * 1.7) * 1.0 + sin(ang * 3.0 + uT * 0.6) * 1.6);
      float a = abs(s), inside = smoothstep(1.0, -2.0, s);
      float edge = exp(-a / 1.3) * 0.95 + exp(-abs(s + 6.5) / 1.1) * 0.32 + exp(-a / 10.0) * 0.20 + exp(-a / 42.0) * 0.06;
      float n = sin(p.x * 0.045 + uT * 0.3) * sin(p.y * 0.05 - uT * 0.25) + 0.6 * sin((p.x + p.y) * 0.021 + uT * 0.2);
      float fill = inside * (0.030 + 0.085 * exp(s / 24.0) + 0.010 * n);
      vec3 col = vec3(1.0, 0.89, 0.70) * edge * (1.0 + uFlash) + vec3(0.30, 0.62, 0.62) * fill * uFill;
      gl_FragColor = vec4(col * uA, 1.0); }`, mU, 2);

  // the shelf and the stack of file cards that the chart folds into
  const sU = { uRes, uC: { value: new THREE.Vector2() }, uS: { value: 1 }, uA: { value: 0 }, uN: { value: 0 }, uW: { value: 150 }, uFlash: { value: 0 }, uFace: { value: 0 } };
  const shelf = fsMesh(`precision highp float; uniform vec2 uRes, uC; uniform float uS, uA, uN, uW, uFlash, uFace;
    float sdb(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
    void main(){ vec2 p = (vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) - uC) / uS; vec3 col = vec3(0.0);
      float plank = sdb(p - vec2(0.0, 3.0), vec2(uW, 2.2), 2.0);
      col += vec3(${AMBER}) * (exp(-max(plank, 0.0) / 1.4) * 0.85 + exp(-max(plank, 0.0) / 20.0) * 0.22);
      col += vec3(${AMBER}) * exp(-pow(p.y / 70.0, 2.0) - pow(p.x / (uW * 1.1), 2.0)) * 0.07;
      float topY = 0.0;
      for (int i = 0; i < 14; i++) { float fi = float(i), k = clamp(uN - fi, 0.0, 1.0); if (k <= 0.0) break;
        float jx = (fract(sin(fi * 12.9) * 43.7) - 0.5) * 8.0, cy = -7.5 - fi * 9.0 - (1.0 - k) * 18.0; topY = -3.0 - fi * 9.0 - 9.0;
        vec2 q = p - vec2(jx, cy); float sl = sdb(q, vec2(uW * 0.66, 3.4), 2.0);
        float tx = (fract(fi * 0.37) - 0.5) * uW * 1.0, tab = sdb(q - vec2(tx, -4.6), vec2(11.0, 2.2), 1.5);
        float e = min(sl, tab), ins = step(e, 0.0), fresh = exp(-max(uN - fi - 1.0, 0.0) * 2.5);
        col += vec3(1.0, 0.86, 0.6) * (exp(-abs(e) / 1.1) * 0.75 + ins * 0.10 + exp(-max(e, 0.0) / 9.0) * 0.08) * k * (0.75 + 0.6 * fresh); }
      // the face of the top card, seen a little from above, with faint lines like a file
      if (uFace > 0.001) { vec2 q = p - vec2(0.0, topY - 15.0); q.x += q.y * 0.55; float fc = sdb(q, vec2(uW * 0.6, 13.0), 2.5), ins = step(fc, 0.0);
        float ln = ins * step(abs(fract((q.y + 13.0) / 6.5) - 0.5), 0.14) * step(q.y, 8.0) * step(-8.0, q.y) * step(q.x, uW * (0.1 + 0.3 * fract(floor((q.y + 13.0) / 6.5) * 0.61))) * step(-uW * 0.5, q.x);
        col += vec3(1.0, 0.88, 0.66) * (exp(-abs(fc) / 1.1) * 0.7 + ins * 0.07 + ln * 0.22) * uFace; }
      col += vec3(1.0, 0.95, 0.85) * exp(-pow(length((p - vec2(0.0, topY)) / vec2(uW * 0.8, 26.0)), 2.0)) * uFlash * 0.5;
      gl_FragColor = vec4(col * uA, 1.0); }`, sU, 3);

  // links: thin glowing segments, built on the CPU every frame
  const MAXS = 420, sPos = new Float32Array(MAXS * 4 * 3), sV = new Float32Array(MAXS * 4), sCol = new Float32Array(MAXS * 4 * 3), sA = new Float32Array(MAXS * 4), sIdx = [];
  for (let i = 0; i < MAXS; i++) { const a = i * 4; sIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const lGeo = keep(new THREE.BufferGeometry());
  [['position', sPos, 3], ['aV', sV, 1], ['aCol', sCol, 3], ['aA', sA, 1]].forEach(([n, a, s]) => lGeo.setAttribute(n, new THREE.BufferAttribute(a, s).setUsage(THREE.DynamicDrawUsage)));
  lGeo.setIndex(sIdx);
  const lines = new THREE.Mesh(lGeo, keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute float aV, aA; attribute vec3 aCol; varying float vV, vA; varying vec3 vCol; void main(){ vV = aV; vA = aA; vCol = aCol; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'precision highp float; varying float vV, vA; varying vec3 vCol; void main(){ float c = exp(-vV * vV * 9.0) * 0.9 + exp(-vV * vV * 2.2) * 0.18; gl_FragColor = vec4(vCol * c * vA, 1.0); }' })));
  lines.frustumCulled = false; lines.renderOrder = 5; scene.add(lines);

  // lights: one Points cloud for every glow (people, agents, pulses, specks, dust)
  const MAXP = 700, gPos = new Float32Array(MAXP * 3), gCol = new Float32Array(MAXP * 3), gA = new Float32Array(MAXP * 4);
  const gGeo = keep(new THREE.BufferGeometry());
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3).setUsage(THREE.DynamicDrawUsage)); gGeo.setAttribute('aCol', new THREE.BufferAttribute(gCol, 3).setUsage(THREE.DynamicDrawUsage));
  gGeo.setAttribute('aA', new THREE.BufferAttribute(gA, 4).setUsage(THREE.DynamicDrawUsage));
  const glows = new THREE.Points(gGeo, keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute vec3 aCol; attribute vec4 aA; varying vec3 vCol; varying vec4 vA; void main(){ vCol = aCol; vA = aA; gl_PointSize = aA.y; gl_Position = projectionMatrix * viewMatrix * vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `precision highp float; varying vec3 vCol; varying vec4 vA;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0, kc = vA.z;
        float halo = exp(-d * d * 6.5) * 0.42 + 0.05 / (1.0 + d * d * 36.0), core = exp(-d * d * kc) * 1.45;
        float fl = vA.w * (exp(-abs(q.x) * 120.0) + exp(-abs(q.y) * 120.0)) * exp(-d * 2.4) * 0.5;
        vec3 col = mix(vCol, vec3(1.0, 0.98, 0.94), clamp(exp(-d * d * kc * 2.6), 0.0, 1.0));
        gl_FragColor = vec4(col * (halo + core + fl) * vA.x * smoothstep(1.0, 0.82, d), 1.0); }` })));
  glows.frustumCulled = false; glows.renderOrder = 8; scene.add(glows);

  // text and cards: canvas textures (the only words: roles, rules, work, 10, 20, 30, 50, roles)
  const texOf = (c) => { const tex = keep(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; return tex; };
  const sprite = (c, w, h, blending, order) => { const m = new THREE.Mesh(unitPlane, keep(new THREE.MeshBasicMaterial({ map: texOf(c), transparent: true, depthTest: false, depthWrite: false, opacity: 0, blending })));
    m.renderOrder = order; m.frustumCulled = false; m.visible = false; scene.add(m); return { m, w, h }; };
  const sprites = [];
  function textSprite(text, fs, color, glow, weight) {
    const c = document.createElement('canvas'), x = c.getContext('2d'), S2 = 2, f = `${weight} ${fs * S2}px ${FONT}`; x.font = f;
    const tw = Math.ceil(x.measureText(text).width), pad = Math.ceil(fs * 0.5) * S2; c.width = tw + pad * 2; c.height = Math.ceil(fs * S2 * 1.3 + pad * 2);
    x.font = f; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (glow) { x.shadowColor = glow; x.shadowBlur = fs * 0.35 * S2; x.fillStyle = color; x.fillText(text, c.width / 2, c.height / 2); x.shadowBlur = fs * 0.12 * S2; }
    x.fillStyle = color; x.fillText(text, c.width / 2, c.height / 2);
    const s = sprite(c, c.width / S2, c.height / S2, THREE.AdditiveBlending, 22); sprites.push(s); return s;
  }
  function cardSprite(word, cw, ch, seed) {
    const r = prng(seed), c = document.createElement('canvas'), x = c.getContext('2d'), S2 = 2, m = 20; c.width = (cw + m * 2) * S2; c.height = (ch + m * 2) * S2;
    x.scale(S2, S2); x.translate(m, m); const ear = 22;
    const outline = () => { x.beginPath(); x.moveTo(9, 0); x.lineTo(cw - ear, 0); x.lineTo(cw, ear); x.lineTo(cw, ch - 9); x.quadraticCurveTo(cw, ch, cw - 9, ch); x.lineTo(9, ch); x.quadraticCurveTo(0, ch, 0, ch - 9); x.lineTo(0, 9); x.quadraticCurveTo(0, 0, 9, 0); x.closePath(); };
    x.shadowColor = 'rgba(255,200,87,0.55)'; x.shadowBlur = 16; outline(); x.fillStyle = 'rgba(12,26,40,0.95)'; x.fill(); x.shadowBlur = 0;
    x.strokeStyle = 'rgba(255,228,176,0.9)'; x.lineWidth = 1.6; outline(); x.stroke();
    x.beginPath(); x.moveTo(cw - ear, 0); x.lineTo(cw - ear, ear - 4); x.quadraticCurveTo(cw - ear, ear, cw - ear + 4, ear); x.lineTo(cw, ear); x.closePath(); x.fillStyle = 'rgba(255,228,176,0.22)'; x.fill(); x.stroke();
    const fs = Math.round(ch * 0.15); x.font = `600 ${fs}px ${FONT}`; x.textBaseline = 'alphabetic'; x.fillStyle = '#f4f1e8'; x.fillText(word, 13, 12 + fs * 0.85);
    x.fillStyle = 'rgba(255,228,176,0.28)'; x.fillRect(13, 22 + fs, cw - 26, 1.2);
    const rows = 7, y0 = 34 + fs, step = (ch - y0 - 14) / rows, ind = [0, 1, 1, 2, 2, 1, 0];
    for (let i = 0; i < rows; i++) { const y = y0 + i * step, xi = 14 + ind[i] * 11, bh = 4.2;
      const bar = (bx, bw, col) => { x.fillStyle = col; x.beginPath(); x.roundRect(bx, y, bw, bh, 2); x.fill(); };
      if (i === 0 || i === rows - 1) { bar(xi, 8, 'rgba(244,241,232,0.35)'); continue; }
      const kw = 16 + r() * 18, vw = 14 + r() * (cw - xi - kw - 40); bar(xi, kw, 'rgba(95,208,197,0.55)'); bar(xi + kw + 7, vw, 'rgba(255,200,87,0.42)'); }
    const s = sprite(c, cw + m * 2, ch + m * 2, THREE.NormalBlending, 12); sprites.push(s); return s;
  }
  const nums = ['10', '20', '30', '50'];
  let numSpr = null, rolesSpr = null, cards = null, layKey = null;
  function buildText(L) { // sized to the layout; built once per orientation
    if (layKey === L) return; layKey = L;
    for (const s of sprites) { scene.remove(s.m); } sprites.length = 0;
    numSpr = nums.map((n) => textSprite(n, L.countFs, '#ffd889', 'rgba(255,200,87,0.9)', 700));
    rolesSpr = textSprite('roles', L.rolesFs, '#f4f1e8', 'rgba(244,241,232,0.35)', 500);
    cards = ['roles', 'rules', 'work'].map((wd, i) => cardSprite(wd, L.card[0], L.card[1], 77 + i * 13));
  }
  const place = (s, x, y, scale, a, rot = 0) => { s.m.position.set(x, -y, 0); s.m.scale.set(s.w * scale, s.h * scale, 1); s.m.rotation.z = -rot; s.m.material.opacity = a; s.m.visible = a > 0.003; };

  // seeded looks
  const COL = Array.from({ length: NN }, (_, i) => (i === 0 ? AMBER : i < 6 ? TEAL : (rnd() < 0.24 ? AMBER : TEAL)));
  const PH = Array.from({ length: NN }, () => [rnd() * 6.28, 0.5 + rnd() * 0.7, rnd()]);
  const HOME = [[0, -48], [-80, 6], [80, 2], [-52, 66], [54, 64], [0, 86]];
  const FROM = [[-0.4, -2.5], [-2.8, 0.2], [2.8, -0.2], [-2.2, 2.1], [2.2, 2.0], [0.1, 2.9]];
  const CORE = [[0, -11], [11, 0], [0, 11], [-11, 0]];
  const SPECK = Array.from({ length: 110 }, () => ({ u: rnd(), v: rnd(), ph: rnd() * 6.28, sp: 0.3 + rnd() * 0.6, s: 3 + rnd() * 4, a: 0.10 + rnd() * 0.18 }));
  const DUST = Array.from({ length: 150 }, () => ({ x: rnd(), y: rnd(), s: 2.5 + rnd() * 4.5, a: 0.03 + rnd() * 0.08, ph: rnd() * 6.28, sp: 0.2 + rnd() * 0.5 }));

  let L = null, isPortrait = null, stages = null, order = null;
  function setLayout(portrait) {
    isPortrait = portrait; L = portrait ? LAY.port : LAY.land; buildText(L);
    stages = [null, ...COUNTS.slice(1).map((n) => chartLayout(n, L.chart))];
    const fin = stages[4].pos, idx = [...Array(NN).keys()];
    idx.sort((a, b) => (DEPTH[b] - DEPTH[a]) || (fin[b][1] - fin[a][1]) || (Math.abs(fin[b][0] - L.chart.cx) - Math.abs(fin[a][0] - L.chart.cx)));
    order = new Float32Array(NN); idx.forEach((i, r) => { order[i] = FOLD0 + (r / (NN - 1)) * (FOLD1 - FOLD0); });
  }

  // buffers
  let si = 0, gi = 0, S = 1, X0 = 0, Y0 = 0;
  const X = (x) => X0 + x * S, Y = (y) => Y0 + y * S;
  function seg(ax, ay, bx, by, col, a, hw) {
    if (si >= MAXS || a <= 0.003) return; let dx = bx - ax, dy = by - ay; const l = Math.hypot(dx, dy); if (l < 0.5) return; dx /= l; dy /= l;
    const e = hw * 0.5; ax -= dx * e; ay -= dy * e; bx += dx * e; by += dy * e; const nx = -dy * hw, ny = dx * hw, v = si * 4;
    const P = [[ax + nx, ay + ny, -1], [ax - nx, ay - ny, 1], [bx + nx, by + ny, -1], [bx - nx, by - ny, 1]];
    P.forEach((q, j) => { sPos.set([q[0], -q[1], 0], (v + j) * 3); sV[v + j] = q[2]; sCol.set(col, (v + j) * 3); sA[v + j] = a; }); si++;
  }
  function glow(x, y, col, a, size, core, flare = 0) { if (gi >= MAXP || a <= 0.003) return; gPos.set([x, -y, 0], gi * 3); gCol.set(col, gi * 3); gA.set([a, size, Math.pow(size / (2 * Math.max(1, core)), 2), flare], gi * 4); gi++; }

  function render(time, w, h) {
    const portrait = h > w; if (portrait !== isPortrait) setLayout(portrait);
    if (canvas.width !== w || canvas.height !== h) renderer.setSize(w, h, false); renderer.setViewport(0, 0, w, h);
    const t = reduced ? STILL_T : clamp(time, 0, meta.seconds);
    S = Math.min(w / L.W, h / L.H); X0 = (w - L.W * S) / 2; Y0 = (h - L.H * S) / 2;
    camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h; camera.updateProjectionMatrix();
    uRes.value.set(w, h); si = 0; gi = 0;
    const R = L.R, cellC = [lerp(L.cell0[0], L.cell1[0], sstep((t - 7) / 2.5)), lerp(L.cell0[1], L.cell1[1], sstep((t - 7) / 2.5))];
    const rs = R / 132;

    // dust: a slow room of motes round everything
    for (const d of DUST) { const x = fract(d.x + 0.003 * t * d.sp + 0.01 * Math.sin(t * 0.3 + d.ph)), y = fract(d.y - 0.004 * t * d.sp);
      glow(x * w, y * h, [0.6, 0.72, 0.85], d.a * (0.7 + 0.3 * Math.sin(t * d.sp * 2 + d.ph)), d.s * S, 1.2); }

    // 1. the four values: bars, then points, then a drift into one place; the membrane inflates round them
    const inflate = sstep((t - 3.7) / 1.7), circR = R * (t < 3.7 ? 0 : backOut(inflate)) * (1 - sstep((t - 18.75) / 1.0));
    { const B = L.bars, shrink = sstep((t - 0.7) / 1.9), absorb = sstep((t - 18.4) / 1.0);
      for (let i = 0; i < 4; i++) {
        const home = [B.x, B.ys[i]], core = [cellC[0] + CORE[i][0] * rs, cellC[1] + CORE[i][1] * rs - 4];
        const at = (tt) => { const k = sstep((tt - 2.4 - i * 0.14) / 2.5); return bez(home, [L.cell0[0] + CORE[i][0] * rs, L.cell0[1] + CORE[i][1] * rs - 4], (i % 2 ? 0.35 : -0.35), k); };
        let A, Bp, rad, a, word, trail;
        if (t < 2.4 + i * 0.14) { const hl = B.half * (1 - shrink) * (1 - 0.06 * i * (1 - shrink)); A = [home[0] - hl, home[1]]; Bp = [home[0] + hl, home[1]]; rad = lerp(5.5, 3.2, shrink); a = 0.8 + 0.6 * shrink; word = 1 - shrink; trail = 0; }
        else if (t < 7.2) { Bp = at(t); A = at(t - 0.35); rad = 3.2; a = lerp(1.4, 0.55, sstep((t - 4.6) / 2.0)); word = 0; trail = 1; }
        else { const root = stages[1].pos[0]; Bp = [lerp(core[0], root[0], absorb), lerp(core[1], root[1], absorb)]; A = Bp; rad = 2.6; a = 0.55 * (1 - absorb) * (0.85 + 0.15 * Math.sin(t * 1.3 + i)); word = 0; trail = 0; }
        vU.uSeg.value[i].set(X(A[0]), Y(A[1]), X(Bp[0]), Y(Bp[1])); vU.uPar.value[i].set(rad * S, a, word, trail);
      }
      vals.visible = t < 19.6; }

    // 2. where every light is: cell phase (arrivals), then the four stages of the chart, then the fold
    const cur = new Array(NN), alpha = new Float32Array(NN), size = new Float32Array(NN), memb = new Float32Array(NN);
    const stage = T_STEP.reduce((k, T, j) => (t >= T ? j + 1 : k), 0);
    const cellPos = (i, tt) => { const hm = HOME[i], ph = PH[i]; return [cellC[0] + hm[0] * rs + 3 * Math.sin(tt * ph[1] + ph[0]), cellC[1] + hm[1] * rs + 3 * Math.cos(tt * ph[1] * 1.3 + ph[0])]; };
    const gE = stage ? sstep((t - T_STEP[stage - 1] - 0.1) / 1.0) : 0;
    const prevSt = stage > 1 ? stages[stage - 1] : null, st = stage ? stages[stage] : null;
    const ls = !stage ? 1 : lerp(prevSt ? prevSt.ls : 1, st.ls, gE);
    const rrNow = !stage ? 16 : lerp(prevSt ? prevSt.rr : 16 * rs, st.rr, gE), kNow = !stage ? 0.5 * R : lerp(prevSt ? prevSt.k : 0.5 * R, st.k, gE);
    const pop = new Float32Array(NN);
    for (let i = 0; i < NN; i++) {
      let p = null, a = 0;
      if (!stage) {
        if (i < 6 && t >= ARR[i]) { const k = sstep((t - ARR[i]) / 1.15), from = [cellC[0] + FROM[i][0] * R, cellC[1] + FROM[i][1] * R];
          p = bez(from, cellPos(i, t), i % 2 ? 0.22 : -0.22, k); a = sstep((t - ARR[i]) / 0.5); pop[i] = t > ARR[i] + 1.15 ? Math.exp(-(t - ARR[i] - 1.15) * 5) : 0; }
      } else if (BORN[i] <= stage) {
        const T = T_STEP[stage - 1];
        if (BORN[i] < stage) { const prev = stage === 1 ? cellPos(i, T) : prevSt.pos[i], e = sstep((t - T - 0.06 * DEPTH[i] - 0.05) / 0.95); p = [lerp(prev[0], st.pos[i][0], e), lerp(prev[1], st.pos[i][1], e)]; a = 1; }
        else { const ob = i - COUNTS[stage - 1], nb = COUNTS[stage] - COUNTS[stage - 1], e = clamp((t - T - 0.2 - 0.55 * ob / nb) / 0.7), pe = backOut(e), pp = cur[PARENT[i]];
          if (e > 0) { p = [lerp(pp[0], st.pos[i][0], pe), lerp(pp[1], st.pos[i][1], pe)]; a = sstep(e * 3); pop[i] = e >= 1 ? Math.exp(-(t - T - 0.2 - 0.55 * ob / nb - 0.7) * 5) : 0.6 * e; } }
        if (p) { const ph = PH[i]; p[0] += 2.2 * Math.sin(t * ph[1] + ph[0]) * ls; p[1] += 2.2 * Math.cos(t * ph[1] * 1.2 + ph[0]) * ls; }
      }
      cur[i] = p; alpha[i] = a;
      const base = i === 0 ? 150 : !stage ? 100 : DEPTH[i] === 1 ? 108 : DEPTH[i] === 2 ? 96 : 84;
      size[i] = base * (i === 0 ? Math.max(ls, 0.7) : ls) * (1 + 0.55 * pop[i]);
      if (p) { if (!stage) { const dOut = Math.hypot(p[0] - cellC[0], p[1] - cellC[1]) - circR; memb[i] = 16 * rs * clamp(1 - dOut / 80) * a; }
        else memb[i] = (BORN[i] < stage ? lerp(stage === 1 ? 16 * rs : rrNow, rrNow, 1) : rrNow * sstep(alpha[i] * 1.2)) * (i === 0 ? 1.15 : 1); }
    }
    // the fold: from the bottom of the chart upwards, every light dims and drops onto the shelf as a card
    const sh = L.shelf; let landed = 0; const fk = new Float32Array(NN);
    const layersAt = (n) => (12 * n) / NN;
    for (let i = 0; i < NN; i++) if (cur[i] && t >= order[i]) { const k = clamp((t - order[i]) / FD); fk[i] = k; if (k >= 1) landed++; }
    const stackTop = sh[1] - 3 - layersAt(landed) * 9 - 6;
    for (let i = 0; i < NN; i++) { if (!cur[i] || fk[i] <= 0) continue; const k = fk[i], e = k * k * k * (k * (k * 6 - 15) + 10);
      const tgt = [sh[0] + clamp((cur[i][0] - L.chart.cx) * 0.3, -L.shelfW * 0.6, L.shelfW * 0.6), stackTop - 4 - 10 * (1 - (order[i] - FOLD0) / (FOLD1 - FOLD0))];
      cur[i] = [lerp(cur[i][0], tgt[0], e), lerp(cur[i][1], tgt[1], e)];
      alpha[i] *= (1 - 0.6 * e) * (k >= 1 ? 0 : 1); size[i] *= 1 - 0.4 * e; memb[i] *= (1 - 0.45 * e) * (1 - sstep((k - 0.72) / 0.28)); }

    // 3. cards: out of the cell from about 12 s, back into it as the chart begins
    const cardState = L.cards.map((c, i) => { const out = sstep((t - CARD_T[i]) / 1.1), back = sstep((t - CARD_BACK - i * 0.12) / 0.8), k = out * (1 - back);
      if (k <= 0.001) return null; const from = [cellC[0], cellC[1] + 10], p = bez(from, [c[0], c[1] + 3 * Math.sin(t * 0.9 + i * 2)], i === 1 ? 0 : (i ? 0.18 : -0.18), k);
      return { p, k, rot: c[2] * k, a: sstep(k * 2.2) }; });

    // 4. the membrane: entries are the circle, every light, and every card while it is near the edge
    { let n = 0, cx = 0, cy = 0, cw = 0, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      const add = (x, y, r) => { if (n >= MAXE || r < 0.5) return; mU.uP.value[n++].set(X(x), Y(y), r * S, 0); cx += x * r; cy += y * r; cw += r;
        minX = Math.min(minX, x - r); maxX = Math.max(maxX, x + r); minY = Math.min(minY, y - r); maxY = Math.max(maxY, y + r); };
      for (let i = 0; i < NN; i++) if (cur[i]) add(cur[i][0], cur[i][1], memb[i]);
      cardState.forEach((c) => { if (!c) return; const dOut = Math.hypot(c.p[0] - cellC[0], c.p[1] - cellC[1]) - circR; add(c.p[0], c.p[1], 30 * rs * clamp(1 - dOut / 95)); });
      let ell = null;
      if (stage && maxX > minX) { const bx = (minX + maxX) / 2, by = (minY + maxY) / 2, f = (0.86 * sstep((t - T_STEP[0]) / 1.0)) * (1 - sstep((t - FOLD_END + 0.7) / 0.6));
        if (f > 0.02) ell = [bx, by, (maxX - minX) / 2 * f, (maxY - minY) / 2 * f]; }
      mU.uEll.value.set(ell ? X(ell[0]) : 0, ell ? Y(ell[1]) : 0, ell ? Math.max(1, ell[2] * S) : 0, ell ? Math.max(1, ell[3] * S) : 0);
      if (circR > 0.5) { cx += cellC[0] * circR * 4; cy += cellC[1] * circR * 4; cw += circR * 4; minX = Math.min(minX, cellC[0] - circR); maxX = Math.max(maxX, cellC[0] + circR); minY = Math.min(minY, cellC[1] - circR); maxY = Math.max(maxY, cellC[1] + circR); }
      mU.uN.value = n; mU.uCirc.value.set(X(cellC[0]), Y(cellC[1]), circR * S); mU.uK.value = kNow * S; mU.uT.value = t;
      const cen = cw > 0 ? [cx / cw, cy / cw] : (t > 20 ? [sh[0], sh[1] - 40] : cellC); mU.uCen.value.set(X(cen[0]), Y(cen[1]));
      const formed = sstep((t - 3.7) / 0.8), stepFlash = T_STEP.reduce((s, T) => s + Math.exp(-Math.pow((t - T - 0.5) / 0.35, 2)) * 0.6, 0) + Math.exp(-Math.pow((t - 5.0) / 0.4, 2)) * 0.7;
      const closing = sstep((t - FOLD_END + 0.2) / 0.5);
      mU.uA.value = formed * (0.9 - 0.2 * sstep((t - 28.5) / 2)) * (1 - closing) * (cw > 0 || circR > 0.5 ? 1 : 0); mU.uFlash.value = stepFlash; mU.uWob.value = S * (stage ? lerp(1, 1.6, ls < 0.7 ? 1 : 0) : 1);
      membrane.visible = mU.uA.value > 0.002;
      bgU.uGlow.value.set(X(cen[0]), Y(cen[1]), Math.max(60, Math.max(maxX - minX, maxY - minY) * 0.75) * S); bgU.uGlowA.value = sstep((t - 3.6) / 2) * (1 - 0.75 * sstep((t - 28.5) / 2.5)) * (cw > 0 || circR > 0.5 ? 1 : 0.4);
      // specks of cytoplasm, only where the field is inside
      if (membrane.visible && maxX > minX) { const K = kNow, field = (x, y) => { let s = circR > 0.5 ? Math.hypot(x - cellC[0], y - cellC[1]) - circR : 1e4;
          if (ell) s = Math.min(s, (Math.hypot((x - ell[0]) / ell[2], (y - ell[1]) / ell[3]) - 1) * Math.min(ell[2], ell[3]));
          for (let i = 0; i < NN; i++) if (cur[i] && memb[i] > 0.5) { const b = Math.hypot(x - cur[i][0], y - cur[i][1]) - memb[i], hh = Math.max(K - Math.abs(s - b), 0) / K; s = Math.min(s, b) - hh * hh * K * 0.25; } return s; };
        for (const sp of SPECK) { const x = lerp(minX, maxX, sp.u) + 6 * Math.sin(t * sp.sp + sp.ph), y = lerp(minY, maxY, sp.v) + 6 * Math.cos(t * sp.sp * 0.8 + sp.ph), f = field(x, y);
          const a = sstep(-f / 18) * sp.a * mU.uA.value; glow(X(x), Y(y), [0.55, 0.85, 0.82], a * (0.6 + 0.4 * Math.sin(t * 1.7 + sp.ph)), sp.s * S, 1.0); } }
    }

    // 5. links: straight in the cell (the person briefs each agent), elbows in the chart, pulses running down them
    const orth = sstep((t - T_STEP[0] - 0.1) / 0.9), hwBase = (1.3 + 1.1 * ls) * S;
    const holdP = sstep((t - 25.9) / 0.5) * (1 - sstep((t - 28.1) / 0.4)), cellP = sstep((t - 9.4) / 0.8) * (1 - sstep((t - 18.2) / 0.4));
    const kidsVis = new Float32Array(NN); for (let i = 1; i < NN; i++) if (cur[i] && DEPTH[i] <= 2) kidsVis[PARENT[i]] += alpha[i] > 0.05 ? 1 : 0;
    const pulseAt = (pts, u) => { let tot = 0; const ls2 = []; for (let j = 1; j < pts.length; j++) { const l = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); ls2.push(l); tot += l; }
      let d = u * tot; for (let j = 1; j < pts.length; j++) { if (d <= ls2[j - 1] || j === pts.length - 1) { const k = ls2[j - 1] ? clamp(d / ls2[j - 1]) : 0; return [lerp(pts[j - 1][0], pts[j][0], k), lerp(pts[j - 1][1], pts[j][1], k)]; } d -= ls2[j - 1]; } return pts[0]; };
    for (let i = 1; i < NN; i++) {
      const c = cur[i], p = cur[PARENT[i]]; if (!c || !p) continue;
      const out = 1 - sstep((t - order[i] + 0.15) / 0.3), a0 = Math.min(alpha[i], alpha[PARENT[i]] > 0 ? 1 : 0) * out; if (a0 <= 0.003) continue;
      const col = mix3(COL[i], INK, 0.45), C = [X(c[0]), Y(c[1])], P = [X(p[0]), Y(p[1])];
      let pts;
      if (DEPTH[i] <= 2) { const mid = P[1] + (C[1] - P[1]) * 0.5; pts = [[P[0], mid], [C[0], mid], C];
        seg(P[0], P[1], P[0], mid, col, 0.5 * a0 * orth / Math.max(1, kidsVis[PARENT[i]]), hwBase); }
      else { const ps = PREV_SIB[i] >= 0 && cur[PREV_SIB[i]] ? Y(cur[PREV_SIB[i]][1]) : P[1]; seg(P[0], ps, P[0], C[1], col, 0.5 * a0 * orth, hwBase); pts = [[P[0], C[1]], C]; }
      for (let j = 1; j < pts.length; j++) seg(pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1], col, 0.5 * a0 * orth, hwBase);
      if (orth < 1) seg(P[0], P[1], C[0], C[1], col, 0.42 * a0 * (1 - orth) * sstep((t - ARR[Math.min(i, 5)] - 0.9) / 0.6), hwBase);
      // pulses: work handed down the chart in the hold, and from the person to each agent in the cell
      const full = DEPTH[i] <= 2 ? [P, ...pts] : [P, ...pts];
      if (holdP > 0.003 && PH[i][2] < 0.7) { const u = fract(t * 0.55 + PH[i][2] * 3.1), q = pulseAt(full, u); glow(q[0], q[1], mix3(COL[i], [1, 1, 1], 0.3), holdP * Math.sin(Math.PI * u) * 0.9, 30 * ls * S, 3 * S); }
      if (cellP > 0.003 && i < 6 && orth < 0.5) { const u = fract(t * 0.42 + i * 0.23), q = [lerp(P[0], C[0], u), lerp(P[1], C[1], u)]; glow(q[0], q[1], [1, 0.92, 0.75], cellP * Math.sin(Math.PI * u) * 0.8 * (1 - orth * 2), 30 * S, 3 * S); }
    }

    // 6. the lights themselves
    for (let i = 0; i < NN; i++) { if (!cur[i] || alpha[i] <= 0.003) continue; const br = 1 + 0.05 * Math.sin(t * 1.6 + PH[i][0]);
      glow(X(cur[i][0]), Y(cur[i][1]), COL[i], alpha[i] * (1 + pop[i] * 0.6), size[i] * br * S, (i === 0 ? 9 : 6) * Math.max(0.65, ls) * S, i === 0 ? 0.8 : 0); }
    // landing flashes on the stack
    for (let i = 0; i < NN; i++) if (fk[i] >= 1) { const since = t - order[i] - FD; if (since < 0.4) glow(X(sh[0]), Y(stackTop + 4), [1, 0.9, 0.7], Math.exp(-since * 8) * 0.6, 120 * S, 10 * S); }

    // 7. shelf and stack
    { const show = sstep((t - 28.1) / 0.5); sU.uC.value.set(X(sh[0]), Y(sh[1])); sU.uS.value = S; sU.uW.value = L.shelfW;
      const nl = landed + (fk.reduce((m, k) => (k < 1 && k > 0.6 ? m + (k - 0.6) / 0.4 : m), 0));
      sU.uN.value = layersAt(nl); sU.uFace.value = sstep((t - FOLD_END + 0.1) / 0.5); sU.uFlash.value = Math.exp(-Math.pow((t - FOLD_END - 0.1) / 0.25, 2));
      sU.uA.value = show * (1 - 0.45 * sstep((t - FOLD_END - 0.1) / 0.6)); shelf.visible = sU.uA.value > 0.002; }

    // 8. cards and counter
    cardState.forEach((c, i) => { const s = cards[i]; if (!c) { s.m.visible = false; return; } const sc = lerp(0.22, 1, c.k);
      place(s, X(c.p[0]), Y(c.p[1]), sc * S, c.a, c.rot); });
    { const fade = 1 - sstep((t - 27.55) / 0.5), base = sstep((t - 18.95) / 0.5) * fade;
      numSpr.forEach((s, j) => { const tIn = T_STEP[j] + 0.5, tOut = j < 3 ? T_STEP[j + 1] + 0.5 : 99, kin = j === 0 ? sstep((t - tIn) / 0.4) : sstep((t - tIn) / 0.22), kout = sstep((t - tOut) / 0.22);
        const a = kin * (1 - kout) * fade; if (a <= 0.003) { s.m.visible = false; return; }
        const dy = (1 - kin) * 30 - kout * 30, popS = (1 + 0.14 * Math.exp(-Math.max(0, t - tIn - 0.2) * 4) * kin) * (1 - 0.15 * kout);
        place(s, X(L.counter[0]), Y(L.counter[1] + dy), popS * S, a); });
      place(rolesSpr, X(L.roles[0]), Y(L.roles[1]), S, base * 0.92); }

    // finish the dynamic buffers
    gGeo.setDrawRange(0, gi); ['position', 'aCol', 'aA'].forEach((n) => { gGeo.attributes[n].needsUpdate = true; });
    lGeo.setDrawRange(0, si * 6); ['position', 'aV', 'aCol', 'aA'].forEach((n) => { lGeo.attributes[n].needsUpdate = true; });
    renderer.render(scene, camera);
  }
  function dispose() { for (const d of disposables) d.dispose(); renderer.dispose(); }
  return { render, dispose };
}
