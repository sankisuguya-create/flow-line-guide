/* 体育館の用具の立体（正本）。実寸 mm。
   座標：X＝幅、Y＝長さ（+Y が 助走してくる側＝地図の下）、Z＝高さ。
   使う所：sampler.html（見方の比較）、apps/haichi（配置図。地図用の見方 plan(0.5) で描く）。
   ほかのファイルと名前がぶつからないよう、GYM ひとつだけを外に出す。 */
var GYM = (function () {
"use strict";
var SPEC={
  tobibako:{ name:"跳び箱", note:"仮：小型8段 上面700×300・底面900×640・高さ1000mm（1段目300、2段目から100）",
             top:{L:700,W:300}, bottom:{L:900,W:640}, h1:300, hn:100, pad:50, tiers:8 },
  mat:{ name:"白マット", sizes:{ L:{W:1200,L:2400,T:60,quilt:5,handles:5,note:"9号：幅1200×長さ2400×厚さ60mm（製品の表示）"},
                                 S:{W:900,L:1800,T:50,quilt:4,handles:4,note:"6号：幅900×長さ1800×厚さ50mm（製品の表示）"} } },
  thick:{ name:"厚いマット（2つ折り）", note:"幅2000×長さ3000×厚さ400／500mm（製品の表示）。長さの中ほどで2つに折れる", W:2000, L:3000, handles:4 },
  cone:{ name:"カラーコーン", note:"仮：高さ700mm、台380mm角（一般的な大きさ）", H:700, base:380, baseT:40, r0:150, r1:22, band:[330,450] },
  board:{ name:"ロイター板", note:"仮：長さ1000×幅600、低い端50mm〜高い端180mm。助走は低い端から", L:1000, W:600, lo:50, hi:180, layer:30 }
};
var C={ wood:"#C98A4B", woodLt:"#DDA862", pad:"#F4EFE2", slit:"#3A2A1C", mat:"#F1EEE6", matSide:"#DCD5C6", stitch:"#C9C1B0",
        green:"#2F8A4F", black:"#222", edge:"#5A3A1E", handle:"#FFFFFF",
  thick:"#E9EDF3", thickSide:"#D3DAE4", thickEdge:"#8D99AA", grip:"#2E5E46", cone:"#E8541E", coneDark:"#2B2B2B", white:"#F7F7F7" };

/* ===== 立体の部品 ===== */
function v3(x,y,z){ return [x,y,z]; }
function addFrustum(F,za,zb,d0,d1,col,o){            // 角錐台（跳び箱の段）。o.num：助走側(+Y)の面の番号、o.sharp：丸めない辺
  o=o||{};
  var a=[[-d0.W/2,-d0.L/2,za],[d0.W/2,-d0.L/2,za],[d0.W/2,d0.L/2,za],[-d0.W/2,d0.L/2,za]];
  var b=[[-d1.W/2,-d1.L/2,zb],[d1.W/2,-d1.L/2,zb],[d1.W/2,d1.L/2,zb],[-d1.W/2,d1.L/2,zb]];
  for(var i=0;i<4;i++){ var j=(i+1)%4;
    F.push({p:[a[i],a[j],b[j],b[i]],col:col,num:(i===2?o.num:null),slit:o.slit,h:zb-za,edge:C.edge,
            sharp:o.sharp==="top"?[2,3]:o.sharp==="bottom"?[0,1]:[]}); }
  F.push({p:[b[0],b[1],b[2],b[3]],col:o.capCol||col,edge:C.edge});
}
function addBox(F,x0,x1,y0,y1,z0,z1,cols,edge){        // 直方体（cols：top/side/end）
  var P=function(x,y,z){return [x,y,z];};
  F.push({p:[P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1)],col:cols.top,edge:edge,top:true});
  F.push({p:[P(x1,y0,z0),P(x1,y1,z0),P(x1,y1,z1),P(x1,y0,z1)],col:cols.side,edge:edge});
  F.push({p:[P(x0,y1,z0),P(x0,y0,z0),P(x0,y0,z1),P(x0,y1,z1)],col:cols.side,edge:edge});
  F.push({p:[P(x0,y0,z0),P(x1,y0,z0),P(x1,y0,z1),P(x0,y0,z1)],col:cols.end,edge:edge});
  F.push({p:[P(x1,y1,z0),P(x0,y1,z0),P(x0,y1,z1),P(x1,y1,z1)],col:cols.end,edge:edge});
}
function outward(F,c){                                 // 外向きにそろえる（中心から離れる向き）
  F.forEach(function(f){ if(f.line) return; var n=normal(f.p), m=centroid(f.p);
    if(dot(n,sub(m,c))<0) f.p.reverse(); });
}

/* ===== 用具ごとの立体 ===== */
function tobibako(dan){
  var S=SPEC.tobibako, T=S.tiers, Htot=S.h1+S.hn*(T-1), F=[];
  function dims(z){ var u=z/Htot; return {L:S.bottom.L+(S.top.L-S.bottom.L)*u, W:S.bottom.W+(S.top.W-S.bottom.W)*u}; }
  var lv=[], z=0; for(var k=T;k>=1;k--){ var h=k===1?S.h1:S.hn; lv.push([z,z+h,k]); z+=h; }
  var use=lv.slice(T-dan), z0=use[0][0];
  use.forEach(function(l){ var a=l[0]-z0, b=l[1]-z0;
    if(l[2]===1){ var pz=b-S.pad; addFrustum(F,a,pz,dims(l[0]),dims(l[1]-S.pad),C.wood,{num:1,slit:true,sharp:"top"});
                  addFrustum(F,pz,b,dims(l[1]-S.pad),dims(l[1]),C.pad,{sharp:"bottom",capCol:C.pad}); }
    else addFrustum(F,a,b,dims(l[0]),dims(l[1]),C.wood,{num:l[2],slit:true});
  });
  return {faces:F, foot:{W:dims(z0).W,L:dims(z0).L}};
}
function mat(size,showHandles){
  var S=SPEC.mat.sizes[size], F=[], w=S.W/2, l=S.L/2;
  addBox(F,-w,w,-l,l,0,S.T,{top:C.mat,side:C.matSide,end:C.matSide},"#9A927F");
  for(var i=1;i<=S.quilt;i++){ var x=-w+S.W*i/(S.quilt+1);   // キルティングの縫い目（長さ方向）
    F.push({line:true,p:[[x,-l+40,S.T+1],[x,l-40,S.T+1]],stroke:C.stitch}); }
  outward(F,[0,0,S.T/2]);
  if(showHandles) for(var s=-1;s<=1;s+=2) for(var j=0;j<S.handles;j++){ var y=-l+S.L*(j+0.5)/S.handles, x=s*w;   // 長い辺の取っ手（実際の活動では 床とのすき間に入れ込む）
    F.push({p:[[x,y-60,S.T*0.25],[x+s*70,y-60,S.T*0.25],[x+s*70,y+60,S.T*0.25],[x,y+60,S.T*0.25]],col:C.handle,edge:"#B8B0A0",flat:true}); }
  return {faces:F, foot:{W:S.W,L:S.L}};
}
function thickMat(T,showHandles){
  var S=SPEC.thick, F=[], w=S.W/2, l=S.L/2;
  addBox(F,-w,w,-l,l,0,T,{top:C.thick,side:C.thickSide,end:C.thickSide},C.thickEdge);
  outward(F,[0,0,T/2]);
  F.push({line:true,p:[[-w+20,0,T+1],[w-20,0,T+1]],stroke:C.thickEdge});            // 折り目（上面）
  [w,-w].forEach(function(x){ var sd=x>0?1:-1;
    F.push({line:true,p:[[x,0,20],[x,0,T-20]],stroke:C.thickEdge,side:sd});          // 折り目（側面）
    [-l/2,l/2].forEach(function(y){                                                  // 側面の 持ち手（緑の当て布）
      F.push({p:[[x+sd*2,y-120,T*0.3],[x+sd*2,y+120,T*0.3],[x+sd*2,y+120,T*0.7],[x+sd*2,y-120,T*0.7]],col:C.grip,edge:C.grip,deco:true,sideOf:sd}); });
    if(showHandles) for(var j=0;j<S.handles;j++){ var y=-l+S.L*(j+0.5)/S.handles;   // 床ぎわの取っ手
      F.push({p:[[x,y-60,30],[x+sd*80,y-60,30],[x+sd*80,y+60,30],[x,y+60,30]],col:C.handle,edge:"#B8B0A0",flat:true}); }
  });
  return {faces:F, foot:{W:S.W,L:S.L}};
}
function cone(){
  var S=SPEC.cone, F=[], b=S.base/2, N=18;
  addBox(F,-b,b,-b,b,0,S.baseT,{top:C.cone,side:C.coneDark,end:C.coneDark},"#1A1A1A");   // 四角い台
  outward(F,[0,0,S.baseT/2]);
  var zs=[S.baseT,S.band[0],S.band[1],S.H], rr=function(z){ return S.r0+(S.r1-S.r0)*(z-S.baseT)/(S.H-S.baseT); };
  for(var k=0;k<3;k++){ var z0=zs[k], z1=zs[k+1], col=k===1?C.white:C.cone, r0=rr(z0), r1=rr(z1);   // 円すい（白い反射帯つき）
    for(var i=0;i<N;i++){ var a0=2*Math.PI*i/N, a1=2*Math.PI*(i+1)/N;
      F.push({p:[[r0*Math.cos(a0),r0*Math.sin(a0),z0],[r0*Math.cos(a1),r0*Math.sin(a1),z0],[r1*Math.cos(a1),r1*Math.sin(a1),z1],[r1*Math.cos(a0),r1*Math.sin(a0),z1]],
              col:col,edge:null,sharp:[0,1,2,3],soft:true}); } }
  var top=[]; for(var i=0;i<N;i++){ var a=2*Math.PI*i/N; top.push([S.r1*Math.cos(a),S.r1*Math.sin(a),S.H]); }
  F.push({p:top,col:C.cone,edge:"#B8400F"});
  outward(F.filter(function(f){return f.soft||f.p===top;}),[0,0,S.H*0.4]);
  return {faces:F, foot:{W:S.base,L:S.base}};
}
function board(){
  var S=SPEC.board, F=[], w=S.W/2, N=10, prof=[];
  // 横から見た形（Y-Z）：+Y＝低い端（助走側）、-Y＝高い端。上面は ふくらんだ曲線
  for(var i=0;i<=N;i++){ var t=i/N, y=S.L/2-S.L*t, z=S.lo+(S.hi-S.lo)*Math.sin(Math.PI/2*t); prof.push([y,z]); }
  var poly=prof.concat([[-S.L/2,0],[S.L/2,0]]);           // 下は床
  // 両側の面（木）
  [w,-w].forEach(function(x){ F.push({p:poly.map(function(q){return [x,q[0],q[1]];}),col:C.woodLt,edge:C.edge,cap:true}); });
  // 上面（緑）を細かい帯で
  for(var i=0;i<N;i++){ var a=prof[i], b=prof[i+1];
    F.push({p:[[-w,a[0],a[1]],[w,a[0],a[1]],[w,b[0],b[1]],[-w,b[0],b[1]]],col:C.green,edge:null,strip:true,sharp:[0,1,2,3]}); }   // 帯の継ぎ目は見せない
  // 両端（木）
  F.push({p:[[-w,S.L/2,0],[w,S.L/2,0],[w,S.L/2,S.lo],[-w,S.L/2,S.lo]],col:C.woodLt,edge:C.edge});
  F.push({p:[[w,-S.L/2,0],[-w,-S.L/2,0],[-w,-S.L/2,S.hi],[w,-S.L/2,S.hi]],col:C.woodLt,edge:C.edge});
  // 側面の 層の線（緑の板の下＝木の層の境目）
  [w,-w].forEach(function(x){ F.push({line:true,p:prof.map(function(q){return [x,q[0],q[1]-S.layer];}),stroke:C.edge,side:x>0?1:-1}); });
  // 高い端寄りの 黒い帯
  var t1=0.8,t2=0.86, zb=function(t){return S.lo+(S.hi-S.lo)*Math.sin(Math.PI/2*t)+2;}, yb=function(t){return S.L/2-S.L*t;};
  F.push({p:[[-w,yb(t1),zb(t1)],[w,yb(t1),zb(t1)],[w,yb(t2),zb(t2)],[-w,yb(t2),zb(t2)]],col:C.black,edge:C.black,deco:true});
  outward(F,[0,0,S.hi*0.3]);
  return {faces:F, foot:{W:S.W,L:S.L}};
}

/* ===== 計算 ===== */
function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function sub(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
function cross(a,b){ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
function normal(p){ var n=[0,0,0]; for(var i=0;i<p.length;i++){ var a=p[i],b=p[(i+1)%p.length];   // ニューウェルの方法（多角形でも安定）
  n[0]+=(a[1]-b[1])*(a[2]+b[2]); n[1]+=(a[2]-b[2])*(a[0]+b[0]); n[2]+=(a[0]-b[0])*(a[1]+b[1]); } return n; }
function centroid(p){ var c=[0,0,0]; p.forEach(function(q){ c[0]+=q[0];c[1]+=q[1];c[2]+=q[2]; }); return [c[0]/p.length,c[1]/p.length,c[2]/p.length]; }
function shade(hex,f){ var n=parseInt(hex.slice(1),16), r=n>>16, g=n>>8&255, b=n&255;
  return "rgb("+[r,g,b].map(function(c){return Math.round(Math.min(255,c*f));}).join(",")+")"; }
function rpath(q,r,sharp){ var n=q.length, d=""; sharp=sharp||[];   // 角を少しだけ丸める（sharp の頂点は丸めない）
  for(var i=0;i<n;i++){ var p=q[i], a=q[(i-1+n)%n], b=q[(i+1)%n];
    var la=Math.hypot(a[0]-p[0],a[1]-p[1]), lb=Math.hypot(b[0]-p[0],b[1]-p[1]), k=sharp.indexOf(i)>=0?0:Math.min(r,la*0.18,lb*0.18);
    var s1=[p[0]+(a[0]-p[0])*k/(la||1), p[1]+(a[1]-p[1])*k/(la||1)], s2=[p[0]+(b[0]-p[0])*k/(lb||1), p[1]+(b[1]-p[1])*k/(lb||1)];
    d+=(i?"L":"M")+s1[0].toFixed(1)+" "+s1[1].toFixed(1)+"Q"+p[0].toFixed(1)+" "+p[1].toFixed(1)+" "+s2[0].toFixed(1)+" "+s2[1].toFixed(1); }
  return d+"Z"; }

/* ===== 見方 ===== */
function ortho(az,el){ az*=Math.PI/180; el*=Math.PI/180;
  var v=[Math.cos(el)*Math.sin(az),Math.cos(el)*Math.cos(az),Math.sin(el)], r=[Math.cos(az),-Math.sin(az),0],
      u=[-Math.sin(el)*Math.sin(az),-Math.sin(el)*Math.cos(az),Math.cos(el)];
  return {v:v, P:function(p){ return [dot(p,r), -dot(p,u)]; }}; }
function plan(k,rot){ var c=rot?0:1, s=rot?-1:0;      // 地図用：床は真上のまま（画面の下＝+Y）、高さは上へ k 倍
  return {v:rot?[-k,0,1]:[0,k,1], rot:rot, map:true, P:function(p){ var x=c*p[0]-s*p[1], y=s*p[0]+c*p[1]; return [x, y-k*p[2]]; }}; }

/* ===== 描く ===== */
function drawFaces(objs,view){
  // objs：[{faces, off:[x,y,z]}]。物ごとに 奥から手前へ、物の中でも 面を奥から手前へ
  var s="", pts=[];
  var order=objs.map(function(o,i){ return {o:o, d:dot(o.off,view.v)}; }).sort(function(a,b){return a.d-b.d;});
  order.forEach(function(it){ var o=it.o, vis=[];
    o.faces.forEach(function(f){
      var P=f.p.map(function(q){ return [q[0]+o.off[0],q[1]+o.off[1],q[2]+o.off[2]]; });
      var q=P.map(view.P);
      if(f.line){ if(f.side && f.side*view.v[0]<=0.05) return;
        vis.push({f:f,q:q,depth:1e9}); q.forEach(function(p){pts.push(p);}); return; }
      var n=normal(P), nl=Math.hypot(n[0],n[1],n[2]);
      if(f.sideOf){ if(f.sideOf*view.v[0]<=0.05) return; }
      else if(!f.flat && dot(n,view.v)/nl<=1e-3) return;
      var lit=0.74+0.26*Math.max(0,dot(n,[0.3,0.5,0.8])/nl);
      var depth=dot(centroid(P),view.v)+(f.deco?1e8:0);
      vis.push({f:f,q:q,lit:lit,depth:depth}); q.forEach(function(p){pts.push(p);});
    });
    vis.sort(function(a,b){return a.depth-b.depth;});
    vis.forEach(function(x){ var f=x.f;
      if(f.line){ s+='<path d="M'+x.q.map(function(p){return p[0].toFixed(1)+" "+p[1].toFixed(1);}).join("L")+'" fill="none" stroke="'+f.stroke+'" stroke-width="8" stroke-linecap="round"/>'; return; }
      var fc=shade(f.col,x.lit);
      s+='<path d="'+rpath(x.q,30,f.sharp)+'" fill="'+fc+'" stroke="'+(f.edge||fc)+'" stroke-width="'+(f.edge?5:3)+'" stroke-linejoin="round"/>';
      if(f.slit){ var a=x.q[0],b=x.q[1],c=x.q[2],e=x.q[3], t=14/f.h;
        s+='<path d="M'+[a,b,[b[0]+(c[0]-b[0])*t,b[1]+(c[1]-b[1])*t],[a[0]+(e[0]-a[0])*t,a[1]+(e[1]-a[1])*t]].map(function(p){return p[0].toFixed(1)+" "+p[1].toFixed(1);}).join("L")+'Z" fill="'+C.slit+'" opacity=".55"/>'; }
      if(f.num){ var A=x.q[0],B=x.q[1],Cc=x.q[2],D=x.q[3], cx=(A[0]+B[0]+Cc[0]+D[0])/4, cy=(A[1]+B[1]+Cc[1]+D[1])/4;
        var ux=[(A[0]-B[0]+D[0]-Cc[0])/2,(A[1]-B[1]+D[1]-Cc[1])/2], uy=[(D[0]-A[0]+Cc[0]-B[0])/2,(D[1]-A[1]+Cc[1]-B[1])/2];
        var wl=Math.hypot(ux[0],ux[1]), hl=Math.hypot(uy[0],uy[1]);
        if(wl>60&&hl>25){ var sc=Math.min(hl*0.8,wl*0.3);
          s+='<text transform="matrix('+(ux[0]/wl*sc/10).toFixed(3)+' '+(ux[1]/wl*sc/10).toFixed(3)+' '+(-uy[0]/hl*sc/10).toFixed(3)+' '+(-uy[1]/hl*sc/10).toFixed(3)+' '+cx.toFixed(1)+' '+cy.toFixed(1)+')" font-size="10" font-weight="900" fill="#fff" text-anchor="middle" dominant-baseline="central" style="paint-order:stroke;stroke:#5A3A1E;stroke-width:.8">'+f.num+'</text>'; } }
    });
  });
  return {svg:s, pts:pts};
}
/* ===== 行事の物（利用者の写真 2026-10-11：折りたたみパイプいす CAL-XS01M・折りたたみ長机） ===== */
SPEC.pipechair={ name:"パイプいす", note:"幅487×奥行470×高さ746mm（利用者が示した製品 CAL-XS01M の寸法）。座面の高さ440と脚の位置は写真から読んだ仮。+Y が前（すわる人が向く側）",
  W:487, D:470, H:746, seatZ:440, backH:190, tube:22,
  frontFoot:140,   // 前の床の桟の位置（Y）。座面の前はしは D/2
  lockZ:520 };     // うしろの脚が 前の脚から分かれる高さ
SPEC.longtable={ name:"長机", note:"仮：1800×450×高さ700（折りたたみ長机の標準）", W:1800, D:450, H:700, top:25 };
// 太さ t の角棒を a→b に置く（パイプの脚・桟）
function addBeam(F,a,b,t,col,edge){
  var d=sub(b,a), L=Math.hypot(d[0],d[1],d[2]); d=[d[0]/L,d[1]/L,d[2]/L];
  var u=Math.abs(d[2])>0.99?[1,0,0]:cross(d,[0,0,1]); var ul=Math.hypot(u[0],u[1],u[2]); u=[u[0]/ul*t/2,u[1]/ul*t/2,u[2]/ul*t/2];
  var v=cross(d,u); v=[v[0],v[1],v[2]];
  var c=[[1,1],[-1,1],[-1,-1],[1,-1]], P=function(o,k){ return [o[0]+u[0]*c[k][0]+v[0]*c[k][1], o[1]+u[1]*c[k][0]+v[1]*c[k][1], o[2]+u[2]*c[k][0]+v[2]*c[k][1]]; };
  var G=[];
  for(var k=0;k<4;k++){ var j=(k+1)%4; G.push({p:[P(a,k),P(a,j),P(b,j),P(b,k)],col:col,edge:edge||null,sharp:[0,1,2,3]}); }
  G.push({p:[0,1,2,3].map(function(k){return P(a,k);}),col:col,edge:edge||null,sharp:[0,1,2,3]});
  G.push({p:[0,1,2,3].map(function(k){return P(b,k);}),col:col,edge:edge||null,sharp:[0,1,2,3]});
  var m=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2]; outward(G,m);
  G.forEach(function(f){F.push(f);});
}
// YZ 面の多角形を X 方向に x0→x1 だけ押し出す（座面・背もたれの板）
function addPrismX(F,poly,x0,x1,col,edge){
  var G=[], n=poly.length, P=function(x,q){ return [x,q[0],q[1]]; };
  G.push({p:poly.map(function(q){return P(x0,q);}),col:col,edge:edge});
  G.push({p:poly.map(function(q){return P(x1,q);}),col:col,edge:edge});
  for(var i=0;i<n;i++){ var a=poly[i], b=poly[(i+1)%n]; G.push({p:[P(x0,a),P(x0,b),P(x1,b),P(x1,a)],col:col,edge:edge}); }
  var cy=0,cz=0; poly.forEach(function(q){cy+=q[0];cz+=q[1];}); outward(G,[(x0+x1)/2,cy/n,cz/n]);
  G.forEach(function(f){F.push(f);});
}
/* 写真（アイリスプラザ CAL-XS01M）の組み立て。左右それぞれ：
   ① 長いパイプ：背もたれの上から まっすぐ斜めに下りて、前の床へ（背の柱と前の脚が1本）。
   ② 短いパイプ：①の座面より少し上（黒い留め具）から、うしろの床へ。①と②で横から見て「入」の字。
   ③ 床の桟：前の足どうし・うしろの足どうしを横につなぐ（角の黒い足ゴムつき）。
   座面は①に うしろの端でつながり、前へ張り出す。背もたれは①の上の端に、①と同じ傾きで付く。 */
function pipeChair(){
  var S=SPEC.pipechair, F=[], w=S.W/2, t=S.tube, met="#BFC4CA", blk="#2F3134";
  var yTop=-S.D/2+20, yF=S.frontFoot, yR=-S.D/2+35;   // 足ゴムの はしが 奥行 D に収まる位置
  var yA=function(z){ return yF+(yTop-yF)*z/S.H; };                              // ①の上の点の Y（高さ z で）
  var xa=w-t/2, xb=w-t*2;                                                          // ①は外がわ、②は内がわ
  [-1,1].forEach(function(s){
    addBeam(F,[s*xa,yF,t/2],[s*xa,yTop,S.H-10],t,met);                             // ① 長いパイプ
    addBeam(F,[s*xb,yA(S.lockZ),S.lockZ],[s*xb,yR,t/2],t,met);                     // ② 短いパイプ
    addBox(F,s*xa-10,s*xa+10,yA(S.lockZ)-30,yA(S.lockZ)+30,S.lockZ-40,S.lockZ+30,{top:blk,side:blk,end:blk},"#151617");   // 留め具
    [[s*xa,yF],[s*xb,yR]].forEach(function(q){ addBox(F,q[0]-11,q[0]+11,q[1]-35,q[1]+35,0,t+4,{top:blk,side:blk,end:blk},"#151617"); });   // 足ゴム
  });
  addBeam(F,[-xa,yF,t/2],[xa,yF,t/2],t,met);                                       // ③ 前の床の桟
  addBeam(F,[-xb,yR,t/2],[xb,yR,t/2],t,met);                                       // ③ うしろの床の桟
  var yS=yA(S.seatZ);                                                              // 座面のうしろの端＝①と交わる所
  addPrismX(F,[[yS,S.seatZ-22],[S.D/2,S.seatZ-22],[S.D/2,S.seatZ],[yS,S.seatZ]],-(xa-t/2),xa-t/2,blk,"#151617");   // 座面
  var z0=S.H-S.backH, k=18;                                                        // 背もたれ：①に沿って傾いた板
  addPrismX(F,[[yA(z0)-k,z0],[yA(z0),z0],[yA(S.H),S.H],[yA(S.H)-k,S.H]],-w,w,blk,"#151617");
  return {faces:F, foot:{W:S.W,L:S.D}};
}
function longTable(){
  var S=SPEC.longtable, F=[], w=S.W/2, d=S.D/2, g="#2F3A30", t=30;
  [-1,1].forEach(function(sx){
    [-1,1].forEach(function(sy){ addBeam(F,[sx*(w-90),sy*(d-50),0],[sx*(w-90),sy*(d-50),S.H-S.top],t,g); });   // 脚
    addBeam(F,[sx*(w-90),-(d-50),180],[sx*(w-90),d-50,180],24,g);                                                 // 脚の下の桟
    addBeam(F,[sx*(w-90),-(d-50),S.H-80],[sx*(w-260),0,S.H-S.top-10],20,g);                                       // 折りたたみの金具（斜め）
  });
  for(var i=0;i<5;i++){ var y=-120+i*60; addBeam(F,[-(w-280),y,S.H-140],[w-280,y,S.H-140],14,g); }                // 下の棚（棒）
  var top=[]; addBox(top,-w,w,-d,d,S.H-S.top,S.H,{top:"#B9773F",side:"#9A6232",end:"#9A6232"},"#7A4A22"); outward(top,[0,0,S.H-S.top/2]);
  return {faces:F.concat(top), foot:{W:S.W,L:S.D}};
}
// 物をいくつか横（X）に並べて1つの物にする（パイプいすの列）
function rowOf(m,n,step){
  if(n===1) return m;
  var F=[];
  for(var i=0;i<n;i++){ var dx=(i-(n-1)/2)*step; m.faces.forEach(function(f){ var q=Object.assign({},f); q.p=f.p.map(function(v){return [v[0]+dx,v[1],v[2]];}); F.push(q); }); }
  return {faces:F, foot:{W:m.foot.W+(n-1)*step, L:m.foot.L}};
}
return { SPEC: SPEC, pipeChair: pipeChair, longTable: longTable, rowOf: rowOf, C: C, tobibako: tobibako, mat: mat, thickMat: thickMat, cone: cone, board: board,
         ortho: ortho, plan: plan, drawFaces: drawFaces, normal: normal };
})();
