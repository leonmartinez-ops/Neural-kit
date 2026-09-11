(()=>{
'use strict';
// Neural Kit UI V3: continuous, non-semantic pinch + draggable principal universe order.
const tree=document.getElementById('tree'),canvas=document.getElementById('c');
if(!tree||!canvas)return;

// ---------- DRAGGABLE SIDEBAR PRIORITY ----------
const ORDER_KEY='neural-kit:principal-order:v1';
let savedOrder=[];try{savedOrder=JSON.parse(localStorage.getItem(ORDER_KEY)||'[]')}catch(_){savedOrder=[]}
let sorting=false,dragEl=null,dragPointer=null,startY=0,moved=false;
function principalCards(){return [...tree.children].filter(el=>el.classList?.contains('principalCard'))}
function cardId(el){return el?.querySelector(':scope > .treeLine [data-card]')?.dataset.card||''}
function applyOrder(){if(sorting)return;sorting=true;const cards=principalCards();if(cards.length){const rank=new Map(savedOrder.map((id,i)=>[id,i]));cards.sort((a,b)=>(rank.get(cardId(a))??9999)-(rank.get(cardId(b))??9999));cards.forEach(el=>tree.appendChild(el));bindCards()}sorting=false}
function persistOrder(){savedOrder=principalCards().map(cardId).filter(Boolean);localStorage.setItem(ORDER_KEY,JSON.stringify(savedOrder))}
function bindCards(){principalCards().forEach(el=>{if(el.dataset.dragReady)return;el.dataset.dragReady='1';const row=el.querySelector(':scope > .treeLine > .treeRow');if(!row)return;row.style.touchAction='pan-y';row.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;dragEl=el;dragPointer=e.pointerId;startY=e.clientY;moved=false;row.setPointerCapture?.(e.pointerId)});row.addEventListener('pointermove',e=>{if(dragEl!==el||dragPointer!==e.pointerId)return;const dy=e.clientY-startY;if(!moved&&Math.abs(dy)<10)return;moved=true;el.classList.add('nkDragging');const y=e.clientY;const others=principalCards().filter(x=>x!==el);let before=null;for(const o of others){const r=o.getBoundingClientRect();if(y<r.top+r.height/2){before=o;break}}if(before)tree.insertBefore(el,before);else tree.appendChild(el)});const end=e=>{if(dragEl!==el||dragPointer!==e.pointerId)return;if(moved){e.preventDefault();e.stopPropagation();persistOrder()}el.classList.remove('nkDragging');dragEl=null;dragPointer=null};row.addEventListener('pointerup',end,true);row.addEventListener('pointercancel',end,true)})}
const style=document.createElement('style');style.textContent=`.principalCard{transition:transform .16s ease,opacity .16s ease}.principalCard.nkDragging{opacity:.68;transform:scale(.985);z-index:50}.principalCard>.treeLine>.treeRow:before{content:'⋮⋮';position:absolute;left:2px;top:50%;transform:translateY(-50%) rotate(90deg);font-size:8px;letter-spacing:-2px;color:rgba(255,255,255,.18);opacity:0;transition:.15s}.principalCard>.treeLine>.treeRow:hover:before,.principalCard.nkDragging>.treeLine>.treeRow:before{opacity:1}.principalCard>.treeLine>.treeRow{padding-left:15px!important}`;document.head.appendChild(style);
const observer=new MutationObserver(()=>requestAnimationFrame(applyOrder));observer.observe(tree,{childList:true});setTimeout(applyOrder,80);

// ---------- PINCH V3 ----------
// Pinch is now purely continuous zoom. It NEVER resets, enters or exits a universe on release.
// Universe transitions remain explicit taps / VER TODO, avoiding accidental camera jumps.
const pts=new Map();let one=null,pinch=null;
const values=()=>[...pts.values()];
function beginPinch(){const a=values();if(a.length!==2)return;const cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2,d=Math.max(24,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y));pinch={d,cx,cy,z:zoom,px:panX,py:panY,cz:camZ};one=null;focusTarget=null;rotV*=.25;tiltV*=.25}
canvas.onpointerdown=e=>{canvas.setPointerCapture?.(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});pointers.clear();for(const[id,p]of pts)pointers.set(id,p);focusTarget=null;if(pts.size===1)one={sx:e.clientX,sy:e.clientY,lastX:e.clientX,lastY:e.clientY,lastT:performance.now(),time:performance.now(),moved:false};else if(pts.size===2)beginPinch()};
canvas.onpointermove=e=>{if(!pts.has(e.pointerId))return;const prev=pts.get(e.pointerId),now=performance.now();pts.set(e.pointerId,{x:e.clientX,y:e.clientY});pointers.clear();for(const[id,p]of pts)pointers.set(id,p);if(pts.size===1&&one){const dx=e.clientX-prev.x,dy=e.clientY-prev.y,dt=Math.max(8,now-one.lastT);rot+=dx*.006;tilt=Math.max(-.82,Math.min(.82,tilt+dy*.003));rotV=rotV*.55+dx*.006*(16.67/dt)*.45;tiltV=tiltV*.58+dy*.003*(16.67/dt)*.42;one.lastT=now;if(Math.hypot(e.clientX-one.sx,e.clientY-one.sy)>7)one.moved=true;return}if(pts.size===2&&pinch){const a=values(),cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2,d=Math.max(24,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)),ratio=d/pinch.d;const nz=Math.max(.28,Math.min(5.2,pinch.z*ratio)),centerX=sideW()+(W-sideW())/2,centerY=H*.46,k=nz/pinch.z;zoom=nz;camZ=pinch.cz;panX=(pinch.cx-centerX)-(pinch.cx-centerX-pinch.px)*k+(cx-pinch.cx);panY=(pinch.cy-centerY)-(pinch.cy-centerY-pinch.py)*k+(cy-pinch.cy)}};
function finish(e){const click=pts.size===1&&one&&!one.moved&&performance.now()-one.time<350;pts.delete(e.pointerId);pointers.clear();for(const[id,p]of pts)pointers.set(id,p);if(click){const h=[...hit].sort((a,b)=>b.z-a.z).find(o=>Math.hypot(e.clientX-o.x,e.clientY-o.y)<o.r);if(h)selectNode(h.n,true)}if(pts.size===1){const q=values()[0];one={sx:q.x,sy:q.y,lastX:q.x,lastY:q.y,lastT:performance.now(),time:performance.now(),moved:false};pinch=null}else if(!pts.size){one=null;pinch=null}}
canvas.onpointerup=finish;canvas.onpointercancel=finish;
canvas.onwheel=e=>{e.preventDefault();const old=zoom,nz=Math.max(.28,Math.min(5.2,old*Math.exp(-e.deltaY*.0012))),cx=e.clientX,cy=e.clientY,centerX=sideW()+(W-sideW())/2,centerY=H*.46,k=nz/old;zoom=nz;panX=(cx-centerX)-(cx-centerX-panX)*k;panY=(cy-centerY)-(cy-centerY-panY)*k};
const hint=document.querySelector('.hint');if(hint)hint.textContent='1 dedo: orbitar · 2 dedos: zoom libre · toca un universo para entrar';
})();