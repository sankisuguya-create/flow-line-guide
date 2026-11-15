# goal.src.html ＋ ../rule.html（動き・字幕・ふりがな・日本語フォント）→ goal.html
import re, pathlib
D = pathlib.Path(__file__).parent
rule = (D.parent / "rule.html").read_text()
font = re.search(r"/\* FONT-BEGIN.*?FONT-END \*/\n", rule, re.S).group(0)
a = rule.index("var M=40"); b = rule.index("function draw(si,t){")
data = re.sub(r'^var \$=function.*$', 'var $=function(i){return document.getElementById(i)};', rule[a:b], flags=re.M)
src = (D / "goal.src.html").read_text()
(D / "goal.html").write_text(src.replace("/*FONT*/", font, 1).replace("/*DATA*/", data, 1))
print("ok", len(data), "bytes of data")
