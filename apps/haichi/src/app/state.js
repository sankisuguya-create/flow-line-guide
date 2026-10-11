/* ===== 画面と保存 ===== */
var KEY = 'haichi.v1';   // homeroom-tools の机の配置図（desk-layout.v1）とは別の保存。移すときは書き出し→読み込み
var $ = function (id) { return document.getElementById(id); };

/* ---- 保存：この端末のブラウザだけ。読めない環境では標準の配置で動く ---- */
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function freshState() {
  return { ver: SAVE_VER, layouts: clone(DEFAULT_LAYOUTS), recent: [], prefs: { group: false, chair: false, ruby: true, grid: 'normal', topOnly: false, scene: 'desk', outline: false, spaceText: true } };
}
/* 保存の版。ver が古ければ ここで読み替える（版を上げたら手順を1つ足す）
   2：体育館の標準配置「跳び箱の準備」（古い床に合わせたもの）を捨て、新しい標準配置を足す */
var SAVE_VER = 2;
function migrate(s) {
  var v = s.ver || 1;
  if (v < 2) {
    s.layouts = s.layouts.filter(function (l) { return l.id !== 'g_tobibako'; });
    s.recent = (s.recent || []).filter(function (id) { return id !== 'g_tobibako'; });
    DEFAULT_LAYOUTS.forEach(function (l) { if (/^g_(tobibako3|shukai)$/.test(l.id) && !s.layouts.some(function (x) { return x.id === l.id; })) s.layouts.push(clone(l)); });
  }
  s.ver = SAVE_VER;
  return s;
}
function load() {
  try {
    var raw = Store.load();
    if (raw) {
      var s = JSON.parse(raw);
      if (s && Array.isArray(s.layouts)) {
        var old = s.ver || 1, out = sanitize(migrate(s));
        if (old < SAVE_VER && Store.kind === 'local') try { Store.save(out); } catch (e2) {}   // 読み替えた結果をすぐ残す
        return out;
      }
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
      rot: sc !== 'desk' && [90, 180, 270].indexOf(+l.rot) >= 0 ? +l.rot : undefined,   // 場所の向き（90°ずつ）
      top: l.top.filter(function (p) { return ok(p.item); }).map(function (p) {
        return { item: p.item, state: ITEMS[p.item].states[p.state] ? p.state : Object.keys(ITEMS[p.item].states)[0], x: +p.x || SCENES[sc].w / 2, y: +p.y || SCENES[sc].d / 2, r: +p.r || 0, label: !!p.label,
                 size: ITEMS[p.item].sizes && ITEMS[p.item].sizes[p.size] ? p.size : undefined, color: ITEMS[p.item].colors && p.color != null ? (p.color | 0) : undefined,
                 text: ITEMS[p.item].text && p.text ? String(p.text).slice(0, 16) : undefined,
                 u: p.u ? String(p.u) : undefined,
                 nx: hasCtl(p.item, 'grid') ? kidsN(p).nx : undefined, ny: hasCtl(p.item, 'grid') ? kidsN(p).ny : undefined,
                 pts: hasCtl(p.item, 'path') && Array.isArray(p.pts) ? p.pts.filter(function (q) { return Array.isArray(q) && isFinite(q[0]) && isFinite(q[1]); }).map(function (q) { return [+q[0], +q[1]]; }) : undefined, s: scaleOf(p) !== 1 ? scaleOf(p) : undefined };
      }),
      hooks: sc === 'desk' ? {
        left: ((l.hooks || {}).left || []).filter(isHang).map(function (h) { return { item: h.item, label: !!h.label }; }),
        right: ((l.hooks || {}).right || []).filter(isHang).map(function (h) { return { item: h.item, label: !!h.label }; })
      } : { left: [], right: [] },
      away: sc === 'desk' ? (l.away || []).filter(function (a) { return ITEMS[a.item] && PLACES.some(function (p) { return p.id === a.place; }); })
        .map(function (a) { return { item: a.item, place: a.place, label: !!a.label }; }) : []
    };
  });
  return { ver: SAVE_VER, layouts: layouts, recent: Array.isArray(s.recent) ? s.recent.map(String) : [], prefs: Object.assign(base.prefs, s.prefs || {}) };
}
/* 物が持つ 編集画面の追加の操作（ITEMS の controls）：'grid'＝横・縦の人数、'path'＝矢印をのばす */
function hasCtl(id, c) { return ((ITEMS[id] || {}).controls || []).indexOf(c) >= 0; }
/* 場所を一時的に切り替えて描く（終わったら 元の場所に戻す。戻し忘れを防ぐ） */
function inScene(id, fn, rot) { var keep = SCENE.id, kr = SCENE.rot || 0; useScene(id, rot); try { return fn(); } finally { useScene(keep, kr); } }
function inLayout(l, fn) { return inScene(scOf(l), fn, l.rot); }   // 配置の場所（回した向きも）で描く
function useLayout(l) { useScene(scOf(l), l && l.rot); }
function isHang(h) { return h && ITEMS[h.item] && ITEMS[h.item].kind === 'hang'; }
function save() {
  record();
  try { Store.save(S); } catch (e) { toast('この端末に保存できません（書き出しで保存してください）'); }
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
var sel = -1;            // 編集で選んでいる机の上の物（まとめて選んだときは 最後に選んだ物）
var msel = [];           // まとめて選んだ物の番号（2つ以上のときだけ使う。1つなら sel だけ）
function selected() { return msel.length > 1 ? msel.slice() : sel >= 0 ? [sel] : []; }
function selectOnly(i) { sel = i; msel = []; }
function removeItems(ix) {   // 番号の大きい順に消す（前の番号がずれないように）
  ix.slice().sort(function (a, b) { return b - a; }).forEach(function (i) { cur.top.splice(i, 1); });
  sel = -1; msel = [];
}
var tab = 'top', dest = { hang: 'left', away: 'tray' };

function byId(id) { return S.layouts.filter(function (l) { return l.id === id; })[0]; }
/* ふりがなは「映す」画面（児童が見る）だけ。ほかの画面（先生が使う）は付けない。RUBY は renderShow の間だけ真 */
var RUBY = false;
function rubyHtml(name, yomi) {
  return yomi && RUBY && S.prefs.ruby ? '<ruby>' + esc(name) + '<rt>' + esc(yomi) + '</rt></ruby>' : esc(name);
}
function itemNameHtml(name) {
  return parseName(name).map(function (s) {
    return s.r && RUBY && S.prefs.ruby ? '<ruby>' + esc(s.b) + '<rt>' + esc(s.r) + '</rt></ruby>' : esc(s.b);
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
