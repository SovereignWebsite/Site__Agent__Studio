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

export async function createDeck({ canvas, scenes, transitions, headless = false, audio = null }) {
  const gfx = createGfx(canvas, { headless });
  const view = createView();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, px: 960, py: 540 };
  const ctx = {
    THREE, gfx, view, mouse, headless, audio,
    overlay: () => new Overlay(gfx, view),
    text: (str, o = {}) => new TextBlock(str, { ...o, getPpu: () => view.scale }),
  };
  const runners = scenes.map((d, i) => new SceneRunner(d, i, ctx));
  const tInst = {};
  const getT = (name) => {
    const def = transitions[name] || transitions.fade;
    return (tInst[name] = tInst[name] || { def, inst: def.create(ctx) });
  };
  const A = gfx.target(), B = gfx.target(), OUT = gfx.target();
  let cur = -1, trans = null, auto = false, black = 0, blackT = 0, time = 0;
  const listeners = {};
  const emit = (e) => (listeners[e] || []).forEach((f) => f());
  const sound = (type, data) => audio && audio.event(type, data, time); // every sound event carries the deck clock

  const deck = {
    ctx, scenes, runners,
    get cur() { return cur; },
    on(e, f) { (listeners[e] = listeners[e] || []).push(f); return deck; },
    info() { const r = runners[trans ? trans.to : cur]; return { id: r.def.id, index: r.i, beat: r.s.beat, title: r.def.title, notes: (r.def.notes || [])[r.s.beat] || "" }; },
    advance() {
      if (trans) { trans.speed = 3.5; return; }
      const r = runners[cur];
      if (r.s.beat < r.s.n - 1) { r.s.beat++; r.s.dir = 1; sound("beat", { id: r.def.id, beat: r.s.beat }); emit("move"); }
      else if (cur < runners.length - 1) deck.go(cur + 1, { with: scenes[cur + 1].enterWith });
    },
    back() {
      if (trans) { trans.speed = 3.5; return; }
      const r = runners[cur]; r.s.dir = -1;
      if (r.s.beat > 0) { r.s.beat--; sound("beat", { id: r.def.id, beat: r.s.beat }); emit("move"); }
      else if (cur > 0) deck.go(cur - 1, { with: scenes[cur].enterWith, reverse: true, beat: scenes[cur - 1].beats.length - 1 });
    },
    async go(i, { with: w = "fade", reverse = false, beat = 0 } = {}) {
      if (i === cur || i < 0 || i >= runners.length) return;
      const r = runners[i]; await r.init(); r.reset(beat);
      r.inst.enter && r.inst.enter(r.s);
      if (cur < 0) { cur = i; sound("scene", { id: r.def.id, beat }); emit("move"); return; }
      const T = getT(w);
      trans = { from: cur, to: i, T, p: 0, t: 0, dur: T.def.dur * (reverse ? 0.55 : 1), speed: 1, reverse };
      sound("transition", { name: w, dur: trans.dur, reverse });
      sound("scene", { id: r.def.id, beat, fade: trans.dur * 0.9 });
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
    const cap = Math.min(1, Math.sqrt((2560 * 1600) / (w * h))); w = Math.round(w * cap); h = Math.round(h * cap);
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
    canvas.addEventListener("click", () => deck.advance());
    canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); deck.back(); });
  }

  deck.start = async (id, beat = 0) => {
    resize();
    // Warm-up: init every scene and render each beat once so shaders compile before the talk.
    for (const r of runners) { await r.init(); for (let b = 0; b < r.s.n; b++) { r.reset(b); r.step(1e-4); r.render(A); } r.reset(0); }
    for (const name in transitions) { const T = getT(name); T.inst.render({ A, B, p: 0.5, out: OUT, time: 0 }); }
    const i = Math.max(0, scenes.findIndex((s) => s.id === id));
    await deck.go(i, { beat });
    if (!headless) { let last = performance.now(); const loop = (now) => { requestAnimationFrame(loop); step(Math.min(0.05, (now - last) / 1000)); last = now; draw(); }; requestAnimationFrame(loop); }
  };

  // ---- deterministic test hooks (used by tools/shoot.py) ----
  // simulate a scene to (beat, seconds into that beat) without drawing
  async function simulate(r, beat, seconds) {
    await r.init(); r.reset(0); r.inst.enter && r.inst.enter(r.s);
    const dt = 1 / 60;
    for (let b = 0; b <= beat; b++) {
      r.s.beat = b; const bt = r.def.beats[b];
      const dur = b < beat ? (bt.delay || 0) + bt.dur + 0.5 : seconds;
      for (let t = 0; t < dur; t += dt) { time += dt; r.step(dt); }
    }
  }
  const byId = (id) => runners[scenes.findIndex((s) => s.id === id)];
  deck.test = {
    get time() { return time; },
    // put a scene at (beat, seconds) as the current scene, without drawing (start of a scripted capture)
    async prepare(id, beat, seconds) { const r = byId(id); await simulate(r, beat, seconds); trans = null; cur = r.i; sound("scene", { id, beat, fade: 0.05 }); },
    // advance the real deck by dt and draw one frame (transitions, audio events and all)
    step(dt) { step(dt); draw(); },
    // Render ANY transition between ANY two scenes at progress p.
    // from/to: [sceneId, beat, seconds]. Used by tools/shoot.py and tools/video.py.
    async transPair(from, to, name, p) {
      const a = byId(from[0]), b = byId(to[0]);
      await simulate(a, from[1], from[2]); a.s.exit = p; a.render(A);
      await simulate(b, to[1], to[2]); b.s.enter = p; b.render(B);
      getT(name).inst.render({ A, B, p, out: OUT, time }); gfx.present(OUT, time, 0);
    },
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
