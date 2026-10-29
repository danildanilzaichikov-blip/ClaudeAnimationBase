// clay.js — пластилиновый движок (чистый 2D canvas, без p5 и WebGL, GPU не нужен).
//
// Как выглядит пластилин и чем мы это делаем:
//   объём      — каждая форма заливается цветом, сверху свет (блик слева-сверху) и тень (справа-снизу) градиентами;
//   мягкий край — внутренняя тень по контуру (форма «скатана», а не вырезана);
//   фактура    — шум multiply/overlay и ОТПЕЧАТКИ ПАЛЬЦЕВ (дуги-завитки), разные у каждой формы и постоянные во времени;
//   глянец     — маленький размытый блик;
//   стол       — контактные тени под всем, что стоит, мягкий фон с глубиной резкости (blur), виньетка, зерно;
//   стоп-моушен — движение квантуется до 12 кадров/с (`sm(t)`), а между «перестановками» каждая форма чуть
//                 сдвигается и мнётся (`boil`), как будто аниматор её поправил пальцем.
//
// Кадр — чистая функция времени: renderAt(t) можно звать в любом порядке (рендер в несколько воркеров).
// Контракт страницы для ../render.mjs: window.ready, renderAt, renderSheet, gpuInfo, DUR, PROJECT, LOOPS.

const W = 1920, H = 1080, FPS_SM = 12;
const DUR = PROJECT.duration;
let X = null;            // текущий контекст рисования
let FN = 0;              // номер «стоп-моушен» кадра (меняется 12 раз в секунду)
let LIGHT = { x: -.55, y: -.75, warm: '#FFF2D8', a: 1 };   // направление света (откуда), его цвет и сила
const LOOPS = {};

// ---------- время ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const sm = t => Math.floor(t * FPS_SM + 1e-6) / FPS_SM;              // стоп-моушен: время «перестановки»
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const easeIn = k => k * k, easeOut = k => 1 - (1 - k) * (1 - k);
const ease = k => k < .5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
const back = (k, s = 1.7) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);   // перелёт и возврат
const elastic = k => k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -9 * k) * Math.sin((k * 10 - .75) * 2.1) + 1;
// ключи: keys(t, [[t0, v0], [t1, v1, easing?], ...])
function keys(t, ks) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t < ks[i][0]) {
    const [a, va] = ks[i - 1], [b, vb, e = ease] = ks[i], k = e((t - a) / (b - a));
    return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k);
  }
  return ks[ks.length - 1][1];
}

// ---------- детерминированный шум ----------
function hash(...a) { let h = 2166136261; for (const v of a) { const s = String(v); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } } return (h >>> 0) / 4294967296; }
function rng(seed) { let s = Math.floor(hash(seed) * 4294967296) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
const jit = (id, amp = 1) => (hash(id, FN) - .5) * 2 * amp;            // дрожь, новая на каждой перестановке

// ---------- формы (массивы точек) ----------
function ell(cx, cy, rx, ry, n = 40, rot = 0) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return p; }
// капсула от (x1,y1) до (x2,y2) толщиной r1 → r2 (руки, ноги, рукава)
function capsule(x1, y1, x2, y2, r1, r2 = r1, n = 14) {
  const a = Math.atan2(y2 - y1, x2 - x1), p = [];
  for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + i / n * Math.PI; p.push([x2 + Math.cos(t) * r2, y2 + Math.sin(t) * r2]); }
  for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + i / n * Math.PI; p.push([x1 + Math.cos(t) * r1, y1 + Math.sin(t) * r1]); }
  return p;
}
function rrect(x, y, w, h, r, n = 6) {
  const p = [], c = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return p;
}
// гладкий замкнутый контур через контрольные точки (Catmull-Rom)
function smooth(ctrl, per = 8) {
  const p = [], n = ctrl.length;
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      p.push([0, 1].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  return p;
}
// преобразования точек
const xf = (pts, { dx = 0, dy = 0, s = 1, sx = s, sy = s, rot = 0, ox = 0, oy = 0 } = {}) => pts.map(([x, y]) => {
  const u = (x - ox) * sx, v = (y - oy) * sy, c = Math.cos(rot), si = Math.sin(rot);
  return [ox + u * c - v * si + dx, oy + u * si + v * c + dy];
});
// мнём форму: у каждой перестановки свой лёгкий бугор (пластилин никогда не повторяется точно)
function knead(pts, id, amp = 1.6) {
  const ph = hash(id, FN) * 6.283, ph2 = hash(id, FN, 'b') * 6.283, n = pts.length;
  return pts.map(([x, y], i) => { const a = i / n * 6.283; return [x + amp * Math.sin(a * 3 + ph), y + amp * Math.cos(a * 2 + ph2)]; });
}
function bbox(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c - a, d - b]; }
function pathOf(pts) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; }

// ---------- цвет ----------
function hex(c) { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); }
const rgba = (c, a = 1) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
function shade(c, k) { const [r, g, b] = hex(c); const f = v => Math.round(clamp(k < 0 ? v * (1 + k) : v + (255 - v) * k, 0, 255)); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function mix(a, b, k) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join(''); }

// ---------- текстуры (один раз) ----------
let NOISE = null, GRAIN = null, NOISE_PAT = null, GRAIN_PAT = null;
function makeNoise(size, scale, seed, fine = .08) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), im = g.createImageData(size, size), r = rng(seed);
  const grid = []; const N = Math.ceil(size / scale) + 1; for (let i = 0; i < N * N; i++) grid.push(r());
  const at = (i, j) => grid[(j % (N - 1)) * N + (i % (N - 1))];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = x / scale, fy = y / scale, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const s = u * u * (3 - 2 * u), q = v * v * (3 - 2 * v);
    const n = lerp(lerp(at(i, j), at(i + 1, j), s), lerp(at(i, j + 1), at(i + 1, j + 1), s), q) * (1 - fine) + r() * fine;
    const o = (y * size + x) * 4, val = Math.round(n * 255); im.data[o] = im.data[o + 1] = im.data[o + 2] = val; im.data[o + 3] = 255;
  }
  g.putImageData(im, 0, 0); return c;
}

// ---------- главное: кусок пластилина ----------
// lump(pts, цвет, { id, gloss 0..1, prints число отпечатков, soft мягкость края, shadow контактная тень,
//                    rough сила мятья, noFx (для маленьких деталей — только объём), flat (без объёмного градиента) })
function lump(pts, col, o = {}) {
  const id = o.id || col + pts.length;
  if (o.rough !== 0) pts = knead(pts, id, o.rough ?? 1.4);
  const P = pathOf(pts), [bx, by, bw, bh] = bbox(pts), cx = bx + bw / 2, cy = by + bh / 2, R = Math.max(bw, bh) / 2 + 1;
  const c = X;
  // контактная тень на столе/полу
  if (o.shadow) { const [sx, sy, sw, sh] = o.shadow; c.save(); c.fillStyle = 'rgba(15,8,20,.38)'; c.filter = `blur(${Math.max(4, sh * .5)}px)`; c.beginPath(); c.ellipse(sx, sy, sw, sh, 0, 0, 6.283); c.fill(); c.restore(); }
  // мягкая отброшенная тень от самой формы
  c.save();
  if (o.drop !== false) { c.shadowColor = 'rgba(10,5,18,.35)'; c.shadowBlur = Math.min(22, R * .25); c.shadowOffsetX = -LIGHT.x * Math.min(10, R * .08); c.shadowOffsetY = -LIGHT.y * Math.min(10, R * .08); }
  c.fillStyle = col; c.fill(P);
  c.restore();
  c.save(); c.clip(P);
  if (!o.flat) {
    // свет: блик со стороны лампы, тень с другой стороны
    const lx = cx + LIGHT.x * R * .55, ly = cy + LIGHT.y * R * .55;
    const g = c.createRadialGradient(lx, ly, R * .05, cx - LIGHT.x * R * .2, cy - LIGHT.y * R * .2, R * 1.35);
    g.addColorStop(0, rgba(LIGHT.warm, .5 * LIGHT.a)); g.addColorStop(.3, rgba(LIGHT.warm, .14 * LIGHT.a));
    g.addColorStop(.55, 'rgba(0,0,0,0)'); g.addColorStop(.85, 'rgba(25,8,35,.38)'); g.addColorStop(1, 'rgba(15,5,25,.6)');
    c.fillStyle = g; c.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
  }
  // внутренняя тень по краю: форма скатана
  const soft = o.soft ?? Math.min(14, R * .18);
  c.shadowColor = 'rgba(25,10,30,.45)'; c.shadowBlur = soft; c.shadowOffsetX = LIGHT.x * soft * -.4; c.shadowOffsetY = LIGHT.y * soft * -.4;
  c.lineWidth = soft * 1.2; c.strokeStyle = 'rgba(25,10,30,.12)'; c.stroke(P);
  c.shadowColor = 'transparent';
  if (!o.noFx) {
    // фактура: шум
    c.globalCompositeOperation = 'overlay'; c.globalAlpha = o.tex ?? .13;
    const off = hash(id) * 400; NOISE_PAT.setTransform(new DOMMatrix().translate(off, off * .7));
    c.fillStyle = NOISE_PAT; c.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
    c.globalAlpha = 1;
    // отпечатки пальцев: завитки дуг, своё место у каждой формы
    const n = o.prints ?? Math.max(1, Math.min(4, Math.round(R / 45)));
    const r = rng(id + 'prints');
    c.globalCompositeOperation = 'source-over';
    for (let k = 0; k < n; k++) {
      const px = bx + bw * (.15 + .7 * r()), py = by + bh * (.15 + .7 * r()), pr = Math.min(R * .45, 10 + r() * 22), rot = r() * 6.283, sq = .55 + r() * .3;
      for (let j = 1; j <= 5; j++) {
        c.beginPath(); const rr = pr * j / 5;
        c.ellipse(px, py, rr, rr * sq, rot, r() * 1.5, 3.4 + r() * 2);
        c.lineWidth = 1.3; c.strokeStyle = j % 2 ? 'rgba(30,10,30,.13)' : 'rgba(255,245,230,.13)'; c.stroke();
      }
    }
    // пара мазков инструментом (стек)
    if (R > 40) for (let k = 0; k < 2; k++) {
      const px = bx + bw * (.2 + .6 * r()), py = by + bh * (.2 + .6 * r()), L = R * (.2 + .2 * r()), a = r() * 6.283;
      c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + Math.cos(a + .5) * L * .6, py + Math.sin(a + .5) * L * .6, px + Math.cos(a) * L, py + Math.sin(a) * L);
      c.lineWidth = 2.2; c.lineCap = 'round'; c.strokeStyle = 'rgba(40,15,35,.12)'; c.stroke();
    }
  }
  // глянец: маленький блик
  const gl = o.gloss ?? .5;
  if (gl > 0 && LIGHT.a > .05) {
    const hx = cx + LIGHT.x * R * .5, hy = cy + LIGHT.y * R * .5, hr = Math.max(2, R * .16);
    const g2 = c.createRadialGradient(hx, hy, 0, hx, hy, hr);
    g2.addColorStop(0, `rgba(255,252,240,${.55 * gl * LIGHT.a})`); g2.addColorStop(1, 'rgba(255,252,240,0)');
    c.fillStyle = g2; c.beginPath(); c.ellipse(hx, hy, hr * 1.3, hr, -.6, 0, 6.283); c.fill();
  }
  c.restore();
  return pts;
}
// бусина (глаза, пуговицы): маленький lump без лишнего
function bead(x, y, r, col, o = {}) { return lump(ell(x, y, r, r * (o.sq || 1), 18), col, { rough: .4, noFx: true, gloss: o.gloss ?? 1, soft: r * .35, drop: o.drop ?? true, id: o.id }); }
// колбаска (брови, усы, ремень): толстая линия, скатанная из пластилина
function snake(pts, w, col, o = {}) {
  const out = [], back = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
    const ww = w * (o.taper ? Math.sin(Math.PI * (.12 + .76 * i / (pts.length - 1))) : 1) / 2;
    out.push([pts[i][0] + Math.cos(ang) * ww, pts[i][1] + Math.sin(ang) * ww]); back.unshift([pts[i][0] - Math.cos(ang) * ww, pts[i][1] - Math.sin(ang) * ww]);
  }
  return lump([...out, ...back], col, { rough: .5, noFx: true, gloss: .3, soft: w * .3, ...o });
}

// ---------- камера ----------
let CAM = null;
function camBegin(cx = W / 2, cy = H / 2, z = 1, rot = 0) {
  X.save(); X.translate(W / 2, H / 2); X.rotate(rot); X.scale(z, z); X.translate(-cx, -cy); CAM = { cx, cy, z, rot };
}
function camEnd() { X.restore(); CAM = null; }

// ---------- слои: фон с глубиной резкости ----------
const LAYERS = {};
function layer(name) { if (!LAYERS[name]) { const c = document.createElement('canvas'); c.width = W; c.height = H; LAYERS[name] = c; } const c = LAYERS[name], g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); return g; }
// нарисовать fn на отдельном слое и положить его размытым (глубина резкости «на столе»)
function dof(blur, fn) { const prev = X, g = layer('dof' + blur); X = g; fn(); X = prev; X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.filter = `blur(${blur}px)`; X.drawImage(g.canvas, 0, 0); X.restore(); }

// ---------- свет и атмосфера (в экранных координатах) ----------
function lightCone(x1, y1, w1, x2, y2, w2, col = '#FFD98A', a = .3) {
  const c = X; c.save(); c.globalCompositeOperation = 'screen';
  const g = c.createLinearGradient(x1, y1, x2, y2); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.filter = 'blur(18px)'; c.beginPath(); c.moveTo(x1 - w1, y1); c.lineTo(x1 + w1, y1); c.lineTo(x2 + w2, y2); c.lineTo(x2 - w2, y2); c.closePath(); c.fill(); c.restore();
}
function glow(x, y, r, col = '#FFD98A', a = .8) {
  const c = X; c.save(); c.globalCompositeOperation = 'screen'; const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(.3, rgba(col, a * .35)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); c.restore();
}
function vignette(a = .55) { const c = X, g = c.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(5,2,12,${a})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
function darken(a, col = '#05030a') { if (a > 0) { X.fillStyle = rgba(col, clamp(a)); X.fillRect(0, 0, W, H); } }
// мерцание экспозиции, как у настоящей съёмки по кадру
function flickerExposure(a = .035) { const k = jit('expo', a); X.fillStyle = k > 0 ? `rgba(255,240,220,${k})` : `rgba(0,0,0,${-k})`; X.fillRect(0, 0, W, H); }

// ---------- кадр ----------
let SHOTS = [];   // [[начало, fn(t, lt, dur)], ...] — задаёт сцена
let outC, outX;
function drawFrame(t) {
  FN = Math.floor(t * FPS_SM + 1e-6);
  X = outX; X.setTransform(1, 0, 0, 1, 0, 0); X.filter = 'none'; X.globalAlpha = 1; X.globalCompositeOperation = 'source-over';
  X.fillStyle = '#000'; X.fillRect(0, 0, W, H);
  if (window.LOOP) { window.LOOP.draw(t); }
  else {
    let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1][0]) i++;
    const [t0, fn] = SHOTS[i], end = i + 1 < SHOTS.length ? SHOTS[i + 1][0] : DUR;
    fn(t, t - t0, end - t0);
  }
  X.setTransform(1, 0, 0, 1, 0, 0); X.filter = 'none';
  GRAIN_PAT.setTransform(new DOMMatrix().translate((FN * 137) % 256, (FN * 71) % 256)); X.fillStyle = GRAIN_PAT;
  X.globalCompositeOperation = 'soft-light'; X.globalAlpha = .22; X.fillRect(0, 0, W, H);
  X.globalCompositeOperation = 'source-over'; X.globalAlpha = 1;
}
window.renderAt = async (t, type = 'image/png', q = .92) => { drawFrame(t); return outC.toDataURL(type, q); };
window.renderSheet = async (times, cols = 3, w = 640, crop = null) => {
  const [, , cw, ch] = crop || [0, 0, W, H], h = Math.round(w * ch / cw), rows = Math.ceil(times.length / cols), sc = document.createElement('canvas');
  sc.width = cols * w; sc.height = rows * h; const c = sc.getContext('2d'), ms = [];
  for (let i = 0; i < times.length; i++) {
    const t0 = performance.now(); drawFrame(times[i]); ms.push(Math.round(performance.now() - t0));
    const x = (i % cols) * w, y = Math.floor(i / cols) * h, [cx, cy] = crop || [0, 0];
    c.drawImage(outC, cx, cy, cw, ch, x, y, w, h); c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(x, y, 84, 24); c.fillStyle = '#fff'; c.font = '15px sans-serif'; c.fillText(times[i].toFixed(2) + 's', x + 6, y + 17);
  }
  return { url: sc.toDataURL('image/jpeg', .9), ms };
};
window.gpuInfo = () => 'canvas2d (GPU не нужен)';

const BOOT = [];   // сцены кладут сюда свою подготовку (запечь текстуры и т.п.), она выполнится до window.ready
async function boot() {
  await Promise.all([...document.fonts].map(f => f.load().catch(() => {})));
  outC = document.getElementById('out'); outC.width = W; outC.height = H; outX = outC.getContext('2d');
  NOISE = makeNoise(512, 14, 'clay'); NOISE_PAT = outX.createPattern(NOISE, 'repeat');
  GRAIN = makeNoise(256, 1, 'grain', .9); GRAIN_PAT = outX.createPattern(GRAIN, 'repeat');
  if (typeof realBoot === 'function') realBoot();
  for (const f of BOOT) await f();
  window.ready = true;
  if (!location.search.includes('render') && !document.getElementById('nostub')) {
    const t = +(new URLSearchParams(location.search).get('t') || 0); drawFrame(t);
  }
}
window.addEventListener('DOMContentLoaded', boot);
