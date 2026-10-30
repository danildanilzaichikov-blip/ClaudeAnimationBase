// Рендер: node tools/render.mjs sheet out/sheet.jpg t1,t2,...   — лист кадров (по 4 в ряд, 480×270)
//         node tools/render.mjs still out/f.png 12.5               — один кадр
//         node tools/render.mjs video out/film.mp4 [from] [to]      — видео 24 к/с (+ audio/track.wav)
//         node tools/render.mjs sfx audio/sfx.json                 — список звуковых событий
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.wav': 'audio/wav' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${srv.address().port}/index.html`;
const [mode, out, a1, a2] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
let errs = 0; page.on('pageerror', e => { errs++; console.error('[page]', e.message); }); page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
await page.goto(url); await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const D = await page.evaluate(() => DURATION); console.log('duration', D.toFixed(2));
const grab = async (t, type = 'jpeg', q = 0.9) => {
  const b64 = await page.evaluate(([t, type, q]) => { window.__render(t); return document.getElementById('c').toDataURL('image/' + type, q).split(',')[1]; }, [t, type, q]);
  return Buffer.from(b64, 'base64');
};
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
if (mode === 'still') fs.writeFileSync(out, await grab(+a1, 'png'));
else if (mode === 'info') console.log(await page.evaluate(() => SHOTS.map(s => s.name + ' ' + s2f(s.S0).toFixed(2)).join('\n')));
else if (mode === 'sfx') fs.writeFileSync(out, JSON.stringify({ duration: D, events: await page.evaluate(() => sfxList()), shots: await page.evaluate(() => SHOTS.map(s => ({ name: s.name, ft: s2f(s.S0), end: s2f(s.S0 + s.dur) }))) }, null, 1));
else if (mode === 'sheet') {
  const ts = a1.split(',').map(Number), dir = path.join(ROOT, 'work', 'sheet'); fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
  for (let i = 0; i < ts.length; i++) fs.writeFileSync(path.join(dir, `${String(i).padStart(3, '0')}.jpg`), await grab(ts[i]));
  const cols = +(a2 || 4);
  await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(dir, '%03d.jpg'), '-vf', `scale=480:270,drawtext=text='%{n}':x=6:y=6:fontcolor=red:fontsize=18,tile=${cols}x${Math.ceil(ts.length / cols)}`, '-frames:v', '1', out], { stdio: 'inherit' }).on('exit', c => c ? rej(c) : res()));
} else if (mode === 'video') {
  const from = +(a1 || 0), to = Math.min(+(a2 || D), D), n = Math.round((to - from) * 24);
  const audio = fs.existsSync(path.join(ROOT, 'audio/track.wav')) && !a1;
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '24', '-i', '-'];
  if (audio) args.push('-i', path.join(ROOT, 'audio/track.wav'));
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (audio) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push(out);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await grab(from + i / 24, 'jpeg', 0.95);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 120 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('exit', r));
}
console.log('errors', errs);
await browser.close(); srv.close();
