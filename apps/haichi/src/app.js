/* ===== 画面と保存 ===== */
var KEY = 'haichi.v1';   // homeroom-tools の机の配置図（desk-layout.v1）とは別の保存。移すときは書き出し→読み込み
var $ = function (id) { return document.getElementById(id); };

/* ---- 保存：この端末のブラウザだけ。読めない環境では標準の配置で動く ---- */
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function freshState() {
  return { layouts: clone(DEFAULT_LAYOUTS), recent: [], prefs: { group: false, chair: false, ruby: true, grid: 'normal', topOnly: false, scene: 'desk', outline: false, spaceText: true } };
}
function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var s = JSON.parse(raw);
      if (s && Array.isArray(s.layouts)) return sanitize(s);
    }
  } catch (e) { /* 読めなければ標準へ */ }
  return freshState();
}
/* 知らない用具・壊れた値を落とす（読み込んだファイルにも使う）
   場所（scene）がなければ机扱い。置ける物は場所ごとの品ぞろえ（scenes がある物はその場所だけ）で絞る */
function sanitize(s) {
  var base = freshState();
  var layouts = (s.layouts || []).filter(function (l) { return l && l.id && Array.isArray(l.top); }).map(function (l) {
    var sc = SCENES[l.scene] ? l.scene : 'desk';
    var ok = function (id) {
      var it = ITEMS[id];
      return it && it.kind === 'top' && (SCENES[sc].items ? (it.scenes || []).indexOf(sc) >= 0 : !(it.scenes || []).length);
    };
    return {
      id: String(l.id), name: String(l.name || '無題'), yomi: String(l.yomi || ''), flip: l.flip !== false, scene: sc,
      bg: sc !== 'desk' && floorColor(l.bg) ? l.bg : undefined,
      top: l.top.filter(function (p) { return ok(p.item); }).map(function (p) {
        return { item: p.item, state: ITEMS[p.item].states[p.state] ? p.state : Object.keys(ITEMS[p.item].states)[0], x: +p.x || SCENES[sc].w / 2, y: +p.y || SCENES[sc].d / 2, r: +p.r || 0, label: !!p.label,
                 size: ITEMS[p.item].sizes && ITEMS[p.item].sizes[p.size] ? p.size : undefined, color: ITEMS[p.item].colors && p.color != null ? (p.color | 0) : undefined,
                 text: ITEMS[p.item].text && p.text ? String(p.text).slice(0, 16) : undefined,
                 nx: ITEMS[p.item].grid ? kidsN(p).nx : undefined, ny: ITEMS[p.item].grid ? kidsN(p).ny : undefined,
                 pts: p.item === 'arrow' && Array.isArray(p.pts) ? p.pts.filter(function (q) { return Array.isArray(q) && isFinite(q[0]) && isFinite(q[1]); }).map(function (q) { return [+q[0], +q[1]]; }) : undefined, s: scaleOf(p) !== 1 ? scaleOf(p) : undefined };
      }),
      hooks: sc === 'desk' ? {
        left: ((l.hooks || {}).left || []).filter(isHang).map(function (h) { return { item: h.item, label: !!h.label }; }),
        right: ((l.hooks || {}).right || []).filter(isHang).map(function (h) { return { item: h.item, label: !!h.label }; })
      } : { left: [], right: [] },
      away: sc === 'desk' ? (l.away || []).filter(function (a) { return ITEMS[a.item] && PLACES.some(function (p) { return p.id === a.place; }); })
        .map(function (a) { return { item: a.item, place: a.place, label: !!a.label }; }) : []
    };
  });
  return { layouts: layouts, recent: Array.isArray(s.recent) ? s.recent.map(String) : [], prefs: Object.assign(base.prefs, s.prefs || {}) };
}
function isHang(h) { return h && ITEMS[h.item] && ITEMS[h.item].kind === 'hang'; }
function save() {
  record();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('この端末には保存できません（書き出しで残してください）'); }
}

var S = load();
function scOf(l) { return SCENES[(l && l.scene) || ''] ? l.scene : 'desk'; }   // 配置の場所
var scene = SCENES[S.prefs.scene] ? S.prefs.scene : 'desk';   // メニューで選んでいる場所
useScene(scene);
OUTLINE = !!S.prefs.outline;   // 物の輪郭を太く（端末に保存）
SPACE_TEXT = S.prefs.spaceText !== false;   // 場の床の文字（端末に保存）
var cur = null;          // 表示・編集中の配置
var flip = false;
var big = false;         // 大きく映す（全画面・真上からの図だけ・見出し）。その場かぎり        // 左右反転はその場かぎり（保存しない）
var sel = -1;            // 編集で選んでいる机の上の物
var tab = 'top', dest = { hang: 'left', away: 'tray' };

function byId(id) { return S.layouts.filter(function (l) { return l.id === id; })[0]; }
function rubyHtml(name, yomi) {
  return yomi && S.prefs.ruby ? '<ruby>' + esc(name) + '<rt>' + esc(yomi) + '</rt></ruby>' : esc(name);
}
function itemNameHtml(name) {
  return parseName(name).map(function (s) {
    return s.r && S.prefs.ruby ? '<ruby>' + esc(s.b) + '<rt>' + esc(s.r) + '</rt></ruby>' : esc(s.b);
  }).join('');
}
var toastTimer;
function toast(msg) {
  var t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
}
function go(view) {
  ['vHome', 'vShow', 'vEdit'].forEach(function (v) { $(v).hidden = v !== view; });
  window.scrollTo(0, 0);
}

/* ---- ① えらぶ ---- */
function orderedLayouts() {
  var rank = function (l) { var i = S.recent.indexOf(l.id); return i < 0 ? 1e6 + S.layouts.indexOf(l) : i; };
  return S.layouts.slice().sort(function (a, b) { return rank(a) - rank(b); });
}
function renderHome() {
  useScene(scene);
  $('hTitle').textContent = SCENE.title;
  $('hScenes').innerHTML = SCENE_ORDER.map(function (id) {
    return '<button type="button" data-scene="' + id + '" class="' + (id === scene ? 'on' : '') + '">' + SCENES[id].name + '</button>';
  }).join('');
  var html = '';
  orderedLayouts().forEach(function (l) {
    if (scOf(l) !== scene) return;
    useScene(scOf(l));
    var t = topView(l, { noLabels: true });
    var b = t.box;
    html += '<div class="card"><button type="button" class="go" data-id="' + esc(l.id) + '">' +
      '<svg viewBox="' + (b.x0) + ' ' + (b.y0) + ' ' + (b.x1 - b.x0) + ' ' + (b.y1 - b.y0) + '" aria-hidden="true">' + t.svg + '</svg>' +
      '<span class="nm">' + rubyHtml(l.name, l.yomi) + '</span></button>' +
      '<button type="button" class="fix" data-fix="' + esc(l.id) + '">なおす</button></div>';
  });
  useScene(scene);
  $('cards').innerHTML = html || '<p class="hint">この場所の配置はまだありません。「＋ 新しい配置」で作れます。</p>';
  go('vHome');
}
$('hScenes').addEventListener('click', function (e) {
  var b = e.target.closest('[data-scene]'); if (!b) return;
  scene = b.getAttribute('data-scene'); S.prefs.scene = scene; save(); renderHome();
});
$('cards').addEventListener('click', function (e) {
  var g = e.target.closest('[data-id]'), f = e.target.closest('[data-fix]');
  if (f) openEdit(f.getAttribute('data-fix'));
  else if (g) openShow(g.getAttribute('data-id'));
});
$('hNew').onclick = function () {
  var l = { id: 'l' + Date.now().toString(36), name: '新しい配置', yomi: '', flip: true, scene: scene, top: [], hooks: { left: [], right: [] }, away: [] };
  S.layouts.push(l); save(); openEdit(l.id);
};
$('dExport').onclick = function () {
  var blob = new Blob([JSON.stringify({ app: 'haichi', version: 1, layouts: S.layouts }, null, 1)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = '配置図.json'; a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
};
$('dImport').onchange = function (e) {
  var f = e.target.files[0]; if (!f) return;
  f.text().then(function (txt) {
    var got = sanitize(JSON.parse(txt));
    if (!got.layouts.length) throw new Error('empty');
    var n = 0;
    got.layouts.forEach(function (l) {   // 同じ id は上書き、新しい id は追加
      var i = S.layouts.findIndex(function (x) { return x.id === l.id; });
      if (i >= 0) S.layouts[i] = l; else S.layouts.push(l);
      n++;
    });
    save(); renderHome(); toast(n + '件の配置を読み込みました');
  }).catch(function () { toast('このファイルは読み込めません'); });
  e.target.value = '';
};
$('dReset').onclick = function () {
  if (!confirm('つくった配置と直した内容をすべて消して、標準の配置に戻します。よろしいですか？')) return;
  var prefs = S.prefs; S = freshState(); S.prefs = prefs; save(); renderHome(); toast('標準の配置に戻しました');
};

/* ---- ② 見せる ---- */
function openShow(id) {
  cur = byId(id); if (!cur) return renderHome();
  useScene(scOf(cur));
  flip = false;
  $('bigMsg').innerHTML = SCENE.msg;
  var deskMode = !!SCENE.desk;   // 机だけの機能：4人・いす・横から見た図・しまう物
  $('sGroup').hidden = !deskMode; $('sSides').hidden = !deskMode; $('sChair').hidden = !deskMode;
  S.recent = [id].concat(S.recent.filter(function (x) { return x !== id; })).slice(0, 30); save();
  go('vShow'); renderShow();
}
function renderShow() {
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
function printPage(l, o) {
  useScene(scOf(l));
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
  return { ruby: S.prefs.ruby, chair: deskMode && S.prefs.chair, flip: !!(fl && l.flip), topOnly: S.prefs.topOnly };
}
function doPrint(pages) {
  var keep = SCENE.id;
  $('printArea').innerHTML = pages.join('');
  useScene(keep);
  window.print();   // 印刷ダイアログを閉じるまで止まる（Chrome）。閉じたら中身を消す
  $('printArea').innerHTML = '';
}
// ブラウザの印刷（Ctrl+P）でも、見せる画面ならいま映している1枚を刷る。ほかの画面では何も刷らない
window.addEventListener('beforeprint', function () {
  if ($('printArea').innerHTML || $('vShow').hidden) return;
  $('printArea').innerHTML = printPage(cur, printOpts(cur, flip)); useScene(scOf(cur)); autoPrint = true;
});
var autoPrint = false;
window.addEventListener('afterprint', function () { if (autoPrint) { $('printArea').innerHTML = ''; autoPrint = false; } });
$('sPrint').onclick = function () { doPrint([printPage(cur, printOpts(cur, flip))]); useScene(scOf(cur)); };
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
  useScene(scene);
};
$('bigExit').onclick = function () { setBig(false); };
document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && big) setBig(false); });
document.addEventListener('keydown', function (e) { if (big && e.key === 'Escape') setBig(false); });
document.addEventListener('keydown', function (e) {   // ← → で活動を切り替える
  if ($('vShow').hidden || e.target.closest('input')) return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  var list = orderedLayouts(), i = list.indexOf(cur);
  var n = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
  cur = n; flip = false; renderShow();
});

/* ---- ③ つくる・なおす ---- */
function openEdit(id) {
  cur = byId(id); if (!cur) return renderHome();
  useScene(scOf(cur));
  sel = -1; EZ.k = 1; EZ.cx = null;
  hist = { undo: [], redo: [], last: JSON.stringify(cur) };
  histButtons();
  $('eOutline').checked = OUTLINE; $('eGridShow').checked = S.prefs.gridShow !== false;
  $('eTextBox').hidden = !SCENE.space; $('eText').checked = SPACE_TEXT;
  $('eName').value = cur.name; $('eYomi').value = cur.yomi; $('eFlip').checked = cur.flip;
  go('vEdit'); renderEdit(); renderPalette();
}
function renderEdit() {
  var t = topView(cur, { ruby: S.prefs.ruby, sel: sel, grid: S.prefs.gridShow === false ? null : gridLevel(S.prefs.grid) });   // 線を消しても交点への吸着は続く
  var b = t.box, pad = 60 * K;
  var svg = $('editSvg');
  // 余白は広めに固定して、吹き出しが増えても床が跳ねないようにする（場所の広さに合わせて K 倍）
  var x0 = Math.min(b.x0, -300 * K) - pad, y0 = Math.min(b.y0, -130 * K) - pad, x1 = Math.max(b.x1, DESK.w + 300 * K) + pad, y1 = Math.max(b.y1, DESK.d + 130 * K) + pad;
  EZ.base = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  applyZoom();
  var ps = cur.top[sel];
  if (!ps || ps.item !== 'arrow' || !isPath(ps)) arrowEdit = false;
  svg.innerHTML = t.svg + (arrowEdit ? arrowMarks(ps) : '');
  var p = cur.top[sel];
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
    $('selGrid').hidden = !it.grid;
    if (it.grid) { var kn = kidsN(p); $('kNx').textContent = kn.nx; $('kNy').textContent = kn.ny; $('kSum').textContent = '（' + kn.nx * kn.ny + '人）'; }
    $('selPath').hidden = p.item !== 'arrow'; $('selPath').setAttribute('aria-pressed', String(arrowEdit && p.item === 'arrow'));
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
  $('eGrid').innerHTML = GRID_LEVELS.map(function (g) {
    return '<button type="button" data-grid="' + g.id + '" class="' + (g.id === gridLevel(S.prefs.grid).id ? 'on' : '') + '">' + g.name + '</button>';
  }).join('');
}
$('eGrid').addEventListener('click', function (e) {
  var b = e.target.closest('[data-grid]'); if (!b) return;
  S.prefs.grid = b.getAttribute('data-grid'); save(); renderEdit();
});
function chipHtml(entry, where, k, extra) {
  return '<span class="chip">' + iconSvg(entry.item, 34) + '<span>' + esc(plainName(ITEMS[entry.item].name)) + '</span>' + (extra || '') +
    '<button type="button" data-lab="' + where + ':' + k + '" aria-pressed="' + !!entry.label + '">名前</button>' +
    '<button type="button" data-rm="' + where + ':' + k + '" aria-label="けす">×</button></span>';
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
  if (nx * ny > 36) { toast('36人までです'); return; }
  p.nx = nx; p.ny = ny; clampP(p); save(); renderEdit();
});
$('selPath').onclick = function () {
  var p = cur.top[sel]; if (!p || p.item !== 'arrow') return;
  arrowEdit = !arrowEdit;
  if (arrowEdit) { toPath(p); save(); }
  renderEdit();
};
$('selLabel').onclick = function () { var p = cur.top[sel]; p.label = !p.label; save(); renderEdit(); };
$('selFront').onclick = function () { toFront(); save(); renderEdit(); };
$('selDel').onclick = function () { cur.top.splice(sel, 1); sel = -1; save(); renderEdit(); };
function toFront() { var p = cur.top.splice(sel, 1)[0]; cur.top.push(p); sel = cur.top.length - 1; }

/* 物の中心をいちばん近いグリッドの交点に合わせる。交点は机の外にも「あらい」1目分広がる
   （本が半分だけ机に乗る配置）。それ以上はみ出すのは物の形まかせで許す（重ね置きなど実際の机でも起きる） */
function clampP(p) {
  var q = snap(p.x, p.y, gridLevel(S.prefs.grid));
  p.x = q.x; p.y = q.y;
}

/* ドラッグ：動かしている間は transform だけを書き換え、離したら描き直す */
var drag = null;
function svgPoint(svg, e) {
  var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
/* ---- 取り消し・やり直し（Ctrl+Z／Ctrl+Y・Ctrl+Shift+Z）----
   編集画面で保存するたびに、変える前の配置を積む。配置を開き直すと空になる（配置ごと・この画面の間だけ）。 */
var hist = { undo: [], redo: [], last: null }, HIST_MAX = 100;
function record() {
  if (!cur || $('vEdit').hidden || hist.last == null) return;
  var s = JSON.stringify(cur);
  if (s === hist.last) return;
  hist.undo.push(hist.last); if (hist.undo.length > HIST_MAX) hist.undo.shift();
  hist.redo = []; hist.last = s; histButtons();
}
function restore(s) {   // cur は S.layouts の中の同じ物なので、中身だけを入れかえる
  var o = JSON.parse(s);
  Object.keys(cur).forEach(function (k) { delete cur[k]; }); Object.keys(o).forEach(function (k) { cur[k] = o[k]; });
  hist.last = s;
  if (sel >= cur.top.length) sel = -1;
  $('eName').value = cur.name; $('eYomi').value = cur.yomi; $('eFlip').checked = cur.flip;
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  renderEdit(); renderPalette(); histButtons();
}
function undo() { if (!hist.undo.length) return; hist.redo.push(hist.last); restore(hist.undo.pop()); }
function redo() { if (!hist.redo.length) return; hist.undo.push(hist.last); restore(hist.redo.pop()); }
function histButtons() { $('eUndo').disabled = !hist.undo.length; $('eRedo').disabled = !hist.redo.length; }
$('eUndo').onclick = undo; $('eRedo').onclick = redo;

/* ---- 写す・切り取る・貼る（Ctrl+C／Ctrl+X／Ctrl+V）、複製（Ctrl+D）、けす（Delete）----
   選んだ物を1つ写しておき、貼ると グリッド1目ずつ右下にずらして置く。別の配置にも貼れる（その場所に置ける物だけ）。 */
var clip = null, pasteN = 0;
function canPlace(id) { return SCENE.desk ? !(ITEMS[id].scenes || []).length : SCENE.items.indexOf(id) >= 0; }
function pasteItem(src) {
  if (!canPlace(src.item)) { toast('この場所には置けない物です'); return; }
  var g = gridLevel(S.prefs.grid), q = clone(src);
  pasteN++; q.x += pasteN * DESK.w / g.nx; q.y += pasteN * DESK.d / g.ny; clampP(q);
  cur.top.push(q); sel = cur.top.length - 1; save(); renderEdit();
}
document.addEventListener('keydown', function (e) {
  if ($('vEdit').hidden || e.target.closest('input,textarea') || e.altKey) return;
  var k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
  if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
  if (mod && k === 'v') { if (clip) { e.preventDefault(); pasteItem(clip); } return; }
  if (sel < 0) return;
  if (mod && (k === 'c' || k === 'x')) {
    e.preventDefault(); clip = clone(cur.top[sel]); pasteN = 0;
    if (k === 'x') { cur.top.splice(sel, 1); sel = -1; save(); renderEdit(); toast('切り取りました'); } else toast('写しました（Ctrl+V で貼る）');
    return;
  }
  if (mod && k === 'd') { e.preventDefault(); pasteN = 0; pasteItem(cur.top[sel]); return; }
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); cur.top.splice(sel, 1); sel = -1; save(); renderEdit(); }
});

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
  $('zReset').disabled = EZ.k === 1;
}
function zoomAt(q, f) {   // 図の点 q を画面上で動かさずに 倍率を f 倍
  var b = EZ.base, k = Math.min(EZ_MAX, Math.max(1, EZ.k * f)); if (!b) return;
  var cx = EZ.cx == null ? b.x + b.w / 2 : EZ.cx, cy = EZ.cy == null ? b.y + b.h / 2 : EZ.cy;
  EZ.cx = q.x - (q.x - cx) * EZ.k / k; EZ.cy = q.y - (q.y - cy) * EZ.k / k; EZ.k = k;
  applyZoom();
}
function viewCenter() { var v = $('editSvg').viewBox.baseVal; return { x: v.x + v.width / 2, y: v.y + v.height / 2 }; }
$('editSvg').addEventListener('wheel', function (e) {
  e.preventDefault();
  zoomAt(svgPoint(this, e), Math.pow(1.2, -Math.sign(e.deltaY) * Math.min(3, Math.abs(e.deltaY) / 60 || 1)));
}, { passive: false });
$('zIn').onclick = function () { zoomAt(viewCenter(), 1.5); };
$('zOut').onclick = function () { zoomAt(viewCenter(), 1 / 1.5); };
$('zReset').onclick = function () { EZ.k = 1; applyZoom(); };
var touches = {}, pinch = null, pan = null;
function touchList() { return Object.keys(touches).map(function (k) { return touches[k]; }); }
$('editSvg').addEventListener('pointerdown', function (e) {
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
    pan = { sx: e.clientX, sy: e.clientY, inv: inv, cx: EZ.cx, cy: EZ.cy, moved: false, q: svgPoint(this, e) };
    this.setPointerCapture(e.pointerId);
    return;
  }
  var i = +g.getAttribute('data-i'), p = cur.top[i], pt = svgPoint(this, e);
  if (sel !== i) { sel = i; renderEdit(); g = this.querySelector('.it[data-i="' + i + '"]'); }
  drag = { el: g, p: p, dx: pt.x - p.x, dy: pt.y - p.y, moved: false };
  this.setPointerCapture(e.pointerId);
});
function emptyTap(q) {
  // 物を選んでいるときに机の上の空いた所を押すと、そこへ移す（指で引きずらなくてよい）
  var gm = gridMargin();
  if (sel >= 0 && q.x >= -gm.x && q.x <= DESK.w + gm.x && q.y >= -gm.y && q.y <= DESK.d + gm.y) {
    var sp = cur.top[sel]; sp.x = q.x; sp.y = q.y; clampP(sp); save(); renderEdit();
  } else if (sel >= 0) { sel = -1; renderEdit(); }
}
$('editSvg').addEventListener('pointermove', function (e) {
  if (touches[e.pointerId]) touches[e.pointerId] = { x: e.clientX, y: e.clientY };
  if (pinch) { pinchMove(); return; }
  if (pan) {
    if (Math.hypot(e.clientX - pan.sx, e.clientY - pan.sy) > 6) pan.moved = true;
    if (pan.moved && EZ.k > 1) {
      var m = pan.inv, dx = (e.clientX - pan.sx) * m.a + (e.clientY - pan.sy) * m.c, dy = (e.clientX - pan.sx) * m.b + (e.clientY - pan.sy) * m.d;
      EZ.cx = pan.cx - dx; EZ.cy = pan.cy - dy; applyZoom();
    }
    return;
  }
  if (!drag) return;
  var pt = svgPoint(this, e), p = drag.p;
  var nx = p.x, ny = p.y;
  p.x = pt.x - drag.dx; p.y = pt.y - drag.dy; clampP(p);
  if (p.x !== nx || p.y !== ny) drag.moved = true;
  drag.el.setAttribute('transform', itemTransform(p));
});
function endDrag() {
  if (!drag) return;
  var moved = drag.moved; drag = null;
  if (moved) { save(); renderEdit(); }
}
$('editSvg').addEventListener('pointerup', function (e) {
  touchEnd(e);
  if (pan) { var p0 = pan; pan = null; if (!p0.moved) emptyTap(p0.q); return; }
  endDrag();
});
document.addEventListener('keydown', function (e) {   // 矢印キーでグリッド1目ずつ動かす
  if ($('vEdit').hidden || sel < 0 || e.target.closest('input')) return;
  var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!d) return;
  e.preventDefault();
  var g = gridLevel(S.prefs.grid), p = cur.top[sel];
  p.x += d[0] * DESK.w / g.nx; p.y += d[1] * DESK.d / g.ny; clampP(p); save(); renderEdit();
});
$('editSvg').addEventListener('pointercancel', function (e) { touchEnd(e); pan = null; endDrag(); });

renderHome();
