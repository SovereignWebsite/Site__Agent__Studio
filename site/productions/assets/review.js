// Review and sign-off for one version of a production, on a static site.
// It checks, in the reader's browser: (1) that the files served now are the files of this version (SHA-256 digest),
// (2) each review record's signature against a published key (ECDSA P-256, SHA-256). It can also make a signed review
// record with a key kept in this browser; nothing is sent anywhere. Apache-2.0. By c.productions (an AI agent).
const voiceNote = () => { const u = navigator.userAgent; return /Edg\//.test(u) ? 'Voice here uses Edge\u2019s speech recognition: the sound goes to Microsoft to be turned into text. Free, and this site receives no sound.' : /Chrome\//.test(u) ? 'Voice here uses Chrome\u2019s speech recognition: the sound goes to Google to be turned into text. Free, and this site receives no sound.' : /Safari\//.test(u) ? 'Voice here uses Safari\u2019s speech recognition, which is Apple\u2019s dictation. Free, and this site receives no sound.' : 'Voice here uses your browser\u2019s own speech recognition. This site receives no sound.'; };
const enc = new TextEncoder(), b64 = (u8) => btoa(String.fromCharCode(...u8)), unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hexOf = async (buf) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join('');
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
const ALG = { name: 'ECDSA', namedCurve: 'P-256' }, SIG = { name: 'ECDSA', hash: 'SHA-256' };

// Hash every file of the version as served now. Each file is tried twice; the result names any file that differs.
export async function digestOf(manifest, root) {
  const lines = [], differ = [];
  for (const f of manifest.files) {
    let h = null, err = '';
    for (let n = 0; n < 2 && !h; n++) { try { const r = await fetch(new URL(f.path, root), { cache: 'no-store' }); if (!r.ok) throw new Error(`answers ${r.status}`); h = await hexOf(await r.arrayBuffer()); } catch (e) { err = e.message; } }
    if (!h) throw new Error(`${f.path} could not be read (${err})`);
    if (h !== f.sha256) differ.push(f.path);
    lines.push(`${h}  ${f.path}\n`);
  }
  return { digest: await hexOf(enc.encode(lines.join(''))), differ };
}
async function publicKey(rec) {
  const j = await (await fetch(rec.key)).json(), who = j.agent || j.person || rec.key; let raw;
  if (j.raw_p256) raw = unb64(j.raw_p256); else if (j.ssh) raw = unb64(j.ssh.split(' ')[1]).slice(-65); else throw new Error('no P-256 key in ' + rec.key);
  return { who, key: await crypto.subtle.importKey('raw', raw, ALG, false, ['verify']) };
}
const idb = () => new Promise((ok, no) => { const r = indexedDB.open('productions-review', 1); r.onupgradeneeded = () => r.result.createObjectStore('keys'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
async function myKey() {
  const db = await idb(), got = await new Promise((ok, no) => { const r = db.transaction('keys').objectStore('keys').get('me'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  if (got) return got;
  const pair = await crypto.subtle.generateKey(ALG, false, ['sign', 'verify']); // the private half cannot be exported from this browser
  await new Promise((ok, no) => { const t = db.transaction('keys', 'readwrite'); t.objectStore('keys').put(pair, 'me'); t.oncomplete = ok; t.onerror = () => no(t.error); }); return pair;
}

// The form is wired before the slow checks, so an early press never reloads the page.
function wire(root, manifest, checked, state) {
  const $ = (q) => root.querySelector(q), form = $('form.review'), outp = $('[data-role=record]'), pub = $('[data-role=pubkey]'), msg = $('[data-role=signmsg]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); msg.textContent = 'Checking the files.'; await checked; const st = state();
    if (!st.same) { msg.textContent = `Not signed. ${st.note}`; return; }
    try {
      const pair = await myKey(), raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)), fp = (await hexOf(raw)).slice(0, 16), d = new FormData(form);
      const comments = String(d.get('comments') || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^([a-z0-9-]{2,24}):\s*(.+)$/); return m ? { scene: m[1], text: m[2] } : { text: l }; });
      const name = String(d.get('reviewer')).trim(), slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'reviewer';
      const payload = JSON.stringify({ type: 'review', production: manifest.production, version: manifest.version, digest: manifest.digest, decision: d.get('decision'), comments, reviewer: name, role: 'person', signed_at: new Date().toISOString() });
      const signature = b64(new Uint8Array(await crypto.subtle.sign(SIG, pair.privateKey, enc.encode(payload))));
      outp.value = JSON.stringify({ payload, alg: 'ECDSA-P256-SHA256', signature, key: `/keys/people/${slug}.json` }, null, 1);
      pub.value = JSON.stringify({ person: name, status: 'proposed', fingerprint: `sha256:${fp}`, raw_p256: b64(raw), how: 'Made in the reviewer’s own browser by the review page (WebCrypto, P-256). The private half cannot be exported from that browser. Only the public half is here.' }, null, 1);
      msg.textContent = `Signed in this browser with your key ${fp}. Nothing was sent. Hand both texts to your agent: it commits the review record, and (once only, at the owner’s word) your public key.`;
      if (lane && await lane.session()) { sendBtn.hidden = false; sendNote.textContent = 'This browser is signed in: one press sends this record, sealed, to the agent.'; }
    } catch (err) { msg.textContent = `Could not sign: ${err.message}`; }
  });
  const sendBtn = $('[data-act=sendreview]'), sendNote = $('[data-role=sendnote]'); let lane = null; import('./lane.js').then((m) => { lane = m; }).catch(() => {});
  sendBtn.addEventListener('click', async () => {
    try { const rec = JSON.parse(outp.value), p = JSON.parse(rec.payload); sendNote.textContent = 'Sealing and sending.'; await lane.send({ kind: 'review', about: `${p.production} ${p.version}`, text: `${p.decision}: ${(p.comments || []).map((c) => (c.scene ? c.scene + ': ' : '') + c.text).join(' | ')}`, record: rec, public_key: JSON.parse(pub.value) }); sendNote.textContent = 'Sent to c.productions, sealed. It records the review when it next reads its lane.'; }
    catch (e) { sendNote.textContent = `Not sent: ${e.message}.`; }
  });
  // dictation: the browser's own speech recognition, where it has one
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $('[data-act=dictate]'), box = $('#rv-com'), dn = $('[data-role=dictnote]');
  if (!SR) { mic.hidden = true; dn.textContent = 'This browser has no speech recognition for web pages. The microphone key on your keyboard (dictation on a Mac, iPhone or iPad) works in the comments box.'; return; }
  dn.textContent = voiceNote();
  let rec = null;
  mic.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = 'en-GB'; rec.continuous = true; rec.interimResults = true; try { rec.processLocally = true; } catch { /* not offered by this browser */ }
    // the film stops where you are, and your words show in the box as you speak, scrolled into view
    try { document.querySelector('[data-player]')?.__player?.pause?.(); } catch { /* no player on this page */ }
    const base = box.value ? box.value.replace(/\s*$/, '\n') : ''; let fin = '';
    rec.onresult = (e) => { let tmp = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript.trim() + '\n'; else tmp += r[0].transcript; } box.value = base + fin + tmp; box.scrollTop = box.scrollHeight; dn.textContent = 'Listening: your words appear in the box as you speak. The film is paused.'; };
    rec.onend = () => { box.value = (base + fin).trimEnd(); box.scrollTop = box.scrollHeight; dn.textContent = 'Stopped listening. Your words are in the box.'; rec = null; mic.textContent = 'Speak your comments'; mic.setAttribute('aria-pressed', 'false'); };
    rec.onerror = (e) => { dn.textContent = `Dictation stopped (${e.error}).`; };
    rec.start(); mic.textContent = 'Stop listening'; mic.setAttribute('aria-pressed', 'true');
  });
}

async function mount(root) {
  const $ = (s) => root.querySelector(s), here = new URL('.', location.href), prodRoot = new URL(root.dataset.root, location.href);
  const manifest = await (await fetch(new URL('manifest.json', here), { cache: 'no-store' })).json(), approvers = JSON.parse(root.dataset.approvers || '[]');
  const files = $('[data-role=files]'), table = $('[data-role=reviews]'), verdict = $('[data-role=verdict]'), short = `Digest ${manifest.digest.slice(0, 16)}… over ${manifest.files.length} files.`;
  let same = false, note = 'The check of the files has not finished.';
  const checked = (async () => {
    try {
      const r = await digestOf(manifest, prodRoot); same = r.digest === manifest.digest;
      note = same ? '' : `These files differ from this version: ${r.differ.join(', ') || 'the list itself'}. Reload the page; if it stays, tell c.productions.`;
      files.replaceChildren(el('span', same ? 'The files served now are exactly this version.' : `The files served now are NOT the files of this version (${r.differ.join(', ')}): no signature below covers what you see.`, same ? 'ok' : 'bad'), el('span', ' ' + short));
    } catch (e) { note = `The files could not be checked: ${e.message}. Reload the page and try again.`; files.replaceChildren(el('span', `Could not check the files: ${e.message}.`, 'bad')); }
  })();
  wire(root, manifest, checked, () => ({ same, note }));
  await checked;
  let records = []; try { records = await (await fetch(new URL('reviews.json', here), { cache: 'no-store' })).json(); } catch { /* none yet */ }
  let approved = false; const body = table.querySelector('tbody'); body.replaceChildren();
  for (const rec of records) {
    const tr = el('tr'); let p = {}, who = rec.key, valid = false, why = '';
    try { p = JSON.parse(rec.payload); const k = await publicKey(rec); who = k.who; valid = await crypto.subtle.verify(SIG, k.key, unb64(rec.signature), enc.encode(rec.payload)); } catch (e) { why = e.message; }
    const covers = p.digest === manifest.digest && p.version === manifest.version && p.production === manifest.production, owner = approvers.includes(rec.key);
    if (valid && covers && same && owner && p.decision === 'approve') approved = true;
    tr.append(el('td', `${p.reviewer || '?'} (${p.role || 'reviewer'})`), el('td', p.decision === 'approve' ? 'Approves' : p.decision === 'changes' ? 'Asks for changes' : 'Comments'), el('td', valid ? `Valid, key of ${who}` : `NOT valid ${why}`, valid ? 'ok' : 'bad'), el('td', covers ? 'This version' : 'Another version', covers ? 'ok' : 'bad'), el('td', owner ? 'Yes' : 'No'), el('td', (p.signed_at || '').replace('T', ' ').slice(0, 16)));
    const c = el('td'); if ((p.comments || []).length) { const ul = el('ul'); for (const x of p.comments) ul.append(el('li', x.scene ? `${x.scene}: ${x.text}` : x.text)); c.append(ul); } else c.textContent = 'None'; tr.append(c); body.append(tr);
  }
  if (!records.length) { const tr = el('tr'), td = el('td', 'No review has been recorded for this version yet.'); td.colSpan = 7; tr.append(td); body.append(tr); }
  verdict.replaceChildren(el('strong', approved ? 'Signed for publishing: yes.' : 'Signed for publishing: no.', approved ? 'ok' : 'wait'), el('span', approved ? ' An approver’s valid signature covers exactly these files.' : approvers.length ? ' It needs a valid approval of exactly these files from a key on the approvers list.' : ' No approver key is published yet, so nothing here can be published.'));
}
for (const r of document.querySelectorAll('[data-review]')) mount(r).catch((e) => { const v = r.querySelector('[data-role=verdict]'); if (v) v.textContent = `The review check could not run (${e.message}).`; });
