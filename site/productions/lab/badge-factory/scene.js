// Badge factory: one glowing page, then a press that stamps it into towers of identical badges until the page is a speck.
// A lab scene (see ../harness.js for the contract). Every frame is a pure function of t: all motion is computed from t in
// the shaders or in closed form here, and the only randomness is a fixed-seed PRNG run once in create(). Apache-2.0.
export const meta = {
  id: 'badge-factory',
  title: 'The badge factory',
  beat: 'One page of values was stamped into millions of certificates, so the industry that grew around the idea now dwarfs the idea itself.',
  seconds: 13.5,
  sources: [
    { title: 'Scrum Alliance 2025 Annual Report', url: 'https://www.scrumalliance.org/about/annual-report-2025' },
    { title: 'Professional Scrum Certification Count', url: 'https://www.scrum.org/professional-scrum-certifications/count' },
    { title: 'About Scaled Agile', url: 'https://scaledagile.com/about/about-us/' },
  ],
};

const INK = '#f4f1e8', FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const DISTRICTS = [ // angle is the centre of the wedge, measured from +x towards -z (so 90 degrees is the back of the frame)
  { name: 'Scrum Alliance', final: 1.8, angle: 90 },
  { name: 'Scrum.org', final: 1.2, angle: 210 },
  { name: 'Scaled Agile', final: 1.0, angle: 330 },
];
const T_FIRST = 2.9, T_DONE = 9.8, STILL_T = 12.2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, mix = (a, b, k) => a + (b - a) * k;
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

const COMMON = /* glsl */`
  float growAt(float t, float t0, float dur) { float u = clamp((t - t0) / dur, 0.0, 1.0); return u * u * (3.0 - 2.0 * u); }
  vec3 fogMix(vec3 c, float dist, float camD, float amount) { float f = smoothstep(camD * 0.75 + 4.0, camD * 2.3 + 90.0, dist); return mix(c, vec3(0.071, 0.149, 0.227), f * amount); }
`;

export async function create({ canvas, THREE, reduced }) {
  const rnd = prng(20011), renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.autoClear = false; renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 1500), trash = [];
  const keep = (x) => { trash.push(x); return x; };

  // The press rhythm: slow, heavy stamps that speed up into a rattle and never stop.
  const stamps = []; for (let s = T_FIRST, gap = 0.72; s < meta.seconds + 1; s += gap, gap = Math.max(0.13, gap * 0.8)) stamps.push(s);
  const lastStamp = (t) => { let i = -1; while (i + 1 < stamps.length && stamps[i + 1] <= t) i++; return i; };

  // The city plan: a strict grid of stacks, in three wedges round the page, with avenues between them.
  const SX = 1.38, SZ = 1.12, R0 = 5.6, R1 = 31, towers = [];
  for (let ix = -24; ix <= 24; ix++) for (let iz = -29; iz <= 29; iz++) {
    const x = ix * SX, z = iz * SZ, r = Math.hypot(x, z); if (r < R0 || r > R1) continue;
    const a = (Math.atan2(-z, x) * 180 / Math.PI + 360) % 360; let d = -1;
    DISTRICTS.forEach((D, i) => { const da = Math.abs(((a - D.angle + 540) % 360) - 180); if (da < 47) d = i; }); if (d < 0) continue;
    const rn = (r - R0) / (R1 - R0), block = 0.5 + 0.5 * Math.sin(ix * 0.9 + d) * Math.cos(iz * 0.7 - d * 2);
    const H = (DISTRICTS[d].final / 1.8) * (1.0 + 23 * Math.pow(rn, 1.5) * (0.3 + 0.5 * block + 0.45 * rnd()));
    towers.push({ x, z, r, d, H, t0: 3.0 + 3.2 * rn + 0.5 * rnd(), dur: 2.2 + 0.9 * rnd(), seed: rnd() });
  }
  // What fraction of each district is built at time t (drives the counters, so numbers and towers rise together).
  const STEP = 0.05, table = DISTRICTS.map(() => []), totals = DISTRICTS.map((_, i) => towers.reduce((s, w) => s + (w.d === i ? w.H : 0), 0));
  for (let k = 0; k * STEP <= T_DONE + STEP; k++) { const sum = [0, 0, 0]; for (const w of towers) sum[w.d] += w.H * ease((k * STEP - w.t0) / w.dur); sum.forEach((s, i) => table[i].push(s / totals[i])); }
  const built = (i, t) => (t >= T_DONE ? 1 : table[i][Math.max(0, Math.floor(t / STEP))] || 0);

  // Sky and ground.
  const uni = { uT: { value: 0 }, uCamD: { value: 5 }, uPulse: { value: 0 }, uGrid: { value: 0 }, uWarm: { value: 1 } };
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(700, 24, 12)), keep(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vD; void main(){ float k = smoothstep(0.0, 0.45, normalize(vD).y); gl_FragColor = vec4(mix(vec3(0.071,0.149,0.227), vec3(0.043,0.078,0.125), k), 1.0); }' })));
  scene.add(sky);
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(1400, 1400)), keep(new THREE.ShaderMaterial({ uniforms: uni,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform float uCamD, uPulse, uGrid, uWarm; varying vec3 vW; ${COMMON}
      void main(){
        float r = length(vW.xz); vec3 c = vec3(0.036, 0.066, 0.108);
        vec2 g = vW.xz / vec2(${SX.toFixed(3)}, ${SZ.toFixed(3)}) + 0.5; vec2 fw = fwidth(g); vec2 l = abs(fract(g) - 0.5);
        float line = max(smoothstep(0.5 - fw.x * 1.5, 0.5, l.x), smoothstep(0.5 - fw.y * 1.5, 0.5, l.y)) * clamp(1.0 - max(fw.x, fw.y) * 2.5, 0.0, 1.0);
        c += vec3(0.07, 0.2, 0.2) * line * uGrid * smoothstep(${(R1 + 14).toFixed(1)}, ${R0.toFixed(1)}, r) * 0.55;
        float pool = (0.62 * exp(-r * 0.42) + 0.16 * exp(-r * 0.1)) * (0.72 + 0.5 * uPulse) * uWarm;
        c += vec3(1.0, 0.71, 0.3) * pool;
        gl_FragColor = vec4(fogMix(c, distance(cameraPosition, vW), uCamD, 1.0), 1.0);
      }` })));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  // Towers: one instanced box per stack; its height at time t is worked out in the vertex shader.
  const box = new THREE.BoxGeometry(1, 1, 1), tg = keep(new THREE.InstancedBufferGeometry()); tg.index = box.index; tg.setAttribute('position', box.attributes.position); tg.setAttribute('normal', box.attributes.normal);
  const aA = new Float32Array(towers.length * 4), aB = new Float32Array(towers.length * 2);
  towers.forEach((w, i) => { aA.set([w.x, w.z, w.H, w.seed], i * 4); aB.set([w.t0, w.dur], i * 2); });
  tg.setAttribute('aA', new THREE.InstancedBufferAttribute(aA, 4)); tg.setAttribute('aB', new THREE.InstancedBufferAttribute(aB, 2)); tg.instanceCount = towers.length;
  const towerMesh = new THREE.Mesh(tg, keep(new THREE.ShaderMaterial({ uniforms: uni,
    vertexShader: /* glsl */`
      attribute vec4 aA; attribute vec2 aB; uniform float uT; varying vec3 vW; varying vec3 vN; varying vec4 vI; varying vec2 vTop; ${COMMON}
      void main(){
        float u = clamp((uT - aB.x) / aB.y, 0.0, 1.0), h = aA.z * growAt(uT, aB.x, aB.y);
        vec3 p = vec3(aA.x + position.x * 1.02, (position.y + 0.5) * h, aA.y + position.z * 0.74);
        if (h < 0.01) p = vec3(0.0, -5.0, 0.0);
        vW = p; vN = normal; vI = vec4(h, 4.0 * u * (1.0 - u), aA.w, aA.z); vTop = position.xz + 0.5;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uCamD, uPulse, uWarm; varying vec3 vW; varying vec3 vN; varying vec4 vI; varying vec2 vTop; ${COMMON}
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        vec3 n = normalize(vN); float top = step(0.5, n.y), ly = vW.y / 0.115, fw = fwidth(ly), f = fract(ly);
        float seam = mix(1.0, smoothstep(0.0, 0.22, f) * smoothstep(1.0, 0.8, f), clamp(1.0 - fw * 1.6, 0.0, 1.0));
        float shade = 0.8 + 0.4 * hash(floor(ly) + vI.z * 91.0) * clamp(1.0 - fw, 0.0, 1.0);
        float face = top > 0.5 ? 1.0 : (abs(n.z) > 0.5 ? (n.z > 0.0 ? 0.62 : 0.3) : (n.x > 0.0 ? 0.42 : 0.34));
        float ao = mix(0.4, 1.0, smoothstep(0.0, 5.0, vW.y)) * mix(0.8, 1.25, smoothstep(vI.x - 6.0, vI.x, vW.y));
        vec3 c = mix(vec3(0.05, 0.11, 0.16), vec3(0.13, 0.33, 0.37), face) * shade * mix(0.45, 1.0, seam) * ao;
        if (top < 0.5) c += vec3(0.2, 0.5, 0.48) * smoothstep(vI.x - 0.22, vI.x - 0.05, vW.y) * 0.55;
        // the top badge: an abstract seal and two rules, the same on every stack
        if (top > 0.5) { vec2 q = vTop; float ring = abs(length((q - vec2(0.27, 0.5)) * vec2(1.38, 1.0)) - 0.2);
          float mark = (1.0 - smoothstep(0.03, 0.07, ring)) + step(0.55, q.x) * step(q.x, 0.9) * (step(abs(q.y - 0.36), 0.035) + step(abs(q.y - 0.62), 0.035));
          float edge = max(abs(q.x - 0.5), abs(q.y - 0.5));
          c = mix(vec3(0.16, 0.42, 0.44), vec3(0.37, 0.82, 0.77), clamp(mark, 0.0, 1.0) * 0.8 + smoothstep(0.44, 0.5, edge) * 0.5); }
        // the page is the only warm light: it reaches the nearest stacks and no further
        vec3 L = vec3(0.0, 0.7, 0.0) - vW; float d2 = dot(L, L), facing = max(dot(n, normalize(L)), 0.0);
        c += vec3(1.0, 0.72, 0.32) * (facing * 0.9 + 0.08) * 70.0 / (d2 + 30.0) * (0.75 + 0.45 * uPulse) * uWarm;
        // fresh badges are still hot from the press
        float heat = vI.y * (top > 0.5 ? 0.75 : 0.9 * exp(-(vI.x - vW.y) * 2.5));
        c = mix(c, vec3(1.0, 0.74, 0.3), clamp(heat, 0.0, 1.0) * 0.85);
        gl_FragColor = vec4(fogMix(c, distance(cameraPosition, vW), uCamD, 0.82), 1.0);
      }` })));
  towerMesh.frustumCulled = false; scene.add(towerMesh);

  // Badges in flight: each one loops press -> its stack, hot amber when stamped, cooling to teal as it lands.
  const NF = 6500, fg = keep(new THREE.InstancedBufferGeometry()), quad = new THREE.PlaneGeometry(1, 1); fg.index = quad.index; fg.setAttribute('position', quad.attributes.position);
  const cum = []; let acc = 0; for (const w of towers) { acc += w.H; cum.push(acc); }
  const fA = new Float32Array(NF * 4), fB = new Float32Array(NF * 4);
  for (let i = 0; i < NF; i++) {
    const pick = rnd() * acc; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < pick) lo = m + 1; else hi = m; }
    const w = towers[lo], flight = 0.35 + w.r / 15, L = w.t0 - 0.25 + rnd() * w.dur * 0.8, off = stamps[Math.max(0, lastStamp(L))];
    fA.set([w.x, w.z, w.H, rnd()], i * 4); fB.set([w.t0, w.dur, off, 0.13 * Math.ceil((flight + 0.3 + 0.8 * rnd()) / 0.13)], i * 4);
  }
  fg.setAttribute('aA', new THREE.InstancedBufferAttribute(fA, 4)); fg.setAttribute('aB', new THREE.InstancedBufferAttribute(fB, 4)); fg.instanceCount = NF;
  const flyers = new THREE.Mesh(fg, keep(new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aA; attribute vec4 aB; uniform float uT; varying vec2 vQ; varying vec4 vC; ${COMMON}
      void main(){
        float dist = length(aA.xy), F = 0.35 + dist / 15.0, k = floor((uT - aB.z) / aB.w), launch = aB.z + k * aB.w, u = (uT - launch) / F;
        float going = step(aB.z, uT) * step(u, 1.0) * max(step(launch, aB.x + aB.y), step(aA.w, 0.09));
        float ang = aA.w * 6.2832 * 7.0; vec3 S = vec3(cos(ang) * 0.7, 0.95, sin(ang) * 1.0);
        vec3 E = vec3(aA.x, aA.z * growAt(launch + F, aB.x, aB.y) + 0.06, aA.y);
        vec3 p = mix(S, E, u); p.y += (1.6 + 0.2 * dist + 1.6 * fract(aA.w * 13.0)) * 4.0 * u * (1.0 - u);
        vec4 mv = viewMatrix * vec4(p, 1.0); float a = 0.12 * sin(aA.w * 50.0), s = 0.36 * max(1.0, -mv.z / 40.0) * going;
        vec2 q = position.xy * vec2(1.0, 0.7); mv.xy += mat2(cos(a), -sin(a), sin(a), cos(a)) * q * s;
        vQ = position.xy; float cool = smoothstep(0.1, 0.75, u);
        vC = vec4(mix(vec3(1.0, 0.76, 0.34), vec3(0.3, 0.72, 0.68), cool), smoothstep(0.0, 0.22, u) * (1.0 - smoothstep(0.93, 1.0, u)) * mix(0.55, 0.34, cool) * going * smoothstep(2.5, 6.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: 'varying vec2 vQ; varying vec4 vC; void main(){ float e = max(abs(vQ.x), abs(vQ.y)); gl_FragColor = vec4(vC.rgb * vC.a * (1.0 - smoothstep(0.36, 0.5, e)), 1.0); }' })));
  flyers.frustumCulled = false; scene.add(flyers);

  // The page: warm paper with abstract rules (a heading, four pairs, a block), no words.
  const pc = document.createElement('canvas'); pc.width = 512; pc.height = 724; const px = pc.getContext('2d');
  px.fillStyle = '#fff6dc'; px.fillRect(0, 0, 512, 724); px.fillStyle = 'rgba(36,52,74,0.86)'; px.fillRect(96, 70, 320, 20);
  for (let i = 0; i < 4; i++) { px.fillStyle = 'rgba(36,52,74,0.8)'; px.fillRect(70, 150 + i * 62, 190 + (i % 2) * 40, 13); px.fillStyle = 'rgba(36,52,74,0.38)'; px.fillRect(70, 176 + i * 62, 300 - (i % 3) * 36, 9); }
  for (let i = 0; i < 9; i++) { px.fillStyle = 'rgba(36,52,74,0.3)'; px.fillRect(70, 430 + i * 27, i === 8 ? 180 : 372 - ((i * 37) % 60), 8); }
  const pageTex = keep(new THREE.CanvasTexture(pc)); pageTex.colorSpace = THREE.SRGBColorSpace; pageTex.anisotropy = 8;
  const page = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.6, 2.26)), keep(new THREE.MeshBasicMaterial({ map: pageTex, side: THREE.DoubleSide, toneMapped: false }))); scene.add(page);
  const gc = document.createElement('canvas'); gc.width = gc.height = 256; const gx = gc.getContext('2d'), grad = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,214,130,1)'); grad.addColorStop(0.16, 'rgba(255,200,87,0.55)'); grad.addColorStop(0.45, 'rgba(255,170,70,0.13)'); grad.addColorStop(1, 'rgba(255,160,60,0)'); gx.fillStyle = grad; gx.fillRect(0, 0, 256, 256);
  const glowTex = keep(new THREE.CanvasTexture(gc)); glowTex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, toneMapped: false }))); scene.add(glow);

  // The press: a bed, four posts and an open stamping frame, lit only by the page.
  const press = new THREE.Group(), metal = keep(new THREE.MeshStandardMaterial({ color: 0x4a637c, roughness: 0.5, metalness: 0.35 })), geo = (g) => keep(g);
  const bed = new THREE.Mesh(geo(new THREE.BoxGeometry(2.5, 0.36, 3.2)), metal); bed.position.y = 0.18; press.add(bed);
  const posts = new THREE.Group(), postG = geo(new THREE.CylinderGeometry(0.07, 0.08, 3.4, 12)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const m = new THREE.Mesh(postG, metal); m.position.set(sx * 1.32, 1.7, sz * 1.68); posts.add(m); } press.add(posts);
  const head = new THREE.Group(), longG = geo(new THREE.BoxGeometry(0.3, 0.3, 3.66)), shortG = geo(new THREE.BoxGeometry(2.34, 0.3, 0.3));
  for (const s of [-1, 1]) { const a = new THREE.Mesh(longG, metal); a.position.x = s * 1.32; head.add(a); const b = new THREE.Mesh(shortG, metal); b.position.z = s * 1.7; head.add(b); } press.add(head); scene.add(press);
  const lamp = new THREE.PointLight(0xffc857, 14, 0, 2); lamp.position.set(0, 0.9, 0); scene.add(lamp); scene.add(new THREE.HemisphereLight(0x5fd0c5, 0x0b1420, 0.6)); const rim = new THREE.DirectionalLight(0x5fd0c5, 1.6); rim.position.set(-3, 6, -5); scene.add(rim);

  // Words: three counters and one small line, drawn on 2D canvases and laid over the picture.
  const hud = new THREE.Scene(), hudCam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1), unit = keep(new THREE.PlaneGeometry(1, 1));
  const makeText = (cw, ch) => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; const tex = keep(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(unit, keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }))); hud.add(mesh); return { c, x: c.getContext('2d'), tex, mesh, key: '' }; };
  const labels = DISTRICTS.map(() => makeText(1024, 300)), note = makeText(1024, 84);
  const drawLabel = (L, name, value, row) => { const key = `${name}|${value}|${row}`; if (L.key === key) return; L.key = key; const x = L.x; x.clearRect(0, 0, 1024, 300);
    x.shadowColor = 'rgba(11,20,32,0.95)'; x.shadowBlur = 18; x.textBaseline = 'alphabetic';
    for (let pass = 0; pass < 2; pass++) { // twice, so the soft shadow is dense enough to keep the words clear of the towers
      if (row) { x.textAlign = 'left'; x.font = `700 118px ${FONT}`; x.fillStyle = INK; x.fillText(value, 8, 190); x.font = `500 48px ${FONT}`; x.fillStyle = 'rgba(244,241,232,0.82)'; x.fillText(name, 650, 186); }
      else { x.textAlign = 'center'; x.font = `500 60px ${FONT}`; x.fillStyle = 'rgba(244,241,232,0.82)'; x.fillText(name, 512, 92); x.font = `700 150px ${FONT}`; x.fillStyle = INK; x.fillText(value, 512, 240); } }
    L.tex.needsUpdate = true; };
  { const x = note.x; x.shadowColor = 'rgba(11,20,32,0.95)'; x.shadowBlur = 12; x.textAlign = 'center'; x.font = `500 46px ${FONT}`; x.fillStyle = 'rgba(244,241,232,0.9)'; for (let i = 0; i < 2; i++) x.fillText('Their own figures, not audited', 512, 58); note.tex.needsUpdate = true; }
  const leadG = keep(new THREE.BufferGeometry()); leadG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3));
  const leads = new THREE.LineSegments(leadG, keep(new THREE.LineBasicMaterial({ color: 0xf4f1e8, transparent: true, opacity: 0.4, depthTest: false }))); leads.frustumCulled = false; hud.add(leads);
  const anchors = DISTRICTS.map((D, i) => { const a = D.angle * Math.PI / 180; return new THREE.Vector3(Math.cos(a) * 21, 3 + 5 * D.final / 1.8, -Math.sin(a) * 21); });
  const firstTenth = DISTRICTS.map((D, i) => table[i].findIndex((f) => D.final * f >= 0.1) * STEP);
  const counterText = (i, t) => { const D = DISTRICTS[i], f = built(i, t); if (f >= 0.9995) return `${D.final} million`; return `${Math.min(D.final - 0.1, Math.floor(D.final * f * 10 + 1e-6) / 10).toFixed(1)} million`; };

  let W = 0, Hh = 0; const v = new THREE.Vector3(), target = new THREE.Vector3();
  function render(tIn, w, h) {
    const t = reduced ? STILL_T : clamp(tIn, 0, meta.seconds), portrait = h > w;
    if (w !== W || h !== Hh) { W = w; Hh = h; renderer.setSize(w, h, false); camera.aspect = w / h; hudCam.right = w; hudCam.top = h; hudCam.updateProjectionMatrix(); }

    // press and page
    const si = lastStamp(t), since = si >= 0 ? t - stamps[si] : 9, pulse = si >= 0 ? Math.exp(-since * 6) : 0;
    const arrive = ease((t - 1.5) / 1.0), rest = mix(11, 2.35, arrive); let k = 0;
    if (si >= 0) { const gap = stamps[si + 1] - stamps[si]; k = 1 - ease(since / Math.min(0.34, gap * 0.55)); }
    const next = stamps[si + 1]; if (next - t < 0.11) k = Math.max(k, Math.pow(1 - (next - t) / 0.11, 2));
    head.position.y = mix(rest, 0.56, k); posts.scale.y = Math.max(0.001, arrive); posts.position.y = 0; press.visible = t > 1.45;
    bed.scale.y = Math.max(0.001, ease((t - 1.45) / 0.5));
    const lay = ease((t - 1.5) / 1.0), bob = Math.sin(t * 1.7) * 0.05 * (1 - lay);
    page.position.set(0, mix(1.5, 0.385, lay) + bob, 0); page.rotation.set(-Math.PI / 2 * lay, mix(Math.sin(t * 0.9) * 0.22 - 0.1, 0, lay), 0);

    // camera: close and still, then up and back, and it keeps backing away
    const pull = ease((t - 1.7) / 8.6), dEnd = portrait ? 114 : 62, d = Math.exp(mix(Math.log(5.3 - 0.35 * Math.min(t, 1.7)), Math.log(dEnd), pull)) * (1 + 0.018 * Math.max(0, t - 9.5));
    const elUp = ease((t - 1.3) / 3.2), el = mix(mix(0.07, portrait ? 0.8 : 0.6, elUp), portrait ? 0.36 : 0.21, ease((t - 4.6) / 5.6)), az = -0.36 * (1 - ease(t / 10.5)), shake = pulse * 0.6 / (d + 4) * Math.sin(t * 70);
    target.set(0, mix(1.45, portrait ? 13 : 5.5, ease((t - 3.4) / 5.5)), 0);
    camera.fov = portrait ? 50 : 38; camera.updateProjectionMatrix();
    camera.position.set(Math.sin(az) * Math.cos(el) * d, target.y * (d < 12 ? 1 : 1) + Math.sin(el) * d + shake, Math.cos(az) * Math.cos(el) * d); camera.lookAt(target);

    uni.uT.value = t; uni.uCamD.value = d; uni.uPulse.value = pulse; uni.uGrid.value = ease((t - 2.2) / 1.6); uni.uWarm.value = mix(1, 0.8, ease((t - 9) / 3));
    lamp.intensity = 10 + 16 * pulse;
    glow.position.copy(page.position); const gs = (4.0 + d * 0.04) * (1 + 0.12 * pulse + 0.03 * Math.sin(t * 2.1)); glow.scale.set(gs, gs, 1); glow.material.opacity = mix(0.6, 1, lay);

    // words
    const row = portrait, tShow = Math.max(...firstTenth), show = ease((t - tShow) / 0.7);
    labels.forEach((L, i) => {
      drawLabel(L, DISTRICTS[i].name, counterText(i, t), row); L.mesh.material.opacity = show; L.show = show;
      if (row) { const lw = w * 0.84; L.mesh.scale.set(lw, lw * 300 / 1024, 1); L.mesh.position.set(w * 0.08 + lw / 2, h * (1 - (0.058 + i * 0.066)), 0); }
      else { const lw = w * 0.27, order = [1, 0, 2][i]; L.mesh.scale.set(lw, lw * 300 / 1024, 1); L.mesh.position.set(w * (0.17 + order * 0.33), h * 0.865, 0); }
    });
    const nw = portrait ? w * 0.8 : w * 0.46; note.mesh.scale.set(nw, nw * 84 / 1024, 1); note.mesh.position.set(w / 2, h * (portrait ? 0.165 : 0.172), 0); note.mesh.material.opacity = ease((t - 8.6) / 0.8);
    const lp = leadG.attributes.position.array; camera.updateMatrixWorld();
    labels.forEach((L, i) => { v.copy(anchors[i]); v.y *= Math.max(0.15, built(i, t)); v.project(camera); const ax = (v.x * 0.5 + 0.5) * w, ay = (v.y * 0.5 + 0.5) * h, ly = L.mesh.position.y - L.mesh.scale.y * 0.5 - h * 0.004, lx = L.mesh.position.x;
      if (row) lp.set([0, 0, 0, 0, 0, 0], i * 6); else lp.set([lx, ly, 0, mix(lx, ax, 0.92), mix(ly, Math.min(ay, ly), 0.92), 0], i * 6); });
    leadG.attributes.position.needsUpdate = true; leads.material.opacity = 0.4 * show;

    renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(hud, hudCam);
  }
  return { render, dispose() { for (const x of trash) x.dispose(); box.dispose(); quad.dispose(); renderer.dispose(); } };
}
