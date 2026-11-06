'use strict';
/* HH_CI_FILTERED_STATUS_V2: fallback only after primary fails, CI workflows
 * only. Bounded anonymous GitHub reads, no timer, dispatch, token or paid API.
 * Name-based classification always gives an observed LOWER BOUND (≥).
 */
(function(root){
 const API='https://api.github.com/repos/andylitvinov-design/books/actions/runs';
 const STATES=['in_progress','queued','pending','waiting','requested'];
 const WAIT=['queued','pending','waiting','requested'];
 const KEY='hh-pr-ci-filtered-census-v2',FRESH=3*60000,EXPIRE=15*60000;
 const SOURCE='GITHUB_ACTIONS_CI_FILTERED_SAMPLE_V2';
 const CI=/(?:\bcore\b|\bci\b|\btest(?:s|ing)?\b|\blint\b|\bbrowser\b|\bguard\b|\bspecialist\b|\bsecurity\b|mandala|actionlint|typecheck|playwright|release checks|release gate)/i;
 const EXCLUDE=/(?:watchdog|auto.?merge|triage|worker|dispatcher|sweep|cron|notification|monitor|reconcile|repair)/i;
 const valid=n=>Number.isSafeInteger(n)&&n>=0&&n<1000000;
 let inFlight=null;
 function parseCount(data,status){
   if(!valid(data?.total_count)||!Array.isArray(data.workflow_runs)||
      data.workflow_runs.length>100||data.workflow_runs.length>data.total_count)
     throw Error('INVALID_GITHUB_RUN_INVENTORY');
   const seen=new Set();let count=0;
   for(const r of data.workflow_runs){
     if(!Number.isSafeInteger(r?.id)||r.id<=0||typeof r.name!=='string'||
        !['in_progress','queued','pending','waiting','requested'].includes(r.status))
       throw Error('INVALID_GITHUB_RUN');
     if(seen.has(r.id))continue;
     seen.add(r.id);
     if(r.status===status&&CI.test(r.name)&&!EXCLUDE.test(r.name))count++;
   }
   return {count,complete:seen.size===data.total_count,observed:seen.size,total:data.total_count};
 }
 function summarize(results,now){
   const read=x=>x&&valid(x.count)?x:null;
   const running=read(results.in_progress);
   const pending=WAIT.map(s=>read(results[s]));
   if(!running&&!pending.some(Boolean))throw Error('NO_GITHUB_CI_OBSERVATION');
   return {source:SOURCE,running:running?.count??null,
      queued:pending.some(Boolean)?pending.reduce((n,x)=>n+(x?.count??0),0):null,
      running_complete:running?.complete===true,
      queue_complete:pending.every(x=>x?.complete===true),
      sampled_statuses:STATES.filter(s=>read(results[s])).length,
      observed_at:new Date(now).toISOString(),from_cache:false,age_minutes:0,
      lower_bound:true};
 }
 function storage(){try{return typeof localStorage!=='undefined'?localStorage:null;}catch{return null;}}
 function getCached(now){
   try{
     const raw=storage()?.getItem(KEY);
     if(!raw||raw.length>700)return null;
     const x=JSON.parse(raw),t=Date.parse(x?.observed_at||'');
     if(x?.source!==SOURCE||!valid(x.running)||!valid(x.queued)||
        x.queue_complete!==true||x.running_complete!==true||!Number.isFinite(t)||
        t>now+60000||now-t>EXPIRE)return null;
     return {...x,from_cache:true,age_minutes:Math.floor(Math.max(0,now-t)/60000)};
   }catch{return null;}
 }
 async function census(fetcher,now){
   const values=await Promise.all(STATES.map(async status=>{
     try{
       const r=await fetcher(API+'?status='+status+'&per_page=100',
         {headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
       if(!r.ok)throw Error('GITHUB_HTTP_'+r.status);
       return [status,parseCount(await r.json(),status)];
     }catch{return [status,null];}
   }));
   return summarize(Object.fromEntries(values),now);
 }
 async function read(fetcher,now=Date.now()){
   const prior=getCached(now);
   if(prior&&now-Date.parse(prior.observed_at)<FRESH)return prior;
   if(inFlight)return inFlight;
   const getter=fetcher||fetch;
   inFlight=(async()=>{
     try{
       const result=await census(getter,now);
       if(result.running!==null&&result.queue_complete&&result.running_complete)
         try{storage()?.setItem(KEY,JSON.stringify(result));}catch{}
       return result;
     }catch(err){if(prior)return prior;throw err;}
   })().finally(()=>{inFlight=null});
   return inFlight;
 }
 const api={read,parseCount,summarize,census};
 if(root)root.HHCIQueueBackup=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null);
