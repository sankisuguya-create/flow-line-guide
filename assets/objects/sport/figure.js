/* 体育の人物・ボールのドット立体（正本）。1マス＝80mm。
   人物は「正面のドット絵」と「背面のドット絵」を文字の格子で書き、行ごとの奥行き（マス数）で押し出す。
   文字：. 空き h 髪 s はだ e 目 w シャツ B ゼッケンと帽子（チームの色に差し替え。真上から見た時に色が見えるよう帽子もこの色） p 半ズボン k くつ
   座標：x＝横、y＝高さ、z＝奥行き（+z が正面）。ほかのファイルとぶつからないよう SPORT だけを外に出す。 */
var SPORT = (function () {
"use strict";
var CELL = 0.08; // m
var FRONT = [
  "..BBBB..",
  ".BBBBBB.",
  ".hesseh.",
  ".hssssh.",
  "..ssss..",
  "..wwww..",
  ".wBBBBw.",
  "wwBBBBww",
  "swBBBBws",
  "s.BBBB.s",
  "..pppp..",
  "..pppp..",
  "..s..s..",
  "..s..s..",
  "..s..s..",
  ".kk..kk."
];
var BACK_HEAD = [ "..BBBB..", ".BBBBBB.", ".hhhhhh.", ".hhhhhh.", "..hhhh.." ];
var DEPTH = [4,4,4,4,4, 3,3,3,3,3,3,3, 2,2,2,3];
var PALETTE = { h:"#2B2320", s:"#F1C7A1", e:"#1A1A1A", w:"#F7F7F4", p:"#26304F", k:"#5A5F6B" };
/* ゼッケン6色。color-coding の検査前の仮値 */
var BIBS = [
  { id:"red",    name:"赤",   col:"#D7372B" },
  { id:"yellow", name:"黄色", col:"#F2C230" },
  { id:"blue",   name:"青",   col:"#2E6BD3" },
  { id:"green",  name:"緑",   col:"#2E9A4F" },
  { id:"black",  name:"黒",   col:"#2C2C2E" },
  { id:"white",  name:"白",   col:"#FBFBF8" }
];

/* 人物のボクセル：[{x,y,z,col}]（足元の中心が原点） */
function figure(bibCol) {
  var out = [], H = FRONT.length, W = FRONT[0].length;
  for (var r = 0; r < H; r++) {
    var y = H - 1 - r, d = DEPTH[r];
    for (var x = 0; x < W; x++) {
      var f = FRONT[r][x]; if (f === ".") continue;
      for (var k = 0; k < d; k++) {
        var c = f;
        if (k < d - 1) {                       // 正面以外の層：頭は髪、目ははだ
          if (r < BACK_HEAD.length) c = BACK_HEAD[r][x] === "." ? "s" : BACK_HEAD[r][x];
          else if (c === "e") c = "s";
        }
        out.push({ x: x - W / 2 + 0.5, y: y + 0.5, z: k - d / 2 + 0.5, col: c === "B" ? bibCol : PALETTE[c] });
      }
    }
  }
  return out;
}
/* ボール：3×3×3 から角8つを抜いた形（約240mm） */
function ball(col) {
  var out = [];
  for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
    if (Math.abs(x) + Math.abs(y) + Math.abs(z) === 3) continue;
    out.push({ x: x, y: y + 1.5, z: z, col: col || "#F08A24" });
  }
  return out;
}
return { CELL: CELL, BIBS: BIBS, figure: figure, ball: ball };
})();
