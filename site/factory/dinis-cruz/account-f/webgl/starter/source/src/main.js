import { createDeck } from "./deck.js";
import { attachPresenter } from "./presenter.js";
import { createAudio, preloadAll, renderOffline } from "./audio/engine.js";
import fade from "./transitions/fade.js";
import iris from "./transitions/iris.js";
import line from "./transitions/line.js";
import daybreak from "./transitions/daybreak.js";
import slam from "./transitions/slam.js";
import tear from "./transitions/tear.js";
import title, { makeTitle } from "./scenes/title.js";
import plain from "./scenes/plain.js";
import field from "./scenes/field.js";

const end = makeTitle({ id: "end", title: "End", enterWith: "tear", headline: "Now make yours.", subline: "Torn, pressed, focused or strung: every cut is a shader." });
const scenes = [title, field, plain, end];
const transitions = { fade, iris, line, daybreak, slam, tear };

(async () => {
  const qs = new URLSearchParams(location.search), headless = qs.has("headless");
  let deck;
  try {
    const audio = createAudio();
    audio.recording = headless;          // headless: log sound events so tools/video.py can render them offline
    preloadAll();                        // synthesise every sound now (a second or two), never mid-talk
    window.__renderAudio = renderOffline;
    deck = await createDeck({ canvas: document.getElementById("stage"), scenes, transitions, headless, audio });
  } catch (e) {
    console.error(e);
    document.getElementById("ui").innerHTML = "<div class='help'>This presentation needs WebGL 2.</div>";
    return;
  }
  window.__deck = deck;
  const m = /^#([a-z0-9]+)(?:-(\d+))?$/.exec(location.hash || "");
  await deck.start(m ? m[1] : scenes[0].id, m && m[2] ? +m[2] - 1 : 0);
  if (!headless) attachPresenter(deck);
  window.ready = true;
})();
