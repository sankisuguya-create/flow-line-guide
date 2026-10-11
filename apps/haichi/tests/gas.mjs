// GAS版（共有・同時に直す）を確かめる: node apps/haichi/tests/gas.mjs
// gas/Code.gs の中身（haichiCore_）を そのまま node で動かし、スプレッドシートの代わりに 配列の表を使う。
// 画面は2つ（先生A・先生B）を開き、google.script.run を この表につなぐ。playwright が要る（Chromium は PW_CHROMIUM）。
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {chromium} from 'playwright';

const code = await readFile(new URL('../gas/Code.gs', import.meta.url), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(code, ctx);
const memTable = () => { const rows = []; return { rows: () => rows, update: () => {}, insert: r => rows.push(r), _rows: rows }; };

// ---- 中身だけ：版がちがえば書かない・消す・変わった物だけ返す ----
{
  const t = memTable(); let now = 1000;
  const J = (x) => JSON.parse(JSON.stringify(x));   // vm の中の物を ふつうの物に
  const core = (u) => { const c = ctx.haichiCore_(t, u, now++); return { put: l => J(c.put(l)), list: () => J(c.list()), changes: s => J(c.changes(s)) }; };
  assert.deepEqual(core('a').put([{id: 'x', json: '{"id":"x","top":[]}', ver: 0}]), [{ok: true, ver: 1}]);
  const r = core('b').put([{id: 'x', json: '{"id":"x","top":[1]}', ver: 0}])[0];
  assert.equal(r.ok, false); assert.equal(r.row.ver, 1, '古い版では書けず、いまの行が返る');
  assert.equal(core('b').put([{id: 'x', json: '{"id":"x","top":[1]}', ver: 1}])[0].ver, 2);
  const since = now;
  assert.equal(core('a').changes(since).rows.length, 0);
  core('a').put([{id: 'x', del: true, ver: 2}]);
  assert.equal(core('a').changes(since).rows[0].del, true);
  assert.equal(core('a').list().rows.length, 0, '消した配置は一覧に出ない');
  assert.throws(() => core('a').put([{id: 'y', json: '{こわれた', ver: 0}]));
  console.log('ok   Code.gs の中身（版・消す・変わった物）');
}

// ---- 画面2つで同時に直す ----
const url = new URL('../dist/Index.html', import.meta.url).href;
const table = memTable(); let clock = Date.now();
const presence = {};
const server = (user, name, args) => {
  const core = ctx.haichiCore_(table, user, ++clock);
  if (name === 'haichiList') return JSON.parse(JSON.stringify(core.list()));
  if (name === 'haichiPut') return JSON.parse(JSON.stringify(core.put(args[0])));
  if (name === 'haichiChanges') {
    const res = core.changes(args[0]);
    if (args[1]) presence[user] = args[1]; else delete presence[user];
    res.editors = {}; for (const [u, id] of Object.entries(presence)) (res.editors[id] = res.editors[id] || []).push(u);
    return JSON.parse(JSON.stringify(res));
  }
  throw new Error('知らない呼び出し ' + name);
};
const mock = () => {
  const make = () => { let ok = () => {}, ng = () => {};
    const r = { withSuccessHandler(f) { ok = f; return r; }, withFailureHandler(f) { ng = f; return r; } };
    for (const n of ['haichiList', 'haichiPut', 'haichiChanges']) r[n] = (...a) => { window.__gas(n, JSON.stringify(a)).then(x => ok(JSON.parse(x)), e => ng(e)); };
    return r; };
  window.google = { script: { get run() { return make(); } } };
};
const b = await chromium.launch(process.env.PW_CHROMIUM ? {executablePath: process.env.PW_CHROMIUM} : {});
const open = async (user) => {
  const c = await b.newContext({viewport: {width: 1366, height: 768}});
  await c.exposeBinding('__gas', (_, name, args) => JSON.stringify(server(user, name, JSON.parse(args))));
  await c.addInitScript(mock);
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.errs = errs;
  await p.goto(url); return p;
};
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const rowOf = (id) => JSON.parse(table._rows.find(r => r.id === id).json);
// 重なった物も選べるように、押す（pointerdown）を物に直接送る
const pick = async (P, i) => { await P.locator(`#editSvg .it[data-i="${i}"]`).dispatchEvent('pointerdown', {pointerId: 1, isPrimary: true}); await P.locator('#editSvg').dispatchEvent('pointerup', {pointerId: 1}); };
const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { console.log('NG  ', name); throw e; } };

const A = await open('sensei-a');
await wait(1500);
await step('初めて開くと 標準の配置を共有に送る', async () => {
  assert.ok(table._rows.some(r => r.id === 'g_shukai'), '共有の表に標準の配置');
  assert.ok(rowOf('g_shukai').top.every(p => p.u), '物に名札 u');
});
const B = await open('sensei-b');
await wait(800);
await step('2人目は 共有の配置で開く', async () => {
  await B.click('[data-scene="gym"]');
  assert.ok(await B.locator('[data-fix="g_shukai"]').count());
});
await step('同時に別の物を足すと まざる', async () => {
  await A.click('[data-scene="gym"]'); await A.click('[data-fix="g_shukai"]');
  await B.click('[data-fix="g_shukai"]');
  const n0 = rowOf('g_shukai').top.length;
  await A.click('[data-add="gcone"]'); await B.click('[data-add="hoop"]');
  await wait(9000);   // 送る（0.7秒）→ 相手が取りに来る（4秒ごと）
  const items = rowOf('g_shukai').top.map(p => p.item);
  assert.equal(items.length, n0 + 2, items.join());
  assert.ok(items.includes('gcone') && items.includes('hoop'));
  for (const P of [A, B]) assert.equal(await P.locator('#editSvg .it').count(), n0 + 2, '両方の画面に両方の物');
});
await step('いっしょに編集中の人の名前が出る', async () => {
  assert.match(await A.textContent('#ePeers'), /sensei-b/);
  assert.match(await B.textContent('#ePeers'), /sensei-a/);
});
await step('Bが消した物は Aからも消える（Aが同じ時に別の物を動かしても）', async () => {
  const top = rowOf('g_shukai').top, iHoop = top.findIndex(p => p.item === 'hoop');
  await pick(B, iHoop); await B.keyboard.press('Delete');
  const iTeacher = top.findIndex(p => p.item === 'teacher'), x0 = top[iTeacher].x;
  await pick(A, iTeacher); await A.keyboard.press('ArrowLeft');
  await wait(9000);
  const now = rowOf('g_shukai').top;
  assert.ok(!now.some(p => p.item === 'hoop'), '消えた');
  assert.ok(now.find(p => p.item === 'teacher').x < x0, 'Aの移動も残る');
  assert.equal(await A.locator('#editSvg .it').count(), now.length);
});
await step('だれも直さなければ 送り合わない（版が上がらない）', async () => {
  const v0 = table._rows.map(r => r.id + ':' + r.ver).join();
  await wait(9000);
  assert.equal(table._rows.map(r => r.id + ':' + r.ver).join(), v0);
});
await step('ページのエラーなし', async () => { assert.deepEqual(A.errs.concat(B.errs), []); });
await b.close();
console.log('ok');
