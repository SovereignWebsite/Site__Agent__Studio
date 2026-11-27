// Audio engine: buses → compressor → soft clipper, convolution reverb, looping pads, one-shot hits,
// per-scene "beds" and per-transition sound cues. Works on a live AudioContext or an OfflineAudioContext.
import { HITS, PADS, PAD_F0, NOISES } from "./sounds.js";
import { H, rng, impulse } from "./dsp.js";

// ---------- the bank: synthesise every recipe once, cache as AudioBuffers ----------
const RAW = new Map();
function raw(name) { // name: "hit.slam" | "pad.strings" | "noise.pink"
  if (!RAW.has(name)) { const [k, n] = name.split("."); const R = rng([...n].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    RAW.set(name, k === "hit" ? HITS[n](R) : k === "pad" ? PADS[n]() : NOISES[n]()); }
  return RAW.get(name);
}
export function preloadAll() { for (const n in HITS) raw("hit." + n); for (const n in PADS) raw("pad." + n); for (const n in NOISES) raw("noise." + n); }

export function makeEngine(ctx) {
  const cache = new Map();
  const get = (name) => { if (!cache.has(name)) { const r = raw(name), b = ctx.createBuffer(r.ch.length, r.ch[0].length, r.sr); r.ch.forEach((c, i) => b.copyToChannel(c, i)); cache.set(name, b); } return cache.get(name); };
  const gain = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };

  // master chain: sum → compressor → makeup → soft clip → out
  const sum = gain(1), comp = ctx.createDynamicsCompressor(), makeup = gain(0.8), clip = ctx.createWaveShaper(), master = gain(1);
  comp.threshold.value = -15; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.22;
  const curve = new Float32Array(4097); for (let i = 0; i < 4097; i++) { const x = (i / 4096) * 2 - 1, a = Math.abs(x); curve[i] = Math.sign(x) * (a < 0.26 ? a : 0.26 + 0.14 * Math.tanh((a - 0.26) / 0.14)); }
  clip.curve = curve;
  sum.connect(comp); comp.connect(makeup); makeup.connect(clip); clip.connect(master); master.connect(ctx.destination);
  // reverbs (IR generated at the context's own sample rate — ConvolverNode requires it)
  const mkVerb = (ir) => { const r = ir, b = ctx.createBuffer(2, r.ch[0].length, r.sr); r.ch.forEach((c, i) => b.copyToChannel(c, i)); const cv = ctx.createConvolver(); cv.buffer = b; return cv; };
  const hall = mkVerb(impulse(4.6, { seed: 71, pre: 0.022, damp: 3.2, bright: 0.85, sr: ctx.sampleRate })), hallIn = gain(1); hallIn.connect(hall); hall.connect(sum);
  const room = mkVerb(impulse(0.55, { seed: 72, pre: 0.004, damp: 2, bright: 0.8, early: 14, sr: ctx.sampleRate })), roomIn = gain(0.8); roomIn.connect(room); room.connect(sum);
  // a "group" = dry/wet sends with its own reverb balance; every bed and cue gets one
  const group = (wet = 0.4, rm = 0) => { const out = gain(1); out.connect(sum); const w = gain(wet); out.connect(w); w.connect(hallIn); if (rm) { const r = gain(rm); out.connect(r); r.connect(roomIn); } return out; };

  // ---- primitives ----
  const E = { ctx, master, group, get now() { return ctx.currentTime; } };
  E.hit = (name, t, { g = 1, rate = 1, pan = 0, to } = {}) => {
    const src = ctx.createBufferSource(); src.buffer = get("hit." + name); src.playbackRate.value = rate;
    const gg = gain(g); src.connect(gg); let node = gg;
    if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; gg.connect(p); node = p; }
    node.connect(to || E.hitBus); src.start(Math.max(t, ctx.currentTime)); return src;
  };
  // automation: points [[u, value], ...] across [t0, t0+dur]
  E.curve = (param, t0, dur, pts, expo = false) => { param.setValueAtTime(pts[0][1], t0 + pts[0][0] * dur); for (let i = 1; i < pts.length; i++) expo ? param.exponentialRampToValueAtTime(Math.max(1e-4, pts[i][1]), t0 + pts[i][0] * dur) : param.linearRampToValueAtTime(pts[i][1], t0 + pts[i][0] * dur); };
  // a looping pad voice: buffer → lowpass → gain → pan → destination
  E.pad = (name, freq, { g = 0.2, atk = 2, lp = 0, pan = 0, to, t = ctx.currentTime } = {}) => {
    const src = ctx.createBufferSource(); src.buffer = get(name.startsWith("noise.") ? name : "pad." + name); src.loop = true;
    src.playbackRate.value = name.startsWith("noise.") ? freq : freq / PAD_F0[name];
    let node = src, F = null; if (lp) { F = ctx.createBiquadFilter(); F.type = "lowpass"; F.frequency.value = lp; F.Q.value = 0.6; src.connect(F); node = F; }
    const A = gain(0); node.connect(A); node = A; if (pan) { const P = ctx.createStereoPanner(); P.pan.value = pan; A.connect(P); node = P; }
    node.connect(to || E.bedBus); src.start(t); A.gain.setValueAtTime(0, t); A.gain.setTargetAtTime(g, t, Math.max(0.01, atk / 3));
    return { src, A, F, set(v, tc = 1, at = ctx.currentTime) { A.gain.cancelScheduledValues(at); A.gain.setTargetAtTime(v, at, Math.max(0.005, tc)); },
      kill(at = ctx.currentTime, tc = 0.5) { A.gain.cancelScheduledValues(at); A.gain.setTargetAtTime(0, at, tc / 3); src.stop(at + tc * 2 + 0.1); } };
  };
  E.bedBus = group(0.45, 0.1); E.hitBus = group(0.3, 0.15);

  // ---------- beds: one small score per scene (chord voices with gains per beat) ----------
  const BEDS = { // [pad, frequency, gain per beat, lowpass Hz (0 = none), pan] — keep beds well below the cues
    title: [["warm", H(4), [0.07, 0.09], 900, -0.2], ["strings", H(6), [0.03, 0.05], 1400, 0.3], ["air", H(12), [0.012, 0.025], 0, 0], ["glass", H(12), [0, 0.03], 0, -0.3]],
    field: [["low", H(2), [0.05, 0.07], 260, 0], ["strings", H(9), [0.04, 0.06], 1800, 0.35], ["noise.pink", 1, [0.03, 0.05], 700, -0.3], ["air", H(12), [0.02, 0.035], 0, 0.2]],
    plain: [["hum", 100, [0.012, 0.008], 0, 0], ["noise.pink", 1, [0.008, 0.006], 400, 0], ["glass", H(11), [0, 0.035], 0, 0]],
    end: [["organ", H(4), [0.06, 0.08], 1600, 0], ["strings", H(8), [0.03, 0.05], 2400, -0.3], ["warm", H(6), [0.04, 0.05], 1200, 0.3], ["glass", H(16), [0.015, 0.03], 0, 0]],
  };
  let bed = null;
  E.scene = (id, beat, t = ctx.currentTime, fade = 1.2) => {
    if (bed) bed.voices.forEach((v) => v.kill(t, fade));
    const def = BEDS[id] || []; bed = { id, def, voices: def.map(([n, f, g, lp, pan]) => E.pad(n, f, { g: g[Math.min(beat, g.length - 1)], atk: fade * 1.2, lp, pan, t })) };
  };
  E.beat = (id, beat, t = ctx.currentTime) => { if (!bed || bed.id !== id) return; bed.voices.forEach((v, i) => { const g = bed.def[i][2]; v.set(g[Math.min(beat, g.length - 1)], 1.2, t); }); };

  // ---------- transition cues: everything is placed on the transition's own 0..1 timeline ----------
  const swell = (t0, dur, to, name, f, gains, { lp, glide, pan = 0, tail = 0.3 } = {}) => {
    const src = ctx.createBufferSource(); src.buffer = get(name.startsWith("noise.") ? name : "pad." + name); src.loop = true;
    const base = name.startsWith("noise.") ? f : f / PAD_F0[name]; src.playbackRate.value = base;
    let node = src; if (lp) { const F = ctx.createBiquadFilter(); F.type = "lowpass"; F.Q.value = 0.5; E.curve(F.frequency, t0, dur, lp, true); src.connect(F); node = F; }
    const A = gain(0); node.connect(A); let o = A; if (pan) { const P = ctx.createStereoPanner(); P.pan.value = pan; A.connect(P); o = P; } o.connect(to);
    E.curve(A.gain, t0, dur, gains); if (glide) E.curve(src.playbackRate, t0, dur, glide.map(([u, r]) => [u, base * r]), true);
    src.start(t0); src.stop(t0 + dur * gains[gains.length - 1][0] + tail);
  };
  const band = (t0, dur, to, name, type, gains, freqs, { q = 0.8, rate, pan } = {}) => {
    const src = ctx.createBufferSource(); src.buffer = get(name); src.loop = true; const F = ctx.createBiquadFilter(); F.type = type; F.Q.value = q;
    const A = gain(0); src.connect(F); F.connect(A); let o = A;
    if (pan) { const P = ctx.createStereoPanner(); E.curve(P.pan, t0, dur, pan); A.connect(P); o = P; } o.connect(to);
    E.curve(A.gain, t0, dur, gains); E.curve(F.frequency, t0, dur, freqs, true); if (rate) E.curve(src.playbackRate, t0, dur, rate, true);
    src.start(t0, 0); src.stop(t0 + dur * gains[gains.length - 1][0] + 0.2);
  };
  const R = rng(1234); // seeded: the same cue sounds the same every time (and in video renders)
  const CUES = {
    // LINE: a chord collapses with the picture (low-pass closes, pitch sags), a pure tone sings as the thread, a tick when it snaps back
    line: (t0, d, G) => {
      for (const [n, h, g, pan] of [["organ", 4, 0.3, 0], ["strings", 6, 0.22, 0.3], ["strings", 9, 0.16, -0.4], ["organ", 8, 0.18, -0.2]])
        swell(t0, d, G, n, H(h), [[0, 0], [0.05, g], [0.35, g * 0.6], [0.8, 0]], { lp: [[0, 5200], [0.35, 900], [0.8, 120]], glide: [[0, 1], [0.3, 1], [0.8, 0.92]], pan });
      band(t0, d, G, "noise.pink", "lowpass", [[0, 0], [0.06, 0.3], [0.4, 0.12], [0.8, 0]], [[0, 5000], [0.8, 130]], { q: 0.5 });
      swell(t0, d, G, "sine", H(12), [[0, 0], [0.25, 0.02], [0.7, 0.2], [1, 0.17], [1.5, 0]]);
      E.hit("sub", t0 + 0.05 * d, { g: 0.3, rate: 0.9, to: G }); E.hit("tick", t0 + 0.82 * d, { g: 0.7, rate: 1.3, to: G });
    },
    // DAYBREAK: a nine-voice chord whose low-pass opens from 250 Hz to 7.5 kHz while the light floods in; shimmer + boom at the peak
    daybreak: (t0, d, G) => {
      band(t0, d, G, "noise.pink", "lowpass", [[0, 0], [0.5, 0.2], [1, 0.06], [1.6, 0]], [[0, 200], [0.55, 4200], [1.6, 600]], { q: 0.5 });
      [["low", 2, 0.42, 0], ["warm", 4, 0.34, -0.2], ["warm", 6, 0.26, 0.25], ["strings", 8, 0.2, -0.4], ["strings", 10, 0.16, 0.45], ["strings", 12, 0.12, -0.2], ["warm", 9, 0.1, 0.3], ["strings", 16, 0.07, 0], ["air", 24, 0.05, 0.4]]
        .forEach(([n, h, g, pan], i) => swell(t0, d, G, n, H(h), [[0, 0], [0.18 + 0.04 * i, g * 0.25], [0.58 + 0.012 * i, g], [1, g * 0.6], [1.9, 0]], { pan, lp: [[0, 250], [0.6, 7500], [1.2, 2600], [1.9, 600]] }));
      E.hit("shimmer", t0 + 0.46 * d, { g: 1, to: G }); E.hit("shimmer", t0 + 0.66 * d, { g: 0.6, to: G }); E.hit("boom", t0 + 0.5 * d, { g: 0.45, to: G }); E.hit("sub", t0 + 0.3 * d, { g: 0.6, to: G });
    },
    // SLAM: rising pressure (noise + a dissonant string pair) → IMPACT at 0.285 (slam + boom) → rumble and falling paper
    slam: (t0, d, G) => { const c = 0.285;
      band(t0, d, G, "noise.pink", "bandpass", [[0, 0], [c * 0.55, 0.1], [c * 0.97, 0.5], [c, 0]], [[0, 250], [c, 2100]], { q: 0.8 });
      swell(t0, d, G, "strings", H(3) * 1.06, [[0, 0], [c * 0.9, 0.2], [c, 0]], { lp: [[0, 300], [c, 2200]], tail: 0.05 });
      swell(t0, d, G, "strings", H(3), [[0, 0], [c * 0.9, 0.2], [c, 0]], { lp: [[0, 300], [c, 2200]], tail: 0.05 });
      E.hit("slam", t0 + c * d, { g: 1.35, to: G }); E.hit("boom", t0 + c * d, { g: 0.9, to: G }); E.hit("slam", t0 + c * d + 0.02, { g: 0.3, rate: 0.62, to: G });
      band(t0, d, G, "noise.brown", "lowpass", [[0, 0], [c, 0], [c + 0.03, 0.65], [0.6, 0.3], [1.3, 0]], [[0, 700], [c, 900], [0.5, 240], [1.3, 90]], { q: 0.5 });
      for (let k = 0; k < 12; k++) E.hit("paper", t0 + (c + 0.07 + 0.05 * k + 0.03 * R()) * d, { g: (0.5 - 0.03 * k) * (0.5 + 0.5 * R()), rate: 0.8 + 0.4 * R(), pan: R() * 1.6 - 0.8, to: G });
    },
    // TEAR: a rip whose loudness stutters along with the tear front, a SNAP when the halves separate, paper falling
    tear: (t0, d, G) => { const s = 0.56, env = [[0, 0], [0.03, 0.5]];
      for (let b = 1; b < 12; b++) env.push([0.03 + ((s - 0.05) * b) / 12, 1.8 * (0.36 + (0.3 * b) / 12) * (0.6 + 0.4 * R())]); env.push([s, 1.4], [s + 0.025, 0]); env[1][1] = 0.9;
      band(t0, d, G, "hit.rip", "bandpass", env, [[0, 1400], [s * 0.5, 2000], [s, 2900]], { q: 0.45, rate: [[0, 0.7], [s * 0.4, 0.85], [s * 0.7, 0.8], [s, 1.2]], pan: [[0, -0.15], [s, 0.15]] });
      band(t0, d, G, "hit.rip", "lowpass", env.map(([u, v]) => [u, v * 0.5]), [[0, 700], [s, 1100]], { q: 0.5, rate: [[0, 0.4], [s, 0.6]] });
      for (let k = 0; k < 6; k++) E.hit("paper", t0 + (0.06 + 0.08 * k + 0.03 * R()) * d, { g: 0.3 + 0.2 * R(), rate: 0.85 + 0.3 * R(), pan: R() - 0.5, to: G });
      E.hit("snap", t0 + s * d, { g: 0.9, rate: 0.85, to: G });
      band(t0, d, G, "noise.pink", "bandpass", [[0, 0], [0.36, 0.02], [0.68, 0.3], [0.85, 0.12], [1, 0]], [[0, 500], [0.36, 500], [0.7, 1500], [1, 420]], { q: 0.8, pan: [[0, 0], [0.5, -0.4], [1, 0.4]] });
      for (let k = 0; k < 9; k++) E.hit("paper", t0 + (s + 0.04 + 0.04 * k + 0.02 * R()) * d, { g: (0.75 - 0.06 * k) * (0.6 + 0.4 * R()), rate: 0.72 + 0.3 * R(), pan: k % 2 ? 0.6 : -0.6, to: G });
    },
    iris: (t0, d, G) => { E.hit("whoosh", t0, { g: 0.8, to: G }); E.hit("bell", t0 + 0.45 * d, { g: 0.16, rate: 0.75, to: G }); E.hit("sub", t0 + 0.1 * d, { g: 0.4, to: G }); },
    fade: (t0, d, G) => band(t0, d, G, "noise.pink", "bandpass", [[0, 0], [0.45, 0.12], [1, 0]], [[0, 350], [0.5, 900], [1, 400]], { q: 0.7 }),
    reverse: (t0, d, G) => { band(t0, d, G, "noise.pink", "bandpass", [[0, 0], [0.6, 0.3], [1, 0]], [[0, 1800], [1, 320]], { q: 0.7, pan: [[0, 0.3], [1, -0.3]] }); swell(t0, d, G, "air", H(12), [[0, 0], [0.6, 0.14], [1, 0]], { glide: [[0, 1.5], [1, 1]] }); },
  };
  E.transition = (name, dur, reverse = false, t = ctx.currentTime) => { const G = group(0.6, 0); (CUES[reverse && name !== "fade" ? "reverse" : name] || CUES.fade)(t + 0.015, dur, G); };
  return E;
}

// ---------- live front end + event log (used to re-render the exact same sound offline for video) ----------
export function createAudio() {
  let E = null, muted = false; const log = [];
  const api = {
    recording: false, log,
    unlock() { if (E) { E.ctx.state !== "running" && E.ctx.resume(); return; } const C = window.AudioContext || window.webkitAudioContext; if (!C) return; E = makeEngine(new C({ latencyHint: "interactive" })); if (muted) E.master.gain.value = 0; },
    mute(v = !muted) { muted = v; if (E) E.master.gain.setTargetAtTime(muted ? 0 : 1, E.now, 0.05); return muted; },
    // the deck calls these with its own clock (deckTime) so they can be logged and replayed offline
    event(type, data, deckTime) { if (api.recording) log.push({ t: deckTime, type, ...data }); if (!E || E.ctx.state !== "running") return; play(E, { type, ...data }, E.now); },
  };
  return api;
}
function play(E, ev, t) {
  if (ev.type === "scene") E.scene(ev.id, ev.beat || 0, t, ev.fade ?? 1.2);
  else if (ev.type === "beat") E.beat(ev.id, ev.beat, t);
  else if (ev.type === "transition") E.transition(ev.name, ev.dur, ev.reverse, t);
  else if (ev.type === "hit") E.hit(ev.name, t, ev);
}
// Render a logged session to a stereo WAV (base64) with an OfflineAudioContext — identical synthesis to live.
export async function renderOffline(log, seconds, sr = 48000) {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sr), sr), E = makeEngine(ctx);
  for (const ev of log) play(E, ev, Math.max(0, ev.t));
  const buf = await ctx.startRendering();
  return wavBase64(buf);
}
function wavBase64(b) {
  const n = b.length, ch = b.numberOfChannels, data = new DataView(new ArrayBuffer(44 + n * ch * 2)); let o = 0;
  const s = (str) => { for (const c of str) data.setUint8(o++, c.charCodeAt(0)); }, u32 = (v) => { data.setUint32(o, v, true); o += 4; }, u16 = (v) => { data.setUint16(o, v, true); o += 2; };
  s("RIFF"); u32(36 + n * ch * 2); s("WAVE"); s("fmt "); u32(16); u16(1); u16(ch); u32(b.sampleRate); u32(b.sampleRate * ch * 2); u16(ch * 2); u16(16); s("data"); u32(n * ch * 2);
  const C = Array.from({ length: ch }, (_, i) => b.getChannelData(i));
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { data.setInt16(o, Math.max(-1, Math.min(1, C[c][i])) * 32767, true); o += 2; }
  let bin = ""; const bytes = new Uint8Array(data.buffer); for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
