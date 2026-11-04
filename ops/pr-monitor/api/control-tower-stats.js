'use strict';
// LIVE PR monitor: public data only, never holds GitHub credentials.
// Read the verified Watchdog dispatch receipt from its single public issue.
const ISSUE='https://api.github.com/repos/andylitvinov-design/books/issues/3128';
const MARKER='<!-- HH_CONTROL_TOWER_PUBLIC_KPI_V1 -->';
const SCHEMA='HH_CONTROL_DISPATCH_METRICS_V1';
let cached=null,cacheAt=0;
const valid=n=>Number.isSafeInteger(n)&&n>=0;
function count(n,fallback=0){return valid(n)?n:fallback;}
function verifiedSample(raw,production){
 if(!raw||raw.schema!=='HH_WATCHDOG_VERIFIED_SAMPLE_V1'||
    raw.scope!=='BOUNDED_DEEP_INSPECTION'||
    !valid(production)||raw.production_prs!==production||
    !Number.isFinite(Date.parse(raw.checked_at||'')))return null;
 const keys=['inspected','mergeConflicts','coreFailures','specialistFailures',
  'specialistPolicyHolds','releaseGateOnly','verifiedSourceFailures',
  'coreFailureUnverified','specialistEvidenceUnverified',
  'sourceRepairQueued','conflictLabelsQueued'];
 if(keys.some(key=>!valid(raw[key])||raw[key]>production))return null;
 if(keys.slice(1).some(key=>raw[key]>raw.inspected))return null;
 const lowerBound=Math.max(raw.mergeConflicts,raw.coreFailures,
  raw.specialistFailures,raw.specialistPolicyHolds);
 if(raw.verified_blocked_lower_bound!==lowerBound)return null;
 return {scope:'BOUNDED_DEEP_INSPECTION',inspected:raw.inspected,
  core_failures:raw.coreFailures,merge_conflicts:raw.mergeConflicts,
  specialist_failures:raw.specialistFailures,
  specialist_policy_holds:raw.specialistPolicyHolds,
  verified_blocked_lower_bound:lowerBound,checked_at:raw.checked_at};
}
// Existing control-tower issue already carries the full Watchdog snapshot.
// Validate and expose the per-PR observation clock without any extra fetch.
function timestampInventory(source,now) {
 const raw=source?.pr_timestamp_inventory;
 if(!raw)return {status:'NOT_COLLECTED',source_status:source?.pr_timestamp_status||null};
 try{
  if(raw.schema!=='HH_PR_TIMESTAMP_INVENTORY_V1'||
     raw.scope!=='ALL_OPEN_PRS'||typeof raw.records!=='string'||
     raw.records.length>100000||!valid(raw.total)||!valid(raw.production)||
     raw.total<1||raw.total>350||raw.production>raw.total||
     !Number.isFinite(Date.parse(raw.observed_at||''))||
     Date.parse(raw.observed_at)>now+60000||
     !raw.counts||raw.counts.created_exact!==raw.total||
     raw.counts.updated_exact!==raw.total||raw.counts.head_exact!==raw.total||
     raw.counts.draft+raw.counts.ready!==raw.total)throw Error('BAD_SUMMARY');
  const parsed=JSON.parse(raw.records);
  if(!Array.isArray(parsed)||parsed.length!==raw.total)throw Error('BAD_ROWS');
  const unique=new Set();let prod=0;
  for(const item of parsed){
   if(!Array.isArray(item)||item.length!==16||
      !Number.isSafeInteger(item[0])||item[0]<1||unique.has(item[0])||
      !/^[a-f0-9]{40}$/i.test(item[1]||'')||![0,1].includes(item[2])||
      !item.slice(3,6).every(x=>Number.isSafeInteger(x)&&x>0&&x<10000000000)||
      !valid(item[6])||item[6]>1023||
      item.slice(7).some(x=>x!==0&&(!Number.isSafeInteger(x)||x<1||x>=10000000000))
   )throw Error('BAD_ROW');
   unique.add(item[0]);prod+=item[2];
  }
  if(prod!==raw.production)throw Error('BAD_PRODUCTION_COUNT');
  return {schema:raw.schema,status:'VERIFIED_OPEN_PR_METADATA_SNAPSHOT',
   source_status:source.pr_timestamp_status||null,
   observed_at:raw.observed_at,age_minutes:Math.max(0,Math.floor(
     (now-Date.parse(raw.observed_at))/60000)),
   total:raw.total,production:raw.production,counts:raw.counts,
   event_time_coverage:raw.event_time_coverage,
   stage_clock_kind:raw.stage_clock_kind,
   missing_fields_need_native_events:raw.missing_fields_need_native_events,
   rows_format:raw.rows_format,records:raw.records};
 }catch{return {status:'INVALID_UNVERIFIED_TIMESTAMP_INVENTORY'};}
}

/** This is a signed, bounded sample, not an all-open-PR timeline. */
function wakeHandoff(source){
 const raw=source?.ci_wake_handoff;
 const invalid=()=>({status:'UNVERIFIED',observed_tasks:null,example_records:[]});
 if(!raw)return {status:'NOT_COLLECTED',observed_tasks:null,example_records:[]};
 if(raw.scope!=='INSPECTED_CI_TASKS_ONLY_NOT_ALL_OPEN_PRS'||!valid(raw.observed_tasks)||
  raw.observed_tasks>16||!Array.isArray(raw.example_records)||
  raw.example_records.length>3||raw.example_records.length>raw.observed_tasks)return invalid();
 const output={status:raw.observed_tasks?'SIGNED_BOUNDED_CI_SAMPLE':'NO_CI_TASKS_IN_SWEEP',
  observed_tasks:raw.observed_tasks,example_records:[]};
 for(const key of ['reserved_to_claim','claim_to_wake','wake_to_outcome','wake_pending_age']){
  const row=raw[key];if(!row||!valid(row.n)||row.n>raw.observed_tasks)return invalid();
  for(const field of ['mean_seconds','p50_seconds','p95_seconds']){
   const v=row[field];if(v!=null&&(!valid(v)||v>2592000))return invalid();
   if((row.n>0&&v==null)||(row.n===0&&v!=null))return invalid();
  }
  output[key]={n:row.n,mean_seconds:row.mean_seconds??null,
   p50_seconds:row.p50_seconds??null,p95_seconds:row.p95_seconds??null};
 }
 const states=new Set(['CI_WAKE_UNDELIVERED','CI_CORE_CONFIRMED',
  'WAKE_OUTCOME_NOT_YET_OBSERVED','CLAIMED_NO_WAKE_RECEIPT','RESERVED_NO_CLAIM_RECEIPT']);
 for(const row of raw.example_records){
  if(!Number.isSafeInteger(row?.pr_number)||row.pr_number<1||
   !/^[a-f0-9]{12}$/i.test(row.head_sha||'')||!states.has(row.state)||
   row.source!=='BOT_SIGNED_EXACT_TASK_RECEIPTS'||
   !Number.isFinite(Date.parse(row.observed_at||'')))return invalid();
  output.example_records.push({pr_number:row.pr_number,head_sha:row.head_sha,state:row.state});
 }
 return output;
}

function normalize(source,now=Date.now()){
 if(!source||source.schema!==SCHEMA||source.source_dry_run!==false||
    source.source_schema!=='HH_CONTROL_DISPATCH_V1'||!valid(source.run_id)||
    !source.run_id||typeof source.checked_at!=='string')throw Error('UNVERIFIED_SOURCE');
 const checked=Date.parse(source.checked_at);
 if(!Number.isFinite(checked)||checked>now+60000)throw Error('UNVERIFIED_TIME');
 if(!source.counts||typeof source.counts!=='object')throw Error('MISSING_COUNTS');
 const c=source.counts,q=source.queue_states||{};
 if(!valid(c.candidates)||!valid(c.worker_dispatches)||!valid(c.unknown_owner_locks))
   throw Error('INVALID_COUNTS');
 const normalizedCounts={
   candidates:c.candidates,
   discovered_open_prs:count(c.discovered_open_prs,null),
   production_prs:count(c.production_prs,count(c.production_open_prs,null)),
   actionable_prs:count(c.actionable_prs,null),
   inspected:count(c.inspected,null),
   unknown_owner_locks:c.unknown_owner_locks,
   dispatch_requests_accepted:count(c.dispatch_requests_accepted,null),
   worker_dispatches:c.worker_dispatches,
   labeled_outstanding_prs:count(c.labeled_outstanding_prs,null)
 };
 const sample=verifiedSample(source.watchdog_sample,normalizedCounts.production_prs);
 const sampleStatus=sample?'VERIFIED_BOUNDED_SAMPLE':
   source.watchdog_sample_status==='UNVERIFIED'?'UNVERIFIED':'NOT_PROVIDED';
 let blocked_reasons={},blocked_examples={};
 const hasReasons=!!source.blocked_reasons&&typeof source.blocked_reasons==='object'&&
   !Array.isArray(source.blocked_reasons);
 if(hasReasons){
   for(const [key,n] of Object.entries(source.blocked_reasons).slice(0,50)){
     if(!/^[A-Z][A-Z0-9_]{0,79}$/.test(key)||!valid(n))continue;
     blocked_reasons[key]=n;
   }
   const examples=source.blocked_examples||{};
   for(const [reason,items] of Object.entries(examples)){
     if(!(reason in blocked_reasons)||!Array.isArray(items))continue;
     blocked_examples[reason]=items.slice(0,3).filter(x=>
       valid(x?.pr_number)&&x.pr_number>0&&
       /^[a-f0-9]{12}$/i.test(x?.head_sha||'')
     ).map(x=>({pr_number:x.pr_number,head_sha:x.head_sha}));
   }
 }
 const attemptedBlockers=hasReasons?
  Object.values(blocked_reasons).reduce((a,b)=>a+b,0):0;
 // One bounded sample: overlapping Core, conflict and Specialist categories
 // must not be summed. Missing evidence is UNKNOWN rather than zero.
 const lowerBound=Math.max(attemptedBlockers,
  sample?.verified_blocked_lower_bound||0);
 normalizedCounts.blocked_total=lowerBound>0?lowerBound:null;
 normalizedCounts.verified_blocked_lower_bound=
  sample?.verified_blocked_lower_bound??null;
 const age=Math.max(0,Math.floor((now-checked)/60000));
 return {
   schema:SCHEMA,source_dry_run:false,source_schema:'HH_CONTROL_DISPATCH_V1',generated_at:new Date(now).toISOString(),
   checked_at:source.checked_at,run_id:source.run_id,
   run_url:'https://github.com/andylitvinov-design/books/actions/runs/'+source.run_id,
   source_issue:'https://github.com/andylitvinov-design/books/issues/3128',
   counts:normalizedCounts,queue_states:q,
   pr_timestamps:timestampInventory(source,now),
   ci_wake_handoff:wakeHandoff(source),
   blocked_reasons,blocked_examples,
   blocked_reasons_complete:hasReasons,
   watchdog_sample:sample,watchdog_sample_status:sampleStatus,
   blocked_total:normalizedCounts.blocked_total,
   source_event:typeof source.source_event==='string'?source.source_event:null,
   delivery_status:typeof source.delivery_status==='string'?source.delivery_status:null,
   reason:typeof source.reason==='string'?source.reason:null,
   age_minutes:age,freshness:age>20?'stale':age>10?'aging':'fresh'
 };
}
function parseBody(body){
 if(typeof body!=='string'||!body.startsWith(MARKER))throw Error('UNTRUSTED_FEED_MARKER');
 const match=body.match(/```json\s*([\s\S]*?)```/);
 if(!match)throw Error('MISSING_FEED_JSON');
 return JSON.parse(match[1]);
}
async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
 res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=30');
 if(cached&&Date.now()-cacheAt<30000)return res.status(200).json(normalize(cached));
 try{
   const r=await fetch(ISSUE,{headers:{Accept:'application/vnd.github+json','User-Agent':'holistic-house-pr-monitor'},signal:AbortSignal.timeout(8000)});
   if(!r.ok)throw Error('GITHUB_UPSTREAM_'+r.status);
   const issue=await r.json();
   if(issue.state!=='open')throw Error('FEED_CLOSED');
   const src=parseBody(issue.body);
   const payload=normalize(src);
   cached=src;cacheAt=Date.now();
   return res.status(200).json(payload);
 }catch(error){
   // Fail visibly rather than converting missing proof to zero.
   if(cached){try{const payload=normalize(cached);return res.status(200).json({...payload,feed_error:'UPSTREAM_UNAVAILABLE'});}catch{}}
   return res.status(503).json({schema:SCHEMA,error:'FEED_UNAVAILABLE',blocked_reasons_complete:false});
 }
}
handler.timestampInventory=timestampInventory;
handler.wakeHandoff=wakeHandoff;
handler.normalize=normalize;
handler.parseBody=parseBody;
module.exports=handler;
