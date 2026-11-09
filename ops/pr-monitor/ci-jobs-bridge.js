'use strict';
/* One on-demand verified GitHub jobs census for both existing CI cards.
 * Workflow registrations are not job counts. No new polling, token or writes.
 */
(function(root){
 const SCHEMA='HH_CI_VERIFIED_LOAD_V2',API='/api/ci-verified-load',MAX_AGE=180000;
 const valid=n=>Number.isSafeInteger(n)&&n>=0;
 function number(n,complete){
   return !valid(n)?'—':complete?String(n):n>0?'≥'+n:'—';
 }
 function workflowDisplay(queued,running,stale){
   const safe=v=>/^\d+$/.test(String(v??'').trim())?String(v).trim():'—';
   const staleText=valid(stale)?' · зависших CI workflows: '+stale:'';
   return {
     queuedLabel:'Workflows ожидают',
     runningLabel:'Workflows выполняются',
     note:'GitHub Actions workflows: '+safe(running)+' выполняются · '+safe(queued)+' ожидают'+staleText+
       '. Здесь статусы всех workflow, включая CI, Watchdog и другие действия; это не число jobs. Реальные CI jobs показаны отдельно ниже.'
   };
 }
 function evidence(data,now=Date.now()){
   if(!data||data.schema!==SCHEMA||!data.ci||!data.coverage)return null;
   const at=Date.parse(data.observed_at||''),age=now-at;
   const c=data.coverage;
   if(!Number.isFinite(age)||age< -60000||age>MAX_AGE||
      !valid(c.checked_ci_runs)||!valid(c.known_ci_runs)||c.checked_ci_runs>c.known_ci_runs||
      !valid(data.ci.running_jobs)||!valid(data.ci.queued_jobs))return null;
   return {
     running:number(data.ci.running_jobs,c.complete===true),
     waiting:number(data.ci.queued_jobs,c.complete===true),
     coverage:c.complete===true?'полная':'частичная',
     note:'Проверено '+c.checked_ci_runs+' из '+c.known_ci_runs+
       ' активных CI workflow · '+(c.complete===true?'точное значение':'проверенный минимум ≥'),
     observed_at:data.observed_at
   };
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={number,evidence,workflowDisplay};
 if(!root||typeof document==='undefined')return;
 let snapshot=null,loading=null,lastRequest=0,paintQueued=false;
 let workflowExplanationBase='',lastWorkflowExplanation='';
 const workflowObserver=new MutationObserver(()=>syncWorkflowUi());
 const observed=new WeakSet(),watch=new MutationObserver(schedule);
 const waitingForDom=new MutationObserver(schedule);
 function put(el,value){
   if(el&&el.textContent!==value)el.textContent=value;
 }
 function syncWorkflowUi(){
   const queued=document.getElementById('quick-queued');
   const running=document.getElementById('quick-running');
   const display=workflowDisplay(queued?.textContent,running?.textContent,snapshot?.ci?.stale_workflows);
   const relabel=(node,label)=>{
     const caption=node?.closest('.counter')?.querySelector('span');
     if(caption)put(caption,label);
     if(node?.parentElement){
       node.parentElement.title=display.note;
       node.parentElement.setAttribute('aria-label',label+': '+(node.textContent?.trim()||'—'));
     }
   };
   relabel(queued,display.queuedLabel);
   relabel(running,display.runningLabel);
   const explanation=document.getElementById('quick-explanation');
   if(explanation){
     const current=explanation.textContent.trim();
     if(current!==lastWorkflowExplanation)
       workflowExplanationBase=current.replace(/\s*· GitHub Actions workflows:.*$/,'');
     const next=(workflowExplanationBase||'')+' · '+display.note;
     put(explanation,next);
     lastWorkflowExplanation=next;
   }
   document.querySelectorAll('#hh-ci-queue-detail .hh-queue-metric').forEach(card=>{
     const caption=card.querySelector('.hh-queue-label');
     const value=caption?.textContent?.trim()||'';
     if(value==='WF ждут')put(caption,'Workflows ждут');
     else if(value==='WF идут')put(caption,'Workflows выполняются');
     else if(value==='Jobs ждут')put(caption,'CI jobs ждут');
     else if(value==='Jobs идут')put(caption,'CI jobs выполняются');
   });
 }
 function findRows(){
   const found=[];
   const first=document.querySelectorAll('#hh2-overview .hh2-ci-card');
   first.forEach(card=>{
     const label=card.querySelector('span')?.textContent||'';
     const key=label.includes('в работе')?'running':label.includes('в ожидании')?'waiting':null;
     if(key)found.push({key,card,target:card.querySelector('strong'),sub:card.querySelector('small')});
   });
   document.querySelectorAll('#hh-ci-queue-detail .hh-queue-metric').forEach(card=>{
     const label=card.querySelector('.hh-queue-label')?.textContent?.trim()||'';
     const key=(label==='CI jobs выполняются'||label==='Jobs идут')?'running':
       (label==='CI jobs ждут'||label==='Jobs ждут')?'waiting':null;
     if(key)found.push({key,card,target:card.querySelector('strong'),sub:null});
   });
   return found;
 }
 function render(){
   paintQueued=false;
   syncWorkflowUi();
   const d=evidence(snapshot);
   if(!d)return;
   for(const item of findRows()){
     if(!item.target)continue;
     const value=d[item.key];
     put(item.target,value);
     const label=item.key==='running'?'CI jobs выполняются':'CI jobs ожидают';
     const description=label+': '+value+'. '+d.note;
     if(item.target.getAttribute('aria-label')!==description)
       item.target.setAttribute('aria-label',description);
     if(item.target.title!==description)item.target.title=description;
     if(item.sub)put(item.sub,d.note);
     if(!observed.has(item.target)){
       observed.add(item.target);
       watch.observe(item.target,{subtree:true,childList:true,characterData:true});
     }
   }
   // The original queue panel is loaded asynchronously; stop observing the full
   // document once the two job cells are mounted.
   const rows=findRows();
   if(rows.some(r=>!r.sub&&r.key==='running')&&rows.some(r=>!r.sub&&r.key==='waiting'))
     waitingForDom.disconnect();
 }
 function schedule(){
   if(paintQueued)return;
   paintQueued=true;
   Promise.resolve().then(render);
 }
 function adopt(value){
   if(!evidence(value))return false;
   snapshot=value;
   schedule();
   return true;
 }
 async function load(force=false){
   if(loading)return loading;
   if(!force&&adopt(root.__hhCiVerifiedSnapshot))return;
   if(force&&Date.now()-lastRequest<15000)return;
   lastRequest=Date.now();
   loading=(async()=>{
     try{
       const r=await fetch(API,{cache:'default',headers:{Accept:'application/json'}});
       if(!r.ok)throw Error('VERIFIED_CI_HTTP_'+r.status);
       const data=await r.json();
       if(!adopt(data))throw Error('INVALID_OR_STALE_CI_CENSUS');
       root.__hhCiVerifiedSnapshot=data;
       syncWorkflowUi();
       root.dispatchEvent(new Event('hh:ci-verified-updated'));
     }catch(e){
       // Preserve an explicit unknown rather than substituting workflow counts.
       if(!evidence(snapshot))snapshot=null;
     }
   })().finally(()=>{loading=null});
   return loading;
 }
 root.addEventListener('hh:ci-verified-updated',()=>{
   if(root.__hhCiVerifiedSnapshot)adopt(root.__hhCiVerifiedSnapshot);
 });
 function init(){
   waitingForDom.observe(document.documentElement,{childList:true,subtree:true});
   [document.getElementById('quick-queued'),document.getElementById('quick-running'),
     document.getElementById('quick-explanation')].filter(Boolean).forEach(node=>
       workflowObserver.observe(node,{childList:true,subtree:true,characterData:true}));
   syncWorkflowUi();
   schedule();
   const refresh=document.getElementById('refresh');
   refresh?.addEventListener('click',()=>void load(true));
   document.addEventListener('visibilitychange',()=>{
     if(!document.hidden&&Date.now()-lastRequest>=MAX_AGE)void load(true);
   });
   void load();
 }
 if(document.readyState==='loading')
   document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof window!=='undefined'?window:null);
