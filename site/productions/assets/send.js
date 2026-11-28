// The page at /productions/send/: sign in once, then a conversation with c.productions. See lane.js.
import { me, session, thread, signOut, send, replies, config, accept, acceptFromAddress } from './lane.js';
const $ = (s) => document.querySelector(s), say = (t) => { $('[data-role=status]').textContent = t; };
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
const when = (t) => (t || '').replace('T', ' ').slice(0, 16) + ' UTC';
async function show() {
  const M = await me(), C = await config(); let S = null;
  try { const got = await acceptFromAddress(); if (got) say(`Signed in as ${got.name}.`); } catch (e) { say(`Not signed in: ${e.message}.`); }
  S = await session();
  $('[data-role=signin]').hidden = !!S; $('[data-role=chat]').hidden = !S; $('#pk').value = M.code;
  $('[data-role=state]').textContent = S ? `Signed in as ${S.name} (${S.role}), with this browser’s key ${M.fingerprint}. You are writing to ${C.agent_name}.` : `This browser is not signed in. Its key is ${M.fingerprint}.`;
  if (!S) return;
  const mine = await thread(), theirs = await replies(), box = $('[data-role=thread]'), rated = Object.fromEntries(mine.filter((m) => m.kind === 'reaction').map((m) => [m.re, m.value]));
  const all = [...mine.filter((m) => m.kind !== 'reaction').map((m) => ({ ...m, mine: true })), ...theirs.map((r) => ({ ...r, mine: false }))].sort((a, b) => (a.at < b.at ? -1 : 1));
  box.replaceChildren(); if (!all.length) box.append(el('p', 'Nothing yet. Say something below.', 'meta'));
  for (const m of all) {
    const a = el('article', null, m.mine ? 'msg mine' : 'msg theirs'); a.append(el('p', `${m.mine ? 'You' : 'c.productions'}, ${when(m.at)}${m.about ? ', about ' + m.about : ''}`, 'meta'), el('p', m.text));
    if (!m.mine && m.id) { const bar = el('p', null, 'rate');
      for (const [v, label, face] of [['up', 'Good', '👍'], ['down', 'Not right', '👎']]) { const b = el('button', `${face} ${label}`); b.type = 'button'; b.setAttribute('aria-pressed', String(rated[m.id] === v)); b.addEventListener('click', async () => { b.disabled = true; try { await send({ kind: 'reaction', re: m.id, value: v, text: label }); say('Sent.'); } catch (x) { say(`Not sent: ${x.message}.`); } show(); }); bar.append(b, ' '); }
      a.append(bar); }
    box.append(a);
  }
  box.scrollTop = box.scrollHeight;
}
$('[data-role=compose]').addEventListener('submit', async (e) => {
  e.preventDefault(); const d = new FormData(e.target), text = String(d.get('text')).trim(); if (!text) return; say('Sealing and sending.');
  try { await send({ kind: 'message', about: String(d.get('about')).trim(), text }); $('#m-text').value = ''; say('Sent, sealed and signed. The agent reads its lane when it is nudged or on its next check; press “Check for answers” later.'); show(); } catch (x) { say(`Not sent: ${x.message}.`); }
});
$('[data-role=grant]').addEventListener('submit', async (e) => { e.preventDefault(); try { const s = await accept($('#g-code').value); say(`Signed in as ${s.name}.`); $('#g-code').value = ''; show(); } catch (x) { say(`Not signed in: ${x.message}.`); } });
$('[data-act=copy]').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#pk').value); say('Your key is copied: paste it to the agent.'); } catch { $('#pk').select(); say('Select and copy the key above.'); } });
// a QR picture of the sign-in code, dropped or pasted, where the browser can read one
async function fromImage(file) { if (!('BarcodeDetector' in window)) throw new Error('this browser cannot read a QR picture: paste the code or open the link instead'); const hits = await new BarcodeDetector({ formats: ['qr_code'] }).detect(await createImageBitmap(file)); if (!hits.length) throw new Error('no QR code was found in that picture'); return accept(hits[0].rawValue); }
const drop = $('[data-role=drop]'); drop.addEventListener('dragover', (e) => e.preventDefault());
drop.addEventListener('drop', async (e) => { e.preventDefault(); try { const f = e.dataTransfer.files[0]; const s = f ? await fromImage(f) : await accept(e.dataTransfer.getData('text')); say(`Signed in as ${s.name}.`); show(); } catch (x) { say(`Not signed in: ${x.message}.`); } });
document.addEventListener('paste', async (e) => { if (await session()) return; const f = [...(e.clipboardData?.files || [])][0]; if (!f) return; e.preventDefault(); try { const s = await fromImage(f); say(`Signed in as ${s.name}.`); show(); } catch (x) { say(`Not signed in: ${x.message}.`); } });
$('[data-act=signout]').addEventListener('click', () => { signOut(); say('Signed out: the sign-in and the thread were removed from this browser. Its key stays.'); show(); });
$('[data-act=refresh]').addEventListener('click', () => { show(); say('Checked.'); });
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
