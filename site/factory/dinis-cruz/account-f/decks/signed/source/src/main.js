import { createDeck } from "./deck.js";
import { attachPresenter } from "./presenter.js";
import { attachPlayer } from "./player.js";
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
  // The score: music made with ElevenLabs from this deck's music brief (take A, 98 s). ?music=code plays the sound made in code instead.
  const audio = createAudio({ scoreUrl: qs.get("music") === "code" ? null : "music/signed-score.m4a" });
  let deck;
  try {
    const sz = /^(\d{3,4})x(\d{3,4})$/.exec(qs.get("size") || "");
    deck = await createDeck({ canvas: document.getElementById("stage"), scenes, transitions, headless, audio, size: sz ? [+sz[1], +sz[2]] : null });
  } catch (e) {
    console.error(e);
    ui.innerHTML = "<div class='help'>This page needs WebGL 2, which this browser did not provide.</div>";
    return;
  }
  window.__deck = deck; window.__audio = audio; window.__createAudio = createAudio;
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
    const startSound = () => { if (audio.ready) return; audio.unlock(); const i = deck.info(); audio.event("scene", { id: i.id, beat: i.beat, fade: 1.5 }, 0); };
    const extras = audio.hasScore ? [[() => (audio.scoreOn ? "Music: score" : "Music: made in code"), () => audio.setScore(!audio.scoreOn, deck.info().id)]] : [];
    attachPlayer({ deck, audio, startSound, extras, name: (document.title || "deck").toLowerCase().replace(/[^a-z0-9]+/g, "-") });
    addEventListener("pointerdown", startSound, { capture: true });
    document.getElementById("stage").focus();
  }
  window.ready = true;
})();
