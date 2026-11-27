// usage: node sg-encrypt.mjs <file> <outdir>  -> writes enc.bin, prints {token,id,plainSize,encSize}
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { makeToken } from "../decks/signed/source/src/sgsend.js";
const [f, out] = process.argv.slice(2), te = new TextEncoder(), token = makeToken();
const id = [...new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(token)))].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
const base = await crypto.subtle.importKey("raw", te.encode(token), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: te.encode("sgraph-send-v1"), iterations: 600000 }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const file = readFileSync(f), m = te.encode(JSON.stringify({ filename: basename(f) })), pt = new Uint8Array(10 + m.length + file.length);
pt.set([0x53, 0x47, 0x4d, 0x45, 0x54, 0x41]); new DataView(pt.buffer).setUint32(6, m.length); pt.set(m, 10); pt.set(file, 10 + m.length);
const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, pt));
const body = new Uint8Array(12 + ct.length); body.set(iv); body.set(ct, 12); writeFileSync(`${out}/enc.bin`, body);
console.log(JSON.stringify({ token, id, plainSize: pt.length, encSize: body.length }));
