// Refresh line: a long channel on a dark plain is a gauge of context, nought to a million tokens. A bright teal bar
// lies across it at 300,000. A warm light (the agent) runs down the channel at one steady speed and leaves a slat behind
// it for every ten thousand tokens, each a little taller and hotter than the last. Up to the bar the slats stay inside
// the channel; the light breaks straight through the bar, which stays broken, and from there the slats stand proud of the rim and burn. Where
// real hand-overs happened a pale pin stays standing: five of them, all past the bar, the last where the light ends.
// A lab scene (see ../harness.js for the contract). render(t) is a pure function of t: all randomness comes from one
// fixed-seed PRNG run in create(). Apache-2.0. By c.productions.
export const meta = {
  id: 'refresh-line',
  title: 'The line nobody stops at',
  beat: 'The rule says hand over before 300,000 tokens of context. Every hand-over that can be evidenced came later, the latest at 845,000.',
  seconds: 8,
  sources: [
    { title: 'How we refresh a session, section 7: the numbers', url: 'https://studio.agents.sovereignweb.site/productions/session-refresh/how-we-refresh-a-session/' },
    { title: 'Token-efficiency policy, rule 2', url: 'https://web-summit.sgit.ai/abp/token-efficiency/' },
  ],
};

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', TAU = Math.PI * 2;
const LEN = 20, LINE = 0.3, END = 0.845, RAIL = 0.5, HALF = 0.5;         // the gauge is LEN long; u is 0..1 along it
const T_LINE = 2.5, T_END = 6.5, SPEED = (END - LINE) / (T_END - T_LINE), T_GO = T_LINE - LINE / SPEED;  // one steady speed
const HANDOVERS = [{ u: 0.484, z: 0.44 }, { u: 0.518, z: 0.2 }, { u: 0.6, z: -0.04 }, { u: 0.6, z: -0.48 }, { u: 0.845, z: 0 }];
const T_MARK = HANDOVERS.map((m, i) => T_GO + m.u / SPEED + (i === 3 ? 0.45 : 0));   // each lands as the light passes it
const PIN_TOP = 2.4, BW = 1.5, BAR_Y = 0.8, T_FLICK = 7.15, STILL_T = 7.4;
const CAM = {
  land: { sx: 0.8, close: { d: 17.5, tx: -2.2 }, fov: 34, a: [0.5, 0.62], el: [0.2, 0.25], d: [21, 19.5], tx: [-0.5, 0.7], ty: [1.2, 1.2], tz: 0 },
  port: { sx: 0.5, close: { d: 9.6, tx: -2.3 }, fov: 40, a: [1.36, 1.26], el: [0.78, 0.66], d: [15.4, 15.0], tx: [0.75, 1.05], ty: [0.6, 0.9], tz: 0 },
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, mix = (a, b, k) => a + (b - a) * k;
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const X = (u) => (u - 0.5) * LEN, slatH = (u) => 0.07 + 1.45 * u;       // at the line a slat is level with the rim

const COMMON = /* glsl */`
  const vec3 AMBER = vec3(1.0, 0.784, 0.341); const vec3 TEAL = vec3(0.373, 0.816, 0.773); const vec3 INK = vec3(0.957, 0.945, 0.91);
  uniform float uT, uHead, uCamD, uSX, uHold;
  // what the light leaves behind: dim amber near nought, deep orange past the line, coral-hot at the far end
  vec3 heat(float u) { vec3 c = mix(AMBER * 0.62, vec3(1.0, 0.6, 0.2), smoothstep(0.15, 0.5, u)); c = mix(c, vec3(1.0, 0.37, 0.25), smoothstep(0.5, 0.92, u)); return c * (0.5 + 1.15 * u); }
  float gaugeU(float x) { return x / ${LEN.toFixed(1)} + 0.5; }
  float behind(float u, float soft) { return smoothstep(-0.004 - soft, soft * 0.5, u) * (1.0 - smoothstep(uHead - 0.012 - soft, uHead + 0.004 + soft * 0.5, u)); }
  vec3 fogMix(vec3 c, float dist) { float f = smoothstep(uCamD * 0.9, uCamD * 3.2 + 40.0, dist); return mix(c, vec3(0.071, 0.149, 0.227), f); }
`;

export async function create({ canvas, THREE, reduced }) {
  const rnd = prng(300845), V3 = THREE.Vector3;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.autoClear = false; renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.2, 900), trash = [];
  const keep = (x) => { trash.push(x); return x; };
  const uni = { uT: { value: 0 }, uHead: { value: 0 }, uCamD: { value: 25 }, uSX: { value: 1 }, uHold: { value: 0 }, uCross: { value: 0 }, uMark: { value: HANDOVERS.map(() => new THREE.Vector4()) } };

  const root = new THREE.Group(); scene.add(root);
  // ---- sky and the plain, lit by whatever stands in the channel ----
  scene.add(new THREE.Mesh(keep(new THREE.SphereGeometry(500, 24, 12)), keep(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vD; void main(){ vec3 d = normalize(vD); float k = smoothstep(0.0, 0.5, d.y); vec3 c = mix(vec3(0.071,0.149,0.227), vec3(0.043,0.078,0.125), k); gl_FragColor = vec4(c, 1.0); }' }))));
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(900, 900)), keep(new THREE.ShaderMaterial({ uniforms: uni,
    vertexShader: 'uniform float uSX; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = vec3(w.x / uSX, w.y, w.z); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      varying vec3 vW; uniform float uCross; uniform vec4 uMark[5]; ${COMMON}
      void main(){
        float u = gaugeU(vW.x), az = abs(vW.z); vec3 c = vec3(0.034, 0.062, 0.102);
        c *= 1.0 - 0.55 * smoothstep(${(HALF + 0.08).toFixed(2)}, ${(HALF - 0.02).toFixed(2)}, az) * step(-0.006, u) * step(u, 1.006);   // the channel floor
        // the slats light the plain beside them: a little near nought, a great deal at the far end
        float hh = 0.07 + 1.45 * clamp(u, 0.0, 1.0), side = max(az - ${HALF.toFixed(1)}, 0.0);
        c += heat(clamp(u, 0.0, 1.0)) * behind(u, side * 0.035) * (1.0 + 0.9 * uHold * smoothstep(0.3, 0.85, u)) * (0.42 * exp(-side / (0.25 + hh * 0.9)) + 0.10 * exp(-side / (1.2 + hh * 3.0)));
        // the light's own pool
        float hx = (uHead - 0.5) * ${LEN.toFixed(1)}; float dh = length(vec2((vW.x - hx) * uSX, vW.z));
        c += vec3(1.0, 0.8, 0.45) * (0.5 * exp(-dh * 1.1) + 0.12 * exp(-dh * 0.3));
        // the rule: a teal line across the plain, and one wave when it is crossed
        float dx = vW.x - ${X(LINE).toFixed(2)}, zf = smoothstep(9.0, 1.0, az);
        float lineOn = mix(1.0, 0.45, uCross); c += TEAL * lineOn * (0.9 * exp(-pow(dx / 0.045, 2.0)) * smoothstep(${(BW + 3.0).toFixed(1)}, ${BW.toFixed(1)}, az) + (0.16 * exp(-abs(dx) * uSX * 3.0) * smoothstep(${(BW + 1.5).toFixed(1)}, ${(BW - 0.5).toFixed(1)}, az) + 0.06 * exp(-abs(dx) * 1.5)) * zf);
        float age = uT - ${T_LINE.toFixed(2)}, rr = age * 3.2; c += TEAL * step(0.0, age) * 0.35 * exp(-pow((length(vec2(dx * uSX, vW.z)) - rr) / 0.22, 2.0)) * exp(-age * 1.6);
        // ruler ticks every 100,000 on the near side
        float tk = abs(fract(u * 10.0 + 0.5) - 0.5) / 10.0 * ${LEN.toFixed(1)} * uSX; float fw = fwidth(vW.x) * uSX;
        c += INK * 0.2 * smoothstep(0.03 + fw, 0.03, tk) * step(-0.01, u) * step(u, 1.01) * step(0.78, vW.z) * step(vW.z, 1.2);
        // each hand-over leaves a pale ring on the plain
        for (int i = 0; i < 5; i++) { vec4 m = uMark[i]; float d = length(vec2((vW.x - m.x) * uSX, vW.z - m.y)), a = m.w;
          c += INK * step(0.0, a) * (0.3 * exp(-pow((d - a * 2.6) / 0.16, 2.0)) * exp(-a * 1.8) + 0.07 * exp(-d * 0.8) * smoothstep(0.0, 0.4, a)); }
        gl_FragColor = vec4(fogMix(c, distance(cameraPosition, vec3(vW.x * uSX, vW.y, vW.z))), 1.0);
      }` })));
  ground.rotation.x = -Math.PI / 2; root.add(ground);

  // ---- the channel: two rails and two end stops, dark slate lit from inside ----
  const unitBox = keep(new THREE.BoxGeometry(1, 1, 1));
  const railMat = keep(new THREE.ShaderMaterial({ uniforms: uni,
    vertexShader: 'uniform float uSX; varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = vec3(w.x / uSX, w.y, w.z); vN = normal; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      varying vec3 vW; varying vec3 vN; ${COMMON}
      void main(){
        float u = gaugeU(vW.x), top = step(0.5, vN.y); vec3 c = vec3(0.075, 0.115, 0.165) * (0.55 + 0.45 * top + 0.25 * max(vN.z, 0.0));
        c += heat(clamp(u, 0.0, 1.0)) * behind(u, 0.0) * (0.12 + 0.5 * top * smoothstep(${LINE.toFixed(2)} - 0.05, ${LINE.toFixed(2)} + 0.1, u));
        float hx = (uHead - 0.5) * ${LEN.toFixed(1)}; c += vec3(1.0, 0.8, 0.45) * 0.5 * exp(-abs(vW.x - hx) * 1.3);
        c += TEAL * 0.8 * exp(-pow((vW.x - ${X(LINE).toFixed(2)}) / 0.05, 2.0));
        float tk = abs(fract(u * 10.0 + 0.5) - 0.5) / 10.0 * ${LEN.toFixed(1)}; c += INK * 0.14 * top * smoothstep(0.035, 0.02, tk);
        gl_FragColor = vec4(fogMix(c, distance(cameraPosition, vW)), 1.0);
      }` }));
  const box = (x, y, z, w, h, d, mat) => { const m = new THREE.Mesh(unitBox, mat); m.position.set(x, y + h / 2, z); m.scale.set(w, h, d); m.frustumCulled = false; root.add(m); return m; };
  for (const s of [-1, 1]) box(0, 0, s * (HALF + 0.05), LEN + 0.2, RAIL, 0.1, railMat);
  for (const s of [-1, 1]) box(s * (LEN / 2 + 0.05), 0, 0, 0.1, RAIL + 0.14, HALF * 2 + 0.2, railMat);

  // ---- the slats: one per 10,000 tokens, each sprung up as the light passes, each taller and hotter than the last ----
  const NS = Math.round(END * 100), sg = keep(new THREE.InstancedBufferGeometry()); sg.index = unitBox.index; sg.setAttribute('position', unitBox.attributes.position); sg.setAttribute('normal', unitBox.attributes.normal);
  const sA = new Float32Array(NS * 3);
  for (let i = 0; i < NS; i++) { const u = (i + 1) / 100; let mk = 99; HANDOVERS.forEach((m, j) => { if (Math.abs(m.u - u) < 0.006) mk = Math.min(mk, T_MARK[j]); }); sA.set([u - 0.005, mk, rnd()], i * 3); }
  sg.setAttribute('aA', new THREE.InstancedBufferAttribute(sA, 3)); sg.instanceCount = NS;
  const slats = new THREE.Mesh(sg, keep(new THREE.ShaderMaterial({ uniforms: uni,
    vertexShader: /* glsl */`
      attribute vec3 aA; varying vec3 vN; varying vec4 vI; varying vec3 vW; ${COMMON}
      void main(){
        float u = aA.x, age = uT - (${T_GO.toFixed(4)} + u / ${SPEED.toFixed(5)}), k = clamp(age / 0.32, 0.0, 1.0), e = k * k * (3.0 - 2.0 * k);
        float g = e * (1.0 + 0.4 * sin(k * 6.2832) * (1.0 - k)), h = (0.07 + 1.45 * u) * g;
        // past the line the slats swell out over the rims: what is left behind no longer fits the channel
        float over = smoothstep(${LINE.toFixed(2)}, 0.9, u), wz = ${(HALF * 2 - 0.12).toFixed(2)} + over * 0.5 * smoothstep(${RAIL.toFixed(2)}, ${(RAIL + 0.1).toFixed(2)}, (position.y + 0.5) * h);
        vec3 p = vec3((u - 0.5) * ${LEN.toFixed(1)} + position.x * 0.125, (position.y + 0.5) * h, position.z * wz);
        if (age <= 0.0) p = vec3(0.0, -60.0, 0.0);
        vN = normal; vI = vec4(u, position.y + 0.5, exp(-max(age, 0.0) * 2.6), smoothstep(0.0, 0.25, uT - aA.y)); vW = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vN; varying vec4 vI; varying vec3 vW; ${COMMON}
      void main(){
        float u = vI.x, top = step(0.5, vN.y), sh = top + (1.0 - top) * (0.34 + 0.3 * abs(vN.z) + 0.2 * max(vN.x, 0.0)) * mix(0.5, 1.0, vI.y);
        float breathe = 1.0 + 0.1 * u * sin(uT * 3.1 - u * 46.0);
        vec3 c = heat(u) * sh * breathe * (1.0 + 0.5 * uHold * smoothstep(0.3, 0.85, u));
        c = mix(c, vec3(1.0, 0.93, 0.74) * (0.6 + 0.6 * top), vI.z * 0.85);          // just made: still white-hot
        c = mix(c, INK, vI.w * top * 0.92);                            // a hand-over happened on this one
        gl_FragColor = vec4(fogMix(c, distance(cameraPosition, vW) * 0.6), 1.0);
      }` })));
  slats.frustumCulled = false; root.add(slats);

  // ---- the bar: a bright teal barrier across the channel at 300,000, two leaves hinged on posts; the light breaks it open ----
  const barMat = keep(new THREE.MeshBasicMaterial({ color: 0x5fd0c5, toneMapped: false })), postMat = keep(new THREE.MeshBasicMaterial({ color: 0x2b6f6c, toneMapped: false }));
  const leaves = [1, -1].map((sgn) => { const g = new THREE.Group(); g.position.set(X(LINE), BAR_Y, sgn * BW); root.add(g);
    const m = new THREE.Mesh(unitBox, barMat); m.scale.set(0.36, 0.34, BW - 0.015); m.position.set(0, 0, -sgn * (BW - 0.015) / 2); m.frustumCulled = false; g.add(m);
    box(X(LINE), 0, sgn * (BW + 0.1), 0.44, BAR_Y + 0.3, 0.2, postMat); return { g, sgn }; });
  const SH = []; for (let i = 0; i < 70; i++) SH.push({ z: (rnd() - 0.5) * 1.6, vx: 1.5 + rnd() * 5, vy: (rnd() - 0.2) * 2.6, vz: (rnd() - 0.5) * 3.4, size: 0.12 + rnd() * 0.2 });

  // ---- lights: the agent, the pin heads, and the sparks that rise off the hot slats ----
  const NE = 1500, embers = [];
  for (let i = 0; i < NE; i++) { const u = Math.pow(rnd(), 0.4) * END; embers.push({ u, z: (rnd() - 0.5) * (0.8 + 0.5 * u), sp: 0.22 + rnd() * 0.3, ph: rnd(), sw: rnd() * TAU, size: 0.1 + rnd() * 0.14, keepP: rnd() }); }
  const NBG = 9, NP = NE + 1 + HANDOVERS.length + SH.length + NBG, gPos = new Float32Array(NP * 3), gCol = new Float32Array(NP * 4), gSize = new Float32Array(NP);
  const gg = keep(new THREE.BufferGeometry()); gg.setAttribute('position', new THREE.BufferAttribute(gPos, 3)); gg.setAttribute('aCol', new THREE.BufferAttribute(gCol, 4)); gg.setAttribute('aSize', new THREE.BufferAttribute(gSize, 1));
  const glowMat = keep(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: { uProj: { value: 800 }, uPx: { value: 1 } },
    vertexShader: `attribute vec4 aCol; attribute float aSize; uniform float uProj, uPx; varying vec4 vC;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float s = aSize * uProj / max(-mv.z, 0.5), m = 2.4 * uPx; vC = aCol; vC.a *= min(1.0, s / m); gl_PointSize = clamp(max(s, m), 0.0, 420.0 * uPx); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'precision highp float; varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = (exp(-d * d * 5.0) * 0.5 + exp(-d * d * 46.0) * 1.4) * smoothstep(1.0, 0.75, d); gl_FragColor = vec4(mix(vC.rgb, vec3(1.0, 0.97, 0.9), exp(-d * d * 60.0) * 0.7) * vC.a * a, 1.0); }' }));
  const glowPts = new THREE.Points(gg, glowMat); glowPts.frustumCulled = false; glowPts.renderOrder = 8; root.add(glowPts);
  const heatJS = (u) => { const s = (a, b, x) => ease((x - a) / (b - a)); let c = [0.62, 0.486, 0.211].map((v, j) => mix(v, [1, 0.6, 0.2][j], s(0.15, 0.5, u))); c = c.map((v, j) => mix(v, [1, 0.37, 0.25][j], s(0.5, 0.92, u))); return c; };

  // ---- pins: a pale needle stays standing where each hand-over happened ----
  const pinMat = HANDOVERS.map(() => keep(new THREE.MeshBasicMaterial({ color: 0xf4f1e8, transparent: true, toneMapped: false })));
  const pins = HANDOVERS.map((m, i) => { const p = new THREE.Mesh(unitBox, pinMat[i]); p.frustumCulled = false; p.renderOrder = 5; root.add(p); return p; });

  // ---- words: drawn on 2D canvases and pinned to their places on the gauge ----
  const hud = new THREE.Scene(), hudCam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1), unit = keep(new THREE.PlaneGeometry(1, 1)), F0 = 64;
  const mkLabel = (text, colour, weight) => {   // an array of strings is one label set on several lines
    const lines = [].concat(text), m = document.createElement('canvas').getContext('2d'); m.font = `${weight} ${F0}px ${FONT}`; const wt = Math.max(...lines.map((l) => m.measureText(l).width));
    const c = document.createElement('canvas'), pad = 26, LH = 74; c.width = Math.ceil(wt + pad * 2); c.height = 112 + LH * (lines.length - 1); const x = c.getContext('2d');
    x.shadowColor = 'rgba(11,20,32,0.96)'; x.shadowBlur = 14; x.textBaseline = 'alphabetic'; x.font = `${weight} ${F0}px ${FONT}`; x.fillStyle = colour;
    for (let pass = 0; pass < 3; pass++) lines.forEach((l, q) => x.fillText(l, pad, 78 + q * LH));
    const tex = keep(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mesh = new THREE.Mesh(unit, keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }))); hud.add(mesh);
    return { mesh, cw: c.width, ch: c.height };
  };
  // anchor in the world, where the label sits relative to it (ax: -1 ends at the anchor, 0 centred, 1 starts at it; ay: 1 above, -1 below), when it appears
  const LABELS = [
    { ...mkLabel('0', '#f4f1e8', 600), p: [X(0), 0, 2.1], ax: 0, ay: 0, t: 0.15, size: 0.9, dim: 0.8 },
    { ...mkLabel('1,000,000', '#f4f1e8', 600), p: [X(1), 0, 2.1], ax: 0, ay: 0, t: 0.15, size: 0.9, dim: 0.8 },
    { ...mkLabel(['hand over before', '300,000'], '#5fd0c5', 700), p: [X(LINE), BAR_Y, -BW - 0.25], ax: 1, ay: 0, slide: true, t: 0.3, size: 1, dim: 1, land: { slide: false, ...mkLabel('hand over before 300,000', '#5fd0c5', 700), p: [X(LINE), 0, BW + 0.5], ax: -1, ay: -1 } },
    { ...mkLabel('484,000', '#f4f1e8', 700), p: [X(0.484), PIN_TOP, 0.44], ax: -0.75, ay: 1, t: T_MARK[0] + 0.1, size: 0.95, dim: 1 },
    { ...mkLabel('845,000', '#f4f1e8', 700), p: [X(0.845), PIN_TOP, 0], ax: 0, ay: 1, t: T_MARK[4] + 0.05, size: 1.25, dim: 1 },
  ];

  let W = 0, H = 0, K = CAM.land; const v = new V3(), target = new V3();
  function resize(w, h) {
    W = w; H = h; renderer.setSize(w, h, false); const portrait = h > w; K = portrait ? CAM.port : CAM.land; root.scale.x = uni.uSX.value = K.sx; root.updateMatrixWorld(true);
    camera.fov = K.fov; camera.aspect = w / h; camera.updateProjectionMatrix(); hudCam.right = w; hudCam.top = h; hudCam.updateProjectionMatrix();
    glowMat.uniforms.uProj.value = h / (2 * Math.tan(K.fov * Math.PI / 360)); glowMat.uniforms.uPx.value = h / 720 * (portrait ? 0.6 : 1);
  }

  function render(tIn, w, h) {
    if (w !== W || h !== H) resize(w, h);
    const t = reduced ? STILL_T : clamp(tIn, 0, meta.seconds), portrait = h > w;
    const head = clamp((t - T_GO) * SPEED, 0, END);

    // camera: one slow move that follows the light down the gauge and comes round to the hot end
    const k = ease(t / meta.seconds), k2 = reduced ? 1 : ease((t - 0.7) / 3.3), a = mix(K.a[0], K.a[1], k), el = mix(K.el[0], K.el[1], k), d = mix(K.close.d, mix(K.d[0], K.d[1], k), k2);
    target.set(mix(K.close.tx, mix(K.tx[0], K.tx[1], k), k2), mix(K.ty[0], K.ty[1], k), K.tz);
    camera.position.set(target.x + Math.sin(a) * Math.cos(el) * d, target.y + Math.sin(el) * d, target.z + Math.cos(a) * Math.cos(el) * d); camera.lookAt(target); camera.updateMatrixWorld(true);

    uni.uT.value = t; uni.uHead.value = head; uni.uCamD.value = d; uni.uCross.value = ease((t - T_LINE) / 0.9); const hold = ease((t - T_END) / 1.4); uni.uHold.value = hold;
    HANDOVERS.forEach((m, i) => uni.uMark.value[i].set(X(m.u), m.z, 0, t >= T_MARK[i] ? t - T_MARK[i] : -1));

    // sparks
    let j = 0;
    for (const E of embers) {
      const born = T_GO + E.u / SPEED, life = (t * E.sp + E.ph) % 1, on = t > born ? ease((t - born) / 0.5) : 0, c = heatJS(E.u);
      const dense = E.keepP < 0.12 + 0.88 * E.u * E.u * 1.4 ? 1 : 0, rise = 0.3 + 3.4 * E.u * E.u;
      gPos.set([X(E.u) + Math.sin(t * 1.3 + E.sw) * 0.08 + life * 0.25, slatH(E.u) + life * rise, E.z + Math.cos(t * 1.1 + E.sw) * 0.06], j * 3);
      gSize[j] = E.size * (0.7 + 0.8 * E.u); gCol.set([c[0], c[1], c[2], on * dense * Math.sin(Math.PI * life) * (0.25 + 0.75 * E.u)], j * 4); j++;
    }
    // the agent: rides the top of what it has left, at one speed, straight through the bar; at the end it climbs the last pin
    const settle = ease((t - T_END) / 0.6), hy = mix(slatH(head) + 0.42, PIN_TOP, settle), startUp = ease(t / 0.35);
    gPos.set([X(head), hy, 0], j * 3); gSize[j] = (2.3 + 1.2 * head + 0.12 * Math.sin(t * 9)) * startUp * (1 + 0.45 * hold); gCol.set([1, mix(0.82, 0.74, head), mix(0.42, 0.34, head), 1], j * 4); j++;
    // pins and their heads
    HANDOVERS.forEach((m, i) => {
      const age = t - T_MARK[i], up = age > 0 ? ease(age / 0.3) : 0, base = slatH(m.u), top = mix(base, PIN_TOP, up), flash = age > 0 ? Math.exp(-age * 3) : 0;
      pins[i].visible = up > 0.001; pins[i].position.set(X(m.u), (base + top) / 2, m.z); pins[i].scale.set(0.045 / K.sx, Math.max(0.001, top - base), 0.055);
      gPos.set([X(m.u), top, m.z], j * 3); gSize[j] = (i === 4 ? 0 : 1) * up * (0.5 + 2.0 * flash); gCol.set([0.957, 0.945, 0.91, up], j * 4); j++;
    });
    // the bar: whole and bright until 2.5 s; then knocked open in the light's direction, dimmed, with one late flicker
    const bAge = t - T_LINE, broke = bAge > 0, swing = broke ? 0.78 * (1 - Math.exp(-bAge * 5) * Math.cos(bAge * 10)) : 0, bFlash = broke ? Math.exp(-bAge * 4.5) : 0;
    const flick = Math.exp(-Math.pow((t - T_FLICK) / 0.06, 2)) + 0.7 * Math.exp(-Math.pow((t - T_FLICK - 0.22) / 0.05, 2));
    const bB = broke ? 0.55 + 1.6 * bFlash + 0.75 * flick : 1.12 + 0.1 * Math.sin(t * 5);
    barMat.color.setRGB(Math.min(1, 0.373 * bB + bFlash * 0.6), Math.min(1, 0.816 * bB + bFlash * 0.2), Math.min(1, 0.773 * bB + bFlash * 0.25));
    for (const Lf of leaves) { Lf.g.rotation.y = -Lf.sgn * swing; Lf.g.rotation.x = Lf.sgn * 0.3 * clamp(swing); }
    for (let q = 0; q < NBG; q++) { const f = q / (NBG - 1) * 2 - 1, sg = f >= 0 ? 1 : -1, r = BW - Math.abs(f) * BW;   // its glow follows the leaves
      gPos.set([X(LINE) + Math.sin(swing) * r, BAR_Y, sg * (BW - Math.cos(swing) * r)], j * 3); gSize[j] = 1.5; gCol.set([0.373, 0.816, 0.773, broke ? 0.1 + 0.9 * bFlash + 0.5 * flick : 0.5], j * 4); j++; }
    for (const S of SH) { const g = broke ? 1 - Math.exp(-bAge * 2.2) : 0;   // splinters thrown the way the light is going
      gPos.set([X(LINE) + S.vx * g * 0.9, BAR_Y + S.vy * g * 0.45 - 0.5 * g * g, S.z * 0.6 + S.vz * g * 0.45], j * 3); gSize[j] = S.size; gCol.set([0.373, 0.816, 0.773, broke ? Math.exp(-bAge * 1.7) * 1.2 : 0], j * 4); j++; }
    gg.attributes.position.needsUpdate = gg.attributes.aCol.needsUpdate = gg.attributes.aSize.needsUpdate = true;

    // words
    const fpx = portrait ? w * 0.05 : h * 0.042, gap = fpx * 0.25;
    for (const L0 of LABELS) {
      const L = !portrait && L0.land ? { ...L0, ...L0.land } : L0;
      let al = (reduced ? (t >= L.t ? 1 : 0) : ease((t - L.t) / 0.4)) * L.dim; let s = fpx * L.size / F0; if (L.cw * s > w * 0.9) s = w * 0.9 / L.cw; const lw = L.cw * s, lh = L.ch * s, pad = 26 * s;
      v.set(L.p[0] * K.sx, L.p[1], L.p[2]).project(camera); const px = (v.x * 0.5 + 0.5) * w, py = (v.y * 0.5 + 0.5) * h;
      const ax = L.slide ? mix(-1, 1, k2) : L.ax, ay = L.slide ? mix(1.15, 0.6, k2) : L.ay; let cx = px + ax * (lw / 2 - pad + gap), cy = py + ay * (lh * 0.36 + gap);
      al *= clamp((py - h * 0.03) / (h * 0.05)); cx = clamp(cx, lw / 2 + w * 0.01, w - lw / 2 - w * 0.01); cy = clamp(cy, h * 0.16 + lh / 2, h * 0.915 - lh / 2);
      L.mesh.scale.set(lw, lh, 1); L.mesh.position.set(Math.round(cx), Math.round(cy), 0); L.mesh.material.opacity = al; L.mesh.visible = al > 0.003;
    }

    renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(hud, hudCam);
  }
  return { render, dispose() { for (const x of trash) x.dispose(); renderer.dispose(); } };
}
