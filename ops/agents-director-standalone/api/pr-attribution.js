'use strict';
/**
 * Bounded on-demand Vercel API for the existing HH PR monitor.
 * Place in <monitor-root>/api/pr-attribution.js, with the pure module at
 * <monitor-root>/ci-pr-timeline-audit.cjs. Absolutely no cron or paid services.
 */
const {analyzePrTimeline}=require('../ci-pr-timeline-audit.cjs');
const {summarizeCheckpoints}=require('../pr-checkpoint-evidence.cjs');
const {analyzeRepairCycles}=require('../pr-repair-cycle-model.cjs');
const {enrichRepairCycles}=require('../pr-repair-latency-breakdown.cjs');
const {summarizeHeadStatus}=require('../pr-current-head-gate.cjs');
const OWNER='andylitvinov-design', REPO='books';
const API=`https://api.github.com/repos/${OWNER}/${REPO}`;
const CORE='hh-pr-core-release.yml';
const TOKEN=process.env.GITHUB_TOKEN||process.env.GH_TOKEN||'';
const SHA=/^[0-9a-f]{40}$/i, TASK=/^[0-9a-f]{32}$/i;
const CACHE_MS=15*60*1000,cache=new Map(),pending=new Map();
const STAGE_SOURCES=new Set(['pr_opened_ready','ready_event_observed','ready_for_review_readback',
  'trusted_core_failure','repair_worker_claim','ci_worker_claim',
  'github_actions_fix_step','github_actions_patch_verification_step','verified_git_ref']);
const STAGE_ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
function makeError(code,status){const e=new Error(code);e.status=status;return e;}
function parseUTC(v){if(typeof v!=='string')return null;const n=Date.parse(v);return Number.isFinite(n)?n:null;}
function safePr(num){const n=Number(num);return Number.isSafeInteger(n)&&n>0&&n<=999999?n:null;}
function trustedComment(c){return c?.user?.id===41898282 && c.user.login==='github-actions[bot]' &&
  c.user.type==='Bot' && c.performed_via_github_app?.id===15368 &&
  c.performed_via_github_app?.slug==='github-actions';}
function extractConflictLabels(rows,number){
 const out=[];
 for(const e of rows){
  if(!Number.isSafeInteger(e?.id)||e.id<1||
    !['labeled','unlabeled'].includes(e.event)||
    e.label?.name!=='hh:conflict-repair-needed'||
    !STAGE_ISO.test(e.created_at||'')||parseUTC(e.created_at)===null)continue;
  out.push({kind:e.event==='labeled'?'conflict_labeled':'conflict_unlabeled',
    verified:true,pr:number,head:null,at:e.created_at,
    url:`https://github.com/${OWNER}/${REPO}/pull/${number}#event-${e.id}`,
    source:'github_issue_timeline'});
 }
 return out;
}
function extractStageReceipts(comments,number){
 const result=[];
 const validStages=new Set(['ready','triage','claimed','repair_started','patch_verified','source_published']);
 for(const c of comments){
  if(!trustedComment(c)||typeof c.body!=='string'||c.body.length>150000)continue;
  const created=parseUTC(c.created_at);if(created===null)continue;
  for(const match of c.body.matchAll(/<!-- HH_PR_STAGE_V1 (\{[^\r\n]{1,680}\}) -->/g)){
   let e;try{e=JSON.parse(match[1]);}catch{continue;}
   const at=parseUTC(e.at);
   if(e.pr_number!==number || !validStages.has(e.stage) || !SHA.test(e.head_sha||'') ||
      typeof e.at!=='string'||!STAGE_ISO.test(e.at)||at===null ||
      !STAGE_SOURCES.has(e.source) || at>created+60000 ||
      (created-at>86400000 && e.source!=='github_actions_fix_step') ||
      !/^[1-9][0-9]{0,18}$/.test(String(e.run_id||'')) ||
      (e.task_key!==undefined && !TASK.test(e.task_key)) ||
      (e.stage==='claimed' && !TASK.test(e.task_key||'')) ||
      (e.stage==='repair_started' && (e.source!=='github_actions_fix_step'||!TASK.test(e.task_key||''))) ||
      (e.stage==='patch_verified' && (e.source!=='github_actions_patch_verification_step'||!TASK.test(e.task_key||''))) ||
      (e.stage==='source_published' && (e.source!=='verified_git_ref'||!TASK.test(e.task_key||'')||
       !SHA.test(e.new_sha||'')||e.new_sha.toLowerCase()===e.head_sha.toLowerCase())) ||
      (e.stage!=='source_published'&&e.new_sha!==undefined))continue;
   result.push({kind:'stage',verified:true,pr:number,head:e.head_sha.toLowerCase(),
      stage:e.stage,at:e.at,task:e.task_key||null,newHead:e.new_sha||null,
      source:e.source,url:typeof c.html_url==='string'?c.html_url:null,runId:Number(e.run_id)});
  }
 }
 return result;
}

const TASK_OUTCOME_STATUSES=new Set([
 'FIXED','VERIFIED','RETRY_SCHEDULED','REROUTED','WAITING_INPUT',
 'MANUAL_REQUIRED','KNOWN_ISSUE','NOT_ACTIONABLE','BLOCKED','UNCLASSIFIED'
]);
function extractTaskOutcomes(comments,number,currentHead=null){
 if(!Array.isArray(comments)||!safePr(number))return [];
 const rows=[],seen=new Set();
 for(const c of comments){
  if(!trustedComment(c)||typeof c.body!=='string'||c.body.length>150000||
     c.updated_at!==c.created_at||parseUTC(c.created_at)===null)continue;
  const matches=[...c.body.matchAll(/<!-- HH_PR_REPAIR_OUTCOME_V1 ([a-f0-9]{40}) ([1-9][0-9]{0,18}) -->/g)];
  if(!matches.length)continue;
  const match=c.body.match(/<!-- HH_PR_TASK_V1 -->\s*```json\s*([\s\S]*?)```/);
  if(!match||match[1].length>12000)continue;
  let record;try{record=JSON.parse(match[1]);}catch{continue;}
  const outcome=record?.outcome;
  if(record?.schema!=='HH_PR_TASK_V1'||!TASK.test(record.task_key||'')||
     record.pr_number!==number||!SHA.test(record.head_sha||'')||
     !/^[1-9][0-9]{0,18}$/.test(String(record.owner_run_id||''))||
     !outcome||outcome.schema!=='HH_TASK_OUTCOME_V1'||
     !TASK_OUTCOME_STATUSES.has(outcome.status)||
     outcome.task_key!==record.task_key||outcome.pr_number!==number||
     outcome.head_sha!==record.head_sha||
     String(outcome.owner_run_id)!==String(record.owner_run_id)||
     typeof outcome.reason_code!=='string'||!outcome.reason_code||
     outcome.reason_code.length>120||
     typeof outcome.responsible_role!=='string'||!outcome.responsible_role||
     typeof outcome.next_action!=='string'||!outcome.next_action||
     !STAGE_ISO.test(outcome.created_at||'')||parseUTC(outcome.created_at)===null||
     !STAGE_ISO.test(outcome.next_check_at||'')||parseUTC(outcome.next_check_at)===null||
     parseUTC(outcome.next_check_at)<parseUTC(outcome.created_at)||
     typeof outcome.source_published!=='boolean'||
     typeof outcome.verified_source!=='boolean')continue;
  const marker=matches.find(m=>m[1].toLowerCase()===record.head_sha.toLowerCase()&&m[2]===String(record.owner_run_id));
  if(!marker)continue;
  if(outcome.status==='FIXED'&&
     (record.state!=='PUBLISHED'||record.source_published!==true||
      outcome.source_published!==true||outcome.verified_source!==true||
      !SHA.test(record.new_sha||'')||record.new_sha===record.head_sha||
      outcome.new_sha!==record.new_sha))continue;
  if(outcome.status==='VERIFIED'&&
     (outcome.source_published!==true||outcome.verified_source!==true||
      !SHA.test(outcome.new_sha||'')||outcome.new_sha===outcome.head_sha))continue;
  if(outcome.verified_source===true&&
     (!SHA.test(outcome.new_sha||'')||outcome.new_sha===outcome.head_sha))continue;
  const key=record.task_key+':'+record.owner_run_id;
  if(seen.has(key))continue;seen.add(key);
  const url=typeof c.html_url==='string'&&
    /^https:\/\/github\.com\/andylitvinov-design\/books\/pull\/\d+#issuecomment-\d+$/.test(c.html_url)?c.html_url:null;
  const runUrl=typeof record.run_url==='string'&&
    /^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/\d+$/.test(record.run_url)?record.run_url:null;
  rows.push({
    task_key:record.task_key,pr_number:number,head_sha:record.head_sha.toLowerCase(),
    status:outcome.status,reason_code:outcome.reason_code,
    responsible_role:outcome.responsible_role,next_action:outcome.next_action,
    next_check_at:outcome.next_check_at,created_at:outcome.created_at,
    owner_run_id:String(record.owner_run_id),
    source_published:outcome.source_published,verified_source:outcome.verified_source,
    new_sha:outcome.new_sha||null,current_head:SHA.test(currentHead||'')&&
      currentHead.toLowerCase()===((outcome.source_published===true&&SHA.test(outcome.new_sha||''))?
        outcome.new_sha.toLowerCase():record.head_sha.toLowerCase()),
    comment_url:url,run_url:runUrl,source:'SIGNED_GITHUB_ACTIONS_REPAIR_FINALIZER'
  });
 }
 return rows.sort((a,b)=>parseUTC(b.created_at)-parseUTC(a.created_at));
}
/**
 * A historical LIVE observation is a signed-by-provenance GitHub Actions
 * comment. The current Vercel alias may have moved since this receipt.
 * Do NOT infer LIVE from a green CI, merged_at or an unverified label.
 */
const LIVE_METHODS=new Set([
 'VERCEL_API_READY_AND_ALIAS','PUBLIC_RUNTIME_EXACT_SHA_AND_DEPLOYMENT',
 'PUBLIC_RUNTIME_ALIAS_SHA_AND_DEPLOYMENT_ANCESTRY',
 'VERCEL_API_READY_AND_ALIAS_WITH_GITHUB_STATUS_ANCESTRY'
]);
function verifiedLiveReceipt(comments,pr){
 const mergeSha=String(pr?.merge_commit_sha||'').toLowerCase();
 const created=parseUTC(pr?.created_at),merged=parseUTC(pr?.merged_at);
 if(pr?.base?.ref!=='codex/public-book-library'||pr.state!=='closed'||
    !SHA.test(mergeSha)||merged===null||created===null||created>merged||
    !Array.isArray(comments))return null;
 const found=[];
 for(const c of comments){
  if(!trustedComment(c)||typeof c.body!=='string'||c.body.length>150000)continue;
  const commentAt=parseUTC(c.created_at);if(commentAt===null)continue;
  const body=c.body;
  const m=body.match(/^<!-- HH_LIVE_VERIFIED_V1 sha=([a-f0-9]{40}) deployment=(dpl_[A-Za-z0-9]{8,64}) -->\r?\nLIVE observed at (\d{4}-\d\d-\d\dT[^\s]+) for protected production merge commit ([a-f0-9]{40})\./i);
  if(!m||m[1].toLowerCase()!==mergeSha||m[4].toLowerCase()!==mergeSha)continue;
  const observed=parseUTC(m[3]),deploy=m[2];
  if(!STAGE_ISO.test(m[3])||observed===null||observed<merged||
     observed>commentAt+60000||commentAt-observed>48*3600000)continue;
  const marker='Vercel production deployment: '+deploy+
   '. Verified public alias: https://holistichouse.vercel.app/en. Method: ';
  if(!body.includes(marker))continue;
  const method=body.slice(body.indexOf(marker)+marker.length).split('.')[0];
  if(!LIVE_METHODS.has(method))continue;
  const commitUrl='https://github.com/'+OWNER+'/'+REPO+'/commit/'+mergeSha;
  const deployUrl='https://vercel.com/super10/codex-public-book-library/'+deploy.slice(4);
  const runtimeUrl='https://holistichouse.vercel.app/api/public/release-evidence';
  if(!body.includes('- '+commitUrl)||!body.includes('- '+deployUrl)||
     !body.includes('- https://holistichouse.vercel.app/en')||
     (method.startsWith('PUBLIC_RUNTIME')&&!body.includes('- '+runtimeUrl)))continue;
  const url=String(c.html_url||'');
  if(!/^https:\/\/github\.com\/andylitvinov-design\/books\/pull\/\d+#issuecomment-\d+$/.test(url)||
     !url.includes('/pull/'+pr.number+'#issuecomment-'))continue;
  found.push({live_at:new Date(observed).toISOString(),deployment_id:deploy,
   proof_method:method,receipt_url:url,deploy_url:deployUrl,
   merge_sha:mergeSha,merge_to_live_ms:observed-merged,created_to_live_ms:observed-created,
   merged_to_live_minutes:Math.round((observed-merged)/600)/100,
   created_to_live_minutes:Math.round((observed-created)/600)/100});
 }
 found.sort((a,b)=>a.live_at.localeCompare(b.live_at)||a.deployment_id.localeCompare(b.deployment_id));
 return found[0]||null;
}

async function loadPr(number,{request=fetch,token=TOKEN,now=Date.now()}={}){
 let remaining=null,used=0,partial=false;
 const reserve=token?80:12;
 async function gh(path){
  if(used>=15)throw makeError('GITHUB_READ_BUDGET_EXHAUSTED',429);
  // GitHub anonymous GETs have a 60/h bucket: a fixed 80 request floor
  // would disable every no-token monitor response after the first GET.
  if(remaining!==null&&remaining<reserve)throw makeError('GITHUB_RATE_RESERVE',429);
  used++;
  const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
    'User-Agent':'hh-pr-attribution-on-demand'};
  if(token)headers.Authorization=`Bearer ${token}`;
  const response=await request(API+path,{headers,signal:AbortSignal.timeout(9500)});
  const rate=response.headers?.get?.('x-ratelimit-remaining');
  if(rate!==null&&rate!==undefined&&/^\d+$/.test(rate))remaining=Number(rate);
  if(!response.ok)throw makeError('GITHUB_UPSTREAM_'+response.status,response.status>=500?503:response.status);
  return response.json();
 }
 const pr=await gh(`/pulls/${number}`);
 if(pr?.number!==number||pr?.base?.ref!=='codex/public-book-library')
   throw makeError('NON_PRODUCTION_PR',422);
 const opened=parseUTC(pr.created_at),ended=parseUTC(pr.merged_at)||parseUTC(pr.closed_at)||now;
 if(opened===null||opened>ended)throw makeError('INVALID_PR_TIMESTAMPS',422);
 const sourceBranch=pr.head?.ref;
 let runs=[],runInventoryComplete=true;
 if(sourceBranch){
  const filter=new URLSearchParams({event:'pull_request',branch:sourceBranch,
    created:`${new Date(opened).toISOString().slice(0,10)}..${new Date(ended).toISOString().slice(0,10)}`,
    per_page:'100',page:'1'});
  const first=await gh(`/actions/workflows/${CORE}/runs?${filter}`);
  if(!Array.isArray(first.workflow_runs))throw makeError('WORKFLOW_RUNS_UNVERIFIED',503);
  runs=first.workflow_runs;
  if(!Number.isSafeInteger(first.total_count)||first.total_count<runs.length ||
     first.total_count<=100 && first.total_count!==runs.length) {partial=true;runInventoryComplete=false;}
  if(first.total_count>100){partial=true;filter.set('page','2');
    const second=await gh(`/actions/workflows/${CORE}/runs?${filter}`);
    if(!Array.isArray(second.workflow_runs))throw makeError('WORKFLOW_RUNS_UNVERIFIED',503);
    runs.push(...second.workflow_runs);
  }
  if(first.total_count>200){partial=true;runInventoryComplete=false;}
  else if(first.total_count!==runs.length){partial=true;runInventoryComplete=false;}
 }
 // GitHub often clears workflow_run.pull_requests after a PR is merged.
 // Recover ONLY the immutable final PR HEAD, with matching branch, event,
 // repository and workflow; no broad or unverified historical attribution.
 let headMatchFallbacks=0;
 if(!runs.some(r=>r?.pull_requests?.some?.(x=>x?.number===number) ||
                 (r?.head_sha===pr.head?.sha && r?.head_branch===sourceBranch)) &&
    sourceBranch && SHA.test(pr.head?.sha||'')) {
  const params=new URLSearchParams({event:'pull_request',head_sha:pr.head.sha,
    created:`${new Date(opened).toISOString().slice(0,10)}..${new Date(ended).toISOString().slice(0,10)}`,
    per_page:'100',page:'1'});
  const exact=await gh(`/actions/workflows/${CORE}/runs?${params}`);
  if(!Array.isArray(exact.workflow_runs)||!Number.isSafeInteger(exact.total_count))
   throw makeError('HEAD_RUN_INVENTORY_UNVERIFIED',503);
  if(exact.total_count>100){runInventoryComplete=false;partial=true;}
  runs.push(...exact.workflow_runs);
 }
 runs=runs.map(run=>{
  if(!Array.isArray(run?.pull_requests)||run.pull_requests.length!==0||
     run.head_sha!==pr.head?.sha||run.head_branch!==sourceBranch||
     run.event!=='pull_request'||run.name!=='HH PR core release gate'||
     String(run.path||'').split('@')[0]!=='.github/workflows/hh-pr-core-release.yml'||
     run.repository?.full_name!==`${OWNER}/${REPO}`||
     run.head_repository?.full_name!==`${OWNER}/${REPO}`||
     !SHA.test(pr.base?.sha||''))return run;
  headMatchFallbacks++;
  return {...run,pull_requests:[{number,base:{ref:'codex/public-book-library',sha:pr.base.sha},
    head:{ref:sourceBranch,sha:pr.head.sha}}],verified_exact_head_association:true};
 });
 // A multi-commit PR may have older HEAD attempts outside this read.
 if(headMatchFallbacks>0&&pr.commits!==1){runInventoryComplete=false;partial=true;}
 // Strict PR association: ignore runs from a different PR, base, or branch.
 runs=runs.filter(run=>run?.event==='pull_request' &&
   run.repository?.full_name===`${OWNER}/${REPO}` &&
   run.head_repository?.full_name===`${OWNER}/${REPO}` &&
   run.pull_requests?.length===1 &&
   run.pull_requests[0]?.number===number &&
   run.pull_requests[0]?.base?.ref==='codex/public-book-library' &&
   run.pull_requests[0]?.head?.ref===sourceBranch);
 const toCollect=runs.filter(r=>parseUTC(r.created_at)!==null&&parseUTC(r.created_at)>=opened&&
   parseUTC(r.created_at)<=ended).sort((a,b)=>parseUTC(a.created_at)-parseUTC(b.created_at));
 if(toCollect.length>6){partial=true;}
 // Request cap: process at most 6 runs and never awaken checks.
 const checked=toCollect.slice(0,6);
 const jobs=[];
 for(const run of checked){
  if(run.head_sha!==run.pull_requests[0]?.head?.sha){
   // Typical GitHub synthetic PR merge commit: require exact two parents.
   if(!SHA.test(run.head_sha||'')){partial=true;continue;}
   const git=await gh(`/git/commits/${run.head_sha}`);
   const parents=Array.isArray(git.parents)?git.parents.map(x=>x.sha):[];
   if(parents.length!==2||parents[0]!==run.pull_requests[0]?.base?.sha||
      parents[1]!==run.pull_requests[0]?.head?.sha){partial=true;continue;}
   run.verified_merge_parents=parents;
  }
  const page=await gh(`/actions/runs/${run.id}/jobs?filter=all&per_page=100`);
  if(!Array.isArray(page.jobs))throw makeError('RUN_JOBS_UNVERIFIED',503);
  if(page.total_count>100)partial=true;
  jobs.push(...page.jobs);
 }
 const comments=await gh(`/issues/${number}/comments?per_page=100&sort=created&direction=desc`);
 if(!Array.isArray(comments))throw makeError('PR_COMMENTS_UNVERIFIED',503);
 if(comments.length===100)partial=true;
 const events=extractStageReceipts(comments,number);
 const rawTaskOutcomes=extractTaskOutcomes(comments,number,pr.head?.sha||null);
 let prTimelineEvents=null;
 // A label proves the recorded conflict signal, never the time spent fixing it.
 // When near the read budget, skip the optional timeline instead of losing core data.
 if(used<15 && (remaining===null||remaining>=reserve)) {
  try{
   const labelRows=await gh(`/issues/${number}/timeline?per_page=100`);
   if(Array.isArray(labelRows)){
    if(labelRows.length===100)partial=true;
    else prTimelineEvents=labelRows;
    events.push(...extractConflictLabels(labelRows,number));
   }else partial=true;
  }catch{partial=true;}
 } else partial=true;
 const filtered=checked.filter(r=>r.head_sha===r.pull_requests[0]?.head?.sha ||
   Array.isArray(r.verified_merge_parents));
 const timeline=analyzePrTimeline({pr,runs:filtered,jobs,events,now,runInventoryComplete});
 // Supplementary steps: NEVER add their calendar spans to the exclusive PR
 // wall-clock chart; owner/edit/push evidence remains unknown when absent.
 const repairCycles=enrichRepairCycles(analyzeRepairCycles({pr,runs:filtered,jobs,comments,
   timeline:prTimelineEvents,commentsComplete:comments.length<100,
   runHistoryComplete:runInventoryComplete&&checked.length===toCollect.length}),events,
   {observed_at:new Date(now).toISOString(),pr_open:pr.state==='open',current_head:pr.head?.sha});
 // Reuse the SAME previously fetched PR comment page: zero extra API calls.
 const live=verifiedLiveReceipt(comments,pr);
 const headProof=summarizeHeadStatus({pr,chronology:timeline.chronology,runs:filtered,historyPartial:partial,live});
 const taskOutcomes=rawTaskOutcomes.map(row=>{
  const verified=row.status==='FIXED'&&row.current_head===true&&
    row.new_sha===pr.head?.sha?.toLowerCase?.()&&headProof.green_exact_head===true&&
    parseUTC(headProof.green_at)!==null&&parseUTC(headProof.green_at)>=parseUTC(row.created_at);
  return {...row,recorded_status:row.status,
    status:verified?'VERIFIED':row.status,
    verification_evidence:verified?'EXACT_CURRENT_HEAD_CORE_SPECIALIST_MERGE_GATES':
      row.status==='FIXED'?'SOURCE_PUBLISHED_WAITING_EXACT_HEAD_REQUIRED_CI':'NOT_VERIFIED',
    verified_at:verified?headProof.green_at:null,
    verification_url:verified?headProof.green_url:null};
 });
 if(live){
  timeline.chronology.push({kind:'live_verified',at:live.live_at,
   reason:'Production LIVE независимо подтверждён: '+live.proof_method,
   url:live.receipt_url,merge_sha:live.merge_sha,deployment_id:live.deployment_id});
  timeline.chronology.sort((a,b)=>String(a.at).localeCompare(String(b.at)));
 }
 const mergedAt=parseUTC(pr.merged_at);
 const firstEvent=kind=>timeline.chronology.find(e=>e.kind===kind);
 const latestEvent=kind=>[...timeline.chronology].reverse().find(e=>e.kind===kind);
 const eventCheckpoint=(key,label,kind)=>{
  const e=firstEvent(kind);
  return {key,label,at:e?.at||null,url:e?.url||null,
   evidence:e?'GITHUB_VERIFIED_EVENT':'NOT_RECORDED',kind};
 };
 const runStart=timeline.attempt_details?.find(a=>a.repeated===false);
 const concrete=(key,label,at,url,kind)=>({key,label,at:at||null,url:url||null,
  evidence:at?'GITHUB_VERIFIED_EVENT':'NOT_RECORDED',kind});
 const checkpointRows=[
  concrete('created','PR создан',pr.created_at,'https://github.com/'+OWNER+'/'+REPO+'/pull/'+number,'created'),
  eventCheckpoint('ready','Готов к обработке','ready'),
  eventCheckpoint('triage','Triage и маршрутизация','triage'),
  eventCheckpoint('claimed','Задача взята Worker','claimed'),
  eventCheckpoint('first_ci_queued','Первая подтверждённая CI в очереди','ci_queued'),
  concrete('runner_started','Первый Runner начал работу',runStart?.runner_started_at,runStart?.run_url,'runner_started'),
  concrete('core_job_completed','Core job завершён',
   timeline.chronology.find(e=>e.kind==='job_completed'&&String(e.reason||'').startsWith('core-lint-types-build:'))?.at,
   timeline.chronology.find(e=>e.kind==='job_completed'&&String(e.reason||'').startsWith('core-lint-types-build:'))?.url,'core_job_completed'),
  eventCheckpoint('ci_failed','Ошибка CI зафиксирована','ci_failed'),
  eventCheckpoint('repair_started','Фактический Repair начат','repair_started'),
  eventCheckpoint('source_published','Исправленный код опубликован','source_published'),
  eventCheckpoint('conflict_detected','Конфликт обнаружен','conflict_labeled'),
  eventCheckpoint('conflict_label_cleared','Метка конфликта снята','conflict_unlabeled'),
  eventCheckpoint('repeat_ci_queued','Повторная CI в очереди','repeat_ci_queued'),
  concrete('merge_gate_green','Последний Merge Gate зелёный',headProof.green_at,
   headProof.green_url,'ci_green'),
  concrete('merged','Merge подтверждён',pr.merged_at,'https://github.com/'+OWNER+'/'+REPO+'/pull/'+number,'merged'),
  concrete('deployment_ready','Production deployment READY',null,null,'deploy_ready_unobserved'),
  concrete('live_verified','Production LIVE подтверждён',live?.live_at,live?.receipt_url,'live_verified')
 ];
 // Missing conditional tasks are NOT missing mandatory merge milestones.
 // Do not claim a historical N/A when GitHub pagination or old HEAD runs
 // make the inventory partial. LIVE proof remains independent.
 const checkpointEvidence=summarizeCheckpoints(checkpointRows,{
  merged:pr.merged_at!=null,historyPartial:partial,
  failures:timeline.failures,repeats:timeline.repeated_attempts,
  conflictSeen:timeline.chronology.some(e=>
   e.kind==='conflict_labeled'||e.kind==='conflict_unlabeled')
 });
 
 const journey={checkpoints:checkpointEvidence.checkpoints,checkpoint_coverage:checkpointEvidence.coverage,created_at:pr.created_at,
  current_head_sha:pr.head?.sha||null,green_exact_head:headProof.green_exact_head,stop_reason:headProof.stop_reason,
  first_observed_ci_at:timeline.chronology.find(e=>e.kind==='ci_queued')?.at||null,
  final_ci_green_at:[...timeline.chronology].reverse().find(e=>e.kind==='ci_green')?.at||null,
  merged_at:pr.merged_at||null,
  live_verified_at:live?.live_at||null,
  live_receipt_found:!!live,
  live_proof_status:live?'VERIFIED_HISTORICAL':'NOT_OBSERVED_IN_BOUNDED_COMMENTS',
  merge_to_live_minutes:live?.merged_to_live_minutes??null,
  created_to_live_minutes:live?.created_to_live_minutes??null,
  merge_to_live_ms:live?.merge_to_live_ms??null,
  created_to_live_ms:live?.created_to_live_ms??null,
  end_to_end_complete:!!live&&mergedAt!==null};
 return {...timeline,repair_cycles:repairCycles,task_outcomes:taskOutcomes,live_evidence:live,journey,source:{kind:'GITHUB_READ_ONLY_ON_DEMAND',reads:used,
  exact_head_no_pr_ref_matches:headMatchFallbacks,
  history_partial:partial,remaining_api_quota:remaining,
  known_limitations:[
    'Максимум 6 Core runs, 100 jobs/run и 100 последних комментариев; более старая история может отсутствовать.',
    'Метки конфликтов показывают событие и причину задержки, но не измеряют время устранения без проверенной пары task receipts.',
    'Старые GitHub workflow runs могут потерять PR references: восстанавливается лишь точное совпадение финального HEAD SHA и branch.',
    'Данные не копируются в базу, собираются исключительно по запросу конкретного PR.'
  ]}};
}
async function handler(req,res){
 res.setHeader('Cache-Control','private, max-age=0');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
 const pr=safePr(req.query?.pr);
 if(pr===null)return res.status(400).json({error:'INVALID_PR_NUMBER'});
 const hit=cache.get(pr);
 if(hit&&Date.now()-hit.when<CACHE_MS)return res.status(200).json({...hit.value,cache_hit:true});
 if(!pending.has(pr))pending.set(pr,loadPr(pr).then(value=>{
  cache.set(pr,{when:Date.now(),value});
  if(cache.size>40)cache.delete(cache.keys().next().value);
  return value;
 }).finally(()=>pending.delete(pr)));
 try{return res.status(200).json(await pending.get(pr));}
 catch(error){
  const status=Number.isSafeInteger(error?.status)&&error.status>=400&&error.status<600?error.status:503;
  if(hit)return res.status(200).json({...hit.value,cache_hit:true,
   stale:true,source_error:String(error.message||'UPSTREAM_ERROR')});
  return res.status(status).json({schema:'HH_PR_ATTRIBUTION_V1',pr_number:pr,
   error:String(error?.message||'EVIDENCE_UNAVAILABLE').slice(0,120),
   timeline_available:false,missing_is_not_zero:true});
 }
}
handler.loadPr=loadPr;
handler.extractStageReceipts=extractStageReceipts;
handler.extractTaskOutcomes=extractTaskOutcomes;
handler.verifiedLiveReceipt=verifiedLiveReceipt;
handler.extractConflictLabels=extractConflictLabels;
handler.safePr=safePr;
module.exports=handler;
