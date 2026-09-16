/**
 * 3年 体育 リレー しりょう ─ ウェブアプリ
 *
 *  ?p=relay   … はんしゅうリレー のうごきかた
 *  ?p=nyutai  … にゅうじょう・たいじょう
 *  無指定     … もくじ
 */

var PAGES = {
  relay:  { file: 'relay',  title: 'はんしゅうリレー のうごきかた' },
  nyutai: { file: 'nyutai', title: 'にゅうじょう・たいじょう' }
};

function doGet(e) {
  var key = (e && e.parameter && e.parameter.p) ? String(e.parameter.p) : '';
  var page = PAGES[key];

  if (!page) {
    var t = HtmlService.createTemplateFromFile('index');
    t.url = getBaseUrl_();
    return finish_(t.evaluate(), '3年 リレー しりょう');
  }
  return finish_(HtmlService.createHtmlOutputFromFile(page.file), page.title);
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
