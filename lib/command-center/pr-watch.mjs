/**
 * Agent Commander PR Watch: owner-assigned, read-only GitHub observation.
 * An assignment is not an authorization to repair code, publish or merge.
 * Reuses the existing 10-minute Command Center tick; 15m is a per-task
 * minimum cooldown, not an unverified hard delivery SLA.
 */
import {ccUuid,parseGithubSource} from './contracts.mjs';
import {inspectCommandTaskDelivery} from './release-proof.mjs';

export const PR_WATCH_MAX_ACTIVE=3;
export const PR_WATCH_PER_TICK=2;
export const PR_WATCH_INTERVAL_MINUTES=15;
const REPO_PR='https://github.com/andylitvinov-design/books/pull/';
const TABLE='app_private.cc_pr_watch';
const EVENTS='app_private.cc_pr_watch_events';
const SHA=/^[a-f0-9]{40}$/i;
const safeSha=v=>typeof v==='string'&&SHA.test(v)?v.toLowerCase():null;
const safeText=(v,max=72)=>typeof v==='string'?v.slice(0,max):null;

export function classifyPrWatchProof(proof){
 if(!proof||proof.prState==='unknown'||!Number.isSafeInteger(proof.prNumber))return 'unknown';
 if(proof.prState==='closed')return 'closed_without_merge';
 if(proof.prState==='merged'){
  if(proof.targetBranch==='codex/bootstrap-books')return 'merged_control';
  return proof.codeOnProduction===true?'on_live_unverified':'merged_waiting_live';
 }
 if(proof.prState!=='open')return 'unknown';
 if(proof.ci==='failed')return 'needs_fix';
 if(proof.ci==='passed')return 'ready_for_merge';
 if(proof.ci==='pending')return 'ci_running';
 return 'in_progress';
}

/** Client receives no PR body, owner credentials or other private task details. */
export async function readCommandPrWatches(db){
 const [watches,history]=await Promise.all([
  db.query('SELECT w.task_id,w.pr_number,w.enabled,w.stage,w.proof,w.last_checked_at,'+
   'w.next_check_at,w.last_error,t.title,t.state AS task_state FROM '+TABLE+
   ' w JOIN app_private.cc_tasks t ON t.id=w.task_id ORDER BY w.enabled DESC,w.updated_at DESC LIMIT 80'),
  db.query('SELECT task_id,pr_number,event_type,stage,observed_at FROM '+EVENTS+
   ' ORDER BY observed_at DESC LIMIT 35')
 ]);
 return {items:watches.rows,history:history.rows,intervalMinutes:PR_WATCH_INTERVAL_MINUTES,
  maxActive:PR_WATCH_MAX_ACTIVE,perTick:PR_WATCH_PER_TICK};
}

/** Assign/unassign an existing owner task to the observer. Never edits cc_tasks.state. */
export async function setCommandPrWatch(db,{taskId,enabled}={}){
 if(!ccUuid(taskId)||typeof enabled!=='boolean')return {status:'invalid_control'};
 await db.query("SELECT pg_advisory_xact_lock(hashtext('cc-pr-watch'),hashtext('owner'))");
 const r=await db.query('SELECT t.id,t.kind,t.state,t.source_ref,'+
  '(SELECT p.pr_number FROM app_private.cc_pm_pr_links p WHERE p.task_id=t.id '+
  'ORDER BY p.linked_at DESC LIMIT 1) AS linked_pr FROM app_private.cc_tasks t WHERE t.id=$1 FOR UPDATE',[taskId]);
 const task=r.rows[0];
 if(!task||task.state==='canceled')return {status:'task_not_available'};
 const source=parseGithubSource(task.source_ref);
 const number=Number(task.linked_pr)||((source?.kind==='repo_pr_audit')?source.number:0);
 if(!Number.isSafeInteger(number)||number<1||number>99999999)return {status:'pr_link_required'};
 const existing=(await db.query('SELECT enabled,pr_number,stage FROM '+TABLE+' WHERE task_id=$1 FOR UPDATE',[taskId])).rows[0];
 if(existing?.enabled===enabled&&Number(existing.pr_number)===number)return {status:'unchanged',taskId,enabled,prNumber:number};
 if(enabled){
  const active=await db.query('SELECT count(*)::int AS n FROM '+TABLE+
   ' WHERE enabled=true AND task_id<>$1',[taskId]);
  if(active.rows[0].n>=PR_WATCH_MAX_ACTIVE)return {status:'capacity_reached',maxActive:PR_WATCH_MAX_ACTIVE};
 }
 const result=await db.query('INSERT INTO '+TABLE+'(task_id,pr_number,enabled,next_check_at) '+
  'VALUES($1,$2,$3,now()) ON CONFLICT(task_id) DO UPDATE SET '+
  'pr_number=EXCLUDED.pr_number,enabled=EXCLUDED.enabled,'+
  "stage=CASE WHEN "+TABLE+".pr_number=EXCLUDED.pr_number THEN "+TABLE+".stage ELSE 'unknown' END,"+
  'proof=CASE WHEN '+TABLE+'.pr_number=EXCLUDED.pr_number THEN '+TABLE+".proof ELSE '{}'::jsonb END,"+
  'last_checked_at=CASE WHEN '+TABLE+'.pr_number=EXCLUDED.pr_number THEN '+TABLE+'.last_checked_at ELSE NULL END,'+
  'lease_until=NULL,generation='+TABLE+'.generation+1,next_check_at=now(),updated_at=now() '+
  'RETURNING task_id,pr_number,enabled,stage',[taskId,number,enabled]);
 await db.query('INSERT INTO '+EVENTS+
  '(task_id,pr_number,event_type,stage) VALUES($1,$2,$3,$4)',
  [taskId,number,enabled?'assigned':'paused',result.rows[0].stage]);
 return {status:enabled?'watching':'paused',taskId,enabled,prNumber:number};
}

/** Short database lease prevents cron/manual races and stale confirmations. */
export async function claimCommandPrWatches(db,{taskId=null,limit=PR_WATCH_PER_TICK}={}){
 if(taskId!==null&&!ccUuid(taskId))return [];
 if(!Number.isInteger(limit)||limit<1||limit>PR_WATCH_MAX_ACTIVE)return [];
 const r=await db.query(
  'WITH due AS (SELECT w.task_id,'+
  '(SELECT p.pr_number FROM app_private.cc_pm_pr_links p WHERE p.task_id=w.task_id '+
  'ORDER BY p.linked_at DESC LIMIT 1) AS linked_pr '+
  'FROM '+TABLE+' w JOIN app_private.cc_tasks t ON t.id=w.task_id '+
  "WHERE w.enabled=true AND t.state<>'canceled' AND "+
  '($1::uuid IS NULL OR w.task_id=$1::uuid) AND '+
  '(w.lease_until IS NULL OR w.lease_until<now()) AND '+
  "($1::uuid IS NOT NULL OR w.next_check_at<=now()) AND "+
  "($1::uuid IS NULL OR w.last_checked_at IS NULL OR w.last_checked_at<now()-interval '60 seconds') "+
  'ORDER BY w.next_check_at,w.updated_at LIMIT $2 FOR UPDATE OF w SKIP LOCKED) '+
  'UPDATE '+TABLE+' w SET '+
  'pr_number=COALESCE(due.linked_pr,w.pr_number),'+
  "stage=CASE WHEN due.linked_pr IS NOT NULL AND due.linked_pr<>w.pr_number THEN 'unknown' ELSE w.stage END,"+
  'generation=w.generation+1,lease_until=now()+interval \'45 seconds\','+
  'next_check_at=now()+interval \'45 seconds\',updated_at=now() '+
  'FROM due WHERE w.task_id=due.task_id '+
  'RETURNING w.task_id,w.pr_number,w.generation',
  [taskId,limit]);
 return r.rows;
}

/** Store only bounded trusted scalar observations. Never auto-mark code tasks done. */
export async function settleCommandPrWatch(db,claim,proof){
 const old=(await db.query('SELECT stage,proof,pr_number FROM '+TABLE+
  ' WHERE task_id=$1 AND generation=$2 AND pr_number=$3 AND enabled=true FOR UPDATE',
  [claim.task_id,claim.generation,claim.pr_number])).rows[0];
 if(!old)return {status:'stale_unconfirmed',taskId:claim.task_id};
 const observed=proof&&typeof proof==='object'?proof:null;
 const stage=classifyPrWatchProof(observed);
 const info={prNumber:claim.pr_number,prState:safeText(observed?.prState,24)||'unknown',
  targetBranch:safeText(observed?.targetBranch,60),headSha:safeSha(observed?.headSha),
  mergedSha:safeSha(observed?.mergedSha),ci:['passed','failed','pending','unknown'].includes(observed?.ci)?observed.ci:'unknown',
  codeOnProduction:observed?.codeOnProduction===true,
  servingSha:safeSha(observed?.servingSha),functionalAccepted:false,
  observedAt:new Date().toISOString(),reason:safeText(observed?.reason,72),
  nextAction:safeText(observed?.nextAction,72)};
 const error=stage==='unknown'?(info.reason||'GITHUB_PROOF_UNCONFIRMED'):null;
 await db.query('UPDATE '+TABLE+' SET stage=$4,proof=$5::jsonb,last_error=$6,'+
  "last_checked_at=now(),next_check_at=now()+interval '15 minutes',"+
  'lease_until=NULL,updated_at=now() '+
  'WHERE task_id=$1 AND generation=$2 AND pr_number=$3',
  [claim.task_id,claim.generation,claim.pr_number,stage,JSON.stringify(info),error]);
 const prior=old.proof||{};
 if(stage!==old.stage||prior.headSha!==info.headSha||prior.ci!==info.ci||
    prior.codeOnProduction!==info.codeOnProduction||Number(old.pr_number)!==claim.pr_number){
  await db.query('INSERT INTO '+EVENTS+
    '(task_id,pr_number,event_type,stage,proof) VALUES($1,$2,$3,$4,$5::jsonb)',
    [claim.task_id,claim.pr_number,'status_changed',stage,JSON.stringify({
      headSha:info.headSha,ci:info.ci,codeOnProduction:info.codeOnProduction,reason:info.reason})]);
 }
 return {status:'observed',taskId:claim.task_id,prNumber:claim.pr_number,stage,checkedAt:info.observedAt};
}

/** Bound per tick: at most two watched PRs, no new runners or paid model calls. */
export async function checkCommandPrWatches({config,transaction,fetcher=fetch,
 env=process.env,taskId=null,limit=PR_WATCH_PER_TICK}={}){
 const claims=await transaction(config,null,db=>claimCommandPrWatches(db,{taskId,limit}),{server:true});
 if(!claims.length)return {status:'no_due_or_busy',checked:0,results:[]};
 const results=await Promise.all(claims.map(async claim=>{
  let proof=null;
  try{
   const result=await inspectCommandTaskDelivery(REPO_PR+claim.pr_number,{
    fetcher,env,includeFiles:false,allowControlBranch:true});
   proof=result?.proof||null;
  }catch{/* Failure recorded unknown, never manufactured green. */}
  try{return await transaction(config,null,db=>settleCommandPrWatch(db,claim,proof),{server:true});}
  catch{return {status:'unconfirmed',taskId:claim.task_id};}
 }));
 return {status:results.every(x=>x.status==='observed')?'observed':'partial_unconfirmed',
  checked:results.filter(x=>x.status==='observed').length,results};
}
