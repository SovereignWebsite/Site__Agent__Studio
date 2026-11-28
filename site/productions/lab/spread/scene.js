// Spread: the one page stands on a dark plain; its light runs outward along a path, and at six stations the things built
// beside it grow larger and more rigid: a ring of lights, a class, an open hall, a tiered framework, a colonnade, a
// monument. The path itself hardens from a wandering thread into a ruled road, the walkers on it fall into ranks, and at
// the end a surveyed grid closes back in on the page.
// A lab scene (see ../harness.js for the contract). render(t) is a pure function of t: all randomness comes from one
// fixed-seed PRNG run in create(). Apache-2.0. By c.productions.
export const meta = {
  id: 'spread',
  title: 'Then it spread',
  beat: 'In twenty years the page went from something a few people chose to something governments and a defence department require, and each step that carried it further made it colder and more rigid.',
  seconds: 22,
  sources: [
    { title: 'Writing The Agile Manifesto (Martin Fowler)', url: 'https://martinfowler.com/articles/agileStory.html' },
    { title: 'About devopsdays', url: 'https://devopsdays.org/about/' },
    { title: 'Agile and government services: an introduction (GOV.UK Service Manual)', url: 'https://www.gov.uk/service-manual/agile-delivery/agile-government-services-introduction' },
    { title: 'DoD Instruction 5000.87', url: 'https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodi/500087p.PDF' },
  ],
};

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', TAU = Math.PI * 2;
const WORDS = [['2001', 'The Agile Alliance'], ['2002', 'ScrumMaster courses'], ['2009', 'devopsdays'], ['2011', 'SAFe'], ['2016', 'UK government: must be agile'], ['2020', 'US Defense: required']];
const TS = [2.3, 5.3, 7.8, 10.8, 13.3, 16.8];   // when the light reaches each station
const TL = [2.5, 5.5, 8, 11, 13.5, 17];         // when each label appears (as spoken)
const T_START = 0.7, T_GRID = 18.3, STILL_T = 20.8, DT = 0.01;
// the six stations: place on the plain (x is scaled down in portrait), size, turn, warmth (0 amber .. 1 teal), pool radius
const ST = [
  { x: -4.5, z: -2.5, s: 1, sp: 1, rot: 0, tint: 0, rad: 3.8 },
  { x: 5.5, z: -7, s: 1, sp: 1, rot: 0.35, tint: 0.06, rad: 4.4 },
  { x: -10, z: -14, s: 1.1, sp: 1, rot: 0, tint: 0.3, rad: 8 },
  { x: 17, z: -27, s: 1.25, sp: 0.9, rot: 0, tint: 0.6, rad: 14 },
  { x: -25, z: -45, s: 1.5, sp: 0.85, rot: 0, tint: 0.86, rad: 24 },
  { x: 4, z: -86, s: 1.95, sp: 0.72, rot: 0, tint: 1, rad: 44 },
];
const HN = [0, 0, 0.12, 0.3, 0.65, 1, 1], WN = [0.5, 0.5, 0.6, 0.85, 1.4, 2.1, 2.9], ZM = [-19.5, -34.6, -61];
const KT = [0, 2.5, 5.5, 8, 11, 13.5, 17, 22];
const CAM = {
  land: { fov: 40, d: [5.3, 10, 17, 26, 40, 58, 90, 100], el: [0.05, 0.2, 0.28, 0.27, 0.24, 0.19, 0.13, 0.11], tx: [0, -1.6, 0.6, -2.5, 2, -3, 1, 1.5], ty: [1.45, 1.2, 1.4, 2.2, 4, 7.5, 13, 14], tz: [0, -1.2, -3.5, -7, -13, -21, -33, -36], az: [-0.3, -0.24, -0.16, -0.1, -0.05, 0, 0.04, 0.07] },
  port: { fov: 50, d: [5.6, 15.5, 21, 33, 50, 74, 104, 112], el: [0.05, 0.26, 0.36, 0.4, 0.4, 0.39, 0.37, 0.36], tx: [0, -3.4, 0.6, -2.5, 2, -3.4, 1, 1.5], ty: [1.45, 1.2, 1.4, 2, 3.2, 4.5, 6, 6], tz: [0, -1.2, -3.5, -7, -13, -21, -36, -40], az: [-0.3, -0.24, -0.16, -0.1, -0.05, 0, 0.04, 0.07] },
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, mix = (a, b, k) => a + (b - a) * k;
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
// a smooth curve through keyed values (cubic Hermite, finite-difference tangents)
function keyed(v, t) {
  const n = KT.length; if (t <= KT[0]) return v[0]; if (t >= KT[n - 1]) return v[n - 1];
  let i = 0; while (t > KT[i + 1]) i++;
  const h = KT[i + 1] - KT[i], u = (t - KT[i]) / h, m = (j) => (j <= 0 ? 0 : j >= n - 1 ? 0 : (v[j + 1] - v[j - 1]) / (KT[j + 1] - KT[j - 1]));
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v[i] + (u3 - 2 * u2 + u) * h * m(i) + (-2 * u3 + 3 * u2) * v[i + 1] + (u3 - u2) * h * m(i + 1);
}

const COMMON = /* glsl */`
  vec3 fogMix(vec3 c, float dist, float camD, float amount) { float f = smoothstep(camD * 0.75 + 4.0, camD * 2.3 + 90.0, dist); return mix(c, vec3(0.071, 0.149, 0.227), f * amount); }
  const vec3 AMBER = vec3(1.0, 0.784, 0.341); const vec3 TEAL = vec3(0.373, 0.816, 0.773);
`;

export async function create({ canvas, THREE, reduced }) {
  const rnd = prng(20012020), V3 = THREE.Vector3;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.autoClear = false; renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.2, 1600), trash = [];
  const keep = (x) => { trash.push(x); return x; };
  const AMBER = [1.0, 0.784, 0.341], TEAL = [0.373, 0.816, 0.773], INK = [0.957, 0.945, 0.91], DEEP = [1.0, 0.62, 0.22];
  const tintCol = (k) => AMBER.map((a, j) => mix(a, TEAL[j], k));

  // ---- what stands at each station: boxes and lights, in the station's own coordinates ----
  const boxes = [], lights = [];
  const B = (st, x, y, z, w, h, d, o = {}) => boxes.push({ st, x, y, z, w, h, d, rot: o.rot || 0, dt: o.dt || 0, dur: o.dur || 0.7, mech: o.mech ?? 0, tint: o.tint ?? ST[st].tint, em: o.em || 0, up: o.up || 0 });
  const Lt = (st, x, y, z, col, size, o = {}) => lights.push({ st, x, y, z, col, size, dt: o.dt || 0, bob: o.bob || 0, ph: rnd() * TAU, a: o.a ?? 1 });
  { // 1. the Alliance: a loose ring of small lights, each over a stone, nothing built
    const n = 14; for (let i = 0; i < n; i++) { const a = TAU * i / n + (rnd() - 0.5) * 0.3, r = 2.6 + (rnd() - 0.5) * 0.6, x = Math.cos(a) * r, z = Math.sin(a) * r, dt = rnd() * 1.1;
      B(0, x, 0, z, 0.3, 0.2 + rnd() * 0.14, 0.3, { rot: rnd() * 3, dt, dur: 0.5 });
      Lt(0, x, 0.62 + rnd() * 0.3, z, [AMBER, INK, DEEP, AMBER, AMBER, TEAL, DEEP][i % 7], 1.25 + rnd() * 0.4, { dt: dt + 0.1, bob: 0.13 }); } }
  { // 2. the course: rows of desks facing a lit board
    for (let r = 0; r < 4; r++) for (const cx of [-2.35, -1.55, -0.75, 0.75, 1.55, 2.35]) { const x = cx + (rnd() - 0.5) * 0.16, z = 1.7 - r * 1.0 + (rnd() - 0.5) * 0.14, dt = 0.25 + r * 0.16 + rnd() * 0.3;
      B(1, x, 0, z, 0.5, 0.34, 0.36, { rot: (rnd() - 0.5) * 0.3, dt, dur: 0.5, mech: 0.2 }); Lt(1, x, 0.74, z, rnd() < 0.8 ? AMBER : INK, 0.72, { dt: dt + 0.15, bob: 0.045 }); }
    for (const s of [-1, 1]) B(1, s * 1.4, 0, -2.6, 0.1, 1.0, 0.1, { dur: 0.5, mech: 0.3 });
    B(1, 0, 1.0, -2.6, 3.0, 1.35, 0.1, { dt: 0.2, dur: 0.6, mech: 0.3, em: 0.5 }); Lt(1, 0, 1.2, -1.9, INK, 1.5, { dt: 0.5, bob: 0.03 }); }
  { // 3. the conference: an open timber hall, tables in clusters, strings of lights
    const o = { mech: 0.45 };
    for (const s of [-1, 1]) { for (let i = 0; i < 5; i++) B(2, s * 3.6, 0, -3 + i * 1.5, 0.2, 3.4, 0.2, { ...o, dt: 0.1 + i * 0.08 }); B(2, s * 3.6, 3.4, 0, 0.2, 0.2, 6.2, { ...o, dt: 0.75 });
      for (let i = 0; i < 11; i++) Lt(2, s * 3.6, 3.12, -3.1 + i * 0.62, i % 4 === 2 ? TEAL : AMBER, 0.6, { dt: 1.0 + i * 0.05, bob: 0.03 }); }
    for (let i = 0; i < 5; i++) B(2, 0, 3.4, -3 + i * 1.5, 7.4, 0.2, 0.2, { ...o, dt: 0.8 + i * 0.06 });
    B(2, 0, 3.6, 0, 0.22, 0.9, 0.22, { ...o, dt: 1.2 }); B(2, 0, 4.4, 0, 0.16, 0.16, 6.6, { ...o, dt: 1.3 });
    let placed = 0; const spots = [];
    for (let guard = 0; placed < 8 && guard < 400; guard++) { const x = (rnd() < 0.5 ? -1 : 1) * (1.15 + rnd() * 1.75), z = -2.5 + rnd() * 5; if (spots.some((p) => Math.hypot(p[0] - x, p[1] - z) < 1.75)) continue; spots.push([x, z]); placed++;
      const dt = 0.5 + rnd() * 0.8; B(2, x, 0, z, 0.78, 0.42, 0.78, { rot: rnd() * 3, dt, dur: 0.5, mech: 0.2 });
      const m = 4 + Math.floor(rnd() * 3); for (let k = 0; k < m; k++) { const a = TAU * k / m + rnd(); Lt(2, x + Math.cos(a) * 0.72, 0.6 + rnd() * 0.2, z + Math.sin(a) * 0.72, [AMBER, AMBER, DEEP, INK, TEAL][Math.floor(rnd() * 5)], 0.7, { dt: dt + 0.2 + rnd() * 0.5, bob: 0.07 }); } } }
  { // 4. the framework: three tiers of rooms in a strict lattice, each level smaller and above the last
    const o = { mech: 1, dur: 0.75 }, P = 0.26, cool = INK.map((c, j) => mix(c, TEAL[j], 0.45));
    for (const x of [-7, -4.2, -1.4, 1.4, 4.2, 7]) { for (const z of [-4.2, -1.4, 1.4, 4.2]) B(3, x, 0, z, P, 3.2, P, o); B(3, x, 3.2, 0, P, P, 8.66, { ...o, dt: 0.55 }); }
    for (const z of [-4.2, -1.4, 1.4, 4.2]) B(3, 0, 3.2, z, 14.26, P, P, { ...o, dt: 0.55 });
    for (const x of [-5.6, -2.8, 2.8, 5.6]) for (const z of [-2.8, 0, 2.8]) { B(3, x, 0, z, 1.7, 1.25, 1.7, { ...o, dt: 0.2, em: 0.03 }); for (const a of [-1, 1]) for (const b of [-1, 1]) Lt(3, x + a * 0.45, 1.45, z + b * 0.45, cool, 0.5, { dt: 0.9 }); }
    for (const x of [-4.2, -1.4, 1.4, 4.2]) { for (const z of [-1.4, 1.4]) B(3, x, 3.2, z, P, 3.0, P, { ...o, dt: 0.8 }); B(3, x, 6.2, 0, P, P, 3.06, { ...o, dt: 1.3 }); }
    for (const z of [-1.4, 1.4]) B(3, 0, 6.2, z, 8.66, P, P, { ...o, dt: 1.3 });
    for (const x of [-2.8, 0, 2.8]) { B(3, x, 3.46, 0, 1.8, 1.25, 1.8, { ...o, dt: 1.0, em: 0.04 }); for (const a of [-1, 1]) for (const b of [-1, 1]) Lt(3, x + a * 0.5, 4.9, b * 0.5, cool, 0.55, { dt: 1.6 }); }
    for (const x of [-1.4, 1.4]) for (const z of [-1.4, 1.4]) B(3, x, 6.2, z, P, 2.6, P, { ...o, dt: 1.5 });
    for (const s of [-1, 1]) { B(3, s * 1.4, 8.8, 0, P, P, 3.06, { ...o, dt: 1.9 }); B(3, 0, 8.8, s * 1.4, 3.06, P, P, { ...o, dt: 1.9 }); }
    B(3, 0, 8.93, 0, 2.5, 1.5, 2.5, { ...o, dt: 2.0, em: 0.16 }); Lt(3, 0, 10.75, 0, cool, 1.5, { dt: 2.5 }); }
  { // 5. government: a colonnade the road runs through
    const o = { mech: 1, dur: 0.85 };
    for (const s of [-1, 1]) {
      for (let j = 0; j < 3; j++) { const w = 10.6 - 0.6 * j; B(4, s * (1.5 + w / 2), 0.4 * j, 0, w, 0.4, 11 - 1.2 * j, { ...o, dt: j * 0.1 }); }
      B(4, s * 5.8, 1.2, 0, 7.6, 8.65, 4.2, { ...o, dt: 0.35, up: 0.5 });
      for (let i = 0; i < 4; i++) for (const z of [3.4, -3.4]) { const x = s * (2.4 + 2.5 * i), dt = 0.4 + i * 0.16;
        B(4, x, 1.2, z, 1.25, 0.3, 1.25, { ...o, dt }); B(4, x, 1.5, z, 0.9, 8.0, 0.9, { ...o, dt, up: 1 }); B(4, x, 9.5, z, 1.3, 0.35, 1.3, { ...o, dt: dt + 0.2 });
        if (z > 0) Lt(4, x, 1.5, z + 0.95, TEAL, 1.0, { dt: dt + 0.6 }); } }
    B(4, 0, 9.85, 0, 21.4, 1.3, 8.2, { ...o, dt: 1.5 }); B(4, 0, 11.15, 0, 22.4, 0.35, 9.2, { ...o, dt: 1.7 }); B(4, 0, 11.5, 0, 13, 1.2, 5, { ...o, dt: 1.95 });
    for (let i = 0; i < 13; i++) Lt(4, -10.2 + i * 1.7, 11.75, 4.7, TEAL, 0.62, { dt: 2.3 + Math.abs(i - 6) * 0.05 }); }
  { // 6. defence: a plinth, a wall of piers, slabs stacked on top; the road ends at its door
    const o = { mech: 1, dur: 0.95 }, COLD = TEAL.map((c, j) => mix(c, [0.8, 0.93, 1][j], 0.35));
    B(5, 0, 0, 0, 32, 1.6, 16, o); B(5, 0, 1.6, -2.5, 28, 13, 8, { ...o, dt: 0.3, up: 0.6 });
    for (const s of [-1, 1]) { for (let i = 0; i < 5; i++) { const x = s * (1.9 + 3.1 * i), dt = 0.55 + i * 0.15; B(5, x, 1.6, 5.2, 1.6, 13, 1.6, { ...o, dt, up: 1 }); Lt(5, x, 1.95, 6.5, COLD, 1.0, { dt: dt + 0.8 }); }
      B(5, s * 19.5, 0, 3, 3, 18, 3, { ...o, dt: 0.9, up: 1 }); B(5, s * 19.5, 18, 3, 3.8, 0.6, 3.8, { ...o, dt: 1.6 }); Lt(5, s * 19.5, 19.6, 3, COLD, 2.0, { dt: 2.5 }); }
    B(5, 0, 14.6, 0, 33, 2.4, 15, { ...o, dt: 1.7 }); B(5, 0, 17, -1, 22, 3, 10, { ...o, dt: 2.0 }); B(5, 0, 20, -1.5, 12, 2, 6, { ...o, dt: 2.3 });
    B(5, 0, 1.6, 1.56, 2.3, 5.2, 0.2, { ...o, dt: 1.2, em: 0.85 }); B(5, 0, 0, 8.02, 2.6, 1.6, 0.1, { ...o, dt: 0.4, em: 0.5 });
    for (let i = 0; i < 17; i++) { if (i !== 8) Lt(5, -16 + i * 2, 1.85, 8.1, COLD, 0.7, { dt: 1.4 + Math.abs(i - 8) * 0.05 }); Lt(5, -16 + i * 2, 17.25, 7.6, COLD, 0.62, { dt: 2.6 + Math.abs(i - 8) * 0.05 }); } }
  const tops0 = ST.map((S, i) => Math.max(...boxes.filter((b) => b.st === i).map((b) => b.y + b.h), ...lights.filter((l) => l.st === i).map((l) => l.y))), tops = tops0.slice(), sc = ST.map((S) => S.s);

  // ---- sky and ground ----
  const uni = { uT: { value: 0 }, uCamD: { value: 5 }, uSt: { value: ST.map(() => new THREE.Vector4()) }, uTint: { value: ST.map((S) => S.tint) }, uIris: { value: 999 }, uGridOn: { value: 0 } };
  scene.add(new THREE.Mesh(keep(new THREE.SphereGeometry(900, 24, 12)), keep(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vD; void main(){ vec3 d = normalize(vD); float k = smoothstep(0.0, 0.45, d.y); vec3 c = mix(vec3(0.071,0.149,0.227), vec3(0.043,0.078,0.125), k); c += vec3(0.10,0.34,0.33) * exp(-pow((d.y - 0.02) / 0.09, 2.0)) * 0.10; gl_FragColor = vec4(c, 1.0); }' }))));
  { const n = 260, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd() * TAU, y = 0.04 + rnd() * 0.9, r = Math.sqrt(1 - y * y); pos.set([Math.cos(a) * r * 800, y * 800, Math.sin(a) * r * 800], i * 3); }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const st = new THREE.Points(g, keep(new THREE.PointsMaterial({ color: 0x9fb4cc, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false }))); st.frustumCulled = false; scene.add(st); }
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(1800, 1800)), keep(new THREE.ShaderMaterial({ uniforms: uni,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform float uT, uCamD, uIris, uGridOn; uniform vec4 uSt[6]; uniform float uTint[6]; varying vec3 vW; ${COMMON}
      void main(){
        float r = length(vW.xz); vec3 c = vec3(0.036, 0.066, 0.108);
        // the page's own pool, and the first wave of light leaving it
        float pool = 0.62 * exp(-r * 0.42) + 0.16 * exp(-r * 0.1) + 0.05 / (1.0 + r * r * 0.004);
        float ringR = (uT - 0.55) * 7.5; pool += step(0.55, uT) * 0.5 * exp(-pow((r - ringR) / (1.0 + ringR * 0.12), 2.0)) * exp(-ringR * 0.11);
        c += vec3(1.0, 0.71, 0.3) * pool;
        // each station lights its own ground, and sends one wave of its own
        float gm = 0.0;
        for (int i = 0; i < 6; i++) { vec4 s = uSt[i]; float d = distance(vW.xz, s.xy), on = smoothstep(0.0, 1.6, s.w), age = max(s.w, 0.0);
          vec3 col = mix(vec3(1.0, 0.71, 0.3), TEAL * 0.8, uTint[i]);
          float rr = age * s.z * 0.9; float ring = step(0.001, s.w) * exp(-pow((d - rr) / (0.5 + s.z * 0.14), 2.0)) * exp(-age * 0.9) * 0.35;
          c += col * (on * (0.30 * exp(-d / s.z * 2.6) + 0.07 * exp(-d / s.z * 0.9)) + ring);
          gm = max(gm, on * smoothstep(0.5, 0.95, uTint[i]) * smoothstep(s.z * 2.1, s.z * 0.6, d)); }
        // the surveyed grid: round the institutions first, then closing in on the page
        float iris = smoothstep(uIris, uIris + 5.0 + uIris * 0.25, r) * uGridOn;
        vec2 g = vW.xz / vec2(1.38, 1.12) + 0.5; vec2 fw = fwidth(g); vec2 l = abs(fract(g) - 0.5);
        float line = max(smoothstep(0.5 - fw.x * 1.5, 0.5, l.x), smoothstep(0.5 - fw.y * 1.5, 0.5, l.y)) * clamp(1.0 - max(fw.x, fw.y) * 2.5, 0.0, 1.0);
        float edge = exp(-pow((r - uIris) / (1.2 + uIris * 0.05), 2.0)) * uGridOn;
        c += vec3(0.07, 0.2, 0.2) * line * (max(gm, iris) * 0.6 + edge * 1.6) * smoothstep(260.0, 60.0, r);
        c += TEAL * edge * 0.10;
        gl_FragColor = vec4(fogMix(c, distance(cameraPosition, vW), uCamD, 1.0), 1.0);
      }` })));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  // ---- the built things: one instanced box mesh, grown in the vertex shader ----
  const unitBox = new THREE.BoxGeometry(1, 1, 1), bg = keep(new THREE.InstancedBufferGeometry()); bg.index = unitBox.index; bg.setAttribute('position', unitBox.attributes.position); bg.setAttribute('normal', unitBox.attributes.normal);
  const NB = boxes.length, bP = new Float32Array(NB * 4), bS = new Float32Array(NB * 3), bR = new Float32Array(NB * 4), bF = new Float32Array(NB * 2);
  bg.setAttribute('aP', new THREE.InstancedBufferAttribute(bP, 4)); bg.setAttribute('aS', new THREE.InstancedBufferAttribute(bS, 3)); bg.setAttribute('aR', new THREE.InstancedBufferAttribute(bR, 4)); bg.setAttribute('aF', new THREE.InstancedBufferAttribute(bF, 2)); bg.instanceCount = NB;
  const boxMesh = new THREE.Mesh(bg, keep(new THREE.ShaderMaterial({ uniforms: uni,
    vertexShader: /* glsl */`
      attribute vec4 aP; attribute vec3 aS; attribute vec4 aR; attribute vec2 aF; uniform float uT;
      varying vec3 vW; varying vec3 vN; varying vec4 vI; varying vec3 vY;
      void main(){
        float u = clamp((uT - aR.x) / aR.y, 0.0, 1.0), e = u * u * (3.0 - 2.0 * u);
        float g = mix(e * (1.0 + 0.3 * sin(u * 6.2832) * (1.0 - u)), u, aR.z);   // the early things spring up; the late ones are jacked up at a constant rate
        float c = cos(aP.w), s = sin(aP.w); vec3 l = position * aS;
        vec3 p = vec3(aP.x + c * l.x + s * l.z, (aP.y + (position.y + 0.5) * aS.y) * g, aP.z - s * l.x + c * l.z);
        if (u <= 0.0) p = vec3(0.0, -50.0, 0.0);
        vW = p; vN = vec3(c * normal.x + s * normal.z, normal.y, -s * normal.x + c * normal.z);
        vI = vec4(aR.w, aF.x, aF.y, 4.0 * u * (1.0 - u)); vY = vec3(aP.y * g, (aP.y + aS.y) * g, aR.z);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uCamD; varying vec3 vW; varying vec3 vN; varying vec4 vI; varying vec3 vY; ${COMMON}
      void main(){
        vec3 n = normalize(vN); float tint = vI.x, top = step(0.5, n.y);
        vec3 alb = mix(vec3(0.23, 0.165, 0.105), vec3(0.20, 0.31, 0.36), tint);
        vec3 moon = normalize(vec3(-0.55, 0.42, -0.72));
        vec3 c = alb * (vec3(0.065, 0.11, 0.17) + vec3(0.36, 0.56, 0.74) * max(dot(n, moon), 0.0) * 0.5 + vec3(0.05, 0.1, 0.13) * max(n.y, 0.0));
        // the page is the only warm light, and it thins with distance
        vec3 L = vec3(0.0, 1.6, 0.0) - vW; float d2 = dot(L, L);
        c += alb * vec3(1.0, 0.72, 0.32) * (max(dot(n, normalize(L)), 0.0) * 0.9 + 0.1) * 3.4 / (1.0 + d2 * 0.0024);
        // the late buildings light themselves, coldly, from below
        float hgt = vW.y - vY.x; c += alb * mix(AMBER, TEAL, tint) * vI.z * (1.0 - top) * (2.6 * exp(-hgt * 0.22) + 0.4);
        float ly = vW.y / 1.3, fw = fwidth(ly); c *= mix(1.0, 0.72 + 0.28 * smoothstep(0.0, 0.1, fract(ly)), vY.z * (1.0 - top) * step(0.5, tint) * clamp(1.0 - fw * 2.0, 0.0, 1.0));
        c *= mix(0.5, 1.0, smoothstep(0.0, 1.2, vW.y));
        c += mix(vec3(1.0, 0.8, 0.45), vec3(0.55, 0.95, 0.92), tint) * vI.y;
        c += mix(vec3(1.0, 0.74, 0.3), vec3(0.3, 0.8, 0.76), tint) * vI.w * smoothstep(vY.y - 0.4, vY.y - 0.03, vW.y) * (1.0 - 0.5 * top) * 0.8;
        gl_FragColor = vec4(fogMix(c, distance(cameraPosition, vW), uCamD, 0.85), 1.0);
      }` })));
  boxMesh.frustumCulled = false; scene.add(boxMesh);

  // ---- the path: a table of where the light is at each moment, and a ribbon built from it ----
  const NT = Math.round((TS[5] - T_START) / DT) + 1, tab = new Float32Array(NT * 7); // x, z, nx, nz, hardness, width, length
  const rg = keep(new THREE.BufferGeometry()), rPos = new Float32Array(NT * 2 * 3), rA = new Float32Array(NT * 2 * 4);
  rg.setAttribute('position', new THREE.BufferAttribute(rPos, 3)); rg.setAttribute('aA', new THREE.BufferAttribute(rA, 4));
  { const idx = []; for (let j = 0; j < NT - 1; j++) idx.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 1, j * 2 + 3, j * 2 + 2); rg.setIndex(idx); }
  const ribbon = new THREE.Mesh(rg, keep(new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute vec4 aA; varying vec4 vA; varying vec3 vW; void main(){ vA = aA; vW = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uT, uCamD; varying vec4 vA; varying vec3 vW; ${COMMON}
      void main(){
        float tau = vA.x, v = vA.y, h = vA.z, len = vA.w, hs = smoothstep(0.35, 0.8, h), age = uT - tau;
        float lit = smoothstep(0.0, 0.2, age), head = exp(-pow(age / 0.2, 2.0));
        float soft = exp(-v * v * 5.0) * (0.75 + 0.25 * sin(len * 1.7 - uT * 2.0));
        float fw = fwidth(len / 1.5), dash = mix(0.5, step(fract(len / 1.5 - uT * 1.4), 0.5), clamp(1.0 - fw * 1.5, 0.0, 1.0));
        float hard = 0.34 + 0.8 * smoothstep(0.74, 0.8, abs(v)) * smoothstep(1.0, 0.94, abs(v)) + 0.7 * dash * smoothstep(0.1, 0.05, abs(abs(v) - 0.26));
        vec3 col = mix(vec3(1.0, 0.76, 0.34), TEAL, smoothstep(0.15, 0.9, h));
        float a = mix(soft * 0.9, hard * 0.9, hs) * lit * (0.62 + 0.38 * exp(-age * 0.25)) + head * exp(-v * v * 2.0) * 1.6;
        float f = smoothstep(uCamD * 0.75 + 4.0, uCamD * 2.3 + 90.0, distance(cameraPosition, vW));
        gl_FragColor = vec4(mix(col, vec3(1.0, 0.95, 0.82), head * 0.6) * a * (1.0 - f * 0.8), 1.0);
      }` })));
  ribbon.frustumCulled = false; ribbon.renderOrder = 2; scene.add(ribbon);

  // ---- lights: the station lights and the walkers on the path, drawn as soft points ----
  const NM = 900, motes = [];
  for (let i = 0; i < NM; i++) { // 260 who set out from the page by choice; 640 issued further along, who never saw it
    const free = i < 260, r = rnd(), start = free ? T_START : r < 0.4 ? TS[2] : TS[3], end = free ? TS[r < 0.3 ? 0 : r < 0.55 ? 1 : r < 0.85 ? 2 : 3] : TS[rnd() < 0.4 ? 4 : 5];
    motes.push({ delay: free ? 0.12 + 21.4 * rnd() : 0.1 + 14 * rnd(), start, end, ph: rnd() * TAU, ph2: rnd() * TAU, spread: 0.35 + rnd() * 0.9, lane: Math.floor(rnd() * 4), size: 0.34 + rnd() * 0.4, col: [AMBER, AMBER, DEEP, INK, AMBER, TEAL][Math.floor(rnd() * 6)] }); }
  const NP = lights.length + NM, gPos = new Float32Array(NP * 3), gCol = new Float32Array(NP * 4), gSize = new Float32Array(NP);
  const gg = keep(new THREE.BufferGeometry()); gg.setAttribute('position', new THREE.BufferAttribute(gPos, 3)); gg.setAttribute('aCol', new THREE.BufferAttribute(gCol, 4)); gg.setAttribute('aSize', new THREE.BufferAttribute(gSize, 1));
  const glowMat = keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uProj: { value: 800 }, uPx: { value: 1 } },
    vertexShader: `attribute vec4 aCol; attribute float aSize; uniform float uProj, uPx; varying vec4 vC;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float s = aSize * uProj / max(-mv.z, 0.5), m = 3.2 * uPx; vC = aCol; vC.a *= min(1.0, s / m); gl_PointSize = clamp(max(s, m), 0.0, 400.0 * uPx); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'precision highp float; varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = (exp(-d * d * 5.0) * 0.55 + exp(-d * d * 42.0) * 1.3) * smoothstep(1.0, 0.75, d); gl_FragColor = vec4(mix(vC.rgb, vec3(1.0, 0.97, 0.9), exp(-d * d * 60.0) * 0.7) * vC.a * a, 1.0); }' }));
  const glowPts = new THREE.Points(gg, glowMat); glowPts.frustumCulled = false; glowPts.renderOrder = 8; scene.add(glowPts);

  // ---- the page: the same sheet the badge factory opens on ----
  const pc = document.createElement('canvas'); pc.width = 512; pc.height = 724; const px = pc.getContext('2d');
  px.fillStyle = '#fff6dc'; px.fillRect(0, 0, 512, 724); px.fillStyle = 'rgba(36,52,74,0.86)'; px.fillRect(96, 70, 320, 20);
  for (let i = 0; i < 4; i++) { px.fillStyle = 'rgba(36,52,74,0.8)'; px.fillRect(70, 150 + i * 62, 190 + (i % 2) * 40, 13); px.fillStyle = 'rgba(36,52,74,0.38)'; px.fillRect(70, 176 + i * 62, 300 - (i % 3) * 36, 9); }
  for (let i = 0; i < 9; i++) { px.fillStyle = 'rgba(36,52,74,0.3)'; px.fillRect(70, 430 + i * 27, i === 8 ? 180 : 372 - ((i * 37) % 60), 8); }
  const pageTex = keep(new THREE.CanvasTexture(pc)); pageTex.colorSpace = THREE.SRGBColorSpace; pageTex.anisotropy = 8;
  const page = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.6, 2.26)), keep(new THREE.MeshBasicMaterial({ map: pageTex, side: THREE.DoubleSide, toneMapped: false }))); page.renderOrder = 6; scene.add(page);
  const gc = document.createElement('canvas'); gc.width = gc.height = 256; const gx = gc.getContext('2d'), grad = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,214,130,1)'); grad.addColorStop(0.16, 'rgba(255,200,87,0.55)'); grad.addColorStop(0.45, 'rgba(255,170,70,0.13)'); grad.addColorStop(1, 'rgba(255,160,60,0)'); gx.fillStyle = grad; gx.fillRect(0, 0, 256, 256);
  const glowTex = keep(new THREE.CanvasTexture(gc)); glowTex.colorSpace = THREE.SRGBColorSpace;
  const halo = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, toneMapped: false }))); halo.renderOrder = 7; scene.add(halo);

  // ---- cold air round the last two: a glow behind each, and two shafts of light from the monument's towers ----
  const wc = document.createElement('canvas'); wc.width = wc.height = 128; { const x = wc.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
  const whiteTex = keep(new THREE.CanvasTexture(wc));
  const backs = [4, 5].map(() => { const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: whiteTex, color: 0x5fd0c5, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, fog: false }))); sp.renderOrder = 1; scene.add(sp); return sp; });
  const beamG = keep(new THREE.PlaneGeometry(1, 1)); beamG.translate(0, 0.5, 0);
  const beamU = { uA: { value: 0 } }, beamMat = keep(new THREE.ShaderMaterial({ uniforms: beamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float x = (vUv.x - 0.5) * 2.0; float a = (exp(-x * x * 14.0) * 0.8 + exp(-x * x * 3.0) * 0.2) * exp(-vUv.y * 3.2) * smoothstep(1.0, 0.6, abs(x)) * uA; gl_FragColor = vec4(vec3(0.5, 0.88, 0.86) * a, 1.0); }' }));
  const beams = [-1, 1].map(() => { const m = new THREE.Mesh(beamG, beamMat); m.frustumCulled = false; m.renderOrder = 3; scene.add(m); return m; });

  // ---- words: one label per station, drawn on a 2D canvas and pinned above its station ----
  const hud = new THREE.Scene(), hudCam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1), unit = keep(new THREE.PlaneGeometry(1, 1)), F0 = 64;
  const labels = WORDS.map(([year, text], i) => {
    const m = document.createElement('canvas').getContext('2d'); m.font = `700 ${F0}px ${FONT}`; const wy = m.measureText(year).width; m.font = `600 ${F0}px ${FONT}`; const wt = m.measureText(text).width;
    const c = document.createElement('canvas'), pad = 28, gap = 22; c.width = Math.ceil(wy + gap + wt + pad * 2); c.height = 116; const x = c.getContext('2d');
    x.shadowColor = 'rgba(11,20,32,0.96)'; x.shadowBlur = 16; x.textBaseline = 'alphabetic'; const yc = tintCol(ST[i].tint).map((v) => Math.round(v * 255));
    for (let pass = 0; pass < 3; pass++) { x.font = `700 ${F0}px ${FONT}`; x.fillStyle = `rgb(${yc[0]},${yc[1]},${yc[2]})`; x.fillText(year, pad, 80); x.font = `600 ${F0}px ${FONT}`; x.fillStyle = '#f4f1e8'; x.fillText(text, pad + wy + gap, 80); }
    const tex = keep(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mesh = new THREE.Mesh(unit, keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }))); hud.add(mesh);
    return { mesh, cw: c.width, ch: c.height };
  });
  const leadG = keep(new THREE.BufferGeometry()); leadG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(36), 3)); leadG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(36), 3));
  const leads = new THREE.LineSegments(leadG, keep(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }))); leads.frustumCulled = false; hud.add(leads);

  // ---- layout: everything whose place depends on the frame's shape ----
  const org = ST.map(() => [0, 0]); let xs = 1;
  const local = (i, x, z) => { const S = ST[i], o = org[i], c = Math.cos(S.rot), s = Math.sin(S.rot); return [o[0] + (c * x + s * z) * sc[i], o[1] + (-s * x + c * z) * sc[i]]; };
  function layout(portrait) {
    xs = portrait ? 0.5 : 1; ST.forEach((S, i) => { org[i] = [S.x * xs, S.z]; sc[i] = S.s * (portrait ? S.sp : 1); tops[i] = tops0[i] * sc[i]; });
    boxes.forEach((b, i) => { const S = ST[b.st], k = sc[b.st], [x, z] = local(b.st, b.x, b.z);
      bP.set([x, b.y * k, z, S.rot + b.rot], i * 4); bS.set([b.w * k, b.h * k, b.d * k], i * 3); bR.set([TS[b.st] - 0.25 + b.dt, b.dur, b.mech, b.tint], i * 4); bF.set([b.em, b.up], i * 2); });
    for (const k of ['aP', 'aS', 'aR', 'aF']) bg.attributes[k].needsUpdate = true;
    // nodes: the page, then each station's centre (the last is the monument's door)
    const N = [[0, 0], ...org.map((o) => o.slice())]; N[6] = [org[5][0], org[5][1] + 8.1 * sc[5]];
    const cr = (a, b, c, d, u) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
    const CP = [[N[0][0] + (N[0][0] - N[1][0]) * 0.4, N[0][1] + 2], N[0], N[1], N[2], N[3], [N[3][0], N[3][1] - 9]];
    const polys = [3, 4, 5].map((k) => { const A = N[k], Bn = N[k + 1], zm = ZM[k - 3], pts = [A, [A[0], zm], [Bn[0], zm], Bn], ls = [0]; for (let j = 1; j < 4; j++) ls.push(ls[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1])); return { pts, ls }; });
    for (let j = 0; j < NT; j++) {
      const tau = T_START + j * DT; let k = 0; while (k < 5 && tau > TS[k]) k++;
      const ta = k === 0 ? T_START : TS[k - 1], u = clamp((tau - ta) / (TS[k] - ta)); let x, z;
      if (k < 3) { x = cr(CP[k][0], CP[k + 1][0], CP[k + 2][0], CP[k + 3][0], u); z = cr(CP[k][1], CP[k + 1][1], CP[k + 2][1], CP[k + 3][1], u);
        const a = 0.34 * Math.sin(Math.PI * u) * (1 - k * 0.25); x += a * Math.sin(tau * 3.1 + 1); z += a * Math.cos(tau * 2.3); }
      else { const P = polys[k - 3], s = u * P.ls[3]; let q = 1; while (q < 3 && s > P.ls[q]) q++; const v = (s - P.ls[q - 1]) / Math.max(1e-6, P.ls[q] - P.ls[q - 1]); x = mix(P.pts[q - 1][0], P.pts[q][0], v); z = mix(P.pts[q - 1][1], P.pts[q][1], v); }
      const e = ease(u); tab.set([x, z, 0, 0, mix(HN[k], HN[k + 1], e), mix(WN[k], WN[k + 1], e), 0], j * 7);
    }
    for (let j = 0; j < NT; j++) { const a = Math.max(0, j - 1), b = Math.min(NT - 1, j + 1); let tx = tab[b * 7] - tab[a * 7], tz = tab[b * 7 + 1] - tab[a * 7 + 1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      tab[j * 7 + 2] = -tz; tab[j * 7 + 3] = tx; if (j) tab[j * 7 + 6] = tab[(j - 1) * 7 + 6] + Math.hypot(tab[j * 7] - tab[(j - 1) * 7], tab[j * 7 + 1] - tab[(j - 1) * 7 + 1]);
      const w = tab[j * 7 + 5] * 0.5, x = tab[j * 7], z = tab[j * 7 + 1], nx = tab[j * 7 + 2], nz = tab[j * 7 + 3], tau = T_START + j * DT, h = tab[j * 7 + 4], len = tab[j * 7 + 6];
      rPos.set([x - nx * w, 0.05, z - nz * w, x + nx * w, 0.05, z + nz * w], j * 6); rA.set([tau, -1, h, len, tau, 1, h, len], j * 8); }
    rg.attributes.position.needsUpdate = rg.attributes.aA.needsUpdate = true;
  }
  const pt = [0, 0, 0, 0, 0, 0];
  function pathAt(tau) { const f = clamp((tau - T_START) / DT, 0, NT - 1.001), j = Math.floor(f), k = f - j; for (let q = 0; q < 6; q++) pt[q] = mix(tab[j * 7 + q], tab[(j + 1) * 7 + q], k); return pt; }

  let W = 0, H = 0, isPort = null, K = CAM.land; const v = new V3(), target = new V3();
  function resize(w, h) {
    W = w; H = h; renderer.setSize(w, h, false); const portrait = h > w; if (portrait !== isPort) { isPort = portrait; layout(portrait); K = portrait ? CAM.port : CAM.land; }
    camera.fov = K.fov; camera.aspect = w / h; camera.updateProjectionMatrix(); hudCam.right = w; hudCam.top = h; hudCam.updateProjectionMatrix();
    glowMat.uniforms.uProj.value = h / (2 * Math.tan(K.fov * Math.PI / 360)); glowMat.uniforms.uPx.value = h / 720 * (portrait ? 0.6 : 1);
  }

  function render(tIn, w, h) {
    if (w !== W || h !== H) resize(w, h);
    const t = reduced ? STILL_T : clamp(tIn, 0, meta.seconds), portrait = isPort;

    // camera: close on the page, then out and up after the light
    const d = Math.exp(keyed(K.d.map(Math.log), t)), el = keyed(K.el, t), az = keyed(K.az, t) + 0.012 * Math.sin(t * 0.5);
    target.set(keyed(K.tx, t) * xs, keyed(K.ty, t), keyed(K.tz, t));
    camera.position.set(target.x + Math.sin(az) * Math.cos(el) * d, target.y + Math.sin(el) * d, target.z + Math.cos(az) * Math.cos(el) * d); camera.lookAt(target); camera.updateMatrixWorld(true);

    // page and its halo
    const grow = 1 + 0.55 * ease((d - 20) / 110), bob = Math.sin(t * 1.7) * 0.05;
    page.position.set(0, 1.5 * grow + bob, 0); page.rotation.set(-el * 0.75, Math.sin(t * 0.9) * 0.16 - 0.1 + az * 0.7, 0, 'YXZ'); page.scale.setScalar(grow);
    halo.position.copy(page.position); const gs = (4.0 + d * 0.085) * (1 + 0.03 * Math.sin(t * 2.1)); halo.scale.set(gs, gs, 1);

    uni.uT.value = t; uni.uCamD.value = d; uni.uGridOn.value = ease((t - T_GRID) / 0.6);
    uni.uIris.value = mix(110, 5.5, ease((t - T_GRID) / (meta.seconds - 0.4 - T_GRID)));
    ST.forEach((S, i) => uni.uSt.value[i].set(org[i][0], org[i][1], S.rad * sc[i] / S.s, t - TS[i]));

    backs.forEach((sp, q) => { const i = 4 + q, k = sc[i], on = ease((t - TS[i] - 0.6) / 2.2); sp.position.set(org[i][0], tops[i] * 0.55, org[i][1] - 7 * k); sp.scale.set(tops[i] * (q ? 4.6 : 4.2), tops[i] * (q ? 2.9 : 2.6), 1); sp.material.opacity = on * (q ? 0.3 : 0.2); sp.visible = on > 0.002; });
    beamU.uA.value = 0.55 * ease((t - TS[5] - 2.3) / 1.6);
    beams.forEach((m, q) => { const [x, z] = local(5, (q ? 1 : -1) * 19.5, 3); m.position.set(x, 18.6 * sc[5], z); m.scale.set(3.4 * sc[5], 60 * sc[5], 1); m.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z); m.visible = beamU.uA.value > 0.002; });

    // station lights: the early ones drift and breathe, the late ones do not move at all
    let j = 0;
    for (const L of lights) { const k = sc[L.st], [x, z] = local(L.st, L.x, L.z), on = ease((t - (TS[L.st] - 0.25 + L.dt)) / 0.5), free = L.bob;
      gPos.set([x + Math.sin(t * 0.9 + L.ph) * free * 0.6, L.y * k + Math.sin(t * 1.4 + L.ph * 2) * free, z + Math.cos(t * 0.8 + L.ph) * free * 0.6], j * 3);
      gSize[j] = L.size * Math.sqrt(k) * (0.25 + 0.75 * on) * (1 + (free > 0.04 ? 0.12 * Math.sin(t * 2.3 + L.ph * 3) : 0)); gCol.set([L.col[0], L.col[1], L.col[2], on * L.a], j * 4); j++; }
    // walkers: they wander along the thread, and fall into lanes and ranks as it becomes a road
    for (const M of motes) {
      let tau = t - M.delay; const raw = pathAt(tau), hs0 = ease((raw[4] - 0.35) / 0.45); tau = mix(tau, t - Math.round(M.delay / 0.16) * 0.16, hs0);
      const p = pathAt(tau), hs = ease((p[4] - 0.35) / 0.45), alive = tau > M.start && tau < M.end ? ease((tau - M.start) / 0.35) * ease((M.end - tau) / 0.3) : 0;
      const lat = mix((0.75 * Math.sin(tau * 1.3 + M.ph) + 0.45 * Math.sin(tau * 2.9 + M.ph2)) * M.spread, (M.lane - 1.5) * p[5] * 0.21, hs);
      gPos.set([p[0] + p[2] * lat, mix(0.38 + 0.2 * Math.sin(t * 1.6 + M.ph), 0.3, hs), p[1] + p[3] * lat], j * 3);
      gSize[j] = mix(M.size, 0.8, hs) * (1 + 0.5 * hs * p[5] / 2.9); const k = ease((p[4] - 0.15) / 0.6);
      gCol.set([mix(M.col[0], TEAL[0], k), mix(M.col[1], TEAL[1], k), mix(M.col[2], TEAL[2], k), alive * mix(0.6, 0.95, hs)], j * 4); j++; }
    gg.attributes.position.needsUpdate = gg.attributes.aCol.needsUpdate = gg.attributes.aSize.needsUpdate = true;

    // words
    const lp = leadG.attributes.position.array, lc = leadG.attributes.color.array, fpx = portrait ? w * 0.052 : h * 0.045;
    labels.forEach((Lb, i) => {
      const a = reduced ? (i === 5 ? 1 : 0) : ease((t - TL[i]) / 0.5) * (i === 5 ? 1 : 1 - ease((t - TL[i] - 3.3) / 0.6));
      let sc = fpx / F0; if (Lb.cw * sc > w * 0.92) sc = w * 0.92 / Lb.cw; const lw = Lb.cw * sc, lh = Lb.ch * sc;
      v.set(org[i][0], tops[i] * Math.min(1, 0.3 + 0.7 * ease((t - TS[i]) / 2.4)) + 0.4, org[i][1]).project(camera);
      const ax = (v.x * 0.5 + 0.5) * w, ay = (v.y * 0.5 + 0.5) * h;
      const cx = clamp(ax, lw / 2 + w * 0.02, w - lw / 2 - w * 0.02), cy = clamp(ay + h * (portrait && i < 2 ? 0.1 : 0.05) + lh / 2, h * 0.2, h * 0.955 - lh / 2);
      Lb.mesh.scale.set(lw, lh, 1); Lb.mesh.position.set(Math.round(cx), Math.round(cy), 0); Lb.mesh.material.opacity = a; Lb.mesh.visible = a > 0.003;
      const c = tintCol(ST[i].tint), by = cy - lh * 0.34; lp.set([clamp(ax, cx - lw * 0.4, cx + lw * 0.4), by, 0, ax, Math.min(ay, by), 0], i * 6);
      lc.set([c[0] * a * 0.6, c[1] * a * 0.6, c[2] * a * 0.6, c[0] * a * 0.15, c[1] * a * 0.15, c[2] * a * 0.15], i * 6);
    });
    leadG.attributes.position.needsUpdate = leadG.attributes.color.needsUpdate = true;

    renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(hud, hudCam);
  }
  return { render, dispose() { for (const x of trash) x.dispose(); unitBox.dispose(); renderer.dispose(); } };
}
