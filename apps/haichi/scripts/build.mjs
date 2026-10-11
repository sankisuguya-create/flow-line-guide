// src/Index.html の /* @include 名前 */ を差し込んで、1ファイルの dist/Index.html を作る。
//   node apps/haichi/scripts/build.mjs           作る
//   node apps/haichi/scripts/build.mjs --check   dist が src と食いちがっていたら止める（作り直し忘れの検出）
// homeroom-tools の scripts/build.py の @include・@dark の決まりと同じ。
import fs from "node:fs";
import path from "node:path";
import { APP, read } from "./parts.mjs";

const INCLUDE = /^[ \t]*\/\* @include ([\w.\-]+) \*\/[ \t]*$/gm;
function expandCss(text) {
  return text.replace(INCLUDE, (_, n) => `/* ▼ ${n} から ▼ */\n${expandCss(read(n)).replace(/\n+$/, "")}\n/* ▲ ${n} ここまで ▲ */`);
}
// @dark{ … } → 暗い配色の2ブロック（端末の設定に従う／[data-theme=dark] で強制）
function expandDark(css) {
  return css.replace(/^@dark\{\n([\s\S]*?)^\}\n/gm, (_, body) => {
    const ind = body.replace(/\n$/, "").split("\n").map(l => (l.trim() ? "  " + l : l)).join("\n") + "\n";
    return `@media (prefers-color-scheme:dark){\n  :root:not([data-theme="light"]){\n${ind}  }\n}\n:root[data-theme="dark"]{\n${body}}\n`;
  });
}
export function render() {
  const out = fs.readFileSync(path.join(APP, "src/Index.html"), "utf8")
    .replace(INCLUDE, (_, n) => {
      const body = n.endsWith(".css") ? expandDark(expandCss(read(n)).replace(/\n*$/, "\n")) : read(n);
      return `/* ▼ ${n} から。直すのは正本のほう（apps/haichi/scripts/parts.mjs の表） ▼ */\n${body.replace(/\n+$/, "")}\n/* ▲ ${n} ここまで ▲ */`;
    });
  if (out.includes("@include")) throw new Error("差し込みきれていない @include が残っている");
  if (/^@dark\{/m.test(out)) throw new Error("展開しきれていない @dark が残っている");
  return out;
}
// 同じ1ファイルを2か所へ：dist（HTML単体版。開くだけ）と gas（GAS版。Code.gs・appsscript.json と組で貼る）
const outs = [path.join(APP, "dist/Index.html"), path.join(APP, "gas/Index.html")];
const html = render();
if (process.argv.includes("--check")) {
  for (const f of outs) {
    const now = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
    if (now !== html) { console.error(path.relative(APP, f) + " が古い。node apps/haichi/scripts/build.mjs で作り直す"); process.exit(1); }
  }
  console.log("ok: dist・gas は最新");
} else {
  for (const f of outs) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, html);
    console.log("wrote", path.relative(process.cwd(), f), (html.length / 1024).toFixed(0) + "KB");
  }
}
