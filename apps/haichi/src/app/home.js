/* 配置図の画面 ①：えらぶ（活動カード・場所・データの書き出し） */
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
    var t = inLayout(l, function () { return topView(l, { noLabels: true }); });
    var b = t.box;
    html += '<div class="card"><button type="button" class="go" data-id="' + esc(l.id) + '">' +
      '<svg viewBox="' + (b.x0) + ' ' + (b.y0) + ' ' + (b.x1 - b.x0) + ' ' + (b.y1 - b.y0) + '" aria-hidden="true">' + t.svg + '</svg>' +
      '<span class="nm">' + rubyHtml(l.name, l.yomi) + '</span></button>' +
      '<button type="button" class="fix" data-fix="' + esc(l.id) + '">編集</button></div>';
  });
  $('cards').innerHTML = html || '<p class="hint">この場所の配置はまだありません。「＋ 新規作成」で作成できます。</p>';
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
  }).catch(function () { toast('このファイルは読み込めません（形式が違います）'); });
  e.target.value = '';
};
$('dReset').onclick = function () {
  if (!confirm('つくった配置と直した内容をすべて消して、標準の配置に戻します。よろしいですか？')) return;
  var prefs = S.prefs; S = freshState(); S.prefs = prefs; save(); renderHome(); toast('初期配置に戻しました');
};
