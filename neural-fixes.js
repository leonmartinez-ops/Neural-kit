(()=>{
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/×/g,'x');
  const clearTaskEditor=()=>['taskTitle','taskDescription','taskDue','taskReminder'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});

  // Make the task editor explicitly scoped to the selected node and clear stale values on navigation.
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

  // Better routing for natural-language entries. It can create a named prospect and place it under the mentioned parent.
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

  let throwState=null;
  C.addEventListener('pointerdown',e=>{if(pointers.size<=1)throwState={x:e.clientX,y:e.clientY,t:performance.now(),vx:0,vy:0}},true);
  C.addEventListener('pointermove',e=>{if(!throwState||pointers.size>1)return;const now=performance.now(),dt=Math.max(8,now-throwState.t),dx=e.clientX-throwState.x,dy=e.clientY-throwState.y;throwState.vx=throwState.vx*.55+(dx/dt)*.45;throwState.vy=throwState.vy*.55+(dy/dt)*.45;throwState.x=e.clientX;throwState.y=e.clientY;throwState.t=now},true);
  C.addEventListener('pointerup',()=>{if(!throwState)return;rotV+=Math.max(-.085,Math.min(.085,throwState.vx*.055));tiltV+=Math.max(-.03,Math.min(.03,throwState.vy*.018));throwState=null},true);
  C.addEventListener('pointercancel',()=>{throwState=null},true);

  const oldReset=resetUniverse;
  resetUniverse=function(){oldReset();clearTaskEditor()};
})();