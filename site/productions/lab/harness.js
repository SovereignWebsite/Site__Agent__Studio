// The scene lab: plays one scene component on its own, so a scene can be built, scrubbed and judged before it joins a
// production. A scene is a module at ./<id>/scene.js:
//   export const meta = { id, title, beat, seconds, sources: [{ title, url }] }
//   export async function create({ canvas, THREE, reduced }) -> { render(t, w, h), dispose() }
// render(t) must draw the frame for t seconds from the scene's start, and the same t must give the same frame
// (no Math.random or clock inside render), so scrubbing, review and capture all see the same picture.
// ?scene=<id> picks the scene, ?t=<seconds> freezes it, ?portrait=1 turns the canvas. Apache-2.0. By c.productions.
const q = new URLSearchParams(location.search), root = document.querySelector('[data-lab]'), $ = (s) => root.querySelector(s);
const list = await (await fetch(new URL('scenes.json', import.meta.url))).json(), id = q.get('scene') || list.scenes[0]?.id;
const nav = $('[data-role=list]'); for (const s of list.scenes) { const li = document.createElement('li'), a = document.createElement('a'); a.href = `?scene=${s.id}`; a.textContent = s.title; if (s.id === id) a.setAttribute('aria-current', 'page'); li.append(a, ` ${s.beat}`); nav.append(li); }
const status = $('[data-role=status]'), canvas = $('canvas'), seek = $('[data-role=seek]'), time = $('[data-role=time]'), play = $('[data-act=play]');
if (!id) { status.textContent = 'No scene in the lab yet.'; } else try {
  const portrait = q.get('portrait') === '1'; canvas.width = portrait ? 720 : 1280; canvas.height = portrait ? 1280 : 720; root.classList.toggle('portrait', portrait);
  const mod = await import(`./${id}/scene.js`), THREE = await import('../assets/vendor/three-0.187.0/three.module.min.js');
  const mq = matchMedia('(prefers-reduced-motion: reduce)'), scene = await mod.create({ canvas, THREE, reduced: mq.matches }), d = mod.meta.seconds;
  $('[data-role=title]').textContent = mod.meta.title; $('[data-role=beat]').textContent = mod.meta.beat; seek.max = d;
  const src = $('[data-role=sources]'); for (const s of mod.meta.sources || []) { const li = document.createElement('li'), a = document.createElement('a'); a.href = s.url; a.textContent = s.title; li.append(a); src.append(li); }
  let t = Math.min(d, parseFloat(q.get('t') || (mq.matches ? d * 0.8 : '0')) || 0), playing = false, t0 = 0, raf = 0;
  const draw = () => { scene.render(t, canvas.width, canvas.height); seek.value = t; time.textContent = `${t.toFixed(1)} / ${d} s`; };
  const tick = (now) => { if (!playing) return; t = (now - t0) / 1000; if (t >= d) { t = d; playing = false; play.textContent = 'Play again'; } draw(); if (playing) raf = requestAnimationFrame(tick); };
  play.addEventListener('click', () => { if (playing) { playing = false; cancelAnimationFrame(raf); play.textContent = 'Play'; return; } if (t >= d) t = 0; playing = true; play.textContent = 'Pause'; t0 = performance.now() - t * 1000; raf = requestAnimationFrame(tick); });
  seek.addEventListener('input', () => { t = +seek.value; if (playing) t0 = performance.now() - t * 1000; else draw(); });
  window.__seek = (x) => { t = Math.min(d, x); draw(); }; draw(); root.dataset.ready = '1';
} catch (e) { status.textContent = `This scene could not start: ${e.message}`; root.dataset.ready = 'error'; }
