/* 導線資料の 再生部（層1 操作UI ＋ 層2 場の描画）。
   中身（層3）は DATA にある。DATA は tools/build.mjs が plans/ と spaces/ から作る。
   位置は 時刻 t の 純関数（keys を 線形補間）。状態は 時刻と 選んだ組だけ。 */
(function(){
"use strict";
var S=DATA.scale, SP=DATA.space, PL=DATA.plan;
var T0=PL.start, T1=PL.end;
var $=function(id){return document.getElementById(id);};
var svg=$("svg"), cap=$("cap"), scrub=$("scrub");
svg.setAttribute("viewBox","0 0 "+SP.size[0]*S+" "+SP.size[1]*S);
document.title=PL.title; $("h1").innerHTML=PL.title.replace(" ","<br>")+(PL.subtitle?'<br><small>'+PL.subtitle+'</small>':'');

/* ===== 場（space.json）を 描く。変わらないので 1回だけ ===== */
function r(v){return Math.round(v*S*10)/10;}
var BASE='<defs><marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#A8A08A"/></marker>'+
  '<marker id="am" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--me)"/></marker></defs>';
/* 場の描き方の決まり（docs/hub.md「描き方」）
   線＝壁。同じ zone の矩形は壁のない ひとつながりの場所なので、外まわりだけを線にする。
   kind "mark" は床の上の目印（シャワー・見学場所）で、壁ではないので点線。
   kind "stairs" は踏み段の平行線＋上る向きの矢印。扉は壁の切れ目＋両端の枠、開口は切れ目だけ。 */
var FILL={deck:"var(--deck)",water:"var(--water)",room:"var(--bldg)",box:"#fff",stairs:"#fff",mark:"none"};
function rc(b,cls,st){ return '<rect class="'+cls+'" x="'+r(b.rect[0])+'" y="'+r(b.rect[1])+'" width="'+r(b.rect[2])+'" height="'+r(b.rect[3])+'"'+(st||"")+'/>'; }
var LABELS="";
var walled=SP.areas.filter(function(a){return a.kind!=="mark";});
// 書く順は areas の順。zone は その最初の矩形の所で、線→塗りを まとめて描く（後の区画を 塗りで消さないため）
var zdone={};
walled.forEach(function(a){
  if(!a.zone){ BASE+=rc(a,"zone a-"+a.kind,' style="stroke-width:2"'); return; }
  if(zdone[a.zone]) return; zdone[a.zone]=1;
  var zs=walled.filter(function(b){return b.zone===a.zone;});
  zs.forEach(function(b){ BASE+=rc(b,"a-"+b.kind,' style="stroke:none"'); });
  zs.forEach(function(b){ zoneEdges(b,zs).forEach(function(e){
    BASE+='<line class="zwall" x1="'+r(e[0])+'" y1="'+r(e[1])+'" x2="'+r(e[2])+'" y2="'+r(e[3])+'"/>'; }); });
});
// 矩形 b の4辺から、同じ zone の別の矩形と接している区間を引いた残り＝外まわりの壁
function zoneEdges(b,zs){
  var x=b.rect[0],y=b.rect[1],X=x+b.rect[2],Y=y+b.rect[3],E=1e-6,out=[];
  function sub(lo,hi,cuts){ var segs=[[lo,hi]]; cuts.forEach(function(c){ var n=[]; segs.forEach(function(s){
      if(c[1]<=s[0]+E||c[0]>=s[1]-E){ n.push(s); return; } if(c[0]>s[0]+E) n.push([s[0],c[0]]); if(c[1]<s[1]-E) n.push([c[1],s[1]]); }); segs=n; }); return segs; }
  [[y,"h",x,X,-1],[Y,"h",x,X,1],[x,"v",y,Y,-1],[X,"v",y,Y,1]].forEach(function(ed){
    var at=ed[0],cuts=[];
    zs.forEach(function(o){ if(o===b) return; var ox=o.rect[0],oy=o.rect[1],OX=ox+o.rect[2],OY=oy+o.rect[3];
      if(ed[1]==="h"&&Math.abs((ed[4]<0?OY:oy)-at)<E) cuts.push([Math.max(ox,ed[2]),Math.min(OX,ed[3])]);
      if(ed[1]==="v"&&Math.abs((ed[4]<0?OX:ox)-at)<E) cuts.push([Math.max(oy,ed[2]),Math.min(OY,ed[3])]); });
    sub(ed[2],ed[3],cuts).forEach(function(sg){ out.push(ed[1]==="h"?[sg[0],at,sg[1],at]:[at,sg[0],at,sg[1]]); });
  });
  return out;
}
SP.areas.forEach(function(a){
  var x=r(a.rect[0]),y=r(a.rect[1]),w=r(a.rect[2]),h=r(a.rect[3]);
  if(a.kind==="mark") BASE+=rc(a,"mk");
  if(a.lanes){ for(var i=1;i<a.lanes;i++){ var ly=y+h*i/a.lanes;
    BASE+='<line x1="'+(x+4)+'" x2="'+(x+w-4)+'" y1="'+ly+'" y2="'+ly+'" stroke="#fff" stroke-width="2" stroke-dasharray="8 6"/>'; } }
  if(a.kind==="stairs"){
    // up：上る向き（図の上下左右 up/down/left/right）。踏み段の線は 実寸（約0.3m）だと 詰まって読めないので 0.6m ごと
    var hor=(a.up==="left"||a.up==="right"), L=hor?a.rect[2]:a.rect[3], n=Math.floor(L/0.6);
    // 別の階へ下りていく階段（to がある）は、下りる先に向かって 黒く消えていく。この図の外へ続くことを示す
    if(a.to){ var gid="fade-"+a.id, dir={right:[1,0,0,0],left:[0,0,1,0],up:[0,1,0,0],down:[0,0,0,1]}[a.up];
      BASE=BASE.replace("</defs>",'<linearGradient id="'+gid+'" x1="'+dir[0]+'" y1="'+dir[1]+'" x2="'+dir[2]+'" y2="'+dir[3]+'"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#111"/></linearGradient></defs>');
      BASE+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="url(#'+gid+')"/>'; }
    for(var j=1;j<n;j++){ var d=j*0.6*S;
      BASE+= hor?'<line class="tread" x1="'+(x+d)+'" x2="'+(x+d)+'" y1="'+y+'" y2="'+(y+h)+'"/>'
                :'<line class="tread" y1="'+(y+d)+'" y2="'+(y+d)+'" x1="'+x+'" x2="'+(x+w)+'"/>'; }
    var cx=x+w/2, cy=y+h/2, m=0.12;
    var p0={left:[x+w*(1-m),cy],right:[x+w*m,cy],up:[cx,y+h*(1-m)],down:[cx,y+h*m]}[a.up];
    var p1={left:[x+w*m,cy],right:[x+w*(1-m),cy],up:[cx,y+h*m],down:[cx,y+h*(1-m)]}[a.up];
    BASE+='<line class="stair-ar" x1="'+p0[0]+'" y1="'+p0[1]+'" x2="'+p1[0]+'" y2="'+p1[1]+'" marker-end="url(#as)"/>';
    if(a.to) LABELS+='<text class="lbl s stair-to" x="'+(hor?(a.up==="right"?x+w*0.2:x+w*0.8):x+w/2)+'" y="'+(y+h/2)+'" style="fill:#fff">'+a.to+'</text>';
    return;
  }
  if(!a.label) return;
  if(a.kind==="deck") LABELS+='<text class="lbl s" x="'+(x+w-10)+'" y="'+(y+h-14)+'" style="text-anchor:end">'+a.label+'</text>';
  else if(h>w*2&&w<100) LABELS+='<text class="lbl s" x="'+(x+w/2)+'" y="'+(y+14)+'">'+a.label+'</text>';
  else if(h<w*1.6&&h<60) LABELS+='<text class="lbl s" x="'+(x+w/2)+'" y="'+(y+h/2)+'">'+a.label+'</text>';
  else LABELS+='<text class="lbl'+(a.kind==="water"?" water":(a.kind==="box"||a.kind==="mark"?" s":""))+'" x="'+(x+w/2)+'" y="'+(y+18)+'">'+a.label+'</text>'+
    (a.sub?'<text class="lbl s" x="'+(x+w/2)+'" y="'+(y+h-14)+'">'+a.sub+'</text>':'');
});
(SP.walls||[]).forEach(function(wl){ BASE+='<line class="wall" x1="'+r(wl[0][0])+'" y1="'+r(wl[0][1])+'" x2="'+r(wl[1][0])+'" y2="'+r(wl[1][1])+'"/>'; });
(SP.doors||[]).forEach(function(d){
  // 壁の上の a→b の区間を、手前の場所の塗りで消して 切れ目にする。扉なら 両端に 壁と直交する枠
  var a=[r(d.from[0]),r(d.from[1])], b=[r(d.to[0]),r(d.to[1])], v=(a[0]===b[0]), k=0.35*S;
  BASE+='<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="'+(FILL[d.fill]||"#fff")+'" stroke-width="6"/>';
  if(d.kind!=="open") [a,b].forEach(function(p){
    BASE+= v?'<line class="jamb" x1="'+(p[0]-k)+'" x2="'+(p[0]+k)+'" y1="'+p[1]+'" y2="'+p[1]+'"/>'
            :'<line class="jamb" y1="'+(p[1]-k)+'" y2="'+(p[1]+k)+'" x1="'+p[0]+'" x2="'+p[0]+'"/>'; });
  if(d.label) LABELS+='<text class="lbl s door-l" x="'+((a[0]+b[0])/2+(v?14:0))+'" y="'+((a[1]+b[1])/2+(v?0:-10))+'" style="text-anchor:'+(v?"start":"middle")+'">'+d.label+'</text>';
});
BASE=BASE.replace("</defs>",'<marker id="as" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink-soft)"/></marker></defs>');
(SP.marks||[]).forEach(function(m){
  if(m.kind!=="oneway") return;
  var pts=m.pts.map(function(p){return r(p[0])+" "+r(p[1]);});
  BASE+='<path class="oneway" d="M'+pts.join("L")+'" marker-end="url(#ar)"/>';
  var q=m.pts[Math.floor(m.pts.length/2)];
  BASE+='<text class="lbl s" x="'+(r(q[0])+12)+'" y="'+r(q[1])+'" style="text-anchor:start">'+m.label+'</text>';
});
Object.keys(SP.pointLabels||{}).forEach(function(k){
  var p=SP.pointLabels[k]; BASE+='<text class="pl" x="'+r(p.at[0])+'" y="'+(r(p.at[1])+(p.at[1]>SP.size[1]/2?34:-24))+'">'+p.text+'</text>';
});
BASE+=LABELS;
if(SP.up) BASE+='<text class="lbl s" x="'+(SP.size[0]*S-8)+'" y="18" style="text-anchor:end">▲ '+SP.up+'</text>';
if(SP.status!=="確認済") BASE+='<text class="kari" x="8" y="'+(SP.size[1]*S-8)+'">※ 仮の地図（じっさいの配置と ちがうことがあります）</text>';

/* ===== うごき ===== */
var G=PL.groups;
function posAt(g,t){
  var K=g.keys,i;
  if(t<=K[0][0]) return {x:K[0][1],y:K[0][2],seg:-1};
  for(i=0;i<K.length-1;i++){
    if(t<K[i+1][0]){
      var a=K[i],b=K[i+1],u=(t-a[0])/(b[0]-a[0]), mv=(a[1]!==b[1]||a[2]!==b[2]);
      return {x:a[1]+(b[1]-a[1])*u, y:a[2]+(b[2]-a[2])*u, seg:mv?i:-1};
    }
  }
  i=K.length-1; return {x:K[i][1],y:K[i][2],seg:-1};
}
// 組の描き方：止まっている所に隊形（space.forms）があれば その隊形、それ以外（移動中など）は 8列のかたまり。
// 点の大きさは背の高さ：隊形では 端（低い）→ プール中央側（高い）へ 大きくなる。
var BODY={};
function formAt(p){ var F=SP.forms||[]; for(var i=0;i<F.length;i++){ var a=F[i].at; if(Math.abs(a[0]-p.x)<1e-3&&Math.abs(a[1]-p.y)<1e-3) return F[i]; } return null; }
function groupBody(g,form){
  var key=g.id+(form?"@"+form.at.join(","):""); if(BODY[key]) return BODY[key];
  var n=g.n||32, out="", pts=[], top;
  if(form){
    var rows=form.rows||2, per=Math.ceil(n/rows), gap=0.6*S, rg=1.0*S, sg=(form.tall==="+x"||form.tall==="+y")?1:-1;
    for(var i=0;i<n;i++){ var k=i%per, row=Math.floor(i/per), along=(k-(per-1)/2)*gap*sg, across=(row-(rows-1)/2)*rg;
      var rad=(0.17+0.13*k/Math.max(1,per-1))*S;                       // k=0 が端（低い）
      pts.push(form.along==="x"?[along,across,rad]:[across,along,rad]); }
    top=-(form.along==="x"?rows*rg/2:per*gap/2)-14;
  } else {
    var cols=8, rws=Math.ceil(n/cols), d=0.45*S;
    for(var j=0;j<n;j++) pts.push([((j%cols)-(cols-1)/2)*d,(Math.floor(j/cols)-(rws-1)/2)*d,d*0.42]);
    top=-(rws/2)*d-12;
  }
  pts.forEach(function(q){ out+='<circle class="kid" cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="'+q[2].toFixed(1)+'" style="fill:'+(g.color||"#fff")+'"/>'; });
  out+='<rect class="tag" x="-22" y="'+(top-11)+'" width="44" height="22" rx="11"/><text y="'+top+'">'+g.label+'</text>';
  return BODY[key]=out;
}
function anyMoving(t){ for(var i=0;i<G.length;i++) if(posAt(G[i],t).seg>=0) return true; return false; }
function phaseIdx(t){ var k=0; PL.phases.forEach(function(p,i){ if(t>=p.at) k=i; }); return k; }
function clockStr(t){ var m=Math.floor(t+1e-6); return Math.floor(m/60)+":"+("0"+(m%60)).slice(-2); }
function fill(s,v){ return String(s).replace(/\{(\w+)\}/g,function(_,k){ return v&&v[k]!==undefined?v[k]:""; }); }

var who=load("who","all"), clock=T0, paused=true, rate=1, hold=0;
if(who!=="all"&&!G.some(function(g){return g.id===who;})) who="all";

function draw(){
  var s=BASE, sel=null;
  G.forEach(function(g){ if(g.id===who) sel=g; });
  var pi=phaseIdx(clock), ph=PL.phases[pi], nx=PL.phases[pi+1];
  if(sel){
    // いまの場面の あいだに 通る道（点線）と、いま 動いている区間（太線）
    var tA=ph.at, tB=nx?nx.at:T1+1, st=posAt(sel,tA), pts=[[st.x,st.y]];
    sel.keys.forEach(function(k){ if(k[0]<=tA||k[0]>tB) return; var l=pts[pts.length-1]; if(l[0]!==k[1]||l[1]!==k[2]) pts.push([k[1],k[2]]); });
    if(pts.length>1) s+='<path class="trail" marker-end="url(#am)" d="M'+pts.map(function(p){return r(p[0])+" "+r(p[1]);}).join("L")+'"/>';
    var now=posAt(sel,clock);
    if(now.seg>=0){ var a=sel.keys[now.seg], b=sel.keys[now.seg+1];
      s+='<path class="trail go" d="M'+r(a[1])+" "+r(a[2])+"L"+r(b[1])+" "+r(b[2])+'" marker-end="url(#am)"/>'; }
  }
  (PL.signals||[]).forEach(function(b){ if(clock>=b.at-1&&clock<b.at+1.5){
    var cx=SP.size[0]*S*0.62;
    s+='<g class="sig"><rect x="'+(cx-200)+'" y="6" width="400" height="44" rx="10"/><text x="'+cx+'" y="29">'+b.text+'</text></g>'; } });
  var order=G.filter(function(g){return g!==sel;}); if(sel) order.push(sel);
  order.forEach(function(g){
    var p=posAt(g,clock), cls="g"+(g.style==="watch"?" watch":"")+(sel?(g===sel?" me":" dim"):"");
    s+='<g class="'+cls+'" transform="translate('+r(p.x)+' '+r(p.y)+')">'+groupBody(g,p.seg<0?formAt(p):null)+'</g>';
  });
  svg.innerHTML=s;

  // 帯：選んだ組の ことばに 差しかえる
  var w=ph, v=sel?sel.vars:null;
  if(sel&&ph.by&&ph.by[sel.id]) w=Object.assign({},ph,ph.by[sel.id],{mine:null});
  var chips=[];
  if(sel&&w.mine) chips.push('<span class="chip mine">'+fill(w.mine,v)+'</span>');
  (w.chips||[]).forEach(function(c){ chips.push('<span class="chip">'+fill(c,v)+'</span>'); });
  if(w.warn) chips.push('<span class="chip warn">⚠ '+w.warn+'</span>');
  cap.innerHTML='<span class="clock">'+clockStr(clock)+'</span><span class="who">'+(sel?sel.label:"ぜんぶ")+'</span><span class="say">'+fill(w.say,v)+'</span>'+chips.join("");
  Array.prototype.forEach.call($("chap").children,function(b,i){ b.classList.toggle("now",i===pi); });
  scrub.value=Math.round((clock-T0)/(T1-T0)*1000);
}

/* ===== 再生 =====
   動いている間は 実時間の 約10倍（1分＝6びょう）。だれも 動かない間は 1分＝0.3びょう で 飛ばす */
var last=null;
function frame(now){
  if(last!==null&&!paused){
    var dt=Math.min(0.1,(now-last)/1000), dir=hold||1, sp=(hold?4:1)*rate*(anyMoving(clock)?1/6:1/0.3);
    clock+=dir*dt*sp;
    if(clock>=T1){clock=T1;if(!hold){paused=true;setPlayIcon();}}
    if(clock<=T0){clock=T0;if(hold<0){hold=0;paused=true;setPlayIcon();}}
    draw();
  }
  last=now; requestAnimationFrame(frame);
}
var playBtn=$("play");
var ICON_PLAY='<svg width="18" height="18" viewBox="0 0 18 18"><path d="M4 2L16 9L4 16z" fill="currentColor"/></svg>';
var ICON_PAUSE='<svg width="18" height="18" viewBox="0 0 18 18"><rect x="3" y="2" width="4" height="14" fill="currentColor"/><rect x="11" y="2" width="4" height="14" fill="currentColor"/></svg>';
function setPlayIcon(){ playBtn.innerHTML=paused?ICON_PLAY:ICON_PAUSE; }
playBtn.onclick=function(){ if(clock>=T1) clock=T0; paused=!paused; setPlayIcon(); };
function holdBtn(id,d){
  var b=$(id), was;
  b.addEventListener("pointerdown",function(e){ e.preventDefault(); was=paused; paused=false; hold=d; });
  ["pointerup","pointerleave","pointercancel"].forEach(function(ev){ b.addEventListener(ev,function(){ if(hold){ hold=0; paused=was; setPlayIcon(); } }); });
}
holdBtn("ff",1); holdBtn("rew",-1);
scrub.addEventListener("input",function(){ paused=true; setPlayIcon(); clock=T0+(T1-T0)*scrub.value/1000; draw(); });
$("toggle").onclick=function(){ $("app").classList.toggle("closed"); };
$("speeds").onclick=function(e){ var b=e.target.closest("button"); if(!b) return;
  rate=+b.dataset.r; Array.prototype.forEach.call(this.children,function(x){x.setAttribute("aria-pressed",x===b);}); };
$("chap").innerHTML=PL.phases.map(function(p,i){ return '<button data-i="'+i+'"><span>'+clockStr(p.at)+'</span>'+fill(p.say,{})+'</button>'; }).join("");
$("chap").onclick=function(e){ var b=e.target.closest("button"); if(!b) return; clock=PL.phases[+b.dataset.i].at; paused=false; setPlayIcon(); draw(); };
var whoEl=$("who");
whoEl.innerHTML='<button data-w="all" class="wide">ぜんぶ</button>'+G.map(function(g){return '<button data-w="'+g.id+'">'+g.label+'</button>';}).join("");
function setWho(w){ who=w; save("who",w); Array.prototype.forEach.call(whoEl.children,function(x){x.setAttribute("aria-pressed",x.dataset.w===w);}); draw(); }
whoEl.onclick=function(e){ var b=e.target.closest("button"); if(b) setWho(b.dataset.w); };
document.addEventListener("keydown",function(e){
  if(e.key===" "){ e.preventDefault(); playBtn.click(); }
  if(e.key==="ArrowRight"){ clock=Math.min(T1,clock+1); draw(); }
  if(e.key==="ArrowLeft"){ clock=Math.max(T0,clock-1); draw(); }
});
function load(k,d){ try{ var v=localStorage.getItem(PL.key+"."+k); return v===null?d:v; }catch(e){ return d; } }
function save(k,v){ try{ localStorage.setItem(PL.key+"."+k,v); }catch(e){} }
if(window.innerWidth<760||window.innerHeight<500) $("app").classList.add("closed");
setPlayIcon(); setWho(who); requestAnimationFrame(frame);
})();
