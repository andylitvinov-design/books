'use strict';
/**
 * Bounded on-demand Vercel API for the existing HH PR monitor.
 * Place in <monitor-root>/api/pr-attribution.js, with the pure module at
 * <monitor-root>/ci-pr-timeline-audit.cjs. Absolutely no cron or paid services.
 */
const {analyzePrTimeline}=require('../ci-pr-timeline-audit.cjs');
const OWNER='andylitvinov-design', REPO='books';
const API=`https://api.github.com/repos/${OWNER}/${REPO}`;
const CORE='hh-pr-core-release.yml';
const TOKEN=process.env.GITHUB_TOKEN||process.env.GH_TOKEN||'';
const SHA=/^[0-9a-f]{40}$/i, TASK=/^[0-9a-f]{32}$/i;
const CACHE_MS=15*60*1000,cache=new Map(),pending=new Map();
const STAGE_SOURCES=new Set(['pr_opened_ready','ready_event_observed','ready_for_review_readback',
  'trusted_core_failure','repair_worker_claim','ci_worker_claim',
  'github_actions_fix_step','verified_git_ref']);
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
 const validStages=new Set(['ready','triage','claimed','repair_started','source_published']);
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
 // A label proves the recorded conflict signal, never the time spent fixing it.
 // When near the read budget, skip the optional timeline instead of losing core data.
 if(used<15 && (remaining===null||remaining>=reserve)) {
  try{
   const labelRows=await gh(`/issues/${number}/timeline?per_page=100`);
   if(Array.isArray(labelRows)){
    if(labelRows.length===100)partial=true;
    events.push(...extractConflictLabels(labelRows,number));
   }else partial=true;
  }catch{partial=true;}
 } else partial=true;
 const filtered=checked.filter(r=>r.head_sha===r.pull_requests[0]?.head?.sha ||
   Array.isArray(r.verified_merge_parents));
 const timeline=analyzePrTimeline({pr,runs:filtered,jobs,events,now,runInventoryComplete});
 return {...timeline,source:{kind:'GITHUB_READ_ONLY_ON_DEMAND',reads:used,
  history_partial:partial,remaining_api_quota:remaining,
  known_limitations:[
    'Максимум 6 Core runs, 100 jobs/run и 100 последних комментариев; более старая история может отсутствовать.',
    'Метки конфликтов показывают событие и причину задержки, но не измеряют время устранения без проверенной пары task receipts.',
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
handler.extractConflictLabels=extractConflictLabels;
handler.safePr=safePr;
module.exports=handler;
