import {readCommandPrWatches} from './pr-watch.mjs';
/** DB layer for private command-center tables. Call only through existing server-scoped transaction(). */
import {CC_POLICY,buildExecutiveBrief,canTransition,parseGithubSource,ccUuid} from './contracts.mjs';
const SETTINGS='app_private.cc_settings';
const TASKS='app_private.cc_tasks';
const RUNS='app_private.cc_runs';
const EVENTS='app_private.cc_events';
const EVIDENCE='app_private.cc_evidence';
const MAX_ATTEMPTS=2;

export async function readCommandSnapshot(db,{limit=100}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('CC_INVALID_LIMIT');
  const [settings,objectives,initiatives,projects,milestones,tasks,runs,evidence,events,slots,report,counts]=await Promise.all([
    db.query(`SELECT scope,enabled,max_runs_per_day,updated_at FROM ${SETTINGS} WHERE scope='owner'`),
    db.query('SELECT id,title,summary,state,created_at FROM app_private.cc_objectives ORDER BY created_at DESC LIMIT 40'),
    db.query('SELECT id,objective_id,title,state,created_at FROM app_private.cc_initiatives ORDER BY created_at DESC LIMIT 40'),
    db.query('SELECT id,objective_id,initiative_id,title,summary,state,created_at FROM app_private.cc_projects ORDER BY created_at DESC LIMIT 50'),
    db.query('SELECT id,project_id,title,state,due_at FROM app_private.cc_milestones ORDER BY created_at DESC LIMIT 60'),
    db.query(`SELECT id,project_id,milestone_id,kind,title,description,source_ref,priority,auto_allowed,state,attempt_count,created_at,updated_at,
      EXISTS(SELECT 1 FROM ${EVIDENCE} e WHERE e.task_id=t.id AND e.verifier='github_api') AS has_evidence
      FROM ${TASKS} t ORDER BY CASE WHEN state IN('ready','running','retry_wait') THEN 0 ELSE 1 END,
      priority DESC,created_at DESC LIMIT $1`,[limit]),
    db.query(`SELECT id,task_id,worker_id,state,generation,error_code,started_at,finished_at,receipt
      FROM ${RUNS} ORDER BY started_at DESC LIMIT 30`),
    db.query(`SELECT task_id,run_id,evidence_kind,verifier,source_url,observed,created_at FROM ${EVIDENCE}
      ORDER BY created_at DESC LIMIT 30`),
    db.query(`SELECT event_type,actor,task_id,created_at FROM ${EVENTS} ORDER BY created_at DESC LIMIT 25`),
    db.query('SELECT slot_utc,state,last_error,finished_at FROM app_private.cc_scheduler_slots ORDER BY slot_utc DESC LIMIT 12'),
    db.query("SELECT to_char(date_utc,'YYYY-MM-DD') AS date_utc,payload,observed_at FROM app_private.cc_reports ORDER BY date_utc DESC LIMIT 1"),
    db.query(`SELECT count(*)::int AS total, count(*) FILTER(WHERE state='running')::int AS active, count(*) FILTER(WHERE t.state='completed_live' OR
        (t.state='completed_verified' AND EXISTS(SELECT 1 FROM ${EVIDENCE} e
          WHERE e.task_id=t.id AND e.verifier='github_api')))::int AS verified,
      count(*) FILTER(WHERE t.state='completed_verified' AND NOT EXISTS(
        SELECT 1 FROM ${EVIDENCE} e WHERE e.task_id=t.id AND e.verifier='github_api'))::int AS missing_proof,
      count(*) FILTER(WHERE t.state LIKE 'blocked_%' OR t.state='dead_letter')::int AS blocked
      FROM app_private.cc_tasks t`)
  ]);
  const observedAt=new Date().toISOString(),allTasks=tasks.rows;
  const brief=buildExecutiveBrief({tasks:allTasks,runs:runs.rows,events:events.rows,observedAt});
  if(counts.rows[0]){Object.assign(brief,{total:counts.rows[0].total,active:counts.rows[0].active,
    verified:counts.rows[0].verified,missingProof:counts.rows[0].missing_proof,blocked:counts.rows[0].blocked});}
  // A pending additive migration must not hide the existing task dashboard.
  const prWatch=await readCommandPrWatches(db).catch(()=>({items:[],history:[],available:false}));
  return {status:'database_available',observedAt,settings:settings.rows[0]||null,prWatch,
    objectives:objectives.rows,initiatives:initiatives.rows,projects:projects.rows,
    milestones:milestones.rows,tasks:allTasks,runs:runs.rows,evidence:evidence.rows,
    events:events.rows,slots:slots.rows,dailyReport:report.rows[0]||null,
    brief,partial:allTasks.length<brief.total};
}
async function audit(db,{actor,eventType,taskId=null,runId=null,requestId=null,payload={}}){
  await db.query(`INSERT INTO ${EVENTS}(actor,event_type,task_id,run_id,request_id,payload)
    VALUES($1,$2,$3,$4,$5,$6::jsonb)`,[actor,eventType,taskId,runId,requestId,JSON.stringify(payload)]);
}
export async function createObjective(db,values,requestId){
  const r=await db.query('INSERT INTO app_private.cc_objectives(title,summary) VALUES($1,$2) RETURNING id,title,summary,state',
    [values.title,values.summary]);
  await audit(db,{actor:'owner',eventType:'objective_created',requestId,payload:{objectiveId:r.rows[0].id}});
  return {status:'created',objective:r.rows[0]};
}
export async function createProject(db,values,requestId){
  const r=await db.query('INSERT INTO app_private.cc_projects(objective_id,title,summary) VALUES($1,$2,$3) RETURNING id,title,summary,state',
    [values.objectiveId,values.title,values.summary]);
  await audit(db,{actor:'owner',eventType:'project_created',requestId,payload:{projectId:r.rows[0].id}});
  return {status:'created',project:r.rows[0]};
}
export async function createTask(db,values,requestId){
  const automated=values.autoAllowed&&parseGithubSource(values.sourceRef)?.kind===values.kind;
  const dedupe=automated?`${values.kind}:${values.sourceRef}`:null;
  const state=automated?'ready':values.kind==='code_change'?'blocked_no_runner':'needs_spec';
  const r=await db.query(`INSERT INTO ${TASKS}
    (project_id,kind,title,description,source_ref,priority,auto_allowed,dedupe_key,state)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT(dedupe_key) DO NOTHING RETURNING id,title,state,kind`,
    [values.projectId,values.kind,values.title,values.description,values.sourceRef,
      values.priority,automated,dedupe,state]);
  if(!r.rows.length){
    const old=await db.query(`SELECT id,title,state,kind FROM ${TASKS} WHERE dedupe_key=$1`,[dedupe]);
    return {status:'already_exists',task:old.rows[0]||null};
  }
  await audit(db,{actor:'owner',eventType:'task_created',taskId:r.rows[0].id,requestId,
    payload:{kind:values.kind,autoAllowed:automated,policy:CC_POLICY}});
  return {status:'created',task:r.rows[0]};
}
export async function readCommandTaskForDelivery(db,taskId){
  const res=await db.query('SELECT id,kind,source_ref FROM app_private.cc_tasks WHERE id=$1 LIMIT 1',[taskId]);
  return res.rows[0]||null;
}
export async function setCommandEnabled(db,enabled,requestId){
  const r=await db.query(`UPDATE ${SETTINGS} SET enabled=$1,updated_at=now() WHERE scope='owner'
    RETURNING enabled,max_runs_per_day,updated_at`,[enabled]);
  if(!r.rows.length)throw Error('CC_SETTINGS_UNAVAILABLE');
  await audit(db,{actor:'owner',eventType:'settings_changed',requestId,payload:{enabled}});
  return {status:enabled?'enabled':'paused',settings:r.rows[0]};
}
export async function changeTaskState(db,{taskId,to,requestId}){
  const r=await db.query(`SELECT id,kind,state,auto_allowed,attempt_count FROM ${TASKS} WHERE id=$1 FOR UPDATE`,[taskId]);
  if(!r.rows.length)return {status:'not_found'};
  const task=r.rows[0];
  if(!canTransition(task.state,to)||
    (to==='ready'&&(!task.auto_allowed||task.attempt_count>=MAX_ATTEMPTS)))
    return {status:'transition_denied'};
  // No external-run cancellation or duplicate side effect: running cannot be paused by this endpoint.
  const changed=await db.query(`UPDATE ${TASKS} SET state=$2,updated_at=now() WHERE id=$1 RETURNING id,state`,[taskId,to]);
  await audit(db,{actor:'owner',eventType:'task_changed',taskId,requestId,payload:{from:task.state,to}});
  return {status:'changed',task:changed.rows[0]};
}
export async function claimSchedulerSlot(db,slotUtc){
  const gate=await db.query(`SELECT enabled FROM ${SETTINGS} WHERE scope='owner' FOR UPDATE`);
  if(gate.rows[0]?.enabled!==true)return {claimed:false,status:'paused'};
  const r=await db.query(`INSERT INTO app_private.cc_scheduler_slots(slot_utc)
    VALUES($1::timestamptz) ON CONFLICT DO NOTHING RETURNING slot_utc`,[slotUtc]);
  return r.rows.length?{claimed:true,slotUtc}:{claimed:false,status:'already_claimed',slotUtc};
}
export async function settleSchedulerSlot(db,slotUtc,state,error=null){
  await db.query(`UPDATE app_private.cc_scheduler_slots SET state=$2,last_error=$3,finished_at=now()
    WHERE slot_utc=$1 AND state='running'`,[slotUtc,state,error]);
}
export async function recoverExpiredCommandRuns(db){
  const r=await db.query(`UPDATE ${RUNS} SET state='unconfirmed',error_code='LEASE_EXPIRED',
    lease_until=NULL,finished_at=now() WHERE state='running' AND lease_until<now()
    RETURNING id,task_id,generation`);
  for(const run of r.rows){
    await db.query(`UPDATE ${TASKS} SET state=CASE WHEN attempt_count<$3 THEN 'retry_wait' ELSE 'dead_letter' END,
      next_attempt_at=now()+interval '20 minutes',updated_at=now()
      WHERE id=$1 AND current_run_id=$2 AND generation=$4 AND state='running'`,
      [run.task_id,run.id,MAX_ATTEMPTS,run.generation]);
    await audit(db,{actor:'system',eventType:'run_expired',taskId:run.task_id,runId:run.id,
      payload:{reason:'LEASE_EXPIRED',retrySafe:'read_only'}});
  }
  return r.rows.length;
}
export async function claimNextCommandTask(db,{taskId=null}={}){
  if(taskId!==null&&!ccUuid(taskId))return {status:'invalid_task_id'};
  const gate=await db.query(`SELECT enabled,max_runs_per_day FROM ${SETTINGS}
    WHERE scope='owner' FOR UPDATE`);
  const config=gate.rows[0];
  if(!config?.enabled)return {status:'paused'};
  const count=await db.query(`SELECT count(*)::int AS n FROM ${RUNS} WHERE started_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`);
  const remaining=config.max_runs_per_day-(count.rows[0]?.n||0);
  if(remaining<=0)return {status:'budget_paused'};
  const ready=await db.query(`SELECT t.id,t.kind,t.source_ref,t.auto_allowed,t.attempt_count,t.generation,t.state
    FROM ${TASKS} t
    WHERE t.state IN ('ready','retry_wait') AND t.auto_allowed=true
      AND t.kind IN ('repo_pr_audit','repo_issue_audit')
      AND t.attempt_count<$1 AND t.next_attempt_at<=now()
      AND ($2::uuid IS NULL OR t.id=$2::uuid)
      AND NOT EXISTS(SELECT 1 FROM app_private.cc_task_dependencies d
        JOIN ${TASKS} blocked ON blocked.id=d.blocked_by_task_id
        WHERE d.task_id=t.id AND blocked.state NOT IN ('completed_verified','completed_live'))
    ORDER BY t.priority DESC,t.created_at
    LIMIT 1 FOR UPDATE OF t SKIP LOCKED`,[MAX_ATTEMPTS,taskId]);
  const t=ready.rows[0];
  if(!t)return {status:taskId?'no_eligible_task':'no_ready_work'};
  const s=parseGithubSource(t.source_ref);
  if(!s||s.kind!==t.kind)return {status:'invalid_source'}; // untrusted DB data never becomes arbitrary fetch.
  const gen=Number(t.generation)+1;
  const run=await db.query(`INSERT INTO ${RUNS}(task_id,generation,worker_id,lease_until)
    VALUES($1,$2,'github-public-reader',now()+interval '90 seconds') RETURNING id,lease_until`,[t.id,gen]);
  await db.query(`UPDATE ${TASKS} SET state='running',attempt_count=attempt_count+1,generation=$2,
    current_run_id=$3,updated_at=now() WHERE id=$1`,[t.id,gen,run.rows[0].id]);
  await audit(db,{actor:'dispatcher',eventType:'run_claim',taskId:t.id,runId:run.rows[0].id,
    payload:{generation:gen,worker:'github-public-reader',policy:CC_POLICY}});
  return {status:'claimed',taskId:t.id,runId:run.rows[0].id,generation:gen,
    kind:t.kind,source:s,leaseUntil:run.rows[0].lease_until,remaining:remaining-1};
}
export async function settleCommandRun(db,claim,result){
  const run=await db.query(`SELECT id,task_id,generation FROM ${RUNS}
    WHERE id=$1 AND task_id=$2 AND generation=$3 AND state='running' AND lease_until>now()
    FOR UPDATE`,[claim.runId,claim.taskId,claim.generation]);
  if(!run.rows.length)return {status:'stale_unconfirmed'};
  const task=await db.query(`SELECT current_run_id,generation,state,attempt_count FROM ${TASKS}
    WHERE id=$1 FOR UPDATE`,[claim.taskId]);
  if(task.rows[0]?.current_run_id!==claim.runId||task.rows[0]?.generation!==claim.generation||task.rows[0]?.state!=='running')return {status:'stale_unconfirmed'};
  if(result.ok){
    const kind=claim.kind==='repo_pr_audit'?'github_pr_readback':'github_issue_readback';
    await db.query(`INSERT INTO ${EVIDENCE}(task_id,run_id,evidence_kind,verifier,source_url,observed)
      VALUES($1,$2,$3,'github_api',$4,$5::jsonb)`,
      [claim.taskId,claim.runId,kind,claim.source.url,JSON.stringify(result.observed)]);
    await db.query(`UPDATE ${TASKS} SET state='completed_verified',updated_at=now() WHERE id=$1`,[claim.taskId]);
    await db.query(`UPDATE ${RUNS} SET state='succeeded',lease_until=NULL,finished_at=now(),receipt=$2::jsonb WHERE id=$1`,
      [claim.runId,JSON.stringify({version:'hh-command-center-result-v1',kind,source:claim.source.url,verified:true,live:false})]);
  }else{
    const reason=['GITHUB_HTTP_ERROR','GITHUB_TIMEOUT','GITHUB_UNAVAILABLE','GITHUB_BAD_RESULT'].includes(result.errorCode)?result.errorCode:'WORKER_FAILED';
    const final=task.rows[0].attempt_count>=MAX_ATTEMPTS||reason==='GITHUB_BAD_RESULT';
    await db.query(`UPDATE ${TASKS} SET state=$2,next_attempt_at=now()+interval '20 minutes',updated_at=now()
      WHERE id=$1`,[claim.taskId,final?'dead_letter':'retry_wait']);
    await db.query(`UPDATE ${RUNS} SET state='failed',error_code=$2,lease_until=NULL,finished_at=now() WHERE id=$1`,
      [claim.runId,reason]);
  }
  await audit(db,{actor:'verifier',eventType:'run_settled',taskId:claim.taskId,runId:claim.runId,
    payload:{verified:result.ok===true,live:false,error:result.ok?null:result.errorCode}});
  return {status:result.ok?'completed_verified':'failed',runId:claim.runId,taskId:claim.taskId,live:false};
}
export async function storeDailyCommandReport(db){
  const today=new Date().toISOString().slice(0,10);
  const existing=await db.query('SELECT 1 FROM app_private.cc_reports WHERE date_utc=$1',[today]);
  if(existing.rows.length)return {status:'already_recorded'};
  const snapshot=await readCommandSnapshot(db,{limit:100});
  const data={...snapshot.brief,partial:snapshot.partial};
  await db.query(`INSERT INTO app_private.cc_reports(date_utc,payload) VALUES($1,$2::jsonb)
    ON CONFLICT(date_utc) DO NOTHING`,[today,JSON.stringify(data)]);
  return data;
}
