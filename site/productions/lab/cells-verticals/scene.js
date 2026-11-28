// Cells you can ask for: one glowing cell buds, again and again, into five cells stacked down the tall frame. Each new
// cell stretches out of the one above, pinches off, and lights up with its own small team inside: one amber light (the
// person) and a few teal lights (the agents), arranged differently per cell because each team does a different job.
// Composed for 720x1280 first (a zigzag down the frame); 1280x720 is the same zigzag laid along a row, three up, two down.
// A lab scene component (see ../harness.js for the contract). render(t) is a pure function of t. Apache-2.0. By c.productions.
export const meta = {
  id: 'cells-verticals',
  title: 'Cells you can ask for',
  beat: 'verticals',
  seconds: 11,
  sources: [
    { title: 'Dinis Cruz on Agile Cells as vertical cells, 28 November 2026 (start prompt of the film)', url: 'https://studio.agents.sovereignweb.site/productions/plans/2026-11-28-agile-cells-film-start-prompt.md' },
  ],
};

const AMBER = [1.0, 0.784, 0.341], TEAL = [0.373, 0.816, 0.773];
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const T_LIT = [2.2, 3.8, 5.4, 7.0, 8.6], T_ALL = 9.6, BUD = 1.15, STILL_T = 10.4;
const WORDS = ['social media', 'website', 'CRM', 'design', 'agent behaviour policy'];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Layouts in design pixels. Portrait: a zigzag between 22% and 86% of the height, labels in the free column.
// Landscape: the same zigzag along a row (up, down, up, down, up), labels beneath.
const LAY = {
  port: { W: 720, H: 1280, r: 70, fs: 34, cells: [[196, 356], [512, 521], [196, 686], [512, 851], [196, 1016]],
    lab: (i, c, r) => (i % 2 === 0 ? { x: c[0] + r + 30, y: c[1], a: 'l' } : { x: c[0] - r - 30, y: c[1], a: 'r' }), Z0: [196, 356] },
  land: { W: 1280, H: 720, r: 64, fs: 32, cells: [[248, 262], [444, 486], [640, 262], [836, 486], [1032, 262]],
    lab: (i, c, r) => ({ x: c[0], y: c[1] + r + 36, a: 'c' }), Z0: [248, 262] },
};

// Each team's arrangement, in units of the cell's radius (y down): the amber person, the teal agents, and who talks to whom.
// spin: the agents turn round the person. pipe: messages run along a chain. The shapes are the point: five jobs, five teams.
const TEAMS = [
  { amber: [0, 0], teal: [0, 1, 2, 3, 4].map((k) => [0.56 * Math.cos(k * 1.2566 - 1.5708), 0.56 * Math.sin(k * 1.2566 - 1.5708)]), links: [[-1, 0], [-1, 1], [-1, 2], [-1, 3], [-1, 4]], spin: 0.32 },
  { amber: [0, -0.5], teal: [[-0.27, -0.02], [0.27, -0.02], [-0.27, 0.42], [0.27, 0.42]], links: [[-1, 0], [-1, 1], [0, 2], [1, 3], [0, 1], [2, 3]] },
  { amber: [-0.58, 0.12], teal: [[-0.2, -0.14], [0.18, 0.14], [0.56, -0.1]], links: [[-1, 0], [0, 1], [1, 2]], pipe: 1 },
  { amber: [0, 0.44], teal: [[-0.47, -0.16], [-0.17, -0.44], [0.17, -0.44], [0.47, -0.16]], links: [[-1, 0], [-1, 1], [-1, 2], [-1, 3]], sway: 1 },
  { amber: [0, 0], teal: [0, 1, 2, 3, 4, 5].map((k) => [0.6 * Math.cos(k * 1.0472 - 1.5708), 0.6 * Math.sin(k * 1.0472 - 1.5708)]),
    links: [[-1, 0], [-1, 1], [-1, 2], [-1, 3], [-1, 4], [-1, 5], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]], ring: 1 },
];

export async function create({ canvas, THREE, reduced }) {
  const rnd = prng(20261128);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(0, 720, 0, -1280, -10, 10);
  const disposables = [], keep = (x) => { disposables.push(x); return x; };
  const quad = keep(new THREE.PlaneGeometry(2, 2)), unitPlane = keep(new THREE.PlaneGeometry(1, 1));
  const FS_VERT = 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const fsMesh = (frag, uniforms, order, additive = true) => { const m = new THREE.Mesh(quad, keep(new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms,
    transparent: additive, depthTest: false, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NoBlending }))); m.frustumCulled = false; m.renderOrder = order; scene.add(m); return m; };

  // backdrop: the house navy, lighter in the middle, a vignette
  const bgU = { uRes: { value: new THREE.Vector2(720, 1280) } };
  fsMesh(`precision highp float; uniform vec2 uRes;
    void main(){ vec2 uv = gl_FragCoord.xy / uRes; vec3 top = vec3(0.043, 0.078, 0.125), mid = vec3(0.071, 0.149, 0.227);
      vec3 col = mix(mid, top, smoothstep(0.3, 1.0, uv.y)); col = mix(col, top, smoothstep(0.3, 0.0, uv.y) * 0.8);
      float v = length((uv - 0.5) * vec2(1.0, 1.15)); col *= 1.0 - 0.45 * smoothstep(0.35, 0.95, v);
      gl_FragColor = vec4(col, 1.0); }`, bgU, -10, false);

  // the membranes: one signed-distance field for all five cells and the necks that join a bud to its parent while it
  // pinches off. uC = centre and radius and brightness, uN = parent centre, neck width, time since the cell lit.
  const N5 = () => Array.from({ length: 5 }, () => new THREE.Vector4());
  const memU = { uRes: bgU.uRes, uC: { value: N5() }, uN: { value: N5() }, uT: { value: 0 }, uS: { value: 1 } };
  fsMesh(`precision highp float; uniform vec2 uRes; uniform vec4 uC[5]; uniform vec4 uN[5]; uniform float uT, uS;
    float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
    float neck(vec2 p, vec2 a, vec2 b, float w){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-3), 0.0, 1.0);
      return length(pa - ba * h) - w * (1.0 - 0.72 * sin(3.14159 * h)); }
    void main(){ vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y); float s = 1e5, wsum = 1e-4, bsum = 0.0, ring = 0.0, rr = 70.0 * uS;
      for (int i = 0; i < 5; i++) { vec4 c = uC[i], n = uN[i]; if (c.z < 0.5) continue; vec2 d = p - c.xy; float ang = atan(d.y, d.x), fi = float(i);
        float wob = (sin(ang * 3.0 + uT * 0.9 + fi * 1.7) * 0.6 + sin(ang * 5.0 - uT * 1.3 + fi) * 0.4) * c.z * 0.028;
        float di = length(d) - c.z + wob, k = 6.0 * uS;
        if (n.z > 0.3) { float dn = neck(p, n.xy, c.xy, n.z); di = smin(di, dn, 26.0 * uS); }
        s = smin(s, di, k); float w = exp(-max(di, 0.0) / (22.0 * uS)); wsum += w; bsum += w * c.w; rr = c.z;
        float age = n.w; if (age > 0.0 && age < 2.0) { float R = age * 150.0 * uS; ring += exp(-pow((di - R) / (5.0 * uS), 2.0)) * exp(-age * 2.4) * 0.8; } }
      float b = bsum / wsum, as = abs(s);
      float edge = exp(-as / (1.6 * uS)) * 0.95 + exp(-as / (9.0 * uS)) * 0.38;
      float halo = exp(-max(s, 0.0) / (34.0 * uS)) * 0.10;
      float inside = smoothstep(1.5, -2.5, s);
      float fill = inside * (0.045 + 0.16 * exp(s / (0.30 * rr)));
      vec3 rim = vec3(1.0, 0.87, 0.64), body = mix(vec3(${TEAL}), vec3(${AMBER}), 0.30);
      vec3 col = rim * (edge + halo) * b + body * fill * b + rim * ring;
      gl_FragColor = vec4(col, 1.0); }`, memU, 2);

  // lights: one Points cloud for every glow (people, agents, the dots of their links, the dust in the room)
  const MAXP = 1600, gPos = new Float32Array(MAXP * 3), gCol = new Float32Array(MAXP * 3), gA = new Float32Array(MAXP * 4);
  const gGeo = keep(new THREE.BufferGeometry());
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3).setUsage(THREE.DynamicDrawUsage)); gGeo.setAttribute('aCol', new THREE.BufferAttribute(gCol, 3).setUsage(THREE.DynamicDrawUsage));
  gGeo.setAttribute('aA', new THREE.BufferAttribute(gA, 4).setUsage(THREE.DynamicDrawUsage));
  const glows = new THREE.Points(gGeo, keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aCol; attribute vec4 aA; varying vec3 vCol; varying vec4 vA;
      void main(){ vCol = aCol; vA = aA; gl_PointSize = aA.y; gl_Position = projectionMatrix * viewMatrix * vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `precision highp float; varying vec3 vCol; varying vec4 vA;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0, a = vA.x, kc = vA.z, star = vA.w;
        float halo = exp(-d * d * 7.0) * 0.42 + 0.06 / (1.0 + d * d * 40.0), core = exp(-d * d * kc) * 1.5;
        float fl = star * (exp(-abs(q.x) * 120.0) + exp(-abs(q.y) * 120.0)) * exp(-d * 2.4) * 0.5;
        vec3 col = mix(vCol, vec3(1.0, 0.98, 0.94), clamp(exp(-d * d * kc * 2.5), 0.0, 1.0));
        gl_FragColor = vec4(col * (halo + core + fl) * a * smoothstep(1.0, 0.8, d), 1.0); }` })));
  glows.frustumCulled = false; glows.renderOrder = 8; scene.add(glows);
  let gi = 0;
  function addGlow(x, y, col, a, size, core, star = 0) { if (gi >= MAXP || a <= 0.002) return; gPos.set([x, -y, 0], gi * 3); gCol.set(col, gi * 3); const r = Math.max(1, core); gA.set([a, size, Math.pow(size / (2 * r), 2), star], gi * 4); gi++; }

  // labels: canvas text drawn at twice the design size, with a soft navy backing
  const labels = WORDS.map((text) => {
    const c = document.createElement('canvas'), x = c.getContext('2d'), S = 2, fs = 34, f = `600 ${fs * S}px ${FONT}`; x.font = f;
    const tw = Math.ceil(x.measureText(text).width), pad = 16 * S; c.width = tw + pad * 2; c.height = Math.ceil(fs * S * 1.5 + pad);
    x.font = f; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.fillStyle = 'rgba(9,18,30,0.55)'; x.filter = `blur(${8 * S}px)`; const r = c.height * 0.3; x.beginPath(); x.roundRect(pad * 0.7, c.height / 2 - r, c.width - pad * 1.4, r * 2, r); x.fill(); x.filter = 'none';
    x.shadowColor = 'rgba(5,10,18,0.9)'; x.shadowBlur = 6 * S; x.fillStyle = '#f4f1e8'; x.fillText(text, c.width / 2, c.height / 2 + fs * S * 0.04);
    const tex = keep(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const mat = keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0, color: 0xffffff }));
    const m = new THREE.Mesh(unitPlane, mat); m.renderOrder = 20; m.frustumCulled = false; scene.add(m);
    return { m, w: c.width / S, h: c.height / S, tw: tw / S, fs };
  });
  function placeLabel(L, x, y, anchor, size, a, tint, maxW) {
    let s = size / L.fs; if (L.tw * s > maxW) s = maxW / L.tw; const w = L.w * s, h = L.h * s, tw = L.tw * s;
    const cx = anchor === 'l' ? x + tw / 2 : anchor === 'r' ? x - tw / 2 : x;
    L.m.position.set(cx, -y, 0); L.m.scale.set(w, h, 1); L.m.material.opacity = a; L.m.material.color.setRGB(1, lerp(1, 0.93, tint), lerp(1, 0.78, tint)); L.m.visible = a > 0.003;
  }

  // a room of slow dust, and a fixed personality for every light
  const DUST = 220, dust = Array.from({ length: DUST }, () => ({ x: rnd(), y: rnd(), s: 3 + rnd() * 5, a: 0.03 + rnd() * 0.08, ph: rnd() * 6.28, sp: 0.2 + rnd() * 0.5 }));
  const lights = TEAMS.map((tm) => ({ amberPh: rnd() * 6.28, teal: tm.teal.map(() => ({ ph: rnd() * 6.28, sp: 0.6 + rnd() * 0.7 })), linkPh: tm.links.map(() => rnd()) }));

  // How each cell stands at time t: where it is, how big, how bright, and the neck to its parent while it buds.
  function cellState(i, t, lay) {
    const home = lay.cells[i], r = lay.r;
    if (i === 0) { const g = sstep(t / 1.1); return { c: home, r: r * lerp(0.82, 1, g), g, neck: 0, par: home, u: 1 }; }
    const u = clamp((t - (T_LIT[i] - BUD)) / (BUD - 0.1)); if (u <= 0) return null;
    const par = lay.cells[i - 1], e = sstep(u), m = e * e * (3 - 2 * e) * 0.35 + e * 0.65;
    const c = [lerp(par[0], home[0], m), lerp(par[1], home[1], m)];
    const neck = r * 0.62 * (1 - sstep((u - 0.3) / 0.42));
    return { c, r: r * lerp(0.5, 1, sstep(u * 1.15)), g: sstep(u * 1.25), neck, par, u };
  }
  function brightness(i, t) {
    const g = i === 0 ? sstep(t / 1.1) : sstep((t - (T_LIT[i] - BUD)) / BUD), lit = sstep((t - T_LIT[i]) / 0.35);
    const settle = i < 4 ? sstep((t - T_LIT[i + 1]) / 0.7) : 0, fin = sstep((t - T_ALL) / 1.0);
    let b = 0.5 * g * (1 - lit) + lit * (1.05 - 0.38 * settle);
    b = lerp(b, 0.9 + 0.06 * Math.sin((t - T_ALL) * 1.9), fin);
    const age = t - T_LIT[i]; if (age > 0) b += Math.exp(-age * 3.2) * 0.55;
    return b;
  }

  function render(time, w, h) {
    const portrait = h > w, lay = portrait ? LAY.port : LAY.land;
    if (canvas.width !== w || canvas.height !== h) renderer.setSize(w, h, false); renderer.setViewport(0, 0, w, h);
    const t = reduced ? STILL_T : clamp(time, 0, meta.seconds);
    const S = Math.min(w / lay.W, h / lay.H), X0 = (w - lay.W * S) / 2, Y0 = (h - lay.H * S) / 2;
    camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h; camera.updateProjectionMatrix();
    bgU.uRes.value.set(w, h); memU.uT.value = t; memU.uS.value = S;
    // a slow pull back: close on the first cell at the start, the whole family by the time the last one lights
    const Z = lerp(1.22, 1, sstep((t - 1.6) / 7.6)), zc = lay.Z0;
    const sx = (x) => X0 + (zc[0] + (x - zc[0]) * Z) * S, sy = (y) => Y0 + (zc[1] + (y - zc[1]) * Z) * S, sc = S * Z;
    gi = 0;

    for (const d of dust) { const x = (d.x + 0.003 * t * d.sp + 0.01 * Math.sin(t * 0.3 + d.ph)) % 1, y = ((d.y - 0.005 * t * d.sp) % 1 + 1) % 1;
      addGlow(x * w, y * h, [0.6, 0.72, 0.85], d.a * (0.7 + 0.3 * Math.sin(t * d.sp * 2 + d.ph)), d.s * S, 1.2); }

    const fin = sstep((t - T_ALL) / 1.0), calm = 1 - 0.6 * fin; // the lights' own motion slows as the film comes to rest
    for (let i = 0; i < 5; i++) {
      const st = cellState(i, t, lay), C = memU.uC.value[i], Nn = memU.uN.value[i];
      if (!st) { C.set(0, 0, 0, 0); Nn.set(0, 0, 0, 0); labels[i].m.visible = false; continue; }
      const b = brightness(i, t);
      // the parent gives a little of itself while the bud draws out of it
      C.set(sx(st.c[0]), sy(st.c[1]), st.r * sc, b);
      Nn.set(sx(st.par[0]), sy(st.par[1]), st.neck * sc, t - T_LIT[i]);
      if (i > 0 && st.u < 1) { const P = memU.uC.value[i - 1]; P.z *= 1 - 0.1 * Math.sin(Math.PI * st.u); }

      // the team inside: lights spread out from where the bud began as the cell grows round them
      const tm = TEAMS[i], L = lights[i], R = st.r, cx = st.c[0], cy = st.c[1], g = st.g;
      const appear = (k) => (i === 0 ? sstep((t - 0.25 - k * 0.18) / 0.5) : sstep((g - 0.25 - k * 0.06) / 0.4));
      const ang = (tm.spin || 0) * t * calm, ca = Math.cos(ang), sa = Math.sin(ang);
      const pos = (k) => { // k = -1 for the person
        if (k < 0) { const [ax, ay] = tm.amber; return [cx + ax * R * g + 1.5 * Math.sin(t * 0.8 + L.amberPh), cy + ay * R * g + 1.5 * Math.cos(t * 0.7 + L.amberPh)]; }
        let [x, y] = tm.teal[k]; if (tm.spin) { const nx = x * ca - y * sa; y = x * sa + y * ca; x = nx; }
        if (tm.sway) { const s = 0.05 * Math.sin(t * 1.3 * calm + k * 0.9); x += s; }
        const p = L.teal[k]; return [cx + x * R * g + 2.5 * Math.sin(t * p.sp * calm + p.ph), cy + y * R * g + 2.5 * Math.cos(t * p.sp * 1.2 * calm + p.ph)]; };
      // links: dotted threads with a message running along each one
      tm.links.forEach(([a, bb], li) => {
        const A = pos(a), B = pos(bb), la = Math.min(appear(a < 0 ? 0 : a + 1), appear(bb + 1)) * Math.min(1.2, b);
        if (la <= 0.01) return; const len = Math.hypot(B[0] - A[0], B[1] - A[1]) * sc, n = Math.max(2, Math.floor(len / (7 * S)));
        const sp = tm.pipe ? 0.55 : 0.42, ph = tm.pipe ? (t * sp * calm - li * 0.33) % 1 : (t * sp * calm + L.linkPh[li]) % 1;
        for (let k = 1; k < n; k++) { const f = k / n, pulse = Math.exp(-Math.pow((f - ph) * 7, 2)) * (tm.ring && a >= 0 ? 0.6 : 1);
          const col = a < 0 && !tm.ring ? AMBER : TEAL; const x = lerp(A[0], B[0], f), y = lerp(A[1], B[1], f);
          addGlow(sx(x), sy(y), pulse > 0.3 ? AMBER : col, la * (0.16 + 0.7 * pulse), (5 + 9 * pulse) * S, 1.1 * S); } });
      tm.teal.forEach((_, k) => { const p = pos(k), a = appear(k + 1); addGlow(sx(p[0]), sy(p[1]), TEAL, a * Math.min(1.25, 0.35 + 0.75 * b), 40 * sc, 3.6 * sc); });
      { const p = pos(-1), a = appear(0); addGlow(sx(p[0]), sy(p[1]), AMBER, a * Math.min(1.3, 0.45 + 0.8 * b), 66 * sc * (1 + 0.04 * Math.sin(t * 1.9)), 6.5 * sc, 1); }

      // the lineage thread: once a bud has pinched off, a faint line of dots remembers where it came from
      if (i > 0) { const sep = sstep((st.u - 0.75) / 0.25) * (1 - 0.35 * fin); if (sep > 0.01) {
        const P = lay.cells[i - 1], Q = st.c, dx = Q[0] - P[0], dy = Q[1] - P[1], dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl;
        const A = [P[0] + ux * (lay.r + 10), P[1] + uy * (lay.r + 10)], B = [Q[0] - ux * (lay.r + 10), Q[1] - uy * (lay.r + 10)];
        const n = Math.floor(Math.hypot(B[0] - A[0], B[1] - A[1]) / 11), ph = ((t - T_LIT[i]) * 0.35 * calm) % 1;
        for (let k = 0; k <= n; k++) { const f = k / n, pulse = Math.exp(-Math.pow((f - ph) * 6, 2));
          addGlow(sx(lerp(A[0], B[0], f)), sy(lerp(A[1], B[1], f)), [1.0, 0.87, 0.64], sep * (0.10 + 0.25 * pulse), (5 + 4 * pulse) * S, 1.2 * S); } } }

      // the label: arrives as the cell lights, slides out a little from the cell, stays warm while it is the newest
      const lp = lay.lab(i, lay.cells[i], lay.r), lk = sstep((t - T_LIT[i] - 0.05) / 0.5), newest = i < 4 ? 1 - sstep((t - T_LIT[i + 1]) / 0.6) : 1;
      const slide = (1 - lk) * 18 * (lp.a === 'l' ? -1 : lp.a === 'r' ? 1 : 0), la = lk * lerp(0.82, 1, Math.max(newest * (1 - fin), fin));
      const lx = sx(lp.x + slide), ly = sy(lp.y + (lp.a === 'c' ? (1 - lk) * -12 : 0));
      const maxW = lp.a === 'l' ? w - lx - 14 * S : lp.a === 'r' ? lx - 14 * S : (portrait ? w : 360 * S);
      placeLabel(labels[i], lx, ly, lp.a, lay.fs * sc, la, newest * (1 - fin) * lk, maxW);
    }

    gGeo.setDrawRange(0, gi); ['position', 'aCol', 'aA'].forEach((n) => { gGeo.attributes[n].needsUpdate = true; });
    renderer.render(scene, camera);
  }
  function dispose() { for (const d of disposables) d.dispose(); renderer.dispose(); }
  return { render, dispose };
}
