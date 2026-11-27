import { createDeck } from "./deck.js";
import { attachPresenter } from "./presenter.js";
import { createAudio, renderOffline, preloadAll } from "./audio2/engine.js";
import fade from "./transitions/fade.js";
import iris from "./transitions/iris.js";
import burn from "./transitions/burn.js";
import tear from "./transitions/tear.js";
import daybreak from "./transitions/daybreak.js";
import credits from "./scenes/credits.js";
import cover from "./scenes/cover.js";
import folder from "./scenes/folder.js";
import history from "./scenes/history.js";
import policy from "./scenes/policy.js";
import end from "./scenes/end.js";
import line from "./transitions/line.js";
import slam from "./transitions/slam.js";

const scenes = [cover, folder, history, policy, end, credits];
const transitions = { fade, iris, burn, tear, daybreak, line, slam };

(async () => {
  const qs = new URLSearchParams(location.search), headless = qs.has("headless");
  const ui = document.getElementById("ui");
  // Canvas text is laid out once, so the web fonts must be ready first (with a time limit, then system fonts).
  try { await Promise.race([Promise.all(["600 96px 'Space Grotesk'", "400 40px Inter", "500 30px 'JetBrains Mono'", "italic 400 120px Newsreader"].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]); } catch {}
  const audio = createAudio();
  let deck;
  try {
    const sz = /^(\d{3,4})x(\d{3,4})$/.exec(qs.get("size") || "");
    deck = await createDeck({ canvas: document.getElementById("stage"), scenes, transitions, headless, audio, size: sz ? [+sz[1], +sz[2]] : null });
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
  window.__renderFilmAudio = async (_log, dur) => renderOffline(deck.test.soundLog(), dur);   // same synthesis as live, from the logged events
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
    // ---- sound: starts on the first click or key (browsers require a gesture); M toggles it ----
    const snd = document.getElementById("snd");
    const label = () => { snd.textContent = !audio.ready ? "Sound: off · click" : audio.muted ? "Sound: off · M" : "Sound: on · M"; };
    const start = () => { if (audio.ready) return; audio.unlock(); const i = deck.info(); audio.event("scene", { id: i.id, beat: i.beat, fade: 1.5 }, 0); label(); };
    addEventListener("pointerdown", start, { capture: true });
    addEventListener("keydown", (e) => { if (e.key === "m" || e.key === "M") { if (!audio.ready) start(); else audio.mute(); label(); } else start(); }, { capture: true });
    // ---- recorder: R starts and stops; the file holds the canvas and the sound, no page chrome ----
    const recChip = document.getElementById("rec"); let rec = null, chunks = [], t0 = 0, tick = null;
    const toggleRec = async () => {
      if (rec) { rec.stop(); return; }
      await deck.restart(); deck.setAuto(true); show();                       // a recording always starts at the first frame
      if (!window.MediaRecorder) { recChip.hidden = false; recChip.textContent = "Recording is not supported in this browser"; return; }
      const tracks = [...document.getElementById("stage").captureStream(60).getVideoTracks()], as = audio.stream();
      if (as) tracks.push(...as.getAudioTracks());
      const type = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
      rec = new MediaRecorder(new MediaStream(tracks), { mimeType: type, videoBitsPerSecond: 16e6, audioBitsPerSecond: 192e3 }); chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType }), a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = (document.title || "deck").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + (rec.mimeType.includes("mp4") ? ".mp4" : ".webm");
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
