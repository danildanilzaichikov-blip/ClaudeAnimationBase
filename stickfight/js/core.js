// Основа: размеры кадра, палитра, математика, плавности, «кипящая» линия.
// Мир: единицы ≈ сантиметры, y вверх, земля на y = 0. Рост героя ≈ 175.
const W = 1920, H = 1080, FPS = 24;

const PAL = {
  paper: '#f0e4c9', paper2: '#e6d6b4', ink: '#2a2320', soft: '#8a7c6c',
  red: '#c63d2c', redDark: '#8f2a20', tea: '#b9722e', cup: '#f6eedc', cupBand: '#5b7fa6',
  glow: 'rgba(255,190,90,', sky1: '#f2c27e', sky2: '#e8946a', dusk1: '#c9a3b8', dusk2: '#7d7aa6',
  night1: '#4f5a85', night2: '#2f3760', wash: 'rgba(42,35,32,0.10)',
};

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, u) => a + (b - a) * u;
const D2R = Math.PI / 180;
// Направление по углу (градусы): 0 = вниз, +90 = вперёд. Локальные координаты, y вниз.
const dir = a => [Math.sin(a * D2R), Math.cos(a * D2R)];
const angOf = (x, y) => Math.atan2(x, y) / D2R;
const len = (x, y) => Math.hypot(x, y);
const unlerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);

const EASE = {
  lin: u => u,
  io: u => u * u * (3 - 2 * u),
  io2: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  in: u => u * u * u,                   // разгон в удар
  in2: u => u * u,
  out: u => 1 - Math.pow(1 - u, 3),     // торможение
  out2: u => 1 - (1 - u) * (1 - u),
  back: u => { const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
  hold: u => u >= 1 ? 1 : 0,
  snap: u => u >= 1 ? 1 : 1 - Math.pow(1 - u, 6), // почти мгновенно, с доводкой
};
const ease = (name, u) => (EASE[name] || EASE.io)(clamp(u, 0, 1));

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }

// «Кипение» линии: 12 раз в секунду новый сдвиг, у каждого элемента свой.
let BOIL_T = 0;
const BOIL = 12;
function jit(seed, amp) {
  const k = Math.floor(BOIL_T * BOIL);
  return [(hash(seed * 13.7 + k * 1.31) - .5) * 2 * amp, (hash(seed * 7.3 + k * 2.17 + 5) - .5) * 2 * amp];
}

// Полилиния тушью с кипением. pts — массив [x, y] в мировых координатах.
function inkLine(ctx, pts, w, col, seed = 1, amp = 0.5) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => {
    const j = jit(seed + i * 3.1, amp);
    i ? ctx.lineTo(p[0] + j[0], p[1] + j[1]) : ctx.moveTo(p[0] + j[0], p[1] + j[1]);
  });
  ctx.stroke();
}
// Плавная линия через точки (квадратичные сплайны по серединам).
function inkCurve(ctx, pts, w, col, seed = 1, amp = 0.5) {
  if (pts.length < 3) return inkLine(ctx, pts, w, col, seed, amp);
  const q = pts.map((p, i) => { const j = jit(seed + i * 3.1, amp); return [p[0] + j[0], p[1] + j[1]]; });
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]);
  for (let i = 1; i < q.length - 1; i++) {
    const mx = (q[i][0] + q[i + 1][0]) / 2, my = (q[i][1] + q[i + 1][1]) / 2;
    ctx.quadraticCurveTo(q[i][0], q[i][1], i === q.length - 2 ? q[i + 1][0] : mx, i === q.length - 2 ? q[i + 1][1] : my);
  }
  ctx.stroke();
}
function washPoly(ctx, pts, col, seed = 1, amp = 0.8) {
  ctx.fillStyle = col; ctx.beginPath();
  pts.forEach((p, i) => { const j = jit(seed + i * 2.3, amp); i ? ctx.lineTo(p[0] + j[0], p[1] + j[1]) : ctx.moveTo(p[0] + j[0], p[1] + j[1]); });
  ctx.closePath(); ctx.fill();
}
function dot(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function mixCol(a, b, u) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], u)).toString(16).padStart(2, '0')).join('');
}
// Мягкий свет (фонари): добавляет свет, а не грязь.
function glow(ctx, x, y, r, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, PAL.glow + a + ')'); g.addColorStop(1, PAL.glow + '0)');
  const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = op;
}
