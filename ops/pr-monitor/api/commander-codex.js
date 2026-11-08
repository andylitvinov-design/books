'use strict';
/* HH_COMMANDER_CODEX_BRIDGE_V2: owner-only, opt-in GitHub Codex handoff.
 * Uses the current Supabase owner session, not the retired hh_seo_owner helper.
 * No client token, paid fallback, automatic retry, merge or inferred LIVE.
 */
const {callStore,sendJson,isOriginAllowed}=require('../lib/commander-private-store');
const REPO='andylitvinov-design/books',BASE='codex/bootstrap-books';
const API='https://api.github.com/repos/'+REPO;
const INBOX='https://github.com/andylitvinov-design/books/issues/3890';
const MARK='HH_COMMANDER_CODEX_V1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeString=(v,max=2000)=>typeof v==='string'?v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,max):'';
const validBot=x=>/^[a-z\d-]{2,70}\[bot\]$/i.test(x||'')&&/codex|openai/i.test(x);
const enabled=()=>process.env.HH_PM_CODEX_GITHUB_ENABLED==='true'&&process.env.HH_PM_CODEX_BUDGET_VERIFIED==='true';
const token=()=>process.env.HH_PM_GITHUB_WRITE_TOKEN||'';
const bot=()=>process.env.HH_PM_CODEX_ASSIGNEE||'';
const mention=()=>process.env.HH_PM_CODEX_PR_MENTION||'';
const ready=()=>enabled()&&token().length>20&&validBot(bot())&&/^@[A-Za-z\d-]{2,70}$/.test(mention());
const number=x=>Number.isInteger(Number(x))&&Number(x)>0&&Number(x)<1000000?Number(x):0;
const PRIVATE=/(-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|\b(?:ghp_|gho_|github_pat_|sk-proj-|sk-[A-Za-z\d_-]{15,})[A-Za-z\d_-]{12,}|\b(?:authorization\s*:\s*bearer|password\s*[:=]|api[_-]?key\s*[:=]))/i;
async function github(method,path,data){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),11000);
 try{
  const r=await fetch(API+path,{method,signal:abort.signal,redirect:'error',cache:'no-store',headers:{
   Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
   Authorization:'Bearer '+token(),'User-Agent':'HH-Commander-Codex-Bridge',
   ...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
  if(r.status===204)return {status:204};
  if(!r.ok)throw Error('GITHUB_HTTP_'+r.status);
  const text=await r.text();if(text.length>350000)throw Error('GITHUB_RESPONSE_TOO_LARGE');
  return text?JSON.parse(text):{};
 }finally{clearTimeout(timer)}
}
const marker=id=>'<!-- '+MARK+':'+id+' -->';
const publicText=(v,min,max)=>{
 const raw=String(v||'');
 if(raw.length<min||raw.length>max||/\u0000/.test(raw))throw Error('INVALID_PUBLIC_TEXT');
 const trimmed=safeString(raw,max);
 if(trimmed.length<min||PRIVATE.test(trimmed))throw Error('SECRET_OR_INVALID_PUBLIC_TEXT');
 return trimmed;
};
function cleanTask(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('INVALID_BODY');
 if(!UUID.test(body.id||''))throw Error('INVALID_REQUEST_ID');
 if(body.consentPublic!==true||body.consentCredits!==true||body.consentPolicy!==true)throw Error('CONSENT_REQUIRED');
 if(!['commander','holistic','video'].includes(body.project))throw Error('UNSUPPORTED_PROJECT');
 if(!['issue','pr'].includes(body.mode))throw Error('INVALID_MODE');
 const title=publicText(body.title,5,120),prompt=publicText(body.prompt,20,6000);
 const pr=body.mode==='pr'?number(body.pr):0;
 if(body.mode==='pr'&&!pr)throw Error('INVALID_PR_NUMBER');
 return {id:body.id,project:body.project,title,prompt,mode:body.mode,pr};
}
function taskBody(x){
 return [marker(x.id),'Agent Commander -> OpenAI Codex (GitHub bridge)','',
  '**Project:** '+x.project,'**Repository:** '+REPO,'**Target base:** '+BASE,'',
  '### Implementation request',x.prompt,'',
  '### Non-negotiable preflight',
  '- Read root AGENTS.md and GLOBAL_PR_ONE_PUBLISH_V1 before any source write.',
  '- Verify current branch/HEAD, active root x PR, lease, blockers, current CI and deployment cost.',
  '- Reuse matching existing PR; stage and locally test complete changes, publish source HEAD once.',
  '- No new paid provider, paid token, workflow, Vercel build or unapproved costs.',
  '- Do not bypass protected checks; merge and LIVE are separate verified results.',
  '', 'Global policy: https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md',
  'This issue is public. An agent assignment is not evidence that work has started.'
 ].join('\n');
}
async function requireOwner(req){
 const result=await callStore(req,'status',{}, {method:'GET'});
 if(result.status!==200||result.data?.owner!==true||result.data?.privateStoreConfigured!==true)
  throw Object.assign(Error(result.data?.error||'OWNER_SESSION_REQUIRED'),{status:result.status===401?401:403});
 return true;
}
async function preflight(){
 if(!ready())throw Error('CODEX_INTEGRATION_NOT_CONFIGURED');
 const repo=await github('GET','');
 if(repo.full_name!==REPO||repo.permissions?.push!==true)throw Error('REPOSITORY_WRITE_NOT_GRANTED');
 const branch=await github('GET','/branches/'+encodeURIComponent(BASE));
 if(!branch?.commit?.sha)throw Error('BASE_SHA_NOT_VERIFIED');
 const eligible=await github('GET','/assignees/'+encodeURIComponent(bot()));
 if(eligible.status!==204)throw Error('CODEX_AGENT_NOT_ASSIGNABLE');
 return branch.commit.sha;
}
async function findPrior(id){
 const q=encodeURIComponent('repo:'+REPO+' in:body '+MARK+':'+id);
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),11000);
 try{
  const r=await fetch('https://api.github.com/search/issues?q='+q+'&per_page=10',{
   cache:'no-store',redirect:'error',signal:abort.signal,headers:{Accept:'application/vnd.github+json',
   Authorization:'Bearer '+token(),'User-Agent':'HH-Commander-Codex-Bridge'}});
  if(!r.ok)throw Error('DUPLICATE_INDEX_UNAVAILABLE');
  const json=await r.json();if(json.incomplete_results)throw Error('DUPLICATE_INDEX_INCOMPLETE');
  const hits=(json.items||[]).filter(v=>String(v.body||'').includes(marker(id)));
  if(hits.length>1)throw Error('DUPLICATE_REQUEST_HOLD');
  return hits[0]||null;
 }finally{clearTimeout(timer)}
}
async function launchIssue(x){
 const prior=await findPrior(x.id);
 if(prior)return {mode:'issue',duplicate:true,issue:prior.number,url:prior.html_url,
  acceptedByGithub:true,codexStarted:false,proof:'GITHUB_ISSUE_EXISTS_ASSIGNMENT_NOT_RECONFIRMED'};
 const issue=await github('POST','/issues',{title:'[Codex - Commander] '+x.title,
  body:taskBody(x),assignees:[bot()],agent_assignment:{target_repo:REPO,base_branch:BASE}});
 if(!number(issue.number)||!issue.html_url?.startsWith('https://github.com/'+REPO+'/issues/'))
  throw Error('ISSUE_CREATE_RECEIPT_INVALID');
 const assigned=Array.isArray(issue.assignees)&&issue.assignees.some(v=>v.login===bot());
 return {mode:'issue',issue:issue.number,url:issue.html_url,duplicate:false,
  acceptedByGithub:true,assignedOnGithub:assigned,codexStarted:false,
  proof:assigned?'GITHUB_AGENT_ASSIGNED_NOT_RUN_VERIFIED':'ISSUE_CREATED_AGENT_NOT_ASSIGNED'};
}
async function launchPR(x){
 const pr=await github('GET','/pulls/'+x.pr);
 if(pr.number!==x.pr||pr.state!=='open'||pr.draft||pr.base?.ref!==BASE)throw Error('PR_NOT_ELIGIBLE_FOR_CONTROL_BRANCH');
 const sha=pr.head?.sha;
 if(!/^[a-f\d]{40}$/i.test(sha||''))throw Error('PR_HEAD_NOT_VERIFIED');
 const checks=await github('GET','/commits/'+sha+'/check-runs?per_page=100');
 if(!Array.isArray(checks.check_runs)||!checks.check_runs.length||checks.total_count>100)throw Error('CURRENT_CI_COVERAGE_UNVERIFIED');
 if(checks.check_runs.some(v=>v.status!=='completed'))throw Error('ACTIVE_CI_HOLD');
 const comments=await github('GET','/issues/'+x.pr+'/comments?per_page=100');
 if(!Array.isArray(comments)||comments.length===100)throw Error('COMMENT_INDEX_INCOMPLETE_HOLD');
 const prev=comments.find(c=>String(c.body||'').includes(marker(x.id)));
 if(prev)return {mode:'pr',duplicate:true,pr:x.pr,url:prev.html_url,headSha:sha,acceptedByGithub:true,codexStarted:false,proof:'GITHUB_COMMENT_EXISTS'};
 const c=await github('POST','/issues/'+x.pr+'/comments',{body:
  [marker(x.id),mention()+' Please implement the following task in this PR, without bypassing current lease or CI rules:',
  '',x.prompt,'','Target HEAD at submission: '+sha+'. If ownership or CI is ambiguous, HOLD and report, do not push.',
  'Policy: https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md'].join('\n')});
 if(!number(c.id)||!c.html_url?.startsWith('https://github.com/'+REPO+'/'))throw Error('PR_COMMENT_RECEIPT_INVALID');
 return {mode:'pr',pr:x.pr,url:c.html_url,headSha:sha,acceptedByGithub:true,codexStarted:false,proof:'GITHUB_MENTION_POSTED_BOT_ACCEPTANCE_NOT_VERIFIED'};
}
async function receipt(mode,n){
 if(mode==='issue'){
  const d=await github('GET','/issues/'+n);
  if(d.pull_request||!String(d.body||'').includes(MARK+':'))throw Error('NOT_COMMANDER_CODEX_ISSUE');
  return {mode,issue:n,url:d.html_url,open:d.state==='open',assignedOnGithub:(d.assignees||[]).some(a=>a.login===bot()),
   codexStarted:false,ciVerified:false,liveVerified:false,proof:'GITHUB_ISSUE_AND_ASSIGNMENT_ONLY'};
 }
 if(mode==='pr'){
  const d=await github('GET','/pulls/'+n);
  return {mode,pr:n,url:d.html_url,open:d.state==='open',merged:!!d.merged_at,headSha:d.head?.sha||'',
   codexStarted:false,ciVerified:false,liveVerified:false,proof:'GITHUB_PR_METADATA_ONLY'};
 }
 throw Error('INVALID_RECEIPT_KIND');
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','private,no-store,max-age=0');res.setHeader('Vary','Cookie, Origin');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 if(!['GET','POST'].includes(req.method))return sendJson(res,405,{error:'METHOD_NOT_ALLOWED'});
 if(req.method==='POST'&&!isOriginAllowed(req))return sendJson(res,403,{error:'CROSS_ORIGIN_DENIED'});
 try{await requireOwner(req)}catch(e){return sendJson(res,e.status||503,{error:e.code||safeString(e.message||'OWNER_SESSION_REQUIRED',100)})}
 const u=new URL(req.url,'https://holistic-house-pr-monitor.vercel.app');
 if(req.method==='GET'&&u.searchParams.get('action')==='status'){
  let eligibleForDispatch=false,readinessError=null;
  if(ready())try{await preflight();eligibleForDispatch=true}catch(e){readinessError=safeString(e.message||'PRECHECK_FAILED',100)}
  return sendJson(res,200,{authenticated:true,owner:true,privateStoreConfigured:true,configured:ready(),
   eligibleForDispatch,readinessError,manualHandoffAvailable:true,manualHandoffUrl:INBOX,
   provider:'GitHub Codex',repo:REPO,base:BASE,needsCopilotEntitlement:true,
   publicTask:true,budgetGuard:enabled(),observedAt:new Date().toISOString()});
 }
 if(!ready())return sendJson(res,503,{error:'CODEX_INTEGRATION_NOT_CONFIGURED',
  manualHandoffAvailable:true,manualHandoffUrl:INBOX,codexStarted:false});
 if(req.method==='POST'&&Number(req.headers?.['content-length']||0)>9500)return sendJson(res,413,{error:'PAYLOAD_TOO_LARGE'});
 try{
  if(req.method==='GET'&&u.searchParams.get('action')==='receipt'){
   const n=number(u.searchParams.get('number'));if(!n)return sendJson(res,400,{error:'INVALID_RECEIPT_NUMBER'});
   return sendJson(res,200,await receipt(u.searchParams.get('mode'),n));
  }
  if(req.method!=='POST'||u.searchParams.get('action')!=='dispatch')return sendJson(res,400,{error:'UNKNOWN_ACTION'});
  let body=req.body;if(typeof body==='string')body=JSON.parse(body);
  if(JSON.stringify(body||{}).length>9500)return sendJson(res,413,{error:'PAYLOAD_TOO_LARGE'});
  const x=cleanTask(body);await preflight();
  return sendJson(res,200,await (x.mode==='issue'?launchIssue(x):launchPR(x)));
 }catch(e){
  const error=safeString(e.message||'CODEX_BRIDGE_ERROR',120);
  const validation=/^(INVALID_|CONSENT_|SECRET_|UNSUPPORTED_|PR_NOT_|ACTIVE_CI_|CODEX_AGENT_|CURRENT_CI_|COMMENT_INDEX_|DUPLICATE_)/.test(error);
  return sendJson(res,validation?409:503,{error,acceptedByGithub:false,codexStarted:false,
   manualHandoffAvailable:true,manualHandoffUrl:INBOX});
 }
};
module.exports.__test={ready,cleanTask,publicText,marker,taskBody,validBot,launchIssue,launchPR,receipt,findPrior,requireOwner};
