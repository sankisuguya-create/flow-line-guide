/* ===== 描画：配置データ → SVG 文字列 =====
   画面（DOM）には触らない。app.js とテストの両方が使う。 */

var WOOD = '#C8925C', WOOD_EDGE = '#8E6237', TRAY = '#A19E95', TRAY_IN = '#4E4C47', PIPE = '#B8B3A7';
var LABEL_FS = 46, LABEL_PAD = 10, LABEL_GAP = 34;
var VIEW_GAP = 70;   // 図と図のあいだ
var SIDE_SCALE = 0.6; // 横から見た図の縮尺。主役は上から見た図なので小さくする

function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* ---- 名前とふりがな ---- */
function parseName(name) {
  var out = [], re = /\{([^|}]+)\|([^}]+)\}|([^{]+)/g, m;
  while ((m = re.exec(name))) out.push(m[3] != null ? { b: m[3], r: '' } : { b: m[1], r: m[2] });
  return out;
}
function plainName(name) { return parseName(name).map(function (s) { return s.b; }).join(''); }
function charW(ch, fs) { return /[\x20-\x7e]/.test(ch) ? fs * 0.6 : fs; }
function textW(s, fs) { var w = 0; for (var i = 0; i < s.length; i++) w += charW(s[i], fs); return w; }
function nameMetrics(name, fs, ruby) {
  var segs = parseName(name), w = 0;
  segs.forEach(function (s) { w += textW(s.b, fs); });
  var hasRuby = ruby && segs.some(function (s) { return s.r; });
  return { w: w, h: fs * 1.15 + (hasRuby ? fs * 0.55 : 0), rubyH: hasRuby ? fs * 0.55 : 0 };
}
/* 左上 (x,y) から名前を書く。ふりがなは各漢字のかたまりの上に、はみ出すときは詰める */
function nameSvg(name, x, y, fs, ruby) {
  var m = nameMetrics(name, fs, ruby), base = y + m.rubyH + fs * 0.9, rfs = fs * 0.48, cx = x, s = '';
  parseName(name).forEach(function (seg) {
    var bw = textW(seg.b, fs);
    s += '<text x="' + cx + '" y="' + base + '" font-size="' + fs + '" class="lb">' + esc(seg.b) + '</text>';
    if (ruby && seg.r) {
      var rw = Math.min(textW(seg.r, rfs), bw + fs * 0.3);
      s += '<text x="' + (cx + bw / 2) + '" y="' + (base - fs * 0.98) + '" font-size="' + rfs + '" text-anchor="middle" class="rb" textLength="' + rw +
           '" lengthAdjust="spacingAndGlyphs">' + esc(seg.r) + '</text>';
    }
    cx += bw;
  });
  return s;
}
/* 吹き出しの箱。(cx,cy) が箱の中心 */
/* 吹き出し・引き出し線・見出しは場所の広さに合わせて K 倍（SCENES 節参照） */
function labelBoxSize(name, ruby) {
  var m = nameMetrics(name, LABEL_FS * K, ruby);
  return { w: m.w + LABEL_PAD * K * 2, h: m.h + LABEL_PAD * K * 2 };
}
function labelBox(name, cx, cy, ruby) {
  var b = labelBoxSize(name, ruby), x = cx - b.w / 2, y = cy - b.h / 2;
  return '<rect x="' + x + '" y="' + y + '" width="' + b.w + '" height="' + b.h + '" rx="' + 12 * K + '" class="lbox" style="stroke-width:' + 3 * K + '"/>' +
         nameSvg(name, x + LABEL_PAD * K, y + LABEL_PAD * K, LABEL_FS * K, ruby);
}

/* ---- 用具の形 ---- */
function stateOf(p) {
  var st = ITEMS[p.item].states;
  return st[p.state] ? p.state : Object.keys(st)[0];   // 既定は先頭の状態（多くの物は closed）
}
function sizeOf(p) {           // 判型を選べる物の判型の id
  var sz = ITEMS[p.item].sizes;
  return sz ? (sz[p.size] ? p.size : Object.keys(sz)[0]) : null;
}
function colorIndex(p) {
  var it = ITEMS[p.item];
  return p.color == null ? (it.color0 || 0) : (p.color | 0) % it.colors.length;
}
function colorOf(p) {   // 置いた物の色：自由に選んだ色（hex）があればそれ、なければ 色の見本の番号
  var c = ITEMS[p.item].colors;
  if (c && /^#[0-9a-fA-F]{6}$/.test(p.hex || '')) return p.hex;
  return c ? c[colorIndex(p)] : null;
}
/* 描く大きさ。判型を選べる物は判型から（開くと幅2倍）、ほかは状態ごとの寸法 */
function baseSize(p) {
  var it = ITEMS[p.item], st = stateOf(p);
  if (it.mesh) { var f = it.mesh(p).foot; return [f.W, f.L]; }
  if (it.size) return it.size(p);   // 中身で大きさが変わる物（児童の並び）
  if (it.stretch && +p.len > 0) {   // 長さを変えられる物（列・ライン）：stretch.axis の向きの寸法を p.len に
    var b0 = it.sizes ? [it.sizes[sizeOf(p)].w, it.sizes[sizeOf(p)].d] : [it.states[st].w, it.states[st].d];
    return it.stretch.axis === 'w' ? [+p.len, b0[1]] : [b0[0], +p.len];
  }
  if (it.sizes) { var z = it.sizes[sizeOf(p)]; return [st === 'open' ? z.w * 2 : z.w, z.d]; }
  return [it.states[st].w, it.states[st].d];
}
/* 置いた物ごとの拡大・縮小（p.s。1＝実寸）。描く大きさ・選ぶ枠・吹き出しの位置はすべてこの大きさ */
var SCALE_MIN = 0.25, SCALE_MAX = 4;
function scaleOf(p) { var s = +p.s; return s > 0 ? Math.min(SCALE_MAX, Math.max(SCALE_MIN, s)) : 1; }
function itemSize(p) {
  var c = ITEMS[p.item].custom && ITEMS[p.item].custom(p);
  if (c) return [c.box.x1 - c.box.x0, c.box.y1 - c.box.y0];
  var b = baseSize(p), s = scaleOf(p); return [b[0] * s, b[1] * s];
}
/* ---- 自分で描く物 ----
   ふつうの物は states の draw(w,h) で「回す前・拡大前の絵」を返し、ここが回転・鏡・拡大をかける。
   それでは描けない物（立体＝立体のほうを回す、矢印の「じゆう」＝交点を結ぶ）は custom(p) を持ち、
   { box: p.x,p.y から見た描く範囲（回転・拡大ずみ）, draw: function () { svg } } を返す（null ならふつうに描く）。
   本体（このファイル・app.js）は custom の中身を知らない。立体は items.js の mesh を持つ物すべてに meshCustom を使う */
function customOf(p) { var it = ITEMS[p.item]; return it.mesh ? meshCustom(p) : it.custom ? it.custom(p) : null; }
function meshCustom(p) {
  var s = scaleOf(p), f = ITEMS[p.item].mesh(p).foot, fb = rotBox(f.W * s, f.L * s, p.r || 0);
  return { box: { x0: -fb[0] / 2, y0: -fb[1] / 2, x1: fb[0] / 2, y1: fb[1] / 2 },
           draw: function () { return s !== 1 ? '<g transform="scale(' + s + ')">' + meshSvg(p) + '</g>' : meshSvg(p); } };
}
/* 床の上で物が占める範囲（絶対座標） */
function itemBounds(p) {
  var c = customOf(p);
  if (c) return { x0: p.x + c.box.x0, y0: p.y + c.box.y0, x1: p.x + c.box.x1, y1: p.y + c.box.y1 };
  var wd = itemSize(p), bb = rotBox(wd[0], wd[1], p.r || 0);
  return { x0: p.x - bb[0] / 2, y0: p.y - bb[1] / 2, x1: p.x + bb[0] / 2, y1: p.y + bb[1] / 2 };
}
/* 物の置き方（位置・回転・鏡・拡大）。ドラッグ中の描き直し（app.js）も同じものを使う */
function itemTransform(p) {
  var s = scaleOf(p);
  if (customOf(p)) return 'translate(' + p.x + ' ' + p.y + ')';   // 自分で描く物は 回転・拡大を自分でかける
  return 'translate(' + p.x + ' ' + p.y + ') rotate(' + (p.r || 0) + ')' + (p.m ? ' scale(-1 1)' : '') + (s !== 1 ? ' scale(' + s + ')' : '');
}
/* 回転したときの外接箱の幅・奥行き */
function rotBox(w, d, r) {
  var a = r * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  return [w * c + d * s, w * s + d * c];
}
/* 立体の物（../gym/items.js）。床の上で p.r だけ回し（鏡は左右反転）、地図用の見方で描く。
   SVG の rotate で回すと高さの向きまで回ってしまうので、立体のほうを回す */
/* 立体の絵は 物・状態・判型・向き・鏡 が同じなら同じ。作った絵を覚えておき、同じ物は計算しなおさない
   （パイプいすを何十脚も並べたときの重さ対策。拡大・縮小は外側の transform でかけるので鍵に入れない） */
var MESH_CACHE = {}, MESH_CACHE_N = 0;
function meshSvg(p) {
  var key = [p.item, stateOf(p), sizeOf(p), colorOf(p) || '', p.r || 0, p.m ? 1 : 0].join('|');   // 色も鍵に（コーン）
  if (MESH_CACHE[key]) return MESH_CACHE[key];
  if (++MESH_CACHE_N > 400) { MESH_CACHE = {}; MESH_CACHE_N = 1; }
  return (MESH_CACHE[key] = meshSvgRaw(p));
}
function meshSvgRaw(p) {
  var m = ITEMS[p.item].mesh(p), a = (p.r || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), mx = p.m ? -1 : 1;
  var faces = m.faces.map(function (f) {
    var q = Object.assign({}, f);
    q.p = f.p.map(function (v) { var x = v[0] * mx; return [x * c - v[1] * s, x * s + v[1] * c, v[2]]; });
    if (mx < 0 && !f.line) q.p.reverse();   // 鏡にすると面の表裏が入れ替わるので、頂点の順を戻す
    if (f.side) q.side = f.side * mx; if (f.sideOf) q.sideOf = f.sideOf * mx;
    return q;
  });
  return GYM.drawFaces([{ faces: faces, off: [0, 0, 0] }], GYM.plan(0.5, false)).svg;
}
/* 輪郭を太く：物の形（透明でない所）を外へ広げて濃い色で塗り、物の下に敷く。
   中の線は変えないので、物の形はそのまま・外まわりだけが太く見える。広げる幅は床の広さに合わせる（K） */
function outlineId() { return 'ol-' + SCENE.id; }
function outlineDefs() {
  if (!OUTLINE) return '';
  return '<defs><filter id="' + outlineId() + '" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">' +
    '<feMorphology in="SourceAlpha" operator="dilate" radius="' + (5 * K) + '" result="d"/>' +
    '<feFlood flood-color="' + INK + '"/><feComposite in2="d" operator="in" result="o"/>' +
    '<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
}
function olAttr() { return OUTLINE ? ' filter="url(#' + outlineId() + ')"' : ''; }
function selBox(b) {
  return '<rect class="selbox" x="' + (b.x0 - 10 * K) + '" y="' + (b.y0 - 10 * K) + '" width="' + (b.x1 - b.x0 + 20 * K) + '" height="' + (b.y1 - b.y0 + 20 * K) + '" rx="' + 10 * K + '" style="stroke-width:' + 6 * K + ';stroke-dasharray:' + 18 * K + ' ' + 10 * K + '"/>';
}
function drawTopItem(p, i, cls) {
  var head = '<g class="it' + (cls ? ' ' + cls : '') + '" data-i="' + i + '" transform="' + itemTransform(p) + '">';
  var c = customOf(p);
  if (c) return head + '<g' + olAttr() + '>' + c.draw() + '</g>' + (/\bsel\b/.test(cls) ? selBox(c.box) : '') + '</g>';
  var st = ITEMS[p.item].states[stateOf(p)], wd = baseSize(p), w = wd[0], d = wd[1], k = K / scaleOf(p);   // k：選ぶ枠の線は拡大しても同じ太さ
  MIRROR = p.m ? -1 : 1;
  var body = st.draw(w, d, colorOf(p), p);
  MIRROR = 1;
  return head + '<g transform="translate(' + (-w / 2) + ' ' + (-d / 2) + ')"><g' + olAttr() + '>' + body + '</g>' +
         (/\bsel\b/.test(cls) ? '<rect class="selbox" x="' + (-10 * k) + '" y="' + (-10 * k) + '" width="' + (w + 20 * k) + '" height="' + (d + 20 * k) + '" rx="' + 10 * k + '" style="stroke-width:' + 6 * k + ';stroke-dasharray:' + 18 * k + ' ' + 10 * k + '"/>' : '') + '</g></g>';
}
function iconSvg(itemId, size) {   // しまう物・編集のパレット用の小さな絵
  var it = ITEMS[itemId], w, d, body;
  if (it.kind === 'hang') { w = it.side[0]; d = it.side[1] + 80; body = '<g transform="translate(' + w / 2 + ' 4)">' + hangFace(it) + '</g>'; }
  else if (it.mesh) {
    var mp = { item: itemId }, f = itemSize(mp), hz = 0;
    it.mesh(mp).faces.forEach(function (fc) { fc.p.forEach(function (v) { hz = Math.max(hz, v[2]); }); });
    w = f[0]; d = f[1] + hz / 2;
    body = '<g transform="translate(' + w / 2 + ' ' + (f[1] / 2 + hz / 2) + ')">' + meshSvg(mp) + '</g>';
  }
  else { var sk = Object.keys(it.states)[0], p = { item: itemId, state: sk }, wd = itemSize(p); w = wd[0]; d = wd[1]; body = it.states[sk].draw(w, d, colorOf(p)); }
  var pad = 8;
  return '<svg viewBox="' + (-pad) + ' ' + (-pad) + ' ' + (w + pad * 2) + ' ' + (d + pad * 2) + '" width="' + size + '" height="' + size + '" aria-hidden="true">' + body + '</svg>';
}

/* ---- 左右反転：x を鏡にし、左右のフックを入れ替える ---- */
function flipLayout(lay) {
  var c = JSON.parse(JSON.stringify(lay));
  c.top = lay.top.map(function (p) {
    var q = Object.assign({}, p);
    q.x = DESK.w - p.x; q.r = p.r ? -p.r : 0; q.m = !p.m;
    if (p.pts) q.pts = p.pts.map(function (v) { return [-v[0], v[1]]; });
    return q;
  });
  c.hooks = { left: (lay.hooks.right || []).slice(), right: (lay.hooks.left || []).slice() };
  return c;
}

/* ---- 上から見た図（机1台、机の左上が原点） ---- */
function deskTopSvg() {
  return '<rect x="0" y="0" width="' + DESK.w + '" height="' + DESK.d + '" rx="14" fill="' + WOOD + '" stroke="' + WOOD_EDGE + '" stroke-width="6"/>';
}
function chairTopSvg() {
  var x = (DESK.w - CHAIR.w) / 2, y = DESK.d + CHAIR.gap;
  return '<g class="chair"><rect x="' + x + '" y="' + y + '" width="' + CHAIR.w + '" height="' + CHAIR.d + '" rx="40" fill="#D9874A" stroke="' + INK + '" stroke-width="3"/>' +
         '<rect x="' + (x + 20) + '" y="' + (y + CHAIR.d - 10) + '" width="' + (CHAIR.w - 40) + '" height="36" rx="14" fill="#C9763A" stroke="' + INK + '" stroke-width="3"/></g>';
}
function chairExtent() { return CHAIR.gap + CHAIR.d + 30; }

/* 名前の吹き出しを机の外の余白に並べる。sides: 使ってよい辺 */
function spread(list, lo, hi, gap) {
  list.sort(function (a, b) { return a.pref - b.pref; });
  var cur = lo;
  list.forEach(function (a) { a.pos = Math.max(a.pref, cur + a.size / 2); cur = a.pos + a.size / 2 + gap; });
  var lim = hi;
  for (var i = list.length - 1; i >= 0; i--) {
    var a = list[i];
    if (a.pos + a.size / 2 > lim) a.pos = lim - a.size / 2;
    lim = a.pos - a.size / 2 - gap;
  }
}
/* 名称：直した名称（lname）があればそれ、なければ物の名前 */
function labelName(p) { return p.lname ? String(p.lname) : ITEMS[p.item].name; }
/* 引き出し線：細く、ゆるく弧を描く線（向きは いつも同じ回り）。矢印・動線の直線や折れ線と見分けられるように、
   ほかでは使わない形にする。名称と物が一直線に並んでも 弧になる */
function leadPath(l) {
  var dx = l.tx - l.ax, dy = l.ty - l.ay, b = 0.18, nx = -dy * b, ny = dx * b;   // b：弧のふくらみ（長さに対する割合）
  return 'M' + l.ax + ' ' + l.ay + 'C' + (l.ax + dx * 0.3 + nx) + ' ' + (l.ay + dy * 0.3 + ny) + ' ' +
         (l.ax + dx * 0.7 + nx) + ' ' + (l.ay + dy * 0.7 + ny) + ' ' + l.tx + ' ' + l.ty;
}
function layoutLabels(top, sides, ruby, bottomStart) {
  var groups = { L: [], R: [], T: [], B: [] };
  top.forEach(function (p, i) {
    if (!p.label) return;
    var name = labelName(p), box = labelBoxSize(name, ruby);
    var dist = { L: p.x, R: DESK.w - p.x, T: p.y, B: DESK.d - p.y }, best = null;
    sides.forEach(function (s) { if (best == null || dist[s] < dist[best]) best = s; });
    var vert = best === 'L' || best === 'R';
    groups[best].push({ i: i, p: p, name: name, box: box, pref: vert ? p.y : p.x, size: vert ? box.h : box.w });
  });
  var out = [], m = { L: 0, R: 0, T: 0, B: 0 }, GAP = LABEL_GAP * K;
  Object.keys(groups).forEach(function (s) {
    var g = groups[s];
    if (!g.length) return;
    var vert = s === 'L' || s === 'R';
    var span = vert ? DESK.d : DESK.w;
    spread(g, vert ? -40 * K : -200 * K, vert ? span + 40 * K : span + 200 * K, 12 * K);
    g.forEach(function (a) {
      var cx, cy;
      if (s === 'L') { cx = -GAP - a.box.w / 2; cy = a.pos; m.L = Math.max(m.L, a.box.w + GAP); }
      if (s === 'R') { cx = DESK.w + GAP + a.box.w / 2; cy = a.pos; m.R = Math.max(m.R, a.box.w + GAP); }
      if (s === 'T') { cx = a.pos; cy = -GAP - a.box.h / 2; m.T = Math.max(m.T, a.box.h + GAP); }
      if (s === 'B') { cx = a.pos; cy = bottomStart + GAP + a.box.h / 2; m.B = Math.max(m.B, a.box.h + GAP); }
      var ax = s === 'L' ? cx + a.box.w / 2 : s === 'R' ? cx - a.box.w / 2 : cx;
      var ay = s === 'T' ? cy + a.box.h / 2 : s === 'B' ? cy - a.box.h / 2 : cy;
      out.push({ i: a.i, side: s, name: a.name, cx: cx, cy: cy, ax: ax, ay: ay, tx: a.p.x, ty: a.p.y, box: a.box });
    });
  });
  return { labels: out, margin: m };
}
function labelsSvg(labels, ruby) {
  var lines = '', boxes = '';
  labels.forEach(function (l) {
    var d = leadPath(l);
    lines += '<path d="' + d + '" class="lead-halo" style="stroke-width:' + 5 * K + '"/>' +
             '<path d="' + d + '" class="lead" style="stroke-width:' + 1.6 * K + '"/>' +
             '<circle cx="' + l.tx + '" cy="' + l.ty + '" r="' + 5 * K + '" class="lead-dot" style="stroke-width:' + 2 * K + '"/>';
    boxes += labelBox(l.name, l.cx, l.cy, ruby);
  });
  return '<g class="labels">' + lines + boxes + '</g>';
}

/* 場所の床。机以外は平らな床に、その場所の目印の線を入れる */
function floorTopSvg(bg) {
  if (SCENE.rot) {   // 回した場所：元の向きで描いて 回す。文字は読める向きに戻す（spaceFloorSvg の rot）
    var b = SCENE.base, r = SCENE.rot, keep = SCENE;
    var tf = r === 90 ? 'translate(' + b.d + ' 0) rotate(90)' : r === 180 ? 'translate(' + b.w + ' ' + b.d + ') rotate(180)' : 'translate(0 ' + b.w + ') rotate(270)';
    SCENE = DESK = b;
    try { return '<g transform="' + tf + '">' + floorTopSvgIn(bg, r) + '</g>'; } finally { SCENE = DESK = keep; }
  }
  return floorTopSvgIn(bg, 0);
}
function floorTopSvgIn(bg, rot) {
  var w = DESK.w, d = DESK.d;
  if (SCENE.space) return spaceFloorSvg(SCENE.space, bg, rot);   // 場（assets/spaces）の床。apps/haichi/src/scenes.js
  if (SCENE.id === 'class') {
    // 木の床＋前の壁と黒板（上）＋後ろの壁の帯（下）
    return R(0, 0, w, d, bg || '#EBDDBE', 0, 30 * K, '#B99F72') +
      R(0, 0, w, 60, 'rgba(0,0,0,.15)', 0, 0) +
      R(1700, 80, 3600, 160, '#3E5B4D', 20, 30) +              // 黒板
      R(1700, 240, 3600, 50, '#D8C9A8', 8, 0) +                // チョーク受け
      R(0, d - 40, w, 40, 'rgba(0,0,0,.1)', 0, 0);
  }
  if (SCENE.id === 'gym') {
    // 木の床＋白いコート線（外周・中央線・センターサークル）
    return R(0, 0, w, d, bg || '#EFD9A8', 0, 30 * K, '#C4A671') +
      R(400, 400, w - 800, d - 800, 'none', 0, 90, '#F6F2E8') +
      L(400, d / 2, w - 400, d / 2, '#F6F2E8', 90) +
      '<circle cx="' + w / 2 + '" cy="' + d / 2 + '" r="1800" fill="none" stroke="#F6F2E8" stroke-width="90"/>';
  }
  if (SCENE.id === 'field') {
    // 土のグラウンド＋白い外周線
    return R(0, 0, w, d, bg || '#DCC9A2', 0, 30 * K, '#B49A6E') +
      R(500, 500, w - 1000, d - 1000, 'none', 0, 150, '#F5F2E8');
  }
  return deskTopSvg();
}

/* 描く順：① 床に描く物（ライン・テープなど ITEMS の floor）→ ② 立体（奥＝上から順。手前の物が上に重なる）→ ③ そのほか。
   ①③の中は置いた順（「いちばん上へ」で後ろへ回す）。data-i は置いた順の番号のまま */
function drawOrder(top) {
  var idx = top.map(function (_, i) { return i; });
  var layer = function (p) { var it = ITEMS[p.item]; return it.floor ? 0 : it.mesh ? 1 : 2; };
  return idx.sort(function (a, b) {
    var pa = top[a], pb = top[b], la = layer(pa), lb = layer(pb);
    // 重なりの順を手で決めた物（z：前面へ・後面へ）はそれに従う。z の無い物（後から足した物）は その上
    var za = pa.z == null ? Infinity : pa.z, zb = pb.z == null ? Infinity : pb.z;
    if (za !== zb) return za - zb;
    if (la !== lb) return la - lb;
    if (la === 1 && pa.y !== pb.y) return pa.y - pb.y;
    return a - b;
  });
}
/* 上から見た机1台（場所では床一面）。返す box は描いた範囲（ラベル込み） */
function topView(lay, o) {
  var sides = o.sides || ['L', 'R', 'T'].concat(o.chair ? [] : ['B']);
  var bottom = DESK.d + (o.chair ? chairExtent() : 0);
  var lab = o.noLabels ? { labels: [], margin: { L: 0, R: 0, T: 0, B: 0 } } : layoutLabels(lay.top, sides, o.ruby, bottom);
  var s = floorTopSvg(SCENE.desk ? null : floorColor(lay.bg)) + (o.chair ? chairTopSvg() : '') + outlineDefs();
  var ib = { x0: 0, y0: 0, x1: DESK.w, y1: DESK.d };   // 物が床からはみ出す分も描画範囲に含める
  drawOrder(lay.top).forEach(function (i) {
    var p = lay.top[i];
    s += drawTopItem(p, i, ((Array.isArray(o.sel) ? o.sel.indexOf(i) >= 0 : o.sel === i) ? 'sel' : '') + (o.ref === i ? ' ref' : ''));   // ref：揃えるときの基準の物   // o.sel：番号 か 番号の並び（まとめて選んだとき）
    var bb = itemBounds(p);
    ib.x0 = Math.min(ib.x0, bb.x0); ib.x1 = Math.max(ib.x1, bb.x1);
    ib.y0 = Math.min(ib.y0, bb.y0); ib.y1 = Math.max(ib.y1, bb.y1);
  });
  if (SCENE.rot && SCENE.space && SCENE.space.up) {   // 回した場所の方位：もとの「上」が いまどちらを向くか
    var arrows = ['▲', '▶', '▼', '◀'][SCENE.rot / 90];
    s += '<text x="' + DESK.w + '" y="' + (-600) + '" font-size="800" font-weight="800" fill="#3B4650" text-anchor="end" dominant-baseline="middle">' + arrows + ' ' + esc(SCENE.space.up) + '</text>';
  }
  if (o.grid) s += gridSvg(o.grid);
  s += labelsSvg(lab.labels, o.ruby);
  var m = lab.margin, E = 20 * K;
  if (SCENE.space) m = { L: m.L, R: m.R, T: Math.max(m.T, 1300), B: m.B };   // 場の外の方位（scenes.js）の分だけ上をあける
  return { svg: s, labels: lab.labels, box: { x0: Math.min(-Math.max(m.L, E), ib.x0), y0: Math.min(-Math.max(m.T, E), ib.y0), x1: Math.max(DESK.w + Math.max(m.R, E), ib.x1), y1: Math.max(bottom + Math.max(m.B, E), ib.y1) } };
}

/* ---- 横から見た図 ----
   u: 横方向（その面に立って見たときの左→右）、v: 天板の上面から下へ */
function hangFace(it) {
  var w = it.side[0], h = it.side[1], c = it.color, s;
  if (it.style === 'box') {
    // 箱型の画材バッグ：2本の持ち手を束ねて掛ける。ふたのベルトと金具
    s = ['-0.18', '0.18'].map(function (k) {
      return '<path d="M' + (w * k - 50) + ' 74 Q' + (w * k) + ' -20 ' + (w * k + 50) + ' 74" fill="none" stroke="#1A1A1A" stroke-width="10" stroke-linecap="round"/>';
    }).join('') +
        R(-w / 2, 70, w, h, c, 14) + R(-w / 2, 70, w, 22, 'rgba(255,255,255,.18)', 14, 0) +
        R(-22, 70, 44, h * 0.55, '#1A1A1A', 6, 2) + C(0, 70 + h * 0.55 - 16, 9, '#C9A65B', 2) +
        R(-w / 2, 70 + h - 26, w, 26, 'rgba(255,255,255,.25)', 14, 0);
  } else if (it.style === 'handle') {
    s = '<path d="M' + (-w * 0.28) + ' 74 Q0 -36 ' + (w * 0.28) + ' 74" fill="none" stroke="' + INK + '" stroke-width="12" stroke-linecap="round"/>' +
        '<path d="M' + (-w * 0.28) + ' 74 Q0 -36 ' + (w * 0.28) + ' 74" fill="none" stroke="' + c + '" stroke-width="6" stroke-linecap="round"/>' +
        R(-w / 2, 70, w, h, c, 14) + L(-w / 2 + 16, 104, w / 2 - 16, 104, 'rgba(0,0,0,.25)', 3);
  } else {
    s = L(0, 0, -w * 0.22, 66, INK, 4) + L(0, 0, w * 0.22, 66, INK, 4) +
        '<path d="M' + (-w / 2) + ' ' + (70 + h) + ' L' + (-w / 2) + ' 92 Q' + (-w / 2) + ' 64 ' + (-w * 0.24) + ' 64 L' + (w * 0.24) + ' 64 Q' + (w / 2) + ' 64 ' + (w / 2) +
        ' 92 L' + (w / 2) + ' ' + (70 + h) + ' Z" fill="' + c + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
        L(-w / 2 + 14, 82, w / 2 - 14, 82, 'rgba(0,0,0,.25)', 3);
  }
  return s;
}
function hangBottom(it) { return 70 + it.side[1]; }

function elevation(view, lay, o) {
  var side = view === 'left' || view === 'right';
  var W = side ? DESK.d : DESK.w, s = '', cap = { left: 'ひだりから', right: 'みぎから', front: 'こくばんがわから', back: 'うしろから' }[view];
  // 脚は、いちばん下まで垂れる物の少し下で切る
  var crop = 260;
  SIDES.forEach(function (sd) { (lay.hooks[sd] || []).forEach(function (h) { crop = Math.max(crop, DESK.hookV + hangBottom(ITEMS[h.item]) + 40); }); });
  if (o.chair) crop = Math.max(crop, CHAIR.seatV + 80);
  var u0 = 0, u1 = W, v1 = crop, labels = [];
  // 机
  var legs = side ? [DESK.legInset, W - DESK.legInset] : [DESK.legInset, W - DESK.legInset];
  legs.forEach(function (u) { s += '<rect x="' + (u - 11) + '" y="' + DESK.top + '" width="22" height="' + (crop - DESK.top) + '" fill="' + PIPE + '" stroke="' + INK + '" stroke-width="2"/>'; });
  s += '<rect x="' + DESK.legInset + '" y="150" width="' + (W - DESK.legInset * 2) + '" height="14" rx="6" fill="' + PIPE + '" stroke="' + INK + '" stroke-width="2"/>';
  s += R(DESK.trayInset, DESK.trayV, W - DESK.trayInset * 2, DESK.trayH, TRAY, 6, 2.5);
  if (view === 'back') s += R(DESK.trayInset + 16, DESK.trayV + 12, W - DESK.trayInset * 2 - 32, DESK.trayH - 22, TRAY_IN, 4, 2);
  s += R(-6, 0, W + 12, DESK.top, WOOD, 6, 3, WOOD_EDGE);

  // 椅子（児童がわ）
  var chairU = null;
  if (o.chair) {
    if (view === 'left') chairU = [DESK.d + CHAIR.gap, DESK.d + CHAIR.gap + CHAIR.d];
    if (view === 'right') chairU = [-CHAIR.gap - CHAIR.d, -CHAIR.gap];
    if (chairU) {
      var back = view === 'left' ? chairU[1] - 20 : chairU[0];
      s += '<g class="chair"><rect x="' + chairU[0] + '" y="' + CHAIR.seatV + '" width="' + CHAIR.d + '" height="18" rx="8" fill="#D9874A" stroke="' + INK + '" stroke-width="3"/>' +
           '<rect x="' + back + '" y="' + CHAIR.backV + '" width="20" height="140" rx="8" fill="#D9874A" stroke="' + INK + '" stroke-width="3"/>' +
           '<rect x="' + (back + 6) + '" y="' + (CHAIR.backV + 140) + '" width="8" height="' + (crop - CHAIR.backV - 140) + '" fill="' + PIPE + '"/>' +
           '<rect x="' + (chairU[0] + 20) + '" y="' + (CHAIR.seatV + 18) + '" width="12" height="' + (crop - CHAIR.seatV - 18) + '" fill="' + PIPE + '" stroke="' + INK + '" stroke-width="2"/>' +
           '<rect x="' + (chairU[1] - 32) + '" y="' + (CHAIR.seatV + 18) + '" width="12" height="' + (crop - CHAIR.seatV - 18) + '" fill="' + PIPE + '" stroke="' + INK + '" stroke-width="2"/></g>';
      u0 = Math.min(u0, chairU[0]); u1 = Math.max(u1, chairU[1]);
    }
    if (view === 'back') {
      var cx0 = (W - CHAIR.w) / 2;
      s += '<g class="chair ghost"><rect x="' + cx0 + '" y="' + CHAIR.backV + '" width="' + CHAIR.w + '" height="140" rx="20" fill="#D9874A" stroke="' + INK + '" stroke-width="3"/>' +
           '<rect x="' + cx0 + '" y="' + CHAIR.seatV + '" width="' + CHAIR.w + '" height="18" rx="8" fill="#D9874A" stroke="' + INK + '" stroke-width="3"/></g>';
    }
  }

  // フックと掛ける物
  var hookU = view === 'left' ? DESK.hookY : view === 'right' ? DESK.d - DESK.hookY : null;
  if (side) {
    var list = lay.hooks[view] || [];
    list.forEach(function (h, k) {
      var it = ITEMS[h.item], hu = hookU + k * 18;
      s += '<g transform="translate(' + hu + ' ' + DESK.hookV + ')">' + hangFace(it) + '</g>';
      u0 = Math.min(u0, hu - it.side[0] / 2); u1 = Math.max(u1, hu + it.side[0] / 2);
      v1 = Math.max(v1, DESK.hookV + hangBottom(it) + 20);
      if (h.label) labels.push({ name: it.name, cx: hu, bottom: DESK.hookV + hangBottom(it) });
    });
    s += '<path d="M' + (hookU - 8) + ' ' + DESK.top + ' v' + (DESK.hookV - DESK.top + 6) + ' q8 10 16 0" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>';
  } else {
    // 正面・背面：掛けた物は横向き（厚みだけ）に見える
    var ends = view === 'back' ? { left: 0, right: W } : { left: W, right: 0 };
    SIDES.forEach(function (sd) {
      var edge = ends[sd], dir = edge === 0 ? -1 : 1, off = 0;
      (lay.hooks[sd] || []).forEach(function (h) {
        var it = ITEMS[h.item], a = edge + dir * off, b = edge + dir * (off + it.t);
        s += L(edge + dir * 6, DESK.hookV, (a + b) / 2, DESK.hookV + 66, INK, 4) +
             R(Math.min(a, b), DESK.hookV + 64, it.t, it.side[1] + 6, it.color, 10);
        off += it.t + 6;
        u0 = Math.min(u0, Math.min(a, b) - 10); u1 = Math.max(u1, Math.max(a, b) + 10);
        v1 = Math.max(v1, DESK.hookV + hangBottom(it) + 20);
      });
      s += '<rect x="' + (edge === 0 ? 2 : edge - 16) + '" y="' + (DESK.hookV - 8) + '" width="14" height="16" rx="3" fill="' + PIPE + '" stroke="' + INK + '" stroke-width="2"/>';
    });
  }
  // 脚の下は切った印
  s += '<line x1="' + (u0 - 10) + '" y1="' + crop + '" x2="' + (u1 + 10) + '" y2="' + crop + '" class="cut"/>';

  // 名前（掛けた物の下）
  labels.forEach(function (l, k) {
    // 図ごと SIDE_SCALE で縮むので、名前はその分大きく描いて上から見た図の名前とそろえる
    var K = 1 / SIDE_SCALE, b0 = labelBoxSize(l.name, o.ruby), b = { w: b0.w * K, h: b0.h * K };
    var cy = l.bottom + 22 + b.h / 2 + k * (b.h + 10);
    s += '<g transform="translate(' + l.cx + ' ' + cy + ') scale(' + K + ')">' + labelBox(l.name, 0, 0, o.ruby) + '</g>';
    u0 = Math.min(u0, l.cx - b.w / 2); u1 = Math.max(u1, l.cx + b.w / 2);
    v1 = Math.max(v1, cy + b.h / 2 + 10);
  });
  // 見出し
  var capFs = 44;
  s += '<text x="' + ((u0 + u1) / 2) + '" y="' + (-capFs * 0.9) + '" font-size="' + capFs + '" text-anchor="middle" class="cap">' + cap + '</text>';
  return { svg: s, box: { x0: u0, y0: -capFs * 2, x1: u1, y1: v1 } };
}
function hasHang(lay, sd) { return (lay.hooks[sd] || []).length > 0; }

/* ---- 1台の机：中央に上から見た図、まわりに横から見た図 ---- */
function place(part, dx, dy, k) {
  k = k || 1;
  return { svg: '<g transform="translate(' + dx + ' ' + dy + ')' + (k !== 1 ? ' scale(' + k + ')' : '') + '">' + part.svg + '</g>',
           box: { x0: part.box.x0 * k + dx, y0: part.box.y0 * k + dy, x1: part.box.x1 * k + dx, y1: part.box.y1 * k + dy } };
}
function bounds(parts) {
  var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  parts.forEach(function (p) { b.x0 = Math.min(b.x0, p.box.x0); b.y0 = Math.min(b.y0, p.box.y0); b.x1 = Math.max(b.x1, p.box.x1); b.y1 = Math.max(b.y1, p.box.y1); });
  return b;
}
function composeSingle(lay, o) {
  var L0 = o.flip ? flipLayout(lay) : lay;
  var top = topView(L0, o), parts = [place(top, 0, 0)], tb = top.box;
  var cy = DESK.d / 2;
  var k = SIDE_SCALE, mid = DESK.w / 2 * (1 - k), VG = VIEW_GAP * K;
  if (o.topOnly) return finish(parts);   // 真上からの図だけ
  if (hasHang(L0, 'left')) { var e = elevation('left', L0, o); parts.push(place(e, tb.x0 - VG - e.box.x1 * k, cy - (e.box.y0 + e.box.y1) * k / 2, k)); }
  if (hasHang(L0, 'right')) { var f = elevation('right', L0, o); parts.push(place(f, tb.x1 + VG - f.box.x0 * k, cy - (f.box.y0 + f.box.y1) * k / 2, k)); }
  if (hasHang(L0, 'left') || hasHang(L0, 'right')) {
    var fr = elevation('front', L0, o); parts.push(place(fr, mid, tb.y0 - VG - fr.box.y1 * k, k));
    var bk = elevation('back', L0, o); parts.push(place(bk, mid, tb.y1 + VG - bk.box.y0 * k, k));
  }
  return finish(parts);
}

/* ---- 4人グループ：2台ずつ向かい合わせ。手前の2台は1台表示と同じ向き ----
   掛ける物は、机どうしがくっつく内がわのフックには掛けられないので、外がわのフックに寄せて描く */
var GROUP = [
  { key: 'bl', dx: 0, dy: DESK.d, rot: 0, outer: 'left' },
  { key: 'br', dx: DESK.w, dy: DESK.d, rot: 0, outer: 'right' },
  { key: 'tl', dx: DESK.w, dy: DESK.d, rot: 180, outer: 'right' },
  { key: 'tr', dx: DESK.w * 2, dy: DESK.d, rot: 180, outer: 'left' }
];
function hangTopSvg(lay, outer) {
  var all = (lay.hooks.left || []).concat(lay.hooks.right || []), s = '', off = 0;
  all.forEach(function (h) {
    var it = ITEMS[h.item], w = it.side[0];
    var x = outer === 'left' ? -10 - off - it.t : DESK.w + 10 + off;
    s += R(x, DESK.hookY - w / 2, it.t, w, it.color, 8);
    off += it.t + 4;
  });
  return s;
}
function composeGroup(lay, o) {
  var L0 = o.flip ? flipLayout(lay) : lay, parts = [];
  GROUP.forEach(function (g) {
    var isLabelled = g.key === 'bl';
    var v = topView(L0, { ruby: o.ruby, chair: o.chair, noLabels: !isLabelled, sides: o.chair ? ['L'] : ['L', 'B'] });
    var svg = hangTopSvg(L0, g.outer) + v.svg;
    var tr = g.rot ? 'translate(' + g.dx + ' ' + g.dy + ') rotate(180)' : 'translate(' + g.dx + ' ' + g.dy + ')';
    var hangW = 220, b = v.box;
    var box = g.rot   // 180°回す台はローカルの box が左右にめくれる（机の外にはみ出した物も含む）
      ? { x0: g.dx - b.x1 - (g.outer === 'right' ? hangW : 0), y0: g.dy - b.y1, x1: g.dx - b.x0 + (g.outer === 'left' ? hangW : 0), y1: g.dy }
      : { x0: g.dx + Math.min(b.x0, g.outer === 'left' ? -hangW : 0), y0: g.dy, x1: g.dx + Math.max(b.x1, g.outer === 'right' ? DESK.w + hangW : DESK.w), y1: g.dy + b.y1 };
    parts.push({ svg: '<g transform="' + tr + '">' + svg + '</g>', box: box });
  });
  return finish(parts);
}
function finish(parts) {
  var b = bounds(parts), pad = 30 * K;
  return {
    viewBox: (b.x0 - pad) + ' ' + (b.y0 - pad) + ' ' + (b.x1 - b.x0 + pad * 2) + ' ' + (b.y1 - b.y0 + pad * 2),
    svg: parts.map(function (p) { return p.svg; }).join('')
  };
}

/* ---- 編集用：グリッドの交点 ---- */
function gridLevel(id) { return GRID_LEVELS.filter(function (g) { return g.id === id; })[0] || GRID_LEVELS[1]; }
/* グリッドの交点は机の外に「あらい」1目分だけ広げる（本が半分だけ机に乗る配置のため）。
   各段の目の大きさは「あらい」の整数倍なので、広げても細かい段は粗い段の交点をすべて含む。 */
function gridMargin() { return { x: DESK.w / GRID_LEVELS[0].nx, y: DESK.d / GRID_LEVELS[0].ny }; }
function gridPoints(level) {
  var pts = [], ki = level.nx / GRID_LEVELS[0].nx, kj = level.ny / GRID_LEVELS[0].ny;
  for (var j = -kj; j <= level.ny + kj; j++) for (var i = -ki; i <= level.nx + ki; i++) pts.push({ x: i * DESK.w / level.nx, y: j * DESK.d / level.ny, i: i, j: j });
  return pts;
}
function snap(x, y, level) {
  var sx = DESK.w / level.nx, sy = DESK.d / level.ny;
  var ki = level.nx / GRID_LEVELS[0].nx, kj = level.ny / GRID_LEVELS[0].ny;
  var i = Math.min(level.nx + ki, Math.max(-ki, Math.round(x / sx))), j = Math.min(level.ny + kj, Math.max(-kj, Math.round(y / sy)));
  return { x: i * sx, y: j * sy };
}
function gridSvg(level) {
  var m = gridMargin(), ki = level.nx / GRID_LEVELS[0].nx, kj = level.ny / GRID_LEVELS[0].ny, z = GRID_ZOOM, sw = 2 * K / z;
  var s = '<g class="grid" data-sw="' + 2 * K + '">';   // 線の太さ・丸の大きさは 編集画面の拡大率（GRID_ZOOM）で割る：拡大しても画面上は同じ太さ
  for (var i = -ki; i <= level.nx + ki; i++) s += '<line x1="' + i * DESK.w / level.nx + '" y1="' + (-m.y) + '" x2="' + i * DESK.w / level.nx + '" y2="' + (DESK.d + m.y) + '" style="stroke-width:' + sw + '"/>';
  for (var j = -kj; j <= level.ny + kj; j++) s += '<line x1="' + (-m.x) + '" y1="' + j * DESK.d / level.ny + '" x2="' + (DESK.w + m.x) + '" y2="' + j * DESK.d / level.ny + '" style="stroke-width:' + sw + '"/>';
  gridPoints(level).forEach(function (p) { s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (level.nx > 24 ? 2.5 : level.nx > 12 ? 4 : 6) * K / z + '" data-r="' + (level.nx > 24 ? 2.5 : level.nx > 12 ? 4 : 6) * K + '" style="stroke-width:' + sw + '"/>'; });
  return s + '</g>';
}
