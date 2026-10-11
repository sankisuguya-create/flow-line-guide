# 机の上・教室・体育館・運動場の物（正本）

homeroom-tools の机の配置図（`apps/desk-layout`、コミット 81eccc7）から移した。いまは**ここが正本**。
desk-layout は homeroom-tools から消し、配置図アプリは `apps/haichi/` に移した。

- `data.js`：場所（SCENES）・物（ITEMS）・標準の配置。寸法の出典は `apps/haichi/spec.md`
- `draw.js`：上から見た図・横から見た図・グリッド。立体の物（`../gym/items.js`）と場の床（`apps/haichi/src/scenes.js`）もここから描く

中身：
- 教室：机の上の用具（ノート・教科書・筆箱・パソコン・習字・絵の具 など）、児童の机といす、教卓、棚
- 体育館：平均台、鉄棒、トランポリン、ボール、ライン（跳び箱・ロイター板・マットは `../gym/items.js` の立体が同じ id で上書きする）
- 運動場：うんてい、砂場、タイヤ、サッカーゴール、コーン、マーカー
- 共通：人、列（ドット・ライン・背の順）、矢印

直したら `node apps/haichi/scripts/build.mjs` と `node apps/haichi/tests/test-app.mjs`。
