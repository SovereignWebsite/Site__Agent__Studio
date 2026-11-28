// The opening of the Agile film: a curved wall of six live screens, each playing one of the film's own lab scenes in
// order (the currents, Royce's cascade, Snowbird, the spread, the badge city, the three voices). As each phrase of the
// hook is spoken the camera turns to the screen it names, then pulls back to show the whole film waiting.
// The six scenes run on their own off-screen canvases; this scene only composites them. render(t) is a pure function
// of t. A lab scene component (see ../harness.js for the contract). Apache-2.0. By c.productions-agile.
export const meta = {
  id: 'agile-trailer',
  title: 'The film, before it starts',
  beat: 'Six live screens hold the film to come; "Seventeen people" turns to Snowbird, "One page" to the page spreading, "Then an industry" to the badge city, and the camera pulls back to show the whole story waiting.',
  seconds: 8,
  sources: [
    { title: 'Manifesto for Agile Software Development', url: 'https://agilemanifesto.org/' },
    { title: 'Developers Should Abandon Agile (Ron Jeffries, 2018)', url: 'https://ronjeffries.com/articles/018-01ff/abandon-1/' },
  ],
};

// each screen: the lab scene, and the slice of it this opening plays (source time = s0 + rate * t)
const SCREENS = [
  { id: 'currents', s0: 21, rate: 1 },
  { id: 'royce-cascade', s0: 5, rate: 0.8 },
  { id: 'snowbird-page', s0: 2, rate: 1.3 },
  { id: 'spread', s0: 1, rate: 1.4 },
  { id: 'badge-factory', s0: 8, rate: 0.7 },
  { id: 'voices', s0: 30, rate: 1 },
];
// the hook, phrase by phrase, timed to its voice (scene time, lead included); each phrase turns to one screen
const PHRASES = [
  { text: 'Seventeen people.', at: 0.25, screen: 2 },
  { text: 'One page.', at: 1.6, screen: 3 },
  { text: 'Then an industry.', at: 2.62, screen: 4 },
];
const CAPTION = 'The history of Agile, in about three minutes.', CAPTION_AT = 4.45, PULL = [3.55, 5.1];
const SW = 512, SH = 288, TAU = Math.PI * 2;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// piecewise smooth path through [time, value] keys
const path = (keys, t) => { if (t <= keys[0][0]) return keys[0][1]; for (let k = 1; k < keys.length; k++) if (t <= keys[k][0]) return lerp(keys[k - 1][1], keys[k][1], sstep((t - keys[k - 1][0]) / (keys[k][0] - keys[k - 1][0]))); return keys[keys.length - 1][1]; };

export async function create({ canvas, THREE }) {
  // the six scenes, each on its own small canvas
  const subs = [];
  for (const s of SCREENS) {
    const mod = await import(`../${s.id}/scene.js`), cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
    const scene = await mod.create({ canvas: cv, THREE, reduced: false });
    subs.push({ ...s, cv, scene, end: mod.meta.seconds });
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x0b1420, 1); renderer.autoClear = false;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 200), disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  // background: the house gradient, navy to a lighter navy at the horizon
  const bgMat = keep(new THREE.ShaderMaterial({ depthWrite: false, depthTest: false, uniforms: { a: { value: new THREE.Vector3(0x0b / 255, 0x14 / 255, 0x20 / 255) }, b: { value: new THREE.Vector3(0x16 / 255, 0x2e / 255, 0x46 / 255) } },
    vertexShader: 'varying vec2 v; void main(){ v = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.999, 1.0); }',
    fragmentShader: 'uniform vec3 a; uniform vec3 b; varying vec2 v; void main(){ float k = smoothstep(0.0, 0.62, v.y) * (1.0 - smoothstep(0.62, 1.0, v.y) * 0.7); gl_FragColor = vec4(mix(a, b, k), 1.0); }' }));
  const bg = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), bgMat); bg.frustumCulled = false; bg.renderOrder = -10; scene.add(bg);

  // a soft round glow, drawn once
  const glowCv = document.createElement('canvas'); glowCv.width = glowCv.height = 128;
  { const g = glowCv.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }
  const glowTex = keep(new THREE.CanvasTexture(glowCv));
  // a fade for the reflections: strong at the screen's foot, gone a little way down
  const fadeCv = document.createElement('canvas'); fadeCv.width = 4; fadeCv.height = 64;
  { const g = fadeCv.getContext('2d'), r = g.createLinearGradient(0, 0, 0, 64); r.addColorStop(0, '#000'); r.addColorStop(0.55, '#000'); r.addColorStop(1, '#fff'); g.fillStyle = r; g.fillRect(0, 0, 4, 64); }
  const fadeTex = keep(new THREE.CanvasTexture(fadeCv));

  // the screens: picture, a thin frame, an amber glow behind, a faint reflection on the dark floor below
  const scrW = 3.4, scrH = scrW * SH / SW, plane = keep(new THREE.PlaneGeometry(1, 1)), R = 9;
  const screens = subs.map((s) => {
    const tex = keep(new THREE.CanvasTexture(s.cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const g = new THREE.Group();
    const glow = new THREE.Mesh(plane, keep(new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffc857, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    glow.scale.set(scrW * 1.9, scrH * 2.2, 1); glow.position.z = -0.08;
    const frame = new THREE.Mesh(plane, keep(new THREE.MeshBasicMaterial({ color: 0xf4f1e8, transparent: true })));
    frame.scale.set(scrW + 0.06, scrH + 0.06, 1); frame.position.z = -0.01;
    const pic = new THREE.Mesh(plane, keep(new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff })));
    pic.scale.set(scrW, scrH, 1);
    const refl = new THREE.Mesh(plane, keep(new THREE.MeshBasicMaterial({ map: tex, alphaMap: fadeTex, transparent: true, opacity: 0.16, depthWrite: false })));
    refl.scale.set(scrW, -scrH, 1); refl.position.y = -scrH - 0.12;
    g.add(glow, frame, pic, refl); scene.add(g);
    return { g, glow, frame, pic, refl, tex };
  });

  // dust in the air, seeded once
  const rnd = prng(20010211), DUST = 420, dpos = new Float32Array(DUST * 3), dseed = [];
  for (let i = 0; i < DUST; i++) dseed.push([rnd() * 2 - 1, rnd() * 2 - 1, rnd(), rnd()]);
  const dgeo = keep(new THREE.BufferGeometry()); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dgeo, keep(new THREE.PointsMaterial({ map: glowTex, color: 0xffc857, size: 0.09, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
  scene.add(dust);

  // the words: drawn on a canvas laid over the picture
  const hudCv = document.createElement('canvas'), hud = hudCv.getContext('2d'), hudTex = keep(new THREE.CanvasTexture(hudCv)); hudTex.colorSpace = THREE.SRGBColorSpace;
  const hudScene = new THREE.Scene(), hudCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const hudMesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), keep(new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false, depthWrite: false })));
  hudScene.add(hudMesh);

  let W = 0, H = 0, portrait = false;
  function place() {
    // landscape: an arc round the viewer, left to right; portrait: the same arc stood on end, top to bottom
    const step = portrait ? 0.23 : 0.37;
    screens.forEach((s, i) => { s.ang = (i - 2.5) * step; });
  }
  function drawWords(t) {
    const U = Math.min(W, H) / 100, ctx = hud; ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.shadowColor = '#0b1420'; ctx.shadowBlur = 2.6 * U;
    const size = portrait ? 6.4 : 6.2; ctx.font = `700 ${Math.round(size * U)}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    const settled = sstep((t - PULL[0]) / 0.8);
    const alpha = (p) => sstep((t - p.at + 0.08) / 0.35), lift = (p) => (1 - alpha(p)) * 1.6 * U;
    const ink = [244, 241, 232], amber = [255, 200, 87];
    const colour = (k) => { const next = PHRASES[k + 1], speaking = next ? clamp((next.at - t) / 0.3) : 1 - settled; const c = ink.map((v, j) => Math.round(lerp(v, amber[j], speaking))); return `rgb(${c})`; };
    if (portrait) {
      const lh = size * U * 1.2, y0 = H * 0.075 + lh * 0.5;
      PHRASES.forEach((p, k) => { ctx.globalAlpha = alpha(p); ctx.fillStyle = colour(k); ctx.fillText(p.text, W / 2, y0 + k * lh + lift(p)); });
    } else {
      const gap = 1.6 * U, ws = PHRASES.map((p) => ctx.measureText(p.text).width), total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
      let x = (W - total) / 2; const y = H * 0.125; ctx.textAlign = 'left';
      PHRASES.forEach((p, k) => { ctx.globalAlpha = alpha(p); ctx.fillStyle = colour(k); ctx.fillText(p.text, x, y + lift(p)); x += ws[k] + gap; });
    }
    const ca = sstep((t - CAPTION_AT) / 0.6);
    if (ca > 0) { ctx.globalAlpha = ca; ctx.textAlign = 'center'; ctx.fillStyle = '#b9c3cc'; ctx.font = `500 ${Math.round((portrait ? 3.6 : 3.4) * U)}px Georgia, "Times New Roman", serif`; ctx.fillText(CAPTION, W / 2, H * (portrait ? 0.855 : 0.82) + (1 - ca) * U); }
    ctx.globalAlpha = 1; hudTex.needsUpdate = true;
  }

  function render(t, w, h) {
    if (w !== W || h !== H) { W = w; H = h; portrait = h > w; renderer.setSize(w, h, false); hudCv.width = w; hudCv.height = h; camera.aspect = w / h; place(); }
    t = clamp(t, 0, meta.seconds);
    // which screen the camera faces: drifting in from the first ones, then each phrase's screen, then the whole wall
    const ang = (i) => screens[i].ang, mid = (ang(0) + ang(1)) / 2;
    const look = path([[0, mid], [0.55, ang(2)], [1.45, ang(2)], [1.85, ang(3)], [2.45, ang(3)], [2.9, ang(4)], [PULL[0], ang(4)], [PULL[1], 0], [8, portrait ? 0 : 0.04]], t);
    const back = path([[0, 0], [PULL[0], 0.4], [PULL[1], portrait ? 10.5 : 6.6], [8, portrait ? 11.2 : 7.4]], t);
    camera.fov = portrait ? lerp(52, 50, sstep((t - PULL[0]) / 1.5)) : lerp(30, 36, sstep((t - PULL[0]) / 1.5)); camera.updateProjectionMatrix();
    const lift = portrait ? 0 : 0.22; // the wall sits a little below the middle, under the words
    if (portrait) { camera.position.set(0, -Math.sin(look) * back * 0.15, back); camera.rotation.set(-look * 0.82, 0, 0); }
    else { camera.position.set(Math.sin(look) * back * 0.15, lift, back); camera.rotation.set(-0.02, -look * 0.82, 0); }
    // how lit each screen is: the named one bright, the rest dimmed, all bright once the camera pulls back
    const all = sstep((t - PULL[0] - 0.3) / 1.0), open = sstep(t / 0.5);
    screens.forEach((s, i) => {
      let on = 0; PHRASES.forEach((p, k) => { if (p.screen !== i) return; const end = k + 1 < PHRASES.length ? PHRASES[k + 1].at : PULL[0] + 0.4; on = Math.max(on, sstep((t - p.at + 0.25) / 0.35) * (1 - sstep((t - end) / 0.4))); });
      const lit = Math.max(on, all * 0.92, i < 2 ? 0.75 * (1 - sstep((t - 0.4) / 0.5)) : 0), push = on * 0.7;
      const a = s.ang, r = R - push;
      if (portrait) { s.g.position.set(0, -Math.sin(a) * r, -Math.cos(a) * r); s.g.rotation.set(a, 0, 0); s.refl.visible = false; }
      else { s.g.position.set(Math.sin(a) * r, 0, -Math.cos(a) * r); s.g.rotation.set(0, -a, 0); s.refl.visible = true; }
      const b = open * lerp(0.32, 1, lit); s.pic.material.color.setRGB(b, b, b); s.refl.material.opacity = 0.16 * b;
      s.frame.material.opacity = open * lerp(0.08, 0.5, lit); s.frame.material.color.set(on > 0.5 ? 0xffc857 : 0xf4f1e8);
      s.glow.material.opacity = 0.55 * on * open;
      // play the screen's slice of its scene, only when it can be seen
      if (b > 0.02) { const sub = subs[i]; sub.scene.render(clamp(sub.s0 + sub.rate * t, 0, sub.end), SW, SH); s.tex.needsUpdate = true; }
    });
    for (let i = 0; i < DUST; i++) {
      const [x, y, z, ph] = dseed[i], k = (z * 0.6 + t * 0.03) % 1;
      dpos[i * 3] = x * 14 + Math.sin(t * 0.4 + ph * TAU) * 0.3; dpos[i * 3 + 1] = y * 5 + Math.sin(t * 0.3 + ph * 9) * 0.25; dpos[i * 3 + 2] = lerp(-12, 6, k);
    }
    dgeo.attributes.position.needsUpdate = true;
    drawWords(t);
    renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(hudScene, hudCam);
  }
  function dispose() { for (const s of subs) s.scene.dispose(); for (const d of disposables) d.dispose(); renderer.dispose(); }
  return { render, dispose };
}
