import { createDeck } from "./deck.js";
import { attachPresenter } from "./presenter.js";
import { createAudio } from "./audio.js";
import fade from "./transitions/fade.js";
import iris from "./transitions/iris.js";
import burn from "./transitions/burn.js";
import tear from "./transitions/tear.js";
import daybreak from "./transitions/daybreak.js";
import plain from "./scenes/plain.js";
import own from "./scenes/own.js";
import field from "./scenes/field.js";
import move from "./scenes/move.js";
import split from "./scenes/split.js";
import recap from "./scenes/recap.js";
import credits from "./scenes/credits.js";

const scenes = [plain, own, split, field, recap, move, credits];
const transitions = { fade, iris, burn, tear, daybreak };

(async () => {
  const qs = new URLSearchParams(location.search), headless = qs.has("headless");
  const ui = document.getElementById("ui");
  // Canvas text is laid out once, so the web fonts must be ready first (with a time limit, then system fonts).
  try { await Promise.race([Promise.all(["600 96px 'Space Grotesk'", "400 40px Inter", "500 30px 'JetBrains Mono'", "italic 400 120px Newsreader"].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]); } catch {}
  let deck;
  try {
    const sz = /^(\d{3,4})x(\d{3,4})$/.exec(qs.get("size") || "");
    deck = await createDeck({ canvas: document.getElementById("stage"), scenes, transitions, headless, size: sz ? [+sz[1], +sz[2]] : null });
  } catch (e) {
    console.error(e);
    ui.innerHTML = "<div class='help'>This page needs WebGL 2, which this browser did not provide.</div>";
    return;
  }
  window.__deck = deck; window.__createAudio = createAudio;
  if (qs.has("film")) document.body.classList.add("film");
  // Scenes lay themselves out once, for landscape or portrait; turning the screen past square reloads at the same scene.
  if (!headless && !qs.get("size")) { const tall = innerHeight > innerWidth; addEventListener("resize", () => { if ((innerHeight > innerWidth) !== tall) location.reload(); }); }
  // Offline sound for a filmed run: replays the film log against an OfflineAudioContext, returns a 16-bit WAV (base64).
  window.__renderFilmAudio = async (log, dur) => {
    const SR = 48000, Q = 128 / SR, off = new OfflineAudioContext(2, Math.ceil(SR * dur), SR), a = createAudio(); a.unlock(off);
    const evs = log.filter((e) => e.kind !== "mix"), mixes = log.filter((e) => e.kind === "mix");
    let ei = 0, mi = 0, last = { id: null, beat: -1 };
    const apply = (e) => {
      if (e.kind === "trans") { a.transition(e.name, e.dur, e.reverse); a.scene(e.to); a.beat(e.to, e.beat); last = { id: e.to, beat: e.beat }; }
      else if (e.kind === "move") { if (last.id === null) { a.scene(e.id); a.beat(e.id, e.beat); } else if (e.id === last.id && e.beat > last.beat) a.beat(e.id, e.beat); last = { id: e.id, beat: e.beat }; }
    };
    const times = []; for (let t = Q; t < dur; t += 0.025) times.push(Math.round(t / Q) * Q);
    const uniq = [...new Set(times)];
    uniq.forEach((qt, k) => off.suspend(qt).then(() => {
      const until = k + 1 < uniq.length ? uniq[k + 1] : dur + 1;
      while (ei < evs.length && evs[ei].t < until) apply(evs[ei++]);
      while (mi < mixes.length && mixes[mi].t < until) a.param("mix", mixes[mi++].v);
      a.pump(); off.resume();
    }));
    const buf = await off.startRendering(), n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1);
    const out = new DataView(new ArrayBuffer(44 + n * 4)), w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); out.setUint32(4, 36 + n * 4, true); w(8, "WAVEfmt "); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
    out.setUint32(24, SR, true); out.setUint32(28, SR * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); w(36, "data"); out.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
    const bytes = new Uint8Array(out.buffer); let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const m = /^#([a-z0-9]+)(?:-(\d+))?$/.exec(location.hash || "");
  await deck.start(m ? m[1] : scenes[0].id, m && m[2] ? +m[2] - 1 : 0);
  document.getElementById("load")?.remove();
  if (!headless) {
    attachPresenter(deck);
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chip = document.getElementById("auto");
    const show = () => { chip.textContent = deck.auto ? "Auto-play: on · A" : "Auto-play: off · A"; };
    deck.setAuto(!calm); show();
    // ---- sound: starts on the first click or key; M toggles it ----
    const audio = createAudio(), snd = document.getElementById("snd");
    const label = () => { snd.textContent = !audio.ready ? "Sound: off · click" : audio.muted ? "Sound: off · M" : "Sound: on · M"; };
    let last = { id: null, beat: -1 };
    const start = () => { if (audio.ready) return; audio.unlock(); const i = deck.info(); audio.scene(i.id); last = { id: i.id, beat: i.beat }; label(); };
    addEventListener("pointerdown", start, { capture: true }); addEventListener("keydown", (e) => { if (e.key === "m" || e.key === "M") { if (!audio.ready) start(); else audio.mute(); label(); } else start(); }, { capture: true });
    deck.on("trans", (t) => { if (!audio.ready) return; audio.transition(t.name, t.dur, t.reverse); audio.scene(t.to); audio.beat(t.to, t.beat); last = { id: t.to, beat: t.beat }; });
    deck.on("move", () => { if (!audio.ready) return; const i = deck.info(); if (i.id === last.id && i.beat > last.beat) audio.beat(i.id, i.beat); last = { id: i.id, beat: i.beat }; });
    setInterval(() => audio.param("mix", deck.ctx.params.mix ?? 0.5), 60);
    // ---- recorder: R starts and stops; the file holds the canvas and the sound, no page chrome ----
    const recChip = document.getElementById("rec"); let rec = null, chunks = [], t0 = 0, tick = null;
    const toggleRec = async () => {
      if (rec) { rec.stop(); return; }
      await deck.restart(); deck.setAuto(true); show();                       // a recording always starts at the first frame
      if (audio.ready) { const i = deck.info(); audio.scene(i.id); last = { id: i.id, beat: 0 }; }       // the first scene's sound starts again too
      if (!window.MediaRecorder) { recChip.hidden = false; recChip.textContent = "Recording is not supported in this browser"; return; }
      const tracks = [...document.getElementById("stage").captureStream(60).getVideoTracks()], as = audio.stream();
      if (as) tracks.push(...as.getAudioTracks());
      const type = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
      rec = new MediaRecorder(new MediaStream(tracks), { mimeType: type, videoBitsPerSecond: 16e6, audioBitsPerSecond: 192e3 }); chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType }), a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "sovereign-story-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + (rec.mimeType.includes("mp4") ? ".mp4" : ".webm");
        document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
        rec = null; clearInterval(tick); recChip.textContent = "Saved to your downloads"; setTimeout(() => { if (!rec) recChip.hidden = true; }, 4000);
      };
      rec.start(1000); t0 = performance.now(); recChip.hidden = false;
      deck.onEnd = () => { if (!rec) return false; setTimeout(() => rec && rec.stop(), 900); return true; };   // and ends after the last frame
      const upd = () => { const s = Math.floor((performance.now() - t0) / 1000); recChip.textContent = `Recording ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} · R to stop`; };
      upd(); tick = setInterval(upd, 500);
    };
    addEventListener("keydown", (e) => { if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey) { start(); toggleRec(); } });
    label();
    addEventListener("keydown", (e) => { if (e.key === "a" || e.key === "A") setTimeout(show, 0); });
    setTimeout(() => document.getElementById("hint")?.classList.add("gone"), 9000);
    document.getElementById("stage").focus();
  }
  window.ready = true;
})();
