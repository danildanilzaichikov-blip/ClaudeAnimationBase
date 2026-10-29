// Лист персонажа: index.html?loop=cast — позы для проверки каркаса (локти, колени, наклон, жест)
LOOPS.cast = { len: 2, draw(t) {
  const g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3C3550'); g.addColorStop(1, '#1E1A28'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  LIGHT = { x: -.55, y: -.75, warm: '#FFF2D8', a: 1 };
  lump(rrect(-50, 900, W + 100, 400, 40), '#6E6A78', { id: 'table', prints: 6, gloss: .1 });
  detective(230, 960, { s: .8, t: .3, glass: true, armF: [.3, .9], armB: [-.15, .4] });                                                     // стоит
  detective(640, 960, { s: .8, t: .3, glass: true, lean: .18, hipDy: 8, tiptoe: true, feet: [[-60, 0], [48, -58]], armF: [.9, 1.0], armB: [-.6, 1.6], look: .3 });  // крадётся, колено вверх
  detective(1080, 960, { s: .8, t: .3, glass: true, lean: .5, hipDy: 22, feet: [[-40, 0], [50, 0]], armF: [.9, .5], armB: [-.3, .9], lookY: 1, look: .6 });  // наклонился к земле
  detective(1520, 960, { s: .8, t: .3, glass: true, eyes: 'half', mouth: 'smirk', brow: .5, armF: [.2, .5], armB: [2.6, 1.5], hatLift: 20, hatRot: -.25, head: -.1 });  // приподнял шляпу
  vignette(.35);
} };
