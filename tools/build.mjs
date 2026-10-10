// plans/<行事>/<場面>.json ＋ spaces/<場>/space.json ＋ core/ → gas/<行事>/<場面>.html（1ファイル）
// 使い方: node tools/build.mjs plans/suiei/dai1ji.json   （引数なしなら plans/ を全部）
// 経路は space.json の通路を最短でたどる。所要時間＝道のり÷速さ（通路に minutes があればそれ）。
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SCALE = 20; // 1m = 20 単位（図の座標）
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8");

export function hm(s) { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; }
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? v[k] : `{${k}}`));

export function compile(plan, space) {
  const warn = [], P = space.points, speed = plan.speed || 0.8; // m/s
  // 通路のグラフ
  const adj = {};
  const add = (a, b, e) => (adj[a] ||= []).push({ to: b, e });
  for (const [a, b, opt = {}] of space.paths) {
    for (const k of [a, b]) if (!P[k]) warn.push(`通路の点 ${k} が points にない`);
    add(a, b, opt); if (!opt.oneway) add(b, a, opt);
  }
  const dist = (a, b) => Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]);
  const cost = (a, b, e) => (e.minutes ?? dist(a, b) / speed / 60);
  function route(a, b) {
    if (a === b) return [a];
    const d = { [a]: 0 }, prev = {}, done = new Set();
    while (true) {
      let u = null;
      for (const k in d) if (!done.has(k) && (u === null || d[k] < d[u])) u = k;
      if (u === null) return null;
      if (u === b) break;
      done.add(u);
      for (const { to, e } of adj[u] || []) {
        const nd = d[u] + cost(u, to, e);
        if (d[to] === undefined || nd < d[to]) { d[to] = nd; prev[to] = u; }
      }
    }
    const out = [b]; while (out[0] !== a) out.unshift(prev[out[0]]); return out;
  }
  const edgeOf = (a, b) => (adj[a] || []).find(x => x.to === b).e;

  const idx = {};
  const groups = plan.groups.map(g => {
    const k = (idx[g.script] = (idx[g.script] ?? -1) + 1);
    const v = { ...g.vars, k };
    const keys = []; let at = null, t = null;
    const put = (tt, p) => keys.push([+tt.toFixed(3), +P[p][0].toFixed(2), +P[p][1].toFixed(2)]);
    for (const step of plan.scripts[g.script]) {
      if (step.place) {
        const p = fill(step.place, v); if (!P[p]) { warn.push(`${g.label}: 場所 ${p} がない`); continue; }
        at = p; t = hm(step.at); put(t, p); continue;
      }
      let dep = hm(step.at) + (step.stagger || 0) * k;
      if (dep < t - 1e-9) { warn.push(`${g.label}: ${step.at} の出発が 前の到着 ${clock(t)} より早い → ${clock(t)} にずらした`); dep = t; }
      put(dep, at); t = dep;
      for (const raw of step.to) {
        const tg = typeof raw === "string" ? { p: raw } : raw, p = fill(tg.p, v);
        if (!P[p]) { warn.push(`${g.label}: 場所 ${p} がない`); continue; }
        const r = route(at, p);
        if (!r) { warn.push(`${g.label}: ${at} → ${p} へ行ける通路がない（一方通行を確認）`); continue; }
        for (let i = 1; i < r.length; i++) { t += cost(r[i - 1], r[i], edgeOf(r[i - 1], r[i])); put(t, r[i]); }
        at = p;
        if (tg.wait) { t += tg.wait; put(t, p); }
      }
    }
    return { id: g.id, label: g.label, style: g.style || "", vars: v, keys };
  });

  // すれちがいの検査：2組が 2m 以内で 向かい合って動いている（同じ向きに続いて歩くのは ふつうなので 数えない）
  const vel = (g, t) => { const K = g.keys;
    for (let i = 0; i < K.length - 1; i++) if (t >= K[i][0] && t < K[i + 1][0]) { const a = K[i], b = K[i + 1], u = (t - a[0]) / (b[0] - a[0]);
      return { x: a[1] + (b[1] - a[1]) * u, y: a[2] + (b[2] - a[2]) * u, dx: b[1] - a[1], dy: b[2] - a[2] }; }
    const z = t < K[0][0] ? K[0] : K[K.length - 1]; return { x: z[1], y: z[2], dx: 0, dy: 0 }; };
  const hits = {};
  for (let t = hm(plan.start); t <= hm(plan.end); t += 0.02)
    for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
      const a = vel(groups[i], t), b = vel(groups[j], t);
      const dot = a.dx * b.dx + a.dy * b.dy, n = Math.hypot(a.dx, a.dy) * Math.hypot(b.dx, b.dy);
      if (n > 0 && dot < -0.3 * n && Math.hypot(a.x - b.x, a.y - b.y) < 2) {
        const key = `${groups[i].label} と ${groups[j].label}`; (hits[key] ||= []).push(t);
      }
    }
  for (const [key, ts] of Object.entries(hits)) warn.push(`すれちがい ${clock(ts[0])}〜${clock(ts[ts.length - 1] + 1)} ${key}（時間をずらすか 通路を分ける）`);
  const end = Math.max(...groups.map(g => g.keys[g.keys.length - 1][0]));
  if (end > hm(plan.end)) warn.push(`最後の到着 ${clock(end)} が end ${plan.end} より遅い`);

  // 描き方の検査：壁で囲む区画どうしの すき間（0〜0.6m）は 作らない。扉は 壁（区画の辺）の上に置く
  const walled = space.areas.filter(a => a.kind !== "mark" && a.kind !== "water");
  const near = (u, v) => Math.abs(u - v) > 1e-6 && Math.abs(u - v) < 0.6;
  const overlap = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > 0.3;
  for (let i = 0; i < walled.length; i++) for (let j = i + 1; j < walled.length; j++) {
    const [ax, ay, aw, ah] = walled[i].rect, [bx, by, bw, bh] = walled[j].rect;
    if (overlap(ay, ay + ah, by, by + bh) && (near(ax + aw, bx) || near(bx + bw, ax))) warn.push(`すき間 ${walled[i].id} と ${walled[j].id}（左右）：辺をそろえる`);
    if (overlap(ax, ax + aw, bx, bx + bw) && overlap(ay, ay + ah, by, by + bh) && !(walled[i].kind === "deck" || walled[j].kind === "deck"))
      warn.push(`重なり ${walled[i].id} と ${walled[j].id}：辺で接するように分ける（重なると 中に壁の線が出る）`);
    if (overlap(ax, ax + aw, bx, bx + bw) && (near(ay + ah, by) || near(by + bh, ay))) warn.push(`すき間 ${walled[i].id} と ${walled[j].id}（上下）：辺をそろえる`);
  }
  const onEdge = (p) => walled.some(a => { const [x, y, w, h] = a.rect, e = 1e-6;
    return ((Math.abs(p[0] - x) < e || Math.abs(p[0] - x - w) < e) && p[1] >= y - e && p[1] <= y + h + e) ||
           ((Math.abs(p[1] - y) < e || Math.abs(p[1] - y - h) < e) && p[0] >= x - e && p[0] <= x + w + e); });
  for (const d of space.doors || []) if (!onEdge(d.from) || !onEdge(d.to)) warn.push(`扉 ${d.label || ""}${JSON.stringify(d.from)} が 区画の辺の上にない`);
  for (const w of space.walls || []) if (w[0][0] !== w[1][0] && w[0][1] !== w[1][1]) warn.push(`壁 ${JSON.stringify(w)} が 縦か横に なっていない`);
  // 一方通行の しるしは 経路の点列にして渡す
  const marks = (space.marks || []).map(m => ({ ...m, pts: (route(m.from, m.to) || []).map(p => P[p]) }));
  const pointLabels = Object.fromEntries(Object.entries(space.pointLabels || {}).map(([k, text]) => [k, { text, at: P[k] }]));
  return {
    warn,
    data: {
      scale: SCALE,
      space: { title: space.title, status: space.status, up: space.up || "", walls: space.walls || [], doors: space.doors || [], size: space.size, areas: space.areas, marks, pointLabels },
      plan: {
        key: plan.key, title: plan.title, subtitle: plan.subtitle || "", start: hm(plan.start), end: hm(plan.end),
        groups, signals: (plan.signals || []).map(s => ({ ...s, at: hm(s.at) })),
        phases: plan.phases.map(p => ({ ...p, at: hm(p.at) })),
      },
    },
  };
}
const clock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function build(planPath) {
  const plan = JSON.parse(rd(planPath));
  const space = JSON.parse(rd(`spaces/${plan.space}/space.json`));
  const { warn, data } = compile(plan, space);
  const event = path.basename(path.dirname(planPath));
  const out = `gas/${event}/${plan.key}.html`;
  const html = rd("core/page.html")
    .replace("/*TITLE*/", plan.title)
    .replace("/*CSS*/", () => rd("core/flow.css"))
    .replace("/*DATA*/", () => JSON.stringify(data))
    .replace("/*JS*/", () => rd("core/flow.js"));
  fs.mkdirSync(path.join(ROOT, path.dirname(out)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, out), html);
  console.log(`✔ ${out}  (${(html.length / 1024).toFixed(1)} KB)  地図: ${space.status}`);
  for (const w of warn) console.log(`  ⚠ ${w}`);
  for (const o of plan.open || []) console.log(`  ? 未確定: ${o}`);
  return { out, warn };
}

if (process.argv[1] && process.argv[1].endsWith("build.mjs")) {
  let list = process.argv.slice(2);
  if (!list.length) list = fs.readdirSync(path.join(ROOT, "plans")).flatMap(ev =>
    fs.readdirSync(path.join(ROOT, "plans", ev)).filter(f => f.endsWith(".json")).map(f => `plans/${ev}/${f}`));
  let bad = 0;
  for (const p of list) bad += build(p).warn.filter(w => !w.startsWith("すれちがい")).length;
  process.exit(bad ? 1 : 0);
}
