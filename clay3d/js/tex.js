// tex.js — процедурные текстуры (считаются один раз при загрузке): кирпич, брусчатка, фактура пластилина, листочек.
import * as THREE from 'three';

export function rng(seed) { let s = 0; for (const c of String(seed)) s = Math.imul(s ^ c.charCodeAt(0), 2654435761) >>> 0; s = s || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
export function hash(...a) { let h = 2166136261; for (const v of a) { const s = String(v); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } } return (h >>> 0) / 4294967296; }
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

// тайлящийся value-noise (период p)
function tnoise(seed, p) {
  const r = rng(seed), G = new Float32Array(p * p); for (let i = 0; i < G.length; i++) G[i] = r();
  return (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = ((i % p) + p) % p, b = ((j % p) + p) % p, a1 = (a + 1) % p, b1 = (b + 1) % p;
    const s = u * u * (3 - 2 * u), t = v * v * (3 - 2 * v);
    return (G[b * p + a] * (1 - s) + G[b * p + a1] * s) * (1 - t) + (G[b1 * p + a] * (1 - s) + G[b1 * p + a1] * s) * t;
  };
}
function fbmT(n, x, y, oct, base) { let a = .5, s = 0, f = 1; for (let k = 0; k < oct; k++) { s += a * n(x * f, y * f); f *= 2; a *= .5; } return s / (1 - Math.pow(.5, oct)); }

function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function toTex(c, srgb = true, rep = [1, 1]) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
// из карты высот — карта нормалей
function normalFrom(H, w, h, k) {
  const c = canvasOf(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, l = H[y * w + (x - 1 + w) % w], r = H[y * w + (x + 1) % w], u = H[((y - 1 + h) % h) * w + x], dn = H[((y + 1) % h) * w + x];
    let nx = (l - r) * k, ny = (dn - u) * k, nz = 1; const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    d[i * 4] = (nx * .5 + .5) * 255; d[i * 4 + 1] = (ny * .5 + .5) * 255; d[i * 4 + 2] = (nz * .5 + .5) * 255; d[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0); return c;
}
function grayFrom(V, w, h) { const c = canvasOf(w, h), g = c.getContext('2d'), im = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = clamp(V[i]) * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return c; }
function rgbFrom(A, w, h) { const c = canvasOf(w, h), g = c.getContext('2d'), im = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { for (let k = 0; k < 3; k++) im.data[i * 4 + k] = clamp(Math.pow(A[i * 3 + k], 1 / 2.2)) * 255; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return c; }

// ---------- кирпичная стена: тайл 200×130 см (8 кирпичей × 18 рядов: 25×6.5 + шов 1 см) ----------
export function brickTextures() {
  const w = 2080, h = 1332, pxcm = 10, bw = 26, bh = 7.4;   // кирпич 25 + шов 1, ряд 6.5 + шов .9
  const H = new Float32Array(w * h), A = new Float32Array(w * h * 3), R = new Float32Array(w * h);
  const n1 = tnoise('bn1', 64), n2 = tnoise('bn2', 16), n3 = tnoise('bn3', 32);
  const COLS = [[.42, .17, .11], [.52, .22, .13], [.36, .15, .10], [.55, .27, .17], [.32, .14, .10], [.47, .25, .17], [.60, .30, .19]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = x / pxcm, cy = y / pxcm, row = Math.floor(cy / bh), fy = cy - row * bh, ox = (row % 2) * bw / 2;
    const rx = ((cx + ox) % 208 + 208) % 208, col = Math.floor(rx / bw), fx = rx - col * bw;
    const edge = Math.min(fx, bw - fx, fy, bh - fy) - .5, id = hash(row, col % 8);
    const u = x / w, v = y / h, grit = fbmT(n1, u * 64, v * 64, 3), big = fbmT(n2, u * 16, v * 16, 3);
    const i = y * w + x; let hh, r, g, b, ro;
    if (edge < 0) { hh = .15 + grit * .1; const m = .38 + grit * .12; r = m; g = m * .96; b = m * .9; ro = .95; }
    else {
      const chip = sstep(.64, .78, fbmT(n3, u * 32 + id * 9, v * 32, 3)) * (1 - sstep(.3, 1.6, edge));
      hh = .5 + .45 * sstep(0, .9, edge) - grit * .14 - chip * .4;
      const c = COLS[Math.floor(id * COLS.length)], k = .75 + .4 * big + .2 * (grit - .5) - chip * .2;
      r = c[0] * k; g = c[1] * k; b = c[2] * k; ro = .8 + grit * .15;
    }
    H[i] = hh; A[i * 3] = r * r; A[i * 3 + 1] = g * g; A[i * 3 + 2] = b * b; R[i] = ro;   // альбедо в линейном (квадрат ≈ гамма)
  }
  return { map: toTex(rgbFrom(A, w, h)), normalMap: toTex(normalFrom(H, w, h, 6), false), roughnessMap: toTex(grayFrom(R, w, h), false), size: [208, 133.2] };
}

// ---------- брусчатка: тайл 120×120 см, камни ~11×9, лужи в швах и пятнами ----------
export function cobbleTextures() {
  const w = 2048, h = 2048, pxcm = w / 120;
  const H = new Float32Array(w * h), A = new Float32Array(w * h * 3), R = new Float32Array(w * h);
  const n1 = tnoise('cn1', 128), n2 = tnoise('cn2', 8), n3 = tnoise('cn3', 32);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = x / pxcm, cy = y / pxcm, cw = 120 / 11, ch = 120 / 14;
    const row = Math.floor(cy / ch), off = (row % 2) * cw / 2, rx = ((cx + off) % 120 + 120) % 120, col = Math.floor(rx / cw);
    const id = hash('c', row, col % 11), fx = (rx - col * cw - cw / 2) / (cw / 2 * (.86 + .08 * hash('w', row, col % 11))), fy = (cy - row * ch - ch / 2) / (ch / 2 * (.84 + .1 * hash('h', row, col % 11)));
    const rr = Math.pow(Math.pow(Math.abs(fx), 3) + Math.pow(Math.abs(fy), 3), 1 / 3), u = x / w, v = y / h;
    const grit = fbmT(n1, u * 128, v * 128, 3), pud = fbmT(n2, u * 8, v * 8, 4), i = y * w + x;
    let hh, r, g, b, ro;
    if (rr < 1) { hh = Math.sqrt(Math.max(0, 1 - rr * rr * .8)) * .9 - grit * .1; const k = .7 + .6 * id + .3 * (grit - .5); r = .30 * k; g = .30 * k; b = .32 * k; if (id > .8) { r *= 1.18; b *= .85; } ro = .45 + .3 * grit; }
    else { hh = .02 + grit * .05; r = .07; g = .065; b = .06; ro = .08; }
    const p = sstep(.58, .64, pud); if (p > 0) { hh = Math.max(hh, .45 * p + hh * (1 - p) * .3); r *= 1 - .6 * p; g *= 1 - .6 * p; b *= 1 - .5 * p; ro = ro * (1 - p) + .03 * p; }
    ro *= .55 + .45 * fbmT(n3, u * 32, v * 32, 2);   // всё мокрое
    H[i] = hh; A[i * 3] = r * r * .8; A[i * 3 + 1] = g * g * .8; A[i * 3 + 2] = b * b * .85; R[i] = ro;
  }
  return { map: toTex(rgbFrom(A, w, h)), normalMap: toTex(normalFrom(H, w, h, 9), false), roughnessMap: toTex(grayFrom(R, w, h), false), size: [120, 120] };
}

// ---------- фактура пластилина: отпечатки пальцев, шум, следы стека ----------
export function clayBump() {
  const w = 1024, c = canvasOf(w, w), g = c.getContext('2d'), r = rng('claybump');
  const n = tnoise('clayn', 32), im = g.createImageData(w, w);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const v = 128 + (fbmT(n, x / w * 32, y / w * 32, 4) - .5) * 70; const i = (y * w + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0);
  g.lineCap = 'round';
  for (let k = 0; k < 26; k++) {           // отпечатки пальцев: завитки бороздок
    const px = r() * w, py = r() * w, pr = 30 + r() * 60, rot = r() * 6.28, sq = .55 + r() * .35;
    for (let j = 2; j <= 12; j++) { g.beginPath(); g.ellipse(px, py, pr * j / 12, pr * j / 12 * sq, rot, r() * 2, 3.5 + r() * 2.5); g.lineWidth = 2.2; g.strokeStyle = `rgba(${j % 2 ? 60 : 200},${j % 2 ? 60 : 200},${j % 2 ? 60 : 200},.55)`; g.stroke(); }
  }
  for (let k = 0; k < 30; k++) {           // мазки стеком
    const x = r() * w, y = r() * w, a = r() * 6.28, L = 40 + r() * 120;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + .6) * L * .5, y + Math.sin(a + .6) * L * .5, x + Math.cos(a) * L, y + Math.sin(a) * L); g.lineWidth = 3 + r() * 4; g.strokeStyle = 'rgba(70,70,70,.35)'; g.stroke();
  }
  const t = toTex(c, false); return t;
}

// ---------- листочек из тетради ----------
export async function noteTexture() {
  await document.fonts.load('600 200px Caveat', 'Алёна какашка');
  const w = 1400, h = 980, c = canvasOf(w, h), g = c.getContext('2d'), r = rng('note');
  const P = new Path2D(); P.moveTo(8, 60); for (let x = 8; x <= w - 8; x += 18) P.lineTo(x, 40 + r() * 34); P.lineTo(w - 10, h - 12); P.lineTo(12, h - 8); P.closePath();
  g.clearRect(0, 0, w, h); g.save(); g.clip(P);
  g.fillStyle = '#EFEADC'; g.fillRect(0, 0, w, h);
  const fib = tnoise('fib', 256), im = g.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, v = (fbmT(fib, x / 4, y / 4, 2) - .5) * 18; im.data[i] += v; im.data[i + 1] += v; im.data[i + 2] += v; }
  g.putImageData(im, 0, 0);
  g.strokeStyle = 'rgba(70,120,190,.4)'; g.lineWidth = 3; for (let y = 150; y < h; y += 72) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.strokeStyle = 'rgba(205,60,70,.5)'; g.lineWidth = 4; g.beginPath(); g.moveTo(170, 0); g.lineTo(170, h); g.stroke();
  g.save(); g.translate(250, 0); g.rotate(-.045); g.font = '600 250px Caveat';
  for (const [dx, dy, a] of [[0, 0, .92], [2, 1.5, .35]]) { g.fillStyle = `rgba(25,42,140,${a})`; g.fillText('Алёна', dx, 420 + dy); g.fillText('какашка', dx - 60, 700 + dy); }
  g.strokeStyle = 'rgba(25,42,140,.85)'; g.lineWidth = 9; g.lineCap = 'round';
  g.beginPath(); for (let x = -60; x <= 760; x += 10) { const y = 760 + Math.sin(x / 34) * 9; x === -60 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
  g.lineWidth = 8; const px = 900, py = 690;
  for (const [dy, rx, ry] of [[0, 120, 34], [-58, 92, 30], [-108, 60, 24]]) { g.beginPath(); g.ellipse(px, py + dy, rx, ry, 0, Math.PI * .95, Math.PI * 2.05); g.stroke(); }
  g.beginPath(); g.moveTo(px - 30, py - 128); g.quadraticCurveTo(px + 10, py - 190, px + 22, py - 150); g.stroke();
  g.beginPath(); g.moveTo(px - 120, py + 2); g.lineTo(px + 120, py + 2); g.stroke();
  g.fillStyle = 'rgba(25,42,140,.9)'; g.beginPath(); g.arc(px - 30, py - 62, 9, 0, 6.283); g.arc(px + 30, py - 62, 9, 0, 6.283); g.fill();
  g.beginPath(); g.arc(px, py - 32, 26, .2, Math.PI - .2); g.stroke();
  g.restore();
  for (let k = 0; k < 7; k++) { const x = r() * w, y = r() * h, rr = 40 + r() * 140, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(120,110,95,.22)'); gr.addColorStop(.85, 'rgba(120,110,95,.12)'); gr.addColorStop(1, 'rgba(90,80,70,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
  const edge = g.createRadialGradient(w / 2, h / 2, h * .35, w / 2, h / 2, w * .62); edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(70,55,40,.3)'); g.fillStyle = edge; g.fillRect(0, 0, w, h);
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
