// Presenter chrome: keys, speaker notes, overview, help, URL hash (#sceneId-beat).
export function attachPresenter(deck) {
  const ui = document.getElementById("ui");
  const el = (cls, html = "") => Object.assign(document.createElement("div"), { className: cls, innerHTML: html });
  let notes = null, over = null, help = null, t0 = 0;
  const clock = () => { if (!t0) return "0:00"; const s = Math.floor((performance.now() - t0) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const refresh = () => {
    const i = deck.info();
    if (notes) { notes.querySelector("p").textContent = i.notes; notes.querySelector(".meta").innerHTML = `${clock()}<br>${i.index + 1} / ${deck.scenes.length} · ${i.beat + 1} / ${deck.scenes[i.index].beats.length}`; }
    try { history.replaceState(null, "", "#" + i.id + (i.beat ? "-" + (i.beat + 1) : "")); } catch {}
  };
  deck.on("move", () => { t0 = t0 || performance.now(); refresh(); });
  setInterval(refresh, 1000);
  const toggleNotes = () => { if (notes) { notes.remove(); notes = null; } else { notes = el("notes", "<p></p><div class='meta'></div>"); ui.append(notes); refresh(); } };
  const toggleOver = () => {
    if (over) { over.remove(); over = null; return; }
    over = el("over");
    deck.scenes.forEach((s, i) => { const b = document.createElement("button"); b.textContent = `${i + 1}. ${s.title}`; b.onclick = () => { toggleOver(); deck.jump(s.id); }; over.append(b); });
    ui.append(over);
  };
  const toggleHelp = () => { if (help) { help.remove(); help = null; return; } help = el("help", [["Next", "→ space click"], ["Back", "← right-click"], ["Fullscreen", "F"], ["Auto-play", "A"], ["Notes", "N"], ["Overview", "O"], ["Black", "B or ."]].map(([a, b]) => `<b>${a}</b><span>${b}</span>`).join("")); ui.append(help); };
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(k)) { e.preventDefault(); if (!e.repeat) deck.advance(); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); if (!e.repeat) deck.back(); }
    else if (k === "f" || k === "F") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
    else if (k === "a" || k === "A") deck.setAuto(!deck.auto);
    else if (k === "n" || k === "N") toggleNotes();
    else if (k === "o" || k === "O") toggleOver();
    else if (k === "?" || k === "h") toggleHelp();
    else if (k === "b" || k === "B" || k === ".") deck.toggleBlack();
    else if (k === "Home") deck.jump(0);
    else if (k === "End") deck.jump(deck.scenes.length - 1);
  });
  let idle; const wake = () => { document.body.classList.remove("idle"); clearTimeout(idle); idle = setTimeout(() => document.body.classList.add("idle"), 2200); };
  addEventListener("pointermove", wake); wake();
}
