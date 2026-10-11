/* 配置図：起動（最初の画面と、共有のときの受け取り） */
renderHome();

/* ---- 共有（GAS版）：起動したら共有の配置を受け取り、ほかの人の変更が来たら描き直す ---- */
$('dReset').hidden = Store.kind === 'gas';   // 共有では「標準に戻す」はしない（みんなの配置が消えるため）
$('dHint').textContent = Store.kind === 'gas' ? '配置は学校のみんなで共有しています（同時に直してもまざります）。書き出しは控えに使えます。'
                                              : '配置はこの端末のブラウザに保存されます。別の端末へは書き出したファイルで移します。';
function refreshView() {
  if (!$('vEdit').hidden && cur) { if (!byId(cur.id)) return renderHome(); useScene(scOf(cur)); renderEdit(); renderPalette(); }
  else if (!$('vShow').hidden && cur) { if (!byId(cur.id)) return renderHome(); renderShow(); }
  else renderHome();
}
Store.onPresence = function () { if (!$('vEdit').hidden && cur) peers(); };
function peers() {
  var who = Store.editors ? Store.editors(cur.id) : [];
  $('ePeers').hidden = !who.length;
  $('ePeers').textContent = who.length ? 'いっしょに編集中：' + who.join('、') : '';
}
Store.start(refreshView, function (id, by, conflict) {
  if (cur && cur.id === id && !$('vEdit').hidden) {
    hist = { undo: [], redo: [], last: JSON.stringify(cur) }; histButtons();   // 取り消しは 取り込んだ後から数え直す
    if (sel >= cur.top.length) sel = -1;
    msel = msel.filter(function (i) { return i < cur.top.length; }); if (msel.length < 2) msel = [];
    if (!conflict) toast((by || 'ほかの人') + 'さんの変更を取り込みました');
  }
  refreshView();
});
