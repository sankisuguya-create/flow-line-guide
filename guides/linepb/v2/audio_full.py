# v2 全場面の 音（BGM・効果音）。外部の 音源は 使わない。きっかけは full.html の EVENTS（録画の ときに events.json に 書き出す）
# 使い方: python3 audio_full.py events.json 出力.wav
import sys, json, wave
import numpy as np
SR = 44100
ev = json.load(open(sys.argv[1])); TOTAL = ev["total"]; E = ev["events"]
N = int(TOTAL * SR) + SR; out = np.zeros(N); t_all = np.arange(N) / SR
def env(n, a=0.01, r=0.3):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / r)
def put(t0, x, g=1.0):
    i = int(t0 * SR); x = x[: max(0, N - i)]; out[i:i + len(x)] += g * x
def tone(f, d, a=0.005, r=0.25, harm=(1, .4, .2)):
    n = int(d * SR); t = np.arange(n) / SR
    return sum(h * np.sin(2 * np.pi * f * (k + 1) * t) for k, h in enumerate(harm)) * env(n, a, r)
nf = lambda m: 440 * 2 ** ((m - 69) / 12)
rng = np.random.default_rng(3)
# BGM（112 BPM、C–Am–F–G、パッド＋分散和音＋軽い リズム）
bpm = 112; beat = 60 / bpm; chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
bgm = np.zeros(N)
def bput(t0, x, g):
    i = int(t0 * SR); x = x[: max(0, N - i)]; bgm[i:i + len(x)] += g * x
bar = 0; t = 0.0
while t < TOTAL:
    ch = chords[bar % 4]; n = int(4 * beat * SR); tt = np.arange(n) / SR
    for m in ch:
        bput(t, (np.sin(2 * np.pi * nf(m - 12) * tt) + 0.5 * np.sin(2 * np.pi * nf(m) * tt * 1.003)) * np.minimum(1, tt / 0.4) * np.minimum(1, (4 * beat - tt) / 0.4), 0.05)
    for k in range(8):
        bput(t + k * beat / 2, tone(nf(ch[k % 3] + (24 if k >= 4 else 12)), 0.4, 0.003, 0.18, (1, .3, .1)), 0.05)
    for k in range(4):
        n2 = int(0.25 * SR); t2 = np.arange(n2) / SR
        bput(t + k * beat, np.sin(2 * np.pi * (50 + 90 * np.exp(-t2 * 30)) * t2) * np.exp(-t2 * 12), 0.2 if k % 2 == 0 else 0.1)
        hh = rng.standard_normal(int(0.05 * SR)) * env(int(0.05 * SR), 0.001, 0.015); bput(t + k * beat + beat / 2, np.diff(hh, prepend=0), 0.04)
    t += 4 * beat; bar += 1
out += bgm * np.minimum(1, t_all / 1.5) * np.clip((TOTAL - t_all) / 2.5, 0, 1)
def chirp(f0, f1, d, r):
    n = int(d * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (f0 + (f1 - f0) * tt / d / 2) * tt) * env(n, 0.002, r)
def whistle(d=0.45):
    n = int(d * SR); tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * 2900 * tt + 6 * np.sin(2 * np.pi * 45 * tt)) * np.minimum(1, tt / 0.01) * np.minimum(1, (d - tt) / 0.04)
    return x + 0.15 * rng.standard_normal(n) * np.minimum(1, (d - tt) / 0.04)
for e in E:
    t0, k = e["t"], e["k"]
    if k == "title":
        n = int(1.2 * SR); tt = np.arange(n) / SR
        put(t0, rng.standard_normal(n) * np.sin(np.pi * tt / 1.2) ** 2 * 0.25, 0.4); put(t0 + 0.7, tone(nf(84), 1.2, 0.005, 0.5, (1, .5, .25, .1)), 0.25)
    elif k == "scene":
        n = int(0.5 * SR); tt = np.arange(n) / SR; put(t0, rng.standard_normal(n) * np.sin(np.pi * tt / 0.5) ** 2, 0.06)
        put(t0 + 0.05, tone(nf(79), 0.5, 0.004, 0.25, (1, .3)), 0.12)
    elif k == "cap": put(t0, tone(nf(88), 0.12, 0.002, 0.04, (1,)), 0.1)
    elif k == "pass": put(t0, chirp(520, 320, 0.2, 0.07), 0.4)
    elif k == "catch": put(t0, tone(nf(76), 0.15, 0.002, 0.05, (1, .2)), 0.2)
    elif k == "out":
        n = int(0.3 * SR); tt = np.arange(n) / SR; put(t0, np.sin(2 * np.pi * (90 + 60 * np.exp(-tt * 20)) * tt) * np.exp(-tt * 10), 0.35)
    elif k == "goal":
        for j, m in enumerate([72, 76, 79, 84, 88, 91]): put(t0 + j * 0.06, tone(nf(m), 0.9, 0.003, 0.35, (1, .3, .15)), 0.2)
    elif k == "whistle": put(t0, whistle(0.45), 0.22)
    elif k == "whistle2": put(t0, whistle(0.25), 0.2); put(t0 + 0.4, whistle(0.6), 0.2)
    elif k == "fanfare":
        for j, m in enumerate([67, 72, 76, 79]): put(t0 + j * 0.12, tone(nf(m), 0.7 if j < 3 else 1.4, 0.005, 0.5 if j < 3 else 0.9, (1, .6, .3, .15)), 0.22)
    elif k == "chime":
        for j, m in enumerate([76, 84]): put(t0 + j * 0.1, tone(nf(m), 0.8, 0.003, 0.4, (1, .3)), 0.15)
    elif k == "tick": put(t0, tone(nf(96), 0.05, 0.001, 0.02, (1,)), 0.15)
    elif k == "buzzer":
        n = int(0.6 * SR); tt = np.arange(n) / SR; put(t0, np.sign(np.sin(2 * np.pi * 220 * tt)) * np.minimum(1, (0.6 - tt) / 0.05) * 0.5, 0.15)
    elif k == "finale":
        for j, m in enumerate([60, 64, 67, 72, 76]): put(t0 + j * 0.15, tone(nf(m), 3.0, 0.01, 1.5, (1, .5, .25, .1)), 0.16)
out = out / max(1e-9, np.abs(out).max()) * 0.85
with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out[: int(TOTAL * SR)], -1, 1) * 32767).astype(np.int16).tobytes())
print("ok", TOTAL, "s,", len(E), "events")
