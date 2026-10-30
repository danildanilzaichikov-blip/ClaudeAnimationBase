// Скелет стикмена с человеческими пропорциями (~7.5 голов), ограничениями суставов,
// IK для ног (стопы не скользят) и рук (захваты), запаздыванием звеньев (захлёст),
// шарфом, цепью, шестом, тростью и чашкой.
//
// Каналы позы (градусы, персонаж смотрит вправо):
//   x, y  — таз в мире (y — высота таза над землёй), rot — наклон всего тела вокруг таза (+ вперёд)
//   sp    — наклон поясницы вперёд, ch — изгиб грудного отдела, nk — наклон головы
//   ua1/ua2 — плечо относительно корпуса (0 вдоль корпуса вниз, 90 вперёд, 180 вверх, − назад)
//   fa1/fa2 — локоть, сгиб 0…155 (рука гнётся только вперёд)
//   th1/th2 — бедро от вертикали (+ вперёд), sh1/sh2 — колено 0…160 (голень только назад), fo — стопа
//   L1/L2 — поставить стопу в мировую точку x или [x, y] (решается IK)
//   1 = ближняя (передняя) конечность, 2 = дальняя.

const CH = ['x', 'y', 'rot', 'sp', 'ch', 'nk', 'ua1', 'fa1', 'ua2', 'fa2', 'th1', 'sh1', 'fo1', 'th2', 'sh2', 'fo2', 'wa', 'ik1w', 'ik2w'];
// Запаздывание звеньев: бёдра ведут, корпус чуть позже, плечо, потом предплечье и оружие; голова (взгляд) чуть впереди.
const LAG = { sp: 0.012, ch: 0.024, nk: -0.02, ua1: 0.032, ua2: 0.032, fa1: 0.052, fa2: 0.052, wa: 0.07 };
const LIM = { fa1: [0, 155], fa2: [0, 155], sh1: [0, 160], sh2: [0, 160], th1: [-70, 140], th2: [-70, 140], ua1: [-85, 205], ua2: [-85, 205], sp: [-45, 95], ch: [-30, 45], nk: [-45, 50] };

const POSES = {
  stand:    { y: 91, rot: 0, sp: 3, ch: 2, nk: 2, ua1: 6, fa1: 14, ua2: -4, fa2: 10 },
  relax:    { y: 90, sp: 1, ch: 3, nk: 6, ua1: 4, fa1: 18, ua2: 2, fa2: 16 },
  // герой с чашкой у груди: чашка всегда ровно
  teaIdle:  { y: 91, sp: 2, ch: 3, nk: 8, ua1: 4, fa1: 16, ua2: -6, fa2: 128 },
  teaGuard: { y: 85, sp: 7, ch: 4, nk: 4, ua1: 56, fa1: 62, ua2: -10, fa2: 130 },
  teaHigh:  { y: 86, sp: 4, ch: 2, nk: 0, ua1: 56, fa1: 62, ua2: 168, fa2: 14 },
  guard:    { y: 84, sp: 10, ch: 6, nk: 6, ua1: 58, fa1: 112, ua2: 36, fa2: 132 },
  guardLow: { y: 80, sp: 14, ch: 8, nk: 8, ua1: 45, fa1: 95, ua2: 28, fa2: 120 },
  swagger:  { y: 90, sp: -4, ch: -4, nk: -6, ua1: 10, fa1: 30, ua2: 14, fa2: 40 },
  // удары
  jabLoad:  { sp: 8, ch: 4, ua1: 50, fa1: 120, ua2: 34, fa2: 135 },
  jab:      { sp: 16, ch: 6, nk: 4, ua1: 92, fa1: 4, ua2: 30, fa2: 135 },
  crossLoad:{ sp: 4, ch: -4, ua1: 62, fa1: 110, ua2: 18, fa2: 120 },
  cross:    { sp: 24, ch: 8, nk: 6, ua1: 30, fa1: 120, ua2: 96, fa2: 4 },
  hayLoad:  { sp: -10, ch: -10, nk: -6, ua1: 40, fa1: 80, ua2: -78, fa2: 70 },
  hay:      { sp: 38, ch: 16, nk: 12, ua1: 10, fa1: 40, ua2: 118, fa2: 18 },
  hayOver:  { sp: 58, ch: 22, nk: 18, ua1: -20, fa1: 30, ua2: 70, fa2: 10 },
  upper:    { sp: -6, ch: -8, nk: -8, ua1: 40, fa1: 110, ua2: 150, fa2: 70 },
  palm:     { sp: 18, ch: 8, nk: 2, ua1: 95, fa1: 8 },                       // толчок ладонью
  elbow:    { sp: 14, ch: 6, ua1: 92, fa1: 150 },
  // защита и уходы
  parry:    { sp: 6, ch: 2, nk: -4, ua1: 112, fa1: 48 },
  slipBack: { sp: -22, ch: -12, nk: -14 },
  duck:     { y: 58, sp: 42, ch: 16, nk: -10 },
  // попадания
  hitHead:  { sp: -14, ch: -22, nk: -40, ua1: 50, fa1: 20, ua2: 80, fa2: 15 },
  hitGut:   { sp: 46, ch: 26, nk: 24, ua1: 18, fa1: 115, ua2: 22, fa2: 112 },
  stagger:  { sp: -8, ch: -10, nk: -18, ua1: 70, fa1: 30, ua2: 95, fa2: 25 },
  // ноги (FK)
  chamber1: { th1: 88, sh1: 125, fo1: 10 },
  kick1:    { th1: 92, sh1: 4, fo1: -20 },
  sweep1:   { th1: 48, sh1: 2, fo1: 0 },
  knee1:    { th1: 105, sh1: 140, fo1: 20 },
  tuck:     { th1: 100, sh1: 140, th2: 85, sh2: 135, fo1: 10, fo2: 10 },
  fly:      { th1: 30, sh1: 50, th2: -20, sh2: 60, fo1: 20, fo2: 30 },
  sprawl:   { th1: 14, sh1: 24, th2: -6, sh2: 40, fo1: 20, fo2: 20 },
  lieBack:  { y: 9, rot: -90, sp: 4, ch: 0, nk: -6, ua1: 120, fa1: 30, ua2: 70, fa2: 40, th1: 18, sh1: 45, th2: 4, sh2: 12, fo1: 10, fo2: 20 },
  lieFace:  { y: 9, rot: 90, sp: 0, ch: 0, nk: 20, ua1: 160, fa1: 20, ua2: 150, fa2: 50, th1: -6, sh1: 30, th2: 6, sh2: 8, fo1: 50, fo2: 60 },
  sitDazed: { y: 14, rot: 0, sp: 18, ch: 10, nk: 25, ua1: 20, fa1: 30, ua2: -30, fa2: 10, th1: 82, sh1: 70, th2: 86, sh2: 90, fo1: -20, fo2: -10 },
};

const BASE_L = { sp1: 24, sp2: 28, nk: 7, hr: 11.5, ua: 30, fa: 27, th: 44, sh: 43, ft: 15, ank: 6 };

class Actor {
  constructor(name, o = {}) {
    this.name = name; this.o = o; this.s = o.s || 1;
    this.L = {}; for (const k in BASE_L) this.L[k] = BASE_L[k] * this.s * ((o.prop || {})[k] || 1);
    this.lw = (o.lw || 4.2) * this.s; this.keys = []; this.memo = new Map(); this.sims = {};
  }
  k(t, spec = {}, e = 'io') { this.keys.push({ t, spec, e }); this.built = false; return this; }
  build() {
    this.keys.sort((a, b) => a.t - b.t);
    let st = Object.assign({ x: 0, y: 91, rot: 0, f: 1, eye: 'open', wa: 0, ik1w: 0, ik2w: 0, p1: [-8, 0], p2: [8, 0], th1: 6, sh1: 8, fo1: 0, th2: -4, sh2: 8, fo2: 0 }, POSES.stand);
    this.R = this.keys.map(k => {
      const s = Object.assign({}, st); const sp = k.spec;
      const P = sp.pose ? [].concat(sp.pose).reduce((o, n) => Object.assign(o, POSES[n]), {}) : {};
      for (const src of [P, sp]) for (const c in src) {
        if (c === 'pose') continue;
        s[c] = src[c];
        if (c === 'th1' || c === 'sh1') { if (!('L1' in sp)) s.p1 = null; }
        if (c === 'th2' || c === 'sh2') { if (!('L2' in sp)) s.p2 = null; }
      }
      if ('L1' in sp) s.p1 = sp.L1 == null ? null : [].concat(sp.L1, 0).slice(0, 2);
      if ('L2' in sp) s.p2 = sp.L2 == null ? null : [].concat(sp.L2, 0).slice(0, 2);
      delete s.L1; delete s.L2;
      for (const i of [1, 2]) if (s['p' + i]) Object.assign(s, this.legIK(s, i, s['p' + i]));
      s.t = k.t; s.e = k.e; st = s; return s;
    });
    this.built = true; this.memo.clear(); this.sims = {};
    this.t0 = this.R.length ? this.R[0].t : 0;
  }
  seg(t) {
    const R = this.R; if (t <= R[0].t) return [R[0], R[0], 0];
    if (t >= R[R.length - 1].t) { const r = R[R.length - 1]; return [r, r, 1]; }
    let lo = 0, hi = R.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; R[m].t <= t ? lo = m : hi = m; }
    const a = R[lo], b = R[hi]; return [a, b, (t - a.t) / (b.t - a.t)];
  }
  // IK ноги: стопа (точка опоры) в мире → углы бедра, колена, стопы. Колено всегда вперёд.
  legIK(s, i, p) {
    const L = this.L, ax = p[0], ay = p[1] + L.ank;
    let lx = (ax - s.x) * s.f, ly = s.y - ay;
    const a = angOf(lx, ly) + s.rot, r = len(lx, ly); [lx, ly] = [r * dir(a)[0], r * dir(a)[1]];
    const d = clamp(len(lx, ly), 1, L.th + L.sh - 0.05), a0 = angOf(lx, ly);
    const al = Math.acos(clamp((L.th * L.th + d * d - L.sh * L.sh) / (2 * L.th * d), -1, 1)) / D2R;
    const th = a0 + al, k = dir(th), kx = L.th * k[0], ky = L.th * k[1];
    const shd = angOf(lx - kx, ly - ky);
    return { ['th' + i]: th, ['sh' + i]: th - shd, ['fo' + i]: s.rot - shd };
  }
  sample(t) {
    if (!this.built) this.build();
    const key = Math.round(t * 2400); const m = this.memo.get(key); if (m) return m;
    const out = {};
    for (const c of CH) {
      const [a, b, u] = this.seg(t - (LAG[c] || 0));
      out[c] = lerp(a[c], b[c], ease(b.e, u));
      if (LIM[c]) out[c] = clamp(out[c], LIM[c][0], LIM[c][1]);
    }
    const [a, b, u] = this.seg(t);
    const st = u >= 1 ? b : a; // ступенчатые поля
    for (const c in st) if (!(c in out) && c !== 't' && c !== 'e') out[c] = st[c];
    out.f = (u >= 1 ? b : a).f;
    for (const i of [1, 2]) {
      const pa = a['p' + i], pb = b['p' + i];
      if (pa && pb) {
        const ue = ease('io', u), dd = len(pb[0] - pa[0], pb[1] - pa[1]);
        const lift = dd > 2 ? Math.min(20 * this.s, dd * 0.32) * Math.sin(Math.PI * clamp(u, 0, 1)) : 0;
        const p = [lerp(pa[0], pb[0], ue), lerp(pa[1], pb[1], ue) + lift];
        Object.assign(out, this.legIK(out, i, p)); out['g' + i] = lift < 0.5;
        if (lift > 0) out['fo' + i] += lift * 1.2; // носок тянется в шаге
      } else out['g' + i] = false;
    }
    if (this.memo.size > 3000) this.memo.clear();
    this.memo.set(key, out); return out;
  }
  // Точки скелета в мире.
  pts(t, pose) {
    const q = pose || this.sample(t), L = this.L, f = q.f, rot = q.rot;
    const W_ = p => { const r = len(p[0], p[1]); if (r < 1e-6) return [q.x, q.y]; const d = dir(angOf(p[0], p[1]) - rot); return [q.x + f * r * d[0], q.y - r * d[1]]; };
    const WD = a => { const d = dir(a - rot); return [f * d[0], -d[1]]; };
    const add = (p, l, a) => { const d = dir(a); return [p[0] + l * d[0], p[1] + l * d[1]]; };
    const P = [0, 0];
    const a1 = 180 - q.sp, a2 = a1 - q.ch, a3 = a2 - q.nk;
    const Wst = add(P, L.sp1, a1), C = add(Wst, L.sp2, a2), N = add(C, L.nk, a3), Hd = add(N, L.hr * 1.05, a3);
    const td = -(q.sp + q.ch);
    const arm = (i) => {
      let ua = td + q['ua' + i], fa = ua + q['fa' + i];
      const ikw = q['ik' + i + 'w'], tgt = q['ik' + i];
      let E = add(C, L.ua, ua), Hn = add(E, L.fa, fa);
      if (ikw > 0.001 && tgt) {
        // мировую цель → в локальные координаты
        const T = typeof tgt === 'function' ? tgt(t) : tgt;
        let lx = (T[0] - q.x) * f, ly = q.y - T[1]; const r = len(lx, ly), aa = angOf(lx, ly) + rot;
        lx = r * dir(aa)[0]; ly = r * dir(aa)[1];
        const dx = lx - C[0], dy = ly - C[1], d = clamp(len(dx, dy), 4, L.ua + L.fa - 0.05), a0 = angOf(dx, dy);
        const al = Math.acos(clamp((L.ua * L.ua + d * d - L.fa * L.fa) / (2 * L.ua * d), -1, 1)) / D2R;
        const iua = a0 - al, iE = add(C, L.ua, iua), ifa = angOf(lx - iE[0], ly - iE[1]);
        ua = lerp(ua, iua, ikw); fa = lerp(fa, ifa, ikw); E = add(C, L.ua, ua); Hn = add(E, L.fa, fa);
      }
      return [E, Hn, fa];
    };
    const [E1, Hn1, fa1d] = arm(1);
    let [E2, Hn2, fa2d] = arm(2);
    // второй хват на шесте
    let wdir = fa1d + q.wa;
    if (q.two) {
      const T = add(Hn1, 26 * this.s, wdir);
      const dx = T[0] - C[0], dy = T[1] - C[1], d = clamp(len(dx, dy), 4, L.ua + L.fa - 0.05), a0 = angOf(dx, dy);
      const al = Math.acos(clamp((L.ua * L.ua + d * d - L.fa * L.fa) / (2 * L.ua * d), -1, 1)) / D2R;
      E2 = add(C, L.ua, a0 - al); Hn2 = add(E2, L.fa, angOf(T[0] - E2[0], T[1] - E2[1]));
    }
    const leg = i => { const K = add(P, L.th, q['th' + i]), sd = q['th' + i] - q['sh' + i], A = add(K, L.sh, sd), fd = sd + 90 + q['fo' + i]; return [K, A, add(A, L.ft, fd), add(A, -3 * this.s, fd)]; };
    const [K1, A1, T1, Hl1] = leg(1), [K2, A2, T2, Hl2] = leg(2);
    const o = { P, Wst, C, N, Hd, E1, Hn1, E2, Hn2, K1, A1, T1, Hl1, K2, A2, T2, Hl2 };
    const w = {}; for (const k in o) w[k] = W_(o[k]);
    w.up = WD(a3); w.headFwd = WD(a3 - 90); // ось головы и направление взгляда
    w.wdir = WD(wdir); w.f = f; w.q = q;
    return w;
  }
  // Детерминированная симуляция цепочки (шарф, цепь) от начала дорожки до t.
  sim(id, t, anchor, n, seg, o = {}) {
    let S = this.sims[id]; const dt = 1 / 120;
    if (!S || t < S.t - 1e-9) {
      const t0 = this.t0 - 0.5, a = anchor(t0);
      S = this.sims[id] = { t: t0, p: Array.from({ length: n }, (_, i) => [a[0] - (o.back || 1) * i * seg * 0.7, a[1] - i * seg * 0.7]), q: null };
      S.q = S.p.map(p => p.slice());
    }
    const g = o.g == null ? -380 : o.g, damp = o.damp || 0.985;
    while (S.t + dt <= t + 1e-9) {
      S.t += dt; const a = anchor(S.t);
      for (let i = 1; i < n; i++) {
        const p = S.p[i], pq = S.q[i];
        const wind = (o.wind || 0) + (o.flutter || 0) * noise1(S.t * 3 + i * 0.7);
        const nx = p[0] + (p[0] - pq[0]) * damp + wind * dt * dt, ny = p[1] + (p[1] - pq[1]) * damp + g * dt * dt;
        S.q[i] = [p[0], p[1]]; S.p[i] = [nx, ny];
      }
      S.p[0] = a; S.q[0] = a;
      const pin = o.pin && o.pin(S.t);
      for (let it = 0; it < 4; it++) {
        for (let i = 1; i < n; i++) {
          const A = S.p[i - 1], B = S.p[i], dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1e-6, k = (d - seg) / d;
          if (i === 1) { B[0] -= dx * k; B[1] -= dy * k; }
          else { A[0] += dx * k * 0.5; A[1] += dy * k * 0.5; B[0] -= dx * k * 0.5; B[1] -= dy * k * 0.5; }
        }
        if (pin) { S.p[n - 1] = pin.slice(); }
        if (o.floor != null) for (const p of S.p) if (p[1] < o.floor) p[1] = o.floor;
      }
    }
    return S.p;
  }
}

// Ходьба: шаги чередуются, таз покачивается, руки в противофазе.
function walk(a, t0, t1, x0, x1, o = {}) {
  const stride = o.stride || 52, n = Math.max(1, Math.round(Math.abs(x1 - x0) / (stride / 2)));
  const f = Math.sign(x1 - x0) || 1, dt = (t1 - t0) / n, y = o.y || 90;
  let fa = x0 + f * 10, fb = x0 - f * 10;
  for (let i = 1; i <= n; i++) {
    const u = i / n, x = lerp(x0, x1, u), lead = i % 2;
    const ft = x + f * stride * 0.28 * (i === n ? 0.3 : 1);
    if (lead) fa = ft; else fb = ft;
    if (i === n) { fa = x + f * 9; fb = x - f * 9; }
    const sw = (lead ? 1 : -1) * (o.swing == null ? 16 : o.swing);
    a.k(t0 + dt * (i - 0.5), Object.assign({ x: lerp(x0, x1, u - 0.5 / n), y: y - 2.2, ua1: (o.ua1 ?? 4) + sw, ua2: (o.ua2 ?? 2) - sw }, o.spec || {}), 'lin');
    a.k(t0 + dt * i, Object.assign({ x, y, L1: [fa, o.gy || 0], L2: [fb, o.gy || 0] }, o.spec || {}), 'io');
  }
}
