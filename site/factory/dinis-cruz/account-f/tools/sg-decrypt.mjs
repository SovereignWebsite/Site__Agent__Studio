// usage: node sg-decrypt.mjs <friendly-token> <encrypted file> <outdir>
import { readFileSync, writeFileSync } from "node:fs";
const [tok, f, out] = process.argv.slice(2), te = new TextEncoder(), data = new Uint8Array(readFileSync(f));
const base = await crypto.subtle.importKey("raw", te.encode(tok), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: te.encode("sgraph-send-v1"), iterations: 600000 }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.slice(0, 12) }, key, data.slice(12)));
let name = "file.bin", body = pt;
if (new TextDecoder().decode(pt.slice(0, 6)) === "SGMETA") { const n = new DataView(pt.buffer).getUint32(6); name = JSON.parse(new TextDecoder().decode(pt.slice(10, 10 + n))).filename.replace(/[^\w.-]/g, "_"); body = pt.slice(10 + n); }
writeFileSync(`${out}/${name}`, body); console.log("saved", name, body.length);
