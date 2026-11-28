// The opening of "How we refresh a session": the film previews itself. For six seconds one large live screen plays the
// hook of the scroll scene (the light runs down a growing scroll while the re-read counter races), under the title.
// Then, as the voice lists what is coming, that screen shrinks into the first card of a vertical agenda, and six more
// live cards arrive one after another, top to bottom, each playing a telling moment of its own lab scene. At the end the
// whole agenda waits and the first card glows, as if about to open. The lab scenes run on their own small off-screen
// canvases; this scene only composites them. render(t) is a pure function of t. A lab scene component (see
// ../harness.js for the contract). Composed for 720x1280 first; 1280x720 is a second layout. Apache-2.0. By c.productions.
export const meta = {
  id: 'refresh-trailer',
  title: 'The film, before it starts',
  beat: 'The film opens on the scroll re-reading itself, then folds that screen into an agenda of seven live cards: the problem, why, our rule, the three steps and the result. The first card glows, ready to open.',
  seconds: 14,
  sources: [{ title: 'How we refresh a session', url: 'https://studio.agents.sovereignweb.site/productions/session-refresh/how-we-refresh-a-session/' }],
};

const TITLE = ['How we refresh', 'a session'];
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const NAVY = [0x0b, 0x14, 0x20], INK = '#f4f1e8', AMBER = '#ffc857', TEAL = '#5fd0c5';
// the big screen: refresh-scroll in its portrait layout, also card 1 once it has shrunk
const BIG_W = 405, BIG_H = 720, TH_W = 448, TH_H = 252;
const SHRINK = [6.0, 7.5], T_GLOW = 12.5;
// the seven cards. src(t): which moment of the lab scene the card shows; crop: the part of a landscape frame it shows
// (centre x, centre y from the top, zoom). Card 1 is the big screen itself.
const CARDS = [
  { label: 'The problem', land: 7.5 },
  { label: 'Why', id: 'refresh-scroll', land: 8.55, s0: 11.6, rate: 0.75, crop: [0.5, 0.45, 1.05] },
  { label: 'Our rule', id: 'refresh-line', land: 9.6, s0: 3.1, rate: 0.9, crop: [0.5, 0.58, 1.2] },
  { label: 'Step 1: write a note', id: 'refresh-shelf', land: 10.3, s0: 2.4, rate: 0.95, crop: [0.45, 0.55, 1.25] },
  { label: 'Step 2: start fresh', id: 'refresh-shelf', land: 11.0, s0: 10.7, rate: 1.15, crop: [0.62, 0.3, 1.3] },
  { label: 'Step 3: check it', id: 'refresh-keys', land: 11.7, s0: 11.5, rate: 1.6, crop: [0.5, 0.62, 1.5] },
  { label: 'The result', id: 'refresh-saving', land: 12.4, s0: 3.6, rate: 1.2, crop: [0.5, 0.45, 1.1] },
];
const ARRIVE = 0.6;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// which moment of refresh-scroll the big screen (card 1) shows: the hook, then a hold, then the hook again as it glows
const bigSrc = (t) => (t < T_GLOW ? Math.min(0.95 * t, 6.6) : 0.4 + (t - T_GLOW) * 1.1);

// where everything sits, in pixels, for a frame of w x h
function layout(W, H) {
  const portrait = H > W;
  if (portrait) {
    const s = W / 720, top = 200 * s, bottom = 1095 * s * (H / W) / (1280 / 720), pitch = (bottom - top) / 7;
    const ch = pitch * 0.845, cw = 268 * s;
    return {
      portrait, s,
      titleBig: { lines: [[W / 2, 180 * s], [W / 2, 256 * s]], size: 70 * s },
      titleSmall: { y: 156 * s, size: 42 * s, cx: W / 2 },
      big: { x: W / 2 - 228 * s, y: 302 * s, w: 456 * s, h: 456 * s * 16 / 9 * 0.98 },
      cards: CARDS.map((c, i) => ({ x: 100 * s, y: top + i * pitch + (pitch - ch) / 2, w: cw, h: ch, nx: 56 * s, lx: 100 * s + cw + 26 * s })),
      num: 46 * s, head: 27 * s, tail: 36 * s,
    };
  }
  const s = H / 720, top = 138 * s, pitch = 119 * s, ch = 100 * s, cw = 236 * s, colX = [W / 2 - 590 * s, W / 2 + 30 * s];
  return {
    portrait, s,
    titleBig: { lines: [[W / 2 - 250 * s, 318 * s], [W / 2 - 250 * s, 396 * s]], size: 66 * s },
    titleSmall: { y: 96 * s, size: 40 * s, cx: W / 2 },
    big: { x: W / 2 + 140 * s, y: 100 * s, w: 284 * s, h: 284 * s * 16 / 9 },
    cards: CARDS.map((c, i) => { const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4, x = colX[col] + 38 * s; return { x, y: top + row * pitch, w: cw, h: ch, nx: colX[col], lx: x + cw + 24 * s }; }),
    num: 42 * s, head: 26 * s, tail: 34 * s,
  };
}

const CARD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// a rounded live screen with a thin border and a soft halo around it, in one quad (raw colours, no colour management)
const CARD_FS = `
uniform sampler2D map; uniform vec4 uvr; uniform vec2 size; uniform float margin, radius, bright, alpha, borderA, halo;
uniform vec3 borderC, haloC; varying vec2 vUv;
float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  vec2 full = size + 2.0 * margin, p = (vUv - 0.5) * full;
  float d = sdRound(p, size * 0.5, radius);
  vec2 tuv = uvr.xy + (p / size + 0.5) * uvr.zw;
  vec3 pic = texture2D(map, tuv).rgb * bright;
  float inside = clamp(0.5 - d, 0.0, 1.0);
  float ring = clamp(1.0 - abs(d + 0.8) / 1.3, 0.0, 1.0) * borderA;
  vec3 col = mix(pic, borderC, ring);
  float h = halo * exp(-max(d, 0.0) / max(margin * 0.24, 1.0)) * (1.0 - smoothstep(margin * 0.6, margin * 0.98, d));
  float a = max(inside, h * (1.0 - inside));
  gl_FragColor = vec4(mix(haloC, col, inside), a * alpha);
}`;

export async function create({ canvas, THREE, reduced }) {
  // the lab scenes, each on its own small canvas: card 1 (and the big screen) in portrait, the others in landscape
  const mk = async (id, w, h) => { const mod = await import(`../${id}/scene.js`), cv = document.createElement('canvas'); cv.width = w; cv.height = h; return { cv, w, h, end: mod.meta.seconds, scene: await mod.create({ canvas: cv, THREE, reduced: false }) }; };
  const subs = [await mk('refresh-scroll', BIG_W, BIG_H)];
  for (const c of CARDS.slice(1)) subs.push(await mk(c.id, TH_W, TH_H));

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1); renderer.setClearColor(0x0b1420, 1);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10), disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const plane = keep(new THREE.PlaneGeometry(1, 1));
  const col3 = (hex) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

  // background: the house navy, lifting a little behind the middle, darker at the edges
  const bgMat = keep(new THREE.ShaderMaterial({ depthWrite: false, depthTest: false, uniforms: { a: { value: col3(0x0b1420) }, b: { value: col3(0x12263a) }, asp: { value: 1 } },
    vertexShader: 'varying vec2 v; void main(){ v = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.999, 1.0); }',
    fragmentShader: 'uniform vec3 a; uniform vec3 b; uniform float asp; varying vec2 v; void main(){ vec2 q = (v - vec2(0.5, 0.55)) * vec2(asp, 1.0); float k = 1.0 - smoothstep(0.0, 0.75, length(q)); gl_FragColor = vec4(mix(a, b, k), 1.0); }' }));
  const bg = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), bgMat); bg.frustumCulled = false; bg.renderOrder = -10; scene.add(bg);

  // the screens: one quad each, its texture the lab scene's canvas
  const screens = subs.map((sub, i) => {
    const tex = keep(new THREE.CanvasTexture(sub.cv)); tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const mat = keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, vertexShader: CARD_VS, fragmentShader: CARD_FS,
      uniforms: { map: { value: tex }, uvr: { value: new THREE.Vector4(0, 0, 1, 1) }, size: { value: new THREE.Vector2(1, 1) }, margin: { value: 20 }, radius: { value: 8 }, bright: { value: 1 }, alpha: { value: 1 },
        borderA: { value: 0.3 }, halo: { value: 0 }, borderC: { value: col3(0xf4f1e8) }, haloC: { value: col3(0xffc857) } } }));
    const m = new THREE.Mesh(plane, mat); m.renderOrder = i === 0 ? 2 : 1; m.frustumCulled = false; scene.add(m);
    return { m, mat, tex, u: mat.uniforms };
  });

  // dust in the air, seeded once, drifting slowly upward
  const rnd = prng(20261128), DUST = 160, dpos = new Float32Array(DUST * 3), dseed = [];
  for (let i = 0; i < DUST; i++) dseed.push([rnd(), rnd(), rnd(), rnd()]);
  const dgeo = keep(new THREE.BufferGeometry()); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dmat = keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { px: { value: 3 } },
    vertexShader: 'uniform float px; varying float f; void main(){ f = position.z; gl_PointSize = px * (0.6 + f); gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'varying float f; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(vec3(1.0, 0.784, 0.341) * (1.0 - d * d) * (0.12 + 0.18 * f), 1.0); }' }));
  const dust = new THREE.Points(dgeo, dmat); dust.frustumCulled = false; dust.renderOrder = 0; scene.add(dust);

  // the words, the numbers and the thread: drawn on a canvas laid over the picture
  const hudCv = document.createElement('canvas'), hud = hudCv.getContext('2d'), hudTex = keep(new THREE.CanvasTexture(hudCv));
  hudTex.minFilter = THREE.LinearFilter; hudTex.generateMipmaps = false;
  const hudMat = keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, uniforms: { map: { value: hudTex } },
    vertexShader: 'varying vec2 v; void main(){ v = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D map; varying vec2 v; void main(){ gl_FragColor = texture2D(map, v); }' }));
  const hudMesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), hudMat); hudMesh.frustumCulled = false; hudMesh.renderOrder = 5; scene.add(hudMesh);

  let W = 0, H = 0, L = null;

  // place one screen: rect in top-down pixels, the source window (x0, y0 from the top, w, h, all 0..1)
  function put(s, r, win, o) {
    const m = 56 * L.s, fw = r.w + 2 * m, fh = r.h + 2 * m;
    s.m.position.set(r.x + r.w / 2, H - (r.y + r.h / 2), 0); s.m.scale.set(fw, fh, 1);
    s.u.size.value.set(r.w, r.h); s.u.margin.value = m; s.u.radius.value = Math.min(r.w, r.h) * 0.06;
    s.u.uvr.value.set(win[0], 1 - win[1] - win[3], win[2], win[3]);
    s.u.bright.value = o.bright; s.u.alpha.value = o.alpha; s.u.borderA.value = o.borderA; s.u.halo.value = o.halo;
    s.u.borderC.value.copy(o.amberBorder ? col3(0xffc857) : col3(0xf4f1e8));
    s.m.visible = o.alpha > 0.003;
  }
  // a landscape thumbnail's window: centre and zoom, kept at 16:9 and inside the frame
  const cropWin = ([cx, cy, z], asp) => { const w = 1 / z, h = Math.min(1, w * TH_W / (TH_H * asp)); return [clamp(cx - w / 2, 0, 1 - w), clamp(cy - h / 2, 0, 1 - h), w, h]; };
  // the largest window of the big portrait frame with the rect's shape, centred at cy (from the top)
  function coverWin(r, cy) {
    const a = (r.w / r.h) * (BIG_H / BIG_W); let w = 1, h = 1 / a; if (h > 1) { h = 1; w = a; }
    return [(1 - w) / 2, clamp(cy - h / 2, 0, 1 - h), w, h];
  }

  function drawWords(t) {
    const ctx = hud, s = L.s; ctx.clearRect(0, 0, W, H); ctx.textBaseline = 'middle';
    // the title: two large calm lines, which fold into one line above the agenda
    const k = sstep((t - SHRINK[0] + 0.25) / 1.0), tb = L.titleBig, ts = L.titleSmall;
    ctx.font = `600 ${ts.size}px ${FONT}`;
    const w1 = ctx.measureText(TITLE[0]).width, w2 = ctx.measureText(TITLE[1]).width, sp = ctx.measureText(' ').width, x0 = ts.cx - (w1 + sp + w2) / 2;
    const smallC = [[x0 + w1 / 2, ts.y], [x0 + w1 + sp + w2 / 2, ts.y]], intro = sstep((t - 0.15) / 0.7);
    ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.shadowColor = 'rgba(11,20,32,0.9)'; ctx.shadowBlur = 14 * s;
    // the big two lines rise and fade; the one small line settles in their place
    const out = sstep(k * 1.8), inn = sstep(k * 1.8 - 0.8);
    TITLE.forEach((line, i) => {
      if (out < 1) { const size = tb.size * lerp(1, 0.85, out), y = tb.lines[i][1] - out * 40 * s + (1 - intro) * 10 * s;
        ctx.globalAlpha = intro * (1 - out); ctx.font = `700 ${size}px ${FONT}`; ctx.fillText(line, tb.lines[i][0], y); }
      if (inn > 0) { ctx.globalAlpha = inn * 0.94; ctx.font = `600 ${ts.size}px ${FONT}`; ctx.fillText(line, smallC[i][0], smallC[i][1] + (1 - inn) * 14 * s); }
    });
    ctx.shadowBlur = 0;
    // the thread: one line joining the numbers, drawn down to each card as it lands, a bead of light running ahead
    const cards = L.cards;
    ctx.lineCap = 'round';
    for (let i = 1; i < cards.length; i++) {
      const a = cards[i - 1], b = cards[i]; if (a.nx !== b.nx) continue;
      const y0 = a.y + a.h / 2 + L.num * 0.62, y1 = b.y + b.h / 2 - L.num * 0.62, p = sstep((t - (CARDS[i].land - ARRIVE)) / ARRIVE);
      if (p <= 0) continue;
      ctx.globalAlpha = 0.55; ctx.strokeStyle = TEAL; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(a.nx, y0); ctx.lineTo(a.nx, lerp(y0, y1, p)); ctx.stroke();
      if (p < 1) { const by = lerp(y0, y1, p), g = ctx.createRadialGradient(a.nx, by, 0, a.nx, by, 14 * s); g.addColorStop(0, 'rgba(255,200,87,0.95)'); g.addColorStop(1, 'rgba(255,200,87,0)'); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(a.nx - 14 * s, by - 14 * s, 28 * s, 28 * s); }
    }
    // numbers and labels, each arriving just after its card
    const glow = sstep((t - T_GLOW) / 0.7);
    CARDS.forEach((c, i) => {
      const r = cards[i], a = sstep((t - c.land + 0.25) / 0.45); if (a <= 0) return;
      const cy = r.y + r.h / 2, dim = i === 0 ? 1 : lerp(1, 0.7, glow), dx = (1 - a) * 18 * s;
      ctx.globalAlpha = a * dim; ctx.textAlign = 'center'; ctx.fillStyle = AMBER; ctx.font = `700 ${L.num}px ${FONT}`;
      ctx.fillText(String(i + 1), r.nx, cy + 2 * s);
      ctx.textAlign = 'left';
      const cut = c.label.indexOf(': ');
      if (cut > 0) {
        ctx.fillStyle = AMBER; ctx.font = `600 ${L.head}px ${FONT}`; ctx.fillText(c.label.slice(0, cut + 1), r.lx + dx, cy - L.tail * 0.62);
        ctx.fillStyle = INK; ctx.font = `600 ${L.tail}px ${FONT}`; ctx.fillText(c.label.slice(cut + 2), r.lx + dx, cy + L.head * 0.62);
      } else { ctx.fillStyle = INK; ctx.font = `600 ${L.tail}px ${FONT}`; ctx.fillText(c.label, r.lx + dx, cy + 2 * s); }
    });
    ctx.globalAlpha = 1; hudTex.needsUpdate = true;
  }

  function render(t, w, h) {
    if (w !== W || h !== H) {
      W = w; H = h; L = layout(w, h); renderer.setSize(w, h, false); hudCv.width = w; hudCv.height = h;
      camera.left = 0; camera.right = w; camera.top = h; camera.bottom = 0; camera.updateProjectionMatrix();
      bgMat.uniforms.asp.value = w / h; dmat.uniforms.px.value = 5 * L.s;
    }
    t = reduced ? 13.2 : clamp(t, 0, meta.seconds);
    const glow = sstep((t - T_GLOW) / 0.7), breathe = 0.5 + 0.5 * Math.sin((t - T_GLOW) * 3.2);

    // card 1: the big screen, shrinking from the middle into the top of the agenda; it shows the counter racing
    {
      const k = sstep((t - SHRINK[0]) / (SHRINK[1] - SHRINK[0])), B = L.big, C = L.cards[0], arc = Math.sin(k * Math.PI) * 30 * L.s;
      const push = 1 + 0.035 * sstep(t / SHRINK[0]) * (1 - k);
      const bw = B.w * push, bh = B.h * push, bx = B.x - (bw - B.w) / 2, by = B.y - (bh - B.h) / 2;
      const gs = 1 + 0.05 * glow, cw = C.w * gs, chh = C.h * gs, cx = C.x - (cw - C.w) / 2, cyy = C.y - (chh - C.h) / 2;
      const r = { x: lerp(bx, cx, k) - arc, y: lerp(by, cyy, k), w: lerp(bw, cw, k), h: lerp(bh, chh, k) };
      const dip = 1 - 0.6 * Math.max(0, 1 - Math.abs(t - T_GLOW + 0.05) / 0.12);
      put(screens[0], r, coverWin(r, lerp(0.5, 0.79, k)), { bright: dip, alpha: 1, borderA: lerp(0.25, 0.35, k) + 0.65 * glow, halo: lerp(0.22, 0.08, k) + glow * (0.5 + 0.25 * breathe), amberBorder: glow > 0.3 });
      subs[0].scene.render(clamp(bigSrc(t), 0, subs[0].end), BIG_W, BIG_H); screens[0].tex.needsUpdate = true;
    }
    // cards 2 to 7: each slides in from the right as its turn comes, playing its own scene slowly
    for (let i = 1; i < CARDS.length; i++) {
      const c = CARDS[i], a = sstep((t - (c.land - ARRIVE)) / ARRIVE), s = screens[i];
      if (a <= 0) { s.m.visible = false; continue; }
      const R = L.cards[i], r = { x: R.x + (1 - a) * 70 * L.s, y: R.y, w: R.w, h: R.h };
      const land = Math.exp(-Math.max(0, t - c.land) * 3) * (t >= c.land ? 1 : a);
      put(s, r, cropWin(c.crop, r.w / r.h), { bright: lerp(1, 0.7, glow), alpha: a, borderA: 0.3 * (1 - glow * 0.4), halo: 0.32 * land, amberBorder: false });
      const sub = subs[i]; sub.scene.render(clamp(c.s0 + c.rate * (t - c.land), 0, sub.end), TH_W, TH_H); s.tex.needsUpdate = true;
    }
    for (let i = 0; i < DUST; i++) {
      const [x, y, z, ph] = dseed[i];
      dpos[i * 3] = (x + Math.sin(t * 0.25 + ph * 6.28) * 0.01) * W; dpos[i * 3 + 1] = ((y + t * (0.004 + 0.008 * z)) % 1) * H; dpos[i * 3 + 2] = z;
    }
    dgeo.attributes.position.needsUpdate = true;
    drawWords(t);
    renderer.render(scene, camera);
  }
  function dispose() { for (const s of subs) s.scene.dispose(); for (const d of disposables) d.dispose(); renderer.dispose(); }
  return { render, dispose };
}
