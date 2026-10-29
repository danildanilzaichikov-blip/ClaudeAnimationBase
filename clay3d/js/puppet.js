// puppet.js — Инспектор Шлёп, объёмная пластилиновая кукла на каркасе (единицы — сантиметры, рост ≈ 31 см со шляпой).
// Как у настоящей куклы для стоп-моушена: внутри «проволочный» скелет (группы-суставы), снаружи — комки пластилина,
// слегка неровные (smear по шуму) и с отпечатками пальцев (bump-текстура). Смотрит вдоль +Z, вверх +Y.
//
// p = makeDetective(clayTex); scene.add(p.root); p.pose({...}) — каждый кадр.
// pose: x, z, yaw, hipDy, lean, swing, feet: [[вперёд, вверх] левой, [..] правой], tiptoe,
//       armL / armR: [плечо, локоть] (рад, + вперёд), spreadL/R, grip (0..1 сжать пальцы), wristR,
//       nod, headYaw, headTilt, look: [x, y] зрачки, eyes: 'open'|'wide'|'half'|'shut', brow (−1..1.2), mouth: 'none'|'o'|'smirk'|'flat',
//       hatLift, hatRot, boil (номер стоп-кадра — мелкая «живая» дрожь суставов).
import * as THREE from 'three';
import { hash } from './tex.js';

// ---------- 3D шум для «вылепленных» неровностей ----------
function n3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const h = (a, b, c) => { let n = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const s = t => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf);
  const L = (a, b, k) => a + (b - a) * k;
  return L(L(L(h(xi, yi, zi), h(xi + 1, yi, zi), u), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
           L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
}
function sculpt(geo, amp = .06, freq = 1.4, seed = 0) {
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = (n3(x * freq + seed, y * freq, z * freq) - .5) * 2 + (n3(x * freq * 3, y * freq * 3 + seed, z * freq * 3) - .5) * .5;
    p.setXYZ(i, x + n.getX(i) * k * amp, y + n.getY(i) * k * amp, z + n.getZ(i) * k * amp);
  }
  geo.computeVertexNormals(); return geo;
}
// капсула от y=0 вниз до y=−len, радиус r0 → r1
function capsuleDown(len, r0, r1 = r0, seg = 14) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r1, -len + Math.sin(a) * r1)); }
  for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0)); }
  return new THREE.LatheGeometry(pts, seg);
}
// трубка по кривой с утоньшением к концам (брови, усы, рот)
function taperTube(points, r, taper = t => Math.sin(Math.PI * (.08 + .84 * t)), seg = 24, rad = 10) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, seg, r, rad, false), pos = g.attributes.position;
  for (let i = 0; i <= seg; i++) { const c = curve.getPointAt(i / seg), k = taper(i / seg); for (let j = 0; j <= rad; j++) { const idx = i * (rad + 1) + j; pos.setXYZ(idx, c.x + (pos.getX(idx) - c.x) * k, c.y + (pos.getY(idx) - c.y) * k, c.z + (pos.getZ(idx) - c.z) * k); } }
  g.computeVertexNormals(); return g;
}

export function makeDetective(clayTex) {
  const MAT = {};
  const mat = (name, color, o = {}) => MAT[name] || (MAT[name] = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? .72, metalness: 0, bumpMap: o.bump === false ? null : clayTex, bumpScale: (o.bs ?? 1.2) * 2.6, ...(o.extra || {}) }));
  const C = {
    coat: mat('coat', 0xC29A62), coatD: mat('coatD', 0xA88352), skin: mat('skin', 0xEDB08C), skinD: mat('skinD', 0xD9957A), nose: mat('nose', 0xE0806A),
    cheek: mat('cheek', 0xEF9C88), brow: mat('brow', 0x3A2A22), hat: mat('hat', 0x5A3A29), band: mat('band', 0x24170F), pants: mat('pants', 0x45405A),
    shoe: mat('shoe', 0x2A2220, { rough: .38 }), white: mat('white', 0xF4EFE6, { rough: .35, bs: .4 }), pupil: mat('pupil', 0x0E0B10, { rough: .2, bs: .2 }),
    belt: mat('belt', 0x6E4C2E, { rough: .45 }), brass: new THREE.MeshStandardMaterial({ color: 0xD2A03A, roughness: .3, metalness: .85 }),
    nail: mat('nail', 0xF4C9BE, { rough: .3, bs: .2 }), mouth: mat('mouth', 0x4A161E, { rough: .4 }), wood: mat('wood', 0x5E3820, { rough: .5 }),
  };
  let seedN = 0;
  const M = (geo, m, parent, pos = [0, 0, 0], scl = [1, 1, 1], rot = [0, 0, 0], amp = .05) => {
    sculpt(geo, amp, 1.3, ++seedN * 7.1);
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(...pos); mesh.scale.set(...scl); mesh.rotation.set(...rot);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const G = (parent, pos = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };
  const sph = (r, ws = 22, hs = 16) => new THREE.SphereGeometry(r, ws, hs);

  const L = { thigh: 4.6, shin: 4.4, upper: 4.0, fore: 3.8, hipY: 9.6, ankle: .8 };
  const root = new THREE.Group(), pelvis = G(root, [0, L.hipY, 0]);
  const J = { root, pelvis };

  // ---------- ноги ----------
  for (const side of [1, -1]) {
    const k = side > 0 ? 'L' : 'R', hip = G(pelvis, [side * 1.6, 0, 0]);
    M(capsuleDown(L.thigh, 1.2, 1.05), C.pants, hip);
    const knee = G(hip, [0, -L.thigh, 0]);
    M(sph(1.08), C.pants, knee, [0, 0, .05]);
    M(capsuleDown(L.shin, 1.02, .82), C.pants, knee);
    const ankle = G(knee, [0, -L.shin, 0]);
    M(sph(1.0), C.shoe, ankle, [0, -.35, 1.0], [1.15, .72, 2.0]);                       // ботинок
    M(sph(.75), C.shoe, ankle, [0, -.05, -.25], [1.1, .9, 1.1]);                       // пятка
    M(new THREE.BoxGeometry(2.2, .25, 4.2, 4, 1, 6), C.band, ankle, [0, -.78, .95]);    // подошва
    J['hip' + k] = hip; J['knee' + k] = knee; J['ankle' + k] = ankle;
  }

  // ---------- юбка плаща (на тазу — качается отдельно) ----------
  const skirtG = G(pelvis, [0, 1.2, 0]);
  const skirtProf = [[4.55, -6.1], [4.6, -5.8], [4.35, -4.4], [4.05, -2.5], [3.85, -.6], [3.75, .6], [3.6, .8]].map(([r, y]) => new THREE.Vector2(r, y));
  M(new THREE.LatheGeometry(skirtProf, 36), C.coat, skirtG, [0, 0, 0], [1, 1, .8], [0, 0, 0], .08).material.side = THREE.DoubleSide;
  M(new THREE.TorusGeometry(4.5, .22, 8, 40), C.coatD, skirtG, [0, -6.0, 0], [1, .8, .8], [Math.PI / 2, 0, 0], .03);   // подшитый край
  J.skirt = skirtG;

  // ---------- корпус ----------
  const spine = G(pelvis, [0, .4, 0]); J.spine = spine;
  const torsoProf = [[0, -1], [3.7, -.8], [3.85, .8], [3.75, 3.5], [3.6, 5.8], [3.25, 7.4], [2.2, 8.5], [1.3, 8.9], [0, 9.0]].map(([r, y]) => new THREE.Vector2(r, y));
  M(new THREE.LatheGeometry(torsoProf, 36), C.coat, spine, [0, 0, 0], [1, 1, .8], [0, 0, 0], .08);
  // запах: полоса-край полы по диагонали, пуговицы в два ряда
  M(taperTube([[.4, 8.2, 2.85], [.9, 5, 3.1], [1.1, 1.5, 3.15], [1.2, -1, 3.1]], .22, () => 1), C.coatD, spine, [0, 0, 0], [1, 1, 1], [0, 0, 0], .02);
  for (const [bx, by] of [[1.9, 6.2], [1.9, 3.8], [-1.1, 6.2], [-1.1, 3.8]]) M(sph(.32, 12, 10), C.belt, spine, [bx, by, 2.92 + (bx > 0 ? .05 : 0)], [1, 1, .55]);
  // лацканы
  for (const s of [1, -1]) M(sph(1.3, 16, 12), C.coat, spine, [s * 1.3, 7.3, 2.45], [.75, 1.4, .3], [.25, s * .35, s * -.35], .04);
  // пояс с пряжкой
  M(new THREE.TorusGeometry(3.85, .36, 10, 48), C.belt, spine, [0, 1.6, 0], [1, .8 * 1, 1], [Math.PI / 2, 0, 0], .02).scale.set(1, .8, 1);
  M(new THREE.BoxGeometry(1.25, 1.05, .35, 3, 3, 1), C.brass, spine, [.3, 1.6, 3.1], [1, 1, 1], [0, .08, 0], .02);
  M(new THREE.BoxGeometry(.7, .55, .4), C.belt, spine, [.3, 1.6, 3.2]);
  // воротник
  M(new THREE.TorusGeometry(1.75, .62, 10, 28), C.coat, spine, [0, 8.55, .1], [1, 1, 1.25], [Math.PI / 2 - .25, 0, 0], .05);

  // ---------- руки ----------
  for (const side of [1, -1]) {
    const k = side > 0 ? 'L' : 'R', sh = G(spine, [side * 3.55, 7.2, 0]);
    M(sph(1.35), side > 0 ? C.coatD : C.coat, sh, [0, -.1, 0]);                                       // плечо
    M(capsuleDown(L.upper, 1.12, 1.0), side > 0 ? C.coatD : C.coat, sh);
    const el = G(sh, [0, -L.upper, 0]);
    M(sph(1.0), side > 0 ? C.coatD : C.coat, el);
    M(capsuleDown(L.fore, .98, .9), side > 0 ? C.coatD : C.coat, el);
    M(new THREE.TorusGeometry(.95, .26, 8, 24), C.coatD, el, [0, -L.fore + .35, 0], [1, 1, 1], [Math.PI / 2, 0, 0], .02);   // манжета
    const wr = G(el, [0, -L.fore, 0]);
    const hand = buildHand(wr, side);
    J['sh' + k] = sh; J['el' + k] = el; J['wr' + k] = wr; J['hand' + k] = hand;
  }
  function buildHand(wr, side) {
    const H = { fingers: [] }, inward = -side;
    M(capsuleDown(.5, .62, .62), C.skin, wr, [0, .1, 0]);                                    // запястье
    M(sph(1.0, 24, 18), C.skin, wr, [0, -1.0, 0], [.55, 1.15, 1.05], [0, 0, 0], .04);           // ладонь
    M(sph(.6, 14, 12), C.skinD, wr, [inward * .25, -1.0, .55], [.6, .9, .6]);                     // подушка большого пальца
    // четыре пальца по три фаланги: указательный впереди (+z)
    const spec = [[.72, [.95, .68, .52], .3], [.24, [1.05, .74, .56], .31], [-.24, [.98, .7, .52], .29], [-.68, [.8, .56, .44], .26]];
    for (const [fz, lens, r] of spec) {
      let parent = G(wr, [0, -1.95, fz]), chain = [];
      for (let j = 0; j < 3; j++) {
        const rr = r * (1 - j * .1);
        M(sph(rr * 1.08, 12, 10), C.skin, parent);                                              // костяшка
        M(capsuleDown(lens[j], rr, rr * .92, 10), C.skin, parent, [0, 0, 0], [1, 1, 1], [0, 0, 0], .015);
        chain.push(parent);
        const next = G(parent, [0, -lens[j], 0]);
        if (j === 2) {
          M(sph(rr * .95, 12, 10), C.skin, next, [0, -.05, 0]);                                  // подушечка
          M(sph(rr * .75, 10, 8), C.nail, next, [-inward * rr * .55, .12, 0], [.35, .9, .9], [0, 0, 0], .005);   // ноготь
        }
        parent = next;
      }
      H.fingers.push(chain);
    }
    // большой палец: две фаланги, торчит вперёд-внутрь
    let tp = G(wr, [inward * .3, -.75, .85]); const thumb = [tp];
    tp.rotation.set(-.7, 0, inward * .5);
    for (let j = 0; j < 2; j++) {
      M(sph(.36, 12, 10), C.skin, tp); M(capsuleDown(j ? .62 : .78, .35, .31, 10), C.skin, tp, [0, 0, 0], [1, 1, 1], [0, 0, 0], .015);
      const nx = G(tp, [0, j ? -.62 : -.78, 0]);
      if (j) { M(sph(.32, 12, 10), C.skin, nx); M(sph(.24, 10, 8), C.nail, nx, [-inward * .18, .1, .12], [.4, .9, .9], [0, 0, 0], .005); }
      else thumb.push(nx);
      tp = nx;
    }
    H.thumb = thumb;
    return H;
  }

  // ---------- шея и голова ----------
  const neck = G(spine, [0, 8.5, .1]); J.neck = neck;
  M(capsuleDown(1.6, .95, 1.05).rotateX(Math.PI), C.skinD, neck);
  const head = G(neck, [0, 4.6, .15]); J.head = head;
  M(sph(3.35, 32, 24), C.skin, head, [0, 0, 0], [1, 1.04, .97], [0, 0, 0], .08);                  // череп
  M(sph(2.6, 28, 20), C.skin, head, [0, -1.5, .7], [1.05, .8, 1.0], [0, 0, 0], .07);               // щёки и челюсть
  for (const s of [1, -1]) {
    M(sph(.95, 16, 12), C.cheek, head, [s * 1.85, -.75, 2.3], [1, .8, .6]);                          // румянец
    const ear = M(sph(1.0, 16, 12), C.skin, head, [s * 3.15, -.2, -.1], [.45, 1.05, .8]);           // уши
    M(sph(.55, 12, 10), C.skinD, head, [s * 3.42, -.2, 0], [.3, .8, .6]);
  }
  M(sph(1.48, 24, 18), C.nose, head, [0, -.35, 3.35], [1.05, .9, 1.05], [0, 0, 0], .06);          // нос-картошка
  for (const s of [1, -1]) M(sph(.28, 10, 8), C.mouth, head, [s * .5, -1.05, 4.0], [1, .6, .6]);    // ноздри
  // глаза: белок, зрачок, верхнее веко
  const eyes = [];
  for (const s of [1, -1]) {
    const eg = G(head, [s * 1.15, .78, 2.62]);
    M(sph(.8, 20, 16), C.white, eg, [0, 0, 0], [1, 1.15, .8], [0, 0, 0], .01);
    const pup = G(eg, [0, 0, .52]); M(sph(.36, 14, 12), C.pupil, pup, [0, 0, 0], [1, 1.1, .6], [0, 0, 0], 0);
    M(sph(.1, 8, 6), C.white, pup, [.1, .12, .2], [1, 1, 1], [0, 0, 0], 0);                          // блик
    const lid = G(eg, [0, 0, 0]);
    const lg = new THREE.SphereGeometry(.88, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    M(lg, C.skin, lid, [0, 0, 0], [1.02, 1.17, .85], [0, 0, 0], .01).material.side = THREE.DoubleSide;
    eyes.push({ g: eg, pup, lid });
  }
  J.eyes = eyes;
  // брови
  const brows = [];
  for (const s of [1, -1]) { const b = G(head, [s * 1.25, 2.05, 2.75]); M(taperTube([[-s * .9, -.15, -.2], [0, .18, 0], [s * .95, -.1, -.3]], .3), C.brow, b, [0, 0, 0], [1, 1, 1], [0, 0, 0], .02); brows.push(b); }
  J.brows = brows;
  // усы и рот
  for (const s of [1, -1]) M(taperTube([[0, -1.25, 4.1], [s * .9, -1.5, 3.85], [s * 1.75, -1.55, 3.3], [s * 2.25, -1.15, 2.95]], .38, t => Math.sin(Math.PI * (.12 + .82 * Math.pow(t, .8)))), C.brow, head, [0, 0, 0], [1, 1, 1], [0, 0, 0], .03);
  const mouthO = M(sph(.42, 14, 12), C.mouth, head, [0, -2.25, 3.0], [1, 1.2, .5]);
  const mouthS = M(taperTube([[-.7, -2.2, 3.05], [0, -2.35, 3.15], [.75, -2.05, 2.95]], .14, () => 1), C.mouth, head, [0, 0, 0], [1, 1, 1], [0, 0, 0], .005);
  const mouthF = M(taperTube([[-.55, -2.25, 3.08], [0, -2.3, 3.15], [.55, -2.25, 3.08]], .12, () => 1), C.mouth, head, [0, 0, 0], [1, 1, 1], [0, 0, 0], .005);
  J.mouth = { o: mouthO, smirk: mouthS, flat: mouthF };
  // волосы сзади из-под шляпы
  for (let i = 0; i < 9; i++) { const a = Math.PI * (.6 + i / 8 * .8); M(sph(.7, 10, 8), C.brow, head, [Math.cos(a) * 3.0, 1.0 - (i % 2) * .3, Math.sin(a) * 2.9], [1, .8, 1]); }

  // ---------- шляпа ----------
  const hat = G(head, [0, 2.35, -.15]); J.hat = hat; const hatIn = G(hat); J.hatIn = hatIn;
  const crownProf = [[3.0, 0], [2.95, 1.2], [2.8, 2.4], [2.55, 3.0], [1.8, 3.25], [0, 3.1]].map(([r, y]) => new THREE.Vector2(r, y));
  const crown = new THREE.LatheGeometry(crownProf, 40), cp = crown.attributes.position;
  for (let i = 0; i < cp.count; i++) {                                                              // залом сверху и щипки спереди
    const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i), top = Math.max(0, y - 2.2);
    cp.setY(i, y - top * .9 * Math.exp(-x * x / 1.2) - (z > 1 ? top * .5 * Math.exp(-Math.pow(Math.abs(x) - 1.2, 2) * 2) : 0));
  }
  M(crown, C.hat, hatIn, [0, 0, 0], [1, 1, .92], [0, 0, 0], .06).material.side = THREE.DoubleSide;
  const brimProf = [[2.9, .05], [4.0, .02], [5.0, .2], [5.35, .5], [5.2, .55], [4.9, .3], [4.0, .25], [2.9, .3]].map(([r, y]) => new THREE.Vector2(r, y));
  const brim = new THREE.LatheGeometry(brimProf, 48), bp = brim.attributes.position;
  for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), z = bp.getZ(i); bp.setY(i, bp.getY(i) - (z > 0 ? .55 * Math.max(0, z / 5) ** 2 : -.1 * (z / 5) ** 2) + Math.abs(x) * .03); }   // поля опущены спереди
  M(brim, C.hat, hatIn, [0, 0, 0], [1, 1, .9], [0, 0, 0], .05).material.side = THREE.DoubleSide;
  M(new THREE.CylinderGeometry(3.0, 3.03, .75, 40, 1, true), C.band, hatIn, [0, .65, 0], [1, 1, .92], [0, 0, 0], .01).material.side = THREE.DoubleSide;

  // ---------- лупа (в правой руке) ----------
  const lens = G(J.wrR, [0, -1.25, 0]); J.lens = lens;
  M(new THREE.CylinderGeometry(.32, .38, 4.2, 14).translate(0, 0, 0).rotateX(Math.PI / 2), C.wood, lens, [0, 0, 1.2], [1, 1, 1], [0, 0, 0], .01);
  const ring = G(lens, [0, 0, 5.6]); J.lensRing = ring;
  const brass = new THREE.Mesh(new THREE.TorusGeometry(2.3, .26, 14, 48), C.brass); brass.rotation.x = Math.PI / 2; brass.castShadow = true; ring.add(brass);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(2.15, 40), new THREE.MeshPhysicalMaterial({ color: 0xDDEEFF, roughness: .04, metalness: 0, transparent: true, opacity: .18, clearcoat: 1, side: THREE.DoubleSide }));
  glass.rotation.x = -Math.PI / 2; ring.add(glass); J.glass = glass;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .6, 14).rotateX(Math.PI / 2), C.brass); collar.position.z = 3.3; lens.add(collar);

  // ---------- поза ----------
  function legIK(k, side, foot, hipDy, tiptoe) {
    const hipH = L.hipY + hipDy, tz = foot[0], ty = foot[1] + L.ankle + (tiptoe ? .6 : 0);
    const dy = ty - hipH, dz = tz, d = Math.min(Math.hypot(dz, dy), L.thigh + L.shin - .02), l1 = L.thigh, l2 = L.shin;
    const a0 = Math.atan2(dz, -dy), cA = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const a = a0 + cA, b = Math.PI - Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2))));
    J['hip' + k].rotation.set(-a, 0, 0); J['knee' + k].rotation.set(b, 0, 0); J['ankle' + k].rotation.set(a - b + (tiptoe ? .55 : 0), 0, 0);
  }
  function hand(H, grip, side) {
    H.fingers.forEach((ch, i) => ch.forEach((j, n) => j.rotation.set(0, 0, -side * -1 * grip * (n === 0 ? 1.25 : 1.35) * (1 - i * .03) * -1)));
    H.thumb[0].rotation.set(-.7 - grip * .3, 0, -side * (.5 + grip * .5)); H.thumb[1].rotation.set(0, 0, -side * grip * .9);
  }
  J.pose = (p) => {
    const jit = (id, a) => (hash(id, p.boil || 0) - .5) * 2 * a;
    root.position.set(p.x ?? 0, 0, p.z ?? 0); root.rotation.set(0, p.yaw ?? 0, 0);
    pelvis.position.y = L.hipY + (p.hipDy || 0); pelvis.position.x = p.hipX || 0;
    const feet = p.feet || [[-.6, 0], [.6, 0]];
    legIK('L', 1, feet[0], p.hipDy || 0, p.tiptoe); legIK('R', -1, feet[1], p.hipDy || 0, p.tiptoe);
    spine.rotation.set((p.lean || 0) + jit('sp', .012), jit('spy', .015), (p.sway || 0) + jit('spz', .01));
    skirtG.rotation.set((p.swing || 0) * .6 + (p.lean || 0) * .35, 0, jit('sk', .015));
    const breath = p.breath || 0; spine.scale.set(1 + breath * .015, 1 + breath * .012, 1 + breath * .02);
    for (const [k, side] of [['L', 1], ['R', -1]]) {
      const a = p['arm' + k] || [.05, .25];
      J['sh' + k].rotation.set(-a[0] + jit('a1' + k, .02), 0, side * (p['spread' + k] ?? .12) + jit('a2' + k, .015));
      J['el' + k].rotation.set(-a[1] + jit('e' + k, .02), 0, 0);
    }
    J.wrR.rotation.set(p.wristR ?? 0, p.wristRy ?? 0, 0); J.wrL.rotation.set(p.wristL ?? .1, 0, 0);
    hand(J.handR, p.gripR ?? 1, -1); hand(J.handL, p.gripL ?? .35, 1);
    neck.rotation.set((p.nod || 0) * .5 + jit('n', .015), (p.headYaw || 0) * .4, (p.headTilt || 0) * .5);
    head.rotation.set((p.nod || 0) * .6, (p.headYaw || 0) * .6, (p.headTilt || 0) * .6);
    // глаза
    const e = p.eyes || 'open', [lx, ly] = p.look || [0, 0], wide = e === 'wide';
    eyes.forEach(({ g, pup, lid }) => {
      g.scale.setScalar(wide ? 1.18 : 1); pup.scale.setScalar(wide ? .75 : 1);
      pup.position.set(lx * .32, ly * .3, .52 - Math.hypot(lx, ly) * .06);
      lid.rotation.x = e === 'shut' ? 1.45 : e === 'half' ? .55 : wide ? -1.1 : -.75;
    });
    brows.forEach((b, i) => { const s = i ? -1 : 1, br = p.brow ?? 0; b.position.y = 2.05 + br * .55 + (wide ? .3 : 0); b.rotation.set(0, 0, s * (br > 0 ? -.12 * br : .3 * -br) + (p.browTilt || 0) * s); });
    const m = p.mouth || 'none'; for (const k in J.mouth) J.mouth[k].visible = k === m;
    hat.position.y = 2.35 + (p.hatLift || 0); hat.rotation.set(p.hatRot || 0, 0, p.hatRotZ || 0);
    root.updateMatrixWorld(true);
  };
  return J;
}
