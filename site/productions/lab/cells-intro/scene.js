// The opening of the Agile Cells film. One small team glows in a tidy membrane: an amber light and five teal ones, joined
// by clean threads (Agile at its best size). Then many more lights crowd in, the threads multiply into a tangle, the glow
// muddies, a few links flicker coral and the one membrane stretches until it bursts (Agile struggling to scale). The
// tangle resolves into six neat round cells, each a small tidy team again, and the title arrives. Last, the title rises,
// four cells settle in a row beneath it, and two cells open out into live cards of the scenes that follow: how a cell
// grows (after cells-grow) and the real cell that made a film (after refresh-cell), drawn here as small 2D previews.
// Composed for 720x1280 first; 1280x720 is a second layout of the same objects, in design pixels, under an orthographic
// camera. A lab scene component (see ../harness.js for the contract). render(t) is a pure function of t. Apache-2.0.
import { drawGrow, drawTeam } from './previews.js';

export const meta = {
  id: 'cells-intro',
  title: 'Agile Cells: the proposition',
  beat: 'A small team works well; crowd it and its threads tangle and fail; split it into cells, each a small team again, and it scales. Then the agenda: how a cell works, and a cell working for real.',
  seconds: 10,
  sources: [{ title: 'Dinis Cruz on Agile Cells, 28 November 2026 (start prompt of the film)', url: 'https://studio.agents.sovereignweb.site/productions/plans/2026-11-28-agile-cells-film-start-prompt.md' }],
};

const AMBER = [1.0, 0.784, 0.341], TEAL = [0.373, 0.816, 0.773], CORAL = [1.0, 0.42, 0.37], MUD = [0.58, 0.55, 0.45];
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const TITLE = 'Agile Cells', LABELS = ['How a cell works', 'A cell, working for real'];
const NC = 6, PER = 6, NL = NC * PER, CARD_CELL = [2, 3], ROW_CELLS = [0, 1, 4, 5];
const T_CROWD = 2.2, T_SPLIT = 4.6, T_UP = 6.8, T_TITLE = 5.35, CARD_T = [7.15, 8.25], GROW = 0.95, STILL_T = 9.8;
// what each card plays: source scene, its start moment, how fast it runs once the card has opened
// the cards are previews drawn here on 2D canvases (no inner scenes, no second WebGL context): see ./previews.js
const SUB_W = 576, SUB_H = 324;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const backOut = (x) => { const c = 1.4, u = x - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// where everything sits, in design pixels: 720x1280 for portrait, 1280x720 for landscape
const LAY = {
  port: { DW: 720, DH: 1280, stage: [360, 612], teamR: 96, memR: 158, tangleR: 250, memGrow: 1.14, cellR: 94, lightS: 1,
    cells: [[212, 478], [508, 478], [212, 696], [508, 696], [212, 914], [508, 914]],
    title2: { y: 268, size: 104 }, title3: { y: 180, size: 72 }, row: { y: 264, dx: 86, r: 27 },
    cards: [{ x: 80, y: 352, w: 560, h: 315, ly: 330 }, { x: 80, y: 736, w: 560, h: 315, ly: 714 }], labelFs: 31 },
  land: { DW: 1280, DH: 720, stage: [640, 356], teamR: 80, memR: 130, tangleR: 204, memGrow: 1.07, cellR: 72, lightS: 0.9,
    cells: [[195, 412], [373, 412], [551, 412], [729, 412], [907, 412], [1085, 412]],
    title2: { y: 188, size: 104 }, title3: { y: 112, size: 62 }, row: { y: 184, dx: 70, r: 21 },
    cards: [{ x: 100, y: 268, w: 520, h: 292, ly: 245 }, { x: 660, y: 268, w: 520, h: 292, ly: 245 }], labelFs: 28 },
};

const CARD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// a rounded live screen that starts as a disc (the cell it opens out of), with a thin border and a soft halo, in one quad
const CARD_FS = `precision highp float;
uniform sampler2D map; uniform vec2 size; uniform float margin, radius, bright, alpha, borderA, halo, fillA; uniform vec3 borderC, haloC, base; varying vec2 vUv;
float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  vec2 full = size + 2.0 * margin, p = (vUv - 0.5) * full;
  float d = sdRound(p, size * 0.5, radius);
  vec3 pic = mix(base, texture2D(map, p / size + 0.5).rgb, bright);
  float inside = clamp(0.5 - d, 0.0, 1.0);
  float ring = clamp(1.0 - abs(d + 0.8) / 1.3, 0.0, 1.0) * borderA;
  vec3 col = mix(pic, borderC, ring);
  float h = halo * exp(-max(d, 0.0) / max(margin * 0.22, 1.0)) * (1.0 - smoothstep(margin * 0.6, margin * 0.98, d));
  float ia = inside * max(fillA, ring);
  float a = max(ia, h * (1.0 - inside));
  gl_FragColor = vec4(mix(haloC, col, ia / max(a, 1e-4)), a * alpha);
}`;

export async function create({ canvas, THREE, reduced }) {
  const rnd = prng(28112026);
  // the two live cards: their own lab scenes on small off-screen canvases, in landscape
  const subs = [drawGrow, drawTeam].map((draw) => { const cv = document.createElement('canvas'); cv.width = SUB_W; cv.height = SUB_H; return { cv, ctx: cv.getContext('2d'), draw }; });

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(0, 720, 0, -1280, -10, 10);
  const disposables = [], keep = (x) => { disposables.push(x); return x; };
  const quad = keep(new THREE.PlaneGeometry(2, 2)), unit = keep(new THREE.PlaneGeometry(1, 1));
  const FS_VERT = 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const uView = { value: new THREE.Vector4(1, 0, 0, 720) }; // k (canvas px per design px), ox, oy, canvas height
  const fsMesh = (frag, uniforms, order) => { const m = new THREE.Mesh(quad, keep(new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }))); m.frustumCulled = false; m.renderOrder = order; scene.add(m); return m; };
  const P_OF = 'vec2 P(){ return vec2(gl_FragCoord.x / uView.x - uView.y, (uView.w - gl_FragCoord.y) / uView.x - uView.z); }';

  // backdrop: house navy, a warm breath behind the stage that turns muddy while the team is crowded, a vignette, grain
  const bgU = { uView, uDim: { value: new THREE.Vector2(720, 1280) }, uGlow: { value: new THREE.Vector3(360, 612, 300) }, uWarm: { value: 1 }, uMud: { value: 0 } };
  const bg = fsMesh(`precision highp float; uniform vec4 uView; uniform vec2 uDim; uniform vec3 uGlow; uniform float uWarm, uMud; ${P_OF}
    void main(){ vec2 p = P(), uv = p / uDim;
      vec3 top = vec3(0.043, 0.078, 0.125), mid = vec3(0.071, 0.149, 0.227);
      vec3 col = mix(top, mid, 0.85 * exp(-pow((uv.y - 0.5) / 0.45, 2.0)));
      float g = length(p - uGlow.xy) / max(uGlow.z, 1.0);
      col += (vec3(0.10, 0.075, 0.04) * exp(-g * g * 1.4) + vec3(0.02, 0.06, 0.065) * exp(-g * g * 0.4)) * uWarm;
      col = mix(col, col * 0.8 + vec3(0.07, 0.06, 0.045) * exp(-g * g * 0.8), uMud);
      vec2 c = (uv - 0.5) * uDim / max(uDim.x, uDim.y) * 1.5;
      col *= 1.0 - 0.42 * smoothstep(0.25, 0.85, length(c));
      col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 2.5 / 255.0;
      gl_FragColor = vec4(col, 1.0); }`, bgU, -10);
  bg.material.blending = THREE.NoBlending; bg.material.transparent = false;

  // membranes: up to seven wobbling rings (the first team's, then the six cells), each a double edge, a halo, a faint fill;
  // the strained one bulges, flickers and turns coral before it bursts
  const NM = 1 + NC;
  const mU = { uView, uT: { value: 0 }, uC: { value: Array.from({ length: NM }, () => new THREE.Vector4()) }, uM: { value: Array.from({ length: NM }, () => new THREE.Vector4()) } };
  fsMesh(`precision highp float; uniform vec4 uView; uniform float uT; uniform vec4 uC[${NM}]; uniform vec4 uM[${NM}]; ${P_OF}
    void main(){ vec2 p = P(); vec3 col = vec3(0.0);
      for (int i = 0; i < ${NM}; i++) { vec4 c = uC[i], m = uM[i]; if (c.w < 0.003 || c.z < 1.0) continue;
        vec2 d = p - c.xy; float r = length(d); if (r > c.z * 1.5 + 80.0) continue; float ang = atan(d.y, d.x), ph = m.z;
        float wob = sin(ang * 5.0 + uT * 1.1 + ph) * 1.0 + sin(ang * 9.0 - uT * 1.7 + ph * 2.0) * 0.5 + sin(ang * 3.0 + uT * 0.6 - ph) * 0.8;
        float strain = m.x * (sin(ang * 7.0 + uT * 6.0 + ph) * 0.6 + sin(ang * 13.0 - uT * 9.0) * 0.4 + sin(ang * 4.0 + uT * 3.3) * 0.7);
        float s = r - c.z + wob * (1.6 + c.z * 0.012) + strain, a = abs(s), inside = smoothstep(1.0, -2.0, s);
        float edge = exp(-a / 1.3) * 0.95 + exp(-abs(s + 6.0) / 1.1) * 0.30 + exp(-a / 10.0) * 0.20 + exp(-a / 40.0) * 0.06;
        float n = sin(p.x * 0.045 + uT * 0.3) * sin(p.y * 0.05 - uT * 0.25);
        float fill = inside * (0.028 + 0.08 * exp(s / 22.0) + 0.01 * n);
        float hot = m.y * (0.55 + 0.45 * sin(ang * 6.0 + uT * 11.0 + ph));
        vec3 ec = mix(vec3(1.0, 0.89, 0.70), vec3(${CORAL}), clamp(hot, 0.0, 1.0));
        col = max(col, (ec * edge + vec3(0.30, 0.62, 0.62) * fill * m.w) * c.w); }
      gl_FragColor = vec4(col, 1.0); }`, mU, 2);

  // threads: thin glowing segments, built on the CPU every frame
  const MAXS = 400, sPos = new Float32Array(MAXS * 4 * 3), sV = new Float32Array(MAXS * 4), sCol = new Float32Array(MAXS * 4 * 3), sA = new Float32Array(MAXS * 4), sIdx = [];
  for (let i = 0; i < MAXS; i++) { const a = i * 4; sIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const lGeo = keep(new THREE.BufferGeometry());
  [['position', sPos, 3], ['aV', sV, 1], ['aCol', sCol, 3], ['aA', sA, 1]].forEach(([n, a, s]) => lGeo.setAttribute(n, new THREE.BufferAttribute(a, s).setUsage(THREE.DynamicDrawUsage)));
  lGeo.setIndex(sIdx);
  const lines = new THREE.Mesh(lGeo, keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute float aV, aA; attribute vec3 aCol; varying float vV, vA; varying vec3 vCol; void main(){ vV = aV; vA = aA; vCol = aCol; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'precision highp float; varying float vV, vA; varying vec3 vCol; void main(){ float c = exp(-vV * vV * 9.0) * 0.9 + exp(-vV * vV * 2.2) * 0.18; gl_FragColor = vec4(vCol * c * vA, 1.0); }' })));
  lines.frustumCulled = false; lines.renderOrder = 5; scene.add(lines);

  // lights: one Points cloud for every glow (team members, specks of dust)
  const MAXP = 200, gPos = new Float32Array(MAXP * 3), gCol = new Float32Array(MAXP * 3), gA = new Float32Array(MAXP * 4);
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

  // the two cards
  const col3 = (c) => new THREE.Vector3(c[0], c[1], c[2]);
  const cards = subs.map((sub, i) => {
    const tex = keep(new THREE.CanvasTexture(sub.cv)); tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const mat = keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, vertexShader: CARD_VS, fragmentShader: CARD_FS,
      uniforms: { map: { value: tex }, size: { value: new THREE.Vector2(1, 1) }, margin: { value: 30 }, radius: { value: 8 }, bright: { value: 1 }, alpha: { value: 0 }, fillA: { value: 1 },
        borderA: { value: 0.3 }, halo: { value: 0 }, borderC: { value: col3([0.957, 0.945, 0.91]) }, haloC: { value: col3(AMBER) }, base: { value: col3([0.05, 0.1, 0.15]) } } }));
    const m = new THREE.Mesh(unit, mat); m.renderOrder = 10 + i; m.frustumCulled = false; m.visible = false; scene.add(m);
    return { m, tex, u: mat.uniforms };
  });

  // the words: drawn on a canvas laid over the picture
  const hudCv = document.createElement('canvas'), hud = hudCv.getContext('2d'), hudTex = keep(new THREE.CanvasTexture(hudCv));
  hudTex.minFilter = THREE.LinearFilter; hudTex.generateMipmaps = false; hudTex.premultiplyAlpha = true;
  const hudMesh = new THREE.Mesh(quad, keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, uniforms: { map: { value: hudTex } },
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: 'varying vec2 v; void main(){ v = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D map; varying vec2 v; void main(){ gl_FragColor = texture2D(map, v); }' })));
  hudMesh.frustumCulled = false; hudMesh.renderOrder = 20; scene.add(hudMesh);

  // the people of the story, seeded once. Light i belongs to cell floor(i / 6); the first of each six is amber.
  // Lights 0-5 are the first team (they stay together as cell 0). The rest crowd in from the edges.
  const L = [];
  for (let i = 0; i < NL; i++) {
    const c = Math.floor(i / PER), j = i % PER, ang = rnd() * Math.PI * 2, rr = Math.sqrt(0.08 + 0.92 * rnd());
    L.push({ c, j, amber: j === 0, enter: i < PER ? 0 : T_CROWD + 0.05 + 1.1 * Math.pow(rnd(), 0.8), from: rnd() * Math.PI * 2,
      tang: [Math.cos(ang) * rr, Math.sin(ang) * rr], swirl: (rnd() < 0.5 ? -1 : 1) * (0.25 + 0.4 * rnd()), jit: [rnd() * 6.28, rnd() * 6.28, 2.5 + rnd() * 3],
      split: T_SPLIT + 0.05 * c + 0.25 * rnd(), size: 0.9 + 0.2 * rnd(), tw: rnd() * 6.28 });
  }
  // threads inside a team: the amber light to each teal one, and each teal one to the next
  const TEAM = []; for (let j = 1; j < PER; j++) TEAM.push([0, j]); for (let j = 1; j < PER; j++) TEAM.push([j, j === PER - 1 ? 1 : j + 1]);
  // the tangle: many threads between lights all over the crowd, some of them failing
  const TANGLE = [];
  for (let n = 0; n < 190; n++) { let a = Math.floor(rnd() * NL), b = Math.floor(rnd() * NL); if (a === b) b = (b + 7) % NL;
    TANGLE.push({ a, b, t0: Math.max(T_CROWD + 0.3, L[a].enter + 0.5, L[b].enter + 0.5) + 0.45 * rnd(), out: T_SPLIT + 0.05 + 0.55 * rnd(), coral: n % 8 === 3, fl: rnd() * 40, cv: (rnd() - 0.5) * 0.5 }); }
  const DUST = []; for (let i = 0; i < 50; i++) DUST.push([rnd(), rnd(), rnd(), rnd()]);

  let W = 0, H = 0, lay = null, K = 1, OX = 0, OY = 0, si = 0, gi = 0;
  function seg(ax, ay, bx, by, col, a, hw) {
    if (si >= MAXS || a <= 0.003) return; let dx = bx - ax, dy = by - ay; const l = Math.hypot(dx, dy); if (l < 0.5) return; dx /= l; dy /= l;
    const nx = -dy * hw, ny = dx * hw, v = si * 4;
    const Q = [[ax + nx, ay + ny, -1], [ax - nx, ay - ny, 1], [bx + nx, by + ny, -1], [bx - nx, by - ny, 1]];
    Q.forEach((q, j) => { sPos.set([q[0], -q[1], 0], (v + j) * 3); sV[v + j] = q[2]; sCol.set(col, (v + j) * 3); sA[v + j] = a; }); si++;
  }
  // a gently curved thread drawn as a few straight pieces, up to progress p
  function curve(a, b, cv, col, al, hw, p = 1) {
    const mx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * cv, my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * cv, n = cv === 0 ? 1 : 5; let px = a[0], py = a[1];
    for (let k = 1; k <= n; k++) { const u = (k / n) * p, w = 1 - u, x = w * w * a[0] + 2 * w * u * mx + u * u * b[0], y = w * w * a[1] + 2 * w * u * my + u * u * b[1]; seg(px, py, x, y, col, al, hw); px = x; py = y; }
  }
  function glow(x, y, col, a, size, core, flare = 0) { if (gi >= MAXP || a <= 0.003) return; size *= K; core *= K; gPos.set([x, -y, 0], gi * 3); gCol.set(col, gi * 3); gA.set([a, size, Math.pow(size / (2 * Math.max(1, core)), 2), flare], gi * 4); gi++; }

  // a cell's centre and radius at time t (phase 2 grid, then the row under the title, or holding still while it opens)
  function cellAt(c, t) {
    const C = lay.cells[c], k3 = sstep((t - T_UP - 0.05 * ROW_CELLS.indexOf(c)) / 0.9), ri = ROW_CELLS.indexOf(c);
    const R = lay.cellR * (0.94 + 0.04 * ((c * 37) % 3));
    if (ri < 0) return { x: C[0], y: C[1], R, k3: 0 };
    const rx = lay.DW / 2 + (ri - 1.5) * lay.row.dx, ry = lay.row.y;
    return { x: lerp(C[0], rx, k3), y: lerp(C[1], ry, k3), R: lerp(R, lay.row.r, k3), k3 };
  }
  const cardGrow = (i, t) => sstep((t - CARD_T[i]) / GROW);

  function drawWords(t) {
    const ctx = hud; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.setTransform(K, 0, 0, K, OX * K, OY * K);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    // the title: arrives large and calm as the cells form, then rises and shrinks to sit over the agenda
    const a = sstep((t - T_TITLE) / 0.8), up = sstep((t - T_UP) / 0.9);
    if (a > 0) {
      const t2 = lay.title2, t3 = lay.title3, maxW = lay.DW * 0.84;
      let size = lerp(t2.size, t3.size, up); const sp = lerp(0.03, 0.01, a); ctx.font = `700 ${size}px ${FONT}`; ctx.letterSpacing = `${sp * size}px`;
      const tw = ctx.measureText(TITLE).width; if (tw > maxW) size *= maxW / tw;
      const y = lerp(t2.y, t3.y, up) + (1 - a) * 16;
      ctx.font = `700 ${size}px ${FONT}`; ctx.letterSpacing = `${sp * size}px`;
      ctx.globalAlpha = a; ctx.shadowColor = 'rgba(255,200,87,0.45)'; ctx.shadowBlur = size * 0.35;
      const wA = ctx.measureText('Agile ').width, wC = ctx.measureText('Cells').width, x0 = lay.DW / 2 - (wA + wC) / 2;
      ctx.textAlign = 'left'; ctx.fillStyle = '#f4f1e8'; ctx.fillText('Agile ', x0, y); ctx.fillStyle = '#ffc857'; ctx.fillText('Cells', x0 + wA, y);
      ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(11,20,32,0.9)'; ctx.shadowBlur = 6; ctx.fillStyle = '#f4f1e8'; ctx.fillText('Agile ', x0, y); ctx.fillStyle = '#ffc857'; ctx.fillText('Cells', x0 + wA, y);
      ctx.shadowBlur = 0; ctx.letterSpacing = '0px';
    }
    // the agenda labels, each just after its card opens, with a small light to mark it
    LABELS.forEach((txt, i) => {
      const r = lay.cards[i], k = sstep((t - CARD_T[i] - GROW * 0.6) / 0.45); if (k <= 0) return;
      let fs = lay.labelFs; ctx.font = `600 ${fs}px ${FONT}`; const room = r.w - 28; let w = ctx.measureText(txt).width; if (w > room) { fs *= room / w; ctx.font = `600 ${fs}px ${FONT}`; }
      ctx.globalAlpha = k; ctx.textAlign = 'left'; ctx.fillStyle = '#f4f1e8'; ctx.shadowColor = 'rgba(11,20,32,0.95)'; ctx.shadowBlur = 8;
      ctx.fillText(txt, r.x + 24 + (1 - k) * 14, r.ly); ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1; hudTex.needsUpdate = true;
  }

  function render(time, w, h) {
    if (w !== W || h !== H) {
      W = w; H = h; lay = h > w ? LAY.port : LAY.land; renderer.setSize(w, h, false); hudCv.width = w; hudCv.height = h;
      K = Math.min(w / lay.DW, h / lay.DH); OX = (w / K - lay.DW) / 2; OY = (h / K - lay.DH) / 2;
      camera.left = -OX; camera.right = lay.DW + OX; camera.top = OY; camera.bottom = -(lay.DH + OY); camera.updateProjectionMatrix();
      uView.value.set(K, OX, OY, h); bgU.uDim.value.set(lay.DW, lay.DH);
    }
    const t = reduced ? STILL_T : clamp(time, 0, meta.seconds);
    si = 0; gi = 0;
    const S = lay.stage, ls = lay.lightS;
    const crowd = sstep((t - T_CROWD) / 1.4), mud = sstep((t - 2.7) / 1.1) * (1 - sstep((t - T_SPLIT) / 0.9));
    const strain = sstep((t - 2.6) / 1.6) * (1 - sstep((t - 4.4) / 0.3));
    const burst = sstep((t - 4.42) / 0.35);
    // a small shudder of the whole crowd at the worst moment
    const shake = strain * 2.2, shx = Math.sin(t * 37) * shake, shy = Math.cos(t * 29) * shake;

    // cards: how far each has opened (the lights of its cell fade as it opens)
    const g = [cardGrow(0, t), cardGrow(1, t)];
    const cellFade = (c) => { const i = CARD_CELL.indexOf(c); return i < 0 ? 1 : 1 - sstep(g[i] / 0.45); };

    // where each light is
    const pos = [], col = [], alp = [], siz = [];
    for (let i = 0; i < NL; i++) {
      const l = L[i], C = cellAt(l.c, t);
      // the first team: a tidy ring round its amber light, turning slowly
      const tr = l.j === 0 ? 0 : lay.teamR, ta = (l.j - 1) / (PER - 1) * Math.PI * 2 - Math.PI / 2 + t * 0.12;
      const team = [S[0] + Math.cos(ta) * tr, S[1] + Math.sin(ta) * tr];
      // the crowd: a churning disc, each light shoved about
      const sw = l.swirl * (t - T_CROWD) * 0.35, cs = Math.cos(sw), sn = Math.sin(sw), ox = l.tang[0] * cs - l.tang[1] * sn, oy = l.tang[0] * sn + l.tang[1] * cs;
      const jm = 3 + 9 * strain;
      const tang = [S[0] + ox * lay.tangleR + Math.sin(t * l.jit[2] + l.jit[0]) * jm + shx, S[1] + oy * lay.tangleR * 0.95 + Math.sin(t * l.jit[2] * 1.3 + l.jit[1]) * jm + shy];
      // in a cell: the same tidy ring, smaller, turning
      const cr = l.j === 0 ? 0 : C.R * 0.56, ca = (l.j - 1) / (PER - 1) * Math.PI * 2 - Math.PI / 2 + t * 0.12 + l.c * 0.7;
      const cell = [C.x + Math.cos(ca) * cr, C.y + Math.sin(ca) * cr];
      let p, a = 1;
      if (i < PER) { const k1 = sstep((t - 2.5) / 1.3); p = [lerp(team[0], tang[0], k1), lerp(team[1], tang[1], k1)]; }
      else {
        const ke = sstep((t - l.enter) / 0.9), far = Math.max(lay.DW, lay.DH) * 0.62;
        const from = [S[0] + Math.cos(l.from) * far, S[1] + Math.sin(l.from) * far];
        p = [lerp(from[0], tang[0], ke), lerp(from[1], tang[1], ke)]; a = sstep((t - l.enter) / 0.4);
      }
      const k2 = sstep((t - l.split) / 0.85);
      p = [lerp(p[0], cell[0], k2), lerp(p[1], cell[1], k2)];
      pos.push(p);
      const base = l.amber ? AMBER : TEAL;
      col.push(mix3(base, MUD, mud * 0.75));
      alp.push(a * (1 - 0.3 * mud) * cellFade(l.c));
      // big and warm when few, smaller in the crowd, smaller still in the row of cells
      const sz = lerp(lerp(l.amber ? 40 : 30, l.amber ? 22 : 17, crowd), l.amber ? 25 : 19, k2) * lerp(1, 0.5, C.k3);
      siz.push(sz * ls * l.size);
    }

    // threads of the first team: clean, then lost in the tangle (stretched and dimmed), then clean again in cell 0
    const k2c = (c) => sstep((t - (T_SPLIT + 0.35 + 0.08 * c)) / 0.7);
    for (let c = 0; c < NC; c++) {
      const b = c * PER, f = cellFade(c), draw = c === 0 ? 1 : k2c(c), C = cellAt(c, t);
      const lost = c === 0 ? 1 - 0.8 * sstep((t - 2.4) / 0.9) * (1 - k2c(0)) : 1;
      if (draw <= 0) continue;
      const hw = lerp(1.9, 1.2, C.k3) * ls;
      for (const [u, v] of TEAM) {
        const amberLink = u === 0, cl = mix3(amberLink ? [1.0, 0.86, 0.6] : TEAL, MUD, c === 0 ? mud * 0.7 : 0);
        curve(pos[b + u], pos[b + v], 0, cl, (amberLink ? 0.75 : 0.5) * lost * f * draw, hw, draw);
      }
    }
    // work flowing in a healthy team: small beads of light running from the amber light out to each teal one
    for (let c = 0; c < NC; c++) {
      const b = c * PER, C = cellAt(c, t);
      const a = (c === 0 ? 1 - sstep((t - 2.3) / 0.6) : 0) + k2c(c) * sstep((t - T_SPLIT - 1.1 - 0.1 * c) / 0.5) * 0.8;
      if (a <= 0.01) continue;
      for (let j = 1; j < PER; j++) {
        const u = (t * 0.55 + j * 0.37 + c * 0.21) % 1, A = pos[b], B = pos[b + j], out = Math.floor(t * 0.55 + j * 0.37 + c * 0.21) % 2 === 0;
        const f = out ? u : 1 - u;
        glow(lerp(A[0], B[0], f), lerp(A[1], B[1], f), [1.0, 0.9, 0.7], a * Math.sin(u * Math.PI) * 0.9 * cellFade(c), 11 * ls * lerp(1, 0.55, C.k3), 1.6);
      }
    }
    // faint links between neighbouring cells: small teams, loosely joined
    {
      const k = sstep((t - 5.8) / 0.8);
      if (k > 0) {
        const pairs = lay.DW > lay.DH ? [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] : [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5]];
        for (const [u, v] of pairs) {
          const ru = ROW_CELLS.includes(u), rv = ROW_CELLS.includes(v), f = Math.min(cellFade(u), cellFade(v));
          if (!(ru && rv) && f <= 0) continue;
          const A = pos[u * PER], B = pos[v * PER], cu = cellAt(u, t), cv = cellAt(v, t), dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1;
          const a0 = [A[0] + dx / d * cu.R * 1.08, A[1] + dy / d * cu.R * 1.08], b0 = [B[0] - dx / d * cv.R * 1.08, B[1] - dy / d * cv.R * 1.08];
          if (Math.hypot(b0[0] - a0[0], b0[1] - a0[1]) < 4) continue;
          curve(a0, b0, 0, AMBER, 0.28 * k * (ru && rv ? 1 : f), 1.1 * ls, k);
        }
        // the row of four: join them in order
        const up = sstep((t - T_UP - 0.6) / 0.6);
        if (up > 0) for (let q = 0; q < ROW_CELLS.length - 1; q++) {
          const A = cellAt(ROW_CELLS[q], t), B = cellAt(ROW_CELLS[q + 1], t);
          seg(A.x + A.R * 1.15, A.y, B.x - B.R * 1.15, B.y, AMBER, 0.35 * up, 1.0 * ls);
        }
      }
    }
    // the tangle: threads spring up all over the crowd, some failing in coral, then snap away as the cells form
    for (const e of TANGLE) {
      const p = sstep((t - e.t0) / 0.4); if (p <= 0) continue;
      const out = sstep((t - e.out) / 0.4); if (out >= 1) continue;
      let cl = mix3([0.55, 0.66, 0.62], MUD, 0.5), a = 0.42 * (1 - out);
      if (e.coral && t > e.t0 + 0.6) {
        const on = Math.sin(t * 19 + e.fl) + Math.sin(t * 31 + e.fl * 1.7) > 0.2 ? 1 : 0.25;
        cl = mix3(cl, CORAL, sstep((t - e.t0 - 0.6) / 0.3)); a = (0.45 + 0.55 * on) * (1 - out);
      }
      // as it snaps, it shrinks towards its first end
      const A = pos[e.a], B = pos[e.b], bb = [lerp(B[0], A[0], out), lerp(B[1], A[1], out)];
      curve(A, bb, e.cv, cl, a, (e.coral ? 2.3 : 1.15) * ls, p);
    }

    // lights
    for (let i = 0; i < NL; i++) {
      const l = L[i], tw = 1 + 0.06 * Math.sin(t * 2.1 + l.tw);
      glow(pos[i][0], pos[i][1], col[i], alp[i] * tw, siz[i], siz[i] * (l.amber ? 0.16 : 0.13), l.amber ? 0.35 * (1 - mud) : 0);
    }
    for (const [x, y, z, ph] of DUST) {
      const dx = (x + Math.sin(t * 0.25 + ph * 6.28) * 0.01) * lay.DW, dy = ((y - t * (0.004 + 0.008 * z)) % 1 + 1) % 1 * lay.DH;
      glow(dx, dy, AMBER, 0.12 + 0.12 * z, 7 + 6 * z, 1.5);
    }

    // membranes
    const mC = mU.uC.value, mM = mU.uM.value; mU.uT.value = t;
    {
      // the first team's: tidy, then stretched round the crowd, straining, flushed with coral, and bursting
      const R = lerp(lay.memR, lay.tangleR * lay.memGrow, sstep((t - 2.3) / 1.6)) + burst * 60;
      const flick = 1 - 0.35 * strain * (Math.sin(t * 23) * Math.sin(t * 13.7) > 0.1 ? 1 : 0);
      mC[0].set(S[0] + shx, S[1] + shy, R, (1 - 0.35 * strain) * flick * (1 - burst) * sstep(t / 0.5 + 0.6));
      mM[0].set(strain * 14, sstep((t - 3.6) / 0.7) * 0.85, 0.0, 1 - 0.6 * mud);
    }
    for (let c = 0; c < NC; c++) {
      const C = cellAt(c, t), k = sstep((t - (T_SPLIT + 0.42 + 0.09 * c)) / 0.8);
      mC[c + 1].set(C.x, C.y, C.R * 1.02 * (k > 0 ? backOut(k) : 0), k * cellFade(c) * lerp(1, 0.85, C.k3));
      mM[c + 1].set(0, 0, c * 1.7, 1);
    }

    // background warmth follows the action
    bgU.uGlow.value.set(S[0], S[1], lerp(lay.teamR * 3.2, lay.tangleR * 1.6, crowd));
    bgU.uWarm.value = lerp(1, 0.55, sstep((t - T_SPLIT) / 1.5)); bgU.uMud.value = mud;

    // the cards open out of the two middle cells, from a disc into a rounded live screen
    for (let i = 0; i < 2; i++) {
      const cd = cards[i], k = g[i];
      if (k <= 0) { cd.m.visible = false; continue; }
      const C = cellAt(CARD_CELL[i], t), R = lay.cards[i], e = sstep(k);
      const r = { x: lerp(C.x - C.R, R.x, e), y: lerp(C.y - C.R, R.y, e), w: lerp(2 * C.R, R.w, e), h: lerp(2 * C.R, R.h, e) };
      const m = 34, land = Math.exp(-Math.max(0, t - CARD_T[i] - GROW) * 2.2);
      cd.m.visible = true; cd.m.position.set(r.x + r.w / 2, -(r.y + r.h / 2), 0); cd.m.scale.set(r.w + 2 * m, r.h + 2 * m, 1);
      cd.u.size.value.set(r.w, r.h); cd.u.margin.value = m; cd.u.radius.value = lerp(Math.min(r.w, r.h) / 2, Math.min(r.w, r.h) * 0.055, sstep(k * 1.3));
      cd.u.alpha.value = sstep(k * 6); cd.u.fillA.value = sstep((k - 0.12) / 0.3); cd.u.bright.value = sstep((k - 0.22) / 0.5);
      const next = i === 0 ? sstep((t - 9.2) / 0.6) : 0;
      cd.u.borderA.value = lerp(0.9, 0.35, e) + 0.5 * next; cd.u.halo.value = lerp(0.5, 0.12, e) + 0.35 * land * e + 0.22 * next;
      cd.u.borderC.value.set(...mix3([0.957, 0.945, 0.91], AMBER, next));
      const sub = subs[i]; sub.draw(sub.ctx, SUB_W, SUB_H, Math.max(0, t - CARD_T[i] - GROW * 0.25)); cd.tex.needsUpdate = true;
    }

    lGeo.setDrawRange(0, si * 6); gGeo.setDrawRange(0, gi);
    for (const n of ['position', 'aV', 'aCol', 'aA']) lGeo.attributes[n].needsUpdate = true;
    for (const n of ['position', 'aCol', 'aA']) gGeo.attributes[n].needsUpdate = true;
    drawWords(t);
    renderer.render(scene, camera);
  }
  function dispose() { for (const d of disposables) d.dispose(); renderer.dispose(); }
  return { render, dispose };
}
