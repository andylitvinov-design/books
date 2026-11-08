/** Database-only Cron Skills worker. Reuses CC's existing ten-minute protected tick.
 * No shell, URLs, code writes, LLM calls, GitHub polling or new Vercel cron.
 */
import {getCronSkill,nextCronSkillDue,validateCronJob} from './cron-skills.mjs';
const JOBS='app_private.cc_skill_jobs';
const RUNS='app_private.cc_skill_runs';
const EVENTS='app_private.cc_skill_events';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export async function readCronJobs(db){
 const jobs=await db.query(`SELECT id,skill_id,project_key,schedule,enabled,next_due_at,last_finished_at,last_state,
  last_error,generation,title,instruction,skill_ids,brain_scope,agent_role,execution_mode,revision FROM ${JOBS} ORDER BY skill_id LIMIT 40`);
 const runs=await db.query(`SELECT r.id,r.job_id,r.skill_id,r.state,r.receipt,r.error_code,r.started_at,r.finished_at
  FROM ${RUNS} r ORDER BY r.started_at DESC LIMIT 25`);
 return {jobs:jobs.rows,runs:runs.rows,observedAt:new Date().toISOString()};
}
async function once(db,requestId,skillId,action){
 if(!uuid(requestId))return false;
 const r=await db.query(`INSERT INTO ${EVENTS}(request_id,skill_id,action)
 VALUES($1,$2,$3) ON CONFLICT(request_id) DO NOTHING RETURNING request_id`,[requestId,skillId,action]);
 return r.rows.length===1;
}
export async function saveCronJob(db,values,requestId){
 const input=validateCronJob(values);
 if(!input||!uuid(requestId))return {status:'invalid'};
 const count=await db.query(`SELECT count(*)::int AS n FROM ${JOBS}`);
 if(Number(count.rows[0]?.n)>=15){
  const existing=await db.query(`SELECT id FROM ${JOBS} WHERE skill_id=$1 AND project_key=$2`,
   [input.skillId,input.projectKey]);
  if(!existing.rows.length)return {status:'limit'};
 }
 if(!await once(db,requestId,input.skillId,'configure'))return {status:'already_recorded'};
 const next=nextCronSkillDue(input.schedule);
 const r=await db.query(`INSERT INTO ${JOBS}(skill_id,project_key,schedule,enabled,next_due_at)
 VALUES($1,$2,$3,$4,$5) ON CONFLICT(skill_id,project_key)
 DO UPDATE SET schedule=EXCLUDED.schedule,enabled=EXCLUDED.enabled,
 next_due_at=EXCLUDED.next_due_at,updated_at=now()
 RETURNING id,skill_id,schedule,enabled,next_due_at`,
 [input.skillId,input.projectKey,input.schedule,input.enabled,next]);
 return {status:'configured',job:r.rows[0]};
}
export async function controlCronJob(db,{jobId,action,requestId}){
 if(!uuid(jobId)||!uuid(requestId)||!['pause','resume','queue_now'].includes(action))
  return {status:'invalid'};
 const result=await db.query(`SELECT id,skill_id,schedule,enabled,lease_until FROM ${JOBS}
 WHERE id=$1 FOR UPDATE`,[jobId]);
 const job=result.rows[0];
 if(!job)return {status:'not_found'};
 if(!getCronSkill(job.skill_id)?.runnable)return {status:'runtime_unavailable'};
 if(job.lease_until&&new Date(job.lease_until).getTime()>Date.now())return {status:'running'};
 if(action==='queue_now'&&!job.enabled)return {status:'paused'};
 if(!await once(db,requestId,job.skill_id,action))return {status:'already_recorded'};
 const enabled=action==='pause'?false:true;
 const next=action==='queue_now'?new Date().toISOString():nextCronSkillDue(job.schedule);
 const r=await db.query(`UPDATE ${JOBS} SET enabled=$2,next_due_at=$3,updated_at=now()
 WHERE id=$1 RETURNING id,skill_id,schedule,enabled,next_due_at`,[jobId,enabled,next]);
 return {status:action==='queue_now'?'queued':'configured',job:r.rows[0]};
}
export async function claimDueCronJob(db){
 const gate=await db.query("SELECT enabled,max_runs_per_day FROM app_private.cc_settings WHERE scope='owner' FOR UPDATE");
 if(!gate.rows[0]?.enabled)return {status:'paused'};
 // A crashed read-only run is not silently retried. Owner can inspect it and resume.
 const expired=await db.query(`UPDATE ${RUNS} SET state='unconfirmed',error_code='LEASE_EXPIRED',
 finished_at=now() WHERE state='running' AND lease_until<now()
 RETURNING job_id,id`);
 for(const run of expired.rows){
  await db.query(`UPDATE ${JOBS} SET enabled=false,lease_until=NULL,active_run_id=NULL,
   last_state='unconfirmed',last_error='LEASE_EXPIRED',updated_at=now()
   WHERE id=$1 AND active_run_id=$2`,[run.job_id,run.id]);
 }
 const used=await db.query(`SELECT
 (SELECT count(*) FROM app_private.cc_runs WHERE started_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
 +(SELECT count(*) FROM ${RUNS} WHERE started_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS n`);
 if(Number(used.rows[0]?.n||0)>=Number(gate.rows[0].max_runs_per_day))
  return {status:'budget_paused'};
 const selected=await db.query(`SELECT id,skill_id,schedule,generation FROM ${JOBS}
 WHERE enabled=true AND next_due_at<=now() AND lease_until IS NULL
 ORDER BY next_due_at,id FOR UPDATE SKIP LOCKED LIMIT 1`);
 const job=selected.rows[0];
 if(!job)return {status:'no_due'};
 if(!getCronSkill(job.skill_id)?.runnable)return {status:'runtime_unavailable'};
 const gen=Number(job.generation)+1;
 const r=await db.query(`INSERT INTO ${RUNS}(job_id,skill_id,generation,lease_until)
 VALUES($1,$2,$3,now()+interval '2 minutes') RETURNING id`,[job.id,job.skill_id,gen]);
 await db.query(`UPDATE ${JOBS} SET generation=$2,active_run_id=$3,
 lease_until=now()+interval '2 minutes',updated_at=now() WHERE id=$1`,[job.id,gen,r.rows[0].id]);
 return {status:'claimed',jobId:job.id,skillId:job.skill_id,
  schedule:job.schedule,runId:r.rows[0].id,generation:gen};
}
export async function collectCronSkillEvidence(db,skillId){
 // Only bounded aggregate metrics, no client data, message text or remote calls.
 let sql;
 switch(skillId){
 case 'task.stall-watchdog':
  sql=`SELECT count(*) FILTER(WHERE state='running' AND updated_at<now()-interval '30 minutes')::int AS stalled,
   count(*) FILTER(WHERE state LIKE 'blocked_%' OR state='dead_letter')::int AS blocked,
   count(*) FILTER(WHERE state='ready')::int AS ready
   FROM app_private.cc_tasks`;break;
 case 'agents.health-lease':
  sql=`SELECT count(*) FILTER(WHERE state='running')::int AS active,
   count(*) FILTER(WHERE state='running' AND lease_until<now())::int AS expired,
   count(*) FILTER(WHERE state='unconfirmed')::int AS unconfirmed FROM app_private.cc_runs`;break;
 case 'cost.budget-guard':
  sql=`SELECT (SELECT max_runs_per_day FROM app_private.cc_settings WHERE scope='owner')::int AS daily_limit,
   (SELECT count(*)::int FROM app_private.cc_runs
    WHERE started_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS task_runs_today,
   (SELECT count(*)::int FROM app_private.cc_skill_runs
    WHERE started_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS skill_runs_today`;break;
 case 'report.morning-brief':
  sql=`SELECT count(*)::int AS total,
   count(*) FILTER(WHERE state IN('ready','running'))::int AS active,
   count(*) FILTER(WHERE state LIKE 'blocked_%' OR state='dead_letter')::int AS blocked,
   count(*) FILTER(WHERE state='completed_verified')::int AS verified_metadata
   FROM app_private.cc_tasks`;break;
 default:return {ok:false,errorCode:'NO_APPROVED_RUNTIME'};
 }
 const result=await db.query(sql);
 return {ok:true,receipt:{metricVersion:'cc-cron-skills-v1',skillId,
  observedAt:new Date().toISOString(),scope:'command_center_db_aggregates',
  liveVerified:false,values:result.rows[0]||{}}};
}
export async function settleCronJob(db,claim,outcome){
 if(claim?.status!=='claimed')return {status:'not_claimed'};
 const ok=outcome?.ok===true;
 const receipt=ok?outcome.receipt:null,error=ok?null:outcome?.errorCode||'UNCONFIRMED';
 const updated=await db.query(`UPDATE ${RUNS} SET state=$3,receipt=$4::jsonb,error_code=$5,
  lease_until=NULL,finished_at=now() WHERE id=$1 AND job_id=$2 AND state='running'
  RETURNING id`,[claim.runId,claim.jobId,ok?'succeeded':'failed',receipt?JSON.stringify(receipt):null,error]);
 if(!updated.rows.length)return {status:'unconfirmed'};
 await db.query(`UPDATE ${JOBS} SET active_run_id=NULL,lease_until=NULL,
 last_finished_at=now(),last_state=$3,last_error=$4,
 next_due_at=$5,updated_at=now() WHERE id=$1 AND active_run_id=$2`,
 [claim.jobId,claim.runId,ok?'succeeded':'failed',error,nextCronSkillDue(claim.schedule)]);
 return {status:ok?'completed_verified':'failed',jobId:claim.jobId,
  runId:claim.runId,skillId:claim.skillId,live:false};
}
export async function runOneDueCronJob({config,transaction}){
 const claim=await transaction(config,null,db=>claimDueCronJob(db),{server:true});
 if(claim.status!=='claimed')return claim;
 let evidence;
 try{evidence=await transaction(config,null,db=>collectCronSkillEvidence(db,claim.skillId),{server:true});}
 catch{evidence={ok:false,errorCode:'DB_READ_FAILED'};}
 return transaction(config,null,db=>settleCronJob(db,claim,evidence),{server:true});
}
