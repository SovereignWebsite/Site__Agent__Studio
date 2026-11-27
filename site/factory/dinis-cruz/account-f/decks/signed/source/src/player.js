// The player around a deck: it opens paused on the first frame with two buttons, Play and Play and record (one click
// starts the sound too, since browsers need a click first), then a small bar: Pause or Play, Restart, Record, Sound,
// Full screen. A recording always runs from the first frame on auto-play, stops by itself at the end and saves a
// video file (canvas and sound only, never these controls). Keys still work: space or arrows, F, A, M, R.
//   attachPlayer({ deck, audio, startSound, restartSound, name })
export function attachPlayer({ deck, audio, startSound, restartSound, name = "deck" }) {
  const qs = new URLSearchParams(location.search), stage = document.getElementById("stage");
  const el = (tag, attrs = {}, text = "") => { const e = Object.assign(document.createElement(tag), attrs); if (text) e.textContent = text; return e; };
  const ui = el("div", { className: "player-ui" });
  const startCard = el("div", { className: "startp", role: "dialog", ariaLabel: "Start the deck" });
  const bPlay = el("button", { type: "button", className: "big" }, "▶ Play"), bRec = el("button", { type: "button", className: "big alt" }, "● Play and record");
  const note = el("p", { className: "note" }, "Sound on. A recording starts at the first frame and saves a video file to your downloads when the deck ends.");
  const msg = el("p", { className: "msg", ariaLive: "polite" });
  startCard.append(msg, bPlay, bRec, note);
  const bar = el("nav", { className: "pbar", ariaLabel: "Player controls" });
  const cPlay = el("button", { type: "button" }, "Pause"), cRestart = el("button", { type: "button" }, "Restart"), cRec = el("button", { type: "button", className: "rec" }, "● Record");
  const cSnd = el("button", { type: "button" }, "Sound: on"), cFs = el("button", { type: "button" }, "Full screen"), status = el("span", { className: "pstatus", ariaLive: "polite" });
  bar.append(cPlay, cRestart, cRec, cSnd, cFs, status); bar.hidden = true;
  ui.append(startCard, bar); document.body.append(ui);

  let rec = null, chunks = [], t0 = 0, tick = null, started = false;
  const labels = () => {
    cPlay.textContent = deck.paused ? "▶ Play" : "❚❚ Pause"; cPlay.disabled = !!rec;
    cSnd.textContent = audio.muted ? "Sound: off" : "Sound: on";
    cRec.textContent = rec ? "■ Stop recording" : "● Record";
  };
  const sound = () => { startSound(); if (audio.muted) audio.mute(false); audio.pause(false); };
  const begin = async (record) => {
    sound(); startCard.hidden = true; bar.hidden = false; started = true;
    await deck.restart(); restartSound && restartSound(); deck.setAuto(true); deck.pause(false);
    if (record) startRec(); labels(); stage.focus();
  };
  const startRec = () => {
    if (!window.MediaRecorder) { status.textContent = "This browser cannot record."; return; }
    const tracks = [...stage.captureStream(60).getVideoTracks()], as = audio.stream && audio.stream(); if (as) tracks.push(...as.getAudioTracks());
    const type = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
    rec = new MediaRecorder(new MediaStream(tracks), { mimeType: type, videoBitsPerSecond: 16e6, audioBitsPerSecond: 192e3 }); chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType }), a = el("a");
      a.href = URL.createObjectURL(blob); a.download = `${name}-${stage.width}x${stage.height}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}${rec.mimeType.includes("mp4") ? ".mp4" : ".webm"}`;
      document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
      rec = null; clearInterval(tick); status.textContent = ""; deck.setAuto(false); deck.pause(true);
      msg.textContent = `Saved to your downloads: ${a.download}`; startCard.hidden = false; bar.hidden = true; labels();
    };
    rec.start(1000); t0 = performance.now();
    const upd = () => { const s = Math.floor((performance.now() - t0) / 1000); status.textContent = `Recording ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
    upd(); tick = setInterval(upd, 500);
  };
  deck.onEnd = () => { if (!rec) return false; setTimeout(() => rec && rec.stop(), 900); return true; };   // a recording ends after the last frame
  bPlay.addEventListener("click", () => begin(false)); bRec.addEventListener("click", () => begin(true));
  cPlay.addEventListener("click", () => { if (rec) return; const p = deck.pause(); audio.pause(p); labels(); });
  cRestart.addEventListener("click", async () => { if (rec) { rec.onstop = null; rec.stop(); rec = null; clearInterval(tick); status.textContent = ""; } await deck.restart(); restartSound && restartSound(); deck.setAuto(true); deck.pause(false); audio.pause(false); labels(); });
  cRec.addEventListener("click", async () => { if (rec) { rec.stop(); return; } await begin(true); });
  cSnd.addEventListener("click", () => { audio.mute(); labels(); });
  cFs.addEventListener("click", () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); });
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!started && (e.key === " " || e.key === "Enter")) { e.preventDefault(); e.stopImmediatePropagation(); begin(false); return; }
    if (e.key === "r" || e.key === "R") { e.preventDefault(); e.stopImmediatePropagation(); rec ? rec.stop() : begin(true); }
    if (e.key === "m" || e.key === "M") setTimeout(labels, 0);
  }, { capture: true });
  // open paused on the first frame; ?autoplay=1 tries to start at once (sound may still need a click)
  deck.setAuto(false); deck.pause(true); labels();
  if (qs.has("autoplay")) begin(false).then(() => { if (!audio.running) status.textContent = "Click once for sound"; });
  return { begin };
}
