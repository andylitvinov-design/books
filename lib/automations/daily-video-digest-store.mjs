/** Read-only 24h counters and durable once-per-UTC-day claim before Telegram send. */
import {VIDEO_DIGEST_TASK_ID,VIDEO_DIGEST_POLICY,videoDigestDue,safeVideoDigestStats}
 from './daily-video-digest.mjs';
const TASK='app_private.ai_automation_tasks_v2';
const RUN='app_private.ai_automation_runs_v2';
const EVENT='app_private.ai_automation_events_v2';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function claimDailyVideoDigest(db,slotUtc){
  if(!videoDigestDue(slotUtc))return {claimed:false,status:'not_due'};
  const r=await db.query(`insert into ${RUN}
    (task_id,slot_utc,state,claim_generation,lease_until,actor_scope,policy_version)
    select task_id,$2::timestamptz,'running',1,now()+interval '150 seconds','cron',$3
    from ${TASK} where task_id=$1 and enabled=true and policy_version=$3
    on conflict(task_id,slot_utc) do nothing returning run_id,claim_generation`,
    [VIDEO_DIGEST_TASK_ID,slotUtc,VIDEO_DIGEST_POLICY]);
  if(r.rows.length!==1)return {claimed:false,status:'already_claimed_or_disabled'};
  const run=r.rows[0];
  await db.query(`insert into ${EVENT}(run_id,event_type,actor_scope,payload)
    values($1,'run_claim','cron',$2::jsonb)`,[run.run_id,
    JSON.stringify({taskId:VIDEO_DIGEST_TASK_ID,externalSend:'not_yet_attempted'})]);
  return {claimed:true,runId:run.run_id,generation:Number(run.claim_generation),slotUtc};
}
export async function readVideoDigestStats(db){
  const r=await db.query(`select count(*)::integer as slots,
    count(*) filter (where state='succeeded')::integer as succeeded,
    count(*) filter (where state in ('failed','partial','quota_paused'))::integer as failed,
    count(*) filter (where state='no_change')::integer as "noChange",
    coalesce(sum(candidates_inserted),0)::integer as inserted,
    coalesce(sum(duplicates),0)::integer as duplicates,
    coalesce(sum(source_calls),0)::integer as "sourceCalls"
    from ${RUN} where task_id='video-scout-hourly'
      and slot_utc >= now()-interval '24 hours'`);
  return safeVideoDigestStats(r.rows[0]);
}
export async function settleDailyVideoDigest(db,claim,{accepted=false,error=''}={}){
  if(!UUID.test(claim?.runId||'')||!Number.isInteger(claim.generation)||claim.generation<1)
    throw Error('VIDEO_DIGEST_INVALID_CLAIM');
  const authorities=await db.query(`select enabled from ${TASK} where task_id=$1 for share`,[VIDEO_DIGEST_TASK_ID]);
  // Once a Telegram request was made, we must store a terminal state if possible;
  // disabling the task cannot erase the once-per-day send claim.
  const r=await db.query(`select run_id from ${RUN} where run_id=$1 and task_id=$2
    and claim_generation=$3 and state='running' for update`,
    [claim.runId,VIDEO_DIGEST_TASK_ID,claim.generation]);
  if(r.rows.length!==1)return {status:'stale'};
  const status=accepted?'succeeded':'failed';
  const code=accepted?null:typeof error==='string'&&/^[A-Z0-9_]{3,64}$/.test(error)?error:'TELEGRAM_DELIVERY_UNCONFIRMED';
  const receipt={status,channel:'owner_telegram',delivery:accepted?'provider_accepted':'uncertain_or_failed',
    retriesAllowed:false,taskEnabledAtFinish:authorities.rows[0]?.enabled===true};
  await db.query(`update ${RUN} set state=$4,finished_at=now(),lease_until=null,
    error_code=$5,result_json=$6::jsonb where run_id=$1 and task_id=$2 and claim_generation=$3`,
    [claim.runId,VIDEO_DIGEST_TASK_ID,claim.generation,status,code,JSON.stringify(receipt)]);
  await db.query(`insert into ${EVENT}(run_id,event_type,actor_scope,payload)
    values($1,'run_finish','cron',$2::jsonb)`,[claim.runId,JSON.stringify(receipt)]);
  return {status,delivery:receipt.delivery};
}
export async function changeDailyDigestState(db,{enabled,operationId}={}){
  if(typeof enabled!=='boolean'||!UUID.test(operationId||''))throw Error('VIDEO_DIGEST_INVALID_CONTROL');
  const op=await db.query(`insert into ${EVENT}(event_type,actor_scope,operation_id,payload)
    values('task_change','owner',$1,$2::jsonb) on conflict(operation_id) do nothing
    returning event_id`,[operationId,JSON.stringify({taskId:VIDEO_DIGEST_TASK_ID,enabled})]);
  if(op.rows.length!==1)return {status:'replayed'};
  const r=await db.query(`update ${TASK} set enabled=$1,updated_at=now()
    where task_id=$2 and task_kind='report_delivery' and policy_version=$3 returning enabled`,
    [enabled,VIDEO_DIGEST_TASK_ID,VIDEO_DIGEST_POLICY]);
  if(r.rows.length!==1)throw Error('VIDEO_DIGEST_TASK_NOT_INSTALLED');
  return {status:'updated',enabled:r.rows[0].enabled};
}
