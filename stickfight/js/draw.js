// Отрисовка персонажа: тело, глаз, шарф, чашка, оружие, смазы, тень.

function eyeMark(ctx, w, a, kind) {
  const hr = a.L.hr, c = w.Hd, F = w.headFwd, U = w.up, lw = a.lw;
  const p = [c[0] + F[0] * hr * 0.5 + U[0] * hr * 0.1, c[1] + F[1] * hr * 0.5 + U[1] * hr * 0.1];
  const at = (u, f) => [p[0] + U[0] * u + F[0] * f, p[1] + U[1] * u + F[1] * f];
  const col = PAL.paper, ew = lw * 0.5;
  switch (kind) {
    case 'calm': inkCurve(ctx, [at(0, -hr * .22), at(-hr * .12, 0), at(0, hr * .2)], ew, col, 91, 0.15); break;
    case 'focus': inkLine(ctx, [at(0, -hr * .2), at(0, hr * .22)], ew, col, 92, 0.12); inkLine(ctx, [at(hr * .3, -hr * .25), at(hr * .26, hr * .25)], ew * 0.9, col, 93, 0.12); break;
    case 'angry': inkLine(ctx, [at(hr * .12, 0), at(-hr * .12, 0)], ew * 1.1, col, 94, 0.12); inkLine(ctx, [at(hr * .42, -hr * .3), at(hr * .2, hr * .26)], ew, col, 95, 0.12); break;
    case 'shock': ctx.strokeStyle = col; ctx.lineWidth = ew * 0.8; ctx.beginPath(); ctx.arc(p[0], p[1], hr * .24, 0, 7); ctx.stroke(); break;
    case 'ko': inkLine(ctx, [at(hr * .2, -hr * .2), at(-hr * .2, hr * .2)], ew, col, 96, 0.1); inkLine(ctx, [at(hr * .2, hr * .2), at(-hr * .2, -hr * .2)], ew, col, 97, 0.1); break;
    case 'wince': inkLine(ctx, [at(hr * .2, hr * .15), at(0, -hr * .15), at(-hr * .2, hr * .15)], ew, col, 98, 0.1); break;
    case 'smug': inkCurve(ctx, [at(-hr * .02, -hr * .22), at(hr * .1, 0), at(-hr * .02, hr * .2)], ew, col, 99, 0.12); inkLine(ctx, [at(hr * .34, -hr * .25), at(hr * .3, hr * .22)], ew * .8, col, 100, .1); break;
    default: inkLine(ctx, [at(hr * .16, 0), at(-hr * .16, 0)], ew * 1.15, col, 90, 0.12);
  }
}

// Положение чашки (низ чашки) и её «плескание» по ускорению руки.
function cupState(a, t) {
  const q = a.sample(t);
  if (q.cup === 'none') return null;
  if (typeof q.cup === 'function') return Object.assign({ tilt: 0, hot: q.hot }, q.cup(t));
  const h = i => a.pts(t + i).Hn2, p0 = h(-1 / 40), p1 = h(0), p2 = h(1 / 40);
  const ax = (p2[0] - 2 * p1[0] + p0[0]) * 1600;
  return { x: p1[0], y: p1[1] + 1.5 * a.s, tilt: clamp(-ax * 0.0009, -0.5, 0.5), hot: q.hot, spin: q.kettle ? 0 : -(q.wa || 0) * D2R * q.f, empty: q.empty,
    drop: q.drop ? [0, Math.abs(Math.sin(BOIL_T * 31)) * 1.4 * q.drop] : null };
}
function drawCup(ctx, c, s = 1) {
  if (!c) return;
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.spin || 0);
  const w0 = 6.2 * s, w1 = 4.6 * s, h = 9 * s;
  washPoly(ctx, [[-w0, h], [w0, h], [w1, 0], [-w1, 0]], PAL.cup, 301, 0.15);
  ctx.save(); ctx.beginPath(); ctx.moveTo(-w0, h); ctx.lineTo(w0, h); ctx.lineTo(w1, 0); ctx.lineTo(-w1, 0); ctx.clip();
  const tl = c.tilt || 0;
  if (!c.empty) washPoly(ctx, [[-w0 - 2, h * 0.78 - tl * 8], [w0 + 2, h * 0.78 + tl * 8], [w0 + 2, -5], [-w0 - 2, -5]], PAL.tea, 302, 0.05);
  ctx.restore();
  inkLine(ctx, [[-w0 * 0.96, h * 0.38], [w0 * 0.96, h * 0.38]], 1.6 * s, PAL.cupBand, 303, 0.1);
  inkLine(ctx, [[-w0, h], [-w1, 0], [w1, 0], [w0, h]], 1.4 * s, PAL.ink, 304, 0.2);
  inkLine(ctx, [[-w0 - .5, h], [w0 + .5, h]], 1.5 * s, PAL.ink, 305, 0.2);
  if (c.hot) for (let i = 0; i < 2; i++) {
    const ph = BOIL_T * 1.3 + i * 0.5, pts = [];
    for (let k = 0; k < 6; k++) { const u = k / 5; pts.push([(i ? 2.5 : -2) * s + Math.sin(ph * 6 + u * 5) * 2.2 * s, h + 3 * s + u * 16 * s]); }
    ctx.globalAlpha = 0.45 * c.hot; inkCurve(ctx, pts, 1.2 * s, PAL.soft, 306 + i, 0.3); ctx.globalAlpha = 1;
  }
  if (c.drop) dot(ctx, w0 * 0.9 + c.drop[0], h + 1 + c.drop[1], 1.4 * s, PAL.tea);
  ctx.restore();
}

function drawActor(ctx, a, t, o = {}) {
  const q = a.sample(t), w = a.pts(t, q), lw = a.lw, ink = o.ink || PAL.ink, far = mixCol(ink, o.paper || PAL.paper, 0.42);
  const sd = (a.o.seed || 1) * 1000;
  if (q.hide) return w;
  ctx.save();
  if (o.dx) ctx.translate(o.dx, 0);
  // шарф (за телом)
  if (a.o.scarf) {
    const anc = tt => { const p = a.pts(tt); return [p.N[0] - p.f * 1.5, p.N[1] - 2]; };
    const sc = a.sim('scarf', t, anc, 7, 7.5 * a.s, { g: -240, wind: q.wind ?? -900, flutter: 1400, damp: 0.975 });
    for (let k = 0; k < 2; k++) inkCurve(ctx, sc.map((p, i) => [p[0], p[1] + (k ? -1.6 : 1.6) * (1 - i / 7)]), lw * (k ? 0.9 : 1.1), k ? PAL.redDark : PAL.red, sd + 40 + k, 0.3);
  }
  const Wp = w.wdir;
  const staff = () => { const A = [w.Hn1[0] - Wp[0] * 62 * a.s, w.Hn1[1] - Wp[1] * 62 * a.s], B = [w.Hn1[0] + Wp[0] * 98 * a.s, w.Hn1[1] + Wp[1] * 98 * a.s]; inkLine(ctx, [A, B], lw * 0.85, '#6b4b2f', sd + 60, 0.35); };
  const cane = () => {
    const A = [w.Hn1[0] - Wp[0] * 8, w.Hn1[1] - Wp[1] * 8], B = [w.Hn1[0] + Wp[0] * 74, w.Hn1[1] + Wp[1] * 74];
    const nx = -Wp[1] * w.f, ny = Wp[0] * w.f;
    inkCurve(ctx, [B, A, [A[0] - Wp[0] * 5 + nx * 4, A[1] - Wp[1] * 5 + ny * 4], [A[0] - Wp[0] * 2 + nx * 9, A[1] - Wp[1] * 2 + ny * 9]], lw * 0.8, ink, sd + 61, 0.3);
  };
  // дальние конечности
  inkLine(ctx, [w.P, w.K2, w.A2], lw, far, sd + 1); inkLine(ctx, [w.Hl2, w.T2], lw * 0.9, far, sd + 2);
  if (!(a.o.staff && q.two)) { inkLine(ctx, [w.C, w.E2, w.Hn2], lw, far, sd + 3); dot(ctx, w.Hn2[0], w.Hn2[1], lw * 0.62, far); }
  if (a.o.staff && q.weapon !== 'none') staff();
  // корпус и голова
  inkCurve(ctx, [w.P, w.Wst, w.C, w.N], lw * 1.08, ink, sd + 4, 0.4);
  dot(ctx, w.Hd[0], w.Hd[1], a.L.hr, ink);
  if (a.o.tuft) for (let i = 0; i < 3; i++) {
    const ang = -0.6 + i * 0.5, U = w.up, F = w.headFwd, b = [w.Hd[0] + U[0] * a.L.hr * .8 - F[0] * (i - 1) * 4, w.Hd[1] + U[1] * a.L.hr * .8 - F[1] * (i - 1) * 4];
    inkLine(ctx, [b, [b[0] + (U[0] * Math.cos(ang) - F[0] * Math.sin(ang)) * 9, b[1] + (U[1] * Math.cos(ang) - F[1] * Math.sin(ang)) * 9]], lw * 0.7, ink, sd + 70 + i, 0.3);
  }
  if (a.o.band) { const U = w.up, F = w.headFwd, b = [w.Hd[0] - F[0] * a.L.hr + U[0] * 3, w.Hd[1] - F[1] * a.L.hr + U[1] * 3]; inkCurve(ctx, [b, [b[0] - F[0] * 8 - U[0] * 3, b[1] - F[1] * 8 - U[1] * 3 + Math.sin(BOIL_T * 9) * 1.5], [b[0] - F[0] * 15 - U[0] * 7, b[1] - F[1] * 15 - U[1] * 7]], lw * 0.55, ink, sd + 80, 0.4); }
  eyeMark(ctx, w, a, q.eye);
  if (a.o.hat && !q.hatOff) drawHat(ctx, w.Hd, w.up, a.L.hr, ink, sd);
  // ближние конечности
  inkLine(ctx, [w.P, w.K1, w.A1], lw, ink, sd + 5); inkLine(ctx, [w.Hl1, w.T1], lw * 0.9, ink, sd + 6);
  if (a.o.staff && q.two) { inkLine(ctx, [w.C, w.E2, w.Hn2], lw, ink, sd + 3); dot(ctx, w.Hn2[0], w.Hn2[1], lw * 0.62, ink); }
  inkLine(ctx, [w.C, w.E1, w.Hn1], lw, ink, sd + 7); dot(ctx, w.Hn1[0], w.Hn1[1], lw * 0.62, ink);
  if (a.o.cane && q.weapon !== 'none') cane();
  if (a.o.chain) {
    const pin = a.o.chainPin;
    const N = a.o.chainN || 13;
    const ch = a.sim('chain', t, tt => a.pts(tt).Hn1, N, 9, { g: -520, damp: 0.99, pin: pin ? (tt => pin(tt)) : null });
    const pp = pin && pin(t); if (pp) for (let k = 0; k < 3; k++) { ctx.strokeStyle = '#4a4644'; ctx.lineWidth = lw * 0.35; ctx.beginPath(); ctx.ellipse(pp[0], pp[1] - 6 + k * 6, 13, 4, 0.2, 0, 7); ctx.stroke(); }
    inkLine(ctx, ch, lw * 0.35, '#5d5a58', sd + 90, 0.2);
    ch.forEach((p, i) => { if (i % 2) { ctx.strokeStyle = '#4a4644'; ctx.lineWidth = lw * 0.3; ctx.beginPath(); ctx.ellipse(p[0], p[1], 2.6, 1.6, i, 0, 7); ctx.stroke(); } });
    dot(ctx, ch[N - 1][0], ch[N - 1][1], lw * 0.55, '#4a4644');
  }
  if (a.o.cup) drawCup(ctx, cupState(a, t), a.s);
  if (a.o.extra) a.o.extra(ctx, w, q, t);
  ctx.restore();
  return w;
}

function drawHat(ctx, c, U, hr, ink, sd, rot = 0) {
  const F = [-U[1], U[0]], b = [c[0] + U[0] * hr * 0.55, c[1] + U[1] * hr * 0.55];
  const P = (u, f) => [b[0] + U[0] * u + F[0] * f, b[1] + U[1] * u + F[1] * f];
  inkLine(ctx, [P(0, -hr * 1.75), P(0, hr * 1.75)], 3.2, ink, sd + 50, 0.3);
  washPoly(ctx, [P(0, -hr * 0.95), P(0, hr * 0.95), P(hr * 1.15, hr * 0.8), P(hr * 1.25, -hr * 0.8)], ink, sd + 51, 0.3);
  inkLine(ctx, [P(hr * 0.25, -hr * 0.92), P(hr * 0.25, hr * 0.92)], 2.4, PAL.red, sd + 52, 0.2);
}

// Смазы быстрых движений: лента по траектории кисти/стопы/оружия.
function drawSmears(ctx, a, t, o = {}) {
  const q = a.sample(t); if (q.hide) return;
  const joints = o.joints || ['Hn1', 'Hn2', 'T1', 'T2'], n = 6, dt = 0.011;
  const S = []; for (let i = 0; i <= n; i++) S.push(a.pts(t - i * dt));
  const tip = (w, k) => k === 'tip' ? (a.o.staff ? [w.Hn1[0] + w.wdir[0] * 98 * a.s, w.Hn1[1] + w.wdir[1] * 98 * a.s] : [w.Hn1[0] + w.wdir[0] * 74, w.Hn1[1] + w.wdir[1] * 74]) : w[k];
  const js = joints.concat(a.o.staff || a.o.cane ? ['tip'] : []);
  for (const j of js) {
    const path = S.map(w => tip(w, j)); let L = 0;
    for (let i = 1; i < path.length; i++) L += len(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    const th = (o.th || 26) * a.s; if (L < th) continue;
    const k = clamp((L - th) / (th * 2), 0, 1), wd = a.lw * (j === 'tip' ? 0.9 : 1.5);
    const left = [], right = [];
    for (let i = 0; i < path.length; i++) {
      const p = path[i], pn = path[Math.min(i + 1, path.length - 1)], pp = path[Math.max(i - 1, 0)];
      let dx = pn[0] - pp[0], dy = pn[1] - pp[1]; const d = len(dx, dy) || 1; dx /= d; dy /= d;
      const ww = wd * (1 - i / path.length) * 0.5;
      left.push([p[0] - dy * ww, p[1] + dx * ww]); right.push([p[0] + dy * ww, p[1] - dx * ww]);
    }
    ctx.globalAlpha = 0.18 + 0.32 * k;
    washPoly(ctx, left.concat(right.reverse()), PAL.ink, 700, 0.2);
    if (k > 0.5) { ctx.globalAlpha = 0.25 * k; for (const s of [-1, 1]) inkLine(ctx, path.map(p => [p[0], p[1] + s * wd * 1.4]), 1.3, PAL.ink, 710 + s, 0.4); }
    ctx.globalAlpha = 1;
  }
}

function drawShadow(ctx, a, t, gy = 0) {
  const q = a.sample(t); if (q.hide) return;
  const h = clamp(1 - (q.y - 90) / 220, 0.25, 1.1);
  ctx.fillStyle = 'rgba(60,40,30,' + (0.13 * h) + ')';
  ctx.beginPath(); ctx.ellipse(q.x, (q.gy ?? gy) + 1, 34 * a.s * h, 5 * a.s * h, 0, 0, 7); ctx.fill();
}
