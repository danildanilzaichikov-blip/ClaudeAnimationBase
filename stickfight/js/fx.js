// Эффекты: вспышка удара, ударная волна, пыль, обломки, брызги.
// Время t — локальное время плана (во время hit-stop оно стоит, поэтому вспышка «держится» в кадре).

function fxImpact(ctx, im, t) {
  const u = (t - im.t) / (im.big ? 0.26 : 0.18); if (u < 0 || u > 1) return;
  const s = (im.s || 1) * (im.big ? 1.6 : 1), x = im.x, y = im.y, sd = im.t * 100;
  const a = 1 - u;
  // звезда-клякса
  if (u < 0.55) {
    const pts = []; const n = 9;
    for (let i = 0; i < n * 2; i++) {
      const ang = i / (n * 2) * Math.PI * 2 + hash(sd + i) * 0.3, r = (i % 2 ? 7 : 20 + hash(sd + i * 3) * 14) * s * (0.7 + u);
      pts.push([x + Math.cos(ang) * r, y + Math.sin(ang) * r]);
    }
    ctx.globalAlpha = 1; washPoly(ctx, pts, im.big ? PAL.red : PAL.cup, sd, 0.6);
    ctx.globalAlpha = 1; inkLine(ctx, pts.concat([pts[0]]), 1.6 * s, PAL.ink, sd + 1, 0.4);
  }
  // лучи
  ctx.globalAlpha = a;
  for (let i = 0; i < 10; i++) {
    const ang = hash(sd + i * 7) * Math.PI * 2, r0 = (18 + u * 40) * s, r1 = r0 + (16 + hash(sd + i) * 26) * s * (1 - u * 0.6);
    inkLine(ctx, [[x + Math.cos(ang) * r0, y + Math.sin(ang) * r0], [x + Math.cos(ang) * r1, y + Math.sin(ang) * r1]], 2.2 * s * a, PAL.ink, sd + 20 + i, 0.3);
  }
  // ударная волна
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.4 * s * a; ctx.beginPath(); ctx.ellipse(x, y, (14 + u * 70) * s, (10 + u * 50) * s, im.ang || 0, 0, 7); ctx.stroke();
  ctx.globalAlpha = 1;
}

function fxDust(ctx, d, t) {
  const u = (t - d.t) / (d.life || 0.7); if (u < 0 || u > 1) return;
  const s = d.s || 1, n = d.n || 7;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, sp = (0.4 + hash(d.t * 50 + i) * 0.8) * (d.dir == null ? side : d.dir);
    const px = d.x + sp * 60 * s * EASE.out(u) + (hash(i * 9 + d.t) - .5) * 10 * s, py = (d.y || 0) + (6 + hash(i + d.t * 3) * 14) * s * EASE.out(u);
    ctx.globalAlpha = 0.35 * (1 - u); ctx.strokeStyle = PAL.soft; ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); ctx.arc(px, py, (4 + 10 * u) * s * (0.6 + hash(i * 3.3) * 0.8), 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Обломки: доски, палочки, черепица — летят по баллистике и вращаются, падают на землю.
function fxDebris(ctx, d, t) {
  const tt = t - d.t; if (tt < 0) return;
  for (let i = 0; i < (d.n || 8); i++) {
    const vx = ((hash(d.t + i) - 0.5) * 2 * (d.spread || 260)) + (d.vx || 0), vy = 120 + hash(d.t * 2 + i) * (d.up || 260);
    const g = 900, tl = Math.min(tt, (vy + Math.sqrt(vy * vy + 2 * g * (d.y - (d.gy || 0)))) / g);
    const x = d.x + vx * tl, y = d.y + vy * tl - 0.5 * g * tl * tl, r = tl * (hash(i * 5) - .5) * 20 + i;
    const L = (d.size || 18) * (0.5 + hash(i * 7.7));
    ctx.globalAlpha = clamp(2.5 - tt * 0.5, 0, 1);
    inkLine(ctx, [[x - Math.cos(r) * L / 2, y - Math.sin(r) * L / 2], [x + Math.cos(r) * L / 2, y + Math.sin(r) * L / 2]], d.w || 3, d.col || '#7a5a3a', i + 800, 0.3);
  }
  ctx.globalAlpha = 1;
}

function fxSplash(ctx, d, t) {
  const tt = t - d.t; if (tt < 0 || tt > 1.6) return;
  for (let i = 0; i < 18; i++) {
    const vx = (hash(i + 3) - .5) * 260, vy = 260 + hash(i * 2) * 360, y = d.y + vy * tt - 450 * tt * tt;
    if (y < d.y - 4) continue;
    ctx.globalAlpha = clamp(1.4 - tt, 0, 1); dot(ctx, d.x + vx * tt, y, 2.5 + hash(i) * 3, '#d9e4ec');
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(d.x + vx * tt, y, 2.5 + hash(i) * 3, 0, 7); ctx.stroke();
  }
  for (let k = 0; k < 3; k++) { const u = clamp((tt - k * 0.18) / 1.2, 0, 1); if (u <= 0) continue; ctx.globalAlpha = 0.6 * (1 - u); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(d.x, d.y, 20 + u * 140, 4 + u * 18, 0, 0, 7); ctx.stroke(); }
  ctx.globalAlpha = 1;
}

// Линии скорости поверх кадра (в экранных координатах) — для рывков камеры и кульминации.
function speedLines(ctx, amt, seed, ang = 0) {
  if (amt <= 0) return;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ang);
  for (let i = 0; i < 40; i++) {
    const y = (hash(seed + i) - .5) * H * 1.3, x = (hash(seed * 3 + i) - .5) * W * 1.4, l = 200 + hash(i) * 600;
    ctx.globalAlpha = amt * 0.35; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1 + hash(i * 2) * 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
// Концентрические линии фокуса (манга) к центру удара.
function focusLines(ctx, amt, cx, cy, seed) {
  if (amt <= 0) return;
  for (let i = 0; i < 70; i++) {
    const a = hash(seed + i) * Math.PI * 2, r0 = 300 + hash(seed + i * 2) * 250, r1 = 1400;
    ctx.globalAlpha = amt * 0.5; ctx.fillStyle = PAL.ink; const da = 0.004 + hash(i) * 0.01;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a - da) * r1, cy + Math.sin(a - da) * r1); ctx.lineTo(cx + Math.cos(a + da) * r1, cy + Math.sin(a + da) * r1); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
