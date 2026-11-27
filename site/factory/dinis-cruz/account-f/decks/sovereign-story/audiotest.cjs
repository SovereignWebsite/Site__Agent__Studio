const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await b.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve('dist/deck.html') + '?headless'); await page.waitForFunction('window.ready === true', null, { timeout: 180000 });
  const res = await page.evaluate(async () => {
    const cases = [["bed plain","plain",null,0],["bed own","own",null,0],["bed field+beat1","field",null,1],["bed credits","credits",null,0],["plain typing","plain",null,1],
                   ["tear","own","tear",0],["burn","split","burn",0],["daybreak","field","daybreak",0],["iris","recap","iris",0],["fade","credits","fade",0]];
    const out = [];
    for (const [name, sc, tr, bt] of cases) {
      const off = new OfflineAudioContext(2, 48000 * 4, 48000), a = window.__createAudio(); a.unlock(off); a.scene(sc);
      if (tr) a.transition(tr, tr === "fade" ? 0.7 : 2.8, false); if (bt) a.beat(sc, bt);
      const buf = await off.startRendering(); let pk = 0, ss = 0; const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; ss += d[i] * d[i]; }
      out.push(`${name.padEnd(16)} peak ${(20*Math.log10(pk||1e-9)).toFixed(1)} dBFS  rms ${(20*Math.log10(Math.sqrt(ss/d.length)||1e-9)).toFixed(1)} dBFS`);
    }
    return out;
  });
  console.log(res.join('\n')); if (errs.length) console.log(errs.join('\n')); await b.close(); process.exit(0);
})();
