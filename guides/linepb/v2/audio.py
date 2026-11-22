# v2 の 音（BGM と 効果音）を 合成する。外部の 音源は 使わない（すべて この式で 作る）。
# 使い方: python3 audio.py 出力.wav   … 時刻は goal.src.html の INTRO・SC.ball・POINT と そろえる
import sys, json, re, wave, pathlib
import numpy as np
SR = 44100
D = pathlib.Path(__file__).parent
src = (D / "goal.src.html").read_text()
INTRO = float(re.search(r"const INTRO=([\d.]+)", src).group(1)); OUTRO = float(re.search(r"OUTRO=([\d.]+)", src).group(1))
rule = (D.parent / "rule.html").read_text()
blk = rule[rule.index('{name:"ゴール"'):]; blk = blk[:blk.index('{name:"守りのファウル①"')]
DUR = float(re.search(r"dur:([\d.]+)", blk).group(1))
BALL = [float(x) for x in re.findall(r'\[([\d.]+),"b[A-E]"\]', re.search(r"ball:\[(.*?)\]\],", blk).group(1) + "]")]
CAPS = [float(x) for x in re.findall(r'\[([\d.]+),"', re.search(r"cap:\[(.*?)\]\]\}", blk, re.S).group(1))]
TOTAL = INTRO + DUR + OUTRO
N = int(TOTAL * SR) + SR
out = np.zeros(N)
t_all = np.arange(N) / SR

def env(n, a=0.01, r=0.3):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / r)
def put(t0, x, g=1.0):
    i = int(t0 * SR); x = x[: max(0, N - i)]; out[i:i + len(x)] += g * x
def tone(f, d, a=0.005, r=0.25, harm=(1, .4, .2)):
    n = int(d * SR); t = np.arange(n) / SR
    return sum(h * np.sin(2 * np.pi * f * (k + 1) * t) for k, h in enumerate(harm)) * env(n, a, r)
nf = lambda m: 440 * 2 ** ((m - 69) / 12)

# --- BGM：112 BPM、C–Am–F–G を くり返す。やわらかい パッド＋分散和音＋軽い キックと ハイハット ---
bpm = 112; beat = 60 / bpm
chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
bgm = np.zeros(N)
def bput(t0, x, g):
    i = int(t0 * SR); x = x[: max(0, N - i)]; bgm[i:i + len(x)] += g * x
bar = 0; t = 0.0
while t < TOTAL:
    ch = chords[bar % 4]
    for m in ch:   # パッド（1小節）
        n = int(4 * beat * SR); tt = np.arange(n) / SR
        pad = (np.sin(2 * np.pi * nf(m - 12) * tt) + 0.5 * np.sin(2 * np.pi * nf(m) * tt * 1.003)) * np.minimum(1, tt / 0.4) * np.minimum(1, (4 * beat - tt) / 0.4)
        bput(t, pad, 0.05)
    for k in range(8):   # 分散和音（8分音符）
        m = ch[k % 3] + (12 if k >= 4 else 0)
        bput(t + k * beat / 2, tone(nf(m + 12), 0.4, 0.003, 0.18, (1, .3, .1)), 0.06)
    for k in range(4):   # キック（1・3拍は 強く）と ハイハット（裏）
        n = int(0.25 * SR); tt = np.arange(n) / SR
        kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 12)
        bput(t + k * beat, kick, 0.22 if k % 2 == 0 else 0.12)
        hh = np.random.default_rng(bar * 4 + k).standard_normal(int(0.05 * SR)) * env(int(0.05 * SR), 0.001, 0.015)
        bput(t + k * beat + beat / 2, np.diff(hh, prepend=0), 0.05)
    t += 4 * beat; bar += 1
fade = np.minimum(1, t_all / 1.5) * np.clip((TOTAL - t_all) / 1.5, 0, 1)
out += bgm * fade

# --- 効果音 ---
n = int(1.2 * SR); tt = np.arange(n) / SR      # 題：上がる シュッ
put(0.2, np.random.default_rng(1).standard_normal(n) * np.sin(np.pi * tt / 1.2) ** 2 * 0.25 * np.sin(2 * np.pi * (300 + 900 * tt) * tt) ** 2, 0.5)
put(0.9, tone(nf(84), 1.2, 0.005, 0.5, (1, .5, .25, .1)), 0.25)
for c in CAPS:                                  # 字幕が 出る：小さな ポッ
    put(INTRO + c, tone(nf(88), 0.12, 0.002, 0.04, (1,)), 0.12)
for b in BALL[1:-1]:                            # パス：ボールが 手を はなれる ポン
    n = int(0.2 * SR); tt = np.arange(n) / SR
    put(INTRO + b - 0.8, np.sin(2 * np.pi * (520 - 200 * tt) * tt) * env(n, 0.002, 0.07), 0.45)
    put(INTRO + b, tone(nf(76), 0.15, 0.002, 0.05, (1, .2)), 0.2)   # とる
CATCH = BALL[-1]                               # ゴール：キャッチの 音と キラキラ
put(INTRO + CATCH - 0.8, np.sin(2 * np.pi * (520 - 200 * np.arange(int(.2 * SR)) / SR) * np.arange(int(.2 * SR)) / SR) * env(int(.2 * SR), .002, .07), 0.45)
for k, m in enumerate([72, 76, 79, 84, 88, 91]):
    put(INTRO + CATCH + k * 0.06, tone(nf(m), 0.9, 0.003, 0.35, (1, .3, .15)), 0.22)
pts = re.search(r'bigs:\[\[([\d.]+),', blk); SCORE = float(pts.group(1)) if pts else DUR - 2.5
for k, m in enumerate([67, 72, 76, 79]):         # 点数：ファンファーレ
    put(INTRO + SCORE + k * 0.12, tone(nf(m), 0.7 if k < 3 else 1.4, 0.005, 0.5 if k < 3 else 0.9, (1, .6, .3, .15)), 0.25)

out = out / max(1e-9, np.abs(out).max()) * 0.85
pcm = (np.clip(out[: int(TOTAL * SR)], -1, 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok", round(TOTAL, 2), "s; passes", BALL, "score", SCORE)
