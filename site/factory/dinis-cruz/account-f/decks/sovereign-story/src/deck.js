// The presentation runtime: scenes with timed beats, transitions that composite two live frames,
// navigation, presenter keys, speaker notes, URL hash, warm-up and deterministic test hooks.
import * as THREE from "three";
import { createGfx } from "./gfx.js";
import { createView, Overlay } from "./view.js";
import { TextBlock } from "./text.js";
import { clamp, ease, damp } from "./util.js";

class SceneRunner {
  constructor(def, i, ctx) {
    this.def = def; this.i = i; this.ctx = ctx; this.inst = null;
    const n = def.beats.length, beats = def.beats;
    this.s = {
      t: 0, dt: 0, beat: 0, n, p: new Array(n).fill(0), since: new Array(n).fill(0),
      enter: 1, exit: 0, dir: 1, mouse: ctx.mouse,
      at: (b) => this.s.p[b] * beats[b].dur,                                    // seconds into beat b
      k: (b, t0, t1, fn = ease.io3) => fn(clamp((this.s.p[b] * beats[b].dur - t0) / Math.max(1e-4, t1 - t0))), // eased ramp
    };
  }
  async init() {
    if (this.inst) return;
    this.inst = this.def.create(this.ctx);
    if (this.inst.init) await this.inst.init();
  }
  reset(beat = 0) {
    const s = this.s; s.t = 0; s.beat = beat; s.enter = 1; s.exit = 0;
    for (let b = 0; b < s.n; b++) { s.p[b] = b < beat ? 1 : 0; s.since[b] = b < beat ? 30 : 0; }
  }
  step(dt) {
    const s = this.s, beats = this.def.beats; s.dt = dt; s.t += dt;
    for (let b = 0; b < s.n; b++) {
      if (b <= s.beat) {
        s.since[b] += dt;
        if (s.since[b] >= (beats[b].delay || 0)) s.p[b] = Math.min(1, s.p[b] + (dt / beats[b].dur) * (b < s.beat ? 3 : 1)); // skipped beats catch up 3x
      } else { s.since[b] = 0; s.p[b] = Math.max(0, s.p[b] - (dt / beats[b].dur) * 2.4); }                              // going back un-plays
    }
    this.inst.update && this.inst.update(s);
  }
  render(target) { this.inst.render(target, this.s); }
}

export async function createDeck({ canvas, scenes, transitions, headless = false }) {
  const gfx = createGfx(canvas, { headless });
  const view = createView();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, px: 960, py: 540 };
  const ctx = {
    THREE, gfx, view, mouse, headless,
    overlay: () => new Overlay(gfx, view), snapshots: {}, params: {},
    text: (str, o = {}) => new TextBlock(str, { ...o, getPpu: () => view.scale }),
  };
  const runners = scenes.map((d, i) => new SceneRunner(d, i, ctx));
  const tInst = {};
  const getT = (name) => {
    const def = transitions[name] || transitions.fade;
    return (tInst[name] = tInst[name] || { def, inst: def.create(ctx) });
  };
  const A = gfx.target(), B = gfx.target(), OUT = gfx.target();
  // Live snapshots: the last frame of each scene, kept small, for recap scenes (the original's "You are here").
  const snapshot = (r) => { const sn = ctx.snapshots; sn[r.def.id] = sn[r.def.id] || gfx.target({ w: 768, h: 432, type: THREE.UnsignedByteType }); gfx.shrink(A, sn[r.def.id]); };
  let cur = -1, trans = null, auto = false, black = 0, blackT = 0, time = 0, film = null;   // film: deterministic recording state
  const listeners = {};
  const emit = (e, ...a) => { if (film && (e === "trans" || e === "move")) film.log.push(e === "trans" ? { t: time, kind: "trans", ...a[0] } : { t: time, kind: "move", ...deck.info() }); (listeners[e] || []).forEach((f) => f(...a)); };

  const deck = {
    ctx, scenes, runners,
    get cur() { return cur; },
    on(e, f) { (listeners[e] = listeners[e] || []).push(f); return deck; },
    info() { const r = runners[trans ? trans.to : cur]; return { id: r.def.id, index: r.i, beat: r.s.beat, title: r.def.title, notes: (r.def.notes || [])[r.s.beat] || "" }; },
    advance() {
      if (trans) { trans.speed = 3.5; return; }
      const r = runners[cur];
      if (r.s.beat < r.s.n - 1) { r.s.beat++; r.s.dir = 1; emit("move"); }
      else if (cur < runners.length - 1) deck.go(cur + 1, { with: scenes[cur + 1].enterWith });
      else if (film) { film.done = true; blackT = 1; }   // filming: end on black instead of looping
      else if (auto) deck.jump(0); // auto-play loops
    },
    back() {
      if (trans) { trans.speed = 3.5; return; }
      const r = runners[cur]; r.s.dir = -1;
      if (r.s.beat > 0) { r.s.beat--; emit("move"); }
      else if (cur > 0) deck.go(cur - 1, { with: scenes[cur].enterWith, reverse: true, beat: scenes[cur - 1].beats.length - 1 });
    },
    async go(i, { with: w = "fade", reverse = false, beat = 0 } = {}) {
      if (i === cur || i < 0 || i >= runners.length) return;
      const r = runners[i]; await r.init(); r.reset(beat);
      r.inst.enter && r.inst.enter(r.s);
      if (cur < 0) { cur = i; emit("move"); return; }
      snapshot(runners[cur]);
      const T = getT(w);
      trans = { from: cur, to: i, T, p: 0, t: 0, dur: T.def.dur * (reverse ? 0.55 : 1), speed: 1, reverse };
      emit("trans", { name: T.def === transitions[w] ? w : "fade", dur: trans.dur, reverse, to: scenes[i].id, beat });
      emit("move");
    },
    jump(id, beat = 0) {
      const i = typeof id === "number" ? id : scenes.findIndex((s) => s.id === id);
      if (i < 0) return; trans = null;
      if (i === cur) { runners[i].reset(beat); runners[i].inst.enter && runners[i].inst.enter(runners[i].s); emit("move"); return; }
      deck.go(i, { with: "fade", beat });
    },
    setAuto(v) { auto = v; }, get auto() { return auto; },
    toggleBlack() { blackT = blackT ? 0 : 1; },
  };

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let w = (canvas.clientWidth || innerWidth) * dpr, h = (canvas.clientHeight || innerHeight) * dpr;
    const cap = Math.min(1, Math.sqrt((3840 * 2400) / (w * h))); w = Math.round(w * cap); h = Math.round(h * cap);
    view.resize(w, h); gfx.resize(w, h);
    for (const r of runners) r.inst && r.inst.resize && r.inst.resize();
  }

  function step(dt) {
    time += dt; black += (blackT - black) * damp(6, dt);
    const k = damp(5, dt); mouse.x += (mouse.tx - mouse.x) * k; mouse.y += (mouse.ty - mouse.y) * k;
    if (trans) {
      trans.t += dt * trans.speed; trans.p = clamp(trans.t / trans.dur);
      const a = runners[trans.from], b = runners[trans.to], p = trans.reverse ? 1 - trans.p : trans.p;
      const leaving = trans.reverse ? b : a, entering = trans.reverse ? a : b;
      leaving.s.exit = p; entering.s.enter = p;
      a.step(dt); b.step(dt);
      if (trans.p >= 1) {
        a.s.exit = 0; b.s.enter = 1; a.inst.exit && a.inst.exit(a.s);
        cur = trans.to; trans = null; emit("move");
      }
    } else if (cur >= 0) {
      const r = runners[cur]; r.step(dt);
      const bt = r.def.beats[r.s.beat];
      if (auto && r.s.since[r.s.beat] > (bt.delay || 0) + bt.dur + (bt.hold ?? 3)) deck.advance();
    }
  }
  function draw() {
    if (cur < 0) return;
    let out = A;
    if (trans) {
      const a = runners[trans.from], b = runners[trans.to], rev = trans.reverse;
      (rev ? b : a).render(A); (rev ? a : b).render(B);
      trans.T.inst.render({ A, B, p: rev ? 1 - trans.p : trans.p, out: OUT, time });
      out = OUT;
    } else runners[cur].render(A);
    gfx.present(out, time, black);
  }

  // ---- input ----
  if (!headless) {
    addEventListener("resize", resize);
    addEventListener("pointermove", (e) => {
      const rc = canvas.getBoundingClientRect();
      mouse.tx = ((e.clientX - rc.left) / rc.width) * 2 - 1; mouse.ty = 1 - ((e.clientY - rc.top) / rc.height) * 2;
      [mouse.px, mouse.py] = view.fromClient(e.clientX, e.clientY, rc);
    });
    // A scene may capture a drag (its pointer() returns true); a captured gesture never navigates.
    let captured = null, swallow = false;
    const scenePtr = (type) => { const r = runners[cur]; return cur >= 0 && !trans && r.inst.pointer ? r.inst.pointer(type, mouse.px, mouse.py, r.s) : false; };
    canvas.addEventListener("pointerdown", (e) => {
      const rc = canvas.getBoundingClientRect(); [mouse.px, mouse.py] = view.fromClient(e.clientX, e.clientY, rc);
      if (scenePtr("down")) { captured = e.pointerId; swallow = true; canvas.setPointerCapture(e.pointerId); }
    });
    canvas.addEventListener("pointermove", () => { if (captured !== null) scenePtr("move"); });
    const up = () => { if (captured !== null) { scenePtr("up"); captured = null; } };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("click", () => { if (swallow) { swallow = false; return; } deck.advance(); });
    canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); deck.back(); });
  }

  deck.start = async (id, beat = 0) => {
    resize();
    // Warm-up: init every scene and render each beat once so shaders compile before the talk.
    for (const r of runners) {
      await r.init(); for (let b = 0; b < r.s.n; b++) { r.reset(b); r.step(1e-4); r.render(A); }
      const s = r.s; s.beat = s.n - 1; for (let b = 0; b < s.n; b++) { s.p[b] = 1; s.since[b] = 30; } s.t = 6; r.step(1e-4); r.render(A); snapshot(r); r.reset(0);
    }
    for (const name in transitions) { const T = getT(name); T.inst.render({ A, B, p: 0.5, out: OUT, time: 0 }); }
    const i = Math.max(0, scenes.findIndex((s) => s.id === id));
    await deck.go(i, { beat });
    if (!headless) { let last = performance.now(); const loop = (now) => { requestAnimationFrame(loop); step(Math.min(0.05, (now - last) / 1000)); last = now; draw(); }; requestAnimationFrame(loop); }
  };

  // ---- deterministic test hooks (used by shoot.cjs and film.cjs) ----
  deck.test = {
    // Film: play the whole deck on auto-play from the start, one fixed step per frame, logging every scene, beat
    // and transition (and the split's divider) so the sound can be rendered offline to exactly the same timeline.
    async filmStart() {
      film = { log: [], done: false }; trans = null; time = 0; black = blackT = 0; auto = true; cur = -1;
      for (const r of runners) { await r.init(); r.reset(0); }
      await deck.go(0);
    },
    filmStep(dt) {
      step(dt); if (ctx.params.mix !== undefined && runners[cur] && runners[cur].def.id === "split") film.log.push({ t: time, kind: "mix", v: ctx.params.mix });
      draw(); return { t: time, done: film.done && black > 0.995, scene: runners[cur] ? runners[cur].def.id : null };
    },
    filmLog() { return film ? film.log : []; },
    async seek(id, beat, seconds) {
      const i = scenes.findIndex((s) => s.id === id), r = runners[i];
      await r.init(); trans = null; cur = i; r.reset(0); r.inst.enter && r.inst.enter(r.s);
      const dt = 1 / 60;
      for (let b = 0; b <= beat; b++) {
        r.s.beat = b; const bt = r.def.beats[b];
        const dur = b < beat ? (bt.delay || 0) + bt.dur + 0.5 : seconds;
        for (let t = 0; t < dur; t += dt) { time += dt; r.step(dt); }
      }
      draw();
    },
    async trans(id, p) {
      const i = scenes.findIndex((s) => s.id === id); if (i < 1) return;
      await deck.test.seek(scenes[i - 1].id, scenes[i - 1].beats.length - 1, 10);
      const b = runners[i]; await b.init(); b.reset(0); b.inst.enter && b.inst.enter(b.s); b.step(1e-4);
      runners[i - 1].render(A); b.render(B);
      getT(scenes[i].enterWith).inst.render({ A, B, p, out: OUT, time }); gfx.present(OUT, time, 0);
    },
  };
  return deck;
}
