/**
 * 運動会 の しりょう ─ ウェブアプリ
 *
 * 行事ごとに GASプロジェクトを 1つ 作る。これは 運動会 用。
 * 資料を 1本 足すときに 手を 入れるのは 下の PAGES だけ。
 * もくじ（index）は PAGES から 組み立てるので、さわらなくてよい。
 *
 *  ?p=nyutai  … にゅうじょう・まえつめ・たいじょう
 *  ?p=relay   … はんしゅうリレー のうごきかた
 *  無指定     … もくじ
 */

var EVENT_TITLE = 'うんどうかい の しりょう';

/* もくじには 上から この順に 出る。
 *   key   … URLの ?p= に 使う。いちど 児童に 配ったら 変えないこと
 *   file  … GAS上の HTMLファイル名（拡張子なし）
 *   grade … カードの 上に 出る 小さな 文字
 *   title … カードの 見出し。<br> で 改行できる
 *   desc  … カードの 説明
 */
var PAGES = [
  { key: 'nyutai', file: 'nyutai', grade: '3年',
    title: 'にゅうじょう・<br>まえつめ・たいじょう',
    desc:  'テントから どこへ ならぶか。1回戦が 出たら どう つめるか。' },
  { key: 'relay',  file: 'relay',  grade: '3年',
    title: 'はんしゅうリレー<br>の うごきかた',
    desc:  'じぶんが どこに いて、つぎに どこへ 行くのか。' }
];

function doGet(e) {
  var key = (e && e.parameter && e.parameter.p) ? String(e.parameter.p) : '';
  var page = findPage_(key);

  if (!page) {
    var t = HtmlService.createTemplateFromFile('index');
    t.url = getBaseUrl_();
    t.pages = PAGES;
    t.eventTitle = EVENT_TITLE;
    return finish_(t.evaluate(), EVENT_TITLE);
  }
  return finish_(HtmlService.createHtmlOutputFromFile(page.file), tabTitle_(page));
}

function findPage_(key) {
  for (var i = 0; i < PAGES.length; i++) {
    if (PAGES[i].key === key) return PAGES[i];
  }
  return null;
}

/* ブラウザのタブに出す文字。見出しの <br> は取りのぞく */
function tabTitle_(page) {
  return (page.grade ? page.grade + ' ' : '') + page.title.replace(/<br\s*\/?>/g, '');
}

function finish_(out, title) {
  return out
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getBaseUrl_() {
  var url = ScriptApp.getService().getUrl();
  return url ? url : '';
}
