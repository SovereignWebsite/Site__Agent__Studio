// Review scene by scene, under the player: pick a scene, play only that scene, mark it good or not right, write or
// speak a comment, and send it sealed to the agent through the feedback lane (lane.js). By c.productions (an AI agent).
import { session, send, thread } from './lane.js';
import { gate } from './signin.js';
const voiceNote = () => { const u = navigator.userAgent; return /Edg\//.test(u) ? 'Voice here uses Edge\u2019s speech recognition: the sound goes to Microsoft to be turned into text. Free, and this site receives no sound.' : /Chrome\//.test(u) ? 'Voice here uses Chrome\u2019s speech recognition: the sound goes to Google to be turned into text. Free, and this site receives no sound.' : /Safari\//.test(u) ? 'Voice here uses Safari\u2019s speech recognition, which is Apple\u2019s dictation. Free, and this site receives no sound.' : 'Voice here uses your browser\u2019s own speech recognition. This site receives no sound.'; };
const root = document.querySelector('[data-scenes]'), host = document.querySelector('[data-player]'), $ = (s) => root.querySelector(s);
const start = async () => {
  const P = host.__player, chips = $('[data-role=chips]'), text = $('#sc-text'), sent = $('[data-role=sent]'), up = $('[data-act=up]'), down = $('[data-act=down]');
  let cur = 0, verdict = '';
  let signed = false;
  await gate($('[data-role=signed]'), (ok) => { signed = ok; for (const x of root.querySelectorAll('textarea, [data-act=sendscene], [data-act=sendreview], [data-act=dictate]')) x.disabled = !ok; });
  const drafts = {}, marks = {};
  for (const m of await thread()) { const k = (m.about || '').split(' / ')[1]; if (m.kind === 'scene' && (m.about || '').startsWith(`${P.id} ${P.version} /`) && k) marks[k] = m.value || 'done'; }
  P.scenes.forEach((s, i) => { const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.textContent = `${i + 1}. ${s.id}`; b.title = s.title; b.addEventListener('click', () => { pick(i); P.playScene(i); }); li.append(b); chips.append(li); });
  const paint = () => { [...chips.querySelectorAll('button')].forEach((b, i) => { b.setAttribute('aria-current', String(i === cur)); b.className = marks[P.scenes[i].id] || ''; }); up.setAttribute('aria-pressed', String(verdict === 'up')); down.setAttribute('aria-pressed', String(verdict === 'down')); };
  function pick(i) { drafts[P.scenes[cur].id] = { text: text.value, verdict }; cur = i; const s = P.scenes[i], d = drafts[s.id] || {}; text.value = d.text || ''; verdict = d.verdict || ''; $('[data-role=now]').textContent = `Scene ${i + 1} of ${P.scenes.length}: ${s.title} (${s.id}, ${Math.round(s.seconds)} s)`; $('[data-role=words]').textContent = s.narration; sent.textContent = ''; paint(); }
  host.addEventListener('scenechange', (e) => { if (e.detail.index !== cur) pick(e.detail.index); });
  $('[data-act=playscene]').addEventListener('click', () => P.playScene(cur));
  $('[data-act=prevscene]').addEventListener('click', () => { const i = Math.max(0, cur - 1); pick(i); P.showScene(i); });
  $('[data-act=nextscene]').addEventListener('click', () => { const i = Math.min(P.scenes.length - 1, cur + 1); pick(i); P.showScene(i); });
  up.addEventListener('click', () => { verdict = verdict === 'up' ? '' : 'up'; paint(); }); down.addEventListener('click', () => { verdict = verdict === 'down' ? '' : 'down'; paint(); });
  $('[data-role=comment]').addEventListener('submit', async (e) => {
    e.preventDefault(); const s = P.scenes[cur], t = text.value.trim(); if (!t && !verdict) { sent.textContent = 'Say something, or press Good or Not right.'; return; }
    if (!(await session())) { sent.textContent = 'Not sent: this browser is not signed in. Your words are kept in the box.'; return; }
    sent.textContent = 'Sealing and sending.';
    try { await send({ kind: 'scene', about: `${P.id} ${P.version} / ${s.id}`, production: P.id, version: P.version, scene: s.id, value: verdict, text: t }); marks[s.id] = verdict || 'done'; drafts[s.id] = {}; text.value = ''; const v = verdict; verdict = ''; paint(); sent.textContent = `Sent for scene ${cur + 1} (${s.id})${v ? ', marked ' + (v === 'up' ? 'good' : 'not right') : ''}. Tell the agent to check its lane when you are done.`; }
    catch (x) { sent.textContent = `Not sent: ${x.message}. Your words are kept in the box.`; }
  });
  // voice: the browser's own speech recognition, where it has one
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $('[data-act=dictate]');
  if (!SR) { mic.hidden = true; $('[data-role=dictnote]').textContent = 'This browser has no speech recognition for web pages. Click in the comment box and use your keyboard’s dictation instead (on a Mac press the microphone key, or Fn twice; on iPhone and iPad the microphone on the keyboard).'; }
  else { $('[data-role=dictnote]').textContent = voiceNote(); let rec = null; mic.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    P.pause(); rec = new SR(); rec.lang = navigator.language && navigator.language.startsWith('en') ? navigator.language : 'en-GB'; rec.continuous = true; rec.interimResults = true; try { rec.processLocally = true; } catch { /* not offered */ }
    const base = text.value ? text.value.replace(/\s*$/, ' ') : ''; let fin = '';
    rec.onresult = (e) => { let tmp = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript.trim() + ' '; else tmp += r[0].transcript; } text.value = base + fin + tmp; };
    rec.onend = () => { rec = null; text.value = (base + fin).trim(); mic.textContent = 'Speak your comment'; mic.setAttribute('aria-pressed', 'false'); };
    rec.onerror = (e) => { $('[data-role=dictnote]').textContent = e.error === 'not-allowed' ? 'The microphone was not allowed for this page. Allow it in the browser’s address bar and press again.' : `Dictation stopped (${e.error}). Your keyboard’s dictation also works in the box.`; };
    rec.start(); mic.textContent = 'Stop listening'; mic.setAttribute('aria-pressed', 'true');
  }); }
  pick(0);
};
if (root && host) { if (host.__player) start(); else host.addEventListener('playerready', start, { once: true }); }
