/* 足した物（2026-10-11 利用者の採用）：体育・場所の印・人と組・教室・行事。
   data.js の後、draw.js の前に読む。絵は data.js と同じ「斜め上から見た模型」の上面図（mm）。
   寸法は一般的な製品の値（仮）。scenes は data.js の場所の id。場（assets/spaces）へは
   EXTRA_SPACE_ITEMS を apps/haichi/src/scenes.js が足す。 */
var CLASS_COLORS = ['#B3172B', '#F2C037', '#1E5FCC', '#46B97A'];   // 1〜4組（導線資料と同じ。名札を必ず重ねる）
var EXTRA_SPACE_ITEMS = [];
function kidsN(p) {   // 児童の並び：横・縦の人数（1以上、合わせて36人まで）
  var nx = Math.max(1, Math.min(36, (p && p.nx) | 0 || 1)), ny = Math.max(1, Math.min(36, (p && p.ny) | 0 || 1));
  while (nx * ny > 36) { if (ny > 1) ny--; else nx--; }
  return { nx: nx, ny: ny };
}
(function () {
  var W = '#F7F4EA';
  function add(id, scenes, it) {
    it.kind = 'top'; it.scenes = scenes.slice(); ITEMS[id] = it;
    scenes.forEach(function (sc) { if (SCENES[sc] && SCENES[sc].items.indexOf(id) < 0) SCENES[sc].items.push(id); });
    if (scenes.indexOf('gym') >= 0) EXTRA_SPACE_ITEMS.push(id);
  }
  function one(w, d, draw) { return { closed: { w: w, d: d, draw: draw } }; }
  function tag(cx, cy, s, fs) {   // 白い名札（組の番号など）
    var tw = Math.max(fs * 1.2, s.length * fs * 0.95);
    return R(cx - tw / 2, cy - fs * 0.75, tw, fs * 1.5, '#FFFFFF', fs * 0.3, fs * 0.12) + T(cx, cy, s, fs);
  }
  var G = ['gym', 'field'], ALL = ['class', 'gym', 'field'];
  STATE_NAMES.i4 = '4台'; STATE_NAMES.i6 = '6台'; STATE_NAMES.c1 = '1脚'; STATE_NAMES.c5 = '5脚';

  /* ---- 体育 ---- */
  add('hurdle', G, { name: 'ハードル', states: one(800, 600, function (w, h) {   // 板（上の横棒）＋左右の脚＋床の台
    return R(0, h * 0.7, w * 0.12, h * 0.3, '#8A8F96', 8, 6) + R(w * 0.88, h * 0.7, w * 0.12, h * 0.3, '#8A8F96', 8, 6) +
      R(w * 0.04, h * 0.2, 50, h * 0.6, '#C9CDD2', 10, 6) + R(w * 0.96 - 50, h * 0.2, 50, h * 0.6, '#C9CDD2', 10, 6) +
      R(0, h * 0.08, w, h * 0.22, '#F2F2F2', 12, 8) + R(w * 0.3, h * 0.08, w * 0.4, h * 0.22, '#E5484D', 0, 0);
  }) });
  add('highjump', ['gym'], { name: '{高跳|たかと}びのバー', states: one(3000, 600, function (w, h) {   // 左右のスタンド＋ゴムのバー
    return R(0, h * 0.5, 300, h * 0.5, '#7A7F86', 14, 8) + R(w - 300, h * 0.5, 300, h * 0.5, '#7A7F86', 14, 8) +
      R(110, 0, 80, h * 0.85, '#C9CDD2', 12, 8) + R(w - 190, 0, 80, h * 0.85, '#C9CDD2', 12, 8) +
      L(150, h * 0.25, w - 150, h * 0.25, '#E8956A', 40);
  }) });
  add('hoop', G, { name: 'フラフープ', colors: ['#E5484D', '#2F80ED', '#F2C94C', '#46B97A'], states: one(700, 700, function (w, h, col) {
    return '<circle cx="' + w / 2 + '" cy="' + h / 2 + '" r="' + w * 0.45 + '" fill="none" stroke="' + INK + '" stroke-width="' + w * 0.11 + '"/>' +
      '<circle cx="' + w / 2 + '" cy="' + h / 2 + '" r="' + w * 0.45 + '" fill="none" stroke="' + col + '" stroke-width="' + w * 0.07 + '"/>';
  }) });
  add('longrope', G, { name: '{長縄|ながなわ}', states: one(6000, 900, function (w, h) {   // ゆるく弧をえがく縄＋両はしの持ち手
    return '<path d="M 250 ' + h / 2 + ' Q ' + w / 2 + ' ' + h * 1.1 + ' ' + (w - 250) + ' ' + h / 2 + '" fill="none" stroke="' + INK + '" stroke-width="70" stroke-linecap="round"/>' +
      '<path d="M 250 ' + h / 2 + ' Q ' + w / 2 + ' ' + h * 1.1 + ' ' + (w - 250) + ' ' + h / 2 + '" fill="none" stroke="#E8C547" stroke-width="40" stroke-linecap="round"/>' +
      R(0, h * 0.35, 260, h * 0.3, '#E5484D', 40, 10) + R(w - 260, h * 0.35, 260, h * 0.3, '#E5484D', 40, 10);
  }) });
  add('scoreboard', ALL, { name: '{得点板|とくてんばん}', states: one(900, 500, function (w, h) {   // 2枚のめくり数字＋台
    return R(0, h * 0.75, w, h * 0.25, '#8A8F96', 10, 6) + R(w * 0.04, 0, w * 0.92, h * 0.8, '#F2F2F2', 14, 8) +
      R(w * 0.1, h * 0.1, w * 0.36, h * 0.6, '#E5484D', 8, 0) + R(w * 0.54, h * 0.1, w * 0.36, h * 0.6, '#2F80ED', 8, 0) +
      T(w * 0.28, h * 0.42, '0', h * 0.45, '#fff') + T(w * 0.72, h * 0.42, '0', h * 0.45, '#fff');
  }) });
  add('ballbasket', G, { name: 'ボールかご', states: one(900, 900, function (w, h) {   // 金網のかご＋中のボール
    var s = R(0, 0, w, h, '#C9CDD2', 30, 10);
    s += C(w * 0.3, h * 0.32, w * 0.15, '#E08A3C', 6) + C(w * 0.68, h * 0.3, w * 0.15, '#F2C94C', 6) + C(w * 0.5, h * 0.64, w * 0.15, '#F5F5F5', 6) + C(w * 0.2, h * 0.7, w * 0.12, '#E08A3C', 6);
    for (var x = w * 0.2; x < w; x += w * 0.2) s += L(x, 0, x, h, 'rgba(58,53,46,.35)', 6);
    return s + R(0, 0, w, h, 'none', 30, 14);
  }) });
  add('bibs', G, { name: 'ビブス', colors: ['#F28C28', '#46B97A', '#2F80ED', '#E5484D'], states: one(700, 500, function (w, h, col) {   // 入れ物にたたんで重ねたビブス
    return R(0, 0, w, h, '#B8A078', 20, 8) + R(w * 0.1, h * 0.12, w * 0.8, h * 0.3, col, 12, 6) + R(w * 0.1, h * 0.5, w * 0.8, h * 0.3, col, 12, 6);
  }) });
  add('matcart', ['gym'], { name: 'マット{運搬車|うんぱんしゃ}', states: one(1300, 2500, function (w, h) {   // 台車＋重ねたマット
    return R(0, 0, w, h, '#7A7F86', 30, 10) + C(80, 80, 60, '#3A3F45', 6) + C(w - 80, 80, 60, '#3A3F45', 6) + C(80, h - 80, 60, '#3A3F45', 6) + C(w - 80, h - 80, 60, '#3A3F45', 6) +
      R(w * 0.06, h * 0.04, w * 0.88, h * 0.92, '#F1EEE6', 30, 10, '#9A927F') + L(w * 0.06, h * 0.5, w * 0.94, h * 0.5, '#C9C1B0', 10);
  }) });

  /* ---- 場所を示す印 ---- */
  add('startline', ALL, { name: 'スタートライン', states: one(4000, 300, function (w, h) {
    return R(0, h * 0.3, w, h * 0.4, '#FFFFFF', 10, 8) + T(w / 2, h * 0.5, 'スタート', h * 0.34);
  }) });
  add('goalline', ALL, { name: 'ゴールライン', states: one(4000, 300, function (w, h) {   // 白黒の市松
    var s = R(0, 0, w, h, '#FFFFFF', 0, 8);
    for (var i = 0; i * h / 2 < w; i++) for (var j = 0; j < 2; j++) if ((i + j) % 2) s += R(i * h / 2, j * h / 2, h / 2, h / 2, INK, 0, 0);
    return s;
  }) });
  add('tape', ALL, { name: 'テープの{印|しるし}', colors: ['#F2C94C', '#E5484D', '#2F80ED', '#FFFFFF'], states: one(1000, 50, function (w, h, col) { return R(0, 0, w, h, col, 4, 6); }) });
  add('nummark', ALL, { name: '{番号|ばんごう}マーカー', text: true, colors: ['#F2C94C', '#FFFFFF', '#E5484D', '#2F80ED'], states: one(300, 300, function (w, h, col, p) {   // 平たい円盤に番号
    var t = (p && p.text) || '1';
    return C(w / 2, h / 2, w * 0.46, col, 8) + T(w / 2, h / 2, t, Math.min(h * 0.55, w * 0.9 / Math.max(1, t.length) * 1.6));
  }) });
  add('flag', ALL, { name: '{旗|はた}', colors: ['#E5484D', '#FFFFFF'], states: one(500, 700, function (w, h, col) {   // 台＋棒＋旗（赤・白）
    return C(w * 0.2, h * 0.9, w * 0.15, '#7A7F86', 6) + L(w * 0.2, h * 0.08, w * 0.2, h * 0.9, '#8A8F96', 24) +
      '<path d="M ' + w * 0.2 + ' ' + h * 0.08 + ' L ' + w * 0.95 + ' ' + h * 0.22 + ' L ' + w * 0.2 + ' ' + h * 0.42 + ' Z" fill="' + col + '" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/>';
  }) });

  /* ---- 人と組 ---- */
  add('classgroup', ALL, { name: '{組|くみ}のまとまり', colors: CLASS_COLORS, states: {   // 2列×16人（0.5m間隔）＋組の名札
    r2: { w: 1000, d: 8000, draw: function (w, h, col, p) { return dots(2, 16, w, h, col, p); } },
    r4: { w: 2000, d: 4000, draw: function (w, h, col, p) { return dots(4, 8, w, h, col, p); } } } });
  function dots(nx, ny, w, h, col, p) {
    var s = R(0, 0, w, h, 'rgba(255,255,255,.35)', 120, 8, 'rgba(58,53,46,.3)'), r = Math.min(w / nx, h / ny) * 0.36;
    for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) s += C((i + 0.5) * w / nx, (j + 0.5) * h / ny, r, col, 6);
    var k = CLASS_COLORS.indexOf(col);
    var r = (p && p.r) || 0;   // 名札は回しても立てたまま（読める向き）
    return s + '<g transform="rotate(' + (-r) + ' ' + w / 2 + ' ' + h / 2 + ')">' + tag(w / 2, h / 2, (k >= 0 ? k + 1 : '') + '組', Math.min(w * 0.42, 420)) + '</g>';
  }
  /* 児童：横 nx 人 × 縦 ny 人（合わせて1〜36人）を 横60cm・縦70cm 間隔で並べる。人数は置いた物ごと（p.nx, p.ny） */
  var KID = { dx: 600, dy: 700, max: 36 };
  add('kids', ALL, { name: '{児童|じどう}', grid: KID, colors: ['#3A3F45'].concat(CLASS_COLORS), states: { closed: { w: KID.dx, d: KID.dy, draw: function (w, h, col, p) {
    var nx = kidsN(p).nx, ny = kidsN(p).ny, s = '';
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
      var x = i * KID.dx + (KID.dx - 400) / 2, y = j * KID.dy + (KID.dy - 500) / 2;
      s += '<g transform="translate(' + x + ' ' + y + ')">' + ELL(200, 470, 168, 25, 'rgba(0,0,0,.16)') + C(200, 90, 96, col, 8) +
        '<path d="' + roundPoly([[112, 200], [288, 200], [352, 475], [48, 475]], 40) + '" fill="' + col + '" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/>';
      if (p && p.num) {   // 出席番号：絵の左上に白い札。横順（左上から右へ）か 縦順（左上から下へ）
        var no = (p.n0 || 1) + (p.nord === 'v' ? i * ny + j : j * nx + i), t = String(no), bw = Math.max(150, t.length * 95 + 50);
        s += R(-60, -40, bw, 160, '#FFFFFF', 30, 8) + T(-60 + bw / 2, 40, t, 120);
      }
      s += '</g>';
    }
    return s;
  } } } });
  ITEMS.kids.controls = ['grid'];   // 編集画面に「横・縦の人数」を出す（app.js）
  ITEMS.kids.size = function (p) { var n = kidsN(p); return [n.nx * KID.dx, n.ny * KID.dy]; };
  add('teacher', ALL, { name: '{先生|せんせい}', states: one(450, 550, function (w, h) {   // 人の形＋「先」の名札
    return ELL(w / 2, h * 0.94, w * 0.42, h * 0.05, 'rgba(0,0,0,.16)') + C(w / 2, h * 0.18, w * 0.24, '#5B6B78', 8) +
      '<path d="' + roundPoly([[w * 0.26, h * 0.4], [w * 0.74, h * 0.4], [w * 0.9, h * 0.95], [w * 0.1, h * 0.95]], 40) + '" fill="#5B6B78" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/>' +
      C(w / 2, h * 0.66, w * 0.2, '#FFFFFF', 6) + T(w / 2, h * 0.66, '先', w * 0.26);
  }) });
  add('kengaku', ALL, { name: '{見学|けんがく}のいす', states: one(450, 450, function (w, h) {   // 座面＋背もたれ＋「見」
    return R(0, 0, w, h * 0.22, '#7A7F86', 12, 6) + R(w * 0.05, h * 0.18, w * 0.9, h * 0.78, '#9AA6B0', 30, 8) + T(w / 2, h * 0.58, '見', w * 0.4, '#fff');
  }) });

  /* ---- 教室 ---- */
  function deskSvg(x, y, r) {   // 児童の机1台（650×450）を上から。r=180 なら向かい合わせ（いすが上）
    var chair = r ? R(x + 145, y - 300, 360, 260, '#D9874A', 40, 6) : R(x + 145, y + 490, 360, 260, '#D9874A', 40, 6);
    return chair + R(x, y, 650, 450, WOOD, 14, 8);
  }
  add('island', ['class'], { name: '{机|つくえ}の{島|しま}', states: {   // 向かい合わせのグループ
    i4: { w: 1300, d: 1500, draw: function () { return deskSvg(0, 300, 1) + deskSvg(650, 300, 1) + deskSvg(0, 750, 0) + deskSvg(650, 750, 0); } },
    i6: { w: 1950, d: 1500, draw: function () { var s = ''; for (var i = 0; i < 3; i++) s += deskSvg(i * 650, 300, 1) + deskSvg(i * 650, 750, 0); return s; } } } });
  add('ushape', ['class'], { name: 'コの{字|じ}', states: one(5200, 4000, function (w, h) {   // 前が開いたコの字。児童は外がわにすわり内がわを向く
    var s = '', i;
    for (i = 0; i < 8; i++) s += '<g transform="translate(' + (w / 2 - 325 - 650 * 3.5 + i * 650 + 325) + ' ' + (h - 900) + ')">' + deskSvg(-325, 0, 0) + '</g>';
    for (i = 0; i < 4; i++) {
      s += '<g transform="translate(450 ' + (300 + i * 650) + ') rotate(90)">' + deskSvg(-325, -225, 0) + '</g>';
      s += '<g transform="translate(' + (w - 450) + ' ' + (300 + i * 650) + ') rotate(-90)">' + deskSvg(-325, -225, 0) + '</g>';
    }
    return s;
  }) });
  add('monitor', ['class'], { name: '{大型|おおがた}モニター', states: one(1500, 600, function (w, h) {   // スタンド＋画面
    return R(w * 0.2, h * 0.7, w * 0.6, h * 0.3, '#7A7F86', 12, 6) + R(0, 0, w, h * 0.72, '#2B2F35', 16, 8) + R(w * 0.04, h * 0.08, w * 0.92, h * 0.54, '#5C7FA8', 6, 0);
  }) });
  add('worktable', ['class', 'gym'], { name: '{作品|さくひん}の{机|つくえ}', states: one(1800, 600, function (w, h) {   // 長机＋並べた作品
    return R(0, 0, w, h, '#D8C9A8', 14, 10) + R(w * 0.06, h * 0.2, w * 0.24, h * 0.6, '#F2C94C', 6, 6) + R(w * 0.38, h * 0.2, w * 0.24, h * 0.6, '#9BC5E8', 6, 6) + R(w * 0.7, h * 0.2, w * 0.24, h * 0.6, '#E8A0A0', 6, 6);
  }) });
  add('board', ['class', 'gym'], { name: '{掲示板|けいじばん}', states: one(1800, 200, function (w, h) {   // 壁ぎわの細い板
    return R(0, 0, w, h, '#C9A676', 10, 8) + R(w * 0.1, h * 0.15, w * 0.2, h * 0.7, '#FFFFFF', 4, 4) + R(w * 0.4, h * 0.15, w * 0.2, h * 0.7, '#FFFFFF', 4, 4) + R(w * 0.7, h * 0.15, w * 0.2, h * 0.7, '#FFFFFF', 4, 4);
  }) });
  add('locker', ['class'], { name: 'ロッカー', states: one(1800, 400, function (w, h) {   // 3×1の箱が並ぶ（上から）
    var s = R(0, 0, w, h, '#B98A55', 10, 10);
    for (var x = w / 6; x < w; x += w / 6) s += L(x, 0, x, h, 'rgba(0,0,0,.25)', 10);
    return s;
  }) });

  /* ---- 行事 ---- */
  add('longtable', ['class', 'gym', 'field'], { name: '{長机|ながづくえ}', states: { closed: {} },   // 立体（../gym/mesh.js）
    mesh: function () { return GYM.longTable(); } });
  add('pipechairs', ['gym', 'field'], { name: 'パイプいす', states: { c1: {}, c5: {} },   // 立体。5脚は横1列（間隔 50cm）
    mesh: function (p) { return GYM.rowOf(GYM.pipeChair(), stateOf(p) === 'c5' ? 5 : 1, 500); } });
  add('tent', ['field'], { name: 'テント', states: one(5400, 3600, function (w, h) {   // 屋根の4面（上から）＋柱
    return '<path d="M 0 0 L ' + w + ' 0 L ' + w / 2 + ' ' + h / 2 + ' Z" fill="#FFFFFF" stroke="' + INK + '" stroke-width="30" stroke-linejoin="round"/>' +
      '<path d="M 0 ' + h + ' L ' + w + ' ' + h + ' L ' + w / 2 + ' ' + h / 2 + ' Z" fill="#E6EDF3" stroke="' + INK + '" stroke-width="30" stroke-linejoin="round"/>' +
      '<path d="M 0 0 L 0 ' + h + ' L ' + w / 2 + ' ' + h / 2 + ' Z" fill="#2F80ED" stroke="' + INK + '" stroke-width="30" stroke-linejoin="round"/>' +
      '<path d="M ' + w + ' 0 L ' + w + ' ' + h + ' L ' + w / 2 + ' ' + h / 2 + ' Z" fill="#2F80ED" stroke="' + INK + '" stroke-width="30" stroke-linejoin="round"/>';
  }) });
  add('broadcast', ['gym', 'field'], { name: '{放送台|ほうそうだい}', states: one(1800, 900, function (w, h) {   // 机＋アンプ＋マイク
    return R(0, 0, w, h, '#D8C9A8', 14, 10) + R(w * 0.08, h * 0.2, w * 0.4, h * 0.5, '#3A3F45', 8, 6) + C(w * 0.7, h * 0.45, h * 0.12, '#8A8F96', 6) + L(w * 0.7, h * 0.45, w * 0.82, h * 0.25, INK, 14);
  }) });
  add('podium', ['gym', 'field'], { name: '{演台|えんだい}', states: one(900, 600, function (w, h) {   // 天板（前が下がる）＋前の面
    return R(0, 0, w, h * 0.55, '#A0703F', 14, 10) + R(w * 0.04, h * 0.5, w * 0.92, h * 0.5, '#8A5E33', 10, 10) + C(w * 0.5, h * 0.25, h * 0.08, '#3A3F45', 0);
  }) });
  add('hinadan', ['gym'], { name: 'ひな{壇|だん}', states: one(5400, 1800, function (w, h) {   // 3段（奥ほど高い：上ほど濃い）
    return R(0, 0, w, h / 3, '#9A6B3F', 10, 10) + R(0, h / 3, w, h / 3, '#B8895A', 10, 10) + R(0, 2 * h / 3, w, h / 3, '#D3AE84', 10, 10);
  }) });
  /* 文字（床に置く ことば：「ここで待つ」「1班」など）。大きさは 文字数と場所の倍率 K で決まる。拡大・縮小もできる */
  add('words', ['class', 'gym', 'field'], { name: '{文字|もじ}', text: true, colors: ['#FFFFFF', '#F6EDCF', '#DCE8F5', '#FBEEEC'], states: { closed: { w: 600, d: 300, draw: function (w, h, col, p) {
    var t = (p && p.text) || '文字', fs = h * 0.62;
    return R(0, 0, w, h, col, h * 0.25, h * 0.06) + T(w / 2, h / 2, t, fs);
  } } } });
  ITEMS.words.size = function (p) { var t = (p && p.text) || '文字', fs = 30 * K; return [Math.max(fs * 2, textW(t, fs) + fs), fs * 1.6]; };
  /* 床に描く物：ほかの物より いつも下に描く（draw.js の drawOrder） */
  ['startline', 'goalline', 'tape', 'nummark', 'gline', 'fmark'].forEach(function (id) { if (ITEMS[id]) ITEMS[id].floor = true; });
  /* パレットの分け方（group）：thing＝用具・設備（既定）、mark＝矢印・目印、people＝人 */
  ['arrow', 'gline', 'tape', 'startline', 'goalline', 'nummark', 'fmark', 'flag', 'words'].forEach(function (id) { if (ITEMS[id]) ITEMS[id].group = 'mark'; });
  ['person', 'kids', 'classgroup', 'teacher', 'rowdot', 'rowline', 'rowseno'].forEach(function (id) { if (ITEMS[id]) ITEMS[id].group = 'people'; });
  /* 場所を回しても 頭が上のまま（人の絵）。児童の並びは 横と縦の人数を入れかえる（app の turnLayout） */
  ['person', 'teacher', 'kids'].forEach(function (id) { if (ITEMS[id]) ITEMS[id].upright = true; });
  /* 長さを変えられる物：axis＝伸びる向き（d＝縦、w＝横）、mm。列は 50cm＝1人分ずつ */
  [['rowdot', 'd', 500], ['rowline', 'd', 500], ['rowseno', 'd', 500], ['gline', 'w', 500], ['tape', 'w', 250],
   ['startline', 'w', 500], ['goalline', 'w', 500], ['longrope', 'w', 500]].forEach(function (s) {
    if (ITEMS[s[0]]) { ITEMS[s[0]].stretch = { axis: s[1], step: s[2], min: s[2], max: 30000 }; (ITEMS[s[0]].controls = ITEMS[s[0]].controls || []).push('len'); }
  });
})();

/* ---- 矢印の「じゆう」：交点を結ぶ折れ線 ---- */
function isPath(p) { return p.item === 'arrow' && stateOf(p) === 'path' && Array.isArray(p.pts) && p.pts.length >= 2; }
function pathBox(p) {   // p.x,p.y からのずれで、線の太さ・矢じりの分を足した範囲
  var m = 500 * scaleOf(p), xs = p.pts.map(function (q) { return q[0]; }), ys = p.pts.map(function (q) { return q[1]; });
  return { x0: Math.min.apply(null, xs) - m, x1: Math.max.apply(null, xs) + m, y0: Math.min.apply(null, ys) - m, y1: Math.max.apply(null, ys) + m };
}
function pathArrowSvg(p) {
  var s = scaleOf(p), P = p.pts, n = P.length, T = P[n - 1], B = P[n - 2];
  var dx = T[0] - B[0], dy = T[1] - B[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  var hl = Math.min(750 * s, L * 0.9), hw = 850 * s, bx = T[0] - ux * hl, by = T[1] - uy * hl;
  var d = 'M ' + P.slice(0, n - 1).map(function (q) { return q[0] + ' ' + q[1]; }).join(' L ') + ' L ' + bx + ' ' + by;
  var col = colorOf(p);
  return arrowShaft(d, 300 * s, col) + arrowHead([[bx - uy * hw / 2, by + ux * hw / 2], [T[0], T[1]], [bx + uy * hw / 2, by - ux * hw / 2]], col);
}
ITEMS.arrow.custom = function (p) { return isPath(p) ? { box: pathBox(p), draw: function () { return pathArrowSvg(p); } } : null; };
ITEMS.arrow.controls = ['path'];   // 編集画面に「矢印をのばす」を出す（app.js）
