// Film the deck: deterministic frames at a fixed rate plus the sound rendered offline to the same timeline.
//   VW=1080 VH=1920 FPS=30 node film.cjs <out-dir>     -> <out-dir>/frames/*.jpg, <out-dir>/audio.wav, <out-dir>/film.json
const { chromium } = require("playwright"); const path = require("path"); const fs = require("fs");
(async () => {
  const out = path.resolve(process.argv[2] || "film"), W = +(process.env.VW || 1080), H = +(process.env.VH || 1920), FPS = +(process.env.FPS || 30);
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, "frames"), { recursive: true });
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto("file://" + path.resolve("dist/deck.html") + "?headless&film");
  await page.waitForFunction("window.ready === true", null, { timeout: 300000 });
  await page.evaluate(() => window.__deck.test.filmStart());
  const t0 = Date.now(); let n = 0, r;
  do {
    r = await page.evaluate((dt) => window.__deck.test.filmStep(dt), 1 / FPS);
    await page.screenshot({ path: path.join(out, "frames", String(n).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 93 });
    if (++n % 150 === 0) console.log(`${n} frames, ${r.t.toFixed(1)} s of film (${r.scene}), ${((Date.now() - t0) / 1000).toFixed(0)} s elapsed`);
  } while (!r.done && n < FPS * 240);
  const log = await page.evaluate(() => window.__deck.test.filmLog()), dur = n / FPS;
  fs.writeFileSync(path.join(out, "film.json"), JSON.stringify({ fps: FPS, frames: n, duration: dur, log }, null, 1));
  console.log(`frames done: ${n} (${dur.toFixed(2)} s). Rendering sound...`);
  const wav = await page.evaluate(([l, d]) => window.__renderFilmAudio(l, d), [log, dur]);
  fs.writeFileSync(path.join(out, "audio.wav"), Buffer.from(wav, "base64"));
  console.log("sound done.", errs.length ? "PAGE ERRORS:\n" + errs.join("\n") : "no page errors"); await b.close();
})();
