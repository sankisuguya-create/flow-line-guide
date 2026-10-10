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
// 同じ zone の矩形は 壁で区切られていない ひとつながりの場所。
// 太い線で全部を描いてから 塗りだけを重ねると、外まわりの輪郭だけが残り、つなぎ目に線が出ない。
var ZONES={};
SP.areas.forEach(function(a){ if(a.zone) (ZONES[a.zone]=ZONES[a.zone]||[]).push(a); });
var zoneDone={};
SP.areas.forEach(function(a){
  var x=r(a.rect[0]),y=r(a.rect[1]),w=r(a.rect[2]),h=r(a.rect[3]);
  if(a.zone){
    if(!zoneDone[a.zone]){ zoneDone[a.zone]=1; var zs=ZONES[a.zone], q=function(b,cls,st){ return '<rect class="'+cls+'" x="'+r(b.rect[0])+'" y="'+r(b.rect[1])+'" width="'+r(b.rect[2])+'" height="'+r(b.rect[3])+'"'+st+'/>'; };
      zs.forEach(function(b){ BASE+=q(b,"zone a-"+b.kind,' style="stroke-width:4"'); });
      zs.forEach(function(b){ BASE+=q(b,"a-"+b.kind,' style="stroke:none"'); }); }
  } else BASE+='<rect class="zone a-'+a.kind+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8"/>';
  if(a.lanes){ for(var i=1;i<a.lanes;i++){ var ly=y+h*i/a.lanes;
    BASE+='<line x1="'+(x+4)+'" x2="'+(x+w-4)+'" y1="'+ly+'" y2="'+ly+'" stroke="#fff" stroke-width="2" stroke-dasharray="8 6"/>'; } }
  if(a.kind==="deck") BASE+='<text class="lbl s" x="'+(x+w-10)+'" y="'+(y+h-14)+'" style="text-anchor:end">'+a.label+'</text>';
  else if(a.kind==="box"&&h>w*2) BASE+='<text class="lbl s" x="'+(x+w/2)+'" y="'+(y-10)+'">'+a.label+'</text>';
  else if(a.kind==="box"&&h<w*1.6&&h<60) BASE+='<text class="lbl s" x="'+(x+w/2)+'" y="'+(y+h+14)+'">'+a.label+'</text>';
  else BASE+='<text class="lbl'+(a.kind==="water"?" water":(a.kind==="box"?" s":""))+'" x="'+(x+w/2)+'" y="'+(y+18)+'">'+a.label+'</text>'+
    (a.sub?'<text class="lbl s" x="'+(x+w/2)+'" y="'+(y+h-14)+'">'+a.sub+'</text>':'');
});
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
    s+='<g class="'+cls+'" transform="translate('+r(p.x)+' '+r(p.y)+')"><rect x="-27" y="-17" width="54" height="34" rx="8"/><text>'+g.label+'</text></g>';
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
