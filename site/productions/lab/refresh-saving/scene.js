// The saving: two columns of context to true scale. The old session is a tall, heavy amber stack of scroll, one layer per
// 5,000 tokens, and its light re-reads all of it on every turn. The new session rises beside it, teal, and stops early; the
// empty air above it is what was saved. A pale band across the foot of both is the fixed load a hand-over cannot remove.
// Then the old stack lets go, and the small light is left with a shelf of three pages and a scroll just starting to grow.
// A lab scene (see ../harness.js for the contract). Every frame is a pure function of t; the only randomness is a
// fixed-seed PRNG run once in create(). Composed for 720x1280 first; 1280x720 also works. Apache-2.0. By c.productions.
export const meta = {
  id: 'refresh-saving',
  title: 'The saving, and the lesson',
  beat: 'One measured hand-over took an agent from 859,600 tokens of context to 118,600: 86% less to re-read on every turn, with a floor of about 75,000 that stays. So write it early, keep state in files, and load only what you need.',
  seconds: 17,
  sources: [{ title: 'How we refresh a session: a measured hand-over, context before and after', url: 'https://studio.agents.sovereignweb.site/productions/session-refresh/how-we-refresh-a-session/' }],
};

const INK = '#f4f1e8', AMBER = '#ffc857', TEAL = '#5fd0c5', SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif', SERIF = 'Georgia, "Times New Roman", serif';
// True scale: one unit of height is 60,000 tokens, one layer of scroll is 5,000.
const BEFORE = 859600, AFTER = 118600, FLOOR = 75000, UNIT = 60000, LAYER = 5000, TH = LAYER / UNIT;
const HT = BEFORE / UNIT, HS = AFTER / UNIT, HF = FLOOR / UNIT, NT = Math.ceil(BEFORE / LAYER), NS = Math.ceil(AFTER / LAYER), NF = FLOOR / LAYER, GROW = 2, CUT = 3;
const DEPTH = 1.6, SPEED = 8, TURN = 2.0;           // the reading light moves at one speed down both columns, once per turn
const T = { build: [0.1, 1.9], n1: 2.0, rise: [3.2, 4.5], n2: 4.5, ghost: [5.5, 6.5], n3: 6.3, floor: 8.1, n4: 8.3, go: 10.0, cam: [10.1, 12.0],
  p1: 10.5, p2: 12.5, p3: 14.5, grow: [11.9, 13.7], still: 9.6 };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, mix = (a, b, k) => a + (b - a) * k;
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

const GL = /* glsl */`
  const vec3 AMBER = vec3(1.0, 0.784, 0.341), TEAL = vec3(0.373, 0.816, 0.773), INK = vec3(0.957, 0.945, 0.91), DARK = vec3(0.05, 0.095, 0.15);
  float hash(float n){ return fract(sin(n) * 43758.5453); }
`;

export async function create({ canvas, THREE, reduced }) {
  const rnd = prng(859600), renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.autoClear = false; renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(16, 9 / 16, 1, 600), trash = [], V3 = THREE.Vector3;
  const keep = (x) => { trash.push(x); return x; };
  const uni = { uT: { value: 0 }, uW: { value: 2.4 }, uXT: { value: -1.8 }, uXS: { value: 1.8 }, uNT: { value: 0 }, uNS: { value: 0 }, uSwT: { value: -9 }, uSwS: { value: -9 },
    uFloor: { value: 0 }, uShrink: { value: 0 }, uLight: { value: new V3() }, uLightI: { value: 0 }, uGhostY: { value: 0 }, uGhostA: { value: 0 }, uTallA: { value: 0 }, uGauge: { value: 1 },
    uRes: { value: new THREE.Vector2(720, 1280) }, uBandX: { value: new THREE.Vector2(-4, 4) } };

  // The dark: navy from #0b1420 at the top to #12263a at the foot.
  const bg = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), keep(new THREE.ShaderMaterial({ uniforms: uni, depthTest: false, depthWrite: false,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform vec2 uRes; void main(){ vec2 u = gl_FragCoord.xy / uRes; float v = length((u - vec2(0.5, 0.45)) * vec2(0.9, 1.0)); gl_FragColor = vec4(mix(vec3(0.071,0.149,0.227), vec3(0.043,0.078,0.125), smoothstep(0.0, 0.85, u.y)) * (1.0 - 0.3 * v * v), 1.0); }' })));
  bg.frustumCulled = false; bg.renderOrder = -10; scene.add(bg);

  // The ground only shows where light falls on it; behind the columns a faint rule every 100,000 tokens.
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(80, 40)), keep(new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`${GL} uniform float uXT, uXS, uW, uTallA, uLightI, uFloor, uNS; uniform vec3 uLight; varying vec3 vW;
      void main(){ vec2 a = (vW.xz - vec2(uXT, 0.0)) / vec2(uW * 0.9, 1.6), b = vW.xz - uLight.xz;
        vec3 c = AMBER * uTallA * (0.2 * exp(-dot(a, a)) + 0.05 * exp(-dot(a, a) * 0.15));
        c += TEAL * uLightI * (0.5 / (dot(b, b) * 0.5 + 1.0 + uLight.y * uLight.y * 0.3)) * clamp(uNS, 0.0, 1.0);
        vec2 g = vW.xz / 1.2; vec2 fw = fwidth(g), l = abs(fract(g) - 0.5); float line = max(smoothstep(0.5 - fw.x * 1.3, 0.5, l.x), smoothstep(0.5 - fw.y * 1.3, 0.5, l.y));
        c += vec3(0.1, 0.2, 0.24) * line * 0.35 * exp(-dot(vW.xz, vW.xz) * 0.006);
        gl_FragColor = vec4(c, 1.0); }` })));
  ground.rotation.x = -Math.PI / 2; ground.renderOrder = -5; scene.add(ground);
  const gauge = new THREE.Mesh(keep(new THREE.PlaneGeometry(60, HT + 2)), keep(new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`${GL} uniform float uGauge, uXT, uXS, uW; varying vec3 vW;
      void main(){ float y = vW.y / ${(100000 / UNIT).toFixed(5)}, fw = fwidth(y), l = abs(fract(y + 0.5) - 0.5), line = 1.0 - smoothstep(0.0, fw * 1.4, l);
        float x0 = uXT - uW * 0.5 - 0.7, x1 = uXS + uW * 0.5 + 0.3, inX = smoothstep(x0 - 0.5, x0, vW.x) * smoothstep(x1 + 0.5, x1, vW.x);
        gl_FragColor = vec4(INK * line * inX * 0.13 * uGauge * step(0.2, y) * step(y, 9.2), 1.0); }` })));
  gauge.position.set(0, (HT + 2) / 2 - 0.5, -DEPTH / 2 - 0.25); gauge.renderOrder = -4; scene.add(gauge);

  // The layers of scroll: one thin slab per 5,000 tokens, each set down a little askew.
  const layers = [];
  for (let i = 0; i < NT; i++) layers.push({ kind: 0, i, y: i * TH, f: Math.min(1, BEFORE / LAYER - i) });
  for (let i = 0; i < NS + GROW; i++) layers.push({ kind: 1, i, y: i < NS ? i * TH : HS + (i - NS) * TH, f: i < NS ? Math.min(1, AFTER / LAYER - i) : 1 });
  const box = new THREE.BoxGeometry(1, 1, 1), lg = keep(new THREE.InstancedBufferGeometry()); lg.index = box.index; lg.setAttribute('position', box.attributes.position); lg.setAttribute('normal', box.attributes.normal);
  const aA = new Float32Array(layers.length * 4), aB = new Float32Array(layers.length * 4);
  layers.forEach((L, k) => { const heavy = L.kind === 0 ? 1 : 0.45; aA.set([L.kind, L.i, L.y, L.f], k * 4); aB.set([(rnd() - 0.5) * 0.16 * heavy, (rnd() - 0.5) * 0.14 * heavy, (rnd() - 0.5) * 0.1 * heavy, rnd()], k * 4); });
  lg.setAttribute('aA', new THREE.InstancedBufferAttribute(aA, 4)); lg.setAttribute('aB', new THREE.InstancedBufferAttribute(aB, 4)); lg.instanceCount = layers.length;
  const stack = new THREE.Mesh(lg, keep(new THREE.ShaderMaterial({ uniforms: uni,
    vertexShader: /* glsl */`${GL}
      uniform float uT, uW, uXT, uXS, uNT, uNS, uShrink; attribute vec4 aA, aB; varying vec3 vLoc, vN, vW; varying vec4 vI;
      void main(){ float kind = aA.x, i = aA.y, yb = aA.z, th = ${TH.toFixed(6)} * aA.w, a = clamp((kind < 0.5 ? uNT : uNS) - i, 0.0, 1.0), fade = 0.0, rot = aB.z, dx = aB.x;
        if (kind > 0.5) { float lo = ${(NF - CUT).toFixed(1)}; // the floor gives up a few layers, and everything above settles
          if (i >= lo && i < ${NF.toFixed(1)}) { th *= 1.0 - uShrink; yb = (lo + (i - lo) * (1.0 - uShrink)) * ${TH.toFixed(6)}; } else if (i >= ${NF.toFixed(1)}) yb -= ${(CUT * TH).toFixed(6)} * uShrink; }
        float drop = 0.0;
        if (kind < 0.5) { float q = max(0.0, uT - (${T.go.toFixed(2)} + (1.0 - i / ${(NT - 1).toFixed(1)}) * 1.25 + aB.w * 0.12)); fade = clamp(q / 0.85, 0.0, 1.0);
          dx -= (0.9 * q + 2.2 * q * q) * (0.4 + aB.w); drop = 2.6 * q * q; rot += q * 2.4 * (aB.w - 0.5); }
        float wsc = (1.0 + (aB.w - 0.5) * (kind < 0.5 ? 0.09 : 0.03)) * mix(0.7, 1.0, a) * (1.0 - fade * 0.6);
        vec3 p = position * vec3(uW * wsc, th * a * (1.0 - fade), ${DEPTH.toFixed(2)} * (1.0 - fade * 0.6)); float cs = cos(rot), sn = sin(rot);
        p = vec3(p.x * cs + p.z * sn, p.y, -p.x * sn + p.z * cs);
        p *= step(0.001, a); p += vec3((kind < 0.5 ? uXT : uXS) + dx, yb + th * 0.5 * a + (1.0 - a) * (kind < 0.5 ? 0.7 : 0.3) - drop, aB.y);
        vLoc = position; vN = normal; vW = p; vI = vec4(kind, i, aB.w, fade);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: /* glsl */`${GL}
      uniform float uT, uSwT, uSwS, uFloor, uLightI, uTallA; uniform vec3 uLight; varying vec3 vLoc, vN, vW; varying vec4 vI;
      void main(){ vec3 n = normalize(vN); float kind = vI.x, i = vI.y, top = step(0.5, n.y), front = step(0.5, n.z);
        float face = top > 0.5 ? 1.0 : (front > 0.5 ? 0.74 : 0.36), v = vLoc.y + 0.5, seam = mix(1.0, smoothstep(0.0, 0.3, v) * smoothstep(1.0, 0.75, v), 1.0 - top);
        float u = front > 0.5 ? vLoc.x : vLoc.z, word = step(0.38, hash(floor((u + 0.5) * 30.0 + vI.z * 9.0) + i * 13.7)) * (1.0 - top) * step(abs(u), 0.44);
        float h = i / ${(NT - 1).toFixed(1)}, tone = 0.84 + 0.3 * hash(i * 7.31 + kind * 3.0);
        // the old stack is heavy: darker and browner the further down it goes
        vec3 c = kind < 0.5 ? mix(vec3(0.62, 0.33, 0.12), AMBER, 0.25 + 0.6 * h) * mix(0.5, 0.92, h) : TEAL * 0.95;
        c *= face * tone * mix(0.42, 1.0, seam) * mix(1.0, kind < 0.5 ? 0.68 : 0.8, word) * (kind < 0.5 ? 1.0 : 1.18);
        if (kind > 0.5 && i > ${(NS - 0.5).toFixed(1)}) c = mix(c, INK * face, 0.35) * 1.2; // the newest layers, just written
        float sw = kind < 0.5 ? uSwT : uSwS, g = exp(-pow((vW.y - sw) / 0.42, 2.0)) + 0.35 * smoothstep(sw + 3.2, sw, vW.y) * step(sw, vW.y) * step(0.0, sw + 0.4);
        c += (kind < 0.5 ? vec3(1.0, 0.86, 0.5) : vec3(0.75, 1.0, 0.96)) * g * (0.3 + 0.5 * face) * (kind < 0.5 ? 0.75 : 0.4);
        // the fixed load, the same in both: tools, memory, the system prompt
        float fl = step(i, ${(NF - 0.5).toFixed(1)}) * uFloor; vec3 pale = INK * face * mix(0.5, 1.0, seam) * (0.86 + 0.14 * tone) * mix(1.0, 0.8, word);
        c = mix(c, pale, fl * 0.92);
        if (kind > 0.5) { vec3 L = uLight - vW; float d2 = dot(L, L); c += vec3(0.6, 1.0, 0.95) * uLightI * (max(dot(n, normalize(L)), 0.0) * 0.8 + 0.1) * 0.35 / (d2 + 0.25) * (1.0 - fl * 0.6); }
        c = mix(c, DARK, vI.w);
        gl_FragColor = vec4(c, 1.0); }` })));
  stack.frustumCulled = false; scene.add(stack);

  // The saving: the empty air above the short column, drawn as the layers that are no longer there.
  const ghost = new THREE.Mesh(keep(new THREE.BoxGeometry(1, 1, 1)), keep(new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vLoc, vN, vW; void main(){ vLoc = position; vN = normal; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`${GL} uniform float uT, uGhostY, uGhostA; varying vec3 vLoc, vN, vW;
      void main(){ vec3 n = abs(normalize(vN)); if (n.y > 0.5 && vLoc.y < 0.0) discard;
        float u = n.z > 0.5 ? vLoc.x : (n.x > 0.5 ? vLoc.z : vLoc.x), w = n.y > 0.5 ? vLoc.z : 0.0, fu = fwidth(u), fwz = fwidth(w);
        float edge = 1.0 - smoothstep(0.0, fu * 2.2, 0.5 - abs(u)); if (n.y > 0.5) edge = max(edge, 1.0 - smoothstep(0.0, fwz * 2.2, 0.5 - abs(w)));
        float ly = vW.y / ${TH.toFixed(6)}, fl = fwidth(ly), rule = (1.0 - smoothstep(0.0, max(fl * 1.2, 0.08), abs(fract(ly + 0.5) - 0.5))) * clamp(1.6 - fl * 1.2, 0.25, 1.0);
        float dash = step(0.35, fract(u * 9.0 + floor(ly) * 0.37)), shown = smoothstep(uGhostY + 0.05, uGhostY - 0.5, vW.y), lead = exp(-pow((vW.y - uGhostY) / 0.35, 2.0));
        float breathe = 0.85 + 0.15 * sin(uT * 1.6 - vW.y * 0.7), frontK = n.z > 0.5 ? 1.0 : 0.45;
        float al = (edge * 0.7 + rule * dash * 0.2 * frontK + 0.05 * frontK) * shown * breathe + lead * 0.5 * step(uGhostY, ${(HT - 0.02).toFixed(3)});
        gl_FragColor = vec4(mix(TEAL, INK, 0.35) * al * uGhostA, 1.0); }` })));
  ghost.renderOrder = 3; scene.add(ghost);
  const lineMat = () => keep(new THREE.MeshBasicMaterial({ color: 0xf4f1e8, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  const unitBox = keep(new THREE.BoxGeometry(1, 1, 1)), bar = () => { const m = new THREE.Mesh(unitBox, lineMat()); m.renderOrder = 4; scene.add(m); return m; };
  const brV = bar(), brT = bar(), brB = bar(), level = bar();

  // The band behind the foot of both columns, and its edge: lit last, and still.
  const band = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`${GL} uniform float uFloor; varying vec2 vUv;
      void main(){ float fy = fwidth(vUv.y), edge = 1.0 - smoothstep(0.0, fy * 2.5, 1.0 - vUv.y), ends = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
        gl_FragColor = vec4(INK * (edge * 0.9 + 0.34 + 0.12 * vUv.y) * ends * uFloor, 1.0); }` })));
  band.renderOrder = -3; scene.add(band);

  // Lights, never figures: a soft glow and a hard core each.
  const gc = document.createElement('canvas'); gc.width = gc.height = 256; const gx = gc.getContext('2d'), grad = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.1, 'rgba(255,255,255,0.75)'); grad.addColorStop(0.24, 'rgba(255,255,255,0.22)'); grad.addColorStop(0.55, 'rgba(255,255,255,0.05)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = grad; gx.fillRect(0, 0, 256, 256);
  const glowTex = keep(new THREE.CanvasTexture(gc)); glowTex.colorSpace = THREE.SRGBColorSpace;
  const glow = (color) => { const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, toneMapped: false }))); s.renderOrder = 6; scene.add(s); return s; };
  const oldLight = glow(0xffc857), newLight = glow(0x8ff0e6), newCore = glow(0xffffff), spark = glow(0xc8fff8), shelfGlow = glow(0x5fd0c5), pageGlow = glow(0x8ff0e6);

  // The shelf and its three pages.
  const solid = (g, col, lines) => { const u = { uC: { value: new THREE.Color(col) }, uLit: { value: 0 }, uLight: uni.uLight, uLightI: uni.uLightI };
    const m = new THREE.Mesh(g, keep(new THREE.ShaderMaterial({ uniforms: u,
      vertexShader: 'varying vec3 vLoc, vN, vW; void main(){ vLoc = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: /* glsl */`${GL} uniform vec3 uC, uLight; uniform float uLit, uLightI; varying vec3 vLoc, vN, vW;
        void main(){ vec3 n = normalize(vN); float face = n.y > 0.5 ? 1.0 : (n.z > 0.5 ? 0.72 : 0.38), rule = 0.0;
          ${lines ? 'float ry = (vLoc.y + 0.5) * 9.0; rule = step(0.5, n.z) * step(1.0, ry) * step(ry, 8.0) * step(abs(fract(ry) - 0.5), 0.14) * step(abs(vLoc.x + 0.04 * floor(ry)), 0.36 - 0.07 * hash(floor(ry) * 3.1));' : ''}
          vec3 c = uC * face * mix(0.34, 1.0, uLit); c = mix(c, mix(DARK * 1.5, INK, uLit), rule * 0.8); c += uC * uLit * 0.22;
          vec3 L = uLight - vW; c += vec3(0.6, 1.0, 0.95) * uLightI * (max(dot(n, normalize(L)), 0.0) * 0.7 + 0.1) * 0.3 / (dot(L, L) + 0.5);
          gl_FragColor = vec4(c, 1.0); }` }))); m.userData.u = u; return m; };
  const shelf = new THREE.Group(), plank = solid(keep(new THREE.BoxGeometry(2.3, 0.09, 0.9)), 0x3f8f8a, false); plank.position.y = 0.3; shelf.add(plank);
  const legG = keep(new THREE.BoxGeometry(0.09, 0.3, 0.8)); for (const s of [-1, 1]) { const l = solid(legG, 0x2c6a68, false); l.position.set(s * 1.0, 0.15, 0); shelf.add(l); plank.userData['leg' + s] = l; }
  const pageG = keep(new THREE.BoxGeometry(0.58, 0.82, 0.05)), pages = [-0.72, 0, 0.72].map((x, k) => { const p = solid(pageG, 0x5fd0c5, true); p.position.set(x, 0.345 + 0.41, 0.05); p.rotation.x = -0.1; p.rotation.y = 0.12 - k * 0.05; shelf.add(p); return p; });
  scene.add(shelf);

  // Words: drawn once per frame size on 2D canvases, laid over the picture, each tied to the thing it names.
  const hud = new THREE.Scene(), hudCam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1), unitQ = keep(new THREE.PlaneGeometry(1, 1));
  const WORDS = [['859,600', AMBER, SANS, 600], ['118,600', TEAL, SANS, 600], ['86% less', INK, SANS, 700], ['floor: about 75,000', INK, SANS, 500],
    ['Write it early.', INK, SERIF, 400], ['Keep state in files.', INK, SERIF, 400], ['Load only what you need.', INK, SERIF, 400]];
  const texts = WORDS.map(() => { const c = document.createElement('canvas'), tex = keep(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    const mesh = new THREE.Mesh(unitQ, keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }))); hud.add(mesh); return { c, tex, mesh }; });
  const dots = [0, 1, 2].map(() => { const m = new THREE.Mesh(unitQ, keep(new THREE.MeshBasicMaterial({ map: glowTex, color: 0x8ff0e6, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }))); hud.add(m); return m; });
  const leaders = [0, 1, 2].map(() => { const m = new THREE.Mesh(unitQ, keep(new THREE.MeshBasicMaterial({ color: 0xf4f1e8, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }))); hud.add(m); return m; });
  let S = 1;
  function layoutText(w, h, portrait) {
    S = (portrait ? w : h) / 720; const sizes = portrait ? [42, 38, 46, 30, 50, 50, 50] : [40, 34, 44, 24, 40, 40, 40];
    texts.forEach((X, i) => { const [word, col, font, weight] = WORDS[i], F = Math.round(sizes[i] * S), x = X.c.getContext('2d'); x.font = `${weight} ${F}px ${font}`;
      const tw = Math.ceil(x.measureText(word).width), pad = Math.round(F * 0.5); X.c.width = tw + pad * 2; X.c.height = Math.round(F * 1.5) + pad; const c = X.c.getContext('2d');
      c.font = `${weight} ${F}px ${font}`; c.textBaseline = 'middle'; c.shadowColor = 'rgba(8,15,25,0.9)'; c.shadowBlur = F * 0.35; c.fillStyle = col; c.fillText(word, pad, X.c.height / 2); c.shadowBlur = 0; c.fillText(word, pad, X.c.height / 2);
      X.tex.needsUpdate = true; X.tex.dispose(); X.w = X.c.width; X.h = X.c.height; X.pad = pad; X.mesh.scale.set(X.w, X.h, 1); });
  }
  // place a word: (x, y) in pixels from the top left; align -1 starts there, 0 centres, 1 ends there
  const place = (i, x, y, align, o, H) => { const X = texts[i]; X.mesh.material.opacity = o; X.mesh.visible = o > 0.003; X.mesh.position.set(Math.round(x - align * (X.w / 2 - X.pad)), Math.round(H - y), 0); };

  // Two framings per shape of frame: the whole of the tall column, then close on what is left.
  const SHOTS = { port: { W: 2.2, a: [1.47, 6.62, 20.9, -0.2, 0.085], b: [3.1, 0.2, 11.1, -0.3, 0.15] }, land: { W: 3.0, a: [1.6, 6.45, 20.2, -0.2, 0.085], b: [4.3, 0.15, 7.2, -0.3, 0.15] } };
  let W = 0, Hh = 0, xT = -1.8, xS = 1.8, colW = 2.4, shelfX = 4.6, brX = 3.45; const v = new V3(), tgt = new V3();
  const px = (x, y, z, w, h) => { v.set(x, y, z).project(camera); return [(v.x * 0.5 + 0.5) * w, (0.5 - v.y * 0.5) * h]; };
  const setBar = (m, x, y, z, sx, sy, o) => { m.position.set(x, y, z); m.scale.set(Math.max(sx, 1e-4), Math.max(sy, 1e-4), 0.02); m.material.opacity = o; m.visible = o > 0.003; };

  function render(tIn, w, h) {
    const t = reduced ? T.still : clamp(tIn, 0, meta.seconds), portrait = h > w, K = portrait ? SHOTS.port : SHOTS.land;
    if (w !== W || h !== Hh) { W = w; Hh = h; renderer.setSize(w, h, false); hudCam.right = w; hudCam.top = h; hudCam.updateProjectionMatrix(); camera.aspect = w / h; camera.updateProjectionMatrix();
      uni.uRes.value.set(w, h); layoutText(w, h, portrait); colW = K.W; xT = -(colW / 2 + 0.6); xS = colW / 2 + 0.6; brX = xS + colW / 2 + 0.45; shelfX = xS + colW / 2 + 0.55 + 1.15;
      uni.uW.value = colW; uni.uXT.value = xT; uni.uXS.value = xS; shelf.position.set(shelfX, 0, 0); }
    uni.uT.value = t;

    // camera: one slow drift over the comparison, then one move in as the old column lets go
    const k = ease((t - T.cam[0]) / (T.cam[1] - T.cam[0])), A = K.a, B = K.b, hv = mix(A[2], B[2], k) * (1 + 0.035 * (1 - ease(t / 2.4))), yaw = mix(A[3] + 0.05 * (t / 10), B[3] + 0.02 * (t - 12), k), el = mix(A[4], B[4], k);
    const d = hv / (2 * Math.tan(camera.fov * Math.PI / 360)); tgt.set(mix(A[0], B[0], k), mix(A[1], B[1], k), 0);
    camera.position.set(tgt.x + d * Math.sin(yaw) * Math.cos(el), tgt.y + d * Math.sin(el), d * Math.cos(yaw) * Math.cos(el)); camera.lookAt(tgt);
    camera.near = d * 0.5; camera.far = d * 2; camera.updateProjectionMatrix(); camera.updateMatrixWorld();

    // the tall column stands first: slow at the foot, then faster, as a long session does
    const nT = NT * Math.pow(clamp((t - T.build[0]) / (T.build[1] - T.build[0])), 1.5) + 0.001, topT = Math.min(HT, nT * TH), gone = clamp((t - T.go) / 1.4);
    const rise = ease((t - T.rise[0]) / (T.rise[1] - T.rise[0])), g1 = ease((t - T.grow[0]) / 0.6), g2 = ease((t - T.grow[1]) / 0.6), shrink = ease((t - T.p3 - 0.15) / 0.9);
    const nS = NS * rise + g1 + g2, topS = Math.min(HS, NS * rise * TH) + (g1 + g2) * TH - CUT * TH * shrink;
    uni.uNT.value = nT; uni.uNS.value = nS; uni.uShrink.value = shrink;
    // each turn the light reads its whole column from the top, at the same speed: the old one is hardly ever done
    const ph = (t0) => t < t0 ? -1 : (t - t0) % TURN, pT = ph(T.n1), pS = ph(T.n2 + 0.5 - TURN * 2);
    uni.uSwT.value = pT < 0 || t > T.go ? -9 : HT - pT * SPEED; uni.uSwS.value = pS < 0 || t < T.n2 + 0.5 ? -9 : topS - pS * SPEED;
    const floor = ease((t - T.floor) / 0.6); uni.uFloor.value = floor; uni.uTallA.value = clamp(nT / 30) * (1 - gone); uni.uGauge.value = ease(t / 1.2) * (1 - ease((t - T.go) / 1.5));

    // the two lights
    const reading = pT >= 0 && t < T.go ? (pT * SPEED < HT ? 1 : 0.55) : 0.55, oA = clamp((t - 0.1) / 0.4) * (1 - clamp((t - T.go) / 0.5)) * (0.5 + 0.2 * reading + 0.06 * Math.sin(t * 9.1));
    oldLight.position.set(xT, topT + 0.38, 0); oldLight.scale.setScalar(2.6); oldLight.material.opacity = oA; oldLight.visible = oA > 0.003;
    const ly = topS + 0.36 + 0.035 * Math.sin(t * 1.7), lI = clamp((t - T.rise[0]) / 0.3), blink = pS >= 0 && t >= T.n2 + 0.5 ? Math.exp(-pS * 3.5) : 0;
    uni.uLight.value.set(xS, ly, 0.05); uni.uLightI.value = lI * (1 + 0.5 * blink);
    newLight.position.set(xS, ly, 0.05); newLight.scale.setScalar(2.3 + 0.5 * blink); newLight.material.opacity = lI * 0.85; newLight.visible = lI > 0.003;
    newCore.position.copy(newLight.position); newCore.scale.setScalar(0.62); newCore.material.opacity = lI; newCore.visible = lI > 0.003;

    // the gap, measured upward from the new column to the height of the old
    const gk = ease((t - T.ghost[0]) / (T.ghost[1] - T.ghost[0])), gA = (1 - ease((t - T.go) / 0.7)), gy = mix(HS, HT, gk);
    uni.uGhostY.value = gy; uni.uGhostA.value = gA * step01(t - T.ghost[0]); ghost.visible = gA > 0.003 && t > T.ghost[0];
    ghost.position.set(xS, (HS + HT) / 2, 0); ghost.scale.set(colW, HT - HS, DEPTH);
    const bw = 0.045 * (portrait ? 1 : 1.5), bo = gA * ease((t - T.ghost[0] - 0.2) / 0.5) * 0.85;
    setBar(brV, brX, (HS + gy) / 2, 0, bw, gy - HS, bo); setBar(brB, brX - 0.12, HS, 0, 0.34, bw, bo); setBar(brT, brX - 0.12, gy, 0, 0.34, bw, bo * gk);
    const lv = ease((t - T.ghost[1] + 0.2) / 0.5) * gA; setBar(level, (xT + colW / 2 + brX) / 2 + 0.05, HT, 0, (brX - xT - colW / 2 - 0.1) * lv, bw * 0.7, 0.4 * lv);

    // the floor band: across both while both stand, then only under what is left
    const bx0 = mix(xT - colW / 2 - 0.55, xS - colW / 2 - 0.3, gone), bx1 = xS + colW / 2 + 0.3, bh = HF - CUT * TH * shrink;
    band.position.set((bx0 + bx1) / 2, bh / 2, 0); band.scale.set(bx1 - bx0, bh, 1); band.visible = floor > 0.003;

    // the lesson: a spark carries the first page to the shelf while the scroll is still short; the shelf lights; the floor gives a little
    const s1 = clamp((t - T.p1 - 0.1) / 0.55), lit1 = ease((t - T.p1 - 0.55) / 0.4), lit2 = ease((t - T.p2 - 0.1) / 0.5), pulse3 = ease((t - T.p3) / 0.3) * (1 - 0.6 * ease((t - T.p3 - 1.1) / 0.8));
    const p0x = shelfX + pages[0].position.x, p0y = pages[0].position.y, e1 = ease(s1);
    spark.position.set(mix(xS, p0x, e1), mix(ly, p0y, e1) + 0.7 * Math.sin(Math.PI * e1), 0.3); spark.scale.setScalar(0.7); spark.material.opacity = s1 > 0 && s1 < 1 ? 1 : 0; spark.visible = s1 > 0 && s1 < 1;
    const idle = 0.5 * clamp((t - T.rise[0]) / 0.8); shelf.visible = t > T.rise[0];
    pages[0].userData.u.uLit.value = Math.max(idle, lit1 * (1 - 0.18 * lit2)); pages[1].userData.u.uLit.value = Math.max(idle, lit2 * 0.82); pages[2].userData.u.uLit.value = Math.max(idle, lit2 * 0.82);
    plank.userData.u.uLit.value = Math.max(idle * 0.7, lit2); for (const s of [-1, 1]) plank.userData['leg' + s].userData.u.uLit.value = Math.max(idle * 0.6, lit2 * 0.8);
    pageGlow.position.set(p0x, p0y, 0.4); pageGlow.scale.setScalar(2.2); pageGlow.material.opacity = lit1 * (0.5 - 0.25 * lit2) * (1 + 0.6 * (1 - ease((t - T.p1 - 0.55) / 1.2)) * lit1); pageGlow.visible = lit1 > 0.003;
    shelfGlow.position.set(shelfX, 0.42, 0.3); shelfGlow.scale.set(5.2, 2.6, 1); shelfGlow.material.opacity = lit2 * (0.42 + 0.3 * (1 - ease((t - T.p2 - 0.6) / 1.2))); shelfGlow.visible = lit2 > 0.003;
    uni.uFloor.value = floor * (1 + 0.08 * pulse3);

    renderer.clear(); renderer.render(scene, camera);

    // words, each beside its thing
    const off = 1 - ease((t - T.go) / 0.5), on = (t0) => ease((t - t0) / 0.5) * off;
    if (portrait) {
      let p = px(xT, HT, 0, w, h); place(0, p[0], p[1] - 42 * S, 0, on(T.n1), h);
      p = px(brX, HS, 0, w, h); place(1, p[0] + 22 * S, p[1] - 62 * S, -1, on(T.n2), h);
      p = px(brX, (HS + HT) / 2, 0, w, h); place(2, p[0] + 22 * S, p[1], -1, on(T.n3), h);
      p = px((xT + xS) / 2, 0, DEPTH / 2, w, h); place(3, p[0], p[1] + 34 * S, 0, on(T.n4), h);
    } else {
      let p = px(xT - colW / 2, HT, 0, w, h); place(0, p[0] - 26 * S, p[1] + 26 * S, 1, on(T.n1), h);
      p = px(brX, HS, 0, w, h); place(1, p[0] + 20 * S, p[1] - 44 * S, -1, on(T.n2), h);
      p = px(brX, (HS + HT) / 2, 0, w, h); place(2, p[0] + 24 * S, p[1], -1, on(T.n3), h);
      p = px(xT - colW / 2 - 0.55, HF / 2, 0, w, h); place(3, p[0] - 14 * S, p[1], 1, on(T.n4), h);
    }
    // the three habits, each set beside the thing that answers it
    const pg = px(shelfX + pages[0].position.x, 1.22, 0.05, w, h), sh = px(shelfX, 0, 0.45, w, h), shR = px(shelfX + 1.15, 0.3, 0, w, h), fl = px(xS, 0, DEPTH / 2, w, h).slice();
    const pg2 = pg.slice(), sh2 = sh.slice(), shR2 = shR.slice();
    const L = portrait ? [[w - 40 * S, pg2[1] - 130 * S, 1, pg2[0], pg2[1] - 100 * S, pg2[0], pg2[1] - 12 * S], [w - 40 * S, sh2[1] + 112 * S, 1, sh2[0], sh2[1] + 82 * S, sh2[0], sh2[1] + 14 * S], [60 * S, sh2[1] + 215 * S, -1, fl[0], sh2[1] + 185 * S, fl[0], fl[1] + 14 * S]]
      : [[pg2[0] - 24 * S, pg2[1] - 105 * S, -1, pg2[0], pg2[1] - 78 * S, pg2[0], pg2[1] - 10 * S], [shR2[0] + 70 * S, shR2[1], -1, shR2[0] + 58 * S, shR2[1], shR2[0] + 12 * S, shR2[1]], [fl[0] - 130 * S, fl[1] + 64 * S, -1, fl[0], fl[1] + 40 * S, fl[0], fl[1] + 12 * S]];
    [T.p1, T.p2, T.p3].forEach((t0, i) => { const o = reduced ? 0 : ease((t - t0) / 0.6), [x, y, al, x0, y0, x1, y1] = L[i], hot = [lit1, lit2, pulse3][i];
      place(4 + i, x, y + (1 - o) * 14 * S, al, o, h);
      const ld = leaders[i]; ld.position.set((x0 + x1) / 2, h - (y0 + y1) / 2, 0); ld.scale.set(Math.max(Math.abs(x1 - x0) * o, 2 * S), Math.max(Math.abs(y1 - y0) * o, 2 * S), 1); ld.material.opacity = o * 0.55; ld.visible = o > 0.003;
      const dd = dots[i]; dd.position.set(x1, h - y1, 0); dd.scale.setScalar((22 + 16 * hot) * S); dd.material.opacity = o * (0.6 + 0.4 * hot); dd.visible = o > 0.003; });
    renderer.clearDepth(); renderer.render(hud, hudCam);
  }
  function step01(x) { return x > 0 ? 1 : 0; }
  return { render, dispose() { for (const x of trash) x.dispose(); box.dispose(); renderer.dispose(); } };
}
