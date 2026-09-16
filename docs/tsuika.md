# 資料を1本足す手順

設計方針は `kikaku.md`。ここは手順だけ。

---

## 1. 置き場所を決める

```
guides/<行事>/<学年>-<場面>/index.html
```

`<行事>` は `undokai` `ongakukai` `shikiten` などローマ字・小文字。
`<学年>` は `3nen` `zengaku` など。`<場面>` は `nyutaijo` `relay` `idou` など。

例：`guides/ongakukai/zengaku-idou/index.html`

**GAS上のファイル名は `<場面>` をそのまま使う。** 行事はプロジェクトが分かれているので
接頭辞は要らない。`<場面>` が行事の中で重ならないようにすること。

## 2. 型を選ぶ

| 型 | 見分け方 | 作り方 |
|---|---|---|
| 導線型 | 決めた通りに動くだけ | `guides/undokai/3nen-nyutaijo/index.html` を複製して中身を差し替える |
| 模擬型 | 「誰が何番目に着くか」が結果を変える | 層1・層2だけ流用し、中身は個別に書く |

判定を誤ると作り直しになる。`kikaku.md` 1節を読むこと。

## 3. 作る

単一ファイルで完結させる。外部CSS・外部JS・外部画像を使わない。
ダブルクリックでブラウザが開けば動くこと。GASにそのまま貼れることが要件。

向きは必ず紙で確認してから作る。180度回転の作り直しは高くつく。

## 4. GAS版を作る

`guides` 版をコピーし、CSSを2行だけ差し替える。手で書き換えず、この場で置換する。

```bash
sed -e 's|^  html,body{margin:0;padding:0;height:100%;overflow:hidden}$|  html,body{margin:0;padding:0;height:100%;min-height:540px;overflow:hidden}|' \
    -e 's|^  \.app{position:fixed;inset:0;display:flex}$|  .app{position:relative;display:flex;height:100%;min-height:540px}|' \
    guides/<行事>/<学年>-<場面>/index.html > gas/<行事>/<場面>.html

diff guides/<行事>/<学年>-<場面>/index.html gas/<行事>/<場面>.html
```

diff が**2箇所だけ**であることを確認する。3箇所以上出たら置換が失敗している。

## 5. もくじに載せる

`gas/<行事>/Code.gs` の `PAGES` に1行足す。**これだけ。**

```js
{ key: 'idou', file: 'idou', grade: '4年',
  title: 'たいいくかんへ<br>の いどう',
  desc:  'きょうしつから どの ろうかを 通るか。' }
```

`index.html`（もくじ）は触らない。`PAGES` から組み立てている。

`key` は配布URLの `?p=` になる。**いちど児童に配ったら変えない。**

## 6. 新しい行事なら

`gas/<行事>/` を作り、`gas/undokai/` の `Code.gs` `index.html` `README.md` を
複製して `EVENT_TITLE` と `PAGES` を書き換える。GASプロジェクトも新しく作る。
手順は `gas/README.md`。

## 7. 確認

- 手元でダブルクリックして開く
- 場面を全部切り替え、時間バーを端から端まで動かす
- CZ1104FM2A（4GB機）の実機で再生を確認する
- `README.md` の「収録している資料」に1項目足す
