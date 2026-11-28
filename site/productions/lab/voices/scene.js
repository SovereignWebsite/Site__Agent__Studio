// Voices: in the cold city of badge towers, three small warm lights leave the crowd one after another and speak. The first
// voice empties the stamped mark on every tower; under the second the towers lean in and press the crowd into rows; the
// third stands alone before the rows, then walks back down the street to the page, whose four lines light and loosen the rows.
// A lab scene (see ../harness.js for the contract). Every frame is a pure function of t; the only randomness is a
// fixed-seed PRNG run once in create(). The city plan is the badge factory's, tower for tower. Apache-2.0. By c.productions.
export const meta = {
  id: 'voices',
  title: 'Three voices from the seventeen',
  beat: 'Three of the people who signed the page said out loud that the word built on it had gone hollow and was being used against developers, and the one whose heart it broke still went back to the page, because the quarrel was with the word and not the values.',
  seconds: 39,
  sources: [
    { title: 'Agile is Dead (Long Live Agility), Dave Thomas', url: 'https://pragdave.me/thoughts/active/2014-03-04-time-to-kill-agile.html' },
    { title: 'The State of Agile Software in 2018, Martin Fowler', url: 'https://martinfowler.com/articles/agile-aus-2018.html' },
    { title: 'Developers Should Abandon Agile, Ron Jeffries', url: 'https://ronjeffries.com/articles/018-01ff/abandon-1/' },
  ],
};

const INK = '#f4f1e8', AMBER = '#ffc857', SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif', SERIF = 'Georgia, "Times New Roman", serif';
const QUOTES = [
  { q: '“The word ‘agile’ has been subverted to the point where it is effectively meaningless”', by: 'Dave Thomas, 2014', on: 2.5, off: 8.5 },
  { q: '“the Agile Industrial Complex imposing methods upon people, and that to me is an absolute travesty”', by: 'Martin Fowler, 2018', on: 10.4, off: 19.0 },
  { q: '“it breaks my heart to see the ideas we wrote about in the Agile Manifesto used to make developers’ lives worse”', by: 'Ron Jeffries, 2018', on: 20.5, off: 27.5 },
  { q: '“the values and principles of the Manifesto for Agile Software Development still offer the best way I know to build software”', by: 'Ron Jeffries, in the same post', on: 29.2, off: 99 },
];
const DISTRICTS = [{ final: 1.8, angle: 90 }, { final: 1.2, angle: 210 }, { final: 1.0, angle: 330 }];
const AVENUES = [270, 30, 150]; // the open streets between the districts; 270 degrees is the one that runs toward the camera
const SX = 1.38, SZ = 1.12, R0 = 5.6, R1 = 31, TAN_AV = Math.tan(13 * Math.PI / 180);
const DX = 0.52, DZ = 0.62, X0 = 0.58, Z0 = 7.2;                    // the rigid grid the crowd is pressed into
const T_VOICE1 = 3.0, RING_V = 9.0, CLUNKS = [11.5, 12.9, 14.3, 15.7, 17.1], T_ARRIVE = 33.0, STILL_T = 38.5;
const SP = { // where the three speakers stand
  one: { rise: 0.9, hover: [-3.4, 9.2, 20] }, two: { rise: 9.4, hover: [4.4, 7.4, 17.5] },
  three: { out: 19.9, stand: [0, 1.05, 30.2], go: 28.4, len: 4.6, end: [-1.25, 2.9, 2.9] },
};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, mix = (a, b, k) => a + (b - a) * k;
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

const COMMON = /* glsl */`
  uniform float uT, uCamD, uPulse, uWarm, uWarmT, uDim, uLean, uPress, uWarmR; uniform vec4 uS[3]; uniform vec4 uV[2];
  vec3 fogMix(vec3 c, float dist, float amount) { float f = smoothstep(uCamD * 0.75 + 4.0, uCamD * 2.3 + 90.0, dist); return mix(c, vec3(0.071, 0.149, 0.227) * mix(0.72, 1.0, uDim), f * amount); }
  // a voice: three thin shells of light that leave the speaker and cross the city
  float shells(vec3 P, vec4 V) { float d = distance(P, V.xyz), s = 0.0;
    for (int j = 0; j < 3; j++) { float age = V.w - float(j) * 1.3, R = age * ${RING_V.toFixed(1)}; s += step(0.0, age) * exp(-pow((d - R) / 0.42, 2.0)) * exp(-R * 0.04); } return s; }
  vec3 speakers(vec3 P, vec3 n) { vec3 c = vec3(0.0);
    for (int i = 0; i < 3; i++) { vec3 L = uS[i].xyz - P; float d2 = dot(L, L); c += vec3(1.0, 0.74, 0.34) * (max(dot(n, normalize(L)), 0.0) * 0.85 + 0.15) * uS[i].w * 7.0 / (d2 + 5.0); } return c; }
`;

export async function create({ canvas, THREE, reduced }) {
  const rnd = prng(20011), renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.autoClear = false; renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 1500), trash = [];
  const keep = (x) => { trash.push(x); return x; }, V3 = THREE.Vector3;

  // The city plan: the badge factory's, drawn with the same seed in the same order, so it is the same city.
  const towers = [];
  for (let ix = -24; ix <= 24; ix++) for (let iz = -29; iz <= 29; iz++) {
    const x = ix * SX, z = iz * SZ, r = Math.hypot(x, z); if (r < R0 || r > R1) continue;
    const a = (Math.atan2(-z, x) * 180 / Math.PI + 360) % 360; let d = -1;
    DISTRICTS.forEach((D, i) => { const da = Math.abs(((a - D.angle + 540) % 360) - 180); if (da < 47) d = i; }); if (d < 0) continue;
    const rn = (r - R0) / (R1 - R0), block = 0.5 + 0.5 * Math.sin(ix * 0.9 + d) * Math.cos(iz * 0.7 - d * 2);
    const H = (DISTRICTS[d].final / 1.8) * (1.0 + 23 * Math.pow(rn, 1.5) * (0.3 + 0.5 * block + 0.45 * rnd()));
    rnd(); rnd(); towers.push({ x, z, H, seed: rnd() });
  }
  // How far each tower can lean over its nearest street, and when the first voice reaches it.
  for (const w of towers) {
    let best = null;
    for (const av of AVENUES) { const a = av * Math.PI / 180, ux = Math.cos(a), uz = -Math.sin(a), along = w.x * ux + w.z * uz, px = w.x - along * ux, pz = w.z - along * uz, perp = Math.hypot(px, pz); if (along > 0 && (!best || perp < best.perp)) best = { along, px, pz, perp }; }
    const gap = Math.max(0, best.perp - TAN_AV * best.along), k = Math.exp(-gap / 5.5) * ease((best.along - 3) / 6), D = Math.min(0.34 * w.H, 0.62 * (best.perp - 0.5)) * k;
    w.lx = -best.px / best.perp * D; w.lz = -best.pz / best.perp * D;
    w.tH = T_VOICE1 + Math.hypot(w.x - SP.one.hover[0], w.H - SP.one.hover[1], w.z - SP.one.hover[2]) / RING_V;
  }

  const uni = { uT: { value: 0 }, uCamD: { value: 60 }, uPulse: { value: 0 }, uWarm: { value: 0.8 }, uWarmT: { value: 0.8 }, uDim: { value: 1 }, uLean: { value: 0 }, uPress: { value: 0 }, uWarmR: { value: 0 },
    uS: { value: [0, 1, 2].map(() => new THREE.Vector4(0, -50, 0, 0)) }, uV: { value: [0, 1].map(() => new THREE.Vector4(0, 0, 0, -1)) }, uL3: { value: new V3(0, -50, 0) }, uIn: { value: 1 }, uProj: { value: 1000 }, uPx: { value: 1 }, uCoral: { value: 0 } };

  // Sky and ground.
  scene.add(new THREE.Mesh(keep(new THREE.SphereGeometry(700, 24, 12)), keep(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: uni,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uDim; varying vec3 vD; void main(){ float k = smoothstep(0.0, 0.45, normalize(vD).y); gl_FragColor = vec4(mix(vec3(0.071,0.149,0.227) * mix(0.72, 1.0, uDim), vec3(0.043,0.078,0.125), k), 1.0); }' }))));
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(1400, 1400)), keep(new THREE.ShaderMaterial({ uniforms: uni,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      ${COMMON} uniform float uCoral; uniform vec3 uL3; varying vec3 vW;
      void main(){
        float r = length(vW.xz); vec3 c = vec3(0.036, 0.066, 0.108);
        vec2 g = vW.xz / vec2(${SX.toFixed(3)}, ${SZ.toFixed(3)}) + 0.5; vec2 fw = fwidth(g); vec2 l = abs(fract(g) - 0.5);
        float line = max(smoothstep(0.5 - fw.x * 1.5, 0.5, l.x), smoothstep(0.5 - fw.y * 1.5, 0.5, l.y)) * clamp(1.0 - max(fw.x, fw.y) * 2.5, 0.0, 1.0);
        c += vec3(0.07, 0.2, 0.2) * line * smoothstep(${(R1 + 14).toFixed(1)}, ${R0.toFixed(1)}, r) * 0.55; c *= uDim;
        // the lattice the crowd is pressed into: the only coral in the film's city
        float ax = abs(vW.x), inAv = step(${(X0 - DX / 2).toFixed(3)}, ax) * smoothstep(0.0, 0.3, ${TAN_AV.toFixed(4)} * vW.z - 0.62 - ax) * step(${(Z0 - DZ / 2).toFixed(3)}, vW.z) * step(vW.z, ${(Z0 + 33.5 * DZ).toFixed(3)});
        vec2 cg = vec2((ax - ${(X0 - DX / 2).toFixed(3)}) / ${DX}, (vW.z - ${(Z0 - DZ / 2).toFixed(3)}) / ${DZ}); vec2 cf = fwidth(cg), cl = abs(fract(cg) - 0.5);
        float aisle = step(mod(floor(cg.y), 7.0), 5.5);
        float lat = max(smoothstep(0.5 - max(cf.x * 1.5, 0.06), 0.5, cl.x), smoothstep(0.5 - max(cf.y * 1.5, 0.06), 0.5, cl.y)) * clamp(1.0 - max(cf.x, cf.y) * 1.4, 0.0, 1.0);
        float rel = smoothstep(0.0, 2.5, uWarmR - r), held = inAv * aisle * uPress * (1.0 - rel);
        c += vec3(1.0, 0.42, 0.37) * held * (lat * (0.34 + 0.9 * uCoral) + 0.045 + 0.1 * uCoral) * mix(0.75, 1.0, uDim);
        // the page's warmth, which reaches further once the third light arrives
        float pool = (0.62 * exp(-r * 0.42) + 0.16 * exp(-r * 0.1)) * (0.72 + 0.5 * uPulse) * uWarm;
        pool += 0.1 * smoothstep(uWarmR + 1.0, uWarmR - 9.0, r) * step(0.01, uWarmR);
        c += vec3(1.0, 0.71, 0.3) * pool;
        c += speakers(vW, vec3(0.0, 1.0, 0.0)) * 0.6;
        c += vec3(1.0, 0.8, 0.45) * (shells(vW, uV[0]) * 0.34 + shells(vW, uV[1]) * 0.2);
        c += vec3(1.0, 0.8, 0.45) * exp(-pow((r - uWarmR) / 0.6, 2.0)) * 0.3 * step(0.01, uWarmR);
        gl_FragColor = vec4(fogMix(c, distance(cameraPosition, vW), 1.0), 1.0);
      }` })));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  // Towers: one instanced stack each; the lean and the emptying of the mark are worked out in the shaders from t.
  const box = new THREE.BoxGeometry(1, 1, 1, 1, 7, 1), tg = keep(new THREE.InstancedBufferGeometry()); tg.index = box.index; tg.setAttribute('position', box.attributes.position); tg.setAttribute('normal', box.attributes.normal);
  const aA = new Float32Array(towers.length * 4), aB = new Float32Array(towers.length * 3);
  towers.forEach((w, i) => { aA.set([w.x, w.z, w.H, w.seed], i * 4); aB.set([w.lx, w.lz, w.tH], i * 3); });
  tg.setAttribute('aA', new THREE.InstancedBufferAttribute(aA, 4)); tg.setAttribute('aB', new THREE.InstancedBufferAttribute(aB, 3)); tg.instanceCount = towers.length;
  const towerMesh = new THREE.Mesh(tg, keep(new THREE.ShaderMaterial({ uniforms: uni,
    vertexShader: /* glsl */`
      ${COMMON} attribute vec4 aA; attribute vec3 aB; varying vec3 vW; varying vec3 vN; varying vec4 vI; varying vec3 vLoc;
      void main(){
        float f = position.y + 0.5, h = aA.z, b = f * f * uLean;
        vec3 p = vec3(aA.x + position.x * 1.02 + aB.x * b, f * h - length(aB.xy) * b * 0.18, aA.y + position.z * 0.74 + aB.y * b);
        float hol = smoothstep(aB.z, aB.z + 0.9, uT);
        vW = p; vN = normal; vI = vec4(h, hol, aA.w, 0.0); vLoc = vec3(position.x, f * h, position.z);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${COMMON} varying vec3 vW; varying vec3 vN; varying vec4 vI; varying vec3 vLoc;
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        vec3 n = normalize(vN); float top = step(0.5, n.y), ly = vLoc.y / 0.115, fw = fwidth(ly), f = fract(ly), hol = vI.y;
        float seam = mix(1.0, smoothstep(0.0, 0.22, f) * smoothstep(1.0, 0.8, f), clamp(1.0 - fw * 1.6, 0.0, 1.0));
        float shade = 0.8 + 0.4 * hash(floor(ly) + vI.z * 91.0) * clamp(1.0 - fw, 0.0, 1.0);
        float face = top > 0.5 ? 1.0 : (abs(n.z) > 0.5 ? (n.z > 0.0 ? 0.62 : 0.3) : (n.x > 0.0 ? 0.42 : 0.34));
        float ao = mix(0.4, 1.0, smoothstep(0.0, 5.0, vLoc.y)) * mix(0.8, 1.25, smoothstep(vI.x - 6.0, vI.x, vLoc.y));
        vec3 c = mix(vec3(0.05, 0.11, 0.16), vec3(0.13, 0.33, 0.37), face) * shade * mix(0.45, 1.0, seam) * ao;
        if (top < 0.5) c += vec3(0.2, 0.5, 0.48) * smoothstep(vI.x - 0.22, vI.x - 0.05, vLoc.y) * 0.55 * mix(1.0, 0.4, hol);
        vec3 teal = vec3(0.37, 0.82, 0.77); float flick = 1.0 + 0.7 * sin(uT * 37.0 + vI.z * 60.0) * 4.0 * hol * (1.0 - hol);
        // the top badge: the same seal and two rules on every stack; the rules go when the mark is emptied
        if (top > 0.5) { vec2 q = vLoc.xz + 0.5; float ring = abs(length((q - vec2(0.27, 0.5)) * vec2(1.38, 1.0)) - 0.2);
          float mark = (1.0 - smoothstep(0.03, 0.07, ring)) * mix(1.0, 0.6, hol) + (1.0 - hol) * step(0.55, q.x) * step(q.x, 0.9) * (step(abs(q.y - 0.36), 0.035) + step(abs(q.y - 0.62), 0.035));
          float edge = max(abs(q.x - 0.5), abs(q.y - 0.5));
          c = mix(vec3(0.16, 0.42, 0.44) * mix(1.0, 0.72, hol), teal, clamp(mark, 0.0, 1.0) * 0.8 + smoothstep(0.44, 0.5, edge) * 0.5); }
        // the same mark, stamped on the faces as a lit sign: a full seal that thins to an empty outline
        else if (n.z > 0.5 || abs(n.x) > 0.5) { float ms = clamp(vI.x / 1.7, 0.35, 1.0);
          vec2 mq = vec2(n.z > 0.5 ? vLoc.x * 1.02 : vLoc.z * 0.74, vLoc.y - (vI.x - 0.66 * ms)) / ms; float rr = length(mq), e = max(0.03, fwidth(rr) * 1.3), R = 0.31, inner = (R - 0.042) * hol;
          float disc = smoothstep(R + e * 0.5, R - e * 0.5, rr) * smoothstep(inner - e * 0.5, inner + e * 0.5, rr + 0.0001 - step(hol, 0.0005));
          float ey = max(0.02, fwidth(mq.y) * 1.3), rules = (1.0 - hol) * step(abs(mq.x), 0.3) * (smoothstep(0.04 + ey, 0.04, abs(mq.y + 0.5)) + step(mq.x, 0.12) * smoothstep(0.04 + ey, 0.04, abs(mq.y + 0.66)));
          float side = n.z > 0.5 ? 1.0 : 0.7;
          c = mix(c, mix(vec3(0.5, 1.0, 0.94) * 1.25, teal * 0.6, hol) * flick * side, clamp(disc, 0.0, 1.0)); c += teal * rules * 0.55 * side;
          c += teal * (1.0 - hol) * 0.34 * exp(-rr * rr * 2.4) * side * flick; }
        c *= uDim;
        // the page is the only steady warm light: it reaches the nearest stacks and no further
        vec3 L = vec3(0.0, 0.7, 0.0) - vW; float d2 = dot(L, L), facing = max(dot(n, normalize(L)), 0.0);
        c += vec3(1.0, 0.72, 0.32) * (facing * 0.9 + 0.08) * 70.0 / (d2 + 30.0) * (0.75 + 0.45 * uPulse) * uWarmT;
        c += speakers(vW, n);
        c += vec3(1.0, 0.8, 0.45) * (shells(vW, uV[0]) * 0.55 + shells(vW, uV[1]) * 0.28);
        c += vec3(1.0, 0.8, 0.45) * exp(-pow((length(vW.xz) - uWarmR) / 0.6, 2.0)) * 0.16 * step(0.01, uWarmR) * exp(-vW.y * 0.25);
        gl_FragColor = vec4(fogMix(c, distance(cameraPosition, vW), 0.82), 1.0);
      }` })));
  towerMesh.frustumCulled = false; scene.add(towerMesh);

  // The crowd: one small light per person, loose at first, then pressed into rows on the lattice.
  const people = [];
  const addAvenue = (deg, main) => { const a = (deg - 270) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    for (let j = 0; j < 34; j++) { if (j % 7 === 6) continue; const z = Z0 + j * DZ, half = TAN_AV * z - 0.75;
      for (let i = 0; X0 + i * DX < half; i++) for (const s of [-1, 1]) { const x = s * (X0 + i * DX), ang = rnd() * 6.2832, rad = 0.25 + 1.5 * rnd();
        let hx = Math.cos(ang) * rad, hz = Math.sin(ang) * rad * 1.3; const lim = TAN_AV * (z + hz) - 0.4; hx = clamp(x + hx, -lim, lim) - x;
        people.push({ x: x * ca + z * sa, z: -x * sa + z * ca, hx: hx * ca + hz * sa, hz: -hx * sa + hz * ca, seed: rnd(), main, gx: x, gz: z }); } } };
  AVENUES.forEach((deg, i) => addAvenue(deg, i === 0));
  for (let ix = -11; ix <= 11; ix++) for (let iz = -9; iz <= 9; iz++) { const x = (ix + 0.5) * DX, z = (iz + 0.5) * DZ, r = Math.hypot(x, z); if (r < 3.0 || r > 5.9 || (Math.abs(x) < 0.5 && z > 0)) continue; const ang = rnd() * 6.2832, rad = 0.2 + 0.7 * rnd(); people.push({ x, z, hx: Math.cos(ang) * rad, hz: Math.sin(ang) * rad, seed: rnd(), main: false }); }
  const nearest = (x, z) => { let b = 0, bd = 1e9; people.forEach((p, i) => { if (!p.main || p.gone) return; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; b = i; } }); return people[b]; };
  const p1 = nearest(-2.6, 21); p1.gone = SP.one.rise; const p2 = nearest(3.1, 17.5); p2.gone = SP.two.rise; const p3 = nearest(X0, Z0 + 33 * DZ + 2); p3.gone = SP.three.out;
  const NPPL = people.length, pA = new Float32Array(NPPL * 4), pB = new Float32Array(NPPL * 2), pPos = new Float32Array(NPPL * 3);
  people.forEach((p, i) => { pA.set([p.x, p.z, p.hx, p.hz], i * 4); pB.set([p.seed, p.gone || 999], i * 2); });
  const pg = keep(new THREE.BufferGeometry()); pg.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pg.setAttribute('aP', new THREE.BufferAttribute(pA, 4)); pg.setAttribute('aQ', new THREE.BufferAttribute(pB, 2));
  const crowd = new THREE.Points(pg, keep(new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      ${COMMON} attribute vec4 aP; attribute vec2 aQ; uniform vec3 uL3; uniform float uProj, uPx, uIn; varying vec4 vC;
      void main(){
        float s = aQ.x, r = length(aP.xy);
        float pr = smoothstep(0.0, 1.0, uPress * 1.3 - s * 0.3), rel = smoothstep(0.0, 2.5, uWarmR - r - s * 1.5), k = pr * (1.0 - rel);
        vec2 wander = vec2(sin(uT * (0.5 + s) + s * 40.0) + 0.5 * sin(uT * 1.3 + s * 91.0), cos(uT * (0.4 + s * 0.7) + s * 17.0) + 0.5 * cos(uT * 1.1 + s * 55.0)) * 0.2;
        vec2 loose = mix(aP.zw, aP.zw * 0.55, rel) + wander * mix(1.0, 1.5, rel);
        vec3 p = vec3(aP.x + loose.x * (1.0 - k), mix(0.36 + 0.09 * sin(uT * 1.4 + s * 30.0) + 0.35 * rel * (0.5 + 0.5 * sin(uT * 0.9 + s * 70.0)), 0.13, k), aP.y + loose.y * (1.0 - k));
        vec3 dl = uL3 - p; float near3 = exp(-dot(dl.xz, dl.xz) / 3.2);
        vec3 col = mix(vec3(0.78, 0.82, 0.8) * 0.62, vec3(1.0, 0.42, 0.37) * 0.8, pr);
        col = mix(col, vec3(1.0, 0.78, 0.34) * 1.25, rel); col = mix(col, vec3(1.0, 0.76, 0.36), near3 * 0.85 * (1.0 - rel));
        float tw = mix(0.78 + 0.22 * sin(uT * (2.0 + s * 3.0) + s * 80.0), 1.0, k);
        float dim = mix(mix(0.62, 1.0, uDim), 1.0, max(rel, near3));
        vec4 mv = viewMatrix * vec4(p, 1.0); float sz = mix(0.36, 0.25, k) * (1.0 + 0.35 * rel + 0.3 * near3) * uProj / max(-mv.z, 0.5), m = 2.6 * uPx;
        vC = vec4(col * tw * dim, min(1.0, sz / m) * uIn * (1.0 - smoothstep(aQ.y - 0.1, aQ.y + 0.5, uT)));
        gl_PointSize = clamp(max(sz, m), 0.0, 64.0 * uPx); gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: 'precision highp float; varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = (exp(-d * d * 4.5) * 0.5 + exp(-d * d * 30.0) * 1.1) * smoothstep(1.0, 0.7, d); gl_FragColor = vec4(vC.rgb * vC.a * a, 1.0); }' })));
  crowd.frustumCulled = false; crowd.renderOrder = 6; scene.add(crowd);

  // The three speakers: each a warm light with a short trail, placed in closed form from t.
  const TRAIL = 34, LAG = 0.035, NG = 3 * TRAIL, gPos = new Float32Array(NG * 3), gCol = new Float32Array(NG * 4), gSize = new Float32Array(NG);
  const gg = keep(new THREE.BufferGeometry()); gg.setAttribute('position', new THREE.BufferAttribute(gPos, 3)); gg.setAttribute('aCol', new THREE.BufferAttribute(gCol, 4)); gg.setAttribute('aSize', new THREE.BufferAttribute(gSize, 1));
  const spk = new THREE.Points(gg, keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: uni,
    vertexShader: `attribute vec4 aCol; attribute float aSize; uniform float uProj, uPx; varying vec4 vC;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float s = aSize * uProj / max(-mv.z, 0.5), m = 5.0 * uPx; vC = aCol; vC.a *= min(1.0, s / m); gl_PointSize = clamp(max(s, m), 0.0, 420.0 * uPx); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'precision highp float; varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = (exp(-d * d * 5.0) * 0.55 + exp(-d * d * 42.0) * 1.3) * smoothstep(1.0, 0.75, d); gl_FragColor = vec4(mix(vC.rgb, vec3(1.0, 0.97, 0.9), exp(-d * d * 60.0) * 0.7) * vC.a * a, 1.0); }' })));
  spk.frustumCulled = false; spk.renderOrder = 8; scene.add(spk);
  const home = [p1, p2, p3].map((p) => [p.x + p.hx, 0.36, p.z + p.hz]); home[2] = [p3.x, 0.13, p3.z];
  const talk = (t, a, b) => ease((t - a) / 0.5) * (1 - ease((t - b) / 0.6)) * (0.5 + 0.5 * Math.sin(t * 8.3) * Math.sin(t * 2.9 + 1));
  function speaker(i, t, o) { // sets o to the position, returns the brightness
    const gather = ease((t - 33.6 - i * 0.5) / 3.6);
    if (i < 2) { const S = i ? SP.two : SP.one, u = ease((t - S.rise) / 2.3), h = S.hover, e = i ? [2.5, 4.6, 1.6] : [-2.9, 5.3, 1.0], bob = Math.sin(t * 0.9 + i * 2) * 0.22 * u;
      const hx = h[0] + Math.sin(t * 0.37 + i) * 0.3, hy = h[1] + bob;
      o.set(mix(mix(home[i][0], hx, u), e[0], gather), mix(mix(home[i][1], hy, Math.pow(u, 0.8)), e[1] + bob, gather), mix(mix(home[i][2], h[2], u), e[2], gather));
      const lit = ease((t - S.rise + 0.3) / 0.8), sp = i ? talk(t, 10.8, 19.0) : talk(t, 2.8, 8.6), rest = i ? mix(1, 0.55, ease((t - 19.3) / 1.5)) : mix(1, 0.5, ease((t - 9.2) / 1.5));
      return lit * (0.8 + 0.5 * sp) * mix(rest, 0.95, gather); }
    const S = SP.three, u = ease((t - S.out) / 2.4), g = ease((t - S.go) / S.len), st = S.stand, e = S.end, ach = Math.exp(-Math.pow((t - 23.4) / 1.1, 2));
    o.set(mix(mix(home[2][0], st[0], u), e[0], g) + Math.sin(g * 9.4) * 0.22 * Math.sin(g * Math.PI), mix(mix(home[2][1], st[1], u), e[1], g) + Math.sin(t * 1.1) * 0.05 - 0.3 * ach * (1 - g), mix(mix(home[2][2], st[2], u), e[2], g));
    return ease((t - S.out + 0.2) / 0.9) * (0.92 - 0.3 * ach + 0.1 * talk(t, 21, 27.3) + 0.35 * ease((t - T_ARRIVE + 0.4) / 1.2));
  }

  // The page: warm paper with abstract rules (a heading, four pairs, a block), no words. The four pairs can light.
  const pageU = { uLit: { value: [0, 0, 0, 0] }, uHot: { value: 0 } };
  const page = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.6, 2.26)), keep(new THREE.ShaderMaterial({ uniforms: pageU, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uLit[4]; uniform float uHot; varying vec2 vUv;
      float box(vec2 p, vec2 a, vec2 b){ vec2 c = (a + b) * 0.5, h = (b - a) * 0.5, d = abs(p - c) - h; return length(max(d, 0.0)); }
      void main(){
        vec2 p = vec2(vUv.x, 1.0 - vUv.y); vec2 e = abs(vUv - 0.5) * 2.0; float rim = pow(max(e.x, e.y), 5.0), aa = max(fwidth(p.y) * 1.2, 0.0015);
        vec3 paper = mix(vec3(1.0, 0.95, 0.82), vec3(0.66, 0.42, 0.16), 0.2 + 0.8 * uHot) + vec3(0.2, 0.12, 0.02) * rim * (1.0 - uHot * 0.4), ink = vec3(0.14, 0.2, 0.29);
        vec3 c = paper; float m = 1.0 - smoothstep(0.0, aa, box(p, vec2(0.19, 0.097), vec2(0.81, 0.124))); c = mix(c, ink, m * 0.86);
        for (int i = 0; i < 9; i++) { float y = (430.0 + 27.0 * float(i)) / 724.0, w = i == 8 ? 0.35 : (372.0 - mod(float(i) * 37.0, 60.0)) / 512.0; c = mix(c, ink, (1.0 - smoothstep(0.0, aa, box(p, vec2(0.137, y), vec2(0.137 + w, y + 0.011)))) * 0.3); }
        for (int i = 0; i < 4; i++) { float fi = float(i), y = (146.0 + 64.0 * fi) / 724.0, wa = (200.0 + mod(fi, 2.0) * 40.0) / 512.0, wb = (300.0 - mod(fi, 3.0) * 36.0) / 512.0, k = uLit[i];
          float da = box(p, vec2(0.137, y), vec2(0.137 + wa, y + 0.024)), db = box(p, vec2(0.137, y + 0.04), vec2(0.137 + wb, y + 0.052));
          c = mix(c, mix(ink, vec3(1.0, 0.985, 0.9), k), (1.0 - smoothstep(0.0, aa, da)) * mix(0.8, 1.0, k)); c = mix(c, mix(ink, vec3(1.0, 0.93, 0.72), k), (1.0 - smoothstep(0.0, aa, db)) * mix(0.38, 0.85, k));
          c += vec3(1.0, 0.82, 0.45) * k * (exp(-da * 55.0) * 0.5 + exp(-da * 16.0) * 0.16); }
        gl_FragColor = vec4(c, 1.0);
      }` }))); page.renderOrder = 7; scene.add(page);
  const gc = document.createElement('canvas'); gc.width = gc.height = 256; const gx = gc.getContext('2d'), grad = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,214,130,1)'); grad.addColorStop(0.16, 'rgba(255,200,87,0.55)'); grad.addColorStop(0.45, 'rgba(255,170,70,0.13)'); grad.addColorStop(1, 'rgba(255,160,60,0)'); gx.fillStyle = grad; gx.fillRect(0, 0, 256, 256);
  const glowTex = keep(new THREE.CanvasTexture(gc)); glowTex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, toneMapped: false }))); glow.renderOrder = 5; scene.add(glow);

  // The press, as the badge factory left it: still pounding at first, and it stops for good in the third segment.
  const press = new THREE.Group(), metal = keep(new THREE.MeshStandardMaterial({ color: 0x4a637c, roughness: 0.5, metalness: 0.35 })), geo = (g) => keep(g);
  const bed = new THREE.Mesh(geo(new THREE.BoxGeometry(2.5, 0.36, 3.2)), metal); bed.position.y = 0.18; press.add(bed);
  const postG = geo(new THREE.CylinderGeometry(0.07, 0.08, 3.4, 12)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const m = new THREE.Mesh(postG, metal); m.position.set(sx * 1.32, 1.7, sz * 1.68); press.add(m); }
  const head = new THREE.Group(), longG = geo(new THREE.BoxGeometry(0.3, 0.3, 3.66)), shortG = geo(new THREE.BoxGeometry(2.34, 0.3, 0.3));
  for (const s of [-1, 1]) { const a = new THREE.Mesh(longG, metal); a.position.x = s * 1.32; head.add(a); const b = new THREE.Mesh(shortG, metal); b.position.z = s * 1.7; head.add(b); } press.add(head); scene.add(press);
  const lamp = new THREE.PointLight(0xffc857, 14, 0, 2); lamp.position.set(0, 0.9, 0); scene.add(lamp); scene.add(new THREE.HemisphereLight(0x5fd0c5, 0x0b1420, 0.6)); const rim = new THREE.DirectionalLight(0x5fd0c5, 1.6); rim.position.set(-3, 6, -5); scene.add(rim);
  // press strokes: the factory's rattle slows to a heavy beat, then one last stroke at 19 s
  const stamps = []; for (let s = 0.1, gap = 0.2; s < 19.2; s += gap, gap = Math.min(1.45, gap * 1.3)) stamps.push(s);
  const lastStamp = (t) => { let i = -1; while (i + 1 < stamps.length && stamps[i + 1] <= t) i++; return i; };

  // Words: the four quotations, drawn on 2D canvases when the frame size is known and laid over the picture.
  const hud = new THREE.Scene(), hudCam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1), unit = keep(new THREE.PlaneGeometry(1, 1));
  const scrimU = { uA: { value: 0 } }, scrim = new THREE.Mesh(unit, keep(new THREE.ShaderMaterial({ uniforms: scrimU, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ vec2 d = max(abs(vUv - 0.5) * 2.0 - vec2(0.55, 0.4), 0.0) / vec2(0.45, 0.6); gl_FragColor = vec4(0.043, 0.078, 0.125, uA * smoothstep(1.0, 0.0, length(d))); }' }))); hud.add(scrim);
  const texts = QUOTES.map(() => { const c = document.createElement('canvas'), tex = keep(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    const mesh = new THREE.Mesh(unit, keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }))); mesh.renderOrder = 2; hud.add(mesh); return { c, tex, mesh }; });
  function layoutText(w, h, portrait) {
    const F = Math.round(portrait ? w * 0.056 : h * 0.052), bw = Math.round(portrait ? w * 0.86 : w * 0.43), pad = Math.round(F * 0.8), lh = Math.round(F * 1.3);
    texts.forEach((T, i) => { const Q = QUOTES[i], x = T.c.getContext('2d'); x.font = `400 ${F}px ${SERIF}`;
      const lines = []; let cur = ''; for (const word of Q.q.split(' ')) { const tryL = cur ? cur + ' ' + word : word; if (x.measureText(tryL).width > bw && cur) { lines.push(cur); cur = word; } else cur = tryL; } lines.push(cur);
      const ch = pad * 2 + lines.length * lh + Math.round(F * 1.5); T.c.width = bw + pad * 2; T.c.height = ch; const c = T.c.getContext('2d');
      c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.shadowColor = 'rgba(11,20,32,0.95)'; c.shadowBlur = F * 0.5;
      for (let pass = 0; pass < 2; pass++) { // twice, so the soft shadow is dense enough to keep the words clear of the picture
        c.font = `400 ${F}px ${SERIF}`; c.fillStyle = INK; lines.forEach((l, k) => c.fillText(l, pad, pad + F * 0.95 + k * lh));
        const ay = pad + lines.length * lh + F * 0.95; c.fillStyle = AMBER; c.fillRect(pad, ay - F * 0.23, F * 0.9, Math.max(2, F * 0.055)); // a short rule, not a dash
        c.font = `600 ${Math.round(F * 0.62)}px ${SANS}`; c.fillText(Q.by, pad + F * 1.25, ay); }
      T.tex.needsUpdate = true; T.tex.dispose(); T.w = T.c.width; T.h = T.c.height; T.pad = pad;
      T.mesh.scale.set(T.w, T.h, 1); T.mesh.position.set((portrait ? w * 0.07 : w * 0.05) - pad + T.w / 2, h * (portrait ? 0.955 : 0.93) + pad - T.h / 2, 0); });
  }

  // Camera: keyed positions joined by a smooth curve, so the whole 39 seconds is one move.
  const KEYS = {
    land: [[0, 0, 19.3, 64.5, 0, 5.5, 0], [4.5, -5.5, 10.5, 43, 0, 5, 6], [9, -3.5, 10.5, 41, 0, 4, 9], [12.5, 1.2, 12.5, 41.5, 0, 1.2, 16], [19, 0.6, 10.5, 39.5, 0, 1.6, 16], [22.3, 1.9, 3.0, 37.2, 0, 2.1, 16], [28.2, 1.5, 3.2, 36.4, 0, 2.0, 16],
      [29.8, 1.3, 3.1, 32.5, 0, 1.4, 19], [30.9, 1.2, 3.6, 24, 0, 1.3, 10.5], [32, 1.4, 4.2, 16.5, 0, 1.4, 4], [33.6, 1.9, 4.6, 12.2, 0, 2.2, 0.5], [36.5, 2.3, 5.0, 12.6, 0, 2.7, 0.5], [39, 4.4, 9.2, 22, 0, 2.6, 3]],
    port: [[0, 0, 56, 114, 0, 13, 0], [4.5, -4, 19, 58, 0, 10.5, 8], [9, -2.5, 18, 54, 0, 9.5, 10], [12.5, 0.8, 22, 56, 0, 6, 17], [19, 0.4, 19, 53, 0, 6.5, 17], [22.3, 1.2, 4.2, 40.5, 0, 3.6, 15], [28.2, 1.0, 4.4, 39.8, 0, 3.4, 15],
      [29.8, 0.9, 3.6, 35, 0, 2.6, 19], [30.9, 0.8, 4.2, 26.5, 0, 2.4, 10.5], [32, 0.9, 5.0, 19, 0, 2.4, 4], [33.6, 1.2, 5.6, 15.5, 0, 3.4, 0.5], [36.5, 1.5, 6.2, 16, 0, 3.8, 0.5], [39, 2.6, 12, 28, 0, 5.2, 3]],
  };
  const camOut = new Float32Array(6);
  function camAt(t, K) { let i = 0; while (i < K.length - 2 && K[i + 1][0] <= t) i++; const a = K[i], b = K[i + 1], dt = b[0] - a[0], u = clamp((t - a[0]) / dt), u2 = u * u, u3 = u2 * u, p = K[i - 1], n = K[i + 2];
    for (let j = 1; j < 7; j++) { const m0 = p ? (b[j] - p[j]) / (b[0] - p[0]) : 0, m1 = n ? (n[j] - a[j]) / (n[0] - a[0]) : 0; camOut[j - 1] = (2 * u3 - 3 * u2 + 1) * a[j] + (u3 - 2 * u2 + u) * dt * m0 + (-2 * u3 + 3 * u2) * b[j] + (u3 - u2) * dt * m1; } }

  let W = 0, Hh = 0; const v = new V3(), target = new V3(), sp = new V3();
  function render(tIn, w, h) {
    const t = reduced ? STILL_T : clamp(tIn, 0, meta.seconds), portrait = h > w;
    if (w !== W || h !== Hh) { W = w; Hh = h; renderer.setSize(w, h, false); hudCam.right = w; hudCam.top = h; hudCam.updateProjectionMatrix();
      camera.fov = portrait ? 50 : 38; camera.clearViewOffset(); camera.aspect = w / h; camera.updateProjectionMatrix(); uni.uProj.value = h / (2 * Math.tan(camera.fov * Math.PI / 360)); uni.uPx.value = Math.max(1, Math.min(w, h) / 720); layoutText(w, h, portrait); }

    // the press and the page
    const si = lastStamp(t), since = si >= 0 ? t - stamps[si] : 9, pulse = si >= 0 ? Math.exp(-since * 6) : 0; let k = 0;
    if (si >= 0) { const gap = (stamps[si + 1] || 99) - stamps[si]; k = 1 - ease(since / Math.min(0.34, gap * 0.55)); }
    const next = stamps[si + 1]; if (next - t < 0.11) k = Math.max(k, Math.pow(1 - (next - t) / 0.11, 2));
    const free = ease((t - T_ARRIVE + 0.5) / 2.4); head.position.y = mix(2.35, 0.56, k);
    page.position.set(0, mix(0.385, 3.75, free) + Math.sin(t * 1.3) * 0.05 * free, mix(0, 0.5, free)); page.rotation.set(mix(-Math.PI / 2, -0.2, ease((t - T_ARRIVE + 0.1) / 2.2)), mix(0, 0.1 + Math.sin(t * 0.6) * 0.04, free), 0);
    for (let i = 0; i < 4; i++) pageU.uLit.value[i] = ease((t - T_ARRIVE - 0.9 - i * 0.55) / 0.8); pageU.uHot.value = ease((t - 30) / 3);

    // the three speakers
    const lean = CLUNKS.reduce((s, c) => s + ease((t - c) / 0.42), 0) / CLUNKS.length, clunk = CLUNKS.reduce((s, c) => s + (t > c + 0.3 ? Math.exp(-(t - c - 0.3) * 4) : 0), 0);
    for (let i = 0; i < 3; i++) for (let j = 0; j < TRAIL; j++) { const n = i * TRAIL + j, b = speaker(i, t - j * LAG, sp), kk = 1 - j / TRAIL; gPos.set([sp.x, sp.y, sp.z], n * 3);
      if (j === 0) { gSize[n] = (i === 2 ? 0.95 : 2.3) * (0.75 + 0.25 * b); gCol.set([1, 0.784, 0.341, Math.min(1, b)], n * 4); uni.uS.value[i].set(sp.x, sp.y, sp.z, b * (i === 2 ? 0.55 : 1.2) * (1 - 0.6 * ease((t - 33) / 3))); if (i === 2) uni.uL3.value.copy(sp); }
      else { gSize[n] = (i === 2 ? 0.95 : 2.3) * (0.16 + 0.5 * kk * kk); gCol.set([1, 0.72, 0.3, 0.4 * kk * kk * Math.min(1, b)], n * 4); } }
    gg.attributes.position.needsUpdate = gg.attributes.aCol.needsUpdate = gg.attributes.aSize.needsUpdate = true;
    uni.uV.value[0].set(...SP.one.hover, t - T_VOICE1); uni.uV.value[1].set(...SP.two.hover, t - 11.0);

    // camera (in landscape the street slides right of centre as the words arrive on the left)
    if (!portrait) { const off = 1 + 0.2 * ease(t / 3.2); camera.aspect = w * off / h; camera.setViewOffset(w * off, h, 0, 0, w, h); }
    camAt(t, portrait ? KEYS.port : KEYS.land); const shake = (pulse * 0.25 + clunk * 0.9) * 0.05 * Math.sin(t * 70), still = 1 - 0.8 * ease((t - 20.5) / 2) * (1 - ease((t - 27.6) / 1.2));
    camera.position.set(camOut[0] + Math.sin(t * 0.21) * 0.5 * still, camOut[1] + Math.sin(t * 0.33 + 1) * 0.12 * still + shake, camOut[2]); target.set(camOut[3], camOut[4], camOut[5]); camera.lookAt(target);
    const dCam = camera.position.distanceTo(target);

    const warmR = t < T_ARRIVE ? 0 : 1.5 + 14.5 * (1 - Math.exp(-(t - T_ARRIVE) / 2.3));
    uni.uT.value = t; uni.uCamD.value = mix(Math.max(18, dCam * 0.95), 13, ease((t - 19.5) / 2.5) * (1 - ease((t - 28.5) / 3))); uni.uPulse.value = pulse; uni.uLean.value = lean; uni.uPress.value = lean; uni.uCoral.value = Math.min(1, clunk);
    uni.uDim.value = 1 - 0.5 * ease((t - 19.2) / 2.6) + 0.22 * ease((t - 28.4) / 4); uni.uWarm.value = 0.8 * (1 - 0.45 * ease((t - 19.2) / 2.6)) + 0.75 * ease((t - T_ARRIVE) / 2.5); uni.uWarmR.value = warmR; uni.uWarmT.value = 0.8 * (1 - 0.45 * ease((t - 19.2) / 2.6)) * (1 - 0.35 * ease((t - 30) / 4)); uni.uIn.value = ease((t + 0.3) / 1.6);
    lamp.intensity = 10 + 12 * pulse + 14 * free;
    glow.position.copy(page.position); const gs = (4.0 + dCam * 0.04) * (1 + 0.1 * pulse + 0.03 * Math.sin(t * 2.1)) * (1 + 0.5 * free); glow.scale.set(gs, gs, 1); glow.material.opacity = mix(0.9, 0.55, ease((t - 30) / 3)) + 0.25 * free;

    // words
    let block = 0, by = 0, bh = 0;
    texts.forEach((T, i) => { const Q = QUOTES[i], o = reduced ? (i === 3 ? 1 : 0) : ease((t - Q.on) / 0.8) * (1 - ease((t - Q.off) / 0.5)); T.mesh.material.opacity = o; T.mesh.visible = o > 0.003; if (o > block) { block = o; by = T.mesh.position.y; bh = T.h; } });
    const T0 = texts[0]; scrim.scale.set(T0.w * 1.5, Math.max(bh, 1) * 1.7, 1); scrim.position.set(T0.mesh.position.x, by, 0); scrimU.uA.value = block * 0.62; scrim.visible = block > 0.003;

    renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(hud, hudCam);
  }
  return { render, dispose() { for (const x of trash) x.dispose(); box.dispose(); renderer.dispose(); } };
}
