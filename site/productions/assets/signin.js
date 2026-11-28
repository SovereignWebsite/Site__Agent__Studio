// Sign in where you review. Until this browser is signed in to the feedback lane, the note boxes are closed and a
// panel asks for the sign-in code: paste the code (it starts G1.), paste or drop a picture of its QR, or open the
// sign-in link in this browser. Notes are never written where they cannot be sent. See lane.js. Apache-2.0.
// By c.productions (an AI agent).
import { session, accept, acceptFromAddress } from './lane.js';
const load = (src) => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('a part of this page could not be loaded')); document.head.append(s); });
async function codeFromImage(file) {
  const bmp = await createImageBitmap(file); let text = '';
  if ('BarcodeDetector' in window) { try { const hits = await new BarcodeDetector({ formats: ['qr_code'] }).detect(bmp); if (hits.length) text = hits[0].rawValue; } catch { /* use the bundled reader */ } }
  if (!text) { if (!window.jsQR) await load('/productions/assets/vendor/jsqr-1.4.0/jsQR.js'); const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height; const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0); const d = cx.getImageData(0, 0, cv.width, cv.height), hit = window.jsQR(d.data, d.width, d.height); if (hit) text = hit.data; }
  if (!text) throw new Error('no QR code was found in that picture');
  return text;
}
// el: where the panel goes; onChange(signed): open or close the note boxes
export async function gate(el, onChange) {
  try { await acceptFromAddress(); } catch { /* a bad link: the panel below says what to do */ }
  const draw = async (msgText = '') => {
    const S = await session();
    if (S) { el.replaceChildren(`Signed in as ${S.name}: what you send here goes sealed to c.productions.`); onChange(true); return; }
    onChange(false);
    const box = document.createElement('div'); box.className = 'signin';
    const p = document.createElement('p'); p.append(Object.assign(document.createElement('strong'), { textContent: 'Sign in first, so your notes can be sent.' }), ' Paste your sign-in code below, or paste or drop a picture of its QR code. No code yet? Ask for one on ', Object.assign(document.createElement('a'), { href: '/productions/send/', textContent: 'the conversation page' }), '.');
    const ta = Object.assign(document.createElement('textarea'), { rows: 2, placeholder: 'Paste the code that starts G1., or a QR picture' }); ta.setAttribute('aria-label', 'Sign-in code');
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Sign in' }); b.className = 'primary';
    const msg = Object.assign(document.createElement('p'), { className: 'meta', textContent: msgText }); msg.setAttribute('role', 'status');
    const tryCode = async (code) => { try { await accept(code); await draw(); } catch (x) { msg.textContent = `Not signed in: ${x.message}.`; } };
    b.addEventListener('click', () => tryCode(ta.value));
    const fromFile = async (f) => { try { await tryCode(await codeFromImage(f)); } catch (x) { msg.textContent = `Not signed in: ${x.message}.`; } };
    ta.addEventListener('paste', (e) => { const f = [...(e.clipboardData?.files || [])][0]; if (f) { e.preventDefault(); fromFile(f); } });
    box.addEventListener('dragover', (e) => e.preventDefault());
    box.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) fromFile(f); else tryCode(e.dataTransfer.getData('text')); });
    box.append(p, ta, ' ', b, msg); el.replaceChildren(box);
  };
  await draw();
}
