// cast.js — пластилиновые персонажи.
//
// Инспектор Шлёп: пластилиновая кукла с каркасом (как настоящая кукла для стоп-моушена — проволочный скелет внутри).
// Пропорции «живые»: шея, плечи, локти, колени, кисти с пальцами; плащ до середины бедра, пола отстаёт при движении.
// detective(x, y, o) — x, y: точка на полу между ступнями; y вверх отрицательный. Все длины при s = 1 (≈ 460 px со шляпой).
//   s, dir (1 — смотрит вправо), sq (сплющить + / вытянуть −), lean (наклон корпуса от таза, рад), hipDy (таз вверх/вниз),
//   feet: [[x, y], [x, y]] — ступни задней и передней ноги (колени сгибаются сами, обратная кинематика), tiptoe,
//   armB / armF: [плечо, локоть] — плечо от «вниз» (+ вперёд), локоть: сгиб (+ кисть идёт вперёд/вверх),
//   head: наклон головы (рад), look/lookY: взгляд −1..1, eyes: 'open' | 'wide' | 'half' | 'shut', brow, mouth,
//   hatLift, hatRot, glass (лупа в передней руке), inLens, swing (пола плаща, рад), t (для дыхания и моргания).
const DET = { coat: '#C9A36A', coatD: '#A9844F', belt: '#7A5634', hat: '#5B3B2A', band: '#2C1D17', skin: '#F0B892', skinD: '#D9957A', nose: '#E58F72',
  brow: '#3A2A22', shoe: '#2E2622', pants: '#4B4250', eye: '#151018', white: '#F6F1E8', brass: '#D3A23A', lens: '#BFE3F0' };
const DET_LEN = { thigh: 78, shin: 74, upper: 74, fore: 68, hip: -170 };

// двухзвенная обратная кинематика: от корня (ax, ay) к цели (tx, ty), длины l1, l2; bend = +1/−1 — в какую сторону сгиб
function ik2(ax, ay, tx, ty, l1, l2, bend) {
  let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy); const dm = Math.min(d, l1 + l2 - .5);
  if (d < 1e-3) { d = 1e-3; dx = 0; dy = 1; }
  const a = Math.atan2(dy, dx), c = clamp((l1 * l1 + dm * dm - l2 * l2) / (2 * l1 * dm), -1, 1), k = a + bend * Math.acos(c);
  const mx = ax + Math.cos(k) * l1, my = ay + Math.sin(k) * l1, e = Math.atan2(ty - my, tx - mx);
  return [[mx, my], [mx + Math.cos(e) * l2, my + Math.sin(e) * l2]];
}

function detective(x, y, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1, lean = o.lean ?? 0, sq = o.sq ?? 0, id = o.id || 'det', t = o.t ?? 0;
  const sx = (1 + sq * .5) * s * dir, sy = (1 - sq) * s;
  const breath = Math.sin(t * 2 * Math.PI * .4) * .5 + .5;                  // дыхание: грудь чуть поднимается
  const hipY = DET_LEN.hip + (o.hipDy || 0);
  // L — низ (ноги): без наклона; U — верх: повёрнут вокруг таза на lean
  const L = ([u, v]) => [x + u * sx, y + v * sy];
  const cl = Math.cos(lean), sl = Math.sin(lean);
  const U = ([u, v]) => { const dv = v - hipY; return L([u * cl - dv * sl, hipY + u * sl + dv * cl]); };
  const TL = p => p.map(L), TU = p => p.map(U);

  // контактная тень
  X.save(); X.fillStyle = 'rgba(10,4,16,.45)'; X.filter = `blur(${9 * s}px)`; X.beginPath(); X.ellipse(x, y + 3 * s, 95 * s, 15 * s, 0, 0, 6.283); X.fill(); X.restore();

  // ---------- ноги ----------
  const feet = o.feet || [[-24, 0], [28, 0]], tip = o.tiptoe ? 1 : 0;
  const leg = (k, [fx, fy]) => {
    const hx = k ? 20 : -16, ankle = [fx, fy - 18 - tip * 6];
    const [knee, end] = ik2(hx, hipY + 6, ankle[0], ankle[1], DET_LEN.thigh, DET_LEN.shin, -1);   // колено вперёд
    const col = k ? DET.pants : shade(DET.pants, -.12);
    lump(TL(capsule(hx, hipY + 6, knee[0], knee[1], 23, 19)), col, { id: id + 'th' + k, noFx: true, gloss: .25 });
    lump(TL(capsule(knee[0], knee[1], end[0], end[1], 19, 15)), col, { id: id + 'sh' + k, noFx: true, gloss: .25 });
    bead(...L(knee), 19 * s, col, { id: id + 'kn' + k, gloss: .3 });                                  // колено — шарнир
    const toe = tip ? .45 : 0;
    lump(TL(xf(smooth([[-14, -14], [10, -18], [34, -10], [40, 2], [-16, 4]], 5), { rot: -toe * 1, ox: 0, oy: 0, dx: end[0], dy: end[1] + 16 })), k ? DET.shoe : shade(DET.shoe, -.15), { id: id + 'shoe' + k, gloss: .9, noFx: true });
    return knee;
  };
  leg(0, feet[0]);

  // ---------- руки (плечо → локоть → кисть) ----------
  const arm = (k, ang) => {
    const [a1, a2] = Array.isArray(ang) ? ang : [ang, .3];
    const shx = k ? 34 : -28, shy = -308 + breath * 2;
    const ex = shx + Math.sin(a1) * DET_LEN.upper, ey = shy + Math.cos(a1) * DET_LEN.upper;
    const a = a1 + a2, hx = ex + Math.sin(a) * DET_LEN.fore, hy = ey + Math.cos(a) * DET_LEN.fore;
    const col = k ? DET.coat : DET.coatD;
    lump(TU(capsule(shx, shy, ex, ey, 24, 20)), col, { id: id + 'ua' + k, prints: 1, gloss: .3 });
    lump(TU(capsule(ex, ey, hx, hy, 20, 17)), col, { id: id + 'fa' + k, prints: 1, gloss: .3 });
    bead(...U([ex, ey]), 20 * s, col, { id: id + 'el' + k, gloss: .25 });                               // локоть
    lump(TU(capsule(ex + Math.sin(a) * DET_LEN.fore * .82, ey + Math.cos(a) * DET_LEN.fore * .82, hx, hy, 19, 19)), shade(col, -.1), { id: id + 'cuff' + k, noFx: true, gloss: .2 });   // манжета
    // кисть: ладонь, большой палец, три пальца
    const px = hx + Math.sin(a) * 16, py = hy + Math.cos(a) * 16, sk = k ? DET.skin : DET.skinD;
    lump(TU(ell(px, py, 17, 15, 18, -a)), sk, { id: id + 'palm' + k, noFx: true, gloss: .4 });
    for (let f = 0; f < 3; f++) { const fa = a + (f - 1) * .38; lump(TU(capsule(px, py, px + Math.sin(fa) * 22, py + Math.cos(fa) * 22, 6.5, 5.5, 8)), sk, { id: id + 'fg' + k + f, noFx: true, gloss: .4, soft: 3 }); }
    const ta = a - 1.3; lump(TU(capsule(px, py, px + Math.sin(ta) * 18, py + Math.cos(ta) * 18, 7, 6, 8)), sk, { id: id + 'tb' + k, noFx: true, gloss: .4, soft: 3 });
    return { hand: U([px + Math.sin(a) * 12, py + Math.cos(a) * 12]), ang: a };
  };
  if (!o.armBOver) arm(0, o.armB ?? [-.2, .5]);

  // ---------- корпус: плащ до середины бедра, пола с запаздыванием ----------
  const sw = o.swing || 0, ch = breath * 3;
  const coat = smooth([[-62, -138 + sw * 30], [-78, -200], [-70, -270], [-50, -318 - ch], [0, -326 - ch], [50, -318 - ch], [70, -270], [78, -200], [74 + sw * 40, -130 - Math.abs(sw) * 10], [10, -122], [-30, -126]], 7);
  lump(TU(coat), DET.coat, { id: id + 'coat', prints: 4, gloss: .35 });
  leg(1, feet[1]);
  // передняя пола поверх передней ноги (её край), запах, лацканы, пояс
  lump(TU(smooth([[14, -230], [74, -205], [80 + sw * 40, -132], [44 + sw * 20, -122], [12, -128]], 5)), shade(DET.coat, -.03), { id: id + 'flap', prints: 2, gloss: .3 });
  snake(TU([[14, -312], [8, -230], [12, -126]]), 6, DET.coatD, { id: id + 'seam', drop: false });
  lump(TU([[-30, -322], [6, -318], [-6, -258], [-38, -292]]), shade(DET.coat, .08), { id: id + 'lapL', noFx: true, rough: .6, soft: 4 });
  lump(TU([[30, -322], [-2, -318], [14, -256], [44, -290]]), shade(DET.coat, .08), { id: id + 'lapR', noFx: true, rough: .6, soft: 4 });
  lump(TU(rrect(-80, -214, 160, 20, 9)), DET.belt, { id: id + 'belt', noFx: true, gloss: .4, soft: 5 });
  lump(TU(rrect(-2, -219, 28, 30, 6)), DET.brass, { id: id + 'buckle', noFx: true, gloss: 1, soft: 4 });
  for (const by of [-286, -252]) bead(...U([44, by]), 6.5 * s, DET.belt, { id: id + 'btn' + by });

  // ---------- шея и голова (голова наклоняется отдельно от корпуса) ----------
  const look = o.look ?? 0, lookY = o.lookY ?? 0, hTilt = (o.head || 0) + lookY * .12;
  const nx0 = 4, ny0 = -322 - ch;
  lump(TU(capsule(nx0, ny0 + 6, nx0 + 4, ny0 - 22, 22, 21)), DET.skinD, { id: id + 'neck', noFx: true, gloss: .2 });
  lump(TU(smooth([[-44, -312 - ch], [0, -334 - ch], [46, -312 - ch], [30, -300 - ch], [-30, -300 - ch]], 5)), shade(DET.coat, .05), { id: id + 'collar', noFx: true, gloss: .3, soft: 5 });
  const hcx = nx0 + 6 + look * 8, hcy = ny0 - 66;
  const Hd = ([u, v]) => { const du = u - nx0, dv = v - ny0, c = Math.cos(hTilt), si = Math.sin(hTilt); return U([nx0 + du * c - dv * si, ny0 + du * si + dv * c]); };
  const TH = p => p.map(Hd);
  // череп + щёки/челюсть + ухо
  lump(TH(smooth([[hcx - 62, hcy - 10], [hcx - 50, hcy - 58], [hcx, hcy - 74], [hcx + 52, hcy - 56], [hcx + 66, hcy - 6], [hcx + 56, hcy + 40], [hcx + 18, hcy + 62], [hcx - 30, hcy + 54], [hcx - 58, hcy + 28]], 6)), DET.skin, { id: id + 'head', prints: 2, gloss: .5 });
  lump(TH(ell(hcx - 40 - look * 10, hcy + 6, 14, 20, 16)), DET.skinD, { id: id + 'ear', noFx: true, gloss: .3 });
  // глаза: белки, зрачки, веки (моргание)
  const blinkAt = [1.1, 3.9, 6.6, 8.95];
  const blink = blinkAt.some(b => t >= b && t < b + .12);
  let eyes = o.eyes || 'open'; if (blink && eyes !== 'shut') eyes = 'shut';
  const ex = hcx + 20 + look * 14, ey = hcy - 8 + lookY * 6, er = eyes === 'wide' ? 15 : 12;
  const sacc = (hash(id, 'sac', Math.floor(t * 1.5)) - .5) * 3;                                           // мелкие движения зрачков
  for (const k of [-1, 1]) {
    const px = ex + k * 21 + (k > 0 ? 3 : 0);
    if (eyes === 'shut') { snake(TH([[px - 11, ey], [px, ey + 4], [px + 11, ey]]), 4.5 * s, DET.eye, { id: id + 'es' + k, drop: false }); continue; }
    bead(...Hd([px, ey]), er * s, DET.white, { id: id + 'ew' + k, gloss: .5, sq: 1.1 });
    const pr = eyes === 'wide' ? 5.5 : 7;
    bead(...Hd([px + look * 5 + sacc, ey + lookY * 5]), pr * s, DET.eye, { id: id + 'ep' + k, gloss: 1 });
    if (eyes === 'half') lump(TH(xf(ell(px, ey - 6, er + 2, er * .7, 18), {})), shade(DET.skin, -.05), { id: id + 'lid' + k, noFx: true, gloss: .3, soft: 3 });
  }
  const br = o.brow ?? 0;
  for (const k of [-1, 1]) {
    const px = ex + k * 22, by = ey - er - 10 - br * 14;
    snake(TH([[px - 15, by + 4 - k * br * 3], [px, by - 2 - br * 3], [px + 15, by + 3 + k * br * 3]]), 9 * s, DET.brow, { id: id + 'br' + k, taper: true });
  }
  const nx = hcx + 54 + look * 16, ny = hcy + 14 + lookY * 5;
  lump(TH(ell(nx, ny, 31, 27, 24)), DET.nose, { id: id + 'nose', prints: 1, gloss: .9 });
  const mx = nx - 8, my = ny + 26;
  snake(TH([[mx - 34, my + 6], [mx - 14, my - 2], [mx, my + 2]]), 13 * s, DET.brow, { id: id + 'muL', taper: true });
  snake(TH([[mx, my + 2], [mx + 14, my - 2], [mx + 34, my + 6]]), 13 * s, DET.brow, { id: id + 'muR', taper: true });
  const mouth = o.mouth || 'none';
  if (mouth === 'o') bead(...Hd([mx, my + 20]), 9 * s, '#5A1E26', { id: id + 'mo', gloss: .2 });
  if (mouth === 'flat') snake(TH([[mx - 10, my + 18], [mx + 10, my + 18]]), 4 * s, '#5A1E26', { id: id + 'mf', drop: false });
  if (mouth === 'smirk') snake(TH([[mx - 12, my + 19], [mx + 4, my + 18], [mx + 15, my + 11]]), 4.5 * s, '#5A1E26', { id: id + 'ms', drop: false });
  // шляпа
  const hat = (cx, cy, rot) => {
    const HP = p => TH(xf(p, { rot, dx: cx, dy: cy }));
    lump(HP(smooth([[-100, 0], [-60, -12], [60, -12], [104, -2], [60, 12], [-60, 12]], 6)), DET.hat, { id: id + 'brim', prints: 1, gloss: .4 });
    lump(HP(smooth([[-58, -6], [-60, -60], [-34, -82], [0, -70], [34, -84], [58, -62], [56, -6]], 7)), DET.hat, { id: id + 'crown', prints: 2, gloss: .45 });
    lump(HP(rrect(-58, -30, 116, 22, 8)), DET.band, { id: id + 'band', noFx: true, gloss: .3, soft: 4 });
  };
  hat(hcx + 4, hcy - 56 - (o.hatLift || 0), o.hatRot || 0);

  if (o.armBOver) arm(0, o.armB);
  // передняя рука поверх всего, в ней лупа (по направлению предплечья)
  const F = arm(1, o.armF ?? [.2, .4]);
  if (o.glass) {
    const wa = dir * (F.ang - lean);
    const lc = magnifier(F.hand[0] - Math.sin(wa) * 8 * s, F.hand[1] - Math.cos(wa) * 8 * s, 46 * s, wa, id, o.inLens);
    // пальцы обхватывают ручку
    bead(F.hand[0] - Math.sin(wa) * 4 * s, F.hand[1] - Math.cos(wa) * 4 * s, 9 * s, DET.skin, { id: id + 'grip', gloss: .4 });
    return { hand: F.hand, glass: lc, head: Hd([hcx, hcy]) };
  }
  return { hand: F.hand, head: Hd([hcx, hcy]) };
}

// лупа: ручка от (x,y) по направлению ang, линза радиуса r на конце
function magnifier(x, y, r, ang, id = 'mag', inLens = null) {
  const dx = Math.sin(ang), dy = Math.cos(ang), lx = x + dx * r * 1.3, ly = y + dy * r * 1.3;
  lump(capsule(x - dx * 10, y - dy * 10, x + dx * r * .35, y + dy * r * .35, 9 * r / 46, 8 * r / 46), '#6B3E22', { id: id + 'handle', noFx: true, gloss: .6 });
  lump(ell(lx, ly, r * 1.12, r * 1.12, 32), DET.brass, { id: id + 'rim', noFx: true, gloss: 1, soft: 5 });
  if (inLens) { X.save(); X.beginPath(); X.arc(lx, ly, r * .9, 0, 6.283); X.clip(); inLens(lx, ly, r * .9); X.restore(); }
  X.save(); X.globalAlpha = inLens ? .22 : .55; lump(ell(lx, ly, r * .88, r * .88, 32), DET.lens, { id: id + 'lens', noFx: true, rough: .3, gloss: 1, drop: false }); X.restore();
  bead(lx - r * .35, ly - r * .35, r * .14, '#FFFFFF', { id: id + 'glint', drop: false });
  return [lx, ly];
}

// Огромная рука аниматора (сверху в кадр). x, y — кончик указательного пальца; s — масштаб; open — пальцы 0 сжаты..1 растопырены
function giantHand(x, y, o = {}) {
  const s = o.s ?? 1, col = o.col || '#E9A989', id = o.id || 'ghand', rot = o.rot || 0;
  const P = pts => xf(pts, { s, rot, dx: x, dy: y });
  // запястье/рукав уходит вверх за кадр
  lump(P(smooth([[-150, -380], [-120, -1500], [200, -1500], [190, -380], [120, -300], [-90, -300]], 6)), '#47607A', { id: id + 'sleeve', prints: 3, gloss: .25 });
  lump(P(smooth([[-150, -250], [-160, -390], [190, -400], [200, -230], [140, -150], [-40, -130]], 6)), col, { id: id + 'palm', prints: 4, gloss: .4 });
  // сжатые пальцы (средний, безымянный, мизинец)
  for (const [i, fx] of [[0, 70], [1, 125], [2, 172]]) lump(P(capsule(fx, -230, fx - 10, -150 + i * 8, 30, 27)), shade(col, -.04), { id: id + 'f' + i, prints: 1, gloss: .4 });
  // большой палец
  lump(P(capsule(-130, -250, -60, -170, 34, 28)), col, { id: id + 'thumb', prints: 1, gloss: .4 });
  // указательный — вытянут вниз, кончик в (0,0)
  lump(P(capsule(-10, -260, 0, -24, 34, 30)), col, { id: id + 'index', prints: 2, gloss: .5 });
  lump(P(rrect(-16, -62, 34, 30, 12)), shade(col, .18), { id: id + 'nail', noFx: true, gloss: .9, soft: 4, drop: false });
}
