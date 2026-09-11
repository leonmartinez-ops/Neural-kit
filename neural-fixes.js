(()=>{
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/×/g,'x');
  const clearTaskEditor=()=>['taskTitle','taskDescription','taskDue','taskReminder'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});

  // Keep task UI strictly scoped to the selected node.
  const oldRenderDetail=renderDetail;
  renderDetail=function(n){
    oldRenderDetail(n);
    let scope=document.getElementById('taskScope');
    const editor=document.querySelector('#detailPanel .editor');
    if(editor){
      if(!scope){scope=document.createElement('div');scope.id='taskScope';scope.style.cssText='font-size:9px;color:#9aa1aa;margin:3px 0 1px;letter-spacing:.04em';editor.parentNode.insertBefore(scope,editor)}
      scope.textContent='TAREAS DE · '+n.label;
      const title=document.getElementById('taskTitle'); if(title) title.placeholder='Nueva tarea para '+n.label;
    }
  };
  const oldSelectNode=selectNode;
  selectNode=function(n,open){clearTaskEditor();oldSelectNode(n,open)};

  // Natural-language routing: create a prospect and place it under the parent named in the sentence.
  function findNodeByMention(text){
    const s=norm(text); let best=null;
    for(const n of N){const l=norm(n.label); if(l.length>2&&s.includes(l)&&(!best||l.length>norm(best.label).length))best=n}
    return best;
  }
  function findParentFromText(text){
    const s=norm(text);
    const aliases=[
      ['gala',n=>norm(n.label).includes('gala')],['brava',n=>norm(n.label)==='brava'],['think',n=>norm(n.label)==='think'],['ventas',n=>norm(n.label)==='ventas'],['cuerpo',n=>norm(n.label)==='cuerpo']
    ];
    for(const [word,test] of aliases) if(s.includes(word)){const n=N.find(test);if(n)return n}
    return null;
  }
  function extractProspectName(text){
    let m=text.match(/(?:se\s+llama|llamado|llamada)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .&_-]{1,34}?)(?=\s+(?:es|para|que|y\s+es|una|un)\b|[,.]|$)/i);
    return m?m[1].trim().replace(/[.,]+$/,''):null;
  }
  async function ensureProspect(text){
    const s=norm(text); if(!/(nuevo\s+prospecto|prospecto\s+nuevo|cliente\s+nuevo)/.test(s))return null;
    const name=extractProspectName(text); if(!name)return null;
    const existing=N.find(n=>norm(n.label)===norm(name)); if(existing)return existing;
    const parent=findParentFromText(text)||N.find(n=>norm(n.label)==='ventas')||coreNode();
    const {data,error}=await sb.from('nodes').insert({workspace_id:currentWorkspace.id,node_key:'AUTO_'+Date.now(),label:name,node_type:'prospect',parent_id:parent?.uuid||null,color:parent?.color||'#FF8B8B',status:'prospect',importance:3,metadata:{source:'composer',auto_created:true}}).select().single();
    if(error||!data)return null;
    const obj={id:data.node_key,label:data.label,r:4.8,parentUuid:data.parent_id,uuid:data.id,color:data.color||parent?.color||'#FF8B8B',type:data.node_type,phase:Math.random()*6.28,order:N.length,p:parent?.id||null};
    N.push(obj); if(parent)L.push([parent.id,obj.id]); expanded.add(parent?.id); renderTree(); return obj;
  }
  document.getElementById('send').onclick=async()=>{
    const note=document.getElementById('note'); const text=note.value.trim(); if(!text||!currentWorkspace)return;
    let n=await ensureProspect(text); if(!n)n=findNodeByMention(text)||findParentFromText(text)||coreNode()||N[0];
    const am=amount(text);
    const {data,error}=await sb.from('events').insert({workspace_id:currentWorkspace.id,node_id:n?.uuid||null,event_type:'note',raw_text:text,amount:am,currency:'MXN',source:'web'}).select().single();
    if(!error){E.unshift(data);note.value='';route.textContent='→ '+pathFor(n);renderEvents();if(selected===n.id)renderDetail(n)}
  };

  // Stronger spatial rotation + throw physics inside a focused universe.
  const oldBasePosition=basePosition;
  basePosition=function(n){
    const p=oldBasePosition(n); const d=depth(n);
    if(activeUniverse){
      const u=N.find(x=>x.id===activeUniverse); if(u&&isDescendantOrSelf(n,activeUniverse)){
        const uc=oldBasePosition(u); const dx=p.x-uc.x, dz=p.z-uc.z;
        const a=rot*.9, ca=Math.cos(a), sa=Math.sin(a);
        const rx=dx*ca-dz*sa, rz=dx*sa+dz*ca;
        return {x:uc.x+rx,y:p.y,z:uc.z+rz};
      }
    }
    if(d<=1){
      const a=rot*.35,ca=Math.cos(a),sa=Math.sin(a);return{x:p.x*ca-p.z*sa,y:p.y,z:p.x*sa+p.z*ca};
    }
    return p;
  };

  // Semantic pinch navigation.
  // A strong pinch-out exits the current universe to the global map.
  // A strong pinch-in over a top-level universe enters it without opening the drawer.
  let gSingle=null,gPinch=null;
  const gVals=()=>[...pointers.values()];
  function globalOverview(){
    activeUniverse=null;selected=null;focusTarget=null;focusGlow=0;
    zoom=.72;camZ=0;panX=0;panY=0;
    document.getElementById('universeBadge')?.classList.remove('on');
    document.getElementById('detailPanel')?.classList.remove('open');
    renderTree();
  }
  function nearestUniverseAt(x,y,maxDist=250){
    let best=null,bestD=maxDist;
    for(const n of rootGroups()){
      const p=project(basePosition(n)),d=Math.hypot(x-p.x,y-p.y);
      if(d<bestD){best=n;bestD=d}
    }
    return best;
  }
  function enterByPinch(n){
    if(!n)return;
    selected=n.id;expanded.add(n.id);renderTree();renderDetail(n);focusOn(n);
    document.getElementById('detailPanel')?.classList.remove('open');
  }

  C.onpointerdown=e=>{
    C.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    focusTarget=null;
    if(pointers.size===1){
      gSingle={sx:e.clientX,sy:e.clientY,lastT:performance.now(),time:performance.now(),moved:false};
      gPinch=null;
    }else if(pointers.size===2){
      const a=gVals(),cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2,d=Math.max(20,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y));
      gPinch={d,cx,cy,lastCx:cx,lastCy:cy,zoom,camZ,panX,panY,startedUniverse:!!activeUniverse,minRatio:1,maxRatio:1,escaped:false};
      gSingle=null;rotV*=.35;tiltV*=.35;
    }
  };

  C.onpointermove=e=>{
    if(!pointers.has(e.pointerId))return;
    const old=pointers.get(e.pointerId),now=performance.now();
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1&&gSingle){
      const dx=e.clientX-old.x,dy=e.clientY-old.y,dt=Math.max(8,now-gSingle.lastT);
      rot+=dx*.006;tilt=Math.max(-.82,Math.min(.82,tilt+dy*.003));
      rotV=rotV*.55+dx*.006*(16.67/dt)*.45;tiltV=tiltV*.58+dy*.003*(16.67/dt)*.42;
      gSingle.lastT=now;if(Math.hypot(e.clientX-gSingle.sx,e.clientY-gSingle.sy)>7)gSingle.moved=true;
    }else if(pointers.size===2&&gPinch){
      const a=gVals(),cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2,d=Math.max(20,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)),ratio=d/gPinch.d;
      gPinch.lastCx=cx;gPinch.lastCy=cy;gPinch.minRatio=Math.min(gPinch.minRatio,ratio);gPinch.maxRatio=Math.max(gPinch.maxRatio,ratio);

      // Intentional fast zoom-out = go back to the whole Neural Kit universe.
      if(gPinch.startedUniverse&&!gPinch.escaped&&ratio<.64){
        globalOverview();
        gPinch={d,cx,cy,lastCx:cx,lastCy:cy,zoom,camZ,panX,panY,startedUniverse:false,minRatio:1,maxRatio:1,escaped:true};
        return;
      }

      const newZoom=Math.max(.35,Math.min(4.8,gPinch.zoom*ratio));
      const centerX=sideW()+(W-sideW())/2,centerY=H*.46,scaleFactor=newZoom/gPinch.zoom;
      zoom=newZoom;camZ=gPinch.camZ;
      // Zoom around the fingers, like a map, instead of around an arbitrary camera origin.
      panX=(gPinch.cx-centerX)-(gPinch.cx-centerX-gPinch.panX)*scaleFactor+(cx-gPinch.cx);
      panY=(gPinch.cy-centerY)-(gPinch.cy-centerY-gPinch.panY)*scaleFactor+(cy-gPinch.cy);
      if(activeUniverse)constrainActiveView();
    }
  };

  function finishGesture(e){
    const one=gSingle,pinch=gPinch,click=pointers.size===1&&one&&!one.moved&&performance.now()-one.time<350;
    pointers.delete(e.pointerId);
    if(click){const h=[...hit].sort((a,b)=>b.z-a.z).find(o=>Math.hypot(e.clientX-o.x,e.clientY-o.y)<o.r);if(h)selectNode(h.n,true)}
    if(pointers.size===1){
      const q=gVals()[0];gSingle={sx:q.x,sy:q.y,lastT:performance.now(),time:performance.now(),moved:false};gPinch=null;
    }else if(!pointers.size){
      gSingle=null;gPinch=null;
      if(activeUniverse){constrainActiveView();return}
      // On the global map, a deliberate pinch-in over a universe enters it.
      if(pinch&&pinch.maxRatio>1.28&&zoom>1.0){
        const target=nearestUniverseAt(pinch.lastCx,pinch.lastCy,260);
        if(target){enterByPinch(target);return}
      }
      // Very wide zoom-out always settles into a clean global overview.
      if(zoom<.5)focusTarget={zoom:.72,panX:0,panY:0,camZ:0};
    }
  }
  C.onpointerup=finishGesture;
  C.onpointercancel=finishGesture;
  C.onwheel=e=>{
    e.preventDefault();
    const next=Math.max(.35,Math.min(4.8,zoom*Math.exp(-e.deltaY*.0012)));
    if(activeUniverse&&next<.9){globalOverview();return}
    zoom=next;if(activeUniverse)constrainActiveView();
  };

  // Extra throw sampling gives the one-finger orbit a physical fling on iPad.
  let throwState=null;
  C.addEventListener('pointerdown',e=>{if(pointers.size<=1)throwState={x:e.clientX,y:e.clientY,t:performance.now(),vx:0,vy:0}},true);
  C.addEventListener('pointermove',e=>{if(!throwState||pointers.size>1)return;const now=performance.now(),dt=Math.max(8,now-throwState.t),dx=e.clientX-throwState.x,dy=e.clientY-throwState.y;throwState.vx=throwState.vx*.55+(dx/dt)*.45;throwState.vy=throwState.vy*.55+(dy/dt)*.45;throwState.x=e.clientX;throwState.y=e.clientY;throwState.t=now},true);
  C.addEventListener('pointerup',()=>{if(!throwState)return;rotV+=Math.max(-.085,Math.min(.085,throwState.vx*.055));tiltV+=Math.max(-.03,Math.min(.03,throwState.vy*.018));throwState=null},true);
  C.addEventListener('pointercancel',()=>{throwState=null},true);

  const hint=document.querySelector('.hint');
  if(hint)hint.textContent='1 dedo: orbitar · pellizca hacia afuera: ver todo · pellizca hacia adentro: entrar';

  const oldReset=resetUniverse;
  resetUniverse=function(){oldReset();clearTaskEditor()};
})();