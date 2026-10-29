// main.js — сцена «Улика» в 3D: рендер (Three.js), камера, таймлайн, поза куклы по времени, пост-обработка.
// Кукла живёт по 12 перестановок в секунду (стоп-моушен), камера, дождь и свет — плавно, 24 к/с.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { clayBump, noteTexture, clamp, rng } from './tex.js';
import { makeDetective } from './puppet.js';
import { makeWorld } from './world.js';

const W = 1920, H = 1080, DUR = PROJECT.duration;
window.DUR = DUR;
const lerp = (a, b, k) => a + (b - a) * k, ramp = (t, a, b) => clamp((t - a) / (b - a));
const ease = k => k < .5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k), easeOut = k => 1 - (1 - k) * (1 - k);
const back = (k, s = 1.4) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
const smoothK = k => k * k * k * (k * (k * 6 - 15) + 10);
const sm = t => Math.floor(t * 12 + 1e-6) / 12;
const V = (...a) => new THREE.Vector3(...a);
function keys(t, ks) { if (t <= ks[0][0]) return ks[0][1]; for (let i = 1; i < ks.length; i++) if (t < ks[i][0]) { const [a, va] = ks[i - 1], [b, vb, e = ease] = ks[i]; return lerp(va, vb, e((t - a) / (b - a))); } return ks[ks.length - 1][1]; }

let renderer, scene, camera, composer, bokeh, det, world, out, ox, grain;

// ---------- путь и позы ----------
const START = [-30, 26], STOP = [20, 44.5], YAW = Math.atan2(STOP[0] - START[0], STOP[1] - START[1]);
function sneakFeet(T, P = .6, stride = 9, lift = 4.6) {
  return [0, 1].map(i => { const ph = ((T / P) + i * .5) % 1; if (ph < .5) return [stride / 2 - stride * (ph / .5), 0]; const k = (ph - .5) / .5; return [-stride / 2 + stride * ease(k), Math.sin(k * Math.PI) * lift]; });
}
function poseAt(t) {
  const T = sm(t), p = { boil: Math.floor(t * 12), yaw: YAW, breath: Math.sin(T * 2 * Math.PI * .45) };
  const blink = [1.15, 4.0, 6.6, 9.0].some(b => T >= b && T < b + .12);
  if (T < 7.3) {
    if (T < 1.75) {                                                          // крадётся на цыпочках
      const k = T / 1.75, ph = (T / .6) % 1;
      p.x = lerp(START[0], STOP[0], k); p.z = lerp(START[1], STOP[1], k);
      p.feet = sneakFeet(T); p.tiptoe = true;
      p.hipDy = -.5 + .45 * Math.cos(ph * 4 * Math.PI); p.lean = .22 + .03 * Math.sin(ph * 4 * Math.PI); p.sway = .05 * Math.sin(ph * 2 * Math.PI);
      p.armR = [.95 + .1 * Math.sin(ph * 2 * Math.PI), .95]; p.armL = [-.55 - .2 * Math.sin(ph * 2 * Math.PI), 1.7]; p.gripL = .8;
      p.swing = .12 * Math.sin(ph * 2 * Math.PI - 1);
      const glance = ramp(T, .85, 1.0) * (1 - ramp(T, 1.25, 1.4));            // оглянулся через плечо
      p.headYaw = -1.3 * glance; p.look = [-.8 * glance, 0]; p.brow = .2 + .4 * glance; p.nod = .05;
    } else {
      p.x = STOP[0]; p.z = STOP[1];
      const stop = ramp(T, 1.75, 2.0), notice = ramp(T, 1.95, 2.05), nEnd = ramp(T, 2.35, 2.5), take = notice > 0 && nEnd < 1;
      const bk = keys(T, [[2.45, 0], [2.6, -.15, easeOut], [3.05, 1, back]]), b = Math.max(0, bk);
      p.feet = [[-1.5 - 1 * b, 0], [1.5 + 2.5 * b, 0]];
      p.hipDy = -(1 - stop) * .4 - Math.sin(stop * Math.PI) * .6 - 1.9 * b + (take ? .5 : 0);
      p.lean = lerp(.06 - (take ? .12 : 0), .78, b) + Math.min(0, bk) * .6;
      p.swing = .16 * Math.sin(stop * Math.PI * 1.5) * (1 - stop) + b * .15;
      p.armR = [lerp(.5 + (take ? .4 : 0), 1.05, b), lerp(.8 + (take ? .8 : 0), .25, b)];
      p.armL = [lerp(.1 - (take ? .6 : 0), -.2, b), lerp(.5 + (take ? 1.4 : 0), .9, b)]; p.gripL = take ? .1 : .5;
      p.eyes = take ? 'wide' : 'open'; p.brow = take ? 1.1 : .35; p.mouth = take ? 'o' : 'none';
      p.hatLift = Math.sin(ramp(T, 2.0, 2.5) * Math.PI) * 2.6;                // шляпа подпрыгивает чуть позже головы
      p.nod = notice > 0 ? .55 + .2 * b : .1; p.headYaw = notice > 0 ? .1 : 0; p.look = [notice > 0 ? .2 : 0, notice > 0 ? -.7 : 0];
      if (T > 3.1) { p.headTilt = .08 * Math.sin((T - 3.1) * 2.4); p.look = [.35 * Math.sin((T - 3.1) * 1.6), -.75]; }   // читает по словам
    }
  } else {
    const L = T - 7.3; p.x = STOP[0]; p.z = STOP[1];
    const up = ease(ramp(L, .4, .85)), headLag = ease(ramp(L, .55, 1.0));
    const shock = ramp(L, .85, .95) * (1 - ramp(L, 1.35, 1.45)), sly = ramp(L, 1.45, 1.55);
    const chuckle = L > 1.6 && L < 2.0 ? Math.abs(Math.sin((L - 1.6) / .4 * Math.PI * 3)) : 0;
    const tip = ramp(L, 1.9, 2.05) * (1 - ramp(L, 2.42, 2.55));
    p.feet = [[lerp(-2.5, -1.5, up), 0], [lerp(4, 1.6, up), 0]];
    p.lean = lerp(.78, 0, up) - shock * .12 + chuckle * .04; p.hipDy = lerp(-1.9, 0, up) + chuckle * .35 - shock * .3;
    p.armR = [lerp(1.05, .35, up), lerp(.25, .6 + shock * .9, up)];
    p.armL = tip > 0 ? [lerp(.1, 2.35, tip), lerp(.5, 1.05, tip)] : [lerp(-.2, .05, up) - shock * .6, .5 + shock * 1.4];
    p.spreadL = .12 + tip * .12; p.gripL = tip > .6 ? .95 : shock > 0 ? .05 : .35;
    p.eyes = shock > 0 ? 'wide' : sly > 0 ? 'half' : 'open'; p.brow = shock > 0 ? 1.2 : sly > 0 ? .6 : .3;
    p.mouth = shock > 0 ? 'o' : sly > 0 ? 'smirk' : 'none';
    p.nod = lerp(.75, -.05, headLag) + chuckle * .08 - tip * .15; p.headYaw = lerp(.1, -.75, headLag); p.headTilt = sly * .12;
    p.look = [lerp(0, -.35, headLag), lerp(-.7, .1, headLag)];
    p.hatLift = shock * 2.2 + tip * 1.6; p.hatRot = -tip * .3;
    p.swing = .1 * Math.sin(ramp(L, .4, 1.2) * Math.PI);
  }
  if (blink && p.eyes !== 'wide') p.eyes = 'shut';
  // лупа держится горизонтально: кисть компенсирует наклон руки
  p.wristR = (p.armR[0] + p.armR[1]) - (p.lean || 0) - .1;
  p.gripR = 1;
  return p;
}
function lampK(t) {
  if (t < .25) return 0;
  if (t < .75) return [1, 0, 1, .3, 0, 1][Math.floor((t - .25) / .5 * 6)] ?? 1;
  if (t > 9.6) return t < 9.66 ? .35 : t < 9.7 ? .9 : 0;
  return 1;
}

// ---------- камера ----------
const NOTE_P = V(46, 0, 54);
function cameraAt(t) {
  if (t < 7.3) {
    const pk = smoothK(ramp(t, 2.5, 5.3)), drift = ramp(t, 0, 2.5), hold = ramp(t, 5.3, 7.3);
    const pos = V(lerp(18, 50, pk) + 1.5 * drift, lerp(27, 25.5, pk), lerp(152 - 8 * drift, 73, pk) - 1.2 * hold);
    const tgt = V(lerp(24, 46.5, pk), lerp(15, 0, pk), lerp(40, 54, pk));
    return { pos, tgt, fov: lerp(36, 33, pk), focus: pos.distanceTo(lerp(0, 1, pk) > .5 ? tgt : V(STOP[0], 12, STOP[1])), ap: lerp(.00016, .0005, pk), rack: ramp(t, 7.05, 7.3) };
  }
  const k = ramp(t, 7.3, 10), pos = V(41 - 2 * k, 23.5, 83 - 5 * k), tgt = V(21, 19.5 + 1.2 * ease(ramp(t, 7.7, 8.3)), 45);
  return { pos, tgt, fov: 30, focus: pos.distanceTo(V(STOP[0], 20, STOP[1])), ap: .0003, rack: 1 - ramp(t, 7.3, 7.55) };
}

// ---------- кадр ----------
let lensGlint;
function renderFrame(t) {
  const lamp = lampK(t);
  world.setLamp(lamp); world.update(t);
  det.pose(poseAt(t));
  const c = cameraAt(t);
  camera.position.copy(c.pos); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.tgt);
  bokeh.uniforms.focus.value = c.focus; bokeh.uniforms.aperture.value = c.ap + c.rack * .004; bokeh.uniforms.maxblur.value = .006 + c.rack * .012;
  // блик лупы в темноте в самом конце
  const g = t > 9.72 && t < 9.97 ? Math.sin(ramp(t, 9.72, 9.97) * Math.PI) : 0;
  lensGlint.intensity = g * 60; det.lensRing.getWorldPosition(lensGlint.position); lensGlint.position.y += 3; lensGlint.position.z += 2;
  composer.render();
  // 2D-доводка: зерно плёнки, виньетка, мерцание экспозиции, чернота в конце
  ox.globalCompositeOperation = 'source-over'; ox.globalAlpha = 1; ox.filter = 'none';
  ox.drawImage(renderer.domElement, 0, 0);
  const fn = Math.floor(t * 12);
  ox.globalCompositeOperation = 'screen'; ox.globalAlpha = .1; ox.filter = 'blur(14px)'; ox.drawImage(renderer.domElement, 0, 0); ox.filter = 'none';
  ox.globalCompositeOperation = 'soft-light'; ox.globalAlpha = .18; grain.setTransform(new DOMMatrix().translate((fn * 137) % 256, (fn * 71) % 256)); ox.fillStyle = grain; ox.fillRect(0, 0, W, H);
  ox.globalCompositeOperation = 'source-over'; ox.globalAlpha = 1;
  const v = ox.createRadialGradient(W / 2, H / 2, H * .38, W / 2, H / 2, H * .98); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(3,2,8,.55)'); ox.fillStyle = v; ox.fillRect(0, 0, W, H);
  const fl = (rng('ex' + fn)() - .5) * .05; ox.fillStyle = fl > 0 ? `rgba(255,240,220,${fl})` : `rgba(0,0,0,${-fl})`; ox.fillRect(0, 0, W, H);
  const black = ramp(t, 9.95, 10); if (black > 0) { ox.fillStyle = `rgba(0,0,0,${black})`; ox.fillRect(0, 0, W, H); }
}

window.renderAt = async (t, type = 'image/png', q = .92) => { renderFrame(t); return out.toDataURL(type, q); };
window.renderSheet = async (times, cols = 3, w = 640, crop = null) => {
  const [, , cw, ch] = crop || [0, 0, W, H], h = Math.round(w * ch / cw), rows = Math.ceil(times.length / cols), sc = document.createElement('canvas');
  sc.width = cols * w; sc.height = rows * h; const c = sc.getContext('2d'), ms = [];
  for (let i = 0; i < times.length; i++) {
    const t0 = performance.now(); renderFrame(times[i]); ms.push(Math.round(performance.now() - t0));
    const x = (i % cols) * w, y = Math.floor(i / cols) * h, [cx, cy] = crop || [0, 0];
    c.drawImage(out, cx, cy, cw, ch, x, y, w, h); c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(x, y, 84, 24); c.fillStyle = '#fff'; c.font = '15px sans-serif'; c.fillText(times[i].toFixed(2) + 's', x + 6, y + 17);
  }
  return { url: sc.toDataURL('image/jpeg', .9), ms };
};
window.gpuInfo = () => { const gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'webgl'; };

async function boot() {
  await document.fonts.load('600 200px Caveat', 'Алёна какашка');
  out = document.getElementById('out'); out.width = W; out.height = H; ox = out.getContext('2d');
  const gl = document.createElement('canvas'); gl.width = W; gl.height = H;
  renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, W / H, 2, 2000);
  world = makeWorld(scene, await noteTexture());
  det = makeDetective(clayBump()); scene.add(det.root);
  lensGlint = new THREE.PointLight(0xFFFFFF, 0, 30, 1.5); scene.add(lensGlint);
  composer = new EffectComposer(renderer); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  bokeh = new BokehPass(scene, camera, { focus: 110, aperture: .00016, maxblur: .006 }); composer.addPass(bokeh);
  composer.addPass(new OutputPass());
  // зерно
  const gc = document.createElement('canvas'); gc.width = gc.height = 256; const gg = gc.getContext('2d'), im = gg.createImageData(256, 256), r = rng('grain');
  for (let i = 0; i < 256 * 256; i++) { const v = 128 + (r() - .5) * 160; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  gg.putImageData(im, 0, 0); grain = ox.createPattern(gc, 'repeat');
  window.ready = true;
  if (!location.search.includes('render')) renderFrame(+(new URLSearchParams(location.search).get('t') || 0));
}
boot();
