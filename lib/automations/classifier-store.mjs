/** Research-only annotations. An AI suggestion is not evidence of clips, rights, releases or publishability. */
import {CLASSIFIER_TASK_ID,CLASSIFIER_MODEL_POLICY} from './free-classifier.mjs';
const TABLE='app_private.ai_automation_runs_v2';
const TASK='app_private.ai_automation_tasks_v2';
const EVENT='app_private.ai_automation_events_v2';
const CANDIDATE='app_private.video_source_candidates_v2';
const ANNOTATIONS='app_private.video_candidate_ai_suggestions_v2';

export async function claimClassifierBatch(db,slotUtc){
  const t=Date.parse(slotUtc);
  if(!Number.isFinite(t)||new Date(t).getUTCMinutes()!==17||new Date(t).getUTCHours()%4!==0)
    return {claimed:false,status:'not_due'};
  const r=await db.query(`insert into ${TABLE}
    (task_id,slot_utc,state,claim_generation,lease_until,actor_scope,policy_version)
    select task_id,$2::timestamptz,'running',1,now()+interval '85 seconds','cron',$3
    from ${TASK} where task_id=$1 and enabled=true
    on conflict (task_id,slot_utc) do nothing returning run_id,claim_generation`,
    [CLASSIFIER_TASK_ID,slotUtc,CLASSIFIER_MODEL_POLICY]);
  if(r.rows.length!==1)return {claimed:false,status:'already_claimed_or_disabled'};
  return {claimed:true,runId:r.rows[0].run_id,generation:Number(r.rows[0].claim_generation),slotUtc};
}

export async function classifierInput(db){
  const q=await db.query(`select c.candidate_id,c.title,c.category,c.source_query,c.mime
    from ${CANDIDATE} c left join ${ANNOTATIONS} a on a.candidate_id=c.candidate_id
    where c.review_state='research_only' and c.rights_state='unverified' and a.candidate_id is null
    order by c.first_seen_at desc limit 6`);
  return q.rows;
}

export async function settleClassifierBatch(db,claim,result){
  if(!claim?.runId||!Number.isInteger(claim.generation))throw Error('CLASSIFIER_INVALID_CLAIM');
  if(!['ok','no_change','disabled','quota_paused','failed'].includes(result?.status)||
    (result.results?.length||0)>6)throw Error('CLASSIFIER_INVALID_RESULT');
  const a=await db.query(`select enabled from ${TASK} where task_id=$1 for share`,[CLASSIFIER_TASK_ID]);
  if(a.rows[0]?.enabled!==true)return {status:'revoked'};
  const locked=await db.query(`select run_id from ${TABLE}
    where run_id=$1 and task_id=$2 and claim_generation=$3 and state='running'
      and lease_until>now() for update`,[claim.runId,CLASSIFIER_TASK_ID,claim.generation]);
  if(locked.rows.length!==1)return {status:'stale'};
  let annotated=0;
  if(result.status==='ok')for(const item of result.results){
    if(item.reviewRequired!==true||!Array.isArray(item.goals)||item.goals.length>4||
      typeof item.summary!=='string'||item.summary.length>240)throw Error('CLASSIFIER_BAD_ANNOTATION');
    const write=await db.query(`insert into ${ANNOTATIONS}
      (candidate_id,model_id,goals,summary,confidence,warnings,review_required,first_run_id)
      values($1,$2,$3::jsonb,$4,$5,$6::jsonb,true,$7)
      on conflict (candidate_id) do nothing returning candidate_id`,
      [item.candidateId,result.model,JSON.stringify(item.goals),item.summary,item.confidence,
       JSON.stringify(item.warnings),claim.runId]);
    annotated+=write.rows.length;
  }
  const state=result.status==='ok'?(annotated?'succeeded':'no_change'):
    result.status==='disabled'?'quota_paused':result.status;
  const code=result.status==='ok'?null:
    typeof result.reason==='string'&&/^[A-Z0-9_]{3,64}$/.test(result.reason)?result.reason:'CLASSIFIER_NOT_READY';
  const receipt={status:state,classified:annotated,
    source:result.provider==='gemini_direct_free'?'owner_gemini_attested_free_tier':'owner_free_openrouter',
    model:result.model||null,priceVerified:result.priceVerified===true,
    apiCalls:Math.min(4,Number(result.apiCalls)||0),
    freeTierAttested:result.freeTierAttested===true,
    reviewRequired:true,rightsApproved:false};
  await db.query(`update ${TABLE} set state=$4,finished_at=now(),lease_until=null,
    result_json=$5::jsonb,error_code=$6 where run_id=$1 and task_id=$2 and claim_generation=$3`,
    [claim.runId,CLASSIFIER_TASK_ID,claim.generation,state,JSON.stringify(receipt),code]);
  await db.query(`insert into ${EVENT}(run_id,event_type,actor_scope,payload)
    values($1,'run_finish','cron',$2::jsonb)`,[claim.runId,JSON.stringify(receipt)]);
  return {status:state,receipt};
}

/** Owner-side aggregate only, never publish AI suggestions to the public library. */
export async function readClassifierAnnotations(db,{limit=20}={}){
  if(!Number.isInteger(limit)||limit<1||limit>40)throw Error('CLASSIFIER_INVALID_LIMIT');
  const r=await db.query(`select a.candidate_id,c.title,a.model_id,a.goals,a.summary,
    a.confidence,a.review_required,a.created_at from ${ANNOTATIONS} a
    join ${CANDIDATE} c on c.candidate_id=a.candidate_id
    order by a.created_at desc limit $1`,[limit]);
  return r.rows;
}

export async function changeClassifierTaskState(db,{enabled,operationId}={}){
  if(typeof enabled!=='boolean'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(operationId||''))
    throw Error('CLASSIFIER_INVALID_CONTROL');
  const op=await db.query(`insert into ${EVENT}(event_type,actor_scope,operation_id,payload)
    values('task_change','owner',$1,$2::jsonb) on conflict (operation_id) do nothing
    returning event_id`,[operationId,JSON.stringify({taskId:CLASSIFIER_TASK_ID,enabled})]);
  if(op.rows.length!==1)return {status:'replayed',enabled:null};
  const r=await db.query(`update ${TASK} set enabled=$1,updated_at=now()
    where task_id=$2 and task_kind='video_classification' returning enabled`,[enabled,CLASSIFIER_TASK_ID]);
  if(r.rows.length!==1)throw Error('CLASSIFIER_TASK_UNAVAILABLE');
  return {status:'updated',enabled:r.rows[0].enabled};
}
