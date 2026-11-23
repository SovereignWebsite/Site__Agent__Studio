<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>reel</title>
<style>
@font-face{font-family:Inter;src:url(fonts/Inter-Bold.otf);font-weight:700}
@font-face{font-family:Inter;src:url(fonts/Inter-Medium.otf);font-weight:500}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:var(--bg2,#0b1424);font-family:Inter,sans-serif}
#top{position:absolute;left:0;top:0;width:1080px;height:1010px;background:radial-gradient(120% 80% at 30% 20%,var(--bg0) 0%,var(--bg1) 60%,var(--bg2) 100%)}
#viz{position:absolute;left:0;top:0;width:1080px;height:1010px}
#stage{position:absolute;left:0;top:1010px;width:1080px;height:910px}
#brand{position:absolute;left:72px;top:58px;font:700 40px Inter;color:#fff;letter-spacing:-.01em;display:flex;align-items:center;gap:14px}#brand i{display:inline-block;width:14px;height:40px;background:var(--gold);border-radius:3px}#brand em{font-style:normal;color:var(--gold)}#brand img{width:56px;height:56px}
#who{position:absolute;right:72px;top:62px;font:500 26px Inter;color:var(--navy);background:var(--gold);border-radius:30px;padding:8px 22px}
#sub{position:absolute;left:60px;right:60px;top:1480px;text-align:center}
#sub span{display:inline;font:700 50px/1.35 Inter;color:#fff;background:rgba(8,14,26,.78);box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:6px 18px;border-radius:14px}
#sub b{color:var(--gold);font-weight:700}
#bar{position:absolute;left:72px;top:1000px;height:8px;width:0;background:var(--gold);border-radius:4px}
#cover{position:absolute;left:0;top:0;width:1080px;height:1010px;display:none;background:radial-gradient(120% 80% at 30% 20%,var(--bg0) 0%,var(--bg1) 65%,var(--bg2) 100%)}
#cover .date{position:absolute;left:72px;top:300px;font:700 38px Inter;color:var(--navy);background:var(--gold);border-radius:40px;padding:12px 30px;letter-spacing:.04em}
#cover .kick{position:absolute;left:72px;top:412px;font:700 40px Inter;color:var(--muted);letter-spacing:.1em;text-transform:uppercase}
#cover h1{position:absolute;left:68px;right:60px;top:462px;margin:0;font:700 116px/1.02 Inter;color:#fff;letter-spacing:-.02em}
#cover h1 em{font-style:normal;color:var(--gold)}
#cover .sub{position:absolute;left:72px;right:72px;top:910px;font:500 40px Inter;color:#dfe7f3}
</style></head><body>
<div id="top"></div><svg id="viz" viewBox="0 0 1080 1010" xmlns="http://www.w3.org/2000/svg"></svg>
<div id="brand"><i></i><span>SovereignWebsite<em>.ai</em></span></div><div id="who"></div>
<div id="cover"><div class="date"></div><div class="kick"></div><h1></h1><div class="sub"></div></div>
<div id="stage"></div><div id="bar"></div><div id="sub"></div>
<script type="module">
import { mount } from './lib/presenters/presenters.js';
const spec = await (await fetch(new URLSearchParams(location.search).get('spec'))).json();
const T = await (await fetch(spec.timing)).json(); const K = T.keys; const LEAD = spec.cover ? spec.cover.hold : 0; const DUR = LEAD + T.duration + spec.tail;
document.getElementById('who').textContent = spec.label;
const C = Object.assign({ navy:'#0f1b2d', ink:'#16263f', card:'#1c3050', line:'#34507a', gold:'#f0b84a', white:'#ffffff', muted:'#aabad2', green:'#5cc98a', red:'#e86a5a', blue:'#5aa9e8', bg0:'#1d3354', bg1:'#0f1b2d', bg2:'#0b1424', stage:'#13213a' }, (spec.theme||{}).colours||{});
const R = document.documentElement.style; for (const [k,v] of Object.entries(C)) R.setProperty('--'+k, v);
if ((spec.theme||{}).wordmark) document.getElementById('brand').innerHTML = spec.theme.wordmark;
const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease = x=>1-Math.pow(1-clamp(x),3);
const back = x=>{x=clamp(x);const c=1.7;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const ap = (t,t0,d=0.45)=>clamp((t-t0)/d);           // appear progress
const win = (t,a,b)=>t>=a&&t<b;                       // scene window
const fade = (t,a,b,d=0.35)=>Math.min(ap(t,a,d),1-ap(t,b-d,d)); // in at a, out at b
let svg=''; const add=s=>svg+=s;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const text=(x,y,s,o={})=>add(`<text x="${x}" y="${y}" font-family="Inter" font-weight="${o.w||700}" font-size="${o.size||48}" fill="${o.fill||C.white}" text-anchor="${o.anchor||'middle'}" opacity="${o.op??1}" ${o.ls?`letter-spacing="${o.ls}"`:''}>${esc(s)}</text>`);
const rect=(x,y,w,h,o={})=>add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r??18}" fill="${o.fill||C.card}" stroke="${o.stroke||'none'}" stroke-width="${o.sw||0}" opacity="${o.op??1}" ${o.tf?`transform="${o.tf}"`:''}/>`);
const circ=(x,y,r,o={})=>add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${o.fill||C.card}" stroke="${o.stroke||'none'}" stroke-width="${o.sw||0}" opacity="${o.op??1}"/>`);
const line=(x1,y1,x2,y2,o={})=>add(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke||C.line}" stroke-width="${o.sw||4}" stroke-linecap="round" opacity="${o.op??1}" ${o.dash?`stroke-dasharray="${o.dash}"`:''}/>`);
const path=(d,o={})=>add(`<path d="${d}" fill="${o.fill||'none'}" stroke="${o.stroke||C.white}" stroke-width="${o.sw||5}" stroke-linecap="round" stroke-linejoin="round" opacity="${o.op??1}" ${o.tf?`transform="${o.tf}"`:''}/>`);
const g0=(tf,op=1)=>add(`<g transform="${tf}" opacity="${op}">`), g1=()=>add('</g>');
const tick=(x,y,s,p,col=C.green)=>{ if(p<=0)return; circ(x,y,s,{fill:col,op:clamp(p*2)}); const L=s*1.1; add(`<path d="M${x-s*.45} ${y} l${s*.3} ${s*.32} l${s*.55} -${s*.6}" fill="none" stroke="#0f1b2d" stroke-width="${s*.22}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${L}" stroke-dashoffset="${L*(1-ease((p-.3)/.7))}"/>`); };
// a tiny website mock: palette and layout vary by i
function site(x,y,w,h,i,o={}){ const pals=[['#f6efe2','#c0553a','#2b2b2b'],['#e9f2fb','#2f6db5','#18324f'],['#f1f7ee','#3d8b4f','#1f3a26'],['#1e1b2e','#b28cff','#efeaff'],['#fff6dc','#e0a100','#3b2f00']]; const [bg,ac,fg]=pals[i%5];
  g0(`translate(${x},${y})`,o.op??1); rect(0,0,w,h,{fill:bg,r:14,stroke:o.stroke||'none',sw:o.sw||0});
  rect(0,0,w,h*.11,{fill:ac,r:14}); rect(0,h*.07,w,h*.04,{fill:ac,r:0});
  const L=i%3; if(L===0){rect(w*.08,h*.2,w*.84,h*.3,{fill:ac,r:8,op:.85}); for(let k=0;k<3;k++)rect(w*.08+k*w*.29,h*.58,w*.26,h*.3,{fill:fg,r:6,op:.18});}
  else if(L===1){rect(w*.08,h*.2,w*.4,h*.68,{fill:ac,r:8,op:.8}); for(let k=0;k<4;k++)rect(w*.54,h*.22+k*h*.17,w*.38,h*.08,{fill:fg,r:4,op:.3});}
  else {circ(w*.5,h*.38,h*.17,{fill:ac,op:.85}); for(let k=0;k<3;k++)rect(w*.2,h*.62+k*h*.1,w*.6,h*.05,{fill:fg,r:4,op:.3});}
  g1(); }
const S = {};
// ---------- WELCOME ----------
S.welcome = t => {
  if (t < K.team) { const p=fade(t,0,K.team);
    g0(`translate(540 ${430+30*(1-ease(ap(t,0.1,.6)))})`,p);
    text(0,-40,'Hello,',{size:132}); text(0,110,'and welcome.',{size:132,op:ease(ap(t,.6,.6))}); g1();
    const q=ease(ap(t,K.guide,.5)); rect(240,700,600,90,{fill:C.gold,r:45,op:q*p}); text(540,760,'The Guide · synthetic presenter',{size:34,fill:C.navy,op:q*p}); }
  else if (t < K.tell) { const p=fade(t,K.team,K.tell);
    const cx=540, cy=540, R=330, n=8, roles=['conductor','factory','sites','design','security','hub','obs','library'];
    // site being built in the middle
    const b=ease(ap(t,K.team+1.2,1.2)); g0('',p); rect(cx-170,cy-120,340,240,{fill:'#f6efe2',r:16,op:b});
    rect(cx-170,cy-120,340,34,{fill:C.gold,r:16,op:b}); rect(cx-140,cy-60,280*ease(ap(t,K.team+1.8,.8)),60,{fill:'#c0553a',r:8,op:b});
    for(let k=0;k<3;k++) rect(cx-140+k*95,cy+20,80,70*ease(ap(t,K.team+2.4+k*.25,.5)),{fill:'#2b2b2b',r:6,op:.25*b});
    for(let k=0;k<n;k++){ const a=-Math.PI/2+k*2*Math.PI/n, x=cx+R*Math.cos(a), y=cy+R*Math.sin(a)*0.92, q=back(ap(t,K.team+k*.12,.5));
      line(cx+(x-cx)*.42,cy+(y-cy)*.42,x+(cx-x)*.18,y+(cy-y)*.18,{op:q*.9,dash:'10 12',stroke:C.gold,sw:4});
      circ(x,y,62*q,{fill:C.card,stroke:C.gold,sw:5}); if(q>0.05){ g0(`translate(${x} ${y}) scale(${q}) translate(${-x} ${-y})`); glyph(roles[k],x,y,64,C.gold); g1(); } }
    text(540,960,'A team of AI agents',{size:52,op:ease(ap(t,K.team+.3,.5))});
    if(t>K.own){ const q=ease(ap(t,K.own,.5)); rect(cx-150,cy+150,300,64,{fill:C.green,r:32,op:q}); text(cx,cy+194,'Yours',{size:38,fill:C.navy,op:q}); }
    g1(); }
  else if (t < K.files) { const p=fade(t,K.tell,K.files);
    g0('',p);
    if (t < K.five) { // speech bubble with typing lines
      const q=back(ap(t,K.tell,.5)); g0(`translate(540 470) scale(${q})`); rect(-380,-230,760,400,{fill:'#f6efe2',r:40}); path('M-200 170 L-260 270 L-110 170 Z',{fill:'#f6efe2',stroke:'none'});
      text(-320,-140,'What I want…',{anchor:'start',size:50,fill:C.navy});
      for(let k=0;k<4;k++){ const w=[560,480,600,360][k]*ease(ap(t,K.tell+.6+k*.35,.4)); rect(-320,-90+k*62,w,26,{fill:'#2b2b2b',r:13,op:.25}); }
      g1(); text(540,930,'You tell us',{size:56,op:ease(ap(t,K.tell+.2,.5))});
    } else { // five designs fan out, one picked
      const pk=ease(ap(t,K.pick,.6));
      for(let k=0;k<5;k++){ const q=back(ap(t,K.five+.3+k*.25,.5)); const off=(k-2); const chosen=k===2;
        const x=540+off*190*(1-pk*(chosen?1:0)) - 120, y=360+Math.abs(off)*30 - (chosen?pk*40:0);
        const sc=(chosen?1+pk*.45:1-pk*.15);
        g0(`translate(${x+120} ${y+170}) rotate(${off*7*(1-pk)}) scale(${q*sc}) translate(-120 -170)`, chosen?1:1-pk*.65);
        site(0,0,240,340,k,{stroke:chosen&&pk>0?C.gold:'none',sw:chosen?8*pk:0}); g1(); }
      for(let k=0;k<5;k++){ const q=ease(ap(t,K.five+.3+k*.25,.3)); text(250+k*145,830,String(k+1),{size:46,fill:C.gold,op:q*(1-pk)}); }
      tick(700,250,46,ap(t,K.pick+.3,.6));
      text(540,930,t<K.pick?'Five designs':'You pick one',{size:56});
    }
    g1(); }
  else if (t < K.checked) { const p=fade(t,K.files,K.checked);
    g0('',p);
    if (t < K.move) {
      const items=[['files','Files'],['history','History'],['address','Address']];
      items.forEach(([k,lab],i)=>{ const q=back(ap(t,K[k],.5)); const x=200+i*340, y=420;
        g0(`translate(${x} ${y}) scale(${q})`);
        if(i===0){ path('M-90 -40 h60 l20 22 h100 v118 h-180 z',{fill:C.gold,stroke:'none'}); rect(-90,-10,180,110,{fill:'#ffd27a',r:8}); }
        if(i===1){ line(-110,30,110,30,{stroke:C.muted,sw:6}); for(let c=0;c<5;c++) circ(-100+c*50,30,16*ease(ap(t,K.history+.2+c*.15,.3)),{fill:C.green}); }
        if(i===2){ rect(-140,-10,280,80,{fill:'#ffffff',r:40}); rect(-112,18,30,24,{fill:C.green,r:5}); path('M-107 18 v-8 a10 10 0 0 1 20 0 v8',{stroke:C.green,sw:5}); text(25,44,'your.domain',{size:32,fill:C.navy}); }
        text(0,170,lab,{size:46}); g1(); });
      text(540,930,'Yours',{size:60,fill:C.gold,op:ease(ap(t,K.files+.3,.5))});
    } else {
      const hosts=['Host A','Host B','Host C']; hosts.forEach((h,i)=>{ const x=200+i*340; rect(x-130,620,260,150,{fill:C.ink,stroke:C.line,sw:4,r:20}); text(x,715,h,{size:38,fill:C.muted}); });
      const u=(t-K.move)/1.4; const seg=Math.min(2,Math.floor(u)); const f=ease(u-Math.floor(u)); const from=200+Math.min(seg,2)*340, to=200+Math.min(seg+1,2)*340;
      const x=seg>=2?to:from+(to-from)*f, y=seg>=2?470:470-Math.sin(Math.PI*f)*170;
      for(let i=0;i<2;i++) path(`M${200+i*340+60} 560 Q ${370+i*340} 360 ${540+i*340-60} 560`,{stroke:C.gold,sw:4,op:.5});
      site(x-110,y-150,220,300,1);
      text(540,930,'Move it anywhere',{size:56});
    }
    g1(); }
  else if (t < K.voice) { const p=fade(t,K.checked,K.voice);
    g0('',p);
    if (t < K.yes) { const checks=['Tests','Policy','Leak scan','Signature'];
      checks.forEach((c,i)=>{ const y=230+i*150; const q=ease(ap(t,K.checked+.3+i*.55,.4)); rect(170,y,740,110,{fill:C.card,r:22,op:q}); text(220,y+72,c,{anchor:'start',size:50,op:q}); tick(840,y+55,38,ap(t,K.checked+.6+i*.55,.5)); });
      text(540,930,'Checked before it goes live',{size:52});
    } else { const q=back(ap(t,K.yes,.5)); g0(`translate(540 420) scale(${q})`);
      rect(-260,-260,520,440,{fill:'#f6efe2',r:28}); site(-230,-230,460,250,4); const ok=ap(t,K.saysyes+.3,.4);
      rect(-200,40,400,80,{fill:ok>0?C.green:'#f3e2b8',r:40}); text(0,95,ok>0?'Approved':'Waiting for a yes',{size:38,fill:C.navy}); g1();
      const bp=ap(t,K.saysyes,.25), sc=1-.12*Math.sin(Math.PI*bp); g0(`translate(540 790) scale(${sc})`); rect(-170,-60,340,120,{fill:C.gold,r:60}); text(0,22,'Yes',{size:66,fill:C.navy}); g1();
      text(540,960,'Posted only with a person’s yes',{size:46,op:ease(ap(t,K.yes+.4,.5))}); }
    g1(); }
  else if (spec.stats && t >= T.duration + 0.6) { statsCard(t - T.duration - 0.6); }
  else { const p=ease(ap(t,K.voice,.5));
    g0('',p); rect(330,300,420,90,{fill:C.card,r:45,stroke:C.gold,sw:4}); text(540,360,'AI-generated voice',{size:38,fill:C.gold});
    const q=back(ap(t,K.url,.6)); g0(`translate(540 620) scale(${q})`); text(0,0,'sovereignwebsite.ai',{size:92,fill:C.gold}); g1();
    text(540,760,'Websites you own',{size:50,op:ease(ap(t,K.url+.6,.5))}); const hq=ease(ap(t,K.url+1.4,.5)); rect(200,830,680,86,{fill:C.card,r:43,stroke:C.line,sw:3,op:hq}); text(540,887,'See the sites: hub.sovereignweb.site',{size:34,fill:C.white,op:hq}); g1(); }
};
function statsCard(u){ const P=spec.stats.pages, n=Math.min(P.length-1, Math.floor(u/spec.stats.page)), lu=u-n*spec.stats.page, pg=P[n];
  const FR=Math.ceil(DUR*30), fill=v=>v.replace('{FRAMES}',FR.toLocaleString('en-GB')).replace('{DUR}',DUR.toFixed(1));
  const inP = ease(ap(lu,0,.45)), outP = n<P.length-1 ? 1-ease(ap(lu,spec.stats.page-.35,.35)) : 1;
  g0('', inP*outP);
  text(72,200,'A moment in time',{anchor:'start',size:30,fill:C.muted,w:500,ls:'.12em'});
  text(72,262,pg.title,{anchor:'start',size:60,fill:C.gold});
  for(let k=0;k<P.length;k++) circ(940+k*30,240,9,{fill:k===n?C.gold:C.line});
  pg.rows.forEach(([a,b],i)=>{ const q=ease(ap(lu,.15+i*.12,.4)), y=330+i*112;
    g0(`translate(${40*(1-q)} 0)`,q); line(72,y-8,1008,y-8,{stroke:C.line,sw:2,op:.6});
    text(72,y+32,a,{anchor:'start',size:28,w:500,fill:C.muted}); text(72,y+80,fill(b),{anchor:'start',size:38}); g1(); });
  g1(); }
// ---------- TEAM ----------
const ROLES=[['conductor','Conductor','Plans the work'],['factory','Factory','Request to live site'],['sites','Sites','Build and look after'],['design','Design','Design rounds'],['security','Security','Reviews before live'],['hub','Hub','Maps every site'],['obs','Observability','Watches traffic'],['library','Library','Keeps what we learn'],['instagram','Instagram','Prepares posts'],['studio','Studio','Makes the videos']];
function glyph(k,x,y,s,col){ const o={stroke:col,sw:s*.09};
  if(k==='conductor'){ circ(x,y,s*.42,{fill:'none',stroke:col,sw:s*.09}); line(x,y,x,y-s*.28,o); line(x,y,x+s*.2,y+.08*s,o); }
  if(k==='factory') path(`M${x-s*.45} ${y+s*.35} v-${s*.4} l${s*.3} ${s*.2} v-${s*.2} l${s*.3} ${s*.2} v-${s*.45} h${s*.3} v${s*.85} z`,{stroke:col,sw:s*.08});
  if(k==='sites'){ rect(x-s*.45,y-s*.33,s*.9,s*.66,{fill:'none',stroke:col,sw:s*.08,r:s*.08}); line(x-s*.45,y-s*.15,x+s*.45,y-s*.15,o); }
  if(k==='design'){ circ(x-s*.15,y-s*.1,s*.22,{fill:'none',stroke:col,sw:s*.08}); circ(x+s*.18,y+s*.15,s*.22,{fill:'none',stroke:col,sw:s*.08}); }
  if(k==='security') path(`M${x} ${y-s*.45} l${s*.38} ${s*.14} v${s*.25} q0 ${s*.32} -${s*.38} ${s*.5} q-${s*.38} -${s*.18} -${s*.38} -${s*.5} v-${s*.25} z`,{stroke:col,sw:s*.08});
  if(k==='hub'){ circ(x,y,s*.12,{fill:col}); for(let a=0;a<6;a++){const X=x+Math.cos(a)*s*.38,Y=y+Math.sin(a)*s*.38; line(x,y,X,Y,o); circ(X,Y,s*.08,{fill:col});} }
  if(k==='obs') path(`M${x-s*.45} ${y+s*.3} L${x-s*.15} ${y-s*.05} L${x+s*.05} ${y+s*.15} L${x+s*.45} ${y-s*.35}`,{stroke:col,sw:s*.09});
  if(k==='library'){ for(let i=0;i<3;i++) rect(x-s*.4+i*s*.28,y-s*.4,s*.2,s*.8,{fill:'none',stroke:col,sw:s*.07,r:s*.03}); }
  if(k==='instagram'){ rect(x-s*.4,y-s*.4,s*.8,s*.8,{fill:'none',stroke:col,sw:s*.08,r:s*.22}); circ(x,y,s*.18,{fill:'none',stroke:col,sw:s*.08}); circ(x+s*.24,y-s*.24,s*.05,{fill:col}); }
  if(k==='studio'){ rect(x-s*.42,y-s*.28,s*.6,s*.56,{fill:'none',stroke:col,sw:s*.08,r:s*.08}); path(`M${x+s*.2} ${y-s*.1} l${s*.25} -${s*.15} v${s*.5} l-${s*.25} -${s*.15} z`,{stroke:col,sw:s*.07}); }
  if(k==='key'){ circ(x-s*.2,y,s*.18,{fill:'none',stroke:col,sw:s*.08}); line(x-s*.02,y,x+s*.42,y,o); line(x+s*.3,y,x+s*.3,y+s*.15,o); }
}
S.team = t => {
  if (t < K.agents) { const p=fade(t,0,K.agents); g0('',p);
    g0(`translate(540 ${430+30*(1-ease(ap(t,0.1,.6)))})`); text(0,0,'Meet the team',{size:118}); g1();
    const q=ease(ap(t,K.intro,.5)); rect(220,620,640,90,{fill:C.gold,r:45,op:q}); text(540,680,'Conductor · synthetic presenter',{size:34,fill:C.navy,op:q}); g1(); }
  else {
    const p=fade(t,K.agents,1e9); g0('',p);
    // header: who decides
    const dq=ease(ap(t,K.dinis,.5)); rect(300,150,480,84,{fill:C.card,r:42,stroke:C.gold,sw:4,op:dq}); text(540,206,'Dinis Cruz decides',{size:38,fill:C.gold,op:dq});
    // grid of role tiles, 2 x 5
    const keyp=ease(ap(t,K.key,.6)), pol=ease(ap(t,K.policy,.9)), hello=t>K.us?ap(t,K.us,.6):0;
    ROLES.forEach(([k,name,what],i)=>{ const col=i%2, row=Math.floor(i/2); const x=90+col*460, y=270+row*132;
      const born=ap(t,K.agents+.15+i*.12,.4); const lit=t>=K[k]; const glow=lit?Math.max(0,1-(t-K[k])/2.5):0;
      const bounce=hello>0?Math.sin(Math.PI*clamp((t-K.us-i*.06)/.5))*14:0;
      g0(`translate(0 ${-bounce})`, born*(lit?1:.35));
      line(540,234,x+200,y,{stroke:C.gold,sw:2,op:dq*.35});
      rect(x,y,440,112,{fill:lit?C.card:C.ink,r:22,stroke:glow>0?C.gold:(lit?C.line:'none'),sw:4+6*glow});
      glyph(k,x+62,y+56,64,lit?C.gold:C.muted);
      text(x+118,y+52,name,{anchor:'start',size:38}); text(x+118,y+92,what,{anchor:'start',size:26,w:500,fill:C.muted});
      if(keyp>0){ g0(`translate(${x+405} ${y+30})`,clamp(keyp*3-i*.2)); glyph('key',0,0,40,C.gold); g1(); }
      g1(); });
    // the factory pipeline flourish while it is named
    if (t>=K.factory && t<K.sites) { const q=fade(t,K.factory,K.sites); const steps=['Request','Repository','Live site'];
      steps.forEach((s,i)=>{ const x=200+i*340, a=ease(ap(t,K.factory+.6+i*.9,.4)); rect(x-140,915,280,70,{fill:i===2?C.green:C.card,r:35,op:q*a}); text(x,962,s,{size:32,fill:i===2?C.navy:C.white,op:q*a}); if(i<2) line(x+145,950,x+195,950,{stroke:C.gold,sw:5,op:q*ease(ap(t,K.factory+1+i*.9,.3))}); }); }
    else if (t>=K.key && t<K.us) { text(540,965, t<K.policy?'Each signs with its own key':'Inside a policy that says what it may touch',{size:t<K.policy?44:36,fill:C.gold}); }
    else if (t>=K.us) { text(540,965,'Say hello',{size:64,fill:C.gold,op:ease(ap(t,K.hello,.4))}); }
    if (pol>0) rect(70,250,940,680,{fill:'none',stroke:C.green,sw:6,r:34,op:pol*(t<K.us?1:1-ap(t,K.us,.6))});
    g1(); }
};

// ---------- STORY (generic storyboard beats) ----------
function wrapText(str,max){ const w=String(str).split(/\s+/); const L=[]; let c=''; for(const x of w){ if((c+' '+x).trim().length>max){ if(c)L.push(c); c=x; } else c=(c+' '+x).trim(); } if(c)L.push(c); return L; }
function multi(x,y,str,max,o={}){ const L=wrapText(str,max); L.forEach((l,i)=>text(x,y+i*(o.lh||(o.size||48)*1.18),l,o)); return L.length; }
const V = {};
V.title=(v,u)=>{ const q=ease(ap(u,0,.5)); g0(`translate(0 ${30*(1-q)})`,q); const n=multi(540,400,v.text,16,{size:v.size||104}); if(v.sub) multi(540,420+n*122,v.sub,34,{size:44,fill:C.gold,w:700}); g1(); };
V.stat=(v,u)=>{ const q=ease(ap(u,0,1.2)); const num=parseFloat(String(v.value).replace(/[^0-9.]/g,'')); const shown=isNaN(num)?v.value:String(v.value).replace(/[0-9.]+/, String(Math.round(num*q)));
  g0('',ease(ap(u,0,.3))); text(540,520,shown,{size:260,fill:C.gold}); multi(540,640,v.label,30,{size:50}); g1(); };
V.bars=(v,u)=>{ const it=v.items.slice(0,7), mx=Math.max(...it.map(x=>x.value)); it.forEach((x,i)=>{ const y=240+i*104, q=ease(ap(u,.2+i*.18,.8)); text(72,y+44,x.label,{anchor:'start',size:34,op:ease(ap(u,i*.18,.3))});
  rect(72,y+58,760*(x.value/mx)*q,30,{fill:i?C.blue:C.gold,r:15}); text(72+760*(x.value/mx)*q+16,y+84,String(Math.round(x.value*q)),{anchor:'start',size:32,fill:C.white,op:q}); }); };
V.timeline=(v,u)=>{ const it=v.items.slice(0,6); line(150,230,150,230+ (it.length-1)*120*ease(ap(u,0,1.5)),{stroke:C.gold,sw:6}); it.forEach((x,i)=>{ const y=230+i*120, q=back(ap(u,.3+i*.45,.4));
  circ(150,y,18*q,{fill:C.gold}); text(200,y-6,x.when,{anchor:'start',size:30,fill:C.gold,op:q}); text(200,y+40,x.what.length>40?x.what.slice(0,39)+'…':x.what,{anchor:'start',size:36,op:q}); }); };
V.flow=(v,u)=>{ const it=v.nodes.slice(0,4); it.forEach((x,i)=>{ const y=230+i*190, q=back(ap(u,.2+i*.6,.45)); g0(`translate(540 ${y+60}) scale(${q})`); rect(-330,-62,660,124,{fill:i===it.length-1?C.green:C.card,r:62,stroke:C.gold,sw:i===it.length-1?0:4});
  text(0,16,x,{size:42,fill:i===it.length-1?C.navy:C.white}); g1(); if(i<it.length-1) path(`M540 ${y+128} v52 m-22 -22 l22 22 l22 -22`,{stroke:C.gold,sw:6,op:ease(ap(u,.5+i*.6,.3))}); }); };
V.list=(v,u)=>{ v.items.slice(0,6).forEach((x,i)=>{ const y=230+i*118, q=ease(ap(u,.2+i*.4,.4)); rect(110,y,860,96,{fill:C.card,r:20,op:q}); tick(170,y+48,30,ap(u,.4+i*.4,.5)); text(225,y+62,x.length>34?x.slice(0,33)+'…':x,{anchor:'start',size:38,op:q}); }); };
V.cards=(v,u)=>{ const it=v.items.slice(0,8); it.forEach((x,i)=>{ const col=i%2,row=Math.floor(i/2), X=90+col*460, Y=230+row*170, q=back(ap(u,.2+i*.22,.45));
  g0(`translate(${X+220} ${Y+75}) scale(${q}) translate(${-X-220} ${-Y-75})`); rect(X,Y,440,150,{fill:C.card,r:24,stroke:i===0?C.gold:C.line,sw:4}); if(x.icon) glyph(x.icon,X+65,Y+75,64,C.gold);
  text(X+(x.icon?125:30),Y+68,x.title,{anchor:'start',size:36}); if(x.sub) text(X+(x.icon?125:30),Y+112,x.sub.length>24?x.sub.slice(0,23)+'…':x.sub,{anchor:'start',size:26,w:500,fill:C.muted}); g1(); }); };
V.quote=(v,u)=>{ const q=ease(ap(u,0,.5)); rect(90,250,900,520,{fill:'#0a1220',r:26,stroke:C.line,sw:3,op:q}); for(let k=0;k<3;k++) circ(140+k*36,290,10,{fill:[C.red,C.gold,C.green][k],op:q});
  const full=String(v.text), n=Math.floor(full.length*clamp((u-.4)/1.6)); multi(130,400,'> '+full.slice(0,n),30,{anchor:'start',size:44,fill:'#d7f5e1',w:500,lh:62}); if(v.by) text(130,730,v.by,{anchor:'start',size:30,fill:C.gold,op:ease(ap(u,1.8,.4))}); };
V.compare=(v,u)=>{ [v.left,v.right].forEach((s,j)=>{ const X=80+j*470, q=ease(ap(u,.2+j*.5,.5)); rect(X,230,450,640,{fill:j?C.card:C.ink,r:26,stroke:j?C.gold:C.line,sw:4,op:q}); text(X+225,300,s.title,{size:42,fill:j?C.gold:C.muted,op:q});
  s.points.slice(0,4).forEach((p,i)=>multi(X+40,390+i*120,p,18,{anchor:'start',size:32,op:ease(ap(u,.6+j*.5+i*.2,.3))})); }); };
V.agents=(v,u)=>{ const it=v.items.slice(0,9), mx=Math.max(...it.map(x=>x.count)); it.forEach((x,i)=>{ const a=-Math.PI/2+i*2*Math.PI/it.length, r=i?300:0, R=i?300:0;
  const px=540+Math.cos(a)*(i?290:0), py=540+Math.sin(a)*(i?290:0)*.95, rad=(40+60*Math.sqrt(x.count/mx))*back(ap(u,.15+i*.15,.5));
  if(i) line(540,540,px,py,{stroke:C.gold,sw:3,op:.4*ease(ap(u,.3+i*.15,.4))}); circ(px,py,rad,{fill:i?C.card:C.gold,stroke:C.gold,sw:4}); text(px,py+(i?2:-4),x.name,{size:i?26:36,fill:i?C.white:C.navy}); text(px,py+(i?34:36),String(x.count),{size:i?26:34,fill:i?C.gold:C.navy}); }); };
V.image=(v,u)=>{ const q=ease(ap(u,0,.5)), z=1+0.04*clamp(u/8); g0(`translate(540 520) scale(${z*(0.96+0.04*q)}) translate(-540 -520)`,q);
  rect(60,150,960,760,{fill:'#0a0a09',r:24,stroke:C.line,sw:3}); add(`<image href="${esc(v.local)}" x="72" y="162" width="936" height="736" preserveAspectRatio="xMidYMid meet"/>`); g1();
  if(v.credit) text(540,945,v.credit,{size:24,w:500,fill:C.muted,op:q}); };
S.story = t => { const B=spec.beats; let k=0; for(let i=0;i<B.length;i++) if(t>=K[B[i].id]) k=i; const b=B[k], t0=K[b.id], t1=k<B.length-1?K[B[k+1].id]:T.duration+spec.tail, u=t-t0;
  if (spec.stats && t >= T.duration + 0.6) { statsCard(t - T.duration - 0.6); return; }
  const p=fade(t,t0,t1+.01,.3); g0('',p); (V[b.visual.kind]||V.title)(b.visual,u); if(b.visual.caption) text(540,965,b.visual.caption,{size:46,fill:C.gold,op:ease(ap(u,.5,.4))}); g1(); };

// ---------- stage ----------
const st = spec.stage;
const show = await mount(document.getElementById('stage'), { presenters:[spec.presenter], duration:DUR, background:C.stage, tags:false,
  auto:{idle:true,blink:true,fidget:true}, tracks:{v:{mouthCues:T.mouth}},
  cues:[{t:0,who:spec.presenter,do:'speak',track:'v',dur:T.duration}, ...spec.cues.map(c=>({...c,t:(typeof c.t==='string'?K[c.t]+(c.dt||0):c.t),who:spec.presenter}))],
  camera:[{t:0,focus:spec.presenter,dist:st.dist,h:st.h,lh:st.lh,fov:st.fov||28}] });
const subEl=document.getElementById('sub'), bar=document.getElementById('bar'), viz=document.getElementById('viz');
const cov=document.getElementById('cover');
if (spec.cover){ cov.querySelector('.date').textContent=spec.cover.date; cov.querySelector('.kick').textContent=spec.cover.kicker; cov.querySelector('h1').innerHTML=spec.cover.headline; cov.querySelector('.sub').textContent=spec.cover.sub; }
window.render = T0 => { const t = T0 - LEAD;
  if (spec.cover){ const o = T0 < LEAD ? 1 : 1-clamp((T0-LEAD)/0.4); cov.style.display = o>0 ? 'block':'none'; cov.style.opacity = o; }
  svg=''; S[spec.scene](Math.max(0,t)); viz.innerHTML=svg;
  const s=T.subs.find(s=>t>=s.t0-0.05&&t<=s.t1+0.5);
  subEl.innerHTML = s ? '<span>'+s.words.map(w=>t>=w[1]-0.02?`<b>${esc(w[0])}</b>`:esc(w[0])).join(' ')+'</span>' : '';
  bar.style.width = (936*clamp(T0/DUR))+'px'; show.renderAt(Math.max(0,t)); };
window.LEAD = LEAD;
window.DUR = DUR; window.ready = true;
</script></body></html>
