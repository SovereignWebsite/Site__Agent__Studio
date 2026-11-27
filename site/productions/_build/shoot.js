// Take frames of a lab scene in headless Chromium:  node shoot.js <scene id> <out folder> <t1,t2,...> [portrait] [port]
// Serve site/ first:  python3 -m http.server 8770 -d site
const { chromium } = require('playwright');
(async () => {
  const [id, out, ts, portrait, port = '8770'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1320, height: portrait === 'portrait' ? 1500 : 900 } }); const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push('PAGE ' + e.message));
  await p.goto(`http://localhost:${port}/productions/lab/?scene=${id}${portrait === 'portrait' ? '&portrait=1' : ''}`); await p.waitForSelector('[data-lab][data-ready]', { timeout: 20000 });
  console.log('status:', await p.textContent('[data-role=status]'));
  for (const t of ts.split(',')) { const t0 = Date.now(); await p.evaluate((x) => window.__seek(+x), t); await p.locator('canvas').screenshot({ path: `${out}/${id}-${portrait === 'portrait' ? 'p-' : ''}${t}.png` }); console.log('t', t, Date.now() - t0, 'ms'); }
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
