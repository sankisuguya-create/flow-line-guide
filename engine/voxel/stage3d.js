/* ラインポートボールの立体の舞台（2Dの画面と切り替えて使う）。
   受け取るのは「その瞬間の駒の位置・ボール」だけ。動きの計算は呼ぶ側（2Dの画面）が持つので、2Dと3Dの動きは必ず一致する。
   座標：呼ぶ側のコート座標（x 0〜20、y 0〜10、m）。帯は x<2 と x>18。
   人のドットは assets/objects/sport/figure.js（グローバルの SPORT）を使う。
   使い方：const st = createStage(親要素, { colorOf:id=>"#…", isGoalman:id=>bool });
           st.update({ p:{id:[x,y]}, h:持つ人のid|null, ball:[x,y]|null }); st.show(true/false); */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { voxelGeometry, voxelMaterial, createPixelRenderer } from "./render.js";

const CW = 20, CH = 10, BAND = 2, CS = 1.6, BIG = 1.6;   // コートと人の倍率は同じ（実寸の比）
const W = (x, y) => [(x - CW / 2) * CS, (y - CH / 2) * CS];

export function createStage(parent, opt) {
  const cv = document.createElement("canvas");
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;image-rendering:pixelated";
  parent.appendChild(cv);
  const pr = createPixelRenderer(cv, { rows: opt.rows || 400 });
  const scene = new THREE.Scene(), overlay = new THREE.Scene();
  scene.background = new THREE.Color(opt.bg || "#F4F1EA");
  [scene, overlay].forEach(s => s.add(new THREE.HemisphereLight("#ffffff", "#8a7a66", 1.6)));
  const sun = new THREE.DirectionalLight("#ffffff", 1.6);
  sun.position.set(-8, 20, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14 * CS, right: 14 * CS, top: 9 * CS, bottom: -9 * CS, near: 1, far: 100 });
  scene.add(sun);
  const sun2 = sun.clone(); sun2.castShadow = false; overlay.add(sun2);

  /* 床：2Dの画面と同じ色づかい（コート・帯・センターライン） */
  {
    const S = 48, M = 4, c = document.createElement("canvas"); c.width = (CW + M * 2) * S; c.height = (CH + M * 2) * S;
    const g = c.getContext("2d");
    g.fillStyle = "#D8B488"; g.fillRect(0, 0, c.width, c.height);
    g.setTransform(S, 0, 0, S, M * S, M * S);
    g.fillStyle = "#E9D9B4"; g.fillRect(0, 0, CW, CH);
    g.fillStyle = "rgba(242,200,106,.75)"; g.fillRect(0, 0, BAND, CH); g.fillRect(CW - BAND, 0, BAND, CH);
    g.strokeStyle = "#555"; g.lineWidth = 0.08; g.strokeRect(0, 0, CW, CH);
    g.beginPath(); g.moveTo(CW / 2, 0); g.lineTo(CW / 2, CH); g.stroke();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry((CW + M * 2) * CS, (CH + M * 2) * CS), new THREE.MeshLambertMaterial({ map: tex }));
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true; scene.add(m);
  }

  /* 人：色ごとに形を1つ。頭の上に文字（A〜E）を画面の解像度で出す */
  const mat = voxelMaterial(), geo = {}, figs = {};
  const geoOf = col => geo[col] || (geo[col] = voxelGeometry(SPORT.figure(col), SPORT.CELL));
  function label(text, bg, ring) {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fillStyle = bg; g.fill();
    g.lineWidth = ring ? 7 : 4; g.strokeStyle = ring || "#fff"; g.stroke();
    g.fillStyle = "#fff"; g.font = "bold 36px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 32, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
    s.scale.set(0.55 * CS, 0.55 * CS, 1); s.renderOrder = 2; return s;   // 正射影なので大きさはコートの m で決まる
  }
  function fig(id) {
    if (figs[id]) return figs[id];
    const col = opt.colorOf(id), m = new THREE.Mesh(geoOf(col), mat);
    m.castShadow = true; m.scale.setScalar(BIG); scene.add(m);
    const lb = label(opt.letterOf ? opt.letterOf(id) : id, col, opt.isGoalman && opt.isGoalman(id) ? "#F2A400" : null);
    overlay.add(lb);
    return (figs[id] = { m, lb, x: null, y: null });
  }

  /* ボール：なめらかな球を画面の解像度で重ねる。影は影だけの複製で落とす */
  const bg = new THREE.SphereGeometry(0.105, 24, 16);
  const ball = new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ color: "#FFFFFF" }));
  const ballSh = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  ballSh.castShadow = true; overlay.add(ball); scene.add(ballSh);
  [ball, ballSh].forEach(m => m.scale.setScalar(BIG));

  /* カメラ：正射影。真上・斜め・横＋指で回す */
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.5, 160);
  const ctl = new OrbitControls(cam, cv);
  ctl.enableDamping = false; ctl.enablePan = false; ctl.maxPolarAngle = THREE.MathUtils.degToRad(86);
  ctl.minZoom = 0.8; ctl.maxZoom = 6;
  const VIEWS = { top: [0.001, 0], oblique: [55, 0], side: [84, 0] };
  function view(name) {
    const [pol, az] = VIEWS[name].map(THREE.MathUtils.degToRad), r = 70;
    cam.position.set(r * Math.sin(pol) * Math.sin(az), r * Math.cos(pol), r * Math.sin(pol) * Math.cos(az));
    cam.zoom = 1; ctl.target.set(0, 0, 0); cam.updateProjectionMatrix(); ctl.update(); dirty = true;
  }
  function resize() {
    const { w, h } = pr.size(), half = 12 * CS, a = w / h;
    if (a >= 24 / 14) { cam.top = half * 0.58; cam.bottom = -cam.top; cam.right = cam.top * a; cam.left = -cam.right; }
    else { cam.right = half; cam.left = -half; cam.top = half / a; cam.bottom = -cam.top; }
    cam.updateProjectionMatrix(); dirty = true;
  }
  ctl.addEventListener("change", () => dirty = true);

  /* 駒の位置を受け取る。向きは 動いた向き、止まっていれば ボールの方 */
  let dirty = true, on = false, last = null;
  function update(V) {
    last = V;
    const hp = V.h && V.p[V.h];
    const bp = V.ball || (hp ? [hp[0], hp[1]] : [CW / 2, CH / 2]);
    for (const id in V.p) {
      const f = fig(id), [x, y] = V.p[id], [X, Z] = W(x, y);
      if (f.x != null && Math.hypot(x - f.x, y - f.y) > 0.02) f.m.rotation.y = Math.atan2(x - f.x, y - f.y);
      else if (id !== V.h || !V.ball) f.m.rotation.y = Math.atan2(bp[0] - x, bp[1] - y);
      f.x = x; f.y = y;
      f.m.position.set(X, 0, Z);
      f.lb.position.set(X, 1.55 * BIG, Z);
    }
    let bx, by, bh;
    if (V.ball) { [bx, by] = V.ball; bh = 1.0; }
    else if (hp) { const a = figs[V.h].m.rotation.y; bx = hp[0] + Math.sin(a) * 0.25; by = hp[1] + Math.cos(a) * 0.25; bh = 0.75; }
    else { bx = CW / 2; by = CH / 2; bh = 0.105; }
    const [BX, BZ] = W(bx, by);
    [ball, ballSh].forEach(m => m.position.set(BX, bh * BIG, BZ));
    dirty = true;
  }
  function loop() {
    if (on && dirty) { pr.render(scene, cam, overlay); dirty = false; }
    requestAnimationFrame(loop);
  }
  function show(v) { on = v; cv.style.display = v ? "block" : "none"; if (v) { resize(); dirty = true; } }
  addEventListener("resize", () => on && resize());
  show(false); view("oblique"); requestAnimationFrame(loop);
  return { update, show, view, setRows(n) { pr.setRows(n); resize(); }, get last() { return last; } };
}
