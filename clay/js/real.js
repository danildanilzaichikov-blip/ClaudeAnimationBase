// real.js — «настоящий» мир вокруг пластилиновых героев (как в фильмах, где кукол снимают на живой натуре).
//
// Мир не рисуется каждый кадр: при загрузке один раз «запекаются» две картинки размером с весь мир:
//   ENV.amb  — как улица выглядит в лунном свете (альбедо × рассеянный свет),
//   ENV.lamp — что добавляет фонарь (диффуз + мокрые блики + дорожка отражения на брусчатке).
// Обе посчитаны по пикселям из карты высот (кирпичи, швы, выбоины, булыжники, лужи) с нормалями,
// поэтому свет ложится по рельефу. В кадре: amb + lamp × яркость фонаря (мигает/гаснет бесплатно).
// Глубина резкости тоже запечена: стена и дальняя брусчатка размыты, ближняя — резкая.
// Поверх в реальном времени (24 к/с, плавно, в отличие от кукол на 12 к/с): дождь, брызги, туман, конус света,
// сам фонарь, ореол (bloom), зерно. Тени и отражения кукол в мокрой мостовой — reflectDraw().

const GROUND = 900;                          // линия, где стена встречается с мостовой
const WX0 = -300, WY0 = -700, WW = 3700, WH = 2200;
const LAMP = { x: 1480, y: 232, z: 150, post: 1600 };
let ENV = null;

function vnoise(seed) {
  const r = rng(seed), P = new Float32Array(256 * 256); for (let i = 0; i < P.length; i++) P[i] = r();
  return (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = i & 255, b = j & 255, a1 = (a + 1) & 255, b1 = (b + 1) & 255;
    const s = u * u * (3 - 2 * u), t = v * v * (3 - 2 * v);
    return (P[b * 256 + a] * (1 - s) + P[b * 256 + a1] * s) * (1 - t) + (P[b1 * 256 + a] * (1 - s) + P[b1 * 256 + a1] * s) * t;
  };
}
const _n1 = vnoise('n1'), _n2 = vnoise('n2'), _n3 = vnoise('n3');
function fbm(n, x, y, oct = 4) { let a = .5, s = 0, f = 1; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f); f *= 2.03; a *= .5; } return s / (1 - Math.pow(.5, oct)); }
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

const BRICK_COLS = [[.47, .21, .15], [.55, .26, .17], [.40, .18, .13], [.58, .31, .21], [.36, .17, .13], [.50, .29, .22]];

function bakeEnv() {
  const N = WW * WH, Hh = new Float32Array(N), A = new Float32Array(N * 3), WET = new Float32Array(N), KIND = new Uint8Array(N);
  // ---------- 1. карта высот + альбедо ----------
  for (let py = 0; py < WH; py++) {
    const y = py + WY0;
    for (let px = 0; px < WW; px++) {
      const x = px + WX0, i = py * WW + px;
      let h, r, g, b, wet = 0;
      if (y < GROUND) {
        // стена: кирпич 150×68, шов 10
        const ry = GROUND - y, row = Math.floor(ry / 68), fy = ry - row * 68, ox = (row & 1) * 75 + (hash('ro', row) - .5) * 20;
        const rx = x - ox, col = Math.floor(rx / 150), fx = rx - col * 150, edge = Math.min(fx, 150 - fx, fy, 68 - fy) - 5;
        const id = hash(row, col), grit = fbm(_n1, x * .09, y * .09, 3), big = fbm(_n2, x * .012, y * .012, 3);
        if (edge < 0) { h = .12 + grit * .08; const m = .40 + grit * .1; r = m; g = m * .97; b = m * .9; }
        else {
          const chip = sstep(.62, .75, fbm(_n3, x * .03 + id * 50, y * .05, 3)) * (1 - sstep(4, 14, edge));
          h = .45 + .45 * sstep(0, 8, edge) - grit * .12 - chip * .35;
          const c = BRICK_COLS[Math.floor(id * BRICK_COLS.length)], v = .78 + .35 * big + .15 * (grit - .5) - chip * .15;
          r = c[0] * v; g = c[1] * v; b = c[2] * v;
        }
        // копоть и потёки сверху вниз, сырость у земли, мох в швах внизу
        const streak = sstep(.45, .8, fbm(_n2, x * .03, y * .0025, 3)), damp = sstep(GROUND - 260, GROUND, y);
        const dark = 1 - .45 * streak - .35 * damp; r *= dark; g *= dark; b *= dark;
        if (edge < 2 && damp > .3 && fbm(_n1, x * .05, y * .05, 2) > .55) { r = .14; g = .2; b = .1; }
        wet = .25 + .6 * damp + .3 * streak; KIND[i] = 0;
      } else {
        // мостовая в перспективе: d 0 (у стены) … 1 (у камеры)
        const d = (y - GROUND) / 600, s = .55 + .9 * d, pu = (x - LAMP.x) / s, pv = 666.7 * Math.log(s / .55);
        const row = Math.floor(pv / 44), off = (row & 1) * 31 + (hash('cr', row) - .5) * 12, col = Math.floor((pu + off) / 62);
        const id = hash('c', row, col), cw = 62 * (.88 + .08 * hash('w', row, col)), ch = 44 * (.86 + .1 * hash('h', row, col));
        const fx = ((pu + off) - col * 62 - 31) / (cw / 2), fy = (pv - row * 44 - 22) / (ch / 2);
        const rr = Math.pow(Math.pow(Math.abs(fx), 3.2) + Math.pow(Math.abs(fy), 3.2), 1 / 3.2);
        const grit = fbm(_n1, pu * .12, pv * .12, 3);
        h = rr < 1 ? Math.sqrt(Math.max(0, 1 - rr * rr * .85)) * .8 - grit * .08 : .02 + grit * .04;
        const v = .75 + .5 * id + .25 * (grit - .5);
        if (rr < 1) { r = .30 * v; g = .30 * v; b = .32 * v; if (id > .82) { r *= 1.15; g *= 1.0; b *= .85; } }
        else { r = .09; g = .08; b = .07; }
        wet = rr < 1 ? .55 + .3 * grit : 1;
        // лужи
        const pud = fbm(_n2, pu * .0045 + 3, pv * .007, 4);
        if (pud > .6) { const k = sstep(.6, .66, pud); h = lerp(h, .55, k); wet = lerp(wet, 1.6, k); r = lerp(r, .03, k); g = lerp(g, .035, k); b = lerp(b, .05, k); }
        // бордюр у стены
        if (y < GROUND + 16) { h = .9 - (y - GROUND) / 16 * .4; r = .33; g = .32; b = .31; wet = .5; }
        KIND[i] = 1;
      }
      Hh[i] = h; A[i * 3] = r; A[i * 3 + 1] = g; A[i * 3 + 2] = b; WET[i] = wet;
    }
  }
  // ---------- 2. свет ----------
  const amb = new ImageData(WW, WH), lamp = new ImageData(WW, WH), ad = amb.data, ld = lamp.data;
  const moon = [-.45, -.55, .7], mL = Math.hypot(...moon); moon[0] /= mL; moon[1] /= mL; moon[2] /= mL;
  const gam = v => Math.round(255 * Math.pow(clamp(v), 1 / 2.2));
  for (let py = 1; py < WH - 1; py++) {
    const y = py + WY0;
    for (let px = 1; px < WW - 1; px++) {
      const x = px + WX0, i = py * WW + px, k = KIND[i];
      const dx = (Hh[i + 1] - Hh[i - 1]) * (k ? 3.5 : 5), dy = (Hh[i + WW] - Hh[i - WW]) * (k ? 3.5 : 5);
      let nx, ny, nz;
      if (k === 0) { nx = -dx; ny = -dy; nz = 1; }
      else { nx = -dx; ny = -1 - dy * .6; nz = .55; }               // мостовая смотрит вверх, чуть к камере
      const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      // положение точки в 3D (грубо): стена в плоскости z=0, мостовая уходит к камере
      let pX = x, pY = y, pZ = Hh[i] * 6;
      if (k === 1) { const d = (y - GROUND) / 600; pY = GROUND; pZ = 40 + 666.7 * Math.log((.55 + .9 * d) / .55) * .9; pX = LAMP.x + (x - LAMP.x) / (.55 + .9 * d); }
      let lx = LAMP.x - pX, ly = LAMP.y - pY, lz = LAMP.z - pZ; const dist = Math.hypot(lx, ly, lz); lx /= dist; ly /= dist; lz /= dist;
      const fall = 1 / (1 + Math.pow(dist / 360, 2) * 2.2);
      const diff = Math.max(0, nx * lx + ny * ly + nz * lz) * fall;
      const wet = WET[i];
      // блики (Блинн): к камере
      let vx = 960 - pX, vy = 420 - pY, vz = 1900 - pZ; const vl = Math.hypot(vx, vy, vz); vx /= vl; vy /= vl; vz /= vl;
      let hx = lx + vx, hy = ly + vy, hz = lz + vz; const hl = Math.hypot(hx, hy, hz); hx /= hl; hy /= hl; hz /= hl;
      const nh = Math.max(0, nx * hx + ny * hy + nz * hz);
      let spec = wet * (Math.pow(nh, 40 + wet * 80) * 1.2) * fall * 1.6;
      if (k === 1) {   // дорожка отражения фонаря на мокрой мостовой
        const d = (y - GROUND) / 600, wdt = 14 + 70 * d, col = Math.exp(-Math.pow((x - LAMP.x) / wdt, 2)) * Math.exp(-d * 1.8) * .45;
        spec += col * wet * (.35 + .65 * Math.pow(Math.max(0, ny * -1), 2)) * (wet > 1.2 ? 1.2 : .6) * (.6 + .8 * fbm(_n3, x * .05, y * .3, 2));
      }
      const r = A[i * 3], g = A[i * 3 + 1], b = A[i * 3 + 2];
      const ma = Math.max(0, nx * moon[0] + ny * moon[1] + nz * moon[2]) * .5 + .18;
      const sky = k === 1 && wet > 1.2 ? .10 : 0;      // лужи отражают ночное небо
      const o = i * 4;
      ad[o] = gam(r * ma * .16 + sky * .08); ad[o + 1] = gam(g * ma * .2 + sky * .1); ad[o + 2] = gam(b * ma * .38 + sky * .22 + .006); ad[o + 3] = 255;
      const L = 3.2;
      ld[o] = gam((r * diff * 1.0 * L + spec * 1.0)); ld[o + 1] = gam((g * diff * .78 * L + spec * .85)); ld[o + 2] = gam((b * diff * .5 * L + spec * .6)); ld[o + 3] = 255;
    }
  }
  return { amb: dofBake(amb), lamp: dofBake(lamp) };
}
// глубина резкости: стена и дальние камни размыты, ближние резкие
function dofBake(img) {
  const sharp = document.createElement('canvas'); sharp.width = WW; sharp.height = WH; sharp.getContext('2d').putImageData(img, 0, 0);
  const out = document.createElement('canvas'); out.width = WW; out.height = WH; const c = out.getContext('2d');
  c.filter = 'blur(3px)'; c.drawImage(sharp, 0, 0); c.filter = 'none';
  const sc = sharp.getContext('2d'); sc.globalCompositeOperation = 'destination-in';
  const g = sc.createLinearGradient(0, GROUND + 40 - WY0, 0, GROUND + 260 - WY0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  sc.fillStyle = g; sc.fillRect(0, 0, WW, WH);
  c.drawImage(sharp, 0, 0);
  return out;
}

// ---------- в кадре ----------
function envDraw(lamp) {
  X.drawImage(ENV.amb, WX0, WY0);
  if (lamp > 0) { X.save(); X.globalCompositeOperation = 'lighter'; X.globalAlpha = clamp(lamp); X.drawImage(ENV.lamp, WX0, WY0); X.restore(); }
}
// чугунный фонарь (живой мир: без «мятья»)
function lampPostReal(lamp) {
  const c = X, x = LAMP.post;
  const metal = (x0, x1) => { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#0B0D10'); g.addColorStop(.35, '#2A3036'); g.addColorStop(.5, lamp > 0 ? '#6A5A44' : '#3A4048'); g.addColorStop(.7, '#15181C'); g.addColorStop(1, '#07080A'); return g; };
  // столб с основанием
  c.fillStyle = metal(x - 16, x + 16); c.beginPath(); c.moveTo(x - 11, 250); c.lineTo(x + 11, 250); c.lineTo(x + 15, GROUND + 20); c.lineTo(x - 15, GROUND + 20); c.fill();
  c.fillStyle = metal(x - 34, x + 34); c.beginPath(); c.moveTo(x - 22, GROUND - 60); c.lineTo(x + 22, GROUND - 60); c.lineTo(x + 34, GROUND + 34); c.lineTo(x - 34, GROUND + 34); c.fill();
  for (const yy of [GROUND - 64, 600, 380]) { c.fillStyle = metal(x - 20, x + 20); c.fillRect(x - 20, yy - 7, 40, 14); }
  // кронштейн
  c.strokeStyle = '#14171B'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, 262); c.bezierCurveTo(x - 30, 196, x - 80, 180, LAMP.x + 6, 178); c.stroke();
  c.lineWidth = 4; c.beginPath(); c.moveTo(x, 330); c.quadraticCurveTo(x - 50, 300, x - 70, 220); c.stroke();
  // фонарь: колпак, стёкла, донце
  const lx = LAMP.x, ly = LAMP.y;
  c.fillStyle = '#101317'; c.beginPath(); c.moveTo(lx - 50, ly - 40); c.lineTo(lx + 50, ly - 40); c.lineTo(lx + 8, ly - 78); c.lineTo(lx - 8, ly - 78); c.fill();
  const gl = c.createRadialGradient(lx, ly, 2, lx, ly, 52);
  if (lamp > 0) { gl.addColorStop(0, `rgba(255,252,235,${lamp})`); gl.addColorStop(.35, `rgba(255,214,140,${lamp})`); gl.addColorStop(1, `rgba(210,140,60,${.85 * lamp})`); }
  else { gl.addColorStop(0, '#3A3A40'); gl.addColorStop(1, '#1D1F25'); }
  c.fillStyle = gl; c.beginPath(); c.moveTo(lx - 42, ly - 40); c.lineTo(lx + 42, ly - 40); c.lineTo(lx + 30, ly + 30); c.lineTo(lx - 30, ly + 30); c.fill();
  c.strokeStyle = '#0E1013'; c.lineWidth = 4; c.beginPath(); c.moveTo(lx, ly - 40); c.lineTo(lx, ly + 30); c.moveTo(lx - 36, ly - 5); c.lineTo(lx + 36, ly - 5); c.stroke();
  c.fillStyle = '#0E1013'; c.fillRect(lx - 34, ly + 28, 68, 9);
  if (lamp > 0) { glow(lx, ly - 4, 260, '#FFCF86', .55 * lamp); glow(lx, ly - 4, 80, '#FFF4DA', .7 * lamp); }
}
// конус света в тумане
function lightConeReal(lamp, t) {
  if (lamp <= 0) return;
  const c = X; c.save(); c.globalCompositeOperation = 'screen';
  const g = c.createRadialGradient(LAMP.x, LAMP.y, 20, LAMP.x, LAMP.y + 300, 760);
  g.addColorStop(0, `rgba(255,214,150,${.32 * lamp})`); g.addColorStop(.6, `rgba(255,200,130,${.08 * lamp})`); g.addColorStop(1, 'rgba(255,200,130,0)');
  c.fillStyle = g; c.filter = 'blur(26px)'; c.beginPath(); c.moveTo(LAMP.x - 34, LAMP.y + 30); c.lineTo(LAMP.x + 34, LAMP.y + 30); c.lineTo(LAMP.x + 560, GROUND + 260); c.lineTo(LAMP.x - 560, GROUND + 260); c.closePath(); c.fill();
  c.restore();
}
// туман: медленно плывущая мягкая дымка (по экрану)
function fogReal(t, lamp, a = .16) {
  const c = X; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'screen'; c.globalAlpha = a;
  const off = (t * 22) % 512; c.filter = 'blur(30px)';
  c.drawImage(FOG, -off, 300, W + 1024, 900);
  c.restore();
}
let FOG = null;
// дождь (мировые координаты, 24 к/с, плавно)
const RAIN = []; { const r = rng('rain'); for (let i = 0; i < 520; i++) RAIN.push([r() * 4200 - 500, r() * 2600, 1400 + r() * 700, 22 + r() * 40, .35 + r() * .5]); }
function rainReal(t, lamp, x0 = -400, x1 = 3600) {
  const c = X; c.save(); c.lineCap = 'round';
  for (const [rx, off, sp, len, a] of RAIN) {
    if (rx < x0 || rx > x1) continue;
    const y = ((off + t * sp) % 2400) - 800, x = rx + (y + 800) * -.06;
    if (y > GROUND + 500) continue;
    const near = Math.exp(-Math.pow(Math.hypot(x - LAMP.x, (y - LAMP.y - 260) * .6) / 520, 2));
    const al = a * (.10 + .55 * near * lamp);
    c.strokeStyle = `rgba(${200 + 55 * near * lamp},${215 + 25 * near * lamp},${235},${al})`; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - len * .06, y + len); c.stroke();
  }
  // брызги на мостовой
  const r = rng('splash' + Math.floor(t * 24));
  for (let i = 0; i < 26; i++) {
    const sx = x0 + r() * (x1 - x0), d = r(), sy = GROUND + 20 + d * d * 520, k = r();
    const near = Math.exp(-Math.pow((sx - LAMP.x) / 700, 2));
    c.strokeStyle = `rgba(230,225,215,${(.12 + .45 * near * lamp) * (1 - k)})`; c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(sx, sy, 4 + k * 14 * (.5 + d), (2 + k * 5) * (.5 + d), 0, 0, 6.283); c.stroke();
  }
  c.restore();
}
// ореол: мягкий отсвет ярких мест, как у объектива
function bloom(a = .14) {
  const s = layer('bloomS'); s.setTransform(1, 0, 0, 1, 0, 0);
  s.clearRect(0, 0, W, H); s.filter = 'blur(8px) brightness(.9) contrast(3)'; s.drawImage(X.canvas, 0, 0, W / 4, H / 4); s.filter = 'none';
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalCompositeOperation = 'screen'; X.globalAlpha = a; X.filter = 'blur(6px)'; X.drawImage(s.canvas, 0, 0, W / 4, H / 4, 0, 0, W, H); X.restore();
}
// кукла в мокрой мостовой: рисуем в слой, кладём отражение (перевёрнутое, размытое, с рябью), потом саму куклу,
// и подкрашиваем её светом сцены (тёплый у фонаря, синий в тени)
function reflectDraw(groundY, fn, lamp, o = {}) {
  const M = X.getTransform(), g = layer('doll'); g.setTransform(M);
  const prev = X; X = g; const ret = fn(); X = prev;
  // свет сцены на кукле
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
  const lp = M.transformPoint(new DOMPoint(LAMP.x, LAMP.y)), gr = g.createRadialGradient(lp.x, lp.y, 100 * M.a, lp.x, lp.y, 1500 * M.a);
  gr.addColorStop(0, `rgba(255,200,130,${.12 * lamp})`); gr.addColorStop(.5, `rgba(20,25,60,${.25 + .15 * (1 - lamp)})`); gr.addColorStop(1, `rgba(8,10,30,${.55 + .2 * (1 - lamp)})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (lamp < .5) { g.fillStyle = `rgba(5,8,25,${.5 * (1 - lamp * 2)})`; g.fillRect(0, 0, W, H); }
  g.restore();
  const gy = M.transformPoint(new DOMPoint(0, groundY)).y;
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.globalAlpha = o.reflA ?? .32; X.filter = 'blur(3px)';
  X.translate(0, 2 * gy); X.scale(1, -1);
  for (let k = 0; k < 6; k++) { const yy = gy - k * 30 - 30; X.drawImage(g.canvas, 0, yy, W, 30, Math.sin(k * 1.7) * 3, yy, W, 30); }
  X.restore();
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(g.canvas, 0, 0); X.restore();
  return ret;
}
// длинная тень куклы от фонаря на мостовой
function lampShadow(x, y, h, lamp) {
  const dir = Math.sign(x - LAMP.x) || 1, len = h * (1.2 + Math.abs(x - LAMP.x) / 900);
  X.save(); X.fillStyle = `rgba(4,3,10,${.5 * lamp})`; X.filter = 'blur(14px)';
  X.beginPath(); X.ellipse(x + dir * len * .5, y + 8, len * .55, h * .1, 0, 0, 6.283); X.fill(); X.restore();
}

function realBoot() {
  const t0 = performance.now();
  ENV = bakeEnv();
  // туман: голубоватая дымка с прозрачностью из шума
  const n = makeNoise(512, 60, 'fog', 0), c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const src = n.getContext('2d').getImageData(0, 0, 512, 512).data, im = g.createImageData(512, 512);
  for (let i = 0; i < 512 * 512; i++) { const v = src[i * 4] / 255; im.data[i * 4] = 150; im.data[i * 4 + 1] = 160; im.data[i * 4 + 2] = 190; im.data[i * 4 + 3] = Math.round(255 * v * v); }
  g.putImageData(im, 0, 0); FOG = c;
  console.log('env baked in', Math.round(performance.now() - t0), 'ms');
}

// Живая рука аниматора (не пластилин: плавно, 24 к/с, кожа, ногти, складки). x, y — кончик указательного пальца.
function realHand(x, y, o = {}) {
  const s = o.s ?? 1, c = X, rot = o.rot || 0;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const skin = (x0, y0, x1, y1) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#F2C2A6'); g.addColorStop(.45, '#E3A587'); g.addColorStop(.85, '#B9735C'); g.addColorStop(1, '#8E4E3F'); return g; };
  const finger = (x0, y0, x1, y1, r0, r1) => { const p = new Path2D(); const P = capsule(x0, y0, x1, y1, r0, r1, 18); p.moveTo(...P[0]); for (const q of P) p.lineTo(...q); p.closePath(); return p; };
  // рукав толстовки
  const sl = new Path2D(); sl.moveTo(-210, -2400); sl.lineTo(260, -2400); sl.lineTo(250, -470); sl.quadraticCurveTo(30, -420, -200, -470); sl.closePath();
  let g = c.createLinearGradient(-210, 0, 260, 0); g.addColorStop(0, '#1A2230'); g.addColorStop(.4, '#34445A'); g.addColorStop(.6, '#2C3A4E'); g.addColorStop(1, '#111722');
  c.fillStyle = g; c.fill(sl);
  c.save(); c.clip(sl); c.globalAlpha = .18; c.globalCompositeOperation = 'overlay'; NOISE_PAT.setTransform(new DOMMatrix().scale(.5)); c.fillStyle = NOISE_PAT; c.fillRect(-220, -2400, 500, 2000);
  c.globalAlpha = .25; c.globalCompositeOperation = 'source-over'; c.strokeStyle = '#0B0F16'; c.lineWidth = 6;
  for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(-200, -520 - k * 34); c.quadraticCurveTo(30, -470 - k * 40, 250, -520 - k * 30); c.stroke(); }   // манжета-резинка
  c.restore();
  // кисть (тыльная сторона) и запястье
  const palm = new Path2D(); palm.moveTo(-150, -470); palm.bezierCurveTo(-190, -330, -170, -230, -110, -170); palm.bezierCurveTo(-40, -120, 120, -120, 190, -175); palm.bezierCurveTo(230, -260, 230, -390, 200, -470); palm.closePath();
  c.fillStyle = skin(-170, -400, 230, -150); c.fill(palm);
  // согнутые пальцы: костяшки снизу
  for (const [fx, r] of [[70, 34], [128, 31], [180, 26]]) {
    const p = finger(fx, -200, fx - 8, -128, r, r * .92); c.fillStyle = skin(fx - r, -200, fx + r, -110); c.fill(p);
    c.strokeStyle = 'rgba(120,60,45,.45)'; c.lineWidth = 2.2; c.beginPath(); c.arc(fx - 6, -150, r * .55, .3, 2.8); c.stroke();
  }
  // большой палец
  const th = finger(-150, -300, -80, -180, 38, 30); c.fillStyle = skin(-190, -300, -50, -160); c.fill(th);
  // указательный
  const ix = finger(-6, -300, 0, -30, 36, 31); g = c.createLinearGradient(-40, 0, 40, 0); g.addColorStop(0, '#F4C7AC'); g.addColorStop(.4, '#E8AB8D'); g.addColorStop(.8, '#BE7A61'); g.addColorStop(1, '#934F40');
  c.fillStyle = g; c.fill(ix);
  // подповерхностное рассеяние: тёплый край
  c.save(); for (const p of [palm, ix, th]) { c.save(); c.clip(p); c.shadowColor = 'rgba(200,70,50,.55)'; c.shadowBlur = 18; c.lineWidth = 14; c.strokeStyle = 'rgba(200,70,50,.25)'; c.stroke(p); c.restore(); } c.restore();
  // складки на суставах указательного, жилки на тыльной стороне
  c.strokeStyle = 'rgba(110,55,42,.5)'; c.lineWidth = 2;
  for (const yy of [-215, -205, -122, -114]) { c.beginPath(); c.moveTo(-22, yy); c.quadraticCurveTo(-4, yy + 5, 22, yy - 1); c.stroke(); }
  c.strokeStyle = 'rgba(90,110,150,.18)'; c.lineWidth = 7; c.beginPath(); c.moveTo(-60, -460); c.bezierCurveTo(-40, -380, 20, -320, 60, -230); c.stroke();
  c.beginPath(); c.moveTo(60, -460); c.bezierCurveTo(70, -390, 110, -330, 130, -240); c.stroke();
  // ноготь
  const nl = new Path2D(); nl.moveTo(-20, -86); nl.quadraticCurveTo(0, -96, 20, -86); nl.lineTo(18, -34); nl.quadraticCurveTo(0, -20, -18, -34); nl.closePath();
  g = c.createLinearGradient(-20, -90, 20, -30); g.addColorStop(0, '#F1C3B4'); g.addColorStop(.7, '#E7AFA0'); g.addColorStop(1, '#FBEDE4'); c.fillStyle = g; c.fill(nl);
  c.strokeStyle = 'rgba(150,80,65,.6)'; c.lineWidth = 2; c.stroke(nl);
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-7, -70, 4, 12, -.1, 0, 6.283); c.fill();
  // следы пластилина на подушечках и под ногтем (аниматор только что лепил)
  c.fillStyle = 'rgba(201,163,106,.85)'; c.beginPath(); c.ellipse(-10, -26, 14, 6, .2, 0, 6.283); c.fill();
  c.fillStyle = 'rgba(201,163,106,.7)'; c.beginPath(); c.ellipse(70, -112, 12, 5, 0, 0, 6.283); c.ellipse(-110, -176, 10, 5, .5, 0, 6.283); c.fill();
  // фактура кожи
  for (const p of [palm, ix, th]) { c.save(); c.clip(p); c.globalCompositeOperation = 'overlay'; c.globalAlpha = .12; NOISE_PAT.setTransform(new DOMMatrix().scale(.35)); c.fillStyle = NOISE_PAT; c.fillRect(-250, -520, 500, 520); c.restore(); }
  c.restore();
}
