'use strict';
const {summarizeWindow}=require('./ci-pr-kpi.cjs');
const {summarizeCancellationWindow}=require('./ci-pr-kpi-cancellations.cjs');
const {audit:createdWallClock}=require('./ci-pr-kpi-created-wall-clock.cjs');
const PROD='codex/public-book-library';
const WINDOWS={'1h':3600000,'12h':43200000,'24h':86400000,'7d':604800000};
function buildReport({now,backlog,receipts,merges,actions,dispatch,ci,cancellations={},taskHistoryVerified=false}){
 if(!Number.isFinite(now)||![backlog,receipts,merges,actions,dispatch,ci].every(x=>x&&typeof x==='object'))
  throw Error('INVALID_REPORT_INPUT');
 const events=[...(receipts.events||[]),...(merges.events||[]),...(dispatch.events||[]),...(ci.events||[])];
 const jobs=Array.isArray(actions.jobs)?actions.jobs:[];
 const valid=(x)=>x?.complete===true;
 // Task completeness also needs independently verified historical worker
 // coverage. A successful receipt inventory alone cannot prove absent claims.
 const covers=(x,start)=>(valid(x)&&Number.isFinite(x.since)&&x.since<=start)||
  (Array.isArray(x?.segments)&&x.segments.some(y=>valid(y)&&Number.isFinite(y.since)&&y.since<=start));
 const coverageAt=start=>({receipt_records:covers(receipts,start),tasks:covers(receipts,start)&&taskHistoryVerified===true,
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
 // Derive the created-at/merged-by cohort from the SAME verified merge
 // inventory and Actions samples already collected. No REST calls or jobs.
 const createdCohort=(start,end)=>{
  const prs=(merges.events||[]).filter(x=>x.kind==='merged'&&x.production===true)
   .map(x=>({number:x.pr,created_at:x.created_at,merged_at:x.at,
    base:{ref:PROD},head:{sha:x.head,ref:x.head_ref},
    html_url:'https://github.com/andylitvinov-design/books/pull/'+x.pr}));
  const result=createdWallClock({prs,runs:Array.isArray(actions.workflowRuns)?actions.workflowRuns:[],
   jobs,start:new Date(start).toISOString(),end:new Date(end).toISOString()});
  const fullRows=result.rows.length,slowest=result.rows.slice()
   .sort((a,b)=>b.full_minutes-a.full_minutes||a.pr-b.pr).slice(0,12);
  return {...result,rows:slowest,rows_returned:slowest.length,rows_total:fullRows,
   coverage:{merge_inventory_complete:covers(merges,start),
    actions_inventory_complete:covers(actions,start),
    label:covers(merges,start)&&covers(actions,start)?'COMPLETE_NON_ATOMIC':'SAMPLE_NOT_TOTAL'}};
 };
 const windows={};
 for(const [name,width] of Object.entries(WINDOWS)){
  const current=summarizeWindow({events,jobs,coverage:coverageAt(now-width),now,windowMs:width});
  const previous=summarizeWindow({events,jobs,coverage:coverageAt(now-2*width),now:now-width,windowMs:width});
  const cancellationCurrent=summarizeCancellationWindow({source:cancellations,now,windowMs:width});
  const cancellationPrevious=summarizeCancellationWindow({source:cancellations,now:now-width,windowMs:width});
  const delta=(a,b,verified)=>verified?a-b:null;
  windows[name]={current,previous,
   created_to_merged:createdCohort(now-width,now),
   cancellation_reasons:{current:cancellationCurrent,previous:cancellationPrevious},
   trend:{production_merges:delta(current.observed.merged,previous.observed.merged,current.coverage.merges&&previous.coverage.merges),
    source_committed:delta(current.observed.source_committed,previous.observed.source_committed,current.coverage.tasks&&previous.coverage.tasks),
    dispatches:delta(current.observed.dispatched,previous.observed.dispatched,covers(dispatch,now-2*width)),
    runner_minutes:delta(current.runner_minutes,previous.runner_minutes,current.coverage.jobs&&previous.coverage.jobs)},
   blockers:{label:covers(dispatch,now-2*width)?'COMPLETE_NON_ATOMIC':'SAMPLE_NOT_TOTAL',
    current:blockers(now-width,now),previous:blockers(now-2*width,now-width)}};
 }
 const receiptLive=(receipts.events||[]).filter(e=>e.kind==='live_verified'&&e.production===true);
 const liveObserved={n:receiptLive.length,scope:'VERIFIED_RECEIPTS_ONLY_NOT_ALL_PRODUCTION_PR',
  latest_at:receiptLive.length?receiptLive.map(x=>x.at).sort().at(-1):null};
 const source=x=>({complete:valid(x),reason:typeof x.reason==='string'?x.reason:'UNVERIFIED',
  reads:Number.isSafeInteger(x.reads)?x.reads:null,
  segments:Array.isArray(x.segments)?x.segments.map(y=>({complete:valid(y),since:Number.isFinite(y.since)?new Date(y.since).toISOString():null,reason:y.reason||'UNVERIFIED'})):[]});
 return {schema:'HH_CONTROL_KPI_V1',checked_at:new Date(now).toISOString(),
  live_receipts_observed:liveObserved,
  backlog:{complete:valid(backlog),counts:valid(backlog)?backlog.counts:null,reason:backlog.reason||'UNVERIFIED'},
  sources:{receipts:source(receipts),merges:source(merges),actions:source(actions),dispatch:source(dispatch),ci:source(ci),cancellations:source(cancellations)},
  limitations:['GitHub reads are non-atomic; stable inventories are checked twice.',
   'Actionable backlog requires separate current-head ownership and evidence checks.',
   'Receipt coverage describes available authenticated records, not proof every worker emitted a receipt.',
   'Missing historical receipt or job coverage remains partial; samples are not totals.',
   'Cancelled and failed workflow reasons and discarded runner minutes are bounded observed samples; never billing amounts or complete totals.',
   'LIVE conversion requires feature-specific smoke evidence for each comparable production merge.',
   'Created→Merged cohort accounts for verified final HEAD workflow intervals only; missing or older-HEAD history remains explicitly unallocated.'],windows};
}
module.exports={buildReport,WINDOWS};
