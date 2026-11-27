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
    deck = await createDeck({ canvas: document.getElementById("stage"), scenes, transitions, headless });
  } catch (e) {
    console.error(e);
    ui.innerHTML = "<div class='help'>This page needs WebGL 2, which this browser did not provide.</div>";
    return;
  }
  window.__deck = deck; window.__createAudio = createAudio;
  const m = /^#([a-z0-9]+)(?:-(\d+))?$/.exec(location.hash || "");
  await deck.start(m ? m[1] : scenes[0].id, m && m[2] ? +m[2] - 1 : 0);
  document.getElementById("load")?.remove();
  if (!headless) {
    attachPresenter(deck);
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chip = document.getElementById("auto");
    const show = () => { chip.textContent = deck.auto ? "Auto-play: on · A" : "Auto-play: off · A"; chip.setAttribute("aria-pressed", deck.auto); };
    deck.setAuto(!calm); show();
    // ---- sound: starts on the first click or key; M toggles it ----
    const audio = createAudio(), snd = document.getElementById("snd");
    const label = () => { snd.textContent = !audio.ready ? "Sound: off · click" : audio.muted ? "Sound: off · M" : "Sound: on · M"; snd.setAttribute("aria-pressed", audio.ready && !audio.muted); };
    let last = { id: null, beat: -1 };
    const start = () => { if (audio.ready) return; audio.unlock(); const i = deck.info(); audio.scene(i.id); last = { id: i.id, beat: i.beat }; label(); };
    addEventListener("pointerdown", start, { capture: true }); addEventListener("keydown", (e) => { if (e.key === "m" || e.key === "M") { if (!audio.ready) start(); else audio.mute(); label(); } else start(); }, { capture: true });
    deck.on("trans", (t) => { if (!audio.ready) return; audio.transition(t.name, t.dur, t.reverse); audio.scene(t.to); audio.beat(t.to, t.beat); last = { id: t.to, beat: t.beat }; });
    deck.on("move", () => { if (!audio.ready) return; const i = deck.info(); if (i.id === last.id && i.beat > last.beat) audio.beat(i.id, i.beat); last = { id: i.id, beat: i.beat }; });
    setInterval(() => audio.param("mix", deck.ctx.params.mix ?? 0.5), 60);
    label();
    addEventListener("keydown", (e) => { if (e.key === "a" || e.key === "A") setTimeout(show, 0); });
    setTimeout(() => document.getElementById("hint")?.classList.add("gone"), 9000);
    document.getElementById("stage").focus();
  }
  window.ready = true;
})();
