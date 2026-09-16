# GAS配信の方針

**行事ごとにGASプロジェクトを1つ作る。** 1ディレクトリ＝1プロジェクト＝1URL。

```
gas/
└─ undokai/      運動会用プロジェクト（Code.gs ＋ もくじ ＋ 資料HTML）
```

音楽会を足すときは `gas/ongakukai/` を作り、別のGASプロジェクトとしてデプロイする。

## なぜ分けるか

- 行事が終わったら、そのURLごと放置してよい。もくじに古い資料が残らない
- 1プロジェクトが肥大しない。GASエディタでの貼りつけ作業が行事単位で閉じる
- 配布リンクが行事ごとに独立する。運動会の更新が音楽会のURLに影響しない

代償は、行事の数だけデプロイ作業が要ること。児童は行事ごとに別のリンクを開く。

## 各プロジェクトの中身

| ファイル | 役割 |
|---|---|
| `Code.gs` | `PAGES` に資料を1箇所で定義。ルーティングともくじへの受け渡し |
| `index.html` | もくじ。`PAGES` から組み立てる。**資料を足しても触らない** |
| `<場面>.html` | 資料の本体。`guides/` 版のコピー（CSS2行だけ違う） |
| `README.md` | そのプロジェクトの公開手順 |

資料を1本足す手順は `../docs/tsuika.md`。

## guides版とのちがい

`gas/*/<場面>.html` は `guides/<行事>/<学年>-<場面>/index.html` のコピーで、
**差分はCSS2行だけ**。GASがiframeで表示するため、高さの指定が異なる。

```
guides: html,body{margin:0;padding:0;height:100%;overflow:hidden}
        .app{position:fixed;inset:0;display:flex}
gas:    html,body{margin:0;padding:0;height:100%;min-height:540px;overflow:hidden}
        .app{position:relative;display:flex;height:100%;min-height:540px}
```

**中身を直したら両方に反映すること。** 反映できたかは diff で確かめる。
上の2行以外の差分が出たら、どちらかが古い。

```bash
diff guides/undokai/3nen-nyutaijo/index.html gas/undokai/nyutai.html
```

一本化していないのは、gas版が4GB機で動作確認済みの状態だからで、
統合すると再確認が要る。資料が増えて実害が出たら `../docs/kikaku.md` 4節を読んで判断する。
