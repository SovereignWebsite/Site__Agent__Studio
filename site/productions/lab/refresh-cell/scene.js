// The cell: one warm light, then the team that made this film grows beneath it as a tree of lights, each line running
// from the one who started or briefed it, each tagged with its model; helpers bloom round the lead, a membrane closes round
// them all, and then the cell is archived: every light goes out from the edge inwards, each dropping its files, and the files
// stream down into a tall lit library (the repository) and a small locked vault. Then the line: This is how we scale.
// Composed for 720x1280 first; 1280x720 is a second layout of the same objects, in pixels, under an orthographic camera.
// A lab scene component (see ../harness.js for the contract). render(t) is a pure function of t. Apache-2.0. By c.productions.
export const meta = {
  id: 'refresh-cell',
  title: 'The agile cell',
  beat: 'One person, two maestros on two accounts, a conductor, a lead agent and its helpers, each on its own model: a cell set up for this one film; when it is done its lights go out and its files stream into the repository, the source of truth. This is how we scale.',
  seconds: 24,
  sources: [
    { title: 'How we refresh a session: the team that made it', url: 'https://studio.agents.sovereignweb.site/productions/session-refresh/team/' },
  ],
};

const AMBER = [1.0, 0.784, 0.341], TEAL = [0.373, 0.816, 0.773], INK = [0.957, 0.945, 0.91], WARM = [1.0, 0.9, 0.74];
const PALE = [0.62, 0.86, 0.84], DIM = [0.78, 0.72, 0.6];
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const STILL_T = 23.5, T_OUT0 = 12.0, T_OUT1 = 14.6, T_HOLD = 22.0;
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
  cond:   { P: [255, 505], L: [470, 296], par: 'cm', t: 4.15, col: AMBER, size: 104, core: 6.5, label: 'conductor.c', fs: 28, la: 'r' },
  lead:   { P: [255, 672], L: [470, 392], par: 'cond', t: 5.45, col: TEAL, size: 210, core: 12, label: 'c.productions', fs: 31, la: 'r', bold: 1, tag: 'Fable, then Opus', tagT: 7.2 },
  voice:  { P: [78, 714], L: [300, 398], par: 'lead', t: 8.1, col: PALE, size: 62, core: 4.2, label: 'voice', fs: 26, la: 'a', tag: 'Mistral' },
  design: { P: [432, 560], L: [770, 262], par: 'lead', t: 8.35, col: DIM, size: 70, core: 4.6, label: 'design.c', fs: 26, la: 'b', dot: 1 },
  hig:    { P: [350, 985], L: [862, 452], par: 'lead', t: 8.6, col: DIM, size: 70, core: 4.6, label: 'higgsfield.c', fs: 26, la: 'b', dot: 1, curve: -0.12 },
  acct:   { P: [165, 985], L: [95, 455], par: 'lead', t: 8.85, col: DIM, size: 70, core: 4.6, label: 'accountant.c', fs: 26, la: 'b', dot: 1, curve: 0.12 },
  higb:   { P: [612, 612], L: [1022, 380], par: 'bm', t: 9.1, col: INK, size: 62, core: 4, hollow: 1, label: 'higgsfield.b', fs: 26, la: 'b', dot: 1, curve: 0.1 },
  elb:    { P: [622, 830], L: [1168, 478], par: 'bm', t: 9.4, col: INK, size: 62, core: 4, hollow: 1, label: 'elevenlabs.b', fs: 26, la: 'b', dot: 1, curve: -0.14 },
};
// Clusters of small helper lights round the lead, each with one line from the lead and a short label.
const CL = [
  { n: 2, P: [100, 590], L: [262, 322], t: 7.0, col: TEAL, label: '2 helper sessions', la: 'al', r: 20, tag: 'Opus' },
  { n: 5, P: [105, 805], L: [262, 470], t: 7.3, col: AMBER, label: '5 scene-smiths', la: 'bl', r: 30, tag: 'Fable' },
  { n: 1, P: [255, 880], L: [470, 498], t: 7.6, col: AMBER, label: 'critic', la: 'b', r: 0, tag: 'Fable' },
  { n: 5, P: [412, 805], L: [682, 470], t: 7.9, col: PALE, label: '5 test viewers', la: 'b', r: 30, tag: 'Gemini, GPT' },
];
const LAY = {
  port: { W: 720, H: 1280, bands: [[22, 488], [504, 698]], bandY: [272, 1050], bandLab: 298,
    cell: { c: [360, 600], h: [347, 472], r: 64 }, cellLab: [360, 1072],
    lib: [44, 372, 470, 540, 3, 5], libLab: [279, 984], vault: [617, 812], vaultLab: [617, 912], punch: [360, 262], punchFs: 52 },
  land: { W: 1280, H: 720, bands: [[28, 930], [950, 1252]], bandY: [152, 578], bandLab: 176,
    cell: { c: [640, 338], h: [627, 264], r: 56 }, cellLab: [640, 601],
    lib: [250, 178, 600, 350, 4, 4], libLab: [550, 572], vault: [1052, 440], vaultLab: [1052, 520], punch: [640, 108], punchFs: 50 },
};
const BAND_T = [2.3, 2.8], CELL_T0 = 10.0, CELL_T1 = 11.3, K = 0.92; // K draws every position in a little, keeping 4% clear at each edge

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

  // the library that stays: tall cases of glowing pages rising from the floor, mirrored in it; beside it, a small locked vault
  const libU = { uRes: bgU.uRes, uRect: { value: new THREE.Vector4() }, uS: { value: 1 }, uA: { value: 0 }, uGrow: { value: 0 }, uFill: { value: 0 }, uNC: { value: 3 }, uNS: { value: 5 },
    uV: { value: new THREE.Vector3() }, uVA: { value: 0 }, uVF: { value: 0 }, uT: { value: 0 } };
  fsMesh(`precision highp float; uniform vec2 uRes; uniform vec4 uRect; uniform vec3 uV; uniform float uS, uA, uGrow, uFill, uNC, uNS, uVA, uVF, uT;
    float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float sdb(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
    void main(){ vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y), q = (p - uRect.xy) / uS; float W = uRect.z, H = uRect.w; vec3 col = vec3(0.0);
      vec3 AM = vec3(${AMBER}), TE = vec3(${TEAL});
      vec2 c = (q - vec2(W * 0.5, H * 0.55)) / vec2(W * 0.85, H * 0.8); col += AM * exp(-dot(c, c) * 1.6) * (0.07 + 0.07 * uFill) * uA;
      vec2 sh0 = (q - vec2(W * 0.5, -40.0)) / vec2(W * 0.55, H * 1.1); col += vec3(1.0, 0.9, 0.7) * exp(-dot(sh0, sh0) * 1.2) * 0.05 * uFill * uA;
      vec2 r = q; float fade = 1.0; if (q.y > H) { r.y = 2.0 * H - q.y; fade = 0.28 * exp(-(q.y - H) / 45.0); }
      col += AM * exp(-abs(q.y - H) / 2.0) * step(-6.0, q.x) * step(q.x, W + 6.0) * 0.6 * uA;
      float vis = smoothstep(H - uGrow * (H + 30.0) - 6.0, H - uGrow * (H + 30.0) + 6.0, r.y);
      if (r.x > -4.0 && r.x < W + 4.0 && r.y > 0.0 && r.y < H) {
        float cw = W / uNC, ci = clamp(floor(r.x / cw), 0.0, uNC - 1.0), gap = 12.0, inX = r.x - ci * cw - gap * 0.5, iw = cw - gap, top = 24.0, sh = (H - top) / uNS, ry = r.y - top;
        if (inX > -4.0 && inX < iw + 4.0) {
          float side = exp(-min(abs(inX), abs(inX - iw)) / 1.4), cor = exp(-abs(r.y - 3.0) / 1.6) + exp(-abs(r.y - top) / 1.3) * 0.7;
          col += AM * (side * 0.55 + cor * 0.7) * fade * vis * uA;
          if (ry > 0.0 && inX > 0.0 && inX < iw) {
            float si = floor(ry / sh), ly = ry - si * sh;
            col += AM * (exp(-min(ly, sh - ly) / 1.5) * 0.75 + exp(-(sh - ly) / 16.0) * 0.07) * fade * vis * uA;
            float pw = 8.6, slot = floor((inX - 4.0) / pw), px = inX - 4.0 - slot * pw, ns = floor((iw - 8.0) / pw);
            if (slot >= 0.0 && slot < ns) { vec2 id = vec2(ci * 41.0 + slot, si);
              float hg = sh * (0.52 + 0.34 * h1(id)), ord = h1(id + 7.3), on = clamp((uFill - ord) * 30.0, 0.0, 1.0), fl = on * exp(-max(uFill - ord, 0.0) * 22.0);
              float inside = step(1.2, px) * step(px, pw - 1.2) * step(sh - hg - 2.0, ly) * step(ly, sh - 2.5);
              float core = step(2.3, px) * step(px, pw - 2.3) * step(sh - hg - 0.9, ly) * step(ly, sh - 3.6), edge = inside - core;
              vec3 pc = mix(AM, TE, step(0.8, h1(id + 3.1))) * (0.8 + 0.4 * h1(id + 1.7));
              col += (pc * (core * 0.26 + edge * 0.75) + vec3(1.0, 0.96, 0.88) * fl * inside * 0.9) * on * fade * vis * uA; } } } }
      vec2 v = (p - uV.xy) / (uS * uV.z); float vb = sdb(v, vec2(42.0, 34.0), 7.0), body = sdb(v - vec2(0.0, 7.0), vec2(14.0, 11.0), 3.0);
      float sh2 = abs(length(v - vec2(0.0, -4.0)) - 10.0) * step(v.y, -4.0) + step(-4.0, v.y) * 99.0 + 0.0;
      float shk = min(sh2, max(abs(abs(v.x) - 10.0), max(v.y + 4.0 - 2.0, -v.y - 4.0) ));
      float lock = exp(-max(body, 0.0) / 1.2) * 0.8 + step(body, 0.0) * 0.12 + exp(-max(shk - 1.6, 0.0) / 1.0) * 0.8;
      float hole = exp(-pow(length(v - vec2(0.0, 6.0)) / 2.4, 2.0));
      col += TE * (exp(-abs(vb) / 1.4) * 0.55 + step(vb, 0.0) * 0.05 + exp(-abs(vb) / 14.0) * 0.08 * (1.0 + 2.0 * uVF) + lock * 0.6 - hole * 0.4 * step(body, 0.0) + uVF * step(vb, 0.0) * 0.12) * uVA;
      gl_FragColor = vec4(max(col, 0.0), 1.0); }`, libU, 3);

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
  const MAXP = 560, gPos = new Float32Array(MAXP * 3), gCol = new Float32Array(MAXP * 3), gA = new Float32Array(MAXP * 4);
  const gGeo = keep(new THREE.BufferGeometry());
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3).setUsage(THREE.DynamicDrawUsage)); gGeo.setAttribute('aCol', new THREE.BufferAttribute(gCol, 3).setUsage(THREE.DynamicDrawUsage));
  gGeo.setAttribute('aA', new THREE.BufferAttribute(gA, 4).setUsage(THREE.DynamicDrawUsage));
  const glows = new THREE.Points(gGeo, keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aCol; attribute vec4 aA; varying vec3 vCol; varying vec4 vA; uniform float uS;
      void main(){ vCol = aCol; vA = aA; gl_PointSize = aA.y * uS; gl_Position = projectionMatrix * viewMatrix * vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `precision highp float; varying vec3 vCol; varying vec4 vA;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0, a = vA.x, kc = vA.z, w = vA.w, page = step(2.5, w), hollow = step(1.5, w) * (1.0 - page), star = step(0.5, w) * (1.0 - hollow - page);
        float halo = exp(-d * d * 7.0) * 0.42 + 0.06 / (1.0 + d * d * 40.0), core = exp(-d * d * kc) * 1.5;
        float ring = exp(-pow((d - 0.30) / 0.045, 2.0)) * 0.9;
        float fl = star * (exp(-abs(q.x) * 140.0) + exp(-abs(q.y) * 140.0)) * exp(-d * 2.2) * 0.55;
        vec2 bq = abs(q) - vec2(0.17, 0.23); float bd = length(max(bq, 0.0)) + min(max(bq.x, bq.y), 0.0);
        float pg = exp(-abs(bd) * 70.0) * 1.1 + step(bd, 0.0) * 0.45 + halo * 0.5;
        float g = mix(mix(halo + core, halo * 0.35 + ring, hollow) + fl, pg, page);
        vec3 col = mix(vCol, vec3(1.0, 0.98, 0.94), clamp(exp(-d * d * kc * 2.5) * (1.0 - hollow - page), 0.0, 1.0));
        gl_FragColor = vec4(col * g * a * smoothstep(1.0, 0.8, d), 1.0); }`, uniforms: { uS: { value: 1 } } })));
  glows.frustumCulled = false; glows.renderOrder = 8; scene.add(glows);

  // labels: canvas text, drawn at twice the design size, with a soft navy backing so lines can pass beneath
  const labels = [];
  function drawLabel(L, R) {
    const { text, fs, opt } = L, c = document.createElement('canvas'), x = c.getContext('2d'), f = `${opt.bold ? 650 : 500} ${fs * R}px ${FONT}`; x.font = f;
    const rows = text.split('\n'), tw = Math.ceil(Math.max(...rows.map((r) => x.measureText(r).width))), pad = 14 * R, lh = fs * R * 1.22;
    c.width = tw + pad * 2; c.height = Math.ceil(fs * R * 1.5 + pad + lh * (rows.length - 1));
    x.font = f; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.fillStyle = 'rgba(9,18,30,0.62)'; x.filter = `blur(${7 * R}px)`; const r = c.height * 0.32; x.beginPath(); x.roundRect(pad * 0.6, pad * 0.5, c.width - pad * 1.2, c.height - pad, r); x.fill(); x.filter = 'none';
    x.shadowColor = 'rgba(5,10,18,0.9)'; x.shadowBlur = 6 * R; x.fillStyle = opt.color || '#f4f1e8'; rows.forEach((row, i) => x.fillText(row, c.width / 2, c.height / 2 + fs * R * 0.04 + (i - (rows.length - 1) / 2) * lh));
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    if (L.tex) L.tex.dispose(); L.tex = tex; L.m.material.map = tex; L.m.material.needsUpdate = true;
    L.w = c.width / R; L.h = c.height / R; L.tw = tw / R; L.pad = pad / R; L.R = R;
  }
  function label(text, fs, opt = {}) {
    const m = new THREE.Mesh(unitPlane, keep(new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, opacity: 0 })));
    m.renderOrder = 20; m.frustumCulled = false; scene.add(m); const L = { m, text, fs, opt }; drawLabel(L, 2); labels.push(L); return L;
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
  const TAGC = { Opus: '#a6ece3', Fable: '#ffd98a', 'Fable, then Opus': '#f4f1e8' }, tagOf = (txt) => label(txt, 22, { color: TAGC[txt] || '#cfdcec' });
  for (const n of nodes) if (n.tag) n.tagL = tagOf(n.tag);
  CL.forEach((c) => { c.tagL = tagOf(c.tag); });
  const helpers = []; CL.forEach((c, ci) => { c.lab = label(c.label, 24, { color: '#e8e4da' });
    for (let i = 0; i < c.n; i++) { const ang = (i / Math.max(1, c.n)) * Math.PI * 2 + rnd() * 0.6, rr = c.r * (0.65 + 0.35 * rnd());
      helpers.push({ ci, off: [Math.cos(ang) * rr, Math.sin(ang) * rr * 0.8], t: c.t + i * 0.09, ph: rnd() * 6.28, sp: 0.6 + rnd() * 0.8, col: c.col, size: c.n === 1 ? 58 : 46 + rnd() * 8 }); } });
  const bandLabs = [label('account C', 26, { color: '#bfe9e3' }), label('account B', 26, { color: '#ffe2a6' })];
  const cellLab = label('An agile cell', 34, { color: '#ffe7b8', bold: 1 });
  const libLab = label('the repository: the source of truth', 27, { color: '#ffe7b8' }), vaultLabs = [label('vaults:\nbig files,\nencrypted', 22, { color: '#a9d9d3' }), label('vaults: big files, encrypted', 22, { color: '#a9d9d3' })];
  const punchLabs = [label('This is how we scale.', 52, { bold: 1 }), label('This is how we scale.', 50, { bold: 1 })];
  const DUST = 260, dust = Array.from({ length: DUST }, () => ({ x: rnd(), y: rnd(), s: 3 + rnd() * 5, a: 0.04 + rnd() * 0.10, ph: rnd() * 6.28, sp: 0.2 + rnd() * 0.5 }));

  // The archive order: every light, the owner's too, goes out from the outside of the cell inwards, and drops its files.
  // Each file hovers, then falls into a slot in the library (or, for a few big ones, the vault) between 15 and 19 s.
  let files = [];
  function archiveOrder(lay) {
    const cc = lay.cell.c, key = lay === LAY.port ? 'P' : 'L', items = [], fr = prng(4242);
    nodes.forEach((n) => items.push({ ref: n, p: n[key], col: n.hollow ? DIM : n.col, nf: 3, big: ['owner', 'lead', 'cm', 'bm'].includes(n.id) }));
    helpers.forEach((h) => { const c = CL[h.ci][key]; items.push({ ref: h, p: [c[0] + h.off[0], c[1] + h.off[1]], col: h.col, nf: 2 }); });
    items.forEach((it) => { it.d = Math.hypot((it.p[0] - cc[0]) / lay.cell.h[0], (it.p[1] - cc[1]) / lay.cell.h[1]); });
    items.sort((a, b) => b.d - a.d); items.forEach((it, i) => { it.ref.out = T_OUT0 + (i / (items.length - 1)) * (T_OUT1 - T_OUT0); });
    const [lx, ly, lw, lh, , ns] = lay.lib, shH = (lh - 24) / ns; files = [];
    items.forEach((it) => { for (let f = 0; f < it.nf + (it.big ? 1 : 0); f++) { const big = it.big && f === it.nf;
      const tgt = big ? [lay.vault[0] + (fr() - 0.5) * 30, lay.vault[1] + 4] : [lx + 14 + fr() * (lw - 28), ly + 24 + (Math.floor(fr() * ns) + 0.62) * shH];
      files.push({ it, big, tgt, sx: (fr() - 0.5) * 70, sy: 18 + fr() * 40, ph: fr() * 6.28, key: it.ref.out + fr() * 0.6 }); } });
    const reg = files.filter((f) => !f.big).sort((a, b) => a.key - b.key), bigs = files.filter((f) => f.big).sort((a, b) => a.key - b.key);
    reg.forEach((f, i) => { f.ta = 15.1 + 3.9 * i / (reg.length - 1); }); bigs.forEach((f, i) => { f.ta = 16.4 + 2.2 * i / (bigs.length - 1); });
    return items.length;
  }

  let lay = null, isPortrait = null, nItems = 0, lastW = 0, lastH = 0;
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
    // a change of size is a fresh start in that size: new layout, new drawing buffer, words redrawn at the new scale
    const portrait = h > w;
    if (w !== lastW || h !== lastH) { lastW = w; lastH = h; place(portrait); renderer.setSize(w, h, false);
      const sc = Math.min(w / lay.W, h / lay.H), R = Math.min(4, Math.max(1, Math.ceil(sc * 2 * 4) / 4)); for (const L of labels) if (L.R !== R) drawLabel(L, R); }
    renderer.setViewport(0, 0, w, h);
    const t = reduced ? STILL_T : clamp(time, 0, meta.seconds), key = portrait ? 'P' : 'L';
    S = Math.min(w / lay.W, h / lay.H); X0 = (w - lay.W * S) / 2; Y0 = (h - lay.H * S) / 2;
    camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h; camera.updateProjectionMatrix();
    const tm = Math.min(t, T_HOLD); bgU.uRes.value.set(w, h); bgU.uT.value = tm; lineMesh.material.uniforms.uS.value = S; glows.material.uniforms.uS.value = S;
    const Z = lerp(1.14, 1, sstep((t - 6.4) / 2.4)), oy = N.owner[key][1], cxm = lay.W / 2;
    const Z2 = 1 + 0.06 * sstep((t - 12.8) / 2.2) * (1 - sstep((t - 15.6) / 4.4)), CX = w / 2, CY = Y0 + (lay.H / 2 + (lay.lib[1] + lay.lib[3] / 2 - lay.H / 2) * K) * S;
    const cym = lay.H / 2, oyk = cym + (oy - cym) * K, kx = (x) => cxm + (x - cxm) * K, ky = (y) => cym + (y - cym) * K;
    const sx = (x) => CX + (X0 + (cxm + (kx(x) - cxm) * Z) * S - CX) * Z2, sy = (y) => CY + (Y0 + (oyk + (ky(y) - oyk) * Z) * S - CY) * Z2, P = (p) => [sx(p[0]), sy(p[1])];
    li = 0; gi = 0; for (const L of labels) { L.m.visible = false; L.m.material.opacity = 0; }
    const live = (o) => (o.out === undefined ? 1 : 1 - sstep((t - o.out) / 0.22));
    const outFlare = (o) => (o.out === undefined || t < o.out - 0.05 ? 0 : Math.exp(-Math.max(0, t - o.out) * 9) * (t < o.out + 0.4 ? 1 : 0));
    const archive = sstep((t - T_OUT0) / (T_OUT1 - T_OUT0 + 0.3));
    bgU.uDim.value = 0;

    // dust: slow drift, a sense of a room around the cell
    for (const d of dust) { const x = fract(d.x + 0.004 * tm * d.sp + 0.01 * Math.sin(tm * 0.3 + d.ph)), y = fract(d.y - 0.006 * tm * d.sp);
      addGlow(x * w, -(y * h), [0.6, 0.72, 0.85], d.a * (0.7 + 0.3 * Math.sin(tm * d.sp * 2 + d.ph)), d.s * S, 1.2, 0); }

    // account bands: open with their maestro, grow downward with the cell
    const deepest = Math.max(...nodes.filter((n) => !n.dot && n.id !== 'owner').map((n) => (t > n.t - 0.6 ? n[key][1] : 0)), 0);
    bands.forEach((b, i) => { const [x0, x1] = lay.bands[i], [y0, y1] = lay.bandY, k = sstep((t - BAND_T[i]) / 0.8);
      b.u.uC.value.set(X0 + kx((x0 + x1) / 2) * S, sy((y0 + y1) / 2)); b.u.uH.value.set((x1 - x0) / 2 * S * K, (y1 - y0) / 2 * S * Z * K); b.u.uR.value = 26 * S;
      const grow = i === 0 ? lerp(Math.max(sy(y0 + 150), sy(deepest + 130)), sy(y1 + 60), sstep((t - 6.9) / 2.2)) : lerp(sy(y0 + 150), sy(y1 + 60), sstep((t - 8.6) / 1.2));
      b.u.uRev.value = grow; const fade = 1 - sstep((t - 12.0) / 0.9);
      b.u.uFill.value = 0.055 * k * fade; b.u.uEdge.value = 0.20 * k * fade; b.m.visible = k * fade > 0.002;
      placeLabel(bandLabs[i], i ? X0 + kx(x1 - 18) * S - bandLabs[i].tw * S : X0 + kx(x0 + 18) * S, sy(lay.bandLab), 'al', S, 0.92 * sstep((t - BAND_T[i] - 0.2) / 0.5) * fade); });

    // the named lights and the lines to whoever started or briefed them
    const posOf = (n) => n[key];
    const msgs = sstep((t - 5.9) / 0.6) * (1 - sstep((t - 11.9) / 0.3));
    for (const n of nodes) {
      const home = posOf(n), arrive = n.par ? sstep((t - (n.t - 0.6)) / 0.6) : 1, lv = live(n), fl = outFlare(n);
      let p = home, a;
      if (n.par) { const pp = posOf(byId[n.par]), cv = n.curve || 0; if (arrive < 1) p = bez(pp, home, cv, arrive);
        a = (t > n.t - 0.6 ? 1 : 0) * lv; const pul = n.dot ? fract((t - n.t) * 0.55 + n.t * 0.37) : fract((t - n.t) * 0.42 + n.t * 0.61);
        const back = n.hollow ? -2 : fract((t - n.t) * 0.42 + n.t * 0.61 + 0.5);
        const lineA = (n.hollow ? 0.55 : n.dot ? 0.7 : 0.85) * (t > n.t - 0.6 ? 1 : 0);
        addLine(P(pp), P(home), cv, n.hollow ? [0.85, 0.82, 0.75] : n.dot ? DIM : n.col === TEAL ? TEAL : AMBER, lineA, arrive * (n.out === undefined ? 1 : 1 - sstep((t - n.out + 0.1) / 0.35)), n.dot ? 1 : 0,
          t > n.t + 0.3 ? [1 - pul * 1.2 + 0.1, n.hollow ? -2 : back * 1.2 - 0.1, msgs] : null, S, (x) => x);
      } else a = sstep((t - 0.05) / 0.6) * lv;
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
      if (n.tagL) { const ta = sstep((t - (n.tagT || n.t + 0.3)) / 0.5) * lv;
        if (n.la === 'r') placeLabel(n.tagL, sx(home[0]) + gap * S, sy(home[1]) + 31 * S, 'al', S, ta);
        else if (n.la === 'a' && !portrait) placeLabel(n.tagL, sx(home[0]) + (n.lab.tw / 2 + 8) * S, sy(home[1]) - gap * S, 'al', S, ta);
        else placeLabel(n.tagL, sx(home[0]), sy(home[1]), 'b', S, ta, n.size * 0.18 + 18); }
    }

    // helper clusters: they bloom out of the lead, one line per cluster, messages running both ways
    const lead = byId.lead, lp = posOf(lead);
    CL.forEach((c, ci) => { const cp = c[key], k = sstep((t - (c.t - 0.1)) / 0.6), mine = helpers.filter((h) => h.ci === ci);
      const lv = Math.min(...mine.map(live)), anyLive = Math.max(...mine.map(live));
      const pul = fract((t - c.t) * 0.6 + ci * 0.27), back = fract((t - c.t) * 0.47 + ci * 0.53 + 0.4);
      addLine(P(lp), P(cp), ci % 2 ? 0.08 : -0.08, c.col, 0.75 * (t > c.t - 0.1 ? 1 : 0), k * (1 - sstep((t - Math.max(...mine.map((h) => h.out)) + 0.15) / 0.35)), 0, t > c.t + 0.4 ? [pul * 1.2 - 0.1, 1.1 - back * 1.2, msgs] : null, S, (x) => x);
      let lab = c.la, lx = cp[0], ly = cp[1];
      if (lab === 'al') { lx = cp[0] - 70; ly = cp[1] - c.r - 34; } else if (lab === 'bl') { lx = cp[0] - 75; ly = cp[1] + c.r + 36; } else { ly = cp[1] + Math.max(c.r, 14) + 36; lab = 'c'; }
      if (!portrait) { lab = 'c'; lx = cp[0]; ly = c.la === 'al' ? cp[1] - c.r - 32 : cp[1] + Math.max(c.r, 14) + 34; }
      placeLabel(c.lab, sx(lx), sy(ly), lab, S, sstep((t - c.t - 0.25) / 0.45) * lv * 0.95);
      const ta = sstep((t - c.t - 0.7) / 0.5) * lv;
      if (!portrait) placeLabel(c.tagL, sx(lx) + (c.lab.tw / 2 + 10) * S, sy(ly), 'al', S, ta);
      else if (lab === 'al' || lab === 'bl') placeLabel(c.tagL, sx(lx), sy(ly + (lab === 'al' ? -27 : 27)), 'al', S, ta);
      else placeLabel(c.tagL, sx(lx), sy(ly + 27), 'c', S, ta); });
    for (const hp of helpers) { const c = CL[hp.ci], cp = c[key], k = sstep((t - hp.t) / 0.7), lv = live(hp), fl = outFlare(hp);
      if (t < hp.t) continue;
      const hx = cp[0] + hp.off[0] + 3 * Math.sin(t * hp.sp + hp.ph), hy = cp[1] + hp.off[1] + 3 * Math.cos(t * hp.sp * 1.3 + hp.ph);
      const p = bez(lp, [hx, hy], 0.25, k), pop = t > hp.t + 0.7 ? Math.exp(-(t - hp.t - 0.7) * 6) : 0;
      addGlow(sx(p[0]), -sy(p[1]), hp.col, (0.9 + 0.1 * Math.sin(t * 5 + hp.ph)) * lv + pop * 0.5, hp.size * (1 + 0.5 * pop) * S, 3.4 * S, 0);
      if (fl > 0.002) addGlow(sx(hx), -sy(hy), [1, 0.95, 0.85], fl * 0.8, hp.size * 1.5 * S, 4 * S, 0); hp.at = [hx, hy]; }

    // the membrane: draws itself round everyone, then tightens a little and fades as the cell is archived
    { const cc = lay.cell, sh = lay.cell.c, fold = 0.25 * sstep((t - 12.1) / 1.4), sweep = sstep((t - CELL_T0) / (CELL_T1 - CELL_T0));
      const ccx = lerp(cc.c[0], sh[0], fold), ccy = lerp(cc.c[1], sh[1] - 20, fold), hx = lerp(cc.h[0], 170, fold), hy = lerp(cc.h[1], 60, fold);
      cell.u.uC.value.set(sx(ccx), sy(ccy)); cell.u.uH.value.set(hx * S * K, hy * S * K); cell.u.uR.value = lerp(cc.r, 40, fold) * S; cell.u.uT.value = tm; cell.u.uWob.value = S * (1 - fold);
      cell.u.uSweep.value = sweep >= 0.999 ? 2 : sweep; const ca = (t > CELL_T0 ? 1 : 0) * (1 - sstep((t - 12.3) / 1.0));
      cell.u.uEdge.value = 0.75 * ca; cell.u.uFill.value = 0.05 * ca * sstep((t - CELL_T1 + 0.4) / 0.6); cell.m.visible = ca > 0.002;
      placeLabel(cellLab, sx(lay.cellLab[0]), sy(lay.cellLab[1]), 'c', S, sstep((t - 10.9) / 0.5) * (1 - sstep((t - 12.15) / 0.5))); }

    // archiving: each light, as it goes out, drops its files; they hover, then stream down into the library and the vault
    const [lx0, ly0, lw, lh, nc, ns] = lay.lib; let filled = 0, nReg = 0, vf = 0;
    for (const f of files) { const o = f.it.ref; if (!f.big) nReg++;
      if (t >= f.ta) { if (f.big) vf += Math.exp(-(tm - f.ta) * 2.5); else filled += sstep((t - f.ta) / 0.25); if (t > f.ta + 0.25) continue; }
      if (t < o.out) continue;
      const from = o.at || f.it.p, k = sstep((t - o.out) / 0.5), drift = Math.max(0, t - o.out - 0.5);
      const hov = (tt) => { const dd = Math.max(0, tt - o.out - 0.5); return [from[0] + f.sx * sstep((tt - o.out) / 0.5) + 7 * Math.sin(tt * 1.3 + f.ph) * Math.min(1, dd), from[1] + f.sy * sstep((tt - o.out) / 0.5) + 20 * dd]; };
      const launch = Math.max(o.out + 0.5, f.ta - 1.4); let p, a = 0.9;
      if (t < launch) p = hov(t); else { const e = clamp((t - launch) / (f.ta - launch)), ee = e * e * (3 - 2 * e); p = bez(hov(launch), f.tgt, f.sx > 0 ? 0.12 : -0.12, ee); }
      if (t > f.ta) a *= 1 - (t - f.ta) / 0.25; void k; void drift;
      addGlow(sx(p[0]), -sy(p[1]), f.big ? [0.62, 0.9, 0.86] : f.it.col, a * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, (t - o.out) * 2))), (f.big ? 56 : 36) * S * Z2, 3 * S, 3); }
    const grow = sstep((t - 14.0) / 1.5);
    libU.uRect.value.set(sx(lx0), sy(ly0), lw, lh); libU.uS.value = S * Z2 * K; libU.uNC.value = nc; libU.uNS.value = ns; libU.uT.value = tm;
    libU.uA.value = grow * (0.85 + 0.15 * sstep((t - 18.5) / 1.5)); libU.uGrow.value = grow; libU.uFill.value = 0.22 + 0.78 * filled / Math.max(1, nReg);
    libU.uV.value.set(sx(lay.vault[0]), sy(lay.vault[1]), K); libU.uVA.value = 0.75 * sstep((t - 15.0) / 1.0); libU.uVF.value = Math.min(1, vf);
    placeLabel(libLab, sx(lay.libLab[0]), sy(lay.libLab[1]), 'c', S, sstep((t - 16.0) / 0.8));
    placeLabel(vaultLabs[portrait ? 0 : 1], sx(lay.vaultLab[0]), sy(lay.vaultLab[1]), 'c', S, 0.8 * sstep((t - 16.6) / 0.8));
    { const k = sstep((t - 19.2) / 1.0); placeLabel(punchLabs[portrait ? 0 : 1], sx(lay.punch[0]), sy(lay.punch[1] + 14 * (1 - k)), 'c', S, k); }

    // finish the dynamic buffers
    for (let v = li * VPL; v < MAXL * VPL; v++) { lP[v * 4] = 0; lPos.set([0, 0, 0], v * 3); }
    gGeo.setDrawRange(0, gi); ['position', 'aCol', 'aA'].forEach((n) => { gGeo.attributes[n].needsUpdate = true; });
    lGeo.setDrawRange(0, li * SEG * 6); ['position', 'aUV', 'aCol', 'aP', 'aH'].forEach((n) => { lGeo.attributes[n].needsUpdate = true; });
    renderer.render(scene, camera);
  }
  function dispose() { for (const d of disposables) d.dispose(); for (const L of labels) L.tex.dispose(); renderer.dispose(); }
  return { render, dispose };
}
