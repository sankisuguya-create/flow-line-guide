# 素材の集約と、計画書から資料を編む仕組み

このリポジトリは、導線資料の**素材（物・場・操作UI）の正本**と、それを使って
**計画書から1ファイルのHTML資料を作る仕組み**を持つ。`kikaku.md` の3層をそのまま使う。

> **このリポジトリは非公開にする。** 校舎・プールの間取り（出入口・通路・死角）は防犯上の機微情報。
> 名簿・児童名は置かない（plan には組・係までしか書かない）。

## 置き場所

| 置き場 | 層 | 中身 |
|---|---|---|
| `objects/<物>/` | 物 | 机・用具などの絵（実寸 mm）。いまは desk-layout の複製（`objects/desk/ORIGIN.md`） |
| `spaces/<場>/space.json` | 場 | 区画・点・通路（実寸 m）。確認状態（仮／確認済）と出典を持つ |
| `core/` | 操作UI | 再生部 `flow.js`・見た目 `flow.css`・ひな形 `page.html` |
| `plans/<行事>/<場面>.json` | 中身 | 組・動き・場面のことば・合図・未確定事項 |
| `gas/<行事>/<場面>.html` | 生成物 | `tools/build.mjs` が作る。直接直さない |
| `tools/` | 道具 | `build.mjs`（生成と検査）・`check.mjs`（ブラウザで撮って確かめる）・`align.html`（間取り合わせ） |

既存の `gas/undokai/nyutai.html` `relay.html` は手書きのまま残す（模擬型のリレーはデータ化しない。`kikaku.md` 1節）。

## space.json

```jsonc
{
  "id": "pool", "title": "プール周り", "unit": "m",
  "status": "仮",                 // 仮 | 確認済。仮のあいだは資料に「仮の地図」と出る
  "sources": [...], "known": [...],  // 出典と、縮尺の根拠にした既知の長さ
  "size": [52, 30],
  "areas": [ { "id", "kind": "deck|water|room|box", "label", "sub?", "rect": [x,y,w,h], "lanes?" } ],
  "points": { "line.1": [29, 18.8], ... },   // 組ごとの場所は <名前>.<組> にする
  "pointLabels": { "kutsu.12": "上ばき 1・2組" },
  "paths": [ ["a","b"], ["a","b",{ "oneway": true }], ["a","b",{ "minutes": 3 }] ],
  "marks": [ { "kind": "oneway", "from", "to", "label" } ]
}
```

- **座標は実寸**（m）。所要時間は「道のり ÷ plan の speed」で出る。地図の外にある遠い場所（教室など）は通路に `minutes` を書く。
- 通路は点と点をつなぐ線。動きは最短の通路をたどるので、plan に道すじは書かない。
- 向き：図の上下左右は現場の目印で決め、`align.html` で写真に重ねて確かめてから `確認済` にする。

## plan.json

```jsonc
{
  "key": "dai1ji",               // 配布URLの ?p= と保存の名前。いちど配ったら変えない
  "title", "subtitle", "space": "pool", "start": "8:25", "end": "10:36", "speed": 0.8,
  "groups": [ { "id": "1", "label": "1組", "script": "swim", "vars": { "c": 1, ... }, "style?": "watch" } ],
  "scripts": { "swim": [
      { "at": "8:25", "place": "room.{c}" },                       // 最初にいる所
      { "at": "8:35", "stagger": 1.5, "to": ["{kutsu}", "kotai.{c}"] },  // 出発時刻＋組の順×stagger分
      { "at": "9:00", "to": [ { "p": "shower", "wait": 1.5 }, "edge.{c}" ] } ] },
  "signals": [ { "at": "9:11", "text": "🔔 ..." } ],
  "phases": [ { "at", "say", "chips", "mine?", "warn?", "by": { "<組id>": { "say", "chips" } } } ],
  "open": [ "計画書で決まっていないこと" ]
}
```

- `{c}` などは groups の `vars` で置きかわる。`k` は同じ script の中の順番（0から）。
- `mine` は組を選んだ時だけ出る、その組だけの1行。`by` は役割ごとの言いかえ（見学など）。
- 先生だけが読む項目（実施判断・塩素・日誌・評価の基準など）は plan に入れない。

## 生成と検査

```bash
node tools/build.mjs plans/suiei/dai1ji.json   # 生成。引数なしで plans/ を全部
node tools/check.mjs gas/suiei/dai1ji.html <撮影先>   # Chromebook幅とスマホ横で撮る
```

`build.mjs` が止める（終了コード1）もの：存在しない点・行けない経路（一方通行の向き違い）・前の到着より早い出発。
知らせるだけのもの：**すれちがい**（2組が2m以内で向かい合って動く）・`open` の未確定事項。
すれちがいは計画の穴であることが多い。時間をずらすか通路を分けるかを先生に聞く。

## 再生の速さ
動いている間は実時間の約10倍（1分＝6秒）、だれも動いていない間は1分＝0.3秒で飛ばす（`core/flow.js`）。
