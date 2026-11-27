// Review and sign-off for one version of a production, on a static site.
// It checks, in the reader's browser: (1) that the files served now are the files of this version (SHA-256 digest),
// (2) each review record's signature against a published key (ECDSA P-256, SHA-256). It can also make a signed review
// record with a key kept in this browser; nothing is sent anywhere. Apache-2.0. By c.productions (an AI agent).
const enc = new TextEncoder(), b64 = (u8) => btoa(String.fromCharCode(...u8)), unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hexOf = async (buf) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join('');
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
const ALG = { name: 'ECDSA', namedCurve: 'P-256' }, SIG = { name: 'ECDSA', hash: 'SHA-256' };

export async function digestOf(manifest, root) {
  const lines = []; for (const f of manifest.files) { const r = await fetch(new URL(f.path, root), { cache: 'no-store' }); if (!r.ok) throw new Error(`${f.path} answers ${r.status}`); lines.push(`${await hexOf(await r.arrayBuffer())}  ${f.path}\n`); }
  return hexOf(enc.encode(lines.join('')));
}
async function publicKey(rec) {
  let raw, who, path = rec.key;
  const j = await (await fetch(path)).json(); who = j.agent || j.person || path;
  if (j.raw_p256) raw = unb64(j.raw_p256); else if (j.ssh) raw = unb64(j.ssh.split(' ')[1]).slice(-65); else throw new Error('no P-256 key in ' + path);
  return { who, key: await crypto.subtle.importKey('raw', raw, ALG, false, ['verify']) };
}
const idb = () => new Promise((ok, no) => { const r = indexedDB.open('productions-review', 1); r.onupgradeneeded = () => r.result.createObjectStore('keys'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
async function myKey(make) {
  const db = await idb(), get = () => new Promise((ok, no) => { const r = db.transaction('keys').objectStore('keys').get('me'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  let pair = await get(); if (pair || !make) return pair;
  pair = await crypto.subtle.generateKey(ALG, false, ['sign', 'verify']); // the private half cannot be exported from this browser
  await new Promise((ok, no) => { const t = db.transaction('keys', 'readwrite'); t.objectStore('keys').put(pair, 'me'); t.oncomplete = ok; t.onerror = () => no(t.error); }); return pair;
}

async function mount(root) {
  const $ = (s) => root.querySelector(s), here = new URL('.', location.href), prodRoot = new URL(root.dataset.root, location.href);
  const manifest = await (await fetch(new URL('manifest.json', here), { cache: 'no-store' })).json(), approvers = JSON.parse(root.dataset.approvers || '[]');
  const files = $('[data-role=files]'), table = $('[data-role=reviews]'), verdict = $('[data-role=verdict]');
  let digest = null, same = false;
  try { digest = await digestOf(manifest, prodRoot); same = digest === manifest.digest; files.replaceChildren(el('span', same ? 'The files served now are exactly this version.' : 'The files served now are NOT the files of this version: no signature below covers what you see.', same ? 'ok' : 'bad'), el('span', ` Digest ${manifest.digest.slice(0, 16)}… over ${manifest.files.length} files.`)); }
  catch (e) { files.replaceChildren(el('span', `Could not check the files (${e.message}).`, 'bad')); }
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

  // make a signed review in this browser
  const form = $('form.review'), outp = $('[data-role=record]'), pub = $('[data-role=pubkey]'), msg = $('[data-role=signmsg]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); if (!same) { msg.textContent = 'Not signed: the files served do not match this version.'; return; }
    try {
      const pair = await myKey(true), raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)), fp = (await hexOf(raw)).slice(0, 16), d = new FormData(form);
      const comments = String(d.get('comments') || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^([a-z0-9-]{2,24}):\s*(.+)$/); return m ? { scene: m[1], text: m[2] } : { text: l }; });
      const slug = String(d.get('reviewer')).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'reviewer';
      const payload = JSON.stringify({ type: 'review', production: manifest.production, version: manifest.version, digest: manifest.digest, decision: d.get('decision'), comments, reviewer: String(d.get('reviewer')).trim(), role: 'person', signed_at: new Date().toISOString() });
      const signature = b64(new Uint8Array(await crypto.subtle.sign(SIG, pair.privateKey, enc.encode(payload))));
      outp.value = JSON.stringify({ payload, alg: 'ECDSA-P256-SHA256', signature, key: `/keys/people/${slug}.json` }, null, 1);
      pub.value = JSON.stringify({ person: String(d.get('reviewer')).trim(), status: 'proposed', fingerprint: `sha256:${fp}`, raw_p256: b64(raw), how: 'Made in the reviewer’s own browser by the review page (WebCrypto, P-256). The private half cannot be exported from that browser. Only the public half is here.' }, null, 1);
      msg.textContent = `Signed in this browser with your key ${fp}. Nothing was sent. Hand both texts to your agent: it commits the review record, and (once only, at the owner’s word) your public key.`;
    } catch (err) { msg.textContent = `Could not sign: ${err.message}`; }
  });
}
for (const r of document.querySelectorAll('[data-review]')) mount(r).catch((e) => { const v = r.querySelector('[data-role=verdict]'); if (v) v.textContent = `The review check could not run (${e.message}).`; });
