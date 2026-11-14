'use strict';

const SHA=/^[a-f0-9]{40}$/i;
const TASK=/^[a-f0-9]{32}$/i;
const ALLOWED=new Set([
  'FIXED','VERIFIED','RETRY_SCHEDULED','REROUTED','WAITING_INPUT',
  'MANUAL_REQUIRED','KNOWN_ISSUE','NOT_ACTIONABLE','BLOCKED','UNCLASSIFIED'
]);
const iso=value=>typeof value==='string'&&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)&&
  Number.isFinite(Date.parse(value));
const plusMinutes=(at,minutes)=>new Date(Date.parse(at)+minutes*60000).toISOString();

/**
 * Build a bounded lifecycle outcome to embed into the existing signed Repair
 * Worker outcome comment. This is a receipt/read model only; it grants no
 * dispatch, write, retry, merge, deployment, or credential authority.
 */
function buildTaskOutcome(input={}){
  const {task_key,pr_number,head_sha,new_sha=null,state,reason_code,
    source_published=false,head_matches=true,claim_status='unknown',
    retry_after=null,owner_run_id,now}=input;
  if(!TASK.test(task_key||'')||!Number.isSafeInteger(pr_number)||pr_number<1||
     !SHA.test(head_sha||'')||!/^\d{1,20}$/.test(String(owner_run_id||''))||
     !iso(now)||typeof state!=='string'||typeof reason_code!=='string'||
     !reason_code.trim()||reason_code.length>120||
     typeof source_published!=='boolean'||typeof head_matches!=='boolean')
    throw Error('INVALID_TASK_OUTCOME_INPUT');

  let status='BLOCKED',responsible_role='agents-director-maintainer';
  let next_action='INSPECT_EXISTING_TASK_RECEIPTS';
  let next_check_at=plusMinutes(now,15),verified_source=false;
  switch(state){
    case 'PUBLISHED':
      if(source_published!==true||!SHA.test(new_sha||'')||new_sha===head_sha||head_matches!==true)
        throw Error('UNVERIFIED_PUBLISHED_OUTCOME');
      status='FIXED';responsible_role='exact-head-ci-verifier';
      next_action='VERIFY_EXACT_HEAD_REQUIRED_CI';next_check_at=plusMinutes(now,10);
      verified_source=true;break;
    case 'MANUAL':
      status='MANUAL_REQUIRED';responsible_role='repository-owner';
      next_action='REVIEW_MANUAL_REPAIR_REASON_AND_ASSIGN_OWNER';next_check_at=plusMinutes(now,60);break;
    case 'VERIFY_REQUIRED':
      status='BLOCKED';responsible_role='repair-finalizer';
      next_action='VERIFY_SOURCE_COMMIT_AND_PR_HEAD';next_check_at=plusMinutes(now,5);break;
    case 'SUPERSEDED':
      status='REROUTED';responsible_role='pr-head-reconciler';
      next_action='REINSPECT_NEW_HEAD_AND_OWNER';next_check_at=plusMinutes(now,5);break;
    case 'PREPARED':
      status='REROUTED';responsible_role='semantic-repair-queue';
      next_action='ASSIGN_SEMANTIC_SOURCE_REPAIR_AGENT';next_check_at=plusMinutes(now,15);break;
    case 'REJECTED':
      status='WAITING_INPUT';responsible_role='repository-owner';
      next_action='VERIFY_CLAIM_PERMISSION_AND_LEASE';next_check_at=plusMinutes(now,30);break;
    case 'NO_CLAIM_RETRYABLE':
      if(retry_after&&(!iso(retry_after)||Date.parse(retry_after)<=Date.parse(now)))
        throw Error('INVALID_RETRY_AFTER');
      status='RETRY_SCHEDULED';responsible_role='task-dispatcher';
      next_action='RECHECK_EXACT_HEAD_AND_SIGNED_RESERVATION';
      next_check_at=retry_after||plusMinutes(now,15);break;
    case 'FAILED':
      status=claim_status==='claimed'?'MANUAL_REQUIRED':'REROUTED';
      responsible_role=claim_status==='claimed'?'repository-owner':'agents-director-maintainer';
      next_action=claim_status==='claimed'?'ASSIGN_DIFFERENT_REPAIR_STRATEGY':'RECOVER_OR_REROUTE_TASK';
      next_check_at=plusMinutes(now,30);break;
    default:
      status='UNCLASSIFIED';responsible_role='ci-diagnostic-triage';
      next_action='RUN_BOUNDED_SECONDARY_DIAGNOSTICS';next_check_at=plusMinutes(now,15);
  }
  const result={
    schema:'HH_TASK_OUTCOME_V1',task_key,pr_number,head_sha,
    status,reason_code:reason_code.trim(),responsible_role,next_action,
    next_check_at,created_at:now,owner_run_id:String(owner_run_id),
    source_published,verified_source,
    new_sha:verified_source?new_sha:null,
    terminal:status==='VERIFIED'||status==='NOT_ACTIONABLE'||status==='KNOWN_ISSUE'
  };
  if(!ALLOWED.has(result.status)||!validateTaskOutcome(result))
    throw Error('INVALID_TASK_OUTCOME');
  return result;
}

function validateTaskOutcome(item){
  return Boolean(item&&item.schema==='HH_TASK_OUTCOME_V1'&&
    TASK.test(item.task_key||'')&&Number.isSafeInteger(item.pr_number)&&item.pr_number>0&&
    SHA.test(item.head_sha||'')&&ALLOWED.has(item.status)&&
    typeof item.reason_code==='string'&&item.reason_code.length>0&&item.reason_code.length<=120&&
    typeof item.responsible_role==='string'&&item.responsible_role.length>0&&
    typeof item.next_action==='string'&&item.next_action.length>0&&
    iso(item.created_at)&&iso(item.next_check_at)&&
    /^\d{1,20}$/.test(String(item.owner_run_id||''))&&
    typeof item.source_published==='boolean'&&typeof item.verified_source==='boolean'&&
    (item.status!=='FIXED'||(item.source_published===true&&item.verified_source===true&&
      SHA.test(item.new_sha||'')&&item.new_sha!==item.head_sha))&&
    (item.status!=='VERIFIED'||item.verified_source===true));
}
module.exports={buildTaskOutcome,validateTaskOutcome,ALLOWED_OUTCOME_STATUSES:ALLOWED};
