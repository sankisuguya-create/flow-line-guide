// 画面の操作を確かめる（dist/Index.html をブラウザで動かす）: node apps/haichi/tests/e2e.mjs
// playwright が要る。Chromium の場所は PW_CHROMIUM（無ければ playwright 既定）。
// 1つでも食いちがえば止まる。test-app.mjs（描画の不変条件）と組で回す。
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const url = new URL('../dist/Index.html', import.meta.url).href;
const b = await chromium.launch(process.env.PW_CHROMIUM ? {executablePath: process.env.PW_CHROMIUM} : {});
const ctx = await b.newContext({viewport: {width: 1366, height: 768}, hasTouch: true});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem('haichi.v1')));
const lastLayout = async () => { const s = await saved(); return s.layouts[s.layouts.length - 1]; };
const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { console.log('NG  ', name); throw e; } };

await p.goto(url);

await step('保存の版：古い「跳び箱の準備」を捨て、新しい体育館の標準配置を足す', async () => {
  await p.evaluate(() => localStorage.setItem('haichi.v1', JSON.stringify({
    layouts: [{id: 'g_tobibako', scene: 'gym', name: '跳び箱の準備', top: [], hooks: {left: [], right: []}, away: []},
              {id: 'mine', scene: 'gym', name: '自作', top: [{item: 'gcone', x: 10000, y: 10000, r: 0}], hooks: {left: [], right: []}, away: []}],
    recent: ['g_tobibako'], prefs: {scene: 'gym'}})));
  await p.reload();
  const ids = (await saved()).layouts.map(l => l.id);
  assert.ok(!ids.includes('g_tobibako') && ids.includes('mine') && ids.includes('g_tobibako3') && ids.includes('g_shukai'), ids.join());
  assert.equal((await saved()).ver, 2);
});

await step('編集画面のズーム：ホイール・引きずり・全体に戻す', async () => {
  await p.click('[data-fix="g_tobibako3"]');
  const vb = () => p.getAttribute('#editSvg', 'viewBox');
  const v0 = await vb(), box = await p.locator('#editSvg').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 4; i++) await p.mouse.wheel(0, -100);
  const v1 = await vb();
  assert.ok(+v1.split(' ')[2] < +v0.split(' ')[2] / 1.5, '拡大');
  await p.mouse.move(box.x + 40, box.y + box.height - 30); await p.mouse.down();
  await p.mouse.move(box.x + 200, box.y + box.height - 60, {steps: 4}); await p.mouse.up();
  assert.notEqual(await vb(), v1, '見る範囲が動く');
  await p.click('#zReset'); assert.equal(await vb(), v0);
});

await step('2本指でつまんで拡大', async () => {
  const c = await ctx.newCDPSession(p);
  const T = (type, pts) => c.send('Input.dispatchTouchEvent', {type, touchPoints: pts.map((q, i) => ({x: q[0], y: q[1], id: i}))});
  await T('touchStart', [[400, 450], [600, 450]]);
  for (let i = 1; i <= 5; i++) await T('touchMove', [[400 - i * 30, 450], [600 + i * 30, 450]]);
  await T('touchEnd', []);
  assert.equal(await p.textContent('#zReset'), '250%');
  await p.click('#zReset');
});

await step('写す・貼る・取り消す・やり直す・けす', async () => {
  const n = () => p.locator('#editSvg .it').count();
  const n0 = await n();
  await p.click('#editSvg .it[data-i="0"]');
  await p.keyboard.press('Control+c'); await p.keyboard.press('Control+v'); await p.keyboard.press('Control+v');
  assert.equal(await n(), n0 + 2);
  await p.keyboard.press('Control+z'); assert.equal(await n(), n0 + 1);
  await p.keyboard.press('Control+y'); assert.equal(await n(), n0 + 2);
  await p.click('#editSvg .it[data-i="0"]'); await p.keyboard.press('Delete'); assert.equal(await n(), n0 + 1);
  await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z');
  assert.equal(await n(), n0);
});

await step('まとめて選ぶ：Shift＋押す・囲む・そろえる・まとめて動かす・まとめて消す', async () => {
  // 跳び箱（3コース）：3つの跳び箱（gbox）を Shift＋押すで選び、上をそろえる
  await p.click('#eBack'); await p.click('[data-fix="g_tobibako3"]');
  const top = () => p.evaluate(() => JSON.parse(localStorage.getItem('haichi.v1')).layouts.find(l => l.id === 'g_tobibako3').top);
  const boxes = (await top()).map((q, i) => [q, i]).filter(([q]) => q.item === 'gbox').map(([, i]) => i);
  await p.locator(`#editSvg .it[data-i="${boxes[0]}"]`).click();
  for (const i of boxes.slice(1)) await p.locator(`#editSvg .it[data-i="${i}"]`).click({modifiers: ['Shift']});
  assert.equal(await p.textContent('#mCount'), '3個');
  await p.click('#mAlign summary'); await p.click('[data-al="hdist"]');
  let t = await top(); const xs = boxes.map(i => t[i].x).sort((a, b) => a - b);
  assert.ok(Math.abs((xs[1] - xs[0]) - (xs[2] - xs[1])) < 1e-6, '横に等間隔');
  const y0 = boxes.map(i => t[i].y);
  await p.keyboard.press('ArrowDown');
  t = await top(); assert.ok(boxes.every((i, k) => t[i].y > y0[k]), 'まとめて動く');
  await p.keyboard.press('Control+z');
  // 基準に揃える：基準（最後に選んだ物）の y に 横一列で合わせる
  const ref = await p.evaluate(() => sel);
  await p.click('#mAlign summary'); await p.click('[data-ref="y"]');
  t = await top(); assert.ok(boxes.every(i => Math.abs(t[i].y - t[ref].y) < 1e-6), '基準の y に揃う');
  await p.click('#mRefNext'); assert.notEqual(await p.evaluate(() => sel), ref, '基準を変えられる');
  // まとめて拡大・縮小
  await p.click('#mBig'); t = await top(); assert.ok(boxes.every(i => t[i].s === 1.25), 'まとめて125%');
  assert.equal(await p.textContent('#mReal'), '125%');
  await p.click('#mReal'); t = await top(); assert.ok(boxes.every(i => !t[i].s), '実寸に戻す');
  await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z');
  // 囲む：図の左上から右下まで引きずると すべて選ぶ
  await p.keyboard.press('Escape');
  const box = await p.locator('#editSvg').boundingBox();
  await p.mouse.move(box.x + 5, box.y + 5); await p.mouse.down(); await p.mouse.move(box.x + box.width - 5, box.y + box.height - 5, {steps: 5}); await p.mouse.up();
  assert.equal(await p.textContent('#mCount'), (await top()).length + '個');
  await p.click('#mDel'); assert.equal((await top()).length, 0);
  await p.keyboard.press('Control+z'); assert.ok((await top()).length > 0);
});

await step('矢印をのばす：上へ2目、斜め、ちぢめる、色', async () => {
  await p.click('#eBack'); await p.click('#hNew'); await p.click('[data-add="arrow"]'); await p.click('#selPath');
  const marks = () => p.$$eval('.amark:not(.shrink)', els => els.map(m => ({e: m.dataset.ext, x: +m.dataset.x, y: +m.dataset.y})));
  assert.equal((await marks()).length, 16, '先と元に8方向ずつ');
  const go = async (f) => { const t = (await marks()).filter(m => m.e === 'tip').sort(f)[0]; await p.locator(`.amark[data-ext="tip"][data-x="${t.x}"][data-y="${t.y}"]`).dispatchEvent('pointerdown'); };
  const up = (a, b) => a.y - b.y || Math.abs(a.x) - Math.abs(b.x), ne = (a, b) => (b.x - b.y) - (a.x - a.y);
  await go(up); await go(ne); await go(ne);
  let pts = (await lastLayout()).top[0].pts;
  assert.equal(pts.length, 3, 'のびて1回曲がる');
  const [a, c] = [pts[1], pts[2]]; assert.ok(c[0] - a[0] > 0 && c[1] - a[1] < 0 && Math.abs((c[0] - a[0]) / (c[1] - a[1])) > 0, '右上へ斜め');
  await p.locator('.amark.shrink[data-ext="tip"]').dispatchEvent('pointerdown');
  pts = (await lastLayout()).top[0].pts;
  assert.ok(Math.abs(pts[2][0] - pts[1][0]) < Math.abs(c[0] - a[0]), 'ちぢむ');
  await p.click('#selColors [data-col="2"]'); assert.equal((await lastLayout()).top[0].color, 2);
});

await step('児童：横×縦の人数、36人まで', async () => {
  await p.click('[data-add="kids"]');
  for (let i = 0; i < 5; i++) await p.click('#selGrid [data-k="x"][data-d="1"]');
  for (let i = 0; i < 6; i++) await p.click('#selGrid [data-k="y"][data-d="1"]');
  const k = (await lastLayout()).top.find(q => q.item === 'kids');
  assert.deepEqual([k.nx, k.ny], [6, 6]);
});

await step('拡大・縮小とグリッドの線', async () => {
  await p.click('#selBig'); assert.equal(await p.textContent('#selReal'), '125%');
  await p.click('#selReal'); assert.equal(await p.textContent('#selReal'), '100%');
  await p.click('#eGridMenu summary'); await p.click('#eGridShow');
  assert.equal(await p.locator('#editSvg .grid').count(), 0);
  await p.click('#eGridShow'); await p.click('#eGridMenu summary');
});

await step('自由配置：交点に合わせない／ふりがなは映す画面だけ', async () => {
  await p.click('#eBack'); await p.click('[data-scene="gym"]');
  assert.equal(await p.locator('#cards ruby').count(), 0, 'カードには ふりがなを付けない');
  await p.click('[data-fix="g_tobibako3"]');
  assert.equal(await p.locator('#editSvg ruby, #editSvg .labels rt').count(), 0);
  await p.click('#eGridMenu summary');
  await p.click('[data-grid="free"]');
  assert.ok(await p.locator('[data-grid="free"].on').count(), '自由配置のボタンが選ばれる');
  const q = await p.evaluate(() => { const o = { x: 1234, y: 4567 }; clampP(o); return o; });
  assert.deepEqual([q.x, q.y], [1234, 4567], '自由配置では 交点に合わせない');
  await p.click('[data-grid="normal"]'); await p.click('#eGridMenu summary');
  const q2 = await p.evaluate(() => { const o = { x: 1234, y: 4567 }; clampP(o); return o; });
  assert.ok(q2.x % 1250 === 0 && q2.y % 1250 === 0, '標準に戻すと交点に合う');
  await p.click('#eShow');
  assert.ok((await p.innerHTML('#sTitle')).includes('<ruby>'), '映す画面は ふりがな');
  await p.click('#sBack');
});

await step('場所を90°回転：物も回り、4回で元に戻る。取り消しで戻る', async () => {
  await p.click('[data-fix="g_tobibako3"]');
  const get = () => p.evaluate(() => JSON.parse(localStorage.getItem('haichi.v1')).layouts.find(l => l.id === 'g_tobibako3'));
  const l0 = await get();
  await p.click('#eTurn');
  const l1 = await get();
  assert.equal(l1.rot, 90);
  const a0 = l0.top.find(q => q.item === 'arrow'), a1 = l1.top.find(q => q.item === 'arrow');
  assert.equal(a1.r, ((a0.r || 0) + 90) % 360, '物の向きも回る');
  const [W, D] = await p.evaluate(() => [DESK.w, DESK.d]);
  assert.ok(W < D, '体育館（横長）が縦長になる');
  await p.keyboard.press('Control+z');
  assert.equal(JSON.stringify((await get()).top), JSON.stringify(l0.top), '取り消すと元の位置');
  for (let i = 0; i < 4; i++) await p.click('#eTurn');
  const l4 = await get();
  assert.ok(!l4.rot, '4回で元の向き');
  assert.deepEqual(l4.top.map(q => [q.x, q.y, q.r || 0]), l0.top.map(q => [q.x, q.y, q.r || 0]));
  await p.click('#eBack');
});

await step('パレット：用具・設備／矢印・目印／人 に分かれる', async () => {
  await p.click('[data-fix="g_shukai"]');
  assert.deepEqual(await p.$$eval('#pItems .pgroup', els => els.map(e => e.textContent)), ['用具・設備', '矢印・目印', '人']);
  await p.click('#eBack');
});

await step('まとめて印刷：1配置1枚', async () => {
  await p.evaluate(() => { window.print = () => { window.__pages = document.querySelectorAll('#printArea .pg').length; }; });
  await p.click('#hPrint'); await p.click('#pGo');
  const cards = await p.locator('.card').count();
  assert.equal(await p.evaluate(() => window.__pages), cards);
});

assert.deepEqual(errs, [], 'ページのエラー');
await b.close();
console.log('ok');
