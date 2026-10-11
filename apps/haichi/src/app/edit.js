/* 配置図の画面 ③：つくる・なおす（選んだ物の操作・まとめて選ぶ・矢印をのばす） */
/* ---- ③ つくる・なおす ---- */
function openEdit(id) {
  cur = byId(id); if (!cur) return renderHome();
  useScene(scOf(cur));
  sel = -1; msel = []; EZ.k = 1; EZ.cx = null;
  hist = { undo: [], redo: [], last: JSON.stringify(cur) };
  histButtons();
  $('eOutline').checked = OUTLINE; $('eGridShow').checked = S.prefs.gridShow !== false;
  $('eTextBox').hidden = !SCENE.space; $('eText').checked = SPACE_TEXT;
  $('eName').value = cur.name; $('eYomi').value = cur.yomi; $('eFlip').checked = cur.flip;
  go('vEdit'); renderEdit(); renderPalette();
}
function renderEdit() {
  var t = topView(cur, { ruby: false, sel: msel.length > 1 ? msel : sel, grid: S.prefs.gridShow === false ? null : gridLevel(S.prefs.grid) });   // 線を消しても交点への吸着は続く
  var b = t.box, pad = 60 * K;
  var svg = $('editSvg');
  // 余白は広めに固定して、吹き出しが増えても床が跳ねないようにする（場所の広さに合わせて K 倍）
  var x0 = Math.min(b.x0, -300 * K) - pad, y0 = Math.min(b.y0, -130 * K) - pad, x1 = Math.max(b.x1, DESK.w + 300 * K) + pad, y1 = Math.max(b.y1, DESK.d + 130 * K) + pad;
  EZ.base = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  var ps = cur.top[sel];
  if (!ps || !hasCtl(ps.item, 'path') || !isPath(ps)) arrowEdit = false;
  svg.innerHTML = t.svg + (arrowEdit ? arrowMarks(ps) : '');
  applyZoom();
  var multi = msel.length > 1;
  $('multiBar').hidden = !multi;
  if (multi) $('mCount').textContent = msel.length + '個';
  var p = multi ? null : cur.top[sel];
  $('selBar').hidden = !p;
  if (p) {
    var it = ITEMS[p.item], keys = Object.keys(it.states);
    $('selName').textContent = plainName(it.name);
    $('selState').hidden = keys.length < 2;
    $('selState').innerHTML = keys.map(function (k) {
      return '<button type="button" data-st="' + k + '" class="' + (k === stateOf(p) ? 'on' : '') + '">' + (STATE_NAMES[k] || k) + '</button>';
    }).join('');
    $('selLabel').setAttribute('aria-pressed', String(!!p.label));
    $('selReal').textContent = Math.round(scaleOf(p) * 100) + '%'; $('selReal').title = '実寸（100%）に戻す';
    $('selTextBox').hidden = !it.text;
    if (it.text && document.activeElement !== $('selText')) $('selText').value = p.text || '';
    $('selSize').hidden = !it.sizes;
    if (it.sizes) $('selSize').textContent = Object.keys(it.sizes).map(function (k) { return (k === sizeOf(p) ? '●' : '○') + it.sizes[k].name; }).join(' ');
    $('selGrid').hidden = !hasCtl(p.item, 'grid');
    if (hasCtl(p.item, 'grid')) { var kn = kidsN(p); $('kNx').textContent = kn.nx; $('kNy').textContent = kn.ny; $('kSum').textContent = '（' + kn.nx * kn.ny + '人）'; }
    $('selPath').hidden = !hasCtl(p.item, 'path'); $('selPath').setAttribute('aria-pressed', String(arrowEdit && hasCtl(p.item, 'path')));
    $('selColors').hidden = !it.colors;
    if (it.colors) $('selColors').innerHTML = '色' + it.colors.map(function (c, k) {
      return '<button type="button" class="sw' + (k === colorIndex(p) ? ' on' : '') + '" data-col="' + k + '" style="background:' + c + '" aria-label="色' + (k + 1) + '"></button>';
    }).join('');
  }
  renderChips();
  $('eBgBox').hidden = !!SCENE.desk;   // 床の色は場所だけ（机の天板は木の色のまま）
  $('eBg').innerHTML = FLOOR_COLORS.map(function (f) {
    var on = (cur.bg || '') === f.id;
    return '<button type="button" class="sw bg' + (on ? ' on' : '') + '" data-bg="' + f.id + '" aria-pressed="' + on + '" title="' + f.name + '"' +
      (f.c ? ' style="background:' + f.c + '"' : '') + '>' + f.name + '</button>';
  }).join('');
  $('eGrid').innerHTML = GRID_LEVELS.concat([{ id: 'free', name: '自由配置' }]).map(function (g) {
    var on = S.prefs.grid === 'free' ? g.id === 'free' : g.id === gridLevel(S.prefs.grid).id;
    return '<button type="button" data-grid="' + g.id + '" class="' + (on ? 'on' : '') + '">' + g.name + '</button>';
  }).join('');
}
$('eGrid').addEventListener('click', function (e) {
  var b = e.target.closest('[data-grid]'); if (!b) return;
  S.prefs.grid = b.getAttribute('data-grid'); save(); renderEdit();
});
function chipHtml(entry, where, k, extra) {
  return '<span class="chip">' + iconSvg(entry.item, 34) + '<span>' + esc(plainName(ITEMS[entry.item].name)) + '</span>' + (extra || '') +
    '<button type="button" data-lab="' + where + ':' + k + '" aria-pressed="' + !!entry.label + '">名称</button>' +
    '<button type="button" data-rm="' + where + ':' + k + '" aria-label="削除">×</button></span>';
}
function renderChips() {
  $('eLists').hidden = !SCENE.desk;   // フック・しまう物は机だけの仕組み
  $('lHookL').innerHTML = cur.hooks.left.map(function (h, k) { return chipHtml(h, 'left', k); }).join('');
  $('lHookR').innerHTML = cur.hooks.right.map(function (h, k) { return chipHtml(h, 'right', k); }).join('');
  $('lAway').innerHTML = cur.away.map(function (a, k) {
    var pl = PLACES.filter(function (p) { return p.id === a.place; })[0];
    return chipHtml(a, 'away', k, '<span class="pl">（' + plainName(pl.name) + '）</span>');
  }).join('');
}
function listOf(where) { return where === 'away' ? cur.away : cur.hooks[where]; }
document.querySelector('.lists').addEventListener('click', function (e) {
  var lab = e.target.closest('[data-lab]'), rm = e.target.closest('[data-rm]');
  var ref = (lab || rm); if (!ref) return;
  var parts = (ref.getAttribute('data-lab') || ref.getAttribute('data-rm')).split(':'), list = listOf(parts[0]), k = +parts[1];
  if (lab) list[k].label = !list[k].label; else list.splice(k, 1);
  save(); renderEdit();
});

function renderPalette() {
  var deskMode = !!SCENE.desk;
  document.querySelector('.tabs').hidden = !deskMode;   // 机以外はタブなし：置ける物をそのまま並べる
  if (!deskMode) tab = 'top';
  document.querySelectorAll('.tabs [data-tab]').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === tab)); });
  var d = '';
  if (tab === 'hang') d = [['left', '左のフック'], ['right', '右のフック']].map(function (x) {
    return '<button type="button" data-dest="' + x[0] + '" class="' + (dest.hang === x[0] ? 'on' : '') + '">' + x[1] + 'へ</button>';
  }).join('');
  if (tab === 'away') d = PLACES.map(function (p) {
    return '<button type="button" data-dest="' + p.id + '" class="' + (dest.away === p.id ? 'on' : '') + '">' + plainName(p.name) + '</button>';
  }).join('');
  $('pDest').innerHTML = d;
  var kind = tab === 'hang' ? 'hang' : 'top';
  var ids = deskMode ? Object.keys(ITEMS).filter(function (id) { return (tab === 'away' || ITEMS[id].kind === kind) && !(ITEMS[id].scenes || []).length; })
                     : SCENE.items.slice();
  $('pItems').innerHTML = ids.map(function (id) {
    return '<button type="button" data-add="' + id + '">' + iconSvg(id, 54) + '<span>' + plainName(ITEMS[id].name) + '</span></button>';
  }).join('');
}
document.querySelector('.tabs').addEventListener('click', function (e) {
  var b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.getAttribute('data-tab'); renderPalette();
});
$('pDest').addEventListener('click', function (e) {
  var b = e.target.closest('[data-dest]'); if (!b) return;
  dest[tab] = b.getAttribute('data-dest'); renderPalette();
});
$('pItems').addEventListener('click', function (e) {
  var b = e.target.closest('[data-add]'); if (!b) return;
  var id = b.getAttribute('data-add');
  if (tab === 'top') {
    cur.top.push({ item: id, state: Object.keys(ITEMS[id].states)[0], x: DESK.w / 2, y: DESK.d / 2, r: 0, label: false });
    sel = cur.top.length - 1;
  } else if (tab === 'hang') cur.hooks[dest.hang].push({ item: id, label: false });
  else cur.away.push({ item: id, place: dest.away, label: false });
  save(); renderEdit();
});

$('eName').oninput = function () { cur.name = this.value.trim() || '無題'; save(); };
$('eYomi').oninput = function () { cur.yomi = this.value.trim(); save(); };
$('eFlip').onchange = function () { cur.flip = this.checked; save(); };
$('eBg').addEventListener('click', function (e) {
  var b = e.target.closest('[data-bg]'); if (!b) return;
  var id = b.getAttribute('data-bg'); if (id) cur.bg = id; else delete cur.bg; save(); renderEdit();
});
$('eText').onchange = function () { SPACE_TEXT = S.prefs.spaceText = this.checked; save(); renderEdit(); };
document.addEventListener('pointerdown', function (e) { var d = $('eDisp'); if (d.open && !e.target.closest('#eDisp')) d.open = false; });   // 外を押すと閉じる
$('eGridShow').onchange = function () { S.prefs.gridShow = this.checked; save(); renderEdit(); };
$('eOutline').onchange = function () { OUTLINE = S.prefs.outline = this.checked; save(); renderEdit(); };
$('eBack').onclick = renderHome;
$('eShow').onclick = function () { openShow(cur.id); };
$('eCopy').onclick = function () {
  var c = clone(cur); c.id = 'l' + Date.now().toString(36); c.name = cur.name + '（コピー）';
  S.layouts.splice(S.layouts.indexOf(cur) + 1, 0, c); save(); openEdit(c.id); toast('複製しました');
};
$('eDel').onclick = function () {
  if (!confirm('「' + cur.name + '」の配置を削除します。元に戻せません。よろしいですか？')) return;
  S.layouts.splice(S.layouts.indexOf(cur), 1);
  S.recent = S.recent.filter(function (x) { return x !== cur.id; });
  save(); renderHome(); toast('削除しました');
};
$('selState').addEventListener('click', function (e) {
  var b = e.target.closest('[data-st]'); if (!b) return;
  var p = cur.top[sel]; p.state = b.getAttribute('data-st'); if (p.state !== 'path') arrowEdit = false; else toPath(p); clampP(p); save(); renderEdit();
});
$('selSize').onclick = function () {
  var p = cur.top[sel], ks = Object.keys(ITEMS[p.item].sizes);
  p.size = ks[(ks.indexOf(sizeOf(p)) + 1) % ks.length]; save(); renderEdit();
};
$('selColors').addEventListener('click', function (e) {
  var b = e.target.closest('[data-col]'); if (!b) return;
  cur.top[sel].color = +b.getAttribute('data-col'); save(); renderEdit();
});
$('selText').addEventListener('input', function () {
  var p = cur.top[sel]; if (!p) return;
  p.text = this.value; save(); renderEdit();
});
function setScale(p, s) { s = Math.round(Math.min(SCALE_MAX, Math.max(SCALE_MIN, s)) * 100) / 100; if (s === 1) delete p.s; else p.s = s; clampP(p); save(); renderEdit(); }
$('selSmall').onclick = function () { var p = cur.top[sel]; setScale(p, scaleOf(p) / 1.25); };
$('selBig').onclick = function () { var p = cur.top[sel]; setScale(p, scaleOf(p) * 1.25); };
$('selReal').onclick = function () { setScale(cur.top[sel], 1); };
$('selRot').onclick = function () {
  var p = cur.top[sel];
  if (isPath(p)) p.pts = p.pts.map(function (v) { return [-v[1], v[0]]; });   // 折れ線の矢印は 交点を始点のまわりに90°回す
  else p.r = ((p.r || 0) + 90) % 360;
  clampP(p); save(); renderEdit();
};

/* ---- 矢印をのばす・曲げる ----
   「矢印をのばす」を押すと、先と元の となりの交点（上下左右と斜め）に＋の印が出る。押すと そこまで のびる（同じ向き）か曲がる。
   先・元の上の－を押すと 1目ちぢむ。交点の間隔は いま選んでいるグリッドの細かさ。 */
var arrowEdit = false;
function gridStep() { var g = gridLevel(S.prefs.grid); return { x: DESK.w / g.nx, y: DESK.d / g.ny }; }
function toPath(p) {   // まっすぐ等の矢印を、向きと長さを保って 交点を結ぶ折れ線にする
  if (isPath(p)) return;
  var len = 3000 * scaleOf(p), a = (p.r || 0) * Math.PI / 180, ux = Math.sin(a), uy = -Math.cos(a), g = gridLevel(S.prefs.grid);
  var s0 = snap(p.x - ux * len / 2, p.y - uy * len / 2, g), t0 = snap(p.x + ux * len / 2, p.y + uy * len / 2, g), st = gridStep();
  if (s0.x === t0.x && s0.y === t0.y) t0 = { x: s0.x + Math.round(ux) * st.x, y: s0.y + Math.round(uy) * st.y };
  p.x = s0.x; p.y = s0.y; p.r = 0; p.m = false; p.state = 'path'; p.pts = [[0, 0], [t0.x - s0.x, t0.y - s0.y]];
}
function near(a, b) { return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6; }
function arrowMarks(p) {
  var st = gridStep(), r = Math.min(st.x, st.y) * 0.28, s = '';
  [['tip', p.pts.length - 1, p.pts.length - 2], ['start', 0, 1]].forEach(function (e) {
    var E = p.pts[e[1]], N = p.pts[e[2]];
    [[st.x, 0], [-st.x, 0], [0, st.y], [0, -st.y], [st.x, st.y], [st.x, -st.y], [-st.x, st.y], [-st.x, -st.y]].forEach(function (d) {   // 上下左右と斜め
      var q = [E[0] + d[0], E[1] + d[1]]; if (near(q, N)) return;
      s += '<g class="amark" data-ext="' + e[0] + '" data-x="' + q[0] + '" data-y="' + q[1] + '"><circle cx="' + (p.x + q[0]) + '" cy="' + (p.y + q[1]) + '" r="' + r + '" style="stroke-width:' + r * 0.18 + '"/>' +
        '<path d="M' + (p.x + q[0] - r * 0.5) + ' ' + (p.y + q[1]) + 'h' + r + 'M' + (p.x + q[0]) + ' ' + (p.y + q[1] - r * 0.5) + 'v' + r + '" style="stroke-width:' + r * 0.22 + '"/></g>';
    });
    s += '<g class="amark shrink" data-ext="' + e[0] + '" data-shrink="1"><circle cx="' + (p.x + E[0]) + '" cy="' + (p.y + E[1]) + '" r="' + r * 0.8 + '" style="stroke-width:' + r * 0.18 + '"/>' +
      '<path d="M' + (p.x + E[0] - r * 0.4) + ' ' + (p.y + E[1]) + 'h' + r * 0.8 + '" style="stroke-width:' + r * 0.22 + '"/></g>';
  });
  return '<g class="amarks">' + s + '</g>';
}
function arrowExtend(p, end, q, shrink) {
  var P = p.pts, tip = end === 'tip', st = gridStep();
  if (!tip) P.reverse();   // 元のほうも 先と同じ手順で扱う
  var n = P.length, E = P[n - 1], B = P[n - 2];
  if (shrink) {
    var dx = E[0] - B[0], dy = E[1] - B[1], sx = Math.sign(Math.round(dx)) * st.x, sy = Math.sign(Math.round(dy)) * st.y;   // 1目＝向きごとの交点1つ分（斜めは縦横1目ずつ）
    if (Math.hypot(dx, dy) > Math.hypot(sx, sy) + 1e-6 && Math.abs(dx * sy - dy * sx) < 1e-3 * Math.hypot(dx, dy) * Math.hypot(sx, sy)) P[n - 1] = [E[0] - sx, E[1] - sy];
    else if (n > 2) P.pop();
    else { toast('これより短くできません'); if (!tip) P.reverse(); return; }
  } else {
    var same = Math.abs((E[0] - B[0]) * (q[1] - E[1]) - (E[1] - B[1]) * (q[0] - E[0])) < 1e-6 && ((q[0] - E[0]) * (E[0] - B[0]) + (q[1] - E[1]) * (E[1] - B[1])) > 0;
    if (same) P[n - 1] = q; else P.push(q);   // 同じ向きなら のばす、ちがう向きなら 曲がる
  }
  if (!tip) P.reverse();
  save(); renderEdit();
}
/* 児童の並び：横・縦の人数を1人ずつ増減（合わせて36人まで） */
$('selGrid').addEventListener('click', function (e) {
  var b = e.target.closest('[data-k]'); if (!b) return;
  var p = cur.top[sel], n = kidsN(p), k = b.getAttribute('data-k'), d = +b.getAttribute('data-d');
  var nx = n.nx + (k === 'x' ? d : 0), ny = n.ny + (k === 'y' ? d : 0);
  if (nx < 1 || ny < 1) return;
  if (nx * ny > 36) { toast('最大36人です'); return; }
  p.nx = nx; p.ny = ny; clampP(p); save(); renderEdit();
});
$('selPath').onclick = function () {
  var p = cur.top[sel]; if (!p || !hasCtl(p.item, 'path')) return;
  arrowEdit = !arrowEdit;
  if (arrowEdit) { toPath(p); save(); }
  renderEdit();
};
$('selLabel').onclick = function () { var p = cur.top[sel]; p.label = !p.label; save(); renderEdit(); };
$('selFront').onclick = function () { toFront(); save(); renderEdit(); };
$('selDel').onclick = function () { removeItems(selected()); save(); renderEdit(); };
/* まとめて選んだ物：そろえる・等間隔に並べる（物の外まわり itemBounds で測る。交点には合わせない） */
function alignSel(how) {
  var set = selected(); if (set.length < 2) return;
  var bs = set.map(function (i) { return { p: cur.top[i], b: itemBounds(cur.top[i]) }; });
  var mn = function (f) { return Math.min.apply(null, bs.map(f)); }, mx = function (f) { return Math.max.apply(null, bs.map(f)); };
  var L = mn(function (o) { return o.b.x0; }), R = mx(function (o) { return o.b.x1; }), T = mn(function (o) { return o.b.y0; }), B = mx(function (o) { return o.b.y1; });
  if (how === 'hdist' || how === 'vdist') {
    var h = how === 'hdist', key = h ? 'x' : 'y';
    bs.sort(function (a, b) { return a.p[key] - b.p[key]; });
    var a0 = bs[0].p[key], a1 = bs[bs.length - 1].p[key];
    bs.forEach(function (o, k) { o.p[key] = a0 + (a1 - a0) * k / (bs.length - 1); });
  } else bs.forEach(function (o) {
    var b = o.b, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    if (how === 'left') o.p.x += L - b.x0;
    if (how === 'right') o.p.x += R - b.x1;
    if (how === 'hcenter') o.p.x += (L + R) / 2 - cx;
    if (how === 'top') o.p.y += T - b.y0;
    if (how === 'bottom') o.p.y += B - b.y1;
    if (how === 'vcenter') o.p.y += (T + B) / 2 - cy;
  });
  save(); renderEdit();
}
$('multiBar').addEventListener('click', function (e) {
  var b = e.target.closest('[data-al]'); if (b) { alignSel(b.getAttribute('data-al')); return; }
  if (e.target.closest('#mDup')) { pasteN = 0; pasteItem(selected().map(function (i) { return clone(cur.top[i]); })); }
  if (e.target.closest('#mDel')) { removeItems(selected()); save(); renderEdit(); }
  if (e.target.closest('#mNone')) { selectOnly(-1); renderEdit(); }
});
function toFront() { var p = cur.top.splice(sel, 1)[0]; cur.top.push(p); sel = cur.top.length - 1; }

/* 物の中心をいちばん近いグリッドの交点に合わせる。交点は机の外にも「あらい」1目分広がる
   （本が半分だけ机に乗る配置）。それ以上はみ出すのは物の形まかせで許す（重ね置きなど実際の机でも起きる） */
function clampP(p) {
  if (S.prefs.grid === 'free') return;   // 自由配置：交点に合わせない（グリッドの線は「標準」の細かさで見せる）
  var q = snap(p.x, p.y, gridLevel(S.prefs.grid));
  p.x = q.x; p.y = q.y;
}

/* ドラッグ：動かしている間は transform だけを書き換え、離したら描き直す */
var drag = null;
function svgPoint(svg, e) {
  var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
