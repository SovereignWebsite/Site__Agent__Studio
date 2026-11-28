// Refresh keys: what a hand-over loses on purpose, what it carries, and the test that it worked.
// 0 to 9 s: the old key is stamped and goes grey, the new light cuts its own key, the sealed envelopes cross one by one
// and the last is opened. 9 to 16 s: each light puts out a slip, the slips are compared stroke by stroke, a gap shows on
// the new one, the mend is made on the shelf page behind, and the slips match.
// A lab scene (see ../harness.js for the contract). Every frame is a pure function of t; the only randomness is a
// fixed-seed PRNG run once in create(). Apache-2.0.
export const meta = {
  id: 'refresh-keys',
  title: 'What is lost, what carries, and the test',
  beat: 'The old key is retired on purpose and the new session cuts its own; what was sealed to the old key is moved and checked; a mismatch in the next step is mended in the file, not in the session.',
  seconds: 16,
  sources: [
    { title: 'How we refresh a session, sections 4, 5 and 6', url: 'https://studio.agents.sovereignweb.site/productions/session-refresh/how-we-refresh-a-session/' },
    { title: 'The agent lifecycle decision', url: 'https://decisions.agents.sovereignweb.site/records/2026-11-24__agent-lifecycle.json' },
  ],
};

const INK = 0xf4f1e8, AMBER = 0xffc857, TEAL = 0x5fd0c5, CORAL = 0xff6b5e, FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const T_STAMP = 2.5, T_CUT = 3.5, CUT_LEN = 1.5, T_ENV = 5.5, ENV_GAP = 0.42, ENV_DUR = 0.72, T_OPEN = 7.7, T_TEST = 9, STILL_T = 15.6;
const ROW_T = [11.15, 11.35, 11.55, 11.8, 14.72, 14.88], GAP_ROW = 3, T_GAP = 11.85, T_MEND = 13.1, T_MENDED = 13.9, T_FILL = 14.35, T_JOIN = 15.0;
const OLD_TEETH = [1, 1, 0.3, 1, 1, 0.3, 0.3, 1], NEW_TEETH = [0.3, 0.55, 0.8, 1, 0.5, 0.2, 0.65, 0.9], TOOTH = 0.42, PITCH = 0.135;
const SLIP_ROWS = [1.25, 0.95, 1.3, 1.05, 1.2, 0.7], PAGE_ROWS = [0.5, 0.42, 0.56, 0.36, 0.5], PAGE_GAP = 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, mix = (a, b, k) => a + (b - a) * k;
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const after = (t, t0, rate) => (t >= t0 ? Math.exp(-(t - t0) * rate) : 0); // a pulse that starts at t0 and dies away

// Where things stand. Portrait is the film's format: shelf at the top, the two lights, the keys large with their envelopes
// below; for the test the keys shrink back to the sides and the slips take the lower half. Landscape spreads the same
// things left and right. Slots are in key units from the key's centre.
const layout = (portrait, part) => (portrait
  ? { d: 18.59, cy: 0, visH: 9.96, ks: mix(1.3, 0.5, part), kx: mix(1.45, 2.1, part), ky: mix(0, 1.25, part), lx: mix(1.45, 1.35, part), ly: 2.15, slots: [[0.4, -1.85], [0.4, -2.45], [-0.4, -1.85], [-0.4, -2.45]], shelfY: 2.8, shS: 1.2, slipY: -1.95, slipS: 1.2, liftY: 3.25, liftS: 1.35 }
  : { d: 13.44, cy: 0.45, visH: 7.2, ks: 1, kx: 3.0 + part, ky: 1.3, lx: 2.1 + part, ly: 2.35, slots: [[1.23, -2.6], [0.41, -2.6], [-0.41, -2.6], [-1.23, -2.6]], shelfY: 1.9, shS: 1, slipY: -0.8, slipS: 1, liftY: 2.62, liftS: 1.5 });

export async function create({ canvas, THREE, reduced }) {
  const rnd = prng(41107), renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 200), trash = [];
  const keep = (x) => { trash.push(x); return x; }, col = (h) => new THREE.Color(h);
  const flat = (color, o = {}) => keep(new THREE.MeshBasicMaterial({ color, toneMapped: false, ...o }));
  const unit = keep(new THREE.PlaneGeometry(1, 1)), unitL = keep(new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0));
  const add = (parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, 1); parent.add(m); return m; };
  const tint = (m, base, k) => m.material.color.copy(base).multiplyScalar(k);
  const texOf = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const tx = keep(new THREE.CanvasTexture(c)); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx; };

  // Ground: navy, with a pool of light under each of the two lights.
  const bgU = { uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uC: { value: new THREE.Vector2() } };
  const bg = add(scene, keep(new THREE.PlaneGeometry(90, 90)), keep(new THREE.ShaderMaterial({ uniforms: bgU,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform vec3 uA, uB; uniform vec2 uC; varying vec2 vP;
      float pool(vec2 p, float w) { return exp(-dot(p, p) / w); }
      void main(){
        float r = length((vP - uC) * vec2(0.085, 0.11));
        vec3 c = mix(vec3(0.071, 0.149, 0.227), vec3(0.043, 0.078, 0.125), smoothstep(0.1, 1.0, r));
        c += vec3(1.0, 0.68, 0.26) * uA.z * (0.2 * pool(vP - uA.xy, 1.6) + 0.07 * pool(vP - uA.xy, 9.0));
        c += vec3(1.0, 0.86, 0.6) * uB.z * (0.2 * pool(vP - uB.xy, 1.2) + 0.075 * pool(vP - uB.xy, 10.0));
        float g = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453); c += (g - 0.5) * 0.012;
        gl_FragColor = vec4(c, 1.0);
      }` })), 0, 0, -1.6);

  // Lights: the old session, dim amber; the new one, small and bright.
  const glowTex = texOf(256, 256, (x) => { const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,0.6)'); g.addColorStop(0.4, 'rgba(255,255,255,0.13)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); });
  const coreTex = texOf(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
  const glow = (color, tex = glowTex) => { const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: tex, color, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, toneMapped: false }))); s.renderOrder = 20; scene.add(s); return s; };
  const put = (s, x, y, z, size, op) => { s.visible = op > 0.004; s.position.set(x, y, z); s.scale.set(size, size, 1); s.material.opacity = op; };
  const oldGlow = glow(0xffb040), oldCore = glow(0xffd58a, coreTex), newGlow = glow(0xffd9a0), newCore = glow(0xfff6e0, coreTex);
  const oldLamp = new THREE.PointLight(0xffb44a, 0, 0, 2), newLamp = new THREE.PointLight(0xffe6bd, 0, 0, 2); scene.add(oldLamp, newLamp);
  scene.add(new THREE.HemisphereLight(0x9fc4d8, 0x0b1420, 0.55)); const fill = new THREE.DirectionalLight(0xbfd6e6, 0.5); fill.position.set(0.4, 0.8, 2); scene.add(fill);

  // Keys: a bow, a shaft and eight teeth. The old one has a round bow and three square blocks; the new one a diamond bow and a run of steps.
  const ext = { depth: 0.14, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 40 };
  const ringShape = new THREE.Shape(); ringShape.absarc(0, 0, 0.48, 0, Math.PI * 2, false); { const h = new THREE.Path(); h.absarc(0, 0, 0.2, 0, Math.PI * 2, true); ringShape.holes.push(h); }
  const diaShape = new THREE.Shape(); diaShape.moveTo(0, 0.6); diaShape.lineTo(-0.5, 0); diaShape.lineTo(0, -0.6); diaShape.lineTo(0.5, 0); diaShape.closePath(); { const h = new THREE.Path(); h.moveTo(0, 0.24); h.lineTo(0.2, 0); h.lineTo(0, -0.24); h.lineTo(-0.2, 0); h.closePath(); diaShape.holes.push(h); }
  const boxG = keep(new THREE.BoxGeometry(1, 1, 1));
  const makeKey = (shape, dir, color) => { const g = new THREE.Group(), mat = keep(new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.55 }));
    const bow = new THREE.Mesh(keep(new THREE.ExtrudeGeometry(shape, ext).translate(0, 0, -0.07)), mat); bow.position.y = 0.72; g.add(bow);
    const shaft = new THREE.Mesh(boxG, mat); shaft.scale.set(0.26, 1.56, 0.17); shaft.position.y = -0.47; g.add(shaft);
    const teeth = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(boxG, mat); m.position.y = -0.2 - i * PITCH; g.add(m); teeth.push(m); }
    const setTeeth = (f) => teeth.forEach((m, i) => { const L = TOOTH * f(i); m.scale.set(L, PITCH + 0.002, 0.13); m.position.x = dir * (0.13 + L / 2 - 0.01); });
    scene.add(g); return { g, mat, setTeeth }; };
  const oldKey = makeKey(ringShape, 1, 0xe0a63c), newKey = makeKey(diaShape, -1, 0xe8e2d2);
  const BRASS = col(0xe0a63c), GREY = col(0x8a94a0), DEAD = col(0x1d242c), PALE = col(0xe8e2d2), BLANK = col(0x8d949c);

  // The stamp: the tool that comes down, and the mark it leaves.
  const stampTex = texOf(640, 200, (x) => { x.fillStyle = 'rgba(11,20,32,0.62)'; x.beginPath(); x.roundRect(10, 10, 620, 180, 22); x.fill(); x.strokeStyle = '#f4f1e8'; x.lineWidth = 11; x.stroke(); x.fillStyle = '#f4f1e8'; x.font = `700 118px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('retired', 320, 104); });
  const mark = add(scene, unit, flat(INK, { map: stampTex, transparent: true, depthWrite: false })); mark.renderOrder = 8;
  const tool = new THREE.Group(), toolMat = keep(new THREE.MeshStandardMaterial({ color: 0x6d86a0, roughness: 0.6, metalness: 0.2 }));
  { const b = new THREE.Mesh(boxG, toolMat); b.scale.set(1.62, 0.58, 0.3); tool.add(b); const h = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.17, 0.2, 0.8, 20)), toolMat); h.rotation.x = Math.PI / 2; h.position.z = 0.5; tool.add(h); const k = new THREE.Mesh(keep(new THREE.SphereGeometry(0.27, 20, 14)), toolMat); k.position.z = 0.95; tool.add(k); }
  scene.add(tool);
  const ring = add(scene, keep(new THREE.RingGeometry(0.93, 1, 64)), flat(INK, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));

  // Thin lines of light between things.
  const beam = (color, additive = true) => { const m = add(scene, unit, flat(color, { transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })); m.renderOrder = 6; return m; };
  const lay = (m, ax, ay, bx, by, wd, z, op, f = 1) => { bx = ax + (bx - ax) * f; by = ay + (by - ay) * f; const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy); m.visible = op > 0.004 && L > 1e-4; m.position.set((ax + bx) / 2, (ay + by) / 2, z); m.rotation.z = Math.atan2(dy, dx); m.scale.set(L, wd, 1); m.material.opacity = op; };

  // Envelopes: paper, a flap that can open, a seal in the shape of the key it is sealed to, and what is inside.
  const envTex = texOf(288, 192, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(40,50,64,0.35)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, h); x.lineTo(w / 2, h * 0.5); x.lineTo(w, h); x.stroke(); x.strokeStyle = 'rgba(40,50,64,0.5)'; x.lineWidth = 5; x.strokeRect(0, 0, w, h); });
  const triG = keep(new THREE.BufferGeometry()); triG.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.36, 0, 0, 0, -0.27, 0, 0.36, 0, 0]), 3));
  const ringG = keep(new THREE.RingGeometry(0.045, 0.095, 28)), diaG = keep(new THREE.PlaneGeometry(0.15, 0.15).rotateZ(Math.PI / 4).scale(0.85, 1.05, 1));
  const PAPER = col(0xcfc6ad), SEAL_OLD = col(0xffb347), SEAL_DEAD = col(0x5d6875), SEAL_NEW = col(0xfff3d6), TEALC = col(TEAL), CORALC = col(CORAL), AMBERC = col(AMBER), INKC = col(INK);
  const envs = [0, 1, 2, 3].map((i) => { const g = new THREE.Group(); scene.add(g);
    const body = add(g, unit, flat(0xffffff, { map: envTex }), 0, 0, 0, 0.72, 0.48), card = add(g, unit, flat(TEAL), 0, 0, -0.012, 0.58, 0.4);
    const pivot = new THREE.Group(); pivot.position.set(0, 0.24, 0.012); g.add(pivot);
    const edge = add(pivot, triG, flat(0x2a3646, { side: THREE.DoubleSide }), 0, 0.004, -0.002, 1.05, 1.09), flap = add(pivot, triG, flat(0xffffff, { side: THREE.DoubleSide }));
    const sealOld = add(pivot, ringG, flat(0xffffff, { side: THREE.DoubleSide }), 0, -0.25, 0.012), sealNew = add(pivot, diaG, flat(0xffffff, { side: THREE.DoubleSide }), 0, -0.25, 0.014);
    return { g, body, card, pivot, edge, flap, sealOld, sealNew, oldThread: beam(AMBER), newThread: beam(INK), zap: beam(0xffe9c4), dep: T_ENV + i * ENV_GAP, arr: T_ENV + i * ENV_GAP + ENV_DUR }; });
  const cardGlow = glow(TEAL);

  // Sparks: where the new key is cut, and the dust the stamp throws up.
  const makeSparks = (list, gravity) => { const n = list.length, g = keep(new THREE.BufferGeometry()), o = new Float32Array(n * 3), v = new Float32Array(n * 3), s = new Float32Array(n * 2), c = new Float32Array(n * 3);
    list.forEach((p, i) => { o.set(p.o, i * 3); v.set(p.v, i * 3); s.set([p.t, p.life], i * 2); c.set(p.c, i * 3); });
    g.setAttribute('position', new THREE.BufferAttribute(o, 3)); g.setAttribute('aV', new THREE.BufferAttribute(v, 3)); g.setAttribute('aS', new THREE.BufferAttribute(s, 2)); g.setAttribute('aC', new THREE.BufferAttribute(c, 3));
    const u = { uT: { value: 0 }, uPx: { value: 6 }, uG: { value: gravity } }, pts = new THREE.Points(g, keep(new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute vec3 aV; attribute vec2 aS; attribute vec3 aC; uniform float uT, uPx, uG; varying vec4 vC; void main(){ float age = uT - aS.x, u = age / aS.y; float a = (age < 0.0 || u > 1.0) ? 0.0 : 1.0 - u; vec3 p = position + aV * age * (1.0 - 0.35 * u) + vec3(0.0, -uG, 0.0) * age * age; vC = vec4(aC, a); gl_PointSize = uPx * (0.35 + 0.65 * a) * step(0.001, a); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5); float k = smoothstep(0.5, 0.1, d); gl_FragColor = vec4(vC.rgb * vC.a * k * 1.4, 1.0); }' })));
    pts.frustumCulled = false; pts.renderOrder = 21; scene.add(pts); return { pts, u }; };
  const cutList = [], dustList = [];
  for (let i = 0; i < 8; i++) for (let k = 0; k < 60; k++) { const a = (rnd() - 0.5) * 2.2, sp = 1.2 + 3.4 * rnd(), hot = rnd();
    cutList.push({ o: [-0.13 - TOOTH * (0.35 + 0.65 * rnd()), -0.2 - i * PITCH + (rnd() - 0.5) * 0.1, 0.12], v: [-Math.cos(a) * sp, Math.sin(a) * sp * 0.9 + 0.6, rnd() * 0.6], t: T_CUT + (i + rnd()) * CUT_LEN / 8, life: 0.28 + 0.5 * rnd(), c: [1, 0.72 + 0.26 * hot, 0.3 + 0.6 * hot * hot] }); }
  for (let k = 0; k < 150; k++) { const a = rnd() * 6.2832, sp = 0.8 + 2.6 * rnd(); dustList.push({ o: [Math.cos(a) * 0.8, Math.sin(a) * 0.3 - 0.25, 0.15], v: [Math.cos(a) * sp, Math.sin(a) * sp * 0.7, 0.3], t: T_STAMP + rnd() * 0.04, life: 0.3 + 0.45 * rnd(), c: [0.75, 0.74, 0.7] }); }
  const cut = makeSparks(cutList, 2.6), dust = makeSparks(dustList, 0.4);

  // The shelf behind, with the three pages the old session left. The third has a line missing.
  const shelf = new THREE.Group(); scene.add(shelf);
  const bar = new THREE.Mesh(boxG, keep(new THREE.MeshStandardMaterial({ color: 0x4a637c, roughness: 0.7, metalness: 0.1 }))); bar.scale.set(3.5, 0.07, 0.5); bar.position.set(0, -0.035, -0.6); shelf.add(bar);
  const PAGE = col(0x9ccbc2), PSTROKE = col(0x17323d), pages = [-1.0, 0, 1.0].map((x, pi) => { const g = new THREE.Group(); shelf.add(g);
    const paper = add(g, unit, flat(0xffffff), 0, 0, 0, 0.8, 1.1), strokes = [add(g, unitL, flat(0x17323d), -0.3, 0.38, 0.004, 0.34, 0.07)];
    PAGE_ROWS.forEach((L, j) => { if (!(pi === 2 && j === PAGE_GAP)) strokes.push(add(g, unitL, flat(0x17323d), -0.3, 0.2 - j * 0.14, 0.004, L * (pi === 1 ? 0.9 : 1) + (pi === 0 && j % 2 ? 0.08 : 0), 0.045)); });
    return { g, paper, strokes, x }; });
  const gapTex = texOf(256, 48, (x) => { x.strokeStyle = '#fff'; x.lineWidth = 6; x.setLineDash([16, 9]); x.strokeRect(4, 4, 248, 40); x.fillStyle = 'rgba(255,255,255,0.28)'; x.fillRect(4, 4, 248, 40); });
  const pageGap = add(pages[2].g, unitL, flat(CORAL, { map: gapTex, transparent: true, depthWrite: false }), -0.32, 0.2 - PAGE_GAP * 0.14, 0.006, PAGE_ROWS[PAGE_GAP] + 0.04, 0.085);
  const pageFill = add(pages[2].g, unitL, flat(0x17323d), -0.3, 0.2 - PAGE_GAP * 0.14, 0.008, 0.001, 0.045);

  // Slips: one from each light, each saying what comes next.
  const headTex = texOf(640, 100, (x) => { x.fillStyle = '#16263a'; x.font = `700 74px ${FONT}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('what is next', 6, 54); });
  const STROKE = col(0x1d2c40), MATCHED = col(0x0d7d74), rowY = (i) => 0.56 - i * 0.31;
  const makeSlip = (paperHex, missing) => { const g = new THREE.Group(); scene.add(g);
    const paper = add(g, unit, flat(0xffffff), 0, 0, 0, 1.7, 2.6), head = add(g, unit, flat(0xffffff, { map: headTex, transparent: true, depthWrite: false }), -0.03, 0.98, 0.006, 1.3, 1.3 * 100 / 640);
    add(g, unitL, flat(0x1d2c40), -0.66, 0.8, 0.005, 1.32, 0.012);
    const rows = SLIP_ROWS.map((L, i) => add(g, unitL, flat(0x1d2c40), -0.66, rowY(i), 0.006, (i === missing ? 0.001 : L), 0.085));
    return { g, paper, head, rows, base: col(paperHex) }; };
  const oldSlip = makeSlip(0xd9c9a0, -1), newSlip = makeSlip(0xf1ead6, GAP_ROW);
  const slipGap = add(newSlip.g, unitL, flat(CORAL, { map: gapTex, transparent: true, depthWrite: false }), -0.69, rowY(GAP_ROW), 0.008, SLIP_ROWS[GAP_ROW] + 0.06, 0.17);
  const ties = SLIP_ROWS.map(() => beam(0x0d9488, false)), tieStub = beam(CORAL, false), scan = beam(TEAL, false), frame = [0, 1, 2, 3, 4, 5].map(() => beam(TEAL, false)), joinGlow = glow(TEAL), gapGlow = glow(CORAL), pageGapGlow = glow(CORAL);
  const thread = beam(CORAL, false), threadGlow = beam(CORAL), mote = glow(0xffc46a, coreTex), moteHalo = glow(0xffb040), pulseDot = glow(TEAL, coreTex), pulseHalo = glow(TEAL);
  [thread, threadGlow, scan, tieStub, ...ties, ...frame].forEach((m) => { m.renderOrder = 12; });

  let W = 0, H = 0;
  function render(tIn, w, h) {
    const t = reduced ? STILL_T : clamp(tIn, 0, meta.seconds), portrait = h > w;
    if (w !== W || h !== H) { W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const part = ease((t - T_TEST) / 0.9), P = layout(portrait, part), dimS = mix(1, 0.6, part), ks = P.ks, S = P.slipS, slam = after(t, T_STAMP, 9);

    // camera: a slow push in, a knock when the stamp lands, a lean towards the slips for the test
    const d = P.d * (mix(1.05, 1.0, ease(t / 3)) - (portrait ? 0 : 0.03) * part);
    camera.position.set(0.28 * Math.sin(t * 0.33 + 0.5) + slam * 0.07 * Math.sin(t * 90), P.cy + 0.1 * Math.sin(t * 0.27) - slam * 0.09 * Math.cos(t * 70), d); camera.lookAt(0, P.cy, 0);
    bgU.uC.value.set(0, P.cy);

    // the two lights
    const retired = ease((t - T_STAMP) / 0.7), handed = ease((t - 15.15) / 0.8);
    const oldI = (0.62 + 0.05 * Math.sin(t * 1.9)) * mix(1, 0.62, retired) * mix(1, 0.45, handed), cutU = clamp((t - T_CUT) / CUT_LEN), cutting = ease((t - 3.12) / 0.38) * (1 - ease((t - 5.02) / 0.4));
    let pulseNew = after(t, T_CUT + CUT_LEN, 5) * 0.5 + after(t, T_OPEN + 0.3, 3) * 0.4 + after(t, T_JOIN, 2.5) * 0.5; for (const e of envs) pulseNew += after(t, e.arr, 8) * 0.35;
    const flick = t > T_CUT && t < T_CUT + CUT_LEN ? 0.25 * Math.sin(t * 61) * Math.sin(t * 23) + 0.25 : 0, newI = 1 + pulseNew + flick + 0.25 * handed;
    const oldX = -P.lx, oldY = P.ly + 0.04 * Math.sin(t * 1.1), restX = P.lx, restY = P.ly + 0.05 * Math.sin(t * 1.4 + 1);
    const toothY = P.ky - (0.2 + cutU * 7 * PITCH) * ks, newX = mix(restX, P.kx - (0.13 + TOOTH + 0.06) * ks, cutting), newY = mix(restY, toothY, cutting);
    put(oldGlow, oldX, oldY, 0.9, 3.4, 0.55 * oldI); put(oldCore, oldX, oldY, 0.9, 0.5, 0.9 * Math.min(1, oldI * 1.3));
    put(newGlow, newX, newY, 0.9, 2.4 + 0.5 * pulseNew, 0.75 * Math.min(1.6, newI)); put(newCore, newX, newY, 0.9, 0.34 + 0.06 * pulseNew, 1);
    oldLamp.position.set(oldX - 0.3, oldY - 0.2, 1.7); oldLamp.intensity = 9 * oldI * dimS; newLamp.position.set(newX + 0.1, newY, mix(1.7, 0.9, cutting)); newLamp.intensity = (5 + 4 * newI) * mix(1, 0.5, cutting) * dimS;
    bgU.uA.value.set(oldX, oldY, oldI * 1.1); bgU.uB.value.set(newX, newY, Math.min(1.5, newI) * 0.8);

    // the keys
    oldKey.g.position.set(-P.kx, P.ky, 0); newKey.g.position.set(P.kx, P.ky, 0); oldKey.g.scale.setScalar(ks); newKey.g.scale.setScalar(ks);
    oldKey.g.rotation.set(0, 0.16 * (1 - retired) * Math.sin(t * 0.9), -0.05 * retired); newKey.g.rotation.set(0, 0.12 * Math.sin(t * 0.8 + 2), 0);
    oldKey.setTeeth((i) => OLD_TEETH[i]); newKey.setTeeth((i) => mix(1, NEW_TEETH[i], ease((t - (T_CUT + i * CUT_LEN / 8)) / 0.17)));
    oldKey.mat.color.copy(BRASS).lerp(GREY, retired).multiplyScalar(dimS); oldKey.mat.metalness = mix(0.55, 0.05, retired); oldKey.mat.roughness = mix(0.42, 0.95, retired); oldKey.mat.emissive.copy(DEAD).multiplyScalar(retired);
    const made = ease((t - T_CUT) / (CUT_LEN + 0.2)); newKey.mat.color.copy(BLANK).lerp(PALE, made).multiplyScalar(mix(1, 0.72, part));
    newKey.mat.emissive.copy(TEALC).multiplyScalar(0.25 * after(t, T_CUT + CUT_LEN, 2.2) + 0.2 * after(t, T_OPEN, 2.5));

    // the stamp
    const sx = -P.kx + 0.04 * ks, sy = P.ky - 0.3 * ks, rot = -0.2; let tz = -1, off = 0;
    if (t > 1.5 && t < 3.04) { if (t < 2.22) { const k = ease((t - 1.5) / 0.72); tz = mix(6.5, 3.2, k); off = 1 - k; } else if (t < T_STAMP) tz = mix(3.2, 0.26, Math.pow((t - 2.22) / (T_STAMP - 2.22), 2.2)); else if (t < 2.64) tz = 0.26; else { const k = ease((t - 2.62) / 0.42); tz = mix(0.26, 5, k); off = -2.2 * k; } }
    tool.visible = tz > 0; tool.position.set(sx + off * 0.7, sy + Math.abs(off) * 0.9, tz); tool.scale.setScalar(ks); tool.rotation.set(0.25 * off, -0.2 * off, rot);
    const on = t >= T_STAMP ? 1 : 0; mark.visible = !!on; mark.position.set(sx, sy, 0.2); mark.rotation.z = rot; const ms = 1.5 * ks * (1 + 0.22 * after(t, T_STAMP, 16)); mark.scale.set(ms, ms * 200 / 640, 1); tint(mark, INKC, mix(1, 0.7, part));
    const ru = clamp((t - T_STAMP) / 0.55); ring.visible = !!on && ru < 1; ring.position.set(sx, sy, 0.15); ring.scale.set((0.6 + 2.4 * ru) * ks, (0.6 + 2.4 * ru) * 0.62 * ks, 1); ring.material.opacity = 0.55 * (1 - ru) * (1 - ru);
    dust.pts.position.set(sx, sy + 0.25 * ks, 0); dust.pts.scale.setScalar(ks); dust.u.uT.value = t; cut.pts.position.set(P.kx, P.ky, 0); cut.pts.scale.setScalar(ks); cut.u.uT.value = t; cut.u.uPx.value = dust.u.uPx.value = h / P.visH * 0.085 * ks;

    // the envelopes
    const kbOld = [-P.kx, P.ky - 1.27 * ks], kbNew = [P.kx, P.ky - 1.27 * ks], open = ease((t - T_OPEN) / 0.5), rise = ease((t - T_OPEN - 0.28) / 0.45);
    envs.forEach((e, i) => { const s = P.slots[i], ax = -P.kx + s[0] * ks, bx = P.kx + s[0] * ks, y0 = P.ky + s[1] * ks, k = ease((t - e.dep) / ENV_DUR), arc = Math.sin(Math.PI * k), last = i === 3, op = last ? open : 0;
      const x = mix(ax, bx, k), y = y0 + (0.42 * arc + 0.1 * op) * ks, sc = (1 + 0.16 * arc) * (1 + 0.34 * op) * ks;
      e.g.position.set(x, y, 0.1 + 0.7 * arc + 0.25 * op); e.g.rotation.z = 0.16 * Math.sin(2 * Math.PI * k) * (1 - k); e.g.scale.set(sc, sc, 1);
      const lit = mix(mix(0.66, 0.5, retired), 1.0, k) * (last ? mix(dimS, 0.9, 0.6) : dimS); tint(e.body, PAPER, lit); tint(e.flap, PAPER, lit * 0.9);
      e.pivot.rotation.x = op * 2.8;
      const gone = ease((t - e.dep + 0.1) / 0.3); e.sealOld.scale.setScalar(Math.max(0.001, 1 - gone)); e.sealOld.material.color.copy(SEAL_OLD).lerp(SEAL_DEAD, retired);
      const pop = t >= e.arr ? 1 + 0.9 * after(t, e.arr, 9) : 0.001; e.sealNew.scale.setScalar(pop); e.sealNew.material.color.copy(SEAL_NEW).lerp(TEALC, op).multiplyScalar(last ? 1 : mix(1, 0.75, part));
      e.card.position.y = 0.3 * rise; e.card.visible = last && rise > 0.01; if (last) tint(e.card, TEALC, mix(0.6, 1.0, rise) * mix(1, 0.85, part));
      const born = ease((t - 0.25 - i * 0.12) / 0.6); lay(e.oldThread, kbOld[0], kbOld[1], ax, y0 + 0.03 * ks, 0.022, 0.03, 0.5 * born * (1 - ease((t - T_STAMP) / 0.45)));
      const held = ease((t - e.arr) / 0.3), check = last ? after(t, T_OPEN - 0.1, 2.2) : 0; e.newThread.material.color.copy(INKC).lerp(TEALC, last ? ease((t - T_OPEN + 0.1) / 0.2) : 0);
      lay(e.newThread, kbNew[0], kbNew[1], bx, y0 + 0.03 * sc, 0.022 + 0.03 * check, 0.03, (0.3 + 0.6 * check) * held * mix(1, 0.6, part));
      lay(e.zap, newX, newY, bx, y0, 0.03, 0.85, 0.7 * after(t, e.arr, 7));
      if (last) put(cardGlow, x, y + 0.2 * ks, 1.0, (1.9 + 0.3 * Math.sin(t * 2.3)) * ks, (0.5 * rise + 0.5 * after(t, T_OPEN + 0.3, 3)) * mix(1, 0.55, part)); });

    // the shelf and its pages
    shelf.position.set(0, P.shelfY, 0); shelf.scale.setScalar(P.shS);
    const lift = ease((t - 12.35) / 0.6) * (1 - ease((t - 14.75) / 0.6)), mendU = clamp((t - T_MEND) / (T_MENDED - 0.08 - T_MEND)), mended = ease((t - T_MENDED) / 0.25);
    pages.forEach((p, pi) => { const L = pi === 2 ? lift : 0; p.g.position.set(mix(p.x, p.x + 0.12, L), mix(0.55, (P.liftY - P.shelfY) / P.shS, L), mix(-0.5, 0.75, L)); p.g.scale.setScalar(mix(1, P.liftS, L)); p.g.rotation.z = (pi - 1) * -0.035 * (1 - L);
      const k = mix(0.24, 0.34, part) + (pi === 2 ? 0.5 * L + 0.2 * after(t, T_MENDED, 1.2) + 0.12 * ease((t - 14.75) / 0.6) : 0); tint(p.paper, PAGE, k); p.strokes.forEach((m) => tint(m, PSTROKE, Math.min(1, k * 1.6))); });
    const seen = ease((t - 12.45) / 0.35) * (1 - mended); pageGap.visible = seen > 0.01; pageGap.material.opacity = seen * (0.75 + 0.25 * Math.sin(t * 9));
    pageFill.scale.x = Math.max(0.001, PAGE_ROWS[PAGE_GAP] * ease(mendU)); pageFill.material.color.copy(col(0x9a5a00)).lerp(MATCHED, mended);

    // the slips
    const out = ease((t - 9.25) / 0.7), go = ease((t - 9.45) / 1.65), snap = ease((t - T_JOIN + 0.15) / 0.3), sxF = (0.98 - 0.045 * snap) * S, matchK = ease((t - T_JOIN) / 0.4);
    [[oldSlip, -1, oldX, oldY], [newSlip, 1, restX, restY]].forEach(([s, side, lx0, ly0]) => { s.g.visible = out > 0.002; const sc = mix(0.06, 1, out) * mix(0.62, 1, go) * S;
      s.g.position.set(mix(lx0, side * sxF, go), mix(ly0 - 0.25, P.slipY, go) + 0.25 * Math.sin(Math.PI * go), 0.35 + 0.5 * Math.sin(Math.PI * go)); s.g.scale.set(sc, sc, 1); s.g.rotation.z = side * -0.22 * (1 - go) * (1 - go);
      tint(s.paper, s.base, (side < 0 ? 0.86 : 0.97) * mix(0.9, 1, go) + 0.06 * matchK); });
    const sy0 = P.slipY, hold = t >= ROW_T[GAP_ROW] && t < ROW_T[GAP_ROW + 1], fillU = ease((t - T_FILL) / 0.3);
    let scanY = null, scanOp = 0; ROW_T.forEach((rt, i) => { const hot = i === GAP_ROW ? (hold ? 1 : 0) : after(t, rt, 6), done = ease((t - (i === GAP_ROW ? T_FILL + 0.3 : rt) - 0.05) / 0.2);
      if (t >= rt && (ROW_T[i + 1] === undefined ? t < rt + 0.25 : t < ROW_T[i + 1])) { scanY = sy0 + rowY(i) * S; scanOp = i === GAP_ROW ? 1 : 1 - ease((t - rt - 0.12) / 0.13) * (ROW_T[i + 1] === undefined ? 1 : 0); }
      for (const s of [oldSlip, newSlip]) s.rows[i].material.color.copy(STROKE).lerp(MATCHED, Math.max(done, hot * (i === GAP_ROW ? 0 : 1)));
      if (i === GAP_ROW) oldSlip.rows[i].material.color.copy(STROKE).lerp(CORALC, 0.55 * ease((t - T_GAP) / 0.2) * (1 - fillU)).lerp(MATCHED, done);
      lay(ties[i], -sxF + 0.56 * S, sy0 + rowY(i) * S, sxF - 0.56 * S, sy0 + rowY(i) * S, 0.05 * S, 0.42, done, 1); });
    newSlip.rows[GAP_ROW].scale.x = Math.max(0.001, SLIP_ROWS[GAP_ROW] * fillU);
    const gapOn = ease((t - T_GAP) / 0.18) * (1 - fillU), beat = 0.7 + 0.3 * Math.sin((t - T_GAP) * 8); slipGap.visible = gapOn > 0.01; slipGap.material.opacity = gapOn * (0.8 + 0.2 * beat);
    const gx = sxF + (-0.69 + (SLIP_ROWS[GAP_ROW] + 0.06) / 2) * S, gy = sy0 + rowY(GAP_ROW) * S; put(gapGlow, gx, gy, 0.6, 1.9 + 0.3 * beat, 0.55 * gapOn * beat);
    lay(tieStub, -sxF + 0.56 * S, gy, sxF - 0.56 * S, gy, 0.05 * S, 0.42, gapOn, 0.42);
    const scanCol = hold && t > T_GAP - 0.05; scan.material.color.copy(scanCol ? CORALC : TEALC); lay(scan, -sxF - 0.93 * S, scanY ?? 0, sxF + 0.93 * S, scanY ?? 0, 0.022, 0.43, scanY === null || go < 1 ? 0 : 0.85 * scanOp * (scanCol ? 1 - ease((t - 12.3) / 0.5) * 0.6 : 1) * (hold ? 1 - fillU : 1));

    // from the gap to its source, the mend, and the news of it coming back down
    const pg = pages[2].g, ps = pg.scale.x * P.shS, pgx = pg.position.x * P.shS + (-0.3 + PAGE_ROWS[PAGE_GAP] / 2) * ps, pgy = P.shelfY + pg.position.y * P.shS + (0.2 - PAGE_GAP * 0.14) * ps;
    const reach = ease((t - 12.2) / 0.65), gone2 = 1 - ease((t - 14.75) / 0.4), tx0 = gx + 0.2 * S, ty0 = gy + 0.09 * S; thread.material.color.copy(CORALC).lerp(TEALC, mended); threadGlow.material.color.copy(thread.material.color);
    lay(thread, tx0, ty0, pgx, pgy - 0.06 * ps, 0.03, 0.8, 0.95 * gone2 * (reach > 0 ? 1 : 0), reach); lay(threadGlow, tx0, ty0, pgx, pgy - 0.06 * ps, 0.1, 0.8, 0.1 * gone2 * (reach > 0 ? 1 : 0), reach);
    put(pageGapGlow, pgx, pgy, 0.9, 1.5, 0.5 * seen * lift);
    const fly = ease((t - 12.7) / 0.4), px0 = pg.position.x * P.shS + (-0.3) * ps, wx = px0 + PAGE_ROWS[PAGE_GAP] * ps * ease(mendU), mx = mix(oldX, t < T_MEND ? px0 : wx, fly), my = mix(oldY, pgy, fly) + 0.3 * Math.sin(Math.PI * fly);
    const mo = (t > 12.7 ? 1 : 0) * (1 - ease((t - T_MENDED + 0.05) / 0.3)); put(mote, mx, my, 1.0, 0.3, mo); put(moteHalo, mx, my, 1.0, 1.3 + 0.3 * Math.sin(t * 30), 0.7 * mo);
    const dn = ease((t - T_MENDED - 0.08) / 0.42), po = (t > T_MENDED + 0.08 ? 1 : 0) * (1 - ease((t - T_FILL - 0.05) / 0.25)); put(pulseDot, mix(pgx, tx0, dn), mix(pgy, ty0, dn), 1.0, 0.3, po); put(pulseHalo, mix(pgx, tx0, dn), mix(pgy, ty0, dn), 1.0, 1.3, 0.75 * po);

    // they match: one teal line round both
    const x0 = -sxF - 0.92 * S, x1 = sxF + 0.92 * S, y0 = sy0 - 1.37 * S, y1 = sy0 + 1.37 * S, f1 = clamp((t - T_JOIN) / 0.2), f2 = clamp((t - T_JOIN - 0.18) / 0.2), f3 = clamp((t - T_JOIN - 0.36) / 0.2), fo = t >= T_JOIN ? 1 : 0;
    lay(frame[0], 0, y1, x0, y1, 0.05, 0.45, fo, f1); lay(frame[1], 0, y1, x1, y1, 0.05, 0.45, fo, f1); lay(frame[2], x0, y1, x0, y0, 0.05, 0.45, fo * (f2 > 0 ? 1 : 0), f2); lay(frame[3], x1, y1, x1, y0, 0.05, 0.45, fo * (f2 > 0 ? 1 : 0), f2); lay(frame[4], x0, y0, 0, y0, 0.05, 0.45, fo * (f3 > 0 ? 1 : 0), f3); lay(frame[5], x1, y0, 0, y0, 0.05, 0.45, fo * (f3 > 0 ? 1 : 0), f3);
    put(joinGlow, 0, sy0, 0.7, 6.5, 0.3 * after(t, T_JOIN + 0.1, 1.6) + 0.1 * matchK);

    renderer.render(scene, camera);
  }
  return { render, dispose() { for (const x of trash) x.dispose(); renderer.dispose(); } };
}
