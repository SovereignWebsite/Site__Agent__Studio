// Take three frames of every scene of a version from the player in headless Chromium:
//   node frames.js <production> <version> <full-size out folder> [port]
// Full-size PNGs go to the out folder (for the media vault); the build makes small JPEGs for the storyboard page.
// Serve the built site first:  python3 -m http.server 8765 -d _site
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [pid, ver, out, port = '8765'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1320, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${port}/productions/${pid}/${ver}/`); await p.waitForSelector('[data-player][data-ready]', { timeout: 90000 }); await p.waitForTimeout(2000);
  const scenes = await p.evaluate(() => document.querySelector('[data-player]').__player.scenes); const list = [];
  for (const [i, s] of scenes.entries()) for (const [k, f] of [[1, 0.3], [2, 0.6], [3, 0.93]]) {
    const t = s.start + s.seconds * f; await p.evaluate((t) => document.querySelector('[data-player]').__player.go(t), t); await p.waitForTimeout(250);
    const name = `${String(i + 1).padStart(2, '0')}-${s.id}-${k}.png`; await p.locator('[data-player] canvas').screenshot({ path: `${out}/${name}` }); list.push({ scene: s.id, n: i + 1, k, t: Math.round(t * 10) / 10, file: name });
  }
  fs.writeFileSync(`${out}/frames.json`, JSON.stringify({ production: pid, version: ver, made: new Date().toISOString().slice(0, 10), how: 'Player frames taken in headless Chromium (software GL) at 30%, 60% and 93% of each scene.', frames: list }, null, 1) + '\n');
  console.log(list.length, 'frames', 'errors:', JSON.stringify(errs)); await b.close();
})();
