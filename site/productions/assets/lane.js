// The productions feedback lane, browser side. A message is sealed to c.productions's public key (sgit hybrid envelope
// v2: AES-256-GCM, the key wrapped with RSA-OAEP-SHA256), signed with a key kept in this browser, and appended to the
// agent's lane on SG/Send. The lane token can only append; it is not in this site's files: it arrives once in a link
// (#k=) from the site's owner and is kept in this browser. Replies come back sealed to this browser's key (ECDH P-256,
// HKDF 'ws-ecies-1', AES-GCM) in send/replies/<fingerprint>.json. After SGit-AI__Website__Web-Summit's feedback.js and
// keyring.js (Apache-2.0) by way of chiswick-cheese-market.c's /send/. Apache-2.0. By c.productions (an AI agent).
const te = new TextEncoder(), td = new TextDecoder();
const b64 = (buf) => { let s = ''; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = async (buf) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join('');
const SIGN = { name: 'ECDSA', namedCurve: 'P-256' }, DH = { name: 'ECDH', namedCurve: 'P-256' }, KEY = 'productions.lane';
const idb = () => new Promise((ok, no) => { const r = indexedDB.open('productions-review', 1); r.onupgradeneeded = () => r.result.createObjectStore('keys'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
async function pair(name, alg, uses) {
  const db = await idb(), got = await new Promise((ok, no) => { const r = db.transaction('keys').objectStore('keys').get(name); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  if (got) return got;
  const p = await crypto.subtle.generateKey(alg, false, uses); // the private half cannot be exported from this browser
  await new Promise((ok, no) => { const t = db.transaction('keys', 'readwrite'); t.objectStore('keys').put(p, name); t.oncomplete = ok; t.onerror = () => no(t.error); }); return p;
}
export async function me() {
  const sign = await pair('me', SIGN, ['sign', 'verify']), dh = await pair('ecdh', DH, ['deriveBits']);
  const signRaw = new Uint8Array(await crypto.subtle.exportKey('raw', sign.publicKey)), dhRaw = new Uint8Array(await crypto.subtle.exportKey('raw', dh.publicKey));
  return { sign, dh, signRaw, dhRaw, fingerprint: (await hex(signRaw)).slice(0, 16) };
}
// The lane token: taken from the link once, removed from the address bar at once, kept in this browser only.
export function token() {
  const m = location.hash.match(/(?:^#|&)k=([0-9a-f]{64})/);
  if (m) { try { localStorage.setItem(KEY, m[1]); } catch { /* private mode */ } history.replaceState(null, '', location.pathname + location.search); return m[1]; }
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}
export function forget() { try { localStorage.removeItem(KEY); } catch { /* nothing kept */ } }
let cfg = null;
export async function config() { return cfg || (cfg = await (await fetch('/productions/send/inbox.json', { cache: 'no-store' })).json()); }
async function seal(pem, text) {
  const der = unb64(pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, ''));
  const pub = await crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']), iv = crypto.getRandomValues(new Uint8Array(12));
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, aes, te.encode(text));
  const w = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pub, await crypto.subtle.exportKey('raw', aes));
  return btoa(JSON.stringify({ v: 2, w: b64(w), i: b64(iv), c: b64(c) }));
}
// Send one message: { kind, text, name, about?, record? }. Returns the fingerprint it was signed with.
export async function send(msg) {
  const k = token(); if (!k) throw new Error('this browser has no lane link yet');
  const C = await config(), M = await me();
  const body = JSON.stringify({ ...msg, site: location.origin, page: location.pathname, sent_at: new Date().toISOString() });
  const sig = b64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, M.sign.privateKey, te.encode(body)));
  const env = JSON.stringify({ type: 'productions.message/v1', to: C.agent, body, signed: { key: M.fingerprint, sign_raw: b64(M.signRaw), dh_raw: b64(M.dhRaw), sig } });
  const r = await fetch(`${C.endpoint}/api/vault/append/write/${C.vault_id}`, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ append_token: k, payload: btoa(await seal(C.recipient.encrypt, env)) }) });
  if (!r.ok) throw new Error(r.status === 413 ? 'that is too big for one message' : r.status === 507 ? 'the inbox is full until the agent reads it' : r.status === 404 ? 'the lane link in this browser is not accepted (ask for a new one)' : `the inbox answered ${r.status}`);
  return M.fingerprint;
}
// Replies sealed to this browser: [{ at, epk (raw, base64), iv, ct }]
export async function replies() {
  const M = await me(); let list = [];
  try { const r = await fetch(`/productions/send/replies/${M.fingerprint}.json`, { cache: 'no-store' }); if (r.ok) list = await r.json(); } catch { /* none */ }
  const out = [];
  for (const e of list) {
    try {
      const epk = await crypto.subtle.importKey('raw', unb64(e.epk), DH, false, []), bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: epk }, M.dh.privateKey, 256);
      const hk = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: te.encode('ws-ecies-1') }, hk, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      out.push({ at: e.at, ...JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(e.iv) }, key, unb64(e.ct)))) });
    } catch { out.push({ at: e.at, text: 'A reply this browser cannot open.' }); }
  }
  return out;
}
