// Currents: time as a dark landscape seen from above and travelled forward. A thin spring rises in the 1930s and runs in
// small repeating loops, a second thread joins it in 1957, a marker stands at 1970 at the head of a great one-way
// staircase, and the looping thread carries on down it, dim but unbroken. In the 1990s five currents arrive one after
// another, each from its own direction and each with its own character, run side by side and begin to bend toward one
// another, toward a mountain where nothing has met yet.
// A lab scene component (see ../harness.js for the contract). render(t) is a pure function of t: every position is
// computed from t, all randomness is seeded once in create. Apache-2.0. By c.productions.
export const meta = {
  id: 'currents',
  title: 'Currents: it did not begin in 2001',
  beat: 'Working in short cycles was already an old, thin current when the 1990s arrived, and the five lightweight methods were separate streams bending toward one another before anyone gave them a shared name.',
  seconds: 34,
  sources: [
    { title: 'Iterative and Incremental Development: A Brief History (Larman and Basili)', url: 'https://www.craiglarman.com/wiki/downloads/misc/history-of-iterative-larman-and-basili-ieee-computer.pdf' },
    { title: 'The Scrum Guide', url: 'https://scrumguides.org/scrum-guide.html' },
    { title: 'C3 (Martin Fowler)', url: 'https://martinfowler.com/bliki/C3.html' },
    { title: 'History: The Agile Manifesto', url: 'https://agilemanifesto.org/history.html' },
  ],
};

const TAU = Math.PI * 2, INK = '#f4f1e8', STILL_T = 32.6;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const lerp = (a, b, k) => a + (b - a) * k;
function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(ix, iz) { let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz); return lerp(lerp(hash2(ix, iz), hash2(ix + 1, iz), ux), lerp(hash2(ix, iz + 1), hash2(ix + 1, iz + 1), ux), uz); }
function ridged(x, z) { let s = 0, a = 0.5, f = 1, n = 0; for (let o = 0; o < 5; o++) { const v = 1 - Math.abs(vnoise(x * f + 17.3 * o, z * f - 9.1 * o) * 2 - 1); s += v * v * a; n += a; a *= 0.5; f *= 2.03; } return s / n; }
// A smooth curve through timed keys [[t, v], ...]; it keeps moving through each key instead of stopping at it.
const track = (keys) => (t) => {
  const n = keys.length; if (t <= keys[0][0]) return keys[0][1]; if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0; while (t > keys[i + 1][0]) i++;
  const m = (j) => { const a = Math.max(0, j - 1), b = Math.min(n - 1, j + 1); return (keys[b][1] - keys[a][1]) / (keys[b][0] - keys[a][0]); };
  const [t0, v0] = keys[i], [t1, v1] = keys[i + 1], h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m(i) * h + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m(i + 1) * h;
};

// ---- the map of time: d is distance travelled forward (world z = -d). The 1990s are drawn wider than the decades before.
const D = (yr) => (yr <= 1970 ? (yr - 1930) * 3 : yr <= 1990 ? 120 + (yr - 1970) * 2.5 : 170 + (yr - 1990) * 9);
const DECADES = [1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000].map(D);
// After 1970 the land becomes a staircase that only goes down (the cascade of the scene that follows this one in time).
const STEPS = 8, STEP0 = 126, TREAD = 6, STEP_H = 1.0, FLOOR = -STEPS * STEP_H;
const baseY = (d) => { let y = 0; for (let k = 0; k < STEPS; k++) y -= STEP_H * ss(-0.16, 0.16, d - (STEP0 + k * TREAD)); return y; };
const rampY = (d) => FLOOR * clamp((d - STEP0) / ((STEPS - 1) * TREAD));
const xBase = (d) => lerp(2.2 * Math.sin(d * 0.04) + 1.2 * Math.sin(d * 0.011 + 1), -7 + 0.5 * Math.sin(d * 0.05), ss(168, 204, d));
const LOOP_R = 1.1, LOOP_P = 4.5;

// The five currents of the 1990s. kind picks the character drawn by the ribbon shader.
const METHODS = [
  { name: 'DSDM', year: '1994', col: '#5fd0c5', kind: 1, at: 20.0, entry: 4, stop: 240, core: 0.2, half: 0.34, bright: 1.0,
    pts: [[-98, 186], [-62, 196], [-38, 203], [-22, 209], [-15, 216], [-14, 229], [-13.5, 242], [-11.5, 252], [-7.5, 262], [-3.5, 274]], end: 0.92 },
  { name: 'Scrum', year: '1995', col: '#ffc857', kind: 2, at: 22.5, entry: 4, stop: 237, core: 0.13, half: 0.3, bright: 1.1,
    pts: [[98, 198], [62, 207], [38, 213], [22, 219], [14.5, 226], [13.5, 237], [13, 247], [11, 255], [7.5, 264], [3.5, 275]], end: 0.915 },
  { name: 'Extreme Programming', year: '1996', col: '#f4f1e8', kind: 3, at: 25.0, entry: -1, stop: 229, core: 0.075, half: 0.42, bright: 1.0,
    pts: [[0.5, 225], [0.8, 236], [1, 247], [0.9, 256], [0.5, 265], [0.2, 275]], end: 0.86 },
  { name: 'Crystal', year: '1998', col: '#9fc9f2', kind: 4, at: 27.4, entry: 3, stop: 257, core: 0.11, half: 0.3, bright: 1.15,
    pts: [[100, 236], [64, 240], [41, 243], [30, 246], [26, 251], [22.5, 257], [16, 265], [8, 275]], end: 0.915 },
  { name: 'Feature-Driven Development', year: '1999', col: '#c4e39a', kind: 5, at: 29.6, entry: 3, stop: 261, core: 0.19, half: 0.42, bright: 1.7,
    pts: [[-100, 247], [-64, 249], [-41, 251], [-30, 253], [-26, 257], [-21.5, 262], [-14.5, 269], [-7, 277]], end: 0.9 },
];
const YEARS = [{ text: '1930s', at: 1.7 }, { text: '1957', at: 11.8 }, { text: '1970', at: 14.4 }];

const GL_COMMON = `
const vec3 AMBER = vec3(1.0, 0.784, 0.341), TEAL = vec3(0.373, 0.816, 0.773), INK = vec3(0.957, 0.945, 0.91);
vec3 fogCol(vec3 dir){ return mix(vec3(0.075, 0.155, 0.235), vec3(0.043, 0.078, 0.125), clamp(-dir.y * 2.2 + 0.25, 0.0, 1.0)); }
float fogAmt(float dist){ return 1.0 - exp(-pow(dist * 0.0068, 1.7)); }
`;

export async function create({ canvas, THREE, reduced }) {
  const V3 = THREE.Vector3, rnd = prng(19302001);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x0b1420, 1); renderer.autoClear = false;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 1400);
  const overlay = new THREE.Scene(), ortho = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
  const trash = [], keep = (x) => { trash.push(x); return x; };

  // ---- paths: a base line, resampled evenly, then decorated (loops, weave, zigzag) sideways and along itself ----
  function makePath(dense, spacing, deco) {
    const n = dense.length, cum = new Float32Array(n); for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]);
    const len = cum[n - 1], M = Math.ceil(len / spacing) + 1, bx = new Float32Array(M), bd = new Float32Array(M);
    for (let i = 0, j = 0; i < M; i++) { const l = (i / (M - 1)) * len; while (j < n - 2 && cum[j + 1] < l) j++; const u = clamp((l - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j])); bx[i] = lerp(dense[j][0], dense[j + 1][0], u); bd[i] = lerp(dense[j][1], dense[j + 1][1], u); }
    const X = new Float32Array(M), Dd = new Float32Array(M), Y = new Float32Array(M), NX = new Float32Array(M), ND = new Float32Array(M), LEN = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      const a = Math.max(0, i - 1), b = Math.min(M - 1, i + 1); let tx = bx[b] - bx[a], td = bd[b] - bd[a]; const tl = Math.hypot(tx, td) || 1; tx /= tl; td /= tl;
      const [da, db] = deco ? deco((i / (M - 1)) * len, bd[i]) : [0, 0];
      X[i] = bx[i] + td * da + tx * db; Dd[i] = bd[i] - tx * da + td * db; Y[i] = baseY(Dd[i]) + 0.07;
    }
    for (let i = 0; i < M; i++) { const a = Math.max(0, i - 1), b = Math.min(M - 1, i + 1); const tx = X[b] - X[a], td = Dd[b] - Dd[a], tl = Math.hypot(tx, td) || 1; NX[i] = td / tl; ND[i] = -tx / tl; if (i) LEN[i] = LEN[i - 1] + Math.hypot(X[i] - X[i - 1], Dd[i] - Dd[i - 1]); }
    const sOfD = (d) => { let lo = 0, hi = M - 1; if (d <= bd[0]) return 0; if (d >= bd[hi]) return 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (bd[mid] < d) lo = mid; else hi = mid; } return (lo + (d - bd[lo]) / Math.max(1e-6, bd[hi] - bd[lo])) / (M - 1); };
    const at = (s, out, lat = 0) => { const f = clamp(s) * (M - 1), i = Math.min(M - 2, Math.floor(f)), u = f - i; const nx = lerp(NX[i], NX[i + 1], u), nd = lerp(ND[i], ND[i + 1], u); return out.set(lerp(X[i], X[i + 1], u) + nx * lat, lerp(Y[i], Y[i + 1], u), -(lerp(Dd[i], Dd[i + 1], u) + nd * lat)); };
    return { M, len, X, Dd, Y, NX, ND, LEN, sOfD, at };
  }
  const spline = (pts, n = 240) => new THREE.CatmullRomCurve3(pts.map(([x, d]) => new V3(x, 0, d)), false, 'centripetal').getPoints(n).map((p) => [p.x, p.z]);
  const fn = (d0, d1, f, step = 0.5) => { const out = []; for (let d = d0; d <= d1 + 1e-6; d += step) out.push([f(d), d]); return out; };
  const loopEnv = (d) => ss(5, 12, d) * lerp(1, 0.62, ss(118, 128, d));
  const loops = (R, P, env) => (l, d) => { const th = (TAU * l) / P, e = env(d, l); return [R * (1 - Math.cos(th)) * e, -R * Math.sin(th) * e]; };

  const OLD_END = 262;
  const thread1 = makePath(fn(0, OLD_END, xBase), 0.22, loops(LOOP_R, LOOP_P, loopEnv));
  const JOIN = D(1957);
  const thread2 = makePath([...spline([[52, 54], [33, 61], [19, 68], [9.5, 75], [xBase(JOIN + 3) + LOOP_R, JOIN + 3], [xBase(JOIN + 9) + LOOP_R, JOIN + 9]], 120), ...fn(JOIN + 9.5, OLD_END, (d) => xBase(d) + LOOP_R)], 0.3,
    (l, d) => [0.95 * Math.sin(d * 0.7) * ss(JOIN + 2, JOIN + 10, d), 0]);
  const tri = (u) => 4 * Math.abs(u - Math.floor(u) - 0.5) - 1, ZIG = 3.4;
  const decos = [null, loops(1.9, 7.5, (d) => ss(222, 230, d) * (1 - ss(262, 272, d))), null, (l) => [0.85 * tri(l / ZIG) * ss(0, 8, l), 0], null];
  const currents = [
    { path: thread1, col: '#ffc857', kind: 0, core: 0.085, half: 0.24, bright: 1.0, old: 1, n: 900 },
    { path: thread2, col: '#5fd0c5', kind: 0, core: 0.07, half: 0.22, bright: 0.95, old: 1, n: 520 },
    ...METHODS.map((m, i) => ({ ...m, path: makePath(spline(m.pts), i === 1 ? 0.22 : 0.3, decos[i]), old: 0, n: 720 })),
  ];
  for (const c of currents) c.color = new THREE.Color(c.col);

  // ---- terrain: hills at the sides, valleys carved where a current runs, the staircase, and a far mountain ----
  const FX0 = -120, FX1 = 120, FD0 = -60, FD1 = 440, FW = FX1 - FX0 + 1, FH = FD1 - FD0 + 1, field = new Float32Array(FW * FH).fill(99);
  for (const c of currents) { const p = c.path; for (let i = 0; i < p.M; i += 2) { const cx = Math.round(p.X[i] - FX0), cd = Math.round(p.Dd[i] - FD0); for (let dz = -12; dz <= 12; dz++) for (let dx = -12; dx <= 12; dx++) { const gx = cx + dx, gd = cd + dz; if (gx < 0 || gd < 0 || gx >= FW || gd >= FH) continue; const dist = Math.hypot(gx + FX0 - p.X[i], gd + FD0 - p.Dd[i]), k = gd * FW + gx; if (dist < field[k]) field[k] = dist; } } }
  const distTo = (x, d) => { const fx = clamp(x - FX0, 0, FW - 1.001), fd = clamp(d - FD0, 0, FH - 1.001), ix = Math.floor(fx), id = Math.floor(fd), ux = fx - ix, ud = fd - id, k = id * FW + ix; return lerp(lerp(field[k], field[k + 1], ux), lerp(field[k + FW], field[k + FW + 1], ux), ud); };
  const relief = (x, d) => {
    const wb = lerp(13, 36, ss(150, 200, d)), side = Math.max(ss(wb, wb + 34, Math.abs(x)), ss(288, 325, d));
    const hills = Math.pow(ridged(x * 0.028 + 3.1, d * 0.028 + 1.7), 1.4) * 30 * side + (vnoise(x * 0.07 + 40, d * 0.07 + 11) - 0.35) * 1.6 * ss(5, 16, Math.abs(x - xBase(d)));
    const peak = 46 * Math.exp(-(((x - 4) / 46) ** 2) - ((d - 352) / 42) ** 2) * (0.5 + 0.5 * ridged(x * 0.03 + 9, d * 0.03 + 5)) * ss(284, 304, d);
    return Math.max(0, hills) * ss(3.2, 11, distTo(x, d)) + peak;
  };
  {
    const rows = []; for (let d = FD0 + 2; d <= FD1 - 2; d += 1.5) rows.push(d); for (let k = 0; k < STEPS; k++) rows.push(STEP0 + k * TREAD - 0.17, STEP0 + k * TREAD + 0.17); rows.sort((a, b) => a - b);
    const NXV = 151, nr = rows.length, pos = new Float32Array(NXV * nr * 3), rel = new Float32Array(NXV * nr), idx = [];
    for (let r = 0; r < nr; r++) for (let i = 0; i < NXV; i++) { const x = lerp(FX0 + 2, FX1 - 2, i / (NXV - 1)), d = rows[r], h = relief(x, d), k = r * NXV + i; pos.set([x, baseY(d) + h, -d], k * 3); rel[k] = h; }
    for (let r = 0; r < nr - 1; r++) for (let i = 0; i < NXV - 1; i++) { const a = r * NXV + i, b = a + 1, c = a + NXV, e = c + 1; idx.push(a, b, c, b, e, c); }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aRel', new THREE.BufferAttribute(rel, 1)); g.setIndex(idx); g.computeVertexNormals();
    var groundU = { uCam: { value: new V3() }, uH: { value: Array.from({ length: 7 }, () => new THREE.Vector4()) }, uHc: { value: currents.map((c) => new V3(c.color.r, c.color.g, c.color.b)) }, uDec: { value: DECADES }, uDawn: { value: 0 } };
    const ground = new THREE.Mesh(g, keep(new THREE.ShaderMaterial({ uniforms: groundU,
      vertexShader: 'attribute float aRel; varying vec3 vW; varying vec3 vN; varying float vRel; void main(){ vW = position; vN = normal; vRel = aRel; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }',
      fragmentShader: `precision highp float;
        ${GL_COMMON}
        uniform vec3 uCam; uniform vec4 uH[7]; uniform vec3 uHc[7]; uniform float uDec[8]; uniform float uDawn;
        varying vec3 vW; varying vec3 vN; varying float vRel;
        void main(){
          vec3 n = normalize(vN), V = uCam - vW; float dist = length(V), d = -vW.z;
          vec3 moon = normalize(vec3(-0.6, 0.42, -0.35)); float diff = max(dot(n, moon), 0.0);
          vec3 alb = mix(vec3(0.088, 0.148, 0.2), vec3(0.30, 0.41, 0.52), smoothstep(0.3, 24.0, vRel));
          vec3 col = alb * (vec3(0.13, 0.155, 0.19) + vec3(0.58, 0.66, 0.74) * diff * 0.9 + vec3(0.04, 0.06, 0.08) * n.y);
          float near = exp(-dist * 0.012);
          float c = vRel * 0.55, cl = 1.0 - smoothstep(0.0, fwidth(c) * 1.3, abs(fract(c) - 0.5));
          col += TEAL * 0.15 * cl * smoothstep(0.25, 1.2, vRel) * near;
          float flat_ = 1.0 - smoothstep(0.0, 1.5, vRel), dl = 0.0;
          for (int i = 0; i < 8; i++) dl += 1.0 - smoothstep(0.02, 0.02 + fwidth(d) * 1.2, abs(d - uDec[i]));
          col += INK * 0.075 * dl * flat_ * near;
          float yr = d < 120.0 ? d / 3.0 : d < 170.0 ? 40.0 + (d - 120.0) / 2.5 : 60.0 + (d - 170.0) / 9.0;
          col += INK * 0.022 * (1.0 - smoothstep(0.0, fwidth(yr) * 1.2 + 0.004, abs(fract(yr + 0.5) - 0.5))) * (1.0 - smoothstep(0.0, 6.0, vRel)) * near * step(d, 300.0);
          col *= 1.45;
          float k = (d - ${STEP0.toFixed(1)}) / ${TREAD.toFixed(1)}, on = step(-1.0, k) * step(k, ${(STEPS - 1).toFixed(1)} + 0.05);
          float lip = smoothstep(0.86, 0.975, fract(k)) * (1.0 - smoothstep(0.975, 1.0, fract(k))) * on * flat_;
          col += TEAL * (0.42 * lip + 0.10 * pow(fract(k), 2.0) * on * flat_) * near;
          col += TEAL * 0.16 * on * flat_ * smoothstep(0.5, 0.9, abs(n.z)) * near;
          for (int i = 0; i < 7; i++) { vec3 L = uH[i].xyz - vW; float a = 1.0 / (1.0 + dot(L, L) * 0.03); col += uHc[i] * uH[i].w * a * a * alb * 5.0 * (0.35 + 0.65 * max(dot(n, normalize(L)), 0.0)); }
          col += AMBER * uDawn * 0.05 * smoothstep(285.0, 340.0, d) * max(n.z, 0.0);
          vec3 dir = normalize(-V); gl_FragColor = vec4(mix(col, fogCol(dir), fogAmt(dist)), 1.0);
        }` })));
    ground.frustumCulled = false; scene.add(ground);
  }

  // ---- sky: the film's night gradient, a few stars, and a warmth behind the far mountain that grows as the currents bend ----
  const sky = new THREE.Group(); scene.add(sky);
  const skyU = { uDawn: { value: 0 } };
  { const m = new THREE.Mesh(keep(new THREE.SphereGeometry(1000, 24, 16)), keep(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, uniforms: skyU,
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `precision highp float; varying vec3 vD; uniform float uDawn;
        void main(){ vec3 d = normalize(vD); float y = clamp(d.y, -0.2, 1.0);
          vec3 col = mix(vec3(0.075, 0.155, 0.235), vec3(0.035, 0.065, 0.11), pow(clamp(y * 1.6 + 0.1, 0.0, 1.0), 0.6));
          col += vec3(0.10, 0.34, 0.33) * exp(-pow((y - 0.02) / 0.10, 2.0)) * 0.16;
          col += vec3(1.0, 0.784, 0.341) * uDawn * 0.30 * exp(-pow((y - 0.03) / 0.09, 2.0)) * exp(-pow(d.x / 0.30, 2.0)) * step(d.z, 0.0);
          gl_FragColor = vec4(col, 1.0); }` })));
    m.renderOrder = -10; sky.add(m);
    const n = 420, pos = new Float32Array(n * 3), aux = new Float32Array(n);
    for (let i = 0; i < n; i++) { const a = rnd() * TAU, y = 0.04 + rnd() * 0.9, r = Math.sqrt(1 - y * y); pos.set([Math.cos(a) * r * 900, y * 900, Math.sin(a) * r * 900], i * 3); aux[i] = 0.7 + rnd() * rnd() * 1.8; }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aAux', new THREE.BufferAttribute(aux, 1));
    const stars = new THREE.Points(g, keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float aAux; varying float vA; void main(){ vA = aAux; gl_PointSize = 1.0 + aAux; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'precision highp float; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.8, 0.88, 0.96) * smoothstep(0.5, 0.1, r) * 0.32 * vA, 1.0); }' })));
    stars.renderOrder = -9; stars.frustumCulled = false; sky.add(stars); }

  // ---- the currents: one ribbon each. The shader draws the core line in the current's own character, a soft spill of
  // light on the land around it, and nothing beyond the head, which is where the current has got to at time t. ----
  const ribbonFS = `precision highp float;
    ${GL_COMMON}
    uniform vec3 uCol, uCam; uniform float uHead, uT, uHalf, uCore, uLen, uBright, uOld, uPeriod; uniform int uKind;
    varying vec4 vQ; varying vec3 vW;
    float ln(float d, float w){ float a = fwidth(d) * 0.9 + 1e-4; return (1.0 - smoothstep(w - a, w + a, d)) * min(1.0, w / a + 0.35); }
    void main(){
      float s = vQ.x, v = vQ.y, L = vQ.z, B = vQ.w, d = -vW.z; if (s > uHead) discard;
      float x = v * uHalf, ax = abs(x), core = 0.0, extra = 0.0;
      if (uKind == 0) core = ln(ax, uCore);
      else if (uKind == 1) { core = ln(abs(ax - uCore), uCore * 0.2) + 0.85 * ln(abs(fract(L / 1.7) - 0.5) * 1.7, 0.07) * step(ax, uCore); }
      else if (uKind == 2) { core = ln(ax, uCore); extra = core * pow(0.5 + 0.5 * sin(L * 6.2832 / uPeriod - uT * 2.6), 5.0); }
      else if (uKind == 3) { float ph = L * 2.1 - uT * 2.4, a = uCore * 3.6; core = ln(abs(x - a * sin(ph)), uCore * 0.6) + ln(abs(x + a * sin(ph)), uCore * 0.6); }
      else if (uKind == 4) { core = ln(ax, uCore * 0.5); float u = B / uPeriod * 2.0, g = abs(fract(u + 0.5) - 0.5) * uPeriod * 0.5; extra = exp(-g * g * 5.0) * exp(-ax * ax * 7.0) * (0.55 + 0.45 * sin(uT * 4.0 + floor(u + 0.5) * 2.4)); }
      else { float P = 1.9, lx = (fract((L - uT * 1.6) / P) - 0.5) * P; core = ln(length(vec2(lx, x)), uCore * 1.7) + 0.4 * ln(ax, uCore * 0.28); }
      float glow = exp(-ax * ax / (uHalf * uHalf * 0.2)) * (1.0 - v * v) * (1.0 - v * v);
      float flow = 0.78 + 0.22 * sin(L * 1.4 - uT * 7.0);
      float dim = mix(1.0, mix(0.42, 0.17, smoothstep(170.0, 215.0, d)) * (1.0 - smoothstep(244.0, 261.0, d)), uOld * smoothstep(119.0, 131.0, d));
      float hb = exp(-(uHead - s) * uLen * 0.55);
      vec3 col = uCol * ((core * 1.2 + extra * 1.6) * flow + glow * 0.40) * dim * uBright + vec3(1.0, 0.95, 0.85) * hb * (core + glow * 0.6) * mix(1.0, dim, 0.7);
      col *= smoothstep(0.0, 0.012, s) * (1.0 - fogAmt(length(uCam - vW)));
      gl_FragColor = vec4(col, 1.0);
    }`;
  for (const c of currents) {
    const p = c.path, M = p.M, pos = new Float32Array(M * 6), q = new Float32Array(M * 8), idx = [];
    for (let i = 0; i < M; i++) { for (let e = 0; e < 2; e++) { const sg = e ? 1 : -1, k = i * 2 + e; pos.set([p.X[i] + p.NX[i] * c.half * sg, p.Y[i], -(p.Dd[i] + p.ND[i] * c.half * sg)], k * 3); q.set([i / (M - 1), sg, p.LEN[i], (i / (M - 1)) * p.len], k * 4); } if (i < M - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aQ', new THREE.BufferAttribute(q, 4)); g.setIndex(idx);
    c.U = { uCol: { value: c.color }, uCam: groundU.uCam, uHead: { value: 0 }, uT: { value: 0 }, uHalf: { value: c.half }, uCore: { value: c.core }, uLen: { value: p.len }, uBright: { value: c.bright }, uOld: { value: c.old }, uPeriod: { value: c.kind === 2 ? 7.5 : ZIG }, uKind: { value: c.kind } };
    const mesh = new THREE.Mesh(g, keep(new THREE.ShaderMaterial({ uniforms: c.U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'attribute vec4 aQ; varying vec4 vQ; varying vec3 vW; void main(){ vQ = aQ; vW = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }', fragmentShader: ribbonFS })));
    mesh.frustumCulled = false; scene.add(mesh);
  }

  const pxU = { value: 1000 };
  // ---- the spill of light each current throws around itself: soft sprites laid along the path, lit up to the head ----
  const gU = { uPx: pxU, uCam: groundU.uCam, uHeads: { value: new Float32Array(7) } };
  { const pos = [], col = [], aux = [];
    currents.forEach((c, ci) => { const p = c.path, stepN = Math.max(1, Math.round(0.5 / (p.LEN[p.M - 1] / (p.M - 1)))); for (let i = 0; i < p.M; i += stepN) { pos.push(p.X[i], p.Y[i] + 0.05, -p.Dd[i]); col.push(c.color.r, c.color.g, c.color.b); aux.push(i / (p.M - 1), ci, c.old); } });
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aAux', new THREE.Float32BufferAttribute(aux, 3));
    const m = new THREE.Points(g, keep(new THREE.ShaderMaterial({ uniforms: gU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `${GL_COMMON} attribute vec3 aCol; attribute vec3 aAux; uniform float uPx; uniform vec3 uCam; uniform float uHeads[7]; varying vec3 vC;
        void main(){ vec4 mv = viewMatrix * vec4(position, 1.0); float d = -position.z, head = uHeads[int(aAux.y + 0.5)];
          float dim = mix(1.0, mix(0.42, 0.17, smoothstep(170.0, 215.0, d)) * (1.0 - smoothstep(244.0, 261.0, d)), aAux.z * smoothstep(119.0, 131.0, d));
          vC = aCol * dim * step(aAux.x, head) * smoothstep(0.0, 0.012, aAux.x) * (1.0 - fogAmt(length(uCam - position)));
          gl_PointSize = min(160.0, 3.4 * uPx / max(0.5, -mv.z)); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: 'precision highp float; varying vec3 vC; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = max(0.0, 1.0 - r); gl_FragColor = vec4(vC * a * a * 0.085, 1.0); }' })));
    m.frustumCulled = false; scene.add(m); }

  // ---- motes carried downstream by each current (positions set from t every frame), and still dust for depth ----
  const NP = currents.reduce((a, c) => a + c.n, 0), NDUST = 1400, pPos = new Float32Array((NP + NDUST) * 3), pCol = new Float32Array((NP + NDUST) * 3), pSz = new Float32Array(NP + NDUST), motes = [];
  { let k = 0; for (const c of currents) for (let i = 0; i < c.n; i++, k++) { const w = 0.55 + 0.45 * rnd(); motes.push({ c, s0: rnd(), sp: (5.5 + 5 * rnd()) / c.path.len, lat: (rnd() + rnd() - 1) * 0.6, up: 0.05 + rnd() * rnd() * 0.9, sz: 0.5 + rnd() * rnd() * 1.6, ph: rnd() * TAU }); pCol.set([lerp(1, c.color.r, w), lerp(0.96, c.color.g, w), lerp(0.88, c.color.b, w)], k * 3); }
    for (let i = 0; i < NDUST; i++, k++) { const d = -30 + rnd() * 330, x = (rnd() - 0.5) * 120; pPos.set([x, rampY(d) + 1 + rnd() * 16, -d], k * 3); pCol.set([0.45, 0.62, 0.75], k * 3); pSz[k] = 0.35 + rnd() * 0.5; } }
  const pGeo = keep(new THREE.BufferGeometry()), pPosA = new THREE.BufferAttribute(pPos, 3), pSzA = new THREE.BufferAttribute(pSz, 1); pPosA.setUsage(THREE.DynamicDrawUsage); pSzA.setUsage(THREE.DynamicDrawUsage);
  pGeo.setAttribute('position', pPosA); pGeo.setAttribute('aCol', new THREE.BufferAttribute(pCol, 3)); pGeo.setAttribute('aSz', pSzA);
  const pU = { uPx: pxU, uCam: groundU.uCam };
  const points = new THREE.Points(pGeo, keep(new THREE.ShaderMaterial({ uniforms: pU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `${GL_COMMON} attribute vec3 aCol; attribute float aSz; uniform float uPx; uniform vec3 uCam; varying vec3 vC;
      void main(){ vec4 mv = viewMatrix * vec4(position, 1.0); float px = aSz * 0.16 * uPx / max(0.5, -mv.z); vC = aCol * min(1.0, px / 1.6) * (1.0 - fogAmt(length(uCam - position))); gl_PointSize = max(1.6, px); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'precision highp float; varying vec3 vC; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(vC * pow(max(0.0, 1.0 - r), 1.6) * 0.95, 1.0); }' })));
  points.frustumCulled = false; scene.add(points);

  // ---- halos: the head of each current, and the two springs ----
  const haloC = document.createElement('canvas'); haloC.width = haloC.height = 128;
  { const x = haloC.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,0.55)'); g.addColorStop(0.4, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
  const haloT = keep(new THREE.CanvasTexture(haloC));
  const halo = (col) => { const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: haloT, color: col, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 }))); scene.add(s); return s; };
  for (const c of currents) c.halo = halo(c.color.clone().lerp(new THREE.Color('#fff6e0'), 0.35));
  const ringGeo = keep(new THREE.PlaneGeometry(1, 1)); ringGeo.rotateX(-Math.PI / 2);
  const spring = (col, x, d, size) => { const U = { uCol: { value: new THREE.Color(col) }, uT: { value: 0 }, uA: { value: 0 } };
    const m = new THREE.Mesh(ringGeo, keep(new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'precision highp float; uniform vec3 uCol; uniform float uT, uA; varying vec2 vUv; void main(){ float r = length(vUv); float rings = pow(0.5 + 0.5 * sin(r * 26.0 - uT * 3.2), 6.0) * exp(-r * 3.2) * (1.0 - smoothstep(0.7, 1.0, r)); gl_FragColor = vec4(uCol * (rings * 0.9 + exp(-r * r * 30.0) * 1.2) * uA, 1.0); }' })));
    m.position.set(x, baseY(d) + 0.09, -d); m.scale.setScalar(size); scene.add(m); return { U, halo: halo(new THREE.Color(col)), pos: m.position }; };
  const spring1 = spring('#ffc857', thread1.X[0], thread1.Dd[0], 7), xp = currents[4], spring2 = spring('#f4f1e8', xp.path.X[0], xp.path.Dd[0], 7);

  // ---- the 1970 marker: a dark standing slab at the head of the staircase, lit by the thread that passes it ----
  const STELE = { x: xBase(121) - 2.4, d: 121.5, w: 1.5, h: 4.2, t: 0.55 };
  const steleU = { uLit: { value: 0 }, uSize: { value: new V3(STELE.w, STELE.h, STELE.t) } };
  { const m = new THREE.Mesh(keep(new THREE.BoxGeometry(1, 1, 1)), keep(new THREE.ShaderMaterial({ uniforms: steleU,
      vertexShader: 'varying vec3 vL; varying vec3 vN; void main(){ vL = position; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `precision highp float; ${GL_COMMON} uniform float uLit; uniform vec3 uSize; varying vec3 vL; varying vec3 vN;
        void main(){ vec3 e3 = (0.5 - abs(vL)) * uSize + abs(vN) * 1000.0; float e = min(e3.x, min(e3.y, e3.z)), edge = 1.0 - smoothstep(0.0, 0.05, e);
          vec3 col = vec3(0.05, 0.095, 0.15) * (0.7 + 0.9 * max(vN.z, 0.0) + 1.2 * max(vN.y, 0.0)) + TEAL * (0.5 * edge + 0.03);
          float low = 1.0 - smoothstep(-0.5, 0.35, vL.y);
          col += AMBER * uLit * (0.6 * max(vN.x, 0.0) + 0.16 * max(vN.z, 0.0)) * (0.25 + 0.75 * low) + AMBER * uLit * edge * 0.22 * max(vN.x + 0.3, 0.0);
          gl_FragColor = vec4(col, 1.0); }` })));
    m.scale.set(STELE.w, STELE.h, STELE.t); m.position.set(STELE.x, STELE.h / 2, -STELE.d); m.rotation.y = -0.35; scene.add(m); }

  // ---- words: three year markers on thin posts, and a small label that rides in with each current of the 1990s ----
  const postMat = keep(new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0, depthWrite: false })), postGeo = keep(new THREE.BoxGeometry(0.05, 1, 0.05));
  const labelGeo = keep(new THREE.PlaneGeometry(1, 1)), labels = [];
  const addLabel = (o) => { const cv = document.createElement('canvas'), tex = keep(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const mesh = new THREE.Mesh(labelGeo, keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0 }))); overlay.add(mesh); const l = { ...o, cv, tex, mesh, anchor: new V3(), w: 1, h: 1 }; labels.push(l); return l; };
  const yearAnchors = [[thread1.X[0] - 3.4, 9, 2.6], [xBase(JOIN) + 7.5, JOIN - 1.5, 3.2], [STELE.x, STELE.d, STELE.h + 0.5]];
  YEARS.forEach((y, i) => { const [x, d, hgt] = yearAnchors[i], l = addLabel({ ...y, isYear: true }); l.anchor.set(x, baseY(d) + hgt, -d);
    if (i < 2) { const post = new THREE.Mesh(postGeo, postMat.clone()); trash.push(post.material); post.scale.y = hgt - 0.15; post.position.set(x, baseY(d) + (hgt - 0.15) / 2, -d); scene.add(post); l.post = post; } });
  METHODS.forEach((m, i) => { const c = currents[i + 2]; c.label = addLabel({ text: m.name, year: m.year, col: m.col, at: m.at, isYear: false, idx: i }); c.sStop = i >= 3 ? c.path.sOfD(m.pts[3][1]) - 4 / c.path.len : c.path.sOfD(m.stop); c.sEntry = m.entry < 0 ? 0.04 : c.path.sOfD(m.pts[m.entry][1]); c.sEnd = m.end;
    c.headS = track([[m.at - 2.6, 0], [m.at, c.sEntry], [34, c.sEnd]]); });
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const drawLabels = (w, h) => { const portrait = h > w, base = Math.min(w, h);
    for (const l of labels) { const x = l.cv.getContext('2d'), fs = Math.round(base * (l.isYear ? 0.046 : portrait ? 0.034 : 0.028)), pad = Math.round(fs * 0.7);
      const f1 = `600 ${fs}px ${FONT}`, stack = !l.isYear && (l.idx === 2 || (portrait && l.idx === 4)), gap = fs * 0.38; x.font = f1; try { x.letterSpacing = l.isYear ? '0.06em' : '0.01em'; } catch (e) { /* older browsers */ }
      const words = stack && portrait ? l.text.replace('n D', 'n|D').replace('e P', 'e|P').split('|') : [l.text], w1 = Math.max(...words.map((s) => x.measureText(s).width)), w2 = l.isYear ? 0 : x.measureText(l.year).width;
      const lines = stack ? words.length + 1 : 1, tw = stack ? Math.max(w1, w2) : w1 + (l.isYear ? 0 : gap + w2);
      l.cv.width = Math.ceil(tw + pad * 2); l.cv.height = Math.ceil(fs * 1.25 * lines + pad * 2); l.w = l.cv.width; l.h = l.cv.height;
      x.font = f1; try { x.letterSpacing = l.isYear ? '0.06em' : '0.01em'; } catch (e) { /* older browsers */ } x.textBaseline = 'middle'; x.shadowColor = 'rgba(7,13,22,0.95)'; x.shadowBlur = fs * 0.45;
      const right = false, put = (s, col, row, x0) => { const y = pad + fs * 1.25 * (row + 0.5), xx = right && stack ? l.cv.width - pad - x.measureText(s).width : x0; x.fillStyle = col; x.fillText(s, xx, y); x.fillText(s, xx, y); };
      if (stack) { words.forEach((s, r) => put(s, INK, r, pad)); put(l.year, l.col, words.length, pad); } else { put(l.text, INK, 0, pad); if (!l.isYear) put(l.year, l.col, 0, pad + w1 + gap); }
      l.pad = pad; l.tex.needsUpdate = true; } };

  // ---- time: where each head has got to, and where the camera is ----
  const headD = track([[2.0, 0], [6, 30], [10.5, 62], [13.6, 88], [15.8, 122], [17, 136], [20, 214], [25.5, OLD_END]]);
  const S_JOIN = thread2.sOfD(JOIN + 3), head2A = track([[10.9, 0], [13.45, S_JOIN]]);
  currents[0].headS = (t) => (t < 2 ? 0 : thread1.sOfD(headD(t)));
  currents[1].headS = (t) => (t < 13.45 ? head2A(t) : Math.max(S_JOIN, thread2.sOfD(headD(t) - 1.2)));
  const camK = { fd: track([[0, 2.5], [3, 5.5], [6, 22], [10.5, 55], [13.6, 80], [15.8, 108], [17, 119], [20, 201], [26, 221], [34, 240]]),
    back: track([[0, 12], [2.5, 15], [6, 21], [12, 22], [15.8, 21], [17, 15], [20, 26], [34, 60]]),
    up: track([[0, 10], [2.5, 13], [6, 21], [12, 22], [15.8, 14], [17, 8], [20, 13], [34, 30]]),
    ahead: track([[0, 0], [6, 0], [13, 1], [15.8, 9], [17, 14], [20, 26], [34, 24]]) };
  const tgt = new V3(), tmp = new V3(), prj = new V3();
  const place = (t, portrait) => { const fd = camK.fd(t), inB = ss(16.6, 20, t), wide = portrait ? lerp(1.25, 1.95, inB) : 1;
    const cx = lerp(xBase(fd) * 0.6 + LOOP_R - 2.2, 0.8, inB), by = rampY(fd);
    camera.position.set(cx, by + camK.up(t) * wide, -(fd - camK.back(t) * wide));
    tgt.set(lerp(xBase(fd + 4) * 0.7 + LOOP_R, 0, inB), by, -(fd + camK.ahead(t) * (portrait ? lerp(1.5, 0.75, inB) : 1))); const fov = portrait ? lerp(52, 58, inB) : lerp(40, 46, ss(19, 32, t)); if (fov !== camera.fov) { camera.fov = fov; camera.updateProjectionMatrix(); } camera.up.set(0, 1, 0); camera.lookAt(tgt); camera.updateMatrixWorld(); };

  let cw = 0, ch = 0;
  const render = (time, w, h) => {
    const t = reduced ? STILL_T : clamp(time, 0, meta.seconds), portrait = h > w;
    if (w !== cw || h !== ch) { cw = w; ch = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = 0; ortho.right = w; ortho.top = h; ortho.updateProjectionMatrix(); drawLabels(w, h); }
    place(t, portrait); pxU.value = h / (2 * Math.tan((camera.fov * Math.PI) / 360)); groundU.uCam.value.copy(camera.position); sky.position.copy(camera.position);
    const dawn = ss(24, 34, t); skyU.uDawn.value = dawn; groundU.uDawn.value = dawn;

    // heads, halos, and the light each head throws on the land
    currents.forEach((c, i) => { const hs = clamp(c.headS(t)); c.head = hs; gU.uHeads.value[i] = hs; c.U.uHead.value = hs; c.U.uT.value = t; c.path.at(hs, tmp);
      const on = hs > 0.0005 ? 1 : 0, quiet = c.old ? lerp(1, 0.35, ss(16.5, 19, t)) * (1 - ss(24.5, 25.6, t)) : 1, a = on * quiet;
      c.halo.position.copy(tmp).setY(tmp.y + 0.2); c.halo.material.opacity = 0.85 * a; c.halo.scale.setScalar((c.old ? 3.0 : 4.4) * (1 + 0.08 * Math.sin(t * 5 + i)));
      groundU.uH.value[i].set(tmp.x, tmp.y + 1.2, tmp.z, a * (c.old ? 0.55 : 1)); });
    const well1 = ss(0.25, 1.6, t) * (1 - 0.55 * ss(3, 7, t)); spring1.U.uT.value = t; spring1.U.uA.value = well1; spring1.halo.position.copy(spring1.pos).setY(0.4); spring1.halo.material.opacity = 0.75 * well1; spring1.halo.scale.setScalar(4.2 + 0.5 * Math.sin(t * 2.3));
    const well2 = ss(METHODS[2].at - 2.2, METHODS[2].at - 0.4, t) * (1 - 0.6 * ss(26, 29, t)); spring2.U.uT.value = t; spring2.U.uA.value = well2; spring2.halo.position.copy(spring2.pos).setY(spring2.pos.y + 0.4); spring2.halo.material.opacity = 0.45 * well2; spring2.halo.scale.setScalar(3.4 + 0.5 * Math.sin(t * 2.3));
    steleU.uLit.value = ss(108, 121, headD(t)) * lerp(1, 0.45, ss(17, 19, t));

    // motes
    for (let k = 0; k < NP; k++) { const m = motes[k], c = m.c, s = (m.s0 + t * m.sp) % 1, vis = s < c.head ? 1 : 0; c.path.at(s, tmp, m.lat);
      let dim = 1; if (c.old) { const d = -tmp.z; dim = lerp(1, lerp(0.5, 0.2, ss(170, 215, d)) * (1 - ss(244, 261, d)), ss(119, 131, d)); }
      pPos[k * 3] = tmp.x; pPos[k * 3 + 1] = tmp.y + m.up; pPos[k * 3 + 2] = tmp.z; pSz[k] = vis * dim * m.sz * (0.75 + 0.25 * Math.sin(t * 3 + m.ph)) * ss(0, 0.02, s) * Math.min(1, (c.head - s) * c.path.len * 2 + 0.3); }
    pPosA.needsUpdate = true; pSzA.needsUpdate = true;

    // words: project each anchor, place its label in pixels
    const safe = h * 0.84, fs = Math.min(w, h);
    for (const l of labels) { let a = ss(l.at, l.at + 0.6, t), ox = 0, oy = 0;
      if (l.isYear) { if (l.post) l.post.material.opacity = 0; }
      else { const c = currents[l.idx + 2], sa = Math.min(Math.max(c.head - 3.5 / c.path.len, 0), c.sStop); c.path.at(sa, l.anchor); l.anchor.y += 0.5; }
      prj.copy(l.anchor).project(camera); const sx = (prj.x * 0.5 + 0.5) * w, sy = (1 - (prj.y * 0.5 + 0.5)) * h;
      if (prj.z > 1 || prj.z < -1) a = 0;
      if (l.isYear) { a *= 1 - ss(safe - h * 0.1, safe - h * 0.02, sy); if (l.post) l.post.material.opacity = 0.5 * a; ox = -l.w / 2; oy = -l.h + l.pad * 0.55; }
      else if (l.idx >= 3) { ox = -l.w / 2; oy = -l.h + l.pad - fs * 0.012; a *= 1 - ss(safe - h * 0.06, safe, sy); }
      else { const left = l.idx === 0, g = fs * (l.idx === 1 ? 0.085 : 0.022); ox = left ? -l.w - g + l.pad : g - l.pad; oy = -l.h / 2; a *= 1 - ss(safe - h * 0.06, safe, sy); }
      const px = Math.round(clamp(sx + ox, 4 - l.pad, w - l.w - 4 + l.pad)), py = Math.round(Math.max(4, sy + oy));
      l.mesh.material.opacity = a; l.mesh.scale.set(l.w, l.h, 1); l.mesh.position.set(px + l.w / 2, h - py - l.h / 2 - (1 - ss(l.at, l.at + 0.6, t)) * h * 0.01, 0); }

    renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(overlay, ortho);
  };
  const dispose = () => { for (const x of trash) x.dispose(); renderer.dispose(); };
  return { render, dispose };
}
