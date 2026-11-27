const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const shots = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await b.newPage({ viewport: { width: +(process.env.VW||1280), height: +(process.env.VH||720) } });
  const logs = []; page.on('console', m => logs.push(m.type()+': '+m.text())); page.on('pageerror', e => logs.push('pageerror: '+e));
  const t0 = Date.now();
  await page.goto('file://' + path.resolve('dist/deck.html') + '?headless');
  await page.waitForFunction('window.ready === true', null, { timeout: 180000 });
  console.log('ready in', Date.now()-t0, 'ms');
  for (const s of shots) {
    const p = s.split(':'); const t1 = Date.now();
    if (p[0]==='trans') await page.evaluate(([id,q]) => window.__deck.test.trans(id,q), [p[1], +p[2]]);
    else await page.evaluate(([id,bt,t]) => window.__deck.test.seek(id,bt,t), [p[0], +p[1], +p[2]]);
    const f = (process.env.OUT||'shots')+'/' + s.replace(/:/g,'_') + '.png'; await page.screenshot({ path: f });
    console.log('wrote', f, Date.now()-t1, 'ms');
  }
  logs.filter(l => /error|warn/i.test(l)).slice(0,10).forEach(l => console.log(l));
  await b.close();
})();
