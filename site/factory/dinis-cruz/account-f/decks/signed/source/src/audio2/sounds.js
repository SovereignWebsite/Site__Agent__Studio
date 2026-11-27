// Sound recipes. Each returns { ch: [Float32Array...], sr }. Tweak these by ear.
import { SR, H, rng, buf, ex, sm, mode, sweep, noise, crackle, finish, saturate, padsynth, impulse, SVF, fft } from "./dsp.js";

const out = (ch, sr = SR) => ({ ch, sr });

export const HITS = {
  // short UI tick: three bright modes + a click of noise
  tick: (R) => { const [b] = buf(0.09); mode(b, 2350, 0.5, 0.022, { atk: 5e-4 }); mode(b, 3900, 0.26, 0.014); mode(b, 1020, 0.34, 0.03, { atk: 8e-4 });
    noise(b, R, 0, 0.003, "lp", () => 5200, 0.7, (u) => 0.5 * (1 - u)); return out(finish([b])); },
  // the "select" chime: two notes of the harmonic series, slightly detuned between ears
  select: (R) => { const [L, Rr] = buf(0.62, 2);
    for (const [t, f, a] of [[0, H(24), 0.75], [0.072, H(33), 1]]) for (const [b, d] of [[L, 1], [Rr, 1.0016]]) { mode(b, f * d, a, 0.42, { at: t, atk: 0.004 }); mode(b, f * 2 * d, a * 0.16, 0.2, { at: t, atk: 0.003 }); mode(b, f * 2.756, a * 0.1, 0.09, { at: t }); }
    return out(finish([L, Rr], 1, 0.03)); },
  // SLAM impact: falling sub thump + plate modes + a noise crack + a long dark rumble, then soft-saturated
  slam: (R) => { const [L, Rr] = buf(2.6, 2);
    for (const [b, d] of [[L, 1], [Rr, 1.004]]) { sweep(b, 0, 1.9, (u) => (38 + 70 * ex(u, 34)) * d, (u) => 1.1 * ex(u, 4) * Math.min(1, u * 400));
      mode(b, 98 * d, 0.7, 0.6, { atk: 0.002 }); mode(b, 161 * d, 0.5, 0.42, { atk: 0.002 }); mode(b, 247 * d, 0.32, 0.3, { atk: 0.0015 }); mode(b, 392 * d, 0.12, 0.16);
      noise(b, R, 0, 0.16, "lp", (u) => 500 + 3000 * ex(u, 5), 0.6, (u) => 0.85 * ex(u, 4.5) * Math.min(1, u * 120));
      noise(b, R, 0.02, 2.3, "lp", (u) => 110 + 900 * ex(u, 7), 0.6, (u) => 0.5 * ex(u, 3.6)); crackle(b, R, 0.05, 0.8, 130, (x) => Math.pow(x, 1.2), 0.12, 1200, 4200); }
    return out(finish(saturate([L, Rr], 1.3), 1, 0.3)); },
  // BOOM: cinematic low hit (sub sweep + harmonic body + lowpassed noise)
  boom: (R) => { const [L, Rr] = buf(2.4, 2);
    for (const [b, d] of [[L, 1], [Rr, 1.003]]) { sweep(b, 0, 2.3, (u) => (36.7 + 46 * ex(u, 40)) * d, (u) => ex(u, 3.1) * Math.min(1, u * 240));
      sweep(b, 0, 1.2, (u) => (73.4 + 30 * ex(u, 22)) * d, (u) => 0.62 * ex(u, 4.2) * Math.min(1, u * 160)); mode(b, H(3) * d, 0.34, 0.7, { atk: 0.012 });
      noise(b, R, 0, 1.9, "lp", (u) => 90 + 560 * ex(u, 6), 0.6, (u) => 0.8 * ex(u, 3.4)); }
    return out(finish(saturate([L, Rr], 1.7), 1, 0.2)); },
  // SNAP: the moment paper separates
  snap: (R) => { const [b] = buf(0.14); noise(b, R, 0, 0.012, "bp", () => 2100, 0.7, (u) => ex(u, 4)); mode(b, 880 + R() * 120, 0.42, 0.032, { atk: 6e-4 }); mode(b, 1640 + R() * 200, 0.26, 0.022);
    noise(b, R, 0.004, 0.06, "bp", () => 1300, 0.9, (u) => 0.2 * ex(u, 5)); return out(finish([b])); },
  // PAPER rustle: crackle + a wandering band of noise
  paper: (R, v = 0) => { const [b] = buf(0.5); crackle(b, R, 0, 0.34 + 0.1 * R(), 260, (x) => Math.pow(x, 1.5), 1);
    noise(b, R, 0, 0.24, "bp", (u) => 2300 + 900 * Math.sin(u * 9 + v), 0.7, (u) => 0.07 * Math.sin(Math.PI * Math.pow(u, 0.6))); return out(finish([b], 1, 0.06)); },
  // SHIMMER: 46 random high partials of the series, scattered in time and across the stereo field
  shimmer: (R) => { const [L, Rr] = buf(2.2, 2), notes = [16, 18, 20, 22, 24, 27, 30, 32, 33, 36, 40, 44, 48];
    for (let k = 0; k < 46; k++) { const f = H(notes[Math.floor(R() * notes.length)] * (R() < 0.25 ? 2 : 1)), t = Math.pow(R(), 1.4) * 1.25, a = (0.2 + R() * 0.5) * (700 / (f + 400)), pan = R();
      mode(L, f, a * (1 - pan), 0.5 + R() * 0.5, { at: t, atk: 0.006, ph: R() * 6 }); mode(Rr, f * 1.001, a * pan, 0.5 + R() * 0.5, { at: t, atk: 0.006, ph: R() * 6 }); }
    return out(finish([L, Rr], 1, 0.3)); },
  // BELL: inharmonic partials, long decay
  bell: (R) => { const [L, Rr] = buf(4.2, 2), f = H(16);
    for (const [m, a, d] of [[0.5, 0.3, 3.6], [1, 0.9, 3.2], [1.499, 0.22, 2], [2, 0.4, 2.1], [2.756, 0.18, 1.1], [4.07, 0.1, 0.7], [5.43, 0.05, 0.35]])
      for (const b of [L, Rr]) mode(b, f * m * (1 + (R() - 0.5) * 0.0016), a, d, { atk: 0.003, ph: R() * 0.6 });
    return out(finish([L, Rr], 1, 0.4)); },
  // SUB: a slow swell on the fundamental, felt more than heard
  sub: () => { const [b] = buf(2); sweep(b, 0, 1.95, () => H(1), (u) => Math.sin(Math.PI * Math.pow(u, 0.55)) ** 2); sweep(b, 0, 1.95, () => H(2), (u) => 0.4 * Math.sin(Math.PI * Math.pow(u, 0.6)) ** 2); return out(finish([b], 1, 0.2)); },
  // WHOOSH: band-passed noise rising and falling, stereo offset
  whoosh: (R) => { const [L, Rr] = buf(0.95, 2), pk = 0.5, env = (u) => (u < pk ? sm(u / pk) : sm((1 - u) / (1 - pk))) ** 2, cut = (u) => 260 + 1500 * Math.pow(env(u), 0.8);
    noise(L, R, 0, 0.9, "bp", cut, 0.8, (u) => env(u)); noise(Rr, R, 0.015, 0.9, "bp", (u) => cut(u) * 1.05, 0.8, (u) => env(u) * 0.8); return out(finish([L, Rr])); },
  // RIP: tearing paper = a train of tiny impulses whose density jumps every 12–120 ms, through three resonant bands
  rip: (R) => { const n = Math.floor(1.6 * SR), res = [];
    for (let c = 0; c < 2; c++) { const src = new Float32Array(n); let gate = 0, level = 1, x = 0;
      for (let i = 0; i < n; i++) { if (--gate < 0) { gate = SR * (0.012 + R() * R() * 0.11); level = 0.35 + 0.65 * R(); }
        x = R() < (3300 * level) / SR ? (R() * 2 - 1) * (0.25 + R() * R()) : x * 0.62; src[i] = x * level; }
      const o = new Float32Array(n);
      for (const [f, q, g] of [[2100, 0.9, 1], [4300, 0.9, 0.5], [900, 1, 0.5]]) { const fl = new SVF(f, q); for (let i = 0; i < n; i++) { fl.run(src[i]); o[i] += fl.bp * g; } }
      res.push(o); }
    return out(finish(res, 0.6)); },
};

export const PADS = {
  strings: () => padsynth({ f: H(6), seed: 11, bw: 26, parts: Array.from({ length: 34 }, (_, i) => [i + 1, Math.pow(i + 1, -1.15) * (1 + 0.7 * Math.exp(-((((i + 1) * H(6) - 480) / 260) ** 2))) / (1 + ((i + 1) * H(6) / 3400) ** 2)]) }),
  warm: () => padsynth({ f: H(4), seed: 13, bw: 20, parts: Array.from({ length: 16 }, (_, i) => [i + 1, Math.pow(i + 1, -1.7) / (1 + ((i + 1) * H(4) / 1500) ** 2)]) }),
  low: () => padsynth({ f: H(2), seed: 12, bw: 16, parts: Array.from({ length: 26 }, (_, i) => [i + 1, Math.pow(i + 1, -1.25) / (1 + ((i + 1) * H(2) / 900) ** 2)]) }),
  glass: () => padsynth({ f: H(12), seed: 16, bw: 5, parts: [[1, 1, 5], [2, 0.16, 8], [2.71, 0.1, 10], [5.15, 0.03, 14], [0.5, 0.05, 4]] }),
  air: () => padsynth({ f: H(12), seed: 19, bw: 80, parts: [[1, 1, 60], [2, 0.5, 90], [3, 0.22, 110], [4, 0.16, 130], [6, 0.07, 150]] }),
  organ: () => padsynth({ f: H(4), seed: 17, bw: 9, parts: [[0.5, 0.34], [1, 1], [1.5, 0.16], [2, 0.62], [3, 0.3], [4, 0.3], [6, 0.12], [8, 0.12], [16, 0.025]] }),
  hum: () => padsynth({ f: 100, seed: 21, bw: 1, parts: [[1, 1], [2, 0.5], [3, 0.34], [4, 0.2], [5, 0.13], [6, 0.12], [8, 0.06], [10, 0.045]] }),
  sine: () => padsynth({ f: H(8), seed: 22, bw: 0.2, parts: [[1, 1]] }),
};
export const PAD_F0 = { strings: H(6), warm: H(4), low: H(2), glass: H(12), air: H(12), organ: H(4), hum: 100, sine: H(8) };
export const NOISES = {
  pink: () => noiseTable((f) => (f < 20 ? 0 : 1 / Math.sqrt(f)), 31),
  brown: () => noiseTable((f) => (f < 24 ? 0 : 1 / f), 32),
};
function noiseTable(shape, seed) { // coloured noise by the same spectral method, so it loops perfectly
  const N = 1 << 17, sr = 32000, half = N >> 1, ch = [];
  for (let c = 0; c < 2; c++) { const re = new Float32Array(N), im = new Float32Array(N), R = rng(seed + c * 9);
    for (let k = 1; k < half; k++) { const m = shape((k * sr) / N), ph = R() * Math.PI * 2; re[k] = m * Math.cos(ph); im[k] = m * Math.sin(ph); re[N - k] = re[k]; im[N - k] = -im[k]; }
    fft(re, im, true); ch.push(re); }
  return { ch: finish(ch, 0.5, 0), sr };
}
export const IRS = { hall: () => impulse(4.6, { seed: 71, pre: 0.022, damp: 3.2, bright: 0.85 }), room: () => impulse(0.55, { seed: 72, pre: 0.004, damp: 2, bright: 0.8, early: 14 }) };
