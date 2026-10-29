// «Улика» — 10 секунд. Пластилиновый Инспектор Шлёп в настоящем ночном переулке под дождём.
// Раскадровка: clay/STORYBOARD.md
//   0.0–3.0  фонарь вспыхивает; Шлёп крадётся на цыпочках, замечает листочек на мокрой мостовой, наклоняется с лупой
//   2.6–5.2  камера плавно наезжает на листочек (живая камера — плавно, куклы — по 12 перестановок в секунду)
//   5.2–7.2  держим: «Алёна какашка», капли дождя падают на бумагу
//   7.3–10   перевод фокуса на Шлёпа: шок → понимающая ухмылка → приподнял шляпу; фонарь гаснет, блик лупы
(() => {
  const NOTE = { x: 1330, y: 1004, w: 236, rot: -.13 };
  let NOTE_TEX = null;

  // ---------- листочек из тетради: мятый, мокрый, ручкой ----------
  BOOT.push(async () => {
    await document.fonts.load('600 200px Caveat', 'Алёна какашка');
    const w = 1400, h = 980, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), r = rng('note');
    // рваный край сверху (вырван из тетради), ровные остальные
    const P = new Path2D(); P.moveTo(8, 60); for (let x = 8; x <= w - 8; x += 18) P.lineTo(x, 40 + r() * 34); P.lineTo(w - 10, h - 12); P.lineTo(12, h - 8); P.closePath();
    g.save(); g.clip(P);
    g.fillStyle = '#F1ECDF'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = .35; g.drawImage(makeNoise(512, 3, 'paperfiber', .7), 0, 0, w, h); g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    // клетка/линейки и поле
    g.strokeStyle = 'rgba(70,120,190,.38)'; g.lineWidth = 3; for (let y = 150; y < h; y += 72) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = 'rgba(205,60,70,.5)'; g.lineWidth = 4; g.beginPath(); g.moveTo(170, 0); g.lineTo(170, h); g.stroke();
    // текст ручкой
    g.save(); g.translate(250, 0); g.rotate(-.045);
    g.font = '600 250px Caveat'; g.textBaseline = 'alphabetic';
    for (const [dx, dy, a] of [[0, 0, .92], [2, 1.5, .35]]) { g.fillStyle = `rgba(25,42,140,${a})`; g.fillText('Алёна', dx, 420 + dy); g.fillText('какашка', dx - 60, 700 + dy); }
    // волнистое подчёркивание и рисуночек-какашка
    g.strokeStyle = 'rgba(25,42,140,.85)'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); for (let x = -60; x <= 760; x += 10) { const y = 760 + Math.sin(x / 34) * 9; x === -60 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
    g.lineWidth = 8; const px = 900, py = 690;
    g.beginPath(); g.ellipse(px, py, 120, 34, 0, Math.PI * .95, Math.PI * 2.05); g.stroke();
    g.beginPath(); g.ellipse(px, py - 58, 92, 30, 0, Math.PI * .95, Math.PI * 2.05); g.stroke();
    g.beginPath(); g.ellipse(px, py - 108, 60, 24, 0, Math.PI * .95, Math.PI * 2.05); g.stroke();
    g.beginPath(); g.moveTo(px - 30, py - 128); g.quadraticCurveTo(px + 10, py - 190, px + 22, py - 150); g.stroke();
    g.beginPath(); g.moveTo(px - 120, py + 2); g.lineTo(px + 120, py + 2); g.stroke();
    g.fillStyle = 'rgba(25,42,140,.9)'; g.beginPath(); g.arc(px - 30, py - 62, 9, 0, 6.283); g.arc(px + 30, py - 62, 9, 0, 6.283); g.fill();
    g.beginPath(); g.arc(px, py - 32, 26, .2, Math.PI - .2); g.stroke();
    g.restore();
    // мятость: полосы света и тени вдоль сгибов
    for (let k = 0; k < 9; k++) {
      const x0 = r() * w, y0 = r() * h, a = r() * Math.PI, L = 900, nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
      const gr = g.createLinearGradient(x0 - nx * 60, y0 - ny * 60, x0 + nx * 60, y0 + ny * 60);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.48, 'rgba(255,255,255,.16)'); gr.addColorStop(.52, 'rgba(60,40,30,.16)'); gr.addColorStop(1, 'rgba(60,40,30,0)');
      g.fillStyle = gr; g.save(); g.translate(x0, y0); g.rotate(a); g.fillRect(-L, -60, 2 * L, 120); g.restore();
    }
    // мокрые пятна и грязь от мостовой
    for (let k = 0; k < 7; k++) { const x = r() * w, y = r() * h, rr = 40 + r() * 140, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(120,110,95,.22)'); gr.addColorStop(.85, 'rgba(120,110,95,.12)'); gr.addColorStop(1, 'rgba(90,80,70,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
    const edge = g.createRadialGradient(w / 2, h / 2, h * .35, w / 2, h / 2, w * .62); edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(70,55,40,.35)'); g.fillStyle = edge; g.fillRect(0, 0, w, h);
    g.restore();
    NOTE_TEX = c;
  });

  // листочек на мостовой: sq — насколько «сверху» мы на него смотрим (перспектива), wetT — время для капель
  function noteDraw(sq, lamp, t) {
    const c = X, w = NOTE.w, h = w * NOTE_TEX.height / NOTE_TEX.width;
    c.save(); c.translate(NOTE.x, NOTE.y); c.scale(1, sq); c.rotate(NOTE.rot);
    // мокрая тень под бумагой
    c.save(); c.filter = 'blur(6px)'; c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(-w / 2 + 4, -h / 2 + 6, w, h); c.restore();
    c.drawImage(NOTE_TEX, -w / 2, -h / 2, w, h);
    // свет фонаря (тёпло) и ночь (синева) поверх бумаги
    c.globalCompositeOperation = 'multiply';
    const gr = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    gr.addColorStop(0, mix('#3A4570', '#FFD9A6', lamp)); gr.addColorStop(1, mix('#262E50', '#E9B57E', lamp));
    c.fillStyle = gr; c.fillRect(-w / 2, -h / 2, w, h);
    c.globalCompositeOperation = 'source-over';
    // капли падают на листок (с 4.6 c): тёмное мокрое пятно + брызги
    const r = rng('drops');
    for (let k = 0; k < 14; k++) {
      const t0 = 4.4 + r() * 3.2, x = (r() - .5) * w * .9, y = (r() - .5) * h * .85, rr = 3 + r() * 6;
      if (t < t0) continue;
      const k1 = clamp((t - t0) / .12), spread = 1 + 1.5 * clamp((t - t0) / 1.5);
      c.fillStyle = `rgba(80,70,60,${.22 * k1})`; c.beginPath(); c.ellipse(x, y, rr * spread, rr * spread * .9, 0, 0, 6.283); c.fill();
      if (t - t0 < .2) { c.strokeStyle = `rgba(255,240,215,${.8 * (1 - (t - t0) / .2)})`; c.lineWidth = 1; c.beginPath(); c.arc(x, y, rr * (1 + 6 * (t - t0)), 0, 6.283); c.stroke(); }
      c.fillStyle = `rgba(255,248,230,${.5 * k1})`; c.beginPath(); c.arc(x - rr * .3, y - rr * .3, rr * .25, 0, 6.283); c.fill();
    }
    c.restore();
  }

  function lampK(t) {
    if (t < .25) return 0;
    if (t < .75) return [1, 0, 1, .3, 0, 1][Math.floor((t - .25) / .5 * 6)] ?? 1;   // мигнула, как старая лампа
    if (t > 9.6) return t < 9.66 ? .35 : t < 9.7 ? .9 : 0;
    return 1;
  }
  const smoothK = k => k * k * k * (k * (k * 6 - 15) + 10);   // очень мягкий разгон и остановка камеры


  // ---------- как он двигается (по-человечески: вес, запаздывание, дуги) ----------
  // шаг крадучись: период 0.6 с, опорная ступня стоит на месте относительно земли, маховая — высоко поднятое колено
  function sneakFeet(T, P = .6, stride = 92, lift = 56) {
    return [0, 1].map(i => {
      const ph = ((T / P) + i * .5) % 1;
      if (ph < .5) return [stride / 2 - stride * (ph / .5), 0];
      const k = (ph - .5) / .5; return [-stride / 2 + stride * ease(k), -Math.sin(k * Math.PI) * lift];
    });
  }
  function poseStreet(t) {
    const T = sm(t), o = { s: .62, t: T, glass: true };
    if (T < 1.75) {                                   // крадётся
      const P = .6, ph = (T / P) % 1;
      o.x = 720 + 190 * T; o.feet = sneakFeet(T, P); o.tiptoe = true;
      o.hipDy = 8 - 7 * Math.cos(ph * 4 * Math.PI);  // ниже всего в момент постановки ноги
      o.lean = .16 + .03 * Math.sin(ph * 4 * Math.PI);
      o.armF = [.85 + .12 * Math.sin(ph * 2 * Math.PI), 1.0]; o.armB = [-.45 - .2 * Math.sin(ph * 2 * Math.PI), 1.7];   // руки в противофазе ногам
      o.swing = .12 * Math.sin(ph * 2 * Math.PI - 1);                                                                // пола отстаёт
      const glance = ramp(T, .85, 1.0) * (1 - ramp(T, 1.25, 1.4));                                                   // оглянулся через плечо
      o.look = lerp(.3, -.8, glance); o.head = -.12 * glance; o.lookY = 0; o.brow = .2 + .3 * glance;
      return o;
    }
    o.x = 720 + 190 * 1.75;
    const stop = ramp(T, 1.75, 2.0);                  // остановка: вес оседает и возвращается
    const notice = ramp(T, 1.95, 2.05), nEnd = ramp(T, 2.35, 2.5);
    const bendK = keys(T, [[2.45, 0], [2.6, -.15, easeOut], [3.05, 1, back]]);   // замах назад → наклон
    o.feet = [[lerp(-40, -40, bendK), 0], [lerp(28, 52, bendK), 0]];
    o.hipDy = (1 - stop) * 10 + Math.sin(stop * Math.PI) * 10 + bendK * 30;
    o.lean = lerp(.06 - notice * (1 - nEnd) * .1, .55, Math.max(0, bendK));
    o.swing = .18 * Math.sin(stop * Math.PI * 1.5) * (1 - stop) + bendK * .12;
    o.armF = [lerp(.5, 1.0, Math.max(0, bendK)), lerp(.9 + notice * (1 - nEnd) * .6, .35, Math.max(0, bendK))];
    o.armB = [lerp(-.2 - notice * (1 - nEnd) * .5, -.35, Math.max(0, bendK)), lerp(.5 + notice * (1 - nEnd) * 1.2, 1.0, Math.max(0, bendK))];
    const take = notice > 0 && nEnd < 1;
    o.eyes = take ? 'wide' : 'open'; o.brow = take ? 1 : .35; o.mouth = take ? 'o' : 'none';
    o.hatLift = Math.sin(ramp(T, 2.0, 2.5) * Math.PI) * 34;                                // шляпа подпрыгивает чуть позже головы
    o.look = .6; o.lookY = notice > 0 ? .9 : 0; o.head = notice > 0 ? .1 : 0;
    // читает: голова чуть ходит по строчкам
    if (T > 3.1) { o.head = .12 + .05 * Math.sin((T - 3.1) * 2.6); o.look = .6 + .15 * Math.sin((T - 3.1) * 1.3); }
    return o;
  }
  function poseFace(t) {
    const T = sm(t), L = T - 7.3, o = { s: .62, t: T, glass: true, x: 1052 };
    const up = ease(ramp(L, .4, .85)), headLag = ease(ramp(L, .55, 1.0));             // корпус выпрямляется, голова догоняет
    const shock = ramp(L, .85, .95) * (1 - ramp(L, 1.35, 1.45));
    const sly = ramp(L, 1.45, 1.55), chuckle = L > 1.6 && L < 2.0 ? Math.abs(Math.sin((L - 1.6) / .4 * Math.PI * 3)) : 0;
    const tip = ramp(L, 1.9, 2.0) * (1 - ramp(L, 2.42, 2.52));
    o.feet = [[lerp(-40, -26, up), 0], [lerp(52, 30, up), 0]];
    o.lean = lerp(.55, 0, up) - shock * .08; o.hipDy = lerp(30, 0, up) + chuckle * 5 - shock * 4;
    o.armF = [lerp(1.0, .25, up), lerp(.35, .6 + shock * .8, up)];
    o.armB = tip > 0 ? [lerp(-.2, 2.9, tip), lerp(.6, .5, tip)] : [lerp(-.35, -.15, up) - shock * .6, .6 + shock * 1.4];
    o.armBOver = tip > .9;
    o.eyes = shock > 0 ? 'wide' : sly > 0 ? 'half' : 'open'; o.brow = shock > 0 ? 1.1 : sly > 0 ? .55 : .3;
    o.mouth = shock > 0 ? 'o' : sly > 0 ? 'smirk' : 'none';
    o.lookY = lerp(1, -.1, headLag); o.look = lerp(.6, -.3, headLag); o.head = lerp(.15, 0, headLag) + chuckle * .04 - tip * .1;
    o.hatLift = shock * 26 + tip * 16 + Math.sin(ramp(L, .9, 1.4) * Math.PI) * 10; o.hatRot = -tip * .25;
    o.swing = .1 * Math.sin(ramp(L, .4, 1.2) * Math.PI);
    return o;
  }

  // ---------- 1. Переулок → наезд на листочек ----------
  function shotStreet(t) {
    const T = sm(t), lamp = lampK(t);
    const pushK = smoothK(ramp(t, 2.5, 5.3));
    const z = lerp(1 + .04 * ramp(t, 0, 2.5), 5.3, pushK) * (1 + .015 * ramp(t, 5.3, 7.3));
    const camX = lerp(960, NOTE.x + 6, pushK), camY = lerp(560, NOTE.y - 2, pushK);
    const P = poseStreet(t), dx = P.x;
    X.save();
    camBegin(camX, camY, z);
    envDraw(lamp);
    lightConeReal(lamp, t);
    lampPostReal(lamp);
    noteDraw(lerp(.42, .88, pushK), lamp, t);
    lampShadow(dx, NOTE.y + 46, 290, lamp);
    LIGHT = { x: .7, y: -.7, warm: '#FFE2A8', a: .35 + .65 * lamp };
    reflectDraw(GROUND + 96, () => detective(dx, GROUND + 96, { ...P,
      inLens: (lx, ly, r) => { X.save(); X.translate(lx, ly); X.scale(1.9, 1.9); X.translate(-lx, -ly); envDraw(lamp); noteDraw(lerp(.42, .88, pushK), lamp, t); X.restore(); } }), lamp);
    rainReal(t, lamp, camX - 1100 / z - 200, camX + 1100 / z + 200);
    camEnd();
    X.restore();
    fogReal(t, lamp, .08 * (1 - pushK * .6));
    bloom(.14 * (1 - pushK * .7));
    // перевод фокуса в конце (уходим в размытие)
    const rf = ramp(t, 7.05, 7.3); if (rf > 0) focusBlur(rf * 14);
    finish(t, 0);
  }

  // ---------- 2. Крупно: реакция ----------
  function shotFace(t, lt) {
    const T = sm(t), L = sm(lt), lamp = lampK(t);
    const camX = 1110, camY = 835, z = 2.6 + .12 * ramp(t, 7.3, 10);
    const P = poseFace(t);
    X.save();
    camBegin(camX, camY, z);
    envDraw(lamp);
    lightConeReal(lamp, t);
    noteDraw(.42, lamp, t);
    lampShadow(1052, NOTE.y + 46, 290, lamp);
    LIGHT = { x: .7, y: -.7, warm: '#FFE2A8', a: .35 + .65 * lamp };
    let det;
    reflectDraw(GROUND + 96, () => (det = detective(P.x, GROUND + 96, P)), lamp);
    rainReal(t, lamp, camX - 700, camX + 700);
    camEnd();
    X.restore();
    fogReal(t, lamp, .07);
    bloom(.12);
    // в полной темноте — последний блик лупы
    if (t > 9.72 && t < 9.97 && det && det.glass) {
      const k = Math.sin(ramp(t, 9.72, 9.97) * Math.PI), M = new DOMMatrix().translate(W / 2, H / 2).scale(z).translate(-camX, -camY), p = M.transformPoint(new DOMPoint(det.glass[0] - 16, det.glass[1] - 16));
      X.save(); X.setTransform(1, 0, 0, 1, 0, 0); glow(p.x, p.y, 40 + 60 * k, '#FFFFFF', .9 * k); X.restore();
    }
    const rf = 1 - ramp(t, 7.3, 7.55); if (rf > 0) focusBlur(rf * 14);
    finish(t, ramp(t, 9.7, 9.75) * .55 + ramp(t, 9.95, 10) * .45);
  }

  function focusBlur(px) {
    const s = layer('focus'); s.drawImage(X.canvas, 0, 0);
    X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.filter = `blur(${px}px)`; X.drawImage(s.canvas, 0, 0); X.restore();
  }
  function finish(t, black) {
    X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
    vignette(.55);
    if (black > 0) { X.fillStyle = `rgba(0,0,0,${black})`; X.fillRect(0, 0, W, H); }
    X.restore();
  }

  SHOTS = [[0, shotStreet], [7.3, shotFace]];
})();
