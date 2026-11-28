// Render one version of a production to an MP4: step the built player frame by frame in headless Chromium,
// capture each frame, and join the frames with the voice in ffmpeg, each scene's voice placed where the player plays it.
//   node render.js <production> <version> <out.mp4> [port] [--fps 30] [--from s] [--to s]
// Serve the built site first:  python3 -m http.server 8765 -d _site   (after: node .github/ci/build.mjs)
// The picture: frame n is the player at t = n / fps (window's __player.go(t), then the canvas, in the same task).
// The sound: each scene's audio starts at its start plus its lead (as assets/player.js schedules it), mixed without
// level changes. H.264 (yuv420p) + AAC, faststart. The size is the version's format (1280x720, or 720x1280).
// Video files never go in the repository: write <out.mp4> outside it. By c.productions-render (an AI agent).
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : Number(args.splice(i, 2)[1]); };
const fps = opt('--fps', 30), from = opt('--from', 0), to = opt('--to', Infinity);
const [pid, ver, out, port = '8765'] = args; if (!out) { console.error('usage: node render.js <production> <version> <out.mp4> [port]'); process.exit(2); }
const dir = path.join(__dirname, '..', pid, ver), P = JSON.parse(fs.readFileSync(path.join(dir, 'scenes.json'), 'utf8'));
const W = P.format?.w || 1280, H = P.format?.h || 720;
const starts = []; let total = 0; for (const s of P.scenes) { starts.push(total); total += s.seconds; }
const t0 = Math.max(0, from), t1 = Math.min(total, to), n0 = Math.round(t0 * fps), n1 = Math.round(t1 * fps), dur = (n1 - n0) / fps;

// the voice: one input per scene's audio, delayed to its place, trimmed to the rendered window
const ain = [], filt = []; P.scenes.forEach((s, i) => {
  if (!s.audio) return; const at = starts[i] + (s.lead ?? 0.25) - t0, k = ain.length / 2 + 1;
  ain.push('-i', path.join(dir, s.audio));
  filt.push(at >= 0 ? `[${k}:a]aresample=48000,adelay=${Math.round(at * 1000)}:all=1[a${k}]` : `[${k}:a]aresample=48000,atrim=start=${-at},asetpts=PTS-STARTPTS[a${k}]`);
});
const na = ain.length / 2, mix = na ? `${filt.join(';')};${Array.from({ length: na }, (_, j) => `[a${j + 1}]`).join('')}amix=inputs=${na}:duration=longest:normalize=0,apad,atrim=end=${dur}[a]` : '';
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', ...ain,
  ...(na ? ['-filter_complex', mix, '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2'] : ['-map', '0:v']),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-vf', `scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-r', String(fps),
  '-t', String(dur), '-movflags', '+faststart', '-map_metadata', '-1', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((ok, no) => ff.on('close', (c) => (c ? no(new Error('ffmpeg exit ' + c)) : ok())));
const put = (buf) => new Promise((ok) => (ff.stdin.write(buf) ? ok() : ff.stdin.once('drain', ok)));

(async () => {
  const clock = Date.now();
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1320, height: 1500 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${port}/productions/${pid}/${ver}/`); await p.waitForSelector('[data-player][data-ready]', { timeout: 120000 }); await p.waitForTimeout(1500);
  const got = await p.evaluate(() => { const a = document.querySelector('[data-player]').__player, c = document.querySelector('[data-player] canvas'); return { total: a.total, w: c.width, h: c.height }; });
  if (Math.abs(got.total - total) > 0.01 || got.w !== W || got.h !== H) throw new Error(`the player disagrees: ${JSON.stringify(got)} vs ${total} ${W}x${H}`);
  for (let n = n0; n < n1; n++) {
    const url = await p.evaluate((t) => { document.querySelector('[data-player]').__player.go(t); return document.querySelector('[data-player] canvas').toDataURL('image/jpeg', 0.95); }, n / fps);
    await put(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    if ((n - n0) % (fps * 10) === 0) process.stdout.write(`${((n - n0) / fps).toFixed(0)}s `);
  }
  ff.stdin.end(); await b.close(); await done;
  const probe = (e) => new Promise((ok) => { let o = ''; const q = spawn('ffprobe', ['-v', 'error', ...e, '-of', 'csv=p=0', out]); q.stdout.on('data', (d) => (o += d)); q.on('close', () => ok(o.trim())); });
  const vd = Number(await probe(['-select_streams', 'v:0', '-show_entries', 'stream=duration'])), fd = Number(await probe(['-show_entries', 'format=duration']));
  console.log(`\n${out}: ${n1 - n0} frames, ${W}x${H}, film ${dur.toFixed(3)} s, video ${vd.toFixed(3)} s, file ${fd.toFixed(3)} s, rendered in ${((Date.now() - clock) / 60000).toFixed(1)} min, page errors ${JSON.stringify(errs)}`);
  if (Math.abs(vd - dur) > 1.5 / fps || Math.abs(fd - dur) > 0.1) { console.error('LENGTH MISMATCH'); process.exit(1); }
})().catch((e) => { console.error(e); try { ff.stdin.end(); } catch { /* closed */ } process.exit(1); });
