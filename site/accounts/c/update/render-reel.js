// node render-reel.js spec.json out.mp4 voice.wav : every frame at 30 fps, piped to ffmpeg with the voice
const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => { const [spec, out, voice] = process.argv.slice(2); const FPS = 30;
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('pageerror', e => console.log('err:', e.message));
  await p.goto('http://localhost:8766/reel.html?spec=' + spec); await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
  const DUR = await p.evaluate(() => window.DUR); const LEAD = await p.evaluate(() => window.LEAD || 0); const N = Math.ceil(DUR * FPS);
  const ff = spawn('ffmpeg', ['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-i',voice,
    '-filter_complex',`[1:a]adelay=${Math.round(LEAD*1000)}:all=1,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad[a]`,'-map','0:v','-map','[a]',
    '-c:v','libx264','-profile:v','high','-pix_fmt','yuv420p','-preset','medium','-crf','19','-r',String(FPS),
    '-c:a','aac','-b:a','160k','-ac','2','-ar','48000','-t',DUR.toFixed(2),'-movflags','+faststart',out], { stdio: ['pipe','inherit','inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < N; i++) { await p.evaluate(t => window.render(t), i / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${N} ${((Date.now()-t0)/1000).toFixed(0)} s`); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', out, DUR.toFixed(2), 's'); })();
