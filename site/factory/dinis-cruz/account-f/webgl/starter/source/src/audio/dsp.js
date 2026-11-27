// Offline DSP primitives. Everything renders into Float32Arrays once, at load.
// Same idea as the original deck: no audio files, every sound is synthesised.
export const SR = 48000;
export const TAU = Math.PI * 2;
export const H = (n) => 36.708 * n; // one harmonic series on D1: every sound in the talk is consonant with every other

export function rng(seed) { let t = seed >>> 0 || 1; return () => ((t ^= t << 13), (t >>>= 0), (t ^= t >>> 17), (t ^= t << 5), (t >>>= 0), t / 4294967296); }
export const buf = (sec, ch = 1, sr = SR) => Array.from({ length: ch }, () => new Float32Array(Math.ceil(sec * sr)));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ex = (t, k) => Math.exp(-k * t);
export const sm = (t) => ((t = Math.min(1, Math.max(0, t))), t * t * (3 - 2 * t));

// State-variable filter (TPT form): stable under fast cutoff modulation. Gives lp, bp, hp at once.
export class SVF {
  constructor(f = 1000, q = 0.7, sr = SR) { this.a = this.b = 0; this.sr = sr; this.set(f, q); }
  set(f, q = 0.7) { const g = Math.tan((Math.PI * Math.min(f, this.sr * 0.45)) / this.sr); this.k = 1 / q; this.a1 = 1 / (1 + g * (g + this.k)); this.a2 = g * this.a1; this.a3 = g * this.a2; }
  run(x) { const v3 = x - this.b, v1 = this.a1 * this.a + this.a2 * v3, v2 = this.b + this.a2 * this.a + this.a3 * v3;
    this.a = 2 * v1 - this.a; this.b = 2 * v2 - this.b; this.lp = v2; this.bp = v1 * this.k; this.hp = x - this.k * v1 - v2; return v2; }
}

// MODAL RESONATOR: an exponentially decaying sinusoid, computed by rotating a phasor (no sin() per sample).
// Most "hits" are 2–6 of these plus a short noise burst.
export function mode(b, f, amp, decay, { at = 0, atk = 0, ph = 0, sr = SR } = {}) {
  if (f > sr * 0.42 || f < 8) return;
  let i = Math.floor(at * sr); const r = Math.exp(-6.91 / (decay * sr)), w = (TAU * f) / sr, c = Math.cos(w) * r, s = Math.sin(w) * r;
  let x = amp * Math.sin(ph), y = amp * Math.cos(ph); const A = Math.max(1, atk * sr), end = Math.min(b.length, i + Math.ceil(decay * sr * 1.5));
  for (let n = 0; i < end; i++, n++) { b[i] += n < A ? x * (0.5 - 0.5 * Math.cos((Math.PI * n) / A)) : x; const nx = x * c + y * s; y = y * c - x * s; x = nx; }
}
// SWEPT OSCILLATOR: any frequency curve f(u) and amplitude curve a(u), u = 0..1 over the duration.
export function sweep(b, at, dur, f, a, { sr = SR, ph = 0 } = {}) {
  const i0 = Math.floor(at * sr), n = Math.floor(dur * sr); let p = ph;
  for (let i = 0; i < n && i0 + i < b.length; i++) { const u = i / n; b[i0 + i] += Math.sin(p) * a(u); p += (TAU * f(u)) / sr; }
}
// FILTERED NOISE: white noise through an SVF whose cutoff follows a curve. Air, paper, water, whooshes.
export function noise(b, R, at, dur, type, cut, q, a, { sr = SR } = {}) {
  const fl = new SVF(cut(0), q, sr), i0 = Math.floor(at * sr), n = Math.floor(dur * sr);
  for (let i = 0; i < n && i0 + i < b.length; i++) { const u = i / n; if ((i & 15) === 0) fl.set(cut(u), q); fl.run(R() * 2 - 1); b[i0 + i] += fl[type] * a(u); }
}
// CRACKLE: sparse random impulses through band-passes. Paper, dust, debris.
export function crackle(b, R, at, dur, count, dist, amp, lo = 1500, hi = 6500, sr = SR) {
  const imp = new Float32Array(Math.ceil(dur * sr) + 2000);
  for (let k = 0; k < count; k++) { const p = Math.floor(dist(R()) * dur * sr), g = Math.pow(R(), 3.2) * (R() < 0.5 ? -1 : 1), len = 6 + Math.floor(R() * R() * 150);
    for (let j = 0; j < len && p + j < imp.length; j++) imp[p + j] += g * (R() * 2 - 1) * (1 - j / len); }
  const f1 = new SVF(lerp(lo, hi, 0.12), 1.2), f2 = new SVF(lerp(lo, hi, 0.45), 1.4), f3 = new SVF(hi, 1), i0 = Math.floor(at * sr);
  for (let i = 0; i < imp.length && i0 + i < b.length; i++) { const x = imp[i]; f1.run(x); f2.run(x); f3.run(x); b[i0 + i] += amp * (f1.bp * 0.9 + f2.bp * 0.8 + f3.bp * 0.45); }
}
// DC-block, fade the tail, normalise to a peak.
export function finish(bufs, peak = 1, fade = 0.004, sr = SR) {
  let m = 0;
  for (const b of bufs) { let x1 = 0, y1 = 0; const r = 1 - (TAU * 18) / sr; for (let i = 0; i < b.length; i++) { const y = b[i] - x1 + r * y1; x1 = b[i]; y1 = y; b[i] = y; }
    const F = Math.floor(fade * sr); for (let i = 0; i < F; i++) b[b.length - 1 - i] *= i / F; for (const v of b) m = Math.max(m, Math.abs(v)); }
  const g = m ? peak / m : 0; for (const b of bufs) for (let i = 0; i < b.length; i++) b[i] *= g; return bufs;
}
export const saturate = (bufs, drive) => { for (const b of bufs) for (let i = 0; i < b.length; i++) b[i] = Math.tanh(b[i] * drive); return bufs; };

// In-place radix-2 FFT (inverse when inv = true).
export function fft(re, im, inv = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const ang = ((inv ? 1 : -1) * TAU) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const a = i + k, b2 = a + len / 2, tr = re[b2] * cr - im[b2] * ci, ti = re[b2] * ci + im[b2] * cr;
      re[b2] = re[a] - tr; im[b2] = im[a] - ti; re[a] += tr; im[a] += ti; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
}
// PADSYNTH (Nasca's algorithm): a spectrum of Gaussian-widened harmonics with random phases, inverse-FFT'd into a
// perfectly looping table. Bandwidth in cents makes it lush (strings, choir) or pure (glass).
// parts: [[harmonicMultiple, amplitude, bandwidthCents?], ...]
export function padsynth({ f, parts, bw = 30, seed = 1, N = 1 << 17, sr = 32000, stereo = true }) {
  const half = N >> 1, mag = new Float32Array(half), df = sr / N;
  for (const [mult, amp, b = bw] of parts) { const fc = f * mult; if (fc > sr * 0.46) continue;
    const width = Math.max(df * 0.8, ((Math.pow(2, b / 1200) - 1) * fc) / 2) / df, c = fc / df;
    for (let k = Math.max(1, Math.floor(c - 4 * width)); k <= Math.min(half - 1, Math.ceil(c + 4 * width)); k++) { const z = (k - c) / width; mag[k] += (amp / Math.sqrt(width)) * Math.exp(-z * z); } }
  const R = rng(seed), out = [];
  for (let ch = 0; ch < (stereo ? 2 : 1); ch++) {
    const re = new Float32Array(N), im = new Float32Array(N);
    for (let k = 1; k < half; k++) { const ph = R() * TAU; re[k] = mag[k] * Math.cos(ph); im[k] = mag[k] * Math.sin(ph); re[N - k] = re[k]; im[N - k] = -im[k]; }
    fft(re, im, true); out.push(re);
  }
  finish(out, 0.5, 0); return { ch: out, sr };
}
// Synthetic reverb impulse: decaying, darkening noise with a pre-delay and a few early reflections.
export function impulse(sec, { seed = 7, pre = 0.02, damp = 3, bright = 0.85, early = 0, sr = 44100 } = {}) {
  const n = Math.floor(sec * sr), out = [];
  for (let c = 0; c < 2; c++) { const R = rng(seed + c * 7), b = new Float32Array(n); let h = 0, d = 0; const p0 = Math.floor(pre * sr);
    for (let i = p0; i < n; i++) { const u = (i - p0) / (n - p0), k = Math.min(1, Math.max(0.01, 0.62 * bright * Math.exp(-damp * u) + 0.03));
      h += (R() * 2 - 1 - h) * k; d += (h - d) * Math.min(1, k * 1.6); b[i] = (d * Math.exp(-6.2 * u) * Math.min(1, (i - p0) / (0.012 * sr))) / Math.sqrt(k); }
    for (let e = 0; e < early; e++) { const t = Math.floor((0.004 + 0.05 * Math.pow(R(), 1.3)) * sr); if (t < n) b[t] += (R() < 0.5 ? -1 : 1) * 0.5 * Math.exp(-e * 0.12); }
    out.push(b); }
  return { ch: out, sr };
}
