/* 配置図の画面 ③：つくる・なおす（選んだ物の操作・まとめて選ぶ・矢印をのばす） */
/* ---- ③ つくる・なおす ---- */
function openEdit(id) {
  cur = byId(id); if (!cur) return renderHome();
  useLayout(cur);
  sel = -1; msel = []; EZ.k = 1; EZ.cx = null;
  hist = { undo: [], redo: [], last: JSON.stringify(cur) };
  histButtons();
  setPalette(S.prefs.palette !== false);
  $('eOutline').checked = OUTLINE; $('eGridShow').checked = S.prefs.gridShow !== false;
  $('eTextBox').hidden = !SCENE.space; $('eText').checked = SPACE_TEXT;
  $('eName').value = cur.name; $('eYomi').value = cur.yomi; $('eFlip').checked = cur.flip;
  go('vEdit'); renderEdit(); renderPalette();
}
function renderEdit() {
  var t = topView(cur, { ruby: false, sel: msel.length > 1 ? msel : sel, ref: msel.length > 1 ? sel : -1, grid: S.prefs.gridShow === false ? null : gridLevel(S.prefs.grid) });   // 線を消しても交点への吸着は続く
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
  if (multi) {
    $('mCount').textContent = msel.length + '個';
    $('mRef').textContent = '基準：' + plainName(ITEMS[cur.top[sel].item].name);   // 揃えるときに動かさない物（最後に選んだ物・橙の枠）
    var ss = msel.map(function (i) { return scaleOf(cur.top[i]); });
    $('mReal').textContent = ss.every(function (v) { return v === ss[0]; }) ? Math.round(ss[0] * 100) + '%' : '混在';
  }
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
    $('selLnameBox').hidden = !p.label;
    if (document.activeElement !== $('selLname')) { $('selLname').value = p.lname || ''; $('selLname').placeholder = plainName(it.name); }
    $('selReal').textContent = Math.round(scaleOf(p) * 100) + '%'; $('selReal').title = '実寸（100%）に戻す';
    $('selTextBox').hidden = !it.text;
    if (it.text && document.activeElement !== $('selText')) $('selText').value = p.text || '';
    var isDim = p.item === 'dim';   // 寸法：自動（長さ）か手動（入れた文字）。入れると手動、自動を押すと消す
    $('selTextCap').textContent = isDim ? '表示' : '文字';
    $('selText').placeholder = isDim ? dimAuto(p) : '例：待機場所';
    $('dimMode').hidden = !isDim;
    if (isDim) $('dimMode').querySelectorAll('[data-dim]').forEach(function (b) { b.classList.toggle('on', (b.getAttribute('data-dim') === 'man') === !!p.text); });
    $('selSize').hidden = !it.sizes;
    if (it.sizes) $('selSize').textContent = Object.keys(it.sizes).map(function (k) { return (k === sizeOf(p) ? '●' : '○') + it.sizes[k].name; }).join(' ');
    $('selLen').hidden = !hasCtl(p.item, 'len');
    if (hasCtl(p.item, 'len')) { var lw = itemSize(p), lv = (it.stretch.axis === 'w' ? lw[0] : lw[1]) / scaleOf(p); $('lenV').textContent = (lv / 1000).toFixed(lv % 1000 ? 1 : 0) + 'm' + (p.item.indexOf('row') === 0 ? '（' + Math.max(1, Math.round(lv / 500)) + '人）' : ''); }
    $('selGrid').hidden = !hasCtl(p.item, 'grid');
    if (hasCtl(p.item, 'grid')) {
      $('kNum').setAttribute('aria-pressed', String(!!p.num)); $('kNumOpt').hidden = !p.num;
      $('kN0').textContent = p.n0 || 1; $('kOrd').textContent = p.nord === 'v' ? '縦順' : '横順';
    }
    if (hasCtl(p.item, 'grid')) { var kn = kidsN(p); $('kNx').textContent = kn.nx; $('kNy').textContent = kn.ny; $('kSum').textContent = '（' + kn.nx * kn.ny + '人）'; }
    $('selPath').hidden = !hasCtl(p.item, 'path'); $('selPath').setAttribute('aria-pressed', String(arrowEdit && hasCtl(p.item, 'path')));
    $('selColors').hidden = !it.colors;
    if (it.colors) $('selColors').innerHTML = '色' + it.colors.map(function (c, k) {
      return '<button type="button" class="sw' + (!p.hex && k === colorIndex(p) ? ' on' : '') + '" data-col="' + k + '" style="background:' + c + '" aria-label="色' + (k + 1) + '"></button>';
    }).join('') + '<label class="sw free' + (p.hex ? ' on' : '') + '" title="ほかの色を選ぶ" style="background:' + (p.hex || 'conic-gradient(#E5484D,#F2C94C,#46B97A,#2F80ED,#A670CA,#E5484D)') + '"><input type="color" id="selHex" value="' + (p.hex || colorOf(p)) + '"></label>';
  }
  renderChips();
  $('eBgBox').hidden = !!SCENE.desk; $('eTurn').hidden = !!SCENE.desk;   // 床の色は場所だけ（机の天板は木の色のまま）
  $('eBg').innerHTML = FLOOR_COLORS.map(function (f) {
    var on = (cur.bg || '') === f.id;
    return '<button type="button" class="sw bg' + (on ? ' on' : '') + '" data-bg="' + f.id + '" aria-pressed="' + on + '" title="' + f.name + '"' +
      (f.c ? ' style="background:' + f.c + '"' : '') + '>' + f.name + '</button>';
  }).join('');
  var gid = S.prefs.grid === 'free' ? 'free' : gridLevel(S.prefs.grid).id;
  $('eGridIc').innerHTML = gridIcon(gid); $('eGridIc').setAttribute('title', gridName(gid));
  $('eGrid').innerHTML = GRID_LEVELS.concat([{ id: 'free', name: '自由配置' }]).map(function (g) {
    return '<button type="button" class="gbtn' + (g.id === gid ? ' on' : '') + '" data-grid="' + g.id + '" title="' + g.name + '" aria-label="' + g.name + '">' + gridIcon(g.id) + '</button>';
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

/* グリッドの細かさを 文字ではなく 目の数で示すアイコン（粗い2×2・標準3×3・細かい4×4・極細6×6、自由配置は十字の矢印） */
function gridName(id) { var g = GRID_LEVELS.filter(function (x) { return x.id === id; })[0]; return id === 'free' ? '自由配置' : g ? g.name : ''; }
function gridIcon(id) {
  var s = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">';
  if (id === 'free') return s + '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>';
  var n = { coarse: 2, normal: 3, fine: 4, xfine: 6 }[id] || 3, d = '';
  for (var i = 1; i < n; i++) { var v = 3 + 18 * i / n; d += 'M' + v + ' 3v18M3 ' + v + 'h18'; }
  return s + '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="' + d + '" stroke-width="' + (n > 4 ? 1.2 : 1.6) + '"/></svg>';
}
var PALETTE_GROUPS = [['thing', '用具・設備'], ['mark', '矢印・目印'], ['people', '人']];
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
  /* パレットのチップ：横長の物（ライン・平均台など）は 絵を上・名前を下。それ以外は 絵を左に できるだけ大きく、名前を右に */
  var tile = function (id) {
    var it = ITEMS[id], wd = it.kind === 'hang' ? [1, 1] : itemSize({ item: id, state: Object.keys(it.states)[0] });
    var wide = wd[0] / wd[1] >= 2.2;
    return '<button type="button" class="' + (wide ? 'wide' : 'side') + '" data-add="' + id + '">' + iconSvg(id, wide ? 54 : 60) + '<span>' + plainName(it.name) + '</span></button>';
  };
  if (deskMode) { $('pItems').innerHTML = ids.map(tile).join(''); return; }
  // 場所：用具・設備／矢印・目印／人 に分けて並べる
  $('pItems').innerHTML = PALETTE_GROUPS.map(function (g) {
    var list = ids.filter(function (id) { return (ITEMS[id].group || 'thing') === g[0]; });
    if (!list.length) return '';
    var shut = (S.prefs.palShut || []).indexOf(g[0]) >= 0;   // 畳んだ分類（端末に保存）
    return '<details class="pgrp" data-g="' + g[0] + '"' + (shut ? '' : ' open') + '><summary class="pgroup">' + g[1] + '<small>' + list.length + '</small></summary><div class="tiles in">' + list.map(tile).join('') + '</div></details>';
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
document.addEventListener('pointerdown', function (e) {   // ▾ の板は 外を押すと閉じる
  ['eDisp', 'eGridMenu', 'eMore', 'mAlign'].forEach(function (id) { var d = $(id); if (d.open && !e.target.closest('#' + id)) d.open = false; });
});
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
$('dimMode').addEventListener('click', function (e) {
  var b = e.target.closest('[data-dim]'), p = cur.top[sel]; if (!b || !p) return;
  if (b.getAttribute('data-dim') === 'auto') delete p.text; else if (!p.text) p.text = dimAuto(p);
  save(); renderEdit();
  if (b.getAttribute('data-dim') === 'man') { $('selText').focus(); $('selText').select(); }
});
$('selLname').addEventListener('input', function () {   // 名称を直す。空にすると物の名前に戻る
  var p = cur.top[sel]; if (!p) return;
  var v = this.value.trim(); if (v) p.lname = v; else delete p.lname; save(); renderEdit();
});
$('selText').addEventListener('input', function () {
  var p = cur.top[sel]; if (!p) return;
  p.text = this.value; save(); renderEdit();
});
function setScale(p, s) { s = Math.round(Math.min(SCALE_MAX, Math.max(SCALE_MIN, s)) * 100) / 100; if (s === 1) delete p.s; else p.s = s; clampP(p); save(); renderEdit(); }
$('selSmall').onclick = function () { var p = cur.top[sel]; setScale(p, scaleOf(p) / 1.25); };
$('selBig').onclick = function () { var p = cur.top[sel]; setScale(p, scaleOf(p) * 1.25); };
$('selReal').onclick = function () { setScale(cur.top[sel], 1); };
/* 場所ごと90°回す（時計回り）：床を回し、置いた物は 位置と向きを いっしょに回す。
   回した後の床の奥行きを D とすると (x, y) → (D − y, x)。交点の上の物は 交点の上のまま */
function turnLayout() {
  if (SCENE.desk) return;
  var D = DESK.d;
  cur.top.forEach(function (p) {
    var x = p.x; p.x = D - p.y; p.y = x;
    if (isPath(p)) p.pts = p.pts.map(function (v) { return [-v[1], v[0]]; });
    else if (ITEMS[p.item].upright) { if (hasCtl(p.item, 'grid')) { var n = kidsN(p); p.nx = n.ny; p.ny = n.nx; } }   // 人は頭を上のまま、並びだけ回す
    else p.r = ((p.r || 0) + 90) % 360;
  });
  cur.rot = ((cur.rot || 0) + 90) % 360; if (!cur.rot) delete cur.rot;
  useLayout(cur); EZ.k = 1; EZ.cx = null;
  save(); renderEdit();
}
$('eTurn').onclick = turnLayout;
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
  var q = cur.top[sel];
  if (e.target.closest('#kNum')) { q.num = !q.num; save(); renderEdit(); return; }   // 出席番号を出す・消す
  if (e.target.closest('#kOrd')) { q.nord = q.nord === 'v' ? undefined : 'v'; save(); renderEdit(); return; }   // 横順 ⇄ 縦順
  var n0 = e.target.closest('[data-n0]');
  if (n0) { q.n0 = Math.max(1, Math.min(99, (q.n0 || 1) + (+n0.getAttribute('data-n0')))); save(); renderEdit(); return; }   // はじめの番号
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
$('selStack').addEventListener('click', function (e) {
  var b = e.target.closest('[data-z]'); if (!b) return;
  restack(b.getAttribute('data-z')); save(); renderEdit();
});
$('selLen').addEventListener('click', function (e) {   // 長さ：1目ずつ（列は50cm＝1人分）
  var b = e.target.closest('[data-len]'); if (!b) return;
  var p = cur.top[sel], it = ITEMS[p.item], st = it.stretch, now = it.stretch.axis === 'w' ? itemSize(p)[0] / scaleOf(p) : itemSize(p)[1] / scaleOf(p);
  p.len = Math.min(st.max, Math.max(st.min, Math.round(now / st.step) * st.step + (+b.getAttribute('data-len')) * st.step));
  save(); renderEdit();
});
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
/* 基準に揃える：基準の物の 中心の x（縦一列）か y（横一列）に ほかの物の中心を合わせる。等間隔：基準は動かさず、
   両はしの物の間に 中心を等しい間隔で並べる（並びの順は いまの位置の順） */
function alignToRef(axis) {
  var set = selected(), ref = cur.top[sel]; if (set.length < 2 || !ref) return;
  var rb = itemBounds(ref), c = axis === 'x' ? (rb.x0 + rb.x1) / 2 : (rb.y0 + rb.y1) / 2;
  set.forEach(function (i) {
    var p = cur.top[i], b = itemBounds(p);
    if (axis === 'x') p.x += c - (b.x0 + b.x1) / 2; else p.y += c - (b.y0 + b.y1) / 2;
  });
  save(); renderEdit();
}
function scaleSel(f) {   // まとめて拡大・縮小（f：倍率。0 なら実寸に戻す）。物ごとの中心は動かさない
  selected().forEach(function (i) {
    var p = cur.top[i], s = f ? scaleOf(p) * f : 1;
    s = Math.round(Math.min(SCALE_MAX, Math.max(SCALE_MIN, s)) * 100) / 100;
    if (s === 1) delete p.s; else p.s = s;
  });
  save(); renderEdit();
}
$('multiBar').addEventListener('click', function (e) {
  if (e.target.closest('#mRefNext')) {   // 基準を 選んだ物の中で次へ
    var k = msel.indexOf(sel); sel = msel[(k + 1) % msel.length]; renderEdit(); return;
  }
  var ax = e.target.closest('[data-ref]'); if (ax) { alignToRef(ax.getAttribute('data-ref')); $('mAlign').open = false; return; }
  if (e.target.closest('#mSmall')) { scaleSel(1 / 1.25); return; }
  if (e.target.closest('#mBig')) { scaleSel(1.25); return; }
  if (e.target.closest('#mReal')) { scaleSel(0); return; }
  var b = e.target.closest('[data-al]'); if (b) { alignSel(b.getAttribute('data-al')); $('mAlign').open = false; return; }
  if (e.target.closest('#mDup')) { pasteN = 0; pasteItem(selected().map(function (i) { return clone(cur.top[i]); })); }
  if (e.target.closest('#mDel')) { removeItems(selected()); save(); renderEdit(); }
  if (e.target.closest('#mNone')) { selectOnly(-1); renderEdit(); }
});
/* 重なりの順：いま描いている順（drawOrder）を z に書き、選んだ物を1つ前・1つ後ろ・いちばん前・いちばん後ろへ */
function restack(how) {
  var order = drawOrder(cur.top), at = order.indexOf(sel);
  if (at < 0) return;
  order.splice(at, 1);
  var to = how === 'front' ? order.length : how === 'back' ? 0 : how === 'up' ? Math.min(order.length, at + 1) : Math.max(0, at - 1);
  order.splice(to, 0, sel);
  order.forEach(function (i, k) { cur.top[i].z = k; });
}
function toFront() { restack('front'); }

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

/* パレットの分類を畳む・開く（端末に保存） */
$('pItems').addEventListener('toggle', function (e) {
  var d = e.target; if (!d.matches || !d.matches('details.pgrp')) return;
  var g = d.getAttribute('data-g'), s = (S.prefs.palShut || []).filter(function (x) { return x !== g; });
  if (!d.open) s.push(g);
  S.prefs.palShut = s; save();
}, true);
/* 「設置」：右のパレット（置く物）を出す・しまう。しまうと 図を広く使える（端末に保存） */
function setPalette(on) {
  S.prefs.palette = on;
  $('eAdd').setAttribute('aria-pressed', String(on));
  document.querySelector('.ebody').classList.toggle('nopal', !on);
}
$('eAdd').onclick = function () { setPalette(!(S.prefs.palette !== false)); save(); renderEdit(); };

/* 色の見本にない色：ブラウザの色の選び方で選ぶ（p.hex）。見本を押すと見本の色に戻る */
$('selColors').addEventListener('change', function (e) {   // 選び終えたとき（選んでいる途中で描き直すと 色の選び方が閉じるため）
  if (e.target.id !== 'selHex') return;
  var p = cur.top[sel]; p.hex = e.target.value; save(); renderEdit();
});
$('selColors').addEventListener('click', function (e) { var b = e.target.closest('[data-col]'); if (b && cur.top[sel]) delete cur.top[sel].hex; }, true);
