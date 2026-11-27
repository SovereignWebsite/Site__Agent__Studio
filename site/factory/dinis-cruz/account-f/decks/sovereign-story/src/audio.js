// Procedural sound, after the original deck's approach (debrief 07): no audio files. Every pitch sits on one
// harmonic series on D2, so every scene is consonant with every other. Beds per scene, a sound for each
// transition that follows the same curve as the picture, small hits for typing, selection and chimes.
// Starts only after the viewer's first click or key (browsers require a gesture).
const ROOT = 73.416, H = (n) => ROOT * n;

export function createAudio() {
  let ac = null, comp, master, verb, bedBus, fxBus, noiseBuf, muted = false, bed = null, timer = null;
  const params = { mix: 0.5 };
  const now = () => ac.currentTime;

  function graph(a) {
    ac = a;
    comp = a.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.25;
    master = a.createGain(); master.gain.value = muted ? 0 : 0.85; comp.connect(master).connect(a.destination);
    const len = Math.floor(a.sampleRate * 3.4), ir = a.createBuffer(2, len, a.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = i < a.sampleRate * 0.015 ? 0 : (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb = a.createConvolver(); verb.buffer = ir; const wet = a.createGain(); wet.gain.value = 0.32; verb.connect(wet).connect(comp);
    bedBus = a.createGain(); bedBus.gain.value = 1.8; bedBus.connect(comp); bedBus.connect(verb);
    fxBus = a.createGain(); fxBus.connect(comp); const fxWet = a.createGain(); fxWet.gain.value = 0.6; fxBus.connect(fxWet).connect(verb);
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  // ---- building blocks ----
  function tone(f, t, dur, { type = "sine", gain = 0.1, atk = 0.005, rel = dur, dest = fxBus, f1 = 0, detune = 0 } = {}) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + atk); g.gain.exponentialRampToValueAtTime(1e-4, t + atk + rel);
    o.connect(g).connect(dest); o.start(t); o.stop(t + atk + rel + 0.05);
  }
  function bell(f, t, gain = 0.06, dest = fxBus) { [[1, 1, 2.2], [2.76, 0.45, 1.3], [5.4, 0.22, 0.7], [8.93, 0.1, 0.4]].forEach(([r, a, d]) => tone(f * r, t, d, { gain: gain * a, atk: 0.003, rel: d, dest })); }
  function noise(t, dur, { type = "bandpass", f0 = 1000, f1 = 0, Q = 1, gain = 0.1, atk = 0.01, rel = 0.1, dest = fxBus, steps = null } = {}) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.Q.value = Q; fl.frequency.setValueAtTime(f0, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t);
    if (steps) steps.forEach(([dt, v]) => g.gain.linearRampToValueAtTime(v * gain, t + dt));
    else { g.gain.linearRampToValueAtTime(gain, t + atk); g.gain.setValueAtTime(gain, t + Math.max(atk, dur - rel)); }
    g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(fl).connect(g).connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function pad(freqs, { gain = 0.05, lp = 1400, fade = 2.5, dest = bedBus } = {}) {
    const out = ac.createGain(), fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; fl.Q.value = 0.4;
    out.gain.setValueAtTime(0, now()); out.gain.linearRampToValueAtTime(gain, now() + fade); fl.connect(out).connect(dest);
    const oscs = [];
    freqs.forEach((f, i) => [-7, 0, 7].forEach((c, j) => {
      const o = ac.createOscillator(), g = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain();
      o.type = j === 1 ? "sine" : "triangle"; o.frequency.value = f; o.detune.value = c + (i % 2 ? 2 : -2);
      g.gain.value = (j === 1 ? 0.5 : 0.25) / freqs.length / (1 + i * 0.25);
      l.frequency.value = 0.05 + 0.031 * i + 0.017 * j; lg.gain.value = g.gain.value * 0.45; l.connect(lg).connect(g.gain);   // slow breathing
      o.connect(g).connect(fl); o.start(); l.start(); oscs.push(o, l);
    }));
    return { out, fl, stop(t = 1.6) { const n = now(); out.gain.cancelScheduledValues(n); out.gain.setValueAtTime(out.gain.value, n); out.gain.linearRampToValueAtTime(0, n + t); oscs.forEach((o) => o.stop(n + t + 0.1)); } };
  }
  function roomTone(gain = 0.03, lp = 380) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; s.loop = true; fl.type = "lowpass"; fl.frequency.value = lp;
    g.gain.setValueAtTime(0, now()); g.gain.linearRampToValueAtTime(gain, now() + 1.5); s.connect(fl).connect(g).connect(bedBus); s.start();
    const hum = ac.createOscillator(), hg = ac.createGain(); hum.frequency.value = H(1) * 1.5; hg.gain.value = gain * 0.25; hum.connect(hg).connect(g); hum.start();
    return { out: g, stop(t = 1.2) { const n = now(); g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.linearRampToValueAtTime(0, n + t); s.stop(n + t + 0.1); hum.stop(n + t + 0.1); } };
  }

  // ---- per-scene beds ----
  const BEDS = {
    plain: () => roomTone(0.035),
    own: () => pad([H(2), H(3), H(4), H(5), H(6)], { gain: 0.06, lp: 1100 }),
    split: () => {
      const right = pad([H(4), H(6), H(8), H(9)], { gain: 0.055, lp: 2200 }), left = ac.createGain(); left.gain.value = 0; left.connect(bedBus);
      let next = now() + 0.1, nextBird = now() + 1;
      const tick = setInterval(() => {                              // look-ahead scheduling, 300 ms
        const m = params.mix; left.gain.setTargetAtTime(Math.min(1, m * 1.6) * 0.9, now(), 0.1); right.out.gain.setTargetAtTime(0.055 * Math.min(1, (1 - m) * 1.6), now(), 0.1);
        while (next < now() + 0.3) { noise(next, 0.03, { type: "highpass", f0: 3500, gain: 0.05, atk: 0.001, dest: left }); tone(H(24), next, 0.03, { type: "square", gain: 0.012, dest: left }); next += 0.25; }   // the belt: one speed
        if (nextBird < now() + 0.3) { const f = 2600 + Math.random() * 1800; tone(f, nextBird, 0.09, { gain: 0.02 * (1 - m), f1: f * 1.35 }); tone(f * 1.1, nextBird + 0.12, 0.07, { gain: 0.015 * (1 - m), f1: f * 0.9 }); nextBird += 0.8 + Math.random() * 1.6; }
      }, 80);
      return { out: right.out, stop(t) { clearInterval(tick); right.stop(t); left.gain.setTargetAtTime(0, now(), 0.2); } };
    },
    field: () => pad([H(1), H(2), H(3), H(4)], { gain: 0.06, lp: 520 }),
    recap: () => pad([H(3), H(4), H(6), H(8)], { gain: 0.05, lp: 900 }),
    move: () => pad([H(8), H(12), H(16), H(20)], { gain: 0.035, lp: 3200 }),
    credits: () => pad([H(2), H(4), H(5), H(6), H(8)], { gain: 0.05, lp: 1500, fade: 3.5 }),
  };

  // ---- per-beat moments ----
  function beat(id, b) {
    const t = now();
    if (id === "plain" && b === 1) {
      for (let i = 0; i < 12; i++) { const at = t + 0.2 + (1.3 * i) / 12 + (Math.random() - 0.5) * 0.03; noise(at, 0.018, { type: "highpass", f0: 2400, gain: 0.08, atk: 0.001 }); tone(1600 + Math.random() * 300, at, 0.012, { gain: 0.02 }); }
      tone(H(8), t + 2.0, 0.09, { gain: 0.05, f1: H(12) }); bell(H(16), t + 2.05, 0.035);                 // the marquee pops
    }
    if (id === "own" && b === 1) { bell(H(12), t + 0.3, 0.03); }
    if (id === "field" && b === 1) { [H(8), H(10), H(12)].forEach((f, i) => bell(f, t + 1.0 + i * 0.75, 0.05)); bed && bed.extra == null && (bed.extra = pad([H(10), H(12), H(15)], { gain: 0.025, lp: 4000, fade: 3 })); }
    if (id === "recap" && b === 0) { bell(H(16), t + 4.4, 0.04); }
    if (id === "recap" && b === 1) { noise(t, 3.5, { type: "lowpass", f0: 300, f1: 1600, gain: 0.03, atk: 1.5, rel: 1.5 }); }
    if (id === "move" && b === 0) { [H(6), H(8), H(10), H(12)].forEach((f, i) => tone(f, t + 0.5 + i * 0.35, 3.5, { gain: 0.03, atk: 1.2, rel: 3 })); }
    if (id === "move" && b === 1) { noise(t + 0.3, 2.6, { type: "bandpass", f0: 600, f1: 5000, Q: 0.8, gain: 0.05, atk: 1.6, rel: 0.8 }); }
    if (id === "credits") { bell(H(8), t + 0.9, 0.04); bell(H(12), t + 1.9, 0.03); }
  }

  // ---- transitions, timed to the picture ----
  function transition(name, dur, reverse) {
    const t = now(), q = reverse ? 0.5 : 1;
    if (name === "tear") {
      const steps = []; for (let x = 0; x <= 0.34 * dur; x += 0.014) steps.push([x, (0.3 + 0.7 * Math.random()) * Math.min(1, x * 6)]);
      noise(t, 0.36 * dur, { type: "bandpass", f0: 1800, f1: 3400, Q: 1.4, gain: 0.22 * q, steps });
      noise(t, 0.36 * dur, { type: "lowpass", f0: 500, f1: 900, gain: 0.08 * q, steps });
      tone(H(32), t + 0.34 * dur, 0.03, { type: "triangle", gain: 0.06 * q });                              // the snap
      noise(t + 0.38 * dur, 0.6 * dur, { type: "lowpass", f0: 300, f1: 1800, gain: 0.07 * q, atk: 0.4, rel: 0.8 });
    } else if (name === "burn") {
      noise(t, dur, { type: "lowpass", f0: 180, f1: 2600, gain: 0.09 * q, atk: 0.8, rel: 1.0 });
      for (let i = 0; i < 90; i++) { const at = t + 0.2 + Math.random() * dur * 0.9; noise(at, 0.01 + Math.random() * 0.02, { type: "bandpass", f0: 2000 + Math.random() * 4000, Q: 3, gain: (0.04 + Math.random() * 0.08) * q, atk: 0.001 }); }
      tone(H(0.75), t, dur, { gain: 0.08 * q, atk: dur * 0.5, rel: dur * 0.6 });
    } else if (name === "daybreak") {
      const fl = ac.createBiquadFilter(), g = ac.createGain(); fl.type = "lowpass"; fl.frequency.setValueAtTime(250, t); fl.frequency.exponentialRampToValueAtTime(6000, t + dur * 0.5); fl.frequency.exponentialRampToValueAtTime(900, t + dur);
      g.gain.value = q; fl.connect(g).connect(fxBus);
      [H(4), H(5), H(6), H(8), H(10), H(12)].forEach((f, i) => tone(f, t, dur, { type: "sawtooth", gain: 0.022, atk: dur * 0.45, rel: dur * 0.55, dest: fl, detune: (i % 2 ? 5 : -5) }));
      tone(70, t + dur * 0.5, 0.6, { gain: 0.12 * q, f1: 42 }); bell(H(16), t + dur * 0.52, 0.03 * q);
    } else if (name === "iris") {
      noise(t, dur * 0.7, { type: "bandpass", f0: 400, f1: 3000, Q: 0.7, gain: 0.04 * q, atk: dur * 0.4, rel: dur * 0.3 });
      bell(H(12), t + dur * 0.15, 0.035 * q); bell(H(18), t + dur * 0.3, 0.02 * q);
    } else if (name === "fade") {
      noise(t, dur + 0.4, { type: "lowpass", f0: 200, f1: 700, gain: 0.03 * q, atk: dur * 0.5, rel: 0.4 });
    }
  }

  function scene(id) {
    if (!ac) return;
    if (bed) { bed.stop(1.6); bed.extra && bed.extra.stop(1.6); }
    bed = BEDS[id] ? BEDS[id]() : null;
  }
  return {
    get ready() { return !!ac; }, get muted() { return muted; },
    unlock(ctxOverride) { if (ac) { ac.resume && ac.resume(); return; } graph(ctxOverride || new (window.AudioContext || window.webkitAudioContext)()); },
    mute(v = !muted) { muted = v; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.85, now(), 0.05); },
    scene, beat, transition, param(k, v) { params[k] = v; },
  };
}
