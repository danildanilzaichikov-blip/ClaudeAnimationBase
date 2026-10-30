// Монтаж: планы, время (hit-stop и замедления), камера с тряской, переходы, кадр целиком.
const SHOTS = [];
function shot(o) { o.impacts = o.impacts || []; o.dust = o.dust || []; o.debris = o.debris || []; o.splash = o.splash || []; o.sfx = o.sfx || []; o.warps = o.warps || []; o.actors = o.actors || []; SHOTS.push(o); return o; }

let BP = null, DURATION = 0, STORY = 0;
function buildTimeline() {
  let s = 0;
  for (const sh of SHOTS) { sh.S0 = s; s += sh.dur; for (const a of sh.actors) a.build(); }
  STORY = s;
  const W_ = [];
  for (const sh of SHOTS) {
    for (const im of sh.impacts) { im.stop = im.stop ?? (im.big ? 0.16 : 0.08); W_.push({ t: sh.S0 + im.t, stop: im.stop }); }
    for (const w of sh.warps) W_.push({ t: sh.S0 + w.t, dur: w.dur, rate: w.rate });
  }
  W_.sort((a, b) => a.t - b.t);
  BP = [[0, 0]]; let f = 0, last = 0;
  for (const w of W_) {
    if (w.t < last) continue;
    f += w.t - last; BP.push([w.t, f]);
    if (w.stop) { f += w.stop; BP.push([w.t, f]); last = w.t; }
    else { f += w.dur / w.rate; BP.push([w.t + w.dur, f]); last = w.t + w.dur; }
  }
  f += STORY - last; BP.push([STORY, f]); DURATION = f;
  for (const sh of SHOTS) for (const im of sh.impacts) im.ft = s2f(sh.S0 + im.t);
}
function f2s(ft) {
  for (let i = 1; i < BP.length; i++) if (ft <= BP[i][1]) { const a = BP[i - 1], b = BP[i]; return b[1] === a[1] ? a[0] : lerp(a[0], b[0], (ft - a[1]) / (b[1] - a[1])); }
  return STORY;
}
function s2f(st) {
  for (let i = 1; i < BP.length; i++) if (st < BP[i][0] || (i === BP.length - 1)) { const a = BP[i - 1], b = BP[i]; return b[0] === a[0] ? a[1] : lerp(a[1], b[1], (st - a[0]) / (b[0] - a[0])); }
  return DURATION;
}

function camAt(sh, t, ft) {
  const K = sh.cam.map(k => k.map((v, i) => (i && typeof v === 'function') ? v(t) : v)); let c;
  if (t <= K[0][0]) c = K[0]; else if (t >= K[K.length - 1][0]) c = K[K.length - 1];
  else { let i = 1; while (K[i][0] < t) i++; const a = K[i - 1], b = K[i], u = ease(b[4] || 'io', (t - a[0]) / (b[0] - a[0])); c = [t, lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]; }
  let x = c[1], y = c[2], z = c[3];
  const hand = sh.hand ?? 2.5; x += noise1(ft * 0.6 + 10) * hand; y += noise1(ft * 0.5 + 40) * hand;
  if (sh.follow) { const p = sh.follow(t); x += p[0]; y += p[1]; }
  let rot = 0;
  for (const im of sh.impacts) {
    const d = ft - im.ft; if (d < 0 || d > 0.8) continue;
    const amp = (im.shake ?? (im.big ? 16 : 6)) * Math.exp(-d * 8);
    x += noise1(ft * 45 + im.t * 10) * amp; y += noise1(ft * 45 + 77 + im.t) * amp; rot += noise1(ft * 30 + 5) * amp * 0.0012;
    z *= 1 + (im.big ? 0.07 : 0.025) * Math.exp(-d * 11);
  }
  return { x, y, z, rot };
}
function impactPoint(im, t) { return im.p ? im.p(t) : [im.x, im.y]; }

function renderShot(ctx, sh, t, ft) {
  BOIL_T = sh.S0 + t;
  const cam = camAt(sh, t, ft);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  sky(ctx, sh.sky || 'sunset', sh.sunY, sh.body || (sh.sunY ? 'sun' : 'none'));
  ctx.save();
  // поворот кадра при тряске
  ctx.translate(W / 2, H / 2); ctx.rotate(cam.rot); ctx.translate(-W / 2, -H / 2);
  const M = ctx.getTransform();
  const setMain = () => { ctx.setTransform(M); ctx.transform(cam.z, 0, 0, -cam.z, W / 2 - cam.x * cam.z, H / 2 + cam.y * cam.z); };
  if (sh.bg) { const L = layer; layer = (c, cm, d, fn) => { c.save(); c.setTransform(M); const z = cm.z * lerp(0.55, 1, d); c.transform(z, 0, 0, -z, W / 2 - cm.x * d * z, H / 2 + cm.y * d * z + (1 - d) * 120); fn(); c.restore(); }; sh.bg(ctx, t, cam); layer = L; }
  setMain();
  if (sh.mid) sh.mid(ctx, t, cam);
  for (const a of sh.actors) drawShadow(ctx, a, t, sh.gy ? sh.gy(a.sample(t).x) : 0);
  for (const a of sh.actors) drawSmears(ctx, a, t);
  // вибрация жертвы во время hit-stop
  const vib = {};
  for (const im of sh.impacts) if (im.victim && ft >= im.ft && ft < im.ft + im.stop + 0.04) vib[im.victim] = Math.sin(ft * 190) * (im.big ? 3 : 1.8);
  for (const a of sh.actors) drawActor(ctx, a, t, { dx: vib[a.name] || 0 });
  for (const d of sh.dust) fxDust(ctx, d, t);
  for (const d of sh.debris) fxDebris(ctx, d, t);
  for (const d of sh.splash) fxSplash(ctx, d, t);
  if (sh.fg) sh.fg(ctx, t, cam);
  setMain();
  for (const im of sh.impacts) { const p = impactPoint(im, im.t); fxImpact(ctx, Object.assign({}, im, { x: p[0], y: p[1] }), t); }
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (sh.over) sh.over(ctx, t, ft, cam);
  // импакт-кадр: инверсия на 2 кадра на сильных ударах
  for (const im of sh.impacts) if (im.big && ft >= im.ft && ft < im.ft + 2 / FPS) {
    ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#efe6d2'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#e8c2b0'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    const p = impactPoint(im, im.t), sx = W / 2 + (p[0] - cam.x) * cam.z, sy = H / 2 - (p[1] - cam.y) * cam.z;
    focusLines(ctx, 0.9, sx, sy, im.t * 33);
  }
}

let BUF = null;
function buf(i) { BUF = BUF || [0, 1].map(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }); return BUF[i]; }

function renderFrame(ctx, ft) {
  if (!BP) buildTimeline();
  ft = clamp(ft, 0, DURATION - 1e-6);
  const st = f2s(ft);
  let i = SHOTS.findIndex(s => st < s.S0 + s.dur); if (i < 0) i = SHOTS.length - 1;
  const sh = SHOTS[i];
  // переход на входе в этот план или на входе в следующий
  const tr = (k) => { const s = SHOTS[k]; return s && s.tin && s.tin.type !== 'cut' ? s.tin : null; };
  let A = null, B = null, u = 0, T = null;
  const nx = SHOTS[i + 1], tn = tr(i + 1), tc = tr(i);
  if (tn && st > nx.S0 - tn.d / 2) { A = sh; B = nx; T = tn; u = (st - (nx.S0 - tn.d / 2)) / tn.d; }
  else if (tc && i > 0 && st < sh.S0 + tc.d / 2) { A = SHOTS[i - 1]; B = sh; T = tc; u = (st - (sh.S0 - tc.d / 2)) / tc.d; }
  if (!T) { renderShot(ctx, sh, st - sh.S0, ft); }
  else {
    const ca = buf(0).getContext('2d'), cb = buf(1).getContext('2d');
    renderShot(ca, A, st - A.S0, ft); renderShot(cb, B, st - B.S0, ft);
    composite(ctx, T, clamp(u, 0, 1), buf(0), buf(1));
  }
  // вход из бумаги и уход в бумагу
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fin = 1 - clamp(ft / 0.8, 0, 1), fout = clamp((ft - (DURATION - 1.2)) / 1.0, 0, 1);
  const fa = Math.max(EASE.io(fin), EASE.io(fout));
  if (fa > 0) { ctx.globalAlpha = fa; ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  paperOverlay(ctx);
}

function composite(ctx, T, u, a, b) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (T.type === 'fade') {
    ctx.drawImage(u < 0.5 ? a : b, 0, 0); ctx.globalAlpha = 1 - Math.abs(u - 0.5) * 2; ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  } else if (T.type === 'whip') {
    const e = EASE.io2(u), off = e * W * (T.dir || 1), src = e < 0.5 ? a : b, base = e < 0.5 ? -off : W * (T.dir || 1) - off;
    for (let k = 0; k < 8; k++) { ctx.globalAlpha = k ? 0.16 : 1; ctx.drawImage(src, base + k * 70 * Math.sin(Math.PI * u) * (T.dir || 1), 0); }
    ctx.globalAlpha = 1; speedLines(ctx, Math.sin(Math.PI * u), 3);
  } else if (T.type === 'wipe') {
    // мазок тушью: полоса проходит по кадру, за ней новый план
    ctx.drawImage(a, 0, 0);
    const e = EASE.io(u), x = lerp(-500, W + 500, e);
    ctx.save(); ctx.beginPath(); ctx.moveTo(x, 0);
    for (let k = 0; k <= 12; k++) ctx.lineTo(x - 260 * (k / 12) + noise1(k * 1.7) * 40, H * k / 12);
    ctx.lineTo(-10, H); ctx.lineTo(-10, 0); ctx.closePath(); ctx.clip(); ctx.drawImage(b, 0, 0); ctx.restore();
    ctx.fillStyle = PAL.ink;
    for (let k = 0; k < 6; k++) { ctx.globalAlpha = 0.85 - k * 0.12; ctx.beginPath(); ctx.moveTo(x + k * 18, 0); for (let j = 0; j <= 12; j++) ctx.lineTo(x - 260 * (j / 12) + noise1(j * 1.7 + k) * 40 + k * 18 + 30, H * j / 12); for (let j = 12; j >= 0; j--) ctx.lineTo(x - 260 * (j / 12) + noise1(j * 1.7 + k) * 40 + k * 18, H * j / 12); ctx.fill(); }
    ctx.globalAlpha = 1;
  } else if (T.type === 'iris') {
    const cx = T.x ?? W / 2, cy = T.y ?? H / 2, R = len(W, H);
    ctx.drawImage(u < 0.5 ? a : b, 0, 0);
    const r = u < 0.5 ? lerp(R, 0, EASE.in2(u * 2)) : lerp(0, R, EASE.out2(u * 2 - 1));
    ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(cx, cy, Math.max(r, 0.1), 0, 7, true); ctx.fill('evenodd');
  } else if (T.type === 'flash') {
    ctx.drawImage(u < 0.5 ? a : b, 0, 0); ctx.globalAlpha = Math.pow(1 - Math.abs(u - 0.5) * 2, 2); ctx.fillStyle = '#fbf4e4'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  } else if (T.type === 'dissolve') {
    ctx.drawImage(a, 0, 0); ctx.globalAlpha = EASE.io(u); ctx.drawImage(b, 0, 0); ctx.globalAlpha = 1;
  } else ctx.drawImage(u < 0.5 ? a : b, 0, 0);
}

// Звуковые события в фильмовом времени — для синтеза дорожки.
function sfxList() {
  if (!BP) buildTimeline();
  const out = [];
  for (const sh of SHOTS) {
    for (const s of sh.sfx) out.push(Object.assign({}, s, { ft: s2f(sh.S0 + s.t) }));
    for (const im of sh.impacts) if (!im.silent) out.push({ ft: im.ft, type: im.snd || (im.big ? 'big' : 'hit'), v: im.v || 1 });
  }
  return out.sort((a, b) => a.ft - b.ft);
}
