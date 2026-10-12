/* 配置図（apps/haichi）に置く体育館の用具。立体は mesh.js が正本で、ここは「置く物」としての名前・状態だけを持つ。
   desk/data.js の後、desk/draw.js の前に読む。2D の gbox・gboard・gmat（desk/data.js）を同じ id で上書きする
   ので、前の版で保存した配置もそのまま立体で出る。
   mesh(p) は {faces, foot:{W,L}} を返す。foot（床に接する形）が置き場所の箱になり、描くときは
   p.r（90°刻み）で床の上で回してから、地図用の見方（真上の床＋高さを上へ0.5倍）で描く（draw.js の meshSvg）。 */
(function () {
  var MESH_SCENES = ['gym'];   // 場（assets/spaces）の場所は scenes.js が足す
  function gi(name, states, mesh, extra) {
    var it = { name: name, kind: 'top', scenes: MESH_SCENES.slice(), states: states, mesh: mesh };
    for (var k in extra || {}) it[k] = extra[k];
    return it;
  }
  var DAN = {};
  [8, 7, 6, 5, 4, 3].forEach(function (n) { DAN['dan' + n] = {}; STATE_NAMES['dan' + n] = n + '段'; });
  ITEMS.gbox = gi('{跳|と}び{箱|ばこ}', DAN, function (p) { return GYM.tobibako(+(stateOf(p).slice(3)) || 8); });
  ITEMS.gboard = gi('ロイター{板|ばん}', { closed: {} }, function () { return GYM.board(); });
  STATE_NAMES.hide = '取っ手なし'; STATE_NAMES.handle = '取っ手あり';
  ITEMS.gmat = gi('マット', { hide: {}, handle: {} }, function (p) { return GYM.mat(sizeOf(p) === 'l' ? 'L' : 'S', stateOf(p) === 'handle'); },
    { sizes: { s: { name: '6号' }, l: { name: '9号' } } });
  STATE_NAMES.t40 = '40cm'; STATE_NAMES.t50 = '50cm';
  ITEMS.gthick = gi('{厚|あつ}いマット', { t40: {}, t50: {} }, function (p) { return GYM.thickMat(stateOf(p) === 't50' ? 500 : 400, false); });
  var CONE_COLORS = ['#E8541E', '#F2C037', '#1E5FCC', '#46B97A', '#E5484D', '#F7F7F7'];
  STATE_NAMES.band = '柄あり'; STATE_NAMES.plain = '柄なし';
  ITEMS.gcone = gi('コーン', { band: {}, plain: {} }, function (p) { return GYM.cone({ color: colorOf(p), band: stateOf(p) !== 'plain' }); }, { colors: CONE_COLORS });
  ITEMS.gminicone = gi('ミニコーン', { closed: {} }, function (p) { return GYM.cone({ color: colorOf(p), mini: true }); }, { colors: CONE_COLORS });
  var gym = SCENES.gym.items;
  ['gthick', 'gcone', 'gminicone'].forEach(function (id) { if (gym.indexOf(id) < 0) gym.splice(gym.indexOf('gmat') + 1, 0, id); });
})();
