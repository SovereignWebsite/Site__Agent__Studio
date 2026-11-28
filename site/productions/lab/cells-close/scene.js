// Agile, at any size: the closing scene. The stack of file cards that ended the last scene sits on its shelf; a cell
// re-forms out of it (its files are its memory). The view pulls back and the shelf runs out into a library of shelves,
// tier above tier, and on every shelf small cells are built when they are needed: a warm light first, then the teal lights
// of its team, the membrane closing round them; they work (pulses run down their threads, a file drops onto the shelf
// now and then) and, when the task is done, they fold down onto their own small stack of files. Some slots are used twice.
// At the end the motion settles into a calm field of living cells and neat stacks, and the title arrives above it.
// Composed for 720x1280 first; 1280x720 is a second layout of the same idea, in pixels, under an orthographic camera.
// A lab scene component (see ../harness.js for the contract). render(t) is a pure function of t. Apache-2.0. By c.productions.
export const meta = {
  id: 'cells-close',
  title: 'Agile, at any size',
  beat: 'A cell re-forms from its files; the view pulls back to shelves of small cells, each built when it is needed, working, then folding onto its own stack of files; the field settles under the title Agile Cells.',
  seconds: 11,
  sources: [
    { title: 'Dinis Cruz on Agile Cells, 28 November 2026 (start prompt of the film)', url: 'https://studio.agents.sovereignweb.site/productions/plans/2026-11-28-agile-cells-film-start-prompt.md' },
    { title: 'Agile Cells: what a cell is (the agilecells.org page as seeded by the AgileCells organisation)', url: 'https://github.com/AgileCells/AgileCells-AgileCells__IaC/blob/dev/seed/AgileCells__Site__Website/site/index.html' },
  ],
};

const AMBER = [1.0, 0.784, 0.341], TEAL = [0.373, 0.816, 0.773], INK = [0.957, 0.945, 0.91], WARM = [1.0, 0.86, 0.6];
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MAXC = 32, CELL_R = 120, HERO_R = 104, MAX_CARDS = 7;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const s5 = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
const fract = (x) => x - Math.floor(x);
const backOut = (x) => { const c = 1.6, u = clamp(x) - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const gauss = (x, w) => Math.exp(-(x * x) / (w * w));
function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Design pixels at the final (pulled-back) view. Each tier is a shelf line: its y, its scale k (design px per cell unit;
// a cell is 120 units in radius, a file card 206 units wide), and how many slots it has. S0/Z0: where the hero's stack is
// on screen at t = 0 and how close the view starts, so the first frame matches the last frame of cells-grow exactly.
const LAY = {
  port: { W: 720, H: 1280, S0: [360, 1018], Z0: 2.2, title: [360, 300], titleFs: 104, url: [360, 392], urlFs: 34, textW: 600,
    tiers: [{ y: 1035, k: 0.4545, n: 3, sp: 220 }, { y: 866, k: 0.36, n: 4, sp: 172 }, { y: 740, k: 0.285, n: 5, sp: 138 }, { y: 638, k: 0.225, n: 6, sp: 114 }, { y: 558, k: 0.175, n: 7, sp: 98 }] },
  land: { W: 1280, H: 720, S0: [640, 566], Z0: 2.564, title: [640, 148], titleFs: 100, url: [640, 226], urlFs: 30, textW: 900,
    tiers: [{ y: 580, k: 0.40, n: 7, sp: 175 }, { y: 440, k: 0.30, n: 8, sp: 150 }, { y: 350, k: 0.22, n: 11, sp: 110 }] },
};
const HOME = [[0, -44], [-73, 5], [73, 2], [-47, 60], [49, 58], [0, 78]]; // light offsets in cell units (amber first)

export async function create({ canvas, THREE, reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(0, 720, 0, -1280, -10, 10);
  const disposables = [], keep = (x) => { disposables.push(x); return x; };
  const quad = keep(new THREE.PlaneGeometry(2, 2)), unitPlane = keep(new THREE.PlaneGeometry(1, 1));
  const FS_VERT = 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const fsMesh = (frag, uniforms, order) => { const m = new THREE.Mesh(quad, keep(new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }))); m.frustumCulled = false; m.renderOrder = order; scene.add(m); return m; };
  const uRes = { value: new THREE.Vector2(720, 1280) };

  // backdrop: house navy, a warm breath of light over the field that grows as it fills, a vignette, a little grain
  const bgU = { uRes, uGlow: { value: new THREE.Vector4(360, 800, 300, 300) }, uGlowA: { value: 0 } };
  const bg = fsMesh(`precision highp float; uniform vec2 uRes; uniform vec4 uGlow; uniform float uGlowA;
    void main(){ vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y), uv = p / uRes;
      vec3 top = vec3(0.043, 0.078, 0.125), mid = vec3(0.071, 0.149, 0.227);
      vec3 col = mix(top, mid, 0.85 * exp(-pow((uv.y - 0.5) / 0.42, 2.0)));
      vec2 g2 = (p - uGlow.xy) / max(uGlow.zw, vec2(1.0)); float g = dot(g2, g2);
      col += vec3(0.10, 0.075, 0.04) * exp(-g * 1.3) * uGlowA + vec3(0.025, 0.06, 0.065) * exp(-g * 0.4) * uGlowA;
      vec2 c = (uv - 0.5) * vec2(uRes.x / max(uRes.x, uRes.y), uRes.y / max(uRes.x, uRes.y)) * 1.5;
      col *= 1.0 - 0.42 * smoothstep(0.25, 0.85, length(c));
      col += (fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 2.5 / 255.0;
      gl_FragColor = vec4(col, 1.0); }`, bgU, -10);
  bg.material.blending = THREE.NoBlending; bg.material.transparent = false;

  // membranes: one wobbling ellipse per cell, a double edge, a halo and a faint teal fill, all in one pass
  const mU = { uRes, uC: { value: Array.from({ length: MAXC }, () => new THREE.Vector4()) }, uD: { value: Array.from({ length: MAXC }, () => new THREE.Vector4()) }, uN: { value: 0 }, uT: { value: 0 } };
  const membrane = fsMesh(`precision highp float; uniform vec2 uRes; uniform vec4 uC[${MAXC}]; uniform vec4 uD[${MAXC}]; uniform int uN; uniform float uT;
    void main(){ vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y); vec3 col = vec3(0.0);
      for (int i = 0; i < ${MAXC}; i++) { if (i >= uN) break; vec4 c = uC[i], d = uD[i]; if (d.x < 0.003) continue;
        float sc = d.w, rm = max(c.z, c.w); vec2 q = p - c.xy; if (abs(q.x) > rm + 70.0 * sc + 8.0 || abs(q.y) > rm + 70.0 * sc + 8.0) continue;
        vec2 e = q / max(c.zw, vec2(0.5)); float s = (length(e) - 1.0) * min(c.z, c.w), ang = atan(q.y, q.x), ph = d.y;
        s += sc * (1.0 - 0.6 * d.z) * (sin(ang * 5.0 + uT * 1.1 + ph) * 2.0 + sin(ang * 9.0 - uT * 1.7 + ph * 2.0) * 1.0 + sin(ang * 3.0 + uT * 0.6 + ph * 3.0) * 1.6);
        float a = abs(s), inside = smoothstep(1.0, -2.0, s);
        float edge = exp(-a / 1.25) * 0.9 + exp(-abs(s + 6.0 * sc) / 1.1) * 0.28 + exp(-a / (10.0 * sc)) * 0.2 + exp(-a / (40.0 * sc)) * 0.06;
        float n = sin(p.x * 0.045 / sc + uT * 0.3 + ph) * sin(p.y * 0.05 / sc - uT * 0.25) * 0.5 + 0.5;
        float fill = inside * (0.03 + 0.085 * exp(s / (24.0 * sc)) + 0.012 * n);
        col += (vec3(1.0, 0.89, 0.70) * edge * (1.0 + fract(d.z) * 0.0) + vec3(0.30, 0.62, 0.62) * fill) * d.x; }
      gl_FragColor = vec4(col, 1.0); }`, mU, 2);

  // boxes: every plank, shelf line, file card, tab and card face, built on the CPU each frame as quads
  const MAXB = 900, PAD = 20, bPos = new Float32Array(MAXB * 4 * 3), bL = new Float32Array(MAXB * 4 * 2), bB = new Float32Array(MAXB * 4 * 4), bC = new Float32Array(MAXB * 4 * 3), bT = new Float32Array(MAXB * 4 * 4), bIdx = [];
  for (let i = 0; i < MAXB; i++) { const a = i * 4; bIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const bGeo = keep(new THREE.BufferGeometry());
  [['position', bPos, 3], ['aL', bL, 2], ['aB', bB, 4], ['aC', bC, 3], ['aT', bT, 4]].forEach(([n, a, s]) => bGeo.setAttribute(n, new THREE.BufferAttribute(a, s).setUsage(THREE.DynamicDrawUsage)));
  bGeo.setIndex(bIdx);
  const boxes = new THREE.Mesh(bGeo, keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute vec2 aL; attribute vec4 aB, aT; attribute vec3 aC; varying vec2 vL; varying vec4 vB, vT; varying vec3 vC; void main(){ vL = aL; vB = aB; vT = aT; vC = aC; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }',
    fragmentShader: `precision highp float; varying vec2 vL; varying vec4 vB, vT; varying vec3 vC;
      float sdb(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      void main(){ vec2 q = vL; q.x += q.y * vB.w; float e = sdb(q, vB.xy, vB.z), ins = smoothstep(0.6, -0.6, e);
        float gw = vT.w < 0.0 ? 20.0 : 9.0, gs = vT.w < 0.0 ? 0.22 : 0.08, fill = abs(vT.w);
        float edgeF = 1.0 - smoothstep(${PAD}.0 * 0.45, ${PAD}.0 * 0.95, max(e, 0.0));
        float v = (exp(-abs(e) / 1.1) * 0.75 + exp(-max(e, 0.0) / gw) * gs) * edgeF + ins * fill;
        if (vT.y > 0.0) { float row = (q.y + vB.y) / (vB.y * 2.0 / 4.5), r = floor(row);
          float ln = ins * step(abs(fract(row) - 0.5), 0.16) * step(0.5, r) * step(r, 3.5) * step(q.x, vB.x * (-0.75 + 0.9 * fract(r * 0.61 + 0.2))) * step(-vB.x * 0.8, q.x);
          v += ln * 0.24 * vT.y; }
        float tp = mix(1.0, 1.0 - smoothstep(0.25, 1.0, abs(vL.x) / vB.x), vT.z);
        gl_FragColor = vec4(vC * v * vT.x * tp, 1.0); }` })));
  boxes.frustumCulled = false; boxes.renderOrder = 3; scene.add(boxes);

  // threads: thin glowing segments
  const MAXS = 500, sPos = new Float32Array(MAXS * 4 * 3), sV = new Float32Array(MAXS * 4), sCol = new Float32Array(MAXS * 4 * 3), sA = new Float32Array(MAXS * 4), sIdx = [];
  for (let i = 0; i < MAXS; i++) { const a = i * 4; sIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const lGeo = keep(new THREE.BufferGeometry());
  [['position', sPos, 3], ['aV', sV, 1], ['aCol', sCol, 3], ['aA', sA, 1]].forEach(([n, a, s]) => lGeo.setAttribute(n, new THREE.BufferAttribute(a, s).setUsage(THREE.DynamicDrawUsage)));
  lGeo.setIndex(sIdx);
  const lines = new THREE.Mesh(lGeo, keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute float aV, aA; attribute vec3 aCol; varying float vV, vA; varying vec3 vCol; void main(){ vV = aV; vA = aA; vCol = aCol; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'precision highp float; varying float vV, vA; varying vec3 vCol; void main(){ float c = exp(-vV * vV * 9.0) * 0.9 + exp(-vV * vV * 2.2) * 0.18; gl_FragColor = vec4(vCol * c * vA, 1.0); }' })));
  lines.frustumCulled = false; lines.renderOrder = 5; scene.add(lines);

  // lights: one Points cloud for every glow (people, agents, pulses, flashes, dust)
  const MAXP = 1000, gPos = new Float32Array(MAXP * 3), gCol = new Float32Array(MAXP * 3), gA = new Float32Array(MAXP * 4);
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

  // the only words: Agile Cells, sovereignwebsite.org (canvas textures, sized to fit the layout's text width)
  const texOf = (c) => { const tex = keep(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; return tex; };
  const sprites = [];
  function textSprite(text, fs0, maxW, color, glow, weight, spacing) {
    const c = document.createElement('canvas'), x = c.getContext('2d'), S2 = 2;
    x.font = `${weight} ${fs0}px ${FONT}`; const w0 = x.measureText(text).width + spacing * (text.length - 1), fs = Math.min(fs0, Math.floor(fs0 * maxW / w0));
    const f = `${weight} ${fs * S2}px ${FONT}`; x.font = f; const sp = spacing * (fs / fs0) * S2;
    const chars = [...text], cw = chars.map((ch) => x.measureText(ch).width), tw = Math.ceil(cw.reduce((a, b) => a + b, 0) + sp * (chars.length - 1)), pad = Math.ceil(fs * 0.6) * S2;
    c.width = tw + pad * 2; c.height = Math.ceil(fs * S2 * 1.35 + pad * 2);
    const draw = () => { let px = pad; x.font = f; x.textAlign = 'left'; x.textBaseline = 'middle'; chars.forEach((ch, i) => { x.fillText(ch, px, c.height / 2); px += cw[i] + sp; }); };
    if (glow) { x.shadowColor = glow; x.shadowBlur = fs * 0.45 * S2; x.fillStyle = color; draw(); x.shadowBlur = fs * 0.1 * S2; }
    x.fillStyle = color; draw();
    const m = new THREE.Mesh(unitPlane, keep(new THREE.MeshBasicMaterial({ map: texOf(c), transparent: true, depthTest: false, depthWrite: false, opacity: 0, blending: THREE.NormalBlending })));
    m.renderOrder = 22; m.frustumCulled = false; m.visible = false; scene.add(m); const s = { m, w: c.width / S2, h: c.height / S2 }; sprites.push(s); return s;
  }
  const place = (s, x, y, scale, a) => { s.m.position.set(x, -y, 0); s.m.scale.set(s.w * scale, s.h * scale, 1); s.m.material.opacity = a; s.m.visible = a > 0.003; };

  // the dust of the room
  const drnd = prng(4417);
  const DUST = Array.from({ length: 150 }, () => ({ x: drnd(), y: drnd(), s: 2.5 + drnd() * 4.5, a: 0.03 + drnd() * 0.08, ph: drnd() * 6.28, sp: 0.2 + drnd() * 0.5 }));

  // a layout: its slots, and the whole life of every slot, seeded once
  let L = null, isPortrait = null, slots = null, hero = null, titleSpr = null, urlSpr = null;
  function setLayout(portrait) {
    isPortrait = portrait; L = portrait ? LAY.port : LAY.land; const rnd = prng(portrait ? 28112026 : 28112027);
    for (const s of sprites) scene.remove(s.m); sprites.length = 0;
    titleSpr = textSprite('Agile Cells', L.titleFs, L.textW, '#f4f1e8', 'rgba(255,200,87,0.55)', 700, L.titleFs * 0.01);
    urlSpr = textSprite('sovereignwebsite.org', L.urlFs, L.textW * 0.8, '#bfe9e4', 'rgba(95,208,197,0.45)', 500, L.urlFs * 0.04);
    slots = [];
    const T0 = L.tiers[0], hx = L.W / 2;
    L.tiers.forEach((tr, ti) => { for (let j = 0; j < tr.n; j++) {
      const isHero = ti === 0 && j === (tr.n - 1) / 2, jx = isHero ? 0 : (rnd() - 0.5) * tr.sp * 0.16;
      slots.push({ x: hx + (j - (tr.n - 1) / 2) * tr.sp + jx, y: tr.y, k: tr.k, ti, hero: isHero, ph: rnd() * 6.28 }); } });
    hero = slots.find((s) => s.hero);
    const far = Math.max(...slots.map((s) => Math.hypot((s.x - hero.x) / L.W, (s.y - hero.y) / L.H * 1.6)));
    for (const s of slots) {
      // the team: an amber light (the person who needs the task done) and three to five teal lights (agents)
      const nt = s.hero ? 5 : 3 + Math.floor(rnd() * 3), pick = [1, 2, 3, 4, 5].sort(() => rnd() - 0.5).slice(0, nt).sort();
      const rot = (rnd() - 0.5) * 0.5;
      s.team = [0, ...pick].map((h, i) => { const o = HOME[h], c = Math.cos(rot), sn = Math.sin(rot), jx = (rnd() - 0.5) * 16, jy = (rnd() - 0.5) * 16;
        return { o: i === 0 ? [o[0] + jx * 0.5, o[1]] : [o[0] * c - o[1] * sn + jx, o[0] * sn + o[1] * c + jy], col: i === 0 ? AMBER : TEAL, ph: rnd() * 6.28, sp: 0.6 + rnd() * 0.6, d: rnd() }; });
      s.lives = []; s.cards = [];
      if (s.hero) { s.lives.push({ b: 0.35, f: Infinity, hero: true }); for (let i = 0; i < 12; i++) s.cards.push({ t: -1, from: 0 });
        continue; }
      const dn = Math.hypot((s.x - hero.x) / L.W, (s.y - hero.y) / L.H * 1.6) / far;
      // two fates: done (built, works, folds onto its files before the title) or still at work when the film ends
      if (rnd() < 0.58) { const b1 = 2.8 + 2.0 * dn + rnd() * 0.6, f1 = Math.min(6.7, b1 + 1.25 + rnd() * 0.7); s.lives.push({ b: b1, f: f1 });
        if (rnd() < 0.3) { const b2 = f1 + 0.95; if (b2 < 6.9) s.lives.push({ b: b2, f: Infinity }); } }
      else { const b1 = 3.6 + 2.2 * dn + rnd() * 0.9; s.lives.push({ b: Math.min(b1, 6.6), f: Infinity }); }
      s.lives.forEach((lf, li) => {
        const end = Math.min(lf.f, 7.5); for (let tc = lf.b + 1.05 + rnd() * 0.3; tc < end - 0.2; tc += 1.0 + rnd() * 0.5) s.cards.push({ t: tc, life: li });
        if (lf.f < Infinity) { const nf = 3 + Math.floor(rnd() * 2); for (let j = 0; j < nf; j++) s.cards.push({ t: lf.f + 0.5 + j * 0.13, life: li, fold: true }); } });
      s.cards.sort((a, b) => a.t - b.t); s.cards.length = Math.min(s.cards.length, MAX_CARDS);
    }
    // hero last in the membrane list is irrelevant; order slots so the far tiers draw first
    slots.sort((a, b) => b.ti - a.ti);
  }

  // buffers
  let si = 0, gi = 0, bi = 0, S = 1, X0 = 0, Y0 = 0, Z = 1, PX = 0, PY = 0, FX = 0, FY = 0;
  const X = (wx) => X0 + S * (PX + (wx - FX) * Z), Y = (wy) => Y0 + S * (PY + (wy - FY) * Z);
  function seg(ax, ay, bx, by, col, a, hw) {
    if (si >= MAXS || a <= 0.003) return; let dx = bx - ax, dy = by - ay; const l = Math.hypot(dx, dy); if (l < 0.5) return; dx /= l; dy /= l;
    const e = hw * 0.5; ax -= dx * e; ay -= dy * e; bx += dx * e; by += dy * e; const nx = -dy * hw, ny = dx * hw, v = si * 4;
    const P = [[ax + nx, ay + ny, -1], [ax - nx, ay - ny, 1], [bx + nx, by + ny, -1], [bx - nx, by - ny, 1]];
    P.forEach((q, j) => { sPos.set([q[0], -q[1], 0], (v + j) * 3); sV[v + j] = q[2]; sCol.set(col, (v + j) * 3); sA[v + j] = a; }); si++;
  }
  function glow(x, y, col, a, size, core, flare = 0) { if (gi >= MAXP || a <= 0.003 || size < 0.5) return; gPos.set([x, -y, 0], gi * 3); gCol.set(col, gi * 3); gA.set([a, size, Math.pow(size / (2 * Math.max(0.6, core)), 2), flare], gi * 4); gi++; }
  // a box centred at canvas (cx, cy), half size (hw, hh) in canvas px; fill < 0 means a wide amber glow (planks)
  function box(cx, cy, hw, hh, col, a, { r = 2, skew = 0, lines = 0, taper = 0, fill = 0.1 } = {}) {
    if (bi >= MAXB || a <= 0.003) return; hh = Math.max(hh, 0.55); r = Math.min(r, hh); const pw = hw + PAD + Math.abs(skew) * hh, ph = hh + PAD, v = bi * 4;
    [[-pw, -ph], [pw, -ph], [-pw, ph], [pw, ph]].forEach((c, j) => { bPos.set([cx + c[0], -(cy + c[1]), 0], (v + j) * 3); bL.set(c, (v + j) * 2); bB.set([hw, hh, r, skew], (v + j) * 4); bC.set(col, (v + j) * 3); bT.set([a, lines, taper, fill], (v + j) * 4); });
    bi++;
  }

  function render(time, w, h) {
    const portrait = h > w; if (portrait !== isPortrait) setLayout(portrait);
    if (canvas.width !== w || canvas.height !== h) renderer.setSize(w, h, false); renderer.setViewport(0, 0, w, h);
    camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h; camera.updateProjectionMatrix();
    uRes.value.set(w, h); si = 0; gi = 0; bi = 0;
    const t = reduced ? meta.seconds : clamp(time, 0, meta.seconds);
    S = Math.min(w / L.W, h / L.H); X0 = (w - L.W * S) / 2; Y0 = (h - L.H * S) / 2;

    // the pull-back: from the hero's stack, close up (where cells-grow left it), out to the whole library of shelves
    const pe = s5((t - 2.1) / 2.7); Z = Math.pow(L.Z0, 1 - pe); FX = hero.x; FY = hero.y; PX = lerp(L.S0[0], FX, pe); PY = lerp(L.S0[1], FY, pe);
    const calm = sstep((t - 7.0) / 1.6), still = 1 - 0.85 * calm;

    // dust
    for (const d of DUST) { const x = fract(d.x + 0.003 * t * d.sp + 0.01 * Math.sin(t * 0.3 + d.ph)), y = fract(d.y - 0.004 * t * d.sp);
      glow(x * w, y * h, [0.6, 0.72, 0.85], d.a * (0.7 + 0.3 * Math.sin(t * d.sp * 2 + d.ph)), d.s * S, 1.2); }

    // shelf lines: the hero's plank runs out into a long shelf, and the tiers above light up as the view pulls back
    L.tiers.forEach((tr, ti) => {
      const grow = ti === 0 ? s5((t - 1.9) / 2.2) : s5((t - 2.6 - ti * 0.35) / 1.6); if (grow <= 0 && ti > 0) return;
      const half0 = 156 * tr.k, half1 = L.W * 0.5 + 40, half = lerp(half0, half1, grow);
      const a = 0.42 * sstep(grow * 2.5) * (1 - 0.1 * ti);
      box(X(hero.x), Y(tr.y + 3 * tr.k), half * S * Z, Math.max(0.7, 1.4 * tr.k * S * Z), AMBER, a, { r: 1, taper: ti === 0 ? grow : 1, fill: -0.85 });
    });

    // the slots: every cell, its team, its threads, its files
    let nm = 0, cxs = 0, cys = 0, cws = 0;
    for (const s of slots) {
      const u = s.k * S * Z, sx = X(s.x), sy = Y(s.y), sc = s.k / 0.4545 * Z * S;                  // u: canvas px per unit
      const tierFade = s.hero ? 1 : 1 - 0.09 * s.ti;
      if (sx < -200 * u - 40 || sx > w + 200 * u + 40) continue;

      // the stack: cards at rest, and cards in flight from the cell above down onto the stack
      const live = s.lives.find((lf) => t >= lf.b && t < lf.f + 1.0) || null;
      let nRest = 0; const flights = [];
      s.cards.forEach((c, i) => { if (c.t < 0 || t >= c.t) nRest = i + 1; else if (t > c.t - 0.42) flights.push({ i, k: 1 - (c.t - t) / 0.42, c }); });
      const heroA = s.hero ? lerp(0.55, 0.8, sstep((t - 0.4) / 1.6)) : 0.78;
      const plankShow = s.hero ? 1 : sstep((t - s.lives[0].b + 0.1) / 0.4);
      // the plank under each slot (brighter than the shelf line)
      box(sx, sy + 3 * u, 156 * u * (s.hero ? 1 : 0.8), 2.2 * u, AMBER, (s.hero ? 0.55 + 0.25 * sstep((t - 2) / 2) : 0.7) * plankShow * tierFade, { r: 2 * u, fill: -0.85 });
      const stackY = (i) => -7.5 - i * 9;
      const card = (i, yOff, a) => { const jx = (fract(Math.sin((i + (s.hero ? 0 : s.ph * 10)) * 12.9) * 43.7) - 0.5) * 8, tx = (fract(i * 0.37 + (s.hero ? 0 : s.ph)) - 0.5) * 156;
        box(sx + jx * u, sy + (stackY(i) + yOff) * u, 103 * u, 3.4 * u, WARM, a * 0.75, { r: 2 * u, fill: 0.1 });
        box(sx + (jx + tx) * u, sy + (stackY(i) + yOff - 4.6) * u, 11 * u, 2.2 * u, WARM, a * 0.75, { r: 1.5 * u, fill: 0.1 }); };
      for (let i = 0; i < nRest; i++) { const c = s.cards[i], fresh = c.t < 0 ? 0 : Math.exp(-Math.max(0, t - c.t) * 2.5);
        card(i, 0, (s.hero ? heroA : 0.78) * tierFade * (0.85 + 0.6 * fresh)); if (fresh > 0.02) glow(sx, sy + (stackY(i) - 3) * u, [1, 0.9, 0.7], fresh * 0.55 * tierFade, 220 * u, 12 * u); }
      // the face of the top card on the hero's stack, as cells-grow left it; it fades as the cell re-forms out of it
      if (s.hero) { const fa = 1 - sstep((t - 0.25) / 0.6); if (fa > 0.003) box(sx, sy + (-3 - 11 * 9 - 9 - 15) * u, 156 * 0.6 * u, 13 * u, [1, 0.88, 0.66], 0.55 * fa, { r: 2.5 * u, skew: 0.55, lines: 1, fill: 0.07 }); }

      // the cell
      if (!live) { continue; }
      const lt = t - live.b, R = live.hero ? HERO_R : CELL_R;
      const stackTopU = stackY(Math.max(nRest, 1) - 1) - 6;
      const cyU = s.hero ? (stackY(11) - 16 - R) : -(72 + 22 + R);                                  // cell centre, units above the shelf
      const fk = live.f < Infinity ? s5((t - live.f) / 0.85) : 0;                                   // the fold
      let form, lightK;
      if (live.hero) { form = s5((t - 0.85) / 1.4); lightK = (i) => s5((t - 0.3 - i * 0.12) / 1.1); }
      else { form = backOut(clamp((lt - 0.1) / 0.6)); lightK = (i) => (i === 0 ? s5(lt / 0.3) : s5((lt - 0.2 - i * 0.08) / 0.45)); }
      const breathe = 1 + 0.025 * Math.sin(t * 1.3 + s.ph) * (1 - 0.5 * calm);
      const ccx = s.x, ccyU = lerp(cyU, stackTopU - 14, fk), rx = R * form * (1 - 0.3 * fk) * breathe, ry = R * form * (1 - 0.88 * fk) * breathe;
      const wave = gauss(t - 7.25 - Math.hypot((s.x - hero.x) / L.W, (s.y - hero.y) / L.H) * 0.9, 0.22) * 0.55;
      const mA = (live.hero ? 0.9 * sstep((t - 0.9) / 0.9) : 0.85 * sstep(lt / 0.35)) * (1 - sstep((fk - 0.55) / 0.45)) * tierFade * (1 + wave);
      const ccy = s.y + ccyU * s.k;
      if (nm < MAXC && rx > 0.5) { mU.uC.value[nm].set(X(ccx), Y(ccy), rx * u, Math.max(0.5, ry * u)); mU.uD.value[nm].set(mA, s.ph, calm, Math.max(0.25, sc)); nm++;
        cxs += X(ccx) * mA; cys += Y(ccy) * mA; cws += mA; }

      // the team: positions inside the cell; in the fold they drop into the stack and go out
      const P = s.team.map((m, i) => {
        const k = lightK(i), rs = R / CELL_R; let ox = m.o[0] * rs, oy = m.o[1] * rs;
        ox += 3 * Math.sin(t * m.sp + m.ph) * still; oy += 3 * Math.cos(t * m.sp * 1.3 + m.ph) * still;
        let px = s.x + ox * s.k * form, py = ccy + oy * s.k * Math.max(form, 0.001);
        if (live.hero) { const from = [s.x + m.o[0] * 0.25 * s.k, s.y + (stackTopU - 4) * s.k], e = k; px = lerp(from[0], s.x + ox * s.k, e); py = lerp(from[1], ccy + oy * s.k, e); }
        else if (i > 0) { const e = k; px = lerp(s.x + s.team[0].o[0] * s.k, px, e); py = lerp(ccy + s.team[0].o[1] * s.k, py, e); }
        if (fk > 0) { const e = s5((fk - m.d * 0.25) / 0.75); px = lerp(px, s.x + m.o[0] * 0.3 * s.k, e); py = lerp(py, s.y + (stackTopU - 6) * s.k, e); }
        const a = k * (1 - sstep((fk - 0.45) / 0.45)) * tierFade;
        return { x: X(px), y: Y(py), a };
      });
      // threads: from the person to each agent, with pulses of work running down them
      const thA = (live.hero ? sstep((t - 1.2) / 0.8) : sstep((lt - 0.45) / 0.4)) * (1 - sstep(fk / 0.4));
      const hw = Math.max(0.65, 1.7 * u);
      for (let i = 1; i < P.length; i++) { const a0 = Math.min(P[0].a, P[i].a) * thA; if (a0 <= 0.003) continue;
        const col = mix3(TEAL, INK, 0.45); seg(P[0].x, P[0].y, P[i].x, P[i].y, col, 0.5 * a0, hw);
        if (i < P.length - 1 && i % 2) seg(P[i].x, P[i].y, P[i + 1].x, P[i + 1].y, col, 0.18 * a0, hw);
        const m = s.team[i], speed = 0.75 + m.d * 0.4, uu = fract((t - live.b) * speed + m.d * 2.7), pa = Math.sin(Math.PI * uu) * 0.95 * a0 * still;
        glow(lerp(P[0].x, P[i].x, uu), lerp(P[0].y, P[i].y, uu), [1, 0.93, 0.78], pa, 70 * u, 5 * u);
        P[i].pop = Math.exp(-Math.pow((uu - 1) / 0.06, 2)) + Math.exp(-Math.pow(uu / 0.06, 2)); }
      P.forEach((p, i) => { if (p.a <= 0.003) return; const m = s.team[i], base = i === 0 ? 136 : 91, pop = (p.pop || 0) * 0.35 * still;
        glow(p.x, p.y, m.col, p.a * (1 + pop + wave * 0.6), base * u * (1 + 0.04 * Math.sin(t * 1.6 + m.ph)) * (1 + pop * 0.4), (i === 0 ? 9 : 6) * u, i === 0 ? 0.7 : 0); });
      // files in flight: a card slides out of the bottom of the membrane and settles on the stack
      for (const fl of flights) { const c = fl.c, fromU = c.fold ? lerp(ccyU + ry * 0.2, stackTopU - 30, 0.5) : ccyU + ry * 0.92, toU = stackY(fl.i), e = s5(fl.k);
        const yU = lerp(fromU, toU, e), jx = (fract(Math.sin((fl.i + s.ph * 10) * 12.9) * 43.7) - 0.5) * 8;
        box(sx + jx * u * e, Y(s.y + yU * s.k), 103 * u * lerp(0.35, 1, e), 3.4 * u, WARM, 0.85 * sstep(fl.k * 4) * tierFade, { r: 2 * u, fill: 0.14 }); }
    }
    mU.uN.value = nm; mU.uT.value = t; membrane.visible = nm > 0;
    if (cws > 0) { const gx = cxs / cws, gy = cys / cws, sp = lerp(220, Math.max(w, h) * 0.45, pe); bgU.uGlow.value.set(gx, gy, sp * (portrait ? 1.0 : 1.6), sp); }
    bgU.uGlowA.value = sstep((t - 0.6) / 2) * lerp(0.8, 1.0, pe);

    // the title, when the field settles: Agile Cells, and under it the address
    { const ta = s5((t - 7.15) / 1.0), ua = s5((t - 7.85) / 0.9);
      place(titleSpr, X0 + S * L.title[0], Y0 + S * (L.title[1] + 16 * (1 - ta)), S * (0.97 + 0.03 * ta), ta);
      place(urlSpr, X0 + S * L.url[0], Y0 + S * (L.url[1] + 10 * (1 - ua)), S, ua * 0.92); }

    gGeo.setDrawRange(0, gi); ['position', 'aCol', 'aA'].forEach((n) => { gGeo.attributes[n].needsUpdate = true; });
    lGeo.setDrawRange(0, si * 6); ['position', 'aV', 'aCol', 'aA'].forEach((n) => { lGeo.attributes[n].needsUpdate = true; });
    bGeo.setDrawRange(0, bi * 6); ['position', 'aL', 'aB', 'aC', 'aT'].forEach((n) => { bGeo.attributes[n].needsUpdate = true; });
    renderer.render(scene, camera);
  }
  function dispose() { for (const d of disposables) d.dispose(); renderer.dispose(); }
  return { render, dispose };
}
