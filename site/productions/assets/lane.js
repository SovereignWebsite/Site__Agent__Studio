// The productions feedback lane, browser side.
// Sign-in, once per browser: this browser makes its own keys (the private halves cannot be exported), shows its public
// key as a short code; the owner gives that code to the agent; the agent answers with a grant: the lane token sealed
// to this browser's key and signed by the agent. Only this browser can open it. The token is then kept in this
// browser encrypted with a key only this browser can derive. The token is in no file of this site.
// Messages are sealed to the agent's public key (sgit hybrid envelope v2: AES-256-GCM, key wrapped with
// RSA-OAEP-SHA256), signed with this browser's key, and appended to the agent's lane on SG/Send (append only).
// Replies come back sealed to this browser (ECDH P-256, HKDF 'ws-ecies-1', AES-GCM) in send/replies/<fingerprint>.json.
// After SGit-AI__Website__Web-Summit's feedback.js and keyring.js (Apache-2.0), chiswick-cheese-market.c's /send/
// and the CRM's sign-in by code. Apache-2.0. By c.productions (an AI agent).
const te = new TextEncoder(), td = new TextDecoder();
const b64 = (buf) => { let s = ''; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64u = (buf) => b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), unb64u = (s) => unb64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
const hex = async (buf) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join('');
const SIGN = { name: 'ECDSA', namedCurve: 'P-256' }, DH = { name: 'ECDH', namedCurve: 'P-256' }, SIG = { name: 'ECDSA', hash: 'SHA-256' };
const idb = () => new Promise((ok, no) => { const r = indexedDB.open('productions-review', 1); r.onupgradeneeded = () => r.result.createObjectStore('keys'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
async function pair(name, alg, uses) {
  const db = await idb(), got = await new Promise((ok, no) => { const r = db.transaction('keys').objectStore('keys').get(name); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  if (got) return got;
  const p = await crypto.subtle.generateKey(alg, false, uses);
  await new Promise((ok, no) => { const t = db.transaction('keys', 'readwrite'); t.objectStore('keys').put(p, name); t.oncomplete = ok; t.onerror = () => no(t.error); }); return p;
}
let ME = null;
export async function me() {
  if (ME) return ME;
  const sign = await pair('me', SIGN, ['sign', 'verify']), dh = await pair('ecdh', DH, ['deriveBits']);
  const signRaw = new Uint8Array(await crypto.subtle.exportKey('raw', sign.publicKey)), dhRaw = new Uint8Array(await crypto.subtle.exportKey('raw', dh.publicKey));
  const both = new Uint8Array(130); both.set(signRaw); both.set(dhRaw, 65);
  return (ME = { sign, dh, signRaw, dhRaw, fingerprint: (await hex(signRaw)).slice(0, 16), code: 'PK1.' + b64u(both) });
}
async function aesFrom(pubRaw, info, uses) {
  const M = await me(), pub = await crypto.subtle.importKey('raw', pubRaw, DH, false, []), bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, M.dh.privateKey, 256);
  const hk = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: te.encode(info) }, hk, { name: 'AES-GCM', length: 256 }, false, uses);
}
// Things kept in this browser are encrypted with a key derived from this browser's own private key.
async function keep(name, value) { const M = await me(), k = await aesFrom(M.dhRaw, 'productions-local-1', ['encrypt']), iv = crypto.getRandomValues(new Uint8Array(12)); localStorage.setItem(name, JSON.stringify({ iv: b64(iv), ct: b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, te.encode(JSON.stringify(value)))) })); }
async function kept(name, fallback) { try { const j = JSON.parse(localStorage.getItem(name) || 'null'); if (!j) return fallback; const M = await me(), k = await aesFrom(M.dhRaw, 'productions-local-1', ['decrypt']); return JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(j.iv) }, k, unb64(j.ct)))); } catch { return fallback; } }
export const session = () => kept('productions.session', null);              // { k, name, role, at } or null
export const thread = () => kept('productions.thread', []);
export function signOut() { for (const n of ['productions.session', 'productions.thread']) { try { localStorage.removeItem(n); } catch { /* nothing kept */ } } }
let cfg = null;
export async function config() { return cfg || (cfg = await (await fetch('/productions/send/inbox.json', { cache: 'no-store' })).json()); }
// A grant: G1.<base64url(JSON{ epk, iv, ct, sig })>, sealed to this browser and signed by the agent's published key.
export async function accept(text) {
  const m = String(text || '').match(/G1\.([A-Za-z0-9_-]{100,})/); if (!m) throw new Error('that is not a sign-in code');
  let g; try { g = JSON.parse(td.decode(unb64u(m[1]))); } catch { throw new Error('the code arrived incomplete or changed: copy it whole'); }
  const C = await config(), kj = await (await fetch(C.agent_key)).json(), pub = await crypto.subtle.importKey('raw', unb64(kj.ssh.split(' ')[1]).slice(-65), SIGN, false, ['verify']);
  if (!(await crypto.subtle.verify(SIG, pub, unb64(g.sig), te.encode(`${g.epk}.${g.iv}.${g.ct}`)))) throw new Error('the code is not signed by this site’s agent');
  let s; try { const k = await aesFrom(unb64(g.epk), 'ws-ecies-1', ['decrypt']); s = JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(g.iv) }, k, unb64(g.ct)))); } catch { throw new Error('the code was made for another browser: this one cannot open it'); }
  await keep('productions.session', s); return s;
}
export async function acceptFromAddress() { const m = location.hash.match(/G1\.[A-Za-z0-9_-]{100,}/); if (!m) return null; history.replaceState(null, '', location.pathname + location.search); return accept(m[0]); }
async function seal(pem, text) {
  const pub = await crypto.subtle.importKey('spki', unb64(pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']), iv = crypto.getRandomValues(new Uint8Array(12));
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, aes, te.encode(text)), w = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pub, await crypto.subtle.exportKey('raw', aes));
  return btoa(JSON.stringify({ v: 2, w: b64(w), i: b64(iv), c: b64(c) }));
}
// Send one message { kind: 'message' | 'reaction' | 'review', text, about?, re?, value?, record? }; it joins the thread kept here.
export async function send(msg) {
  const S = await session(); if (!S) throw new Error('this browser is not signed in yet');
  const C = await config(), M = await me(), id = crypto.randomUUID(), sent_at = new Date().toISOString();
  const body = JSON.stringify({ id, ...msg, name: S.name, site: location.origin, page: location.pathname, sent_at });
  const sig = b64(await crypto.subtle.sign(SIG, M.sign.privateKey, te.encode(body)));
  const env = JSON.stringify({ type: 'productions.message/v1', to: C.agent, body, signed: { key: M.fingerprint, sign_raw: b64(M.signRaw), dh_raw: b64(M.dhRaw), sig } });
  const r = await fetch(`${C.endpoint}/api/vault/append/write/${C.vault_id}`, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ append_token: S.k, payload: btoa(await seal(C.recipient.encrypt, env)) }) });
  if (!r.ok) throw new Error(r.status === 413 ? 'that is too big for one message' : r.status === 507 ? 'the inbox is full until the agent reads it' : r.status === 404 ? 'this sign-in is no longer accepted: ask for a new code' : `the inbox answered ${r.status}`);
  const t = await thread(); t.push({ id, at: sent_at, kind: msg.kind, text: msg.text || '', about: msg.about || '', re: msg.re || '', value: msg.value || '' }); await keep('productions.thread', t.slice(-200)); return id;
}
// Replies sealed to this browser: the file holds [{ at, epk, iv, ct }]; each opens to { id, re_id, text, from }.
export async function replies() {
  const M = await me(); let list = [];
  try { const r = await fetch(`/productions/send/replies/${M.fingerprint}.json`, { cache: 'no-store' }); if (r.ok) list = await r.json(); } catch { /* none */ }
  const out = [];
  for (const e of list) { try { const k = await aesFrom(unb64(e.epk), 'ws-ecies-1', ['decrypt']); out.push({ at: e.at, ...JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(e.iv) }, k, unb64(e.ct)))) }); } catch { out.push({ at: e.at, id: '', text: 'A reply this browser cannot open.' }); } }
  return out;
}
