# rule.html で 使う 字だけの 日本語フォント（BIZ UDPゴシック Bold, SIL OFL 1.1）を Google Fonts から 取り、rule.html に 埋めこみ直す。
# 字幕に 新しい 字を 足したら 実行する： python3 font.py
import base64, re, subprocess, urllib.parse, pathlib
P = pathlib.Path(__file__).with_name("rule.html")
s = P.read_text()
s = re.sub(r'/\* FONT-BEGIN.*?FONT-END \*/\n', '', s, flags=re.S)
kana = "".join(chr(c) for c in range(0x3041, 0x3097)) + "".join(chr(c) for c in range(0x30A1, 0x30FB)) + "ー・、。「」！？（）〜→×○①②③④"
chars = sorted(set(c for c in s if ord(c) > 127) | set(chr(i) for i in range(32, 127)) | set(kana))
url = "https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@700&text=" + urllib.parse.quote("".join(chars))
css = subprocess.run(["curl", "-s", "-A", "Mozilla/5.0 Chrome/120", url], capture_output=True, text=True).stdout
font = subprocess.run(["curl", "-s", re.search(r"url\((https://[^)]+)\)", css).group(1)], capture_output=True).stdout
face = ('/* FONT-BEGIN 日本語の字形：BIZ UDPゴシック Bold（SIL Open Font License 1.1）。このページで使う字だけを抜き出して埋めこむ。字を足したら font.py で作り直す */\n'
        '@font-face{font-family:"LPB";font-weight:100 900;src:url(data:font/ttf;base64,' + base64.b64encode(font).decode() + ') format("truetype")}\n/* FONT-END */\n')
P.write_text(s.replace("<style>\n", "<style>\n" + face, 1))
print(len(chars), "chars,", len(font), "bytes")
