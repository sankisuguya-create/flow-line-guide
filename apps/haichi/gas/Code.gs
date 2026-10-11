/* 配置図 GAS版（複数人で同時に直せる）。
   置き方：GAS のプロジェクトに このファイル（Code.gs）と Index.html（apps/haichi/gas/Index.html。dist と同じ物）と
   appsscript.json を置き、「ウェブアプリ」として配布する（実行：自分、アクセス：同じ組織のユーザー）。
   データ：初めて開いたときに スプレッドシート「配置図データ」を作る（作った人のドライブ）。1行＝1つの配置。
     列：id ／ json（配置そのもの）／ ver（版。書くたびに +1）／ by（最後に書いた人）／ at（時刻 ms）／ del（消した印）
   同時に直す：書くときは「もとにした版」を受け取り、いまの版とちがえば 書かずに いまの行を返す（画面側でまぜて送り直す）。
   書く・読むは LockService でひとりずつ。 */

var SHEET_NAME = 'layouts';
var COLS = ['id', 'json', 'ver', 'by', 'at', 'del'];
var MAX_JSON = 49000;   // セル1つの上限（50000字）より少し小さく

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('配置図')
    .addMetaTag('viewport', 'width=device-width,initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/* ---- 画面から呼ぶ ---- */
/* cid：画面の端末ごとの印。メールが取れないとき（組織の外など）の名前の代わり */
function haichiList(cid) { return withLock_(function (t) { return haichiCore_(t, me_(cid), Date.now()).list(); }); }
function haichiPut(list, cid) { return withLock_(function (t) { return haichiCore_(t, me_(cid), Date.now()).put(list); }); }
function haichiChanges(since, editing, cid) {
  var core = haichiCore_(sheetTable_(), me_(cid), Date.now());   // 読むだけなので鍵はかけない（画面は 少し前から取り直す）
  var res = core.changes(since);
  res.editors = presence_(editing, me_(cid));
  return res;
}

/* ---- 中身（スプレッドシートに依らない。テストは tests/gas.mjs が 表を差しかえて回す） ----
   table：rows() → [{id,json,ver,by,at,del,_i}]、update(row)、insert(row) */
function haichiCore_(table, user, now) {
  function find(id) { var r = table.rows(); for (var i = 0; i < r.length; i++) if (r[i].id === id) return r[i]; return null; }
  function out(r) { return { id: r.id, json: r.del ? '' : r.json, ver: r.ver, by: r.by, at: r.at, del: !!r.del }; }
  return {
    list: function () {
      return { now: now, me: user, rows: table.rows().filter(function (r) { return !r.del; }).map(out) };
    },
    put: function (list) {
      return list.map(function (x) {
        var row = find(String(x.id)), ver = row ? row.ver : 0;
        if ((+x.ver || 0) !== ver) return { ok: false, row: row ? out(row) : { id: x.id, json: '', ver: 0, del: true } };
        if (x.del) {
          if (row && !row.del) { row.del = true; row.json = ''; row.ver = ver + 1; row.by = user; row.at = now; table.update(row); }
          return { ok: true, del: true, ver: row ? row.ver : 0 };
        }
        var json = String(x.json || '');
        if (json.length > MAX_JSON) throw new Error('配置が大きすぎます（物を減らしてください）');
        JSON.parse(json);   // こわれた物は書かない
        if (row) { row.json = json; row.ver = ver + 1; row.by = user; row.at = now; row.del = false; table.update(row); return { ok: true, ver: row.ver }; }
        table.insert({ id: String(x.id), json: json, ver: 1, by: user, at: now, del: false });
        return { ok: true, ver: 1 };
      });
    },
    changes: function (since) {
      return { now: now, me: user, rows: table.rows().filter(function (r) { return r.at >= (+since || 0); }).map(out) };   // >=：同じ時刻に書かれた物も取りこぼさない（画面側は版で重複を捨てる）
    }
  };
}

/* ---- スプレッドシート ---- */
function sheet_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('SHEET_ID'), ss;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create('配置図データ'); props.setProperty('SHEET_ID', ss.getId()); }
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.getRange(1, 1, 1, COLS.length).setValues([COLS]); sh.setFrozenRows(1); }
  return sh;
}
function sheetTable_() {
  var sh = sheet_(), cache = null;
  function read() {
    if (cache) return cache;
    var n = sh.getLastRow() - 1;
    var v = n > 0 ? sh.getRange(2, 1, n, COLS.length).getValues() : [];
    cache = v.map(function (r, i) { return { id: String(r[0]), json: String(r[1]), ver: +r[2] || 0, by: String(r[3]), at: +r[4] || 0, del: r[5] === true || r[5] === 'TRUE', _i: i + 2 }; });
    return cache;
  }
  function vals(r) { return [r.id, r.json, r.ver, r.by, r.at, !!r.del]; }
  return {
    rows: read,
    update: function (r) { sh.getRange(r._i, 1, 1, COLS.length).setValues([vals(r)]); },
    insert: function (r) { sh.appendRow(vals(r)); r._i = sh.getLastRow(); read().push(r); }
  };
}
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(sheetTable_()); } finally { lock.releaseLock(); }
}
function me_(cid) {
  var e = '';
  try { e = Session.getActiveUser().getEmail(); } catch (x) {}
  return e ? e.split('@')[0] : 'だれか' + (cid ? '-' + String(cid).slice(0, 4) : '');
}
/* だれが どの配置を開いているか（30秒以内に聞いてきた人）。CacheService に置くだけ（消えてもよい） */
function presence_(editing, who) {
  var c = CacheService.getScriptCache(), key = 'presence', now = Date.now(), p = {};
  var lock = LockService.getScriptLock(), locked = lock.tryLock(500);   // 2人が同時に書いて 片方が消えるのを防ぐ（取れなければそのまま）
  try { p = JSON.parse(c.get(key) || '{}'); } catch (e) { p = {}; }
  Object.keys(p).forEach(function (k) { if (now - p[k].at > 30000) delete p[k]; });
  if (editing) p[who] = { id: editing, at: now }; else delete p[who];
  c.put(key, JSON.stringify(p), 120);
  if (locked) lock.releaseLock();
  var out = {};
  Object.keys(p).forEach(function (k) { (out[p[k].id] = out[p[k].id] || []).push(k); });
  return out;
}
