// The cell: one warm light, then the team that made this film grows beneath it as a tree of lights, each line running
// from the one who started or briefed it; helpers bloom round the lead, a membrane closes round them all, and then the
// cell is archived: its lights go out from the edge inwards, each dropping what it made onto a small shelf of files.
// Composed for 720x1280 first; 1280x720 is a second layout of the same objects, in pixels, under an orthographic camera.
// A lab scene component (see ../harness.js for the contract). render(t) is a pure function of t. Apache-2.0. By c.productions.
export const meta = {
  id: 'refresh-cell',
  title: 'The agile cell',
  beat: 'One person, two maestros on two accounts, a conductor, a lead agent and its helpers: a cell set up for this one film, archived when it is done, its files kept.',
  seconds: 14,
  sources: [
    { title: 'How we refresh a session: the team that made it', url: 'https://studio.agents.sovereignweb.site/productions/session-refresh/team/' },
  ],
};

const AMBER = [1.0, 0.784, 0.341], TEAL = [0.373, 0.816, 0.773], INK = [0.957, 0.945, 0.91], WARM = [1.0, 0.9, 0.74];
const PALE = [0.62, 0.86, 0.84], DIM = [0.78, 0.72, 0.6];
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const STILL_T = 11.6, T_OUT0 = 12.0, T_OUT1 = 13.2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const fract = (x) => x - Math.floor(x);
function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Every light: [P x, y], [L x, y] in design pixels (720x1280 and 1280x720), parent, arrival time, look.
// la = label anchor: r right, b below, a above, al above-left-aligned, bl below-left-aligned.
const N = {
  owner:  { P: [360, 190], L: [640, 102], t: 0.25, col: WARM, size: 170, core: 10, star: 1, label: 'Dinis Cruz', fs: 32, la: 'r' },
  cm:     { P: [255, 372], L: [470, 205], par: 'owner', t: 2.5, col: AMBER, size: 112, core: 7, label: 'c.maestro', fs: 28, la: 'r' },
  bm:     { P: [601, 372], L: [1100, 212], par: 'owner', t: 3.0, col: AMBER, size: 112, core: 7, label: 'b.maestro', fs: 28, la: 'b' },
  cond:   { P: [255, 505], L: [470, 305], par: 'cm', t: 4.15, col: AMBER, size: 104, core: 6.5, label: 'conductor.c', fs: 28, la: 'r' },
  lead:   { P: [255, 672], L: [470, 412], par: 'cond', t: 5.45, col: TEAL, size: 210, core: 12, label: 'c.productions', fs: 31, la: 'r', bold: 1 },
  design: { P: [432, 560], L: [770, 262], par: 'lead', t: 8.35, col: DIM, size: 70, core: 4.6, label: 'design.c', fs: 26, la: 'b', dot: 1 },
  hig:    { P: [350, 985], L: [860, 470], par: 'lead', t: 8.6, col: DIM, size: 70, core: 4.6, label: 'higgsfield.c', fs: 26, la: 'b', dot: 1, curve: -0.12 },
  acct:   { P: [165, 985], L: [92, 420], par: 'lead', t: 8.85, col: DIM, size: 70, core: 4.6, label: 'accountant.c', fs: 26, la: 'b', dot: 1, curve: 0.12 },
  higb:   { P: [566, 640], L: [1022, 392], par: 'bm', t: 9.1, col: INK, size: 62, core: 4, hollow: 1, label: 'higgsfield.b', fs: 26, la: 'b', dot: 1, curve: 0.1 },
  elb:    { P: [640, 830], L: [1168, 478], par: 'bm', t: 9.4, col: INK, size: 62, core: 4, hollow: 1, label: 'elevenlabs.b', fs: 26, la: 'b', dot: 1, curve: -0.14 },
};
// Clusters of small helper lights round the lead, each with one line from the lead and a short label.
const CL = [
  { n: 2, P: [100, 590], L: [262, 322], t: 7.0, col: TEAL, label: '2 helper sessions', la: 'al', r: 20 },
  { n: 5, P: [105, 805], L: [262, 500], t: 7.3, col: AMBER, label: '5 scene-smiths', la: 'bl', r: 30 },
  { n: 1, P: [255, 880], L: [470, 540], t: 7.6, col: AMBER, label: 'critic', la: 'b', r: 0 },
  { n: 5, P: [412, 805], L: [682, 500], t: 7.9, col: PALE, label: '5 test viewers', la: 'b', r: 30 },
];
const LAY = {
  port: { W: 720, H: 1280, bands: [[22, 488], [504, 698]], bandY: [272, 1050], bandLab: 298,
    cell: { c: [360, 600], h: [347, 472], r: 64 }, cellLab: [360, 1072], shelf: [360, 712], shelfLab: [360, 800] },
  land: { W: 1280, H: 720, bands: [[28, 930], [950, 1252]], bandY: [152, 590], bandLab: 176,
    cell: { c: [640, 336], h: [627, 262], r: 56 }, cellLab: [640, 598], shelf: [640, 372], shelfLab: [640, 456] },
};
const BAND_T = [2.3, 2.8], CELL_T0 = 10.0, CELL_T1 = 11.3;

export async function create({ canvas, THREE, reduced }) {
  const rnd = prng(20261128);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(0, 720, 0, -1280, -10, 10);
  const disposables = [], keep = (x) => { disposables.push(x); return x; };
  const quad = keep(new THREE.PlaneGeometry(2, 2)), unitPlane = keep(new THREE.PlaneGeometry(1, 1));
  const FS_VERT = 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const fsMesh = (frag, uniforms, order) => { const m = new THREE.Mesh(quad, keep(new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }))); m.frustumCulled = false; m.renderOrder = order; scene.add(m); return m; };

  // backdrop: the house navy, a faint floor of lines falling away below, a vignette
  const bgU = { uRes: { value: new THREE.Vector2(720, 1280) }, uT: { value: 0 }, uDim: { value: 0 } };
  const bg = fsMesh(`precision highp float; uniform vec2 uRes; uniform float uT, uDim;
    void main(){ vec2 uv = gl_FragCoord.xy / uRes; vec3 top = vec3(0.043, 0.078, 0.125), mid = vec3(0.071, 0.149, 0.227);
      vec3 col = mix(mid, top, smoothstep(0.35, 1.0, uv.y)); col = mix(col, top, smoothstep(0.35, 0.0, uv.y) * 0.7);
      float y = 1.0 - uv.y, h = 0.86; if (y > h) { float z = 1.0 / (y - h + 0.02); vec2 g = vec2((uv.x - 0.5) * z * 2.2, z * 0.9 - uT * 0.05);
        vec2 f = abs(fract(g) - 0.5); float line = smoothstep(0.03 * z, 0.0, min(f.x, f.y) ) * smoothstep(h, h + 0.05, y) * 0.5; col += vec3(0.20, 0.32, 0.42) * line * 0.25; }
      float v = length((uv - 0.5) * vec2(1.0, 1.2)); col *= 1.0 - 0.45 * smoothstep(0.35, 0.95, v); col *= 1.0 - 0.25 * uDim;
      gl_FragColor = vec4(col, 1.0); }`, bgU, -10);
  bg.material.blending = THREE.NoBlending; bg.material.transparent = false;

  // soft panels: the two account bands, the cell's membrane (signed distance to a rounded box, in pixels)
  const PANEL = `precision highp float; uniform vec2 uRes, uC, uH; uniform float uR, uFill, uEdge, uRev, uSweep, uT, uWob; uniform vec3 uCol;
    float sdb(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
    void main(){ vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y), d = p - uC; float ang = atan(d.x, -d.y);
      float s = sdb(d, uH, uR) + uWob * (sin(ang * 5.0 + uT * 1.3) * 3.0 + sin(ang * 9.0 - uT * 2.1) * 1.6);
      float fr = fract(ang / 6.28318 + 1.0), vis = step(fr, uSweep) + step(1.0, uSweep);
      float head = uSweep < 1.0 ? exp(-pow((fr - uSweep) * 40.0, 2.0)) : 0.0;
      float rev = smoothstep(uRev, uRev - 40.0, p.y);
      float edge = (exp(-abs(s) / 1.6) * 0.9 + exp(-abs(s) / 9.0) * 0.35) * uEdge * min(vis, 1.0) + head * exp(-abs(s) / 6.0) * 1.5 * uEdge;
      float fill = smoothstep(2.0, -30.0, s) * uFill * (0.55 + 0.45 * smoothstep(0.0, -160.0, s));
      gl_FragColor = vec4(uCol * (edge + fill) * rev, 1.0); }`;
  const panel = (col, order) => { const u = { uRes: bgU.uRes, uC: { value: new THREE.Vector2() }, uH: { value: new THREE.Vector2() }, uR: { value: 20 }, uFill: { value: 0 }, uEdge: { value: 0 },
    uRev: { value: 1e5 }, uSweep: { value: 2 }, uT: { value: 0 }, uWob: { value: 0 }, uCol: { value: new THREE.Vector3(...col) } }; const m = fsMesh(PANEL, u, order); return { m, u }; };
  const bands = [panel(TEAL, 1), panel(AMBER, 1)], cell = panel([1.0, 0.86, 0.6], 2);

  // the shelf of files that stays: a glowing plank and pages that stand on it as the cell's lights come home
  const shelfU = { uRes: bgU.uRes, uC: { value: new THREE.Vector2() }, uS: { value: 1 }, uA: { value: 0 }, uN: { value: 0 }, uT: { value: 0 } };
  fsMesh(`precision highp float; uniform vec2 uRes, uC; uniform float uS, uA, uN, uT;
    float sdb(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
    void main(){ vec2 p = (vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) - uC) / uS; vec3 col = vec3(0.0);
      float plank = sdb(p - vec2(0.0, 6.0), vec2(150.0, 4.0), 3.0);
      col += vec3(${AMBER}) * (exp(-max(plank, 0.0) / 1.5) * 0.9 + exp(-max(plank, 0.0) / 22.0) * 0.25) * uA;
      col += vec3(${AMBER}) * exp(-pow(p.y / 60.0, 2.0) - pow(p.x / 170.0, 2.0)) * 0.10 * uA;
      for (int i = 0; i < 8; i++) { float fi = float(i), k = clamp(uN - fi, 0.0, 1.0); if (k <= 0.0) continue;
        float hh = 30.0 + 8.0 * fract(sin(fi * 12.9) * 43.7), x = -122.0 + fi * 35.0, tilt = (i == 7 ? 0.22 : 0.0);
        vec2 q = p - vec2(x + tilt * 30.0, -hh + 2.0 - (1.0 - k) * 26.0); q = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * q;
        float pg = sdb(q, vec2(13.0, hh), 2.5), inside = step(pg, 0.0);
        float lines = inside * step(abs(fract((q.y + hh) / 9.0) - 0.5), 0.12) * step(abs(q.x), 8.0) * step(-hh + 7.0, q.y) * step(q.y, hh - 6.0);
        float flash = exp(-max(uN - fi - 1.0, 0.0) * 3.0);
        col += vec3(${AMBER}) * (exp(-abs(pg) / 1.3) * 0.85 + inside * (0.10 + 0.25 * flash) + lines * 0.32) * k * uA;
        col += vec3(1.0, 0.95, 0.85) * exp(-abs(pg) / 1.3) * flash * 0.5 * k * uA; }
      gl_FragColor = vec4(col, 1.0); }`, shelfU, 3);

  // lines: one dynamic strip mesh; each line is a slight curve with a draw-on, dashes if it is a peer, and pulses (messages)
  const SEG = 28, MAXL = 20, VPL = (SEG + 1) * 2;
  const lPos = new Float32Array(MAXL * VPL * 3), lUV = new Float32Array(MAXL * VPL * 2), lCol = new Float32Array(MAXL * VPL * 3), lP = new Float32Array(MAXL * VPL * 4), lH = new Float32Array(MAXL * VPL * 3), lIdx = [];
  for (let l = 0; l < MAXL; l++) for (let k = 0; k < SEG; k++) { const a = l * VPL + k * 2; lIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const lGeo = keep(new THREE.BufferGeometry());
  [['position', lPos, 3], ['aUV', lUV, 2], ['aCol', lCol, 3], ['aP', lP, 4], ['aH', lH, 3]].forEach(([n, a, s]) => lGeo.setAttribute(n, new THREE.BufferAttribute(a, s).setUsage(THREE.DynamicDrawUsage)));
  lGeo.setIndex(lIdx);
  const lineMesh = new THREE.Mesh(lGeo, keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute vec2 aUV; attribute vec3 aCol; attribute vec4 aP; attribute vec3 aH; varying vec2 vUV; varying vec3 vCol; varying vec4 vP; varying vec3 vH;
      void main(){ vUV = aUV; vCol = aCol; vP = aP; vH = aH; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `precision highp float; varying vec2 vUV; varying vec3 vCol; varying vec4 vP; varying vec3 vH; uniform float uS;
      void main(){ float u = vUV.x, v = vUV.y, a = vP.x, prog = vP.y, dash = vP.z;
        float on = smoothstep(prog + 1.0, prog - 3.0, u); float dsh = mix(1.0, smoothstep(0.62, 0.5, fract(u / (13.0 * uS))), dash);
        float core = exp(-v * v * 16.0), soft = exp(-v * v * 3.0);
        float p1 = exp(-pow((u - vH.x) / (16.0 * uS), 2.0)), p2 = exp(-pow((u - vH.y) / (16.0 * uS), 2.0)), pul = (p1 + p2) * vH.z;
        float tip = exp(-pow((u - prog) / (10.0 * uS), 2.0)) * step(prog, vP.w - 1.0);
        vec3 col = vCol * (core * 0.55 * dsh + soft * 0.06) + mix(vCol, vec3(1.0), 0.4) * (core * 1.6 + soft * 0.5) * (pul + tip * 1.2);
        gl_FragColor = vec4(col * a * on, 1.0); }`, uniforms: { uS: { value: 1 } } })));
  lineMesh.frustumCulled = false; lineMesh.renderOrder = 5; scene.add(lineMesh);

  // lights: one Points cloud for every glow (people, agents, helpers, motes, dust)
  const MAXP = 420, gPos = new Float32Array(MAXP * 3), gCol = new Float32Array(MAXP * 3), gA = new Float32Array(MAXP * 4);
  const gGeo = keep(new THREE.BufferGeometry());
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3).setUsage(THREE.DynamicDrawUsage)); gGeo.setAttribute('aCol', new THREE.BufferAttribute(gCol, 3).setUsage(THREE.DynamicDrawUsage));
  gGeo.setAttribute('aA', new THREE.BufferAttribute(gA, 4).setUsage(THREE.DynamicDrawUsage));
  const glows = new THREE.Points(gGeo, keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aCol; attribute vec4 aA; varying vec3 vCol; varying vec4 vA; uniform float uS;
      void main(){ vCol = aCol; vA = aA; gl_PointSize = aA.y * uS; gl_Position = projectionMatrix * viewMatrix * vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `precision highp float; varying vec3 vCol; varying vec4 vA;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0, a = vA.x, kc = vA.z, w = vA.w, hollow = step(1.5, w), star = step(0.5, w) * (1.0 - hollow);
        float halo = exp(-d * d * 7.0) * 0.42 + 0.06 / (1.0 + d * d * 40.0), core = exp(-d * d * kc) * 1.5;
        float ring = exp(-pow((d - 0.30) / 0.045, 2.0)) * 0.9;
        float fl = star * (exp(-abs(q.x) * 140.0) + exp(-abs(q.y) * 140.0)) * exp(-d * 2.2) * 0.55;
        float g = mix(halo + core, halo * 0.35 + ring, hollow) + fl;
        vec3 col = mix(vCol, vec3(1.0, 0.98, 0.94), clamp(exp(-d * d * kc * 2.5) * (1.0 - hollow), 0.0, 1.0));
        gl_FragColor = vec4(col * g * a * smoothstep(1.0, 0.8, d), 1.0); }`, uniforms: { uS: { value: 1 } } })));
  glows.frustumCulled = false; glows.renderOrder = 8; scene.add(glows);

  // labels: canvas text, drawn at twice the design size, with a soft navy backing so lines can pass beneath
  const labels = [];
  function label(text, fs, opt = {}) {
    const c = document.createElement('canvas'), x = c.getContext('2d'), S = 2, f = `${opt.bold ? 650 : 500} ${fs * S}px ${FONT}`; x.font = f;
    const tw = Math.ceil(x.measureText(text).width), pad = 14 * S; c.width = tw + pad * 2; c.height = Math.ceil(fs * S * 1.5 + pad);
    x.font = f; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.fillStyle = 'rgba(9,18,30,0.62)'; x.filter = `blur(${7 * S}px)`; const r = c.height * 0.32; x.beginPath(); x.roundRect(pad * 0.6, c.height / 2 - r, c.width - pad * 1.2, r * 2, r); x.fill(); x.filter = 'none';
    x.shadowColor = 'rgba(5,10,18,0.9)'; x.shadowBlur = 6 * S; x.fillStyle = opt.color || '#f4f1e8'; x.fillText(text, c.width / 2, c.height / 2 + fs * S * 0.04);
    const tex = keep(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const m = new THREE.Mesh(unitPlane, keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0 })));
    m.renderOrder = 20; m.frustumCulled = false; scene.add(m); const L = { m, w: c.width / S, h: c.height / S, tw: tw / S, pad: pad / S }; labels.push(L); return L;
  }
  function placeLabel(L, x, y, anchor, s, a, gap = 0) {
    const w = L.w * s, h = L.h * s, tw = L.tw * s, pad = L.pad * s; let cx = x, cy = y;
    if (anchor === 'r') cx = x + gap * s + tw / 2; else if (anchor === 'b') cy = y + gap * s; else if (anchor === 'a') cy = y - gap * s;
    else if (anchor === 'al') { cx = x + tw / 2; cy = y; } else if (anchor === 'bl') { cx = x + tw / 2; cy = y; }
    L.m.position.set(cx, -cy, 0); L.m.scale.set(w, h, 1); L.m.material.opacity = a; L.m.visible = a > 0.003; void pad;
  }

  // the cast
  const ids = Object.keys(N), nodes = ids.map((id) => ({ id, ...N[id], lab: label(N[id].label, N[id].fs, { bold: N[id].bold, color: N[id].hollow ? '#cfd3d6' : undefined }) }));
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const helpers = []; CL.forEach((c, ci) => { c.lab = label(c.label, 24, { color: '#e8e4da' });
    for (let i = 0; i < c.n; i++) { const ang = (i / Math.max(1, c.n)) * Math.PI * 2 + rnd() * 0.6, rr = c.r * (0.65 + 0.35 * rnd());
      helpers.push({ ci, off: [Math.cos(ang) * rr, Math.sin(ang) * rr * 0.8], t: c.t + i * 0.09, ph: rnd() * 6.28, sp: 0.6 + rnd() * 0.8, col: c.col, size: c.n === 1 ? 58 : 46 + rnd() * 8 }); } });
  const bandLabs = [label('account C', 26, { color: '#bfe9e3' }), label('account B', 26, { color: '#ffe2a6' })];
  const cellLab = label('An agile cell', 34, { color: '#ffe7b8', bold: 1 }), shelfLab = label('archived: its files stay', 30, { color: '#ffe7b8' });
  const DUST = 260, dust = Array.from({ length: DUST }, () => ({ x: rnd(), y: rnd(), s: 3 + rnd() * 5, a: 0.04 + rnd() * 0.10, ph: rnd() * 6.28, sp: 0.2 + rnd() * 0.5 }));

  // The archive order: every light but the owner's goes out, from the outside of the cell inwards.
  function archiveOrder(lay) {
    const cc = lay.cell.c, key = lay === LAY.port ? 'P' : 'L', items = [];
    nodes.forEach((n) => { if (n.id !== 'owner') items.push({ kind: 'n', ref: n, p: n[key] }); });
    helpers.forEach((h) => { const c = CL[h.ci][key]; items.push({ kind: 'h', ref: h, p: [c[0] + h.off[0], c[1] + h.off[1]] }); });
    items.forEach((it) => { it.d = Math.hypot((it.p[0] - cc[0]) / lay.cell.h[0], (it.p[1] - cc[1]) / lay.cell.h[1]); });
    items.sort((a, b) => b.d - a.d); items.forEach((it, i) => { it.ref.out = T_OUT0 + (i / (items.length - 1)) * (T_OUT1 - T_OUT0); });
    return items.length;
  }

  let lay = null, isPortrait = null, nItems = 0;
  function place(portrait) { isPortrait = portrait; lay = portrait ? LAY.port : LAY.land; nItems = archiveOrder(lay); }

  // geometry helpers
  const bez = (a, b, cv, k) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], cx = mx - dy * cv, cy = my + dx * cv, u = 1 - k;
    return [u * u * a[0] + 2 * u * k * cx + k * k * b[0], u * u * a[1] + 2 * u * k * cy + k * k * b[1]]; };
  let li = 0, gi = 0;
  function addLine(a, b, cv, col, alpha, prog, dash, pulses, s, X) {
    if (li >= MAXL || alpha <= 0.002) return; const pts = []; let len = 0;
    for (let k = 0; k <= SEG; k++) { const p = bez(a, b, cv, k / SEG); if (k) len += Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]); pts.push(p); }
    const hw = 7 * s; let acc = 0;
    for (let k = 0; k <= SEG; k++) { const p = pts[k], q = pts[Math.min(SEG, k + 1)], o = pts[Math.max(0, k - 1)]; let tx = q[0] - o[0], ty = q[1] - o[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      if (k) acc += Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]);
      for (let sd = 0; sd < 2; sd++) { const v = li * VPL + k * 2 + sd, sg = sd ? 1 : -1;
        lPos[v * 3] = p[0] - ty * hw * sg; lPos[v * 3 + 1] = -(p[1] + tx * hw * sg); lPos[v * 3 + 2] = 0;
        lUV.set([acc, sg], v * 2); lCol.set(col, v * 3); lP.set([alpha, prog * len, dash, len], v * 4);
        // pulses: one outward from the parent, one back, each a moving bump of light
        lH.set(pulses ? [pulses[0] * len, pulses[1] * len, pulses[2]] : [-1e4, -1e4, 0], v * 3); } }
    li++;
  }
  function addGlow(x, y, col, a, size, core, kind) { if (gi >= MAXP || a <= 0.002) return; gPos.set([x, y, 0], gi * 3); gCol.set(col, gi * 3); const r = Math.max(1, core); gA.set([a, size, Math.pow(size / (2 * r), 2), kind], gi * 4); gi++; }
  let X0 = 0, Y0 = 0, S = 1; const X = (x) => X0 + x * S;

  function render(time, w, h) {
    const portrait = h > w; if (portrait !== isPortrait) place(portrait);
    if (canvas.width !== w || canvas.height !== h) renderer.setSize(w, h, false); renderer.setViewport(0, 0, w, h);
    const t = reduced ? STILL_T : clamp(time, 0, meta.seconds), key = portrait ? 'P' : 'L';
    S = Math.min(w / lay.W, h / lay.H); X0 = (w - lay.W * S) / 2; Y0 = (h - lay.H * S) / 2;
    camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h; camera.updateProjectionMatrix();
    bgU.uRes.value.set(w, h); bgU.uT.value = t; lineMesh.material.uniforms.uS.value = S; glows.material.uniforms.uS.value = S;
    const sx = (x) => X0 + x * S, sy = (y) => Y0 + y * S, P = (p) => [sx(p[0]), sy(p[1])];
    li = 0; gi = 0;
    const live = (o) => (o.out === undefined ? 1 : 1 - sstep((t - o.out) / 0.22));
    const outFlare = (o) => (o.out === undefined || t < o.out - 0.05 ? 0 : Math.exp(-Math.max(0, t - o.out) * 9) * (t < o.out + 0.4 ? 1 : 0));
    const archive = sstep((t - T_OUT0) / (T_OUT1 - T_OUT0 + 0.3));
    bgU.uDim.value = 0;

    // dust: slow drift, a sense of a room around the cell
    for (const d of dust) { const x = fract(d.x + 0.004 * t * d.sp + 0.01 * Math.sin(t * 0.3 + d.ph)), y = fract(d.y - 0.006 * t * d.sp);
      addGlow(x * w, -(y * h), [0.6, 0.72, 0.85], d.a * (0.7 + 0.3 * Math.sin(t * d.sp * 2 + d.ph)), d.s * S, 1.2, 0); }

    // account bands: open with their maestro, grow downward with the cell
    const deepest = Math.max(...nodes.filter((n) => !n.dot && n.id !== 'owner').map((n) => (t > n.t - 0.6 ? n[key][1] : 0)), 0);
    bands.forEach((b, i) => { const [x0, x1] = lay.bands[i], [y0, y1] = lay.bandY, k = sstep((t - BAND_T[i]) / 0.8);
      b.u.uC.value.set(sx((x0 + x1) / 2), sy((y0 + y1) / 2)); b.u.uH.value.set((x1 - x0) / 2 * S, (y1 - y0) / 2 * S); b.u.uR.value = 26 * S;
      const grow = i === 0 ? lerp(Math.max(sy(y0 + 150), sy(deepest + 130)), sy(y1 + 60), sstep((t - 6.9) / 2.2)) : lerp(sy(y0 + 150), sy(y1 + 60), sstep((t - 8.6) / 1.2));
      b.u.uRev.value = grow; const fade = 1 - sstep((t - 12.0) / 0.9);
      b.u.uFill.value = 0.055 * k * fade; b.u.uEdge.value = 0.20 * k * fade; b.m.visible = k * fade > 0.002;
      placeLabel(bandLabs[i], sx(x0 + 18), sy(lay.bandLab), 'al', S, 0.92 * sstep((t - BAND_T[i] - 0.2) / 0.5) * fade); });

    // the named lights and the lines to whoever started or briefed them
    const posOf = (n) => n[key];
    const msgs = sstep((t - 5.9) / 0.6) * (1 - sstep((t - 11.9) / 0.3));
    for (const n of nodes) {
      const home = posOf(n), arrive = n.par ? sstep((t - (n.t - 0.6)) / 0.6) : 1, lv = live(n), fl = outFlare(n);
      let p = home, a;
      if (n.par) { const pp = posOf(byId[n.par]), cv = n.curve || 0; if (arrive < 1) p = bez(pp, home, cv, arrive);
        a = (t > n.t - 0.6 ? 1 : 0) * lv; const pul = n.dot ? fract((t - n.t) * 0.55 + n.t * 0.37) : fract((t - n.t) * 0.42 + n.t * 0.61);
        const back = n.hollow ? -2 : fract((t - n.t) * 0.42 + n.t * 0.61 + 0.5);
        const lineA = (n.hollow ? 0.55 : n.dot ? 0.7 : 0.85) * a * (n.id === 'bm' || n.id === 'cm' ? 1 : 1);
        addLine(P(pp), P(home), cv, n.hollow ? [0.85, 0.82, 0.75] : n.dot ? DIM : n.col === TEAL ? TEAL : AMBER, lineA, arrive, n.dot ? 1 : 0,
          t > n.t + 0.3 ? [1 - pul * 1.2 + 0.1, n.hollow ? -2 : back * 1.2 - 0.1, msgs] : null, S, (x) => x);
      } else a = sstep((t - n.t) / 0.9);
      if (a <= 0.002 && fl <= 0.002) continue;
      const pop = n.par && t > n.t ? Math.exp(-(t - n.t) * 5) : 0, breathe = 1 + 0.04 * Math.sin(t * 1.7 + home[0]);
      let A = a * (n.hollow ? 0.55 + 0.12 * Math.sin(t * 3 + home[1]) : 1) , size = n.size * breathe * (1 + 0.6 * pop);
      if (n.id === 'owner') { size *= 1 + 0.25 * Math.exp(-Math.pow((t - 1.0) / 0.5, 2)); }
      if (n.id === 'lead') { size *= 1 + 0.12 * sstep((t - 7.0) / 1.5) * Math.sin(t * 4) * 0.3; }
      addGlow(sx(p[0]), -sy(p[1]), n.col, A + pop * 0.6, size * S, n.core * S, n.hollow ? 2 : n.star ? 1 : 0);
      if (fl > 0.002) addGlow(sx(home[0]), -sy(home[1]), [1, 0.95, 0.85], fl * 0.9, n.size * 1.4 * S, n.core * 1.6 * S, 0);
      const la = (n.par ? sstep((t - n.t - 0.05) / 0.4) : sstep((t - n.t - 0.35) / 0.6)) * lv;
      const gap = n.la === 'r' ? n.core * 2.2 + 16 : n.size * 0.18 + 20;
      placeLabel(n.lab, sx(home[0]), sy(home[1]), n.la, S, la * (n.hollow ? 0.85 : 1), gap);
    }

    // helper clusters: they bloom out of the lead, one line per cluster, messages running both ways
    const lead = byId.lead, lp = posOf(lead);
    CL.forEach((c, ci) => { const cp = c[key], k = sstep((t - (c.t - 0.1)) / 0.6), mine = helpers.filter((h) => h.ci === ci);
      const lv = Math.min(...mine.map(live)), anyLive = Math.max(...mine.map(live));
      const pul = fract((t - c.t) * 0.6 + ci * 0.27), back = fract((t - c.t) * 0.47 + ci * 0.53 + 0.4);
      addLine(P(lp), P(cp), ci % 2 ? 0.08 : -0.08, c.col, 0.75 * (t > c.t - 0.1 ? 1 : 0) * anyLive, k, 0, t > c.t + 0.4 ? [pul * 1.2 - 0.1, 1.1 - back * 1.2, msgs] : null, S, (x) => x);
      let lab = c.la, lx = cp[0], ly = cp[1];
      if (lab === 'al') { lx = cp[0] - 70; ly = cp[1] - c.r - 34; } else if (lab === 'bl') { lx = cp[0] - 75; ly = cp[1] + c.r + 36; } else { ly = cp[1] + Math.max(c.r, 14) + 36; lab = 'c'; }
      if (!portrait) { lab = 'c'; lx = cp[0]; ly = c.la === 'al' ? cp[1] - c.r - 32 : cp[1] + Math.max(c.r, 14) + 34; }
      placeLabel(c.lab, sx(lx), sy(ly), lab, S, sstep((t - c.t - 0.25) / 0.45) * lv * 0.95); });
    for (const hp of helpers) { const c = CL[hp.ci], cp = c[key], k = sstep((t - hp.t) / 0.7), lv = live(hp), fl = outFlare(hp);
      if (t < hp.t) continue;
      const hx = cp[0] + hp.off[0] + 3 * Math.sin(t * hp.sp + hp.ph), hy = cp[1] + hp.off[1] + 3 * Math.cos(t * hp.sp * 1.3 + hp.ph);
      const p = bez(lp, [hx, hy], 0.25, k), pop = t > hp.t + 0.7 ? Math.exp(-(t - hp.t - 0.7) * 6) : 0;
      addGlow(sx(p[0]), -sy(p[1]), hp.col, (0.9 + 0.1 * Math.sin(t * 5 + hp.ph)) * lv + pop * 0.5, hp.size * (1 + 0.5 * pop) * S, 3.4 * S, 0);
      if (fl > 0.002) addGlow(sx(hx), -sy(hy), [1, 0.95, 0.85], fl * 0.8, hp.size * 1.5 * S, 4 * S, 0); hp.at = [hx, hy]; }

    // the membrane: draws itself round everyone, then folds down onto the shelf
    { const cc = lay.cell, sh = lay.shelf, fold = sstep((t - 12.2) / 1.2), sweep = sstep((t - CELL_T0) / (CELL_T1 - CELL_T0));
      const ccx = lerp(cc.c[0], sh[0], fold), ccy = lerp(cc.c[1], sh[1] - 20, fold), hx = lerp(cc.h[0], 170, fold), hy = lerp(cc.h[1], 60, fold);
      cell.u.uC.value.set(sx(ccx), sy(ccy)); cell.u.uH.value.set(hx * S, hy * S); cell.u.uR.value = lerp(cc.r, 40, fold) * S; cell.u.uT.value = t; cell.u.uWob.value = S * (1 - fold);
      cell.u.uSweep.value = sweep >= 0.999 ? 2 : sweep; const ca = (t > CELL_T0 ? 1 : 0) * (1 - sstep((t - 12.5) / 1.0));
      cell.u.uEdge.value = 0.75 * ca; cell.u.uFill.value = 0.05 * ca * sstep((t - CELL_T1 + 0.4) / 0.6); cell.m.visible = ca > 0.002;
      placeLabel(cellLab, sx(lay.cellLab[0]), sy(lay.cellLab[1]), 'c', S, sstep((t - 10.9) / 0.5) * (1 - sstep((t - 12.15) / 0.5))); }

    // archiving: each light, as it goes out, sends a small mote down to the shelf; pages stand up as they arrive
    const sh = lay.shelf; let landed = 0; const items = nodes.filter((n) => n.id !== 'owner').concat(helpers);
    for (const o of items) { if (t < o.out) continue; const from = o.at || posOf(o), k = clamp((t - o.out) / 0.55), e = k * k * (3 - 2 * k);
      const tgt = [sh[0] + ((o.out * 97) % 1 - 0.5) * 200, sh[1] - 20], p = bez(from, tgt, 0.18, e);
      if (k < 1) addGlow(sx(p[0]), -sy(p[1]), AMBER, 0.85 * Math.sin(Math.PI * Math.min(1, k * 1.2)) + 0.15, 30 * S, 3 * S, 0); else landed++; }
    shelfU.uC.value.set(sx(sh[0]), sy(sh[1])); shelfU.uS.value = S; shelfU.uT.value = t;
    shelfU.uA.value = sstep((t - 12.25) / 0.5); shelfU.uN.value = 8 * landed / nItems + 0.0 * archive;
    placeLabel(shelfLab, sx(lay.shelfLab[0]), sy(lay.shelfLab[1]), 'c', S, sstep((t - 13.0) / 0.45));

    // finish the dynamic buffers
    for (let v = li * VPL; v < MAXL * VPL; v++) { lP[v * 4] = 0; lPos.set([0, 0, 0], v * 3); }
    gGeo.setDrawRange(0, gi); ['position', 'aCol', 'aA'].forEach((n) => { gGeo.attributes[n].needsUpdate = true; });
    lGeo.setDrawRange(0, li * SEG * 6); ['position', 'aUV', 'aCol', 'aP', 'aH'].forEach((n) => { lGeo.attributes[n].needsUpdate = true; });
    renderer.render(scene, camera);
  }
  function dispose() { for (const d of disposables) d.dispose(); renderer.dispose(); }
  return { render, dispose };
}
