'use strict';
const {collectBacklog}=require('./ci-pr-kpi-backlog.cjs');
const {collectReceiptEvents}=require('./ci-pr-kpi-collector.cjs');
const {collectMergeEvents}=require('./ci-pr-kpi-merges.cjs');
const {collectCompletedJobs}=require('./ci-pr-kpi-actions.cjs');
const {collectDispatcherEvents}=require('./ci-pr-kpi-dispatch-collector.cjs');
const {normalizeCoreEvidence}=require('./ci-pr-kpi-ci.cjs');
const {buildReport}=require('./ci-pr-kpi-report.cjs');
const {collectCancellationEvidence}=require('./ci-pr-kpi-cancellations.cjs');
async function run({github,core,context,now=Date.now(),deps={}}){
 const {owner,repo}=context.repo;
 if(owner!=='andylitvinov-design'||repo!=='books'||!Number.isFinite(now))throw Error('INVALID_CONTEXT');
 const d={collectBacklog,collectReceiptEvents,collectMergeEvents,collectCompletedJobs,collectDispatcherEvents,collectCancellationEvidence,normalizeCoreEvidence,...deps};
 const common={github,owner,repo,minRemaining:500};const since=now-14*86400000;
 const backlog=await d.collectBacklog({...common,maxRequests:12});
 const recentReceipts=await d.collectReceiptEvents({...common,since:now-2*3600000,until:now,maxRequests:20});
 const dailyReceipts=await d.collectReceiptEvents({...common,since:now-48*3600000,until:now,maxRequests:35});
 const historicalReceipts=await d.collectReceiptEvents({...common,since,until:now,maxRequests:120});
 const receiptSnapshots=[recentReceipts,dailyReceipts,historicalReceipts],receiptEvents=new Map();let receiptsChanged=false;
 for(let i=0;i<receiptSnapshots.length;i++){
  const shorter=receiptSnapshots[i];if(shorter.complete!==true||!Number.isFinite(shorter.since))continue;
  const keys=new Set((shorter.events||[]).map(e=>JSON.stringify(e)));
  for(const later of receiptSnapshots.slice(i+1))for(const e of later.events||[]){const at=Date.parse(e?.at||'');
   if(Number.isFinite(at)&&at>shorter.since&&at<=now&&!keys.has(JSON.stringify(e)))receiptsChanged=true;
  }
 }
 for(const snapshot of receiptSnapshots)for(const e of snapshot.events||[])receiptEvents.set(JSON.stringify(e),e);
 const receipts={...historicalReceipts,complete:historicalReceipts.complete===true&&!receiptsChanged,
  reason:receiptsChanged?'RECEIPT_SNAPSHOTS_DIFFER':historicalReceipts.reason,
  reads:receiptSnapshots.every(x=>Number.isSafeInteger(x.reads))?receiptSnapshots.reduce((n,x)=>n+x.reads,0):null,
  events:[...receiptEvents.values()],segments:receiptSnapshots.map(x=>({since:x.since,
   complete:x.complete===true&&!receiptsChanged,reason:receiptsChanged?'RECEIPT_SNAPSHOTS_DIFFER':x.reason}))};
 // Preserve a complete short window when the 14-day inventory exceeds its
 // budget; retain older partial observations without double-counting.
 const recentMerges=await d.collectMergeEvents({...common,since:now-2*3600000,maxRequests:30});
 const dailyMerges=await d.collectMergeEvents({...common,since:now-48*3600000,maxRequests:50});
 const historicalMerges=await d.collectMergeEvents({...common,since,maxRequests:80});
 const snapshots=[recentMerges,dailyMerges,historicalMerges],unique=new Map();let inconsistent=false;
 const eventKey=e=>String(e.kind)+':'+String(e.pr)+':'+String(e.mergeSha||'');
 for(let i=0;i<snapshots.length;i++){
  const shorter=snapshots[i];if(shorter.complete!==true||!Number.isFinite(shorter.since))continue;
  const keys=new Set((shorter.events||[]).map(eventKey));
  for(const later of snapshots.slice(i+1))for(const e of later.events||[]){const at=Date.parse(e?.at||'');
   if(Number.isFinite(at)&&at>shorter.since&&at<=now&&!keys.has(eventKey(e)))inconsistent=true;
  }
 }
 for(const snapshot of snapshots)for(const e of snapshot.events||[]){
  const key=eventKey(e);
  if(unique.has(key)&&JSON.stringify(unique.get(key))!==JSON.stringify(e))inconsistent=true;
  else unique.set(key,e);
 }
 const merges={...historicalMerges,complete:historicalMerges.complete===true&&!inconsistent,
  reason:inconsistent?'MERGE_SNAPSHOTS_DIFFER':historicalMerges.reason,
  reads:snapshots.every(x=>Number.isSafeInteger(x.reads))?snapshots.reduce((n,x)=>n+x.reads,0):null,
  events:[...unique.values()],segments:snapshots.map(x=>({since:x.since,
   complete:x.complete===true&&!inconsistent,reason:inconsistent?'MERGE_SNAPSHOTS_DIFFER':x.reason}))};
 // Target cancelled/failed runs first: broad fourteen-day job inventories
 // often exhaust their request budget before reaching a single cancelled job.
 const cancellations=await d.collectCancellationEvidence({...common,since,until:now,maxRequests:40,maxRuns:24});
 const actions=await d.collectCompletedJobs({...common,since,until:now,maxRequests:60});
 const dispatch=await d.collectDispatcherEvents({...common,runs:actions.workflowRuns,jobs:actions.jobs,runsComplete:actions.complete,jobsComplete:actions.complete,maxRequests:30});
 dispatch.since=actions.since;
 const ci=d.normalizeCoreEvidence(actions.workflowRuns,actions.jobs);
 const report=buildReport({now,backlog,receipts,merges,actions,dispatch,ci,cancellations});
 const text=JSON.stringify(report);core.info('HH_CONTROL_KPI '+text);
 const recent=report.windows['1h'].cancellation_reasons.current;
 core.info('HH_CANCELLATION_MONITOR '+JSON.stringify({checked_at:report.checked_at,
  label:recent.label,counts:recent.counts,runner_minutes_observed:recent.runner_minutes_observed,
  cancelled_runner_minutes_observed:recent.cancelled_runner_minutes_observed,
  unverified_job_inventories:recent.unverified_job_inventories}));
 await core.summary.addHeading('HH Control Tower KPI: evidence and coverage').addCodeBlock(text,'json').write();
 return report;
}
module.exports={run};
