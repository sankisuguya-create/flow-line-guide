/* 配置図の画面 ③：指・マウスの操作（引きずる・囲む・拡大縮小・2本指） */
/* ---- 編集画面の拡大・縮小 ----
   ホイール（マウス・タッチパッド）：指している所を中心に拡大・縮小。2本指：つまんで拡大・縮小、そのまま動かすと移動。
   空いた所を引きずる：拡大しているとき、見る範囲を動かす（引きずらずに離せば、これまでどおり「選んだ物をそこへ移す」）。
   EZ.k：倍率（1＝全体）、EZ.cx/cy：見ている中心（図の座標）。描き直しても保つ。別の配置を開くと全体に戻す */
var EZ = { k: 1, cx: null, cy: null, base: null }, EZ_MAX = 12;
function applyZoom() {
  var b = EZ.base, svg = $('editSvg'); if (!b) return;
  if (EZ.k <= 1) { EZ.k = 1; EZ.cx = null; }
  var w = b.w / EZ.k, h = b.h / EZ.k;
  var cx = EZ.cx == null ? b.x + b.w / 2 : Math.min(b.x + b.w - w / 2, Math.max(b.x + w / 2, EZ.cx));
  var cy = EZ.cy == null ? b.y + b.h / 2 : Math.min(b.y + b.h - h / 2, Math.max(b.y + h / 2, EZ.cy));
  if (EZ.k > 1) { EZ.cx = cx; EZ.cy = cy; }
  svg.setAttribute('viewBox', (cx - w / 2) + ' ' + (cy - h / 2) + ' ' + w + ' ' + h);
  $('zReset').textContent = Math.round(EZ.k * 100) + '%';
  GRID_ZOOM = EZ.k;   // グリッドの線と丸を 画面上で同じ太さに保つ（描き直さずに太さだけ変える）
  var gg = svg.querySelector('.grid');
  if (gg) {
    var sw = +gg.getAttribute('data-sw') / EZ.k;
    Array.prototype.forEach.call(gg.children, function (el) { el.style.strokeWidth = sw; if (el.hasAttribute('data-r')) el.setAttribute('r', +el.getAttribute('data-r') / EZ.k); });
  }
  $('zReset').disabled = EZ.k === 1;
}
function zoomAt(q, f) {   // 図の点 q を画面上で動かさずに 倍率を f 倍
  var b = EZ.base, k = Math.min(EZ_MAX, Math.max(1, EZ.k * f)); if (!b) return;
  var cx = EZ.cx == null ? b.x + b.w / 2 : EZ.cx, cy = EZ.cy == null ? b.y + b.h / 2 : EZ.cy;
  EZ.cx = q.x - (q.x - cx) * EZ.k / k; EZ.cy = q.y - (q.y - cy) * EZ.k / k; EZ.k = k;
  applyZoom();
}
function viewCenter() { var v = $('editSvg').viewBox.baseVal; return { x: v.x + v.width / 2, y: v.y + v.height / 2 }; }
/* 「選択」がオン：ホイールで拡大縮小しない（ページはそのまま）。空いた所のドラッグは いつも囲んで選ぶ */
var selectMode = false;
$('eSelect').onclick = function () { selectMode = !selectMode; this.setAttribute('aria-pressed', String(selectMode)); $('editSvg').classList.toggle('selecting', selectMode); };
$('editSvg').addEventListener('wheel', function (e) {
  if (selectMode) return;
  e.preventDefault();
  zoomAt(svgPoint(this, e), Math.pow(1.2, -Math.sign(e.deltaY) * Math.min(3, Math.abs(e.deltaY) / 60 || 1)));
}, { passive: false });
$('zIn').onclick = function () { zoomAt(viewCenter(), 1.5); };
$('zOut').onclick = function () { zoomAt(viewCenter(), 1 / 1.5); };
$('zReset').onclick = function () { EZ.k = 1; applyZoom(); };
var touches = {}, pinch = null, pan = null;
function touchList() { return Object.keys(touches).map(function (k) { return touches[k]; }); }
$('editSvg').addEventListener('pointerdown', function (e) {
  if (e.isPrimary) touches = {};   // 1本目の指（マウス）で数え直す：取りこぼした指が残って「2本指」と見誤らないように
  touches[e.pointerId] = { x: e.clientX, y: e.clientY };
  var tl = touchList();
  if (tl.length === 2) {   // 2本目の指：物の移動・範囲の移動をやめて、つまむ操作へ
    if (drag) { drag = null; renderEdit(); }
    pan = null;
    pinch = { d: Math.hypot(tl[0].x - tl[1].x, tl[0].y - tl[1].y), m: { x: (tl[0].x + tl[1].x) / 2, y: (tl[0].y + tl[1].y) / 2 } };
    return;
  }
}, true);
function pinchMove() {
  var tl = touchList(); if (tl.length < 2 || !pinch) return;
  var d = Math.hypot(tl[0].x - tl[1].x, tl[0].y - tl[1].y), m = { x: (tl[0].x + tl[1].x) / 2, y: (tl[0].y + tl[1].y) / 2 };
  var svg = $('editSvg'), inv = svg.getScreenCTM().inverse(), P = function (s) { var pt = svg.createSVGPoint(); pt.x = s.x; pt.y = s.y; return pt.matrixTransform(inv); };
  var a = P(pinch.m), b2 = P(m);   // 2本指の真ん中が動いた分だけ見る範囲を動かす
  if (EZ.k > 1) { EZ.cx -= b2.x - a.x; EZ.cy -= b2.y - a.y; }
  zoomAt(P(m), d / pinch.d);
  pinch = { d: d, m: m };
}
function touchEnd(e) { delete touches[e.pointerId]; if (touchList().length < 2) pinch = null; }
$('editSvg').addEventListener('pointerdown', function (e) {
  if (pinch) return;
  var mk = e.target.closest('[data-ext]');
  if (mk) {
    e.stopPropagation();
    arrowExtend(cur.top[sel], mk.getAttribute('data-ext'), [+mk.getAttribute('data-x'), +mk.getAttribute('data-y')], mk.hasAttribute('data-shrink'));
    return;
  }
  var g = e.target.closest('.it');
  if (!g) {
    // 空いた所：引きずれば見る範囲を動かし（拡大しているとき）、引きずらずに離せば下の「タップ」の動き
    var inv = this.getScreenCTM().inverse();
    // 拡大していないとき（または Shift）：引きずると 囲んだ物をまとめて選ぶ。拡大しているとき：見る範囲を動かす
    pan = { sx: e.clientX, sy: e.clientY, inv: inv, cx: EZ.cx, cy: EZ.cy, moved: false, q: svgPoint(this, e), band: selectMode || e.shiftKey || EZ.k === 1, add: e.shiftKey || e.ctrlKey };
    this.setPointerCapture(e.pointerId);
    return;
  }
  var i = +g.getAttribute('data-i'), p = cur.top[i], pt = svgPoint(this, e);
  if (e.shiftKey || e.ctrlKey || e.metaKey) {   // Shift／Ctrl＋押す：まとめて選ぶ に足す・外す
    var set = selected(), at = set.indexOf(i);
    if (at >= 0) set.splice(at, 1); else set.push(i);
    msel = set.length > 1 ? set : []; sel = set.length ? set[set.length - 1] : -1;
    renderEdit(); return;
  }
  if (selected().indexOf(i) < 0) { selectOnly(i); renderEdit(); }
  else if (msel.length < 2 && sel !== i) { selectOnly(i); renderEdit(); }
  sel = i;
  var group = selected();
  drag = { p: p, dx: pt.x - p.x, dy: pt.y - p.y, moved: false,
           items: group.map(function (j) { var q = cur.top[j]; return { q: q, ox: q.x - p.x, oy: q.y - p.y, el: $('editSvg').querySelector('.it[data-i="' + j + '"]') }; }) };
  this.setPointerCapture(e.pointerId);
});
function drawBand(a, b) {
  var svg = $('editSvg'), r = svg.querySelector('.band');
  if (!r) { r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('class', 'band'); svg.appendChild(r); }
  r.setAttribute('x', Math.min(a.x, b.x)); r.setAttribute('y', Math.min(a.y, b.y));
  r.setAttribute('width', Math.abs(a.x - b.x)); r.setAttribute('height', Math.abs(a.y - b.y));
}
function bandSelect(a, b, add) {   // 囲みに少しでもかかった物を選ぶ
  var x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  var hit = [];
  cur.top.forEach(function (p, i) { if (p.item === 'dim' && !DIM_SHOW) return; var bb = itemBounds(p); if (bb.x1 >= x0 && bb.x0 <= x1 && bb.y1 >= y0 && bb.y0 <= y1) hit.push(i); });
  if (add) selected().forEach(function (i) { if (hit.indexOf(i) < 0) hit.push(i); });
  msel = hit.length > 1 ? hit : [];
  // 基準（揃えるときに動かさない物）は 引きずり始めた所にいちばん近い物
  var dist = function (i) { var b = itemBounds(cur.top[i]); return Math.hypot((b.x0 + b.x1) / 2 - a.x, (b.y0 + b.y1) / 2 - a.y); };
  sel = hit.length ? hit.reduce(function (m, i) { return dist(i) < dist(m) ? i : m; }, hit[0]) : -1;
  renderEdit();
}
function emptyTap(q) {
  // 物を選んでいるときに机の上の空いた所を押すと、そこへ移す（指で引きずらなくてよい）
  if (msel.length > 1) { selectOnly(-1); renderEdit(); return; }
  var gm = SCENE.desk ? gridMargin() : { x: 0, y: 0 };   // 机は「半分はみ出す」置き方があるので 1目分の外まで
  if (sel >= 0 && q.x >= -gm.x && q.x <= DESK.w + gm.x && q.y >= -gm.y && q.y <= DESK.d + gm.y) {   // 場所の中：選んだ物をそこへ。場所の外：選択を解除
    var sp = cur.top[sel]; sp.x = q.x; sp.y = q.y; clampP(sp); save(); renderEdit();
  } else if (sel >= 0) { selectOnly(-1); renderEdit(); }
}
$('editSvg').addEventListener('pointermove', function (e) {
  if (touches[e.pointerId]) touches[e.pointerId] = { x: e.clientX, y: e.clientY };
  if (pinch) { pinchMove(); return; }
  if (pan) {
    if (Math.hypot(e.clientX - pan.sx, e.clientY - pan.sy) > 6) pan.moved = true;
    if (pan.moved && pan.band) { drawBand(pan.q, svgPoint(this, e)); return; }
    if (pan.moved && EZ.k > 1) {
      var m = pan.inv, dx = (e.clientX - pan.sx) * m.a + (e.clientY - pan.sy) * m.c, dy = (e.clientX - pan.sx) * m.b + (e.clientY - pan.sy) * m.d;
      EZ.cx = pan.cx - dx; EZ.cy = pan.cy - dy; applyZoom();
    }
    return;
  }
  if (!drag) return;
  var pt = svgPoint(this, e), p = drag.p;
  var nx = p.x, ny = p.y;
  p.x = pt.x - drag.dx; p.y = pt.y - drag.dy; clampP(p);   // つかんだ物を交点に合わせ、ほかの物は 同じだけ動かす（並びを保つ）
  if (p.x !== nx || p.y !== ny) drag.moved = true;
  drag.items.forEach(function (o) { o.q.x = p.x + o.ox; o.q.y = p.y + o.oy; if (o.el) o.el.setAttribute('transform', itemTransform(o.q)); });
});
function endDrag() {
  if (!drag) { if (Store.flush) Store.flush(); return; }
  var moved = drag.moved; drag = null;
  if (moved) { save(); renderEdit(); }
  if (Store.flush) Store.flush();   // 引きずっている間に届いた ほかの人の変更を取り込む
}
$('editSvg').addEventListener('pointerup', function (e) {
  touchEnd(e);
  if (pan) {
    var p0 = pan; pan = null;
    if (!p0.moved) { emptyTap(p0.q); return; }
    if (p0.band) bandSelect(p0.q, svgPoint(this, e), p0.add);
    if (Store.flush) Store.flush();
    return;
  }
  endDrag();
});
document.addEventListener('keydown', function (e) {   // 矢印キーでグリッド1目ずつ動かす
  if ($('vEdit').hidden || sel < 0 || e.target.closest('input')) return;
  var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!d) return;
  e.preventDefault();
  var g = gridLevel(S.prefs.grid);
  selected().forEach(function (i) { var p = cur.top[i]; p.x += d[0] * DESK.w / g.nx; p.y += d[1] * DESK.d / g.ny; if (msel.length < 2) clampP(p); });
  save(); renderEdit();
});
$('editSvg').addEventListener('pointercancel', function (e) { touchEnd(e); pan = null; endDrag(); });

/* 編集画面で 図・選んだ物の帯・パレット・上の帯 以外（何もない所）を押したら 選択を解除 */
document.addEventListener('pointerdown', function (e) {
  if ($('vEdit').hidden || (sel < 0 && msel.length < 2)) return;
  if (e.target.closest('#editSvg, .selbar, .palette, .ebar, .lists, dialog, .zoombar, #toast')) return;
  selectOnly(-1); arrowEdit = false; renderEdit();
}, true);   // 先に（捕まえる段で）調べる：図の中の物を押すと 描き直しで押した要素が外れ、あとからでは どこを押したか分からない
