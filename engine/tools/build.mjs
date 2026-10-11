// guides/<行事>/plans/<場面>.json ＋ 場（guides/<行事>/spaces/ または assets/spaces/）＋ engine/player/
//   → guides/<行事>/<場面>.html（1ファイル。配布にも GAS にも そのまま使う）
// 使い方: node engine/tools/build.mjs guides/suiei/plans/dai1ji.json   （引数なしなら guides/*/plans/ を全部）
// 経路は space.json の通路を最短でたどる。所要時間＝道のり÷速さ（通路に minutes があればそれ）。
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const SCALE = 20; // 1m = 20 単位（図の座標）
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8");

export function hm(s) { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; }
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? v[k] : `{${k}}`));

export function compile(plan, space) {
  const AL = space.alias || {}, fillP = (x, v) => { const r = fill(x, v); return AL[r] || r; };   // 上乗せの別名（line.1 → line.SE など）
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
  let VIA = null;   // 手順の via。通路の only と一致するときだけ その通路を使う（退場専用の道など）
  function route(a, b) {
    if (a === b) return [a];
    const d = { [a]: 0 }, prev = {}, done = new Set();
    while (true) {
      let u = null;
      for (const k in d) if (!done.has(k) && (u === null || d[k] < d[u])) u = k;
      if (u === null) return null;
      if (u === b) break;
      done.add(u);
      if (u !== a && (space.noThrough || []).includes(u)) continue; // 水の中などは 通り抜けに使わない
      for (const { to, e } of adj[u] || []) {
        if (e.only && e.only !== VIA) continue;
        const nd = d[u] + cost(u, to, e);
        if (d[to] === undefined || nd < d[to]) { d[to] = nd; prev[to] = u; }
      }
    }
    const out = [b]; while (out[0] !== a) out.unshift(prev[out[0]]); return out;
  }
  const edgeOf = (a, b) => (adj[a] || []).find(x => x.to === b).e;

  const idx = {};
  // 児童ひとりずつの位置（m）。j 番目の児童：列 row=floor(j/per)（0＝プール側の列）、k=j%per（0＝端＝背の低い児童）
  const rows2 = n => Math.ceil(n / 2);
  const radius = (k, per) => +(0.17 + 0.13 * k / Math.max(1, per - 1)).toFixed(3);   // 点の大きさ＝背の高さ
  const FORMS = space.forms || {};
  function lineSlots(pt, name, n) {           // 整列・体操：2列。tall の向きへ 背が高くなる、pool の向きが 1列目
    const F = FORMS[pt], f = F.forms[name], per = rows2(n), sx = F.tall[0] === "+" ? 1 : -1, sy = F.pool[0] === "+" ? 1 : -1;
    const cx = f.cx ?? P[pt][0], cy = P[pt][1], out = [];
    if (f.path) {                                // 線に沿って並ぶ（角で直角に曲がる）。始点＝中央側＝背の高い児童
      const seg = []; let tot = 0;
      for (let i = 1; i < f.path.length; i++) { const [a, b] = [f.path[i - 1], f.path[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push({ a, b, L, s: tot }); tot += L; }
      for (let j = 0; j < n; j++) { const row = Math.floor(j / per), k = j % per, d = Math.min(tot, (f.head ? k : per - 1 - k) * f.gap);
        const sg = seg.find(q => d <= q.s + q.L + 1e-9) || seg[seg.length - 1], u = (d - sg.s) / sg.L;
        const dx = (sg.b[0] - sg.a[0]) / sg.L, dy = (sg.b[1] - sg.a[1]) / sg.L;
        const nx = f.side === "right" ? -dy : dy, ny = f.side === "right" ? dx : -dx;   // プール側の向き
        const off = (row === 0 ? 1 : -1) * f.rowGap / 2;
        out.push([+(sg.a[0] + dx * sg.L * u + nx * off).toFixed(2), +(sg.a[1] + dy * sg.L * u + ny * off).toFixed(2)]); }
      if ((per - 1) * f.gap > tot + 1e-9) warn.push(`隊形 ${pt} ${name}：線の長さ ${tot.toFixed(1)}m に ${per}人が入らない`);
      return out;
    }
    for (let j = 0; j < n; j++) { const row = Math.floor(j / per), k = j % per;
      const x = F.tall.endsWith("x") ? cx + sx * (k - (per - 1) / 2) * f.gap : cx + (row ? -1 : 1) * sy * f.rowGap / 2;
      const y = F.tall.endsWith("x") ? cy + (row === 0 ? 1 : -1) * sy * f.rowGap / 2 : cy + sx * (k - (per - 1) / 2) * f.gap;
      out.push([+x.toFixed(2), +y.toFixed(2)]); }
    return out;
  }
  // 入水の隊形：水面を rows 列に等分し、各列を 東西に等分。左半分・右半分に2組が入り、背の低い児童が両端
  const LAY = plan.layouts || {};
  function layoutSlots(name, gid) {
    if (LAY[name].type === "split") {          // 男女半々：前半の児童を 1つ目の場所、後半を 2つ目の場所へ。4列のかたまり
      const sp = LAY[name].spots[gid], n = plan.groups.find(x => x.id === gid).n || 32, h = Math.ceil(n / 2), d = 0.45, out = [];
      for (let j = 0; j < n; j++) { const q = j < h ? sp[0] : sp[1], i = j < h ? j : j - h, rows = Math.ceil(h / 4);
        out.push([+(q[0] + ((i % 4) - 1.5) * d).toFixed(2), +(q[1] + (Math.floor(i / 4) - (rows - 1) / 2) * d).toFixed(2)]); }
      return out;
    }
    const L = LAY[name], ar = space.areas.find(x => x.id === L.area).rect, pl = L.place[gid];
    const mates = Object.entries(L.place).filter(([id, q]) => q.half !== pl.half && String(q.rows) === String(pl.rows)).map(([id]) => id);
    const n = plan.groups.find(x => x.id === gid).n || 32, per = rows2(n);
    const other = mates.length ? rows2(plan.groups.find(x => x.id === mates[0]).n || 32) : per;
    const total = per + other, out = [];
    for (let j = 0; j < n; j++) { const row = Math.floor(j / per), k = j % per;
      const slot = pl.half === "left" ? k : total - 1 - k;
      out.push([+(ar[0] + (slot + 0.5) * ar[2] / total).toFixed(2), +(ar[1] + (pl.rows[row] + 0.5) * ar[3] / L.rows).toFixed(2)]); }
    return out;
  }
  const cen = sl => [+(sl.reduce((s, q) => s + q[0], 0) / sl.length).toFixed(2), +(sl.reduce((s, q) => s + q[1], 0) / sl.length).toFixed(2)];
  const SYNC = {}, READY = {};
  const compileGroups = () => plan.groups.map(g => {
    const k = (idx[g.script] = (idx[g.script] ?? -1) + 1);
    const v = { ...g.vars, k }, n = g.n || 32, per = rows2(n);
    const forms = {}, keys = []; let at = null, t = null, form = null;
    // key = [時刻, x, y, 隊形名|null, 隊形を ひとりずつ動かして変えるか(1)]
    const put = (tt, xy, fm, morph) => keys.push([+tt.toFixed(3), +xy[0].toFixed(2), +xy[1].toFixed(2), fm || null, morph === 2 ? 2 : morph ? 1 : 0]);
    const arrive = p => { const F = FORMS[p]; if (!F) return null; const name = Object.keys(F.forms)[0], key = p + "|" + name;
      forms[key] ||= lineSlots(p, name, n); return key; };
    const here = () => form ? cen(forms[form]) : P[at];
    for (const step of plan.scripts[g.script]) {
      if (step.place) {
        const p = fillP(step.place, v); if (!P[p]) { warn.push(`${g.label}: 場所 ${p} がない`); continue; }
        at = p; t = hm(step.at); form = arrive(p); put(t, here(), form); continue;
      }
      VIA = step.via || null;
      if (step.sync) (READY[step.sync] ||= []).push(t);
      let dep = step.sync && SYNC[step.sync] !== undefined ? SYNC[step.sync]
              : step.at ? hm(step.at) + (step.stagger || 0) * k : t;   // at が無ければ 前の動きのすぐ後。sync は全員そろった時刻
      if (dep < t - 1e-9) { warn.push(`${g.label}: ${step.at} の出発が 前の到着 ${clock(t)} より早い → ${clock(t)} にずらした`); dep = t; }
      put(dep, here(), form); t = dep;
      if (step.form) {                                   // その場で隊形を変える（体操の隊形など）
        const key = at + "|" + step.form;
        if (!FORMS[at]?.forms[step.form]) { warn.push(`${g.label}: ${at} に 隊形「${step.form}」がない`); continue; }
        forms[key] ||= lineSlots(at, step.form, n); form = key; t += step.dur || 0.5; put(t, here(), form, true); continue;
      }
      if (step.layout) {                                 // 入水：1列目から ひとりずつ 水の中の位置へ
        if (!(LAY[step.layout]?.place || LAY[step.layout]?.spots || {})[g.id]) { warn.push(`${g.label}: 配置「${step.layout}」に この組がない`); continue; }
        const key = "@" + step.layout; forms[key] ||= layoutSlots(step.layout, g.id);
        const p = fillP(step.point, v); P[p] = cen(forms[key]);   // 水の中の点を 隊形の中心に合わせる（あとの経路の起点）
        form = key; at = p; t += step.dur || 1.6; put(t, here(), form, true); continue;
      }
      if (step.return) {                                 // 水から上がる：入水した位置（整列の隊形）へ ひとりずつ戻る。ふち側の列から
        const p = fillP(step.return, v), key = arrive(p);
        if (!key) { warn.push(`${g.label}: ${p} に 隊形がない`); continue; }
        form = key; at = p; t += step.dur || 1.2; put(t, here(), form, 2); continue;
      }
      if (form) { t += 0.3; form = null; put(t, P[at], null, true); }   // 隊形から かたまりに戻ってから 動く
      for (const raw of step.to) {
        const tg = typeof raw === "string" ? { p: raw } : raw, p = fillP(tg.p, v);
        if (!P[p]) { warn.push(`${g.label}: 場所 ${p} がない`); continue; }
        const r = route(at, p);
        if (!r) { warn.push(`${g.label}: ${at} → ${p} へ行ける通路がない（一方通行を確認）`); continue; }
        for (let i = 1; i < r.length; i++) { t += cost(r[i - 1], r[i], edgeOf(r[i - 1], r[i])); put(t, P[r[i]]); }
        at = p;
        if (tg.wait) {
          const fk = FORMS[p] ? arrive(p) : null;           // 途中で並ぶ所（シャワー前の行列など）
          if (fk) { form = fk; t += 0.3; put(t, here(), form, true); t += tg.wait; put(t, here(), form); t += 0.3; form = null; put(t, P[p], null, true); }
          else { t += tg.wait; put(t, P[p]); }
        }
      }
      form = arrive(at); if (form) { t += 0.3; put(t, here(), form, true); }
    }
    const rad = Array.from({ length: n }, (_, j) => radius(j % per, per));
    return { id: g.id, label: g.label, style: g.style || "", color: g.color || "", n, per, rad, forms, vars: v, keys };
  });
  for (const kk in idx) delete idx[kk];
  let groups = compileGroups();
  if (Object.keys(READY).length) {   // sync：全員の準備が終わった時刻（0.5分単位で切り上げ）に そろえて もう一度組み立てる
    for (const [nm, ts] of Object.entries(READY)) SYNC[nm] = Math.ceil(Math.max(...ts) * 2) / 2;
    for (const kk in idx) delete idx[kk];
    warn.length = 0; groups = compileGroups();
  }


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
      space: { title: space.title, status: space.status, up: space.up || "", views: space.views || [], walls: space.walls || [], doors: space.doors || [],  size: space.size, areas: space.areas, marks, pointLabels },
      plan: {
        key: plan.key, title: plan.title, subtitle: plan.subtitle || "", start: hm(plan.start), end: hm(plan.end),
        groups, signals: (plan.signals || []).map(s => ({ ...s, at: s.sync ? SYNC[s.sync] : hm(s.at) })),
        phases: plan.phases.map(p => ({ ...p, at: p.sync ? SYNC[p.sync] : hm(p.at) })).sort((a, b) => a.at - b.at),
      },
    },
  };
}
const clock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

// 場を読む。extends があれば 基礎の場に 上乗せする（区画・通路・注は足す、点・隊形・ラベル・別名は 上書き）
// 探す順：その資料の guides/<行事>/spaces/<id>/ → 素材 assets/spaces/<id>/
export function loadSpace(id, guide) {
  const own = guide && `${guide}/spaces/${id}/space.json`;
  const sp = JSON.parse(rd(own && fs.existsSync(path.join(ROOT, own)) ? own : `assets/spaces/${id}/space.json`));
  if (!sp.extends) return sp;
  const b = loadSpace(sp.extends, guide), ids = new Set((sp.areas || []).map(a => a.id));
  return { ...b, ...sp,
    title: sp.title || b.title, status: sp.status || b.status, up: sp.up || b.up, size: sp.size || b.size,
    statusNote: [b.statusNote, sp.statusNote].filter(Boolean).join(" ／ "),
    sources: [...(b.sources || []), ...(sp.sources || [])],
    areas: [...b.areas.filter(a => !ids.has(a.id)), ...(sp.areas || [])],
    points: { ...b.points, ...(sp.points || {}) }, paths: [...b.paths, ...(sp.paths || [])],
    pointLabels: { ...(b.pointLabels || {}), ...(sp.pointLabels || {}) }, forms: { ...(b.forms || {}), ...(sp.forms || {}) },
    alias: { ...(b.alias || {}), ...(sp.alias || {}) }, views: [...(b.views || []), ...(sp.views || [])] };
}

export function build(planPath) {
  const plan = JSON.parse(rd(planPath));
  const guide = path.dirname(path.dirname(planPath));          // guides/<行事>
  const space = loadSpace(plan.space, guide);
  const { warn, data } = compile(plan, space);
  const out = `${guide}/${plan.key}.html`;
  const html = rd("engine/player/page.html")
    .replace("/*TITLE*/", plan.title)
    .replace("/*CSS*/", () => rd("engine/player/flow.css"))
    .replace("/*DATA*/", () => JSON.stringify(data))
    .replace("/*JS*/", () => rd("engine/player/flow.js"));
  fs.mkdirSync(path.join(ROOT, path.dirname(out)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, out), html);
  console.log(`✔ ${out}  (${(html.length / 1024).toFixed(1)} KB)  地図: ${space.status}`);
  for (const w of warn) console.log(`  ⚠ ${w}`);
  for (const o of plan.open || []) console.log(`  ? 未確定: ${o}`);
  return { out, warn };
}

if (process.argv[1] && process.argv[1].endsWith("build.mjs")) {
  let list = process.argv.slice(2);
  if (!list.length) list = fs.readdirSync(path.join(ROOT, "guides")).filter(ev => fs.existsSync(path.join(ROOT, "guides", ev, "plans"))).flatMap(ev =>
    fs.readdirSync(path.join(ROOT, "guides", ev, "plans")).filter(f => f.endsWith(".json")).map(f => `guides/${ev}/plans/${f}`));
  let bad = 0;
  for (const p of list) bad += build(p).warn.filter(w => !w.startsWith("すれちがい")).length;
  process.exit(bad ? 1 : 0);
}
