// Мир: ночной рынок у реки. Небо в экранных координатах, остальное — слоями с параллаксом.

const SKIES = {
  sunset: ['#f4cf8f', '#eea271', '#f6dcae'],
  dusk:   ['#c9a7bd', '#e8b48f', '#efd6b8'],
  blue:   ['#9aa3c9', '#c7b9c6', '#e3d3bf'],
  night:  ['#8590bd', '#a9a8c6', '#d9cdbb'],
};
function sky(ctx, name, sunY = 0.62, body = 'sun') {
  const s = SKIES[name], g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, s[0]); g.addColorStop(0.6, s[1]); g.addColorStop(1, s[2]);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (body === 'sun') { dot(ctx, W * 0.72, H * sunY, 70, '#f9e3b0'); glow(ctx, W * 0.72, H * sunY, 300, 0.25); }
  if (body === 'moon') { dot(ctx, W * 0.78, H * 0.2, 46, '#f6efd9'); glow(ctx, W * 0.78, H * 0.2, 200, 0.12); }
}
function layer(ctx, cam, d, fn) {
  ctx.save(); const z = cam.z * lerp(0.55, 1, d);
  ctx.setTransform(z, 0, 0, -z, W / 2 - cam.x * d * z, H / 2 + cam.y * d * z + (1 - d) * 120);
  fn(); ctx.restore();
}
function city(ctx, seed, x0, x1, base, hmin, hmax, col, lit = 0) {
  let x = x0, i = 0;
  while (x < x1) {
    const w = 50 + hash(seed + i) * 90, h = hmin + hash(seed + i * 3) * (hmax - hmin);
    const roof = hash(seed + i * 7);
    const pts = [[x, base], [x, base + h], ...(roof < 0.35 ? [[x + w / 2, base + h + 28]] : roof < .6 ? [[x + w * .2, base + h], [x + w * .2, base + h + 14], [x + w * .3, base + h + 14], [x + w * .3, base + h]] : []), [x + w, base + h], [x + w, base]];
    washPoly(ctx, pts, col, seed + i, 0.6);
    if (lit) for (let k = 0; k < 4; k++) if (hash(seed + i * 11 + k) < 0.5) {
      const wx = x + 10 + hash(seed + k + i) * (w - 24), wy = base + 15 + hash(seed * 2 + k + i) * (h - 30);
      washPoly(ctx, [[wx, wy], [wx + 7, wy], [wx + 7, wy + 9], [wx, wy + 9]], '#f6d38f', seed + k, 0.2); glow(ctx, wx + 3, wy + 4, 18, 0.12 * lit);
    }
    x += w + 4; i++;
  }
}
function groundPlane(ctx, x0, x1, col = '#e2cfa8', y = 0, seed = 5) {
  washPoly(ctx, [[x0, y], [x1, y], [x1, y - 500], [x0, y - 500]], col, seed, 0.5);
  inkLine(ctx, [[x0, y], [x1, y]], 2.2, PAL.ink, seed + 1, 0.6);
  for (let i = 0; i < 40; i++) { const x = x0 + hash(seed + i) * (x1 - x0), yy = y - 6 - hash(i * 3 + seed) * 60; ctx.globalAlpha = 0.35; inkLine(ctx, [[x, yy], [x + 14 + hash(i) * 20, yy]], 1.2, PAL.soft, seed + 10 + i, 0.4); }
  ctx.globalAlpha = 1;
}
function lantern(ctx, x, y, lit = 1, sw = 0) {
  const a = Math.sin(BOIL_T * 1.7 + x) * 0.05 + sw, cx = x + Math.sin(a) * 30, cy = y - Math.cos(a) * 30;
  inkLine(ctx, [[x, y], [cx, cy + 14]], 1.2, PAL.ink, x, 0.3);
  if (lit) glow(ctx, cx, cy, 120, 0.35 * lit);
  ctx.fillStyle = lit ? '#e2553c' : '#9c4a3c'; ctx.beginPath(); ctx.ellipse(cx, cy, 13, 15, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.3; ctx.stroke();
  inkLine(ctx, [[cx - 6, cy + 15], [cx + 6, cy + 15]], 2, PAL.ink, x + 1, 0.2); inkLine(ctx, [[cx - 6, cy - 15], [cx + 6, cy - 15]], 2, PAL.ink, x + 2, 0.2);
  inkLine(ctx, [[cx, cy - 15], [cx, cy - 24]], 1.2, '#c39a3f', x + 3, 0.3);
}
function lanternString(ctx, x0, x1, y, n, lit) {
  const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([lerp(x0, x1, u), y - Math.sin(u * Math.PI) * 30]); }
  inkCurve(ctx, pts, 1.3, PAL.ink, x0, 0.4);
  for (let i = 1; i < n; i++) { const u = i / n; lantern(ctx, lerp(x0, x1, u), y - Math.sin(u * Math.PI) * 30, typeof lit === 'function' ? lit(i) : lit); }
}
// Чайная лавка. broken: 0…1 (после Шкафа), t — для обломков.
function stall(ctx, x, o = {}) {
  const br = o.broken || 0, sd = 40;
  // столбы
  inkLine(ctx, [[x - 120, 0], [x - 120, 225]], 4, PAL.ink, sd, 0.5);
  inkLine(ctx, [[x + 120, 0], [x + 120 + br * 30, 225 - br * 40]], 4, PAL.ink, sd + 1, 0.5);
  // навес-полосы
  const top = 232, bot = 196, sag = br * 55;
  for (let i = 0; i < 8; i++) {
    const a = x - 135 + i * 37, b = a + 37, ya = top - (i / 8) * sag, yb = top - ((i + 1) / 8) * sag;
    washPoly(ctx, [[a, ya], [b, yb], [b, yb - 36 - (i % 2) * 4], [a + 18, ya - 46 - sag * .1], [a, ya - 36]], i % 2 ? '#f3e7cf' : '#c94b36', sd + i, 0.4);
  }
  inkLine(ctx, [[x - 135, top], [x + 161, top - sag]], 2, PAL.ink, sd + 20, 0.4);
  // прилавок
  if (br < 0.5) {
    washPoly(ctx, [[x - 95, 0], [x + 95, 0], [x + 95, 92], [x - 95, 92]], '#b98c5e', sd + 30, 0.4);
    inkLine(ctx, [[x - 100, 92], [x + 100, 92]], 3, PAL.ink, sd + 31, 0.4);
    inkLine(ctx, [[x - 95, 0], [x - 95, 92]], 2, PAL.ink, sd + 32, 0.4); inkLine(ctx, [[x + 95, 0], [x + 95, 92]], 2, PAL.ink, sd + 33, 0.4);
    for (let k = 0; k < 3; k++) inkLine(ctx, [[x - 90, 22 + k * 24], [x + 90, 22 + k * 24]], 1, PAL.soft, sd + 34 + k, 0.5);
    // чайник и чашки
    if (o.kettle !== false) { washPoly(ctx, [[x - 60, 92], [x - 24, 92], [x - 28, 120], [x - 56, 120]], '#6c7c86', sd + 40, 0.3); inkLine(ctx, [[x - 60, 92], [x - 56, 120], [x - 28, 120], [x - 24, 92]], 1.5, PAL.ink, sd + 41, 0.3); inkCurve(ctx, [[x - 26, 112], [x - 12, 116], [x - 6, 126]], 2, PAL.ink, sd + 42, 0.3); }
    for (let k = 0; k < (o.cups ?? 3); k++) drawCup(ctx, { x: x + 20 + k * 20, y: 92 }, 0.9);
  } else {
    // сломанный: доски лежат
    for (let k = 0; k < 6; k++) { const px = x - 110 + hash(k + 3) * 220; inkLine(ctx, [[px, 4 + k * 3], [px + 50 + hash(k) * 40, 8 + hash(k * 2) * 30]], 4, '#7a5a3a', sd + 50 + k, 0.4); }
  }
}
function wallBricks(ctx, x0, x1, y0, y1, col, seed) {
  washPoly(ctx, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], col, seed, 0.5);
  ctx.globalAlpha = 0.35;
  for (let r = 0; y0 + r * 26 < y1; r++) for (let c = 0; x0 + c * 60 < x1; c++) if (hash(seed + r * 31 + c) < 0.35) {
    const bx = x0 + c * 60 + (r % 2) * 30, by = y0 + r * 26;
    inkLine(ctx, [[bx, by], [bx + 56, by], [bx + 56, by + 22]], 1, PAL.ink, seed + r * 9 + c, 0.4);
  }
  ctx.globalAlpha = 1;
}
function roofSlab(ctx, x0, x1, y, seed) {
  washPoly(ctx, [[x0, y], [x1, y], [x1 - 30, y - 300], [x0 + 30, y - 300]], '#b9a7a3', seed, 0.5);
  for (let r = 0; r < 8; r++) { ctx.globalAlpha = 0.4; inkCurve(ctx, Array.from({ length: 14 }, (_, i) => [lerp(x0, x1, i / 13), y - 14 - r * 34 + (i % 2) * 5]), 1.2, PAL.ink, seed + r, 0.5); }
  ctx.globalAlpha = 1; inkLine(ctx, [[x0, y], [x1, y]], 2.5, PAL.ink, seed + 30, 0.5);
}
function chimney(ctx, x, y, h, seed) { washPoly(ctx, [[x, y], [x + 34, y], [x + 34, y + h], [x, y + h]], '#a27f6f', seed, 0.4); inkLine(ctx, [[x, y], [x, y + h], [x + 34, y + h], [x + 34, y]], 1.8, PAL.ink, seed + 1, 0.4); }
function laundry(ctx, x0, x1, y, seed) {
  const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([lerp(x0, x1, u), y - Math.sin(u * Math.PI) * 24]); }
  inkCurve(ctx, pts, 1.2, PAL.ink, seed, 0.3);
  const cols = ['#e7c46a', '#8fb0c9', '#f3e7cf', '#c96a5a'];
  for (let k = 1; k < 6; k++) { const u = k / 6, cx = lerp(x0, x1, u), cy = y - Math.sin(u * Math.PI) * 24, sw = Math.sin(BOIL_T * 2 + k) * 4; washPoly(ctx, [[cx - 14, cy], [cx + 14, cy], [cx + 12 + sw, cy - 34], [cx - 12 + sw, cy - 30]], cols[k % 4], seed + k, 0.5); }
}
function bridgeRail(ctx, x0, x1, y, seed, broken) {
  for (let x = x0; x <= x1; x += 80) { inkLine(ctx, [[x, y], [x, y + 98]], 4, PAL.ink, seed + x, 0.4); dot(ctx, x, y + 102, 5, PAL.ink); }
  inkLine(ctx, [[x0, y + 96], [x1, y + 96]], 3.5, PAL.ink, seed + 1, 0.5);
  inkLine(ctx, [[x0, y + 50], [x1, y + 50]], 2, PAL.ink, seed + 2, 0.5);
}
function river(ctx, x0, x1, y, seed) {
  washPoly(ctx, [[x0, y], [x1, y], [x1, y - 600], [x0, y - 600]], '#9fb2c6', seed, 0.4);
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 26; i++) { const x = x0 + hash(seed + i) * (x1 - x0), yy = y - 10 - hash(i * 7) * 200, sh = Math.sin(BOIL_T * 1.5 + i) * 6; inkCurve(ctx, [[x + sh, yy], [x + 15 + sh, yy + 4], [x + 30 + sh, yy]], 1.3, '#56708c', seed + i, 0.3); }
  ctx.globalAlpha = 1;
}
function moonGlints(ctx, x, y) { ctx.globalAlpha = 0.6; for (let i = 0; i < 6; i++) inkLine(ctx, [[x - 30 + hash(i) * 20, y - i * 18], [x + 30 - hash(i * 2) * 20, y - i * 18]], 2, '#f6efd9', 900 + i, 0.5); ctx.globalAlpha = 1; }

// Бумага поверх всего кадра: зерно + виньетка.
let GRAIN = null;
function paperOverlay(ctx) {
  if (!GRAIN) {
    GRAIN = document.createElement('canvas'); GRAIN.width = W; GRAIN.height = H; const g = GRAIN.getContext('2d');
    const img = g.createImageData(W, H);
    for (let i = 0; i < img.data.length; i += 4) { const v = 200 + Math.random() * 55; img.data[i] = v; img.data[i + 1] = v * 0.96; img.data[i + 2] = v * 0.88; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    g.globalAlpha = 0.08; g.strokeStyle = '#6d5a44';
    for (let i = 0; i < 900; i++) { const x = Math.random() * W, y = Math.random() * H, a = Math.random() * 7; g.lineWidth = Math.random() * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); g.stroke(); }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.32; ctx.drawImage(GRAIN, 0, 0);
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(1, 'rgba(150,120,100,1)');
  ctx.globalAlpha = 0.45; ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
