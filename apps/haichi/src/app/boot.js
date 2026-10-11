/* 配置図：起動（最初の画面と、共有のときの受け取り） */
renderHome();

/* ---- 共有（GAS版）：起動したら共有の配置を受け取り、ほかの人の変更が来たら描き直す ---- */
$('dReset').hidden = Store.kind === 'gas';   // 共有では「標準に戻す」はしない（みんなの配置が消えるため）
$('dHint').textContent = Store.kind === 'gas' ? '配置は校内で共有されています（同時に編集しても統合されます）。書き出しはバックアップに使えます。'
                                              : '配置はこの端末のブラウザに保存されます。別の端末へは書き出したファイルで移行します。';
function refreshView() {
  if (!$('vEdit').hidden && cur) { if (!byId(cur.id)) return renderHome(); useLayout(cur); renderEdit(); renderPalette(); }
  else if (!$('vShow').hidden && cur) { if (!byId(cur.id)) return renderHome(); renderShow(); }
  else renderHome();
}
Store.onPresence = function () { if (!$('vEdit').hidden && cur) peers(); };
function peers() {
  var who = Store.editors ? Store.editors(cur.id) : [];
  $('ePeers').hidden = !who.length;
  $('ePeers').textContent = who.length ? '同時編集中：' + who.join('、') : '';
}
var selU = [];   // 取り込む直前に選んでいた物の名札（store.js が取り込む前に before を呼ぶ）
Store.before = function () { selU = cur ? selected().map(function (i) { return (cur.top[i] || {}).u; }).filter(Boolean) : []; };
Store.start(refreshView, function (id, by, conflict) {
  if (cur && cur.id === id && !$('vEdit').hidden) {
    hist = { undo: [], redo: [], last: JSON.stringify(cur) }; histButtons();   // 取り消しは 取り込んだ後から数え直す（相手の変更を戻さないため）
    // 選んでいた物は 番号ではなく名札 u で選び直す（まぜると並び順が変わるため）
    var at = function (u) { for (var i = 0; i < cur.top.length; i++) if (cur.top[i].u === u) return i; return -1; };
    sel = selU.length ? at(selU[selU.length - 1]) : -1;
    msel = selU.map(at).filter(function (i) { return i >= 0; }); if (msel.length < 2) msel = [];
    if (!conflict) toast((by || '他の先生') + 'さんの変更を反映しました');
  }
  refreshView();
});
