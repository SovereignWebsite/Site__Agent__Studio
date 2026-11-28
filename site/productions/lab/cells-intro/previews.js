// The two agenda previews of cells-intro, drawn on plain 2D canvases (no WebGL of their own), in the look of the scenes they
// stand for. drawGrow: a membrane cell whose lights grow into a small org chart as a counter reads 10, 20, 30 (cells-grow).
// drawTeam: a tree of lights growing down from one warm light through amber nodes to a teal hub with spokes, then a
// membrane closing round it (refresh-cell). Both are pure functions of u, the seconds since the card began to open.
// Apache-2.0. By c.productions.
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const AMB = '255,200,87', TEA = '95,208,197', WARM = '255,230,190';

function backdrop(x, w, h, gx, gy) {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b1420'); g.addColorStop(0.55, '#12263a'); g.addColorStop(1, '#0d1a29');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const r = x.createRadialGradient(gx, gy, 0, gx, gy, h * 0.75); r.addColorStop(0, 'rgba(255,200,87,0.10)'); r.addColorStop(1, 'rgba(255,200,87,0)');
  x.fillStyle = r; x.fillRect(0, 0, w, h);
}
function light(x, px, py, rgb, a, r) {
  if (a <= 0.01) return;
  const g = x.createRadialGradient(px, py, 0, px, py, r * 3.2);
  g.addColorStop(0, `rgba(255,250,240,${a})`); g.addColorStop(0.16, `rgba(${rgb},${a})`); g.addColorStop(0.4, `rgba(${rgb},${0.28 * a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.fillRect(px - r * 3.2, py - r * 3.2, r * 6.4, r * 6.4);
}
function line(x, pts, rgb, a, wdt, p = 1) {
  if (a <= 0.01 || p <= 0) return;
  // total length, then draw up to fraction p
  let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let left = tot * clamp(p); x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], l = Math.hypot(bx - ax, by - ay), k = Math.min(1, left / l); x.lineTo(lerp(ax, bx, k), lerp(ay, by, k)); left -= l; }
  x.strokeStyle = `rgba(${rgb},${a})`; x.lineWidth = wdt; x.shadowColor = `rgba(${rgb},${a})`; x.shadowBlur = wdt * 4; x.stroke(); x.shadowBlur = 0;
}
// a glowing wobbly loop round (cx, cy) with radii rx, ry
function membrane(x, cx, cy, rx, ry, a, u, s) {
  if (a <= 0.01) return;
  x.beginPath();
  for (let i = 0; i <= 96; i++) { const t = (i / 96) * Math.PI * 2, wob = 1 + 0.025 * Math.sin(t * 5 + u * 1.3) + 0.015 * Math.sin(t * 9 - u * 2.1);
    const c = Math.cos(t), sn = Math.sin(t), px = cx + Math.sign(c) * Math.pow(Math.abs(c), 0.6) * rx * wob, py = cy + Math.sign(sn) * Math.pow(Math.abs(sn), 0.6) * ry * wob; if (i) x.lineTo(px, py); else x.moveTo(px, py); }
  x.closePath(); x.fillStyle = `rgba(78,158,158,${0.10 * a})`; x.fill();
  x.strokeStyle = `rgba(255,228,180,${0.95 * a})`; x.lineWidth = 2.6 * s; x.shadowColor = `rgba(255,220,160,${a})`; x.shadowBlur = 14 * s; x.stroke();
  x.shadowBlur = 0; x.lineWidth = 1 * s; x.strokeStyle = `rgba(255,228,180,${0.3 * a})`; x.stroke();
}

// the org chart, in a 576x324 frame: root, three heads, nine leads, members under the leads
const CH = (() => {
  const P = [], par = [], cx = 214;
  P[0] = [cx, 62]; par[0] = -1;
  for (let j = 0; j < 3; j++) { P[1 + j] = [cx + (j - 1) * 116, 112]; par[1 + j] = 0; }
  for (let j = 0; j < 9; j++) { P[4 + j] = [cx + (j - 4) * 38.5, 162]; par[4 + j] = 1 + Math.floor(j / 3); }
  // leads appear in an order that spreads over the chart
  const leadOrder = [4, 7, 10, 5, 8, 11, 6, 9, 12];
  let n = 13; const rows = {};
  for (let r = 0; r < 2; r++) for (const l of leadOrder) { if (n >= 30) break; rows[l] = (rows[l] || 0) + 1; P[n] = [P[l][0], 162 + rows[l] * 36]; par[n] = l; n++; }
  const order = [0, 1, 2, 3, ...leadOrder, ...Array.from({ length: 17 }, (_, i) => 13 + i)];
  return { P, par, order };
})();
const STEP = [0.15, 0.95, 1.75]; // when the chart reaches 10, 20, 30 lights

export function drawGrow(x, w, h, u) {
  const s = w / 576; x.save(); x.setTransform(s, 0, 0, s, 0, 0);
  backdrop(x, 576, 324, 214, 150);
  const stage = STEP.reduce((k, t0, i) => (u >= t0 ? i : k), 0), shown = [10, 20, 30][stage];
  const grow = STEP.map((t0) => sstep((u - t0) / 0.45));
  const vis = (rank) => (rank < 10 ? 1 : rank < 20 ? grow[1] : grow[2]);
  // membrane swells with the chart
  const m = lerp(lerp(0, 1, grow[1] * 0.5), 1, grow[2]) ;
  membrane(x, 214, lerp(116, 154, m), lerp(132, 188, m), lerp(76, 124, m), 1, u, 1);
  x.globalCompositeOperation = 'lighter';
  // links: down from the parent, across, down (orthogonal, like an org chart)
  CH.order.forEach((i, rank) => { const p = CH.par[i]; if (p < 0) return; const a = vis(rank); if (a <= 0) return;
    const A = CH.P[p], B = CH.P[i], my = i >= 13 ? null : (A[1] + B[1]) / 2;
    const pts = my === null ? [[A[0], B[1] - 36], B] : [[A[0], A[1]], [A[0], my], [B[0], my], B];
    line(x, pts, '200,230,226', 0.55 * a, 1.3, a); });
  CH.order.forEach((i, rank) => { const a = vis(rank); if (a <= 0) return; const amber = i === 0 || (i >= 13 && i % 5 === 0);
    const pop = 1 + 0.6 * (1 - a) * a * 4; light(x, CH.P[i][0], CH.P[i][1], amber ? AMB : TEA, a, (i === 0 ? 5.5 : 3.8) * Math.min(pop, 1.6)); });
  x.globalCompositeOperation = 'source-over';
  // the counter: 10, 20, 30, each new value flashing in
  const fl = sstep((u - STEP[stage]) / 0.3);
  x.font = `700 ${92}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = `rgba(${AMB},0.8)`; x.shadowBlur = 22 + 18 * (1 - fl); x.fillStyle = '#ffd77a'; x.globalAlpha = 0.6 + 0.4 * fl;
  x.fillText(String(shown), 482, 162 + (1 - fl) * 8); x.shadowBlur = 0; x.globalAlpha = 1;
  x.restore();
}

// the team tree, in a 576x324 frame
const TR = (() => {
  const top = [300, 44], a1 = [222, 92], a2 = [222, 140], hub = [222, 206], b1 = [432, 104], b2 = [404, 172], b3 = [468, 182];
  const spokes = [];
  for (let i = 0; i < 11; i++) { const ang = Math.PI * (-0.15 + (i / 10) * 1.3), r = 58 + (i % 3) * 18; spokes.push([hub[0] + Math.cos(ang) * r * 1.25, hub[1] + Math.sin(ang) * r * 0.78, i]); }
  return { top, a1, a2, hub, b1, b2, b3, spokes };
})();

export function drawTeam(x, w, h, u) {
  const s = w / 576; x.save(); x.setTransform(s, 0, 0, s, 0, 0);
  backdrop(x, 576, 324, 300, 60);
  const T = TR, k = (t0, d = 0.25) => sstep((u - t0) / d);
  // a membrane closes round the whole team at the end
  { const a = k(1.15, 0.4); if (a > 0.01) { x.save(); x.globalAlpha = a; const r = 18, x0 = 92, y0 = 18, x1 = 512, y1 = 300;
    x.beginPath(); x.roundRect(lerp(x0 - 20, x0, a), lerp(y0 - 12, y0, a), lerp(x1 - x0 + 40, x1 - x0, a), lerp(y1 - y0 + 24, y1 - y0, a), r);
    x.strokeStyle = 'rgba(255,214,140,0.85)'; x.lineWidth = 2; x.shadowColor = 'rgba(255,200,87,0.9)'; x.shadowBlur = 14; x.stroke(); x.restore(); } }
  x.globalCompositeOperation = 'lighter';
  line(x, [T.top, T.a1], WARM, 0.8, 1.8, k(0.1));
  line(x, [T.top, T.b1], WARM, 0.7, 1.6, k(0.2));
  line(x, [T.a1, T.a2], WARM, 0.75, 1.6, k(0.3));
  line(x, [T.a2, T.hub], WARM, 0.75, 1.8, k(0.45));
  line(x, [T.b1, T.b2], '200,200,190', 0.35, 1.1, k(0.55)); line(x, [T.b1, T.b3], '200,200,190', 0.35, 1.1, k(0.6));
  T.spokes.forEach(([px, py, i]) => line(x, [T.hub, [px, py]], TEA, 0.6, 1.2, k(0.65 + i * 0.04, 0.2)));
  // beads of work running out along the spokes once they are there
  T.spokes.forEach(([px, py, i]) => { const a = k(1.0 + i * 0.03); if (a <= 0) return; const f = (u * 0.9 + i * 0.29) % 1;
    light(x, lerp(T.hub[0], px, f), lerp(T.hub[1], py, f), WARM, 0.5 * a * Math.sin(f * Math.PI), 2.2); });
  light(x, T.top[0], T.top[1], WARM, k(0, 0.15), 7);
  light(x, T.a1[0], T.a1[1], AMB, k(0.3, 0.15), 4.5); light(x, T.b1[0], T.b1[1], AMB, k(0.4, 0.15), 4.5);
  light(x, T.a2[0], T.a2[1], AMB, k(0.5, 0.15), 4.5);
  light(x, T.b2[0], T.b2[1], '170,170,160', 0.6 * k(0.75, 0.15), 3); light(x, T.b3[0], T.b3[1], '170,170,160', 0.6 * k(0.8, 0.15), 3);
  T.spokes.forEach(([px, py, i]) => light(x, px, py, i % 4 === 1 ? AMB : TEA, k(0.82 + i * 0.04, 0.15), 3.8));
  light(x, T.hub[0], T.hub[1], TEA, k(0.62, 0.15), 7.5 + 0.6 * Math.sin(u * 4));
  x.globalCompositeOperation = 'source-over';
  x.restore();
}
