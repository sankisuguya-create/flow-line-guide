/* 場（flow-line-guide の assets/spaces/<場所>/space.json）を、配置図の「場所」として足す。
   SPACES は scripts/build.mjs が space.json から作って、このファイルの前に差し込む。
   space.json は m、配置図は mm なので 1000 倍。床の描き方は導線プレイヤー（engine/player/flow.js）と
   同じ決まり（docs/hub.md「描き方」）：線＝壁だけ、同じ zone は外まわりだけ、扉＝切れ目＋枠、開口＝切れ目、
   階段＝踏み段の線（矢印なし、下の階へは黒く消える）、床の目印＝点線。 */
var SPACE_ITEMS = ['gbox', 'gboard', 'gmat', 'gthick', 'gcone', 'gminicone', 'gball', 'gline', 'person', 'rowdot', 'rowline', 'rowseno', 'arrow'].concat(EXTRA_SPACE_ITEMS);   // 足した物（desk/extra.js）のうち体育館に置ける物も
SPACES.forEach(function (sp) {
  // 場の id が既存の場所（gym など）と同じなら、その場所の床をこの場で置きかえる（保存した配置・置ける物はそのまま）
  if (SCENES[sp.id] && !SCENES[sp.id].desk) {
    var S0 = SCENES[sp.id], W = sp.size[0] * 1000, D = sp.size[1] * 1000, g = S0.grid;
    S0.space = sp; S0.w = W; S0.d = D; S0.k = 30;   // 文字・余白の倍率は場の広さによらず体育館（幅20m）の時と同じ
    var c0 = { nx: Math.max(1, Math.round(W / 5000)), ny: Math.max(1, Math.round(D / 5000)) };
    S0.grid = [{ id: 'coarse', name: g[0].name, nx: c0.nx, ny: c0.ny }, { id: 'normal', name: g[1].name, nx: c0.nx * 2, ny: c0.ny * 2 }, { id: 'fine', name: g[2].name, nx: c0.nx * 4, ny: c0.ny * 4 }];
    return;
  }
  var id = 'sp-' + sp.id, w = sp.size[0] * 1000, d = sp.size[1] * 1000, name = sp.title.replace(/（.*?）/g, '');
  function lv(m) { return { nx: Math.max(1, Math.round(w / m)), ny: Math.max(1, Math.round(d / m)) }; }
  var c = lv(5000), n = { nx: c.nx * 2, ny: c.ny * 2 }, f = { nx: c.nx * 4, ny: c.ny * 4 };   // 2倍ずつ（段を変えても交点がずれない）
  SCENES[id] = { id: id, name: name, title: name + 'の配置図', space: sp, w: w, d: d, k: 30,   // 文字・余白の倍率は体育館（幅20m）と同じ。用具の大きさがそろって見える
   
    grid: [{ id: 'coarse', name: '粗い', nx: c.nx, ny: c.ny }, { id: 'normal', name: '標準', nx: n.nx, ny: n.ny }, { id: 'fine', name: '細かい', nx: f.nx, ny: f.ny }],
    items: SPACE_ITEMS.slice(),
    msg: 'この<ruby>形<rt>かたち</rt></ruby>にしてね' };
  SCENE_ORDER.push(id);
  SPACE_ITEMS.forEach(function (it) { var sc = ITEMS[it].scenes; if (sc && sc.indexOf(id) < 0) sc.push(id); });
});

var LINES_SHOW = null;   // 床のラインのうち出す色（null＝全部）
var SPACE_FILL = { deck: '#E4ECF1', water: '#A9D8EC', room: '#EFE9DC', box: '#FFFFFF', stairs: '#FFFFFF' };
function spaceFloorSvg(sp, bg, rot) {   // rot：場所を回したときの角度。文字だけ逆に回して読める向きに保つ   // bg：床の色（部屋・通路・場の外）。水・舞台・階段の色は変えない
  var s = '', lab = '', defs = '', INKW = '#3B4650', FS = Math.max(1, Math.max(sp.size[0], sp.size[1]) / 60), WALL = 0.16 * FS;   // FS：広い場（学校全体など）は文字と壁を大きく
  function rc(a, fill, extra) { return '<rect x="' + a.rect[0] + '" y="' + a.rect[1] + '" width="' + a.rect[2] + '" height="' + a.rect[3] + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function ln(x1, y1, x2, y2, st, sw, extra) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + st + '" stroke-width="' + sw + '"' + (extra || '') + '/>'; }
  function tx(x, y, t, fs, fill, anchor) { return '<text' + (rot ? ' transform="rotate(' + (-rot) + ' ' + x + ' ' + y + ')"' : '') + ' x="' + x + '" y="' + y + '" font-size="' + fs + '" font-weight="800" fill="' + (fill || '#5B6B78') + '" text-anchor="' + (anchor || 'middle') + '" dominant-baseline="middle">' + esc(t) + '</text>'; }
  s += '<rect x="0" y="0" width="' + sp.size[0] + '" height="' + sp.size[1] + '" fill="' + (bg || '#F6F4EE') + '"/>';
  var fillOf = function (k) { return bg && (k === 'room' || k === 'deck') ? bg : SPACE_FILL[k] || '#fff'; };
  var walled = sp.areas.filter(function (a) { return a.kind !== 'mark'; }), done = {};
  walled.forEach(function (a) {
    if (!a.zone) { s += rc(a, fillOf(a.kind), ' stroke="' + INKW + '" stroke-width="' + WALL + '"'); return; }
    if (done[a.zone]) return; done[a.zone] = 1;
    var zs = walled.filter(function (b) { return b.zone === a.zone; });
    zs.forEach(function (b) { s += rc(b, fillOf(b.kind)); });
    zs.forEach(function (b) { zoneEdges(b, zs).forEach(function (e) { s += ln(e[0], e[1], e[2], e[3], INKW, WALL, ' stroke-linecap="square"'); }); });
  });
  // 床のライン（space.json の floor：実寸 m の SVG パス）。壁ではないので細く、壁より下に描く
  var LINE_C = { 白: '#FFFFFF', 青: '#4A90D9', 黄: '#E8B820', 緑: '#2E8B57', 黒: '#2B2B2B', 紺: '#1F2F5C', 赤: '#C0392B' };
  (sp.floor || []).forEach(function (f) {
    if (LINES_SHOW && LINES_SHOW.indexOf(f.c) < 0) return;   // 配置ごとに選んだ色だけ（topView が lay.lines を入れる）
    if (f.c === '白') s += '<path d="' + f.d + '" fill="none" stroke="#B9AE96" stroke-width="0.12"/>';   // 白は明るい床で消えるので、下に薄い縁
    s += '<path d="' + f.d + '" fill="none" stroke="' + (LINE_C[f.c] || f.c) + '" stroke-width="' + 0.07 * FS + '" opacity="0.85"/>';
  });
  sp.areas.forEach(function (a) {
    var x = a.rect[0], y = a.rect[1], w = a.rect[2], h = a.rect[3];
    if (a.kind === 'mark') s += rc(a, 'none', ' stroke="#7C8A96" stroke-width="0.08" stroke-dasharray="0.3 0.2"');
    if (a.lanes) for (var i = 1; i < a.lanes; i++) s += ln(x + 0.2, y + h * i / a.lanes, x + w - 0.2, y + h * i / a.lanes, '#fff', 0.1, ' stroke-dasharray="0.4 0.3"');
    if (a.kind === 'stairs') {
      var hor = a.up === 'left' || a.up === 'right', L = hor ? w : h, n = Math.floor(L / 0.6);
      if (a.to) {
        var gid = 'hfade-' + sp.id + '-' + a.id, dir = { right: [1, 0, 0, 0], left: [0, 0, 1, 0], up: [0, 1, 0, 0], down: [0, 0, 0, 1] }[a.up];
        defs += '<linearGradient id="' + gid + '" x1="' + dir[0] + '" y1="' + dir[1] + '" x2="' + dir[2] + '" y2="' + dir[3] + '"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#111"/></linearGradient>';
        s += rc(a, 'url(#' + gid + ')');
        lab += tx(hor ? (a.up === 'right' ? x + w * 0.2 : x + w * 0.8) : x + w / 2, y + h / 2, a.to, 0.7, '#fff');
      }
      for (var j = 1; j < n; j++) s += hor ? ln(x + j * 0.6, y, x + j * 0.6, y + h, '#9AA6B0', 0.05) : ln(x, y + j * 0.6, x + w, y + j * 0.6, '#9AA6B0', 0.05);
      return;
    }
    if (a.label) lab += tx(x + w / 2, a.kind === 'water' ? y + h / 2 : y + Math.min(0.8 * FS, h / 2), a.label, Math.min(0.9 * FS, h * 0.35, w / Math.max(1, a.label.length) * 0.9), a.kind === 'water' ? '#2E6F8E' : null);
  });
  (sp.walls || []).forEach(function (wl) { s += ln(wl[0][0], wl[0][1], wl[1][0], wl[1][1], INKW, WALL, ' stroke-linecap="square"'); });
  (sp.doors || []).forEach(function (dr) {
    var a = dr.from, b = dr.to, v = a[0] === b[0], k = 0.35;
    s += ln(a[0], a[1], b[0], b[1], fillOf(dr.fill), WALL * 1.6);
    if (dr.kind !== 'open') [a, b].forEach(function (p) { s += v ? ln(p[0] - k, p[1], p[0] + k, p[1], INKW, WALL) : ln(p[0], p[1] - k, p[0], p[1] + k, INKW, WALL); });
  });
  if (!SPACE_TEXT) lab = '';
  if (sp.up && !rot) lab += tx(sp.size[0], -0.6 * FS, '▲ ' + sp.up, 0.8 * FS, '#3B4650', 'end');   // 方位は場の外（右上の外がわ）。回したときは topView が描く
  if (SPACE_TEXT && sp.status !== '確認済') lab += tx(0.3 * FS, sp.size[1] - 0.6 * FS, '※ 仮の地図', 0.7 * FS, '#B0392B', 'start');
  return '<g transform="scale(1000)">' + (defs ? '<defs>' + defs + '</defs>' : '') + s + lab + '</g>';
}
// 矩形 b の4辺から、同じ zone の別の矩形と接している区間を引いた残り＝外まわりの壁（engine/player/flow.js と同じ）
function zoneEdges(b, zs) {
  var x = b.rect[0], y = b.rect[1], X = x + b.rect[2], Y = y + b.rect[3], E = 1e-6, out = [];
  function sub(lo, hi, cuts) { var segs = [[lo, hi]]; cuts.forEach(function (c) { var n = []; segs.forEach(function (s) {
      if (c[1] <= s[0] + E || c[0] >= s[1] - E) { n.push(s); return; } if (c[0] > s[0] + E) n.push([s[0], c[0]]); if (c[1] < s[1] - E) n.push([c[1], s[1]]); }); segs = n; }); return segs; }
  [[y, 'h', x, X, -1], [Y, 'h', x, X, 1], [x, 'v', y, Y, -1], [X, 'v', y, Y, 1]].forEach(function (ed) {
    var at = ed[0], cuts = [];
    zs.forEach(function (o) { if (o === b) return; var ox = o.rect[0], oy = o.rect[1], OX = ox + o.rect[2], OY = oy + o.rect[3];
      if (ed[1] === 'h' && Math.abs((ed[4] < 0 ? OY : oy) - at) < E) cuts.push([Math.max(ox, ed[2]), Math.min(OX, ed[3])]);
      if (ed[1] === 'v' && Math.abs((ed[4] < 0 ? OX : ox) - at) < E) cuts.push([Math.max(oy, ed[2]), Math.min(OY, ed[3])]); });
    sub(ed[2], ed[3], cuts).forEach(function (sg) { out.push(ed[1] === 'h' ? [sg[0], at, sg[1], at] : [at, sg[0], at, sg[1]]); });
  });
  return out;
}

/* グリッドの4段目「とても細かい」：どの場所も「こまかい」をさらに2倍に割る（段を変えても交点がずれない） */
Object.keys(SCENES).forEach(function (id) {
  var g = SCENES[id].grid, f = g[g.length - 1];
  if (f.id !== 'xfine') g.push({ id: 'xfine', name: '極細', nx: f.nx * 2, ny: f.ny * 2 });
});
if (SCENE) GRID_LEVELS = SCENE.grid;
