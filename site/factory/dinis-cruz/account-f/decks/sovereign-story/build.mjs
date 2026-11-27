// Bundle + minify the app (three.js included) and inline it into ONE HTML file.
//   node build.mjs                 -> dist/deck.html  (a page fragment, for a claude.ai artifact preview)
//   node build.mjs --site <dir>    -> <dir>/index.html (a complete page for this static site, fonts served beside it,
//                                     no third-party requests) and <dir>/fonts/*.woff2
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";

const TEMPLATE = existsSync("index.template.html") ? "index.template.html" : "template.html.txt";
const res = await build({ entryPoints: ["src/main.js"], bundle: true, minify: true, format: "iife", target: "es2020", legalComments: "inline", write: false });
const js = res.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const frag = readFileSync(TEMPLATE, "utf8").replace("/*__APP__*/", () => js);
mkdirSync("dist", { recursive: true });
writeFileSync("dist/deck.html", frag);
console.log(`dist/deck.html  ${(frag.length / 1024).toFixed(0)} KB`);

const i = process.argv.indexOf("--site");
if (i > 0) {
  const dir = process.argv[i + 1], URL = "https://studio.agents.sovereignweb.site/factory/dinis-cruz/account-f/decks/sovereign-story/";
  // Fonts (all SIL Open Font License 1.1), from @fontsource, served from this site.
  const FONTS = [["Inter", "inter", "400", "normal"], ["Inter", "inter", "500", "normal"], ["Space Grotesk", "space-grotesk", "600", "normal"],
    ["JetBrains Mono", "jetbrains-mono", "500", "normal"], ["Newsreader", "newsreader", "400", "italic"]];
  mkdirSync(`${dir}/fonts`, { recursive: true });
  const faces = FONTS.map(([fam, pkg, w, st]) => {
    const f = `${pkg}-latin-${w}-${st}.woff2`; copyFileSync(`node_modules/@fontsource/${pkg}/files/${f}`, `${dir}/fonts/${f}`);
    return `@font-face{font-family:'${fam}';font-style:${st};font-weight:${w};font-display:swap;src:url("fonts/${f}") format("woff2")}`;
  }).join("\n");
  const local = frag.replace(/<link rel="(?:preconnect|stylesheet)"[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>\n?/g, "");
  const cut = local.indexOf("<canvas");
  const T = "Sovereign story: a live deck", D = "A seven-scene story about owning your website, rendered live in the browser with WebGL and sound made in code. Inspired by The Last Boring Slide.";
  const head = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${D}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Studio">
<meta property="og:locale" content="en_GB">
<meta property="og:url" content="${URL}">
<meta property="og:title" content="${T}">
<meta property="og:description" content="${D}">
<meta property="og:image" content="${URL}share.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="The split screen from the deck: identical rented template cards on the left, an owned landscape at dusk on the right.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${T}">
<meta name="twitter:description" content="${D}">
<meta name="twitter:image" content="${URL}share.jpg">
<link rel="canonical" href="${URL}">
<style>
${faces}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
</style>
`;
  const textVersion = `<h1 class="sr">Sovereign story, a live deck</h1>
<div class="sr">
<p>Scene 1. A plain slide titled "Your website": on someone else's server, on someone else's template, on someone else's terms. Whose is it?</p>
<p>Scene 2. A site you own. The files, the history and the address are yours, in a repository you control.</p>
<p>Scene 3. Rented: their server, their template. Owned: your files, your history, your address.</p>
<p>Scene 4. Static files. No server code. No cookies. No tracking.</p>
<p>Scene 5. Every step, kept. The history is yours.</p>
<p>Scene 6. Move it anywhere, at any time. sovereignwebsite.org</p>
<p>Scene 7. Credits. Inspired by The Last Boring Slide, made by Claude, prompted by Nikita (@fluxxrider). This deck was made by Claude as cl-6.studio for Sovereign Website.</p>
</div>
`;
  const page = head + local.slice(0, cut) + "</head>\n<body>\n<main id=\"main\">\n" + textVersion + local.slice(cut).replace("<script>", "</main>\n<script>") + "\n</body>\n</html>\n";
  writeFileSync(`${dir}/index.html`, page);
  console.log(`${dir}/index.html  ${(page.length / 1024).toFixed(0)} KB`);
}
