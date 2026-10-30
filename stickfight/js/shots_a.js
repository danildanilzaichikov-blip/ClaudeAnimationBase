// Планы 1–6. Время в каждом плане локальное (с нуля). Персонаж с f = -1 смотрит влево.

const mkHero = (o = {}) => new Actor('hero', Object.assign({ scarf: true, cup: true, seed: 1 }, o));
const mkShkaf = () => new Actor('shkaf', { s: 1.18, lw: 5.6, prop: { hr: 0.82, sp2: 1.08 }, seed: 2 });
const mkShilo = () => new Actor('shilo', { s: 0.86, lw: 4.0, tuft: true, seed: 3 });
const mkTsep = (o = {}) => new Actor('tsep', Object.assign({ chain: true, prop: { ua: 1.1, fa: 1.08 }, seed: 4 }, o));
const mkPalka = () => new Actor('palka', { staff: true, band: true, seed: 5 });
const mkBoss = () => new Actor('boss', { hat: true, cane: true, seed: 6, s: 1.04 });
// стойка: передняя нога на fw вперёд, задняя на bk назад
function stance(a, t, x, f, pose, ex = {}, e = 'io', fw = 20, bk = 22, gy = 0) {
  return a.k(t, Object.assign({ x, f, pose, L1: [x + f * fw, gy], L2: [x - f * bk, gy] }, ex), e);
}

// Чайник в руке героя (рисуется поверх руки), струя в чашку.
function drawKettle(ctx, x, y, ang, f) {
  ctx.save(); ctx.translate(x, y); ctx.scale(f, 1); ctx.rotate(-ang * D2R);
  washPoly(ctx, [[-14, -8], [14, -8], [16, -30], [-16, -30]], '#6c7c86', 330, 0.3);
  inkLine(ctx, [[-14, -8], [-16, -30], [16, -30], [14, -8], [-14, -8]], 1.6, PAL.ink, 331, 0.3);
  inkCurve(ctx, [[15, -20], [24, -16], [31, -6]], 2.6, PAL.ink, 332, 0.3);
  inkCurve(ctx, [[-10, -8], [0, 4], [10, -8]], 2, PAL.ink, 333, 0.3);
  ctx.restore();
  const a = (-ang) * D2R, sx = x + f * (31 * Math.cos(a) - (-6) * Math.sin(a)), sy = y + (31 * Math.sin(a) + (-6) * Math.cos(a));
  return [sx, sy];
}
function heroKettle(ctx, w, q, t) {
  if (!q.kettle) return;
  const sp = drawKettle(ctx, w.Hn1[0], w.Hn1[1], q.wa, q.f);
  if (q.wa > 38) {
    const c = w.Hn2, top = [c[0], c[1] + 9], u = clamp((q.wa - 38) / 20, 0, 1);
    ctx.globalAlpha = u; inkCurve(ctx, [sp, [lerp(sp[0], top[0], 0.4) + 2, lerp(sp[1], top[1], 0.3)], top], 2.6, PAL.tea, 334, 0.4); ctx.globalAlpha = 1;
  }
}

// ── 1. Закат. Рынок, герой наливает себе чай ──────────────────────────────
{
  const h = mkHero({ extra: heroKettle });
  const X = 108;
  h.k(0, { x: X, f: -1, pose: 'stand', ua1: 20, fa1: 72, ua2: 12, fa2: 92, L1: X - 10, L2: X + 12, eye: 'calm', kettle: true, hot: 0, wa: 0 });
  h.k(0.9, { nk: 8 });
  h.k(1.6, { ua1: 52, fa1: 46, ua2: 30, fa2: 72, sp: 6, nk: 18 }, 'io');
  h.k(2.1, { wa: 64 }, 'out');
  h.k(2.3, { hot: 0.3 });
  h.k(3.3, { wa: 66, hot: 1 }, 'lin');
  h.k(3.7, { wa: 0 }, 'io');
  // ставит чайник на прилавок
  h.k(4.0, { ua1: 30, fa1: 40, sp: 10 });
  h.k(4.45, { sp: 26, ch: 6, ik1w: 1, ik1: [52, 124], nk: 12 }, 'io');
  h.k(4.5, { kettle: false, setKettle: true });
  h.k(5.0, { sp: 4, ch: 3, ik1w: 0, ua1: 4, fa1: 16, ua2: -6, fa2: 128, nk: 10 }, 'io');
  h.k(5.6, { nk: 4 });
  shot({
    name: 'Закат', dur: 5.6, sky: 'sunset', sunY: 0.58, tin: { type: 'cut' }, actors: [h],
    cam: [[0, 0, 300, 1.15], [5.6, 75, 140, 2.5, 'io']], hand: 3,
    sfx: [{ t: 0.3, type: 'amb', dur: 60 }, { t: 2.05, type: 'pour', dur: 1.5 }, { t: 4.5, type: 'clink' }],
    bg: (ctx, t, cam) => {
      layer(ctx, cam, 0.25, () => city(ctx, 11, -1400, 1600, 40, 120, 300, 'rgba(160,110,110,0.30)'));
      layer(ctx, cam, 0.5, () => city(ctx, 23, -1300, 1500, 0, 90, 220, 'rgba(120,80,80,0.30)'));
      layer(ctx, cam, 1, () => { groundPlane(ctx, -1500, 1500); stall(ctx, -40, { kettle: false }); });
      layer(ctx, cam, 0.85, () => lanternString(ctx, -700, 700, 330, 9, 0.5));
    },
    fg: (ctx, t, cam) => { if (t > 4.5) drawKettle(ctx, 52, 124 - 2, 0, -1); },
  });
}

// ── 2. Чашка крупно. Тень ─────────────────────────────────────────────────
{
  const h = mkHero();
  h.k(0, { x: 0, f: 1, pose: 'teaIdle', L1: 9, L2: -9, eye: 'calm', hot: 1, nk: 10 });
  h.k(0.35, {});
  h.k(1.4, { ik2w: 1, ik2: [17, 139], nk: 16, sp: 3, ch: 5 }, 'io');
  h.k(1.75, { eye: 'calm' });
  h.k(1.8, { eye: 'open' }, 'hold');
  h.k(2.3, { nk: 2, ch: 1 }, 'out');
  h.k(2.9, { eye: 'focus' }, 'hold');
  shot({
    name: 'Чашка', dur: 2.9, sky: 'sunset', sunY: 0.55, tin: { type: 'cut' }, actors: [h], hand: 0.8,
    cam: [[0, 14, 150, 5.0], [2.9, 16, 150, 5.6, 'lin']],
    sfx: [{ t: 1.75, type: 'sting' }],
    bg: (ctx, t, cam) => { layer(ctx, cam, 0.4, () => city(ctx, 31, -800, 800, 0, 150, 320, 'rgba(150,100,100,0.25)')); layer(ctx, cam, 0.9, () => lantern(ctx, -50, 210, 0.6)); },
    over: (ctx, t) => {
      // тень входящих накрывает кадр справа налево
      const u = unlerp(1.45, 2.4, t); if (u <= 0) return;
      const x = lerp(W + 200, W * 0.35, EASE.out(u));
      ctx.fillStyle = 'rgba(60,40,60,0.28)'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(x - 160, H); ctx.closePath(); ctx.fill();
    },
  });
}

// ── 3. Пятеро. Низкий ракурс ──────────────────────────────────────────────
{
  const sk = mkShkaf(), sl = mkShilo(), ts = mkTsep(), pk = mkPalka(), bs = mkBoss();
  const ends = { pk: -190, sl: -80, bs: 30, sk: 150, ts: 275 };
  walk(pk, 0, 2.3, ends.pk + 430, ends.pk, { stride: 54, spec: { f: -1, wa: -70, eye: 'angry', ua1: 150, fa1: 40 }, swing: 4 });
  pk.k(0, { f: -1, x: ends.pk + 430, ua1: 160, fa1: 50, ua2: 150, fa2: 55, wa: -80, eye: 'angry', two: false });
  walk(sl, 0.15, 2.4, ends.sl + 430, ends.sl, { stride: 44, y: 78, spec: { f: -1, eye: 'angry' }, swing: 24 });
  sl.k(0, { f: -1, x: ends.sl + 430, y: 78, eye: 'angry' });
  walk(bs, 0.3, 2.6, ends.bs + 430, ends.bs, { stride: 50, y: 93, spec: { f: -1, eye: 'smug', sp: -3, ch: -4, nk: -6, wa: 100 }, swing: 8, ua1: 25 });
  bs.k(0, { f: -1, x: ends.bs + 430, y: 93, eye: 'smug', ua1: 25, fa1: 40, wa: 100 });
  walk(sk, 0.1, 2.5, ends.sk + 430, ends.sk, { stride: 60, y: 106, spec: { f: -1, eye: 'angry', sp: 8 }, swing: 10 });
  sk.k(0, { f: -1, x: ends.sk + 430, y: 106, eye: 'angry', sp: 8 });
  walk(ts, 0.25, 2.6, ends.ts + 430, ends.ts, { stride: 54, spec: { f: -1, eye: 'angry' }, swing: 6, ua1: 30 });
  ts.k(0, { f: -1, x: ends.ts + 430, ua1: 30, fa1: 20, eye: 'angry' });
  // после остановки: каждый показывает себя
  sk.k(2.9, { nk: -25, ch: -3 }, 'io'); sk.k(3.05, { nk: 30 }, 'in'); sk.k(3.35, { nk: 6 }, 'back'); sk.k(3.6, { pose: 'guard', y: 100, eye: 'angry' }); sk.k(4.8, {});
  sl.k(2.6, { pose: 'guard', y: 76 }); for (let i = 0; i < 9; i++) sl.k(2.8 + i * 0.22, { y: i % 2 ? 72 : 78 }, i % 2 ? 'out' : 'in');
  ts.k(2.8, { ua1: 170, fa1: 30 }); for (let i = 0; i < 6; i++) ts.k(3.0 + i * 0.3, { ua1: i % 2 ? 150 : 200, fa1: i % 2 ? 40 : 20 }, 'io');
  pk.k(2.7, { ua1: 160 }); pk.k(3.1, { ua1: 70, fa1: 40, wa: 30, two: true }, 'back'); pk.k(3.4, { pose: 'guard', ua1: 60, fa1: 70, wa: 50, two: true }); pk.k(4.8, {});
  bs.k(2.8, { ua1: 25, wa: 100 }); bs.k(3.2, { ua1: 90, fa1: 6, wa: 2, sp: -2 }, 'back'); bs.k(4.1, {}); bs.k(4.5, { nk: 4 }); bs.k(4.8, {});
  shot({
    name: 'Пятеро', dur: 4.8, sky: 'dusk', sunY: 0.66, tin: { type: 'whip', d: 0.36, dir: 1 }, actors: [pk, sl, bs, sk, ts], hand: 2,
    cam: [[0, 140, 128, 2.3], [2.6, 45, 120, 2.5, 'out'], [3.2, 40, 120, 2.5], [4.8, 35, 122, 2.68, 'io']],
    sfx: [{ t: 0.2, type: 'steps', dur: 2.4 }, { t: 3.05, type: 'crack' }, { t: 3.0, type: 'chain', dur: 1.8 }, { t: 3.1, type: 'whoosh', v: 0.5 }, { t: 3.25, type: 'clack', v: 0.6 }],
    bg: (ctx, t, cam) => {
      layer(ctx, cam, 0.3, () => city(ctx, 41, -1200, 1500, 20, 160, 360, 'rgba(120,80,110,0.28)'));
      layer(ctx, cam, 0.65, () => { wallBricks(ctx, -1000, 1200, 0, 260, 'rgba(190,140,120,0.35)', 44); lanternString(ctx, -600, 800, 360, 8, 0.7); });
      layer(ctx, cam, 1, () => groundPlane(ctx, -1500, 1500, '#dcc49f'));
    },
  });
}

// ── 4. Вздох. Крупно герой, чашку не ставит ──────────────────────────────
{
  const h = mkHero(), sk = mkShkaf();
  h.k(0, { x: 0, f: 1, pose: 'teaIdle', L1: 9, L2: -9, eye: 'focus', hot: 1 });
  h.k(0.3, {});
  h.k(0.95, { ch: -6, nk: -4, ua1: 9, y: 92 }, 'io');           // вдох
  h.k(1.7, { ch: 7, nk: 12, ua1: 2, y: 90, eye: 'calm' }, 'io'); // выдох
  h.k(2.05, { eye: 'focus', nk: 2 }, 'out');
  stance(h, 2.6, 0, 1, 'teaGuard', { eye: 'focus' }, 'out');
  h.k(3.0, {});
  sk.k(0, { x: 205, f: -1, pose: 'guard', y: 100, L1: 175, L2: 240, eye: 'angry' });
  sk.k(2.3, {}); sk.k(2.95, { pose: 'hayLoad', x: 215 }, 'io'); sk.k(3.0, {});
  shot({
    name: 'Вздох', dur: 3.0, sky: 'dusk', sunY: 0.7, tin: { type: 'cut' }, actors: [sk, h], hand: 1,
    cam: [[0, 8, 148, 4.4], [2.0, 10, 148, 4.6, 'lin'], [3.0, 50, 135, 3.0, 'io2']],
    sfx: [{ t: 0.95, type: 'breath' }, { t: 2.7, type: 'whoosh', v: 0.4 }],
    bg: (ctx, t, cam) => { layer(ctx, cam, 0.35, () => city(ctx, 51, -800, 900, 0, 160, 340, 'rgba(130,90,110,0.25)')); layer(ctx, cam, 0.8, () => lanternString(ctx, -400, 500, 260, 4, 0.7)); },
  });
}

// ── 5. Шкаф. Тяжёлый замах мимо, толчок, лавка вдребезги ──────────────────
{
  const h = mkHero(), sk = mkShkaf(), SX = -330;
  stance(h, 0, -40, 1, 'teaGuard', { eye: 'focus', hot: 1 });
  h.k(0.55, {});
  h.k(0.78, { y: 56, sp: 44, ch: 14, nk: -8, ua1: 30, fa1: 95 }, 'out');   // нырок под удар
  h.k(0.98, {});
  h.k(1.0, { f: -1, L1: -62, L2: -20, ua1: 60, fa1: 80 }, 'hold');       // разворот в низкой стойке
  h.k(1.1, { y: 74, sp: 18, ch: 6, ua1: 96, fa1: 6, nk: 0 }, 'in');      // толчок ладонью в спину
  h.k(1.4, { y: 82, sp: 8, ua1: 70, fa1: 40 }, 'out');
  h.k(1.9, { pose: 'teaIdle', L1: -50, L2: -32, eye: 'calm' }, 'io');
  h.k(2.25, { nk: 28 }, 'io'); h.k(2.7, { nk: 6 }, 'io');               // смотрит в чашку: цела
  h.k(3.4, { ch: 6 }); h.k(3.9, {});
  sk.k(0, { x: 140, f: -1, pose: 'hayLoad', y: 100, L1: 105, L2: 172, eye: 'angry' });
  sk.k(0.5, { sp: -15, ch: -12, ua2: -86 }, 'io');                      // замах держится — упреждение
  sk.k(0.8, { pose: 'hay', x: 82, L1: 30, y: 96 }, 'in');               // удар
  sk.k(1.02, { pose: 'hayOver', x: 18, L2: -15, y: 92 }, 'out');        // проваливается
  sk.k(1.12, { x: -40, sp: 62, eye: 'shock' }, 'lin');
  sk.k(1.35, { x: -130, L1: -150, sp: 68, ch: 10, nk: -10, ua1: 150, fa1: 20, ua2: 140, fa2: 30 }, 'in2');
  sk.k(1.55, { x: -205, L2: -175, y: 88, sp: 75 }, 'lin');               // врезается в лавку
  sk.k(1.7, { x: -235, rot: 30, eye: 'ko', L1: null, L2: null, th1: 40, sh1: 40, th2: 10, sh2: 30 }, 'out');
  sk.k(2.15, { pose: 'lieFace', x: -255, y: 10 }, 'in2');
  sk.k(2.3, { y: 12 }, 'back'); sk.k(3.9, {});
  const ptB = () => [-30, 150];
  shot({
    name: 'Шкаф', dur: 3.9, sky: 'dusk', sunY: 0.74, tin: { type: 'cut' }, actors: [h, sk],
    cam: [[0, 45, 130, 2.95], [0.9, 15, 126, 3.05, 'io'], [1.7, -150, 128, 2.5, 'out'], [2.6, -140, 128, 2.6], [3.9, -100, 134, 2.9, 'io']],
    impacts: [
      { t: 1.13, p: () => [-12, 140], victim: 'shkaf', snd: 'push', s: 0.8 },
      { t: 1.56, x: -228, y: 160, big: true, victim: 'shkaf', snd: 'crash', s: 1.2, stop: 0.2 },
      { t: 2.15, x: -255, y: 10, s: 0.7, snd: 'thud', silent: false, stop: 0.04, shake: 9 },
    ],
    debris: [{ t: 1.58, x: -220, y: 150, n: 12, spread: 200, vx: -120, up: 300, size: 26, w: 4 }, { t: 1.6, x: -230, y: 210, n: 8, spread: 160, vx: -60, up: 200, size: 16, w: 3, col: '#c94b36' }],
    dust: [{ t: 2.15, x: -255, s: 1.4, n: 9 }, { t: 0.8, x: 30, s: 0.7 }],
    sfx: [{ t: 0.15, type: 'growl' }, { t: 0.72, type: 'whoosh', v: 1.2 }],
    bg: (ctx, t, cam) => {
      layer(ctx, cam, 0.3, () => city(ctx, 61, -1200, 1200, 20, 150, 330, 'rgba(120,80,110,0.28)'));
      layer(ctx, cam, 0.8, () => lanternString(ctx, -800, 400, 330, 6, 0.75));
      layer(ctx, cam, 1, () => { groundPlane(ctx, -1500, 1500); stall(ctx, SX, { broken: t > 1.56 ? 1 : 0, kettle: true }); });
    },
  });
}

// ── 6. Шило. Серия мимо, кулак в столб, капля на краю ─────────────────────
{
  const h = mkHero(), sl = mkShilo(), POLE = -132;
  stance(h, 0, -15, 1, 'teaGuard', { eye: 'focus', hot: 0.8 });
  h.k(0.9, {});
  h.k(1.06, { nk: -16, sp: -8, ch: -8, x: -24 }, 'out');                              // уклон от джеба
  h.k(1.18, { sp: 6, ch: 4, nk: 4 }, 'io');
  stance(h, 1.3, -50, 1, 'teaGuard', { sp: -6, nk: -12 }, 'out');                    // шаг назад
  h.k(1.5, { sp: -20, ch: -12, nk: -16 }, 'out');                                     // откидывается от кросса
  h.k(1.6, { sp: 6, ch: 4, nk: 4 }, 'io');
  h.k(1.7, { pose: 'parry' }, 'snap');                                                // отбив ладонью
  h.k(1.85, { ua1: 56, fa1: 62 }, 'out');
  stance(h, 2.05, -92, 1, 'teaGuard', { y: 90 }, 'out');                              // отскок от ноги
  h.k(2.36, { y: 85 }, 'io');
  h.k(2.5, { y: 54, sp: 46, ch: 14, nk: -8, ua1: 30, fa1: 95 }, 'out');             // нырок
  h.k(2.62, { x: -60, L1: -10, L2: -88 }, 'io');
  h.k(2.85, { x: 6, f: -1, L1: -14, L2: 30, y: 70, sp: 24 }, 'out');                // проскальзывает за спину
  h.k(3.2, { pose: 'teaIdle', L1: -2, L2: 16, eye: 'focus', drop: 1 }, 'io');
  h.k(3.5, { nk: 24 }, 'io');
  h.k(4.4, { eye: 'calm', drop: 0.4 }, 'hold');
  h.k(4.55, { nk: 6, drop: 0 }, 'io');
  h.k(4.8, { f: 1 }, 'hold');
  walk(h, 4.85, 5.8, 8, 110, { spec: { ua2: -6, fa2: 128, eye: 'calm' }, ua2: -6 });
  // Шило: сальто со штабеля ящиков, приземление, серия
  sl.k(0, { x: 270, y: 236, f: -1, pose: 'guard', L1: [262, 150], L2: [290, 150], eye: 'angry' });
  sl.k(0.2, { y: 222, sp: 30 }, 'io');
  sl.k(0.3, { y: 255, x: 230, L1: null, L2: null, pose: 'tuck', rot: -60 }, 'out');
  sl.k(0.5, { y: 150, x: 150, rot: -300 }, 'lin');
  sl.k(0.62, { y: 70, x: 108, rot: -360, pose: 'guardLow', L1: 90, L2: 128 }, 'in2');
  sl.k(0.75, { rot: -360, y: 74 }, 'back');
  const jab = (t, x, big) => {
    sl.k(t - 0.1, { pose: big ? 'crossLoad' : 'jabLoad', x: x + 6 }, 'io');
    sl.k(t, { pose: big ? 'cross' : 'jab', x, L1: x - 18, L2: x + 20 }, 'in');
    sl.k(t + 0.12, { pose: 'guard', y: 74, x: x - 2 }, 'out');
  };
  sl.k(0.85, { pose: 'guard', rot: -360 });
  jab(1.04, 80); jab(1.26, 62); jab(1.48, 44, true);
  sl.k(1.6, { pose: 'jabLoad', x: 36 }, 'io'); sl.k(1.7, { pose: 'jab', x: 30, L1: 12, L2: 50 }, 'in'); sl.k(1.82, { pose: 'guard', x: 28 }, 'out');
  // фронт-кик
  sl.k(1.88, { pose: 'chamber1', x: 24, L1: null, L2: 50, sp: -8 }, 'out');
  sl.k(1.98, { pose: 'kick1', sp: -18, ch: -4 }, 'in');
  sl.k(2.14, { th1: 30, sh1: 20, x: 10 }, 'out');
  sl.k(2.24, { pose: 'guard', L1: -8, L2: 32, x: 10 }, 'io');
  // большой кросс в столб
  sl.k(2.42, { pose: 'crossLoad', x: 0, sp: 0, ch: -8, ua2: 0, fa2: 110, eye: 'angry' }, 'io');
  sl.k(2.56, { pose: 'cross', x: -48, L1: -70, L2: -20, sp: 34, ch: 10 }, 'in');
  sl.k(2.68, {});
  sl.k(2.95, { eye: 'shock', ua2: 70, fa2: 30, sp: 10, x: -35 }, 'out');
  sl.k(3.15, { eye: 'wince', ua2: 40, fa2: 110 }, 'io');
  for (let i = 0; i < 4; i++) sl.k(3.25 + i * 0.12, { fa2: i % 2 ? 110 : 60, ua2: i % 2 ? 40 : 55 }, 'io');
  sl.k(3.9, { pose: 'sitDazed', x: -40, eye: 'ko', L1: null, L2: null }, 'in2');
  sl.k(4.0, { y: 16 }, 'back'); sl.k(5.8, {});
  const poleShake = t => t > 2.6 ? Math.sin((t - 2.6) * 50) * 4 * Math.exp(-(t - 2.6) * 4) : 0;
  const cupPt = t => { const c = cupState(h, t); return c ? c : { x: 0, y: 130 }; };
  shot({
    name: 'Шило', dur: 5.8, sky: 'dusk', sunY: 0.8, tin: { type: 'wipe', d: 0.5 }, actors: [h, sl],
    cam: [[0, 150, 175, 2.3], [0.7, 60, 140, 3.0, 'out'], [1.05, 40, 140, 3.2], [2.4, -45, 140, 3.2, 'io'], [2.95, -60, 140, 3.0],
          [3.35, t => cupPt(t).x, t => cupPt(t).y + 6, 6.2, 'io2'], [4.4, t => cupPt(t).x, t => cupPt(t).y + 6, 6.6, 'lin'], [4.9, 20, 135, 2.8, 'io2'], [5.8, 95, 135, 2.8, 'io']],
    impacts: [
      { t: 1.71, p: () => [-20, 162], snd: 'block', s: 0.6, stop: 0.06 },
      { t: 2.6, x: POLE + 6, y: 150, big: true, victim: 'shilo', snd: 'bigmetal', s: 1.1, stop: 0.22 },
      { t: 3.9, x: -40, y: 16, s: 0.5, snd: 'thud', stop: 0.03, shake: 5 },
    ],
    dust: [{ t: 0.62, x: 108, s: 1 }, { t: 2.05, x: -92, s: 0.6 }, { t: 3.9, x: -40, s: 0.9 }],
    sfx: [{ t: 0.25, type: 'whoosh', v: 0.6 }, { t: 0.62, type: 'land' }, { t: 1.0, type: 'whoosh', v: 0.5 }, { t: 1.22, type: 'whoosh', v: 0.5 }, { t: 1.44, type: 'whoosh', v: 0.7 }, { t: 1.95, type: 'whoosh', v: 0.8 }, { t: 2.52, type: 'whoosh', v: 1 }, { t: 3.2, type: 'ow' }, { t: 3.4, type: 'heart', v: 0.6 }],
    bg: (ctx, t, cam) => {
      layer(ctx, cam, 0.35, () => city(ctx, 71, -1000, 1000, 120, 160, 360, 'rgba(110,80,110,0.25)'));
      layer(ctx, cam, 0.7, () => { wallBricks(ctx, -900, 900, 0, 380, 'rgba(176,120,104,0.42)', 72); laundry(ctx, -500, 300, 360, 73); });
      layer(ctx, cam, 1, () => {
        groundPlane(ctx, -1200, 1200, '#d8bf9a');
        // ящики справа
        for (let k = 0; k < 2; k++) { const y0 = k * 75; washPoly(ctx, [[235, y0], [320, y0], [320, y0 + 75], [235, y0 + 75]], '#b68f63', 74 + k, 0.4); inkLine(ctx, [[235, y0], [235, y0 + 75], [320, y0 + 75], [320, y0], [235, y0], [320, y0 + 75]], 2, PAL.ink, 76 + k, 0.4); }
      });
    },
    mid: (ctx, t) => {
      // столб с фонарём (в плоскости действия)
      const s = poleShake(t);
      inkLine(ctx, [[POLE, 0], [POLE + s * 0.3, 160], [POLE + s, 330]], 7, PAL.ink, 77, 0.4);
      inkLine(ctx, [[POLE + s, 320], [POLE + s + 40, 320]], 3, PAL.ink, 78, 0.3);
      lantern(ctx, POLE + s + 40, 318, 0.8, s * 0.05);
    },
  });
}
