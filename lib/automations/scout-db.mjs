/** Database access requires the existing server-scoped hh_app_backend transaction. */
import {SCOUT_TASK_ID,SCOUT_POLICY_VERSION,scoutSlotsThrough} from './video-scout.mjs';
import {candidatePageInfo,CANDIDATE_PAGE_SIZE} from './candidate-pagination.mjs';
const RUN='app_private.ai_automation_runs_v2';
const TASK='app_private.ai_automation_tasks_v2';
const CANDIDATE='app_private.video_source_candidates_v2';
const EVENT='app_private.ai_automation_events_v2';
const TASK_IDS=new Set([SCOUT_TASK_ID]);
const STATUS=new Set(['succeeded','no_change','partial','failed','quota_paused']);
const integer=value=>Number.isSafeInteger(value)&&value>=0?value:0;

export async function claimVideoScout(db,{slotUtc,actor='cron'}={}){
  if(!Number.isFinite(Date.parse(slotUtc))||!['cron','owner'].includes(actor))throw Error('SCOUT_INVALID_CLAIM');
  // A crashed or timed-out owner loses its lease. Do not fabricate success.
  await db.query(`update ${RUN} set state='failed',error_code='LEASE_EXPIRED',finished_at=now(),
    lease_until=null where task_id=$1 and state='running' and lease_until < now()`,[SCOUT_TASK_ID]);
  const res=await db.query(`insert into ${RUN}
    (task_id,slot_utc,state,claim_generation,lease_until,actor_scope,policy_version)
    select task_id,$2::timestamptz,'running',1,now()+interval '135 seconds',$3,$4
    from ${TASK} where task_id=$1 and enabled=true
    on conflict (task_id,slot_utc) do nothing
    returning run_id,claim_generation,slot_utc`,
    [SCOUT_TASK_ID,slotUtc,actor,SCOUT_POLICY_VERSION]);
  if(res.rows.length!==1)return {claimed:false,status:'already_claimed_or_disabled',slotUtc};
  const run=res.rows[0];
  await db.query(`insert into ${EVENT} (run_id,event_type,actor_scope,payload)
    values($1,'run_claim',$2,$3::jsonb)`,[run.run_id,actor,JSON.stringify({slotUtc,policy:SCOUT_POLICY_VERSION})]);
  return {claimed:true,runId:run.run_id,generation:Number(run.claim_generation),slotUtc};
}

export async function settleVideoScout(db,claim,result={}){
  if(!claim?.runId||!Number.isInteger(claim.generation)||claim.generation<1)throw Error('SCOUT_INVALID_RECEIPT');
  const items=Array.isArray(result.items)?result.items:[];
  if(items.length>20||!['ok','partial','failed','quota_paused'].includes(result.requestedStatus))
    throw Error('SCOUT_INVALID_RESULT');
  // Lock the source authority row: a paused automation cannot admit new results.
  const authority=await db.query(`select enabled from ${TASK} where task_id=$1 for share`,[SCOUT_TASK_ID]);
  if(authority.rows[0]?.enabled!==true)return {status:'revoked',slotUtc:claim.slotUtc};
  const locked=await db.query(`select run_id from ${RUN}
    where run_id=$1 and task_id=$2 and claim_generation=$3
      and state='running' and lease_until>now() for update`,
    [claim.runId,SCOUT_TASK_ID,claim.generation]);
  if(locked.rows.length!==1)return {status:'stale',slotUtc:claim.slotUtc};
  let added=0;
  for(const item of items){
    if(item.provider!=='wikimedia_commons'||item.reviewState!=='research_only'||
      item.rightsState!=='unverified'||!/^[1-9][0-9]{0,12}$/.test(item.sourceId||'')||
      !/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(item.sourcePage||''))
      throw Error('SCOUT_INVALID_CANDIDATE');
    const out=await db.query(`insert into ${CANDIDATE}
      (provider,source_id,source_page,title,creator,license_claim,license_url_claim,
       category,source_query,mime,size_bytes,width,height,sha1_claim,first_run_id,
       review_state,rights_state)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'research_only','unverified')
      on conflict (provider,source_id) do nothing returning candidate_id`,[
      item.provider,item.sourceId,item.sourcePage,item.title,item.creator,item.licenseClaim,
      item.licenseUrl,item.category,item.sourceQuery,item.mime,item.sizeBytes,item.width,
      item.height,item.sha1Claim,claim.runId,
    ]);
    added+=out.rows.length;
  }
  const warnings=(Array.isArray(result.warnings)?result.warnings:[])
    .filter(x=>typeof x==='string'&&/^[A-Z0-9_]{3,64}$/.test(x)).slice(0,2);
  const status=result.requestedStatus==='failed'?'failed':
    result.requestedStatus==='quota_paused'?'quota_paused':
    result.requestedStatus==='partial'?'partial':added>0?'succeeded':'no_change';
  if(!STATUS.has(status))throw Error('SCOUT_INVALID_STATUS');
  const counters={sourceCalls:integer(result.sourceCalls),received:integer(result.received),
    inserted:added,duplicate:items.length-added+integer(result.duplicateWithinBatch),
    rejected:integer(result.rejected),aiCalls:0,vaultPublished:0};
  const receipt={version:'hh-run-receipt-v2',runId:claim.runId,
    taskId:SCOUT_TASK_ID,slotUtc:claim.slotUtc,policyVersion:SCOUT_POLICY_VERSION,
    state:status,counters,warnings,source:'wikimedia_commons',
    // Never claim metadata is a licensed source master.
    candidateOnly:true,rightsApproved:false};
  await db.query(`update ${RUN} set state=$4,source_calls=$5,candidates_inserted=$6,
    duplicates=$7,rejected=$8,received=$9,finished_at=now(),lease_until=null,
    result_json=$10::jsonb,error_code=$11 where run_id=$1 and claim_generation=$2 and task_id=$3`,
    [claim.runId,claim.generation,SCOUT_TASK_ID,status,counters.sourceCalls,counters.inserted,
      counters.duplicate,counters.rejected,counters.received,JSON.stringify(receipt),
      warnings[0]||null]);
  await db.query(`insert into ${EVENT} (run_id,event_type,actor_scope,payload)
    values($1,'run_finish',$2,$3::jsonb)`,
    [claim.runId,'cron',JSON.stringify({status,counters,policy:SCOUT_POLICY_VERSION})]);
  return {status,receipt};
}

/** Owner-only, private readback. Null means unknown; do not turn it into zero. */
export async function readAutomationSnapshot(db,{now=new Date(),limit=40,candidatePage=1}={}) {
  if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('AUTOMATION_INVALID_LIMIT');
  const pageInfo=candidatePageInfo(candidatePage,0);
  const [tasks,runs,candidates,counts,lastRuns]=await Promise.all([
    db.query(`select task_id,task_kind,enabled,schedule_cron,description,
      updated_at from ${TASK} order by task_id`),
    db.query(`select run_id,task_id,slot_utc,
      case when state='running' and lease_until<now() then 'expired' else state end as state,
      source_calls,candidates_inserted,duplicates,rejected,received,started_at,finished_at,
      error_code from ${RUN} order by slot_utc desc limit $1`,[limit]),
    db.query(`select candidate_id,source_id,source_page,title,creator,license_claim,
      category,mime,review_state,rights_state,first_seen_at from ${CANDIDATE}
      order by first_seen_at desc,candidate_id desc limit $1 offset $2`,
      [CANDIDATE_PAGE_SIZE,pageInfo.offset]),
    db.query(`select count(*)::integer as research_total,
      count(*) filter(where c.review_state='research_only' and r.candidate_id is null)
        ::integer as pending_review
      from ${CANDIDATE} c
      left join app_private.video_candidate_editorial_reviews_v1 r
        on r.candidate_id=c.candidate_id`),
    // Independently read the newest receipt for EACH task, even when Scout
    // has already filled the short 40-run history window.
    db.query(`select distinct on (task_id) task_id,slot_utc,
      case when state='running' and lease_until<now() then 'expired' else state end as state,
      error_code,result_json
      from ${RUN} order by task_id,slot_utc desc,started_at desc limit 8`),
  ]);
  const bySlot=new Map(runs.rows.filter(x=>x.task_id===SCOUT_TASK_ID)
    .map(x=>[new Date(x.slot_utc).toISOString(),x]));
  const slots=scoutSlotsThrough(now,24).map(slotUtc=>{
    const run=bySlot.get(slotUtc);
    return {slotUtc,state:run?.state||'missing',runId:run?.run_id||null};
  });
  return {status:'database_verified',observedAt:new Date(now).toISOString(),tasks:tasks.rows,
    runs:runs.rows,candidates:candidates.rows,counts:counts.rows[0],slots,
    lastRuns:lastRuns.rows,
    candidatePagination:candidatePageInfo(candidatePage,Number(counts.rows[0]?.research_total||0)),
    approvedVaultRows:null,approvedVaultEvidence:'separate_vault_registry_not_probed',
    accountWideFreeModelBudgetVerified:false};
}

export async function changeScoutTaskState(db,{enabled,operationId}={}){
  if(typeof enabled!=='boolean'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(operationId||''))
    throw Error('SCOUT_INVALID_CONTROL');
  const op=await db.query(`insert into ${EVENT} (event_type,actor_scope,operation_id,payload)
    values('task_change','owner',$1,$2::jsonb) on conflict (operation_id) do nothing
    returning event_id`,[operationId,JSON.stringify({taskId:SCOUT_TASK_ID,enabled})]);
  if(op.rows.length===0)return {status:'replayed',enabled:null};
  const updated=await db.query(`update ${TASK} set enabled=$1,updated_at=now()
    where task_id=$2 and task_kind='video_source_discovery'
    returning enabled`,[enabled,SCOUT_TASK_ID]);
  if(updated.rows.length!==1)throw Error('SCOUT_TASK_NOT_INSTALLED');
  return {status:'updated',enabled:updated.rows[0].enabled};
}
