# 07 — Audio (fully procedural)

There are no audio files. Every sound is synthesised into `Float32Array`s at load time (in small
time-sliced chunks) and played through a WebAudio graph. This is one of the most sophisticated parts
of the deck and a big contributor to the "cinematic" feel.

## Layers

```
recipes (Sr hits, cc pads, instruments, IRs)
   → bank D3: prioritised, generator-based, time-sliced offline synthesis → AudioBuffers
   → engine U3: buses, groups, convolution reverbs, compressor + soft clipper, play/note/raw/pad
   → beds (qi subclasses, one per scene): music/ambience driven by beat changes and a look-ahead scheduler
   → transition sound designs V3 (per transition name)
   → public API G3: unlock, mute, emit(event), hit(name, {gain,pitch,pan}), param(name, v), update(dt,{scene,beat})
```

## DSP primitives (all offline, sample-accurate)

* `We(buf, f, amp, decay, {at, ph, atk})` — **modal resonator**: exponentially decaying sinusoid via
  recursive rotation (no `Math.sin` per sample). Most hits are sums of 2–6 modes + a noise burst.
* `ii(buf, t, dur, freqFn, ampFn)` — **swept oscillator** with arbitrary frequency/amplitude curves.
* `en(buf, rnd, t, dur, "lp|bp|hp", cutoffFn, Q, ampFn)` — **filtered noise** through a
  Chamberlin/TPT **state-variable filter** (`Pi`), cutoff updated every 16 samples.
* `e0` — **crackle**: sparse random impulses through three band-passes (paper, dust).
* `rn(bufs, peak)` — DC-block, end fade, peak-normalise.
* `_o({f, parts, bw})` — **PADsynth**-style pads: build a magnitude spectrum of Gaussian-widened
  harmonics (bandwidth in cents), randomise phases (low band kept mono), inverse **FFT** (own radix-2,
  generator-yielding) → perfectly loopable stereo tables at 32 kHz. Families: strings, low, warm, choir
  and "oo" (formant-shaped), glass, organ, solo, air, iron, hum, sine.
* `qf(fn)` — coloured noise tables (pink, brown, room, hiss) the same way.
* **Karplus–Strong** pluck (`nA`), marimba (inharmonic 1 : 3.93 : 9.24 modes), glass, sine "dot",
  formant vowel grains (`I3`) for the crowd murmur, reversible versions (`rpluck`…).
* Synthetic **reverb impulse responses** (`N3`): decaying filtered noise with pre-delay and early reflections → `ConvolverNode` "hall" (4.6 s) and "room" (.55 s).

All pitches use a base `Gt(n) = 36.708·n` Hz (a harmonic series on D1), so every scene is consonant
with every other; chime-like hits are snapped to a just-intonation scale (`B3`).

## The bank

`D3(recipes)` sorts recipes by priority (hits first, then pads, instruments, IRs), and a scheduler
runs generators for ≤3 ms every 16 ms (`setTimeout` loop) so synthesis never blocks frames. `need(name)`
bumps a recipe to the front; `play` falls back to any available variant until the requested one is ready.

## Engine graph

`sum → DynamicsCompressor(−15 dB, 5:1) → makeup .557 → tanh-style WaveShaper soft clip → master → out`.
Three buses (`bed`, `hit`, `tr`) feed `sum`. `group(bus, {gain, mid, wet, room})` creates dry/mid/wet sends
into the hall/room convolvers — used by every bed and transition so each has its own reverb balance.
`pad(name, freq, {g, atk, lp, hp, pan, drift, loopAt})` is a looping buffer with a filter chain and slow
gain "breathing" (two incommensurate sines). `note(instr, f, t)` picks the nearest pre-rendered pitch and
re-pitches by playback rate.

## Beds = per-scene scores

Each scene id maps to a `qi` subclass with `init()`, `onBeat(beat, forward, jumped)`, `step(now, horizon,
sinceBeat)` (a **look-ahead scheduler**: queue events up to `now+0.28 s`), and optional `hit/param`.
On scene change the previous bed fades according to the transition (cut at the slam's impact, fade over
the portal, etc.). Examples:

* `office`: room tone + mains hum; each `select` hit adds a plucked figure that grows denser.
* `tower`: two Shepard-style ascending string voices (rate rises per beat), wind.
* `calendar`: tick-tock whose period *lengthens* by 1.62^dilation while sub-ticks multiply.
* `futures`: two groups — left world (sine "dots", clean) and right world (warm pads, birdsong
  `_chirp`, wind, leaves) — equal-power crossfaded by `param("mix")`, i.e. the divider position.
* `questions`: room + hum, then a high glass tone sneaks in after the typing stops.

Continuous **params** (`wind`, `water`, `hum`, `tension`, `speed`) spawn short-lived noise layers that
follow scene values (e.g. camera speed on the recap ride).

## Transition sound design

`V3(engine, {name, dur, reverse})` schedules, against the transition's own normalised time, filtered
noise sweeps with breakpoint curves, pitched pad swells with glides, and hits at exact fractions:
`slam` = rising noise + string pair → impact (`slam` + `boom`) at p=.285 → paper debris;
`tear` = granular `rip` noise with a breakpoint envelope → `snap` at the moment of separation → paper bits;
`daybreak` = nine-voice chord opening its low-pass from 250 Hz to 7.5 kHz + shimmer + boom.

## Practical notes

* Audio starts only after a user gesture (`unlock()` on first key/pointer).
* `quiet` flag silences everything during warm-up renders.
* Rate limiting: identical hits closer than `gap` (18 ms default) and >26 hits / 120 ms are dropped.
