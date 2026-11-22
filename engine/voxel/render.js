/* ドット立体の描画部（試作）。three は呼ぶ側の importmap で jsDelivr の版を固定して渡す。
   1. ボクセル → メッシュ：隠れた面だけを省く（同色の面の結合はしない。小さな立体では不要、陰影がずれるため）
   2. 低解像度の描画先に描いてから、最も近い画素の拡大で画面に出す（ドット感・GPUの負担減）
   3. 輪郭線：深度の段差を拾う1パス（OutlinePass は描画先が増えるので使わない） */
import * as THREE from "three";

const DIRS = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }
];

/* vox: [{x,y,z,col}]（マスの中心座標）、cell: 1マスの大きさ(m) */
export function voxelGeometry(vox, cell) {
  const key = (x, y, z) => x + "," + y + "," + z;
  const has = new Set(vox.map(v => key(v.x, v.y, v.z)));
  const pos = [], nor = [], col = [], idx = [];
  const tmp = new THREE.Color();
  for (const v of vox) {
    tmp.set(v.col).convertSRGBToLinear();
    for (const d of DIRS) {
      if (has.has(key(v.x + d.n[0], v.y + d.n[1], v.z + d.n[2]))) continue;
      const b = pos.length / 3;
      for (const c of d.c) {
        pos.push((v.x - 0.5 + c[0]) * cell, (v.y - 0.5 + c[1]) * cell, (v.z - 0.5 + c[2]) * cell);
        nor.push(...d.n); col.push(tmp.r, tmp.g, tmp.b);
      }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

export function voxelMaterial() {
  return new THREE.MeshLambertMaterial({ vertexColors: true });
}

const POST_VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
const POST_FS = `
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 texel; uniform vec3 ink; uniform float thr;
varying vec2 vUv;
void main(){
  vec4 c = texture2D(tColor, vUv);
  float d = texture2D(tDepth, vUv).x;
  // 平らな面（床を斜めから見た時も）は深度が一次で変わるので、2階差分で段差だけを拾う
  float l = texture2D(tDepth, vUv-vec2(texel.x,0.)).x, r = texture2D(tDepth, vUv+vec2(texel.x,0.)).x;
  float u = texture2D(tDepth, vUv+vec2(0.,texel.y)).x, b = texture2D(tDepth, vUv-vec2(0.,texel.y)).x;
  float m = max(l + r - 2.0*d, u + b - 2.0*d);
  gl_FragColor = vec4(m > thr ? ink : c.rgb, 1.0);
  #include <colorspace_fragment>
}`;

/* 低解像度描画＋輪郭線。rows：描画先の縦の画素数 */
export function createPixelRenderer(canvas, opt) {
  opt = opt || {};
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  let rows = opt.rows || 270, rt = null;
  const post = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: null }, tDepth: { value: null }, texel: { value: new THREE.Vector2() },
                ink: { value: new THREE.Color(opt.ink || "#1C2B4A").convertSRGBToLinear() }, thr: { value: opt.thr || 0.002 } },
    vertexShader: POST_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post);
  const postScene = new THREE.Scene(); postScene.add(quad);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    const rh = Math.min(rows, h), rw = Math.max(1, Math.round(w * rh / h));
    if (rt) { rt.dispose(); rt.depthTexture.dispose(); }
    rt = new THREE.WebGLRenderTarget(rw, rh, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    rt.depthTexture = new THREE.DepthTexture(rw, rh);
    rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter;
    post.uniforms.tColor.value = rt.texture;
    post.uniforms.tDepth.value = rt.depthTexture;
    post.uniforms.texel.value.set(1 / rw, 1 / rh);
    return { w, h, rw, rh };
  }
  return {
    three: renderer,
    size,
    setRows(n) { rows = n; return size(); },
    /* overlay：低解像度にすると形が崩れる小さな物（ボール等）を、画面の解像度で上に重ねる。
       前後関係は見ない（常に手前）。影は本体の scene に影だけの複製を置いて落とす */
    render(scene, camera, overlay) {
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
      if (overlay) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(overlay, camera); renderer.autoClear = true; }
    }
  };
}
