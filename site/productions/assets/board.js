// The storyboard page: every scene with its frames beside one preview player. Press a frame to see that moment,
// play one scene, mark it good or not right, write or speak a comment, send it sealed to the agent (lane.js).
// By c.productions (an AI agent).
import { session, send, thread } from './lane.js';
import { gate } from './signin.js';
const root = document.querySelector('[data-board]'), host = document.querySelector('[data-player]');
const start = async () => {
  const P = host.__player, cards = [...root.querySelectorAll('.shot')], note = root.querySelector('[data-role=dictnote]');
  await gate(document.querySelector('[data-role=signed]'), (ok) => { for (const x of root.querySelectorAll('textarea, [data-act=sendscene], [data-act=sendreview], [data-act=dictate]')) x.disabled = !ok; });
  for (const m of await thread()) { const k = (m.about || '').split(' / ')[1]; if (m.kind === 'scene' && (m.about || '').startsWith(`${P.id} ${P.version} /`)) { const c = cards.find((x) => x.dataset.scene === k); if (c) c.classList.add(m.value || 'done'); } }
  const mark = (i) => cards.forEach((c, k) => c.classList.toggle('on', k === i));
  host.addEventListener('scenechange', (e) => mark(e.detail.index)); mark(0);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; let rec = null;
  const u = navigator.userAgent; note.textContent = !SR ? 'This browser has no speech recognition for web pages: click in a comment box and use your keyboard’s dictation.' : /Edg\//.test(u) ? 'Voice here uses Edge’s speech recognition: the sound goes to Microsoft to be turned into text. Free, and this site receives no sound.' : /Chrome\//.test(u) ? 'Voice here uses Chrome’s speech recognition: the sound goes to Google to be turned into text. Free, and this site receives no sound.' : 'Voice here uses Safari’s speech recognition, which is Apple’s dictation. Free, and this site receives no sound.';
  for (const card of cards) {
    const i = +card.dataset.i, $ = (s) => card.querySelector(s), text = $('textarea'), sent = $('[data-role=sent]'), up = $('[data-act=up]'), down = $('[data-act=down]'), mic = $('[data-act=dictate]'); let verdict = '';
    const paint = () => { up.setAttribute('aria-pressed', String(verdict === 'up')); down.setAttribute('aria-pressed', String(verdict === 'down')); };
    $('[data-act=stopfilm]')?.addEventListener('click', () => { P.pause(); mark(i); });
    for (const th of card.querySelectorAll('.thumb')) th.addEventListener('click', () => { P.pause(); P.go(+th.dataset.t); mark(i); });
    $('[data-act=playscene]').addEventListener('click', () => { mark(i); P.playScene(i); });
    up.addEventListener('click', () => { verdict = verdict === 'up' ? '' : 'up'; paint(); }); down.addEventListener('click', () => { verdict = verdict === 'down' ? '' : 'down'; paint(); });
    $('[data-act=sendscene]').addEventListener('click', async () => {
      const t = text.value.trim(), s = P.scenes[i]; if (!t && !verdict) { sent.textContent = 'Say something, or press Good or Not right.'; return; }
      if (!(await session())) { sent.textContent = 'Not sent: this browser is not signed in. Your words are kept in the box.'; return; }
      sent.textContent = 'Sealing and sending.';
      try { await send({ kind: 'scene', about: `${P.id} ${P.version} / ${s.id}`, production: P.id, version: P.version, scene: s.id, value: verdict, text: t }); card.classList.remove('up', 'down', 'done'); card.classList.add(verdict || 'done'); sent.textContent = `Sent${verdict ? ', marked ' + (verdict === 'up' ? 'good' : 'not right') : ''}.`; text.value = ''; verdict = ''; paint(); }
      catch (x) { sent.textContent = `Not sent: ${x.message}. Your words are kept in the box.`; }
    });
    if (!SR) mic.hidden = true; else mic.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      P.pause(); rec = new SR(); rec.lang = navigator.language && navigator.language.startsWith('en') ? navigator.language : 'en-GB'; rec.continuous = true; rec.interimResults = true; try { rec.processLocally = true; } catch { /* not offered */ }
      const base = text.value ? text.value.replace(/\s*$/, ' ') : ''; let fin = '';
      rec.onresult = (e) => { let tmp = ''; for (let k = e.resultIndex; k < e.results.length; k++) { const r = e.results[k]; if (r.isFinal) fin += r[0].transcript.trim() + ' '; else tmp += r[0].transcript; } text.value = base + fin + tmp; text.scrollTop = text.scrollHeight; sent.textContent = 'Listening: your words appear in the box as you speak.'; };
      rec.onend = () => { rec = null; text.value = (base + fin).trim(); text.scrollTop = text.scrollHeight; if (sent.textContent.startsWith('Listening')) sent.textContent = 'Stopped listening. Your words are in the box.'; mic.textContent = 'Speak'; mic.setAttribute('aria-pressed', 'false'); };
      rec.onerror = (e) => { sent.textContent = e.error === 'not-allowed' ? 'The microphone was not allowed for this page.' : `Dictation stopped (${e.error}).`; };
      rec.start(); mic.textContent = 'Stop listening'; mic.setAttribute('aria-pressed', 'true'); sent.textContent = 'Listening. The film is paused here.'; text.focus(); text.scrollIntoView({ block: 'nearest' });
    });
  }
};
if (root && host) { if (host.__player) start(); else host.addEventListener('playerready', start, { once: true }); }
