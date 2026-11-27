// The page at /productions/send/: write or speak a message to c.productions, and read its replies. See lane.js.
import { me, token, forget, send, replies, config } from './lane.js';
const $ = (s) => document.querySelector(s), say = (t) => { $('[data-role=status]').textContent = t; };
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
async function show() {
  const has = !!token(), M = await me(), C = await config();
  $('[data-role=state]').textContent = has ? `This browser can write to ${C.agent_name}. Your key in this browser: ${M.fingerprint}.` : `This browser has no lane link yet. The owner of this site hands it out as a link or a QR code; open that link once in this browser. Your key in this browser: ${M.fingerprint}.`;
  $('form').hidden = !has; $('[data-act=forget]').hidden = !has;
  const box = $('[data-role=replies]'), list = await replies(); box.replaceChildren();
  if (!list.length) box.append(el('p', 'No answer yet. When the agent answers, it appears here, readable only in this browser.', 'meta'));
  for (const r of list.slice().reverse()) { const a = el('article', null, 'card'); a.append(el('p', `${(r.at || '').replace('T', ' ').slice(0, 16)} UTC${r.re ? ', about: ' + r.re : ''}`, 'meta'), el('p', r.text)); box.append(a); }
}
$('form').addEventListener('submit', async (e) => {
  e.preventDefault(); const d = new FormData(e.target), text = String(d.get('text')).trim(); if (!text) return;
  say('Sealing and sending.');
  try { const fp = await send({ kind: 'message', name: String(d.get('name')).trim(), about: String(d.get('about')).trim(), text }); try { localStorage.setItem('productions.name', String(d.get('name')).trim()); } catch { /* private mode */ } $('#m-text').value = ''; say(`Sent, sealed to the agent and signed with your key ${fp}. The agent reads its lane when it is nudged or on its next check; its answer will appear below.`); }
  catch (x) { say(`Not sent: ${x.message}.`); }
});
$('[data-act=forget]').addEventListener('click', () => { forget(); show(); say('The lane link was removed from this browser.'); });
$('[data-act=refresh]').addEventListener('click', show);
try { $('#m-name').value = localStorage.getItem('productions.name') || ''; } catch { /* private mode */ }
const about = new URLSearchParams(location.search).get('about'); if (about) $('#m-about').value = about.slice(0, 120);
// dictation with the browser's own speech recognition, where it has one
const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $('[data-act=dictate]'), box = $('#m-text');
if (!SR) { mic.hidden = true; $('[data-role=dictnote]').textContent = 'This browser has no speech recognition for web pages. The microphone key on your keyboard (dictation on a Mac, iPhone or iPad) works in the message box.'; }
else { let rec = null; mic.addEventListener('click', () => {
  if (rec) { rec.stop(); return; }
  rec = new SR(); rec.lang = 'en-GB'; rec.continuous = true; rec.interimResults = false; try { rec.processLocally = true; } catch { /* not offered */ }
  rec.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) box.value += (box.value && !/\s$/.test(box.value) ? ' ' : '') + e.results[i][0].transcript.trim(); };
  rec.onend = () => { rec = null; mic.textContent = 'Speak your message'; mic.setAttribute('aria-pressed', 'false'); };
  rec.onerror = (e) => say(`Dictation stopped (${e.error}).`);
  rec.start(); mic.textContent = 'Stop listening'; mic.setAttribute('aria-pressed', 'true');
}); }
show().catch((e) => say(`This page could not start: ${e.message}`));
