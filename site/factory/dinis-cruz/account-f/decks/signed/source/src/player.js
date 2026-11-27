// The player around a deck. It opens paused on the first frame with two choices:
//   ▶ Play                  watch it, with sound; at the end the sound fades out and the deck stops
//   ● Record a video        a guided recorder, one step at a time:
//        1 Shape   vertical 1080×1920 or landscape 1920×1080 (a fixed size, so every recording is the same)
//        2 Record  from the first frame to the last; it stops by itself after the sound has faded
//        3 Check   watch the recording here; keep it or record again
//        4 Send    send it to the studio with SG/Send (encrypted in this browser), or save it to this computer
// Only the deck's own drawing surface and its sound are recorded: never the rest of the screen, other tabs,
// the mouse pointer or these controls. Keys still work: space or arrows, F, M, R (record).
//   attachPlayer({ deck, audio, startSound, restartSound, name, extras })
import { sendFile, SERVICES } from "./sgsend.js";

const CSS = `
.startp,.recp{position:fixed;left:50%;bottom:max(9vh,70px);transform:translateX(-50%);display:grid;gap:12px;justify-items:center;padding:24px 28px;width:min(92vw,32rem);box-sizing:border-box;
  background:rgba(4,6,10,.8);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.14);border-radius:14px;text-align:center;color:#eef1ee;font:15px/1.45 Inter,system-ui,sans-serif}
.recp{bottom:auto;top:50%;transform:translate(-50%,-50%);max-height:calc(100vh - 32px);overflow:auto}
.startp[hidden],.recp[hidden],.pbar[hidden]{display:none}
.player-ui .big{font:600 17px/1 Inter,system-ui,sans-serif;padding:14px 26px;border-radius:999px;border:0;cursor:pointer;min-width:15rem;background:#ffd9c4;color:#1b120c}
.player-ui .big.alt{background:transparent;color:#ffd9c4;border:1.5px solid #ffd9c4}
.player-ui .big:disabled{opacity:.5;cursor:default}
.player-ui .link{background:none;border:0;color:#c9d3ce;text-decoration:underline;font:14px Inter,system-ui,sans-serif;cursor:pointer;padding:6px}
.player-ui p{margin:0}.player-ui .note{color:#c9d3ce;font-size:14px}.player-ui .msg{color:#ffd9c4}.player-ui .msg:empty,.player-ui .err:empty{display:none}
.player-ui .err{color:#ffb4a8}
.recp .step{font:500 13px/1 'JetBrains Mono',ui-monospace,monospace;color:#ffd9c4;letter-spacing:.06em}
.recp h2{margin:0;font:600 24px/1.2 'Space Grotesk',Inter,system-ui,sans-serif}
.recp .dots{display:flex;gap:6px}.recp .dots i{width:28px;height:4px;border-radius:2px;background:rgba(255,255,255,.18)}.recp .dots i.on{background:#ffd9c4}
.recp .choices{display:grid;gap:10px;width:100%}
.recp .choice{display:grid;gap:2px;text-align:left;padding:14px 16px;border-radius:12px;border:1.5px solid rgba(255,255,255,.2);background:transparent;color:#eef1ee;cursor:pointer;font:inherit}
.recp .choice b{font-weight:600;color:#fff}.recp .choice span{color:#c9d3ce;font-size:14px}.recp .choice:hover{border-color:#ffd9c4}
.recp video{width:100%;max-height:46vh;border-radius:8px;background:#000}
.recp label{display:grid;gap:4px;text-align:left;width:100%;font-size:14px;color:#c9d3ce}
.recp input,.recp select{font:15px Inter,system-ui,sans-serif;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:#0b0f16;color:#eef1ee}
.recp .token{font:600 26px/1.2 'JetBrains Mono',ui-monospace,monospace;color:#fff;user-select:all;word-break:break-all}
.recp .bar{width:100%;height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}.recp .bar i{display:block;height:100%;width:0;background:#ffd9c4;transition:width .3s}
.recp .row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.recp details{width:100%;text-align:left;color:#c9d3ce;font-size:14px}.recp summary{cursor:pointer}
.pbar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;flex-wrap:wrap;justify-content:center;gap:6px;
  padding:6px;max-width:calc(100vw - 32px);background:rgba(4,6,10,.62);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-radius:999px;transition:opacity .6s}
body.idle .pbar{opacity:0}
.pbar button{font:500 13px/1 Inter,system-ui,sans-serif;color:#eef1ee;background:transparent;border:0;border-radius:999px;padding:9px 14px;cursor:pointer}
.pbar button:hover{background:rgba(255,255,255,.08)}.pbar button.rec{color:#ff9a8a}.pbar button:disabled{opacity:.4;cursor:default}
.pstatus{font:500 13px/1 'JetBrains Mono',ui-monospace,monospace;color:#ff9a8a;align-self:center;padding:0 10px}.pstatus:empty{display:none}
.player-ui button:focus-visible,.player-ui input:focus-visible,.player-ui select:focus-visible{outline:2px solid #ffd9c4;outline-offset:2px}
.film .player-ui{display:none}`;

const SHAPES = { v: [1080, 1920], h: [1920, 1080] };
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const fmtSize = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);

export function attachPlayer({ deck, audio, startSound, restartSound, name = "deck", extras = [] }) {
  const qs = new URLSearchParams(location.search), stage = document.getElementById("stage");
  const el = (tag, attrs = {}, ...kids) => { const e = Object.assign(document.createElement(tag), attrs); for (const k of kids) e.append(k); return e; };
  const btn = (text, cls = "big", attrs = {}) => el("button", { type: "button", className: cls, ...attrs }, text);
  document.head.append(el("style", {}, CSS));
  const ui = el("div", { className: "player-ui" });

  // ---- start card ----
  const startCard = el("div", { className: "startp", role: "dialog", ariaLabel: "Start the deck" });
  const msg = el("p", { className: "msg", ariaLive: "polite" });
  const bPlay = btn("▶ Play"), bRec = btn("● Record a video", "big alt");
  startCard.append(msg, bPlay, bRec, el("p", { className: "note" }, "Sound on. The recorder takes you through it one step at a time."));

  // ---- control bar while playing ----
  const bar = el("nav", { className: "pbar", ariaLabel: "Player controls" });
  const cPlay = btn("Pause", ""), cRestart = btn("Restart", ""), cRec = btn("● Record", "rec"), cSnd = btn("Sound: on", ""), cFs = btn("Full screen", "");
  const extraBtns = extras.map(([label, fn]) => { const b = btn(label(), ""); b.addEventListener("click", () => { fn(); b.textContent = label(); }); return [b, label]; });
  const status = el("span", { className: "pstatus", ariaLive: "polite" });
  bar.append(cPlay, cRestart, cRec, cSnd, ...extraBtns.map(([b]) => b), cFs, status); bar.hidden = true;

  // ---- the recorder's steps ----
  const panel = el("div", { className: "recp", role: "dialog", ariaLabel: "Record a video", ariaModal: "false" }); panel.hidden = true;
  ui.append(startCard, panel, bar); document.body.append(ui);

  let rec = null, chunks = [], t0 = 0, tick = null, started = false, take = null, stopping = false, playing = false;
  const sized = /^(\d+)x(\d+)$/.exec(qs.get("size") || ""), curShape = sized ? (+sized[1] < +sized[2] ? "v" : "h") : null;

  const labels = () => {
    cPlay.textContent = deck.paused ? "▶ Play" : "❚❚ Pause"; cPlay.disabled = !!rec; cRestart.disabled = !!rec;
    cSnd.textContent = audio.muted ? "Sound: off" : "Sound: on";
    cRec.textContent = rec ? "■ Stop recording" : "● Record";
    extraBtns.forEach(([b, l]) => { b.textContent = l(); b.disabled = !!rec; });
  };
  const sound = () => { startSound(); if (audio.muted) audio.mute(false); audio.pause(false); audio.fadeIn && audio.fadeIn(); };
  const run = async () => {
    sound(); if (audio.scoreReady) await Promise.race([audio.scoreReady, new Promise((r) => setTimeout(r, 4000))]);
    startCard.hidden = true; panel.hidden = true; bar.hidden = false; started = true; playing = true; stopping = false;
    await deck.restart(); restartSound && restartSound(); deck.setAuto(true); deck.pause(false); labels(); stage.focus();
  };
  const showStart = (text = "") => { msg.textContent = text; bPlay.textContent = started ? "▶ Play again" : "▶ Play"; startCard.hidden = false; panel.hidden = true; bar.hidden = true; bPlay.focus(); };

  // a step: header "Step n of 4", a title, then the body; Escape or Cancel goes back to the start card
  const step = (n, title, ...body) => {
    panel.replaceChildren(el("p", { className: "step" }, `STEP ${n} OF 4`), el("div", { className: "dots", ariaHidden: "true" }, ...[1, 2, 3, 4].map((i) => el("i", { className: i <= n ? "on" : "" }))),
      el("h2", {}, title), ...body);
    startCard.hidden = true; bar.hidden = true; panel.hidden = false;
    (panel.querySelector(".choice,.big,input") || panel).focus();
  };
  const cancel = (text = "Back to the start.") => btn("Cancel", "link", { onclick: () => { take = null; deck.pause(true); showStart(text); } });

  // 1 · shape
  const stepShape = () => {
    const choice = (k, title, sub) => {
      const b = el("button", { type: "button", className: "choice" }, el("b", {}, title), el("span", {}, sub));
      b.addEventListener("click", () => {
        if (curShape === k) return stepRecord();
        const u = new URL(location.href); u.searchParams.set("size", SHAPES[k].join("x")); u.searchParams.set("record", "1"); u.hash = ""; location.href = u.href;
      });
      return b;
    };
    step(1, "Choose the shape",
      el("div", { className: "choices" }, choice("v", "Vertical, 1080 × 1920", "Instagram Reels, YouTube Shorts, TikTok."), choice("h", "Landscape, 1920 × 1080", "YouTube, LinkedIn, presentations.")),
      el("p", { className: "note" }, "Only the deck is recorded: never the rest of your screen, other tabs, the pointer or these controls. The page reloads at the size you choose."),
      cancel());
  };
  // 2 · record
  const stepRecord = () => {
    const go = btn("● Start recording");
    go.addEventListener("click", async () => { await run(); startRec(); labels(); });
    step(2, "Record", el("p", {}, `The deck plays from the first frame at ${stage.width} × ${stage.height}, with sound, and stops by itself at the end, after the sound has faded.`),
      el("p", { className: "note" }, "Keep this tab in front while it records: browsers slow down tabs you cannot see. You can stop early with the Stop button or R."),
      go, cancel());
  };
  // 3 · check
  const stepCheck = () => {
    const v = el("video", { src: take.url, controls: true, playsInline: true, preload: "metadata" });
    const info = el("p", { className: "note" }, `${take.file}, ${fmtSize(take.blob.size)}, ${fmtTime(take.secs)}`);
    const keep = btn("Use this one"), again = btn("Record again", "big alt");
    keep.addEventListener("click", stepSend); again.addEventListener("click", () => { URL.revokeObjectURL(take.url); take = null; stepRecord(); });
    step(3, "Check it", v, info, keep, again, cancel());
  };
  // 4 · send (or save)
  const stepSend = () => {
    const service = el("select", { id: "sg-service" }, ...SERVICES.map((s) => el("option", { value: s }, s)));
    const access = el("input", { id: "sg-access", type: "password", autocomplete: "off", spellcheck: false, placeholder: "your SG/Send access token" });
    const send = btn("Send to the studio"), save = btn("Save to this computer", "big alt");
    const err = el("p", { className: "err", role: "alert" }), prog = el("div", { className: "bar", ariaHidden: "true" }, el("i")), stage_ = el("p", { className: "note", ariaLive: "polite" });
    save.addEventListener("click", () => { download(); stage_.textContent = `Saved to your downloads: ${take.file}`; });
    send.addEventListener("click", async () => {
      err.textContent = ""; send.disabled = save.disabled = true;
      try {
        const r = await sendFile({ blob: take.blob, filename: take.file, service: service.value, access: access.value.trim(),
          onStage: (t, f) => { stage_.textContent = t; prog.firstChild.style.width = `${Math.round(f * 100)}%`; } });
        access.value = ""; stepDone(r, service.value);
      } catch (e) { err.textContent = e.message || String(e); send.disabled = save.disabled = false; }
    });
    step(4, "Send it",
      el("p", {}, "Send the video to the studio, encrypted in this browser before it leaves it. You get a short token to pass on; the token is the only way to open it."),
      el("label", { htmlFor: "sg-service" }, "Service", service),
      el("label", { htmlFor: "sg-access" }, "Your SG/Send access token", access),
      el("details", {}, el("summary", {}, "What happens to the access token?"),
        el("p", {}, "It stays in this tab's memory, goes only to the SG/Send service you chose, with this upload, and is forgotten when the upload ends. It is never saved, never sent to this site and never part of the video.")),
      send, prog, stage_, err, save, cancel());
  };
  // done
  const stepDone = (r, service) => {
    const text = `Recording of "${document.title}" sent with SG/Send (${service}). Token: ${r.token}`;
    const copy = btn("Copy the message for the studio"), save = btn("Also save a copy here", "big alt"), out = el("p", { className: "note", ariaLive: "polite" });
    copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(text); out.textContent = "Copied. Paste it in the studio's chat."; } catch { out.textContent = text; } });
    save.addEventListener("click", () => { download(); out.textContent = `Saved to your downloads: ${take.file}`; });
    panel.replaceChildren(el("p", { className: "step" }, "SENT"), el("h2", {}, "Sent, encrypted"),
      el("p", {}, "Give the studio this token. Anyone with it can open the video, so share it only with them."),
      el("p", { className: "token" }, r.token), copy,
      el("p", { className: "note" }, el("a", { href: r.url, target: "_blank", rel: "noopener" }, "Open it on SG/Send"), " to check it."),
      save, out, btn("Done", "link", { onclick: () => showStart("Sent. Thank you.") }));
    panel.querySelector(".big").focus();
  };
  const download = () => { const a = el("a", { href: take.url, download: take.file }); document.body.append(a); a.click(); a.remove(); };

  const startRec = () => {
    if (!window.MediaRecorder || !stage.captureStream) { status.textContent = "This browser cannot record."; return; }
    const tracks = [...stage.captureStream(60).getVideoTracks()], as = audio.stream && audio.stream(); if (as) tracks.push(...as.getAudioTracks());
    const type = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
    rec = new MediaRecorder(new MediaStream(tracks), { mimeType: type, videoBitsPerSecond: 16e6, audioBitsPerSecond: 192e3 }); chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const mime = rec.mimeType || type, blob = new Blob(chunks, { type: mime }), secs = (performance.now() - t0) / 1000;
      const file = `${name}-${stage.width}x${stage.height}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}${mime.includes("mp4") ? ".mp4" : ".webm"}`;
      rec = null; clearInterval(tick); status.textContent = ""; deck.setAuto(false); deck.pause(true); audio.pause(true); playing = false; labels();
      take = { blob, url: URL.createObjectURL(blob), file, secs }; stepCheck();
    };
    rec.start(1000); t0 = performance.now();
    const upd = () => { status.textContent = `● Recording ${fmtTime((performance.now() - t0) / 1000)}`; };
    upd(); tick = setInterval(upd, 500);
  };

  // the end of a run: the sound fades out and the deck stops on its last frame (no loop); a recording then ends
  deck.onEnd = () => {
    if (stopping) return true; stopping = true;
    audio.fadeOut ? audio.fadeOut(2.5) : audio.mute(true);
    setTimeout(() => {
      if (rec) { rec.stop(); return; }
      deck.setAuto(false); deck.pause(true); audio.pause(true); playing = false; labels();
      if (!panel.hidden) return; showStart("The end. Thank you for watching.");
    }, 3000);
    return true;
  };

  bPlay.addEventListener("click", run);
  bRec.addEventListener("click", () => (curShape ? stepRecord() : stepShape()));
  cPlay.addEventListener("click", () => { if (rec) return; const p = deck.pause(); audio.pause(p); labels(); });
  cRestart.addEventListener("click", run);
  cRec.addEventListener("click", () => { if (rec) { rec.stop(); return; } deck.pause(true); audio.pause(true); curShape ? stepRecord() : stepShape(); });
  cSnd.addEventListener("click", () => { audio.mute(); labels(); });
  cFs.addEventListener("click", () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); });
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!panel.hidden || !startCard.hidden) {   // a card is open: its own buttons take the keys; Escape closes the recorder
      if (e.key === "Escape" && !panel.hidden && !rec) { e.preventDefault(); take = null; showStart(); }
      e.stopImmediatePropagation(); return;
    }
    if (e.key === "r" || e.key === "R") { e.preventDefault(); e.stopImmediatePropagation(); cRec.click(); }
    if (e.key === "m" || e.key === "M") setTimeout(labels, 0);
  }, { capture: true });

  // open paused on the first frame; ?record=1 (after choosing a shape) opens the recorder at step 2; ?autoplay=1 tries to play
  deck.setAuto(false); deck.pause(true); labels();
  if (qs.has("record")) stepRecord(); else if (qs.has("autoplay")) run().then(() => { if (!audio.running) status.textContent = "Click once for sound"; });
  return { run };
}
