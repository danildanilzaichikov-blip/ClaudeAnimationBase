# 2D-пластилин (canvas, без WebGL)

Первая версия «Улики»: плоский пластилин с объёмной светотенью, отпечатками пальцев, стоп-моушен 12 к/с,
кукла на 2D-каркасе (локти, колени через обратную кинематику) в «запечённом» реалистичном переулке.
Быстрый (≈0.5 с/кадр без GPU). Для настоящего объёма — `../clay3d/`.

```bash
node render.mjs --page=clay/index.html --sheet=1,3,6,8.4 --cols=2 --out=out/check/clay.jpg
node render.mjs --page=clay/index.html --loop=cast --stills=.1 --out=out/check/clay_cast   # лист поз
```
`js/clay.js` — движок комков пластилина, `js/cast.js` — кукла, `js/real.js` — мир, `js/scenes/detective.js` — сцена.
