// The page at /productions/send/: sign in once, then a conversation with c.productions. See lane.js.
import { me, session, thread, signOut, send, replies, config, accept, acceptFromAddress } from './lane.js';
const voiceNote = () => { const u = navigator.userAgent; return /Edg\//.test(u) ? 'Voice here uses Edge\u2019s speech recognition: the sound goes to Microsoft to be turned into text. Free, and this site receives no sound.' : /Chrome\//.test(u) ? 'Voice here uses Chrome\u2019s speech recognition: the sound goes to Google to be turned into text. Free, and this site receives no sound.' : /Safari\//.test(u) ? 'Voice here uses Safari\u2019s speech recognition, which is Apple\u2019s dictation. Free, and this site receives no sound.' : 'Voice here uses your browser\u2019s own speech recognition. This site receives no sound.'; };
const $ = (s) => document.querySelector(s), say = (t) => { $('[data-role=status]').textContent = t; };
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
const when = (t) => (t || '').replace('T', ' ').slice(0, 16) + ' UTC';
async function show() {
  const M = await me(), C = await config(); let S = null;
  try { const got = await acceptFromAddress(); if (got) say(`Signed in as ${got.name}.`); } catch (e) { say(`Not signed in: ${e.message}.`); }
  S = await session();
  $('[data-role=signin]').hidden = !!S; $('[data-role=chat]').hidden = !S; $('#pk').value = M.code; if (!S) drawKey(M.code).catch(() => {});
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
const script = (src) => new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = () => no(new Error('a part of this page could not be loaded')); document.head.append(sc); });
async function fromImage(file) {
  const bmp = await createImageBitmap(file); let text = '';
  if ('BarcodeDetector' in window) { try { const hits = await new BarcodeDetector({ formats: ['qr_code'] }).detect(bmp); if (hits.length) text = hits[0].rawValue; } catch { /* fall through to the bundled reader */ } }
  if (!text) { if (!window.jsQR) await script('/productions/assets/vendor/jsqr-1.4.0/jsQR.js'); const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height; const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0); const d = cx.getImageData(0, 0, cv.width, cv.height), hit = window.jsQR(d.data, d.width, d.height); if (hit) text = hit.data; }
  if (!text) throw new Error('no QR code was found in that picture');
  return accept(text);
}
// this browser's key as a QR picture (qrcode-generator, MIT), drawn here; nothing is fetched from elsewhere
async function drawKey(code) {
  if (!window.qrcode) await script('/productions/assets/vendor/qrcode-generator-1.4.4/qrcode.js');
  const q = window.qrcode(0, 'L'); q.addData(code); q.make(); const n = q.getModuleCount(), cv = $('#pkqr'), cx = cv.getContext('2d'), cell = Math.floor(cv.width / (n + 8)), off = Math.floor((cv.width - cell * n) / 2);
  cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, cv.width, cv.height); cx.fillStyle = '#000000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) cx.fillRect(off + c * cell, off + r * cell, cell, cell);
}
$('[data-act=copyqr]').addEventListener('click', () => $('#pkqr').toBlob(async (blob) => { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); say('The QR picture is copied: paste it to the agent.'); } catch { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-key-qr.png'; a.click(); say('This browser cannot copy a picture: it was saved as a file instead.'); } }));
const drop = $('[data-role=drop]'); drop.addEventListener('dragover', (e) => e.preventDefault());
drop.addEventListener('drop', async (e) => { e.preventDefault(); try { const f = e.dataTransfer.files[0]; const s = f ? await fromImage(f) : await accept(e.dataTransfer.getData('text')); say(`Signed in as ${s.name}.`); show(); } catch (x) { say(`Not signed in: ${x.message}.`); } });
document.addEventListener('paste', async (e) => { if (await session()) return; const f = [...(e.clipboardData?.files || [])][0]; if (!f) return; e.preventDefault(); try { const s = await fromImage(f); say(`Signed in as ${s.name}.`); show(); } catch (x) { say(`Not signed in: ${x.message}.`); } });
$('[data-act=signout]').addEventListener('click', () => { signOut(); say('Signed out: the sign-in and the thread were removed from this browser. Its key stays.'); show(); });
$('[data-act=refresh]').addEventListener('click', () => { show(); say('Checked.'); });
const about = new URLSearchParams(location.search).get('about'); if (about) $('#m-about').value = about.slice(0, 120);
// dictation with the browser's own speech recognition, where it has one
const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $('[data-act=dictate]'), box = $('#m-text');
if (!SR) { mic.hidden = true; $('[data-role=dictnote]').textContent = 'This browser has no speech recognition for web pages. The microphone key on your keyboard (dictation on a Mac, iPhone or iPad) works in the message box.'; }
else { $('[data-role=dictnote]').textContent = voiceNote(); let rec = null; mic.addEventListener('click', () => {
  if (rec) { rec.stop(); return; }
  rec = new SR(); rec.lang = 'en-GB'; rec.continuous = true; rec.interimResults = false; try { rec.processLocally = true; } catch { /* not offered */ }
  rec.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) box.value += (box.value && !/\s$/.test(box.value) ? ' ' : '') + e.results[i][0].transcript.trim(); };
  rec.onend = () => { rec = null; mic.textContent = 'Speak your message'; mic.setAttribute('aria-pressed', 'false'); };
  rec.onerror = (e) => say(`Dictation stopped (${e.error}).`);
  rec.start(); mic.textContent = 'Stop listening'; mic.setAttribute('aria-pressed', 'true');
}); }
show().catch((e) => say(`This page could not start: ${e.message}`));
