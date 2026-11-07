/**
 * Owner-only Project Management -> trusted GitHub Watchdog handoff.
 * GitHub remains authoritative. This module never writes PR source, secrets
 * or CI outcomes; the existing dispatcher signs exact-HEAD reservations.
 */
const REPO='andylitvinov-design/books';
const BASE='https://api.github.com/repos/'+REPO;
const SHA=/^[a-f0-9]{40}$/i;
const BOT=41898282,APP=15368;
const WORKFLOW='hh-pr-ten-minute-watchdog.yml';
const CHECK='core-lint-types-build';
export const STAGES=['OWNER_APPROVED','DISPATCH_ACCEPTED','RUNNER_STARTED',
 'PATCH_VERIFIED','COMMIT_PUBLISHED','CI_RUNNING','CI_GREEN','MERGED',
 'DEPLOYED_SHA_VERIFIED','LIVE_VERIFIED'];
export const EXECUTORS=[
 {id:'auto_free_repair',name:'Auto Free Repair',automatic:true},
 {id:'chatgpt_work',name:'ChatGPT Work handoff',automatic:false},
 {id:'codex_host',name:'Codex Host (requires OAuth/runtime)',automatic:false}
];
const positive=n=>Number.isSafeInteger(n)&&n>0&&n<=99999999;
export const validSha=s=>typeof s==='string'&&SHA.test(s);
export const validPr=n=>positive(n);
const urlOf=n=>'https://github.com/'+REPO+'/pull/'+n;
const error=(reason,other={})=>({status:'blocked',reason,...other});
async function responseJson(response,max=390000){
 if(!response?.ok)return null;
 if(Number(response.headers?.get?.('content-length')||0)>max)return null;
 const text=await response.text();
 if(typeof text!=='string'||Buffer.byteLength(text,'utf8')>max)return null;
 try{return JSON.parse(text);}catch{return null;}
}
async function getGithub(path,{fetcher=fetch,token=null}={}){
 const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(token)headers.Authorization='Bearer '+token;
 let response;
 try{response=await fetcher(BASE+path,{method:'GET',cache:'no-store',
  redirect:'error',headers,signal:AbortSignal.timeout(7000)});}
 catch{return {error:'GITHUB_UNAVAILABLE'};}
 if(!response?.ok)return {error:'GITHUB_HTTP_'+String(response?.status||'UNKNOWN')};
 let data;
 try{data=await responseJson(response);}catch{return {error:'GITHUB_BAD_RESPONSE'};}
 if(!data)return {error:'GITHUB_BAD_RESPONSE'};
 return {data};
}
function trustedBot(c){
 return c?.user?.id===BOT&&c.user?.login==='github-actions[bot]'&&
 c.user?.type==='Bot'&&c.performed_via_github_app?.id===APP&&
 c.performed_via_github_app.slug==='github-actions';
}
export function hasExactSourceFailure(comments,sha){
 if(!Array.isArray(comments)||!validSha(sha)||comments.length>=100)return false;
 const marker='<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->\n';
 return comments.some(c=>trustedBot(c)&&typeof c.body==='string'&&
  c.body.startsWith(marker)&&/^Failed jobs: ([^\n]+)$/m.test(c.body)&&
  c.body.match(/^Failed jobs: ([^\n]+)$/m)[1].split(',')
   .some(name=>name.trim().replace(/\.$/,'')===CHECK));
}
export function selectFailedCore(checks,sha){
 if(!checks||!Number.isSafeInteger(checks.total_count)||
  checks.total_count<1||checks.total_count>100||
  !Array.isArray(checks.check_runs)||checks.check_runs.length!==checks.total_count)
  return null;
 const candidates=checks.check_runs.filter(c=>c?.app?.id===APP&&
  c.name===CHECK&&c.head_sha===sha&&c.status==='completed'&&
  ['failure','timed_out','startup_failure'].includes(c.conclusion));
 if(!candidates.length)return null;
 candidates.sort((a,b)=>String(b.completed_at||'').localeCompare(String(a.completed_at||'')));
 const first=candidates[0];
 const run=/^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/([1-9]\d+)(?:\/.*)?$/.exec(first.details_url||'');
 if(!Number.isSafeInteger(first.id)||first.id<=0||!run)return null;
 return {checkId:first.id,runId:Number(run[1]),conclusion:first.conclusion,
  completedAt:first.completed_at||null,runUrl:'https://github.com/'+REPO+'/actions/runs/'+run[1],
  detailsUrl:first.details_url};
}
export async function inspectAutoRepairPR({number,expectedSha=null,fetcher=fetch}={}){
 if(!validPr(number)||(expectedSha!==null&&!validSha(expectedSha)))return error('INVALID_PR_TARGET');
 const found=await getGithub('/pulls/'+number,{fetcher});
 if(found.error)return error(found.error);
 const p=found.data,head=p?.head?.sha;
 if(p.number!==number||p.html_url!==urlOf(number)||p.state!=='open'||p.draft||
  p.base?.ref!=='codex/public-book-library'||p.head?.repo?.full_name!==REPO||
  p.user?.login!=='andylitvinov-design'||!validSha(head))
  return error('PR_NOT_ELIGIBLE');
 if(expectedSha&&head!==expectedSha)return error('STALE_HEAD',{headSha:head});
 const labels=new Set((p.labels||[]).map(x=>x.name));
 if(!labels.has('hh:repair-needed')||['hh:repair-manual','hh:hold','hh:blocked',
  'hh:worker-claimed','hh:direction-override:invalid'].some(x=>labels.has(x)))
  return error('PR_HOLD_OR_NOT_ROUTED',{headSha:head});
 if(p.mergeable!==true||!['clean','blocked','behind'].includes(p.mergeable_state))
  return error('MERGEABILITY_UNVERIFIED',{headSha:head});
 const [checkReply,commentsReply]=await Promise.all([
  getGithub('/commits/'+head+'/check-runs?per_page=100',{fetcher}),
  getGithub('/issues/'+number+'/comments?per_page=100',{fetcher})
 ]);
 if(checkReply.error||commentsReply.error)
  return error(checkReply.error||commentsReply.error,{headSha:head});
 const failure=selectFailedCore(checkReply.data,head);
 if(!failure)return error('CURRENT_HEAD_CORE_FAILURE_UNVERIFIED',{headSha:head});
 if(!hasExactSourceFailure(commentsReply.data,head))
  return error('SIGNED_WATCHDOG_SOURCE_PROOF_MISSING',{headSha:head});
 return {status:'ready',prNumber:number,prUrl:urlOf(number),headSha:head,
  failure,observedAt:new Date().toISOString(),
  note:'The trusted dispatcher must independently recheck all gates and sign the reservation.'};
}
export function executorReadiness(executor,{env=process.env}={}){
 if(!EXECUTORS.some(x=>x.id===executor))return error('EXECUTOR_UNKNOWN');
 if(executor==='chatgpt_work')return {status:'handoff_only',canLaunch:false};
 if(executor==='codex_host')return error('CODEX_HOST_OAUTH_RUNTIME_INFERENCE_NOT_VERIFIED');
 if(env?.VERCEL_ENV!=='production')return error('PRODUCTION_ONLY');
 if(!env?.HH_PR_CRON_DISPATCH_TOKEN)
  return error('GITHUB_ACTIONS_WRITE_TOKEN_NOT_CONFIGURED');
 return {status:'configured_permission_unverified',canLaunch:true};
}
export async function dispatchTrustedRepair({candidate,token,fetcher=fetch}={}){
 if(!candidate||candidate.status!=='ready'||!validPr(candidate.prNumber)||
    !validSha(candidate.headSha)||typeof token!=='string'||!token.trim())
  return error('DISPATCH_PREFLIGHT_INVALID');
 const wf=await getGithub('/actions/workflows/'+WORKFLOW,{fetcher,token});
 if(wf.error)return error(wf.error==='GITHUB_HTTP_403'?'GITHUB_ACTIONS_WRITE_DENIED':wf.error);
 if(wf.data?.state!=='active'||wf.data?.path!=='.github/workflows/'+WORKFLOW)
  return error('TRUSTED_WORKFLOW_NOT_ACTIVE');
 const inputs={pm_pr_number:String(candidate.prNumber),pm_expected_sha:candidate.headSha,
  dry_run:'false'};
 let response;
 try{
  response=await fetcher(BASE+'/actions/workflows/'+WORKFLOW+'/dispatches',{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2026-03-10',Authorization:'Bearer '+token,
    'Content-Type':'application/json'},
   body:JSON.stringify({ref:'codex/bootstrap-books',inputs,return_run_details:true}),
   signal:AbortSignal.timeout(12000)
  });
 }catch{
  // The request may have been delivered: never automatically send it again.
  return {status:'unconfirmed',reason:'DISPATCH_DELIVERY_AMBIGUOUS_NO_RETRY'};
 }
 if(response?.status===403)return error('GITHUB_ACTIONS_WRITE_DENIED');
 if(response?.status===401)return error('GITHUB_TOKEN_REJECTED');
 if(response?.status===422)return error('WATCHDOG_INPUTS_NOT_DEPLOYED_ON_CONTROL_BRANCH');
 if(response?.status===429)return error('GITHUB_RATE_LIMIT');
 if(response?.status===204)
  return {status:'accepted_uncorrelated',reason:'NO_WORKFLOW_RUN_ID_NO_AUTOMATIC_RETRY'};
 if(response?.status!==200)return error('GITHUB_DISPATCH_HTTP_'+String(response?.status||'UNKNOWN'));
 let body;
 try{body=await responseJson(response,10000);}catch{return {status:'unconfirmed',reason:'DISPATCH_RESPONSE_UNVERIFIED'};}
 const id=body?.workflow_run_id;
 if(!Number.isSafeInteger(id)||id<=0||
    body.html_url!=='https://github.com/'+REPO+'/actions/runs/'+id)
  return {status:'unconfirmed',reason:'DISPATCH_RUN_ID_UNVERIFIED'};
 return {status:'accepted',workflowRunId:id,workflowRunUrl:body.html_url,
  acceptedAt:new Date().toISOString(),sourceHead:candidate.headSha};
}
export function prepareChatgptHandoff({task,pr,failure}){
 if(!task||!validPr(pr?.prNumber)||!validSha(pr?.headSha))return null;
 const title=String(task.title||'').slice(0,140);
 const acceptance=String(task.acceptance||'').slice(0,800);
 return [
 'ChatGPT Work — HOLISTIC HOUSE CODE REPAIR (HANDOFF ONLY, NOT EXECUTION)',
 'Repository: '+REPO,
 'Protected production branch: codex/public-book-library',
 'Control branch: codex/bootstrap-books',
 'Task: '+title,
 'Acceptance: '+acceptance,
 'PR: '+urlOf(pr.prNumber),
 'Expected exact HEAD: '+pr.headSha,
 'Failed Core run: '+(failure?.runUrl||'UNVERIFIED'),
 'Failure: '+(failure?.conclusion||'UNVERIFIED'),
 'Read AGENTS.md, docs/operations/CI_RELEASE_POLICY.md and GLOBAL_PR_ONE_PUBLISH_V1 first.',
 'Inspect current SHA and complete authenticated CI logs. Never trust an old HEAD.',
 'Respect the current PR writer lease, signed reservations, safety allowlists and one atomic repair commit.',
 'Run focused tests, independent Core/Specialist/hh-merge-check and guarded native auto-merge.',
 'Verify deployed SHA ancestry plus functional LIVE smoke, never assume READY means LIVE.',
 'ZERO NEW PAID SERVICES. Do not reveal credentials or submit private client data.',
 'If blocked, report exact reason; no fake commit, dispatch or LIVE.'
 ].join('\n');
}
export async function inspectWatchdogRun({runId,token,fetcher=fetch}={}){
 if(!Number.isSafeInteger(runId)||runId<=0)return error('INVALID_RUN_ID');
 const w=await getGithub('/actions/runs/'+runId,{fetcher,token});
 if(w.error)return error(w.error);
 const x=w.data;
 if(x?.id!==runId||x?.name!=='HH PR 10-minute watchdog'||
  x?.event!=='workflow_dispatch'||x?.head_branch!=='codex/bootstrap-books')
  return error('WATCHDOG_RUN_IDENTITY_MISMATCH');
 return {status:'observed',stage:'DISPATCH_ACCEPTED',workflowRunId:runId,
  workflowRunUrl:x.html_url,workflowState:x.status,
  conclusion:x.conclusion||null,createdAt:x.created_at||null,updatedAt:x.updated_at||null,
  note:'Watchdog run is not proof that Repair Worker began or published a patch.'};
}
