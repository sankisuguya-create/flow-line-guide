/* 配置図の画面 ③：取り消し・やり直し と 写す・貼る（キーボード） */
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
  msel = msel.filter(function (i) { return i < cur.top.length; }); if (msel.length < 2) msel = [];
  useLayout(cur);   // 場所の向き（rot）も戻る
  $('eName').value = cur.name; $('eYomi').value = cur.yomi; $('eFlip').checked = cur.flip;
  try { Store.save(S); } catch (e) {}
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
function pasteItem(src) {   // src：1つの物 か 物の並び。並びは 形を保ったまま ずらして貼る
  var list = (Array.isArray(src) ? src : [src]).filter(function (q) { return canPlace(q.item); });
  if (!list.length) { toast('この場所には配置できない用具です'); return; }
  var g = gridLevel(S.prefs.grid), added = [];
  pasteN++;
  list.forEach(function (s0) {
    var q = clone(s0); q.x += pasteN * DESK.w / g.nx; q.y += pasteN * DESK.d / g.ny; if (list.length === 1) clampP(q);
    cur.top.push(q); added.push(cur.top.length - 1);
  });
  msel = added.length > 1 ? added : []; sel = added[added.length - 1];
  save(); renderEdit();
}
document.addEventListener('keydown', function (e) {
  if ($('vEdit').hidden || e.target.closest('input,textarea') || e.altKey) return;
  var k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
  if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
  if (mod && k === 'v') { if (clip) { e.preventDefault(); pasteItem(clip); } return; }
  if (k === 'escape') { selectOnly(-1); renderEdit(); return; }
  if (mod && k === 'a') { e.preventDefault(); msel = cur.top.map(function (_, i) { return i; }); sel = msel.length - 1; if (msel.length < 2) msel = []; renderEdit(); return; }
  var set = selected();
  if (!set.length) return;
  var items = set.map(function (i) { return clone(cur.top[i]); });
  if (mod && (k === 'c' || k === 'x')) {
    e.preventDefault(); clip = items.length > 1 ? items : items[0]; pasteN = 0;
    if (k === 'x') { removeItems(set); save(); renderEdit(); toast('切り取りました'); } else toast('コピーしました（Ctrl+V で貼り付け）');
    return;
  }
  if (mod && k === 'd') { e.preventDefault(); pasteN = 0; pasteItem(items.length > 1 ? items : items[0]); return; }
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); removeItems(set); save(); renderEdit(); }
});
