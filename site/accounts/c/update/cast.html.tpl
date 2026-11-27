<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>reel</title>
<style>
@font-face{font-family:Inter;src:url(fonts/Inter-Bold.otf);font-weight:700}
@font-face{font-family:Inter;src:url(fonts/Inter-Medium.otf);font-weight:500}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#000;font-family:Inter,sans-serif}
#deck{position:absolute;left:0;top:0;width:1080px;height:1920px}
#st{position:absolute;left:0;top:836px;width:1080px;height:700px;visibility:hidden}
#ov{position:absolute;left:0;top:836px;width:1080px;height:700px}
#viz{position:absolute;left:0;top:0;width:1080px;height:1920px}
#title{position:absolute;left:0;top:0;width:1080px;height:150px;background:linear-gradient(rgba(0,0,0,.72),rgba(0,0,0,0))}
#title b{position:absolute;left:64px;top:46px;font:700 40px Inter;color:#fff;letter-spacing:-.01em}
#who{position:absolute;right:64px;top:48px;font:500 26px Inter;color:var(--navy);background:var(--gold);border-radius:30px;padding:8px 22px}
#ai{position:absolute;left:64px;top:846px;z-index:5;font:700 28px Inter;color:#fff;background:rgba(8,14,26,.82);border:2px solid var(--gold);border-radius:24px;padding:6px 18px}
#sub{position:absolute;left:60px;right:60px;top:1418px;height:100px;text-align:center;display:flex;align-items:center;justify-content:center;z-index:6}
#sub span{display:inline;font:700 44px/1.3 Inter;color:#fff;background:rgba(8,14,26,.8);box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:6px 18px;border-radius:14px}
#sub b{color:var(--gold);font-weight:700}
#bar{position:absolute;left:64px;top:1524px;height:8px;width:0;background:var(--gold);border-radius:4px;z-index:6}
#cover{position:absolute;left:0;top:0;width:1080px;height:1920px;display:none;z-index:9}
</style></head><body>
<img id="deck" alt=""><div id="st"></div><canvas id="ov" width="1080" height="700"></canvas>
<svg id="viz" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg"></svg>
<div id="title"><b></b><div id="who"></div></div><div id="ai">Synthetic presenter · voice made by AI</div>
<div id="bar"></div><div id="sub"></div><img id="cover" alt="">
<script type="module">
// The character version of a Reel (instagram.c's brief for Dinis, 27 Nov 2026): a deck film full frame, the library's presenters
// keyed over it in the lower space (floor hidden, key colour removed in the page; the characters are not changed), props drawn on
// top, subtitles and a progress bar above the bottom fifth, which a feed covers. Every frame is a pure function of t.
const HREF = 'hr'+'ef';
const spec = await (await fetch(new URLSearchParams(location.search).get('spec') || 'spec.json')).json();
const T = await (await fetch(spec.timing)).json(); const K = T.keys; const LEAD = spec.cover ? spec.cover.hold : 0; const DUR = LEAD + T.duration + spec.tail;
document.getElementById('who').textContent = spec.label; document.querySelector('#title b').textContent = spec.title || '';
const C = Object.assign({ navy:'#0f0f0e', ink:'#1d1d1b', card:'#262623', line:'#3d3d37', gold:'#4fc48f', white:'#f7f6f2', muted:'#b9b6ab', green:'#3fb57f', red:'#e86a5a', blue:'#1a7f5a', stage:'#1f1f1d' }, (spec.theme||{}).colours||{});
const R = document.documentElement.style; for (const [k,v] of Object.entries(C)) R.setProperty('--'+k, v);
let svg=''; const add=s=>svg+=s;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
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

// ---------- props: small drawn objects that move with the presenters ----------
const ICON = {
  cookie:(s)=>{ circ(0,0,s,{fill:'#c98a4b'}); [[-.35,-.3],[.3,-.1],[-.1,.35],[.38,.38],[-.45,.15]].forEach(([a,b])=>circ(a*s,b*s,s*.12,{fill:'#5a3418'})); },
  server:(s)=>{ rect(-s*.8,-s,s*1.6,s*2,{fill:'#2a3240',r:10,stroke:'#8aa0b8',sw:3}); for(let k=0;k<3;k++){ rect(-s*.6,-s*.75+k*s*.6,s*1.2,s*.35,{fill:'#3b4659',r:4}); circ(s*.42,-s*.57+k*s*.6,s*.07,{fill:'#5cff9a'}); } path(`M0 ${s} C 0 ${s*1.5}, ${s*.6} ${s*1.4}, ${s*.7} ${s*1.9}`,{stroke:'#8aa0b8',sw:4}); },
  plug:(s)=>{ rect(-s*.3,-s*.4,s*.6,s*.8,{fill:'#8aa0b8',r:4}); line(-s*.15,-s*.4,-s*.15,-s*.75,{stroke:'#cfd8e6',sw:5}); line(s*.15,-s*.4,s*.15,-s*.75,{stroke:'#cfd8e6',sw:5}); },
  eye:(s)=>{ path(`M${-s} 0 Q 0 ${-s*.8} ${s} 0 Q 0 ${s*.8} ${-s} 0 Z`,{fill:'#f1f1ea',stroke:'#e86a5a',sw:4}); circ(0,0,s*.36,{fill:'#e86a5a'}); circ(0,0,s*.16,{fill:'#111'}); },
  stamp:(s)=>{ rect(-s,-s*.55,s*2,s*1.1,{fill:'none',stroke:'#4fc48f',sw:6,r:8}); text(0,s*.22,'KEPT',{size:s*.62,fill:'#4fc48f'}); },
  handle:(s)=>{ circ(0,0,s,{fill:'#f7f6f2',stroke:'#4fc48f',sw:5}); line(-s*.3,-s*.35,-s*.3,s*.35,{stroke:'#4fc48f',sw:4}); line(s*.3,-s*.35,s*.3,s*.35,{stroke:'#4fc48f',sw:4}); },
  frame:(s)=>{ site(-s,-s*.7,s*2,s*1.4,1,{stroke:'#4fc48f',sw:4}); },
  tile:(s)=>{ rect(-s,-s*.5,s*2,s,{fill:'#4fc48f',r:6,op:.55}); },
  spark:(s)=>{ for(let k=0;k<6;k++){ const a=k*Math.PI/3; line(Math.cos(a)*s*.3,Math.sin(a)*s*.3,Math.cos(a)*s,Math.sin(a)*s,{stroke:'#f0d36a',sw:4}); } },
  zz:(s)=>{ text(0,0,'z',{size:s,fill:'#cfd8e6',w:700}); text(s*.6,-s*.6,'z',{size:s*.75,fill:'#cfd8e6',w:700}); },
  bubble:(s,p)=>{ const w=Math.max(160,(p.text||'').length*s*.55); rect(-w/2,-s*1.1,w,s*1.6,{fill:'#f7f6f2',r:s*.8}); path(`M-10 ${s*.5} L 0 ${s*1.1} L 14 ${s*.5}`,{fill:'#f7f6f2',stroke:'none',sw:0}); text(0,s*.05,p.text||'',{size:s*.62,fill:'#111'}); }
};
function drawProps(b, u){ for(const p of (b.props||[])){ const a=p.t0??0, z=p.t1??(a+1.2); if(u<a-0.001 || u>z+(p.hold??0.6)) continue;
    const q=p.ease==='back'?back((u-a)/(z-a)):ease((u-a)/(z-a)); const [x0,y0]=p.from, [x1,y1]=p.to||p.from;
    const x=x0+(x1-x0)*q, y=y0+(y1-y0)*q - (p.arc||0)*Math.sin(Math.PI*clamp((u-a)/(z-a)));
    const op=Math.min(ap(u,a,.15), 1-ap(u,z+(p.hold??0.6)-.25,.25)), rot=(p.spin||0)*q;
    g0(`translate(${x} ${y}) rotate(${rot}) scale(${p.scale||1})`, op*(p.op??1)); ICON[p.icon](p.size||40,p); g1(); } }
function statsCard(u){ const P=spec.stats.pages, D=P.map(p=>p.seconds||spec.stats.page); let n=0, acc=0; while(n<P.length-1 && u>=acc+D[n]){ acc+=D[n]; n++; } const lu=u-acc, pg=P[n];
  const FR=Math.ceil(DUR*30), fill=v=>v.replace('{FRAMES}',FR.toLocaleString('en-GB')).replace('{DUR}',DUR.toFixed(1));
  const inP = ease(ap(lu,0,.45)), outP = n<P.length-1 ? 1-ease(ap(lu,D[n]-.35,.35)) : 1;
  g0('', inP*outP);
  text(72,200,pg.kicker||'A moment in time',{anchor:'start',size:30,fill:C.muted,w:500,ls:'.12em'});
  text(72,262,pg.title,{anchor:'start',size:60,fill:C.gold});
  for(let k=0;k<P.length;k++) circ(940+k*30,240,9,{fill:k===n?C.gold:C.line});
  pg.rows.forEach(([a,b],i)=>{ const q=ease(ap(lu,.15+i*.12,.4)), y=330+i*112;
    g0(`translate(${40*(1-q)} 0)`,q); line(72,y-8,1008,y-8,{stroke:C.line,sw:2,op:.6});
    text(72,y+32,a,{anchor:'start',size:28,w:500,fill:C.muted}); text(72,y+80,fill(b),{anchor:'start',size:fill(b).length>46?Math.floor(38*46/fill(b).length):38}); g1(); });
  g1(); }

// ---------- the deck film ----------
const deckImg=document.getElementById('deck'); const D=spec.deck; let lastSrc='';
function deckFrame(t){ const B=spec.beats, L=spec.beat_lead||0, at=i=>i?K[B[i].id]-L:0; let k=0; for(let i=0;i<B.length;i++) if(t>=at(i)) k=i;
  const v=B[k].visual||{}; if(t>=T.duration+0.6 || v.at==null) return null; const ds=v.at+(t-at(k))*(v.rate||1);
  const n=Math.max(0,Math.min(D.frames-1, Math.round(ds*D.fps))); return `${D.dir}/${String(n).padStart(5,'0')}.jpg`; }
// ---------- the presenters, keyed over the deck ----------
const st=spec.stage||{}; let show=null, ovx=null, srcCanvas=null;
if (spec.cast && spec.cast.length){
  const {mount}=await import('./lib/presenters/presenters.js');
  const B=spec.beats, L=spec.beat_lead||0, at=i=>i?K[B[i].id]:0, end=i=>i<B.length-1?K[B[i+1].id]:T.duration;
  const cues=[];
  B.forEach((b,i)=>{ const who=b.speaker||spec.cast[0]; cues.push({t:at(i),who,do:'speak',track:'v',dur:Math.max(.3,end(i)-at(i)-.2)});
    (b.cast_cues||[]).forEach(c=>cues.push({...c,t:Math.max(0,at(i)-L+(c.dt||0))})); });
  (spec.end_cues||[]).forEach(c=>cues.push({...c,t:T.duration+(c.dt||0)}));
  show=await mount(document.getElementById('st'),{presenters:spec.cast,duration:DUR,tags:false,background:'#00ff00',auto:{idle:true,blink:true,fidget:true},
    tracks:{v:{mouthCues:T.mouth}},cues,slots:spec.slots||undefined,camera:[{t:0,pos:st.pos||[0,1.5,4.2],look:st.look||[0,0.9,-1.5],fov:st.fov||40}]});
  show.stage.set.visible=false; srcCanvas=document.querySelector('#st canvas'); ovx=document.getElementById('ov').getContext('2d',{willReadFrequently:true});
}
function keyed(t){ if(!show) return; show.renderAt(Math.max(0,t)); ovx.clearRect(0,0,1080,700); ovx.drawImage(srcCanvas,0,0,1080,700);
  const im=ovx.getImageData(0,0,1080,700), d=im.data; for(let i=0;i<d.length;i+=4){ const r=d[i],g=d[i+1],b=d[i+2], k=g-Math.max(r,b); if(k>60) d[i+3]=0; else if(k>25){ d[i+3]=255*(60-k)/35; d[i+1]=Math.max(r,b); } }
  ovx.putImageData(im,0,0); }
const subEl=document.getElementById('sub'), bar=document.getElementById('bar'), viz=document.getElementById('viz'), cov=document.getElementById('cover');
if (spec.cover && spec.cover.image) cov.src=spec.cover.image;
window.render = async T0 => { const t=T0-LEAD;
  if (spec.cover){ const o = T0 < LEAD ? 1 : 1-clamp((T0-LEAD)/0.4); cov.style.display = o>0?'block':'none'; cov.style.opacity=o; }
  const f=deckFrame(Math.max(0,t)); if(f && f!==lastSrc){ deckImg.src=f; lastSrc=f; try{ await deckImg.decode(); }catch(e){} } deckImg.style.visibility=f?'visible':'hidden';
  svg=''; const B=spec.beats, L=spec.beat_lead||0, at=i=>i?K[B[i].id]-L:0; let k=0; for(let i=0;i<B.length;i++) if(t>=at(i)) k=i;
  if (spec.stats && t >= T.duration + 0.6){ rect(0,0,1080,1920,{fill:C.navy,r:0}); g0('translate(0 380)'); statsCard(t-T.duration-0.6); g1(); }
  else if (t>=0) drawProps(B[k], t-at(k));
  viz.innerHTML=svg; keyed(t);
  const s=T.subs.find(s=>t>=s.t0-0.05&&t<=s.t1+0.5);
  subEl.innerHTML = s ? '<span>'+s.words.map(w=>t>=w[1]-0.02?`<b>${esc(w[0])}</b>`:esc(w[0])).join(' ')+'</span>' : '';
  bar.style.width=(952*clamp(T0/DUR))+'px'; };
window.LEAD=LEAD; window.DUR=DUR; window.ready=true;
</script></body></html>
