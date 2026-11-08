/** Holistic House Strategy-to-Execution OS: pure, dependency-free security contract. */
export const CC_POLICY='hh-command-center-v1';
export const CC_REPO='andylitvinov-design/books';
export const CC_AUTOMATABLE=Object.freeze(['repo_pr_audit','repo_issue_audit']);
export const CC_TASK_KINDS=Object.freeze([...CC_AUTOMATABLE,'code_change','release_verify','research','product_spec','analytics_review','human_decision']);
export const CC_TASK_STATES=Object.freeze([
  'inbox','needs_spec','planned','ready','running','retry_wait','awaiting_evidence',
  'completed_verified','completed_live','blocked_dependency','blocked_approval',
  'blocked_no_runner','blocked_budget','blocked_external','paused','dead_letter','canceled'
]);
export const CC_AGENT_REGISTRY=Object.freeze([
  {id:'github-public-reader',role:'ci_diagnostician',runtime:'builtin_readonly',status:'available_when_enabled',capabilities:['github.public.read','evidence.record'],maxConcurrency:1,expense:'bounded_existing_runtime'},
  {id:'codex-cli',role:'engineering_implementer',runtime:'codex_cli',status:'not_connected',capabilities:['patch.prepare','tests.run'],maxConcurrency:0,expense:'not_approved'},
  {id:'hermes',role:'researcher',runtime:'hermes',status:'not_connected',capabilities:[],maxConcurrency:0,expense:'not_approved'},
  {id:'openclaw',role:'engineering_implementer',runtime:'openclaw',status:'not_connected',capabilities:[],maxConcurrency:0,expense:'not_approved'},
  {id:'chatgpt',role:'manual_handoff',runtime:'interactive_only',status:'manual_only',capabilities:[],maxConcurrency:0,expense:'not_automatable'}
]);
export const CC_TRANSITIONS=Object.freeze({
  inbox:['needs_spec','planned','ready','canceled'],needs_spec:['planned','ready','canceled'],
  planned:['ready','blocked_approval','canceled'],ready:['running','paused','canceled'],
  running:['retry_wait','completed_verified','awaiting_evidence','blocked_external','dead_letter'],
  retry_wait:['running','paused','dead_letter','canceled'],
  awaiting_evidence:['completed_verified','blocked_external','dead_letter'],
  blocked_dependency:['ready','canceled'],blocked_approval:['ready','canceled'],
  blocked_no_runner:['ready','canceled'],blocked_budget:['ready','canceled'],
  blocked_external:['ready','dead_letter','canceled'],paused:['ready','canceled'],
  dead_letter:['ready','canceled'],completed_verified:[],completed_live:[],canceled:[]
});
const tidy=(value,max=160)=>typeof value==='string'?value.trim().slice(0,max):'';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function ccUuid(value){return typeof value==='string'&&UUID.test(value);}
export function parseGithubSource(value){
  if(typeof value!=='string'||value.length>180)return null;
  const match=/^https:\/\/github\.com\/andylitvinov-design\/books\/(pull|issues)\/([1-9]\d{0,7})$/.exec(value);
  return match?{kind:match[1]==='pull'?'repo_pr_audit':'repo_issue_audit',number:Number(match[2]),url:value}:null;
}
export function sanitizeObjective(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||!['title','summary'].every(k=>k in input))return null;
  const title=tidy(input.title,120),summary=tidy(input.summary,550);
  return title.length>=5&&summary.length>=8?{title,summary}:null;
}
export function sanitizeProject(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  const title=tidy(input.title,120),summary=tidy(input.summary,550);
  const objectiveId=input.objectiveId==null?null:input.objectiveId;
  if(title.length<4||summary.length<8||(objectiveId!==null&&!ccUuid(objectiveId)))return null;
  return {title,summary,objectiveId};
}
export function sanitizeTask(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  const title=tidy(input.title,140),description=tidy(input.description,2000),kind=input.kind;
  if(!CC_TASK_KINDS.includes(kind)||title.length<6||description.length<10)return null;
  if(input.projectId!=null&&!ccUuid(input.projectId))return null;
  const source=parseGithubSource(input.sourceRef);
  if(CC_AUTOMATABLE.includes(kind)&&(!source||source.kind!==kind))return null;
  if(!CC_AUTOMATABLE.includes(kind)&&input.sourceRef!=null&&source===null)return null;
  const priority=Number.isInteger(input.priority)&&input.priority>=0&&input.priority<=100?input.priority:50;
  return {title,description,kind,priority,projectId:input.projectId||null,
    sourceRef:source?.url||null,autoAllowed:CC_AUTOMATABLE.includes(kind)};
}
export function canTransition(from,to,{actor='owner',source='unknown'}={}){
  if(!CC_TRANSITIONS[from]?.includes(to))return false;
  if(to==='completed_live')return false; // Real production proof has a different owner and verifier.
  if(to==='completed_verified')return actor==='verifier'&&source==='github_api';
  if(to==='running')return actor==='dispatcher';
  return true;
}
export function admissibleWorker(task,{enabled=false,remaining=0}={}){
  if(!enabled)return {allowed:false,reason:'GLOBAL_PAUSED'};
  if(!task||!CC_AUTOMATABLE.includes(task.kind)||!task.auto_allowed)
    return {allowed:false,reason:'NO_APPROVED_RUNTIME'};
  const src=parseGithubSource(task.source_ref);
  if(!src||src.kind!==task.kind)return {allowed:false,reason:'SOURCE_NOT_ALLOWED'};
  if(!Number.isInteger(remaining)||remaining<1)return {allowed:false,reason:'BUDGET_EXHAUSTED'};
  return {allowed:true,agentId:'github-public-reader',source:src,capability:'github.public.read'};
}
export function priorityScore({severity=0,strategicAlignment=0,userImpact=0,unblocks=0,effort=0,risk=0,ageDays=0}={}){
  const bounded=x=>Math.max(0,Math.min(5,Number.isFinite(x)?x:0));
  const score=5*bounded(severity)+4*bounded(strategicAlignment)+3*bounded(userImpact)+
    2*bounded(unblocks)+Math.min(5,Math.max(0,Number(ageDays)||0)/7)-
    2*bounded(effort)-3*bounded(risk);
  return Math.max(0,Math.min(100,Math.round(score)));
}
export function buildExecutiveBrief({tasks=[],runs=[],events=[],observedAt=null}={}){
  const rows=Array.isArray(tasks)?tasks:[],attempts=Array.isArray(runs)?runs:[];
  const byState=Object.fromEntries([...new Set(rows.map(row=>row.state))].map(state=>
    [state,rows.filter(row=>row.state===state).length]));
  const verified=rows.filter(row=>row.state==='completed_live'||
    (row.state==='completed_verified'&&row.has_evidence===true)).length;
  const blockers=rows.filter(row=>row.state?.startsWith('blocked_')||row.state==='dead_letter');
  const focus=rows.filter(row=>['ready','running','retry_wait','blocked_approval','blocked_external','blocked_no_runner'].includes(row.state))
    .sort((a,b)=>(b.priority||0)-(a.priority||0)||String(a.created_at||'').localeCompare(String(b.created_at||''))).slice(0,3);
  return {observedAt,unknown:observedAt===null,total:rows.length,verified,attempts:attempts.length,
    active:rows.filter(row=>row.state==='running').length,blocked:blockers.length,
    byState,focus:focus.map(row=>({id:row.id,title:row.title,state:row.state,priority:row.priority})),
    note:'Only database receipts count; a PR or model message does not prove LIVE.'};
}
