# 11 — Sound design guide (with a working engine)

The original's sound is a big part of why it feels cinematic, and it is **100% synthesised** — no samples.
`starter/src/audio/` rebuilds that approach in ~450 lines:

```
audio/dsp.js      primitives: modal resonator, swept oscillator, SVF-filtered noise, crackle, PADsynth (FFT), reverb IR
audio/sounds.js   recipes: tick, select, slam, boom, snap, paper, shimmer, bell, sub, whoosh, rip; pads; coloured noise
audio/engine.js   WebAudio graph, beds per scene, transition cues, live front end + offline renderer (for video)
```

Listen to `starter/videos/*.mp4` (or the `.wav` next to them) to hear the results.

## 1. The rules that make it sound expensive

1. **One tuning for the whole talk.** Every pitch is a multiple of `H(1) = 36.708 Hz` (D1): `H(n) = 36.708·n`.
   Pads, chimes, shimmer partials and chords are all harmonics of the same root, so any sound can overlap any
   other without clashing. This is the single most important trick.
2. **Three layers, never more:** a quiet **bed** per scene (drones/pads), **cues** for transitions (the loud,
   designed moments), and small **hits** for UI-like events (select, type, tick).
3. **The bed sits 15–20 dB below the cue peaks.** In the first starter render the bed was too loud and the slam
   only rose 9 dB; after lowering the beds it rises ~20 dB and actually hits. Measure it (see §6).
4. **Sound follows the picture's own curves.** Cues are written on the transition's 0..1 timeline; the hero hit
   lands on the hero frame (slam at p = 0.285, snap at p = 0.56). Continuous visuals drive continuous sound
   (in the original, the "Two aims" divider crossfades two different soundscapes).
5. **Every sound goes through the same master**: bus → compressor (−15 dB, 5:1, fast) → makeup → gentle
   `tanh`-style soft clipper. It glues everything and stops peaks from distorting.
6. **Reverb is shared, sends are per group.** One long hall (4.6 s) and one small room (0.55 s), synthesised
   impulses in `ConvolverNode`s; each bed/cue has its own wet/dry balance.
7. **Seeded randomness.** Cue variation (paper debris timing, pans) comes from a seeded RNG, so a rehearsal,
   the live talk and the video render all sound the same.

## 2. The primitives (what each is for)

| Primitive | Use it for | Code |
|---|---|---|
| **Modal resonator** — decaying sine via phasor rotation | anything struck: ticks, plates, bells, the body of a slam | `mode(buf, freq, amp, decay, {at, atk})` |
| **Swept oscillator** — any f(u), a(u) | sub drops, booms, risers, laser-ish sweeps | `sweep(buf, at, dur, f, a)` |
| **SVF-filtered noise** — cutoff follows a curve | air, wind, whooshes, water, paper friction, the crack of an impact | `noise(buf, rng, at, dur, "lp"/"bp"/"hp", cutoff(u), Q, amp(u))` |
| **Crackle** — sparse impulses through 3 band-passes | paper, dust, debris, fire | `crackle(buf, rng, at, dur, count, distribution, amp)` |
| **PADsynth** — Gaussian-widened harmonics + random phase → inverse FFT | lush loopable pads: strings, warm, low, organ, choir, glass, air | `padsynth({f, parts:[[mult, amp, bwCents]], bw})` |
| **Coloured noise tables** | pink/brown beds, rumbles, wind (loops seamlessly) | `NOISES.pink/brown` |
| **Synthetic IR** — decaying, darkening noise + early reflections | the reverbs | `impulse(seconds, {pre, damp, bright, early})` |
| **finish / saturate** | DC-block, fade tail, normalise; tanh drive for weight | |

Recipe pattern for a hit: 2–6 modes for the body + a 5–20 ms noise burst for the attack + optional sweep for
weight + optional filtered-noise tail. Example (the slam): falling sub sweep 108→38 Hz, plate modes at
98/161/247/392 Hz, a 160 ms low-passed noise crack, a 2.3 s dark rumble, 130 crackles of debris, tanh drive 1.3.

## 3. Transition cues (timelines)

All times are fractions of the transition duration `d`. `swell` = a pitched pad voice with gain, low-pass and
glide curves; `band` = a filtered noise voice with gain/frequency curves.

**SLAM (2.6 s)**
| u | Event |
|---|---|
| 0 → .285 | pink noise band-pass rising 250 → 2100 Hz, gain 0 → .5; two strings a semitone-ish apart (`H(3)` and `H(3)·1.06`) swelling with low-pass 300 → 2200 Hz — pressure building |
| **.285** | `slam` (1.35) + `boom` (0.9) + a pitched-down second slam (rate .62) 20 ms later — impact |
| .285 → 1.3 | brown-noise rumble, low-pass 900 → 90 Hz |
| .35 → .9 | 12 paper hits, decreasing, random pans — debris settling |

**TEAR (2.8 s)**
| u | Event |
|---|---|
| .03 → .56 | the `rip` table (bursty crackle through 900/2100/4300 Hz bands) through a band-pass rising 1400 → 2900 Hz; its gain is a **stuttering breakpoint envelope** (12 random steps, growing) and its playback rate wanders .7 → 1.2 — the rip accelerates; a low-passed copy underneath for body |
| .06 → .5 | 6 paper rustles |
| **.56** | `snap` — the halves separate |
| .36 → 1 | pink noise whoosh panning left → right as the halves fly off |
| .6 → 1 | 9 paper hits alternating left/right |

**DAYBREAK (3.4 s)**
| u | Event |
|---|---|
| 0 → 1.6 | pink noise low-pass 200 → 4200 → 600 Hz |
| staggered | 9 chord voices (`low H2, warm H4/H6/H9, strings H8/H10/H12/H16, air H24`) fade in one by one, their low-pass opening 250 → 7500 Hz at u = .6 — "the light comes up" |
| .3 | `sub` swell |
| .46, .66 | `shimmer` (46 random high harmonics) ×2 |
| .5 | `boom` (soft) |

**LINE (2.4 s)**
| u | Event |
|---|---|
| 0 → .8 | organ + strings chord at `H4/H6/H9/H8`, low-pass closing 5200 → 120 Hz while the pitch sags to ×.92 — the picture collapsing |
| .05 | `sub` |
| .25 → 1.5 | a pure sine at `H12` rising in — the singing thread |
| .82 | `tick` — the string snaps into the next picture |

**Reverse** (going back, any transition): a pink-noise band falling 1800 → 320 Hz with a gliding air pad.

## 4. Beds (per-scene scores)

Each scene gets 3–4 pad voices with a gain per beat (`BEDS` in `engine.js`). On a scene change, the old bed
fades out over ~90% of the transition while the new one fades in. The original goes further — each scene is a
small generative score with a look-ahead scheduler (≈280 ms): Shepard-tone strings that keep rising (tower), a
clock whose tick period lengthens exponentially (calendar), a marimba pattern phasing between voices (loop),
crowd murmur from formant vowel grains (swarm), birdsong + wind vs clean sine dots crossfaded by the divider
(futures). Start with static beds; upgrade one hero scene to a generative score.

## 5. Live vs video

* **Live:** browsers start audio only after a user gesture — `audio.unlock()` on the first key/click. Synthesise
  everything at load (`preloadAll()`), never mid-talk. The original time-slices synthesis in 3 ms chunks with
  generator functions to keep the loading bar smooth; do that if load time grows past ~1 s.
* **Video:** the deck logs every sound event with its own clock (`audio.recording = true` in headless mode).
  `tools/video.py` steps the deck frame by frame, then calls `renderOffline(log, seconds)` — the same engine on an
  `OfflineAudioContext` — and muxes the WAV with the frames, loudness-normalised to −16 LUFS, −1.5 dBTP.
  Picture and sound are sample-accurate and identical on every render.

## 6. Checking sound without ears (for agents)

Agents can't listen, but they can measure:
```
ffmpeg -i clip.wav -lavfi "showspectrumpic=s=1200x400:legend=1:scale=log:fscale=log" spec.png   # look at it
python3: RMS per 100 ms in dB  → impacts should jump 15–20 dB over the bed; nothing should sit above −1 dBFS
```
In a spectrogram: a hit is a bright vertical line; a sweep is a diagonal; a bed is horizontal bands; mud is a
solid yellow block below 200 Hz (lower the low pads). Then a human listens once on headphones and once on
speakers, and adjusts levels by ear.

## 7. Recipe ideas for your own cues

| Visual | Sound |
|---|---|
| something lands / closes | sub sweep + 3 low modes + short low-passed noise crack + rumble tail |
| something opens / reveals | chord whose low-pass opens; shimmer of high harmonics at the peak |
| fast movement | band-passed noise rising then falling (whoosh), stereo-offset by 15 ms |
| paper / material | crackle + band-passed noise; vary band per "material" (paper 2–4 kHz, cloth 600 Hz–1.5 kHz) |
| digital / UI | 2–3 bright modes (tick), chime on two harmonics (select), detuned slightly between ears |
| tension | two pads a near-semitone apart, slowly swelling; a riser (sweep up the harmonics) |
| release | resolve to a consonant chord of the series + long hall reverb |
