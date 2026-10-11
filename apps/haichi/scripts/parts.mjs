// 配置図の部品の置き場。build.mjs と tests が同じ表を読む。
import fs from "node:fs";
import path from "node:path";
export const APP = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
export const ROOT = path.resolve(APP, "../..");
// @include の名前 → 正本のファイル。物と場は assets が正本（このアプリは読むだけ）
export const FILES = {
  "base.css": "assets/ui/base.css",
  "tokens.css": "apps/haichi/src/tokens.css",
  "style.css": "apps/haichi/src/style.css",
  "data.js": "assets/objects/desk/data.js",
  "extra.js": "assets/objects/desk/extra.js",
  "mesh.js": "assets/objects/gym/mesh.js",
  "items.js": "assets/objects/gym/items.js",
  "scenes.js": "apps/haichi/src/scenes.js",
  "draw.js": "assets/objects/desk/draw.js",
  "app.js": "apps/haichi/src/app.js",
};
// 場の一覧：assets/spaces/<場所>/space.json。床の絵に要る項目だけを持ってくる（動線・隊形は配置図では使わない）
export function spacesJs() {
  const dir = path.join(ROOT, "assets/spaces");
  const list = fs.readdirSync(dir).sort().filter(d => fs.existsSync(path.join(dir, d, "space.json"))).map(d => {
    const s = JSON.parse(fs.readFileSync(path.join(dir, d, "space.json"), "utf8"));
    if (s.extends) throw new Error(d + ": extends を持つ場は配置図に出さない（重ね書きは行事の側の物）");
    const keep = {};
    for (const k of ["id", "title", "status", "up", "size", "areas", "walls", "doors"]) if (s[k] !== undefined) keep[k] = s[k];
    keep.id = d;
    return keep;
  });
  return "var SPACES = " + JSON.stringify(list) + ";";
}
export function read(name) {
  if (name === "spaces.js") return spacesJs();
  if (!FILES[name]) throw new Error("知らない @include: " + name);
  return fs.readFileSync(path.join(ROOT, FILES[name]), "utf8");
}
// テストが vm で読む順（app.js は画面が要るので除く）
export const LOGIC = ["data.js", "extra.js", "mesh.js", "items.js", "spaces.js", "scenes.js", "draw.js"];
