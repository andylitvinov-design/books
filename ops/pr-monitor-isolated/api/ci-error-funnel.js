'use strict';
/* HH_PR_REPAIR_EVIDENCE_FUNNEL_V1 — public read-only, bounded evidence sample.
 * The owner-private CI inbox is NOT proxied or disclosed here. A dispatcher
 * request is not CLAIMED; a runner is not an AI response or verified commit.
 * Absence of a signed record means unknown, never a successful/failed zero.
 */
const {fetchArchive}=require('./ci-stage-weekly.js')._readOnly;
const HOST='https://api.github.com/repos/andylitvinov-design/books';
const REPO='https://github.com/andylitvinov-design/books';
const SHA=/^[a-f0-9]{40}$/i,HEX=/^[a-f0-9]{32}$/i;
const FAIL=new Set(['failure','timed_out','startup_failure','action_required']);
const STAGES=[
 ['failed','PR с ошибкой Core CI','Архив подтверждённого Core CI'],
 ['classified','Причина ошибки определена','Подписанная НЕ-UNKNOWN классификация по CI incident'],
 ['task','Задача создана','Сохранённая задача на точный HEAD'],
 ['assigned','AI Worker выбран','Выбран конкретный исполняемый GitHub Worker; owner_review не считается'],
 ['source_assigned','Repair Worker назначен','Кодовый Worker выбран для HEAD'],
 ['dispatched','Dispatch принят GitHub','GitHub принял запуск Workflow'],
 ['claimed','Worker получил задачу','GitHub Actions подписал CLAIMED'],
 ['runner','Worker действительно запущен','Подтверждён отдельный runner'],
 ['responded','Результат Worker получен','Подписанный outcome, даже если нет патча'],
 ['committed','Коммит получен GitHub','Новый commit SHA и родитель HEAD проверены']
];
const t=s=>{const n=Date.parse(s||'');return Number.isFinite(n)?n:null;};
const headers=()=>{const h={Accept:'application/vnd.github+json','User-Agent':'HH-PR-Funnel-ReadOnly','X-GitHub-Api-Version':'2022-11-28'};const token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN;if(token)h.Authorization='Bearer '+token;return h;};
async function github(path,timeout=6500){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
 try{const r=await fetch(HOST+path,{headers:headers(),signal:ctl.signal});
  const rawRemaining=r.headers.get('x-ratelimit-remaining');
  const remaining=rawRemaining===null?null:Number(rawRemaining);
  if(!r.ok||Number.isFinite(remaining)&&remaining<3)throw Error('GITHUB_READ_UNAVAILABLE_'+r.status);
  return await r.json();
 }finally{clearTimeout(timer);}
}
function selectCases(runs,hours,now=Date.now(),prFilter=null){
 const from=now-hours*3600000, candidates=new Map();
 for(const r of runs||[]){
  const ended=t(r.completed_at),sha=r.source_head;
  if(prFilter!==null&&r.pr!==prFilter)continue;
  if(!Number.isSafeInteger(r.pr)||r.pr<1||!Number.isSafeInteger(r.run_id)||r.run_id<1||
     !SHA.test(sha||'')||ended===null||ended<from||ended>now||
     !FAIL.has(r.conclusion)||!Array.isArray(r.jobs))continue;
  const knownFailure=r.jobs.some(j=>FAIL.has(j.conclusion)&&
    ['core-lint-types-build','hh-specialist','hh-merge-check'].includes(j.name));
  if(!knownFailure&&r.registration_only!==true)continue;
  const candidate={pr:r.pr,head:sha.toLowerCase(),run:r.run_id,at:r.completed_at,
    failure_url:REPO+'/actions/runs/'+r.run_id};
  const prior=candidates.get(r.pr);
  if(!prior||t(candidate.at)>t(prior.at))candidates.set(r.pr,candidate);
 }
 const rows=[...candidates.values()].sort((a,b)=>t(b.at)-t(a.at)||b.pr-a.pr);
 return {all:rows.length,rows:rows.slice(0,8)};
}
function trusted(c){
 return Number.isSafeInteger(c?.id)&&c.id>0&&
  c.user?.login==='github-actions[bot]'&&c.user.id===41898282&&
  c.user.type==='Bot'&&c.performed_via_github_app?.id===15368&&
  c.performed_via_github_app?.slug==='github-actions'&&
  c.created_at===c.updated_at&&t(c.created_at)!==null&&
  typeof c.body==='string'&&c.body.length<=65000;
}
function jsonRecords(c){
 const out=[];if(!trusted(c))return out;
 const re=/\x60\x60\x60json\s*\n([^\n]{1,45000})\n\x60\x60\x60/g;let m;
 while((m=re.exec(c.body))!==null&&out.length<5)try{
  const x=JSON.parse(m[1]);if(x&&typeof x==='object'&&typeof x.schema==='string')out.push(x);
 }catch(_){}
 return out;
}
function receipts(c){
 const found=[];if(!trusted(c))return found;
 const re=/<!-- HH_PR_STAGE_V1 (\{[^\r\n]{1,680}\}) -->/g;let m;
 while((m=re.exec(c.body))!==null)try{found.push(JSON.parse(m[1]));}catch(_){}
 return found;
}
function inspect(e,comments){
 const found=Object.fromEntries(STAGES.map(s=>[s[0],null]));
 found.failed={at:e.at,url:e.failure_url};
 const signed=(comments||[]).filter(trusted).map(c=>({
  c,rows:jsonRecords(c),states:receipts(c),
  url:REPO+'/pull/'+e.pr+'#issuecomment-'+c.id
 }));
 const errors=signed.flatMap(x=>x.rows.filter(v=>v.schema==='HH_CI_ERROR_TASK_V1'&&
  x.c.body.includes('<!-- HH_CI_ERROR_TASK_V1 '+v.task_id+' -->')&&
  HEX.test(v.task_id||'')&&v.pr_number===e.pr&&v.head_sha===e.head&&
  Number(v.run_id)===e.run&&v.event_kind==='CORE_CI_FAILED')
  .map(v=>({...x,record:v})));
 if(!errors.length)return found;
 const earliest=errors[0],taskIds=new Set(errors.map(x=>x.record.task_id));
 const mark=(key,x)=>{if(!x||found[key])return;const at=x.c.created_at;
  if(t(at)!==null&&t(at)>=t(e.at)-120000)found[key]={at,url:x.url};};
 if(errors.some(x=>typeof x.record.category==='string'&&
  x.record.category!=='UNKNOWN'&&x.record.reason_code!=='UNCLASSIFIED_FAILURE'&&
  typeof x.record.reason_code==='string'&&x.record.reason_code.length>0))
  mark('classified',earliest);
 mark('task',earliest);
 if(errors.some(x=>x.record.executor_kind==='github_actions'&&
  x.record.assignment_status==='SELECTED_NOT_DISPATCHED'&&
  typeof x.record.executor_id==='string'&&
  x.record.executor_id.startsWith('github-actions:')))
  mark('assigned',earliest);
 const reserve=signed.flatMap(x=>x.rows.filter(v=>v.schema==='HH_PR_TASK_V1'&&
  v.pr_number===e.pr&&v.head_sha===e.head&&taskIds.has(v.error_task_id)&&
  HEX.test(v.task_key||'')&&v.state==='RESERVED'&&
  v.assigned_executor_id==='github-actions:hh-pr-repair-worker.yml'&&
  v.assignment_status==='SELECTED_RESERVED_NOT_STARTED')
  .map(v=>({...x,record:v})))[0];
 if(reserve)mark('source_assigned',reserve);
 let task=reserve?.record.task_key||null;
 const dispatch=task&&signed.find(x=>x.rows.some(v=>v.schema==='HH_CI_ERROR_DISPATCH_V1'&&
   x.c.body.includes('<!-- HH_CI_ERROR_DISPATCH_V1 '+task+' -->')&&
   v.pr_number===e.pr&&v.head_sha===e.head&&v.task_key===task&&
   taskIds.has(v.error_task_id)&&v.state==='DISPATCH_ACCEPTED_NOT_STARTED'));
 if(dispatch)mark('dispatched',dispatch);
 // Signed CLAIMED is independent evidence: do not invent a missing earlier dispatch.
 const claim=signed.flatMap(x=>x.rows.filter(v=>v.schema==='HH_PR_TASK_V1'&&
  x.c.body.includes('<!-- HH_PR_REPAIR_WORKER_V1 '+e.head+' -->')&&
  v.state==='CLAIMED'&&v.worker_started===true&&
  v.pr_number===e.pr&&v.head_sha===e.head&&HEX.test(v.task_key||'')&&
  (!task||v.task_key===task)&&taskIds.has(v.error_task_id)&&
  v.assignment_status==='WORKER_CLAIMED'&&
  v.assigned_executor_id==='github-actions:hh-pr-repair-worker.yml'&&
  /^[1-9][0-9]{0,18}$/.test(String(v.owner_run_id||'')))
  .map(v=>({...x,record:v})))[0];
 if(!claim)return found;
 task=claim.record.task_key;
 mark('claimed',claim);
 const workerRun=String(claim.record.owner_run_id);
 const runner=signed.flatMap(x=>x.rows.filter(v=>v.schema==='HH_PR_TASK_V1'&&
  x.c.body.includes('<!-- HH_EXECUTION_RUNNER_V1 '+e.head+' -->')&&
  v.state==='RUNNER_STARTED'&&v.pr_number===e.pr&&v.head_sha===e.head&&
  v.task_key===task&&String(v.owner_run_id)===workerRun&&
  String(v.runner?.run_id)===workerRun&&
  Number.isSafeInteger(v.runner?.job_id)&&v.runner.job_id>0&&
  Number.isSafeInteger(v.runner?.runner_id)&&v.runner.runner_id>0&&t(v.runner.started_at)!==null)
  .map(v=>({...x,record:v})))[0];
 if(!runner)return found;
 mark('runner',runner);
 const outcome=signed.flatMap(x=>x.rows.filter(v=>v.schema==='HH_PR_TASK_V1'&&
  x.c.body.includes('<!-- HH_PR_REPAIR_OUTCOME_V1 '+e.head+' '+workerRun+' -->')&&
  v.pr_number===e.pr&&v.head_sha===e.head&&v.task_key===task&&
  String(v.owner_run_id)===workerRun&&
  ['PUBLISHED','MANUAL','FAILED','PREPARED','REJECTED','SUPERSEDED',
    'VERIFY_REQUIRED','NO_CLAIM_RETRYABLE'].includes(v.state))
  .map(v=>({...x,record:v})))[0];
 if(!outcome)return found;
 mark('responded',outcome);
 const o=outcome.record;
 const pub=signed.find(x=>x.states.some(s=>s.stage==='source_published'&&
  s.source==='verified_git_ref'&&s.pr_number===e.pr&&s.head_sha===e.head&&
  s.task_key===task&&String(s.run_id)===workerRun&&s.new_sha===o.new_sha));
 if(o.state==='PUBLISHED'&&o.source_published===true&&SHA.test(o.new_sha||'')&&
   o.new_sha.toLowerCase()!==e.head&&pub)found._publication={sha:o.new_sha.toLowerCase(),proof:pub};
 return found;
}
async function confirmPublication(e,found){
 if(!found._publication)return;
 const {sha,proof}=found._publication;delete found._publication;
 try{const commit=await github('/git/commits/'+sha,6500);
  if(commit.sha?.toLowerCase()===sha&&Array.isArray(commit.parents)&&
   commit.parents.some(p=>p.sha?.toLowerCase()===e.head))
    found.committed={at:proof.c.created_at,url:proof.url,sha};
 }catch(_){/* cannot count unverified SHA as GitHub commit */}
}
function aggregate(cases,checked,now,hours,all,store){
 const stages=STAGES.map(([key,label,description])=>{
  const proofs=checked.filter(x=>x.found?.[key]).map(x=>({
   pr:x.pr,url:x.found[key].url,sha:x.found[key].sha||null,
   minutes:Math.max(0,(t(x.found[key].at)-t(x.at))/60000)
  }));
  const values=proofs.map(x=>x.minutes).filter(n=>Number.isFinite(n)&&n>=0).sort((a,b)=>a-b);
  const median=values.length?Math.round((values[Math.floor((values.length-1)/2)]+values[Math.ceil((values.length-1)/2)])/2*10)/10:null;
  return {key,label,description,confirmed:proofs.length,median_minutes:median,
   examples:proofs.slice(0,3).map(({pr,url,sha})=>({pr,url,sha}))};
 });
 return {schema:'HH_PR_REPAIR_EVIDENCE_FUNNEL_V1',generated_at:new Date(now).toISOString(),
  period_hours:hours,basis:'GITHUB_CORE_ARCHIVE_AND_SIGNED_PR_COMMENTS_MATCHED_BY_EXACT_HEAD_AND_RUN',
  cohort:{candidate_prs:all,sampled_prs:cases.length,comments_read:checked.filter(x=>x.checked).length,
    comment_failures:checked.filter(x=>!x.checked).length,
    unclassified_tasks:checked.filter(x=>x.found?.task&&!x.found?.classified).length,
    archive_partial:true,
    pagination_partial:store.pagination_partial===true,checked_only_public_records:true},
  stages,archive_url:REPO+'/issues/3419',
  note:'Только проверенные публичные GitHub-квитанции; исходный приватный CI event inbox не опубликован. ≥ — минимум подтверждений в ограниченной выборке, отсутствие квитанции не является нулём. Merge ≠ LIVE.'};
}
let cache=new Map(),pending=new Map();
async function calculate(hours,prFilter=null){
 const now=Date.now(),store=await fetchArchive(false),picked=selectCases(store.runs,hours,now,prFilter);
 const checked=await Promise.all(picked.rows.map(async e=>{
  try{const comments=await github('/issues/'+e.pr+'/comments?per_page=100&page=1',7000);
   if(!Array.isArray(comments))throw Error('COMMENTS_INVALID');
   const found=inspect(e,comments);
   await confirmPublication(e,found);
   return {...e,found,checked:true,partial_comments:comments.length===100};
  }catch(_){return {...e,found:{failed:{at:e.at,url:e.failure_url}},checked:false};}
 }));
 const result=aggregate(picked.rows,checked,now,hours,picked.all,store);
 if(prFilter!==null)result.cohort.requested_pr=prFilter;
 if(checked.some(x=>x.partial_comments))result.cohort.pagination_partial=true;
 return result;
}
module.exports=async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public,s-maxage=300,stale-while-revalidate=900');
 res.setHeader('X-Robots-Tag','noindex,nofollow');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end(JSON.stringify({error:'METHOD_NOT_ALLOWED'}));}
 const raw=req.query?.hours===undefined?'24':String(req.query.hours);
 if(!['24','168','336'].includes(raw)){res.statusCode=400;return res.end(JSON.stringify({error:'INVALID_HOURS'}));}
 const rawPR=req.query?.pr;
 if(rawPR!==undefined&&(typeof rawPR!=='string'||!/^[1-9][0-9]{0,5}$/.test(rawPR))){res.statusCode=400;return res.end(JSON.stringify({error:'INVALID_PR'}));}
 const hours=Number(raw),prFilter=rawPR===undefined?null:Number(rawPR),key=hours+':'+(prFilter===null?'cohort':prFilter),entry=cache.get(key);
 if(entry&&Date.now()-entry.at<300000){res.statusCode=200;return res.end(JSON.stringify(entry.data));}
 if(!pending.has(key))pending.set(key,calculate(hours,prFilter).finally(()=>pending.delete(key)));
 try{const data=await pending.get(key);cache.set(key,{at:Date.now(),data});
  res.statusCode=200;return res.end(JSON.stringify(data));
 }catch(e){res.statusCode=503;return res.end(JSON.stringify({
  schema:'HH_PR_REPAIR_EVIDENCE_FUNNEL_V1',error:String(e.message||e).slice(0,95),missing_is_not_zero:true
 }));}
};
module.exports._test={selectCases,inspect,aggregate,STAGES,trusted,jsonRecords};
