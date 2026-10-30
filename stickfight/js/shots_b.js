// Планы 7–12.

// ── 7. Лестница. Палка и Цепь: цепь обматывает своего, лбами ─────────────
{
  const gy = x => x < -150 ? 120 : x >= 150 ? 0 : 100 - 20 * Math.floor((x + 150) / 50);
  const G = x => [x, gy(x)];
  const h = mkHero(), pk = mkPalka();
  const ts = mkTsep({ chainPin: t => t >= 2.22 && t < 2.72 ? pk.pts(t).C : null });
  // герой на площадке
  h.k(0, { x: -215, y: 205, f: 1, pose: 'teaGuard', y: 205, L1: G(-195), L2: G(-238), eye: 'focus', hot: 0.6 });
  h.k(1.05, {});
  h.k(1.2, { pose: 'parry', y: 205 }, 'snap');                         // отбив шеста вверх
  h.k(1.45, { ua1: 56, fa1: 62, y: 205 }, 'out');
  h.k(1.72, { sp: -8, ch: -4 }, 'io');
  h.k(1.8, { ik1w: 1, ik1: t => { const w = pk.pts(t); return [w.Hn1[0] + w.wdir[0] * 92, w.Hn1[1] + w.wdir[1] * 92]; } }, 'out'); // ловит конец шеста
  h.k(2.05, {});
  h.k(2.22, { sp: -20, ch: -8, x: -228, y: 202 }, 'in2');               // дёргает на себя — под цепь
  h.k(2.4, { ik1w: 1 });
  h.k(2.48, { ik1w: 0, pose: 'palm', y: 200, x: -205, sp: 22 }, 'in');  // толчок ладонью
  h.k(2.75, { pose: 'teaGuard', y: 204, x: -212 }, 'out');
  h.k(3.3, { pose: 'teaIdle', y: 210, eye: 'calm' }, 'io');
  h.k(3.6, { nk: 30 }, 'io'); h.k(4.4, { nk: 30 }); h.k(4.8, { nk: -8, eye: 'focus' }, 'io'); h.k(5.4, {});
  // Палка поднимается по ступеням
  const pg = (t, x, ex = {}, e = 'io') => pk.k(t, Object.assign({ x, y: gy(x) + 84, L1: G(x - 20), L2: G(x + 24) }, ex), e);
  pg(0, 40, { f: -1, pose: 'guard', two: true, ua1: 64, fa1: 70, wa: 34, eye: 'angry' });
  pg(0.45, -10, { y: gy(-10) + 82 }); pg(0.85, -60, { y: gy(-60) + 84 });
  pg(1.0, -52, { ua1: 40, fa1: 100, sp: 4 });                           // взвод
  pg(1.17, -78, { ua1: 112, fa1: 8, wa: 10, sp: 22 }, 'in');            // тычок
  pg(1.35, -70, { ua1: 150, fa1: 20, wa: 20, sp: 4, nk: -10 }, 'out');  // отбит вверх
  pg(1.55, -62, { ua1: 64, fa1: 70, wa: 34, sp: 10 }, 'io');
  pg(1.62, -55, { ua1: 44, fa1: 100 }, 'io');
  pg(1.78, -82, { ua1: 112, fa1: 8, wa: 10, sp: 22 }, 'in');            // второй тычок — пойман
  pg(2.05, -82, {});
  pk.k(2.22, { x: -108, y: gy(-108) + 82, L1: G(-128), L2: G(-92), sp: 34, eye: 'shock' }, 'in2'); // выдернут вперёд
  pk.k(2.45, {});
  // отлетает назад, вниз, в Цепь
  pk.k(2.5, { x: -90, sp: -30, ch: -14, nk: -30, ua1: 150, fa1: 20, L1: null, L2: null, pose: 'fly', rot: -10, y: 190 }, 'out2');
  pk.k(2.78, { x: 0, y: 150, rot: -35, nk: -36 }, 'in2');
  pk.k(3.05, { x: 60, y: 95, rot: -70, eye: 'ko' }, 'in2');
  pk.k(3.4, { x: 112, y: 40, rot: -95, pose: 'sprawl' }, 'in2');
  pk.k(3.7, { pose: 'lieBack', x: 150, y: 9, eye: 'ko' }, 'out');
  pk.k(5.4, {});
  // Цепь: крутит цепь, поднимается следом, хлещет
  const tg = (t, x, ex = {}, e = 'io') => ts.k(t, Object.assign({ x, y: gy(x) + 88, L1: G(x - 18), L2: G(x + 22) }, ex), e);
  tg(0, 140, { f: -1, pose: 'guard', ua1: 170, fa1: 30, eye: 'angry' });
  for (let i = 1; i <= 5; i++) ts.k(i * 0.24, { ua1: i % 2 ? 205 : 150, fa1: i % 2 ? 15 : 45 }, 'io');
  tg(0.7, 90); tg(1.15, 40); tg(1.55, 20, { ua1: 205, fa1: 10, sp: -10 }, 'io');
  tg(1.95, 22, { ua1: 200, fa1: 20, sp: -14, ch: -8 }, 'io');            // замах
  tg(2.12, 6, { ua1: 82, fa1: 0, sp: 24, ch: 8, L1: G(-14) }, 'in');    // хлёст
  ts.k(2.45, { ua1: 70, fa1: 10, sp: 10 }, 'out');
  ts.k(2.66, { x: -2, sp: 30, eye: 'shock', ua1: 80 }, 'in2');           // цепь тянет к Палке
  ts.k(2.8, { x: 6, sp: -20, ch: -10, nk: -30, eye: 'ko', L1: null, L2: null, pose: 'fly', rot: -20, y: 140 }, 'out');
  ts.k(3.1, { x: 90, y: 80, rot: -70 }, 'in2');
  ts.k(3.45, { x: 175, y: 30, rot: -100, pose: 'sprawl' }, 'in2');
  ts.k(3.8, { pose: 'lieBack', x: 205, y: 9, f: 1 }, 'out');
  ts.k(5.4, {});
  const heads = t => { const a = pk.pts(t).Hd, b = ts.pts(t).Hd; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  shot({
    name: 'Лестница', dur: 5.4, sky: 'blue', tin: { type: 'dissolve', d: 0.4 }, actors: [ts, pk, h], gy,
    cam: [[0, -40, 190, 2.2], [1.0, -125, 205, 2.75, 'io'], [2.0, -120, 205, 2.75], [2.55, -60, 190, 2.5, 'io'], [3.1, 40, 130, 2.3, 'out'], [3.8, 60, 110, 2.3], [4.4, -120, 200, 2.7, 'io'], [5.4, -150, 205, 2.9]],
    impacts: [
      { t: 1.21, p: () => { const w = h.pts(1.21); return w.Hn1; }, snd: 'clack', s: 0.6 },
      { t: 2.5, p: () => pk.pts(2.5).C, victim: 'palka', snd: 'hit', s: 0.9 },
      { t: 2.74, p: () => heads(2.74), big: true, victim: 'tsep', snd: 'bonk', s: 1.1, stop: 0.2 },
      { t: 3.42, x: 120, y: 30, s: 0.5, snd: 'thud', stop: 0.03, shake: 7 },
      { t: 3.75, x: 200, y: 10, s: 0.5, snd: 'thud', stop: 0.03, shake: 6 },
    ],
    dust: [{ t: 3.42, x: 120, y: 20, s: 0.8 }, { t: 3.75, x: 200, s: 1 }],
    sfx: [{ t: 0.0, type: 'chain', dur: 2.0 }, { t: 1.12, type: 'whoosh', v: 0.6 }, { t: 1.72, type: 'whoosh', v: 0.6 }, { t: 2.08, type: 'whoosh', v: 1 }, { t: 2.22, type: 'chainwrap' }, { t: 3.0, type: 'tumble', dur: 0.8 }],
    bg: (ctx, t, cam) => {
      layer(ctx, cam, 0.3, () => city(ctx, 81, -1000, 1200, 40, 160, 380, 'rgba(90,90,140,0.25)', 0.6));
      layer(ctx, cam, 0.7, () => wallBricks(ctx, -900, 900, 0, 520, 'rgba(150,120,130,0.4)', 82));
      layer(ctx, cam, 1, () => {
        // ступени
        const pts = [[-1000, 120], [-150, 120]];
        for (let k = 0; k < 6; k++) pts.push([-150 + 50 * k, 100 - 20 * k], [-100 + 50 * k, 100 - 20 * k]);
        pts.push([150, 0], [1000, 0]);
        washPoly(ctx, pts.concat([[1000, -500], [-1000, -500]]), '#d6c09c', 83, 0.4);
        inkLine(ctx, [[-1000, 120], [-150, 120]].concat(...Array.from({ length: 6 }, (_, k) => [[-150 + 50 * k, 120 - 20 * k], [-150 + 50 * k, 100 - 20 * k], [-100 + 50 * k, 100 - 20 * k]])).concat([[150, 0], [1000, 0]]), 2.2, PAL.ink, 84, 0.4);
        inkLine(ctx, [[-400, 210], [-150, 210], [150, 90], [400, 90]], 3, PAL.ink, 85, 0.4); // перила
        for (let x = -375; x <= 375; x += 50) { const top = x < -150 ? 210 : x > 150 ? 90 : 210 - (x + 150) * 0.4; inkLine(ctx, [[x, gy(x)], [x, top]], 1.8, PAL.ink, 86 + x, 0.3); }
        lantern(ctx, -320, 320, 0.8);
      });
    },
  });
}

// ── 8. Окружили. Крыша ────────────────────────────────────────────────────
{
  const h = mkHero(), sk = mkShkaf(), sl = mkShilo(), pk = mkPalka(), ts = mkTsep();
  stance(h, 0, 0, 1, 'teaGuard', { eye: 'focus', hot: 0.5, wind: -1600 });
  h.k(0.8, { nk: 12, f: -1 }, 'io'); h.k(1.6, { nk: 0, f: 1 }, 'io'); h.k(2.2, { y: 82, sp: 10, nk: 6 }, 'io'); h.k(3.4, {});
  // поднимаются из-за края крыши и спрыгивают сверху
  sk.k(0, { x: -175, y: -60, f: 1, pose: 'guard', L1: null, L2: null, th1: 40, sh1: 90, th2: 10, sh2: 40, eye: 'angry', hide: false });
  sk.k(0.35, {}); stance(sk, 0.9, -175, 1, 'guard', { y: 100 }, 'out', 22, 26); sk.k(3.4, {});
  sl.k(0, { x: 190, y: 420, f: -1, pose: ['guard', 'tuck'], L1: null, L2: null });
  sl.k(0.55, {}); sl.k(0.9, { y: 70, pose: 'guardLow', L1: 172, L2: 210, rot: 0 }, 'in2'); sl.k(1.0, { y: 76 }, 'back'); sl.k(3.4, {});
  pk.k(0, { x: -300, y: -60, f: 1, pose: 'guard', two: true, wa: 40, L1: null, L2: null, th1: 40, sh1: 80, eye: 'angry' });
  pk.k(0.9, {}); stance(pk, 1.5, -300, 1, 'guard', { y: 84, two: true, wa: 40, ua1: 60, fa1: 70 }, 'out'); pk.k(3.4, {});
  ts.k(0, { x: 300, y: -60, f: -1, pose: 'guard', ua1: 170, fa1: 30, L1: null, L2: null, th1: 40, sh1: 80, eye: 'angry' });
  ts.k(1.2, {}); stance(ts, 1.8, 300, -1, 'guard', { ua1: 180, fa1: 20 }, 'out');
  for (let i = 0; i < 6; i++) ts.k(2.0 + i * 0.24, { ua1: i % 2 ? 205 : 150 }, 'io');
  shot({
    name: 'Окружили', dur: 3.4, sky: 'blue', body: 'moon', tin: { type: 'flash', d: 0.3 }, actors: [pk, ts, sk, sl, h],
    cam: [[0, 0, 150, 4.0], [0.9, 0, 148, 3.7, 'io'], [2.8, 0, 120, 2.25, 'io2'], [3.4, 0, 120, 2.2]],
    dust: [{ t: 0.9, x: 190, s: 0.8 }],
    sfx: [{ t: 0.05, type: 'heart' }, { t: 0.85, type: 'heart' }, { t: 0.9, type: 'land' }, { t: 1.65, type: 'heart' }, { t: 2.4, type: 'heart', v: 1.2 }, { t: 1.8, type: 'chain', dur: 1.6 }, { t: 0.2, type: 'wind', dur: 3 }],
    bg: (ctx, t, cam) => {
      layer(ctx, cam, 0.25, () => city(ctx, 91, -1300, 1300, -40, 100, 300, 'rgba(70,80,130,0.28)', 1));
      layer(ctx, cam, 0.6, () => { city(ctx, 92, -1100, 1100, -60, 60, 160, 'rgba(90,80,120,0.3)', 1); laundry(ctx, -420, 120, 250, 93); });
      layer(ctx, cam, 1, () => { roofSlab(ctx, -1200, 1200, 0, 94); chimney(ctx, 380, 0, 120, 95); });
    },
  });
}

// ── 9. Все разом. Чашка в воздухе, четверо за три секунды ─────────────────
{
  const h = mkHero(), sk = mkShkaf(), sl = mkShilo(), pk = mkPalka(), ts = mkTsep();
  const T0 = 0.42, T1 = 3.72;
  const air = t => {
    const p0 = h.pts(T0).Hn2, p1 = h.pts(T1).Hn2, T = T1 - T0, u = t - T0, g = 980;
    const vx = (p1[0] - p0[0]) / T, vy = (p1[1] - p0[1]) / T + 0.5 * g * T;
    return { x: p0[0] + vx * u, y: p0[1] + 1.5 + vy * u - 0.5 * g * u * u, spin: Math.sin(u * 2.2) * 0.25, tilt: 0 };
  };
  // герой
  stance(h, 0, 0, 1, 'teaGuard', { eye: 'focus', hot: 0.4, y: 82, sp: 10 });
  h.k(0.25, { ua2: -20, fa2: 140, y: 78 }, 'io');
  h.k(0.42, { ua2: 172, fa2: 8, y: 88, cup: air }, 'in');                       // подбрасывает чашку
  h.k(0.6, { ua2: 40, fa2: 110, ua1: 60, fa1: 100, y: 84 }, 'out');               // обе руки свободны
  h.k(0.78, { pose: 'chamber1', L1: null, sp: -6, ua1: 50, fa1: 100, ua2: 70, fa2: 80 }, 'out'); // взвод ноги
  h.k(0.88, { pose: 'kick1', sp: -20, ch: -6, nk: -4 }, 'in');                    // встречный удар ногой
  h.k(1.02, { th1: 60, sh1: 60 }, 'out');
  h.k(1.12, { f: -1, L1: [-20, 0], L2: [22, 0], pose: 'guard', y: 82 }, 'io');     // разворот к Шкафу
  h.k(1.24, { y: 52, sp: 44, ch: 14, nk: -10 }, 'out');                           // нырок
  h.k(1.32, { y: 62 }, 'lin');
  h.k(1.42, { pose: 'upper', y: 96, sp: -8 }, 'in');                              // апперкот ладонью
  h.k(1.62, { pose: 'guard', y: 84 }, 'out');
  h.k(1.92, { ik1w: 1, ik1: t => { const w = pk.pts(t); return [w.Hn1[0] + w.wdir[0] * 92, w.Hn1[1] + w.wdir[1] * 92]; }, sp: -6 }, 'out'); // ловит шест
  h.k(2.0, { sp: 8, x: -6 }, 'io');
  h.k(2.06, { pose: 'chamber1', L1: null }, 'out');
  h.k(2.14, { pose: 'kick1', sp: -16, ik1w: 0 }, 'in');                          // удар ногой в живот
  h.k(2.3, { L1: [-26, 0], pose: 'guard', y: 84 }, 'out');
  h.k(2.38, { f: 1, L1: [20, 0], L2: [-24, 0] }, 'hold');                         // к Цепи
  h.k(2.52, { y: 54, sp: 46, ch: 16, nk: -12 }, 'out');                          // под цепь
  h.k(2.66, { pose: 'guard', y: 82, x: 40, L1: [70, 0], L2: [20, 0] }, 'io');     // шаг внутрь
  h.k(2.78, { pose: 'elbow', x: 58 }, 'in');                                      // локоть
  h.k(2.9, { pose: 'guard', x: 52 }, 'out');
  h.k(3.0, { f: -1, sp: 30, rot: 10, L1: null, th1: -30, sh1: 90, ua1: 30, fa1: 90, ua2: 40, fa2: 90 }, 'io'); // разворот спиной
  h.k(3.1, { th1: -72, sh1: 4, rot: 34, sp: 34, ch: 6, nk: -24 }, 'in');           // удар назад ногой
  h.k(3.3, { th1: -20, sh1: 60, rot: 8 }, 'out');
  h.k(3.45, { f: 1, rot: 0, L1: [70, 0], L2: [30, 0], pose: 'teaGuard', x: 50, ua2: 120, fa2: 30, y: 86 }, 'io');
  h.k(T1, { ua2: 135, fa2: 25, cup: null, x: 50 }, 'io');                        // ловит чашку
  h.k(4.1, { pose: 'teaIdle', L1: [58, 0], L2: [40, 0], x: 49, eye: 'calm' }, 'io');
  h.k(4.6, { nk: 18 }, 'io'); h.k(5.0, { nk: 4 }, 'io'); h.k(5.6, {});
  // Шило — прыжок с ногой
  stance(sl, 0, 170, -1, 'guardLow', { y: 76, eye: 'angry' });
  sl.k(0.5, { y: 60, sp: 30 }, 'io');                                              // присед перед прыжком
  sl.k(0.7, { x: 110, y: 130, L1: null, L2: null, pose: ['guard', 'kick1'], th2: 90, sh2: 120, sp: -14, rot: -10 }, 'out');
  sl.k(0.88, { x: 70, y: 120 }, 'lin');
  sl.k(1.05, { x: 220, y: 150, rot: -60, pose: ['hitGut', 'fly'], eye: 'ko' }, 'out2'); // отлетает
  sl.k(1.3, { x: 345, y: 90, rot: -100 }, 'in2');
  sl.k(1.55, { pose: 'lieBack', x: 330, y: 9 }, 'in2'); sl.k(5.6, {});
  // Шкаф — таран с замахом
  stance(sk, 0, -175, 1, 'guard', { y: 100, eye: 'angry' }, 'io', 22, 26);
  sk.k(0.95, { pose: 'hayLoad', x: -150 }, 'io');
  sk.k(1.24, { pose: 'hay', x: -70, L1: [-40, 0], L2: [-110, 0] }, 'in');
  sk.k(1.42, { pose: 'hayOver', x: -60 }, 'out');
  sk.k(1.45, { pose: 'hitHead', y: 140, L1: null, L2: null, th1: 20, sh1: 30, th2: -10, sh2: 20, eye: 'ko' }, 'out2'); // подброшен апперкотом
  sk.k(1.7, { x: -150, y: 150, rot: -50 }, 'out');
  sk.k(1.98, { pose: 'lieBack', x: -215, y: 10 }, 'in2'); sk.k(2.1, { y: 14 }, 'back'); sk.k(5.6, {});
  // Палка — тычок, захват, нога в живот
  stance(pk, 0, -300, 1, 'guard', { y: 84, two: true, wa: 40, ua1: 60, fa1: 70, eye: 'angry' });
  pk.k(1.55, { ua1: 44, fa1: 100, x: -290 }, 'io');
  stance(pk, 1.88, -175, 1, 'guard', { ua1: 112, fa1: 8, wa: 10, sp: 22, two: true }, 'in');
  pk.k(2.08, {});
  pk.k(2.17, { pose: 'hitGut', x: -190, eye: 'ko', two: false, weapon: 'none' }, 'out');  // сложился
  pk.k(2.5, { y: 50, sp: 60, L1: [-170, 0], L2: [-210, 0] }, 'in2');
  pk.k(2.85, { pose: 'lieFace', x: -170, y: 9, L1: null, L2: null }, 'in2'); pk.k(5.6, {});
  // Цепь — хлёст сверху, локоть, удар ногой
  stance(ts, 0, 290, -1, 'guard', { ua1: 180, fa1: 20, eye: 'angry' });
  for (let i = 1; i < 8; i++) ts.k(i * 0.26, { ua1: i % 2 ? 205 : 150 }, 'io');
  ts.k(2.28, { ua1: 205, fa1: 10, sp: -12 }, 'io');
  stance(ts, 2.5, 200, -1, 'guard', { ua1: 80, fa1: 0, sp: 22 }, 'in');            // хлёст
  ts.k(2.8, { pose: 'hitHead', x: 205, eye: 'wince' }, 'out');                      // локоть
  ts.k(2.95, { pose: 'stagger', x: 196 }, 'io');
  ts.k(3.12, { pose: ['hitGut', 'fly'], L1: null, L2: null, x: 240, y: 120, rot: -30, eye: 'ko' }, 'out2'); // нога назад
  ts.k(3.4, { x: 330, y: 70, rot: -90 }, 'in2');
  ts.k(3.65, { pose: 'lieBack', x: 360, y: 9 }, 'in2'); ts.k(5.6, {});
  shot({
    name: 'Все разом', dur: 5.6, sky: 'blue', body: 'moon', tin: { type: 'cut' }, actors: [pk, ts, sk, sl, h],
    cam: [[0, 0, 132, 2.55], [0.6, 60, 135, 2.85, 'io'], [1.0, 50, 135, 2.8, 'io'], [1.4, -70, 135, 2.8, 'io'], [2.0, -105, 135, 2.75, 'io'], [2.45, 40, 135, 2.8, 'io'], [3.1, 140, 135, 2.75, 'io'], [3.45, 95, 140, 2.7, 'io'], [3.8, 50, 150, 2.95, 'io'], [5.6, 50, 145, 3.4, 'io']],
    impacts: [
      { t: 0.9, p: () => sl.pts(0.9).C, big: true, victim: 'shilo', snd: 'big', s: 1 },
      { t: 1.33, x: 345, y: 100, s: 0.6, snd: 'thud', stop: 0.03 },
      { t: 1.44, p: () => sk.pts(1.44).Hd, big: true, victim: 'shkaf', snd: 'big', s: 1.2, stop: 0.2 },
      { t: 1.98, x: -215, y: 12, s: 0.7, snd: 'thud', stop: 0.04, shake: 12 },
      { t: 2.16, p: () => pk.pts(2.16).Wst, victim: 'palka', snd: 'hit', s: 1 },
      { t: 2.8, p: () => ts.pts(2.8).Hd, victim: 'tsep', snd: 'hit', s: 0.9 },
      { t: 3.12, p: () => ts.pts(3.12).C, big: true, victim: 'tsep', snd: 'big', s: 1.3, stop: 0.22 },
      { t: 3.65, x: 360, y: 10, s: 0.5, snd: 'thud', stop: 0.03 },
    ],
    dust: [{ t: 1.55, x: 330, s: 0.9 }, { t: 1.98, x: -215, s: 1.5, n: 10 }, { t: 2.85, x: -170, s: 1 }, { t: 3.65, x: 360, s: 1 }, { t: 0.5, x: 170, s: 0.5 }],
    sfx: [{ t: 0.4, type: 'whoosh', v: 0.6 }, { t: 0.62, type: 'whoosh', v: 0.8 }, { t: 0.84, type: 'whoosh', v: 1 }, { t: 1.2, type: 'whoosh', v: 1.2 }, { t: 1.38, type: 'whoosh', v: 0.9 }, { t: 1.85, type: 'whoosh', v: 0.6 }, { t: 2.1, type: 'whoosh', v: 0.9 }, { t: 2.45, type: 'whoosh', v: 1 }, { t: 2.74, type: 'whoosh', v: 0.7 }, { t: 3.05, type: 'whoosh', v: 1.2 }, { t: T1, type: 'clink', v: 1.2 }, { t: 0.0, type: 'chain', dur: 2.5 }, { t: 3.9, type: 'groan' }],
    bg: (ctx, t, cam) => {
      layer(ctx, cam, 0.25, () => city(ctx, 91, -1300, 1300, -40, 100, 300, 'rgba(70,80,130,0.28)', 1));
      layer(ctx, cam, 0.6, () => { city(ctx, 92, -1100, 1100, -60, 60, 160, 'rgba(90,80,120,0.3)', 1); laundry(ctx, -420, 120, 250, 93); });
      layer(ctx, cam, 1, () => { roofSlab(ctx, -1200, 1200, 0, 94); chimney(ctx, 380, 0, 120, 95); });
    },
    over: (ctx, t) => speedLines(ctx, 0.35 * clamp(Math.min(t - 0.6, 3.4 - t) * 3, 0, 1), 7, 0),
  });
}

// ── 10. Главарь. Мост, трость ─────────────────────────────────────────────
const BOSS_CUP = {};
{
  const h = mkHero(), bs = mkBoss();
  stance(h, 0, -150, 1, 'teaGuard', { eye: 'focus', hot: 0.3 });
  h.k(0.95, {});
  stance(h, 1.12, -182, 1, 'teaGuard', { sp: -20, ch: -10, nk: -14 }, 'out');           // уклон от выпада
  h.k(1.3, { sp: 6, ch: 4, nk: 4 }, 'io');
  h.k(1.48, { y: 56, sp: 44, ch: 14, nk: -10 }, 'out');                                 // нырок под горизонтальный
  h.k(1.66, { y: 84, sp: 8, nk: 2 }, 'io');
  h.k(1.78, { y: 70, sp: 16 }, 'io');                                                   // присел — прыжок
  h.k(1.9, { y: 150, L1: null, L2: null, pose: 'tuck', sp: 4, ua1: 80, fa1: 60 }, 'out');
  h.k(2.06, { y: 140 }, 'io');
  stance(h, 2.2, -175, 1, 'teaGuard', { y: 78 }, 'in2');                                // приземление
  h.k(2.34, { y: 85 }, 'out');
  h.k(2.62, { eye: 'shock', ua2: 30, fa2: 40 }, 'snap');                                // трость выбивает чашку
  h.k(2.78, { cup: 'none' }, 'hold'); h.k(2.9, {});
  stance(bs, 0, 190, -1, 'swagger', { eye: 'smug', ua1: 30, fa1: 60, wa: 0, y: 92 });
  bs.k(0.8, { wa: 720 }, 'io');                                                          // крутит трость
  stance(bs, 0.5, 150, -1, 'swagger', { y: 92 }, 'io'); stance(bs, 0.85, 115, -1, 'guard', { y: 88, ua1: 70, fa1: 90, wa: 720 }, 'io');
  bs.k(0.98, { ua1: 40, fa1: 120, sp: 0 }, 'io');
  stance(bs, 1.12, 50, -1, 'guard', { ua1: 92, fa1: 4, wa: 720, sp: 24, ch: 8 }, 'in');  // выпад
  bs.k(1.3, { ua1: 165, fa1: 30, sp: -6, x: 62 }, 'out');                                // замах сверху
  bs.k(1.47, { ua1: 70, fa1: 10, sp: 28, wa: 700 }, 'in');                                // горизонтальный
  bs.k(1.62, { ua1: 30, fa1: 30, sp: 20 }, 'out');
  bs.k(1.8, { ua1: 10, fa1: 0, wa: 640, sp: 52, ch: 14, y: 70 }, 'in');                  // подсечка низом
  bs.k(2.05, { pose: 'guard', y: 88, wa: 720 }, 'out');
  bs.k(2.4, { ua1: 50, fa1: 100, sp: 4, eye: 'angry' }, 'io');                           // ложный взвод
  bs.k(2.6, { ua1: 105, fa1: 8, wa: 740, sp: 22 }, 'in');                                 // по чашке
  bs.k(2.9, { ua1: 130, fa1: 20, sp: 10 }, 'out');
  const cupT0 = 2.62;
  BOSS_CUP.start = () => h.pts(cupT0).Hn2;
  const airC = t => { const p = BOSS_CUP.start(), u = t - cupT0; return { x: p[0] - 60 * u, y: p[1] + 380 * u - 490 * u * u, spin: u * 9, tilt: 0 }; };
  h.k(cupT0 + 0.001, { cup: airC }, 'hold');
  shot({
    name: 'Главарь', dur: 2.9, sky: 'night', body: 'moon', tin: { type: 'iris', d: 0.6 }, actors: [bs, h],
    cam: [[0, 30, 130, 2.6], [1.1, -40, 132, 3.0, 'io'], [2.2, -60, 135, 3.0, 'io'], [2.9, -80, 160, 3.3, 'io']],
    impacts: [{ t: 2.62, p: () => BOSS_CUP.start(), snd: 'clack', s: 0.9, stop: 0.1, v: 1.3 }],
    warps: [{ t: 2.66, dur: 0.24, rate: 0.3 }],
    dust: [{ t: 2.2, x: -175, s: 0.8 }],
    sfx: [{ t: 0.1, type: 'twirl', dur: 0.8 }, { t: 1.05, type: 'whoosh', v: 0.9 }, { t: 1.38, type: 'whoosh', v: 1 }, { t: 1.72, type: 'whoosh', v: 1 }, { t: 2.55, type: 'whoosh', v: 0.7 }, { t: 0.0, type: 'water', dur: 12 }],
    bg: (ctx, t, cam) => bridgeBG(ctx, t, cam),
    fg: (ctx, t) => bridgeFG(ctx),
  });
}
function bridgeBG(ctx, t, cam) {
  layer(ctx, cam, 0.2, () => { city(ctx, 101, -1300, 1300, -60, 80, 260, 'rgba(70,80,130,0.26)', 1); });
  layer(ctx, cam, 0.5, () => { river(ctx, -1400, 1400, -40, 102); moonGlints(ctx, 300, -60); });
  layer(ctx, cam, 1, () => {
    river(ctx, -1200, 1200, -150, 103);
    washPoly(ctx, [[-1200, 0], [1200, 0], [1200, -34], [-1200, -34]], '#b49b83', 104, 0.4);
    inkLine(ctx, [[-1200, 0], [1200, 0]], 2.5, PAL.ink, 105, 0.4); inkLine(ctx, [[-1200, -34], [1200, -34]], 2, PAL.ink, 106, 0.4);
    for (let x = -1200; x < 1200; x += 300) { washPoly(ctx, [[x + 120, -34], [x + 180, -34], [x + 175, -400], [x + 125, -400]], '#9b8672', 107 + x, 0.3); }
    for (let x = -900; x <= 900; x += 400) lantern(ctx, x, 190, 0.9);
  });
}
function bridgeFG(ctx) {
  // перила перед героями: стойки и поручень
  for (let x = -1200; x <= 1200; x += 110) { inkLine(ctx, [[x, -34], [x, 72]], 3.5, PAL.ink, 120 + x, 0.4); }
  inkLine(ctx, [[-1200, 72], [1200, 72]], 3.2, PAL.ink, 121, 0.4);
}

// ── 11. Мизинец. Замедление, подсечка, донышком в лоб, в реку ─────────────
{
  const h = mkHero(), bs = mkBoss(), CATCH = 1.75;
  const hatFly = t => { const u = t - 2.42; return { x: 120 + 70 * u + Math.sin(u * 3) * 20, y: 190 + 140 * u - 140 * u * u * (u < 1.3 ? 1 : 1), r: Math.sin(u * 4) * 0.5 }; };
  const airC = t => {
    const p1 = h.pts(CATCH).Hn2, T = CATCH + 0.5, u = t + 0.5, g = 980;
    const p0 = [p1[0] + 20, p1[1] + 120], vy = (p1[1] - p0[1]) / T + 0.5 * g * T;
    return { x: lerp(p0[0], p1[0], u / T), y: p0[1] + 1.5 + vy * u - 0.5 * g * u * u, spin: (1 - u / T) * 3.5, tilt: 0 };
  };
  stance(h, 0, -70, 1, 'teaGuard', { eye: 'shock', hot: 0.2, cup: airC, ua2: 30, fa2: 40 });
  h.k(0.15, { y: 46, sp: 30, ch: 10, nk: -4, eye: 'focus', L1: null, th1: 70, sh1: 70 }, 'io');     // низко, нога на подсечку
  h.k(0.45, { th1: 62, sh1: 2, fo1: 0, sp: 24, x: -64 }, 'in');                                     // подсечка
  h.k(0.7, { th1: 50, sh1: 40 }, 'out');
  stance(h, 1.1, -60, 1, 'teaGuard', { y: 84, ua2: 120, fa2: 30 }, 'io');
  h.k(CATCH, { ua2: 135, fa2: 25, cup: null, eye: 'calm' }, 'io');                                  // поймал
  h.k(2.0, { ua2: -6, fa2: 128, pose: 'teaIdle' }, 'io');
  stance(h, 2.2, 0, 1, 'teaIdle', { y: 90 }, 'io', 10, 10);
  h.k(2.36, { ua2: 108, fa2: 6, sp: 10, eye: 'calm' }, 'in');                                       // донышком в лоб
  h.k(2.7, { ua2: -6, fa2: 128, sp: 2 }, 'io');
  h.k(3.3, { nk: 20 }, 'io'); h.k(3.9, { nk: 30 }); h.k(4.2, {});
  stance(bs, 0, 22, -1, 'guard', { ua1: 125, fa1: 18, wa: 740, sp: 8, eye: 'angry' });
  bs.k(0.42, {});
  bs.k(0.5, { L1: null, th1: 50, sh1: 10, rot: -18, eye: 'shock', ua1: 160, fa1: 30, ua2: 120, fa2: 30, x: 30 }, 'out'); // нога выбита
  for (let i = 0; i < 5; i++) bs.k(0.7 + i * 0.25, { ua1: i % 2 ? 170 : 70, ua2: i % 2 ? 60 : 160, rot: -12 - i * 2, x: 40 + i * 12, L2: [62 + i * 12, 0] }, 'io'); // машет руками
  stance(bs, 1.95, 100, -1, 'stagger', { rot: -8, eye: 'shock' }, 'io');
  bs.k(2.3, { nk: 8 }, 'io');
  bs.k(2.4, { pose: 'hitHead', eye: 'ko', rot: -14, hatOff: true }, 'out');
  bs.k(2.65, { rot: -60, x: 112, L1: null, L2: null, th1: 60, sh1: 20, th2: 30, sh2: 40, y: 104 }, 'in2');      // через перила
  bs.k(2.95, { rot: -150, x: 150, y: 40 }, 'in2');
  bs.k(3.3, { rot: -190, x: 175, y: -150, hide: false }, 'in2');
  bs.k(3.32, { hide: true }, 'hold'); bs.k(4.2, {});
  shot({
    name: 'Мизинец', dur: 4.2, sky: 'night', body: 'moon', tin: { type: 'cut' }, actors: [bs, h],
    cam: [[0, -20, 140, 3.4], [0.6, -10, 120, 3.0, 'io'], [1.6, -30, 175, 3.4, 'io'], [2.2, 30, 150, 3.0, 'io'], [2.9, 100, 80, 2.4, 'io'], [3.4, 140, 10, 2.0, 'io'], [4.2, 120, 30, 2.1]],
    impacts: [{ t: 0.47, p: () => bs.pts(0.47).A1, victim: 'boss', snd: 'hit', s: 0.8, stop: 0.12 }, { t: 2.36, p: () => bs.pts(2.36).Hd, victim: 'boss', snd: 'tink', s: 0.55, stop: 0.24, shake: 3 }],
    warps: [{ t: 0, dur: 1.2, rate: 0.32 }],
    splash: [{ t: 3.3, x: 175, y: -150 }],
    sfx: [{ t: 0.0, type: 'slowmo' }, { t: 0.4, type: 'whoosh', v: 0.7 }, { t: CATCH, type: 'clink' }, { t: 2.5, type: 'whoosh', v: 0.5 }, { t: 2.6, type: 'yell' }, { t: 3.3, type: 'splash' }],
    bg: (ctx, t, cam) => bridgeBG(ctx, t, cam),
    fg: (ctx, t) => {
      bridgeFG(ctx);
      if (t > 2.42) { const p = hatFly(Math.min(t, 3.6)); const U = [Math.sin(p.r), Math.cos(p.r)]; drawHat(ctx, [p.x, Math.max(p.y, -148) - 7], U, 11.5 * 1.04, PAL.ink, 6); }
    },
  });
}

// ── 12. Остыл. Снова у лавки, ночь ────────────────────────────────────────
{
  const h = mkHero({ extra: heroKettle }), sk = mkShkaf();
  const KX = 6;
  walk(h, 0, 1.5, 260, 60, { spec: { f: -1, ua2: -6, fa2: 128, eye: 'calm', hot: 0 }, ua2: -6 });
  h.k(0, { x: 260, f: -1, pose: 'teaIdle', eye: 'calm', hot: 0 });
  h.k(1.8, { L1: 50, L2: 70, x: 60 });
  h.k(2.5, { ik2w: 1, ik2: [44, 139], nk: 16, sp: 3, ch: 5 }, 'io');               // к губам
  h.k(2.85, { nk: 22, ch: 7 }, 'io');                                               // глоток
  h.k(3.05, {});
  h.k(3.12, { eye: 'wince', ch: -4, nk: 4 }, 'snap');                              // холодный!
  for (let i = 0; i < 4; i++) h.k(3.2 + i * 0.07, { sp: i % 2 ? 5 : 0, ua1: i % 2 ? 14 : 4 }, 'io');
  h.k(3.7, { ik2w: 0, ua2: 30, fa2: 70, nk: 30, eye: 'open' }, 'io');              // смотрит в чашку
  h.k(4.0, { eye: 'calm' }, 'hold');
  h.k(4.35, { wa: 110, ua2: 40, fa2: 60 }, 'io');                                  // выливает
  h.k(4.95, { wa: 110, empty: true }, 'lin');
  h.k(5.2, { wa: 0 }, 'io');
  h.k(5.6, { sp: 48, ch: 12, nk: 10, y: 70, ik1w: 1, ik1: [KX, 40] }, 'io');        // за чайником
  h.k(5.65, { kettle: true }, 'hold');
  h.k(6.05, { sp: 6, ch: 4, y: 90, ik1w: 0, ua1: 52, fa1: 46, ua2: 30, fa2: 72, nk: 18 }, 'io');
  h.k(6.3, { wa: 64 }, 'out');
  h.k(6.5, { empty: false, hot: 0.5 });
  h.k(7.0, { wa: 66, hot: 1 }, 'lin');
  h.k(7.25, { wa: 0 }, 'io');
  h.k(7.6, { ua1: 20, fa1: 72, ua2: -6, fa2: 128, nk: 8 }, 'io');
  h.k(8.2, { ch: 6, nk: 12 }, 'io'); h.k(9.4, {});
  sk.k(0, { pose: 'lieFace', x: -110, f: -1, eye: 'ko' });
  sk.k(4.5, {}); sk.k(4.7, { ua1: 120, nk: 34 }, 'out'); sk.k(5.1, { ua1: 160, nk: 20 }, 'io'); sk.k(9.4, {});
  shot({
    name: 'Остыл', dur: 9.4, sky: 'night', body: 'moon', tin: { type: 'wipe', d: 0.5 }, actors: [sk, h],
    cam: [[0, 130, 160, 2.2], [1.6, 70, 145, 2.7, 'io'], [2.6, 55, 150, 3.7, 'io'], [3.8, 50, 145, 3.5], [4.5, 40, 125, 2.7, 'io'], [6.2, 40, 130, 2.8], [9.4, 0, 150, 2.2, 'io']],
    sfx: [{ t: 0.1, type: 'steps', dur: 1.5 }, { t: 2.8, type: 'sip' }, { t: 3.12, type: 'brr' }, { t: 4.4, type: 'pourout', dur: 0.6 }, { t: 4.8, type: 'groan' }, { t: 6.3, type: 'pour', dur: 0.9 }, { t: 0, type: 'amb', dur: 10 }],
    bg: (ctx, t, cam) => {
      layer(ctx, cam, 0.25, () => city(ctx, 111, -1200, 1400, 20, 120, 300, 'rgba(70,80,130,0.28)', 1));
      layer(ctx, cam, 0.85, () => lanternString(ctx, -700, 700, 330, 9, i => i % 3 === 1 ? 0.15 : 0.9));
      layer(ctx, cam, 1, () => { groundPlane(ctx, -1500, 1500, '#cdbb9d'); stall(ctx, -150, { broken: 1 }); });
    },
    mid: (ctx, t) => { if (t < 5.65) drawKettle(ctx, KX, 30, -80, 1); },
    fg: (ctx, t) => {
      const q = h.sample(t); if (q.wa > 60 && !q.kettle) { const c = cupState(h, t); if (c) { ctx.globalAlpha = 0.9; inkCurve(ctx, [[c.x - 7, c.y + 8], [c.x - 12, c.y - 30], [c.x - 14, 0]], 2.4, PAL.tea, 130, 0.5); ctx.globalAlpha = 1; } }
    },
  });
}
