(()=>{
'use strict';
const tree=document.getElementById('tree'),canvas=document.getElementById('c');if(!tree||!canvas)return;

// ---------- TOUCH SORTING V4 ----------
// Long-press then drag: reliable on iPad and avoids stealing a normal tap.
const ORDER_KEY='neural-kit:principal-order:v2';
let saved=[];try{saved=JSON.parse(localStorage.getItem(ORDER_KEY)||'[]')}catch(_){saved=[]}
let lock=false,drag=null,hold=null,pid=null,start=null;
const cards=()=>[...tree.children].filter(x=>x.classList?.contains('principalCard'));
const cid=x=>x?.querySelector(':scope > .treeLine [data-card]')?.dataset.card||'';
function persist(){saved=cards().map(cid).filter(Boolean);localStorage.setItem(ORDER_KEY,JSON.stringify(saved))}
function apply(){if(lock)return;lock=true;const all=cards(),rank=new Map(saved.map((x,i)=>[x,i]));all.sort((a,b)=>(rank.get(cid(a))??999)-(rank.get(cid(b))??999));all.forEach(x=>tree.appendChild(x));bind();lock=false}
function place(y){if(!drag)return;const others=cards().filter(x=>x!==drag);let before=null;for(const o of others){const r=o.getBoundingClientRect();if(y<r.top+r.height/2){before=o;break}}before?tree.insertBefore(drag,before):tree.appendChild(drag)}
function cancelHold(){if(hold){clearTimeout(hold);hold=null}}
function bind(){cards().forEach(el=>{if(el.dataset.sortV4)return;el.dataset.sortV4='1';const row=el.querySelector(':scope > .treeLine > .treeRow');if(!row)return;row.style.touchAction='pan-y';row.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;cancelHold();pid=e.pointerId;start={x:e.clientX,y:e.clientY};hold=setTimeout(()=>{drag=el;el.classList.add('nkDragging');row.style.touchAction='none';try{row.setPointerCapture(e.pointerId)}catch(_){ }navigator.vibrate?.(18)},260)});row.addEventListener('pointermove',e=>{if(pid!==e.pointerId)return;if(!drag){if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)cancelHold();return}e.preventDefault();place(e.clientY)});const end=e=>{if(pid!==e.pointerId)return;cancelHold();if(drag){e.preventDefault();e.stopImmediatePropagation();persist();drag.classList.remove('nkDragging');row.style.touchAction='pan-y'}drag=null;pid=null;start=null};row.addEventListener('pointerup',end,true);row.addEventListener('pointercancel',end,true)})}
const st=document.createElement('style');st.textContent=`.principalCard{transition:transform .15s ease,opacity .15s ease}.principalCard.nkDragging{opacity:.76;transform:scale(1.018);z-index:80;filter:drop-shadow(0 12px 24px rgba(0,0,0,.45))}.principalCard>.treeLine>.treeRow:before{content:'≡';position:absolute;left:3px;top:50%;transform:translateY(-50%);font-size:10px;color:rgba(255,255,255,.22)}.principalCard.nkDragging>.treeLine>.treeRow:before{color:#fff}.principalCard>.treeLine>.treeRow{padding-left:17px!important}`;document.head.appendChild(st);
new MutationObserver(()=>requestAnimationFrame(apply)).observe(tree,{childList:true});setTimeout(apply,100);

// ---------- EPHEMERAL DETAIL CARD ----------
const panel=document.getElementById('detailPanel');
function closeDetail(){panel?.classList.remove('open')}
// Selecting another node replaces the old card; navigating the space dismisses it.
const selectV4=selectNode;selectNode=function(n,open){closeDetail();selectV4(n,open)};
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='pen'||e.pointerType==='mouse')closeDetail()},true);
document.getElementById('resetUniverse')?.addEventListener('click',closeDetail,true);
document.getElementById('universeBadge')?.addEventListener('click',closeDetail,true);
// Save buttons close only after their normal save handler has had a chance to persist.
['saveTask','saveColor'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>setTimeout(closeDetail,120)));

// ---------- PINCH: PURE CONTINUOUS CAMERA ----------
const pts=new Map();let one=null,pinch=null;const vals=()=>[...pts.values()];
function sync(){pointers.clear();for(const[id,p]of pts)pointers.set(id,p)}
function beginPinch(){const a=vals();if(a.length!==2)return;const cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2,d=Math.max(24,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y));pinch={d,cx,cy,z:zoom,px:panX,py:panY,cz:camZ};one=null;focusTarget=null;rotV*=.2;tiltV*=.2}
canvas.onpointerdown=e=>{closeDetail();canvas.setPointerCapture?.(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});sync();focusTarget=null;if(pts.size===1)one={sx:e.clientX,sy:e.clientY,lastT:performance.now(),time:performance.now(),moved:false};else if(pts.size===2)beginPinch()};
canvas.onpointermove=e=>{if(!pts.has(e.pointerId))return;const prev=pts.get(e.pointerId),now=performance.now();pts.set(e.pointerId,{x:e.clientX,y:e.clientY});sync();if(pts.size===1&&one){const dx=e.clientX-prev.x,dy=e.clientY-prev.y,dt=Math.max(8,now-one.lastT);rot+=dx*.006;tilt=Math.max(-.82,Math.min(.82,tilt+dy*.003));rotV=rotV*.55+dx*.006*(16.67/dt)*.45;tiltV=tiltV*.58+dy*.003*(16.67/dt)*.42;one.lastT=now;if(Math.hypot(e.clientX-one.sx,e.clientY-one.sy)>7)one.moved=true;return}if(pts.size===2&&pinch){const a=vals(),cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2,d=Math.max(24,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)),ratio=d/pinch.d,nz=Math.max(.28,Math.min(5.2,pinch.z*ratio)),centerX=sideW()+(W-sideW())/2,centerY=H*.46,k=nz/pinch.z;zoom=nz;camZ=pinch.cz;panX=(pinch.cx-centerX)-(pinch.cx-centerX-pinch.px)*k+(cx-pinch.cx);panY=(pinch.cy-centerY)-(pinch.cy-centerY-pinch.py)*k+(cy-pinch.cy)}};
function finish(e){const click=pts.size===1&&one&&!one.moved&&performance.now()-one.time<350;pts.delete(e.pointerId);sync();if(click){const h=[...hit].sort((a,b)=>b.z-a.z).find(o=>Math.hypot(e.clientX-o.x,e.clientY-o.y)<o.r);if(h)selectNode(h.n,true)}if(pts.size===1){const q=vals()[0];one={sx:q.x,sy:q.y,lastT:performance.now(),time:performance.now(),moved:false};pinch=null}else if(!pts.size){one=null;pinch=null}}
canvas.onpointerup=finish;canvas.onpointercancel=finish;canvas.onwheel=e=>{e.preventDefault();closeDetail();const old=zoom,nz=Math.max(.28,Math.min(5.2,old*Math.exp(-e.deltaY*.0012))),cx=e.clientX,cy=e.clientY,centerX=sideW()+(W-sideW())/2,centerY=H*.46,k=nz/old;zoom=nz;panX=(cx-centerX)-(cx-centerX-panX)*k;panY=(cy-centerY)-(cy-centerY-panY)*k};
const hint=document.querySelector('.hint');if(hint)hint.textContent='Mantén una tarjeta y arrástrala · 2 dedos: zoom libre';
})();