/** Durable, append-only Council proposals with owner-only approve/reject. */
import {COUNCIL_TASK_ID,COUNCIL_POLICY,councilIsDue} from './weekly-council.mjs';
const TASK='app_private.ai_automation_tasks_v2';
const RUN='app_private.ai_automation_runs_v2';
const EVENT='app_private.ai_automation_events_v2';
const PROPOSAL='app_private.ai_automation_proposals_v2';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export async function claimCouncilWeekly(db,slotUtc){
 if(!councilIsDue(slotUtc))return {claimed:false,status:'not_due'};
 const r=await db.query(`insert into ${RUN}
  (task_id,slot_utc,state,claim_generation,lease_until,actor_scope,policy_version)
  select task_id,$2::timestamptz,'running',1,now()+interval '115 seconds','strategy',$3
  from ${TASK} where task_id=$1 and enabled=true
  on conflict (task_id,slot_utc) do nothing returning run_id,claim_generation`,
  [COUNCIL_TASK_ID,slotUtc,COUNCIL_POLICY]);
 if(r.rows.length!==1)return {claimed:false,status:'already_claimed_or_disabled'};
 return {claimed:true,runId:r.rows[0].run_id,generation:Number(r.rows[0].claim_generation),slotUtc};
}
export async function previousCouncilOutcomes(db){
 const r=await db.query(`select state,'video_source_research'::text as kind from ${PROPOSAL}
  order by created_at desc limit 4`);
 return r.rows;
}
export async function settleCouncilWeekly(db,claim,{proposal=null,reason=''}={}){
 if(!UUID.test(claim?.runId||'')||!Number.isInteger(claim.generation)||claim.generation<1)
   throw Error('COUNCIL_INVALID_CLAIM');
 const enabled=await db.query(`select enabled from ${TASK} where task_id=$1 for share`,[COUNCIL_TASK_ID]);
 if(enabled.rows[0]?.enabled!==true)return {status:'revoked'};
 const lock=await db.query(`select run_id from ${RUN} where run_id=$1 and task_id=$2
   and claim_generation=$3 and state='running' and lease_until>now() for update`,
   [claim.runId,COUNCIL_TASK_ID,claim.generation]);
 if(lock.rows.length!==1)return {status:'stale'};
 let state='failed',proposalId=null;
 if(proposal?.ownerApprovalRequired===true&&proposal.rightsApproved===false&&proposal.publishAuthorized===false){
  const body=JSON.stringify(proposal);
  if(body.length>6500)throw Error('COUNCIL_PROPOSAL_TOO_LARGE');
  const r=await db.query(`insert into ${PROPOSAL}(run_id,task_id,proposal,model_policy)
    values($1,$2,$3::jsonb,$4) on conflict (run_id) do nothing returning proposal_id`,
    [claim.runId,COUNCIL_TASK_ID,body,COUNCIL_POLICY]);
  proposalId=r.rows[0]?.proposal_id||null;state=proposalId?'succeeded':'no_change';
  if(proposalId)await db.query(`insert into ${EVENT}(run_id,event_type,actor_scope,payload)
    values($1,'proposal_created','strategy',$2::jsonb)`,
    [claim.runId,JSON.stringify({proposalId,ownerReviewRequired:true,publishAuthorized:false})]);
 }
 const err=state==='failed'?(typeof reason==='string'&&/^[A-Z0-9_]{3,64}$/.test(reason)?reason:'COUNCIL_UNAVAILABLE'):null;
 const receipt={status:state,proposalId,ownerReviewRequired:true,appliedToTasks:false,
   councilOnly:true,paidModelUsed:false};
 await db.query(`update ${RUN} set state=$4,finished_at=now(),lease_until=null,
   result_json=$5::jsonb,error_code=$6 where run_id=$1 and task_id=$2 and claim_generation=$3`,
   [claim.runId,COUNCIL_TASK_ID,claim.generation,state,JSON.stringify(receipt),err]);
 await db.query(`insert into ${EVENT}(run_id,event_type,actor_scope,payload)
   values($1,'run_finish','strategy',$2::jsonb)`,[claim.runId,JSON.stringify(receipt)]);
 return {status:state,proposalId};
}
export async function readCouncilProposals(db,{limit=12}={}){
 if(!Number.isInteger(limit)||limit<1||limit>30)throw Error('COUNCIL_INVALID_LIMIT');
 const r=await db.query(`select proposal_id,task_id,state,proposal,created_at,reviewed_at
  from ${PROPOSAL} order by created_at desc limit $1`,[limit]);
 return r.rows;
}
export async function reviewCouncilProposal(db,{proposalId,decision,requestId}={}){
 if(!UUID.test(proposalId||'')||!UUID.test(requestId||'')||!['accept','reject'].includes(decision))
   throw Error('COUNCIL_INVALID_DECISION');
 const row=await db.query(`select proposal_id,state from ${PROPOSAL} where proposal_id=$1 for update`,[proposalId]);
 if(row.rows.length!==1)return {status:'not_found'};
 if(row.rows[0].state!=='pending_owner_review')return {status:'already_reviewed'};
 const event=await db.query(`insert into ${EVENT}(event_type,actor_scope,operation_id,payload)
   values('proposal_decision','owner',$1,$2::jsonb)
   on conflict (operation_id) do nothing returning event_id`,[requestId,JSON.stringify({proposalId,decision})]);
 if(event.rows.length!==1)return {status:'replayed'};
 const next=decision==='accept'?'accepted_for_manual_planning':'rejected';
 await db.query(`update ${PROPOSAL} set state=$2,reviewed_at=now() where proposal_id=$1`,[proposalId,next]);
 // Approval does NOT alter any schedule, licence, budget, provider, model or publication flag.
 return {status:'reviewed',state:next,appliedToTasks:false,rightsApproved:false};
}
export async function changeCouncilTaskState(db,{enabled,operationId}={}){
 if(typeof enabled!=='boolean'||!UUID.test(operationId||''))throw Error('COUNCIL_INVALID_CONTROL');
 const op=await db.query(`insert into ${EVENT}(event_type,actor_scope,operation_id,payload)
  values('task_change','owner',$1,$2::jsonb) on conflict (operation_id) do nothing
  returning event_id`,[operationId,JSON.stringify({taskId:COUNCIL_TASK_ID,enabled})]);
 if(op.rows.length!==1)return {status:'replayed'};
 const r=await db.query(`update ${TASK} set enabled=$1,updated_at=now()
  where task_id=$2 and task_kind='strategic_review' returning enabled`,[enabled,COUNCIL_TASK_ID]);
 if(r.rows.length!==1)throw Error('COUNCIL_TASK_UNAVAILABLE');
 return {status:'updated',enabled:r.rows[0].enabled};
}
