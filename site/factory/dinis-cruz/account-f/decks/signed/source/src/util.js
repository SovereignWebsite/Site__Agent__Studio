// Math, easing, randomness. Everything else builds on these.
export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const remap = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = (t) => ((t = clamp(t)), t * t * (3 - 2 * t));
export const damp = (rate, dt) => 1 - Math.exp(-rate * dt); // v += (target - v) * damp(k, dt)

export const ease = {
  lin: (t) => clamp(t),
  out2: (t) => 1 - (1 - clamp(t)) ** 2,
  out3: (t) => 1 - (1 - clamp(t)) ** 3,
  out4: (t) => 1 - (1 - clamp(t)) ** 4,
  in3: (t) => clamp(t) ** 3,
  io3: (t) => ((t = clamp(t)), t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  io4: (t) => ((t = clamp(t)), t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  ioExpo: (t) => ((t = clamp(t)), t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2),
  outBack: (t, s = 1.4) => ((t = clamp(t) - 1), 1 + (s + 1) * t * t * t + s * t * t),
};

// Seeded PRNG: same look on every load (vital for rehearsal and screenshot tests).
export function rng(seed = 1) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const hex = (h) => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
