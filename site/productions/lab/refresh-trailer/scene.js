// The opening of "How we refresh a session", and its cover. It opens on a poster: the headline, large and centred, over a
// dim, soft-focus agenda of the film. The camera then zooms through the headline into the agenda's first card, which
// grows into one large live screen: the scroll re-reading itself while its counter races. As the voice lists what is
// coming, that screen shrinks back into the first card and six more live cards arrive one after another, each playing a
// telling moment of its own lab scene. At the end the headline returns above the finished agenda and the first card
// glows: the last frame is the film's still and cover. The lab scenes run on their own small off-screen canvases; this
// scene only composites them. render(t) is a pure function of t, and a change of size at any time is handled exactly
// like a fresh start in that size. A lab scene component (see ../harness.js for the contract). Composed for 720x1280
// first; 1280x720 is a second layout. Apache-2.0. By c.productions.
export const meta = {
  id: 'refresh-trailer',
  title: 'The film, before it starts',
  beat: 'A poster asks how to manage Claude sessions and promises 86% less to re-read; the camera dives into the scroll re-reading itself, which folds back into an agenda of seven live cards: the problem, why, our rule, the three steps and the result. The first card glows, ready to open.',
  seconds: 14,
  sources: [{ title: 'How we refresh a session', url: 'https://studio.agents.sovereignweb.site/productions/session-refresh/how-we-refresh-a-session/' }],
};

const HEAD = 'How to manage your Claude sessions', SUB = 'and re-read 86% less on every turn', SUB_CUT = 4; // two lines break after "less"
const TITLE = ['How we refresh', 'a session'];
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const INK = '#f4f1e8', AMBER = '#ffc857', TEAL = '#5fd0c5';
// the big screen: refresh-scroll in its portrait layout, which is also card 1
const BIG_W = 405, BIG_H = 720, TH_W = 448, TH_H = 252;
const DIVE = [3.0, 4.5], SHRINK = [6.0, 7.5], T_GLOW = 12.5;
// the seven cards. land: when it arrives; s0, rate: which moment of its lab scene it shows; crop: the part of a landscape
// frame it shows (centre x, centre y from the top, zoom); hint: the moment it shows, dim, behind the opening poster.
const CARDS = [
  { label: 'The problem', land: 7.5 },
  { label: 'Why', id: 'refresh-scroll', land: 8.55, s0: 11.6, rate: 0.75, crop: [0.5, 0.45, 1.05], hint: 14.5 },
  { label: 'Our rule', id: 'refresh-line', land: 9.6, s0: 3.1, rate: 0.9, crop: [0.5, 0.58, 1.2], hint: 6.6 },
  { label: 'Step 1: write a note', id: 'refresh-shelf', land: 10.3, s0: 2.4, rate: 0.95, crop: [0.45, 0.55, 1.25], hint: 5.0 },
  { label: 'Step 2: start fresh', id: 'refresh-shelf', land: 11.0, s0: 10.7, rate: 1.15, crop: [0.62, 0.3, 1.3], hint: 13.5 },
  { label: 'Step 3: check it', id: 'refresh-keys', land: 11.7, s0: 11.5, rate: 1.6, crop: [0.5, 0.62, 1.5], hint: 14.0 },
  { label: 'The result', id: 'refresh-saving', land: 12.4, s0: 3.6, rate: 1.2, crop: [0.5, 0.45, 1.1], hint: 5.2 },
];
const ARRIVE = 0.6;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// which moment of refresh-scroll card 1 shows: barely moving behind the poster, the hook racing once the camera dives in,
// a hold on the full count, then the hook again as it glows at the end
const bigSrc = (t) => (t < DIVE[0] ? 0.8 + 0.2 * t : t < T_GLOW ? Math.min(1.4 + (t - DIVE[0]) * 1.45, 6.6) : 0.4 + (t - T_GLOW) * 1.1);

// where everything sits, in pixels, for a frame of w x h
function layout(W, H) {
  const portrait = H > W;
  if (portrait) {
    const s = W / 720, sy = H / 1280, top = 300 * sy, bottom = 1095 * sy, pitch = (bottom - top) / 7, ch = pitch * 0.85, cw = 250 * s;
    return {
      portrait, s,
      poster: { cy: 600 * sy, size: 84 * s, sub: 40 * s, maxW: W - 90 * s },
      head: { y: 150 * sy, size: 54 * s, sub: 30 * s, maxW: W - 70 * s },
      titleBig: { lines: [[W / 2, 180 * sy], [W / 2, 256 * sy]], size: 70 * s },
      titleSmall: { y: 222 * sy, size: 40 * s, cx: W / 2 },
      big: { x: W / 2 - 228 * s, y: 302 * sy, w: 456 * s, h: 456 * s * 16 / 9 * 0.98 },
      cards: CARDS.map((c, i) => { const x = 102 * s, lx = x + cw + 26 * s; return { x, y: top + i * pitch + (pitch - ch) / 2, w: cw, h: ch, nx: 56 * s, lx, lmax: W - lx - 20 * s }; }),
      num: 46 * s, head2: 27 * s, tail: 36 * s,
    };
  }
  const s = H / 720, sx = W / 1280, top = 176 * s, pitch = 110 * s, ch = 94 * s, cw = 222 * s, colX = [W / 2 - 580 * s, W / 2 + 40 * s];
  return {
    portrait, s,
    poster: { cy: 340 * s, size: 80 * s, sub: 38 * s, maxW: Math.min(W - 160 * s, 1060 * s) },
    head: { y: 96 * s, size: 46 * s, sub: 26 * s, maxW: W - 120 * s },
    titleBig: { lines: [[W / 2 - 250 * s, 318 * s], [W / 2 - 250 * s, 396 * s]], size: 66 * s },
    titleSmall: { y: 110 * s, size: 38 * s, cx: W / 2 },
    big: { x: W / 2 + 140 * s, y: 100 * s, w: 284 * s, h: 284 * s * 16 / 9 },
    cards: CARDS.map((c, i) => { const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4, x = colX[col] + 38 * s, lx = x + cw + 24 * s, lmax = (col === 0 ? colX[1] - 34 * s : W - 24 * s) - lx; return { x, y: top + row * pitch, w: cw, h: ch, nx: colX[col], lx, lmax }; }),
    num: 42 * s, head2: 26 * s, tail: 34 * s, sx,
  };
}

const CARD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// a rounded live screen with a thin border and a soft halo around it, in one quad (raw colours, no colour management);
// blur softens the picture for the hint of the agenda behind the poster
const CARD_FS = `
uniform sampler2D map; uniform vec4 uvr; uniform vec2 size, texel; uniform float margin, radius, bright, alpha, borderA, halo, blur;
uniform vec3 borderC, haloC; varying vec2 vUv;
float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  vec2 full = size + 2.0 * margin, p = (vUv - 0.5) * full;
  float d = sdRound(p, size * 0.5, radius);
  vec2 tuv = uvr.xy + (p / size + 0.5) * uvr.zw;
  vec3 pic = texture2D(map, tuv).rgb;
  if (blur > 0.01) {
    vec3 acc = pic; float n = 1.0;
    for (int i = 0; i < 12; i++) { float a = float(i) * 0.5236, r = blur * (i < 6 ? 1.0 : 2.0) * (1.0 + 0.3 * float(i - (i / 6) * 6) / 6.0);
      acc += texture2D(map, tuv + vec2(cos(a), sin(a)) * r * texel).rgb; n += 1.0; }
    pic = acc / n;
  }
  pic *= bright;
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
      uniforms: { map: { value: tex }, uvr: { value: new THREE.Vector4(0, 0, 1, 1) }, size: { value: new THREE.Vector2(1, 1) }, texel: { value: new THREE.Vector2(1 / sub.w, 1 / sub.h) },
        margin: { value: 20 }, radius: { value: 8 }, bright: { value: 1 }, alpha: { value: 1 }, borderA: { value: 0.3 }, halo: { value: 0 }, blur: { value: 0 },
        borderC: { value: col3(0xf4f1e8) }, haloC: { value: col3(0xffc857) } } }));
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

  // the words, the numbers and the thread: drawn on a canvas laid over the picture.
  // The canvas and its texture are made afresh at every size: a texture keeps the size it was first uploaded at.
  let hudCv = null, hud = null, hudTex = null;
  const hudMat = keep(new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, uniforms: { map: { value: null } },
    vertexShader: 'varying vec2 v; void main(){ v = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D map; varying vec2 v; void main(){ gl_FragColor = texture2D(map, v); }' }));
  const hudMesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), hudMat); hudMesh.frustumCulled = false; hudMesh.renderOrder = 5; scene.add(hudMesh);

  let W = 0, H = 0, L = null, WRAP = null;

  // break a line of words into the fewest lines that fit maxW, as evenly as possible
  function wrap(text, weight, size, maxW, cut = 0) {
    const ctx = hud, words = text.split(' '); ctx.font = `${weight} ${size}px ${FONT}`;
    const wd = (a, b) => ctx.measureText(words.slice(a, b).join(' ')).width;
    if (wd(0, words.length) <= maxW) return { lines: [text], size };
    if (cut) { const m = Math.max(wd(0, cut), wd(cut, words.length)); return { lines: [words.slice(0, cut).join(' '), words.slice(cut).join(' ')], size: m > maxW ? size * maxW / m : size }; }
    let best = null;
    for (let i = 1; i < words.length; i++) { const m = Math.max(wd(0, i), wd(i, words.length)); if (!best || m < best.m) best = { m, cuts: [i] }; }
    if (best.m > maxW) { let b3 = null; for (let i = 1; i < words.length - 1; i++) for (let j = i + 1; j < words.length; j++) { const m = Math.max(wd(0, i), wd(i, j), wd(j, words.length)); if (!b3 || m < b3.m) b3 = { m, cuts: [i, j] }; } best = b3; }
    const c = [0, ...best.cuts, words.length], lines = [];
    for (let k = 1; k < c.length; k++) lines.push(words.slice(c[k - 1], c[k]).join(' '));
    return { lines, size: best.m > maxW ? size * maxW / best.m : size };
  }

  // place one screen: rect in top-down pixels, the source window (x0, y0 from the top, w, h, all 0..1)
  function put(s, r, win, o) {
    const m = 56 * L.s, fw = r.w + 2 * m, fh = r.h + 2 * m;
    s.m.position.set(r.x + r.w / 2, H - (r.y + r.h / 2), 0); s.m.scale.set(fw, fh, 1);
    s.u.size.value.set(r.w, r.h); s.u.margin.value = m; s.u.radius.value = Math.min(r.w, r.h) * 0.06;
    s.u.uvr.value.set(win[0], 1 - win[1] - win[3], win[2], win[3]);
    s.u.bright.value = o.bright; s.u.alpha.value = o.alpha; s.u.borderA.value = o.borderA; s.u.halo.value = o.halo; s.u.blur.value = o.blur || 0;
    s.u.borderC.value.copy(o.amberBorder ? col3(0xffc857) : col3(0xf4f1e8));
    s.m.visible = o.alpha > 0.003;
  }
  // a landscape thumbnail's window: centre and zoom, at the card's shape and inside the frame
  const cropWin = ([cx, cy, z], asp) => { const w = 1 / z, h = Math.min(1, w * TH_W / (TH_H * asp)); return [clamp(cx - w / 2, 0, 1 - w), clamp(cy - h / 2, 0, 1 - h), w, h]; };
  // the largest window of the big portrait frame with the rect's shape, centred at cy (from the top)
  function coverWin(r, cy) {
    const a = (r.w / r.h) * (BIG_H / BIG_W); let w = 1, h = 1 / a; if (h > 1) { h = 1; w = a; }
    return [(1 - w) / 2, clamp(cy - h / 2, 0, 1 - h), w, h];
  }
  // the opening camera: before the dive the agenda sits where it ends; during the dive everything grows away from card 1
  const diveK = (t) => sstep((t - DIVE[0]) / (DIVE[1] - DIVE[0]));
  const zoomRect = (r, z, c) => ({ x: c[0] + (r.x - c[0]) * z, y: c[1] + (r.y - c[1]) * z, w: r.w * z, h: r.h * z });

  // centred lines with a soft dark shadow, for the headline
  function lines(ctx, ls, x, y, size, lh, weight, colour, alpha) {
    ctx.globalAlpha = alpha; ctx.fillStyle = colour; ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = 'center';
    ls.forEach((l, i) => ctx.fillText(l, x, y + (i - (ls.length - 1) / 2) * lh));
  }

  function drawWords(t) {
    const ctx = hud, s = L.s; ctx.clearRect(0, 0, W, H); ctx.textBaseline = 'middle';
    const cards = L.cards, glow = sstep((t - T_GLOW) / 0.7), dk = diveK(t), c1 = [cards[0].x + cards[0].w / 2, cards[0].y + cards[0].h / 2];

    // the soft-focus hint of the agenda's numbers and labels behind the poster (drawn as blurred shadows only)
    const hintA = (1 - sstep(dk * 1.6)) * 0.34;
    if (hintA > 0.01) {
      const z = lerp(1, 2.4, dk), off = 10000;
      ctx.shadowOffsetX = off; ctx.shadowOffsetY = 0; ctx.shadowBlur = 7 * s; ctx.fillStyle = '#000';
      CARDS.forEach((c, i) => {
        const r = cards[i], nx = c1[0] + (r.nx - c1[0]) * z, lx = c1[0] + (r.lx - c1[0]) * z, cy = c1[1] + (r.y + r.h / 2 - c1[1]) * z;
        ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.shadowColor = `rgba(255,200,87,${hintA})`; ctx.font = `700 ${L.num * z}px ${FONT}`; ctx.fillText(String(i + 1), nx - off, cy);
        ctx.textAlign = 'left'; ctx.shadowColor = `rgba(244,241,232,${hintA * 0.8})`; ctx.font = `600 ${L.tail * z}px ${FONT}`; ctx.fillText(c.label, lx - off, cy);
      });
      ctx.shadowOffsetX = 0; ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0;
    }

    ctx.shadowColor = 'rgba(11,20,32,0.92)';
    // the poster headline: large and centred, then the camera flies through it (it grows and fades)
    {
      const P = L.poster, a = sstep(t / 0.5) * (1 - sstep((t - DIVE[0]) / 0.9)), zoom = 1 + 0.9 * sstep((t - DIVE[0]) / 1.2);
      if (a > 0.003) {
        const hw = WRAP.poster, sw = WRAP.posterSub, lh = hw.size * 1.08, slh = sw.size * 1.25, hh = hw.lines.length * lh, gap = hw.size * 0.55, tot = hh + gap + sw.lines.length * slh;
        const y0 = P.cy - tot / 2, cx = W / 2;
        // a soft pool of shade behind the words, so the agenda behind stays a hint
        const sr = Math.max(W, H) * 0.42, g = ctx.createRadialGradient(cx, P.cy, 0, cx, P.cy, sr); g.addColorStop(0, 'rgba(11,20,32,0.62)'); g.addColorStop(0.6, 'rgba(11,20,32,0.38)'); g.addColorStop(1, 'rgba(11,20,32,0)');
        ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, P.cy); ctx.scale(1, H > W ? 0.7 : 0.55); ctx.translate(-cx, -P.cy); ctx.fillStyle = g; ctx.fillRect(cx - sr, P.cy - sr, sr * 2, sr * 2); ctx.restore();
        ctx.save(); ctx.translate(cx, P.cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -P.cy); ctx.shadowBlur = 22 * s;
        lines(ctx, hw.lines, cx, y0 + hh / 2, hw.size, lh, 800, INK, a);
        lines(ctx, sw.lines, cx, y0 + hh + gap + sw.lines.length * slh / 2, sw.size, slh, 600, AMBER, a * (1 - sstep((t - DIVE[0]) / 0.5)) * sstep((t - 0.35) / 0.6));
        ctx.restore();
      }
    }
    // the film's title: two large lines above the big screen, which fold into one small line above the agenda
    {
      const intro = sstep((t - 4.3) / 0.8), k = sstep((t - SHRINK[0] + 0.25) / 1.0), leave = sstep((t - T_GLOW + 0.4) / 0.35), tb = L.titleBig, ts = L.titleSmall;
      ctx.font = `600 ${ts.size}px ${FONT}`;
      const w1 = ctx.measureText(TITLE[0]).width, w2 = ctx.measureText(TITLE[1]).width, sp = ctx.measureText(' ').width, x0 = ts.cx - (w1 + sp + w2) / 2;
      const smallC = [[x0 + w1 / 2, ts.y], [x0 + w1 + sp + w2 / 2, ts.y]];
      ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.shadowBlur = 14 * s;
      const out = sstep(k * 1.8), inn = sstep(k * 1.8 - 0.8);
      TITLE.forEach((line, i) => {
        if (out < 1 && intro > 0) { const size = tb.size * lerp(1, 0.85, out), y = tb.lines[i][1] - out * 40 * s + (1 - intro) * 12 * s;
          ctx.globalAlpha = intro * (1 - out); ctx.font = `700 ${size}px ${FONT}`; ctx.fillText(line, tb.lines[i][0], y); }
        if (inn > 0 && leave < 1) { ctx.globalAlpha = inn * 0.94 * (1 - leave); ctx.font = `600 ${ts.size}px ${FONT}`; ctx.fillText(line, smallC[i][0], smallC[i][1] + (1 - inn) * 14 * s - leave * 10 * s); }
      });
    }
    // the headline returns at the top: the title of the finished agenda, and of the cover
    {
      const a = sstep((t - T_GLOW + 0.02) / 0.6);
      if (a > 0.003) {
        const Hd = L.head, hw = WRAP.head, sw = WRAP.headSub, lh = hw.size * 1.12, y0 = Hd.y + (1 - a) * 12 * s;
        ctx.shadowBlur = 16 * s;
        lines(ctx, hw.lines, W / 2, y0 + (hw.lines.length - 1) * lh / 2, hw.size, lh, 800, INK, a);
        lines(ctx, sw.lines, W / 2, y0 + (hw.lines.length - 0.5) * lh + sw.size * 0.85, sw.size, sw.size * 1.2, 600, AMBER, sstep((t - T_GLOW - 0.15) / 0.7));
      }
    }
    ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';
    // the thread: one line joining the numbers, drawn down to each card as it lands, a bead of light running ahead
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
    CARDS.forEach((c, i) => {
      const r = cards[i], a = sstep((t - c.land + 0.25) / 0.45); if (a <= 0) return;
      const cy = r.y + r.h / 2, dim = i === 0 ? 1 : lerp(1, 0.74, glow), dx = (1 - a) * 18 * s;
      ctx.globalAlpha = a * dim; ctx.textAlign = 'center'; ctx.fillStyle = AMBER; ctx.font = `700 ${L.num}px ${FONT}`;
      ctx.fillText(String(i + 1), r.nx, cy + 2 * s);
      ctx.textAlign = 'left';
      const cut = c.label.indexOf(': ');
      // each label stays beside its own card: if it would run past its room, it is set smaller, never over a neighbour
      const fit = (text, size) => { ctx.font = `600 ${size}px ${FONT}`; const wd = ctx.measureText(text).width; if (wd > r.lmax) ctx.font = `600 ${size * r.lmax / wd}px ${FONT}`; };
      if (cut > 0) {
        ctx.fillStyle = AMBER; fit(c.label.slice(0, cut + 1), L.head2); ctx.fillText(c.label.slice(0, cut + 1), r.lx + dx, cy - L.tail * 0.62);
        ctx.fillStyle = INK; fit(c.label.slice(cut + 2), L.tail); ctx.fillText(c.label.slice(cut + 2), r.lx + dx, cy + L.head2 * 0.62);
      } else { ctx.fillStyle = INK; fit(c.label, L.tail); ctx.fillText(c.label, r.lx + dx, cy + 2 * s); }
    });
    ctx.globalAlpha = 1; hudTex.needsUpdate = true;
  }

  function resize(w, h) {
    // a size change is handled exactly like a fresh start in that size
    W = w; H = h; L = layout(w, h); renderer.setSize(w, h, false); renderer.setViewport(0, 0, w, h);
    if (hudTex) hudTex.dispose();
    hudCv = document.createElement('canvas'); hudCv.width = w; hudCv.height = h; hud = hudCv.getContext('2d');
    hudTex = new THREE.CanvasTexture(hudCv); hudTex.minFilter = THREE.LinearFilter; hudTex.generateMipmaps = false; hudMat.uniforms.map.value = hudTex;
    camera.left = 0; camera.right = w; camera.top = h; camera.bottom = 0; camera.updateProjectionMatrix();
    bgMat.uniforms.asp.value = w / h; dmat.uniforms.px.value = 5 * L.s;
    WRAP = { poster: wrap(HEAD, 800, L.poster.size, L.poster.maxW), posterSub: wrap(SUB, 600, L.poster.sub, L.poster.maxW * 0.86, SUB_CUT),
      head: wrap(HEAD, 800, L.head.size, L.head.maxW), headSub: wrap(SUB, 600, L.head.sub, L.head.maxW, SUB_CUT) };
  }

  function render(t, w, h) {
    if (w !== W || h !== H) resize(w, h);
    t = reduced ? 13.9 : clamp(t, 0, meta.seconds);
    const glow = sstep((t - T_GLOW) / 0.7), breathe = 0.5 + 0.5 * Math.sin((t - T_GLOW) * 3.2), dk = diveK(t);
    const C1 = L.cards[0], c1 = [C1.x + C1.w / 2, C1.y + C1.h / 2], hintBright = 0.34;

    // card 1: dim and soft behind the poster; the camera dives into it and it grows into the big screen; then it
    // shrinks back into the top of the agenda, and glows at the end
    {
      const B = L.big, k = sstep((t - SHRINK[0]) / (SHRINK[1] - SHRINK[0])), arc = Math.sin(k * Math.PI) * 30 * L.s;
      const push = 1 + 0.035 * sstep((t - DIVE[1]) / (SHRINK[0] - DIVE[1])) * (1 - k);
      const bw = B.w * push, bh = B.h * push, bx = B.x - (bw - B.w) / 2, by = B.y - (bh - B.h) / 2;
      const gs = 1 + 0.05 * glow, cw = C1.w * gs, chh = C1.h * gs, cx = C1.x - (cw - C1.w) / 2, cyy = C1.y - (chh - C1.h) / 2;
      let r, cy, bright, blur, halo, borderA;
      if (t < SHRINK[0]) {
        r = { x: lerp(C1.x, bx, dk), y: lerp(C1.y, by, dk), w: lerp(C1.w, bw, dk), h: lerp(C1.h, bh, dk) };
        cy = lerp(0.79, 0.5, dk); bright = lerp(hintBright, 1, sstep(dk * 1.3)); blur = 2.2 * (1 - sstep(dk * 1.5)); halo = 0.22 * dk; borderA = lerp(0.15, 0.25, dk);
      } else {
        r = { x: lerp(bx, cx, k) - arc, y: lerp(by, cyy, k), w: lerp(bw, cw, k), h: lerp(bh, chh, k) };
        cy = lerp(0.5, 0.79, k); bright = 1; blur = 0; halo = lerp(0.22, 0.08, k) + glow * (0.5 + 0.25 * breathe); borderA = lerp(0.25, 0.35, k) + 0.65 * glow;
      }
      const dip = 1 - 0.6 * Math.max(0, 1 - Math.abs(t - T_GLOW + 0.05) / 0.12);
      put(screens[0], r, coverWin(r, cy), { bright: bright * dip, alpha: 1, borderA, halo, blur, amberBorder: glow > 0.3 });
      subs[0].scene.render(clamp(bigSrc(t), 0, subs[0].end), BIG_W, BIG_H); screens[0].tex.needsUpdate = true;
    }
    // cards 2 to 7: dim and soft behind the poster, flung outward as the camera dives; later each slides in from the
    // right as its turn comes, playing its own scene slowly
    for (let i = 1; i < CARDS.length; i++) {
      const c = CARDS[i], s = screens[i], sub = subs[i], R = L.cards[i];
      const a = sstep((t - (c.land - ARRIVE)) / ARRIVE), hint = (1 - sstep(dk * 1.4)) * sstep(t / 0.6 + 0.4);
      if (a > 0) {
        const r = { x: R.x + (1 - a) * 70 * L.s, y: R.y, w: R.w, h: R.h }, land = Math.exp(-Math.max(0, t - c.land) * 3) * (t >= c.land ? 1 : a);
        put(s, r, cropWin(c.crop, r.w / r.h), { bright: lerp(1, 0.74, glow), alpha: a, borderA: 0.3 * (1 - glow * 0.4), halo: 0.32 * land, amberBorder: false });
        sub.scene.render(clamp(c.s0 + c.rate * (t - c.land), 0, sub.end), TH_W, TH_H); s.tex.needsUpdate = true;
      } else if (hint > 0.003) {
        const r = zoomRect(R, lerp(1, 2.4, dk), c1);
        put(s, r, cropWin(c.crop, r.w / r.h), { bright: hintBright, alpha: hint, borderA: 0.15, halo: 0, blur: 2.2, amberBorder: false });
        sub.scene.render(clamp(c.hint - 0.6 + 0.2 * t, 0, sub.end), TH_W, TH_H); s.tex.needsUpdate = true;
      } else s.m.visible = false;
    }
    for (let i = 0; i < DUST; i++) {
      const [x, y, z, ph] = dseed[i];
      dpos[i * 3] = (x + Math.sin(t * 0.25 + ph * 6.28) * 0.01) * W; dpos[i * 3 + 1] = ((y + t * (0.004 + 0.008 * z)) % 1) * H; dpos[i * 3 + 2] = z;
    }
    dgeo.attributes.position.needsUpdate = true;
    drawWords(t);
    renderer.render(scene, camera);
  }
  function dispose() { for (const s of subs) s.scene.dispose(); for (const d of disposables) d.dispose(); if (hudTex) hudTex.dispose(); renderer.dispose(); }
  return { render, dispose };
}
