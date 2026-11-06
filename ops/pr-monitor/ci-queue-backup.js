'use strict';
/* Bounded public GitHub Actions fallback when /api/ci-queue-detail fails.
 * Counts workflows, not jobs or PRs. No scheduler, credentials or CI dispatch.
 */
(function(root){
  const API='https://api.github.com/repos/andylitvinov-design/books/actions/runs';
  const STATES=['in_progress','queued','pending','waiting','requested'];
  const WAIT=['queued','pending','waiting','requested'];
  const KEY='hh-pr-ci-status-census-v1',FRESH=3*60000,EXPIRE=15*60000;
  let inFlight=null;
  const good=n=>Number.isSafeInteger(n)&&n>=0;
  function parseCount(data){
    if(!good(data?.total_count)||!Array.isArray(data.workflow_runs)||
       data.workflow_runs.length>data.total_count)throw Error('INVALID_GITHUB_COUNT');
    return data.total_count;
  }
  function summarize(counts,now){
    const known=WAIT.filter(k=>good(counts[k]));
    return {source:'GITHUB_ACTIONS_PUBLIC_STATUS_V1',
      running:good(counts.in_progress)?counts.in_progress:null,
      queued:known.length?known.reduce((sum,k)=>sum+counts[k],0):null,
      queue_complete:known.length===WAIT.length,
      observed_at:new Date(now).toISOString(),from_cache:false,age_minutes:0};
  }
  function storage(){try{return typeof localStorage!=='undefined'?localStorage:null;}catch{return null;}}
  function getCached(now){
    try{
      const raw=storage()?.getItem(KEY);
      if(!raw||raw.length>600)return null;
      const item=JSON.parse(raw),t=Date.parse(item?.observed_at||'');
      if(item?.source!=='GITHUB_ACTIONS_PUBLIC_STATUS_V1'||!good(item.running)||
        !good(item.queued)||item.queue_complete!==true||!Number.isFinite(t)||
        t>now+60000||now-t>EXPIRE)return null;
      return {...item,from_cache:true,age_minutes:Math.floor(Math.max(0,now-t)/60000)};
    }catch{return null;}
  }
  async function census(fetcher,now){
    const values=await Promise.all(STATES.map(async status=>{
      try{
        const r=await fetcher(API+'?status='+encodeURIComponent(status)+'&per_page=1',
          {headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
        if(!r.ok)throw Error('GITHUB_HTTP_'+r.status);
        return [status,parseCount(await r.json())];
      }catch{return [status,null];}
    }));
    const result=summarize(Object.fromEntries(values),now);
    if(result.running===null&&result.queued===null)throw Error('GITHUB_STATUS_UNAVAILABLE');
    return result;
  }
  async function read(fetcher,now=Date.now()){
    const prior=getCached(now);
    if(prior&&now-Date.parse(prior.observed_at)<FRESH)return prior;
    if(inFlight)return inFlight;
    const getter=fetcher||fetch;
    inFlight=(async()=>{
      try{
        const data=await census(getter,now);
        if(data.running!==null&&data.queue_complete)
          try{storage()?.setItem(KEY,JSON.stringify(data));}catch{}
        return data;
      }catch(err){if(prior)return prior;throw err;}
    })().finally(()=>{inFlight=null});
    return inFlight;
  }
  const api={read,parseCount,summarize};
  if(root)root.HHCIQueueBackup=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null);
