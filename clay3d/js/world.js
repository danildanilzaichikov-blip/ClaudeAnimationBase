// world.js — «живой» ночной переулок в натуральную величину (сантиметры): кирпичная стена, мокрая брусчатка,
// бордюр, чугунный фонарный столб (сам фонарь высоко за кадром), водосточная труба, дождь, брызги, листочек.
import * as THREE from 'three';
import { brickTextures, cobbleTextures, rng, hash } from './tex.js';

export function makeWorld(scene, noteTex) {
  const W = {};
  // ---------- стена ----------
  const bt = brickTextures();
  const wallW = 520, wallH = 320, rep = [wallW / bt.size[0], wallH / bt.size[1]];
  for (const t of [bt.map, bt.normalMap, bt.roughnessMap]) t.repeat.set(...rep);
  const wg = new THREE.PlaneGeometry(wallW, wallH, 1, 32); wg.translate(60, wallH / 2, 0);
  // сырость и копоть у земли — вершинные цвета
  const col = new Float32Array(wg.attributes.position.count * 3);
  for (let i = 0; i < wg.attributes.position.count; i++) { const y = wg.attributes.position.getY(i), k = 1 - .45 * Math.exp(-y / 35) - .15 * Math.exp(-y / 8); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
  wg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const wall = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ map: bt.map, normalMap: bt.normalMap, normalScale: new THREE.Vector2(1.4, 1.4), roughnessMap: bt.roughnessMap, roughness: 1, vertexColors: true }));
  wall.receiveShadow = true; scene.add(wall);

  // ---------- мостовая ----------
  const ct = cobbleTextures();
  const gw = 520, gd = 320;
  for (const t of [ct.map, ct.normalMap, ct.roughnessMap]) t.repeat.set(gw / ct.size[0], gd / ct.size[1]);
  const gg = new THREE.PlaneGeometry(gw, gd, 1, 1); gg.rotateX(-Math.PI / 2); gg.translate(60, 0, gd / 2 + 12);
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: ct.map, normalMap: ct.normalMap, normalScale: new THREE.Vector2(1.6, 1.6), roughnessMap: ct.roughnessMap, roughness: 1, metalness: .05, envMapIntensity: 1.2 }));
  ground.receiveShadow = true; scene.add(ground);
  // бордюр у стены
  const curbM = new THREE.MeshStandardMaterial({ color: 0x5A5A5E, roughness: .55 });
  const curb = new THREE.Mesh(new THREE.BoxGeometry(gw, 6, 12), curbM); curb.position.set(60, 3, 6); curb.receiveShadow = curb.castShadow = true; scene.add(curb);

  // ---------- фонарный столб (чугун), фонарь — высоко, за кадром ----------
  const iron = new THREE.MeshStandardMaterial({ color: 0x1A1E22, roughness: .45, metalness: .7 });
  const post = new THREE.Group(); post.position.set(96, 0, 26); scene.add(post);
  const add = (geo, y) => { const m = new THREE.Mesh(geo, iron); m.position.y = y; m.castShadow = m.receiveShadow = true; post.add(m); return m; };
  add(new THREE.CylinderGeometry(11, 13, 10, 8), 5);
  add(new THREE.CylinderGeometry(9, 11, 34, 8), 27);
  add(new THREE.TorusGeometry(9.5, 1.6, 8, 24).rotateX(Math.PI / 2), 44);
  add(new THREE.CylinderGeometry(6.5, 8, 30, 16), 59);
  add(new THREE.TorusGeometry(7, 1.2, 8, 24).rotateX(Math.PI / 2), 75);
  add(new THREE.CylinderGeometry(5, 6, 400, 16), 275);
  for (let k = 0; k < 8; k++) { const f = add(new THREE.BoxGeometry(1.2, 26, 1.2), 26); const a = k / 8 * Math.PI * 2; f.position.set(Math.cos(a) * 10.2, 26, Math.sin(a) * 10.2); }   // рёбра основания

  // ---------- водосточная труба с хомутами ----------
  const zinc = new THREE.MeshStandardMaterial({ color: 0x6F767C, roughness: .35, metalness: .8 });
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 340, 20), zinc); pipe.position.set(-62, 170, 7); pipe.castShadow = true; scene.add(pipe);
  const elbow = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 18, 20).rotateX(.7), zinc); elbow.position.set(-62, 9, 13); scene.add(elbow);
  for (const y of [40, 110, 180]) { const c = new THREE.Mesh(new THREE.TorusGeometry(5.3, .7, 8, 20).rotateX(Math.PI / 2), iron); c.position.set(-62, y, 7); scene.add(c); }

  // ---------- листочек: мятая бумага ----------
  const ng = new THREE.PlaneGeometry(21, 14.7, 42, 30), np = ng.attributes.position, r = rng('fold');
  const folds = Array.from({ length: 6 }, () => [r() * Math.PI, (r() - .5) * 14, (r() - .5) * .6]);
  for (let i = 0; i < np.count; i++) {
    const x = np.getX(i), y = np.getY(i); let z = 0;
    for (const [a, c, h] of folds) { const d = x * Math.cos(a) + y * Math.sin(a) - c; z += h * Math.exp(-Math.abs(d) * .9); }
    z += .25 * Math.sin(x * .4) * Math.sin(y * .5) + (Math.abs(x) > 9 ? (Math.abs(x) - 9) * .35 : 0) + (y > 6 ? (y - 6) * .25 : 0);   // края загибаются
    np.setZ(i, Math.max(0, z + .25));
  }
  ng.computeVertexNormals();
  const note = new THREE.Mesh(ng, new THREE.MeshStandardMaterial({ map: noteTex, roughness: .7, alphaTest: .5, side: THREE.DoubleSide }));
  note.rotation.set(-Math.PI / 2, 0, .35); note.position.set(46, .12, 54); note.receiveShadow = true; note.castShadow = true; scene.add(note);
  W.note = note;

  // ---------- свет ----------
  scene.background = new THREE.Color(0x06070D);
  scene.fog = new THREE.FogExp2(0x0B0E1A, .0016);
  const hemi = new THREE.HemisphereLight(0x3A4670, 0x0A0806, .55); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x8FA4FF, .55); moon.position.set(-200, 260, 300); scene.add(moon);
  const rim = new THREE.DirectionalLight(0x9DB2FF, .9); rim.position.set(-120, 120, -40); scene.add(rim);   // контровой: отделяет куклу от стены
  const lamp = new THREE.SpotLight(0xFFC27A, 1, 900, .62, .75, 1.1);
  lamp.position.set(80, 330, 58); lamp.target.position.set(34, 0, 50); scene.add(lamp, lamp.target);
  lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -.0004; lamp.shadow.normalBias = .02; lamp.shadow.radius = 4; lamp.shadow.camera.near = 50; lamp.shadow.camera.far = 600;
  const bounce = new THREE.PointLight(0xFFAE66, 1, 160, 1.4); bounce.position.set(40, 8, 70); scene.add(bounce);   // отсвет от мокрой мостовой
  W.lamp = lamp; W.bounce = bounce; W.hemi = hemi; W.moon = moon; W.rim = rim;
  W.setLamp = k => { lamp.intensity = 2.4e3 * k; bounce.intensity = 350 * k; };

  // ---------- дождь: тонкие штрихи, плавно (24 к/с) ----------
  const N = 2600, rg = new THREE.BufferGeometry(), rp = new Float32Array(N * 6), R = rng('rain');
  const drops = Array.from({ length: N }, () => [-80 + R() * 260, R() * 400, 10 + R() * 200, 650 + R() * 250, 3.5 + R() * 4]);
  rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xC9D6F0, transparent: true, opacity: .32, fog: true })); rain.frustumCulled = false; scene.add(rain);
  // брызги — кольца на мостовой
  const SN = 160, splash = new THREE.InstancedMesh(new THREE.RingGeometry(.7, 1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xE6E8F0, transparent: true, opacity: .35, depthWrite: false }), SN);
  splash.frustumCulled = false; scene.add(splash);
  const SP = Array.from({ length: SN }, () => [-60 + R() * 220, 14 + R() * 160, R() * .5]);
  const m4 = new THREE.Matrix4();
  W.update = (t) => {
    for (let i = 0; i < N; i++) {
      const [x, off, z, sp, len] = drops[i]; const y = 400 - ((off + t * sp) % 400), dx = -.06 * len;
      rp.set([x + (400 - y) * -.04, y, z, x + (400 - y) * -.04 + dx, y - len, z], i * 6);
    }
    rg.attributes.position.needsUpdate = true;
    for (let i = 0; i < SN; i++) {
      const [x, z, ph] = SP[i], k = (t * 2.2 + ph + hash('sp', i) * 7) % 1, cyc = Math.floor(t * 2.2 + ph + hash('sp', i) * 7);
      const xx = x + (hash('sx', i, cyc) - .5) * 40, zz = z + (hash('sz', i, cyc) - .5) * 30, s = .3 + k * 2.4;
      m4.makeScale(s, 1, s); m4.setPosition(xx, .15, zz); splash.setMatrixAt(i, k < .45 ? m4 : m4.makeScale(0, 0, 0));
    }
    splash.instanceMatrix.needsUpdate = true;
    splash.material.opacity = .35;
  };
  return W;
}
