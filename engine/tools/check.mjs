// できあがった資料を 実際のブラウザで開いて 確かめる。
// 使い方: node engine/tools/check.mjs guides/suiei/dai1ji.html <出力フォルダ>
// 各場面の はじめで「ぜんぶ」と 最初の組を 撮る。Chromebook（1366×768の表示域）と スマホ横（844×390）。
// JSエラー・横はみ出しが あれば 失敗にする。playwright が要る（PLAYWRIGHT_BROWSERS_PATH の chromium を使う）。
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require(path.join(process.execPath, "../../lib/node_modules/playwright")); }

const [file, outDir = "shots"] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const exe = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
let bad = 0;
for (const [w, h, tag] of [[1366, 657, "cb"], [844, 390, "phone"]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + path.resolve(file));
  const n = await p.evaluate(() => document.querySelectorAll("#chap button").length);
  const first = await p.evaluate(() => document.querySelectorAll("#who button")[1].dataset.w);   // 最初の組
  for (let i = 0; i < n; i++) for (const who of ["all", first]) {
    await p.evaluate(([i, who]) => { document.querySelector(`#who [data-w="${who}"]`).click(); document.querySelectorAll("#chap button")[i].click(); }, [i, who]);
    await p.waitForTimeout(1200);
    if (tag === "phone" && i % 3) continue;
    await p.screenshot({ path: `${outDir}/${tag}-${String(i).padStart(2, "0")}-${who}.png` });
  }
  const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (errs.length || over) { bad++; console.log(`✖ ${tag}`, errs, over ? "横はみ出し" : ""); } else console.log(`✔ ${tag}`);
  await p.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
