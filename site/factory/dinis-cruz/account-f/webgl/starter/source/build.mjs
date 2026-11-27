// Bundle + minify the app (three.js included) and inline it into ONE self-contained HTML file.
// To inline fonts too: read each .woff2, base64 it, and emit `window.__FONTS={name:"data:font/woff2;base64,..."}`
// before the app, then load them with `new FontFace(name, `url(${dataUri})`)` before laying out text.
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const res = await build({
  entryPoints: ["src/main.js"], bundle: true, minify: !process.env.DEV, format: "iife", target: "es2020",
  legalComments: "inline", write: false,
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = readFileSync("template.html.txt", "utf8").replace("/*__APP__*/", () => js);
mkdirSync("dist", { recursive: true });
writeFileSync("dist/deck.html", html);
console.log(`dist/deck.html  ${(html.length / 1024).toFixed(0)} KB`);
