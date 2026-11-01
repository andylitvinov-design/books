'use strict';
const {summarizeWindow}=require('./ci-pr-kpi.cjs');
const WINDOWS={'1h':3600000,'24h':86400000,'7d':604800000};
function buildReport({now,backlog,receipts,merges,actions,dispatch,ci,taskHistoryVerified=false}){
 if(!Number.isFinite(now)||![backlog,receipts,merges,actions,dispatch,ci].every(x=>x&&typeof x==='object'))
  throw Error('INVALID_REPORT_INPUT');
 const events=[...(receipts.events||[]),...(merges.events||[]),...(dispatch.events||[]),...(ci.events||[])];
 const jobs=Array.isArray(actions.jobs)?actions.jobs:[];
 const valid=(x)=>x?.complete===true;
 // Task completeness also needs independently verified historical worker
 // coverage. A successful receipt inventory alone cannot prove absent claims.
 const covers=(x,start)=>valid(x)&&Number.isFinite(x.since)&&x.since<=start;
 const coverageAt=start=>({tasks:covers(receipts,start)&&taskHistoryVerified===true,
  merges:covers(merges,start),ci:covers(actions,start)&&valid(ci),jobs:covers(actions,start),live:false});
 const blockers=(start,end)=>{
  const result={};
  for(const row of dispatch.blockerEvents||[]){
   const at=Date.parse(row?.at||'');if(!Number.isFinite(at)||at<=start||at>end||!row.blocked||typeof row.blocked!=='object')continue;
   for(const [key,count] of Object.entries(row.blocked))if(/^[A-Z][A-Z0-9_]{0,79}$/.test(key)&&Number.isSafeInteger(count)&&count>=0){
    const sum=(result[key]||0)+count;if(Number.isSafeInteger(sum))result[key]=sum;
   }
  }
  return result;
 };
 const windows={};
 for(const [name,width] of Object.entries(WINDOWS)){
  const current=summarizeWindow({events,jobs,coverage:coverageAt(now-width),now,windowMs:width});
  const previous=summarizeWindow({events,jobs,coverage:coverageAt(now-2*width),now:now-width,windowMs:width});
  const delta=(a,b,verified)=>verified?a-b:null;
  windows[name]={current,previous,
   trend:{production_merges:delta(current.observed.merged,previous.observed.merged,current.coverage.merges&&previous.coverage.merges),
    source_committed:delta(current.observed.source_committed,previous.observed.source_committed,current.coverage.tasks&&previous.coverage.tasks),
    dispatches:delta(current.observed.dispatched,previous.observed.dispatched,covers(dispatch,now-2*width)),
    runner_minutes:delta(current.runner_minutes,previous.runner_minutes,current.coverage.jobs&&previous.coverage.jobs)},
   blockers:{label:covers(dispatch,now-2*width)?'COMPLETE_NON_ATOMIC':'SAMPLE_NOT_TOTAL',
    current:blockers(now-width,now),previous:blockers(now-2*width,now-width)}};
 }
 const source=x=>({complete:valid(x),reason:typeof x.reason==='string'?x.reason:'UNVERIFIED',
  reads:Number.isSafeInteger(x.reads)?x.reads:null});
 return {schema:'HH_CONTROL_KPI_V1',checked_at:new Date(now).toISOString(),
  backlog:{complete:valid(backlog),counts:valid(backlog)?backlog.counts:null,reason:backlog.reason||'UNVERIFIED'},
  sources:{receipts:source(receipts),merges:source(merges),actions:source(actions),dispatch:source(dispatch),ci:source(ci)},
  limitations:['GitHub reads are non-atomic; stable inventories are checked twice.',
   'Actionable backlog requires separate current-head ownership and evidence checks.',
   'Missing historical receipt or job coverage remains partial; samples are not totals.',
   'LIVE conversion requires feature-specific smoke evidence for each comparable production merge.'],windows};
}
module.exports={buildReport,WINDOWS};
