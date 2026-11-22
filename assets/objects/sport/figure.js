/* 体育の人物のドット立体（正本）。1マス＝40mm、16×32マス（身長約1.28m）。
   人物は「正面のドット絵」を文字の格子で書き、行ごとの奥行き（マス数）で押し出す。
   正面以外の層：頭は後ろ半分を髪、目・口ははだにする。ゼッケンは背中にも出る。
   文字：. 空き h 髪 s はだ e 目 m 口 w シャツ B ゼッケンと帽子（チームの色。真上から見ても色が分かるよう帽子も同じ色）
         p 半ズボン k くつ
   座標：x＝横、y＝高さ、z＝奥行き（+z が正面）。ほかのファイルとぶつからないよう SPORT だけを外に出す。 */
var SPORT = (function () {
"use strict";
var CELL = 0.04; // m
var FRONT = [
  ".....BBBBBB.....",
  "...BBBBBBBBBB...",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  "..hhhhhhhhhhhh..",
  "..hssssssssssh..",
  "..sseesssseess..",
  "..sseesssseess..",
  "..ssssssssssss..",
  "..sssssmmsssss..",
  "..ssssssssssss..",
  "...ssssssssss...",
  "......ssss......",
  "..wwwwwwwwwwww..",
  ".wwwBBBBBBBBwww.",
  ".wwwBBBBBBBBwww.",
  ".swwBBBBBBBBwws.",
  ".s.wBBBBBBBBw.s.",
  ".s.wBBBBBBBBw.s.",
  ".s.wBBBBBBBBw.s.",
  ".ss.BBBBBBBB.ss.",
  "....pppppppp....",
  "....pppppppp....",
  "....pppppppp....",
  "....ppp..ppp....",
  "....sss..sss....",
  "....sss..sss....",
  "....sss..sss....",
  "....sss..sss....",
  "....sss..sss....",
  "...kkkk..kkkk...",
  "...kkkk..kkkk..."
];
var HEAD = 12;                                            // 上から12行が頭
var DEPTH = [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 4, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 4, 4, 4, 4, 4, 5, 5];
var PALETTE = { h:"#2B2320", s:"#F1C7A1", e:"#1A1A1A", m:"#B5534A", w:"#F7F7F4", p:"#26304F", k:"#5A5F6B" };
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
        if (k < d - 1) {
          if (r < HEAD && "sem".indexOf(c) >= 0) c = (k < d / 2) ? "h" : "s";
          else if (c === "e" || c === "m") c = "s";
        }
        out.push({ x: x - W / 2 + 0.5, y: y + 0.5, z: k - d / 2 + 0.5, col: c === "B" ? bibCol : PALETTE[c] });
      }
    }
  }
  return out;
}
return { CELL: CELL, BIBS: BIBS, figure: figure };
})();
