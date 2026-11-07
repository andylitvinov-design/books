/** All DB access occurs in the existing owner-authenticated Command Center transaction. */
import {proposePlans} from './plans.mjs';
const P='app_private.cc_pm_';

export async function readProjectManagement(db){
 const [projects,epics,options,tasks,prs,events]=await Promise.all([
  db.query('SELECT id,title,summary,state FROM app_private.cc_projects ORDER BY created_at DESC LIMIT 50'),
  db.query(`SELECT id,project_id,title,problem,outcome,priority,state,selected_option_id,revision,created_at,updated_at FROM ${P}epics ORDER BY priority,created_at DESC LIMIT 100`),
  db.query(`SELECT id,epic_id,key,title,approach,benefit,risk,steps,state FROM ${P}options ORDER BY created_at LIMIT 300`),
  db.query(`SELECT l.epic_id,l.option_id,l.step_position,l.acceptance,t.id,t.title,t.description,t.kind,t.state,t.priority,t.milestone_id,t.source_ref,t.updated_at,
      EXISTS(SELECT 1 FROM app_private.cc_evidence e
        WHERE e.task_id=t.id AND e.verifier='github_api') AS has_evidence
    FROM ${P}task_links l JOIN app_private.cc_tasks t ON t.id=l.task_id
    ORDER BY l.epic_id,l.step_position LIMIT 700`),
  db.query(`SELECT p.task_id,p.pr_number,p.linked_at FROM ${P}pr_links p ORDER BY linked_at DESC LIMIT 500`),
  db.query(`SELECT epic_id,event_type,created_at FROM ${P}events ORDER BY created_at DESC LIMIT 50`)
 ]);
 return {schema:'hh-project-management-v1',observedAt:new Date().toISOString(),source:'private_command_center_db',
  projects:projects.rows,epics:epics.rows,options:options.rows,tasks:tasks.rows,prLinks:prs.rows,
  events:events.rows,coverage:{complete:epics.rows.length<100&&tasks.rows.length<700&&prs.rows.length<500}};
}
async function idempotent(db,requestId,fn){
 // Serialize same request id inside transaction, including double-click races.
 await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[requestId,'hh-project-management-v1']);
 const old=await db.query(`SELECT result FROM ${P}events WHERE request_id=$1`,[requestId]);
 if(old.rows[0])return old.rows[0].result;
 return fn();
}
async function log(db,{requestId,epicId,eventType,result}){
 await db.query(`INSERT INTO ${P}events(request_id,epic_id,event_type,result) VALUES($1,$2,$3,$4::jsonb)`,
  [requestId,epicId,eventType,JSON.stringify(result)]);
 return result;
}
export async function createEpic(db,values,requestId){
 return idempotent(db,requestId,async()=>{
  const project=await db.query('SELECT id FROM app_private.cc_projects WHERE id=$1',[values.projectId]);
  if(!project.rows[0])return {error:'PROJECT_NOT_FOUND'};
  const r=await db.query(`INSERT INTO ${P}epics(project_id,title,problem,outcome,priority) VALUES($1,$2,$3,$4,$5) RETURNING id`,
   [values.projectId,values.title,values.problem,values.outcome,values.priority]);
  return log(db,{requestId,epicId:r.rows[0].id,eventType:'epic_created',result:{status:'created',epicId:r.rows[0].id}});
 });
}
export async function proposeEpicOptions(db,epicId,requestId){
 return idempotent(db,requestId,async()=>{
  const r=await db.query(`SELECT id,title,problem,outcome,state,selected_option_id FROM ${P}epics WHERE id=$1 FOR UPDATE`,[epicId]);
  const epic=r.rows[0];if(!epic)return {error:'EPIC_NOT_FOUND'};
  if(epic.selected_option_id)return {error:'PLAN_ALREADY_SELECTED'};
  const plans=proposePlans(epic);
  for(const plan of plans){
   await db.query(`INSERT INTO ${P}options(epic_id,key,title,approach,benefit,risk,steps) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(epic_id,key) DO NOTHING`,
    [epicId,plan.key,plan.title,plan.approach,plan.benefit,plan.risk,JSON.stringify(plan.steps)]);
  }
  const options=await db.query(`SELECT id,key,title FROM ${P}options WHERE epic_id=$1 ORDER BY key`,[epicId]);
  return log(db,{requestId,epicId,eventType:'plans_proposed',result:{status:'proposed',options:options.rows,engine:'deterministic_free'}});
 });
}
export async function selectEpicOption(db,epicId,optionId,requestId){
 return idempotent(db,requestId,async()=>{
  const er=await db.query(`SELECT id,project_id,priority,selected_option_id FROM ${P}epics WHERE id=$1 FOR UPDATE`,[epicId]);
  const epic=er.rows[0];if(!epic)return {error:'EPIC_NOT_FOUND'};
  if(epic.selected_option_id)return epic.selected_option_id===optionId?{status:'already_selected',epicId,optionId}:{error:'PLAN_ALREADY_SELECTED'};
  const or=await db.query(`SELECT id,steps FROM ${P}options WHERE epic_id=$1 AND id=$2 AND state='proposed'`,[epicId,optionId]);
  const option=or.rows[0];if(!option)return {error:'OPTION_NOT_FOUND'};
  if(!Array.isArray(option.steps)||option.steps.length<1||option.steps.length>8)return {error:'INVALID_STEPS'};
  if(option.steps.some(step=>!step||!['code_change','product_spec','research','release_verify'].includes(step.kind)||
    typeof step.title!=='string'||step.title.length<6||step.title.length>140||
    typeof step.description!=='string'||step.description.length<10||step.description.length>800))
    return {error:'INVALID_STEPS'};
  // Reuse the existing Command Center milestones and task FK, no parallel graph.
  const stages=[];
  for(const [label,acceptance] of [
    ['Этап 1 · Подготовка','Scope, ограничения и подготовка подтверждены'],
    ['Этап 2 · Реализация и выпуск','Продуктовые изменения и приёмка выполнены']]){
   const m=await db.query('INSERT INTO app_private.cc_milestones(project_id,title,acceptance_json) VALUES($1,$2,$3::jsonb) RETURNING id',
     [epic.project_id,label,JSON.stringify({description:acceptance,epicId})]);
   stages.push(m.rows[0].id);
  }
  const created=[];
  for(const [idx,step] of option.steps.entries()){
   const milestoneId=stages[idx<Math.ceil(option.steps.length/2)?0:1];
   // Planned, manual: NEVER dispatch source-writing worker on plan approval.
   const tr=await db.query(`INSERT INTO app_private.cc_tasks(project_id,milestone_id,kind,title,description,priority,auto_allowed,state)
     VALUES($1,$2,$3,$4,$5,$6,false,'planned') RETURNING id`,
     [epic.project_id,milestoneId,step.kind,step.title,step.description,Math.min(100,105-epic.priority*18)]);
   await db.query(`INSERT INTO ${P}task_links(task_id,epic_id,option_id,acceptance,step_position) VALUES($1,$2,$3,$4,$5)`,
    [tr.rows[0].id,epicId,optionId,step.description,idx]);
   if(created.length)await db.query('INSERT INTO app_private.cc_task_dependencies(task_id,blocked_by_task_id) VALUES($1,$2)',
     [tr.rows[0].id,created.at(-1).id]);
   created.push({id:tr.rows[0].id,title:step.title});
  }
  await db.query(`UPDATE ${P}options SET state='selected' WHERE id=$1`,[optionId]);
  await db.query(`UPDATE ${P}options SET state='rejected' WHERE epic_id=$1 AND id<>$2`,[epicId,optionId]);
  await db.query(`UPDATE ${P}epics SET selected_option_id=$2,state='planned',revision=revision+1,updated_at=now() WHERE id=$1`,[epicId,optionId]);
  return log(db,{requestId,epicId,eventType:'plan_selected',result:{status:'selected',epicId,optionId,tasks:created}});
 });
}
export async function linkTaskPR(db,taskId,pr,requestId){
 return idempotent(db,requestId,async()=>{
  const tr=await db.query(`SELECT t.id,l.epic_id FROM ${P}task_links l JOIN app_private.cc_tasks t ON t.id=l.task_id WHERE t.id=$1 FOR UPDATE OF t`,[taskId]);
  const task=tr.rows[0];if(!task)return {error:'TASK_NOT_FOUND'};
  const check=await db.query(`SELECT pr_number FROM ${P}pr_links WHERE task_id=$1`,[taskId]);
  if(check.rows.some(row=>row.pr_number===pr.number))return {status:'already_linked',taskId,prNumber:pr.number};
  await db.query(`INSERT INTO ${P}pr_links(task_id,pr_number) VALUES($1,$2)`,[taskId,pr.number]);
  // Reuse original Command Center trusted single-source readback for first PR.
  await db.query(`UPDATE app_private.cc_tasks SET source_ref=COALESCE(source_ref,$2),updated_at=now() WHERE id=$1`,[taskId,pr.url]);
  return log(db,{requestId,epicId:task.epic_id,eventType:'pr_linked',result:{status:'linked_unverified',taskId,prNumber:pr.number,source:pr.url}});
 });
}
export async function pmTaskSource(db,taskId){
 const r=await db.query(`SELECT t.source_ref FROM ${P}task_links l JOIN app_private.cc_tasks t ON t.id=l.task_id WHERE t.id=$1`,[taskId]);
 return r.rows[0]?.source_ref||null;
}
/** Existing cc_pm_events is the single private audit/idempotency ledger. */
export async function pmExecutionTask(db,taskId){
 const r=await db.query(`SELECT t.id,t.title,t.kind,t.state,t.source_ref,
  l.acceptance,l.epic_id,o.state AS option_state,
  (SELECT p.pr_number FROM app_private.cc_pm_pr_links p WHERE p.task_id=t.id
    ORDER BY p.linked_at DESC LIMIT 1) AS pr_number
 FROM app_private.cc_pm_task_links l
 JOIN app_private.cc_tasks t ON t.id=l.task_id
 JOIN app_private.cc_pm_options o ON o.id=l.option_id
 WHERE t.id=$1`,[taskId]);
 return r.rows[0]||null;
}
export async function pmExecutionHistory(db,taskId){
 const r=await db.query(`SELECT request_id,event_type,result,created_at
 FROM app_private.cc_pm_events WHERE event_type IN
 ('execution_launch','execution_cancelled')
 AND result->>'taskId'=$1 ORDER BY created_at DESC LIMIT 40`,[taskId]);
 return r.rows;
}
export async function reservePmExecution(db,{taskId,requestId,prNumber,headSha,fingerprint}){
 await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',
  [taskId,'hh-pm-execution-v3']);
 const old=await db.query('SELECT result FROM app_private.cc_pm_events WHERE request_id=$1',[requestId]);
 if(old.rows[0])return {...old.rows[0].result,replayed:true};
 const task=await pmExecutionTask(db,taskId);
 if(!task||task.kind!=='code_change'||task.option_state!=='selected'||
    task.pr_number!==prNumber)return {error:'TASK_OR_PR_CHANGED'};
 const history=await pmExecutionHistory(db,taskId);
 if(history.some(x=>x.event_type==='execution_cancelled'))
  return {error:'FUTURE_ATTEMPTS_CANCELLED'};
 if(history.some(x=>x.event_type==='execution_launch'&&
   (x.result?.fingerprint===fingerprint||
    ['DISPATCH_PENDING','DISPATCH_UNCONFIRMED'].includes(x.result?.status)||
    (x.result?.status==='DISPATCH_ACCEPTED'&&x.result?.headSha===headSha))))
  return {error:'EXECUTION_ALREADY_RESERVED_OR_ATTEMPTED'};
 if(history.filter(x=>x.event_type==='execution_launch').length>=3)
  return {error:'RETRY_LIMIT_REACHED'};
 const result={status:'DISPATCH_PENDING',taskId,prNumber,headSha,fingerprint,
  requestId,requestedAt:new Date().toISOString()};
 await db.query(`INSERT INTO app_private.cc_pm_events
  (request_id,epic_id,event_type,result) VALUES($1,$2,'execution_launch',$3::jsonb)`,
  [requestId,task.epic_id,JSON.stringify(result)]);
 return result;
}
export async function settlePmExecution(db,requestId,status,detail){
 const r=await db.query(`UPDATE app_private.cc_pm_events SET result=
 jsonb_set(jsonb_set(result,'{status}',to_jsonb($2::text)),
 '{dispatch}', $3::jsonb)
 WHERE request_id=$1 AND event_type='execution_launch'
 AND result->>'status'='DISPATCH_PENDING'
 RETURNING result`,[requestId,status,JSON.stringify(detail)]);
 return r.rows[0]?.result||null;
}
export async function cancelPmFutureAttempts(db,taskId,requestId){
 return idempotent(db,requestId,async()=>{
  const task=await pmExecutionTask(db,taskId);
  if(!task)return {error:'TASK_NOT_FOUND'};
  const result={status:'CANCELLED',taskId,at:new Date().toISOString(),
   note:'No running GitHub workflow or mandatory CI was cancelled'};
  return log(db,{requestId,epicId:task.epic_id,eventType:'execution_cancelled',result});
 });
}
