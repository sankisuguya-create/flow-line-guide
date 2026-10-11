/* 配置図の画面 ②：見せる（大きく映す・印刷） */
/* ---- ② 見せる ---- */
function openShow(id) {
  cur = byId(id); if (!cur) return renderHome();
  useLayout(cur);
  flip = false;
  $('bigMsg').innerHTML = SCENE.msg;
  var deskMode = !!SCENE.desk;   // 机だけの機能：4人・いす・横から見た図・しまう物
  $('sGroup').hidden = !deskMode; $('sSides').hidden = !deskMode; $('sChair').hidden = !deskMode;
  S.recent = [id].concat(S.recent.filter(function (x) { return x !== id; })).slice(0, 30); save();
  go('vShow'); renderShow();
}
function renderShow() { RUBY = true; try { renderShowIn(); } finally { RUBY = false; } }   // 児童が見る画面だけ ふりがな
function renderShowIn() {
  var deskMode = !!SCENE.desk;
  var o = { ruby: S.prefs.ruby, chair: deskMode && S.prefs.chair, flip: flip && cur.flip };
  o.topOnly = S.prefs.topOnly || big;
  var c = deskMode && S.prefs.group ? composeGroup(cur, o) : composeSingle(cur, o);
  var svg = $('stageSvg');
  svg.setAttribute('viewBox', c.viewBox); svg.innerHTML = c.svg;
  svg.setAttribute('aria-label', cur.name + 'の配置図');
  $('sTitle').innerHTML = rubyHtml(cur.name, cur.yomi);
  $('sOne').classList.toggle('on', !S.prefs.group); $('sFour').classList.toggle('on', S.prefs.group);
  $('sFlip').disabled = !cur.flip; $('sFlip').setAttribute('aria-pressed', String(flip && cur.flip));
  $('sFlip').title = cur.flip ? '' : 'この活動は左右反転しない設定です';
  $('sChair').setAttribute('aria-pressed', String(S.prefs.chair));
  $('sSides').setAttribute('aria-pressed', String(!S.prefs.topOnly));
  $('sSides').disabled = S.prefs.group;
  $('sRuby').setAttribute('aria-pressed', String(S.prefs.ruby));
  $('sOutline').setAttribute('aria-pressed', String(OUTLINE));
  $('sText').hidden = !SCENE.space; $('sText').setAttribute('aria-pressed', String(SPACE_TEXT));
  renderAway();
}
function renderAway() { $('away').innerHTML = awayHtml(cur); }
function awayHtml(l) {
  var html = '';
  PLACES.forEach(function (pl) {
    var list = l.away.filter(function (a) { return a.place === pl.id; });
    if (!list.length) return;
    html += '<section><h3>' + itemNameHtml(pl.name) + '</h3><div class="icons">' + list.map(function (a) {
      return '<figure>' + iconSvg(a.item, 80) + (a.label ? '<figcaption>' + itemNameHtml(ITEMS[a.item].name) + '</figcaption>' : '') + '</figure>';
    }).join('') + '</div></section>';
  });
  return html;
}
$('sBack').onclick = function () { if (big) setBig(false); renderHome(); };
$('sOne').onclick = function () { S.prefs.group = false; save(); renderShow(); };
$('sFour').onclick = function () { S.prefs.group = true; save(); renderShow(); };
$('sFlip').onclick = function () { flip = !flip; renderShow(); };
$('sSides').onclick = function () { S.prefs.topOnly = !S.prefs.topOnly; save(); renderShow(); };
$('sChair').onclick = function () { S.prefs.chair = !S.prefs.chair; save(); renderShow(); };
$('sRuby').onclick = function () { S.prefs.ruby = !S.prefs.ruby; save(); renderShow(); };
$('sText').onclick = function () { SPACE_TEXT = S.prefs.spaceText = !SPACE_TEXT; save(); renderShow(); };
$('sOutline').onclick = function () { OUTLINE = S.prefs.outline = !OUTLINE; save(); renderShow(); };
/* 大きく映す：操作ボタンと「しまう物」を隠し、上に「机の上をこの形にしてね」、残りを真上からの図に使う */
function setBig(on) {
  big = on;
  $('vShow').classList.toggle('big', on);
  $('bigMsg').hidden = !on; $('bigExit').hidden = !on;
  if (on && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
  if (!on && document.fullscreenElement) document.exitFullscreen().catch(function () {});
  renderShow();
}
$('sBig').onclick = function () { setBig(true); };
$('sEdit').onclick = function () { openEdit(cur.id); };   // 映している配置をそのまま直す（標準の配置も、新しく作った配置も）

/* ---- 印刷：1つの配置＝A4 1枚 ----
   見せる画面の「印刷」はいま映している形（左右反転・4人・いす・横から見た図）のまま。
   まとめて印刷は、各配置を反転なしで、見せる画面の設定（4人・いす・横から見た図・ふりがな）で刷る */
var DATE_BLANK = '　　月　　日（　　）';
function printPage(l, o) { return inLayout(l, function () { return printPageIn(l, o); }); }
function printPageIn(l, o) {
  var deskMode = !!SCENE.desk;
  var c = deskMode && S.prefs.group ? composeGroup(l, o) : composeSingle(l, o);
  var vb = c.viewBox.split(' ').map(Number);
  var aw = deskMode ? awayHtml(l) : '';
  // 紙の向き：図が大きく刷れるほう。使える広さ（mm）は余白・見出し・しまう物の列を引いたもの（style.css の印刷の節）
  var side = aw ? 42 : 0, fit = function (W, H) { return Math.min((W - side) / vb[2], H / vb[3]); };
  var land = fit(277, 174) > fit(190, 261);
  return '<section class="pg ' + (land ? 'land' : 'port') + '"><header class="ph"><h1>' + rubyHtml(l.name, l.yomi) + '</h1>' +
    '<span class="date">' + DATE_BLANK + '</span></header><div class="pb">' +
    '<svg viewBox="' + c.viewBox + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(l.name) + 'の配置図">' + c.svg + '</svg>' +
    (aw ? '<aside class="away">' + aw + '</aside>' : '') + '</div></section>';
}
function printOpts(l, fl) {
  var deskMode = !!SCENES[scOf(l)].desk;
  return { ruby: false, chair: deskMode && S.prefs.chair, flip: !!(fl && l.flip), topOnly: S.prefs.topOnly };   // 印刷は先生向け：ふりがなは付けない
}
function doPrint(pages) {
  $('printArea').innerHTML = pages.join('');
  window.print();   // 印刷ダイアログを閉じるまで止まる（Chrome）。閉じたら中身を消す
  $('printArea').innerHTML = '';
}
// ブラウザの印刷（Ctrl+P）でも、見せる画面ならいま映している1枚を刷る。ほかの画面では何も刷らない
window.addEventListener('beforeprint', function () {
  if ($('printArea').innerHTML || $('vShow').hidden) return;
  $('printArea').innerHTML = printPage(cur, printOpts(cur, flip)); autoPrint = true;
});
var autoPrint = false;
window.addEventListener('afterprint', function () { if (autoPrint) { $('printArea').innerHTML = ''; autoPrint = false; } });
$('sPrint').onclick = function () { doPrint([printPage(cur, printOpts(cur, flip))]); };
$('hPrint').onclick = function () {
  var list = orderedLayouts().filter(function (l) { return scOf(l) === scene; });
  if (!list.length) { toast('この場所の配置はまだありません'); return; }
  $('pList').innerHTML = list.map(function (l) {
    return '<label><input type="checkbox" value="' + esc(l.id) + '" checked>' + esc(l.name) + '</label>';
  }).join('');
  $('pDlg').showModal();
};
function pChecks() { return Array.prototype.slice.call($('pList').querySelectorAll('input')); }
$('pAll').onclick = function () { pChecks().forEach(function (c) { c.checked = true; }); };
$('pNone').onclick = function () { pChecks().forEach(function (c) { c.checked = false; }); };
$('pCancel').onclick = function () { $('pDlg').close(); };
$('pGo').onclick = function () {
  var ids = pChecks().filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
  if (!ids.length) { toast('印刷する配置を選んでください'); return; }
  $('pDlg').close();
  doPrint(ids.map(function (id) { var l = byId(id); return printPage(l, printOpts(l, false)); }));
};
$('bigExit').onclick = function () { setBig(false); };
document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && big) setBig(false); });
document.addEventListener('keydown', function (e) { if (big && e.key === 'Escape') setBig(false); });
document.addEventListener('keydown', function (e) {   // ← → で活動を切り替える
  if ($('vShow').hidden || e.target.closest('input')) return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  var list = orderedLayouts().filter(function (l) { return scOf(l) === scOf(cur); }), i = list.indexOf(cur);   // 同じ場所の配置の中で回る
  var n = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
  if (n && n !== cur) { cur = n; flip = false; renderShow(); }   // 並び（最近使った順）は変えない
});
