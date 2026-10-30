"""Синтез звуковой дорожки: удары, свисты, цепь, вода, барабаны тайко и финальные щипки.
python3 -I tools/sfx.py audio/sfx.json audio/track.wav
Всё синтезируется из шума и синусов (numpy), без внешних сэмплов."""
import json, sys, wave
import numpy as np

SR = 44100
rng = np.random.default_rng(7)
ev = json.load(open(sys.argv[1]))
D = ev['duration'] + 0.5
N = int(D * SR)
L = np.zeros(N); R = np.zeros(N)
MUS_L = np.zeros(N); MUS_R = np.zeros(N)
SH = {s['name']: s for s in ev['shots']}


def T(d): return np.arange(int(d * SR)) / SR
def env(t, a, d): return np.minimum(t / max(a, 1e-4), 1) * np.exp(-t / d)
def noise(n): return rng.standard_normal(n)


def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + ((f / max(hi, 1)) ** 4)) * (1 - 1 / (1 + (f / max(lo, 1)) ** 4) if lo > 0 else 1)
    return np.fft.irfft(X * m, len(x))


def sweep(f0, f1, t): return np.sin(2 * np.pi * np.cumsum(np.geomspace(f0, f1, len(t))) / SR)


def put(x, t0, v=1.0, pan=0.0, bus='fx'):
    i = int(t0 * SR)
    if i >= N or len(x) == 0: return
    x = x[: N - i] * v
    a, b = (L, R) if bus == 'fx' else (MUS_L, MUS_R)
    a[i:i + len(x)] += x * (1 - pan) ** 0.5
    b[i:i + len(x)] += x * (1 + pan) ** 0.5


def reverb(x, dur=0.8, mix=0.25):
    ir = noise(int(dur * SR)) * np.exp(-T(dur) / (dur / 5))
    ir = band(ir, 200, 5000); ir /= np.abs(ir).sum() ** 0.5 * 4
    y = np.fft.irfft(np.fft.rfft(np.pad(x, (0, len(ir)))) * np.fft.rfft(np.pad(ir, (0, len(x)))), len(x) + len(ir))
    return np.pad(x, (0, len(ir))) + y * mix * 6


def thump(f0=95, f1=45, d=0.2, amp=1.0):
    t = T(d * 4); return sweep(f0, f1, t) * env(t, 0.002, d) * amp


def hit(v=1):
    t = T(0.5)
    body = thump(110, 48, 0.12, 1.0)
    slap = band(noise(len(t)), 300, 3500) * env(t, 0.0005, 0.025) * 0.9
    click = band(noise(len(t)), 2500, 9000) * env(t, 0.0002, 0.006) * 0.6
    n = max(len(body), len(t)); out = np.zeros(n); out[:len(body)] += body; out[:len(t)] += slap + click
    return out * v


def big(v=1):
    t = T(1.2)
    sub = thump(80, 32, 0.35, 1.3)
    crack = band(noise(len(t)), 1500, 10000) * env(t, 0.0002, 0.012) * 1.0
    burst = band(noise(len(t)), 120, 2500) * env(t, 0.001, 0.07) * 1.1
    out = np.zeros(max(len(sub), len(t))); out[:len(sub)] += sub; out[:len(t)] += crack + burst
    return np.tanh(reverb(out, 0.9, 0.3) * 1.3) * v


def whoosh(v=1, d=0.24):
    t = T(d); x = noise(len(t)); seg = []
    k = 6
    for i in range(k):
        a, b = i * len(t) // k, (i + 1) * len(t) // k
        c = 400 + 1400 * np.sin(np.pi * (i + 0.5) / k)
        seg.append(band(x[a:b], c * 0.6, c * 1.6))
    y = np.concatenate(seg) * np.sin(np.pi * t / d) ** 2
    return y * 0.55 * v


def clack(v=1):
    t = T(0.25)
    return (np.sin(2 * np.pi * 1150 * t) * env(t, 0.0003, 0.03) + np.sin(2 * np.pi * 1870 * t) * env(t, 0.0003, 0.02) * 0.6 + band(noise(len(t)), 1000, 6000) * env(t, 0.0002, 0.008)) * 0.8 * v


def metal(v=1, d=1.4):
    t = T(d); y = np.zeros(len(t))
    for f, a, dd in [(523, 1, .5), (1342, .6, .35), (2214, .45, .25), (3170, .3, .18), (4410, .2, .1)]:
        y += np.sin(2 * np.pi * f * t + rng.random() * 6) * env(t, 0.0005, dd) * a
    return y * 0.6 * v


def ceramic(v=1, d=0.5, f=2700):
    t = T(d)
    return (np.sin(2 * np.pi * f * t) * env(t, 0.0003, 0.12) + np.sin(2 * np.pi * f * 1.52 * t) * env(t, 0.0003, 0.07) * 0.6 + np.sin(2 * np.pi * f * 2.3 * t) * env(t, 0.0003, 0.04) * 0.3) * 0.5 * v


def voice(f0, f1, d, formants, v=1, trem=0):
    t = T(d); ph = np.cumsum(np.geomspace(f0, f1, len(t))) / SR
    saw = 2 * (ph % 1) - 1
    if trem: saw *= 1 + 0.4 * np.sin(2 * np.pi * trem * t)
    y = sum(band(saw, f * 0.8, f * 1.25) * a for f, a in formants)
    return y * np.sin(np.pi * t / d) ** 0.6 * 0.5 * v


def pluck(f, d=1.6, v=1):
    n = int(d * SR); p = int(SR / f); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.497 * (buf[i % p] + buf[(i + 1) % p])
    return out * v


def taiko(v=1):
    t = T(0.9)
    return (sweep(150, 60, t) * env(t, 0.002, 0.18) * 1.2 + band(noise(len(t)), 80, 900) * env(t, 0.001, 0.05) * 0.5) * v


def rim(v=1):
    t = T(0.12); return (band(noise(len(t)), 2000, 7000) * env(t, 0.0002, 0.015) + np.sin(2 * np.pi * 1650 * t) * env(t, 0.0002, 0.02) * .4) * v


def shaker(v=1):
    t = T(0.08); return band(noise(len(t)), 5000, 12000) * env(t, 0.004, 0.02) * v


# ── эффекты по событиям ─────────────────────────────────────────────────
for e in ev['events']:
    t0, ty, v = e['ft'], e['type'], e.get('v', 1)
    du = e.get('dur', 1)
    pan = float(rng.uniform(-0.25, 0.25))
    if ty == 'hit': put(hit(v), t0, 0.9, pan)
    elif ty == 'push': put(hit(0.6) + np.pad(whoosh(0.5, 0.2), (0, 0))[:len(hit())] if False else hit(0.55), t0, 1, pan); put(whoosh(0.4, 0.18), t0 - 0.12, 1, pan)
    elif ty == 'big': put(big(v), t0, 1.0, pan)
    elif ty == 'crash':
        put(big(1.1), t0, 1)
        for k in range(14): put(clack(0.5 + rng.random() * 0.5) * (1 - k / 16), t0 + 0.02 + rng.random() * 0.9, 1, float(rng.uniform(-.6, .6)))
    elif ty == 'thud': put(thump(70, 40, 0.18, 0.9) + 0, t0, 0.8 * v); put(band(noise(int(0.4 * SR)), 100, 900) * env(T(0.4), 0.005, 0.08) * 0.3, t0)
    elif ty == 'block': put(hit(0.5), t0, 1, pan); put(clack(0.4), t0)
    elif ty == 'clack': put(clack(1.0 * v), t0, 1, pan); put(hit(0.3), t0)
    elif ty == 'bigmetal': put(big(1.0), t0); put(metal(1.1, 1.8), t0, 1, -0.2)
    elif ty == 'bonk': put(big(0.9), t0); put(voice(330, 210, 0.3, [(600, 1), (1100, .5)], 0.5), t0)
    elif ty == 'tink': put(ceramic(1.3, 0.8, 2900), t0); put(reverb(ceramic(0.6, 0.6, 2900), 1.2, 0.5), t0 + 0.01)
    elif ty == 'clink': put(ceramic(0.9 * v, 0.4, 3300), t0)
    elif ty == 'whoosh': put(whoosh(v, 0.2 + 0.08 * v), t0 - 0.06, 1, pan)
    elif ty == 'land': put(thump(80, 45, 0.08, 0.6), t0); put(band(noise(int(0.2 * SR)), 300, 3000) * env(T(0.2), 0.002, 0.04) * 0.3, t0)
    elif ty == 'steps':
        k = 0
        while k * 0.32 < du: put(thump(90, 60, 0.04, 0.35) + 0, t0 + k * 0.32 + rng.random() * 0.03, 1, float(rng.uniform(-.3, .3))); k += 1
    elif ty in ('pour', 'pourout'):
        d = du; t = T(d); x = band(noise(len(t)), 900 if ty == 'pour' else 500, 4500 if ty == 'pour' else 2500)
        bub = 1 + 0.6 * np.sin(2 * np.pi * (11 + 4 * np.sin(2 * np.pi * 1.3 * t)) * t)
        put(x * bub * np.minimum(t / 0.08, 1) * np.minimum((d - t) / 0.15, 1) * 0.22, t0)
    elif ty == 'sip': t = T(0.4); put(band(noise(len(t)), 1500, 5000) * np.sin(np.pi * t / 0.4) ** 2 * 0.25, t0)
    elif ty == 'brr': put(voice(170, 150, 0.6, [(500, 1), (900, .4)], 0.6, trem=22), t0)
    elif ty == 'sting':
        t = T(1.6); y = sum(np.sign(np.sin(2 * np.pi * f * t)) * 0.2 for f in (110, 110 * 1.498, 220 * 1.01, 233))
        put(band(y, 60, 1200) * env(t, 0.03, 0.6) * 0.5, t0); put(taiko(0.9), t0)
    elif ty == 'crack':
        for k in range(3): put(clack(0.35), t0 + k * 0.05)
    elif ty in ('chain', 'chainwrap'):
        n = int(du * 18) if ty == 'chain' else 14
        span = du if ty == 'chain' else 0.3
        for k in range(n): put(ceramic(0.12 + rng.random() * 0.12, 0.15, 3600 + rng.random() * 2600), t0 + rng.random() * span, 1, float(rng.uniform(-.5, .5)))
    elif ty == 'tumble':
        for k in range(6): put(thump(80, 45, 0.07, 0.6) , t0 + k * du / 6 + rng.random() * 0.04, 1, float(rng.uniform(-.3, .3))); put(clack(0.15), t0 + k * du / 6)
    elif ty == 'heart':
        put(thump(60, 38, 0.1, 1.0 * v), t0, 0.9); put(thump(55, 35, 0.08, 0.7 * v), t0 + 0.24, 0.9)
    elif ty == 'wind':
        t = T(du); put(band(noise(len(t)), 150, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.4 * t)) * np.minimum(t / 0.5, 1) * np.minimum((du - t) / 0.5, 1) * 0.12, t0)
    elif ty == 'amb':
        d = min(du, D - t0); t = T(d)
        a = band(noise(len(t)), 80, 600) * 0.05 + band(noise(len(t)), 300, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t)) * 0.03
        put(a * np.minimum(t / 1.0, 1) * np.minimum((d - t) / 1.0, 1), t0)
        for k in range(int(d / 4)):  # далёкие птицы
            tb = T(0.12); put(np.sin(2 * np.pi * np.cumsum(np.linspace(3200, 4200, len(tb))) / SR) * env(tb, 0.01, 0.04) * 0.04, t0 + 1 + k * 4 + rng.random(), 1, float(rng.uniform(-.7, .7)))
    elif ty == 'water':
        d = min(du + 6, D - t0); t = T(d)
        put(band(noise(len(t)), 300, 2200) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.21 * t)) * np.minimum(t / 1.0, 1) * np.minimum((d - t) / 1.0, 1) * 0.06, t0)
    elif ty == 'splash':
        t = T(2.0); put(band(noise(len(t)), 400, 6000) * env(t, 0.004, 0.35) * 0.9, t0); put(thump(90, 40, 0.15, 0.9), t0)
        for k in range(20): put(ceramic(0.05, 0.08, 1500 + rng.random() * 2000), t0 + 0.2 + rng.random() * 1.2, 1, float(rng.uniform(-.6, .6)))
    elif ty == 'twirl':
        for k in range(4): put(whoosh(0.35, 0.16), t0 + k * du / 4)
    elif ty == 'slowmo':
        t = T(2.5); put(sweep(140, 35, t) * env(t, 0.05, 0.9) * 0.7, t0); put(reverb(band(noise(int(0.3 * SR)), 200, 3000) * 0.3, 2.0, 0.6), t0)
    elif ty == 'growl': put(voice(95, 80, 0.7, [(450, 1), (900, .5)], 0.7, trem=30), t0)
    elif ty == 'ow': put(voice(380, 230, 0.45, [(550, 1), (950, .5)], 0.6), t0)
    elif ty == 'groan': put(voice(150, 115, 1.0, [(500, 1), (800, .4)], 0.45, trem=5), t0)
    elif ty == 'yell': put(voice(300, 160, 0.9, [(700, 1), (1150, .5)], 0.5), t0)
    elif ty == 'breath': t = T(1.2); put(band(noise(len(t)), 300, 2000) * np.sin(np.pi * t / 1.2) ** 2 * 0.06, t0)

# ── музыка: тайко ───────────────────────────────────────────────────────
BEAT = 60 / 120
def drums(a, b, inten=1.0, half=False):
    t = a; i = 0
    while t < b:
        bar = i % 8
        if half:
            if bar in (0, 4): put(taiko(0.7 * inten), t, 1, 0, 'mus')
        else:
            if bar in (0, 3, 4, 6): put(taiko((0.9 if bar in (0, 4) else 0.6) * inten), t, 1, -0.1, 'mus')
            if bar in (2, 6): put(rim(0.5 * inten), t, 1, 0.2, 'mus')
            put(shaker(0.12 * inten), t, 1, 0.3, 'mus'); put(shaker(0.08 * inten), t + BEAT / 2, 1, 0.3, 'mus')
        t += BEAT / 2 if not half else BEAT / 2; i += 1

drums(SH['Пятеро']['ft'], SH['Шкаф']['ft'], 0.8, half=True)
drums(SH['Шкаф']['ft'], SH['Окружили']['ft'], 0.9)
drums(SH['Все разом']['ft'], SH['Мизинец']['ft'] + 0.2, 1.15)
# финал: щипки пентатоникой
notes = [392, 440, 523, 587, 659, 784]
t0 = SH['Остыл']['ft'] + 0.4
for k, n in enumerate([2, 3, 4, 2, 1, 2, None, 4, 5, 4, 2, 3]):
    if n is not None: put(pluck(notes[n] / 2, 1.8, 0.35), t0 + k * 0.75, 1, -0.2 + 0.1 * (k % 4), 'mus')
for f in (196, 293.7, 392): put(pluck(f, 3.5, 0.25), SH['Остыл']['ft'] + 8.6, 1, 0, 'mus')
# низкий гул под тревогой
t = T(SH['Шкаф']['ft'] - SH['Пятеро']['ft']); put(np.sin(2 * np.pi * 55 * t) * 0.06 * np.minimum(t / 2, 1) * np.minimum((t[-1] - t) / 0.5, 1), SH['Пятеро']['ft'], 1, 0, 'mus')

# ── сведение: музыка проседает под сильными ударами ─────────────────────
duck = np.ones(N)
for e in ev['events']:
    if e['type'] in ('big', 'bigmetal', 'crash', 'bonk', 'tink'):
        i = int(e['ft'] * SR); n = int(0.6 * SR); seg = 1 - 0.75 * np.exp(-np.arange(n) / SR / 0.18)
        duck[i:i + n] = np.minimum(duck[i:i + n], seg[: max(0, min(n, N - i))])
L += MUS_L * 0.55 * duck; R += MUS_R * 0.55 * duck
mix = np.stack([L, R], 1)
mix /= np.abs(mix).max() / 1.25
mix = np.tanh(mix) * 0.92
fade = int(1.2 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', D, 'с')
