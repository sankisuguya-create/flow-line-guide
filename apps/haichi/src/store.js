/* ===== 保存のしかた（2通り）=====
   同じ1ファイルが どちらでも動く。GAS（google.script.run がある）なら「共有」、ないなら「この端末だけ」。
   ・この端末だけ（HTML単体版）：localStorage に まるごと保存。
   ・共有（GAS版）：配置は スプレッドシートの1行＝1つの配置（gas/Code.gs）。表示の設定・最近使った順は 端末ごと。
     複数人が同時に直してもよい：
       - 直すたびに少し待って（SYNC_WAIT）変わった配置だけを送る。送るときは「もとにした版（ver）」を添える。
       - だれかが先に書いていたら（版がちがう）、3方向でまぜる（merge3）：もと・自分・相手 を物（u）ごとにくらべ、
         自分が変えた所は自分、相手が変えた所は相手、両方が変えた物は自分を優先する。
       - 数秒ごと（POLL_MS）に ほかの人の変更を取りに行き、同じようにまぜて画面を描き直す。
       - だれが同じ配置を開いているかも このときに受け取る（編集中の名前を出す）。 */
var SYNC_WAIT = 700, POLL_MS = 4000;

/* 物の名前札 u：まぜるときに「同じ物」を見分けるための短い id。無い物・重なった物には つけ直す */
function newUid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); }
function ensureUids(l) {
  var seen = {};
  (l.top || []).forEach(function (p) { if (!p.u || seen[p.u]) p.u = newUid(); seen[p.u] = 1; });
  return l;
}

/* 3方向でまぜる。base：自分と相手が もとにした版、mine：自分、theirs：相手（いまの保存）。どれも配置（JSON の物） */
function merge3(base, mine, theirs) {
  var js = JSON.stringify, out = {};
  var keys = {};
  [base, mine, theirs].forEach(function (o) { Object.keys(o || {}).forEach(function (k) { if (k !== 'top') keys[k] = 1; }); });
  Object.keys(keys).forEach(function (k) {   // 配置そのものの項目（名前・床の色・フック…）：自分が変えていれば自分
    var b = base ? base[k] : undefined, m = mine[k], t = theirs[k];
    var v = js(m) !== js(b) ? m : t;
    if (v !== undefined) out[k] = v;
  });
  var byU = function (l) { var o = {}; ((l && l.top) || []).forEach(function (p) { o[p.u] = p; }); return o; };
  var B = byU(base), M = byU(mine), T = byU(theirs), top = [];
  (theirs.top || []).forEach(function (t) {   // 相手の並び順を土台に
    var u = t.u, b = B[u], m = M[u];
    if (b && !m) { if (js(t) !== js(b)) top.push(t); return; }   // 自分が消した：相手も変えていなければ消す
    top.push(m && js(m) !== js(b) ? m : t);
  });
  (mine.top || []).forEach(function (m) {
    var u = m.u;
    if (T[u]) return;
    if (!B[u]) { top.push(m); return; }                          // 自分が足した
    if (js(m) !== js(B[u])) top.push(m);                          // 相手が消したが 自分が変えていた：残す
  });
  out.top = top;
  return out;
}

var Store = (function () {
  var gas = typeof google !== 'undefined' && google.script && google.script.run;
  if (!gas) return {   // ===== この端末だけ =====
    kind: 'local',
    load: function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    save: function (s) { localStorage.setItem(KEY, JSON.stringify(s)); },
    start: function () {}
  };

  /* ===== 共有（GAS）===== */
  var base = {}, timer = null, busy = false, again = false, since = 0, editors = {}, me = '', onRemote = null, ready = false;
  function LOCAL() { return KEY + '.mine'; }   // 端末ごとの物（表示の設定・最近使った順）と、すぐ開くための写し（KEY は app/state.js）
  function call(name, args, ok, ng) {
    var r = google.script.run.withSuccessHandler(ok).withFailureHandler(ng || function (e) { toast('共有の保存に失敗しました：' + (e && e.message || e)); });
    r[name].apply(r, args);
  }
  function pending() {   // 送っていない変更：版つきの配置ごと
    var out = [], now = {};
    S.layouts.forEach(function (l) { ensureUids(l); now[l.id] = 1; var j = JSON.stringify(l); if (!base[l.id] || base[l.id].json !== j) out.push({ id: l.id, json: j, ver: base[l.id] ? base[l.id].ver : 0 }); });
    Object.keys(base).forEach(function (id) { if (!now[id]) out.push({ id: id, del: true, ver: base[id].ver }); });
    return out;
  }
  function sync() {
    timer = null;
    if (!ready) return;
    if (busy) { again = true; return; }
    var list = pending(); if (!list.length) return;
    busy = true;
    call('haichiPut', [list], function (res) {
      busy = false;
      var merged = false;
      res.forEach(function (r, k) {
        var sent = list[k];
        if (r.ok) { if (r.del) delete base[sent.id]; else base[sent.id] = { json: sent.json, ver: r.ver }; return; }
        // 先にだれかが書いていた：まぜて もう一度送る
        merged = applyRemote(r.row, true) || merged;
      });
      if (merged || again) { again = false; schedule(); }
      saveMine();
    }, function (e) { busy = false; toast('共有の保存に失敗しました（あとで送り直します）'); schedule(3000); });
  }
  function schedule(ms) { if (timer) clearTimeout(timer); timer = setTimeout(sync, ms || SYNC_WAIT); }
  /* 相手の版 row（{id, json, ver, by, del}）を取り込む。自分に送っていない変更があれば まぜる。描き直しが要れば true */
  function applyRemote(row, conflict) {
    var i = S.layouts.findIndex(function (l) { return l.id === row.id; }), local = i >= 0 ? S.layouts[i] : null;
    var b = base[row.id], localJ = local ? JSON.stringify(local) : null, dirty = b ? localJ !== b.json : !!local;
    if (row.del) {
      if (local && !dirty) S.layouts.splice(i, 1);
      if (local && dirty) { delete base[row.id]; return true; }   // 自分が直している途中：自分の分を新しく送る
      delete base[row.id];
      return !!local;
    }
    // 相手の版は 読み替え（sanitize）をかけた形で基準にする。生の JSON のままだと 形のちがいだけで「変わった」と見て
    // 送り合いが止まらなくなる
    var theirs = sanitize({ layouts: [JSON.parse(row.json)] }).layouts[0];
    if (!theirs) return false;
    var next = local && dirty ? merge3(b ? JSON.parse(b.json) : null, local, theirs) : theirs;
    base[row.id] = { json: JSON.stringify(theirs), ver: row.ver };
    var clean = next === theirs ? theirs : sanitize({ layouts: [next] }).layouts[0];
    if (!clean) return false;
    if (local) {   // 同じ物（配置の入れ物）を書きかえる：cur がこれを指していても そのまま使える
      Object.keys(local).forEach(function (k) { delete local[k]; });
      Object.keys(clean).forEach(function (k) { local[k] = clean[k]; });
    } else S.layouts.push(clean);
    if (onRemote) onRemote(row.id, row.by, conflict);
    return true;
  }
  function poll() {
    if (!ready || document.hidden || busy || (typeof drag !== 'undefined' && drag) || (typeof pan !== 'undefined' && pan)) return;   // 引きずっている間は取りに行かない
    call('haichiChanges', [since, (typeof cur !== 'undefined' && cur && !$('vEdit').hidden) ? cur.id : ''], function (res) {
      since = res.now; editors = res.editors || {}; me = res.me || me;
      var any = false;
      res.rows.forEach(function (row) { if (!base[row.id] || base[row.id].ver < row.ver || row.del) any = applyRemote(row, false) || any; });
      if (any) { saveMine(); schedule(); }
      if (Store.onPresence) Store.onPresence(editors);
    }, function () {});
  }
  function saveMine() { try { localStorage.setItem(LOCAL(), JSON.stringify({ prefs: S.prefs, recent: S.recent, layouts: S.layouts })); } catch (e) {} }
  return {
    kind: 'gas',
    load: function () { try { return localStorage.getItem(LOCAL()); } catch (e) { return null; } },   // まず端末の写しで すぐ開く
    save: function (s) { saveMine(); schedule(); },
    editors: function (id) { return (editors[id] || []).filter(function (n) { return n !== me; }); },
    /* 起動：共有の配置をすべて受け取り、写しと入れかえる。初めて（空）なら 標準の配置を送る */
    start: function (done, remote) {
      onRemote = remote;
      call('haichiList', [], function (res) {
        since = res.now; me = res.me || '';
        if (!res.rows.length) {
          S.layouts.forEach(ensureUids);
          ready = true; schedule(10); done(); setInterval(poll, POLL_MS); return;
        }
        base = {};
        var layouts = [];
        res.rows.forEach(function (r) { if (r.del) return; base[r.id] = { json: r.json, ver: r.ver }; layouts.push(JSON.parse(r.json)); });
        S.layouts = sanitize({ layouts: layouts }).layouts;
        S.layouts.forEach(function (l) { if (base[l.id]) base[l.id].json = JSON.stringify(l); });   // 読み替え（sanitize）の結果を基準にする
        ready = true; saveMine(); done();
        setInterval(poll, POLL_MS);
      }, function (e) { toast('共有の配置を読めません：' + (e && e.message || e)); done(); });
    }
  };
})();
