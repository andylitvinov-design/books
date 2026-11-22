'use strict';
/* HH PM GITHUB FREE INBOX V1
 * Read-only owner technical commands on public Issue #3890.
 * Runs INSIDE existing trusted scheduled Watchdog job: no new cron or workflow.
 * Never runs PR source code, never exposes OpenRouter secret, never claims a commit.
 */
const OWNER='andylitvinov-design', REPO='books', ISSUE=3890;
const MAX_DAILY=12, MAX_BODY=1200, MAX_SOURCE_COMMAND=2800, MAX_HISTORY=300, MAX_AGE=24*3600*1000;
const MARKER='HH_PM_INBOX_STATE_V1', SHA=/^[0-9a-f]{40}$/i;
const PREFIX='https://github.com/'+OWNER+'/'+REPO;
const trim=(s,n=MAX_BODY)=>String(s||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').trim().slice(0,n);
const nowMs=t=>Date.parse(t||'');
function ownerComment(c){
 return c?.user?.login===OWNER && c.user?.id===274943885 && c.user?.type==='User' &&
   Number.isSafeInteger(c.id)&&c.id>0 && typeof c.body==='string' &&
   Number.isFinite(nowMs(c.created_at));
}
function trustedReceipt(c){
 if(c?.user?.id!==41898282 || c.user?.login!=='github-actions[bot]' ||
   c.user?.type!=='Bot'||c.performed_via_github_app?.id!==15368||
   c.performed_via_github_app?.slug!=='github-actions'||typeof c.body!=='string')return null;
 const m=/^<!-- HH_PM_INBOX_STATE_V1 comment=([1-9]\d*) status=([A-Z_]+) -->/.exec(c.body);
 return m?{commentId:Number(m[1]),status:m[2],createdAt:c.created_at}:null;
}
function command(c){
 if(!ownerComment(c))return null;
 const body=c.body.trim();
 if(body.startsWith('!pm ask ')){
   const prompt=trim(body.slice('!pm ask '.length));
   if(prompt.length<5||prompt.length>MAX_BODY)return null;
   return {id:c.id,kind:'ask',text:prompt,createdAt:c.created_at};
 }
 if(body.startsWith('!pm source ')){
   const raw=body.slice('!pm source '.length).trim();
   if(raw.length<120||raw.length>MAX_SOURCE_COMMAND)return null;
   if(/(?:github_pat_|ghp_|sk-[A-Za-z0-9_-]{18,}|-----BEGIN [^-]*PRIVATE KEY|authorization\s*:\s*bearer|api[_-]?key\s*[:=])/i.test(raw))return null;
   try {
     const task=require('./ci-pr-commander-source-task.cjs').parseTask(raw);
     if(task.public_technical_only!==true)return null;
     const expected=task.mode==='literal'?
      ['task_id','target_base','expected_base_sha','path','title','mode','find','replace','public_technical_only']:
      ['task_id','target_base','expected_base_sha','path','title','mode','instruction','public_technical_only'];
     if(Object.keys(task).sort().join(',')!==expected.sort().join(','))return null;
     return {id:c.id,kind:'source',task,createdAt:c.created_at};
   }catch(_){return null;}
 }
 // Owner-facing PR completion takes a number only; HEAD is fetched from GitHub.
 const live=/^!pm (?:live|complete)\s+#?([1-9]\d{0,7})\s*$/i.exec(body);
 if(live)return {id:c.id,kind:'live',pr:Number(live[1]),createdAt:c.created_at};
 const m=/^!pm repair\s+#?(\d{1,8})\s+([a-f0-9]{40})\s*$/i.exec(body);
 if(m && Number(m[1])>0)return {id:c.id,kind:'repair',pr:Number(m[1]),sha:m[2].toLowerCase(),createdAt:c.created_at};
 return null;
}
function pending(comments,now=Date.now()){
 if(!Array.isArray(comments))return {status:'INVALID_COMMENTS'};
 const receipts=new Set(comments.map(trustedReceipt).filter(Boolean).map(x=>x.commentId));
 const commands=comments.map(command).filter(Boolean).filter(c=>{
   const age=now-nowMs(c.createdAt);
   return age>=0&&age<=MAX_AGE && !receipts.has(c.id);
 });
 commands.sort((a,b)=>nowMs(a.createdAt)-nowMs(b.createdAt)||a.id-b.id);
 const used=comments.map(trustedReceipt).filter(Boolean).filter(x=>x.status==='CLAIMED'&&now-nowMs(x.createdAt)<MAX_AGE&&now-nowMs(x.createdAt)>=0).length;
 return {status:'OK',next:commands[0]||null,used,pending:commands.length};
}
const claimBody=(cmd,run)=>'<!-- '+MARKER+' comment='+cmd.id+' status=CLAIMED -->\n'+
  'Owner PM request claimed by the existing trusted Watchdog run '+run+
  '. This is NOT a source commit or confirmed model reply.';
const resultBody=(cmd,result,run)=>{
 if(cmd.kind==='live'){
  const state=result.merged?'MERGED':result.watching?'WATCHING':'BLOCKED';
  const description=result.merged?
   'PR #'+cmd.pr+' merged on GitHub; merge SHA '+result.mergeSha+
   '; '+PREFIX+'/pull/'+cmd.pr+'. Production LIVE requires separate verification.':
   result.watching?
   'Tracking PR #'+cmd.pr+' at exact HEAD '+result.sha+'. '+
   trim(result.reason||'EXISTING_CI_AND_PROTECTED_AUTO_MERGE',160)+
   '. This is not a verified model patch, CI success or merge.':
   'PR #'+cmd.pr+' not started: '+trim(result.reason||'UNVERIFIED',120);
  return '<!-- '+MARKER+' comment='+cmd.id+' status='+state+' -->\n'+
   '**PR Completion · '+state+'**\n\n'+description+
   '\n\nOriginal owner request: '+PREFIX+'/issues/'+ISSUE+'#issuecomment-'+cmd.id+
   '\nTrusted Watchdog: '+run;
 }
 const state=result.ok?'REPLIED':result.dispatched?'DISPATCH_ACCEPTED_UNCORRELATED':result.watching?'WATCHING':'BLOCKED';
 const head='<!-- '+MARKER+' comment='+cmd.id+' status='+state+' -->\n';
 const summary=result.ok?'**OpenRouter Free · ответ на технический вопрос**':
   result.dispatched?(cmd.kind==='source'?'**Source Worker dispatch accepted; source commit NOT yet verified**':
    '**Repair Worker dispatch accepted; source commit NOT yet verified**'):
   result.watching?'**PR source repair waiting for a verified worker slot**':'**Agent request blocked**';
 const text=result.ok?trim(result.text,2300):result.dispatched?
   (cmd.kind==='source'?
    'Existing owner Source Worker workflow_dispatch accepted for public technical task '+cmd.task.task_id+
    '. No source SHA, draft PR, CI, merge or LIVE is yet verified. Check the linked Actions workflow.':
    'Request accepted by GitHub Actions for PR #'+cmd.pr+' exact HEAD '+cmd.sha+
    '. This is NOT runner start, patch, commit, CI green, merge, or LIVE.'):
   (result.watching?'Existing signed PR queue will retry when eligible, without another CI or model wave. No source commit or merge is claimed. Reason: ':'Reason: ')+trim(result.reason||'UNKNOWN',140);
 const billing=result.ok&&typeof result.cost==='number'&&result.cost===0?
   '\n\nModel: '+trim(result.model,120)+' · verified provider cost: $0':'';
 return head+summary+'\n\n'+text+billing+'\n\n'+
  'Source: '+PREFIX+'/issues/'+ISSUE+'#issuecomment-'+cmd.id+
  '\nTrusted run: '+run+'\nSTATUS: '+state+
  '\nNo code change is inferred from this message. Public technical discussion only.';
};
async function comments(github){
 const detail=await github.rest.issues.get({owner:OWNER,repo:REPO,issue_number:ISSUE});
 const issue=detail.data;
 if(issue?.number!==ISSUE||issue.state!=='open'||issue.user?.login!==OWNER||
   typeof issue.body!=='string'||!issue.body.startsWith('<!-- HH_PM_PUBLIC_AGENT_INBOX_V1 -->')||
   !Number.isSafeInteger(issue.comments)||issue.comments<0)return {error:'ISSUE_IDENTITY_UNVERIFIED'};
 if(issue.comments>MAX_HISTORY)return {error:'COMMENT_HISTORY_OVERFLOW_MANUAL_REVIEW'};
 const pages=Math.max(1,Math.ceil(issue.comments/100)),all=[];
 for(let page=1;page<=pages;page++){
   const response=await github.rest.issues.listComments({owner:OWNER,repo:REPO,issue_number:ISSUE,per_page:100,page});
   if(!Array.isArray(response.data))return {error:'INCOMPLETE_COMMENT_PAGE'};
   all.push(...response.data);
 }
 if(all.length!==issue.comments)return {error:'COMMENT_HISTORY_CHANGED'};
 return {comments:all};
}
async function send(github,body){
 const r=await github.rest.issues.createComment({owner:OWNER,repo:REPO,issue_number:ISSUE,body});
 if(!Number.isSafeInteger(r?.data?.id)||r.data.id<=0)return false;
 return true;
}
async function askFree(prompt,{fetcher,token,run}){
 if(typeof token!=='string'||!token.trim())return {reason:'OPENROUTER_FREE_SECRET_NOT_AVAILABLE'};
 const messages=[
  {role:'system',content:'Answer only a public technical project-management question in Russian. Produce a SHORT final user-visible TEXT answer directly, without analysis or reasoning. No private data, no code tools, no credentials, no speculative agent-commit claims. Provide safe next step and say when proof is unknown. Never execute code.'},
  {role:'user',content:prompt}
 ];
 // A virtual free router can select a reasoning-only/non-chat endpoint,
 // returning HTTP 400 despite a valid public question. Before inference,
 // select ONE actual role-suitable text-chat model with every catalog price
 // explicitly zero. No secret is used for this read-only catalog GET.
 const {CHAT_CATALOG,chooseVerifiedFreeModel}=require('./ci-pr-repair-openrouter-free.cjs');
 let selected;
 try{
  const listing=await fetcher(CHAT_CATALOG,{
   method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000),
   headers:{Accept:'application/json'}});
  if(!listing?.ok)return {reason:'OPENROUTER_FREE_CATALOG_UNAVAILABLE'};
  selected=chooseVerifiedFreeModel(await listing.json(),{role:'pm'}).model;
 }catch(_){return {reason:'OPENROUTER_NO_VERIFIED_FREE_PM_MODEL'};}
 // Keep the same bounded deadline through both HTTP headers and body;
 // otherwise slow free completions looked like corrupt 200 responses.
 const signal=AbortSignal.timeout(115000);
 let response;
 try{
  response=await fetcher('https://openrouter.ai/api/v1/chat/completions',{
   method:'POST',redirect:'error',cache:'no-store',signal,
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',
    'HTTP-Referer':'https://holistic-house-pr-monitor.vercel.app',
    'X-Title':'HH PM GitHub Free Agent'},
   // The same portable payload used by source Repair: no optional
   // modalities, n, reasoning hints, cross-model fallbacks or paid models.
   body:JSON.stringify({model:selected,messages,max_tokens:2200,
    stream:false,usage:{include:true},
    provider:{allow_fallbacks:false,max_price:{prompt:0,completion:0},
     data_collection:'deny'}})
  });
 }catch(error){
  return {reason:signal.aborted||['AbortError','TimeoutError'].includes(error?.name)?
   'OPENROUTER_RESPONSE_TIMEOUT_UNVERIFIED':'OPENROUTER_NETWORK_UNKNOWN_NO_RETRY'};
 }
 if(!response?.ok)return {reason:'OPENROUTER_HTTP_'+String(response?.status||'UNKNOWN')};
 let data;
 try{data=await response.json();}
 catch(error){
  if(signal.aborted||['AbortError','TimeoutError'].includes(error?.name))
   return {reason:'OPENROUTER_RESPONSE_TIMEOUT_UNVERIFIED'};
  return {reason:'OPENROUTER_RESPONSE_INVALID'};
 }
 // Error envelopes must never be counted as paid, free, or successful answers.
 if(data?.error)return {reason:'OPENROUTER_PROVIDER_ERROR'};
 const cost=data?.usage?.cost;
 if(typeof cost!=='number'||!Number.isFinite(cost))return {reason:'MODEL_BILLING_UNVERIFIED_HOLD'};
 if(cost!==0||data?.usage?.is_byok===true)return {reason:'MODEL_REPORTED_NONZERO_COST_HOLD'};
 if(data?.model!==selected)return {reason:'MODEL_ROUTING_NOT_VERIFIED_FREE'};
 const raw=data?.choices?.[0]?.message?.content;
 const text=typeof raw==='string'?raw:Array.isArray(raw)?
  raw.filter(p=>p&&p.type==='text'&&typeof p.text==='string').map(p=>p.text).join('\n'):'';
 if(!text.trim()){
  const finish=String(data?.choices?.[0]?.finish_reason||'UNKNOWN');
  const completion=Number(data?.usage?.completion_tokens||0),reasoning=Number(data?.usage?.completion_tokens_details?.reasoning_tokens||0);
  const reason=finish==='length'&&reasoning>=completion*0.8&&completion>0?
   'OPENROUTER_REASONING_EXHAUSTED_VISIBLE_BUDGET':'OPENROUTER_EMPTY_RESPONSE';
  return {reason};
 }
 return {ok:true,text,model:selected,cost};
}
async function trustedRepair(github,cmd){
 let pr;try{pr=(await github.rest.pulls.get({owner:OWNER,repo:REPO,pull_number:cmd.pr})).data;}catch(_){return {reason:'PR_LOOKUP_UNAVAILABLE'};}
 if(pr?.number!==cmd.pr||pr.state!=='open'||pr.draft!==false||
  pr.user?.login!==OWNER||pr.head?.repo?.full_name!==OWNER+'/'+REPO||
  pr.head?.sha!==cmd.sha||pr.base?.ref!=='codex/public-book-library'||
  pr.mergeable!==true||!['clean','blocked','behind'].includes(pr.mergeable_state))
  return {reason:'PR_NOT_CURRENT_ELIGIBLE'};
 const labels=new Set((pr.labels||[]).map(x=>x.name));
 if(!labels.has('hh:repair-needed')||
   ['hh:hold','hh:blocked','hh:repair-manual','hh:worker-claimed'].some(x=>labels.has(x)))
  return {reason:'REPAIR_NOT_ROUTED_OR_HELD'};
 const proof=await require('./ci-pr-owner-source-proof.cjs')
  .signedCoreSourceProof(github,cmd.pr,cmd.sha);
 if(proof.verified!==true)return {reason:proof.reasonCode};
 return {ok:true};
}
// Only trusted default-branch Watchdog code calls this helper after the
// private OIDC CAS or authenticated GitHub owner comment has been verified.
// It reuses the existing single writer, exact-HEAD reservation, source-proof,
// runner-capacity and protected merge gates; no extra Watchdog/PAT dispatch.
async function dispatchOwnerQueue(github,core,context,{pr,sha,ownerProof}={}){
 if(!Number.isSafeInteger(pr)||pr<1||pr>99999999||!SHA.test(sha||''))
  return {reason:'OWNER_DIRECT_INVALID_TARGET'};
 let outcome;
 try{
  outcome=await require('./ci-pr-queue-dispatcher.cjs').run({
   github,core,context,manualTarget:{prNumber:pr,expectedSha:sha},
   ownerProof});
 }catch(_){return {reason:'OWNER_DIRECT_QUEUE_UNAVAILABLE'};}
 if(outcome?.dispatchAccepted===1&&outcome?.repairDispatchAccepted===1)
  return {dispatched:true,reason:'OWNER_DIRECT_QUEUE_DISPATCH_ACCEPTED'};
 if(ownerProof?.source==='OIDC_SIGNED_QUEUE'&&
    outcome?.dispatchAccepted===1&&outcome?.legacyDispatchAccepted===1)
  return {dispatched:true,reason:'OWNER_DIRECT_MACHINE_RETRY_DISPATCH_ACCEPTED'};
 const candidate=Object.keys(outcome?.blocked||{})[0]||
  String(outcome?.reason||'NOT_ADMITTED').replace(/^INVENTORY_UNVERIFIED:\\s*/,'');
 const reason=/^[A-Z0-9_]{3,60}$/.test(candidate)?candidate:'NOT_ADMITTED';
 return {reason};
}
async function dispatchRepair(github,cmd,{ownerToken,fetcher=fetch,dispatchDirect=null}={}){
 const trusted=await trustedRepair(github,cmd);
 if(!trusted.ok)return trusted;
 // A validated owner command inside Watchdog uses its existing trusted
 // single-writer dispatcher and GITHUB_TOKEN Actions write permission.
 // No nested owner PAT workflow_dispatch (which currently returns HTTP 403).
 // The normal dispatcher still signs the exact-HEAD reservation, checks
 // failed Core source proof and admits only an available real Repair slot.
 if(typeof dispatchDirect==='function'){
  let result;
  try{result=await dispatchDirect({pr:cmd.pr,sha:cmd.sha});}
  catch(_){return {reason:'OWNER_REPAIR_DIRECT_QUEUE_UNAVAILABLE'};}
  if(result?.dispatched===true&&result.reason==='OWNER_DIRECT_QUEUE_DISPATCH_ACCEPTED')
   return {dispatched:true,reason:'OWNER_DIRECT_QUEUE_DISPATCH_ACCEPTED'};
  const cause=typeof result?.reason==='string'&&
    /^[A-Z0-9_]{3,75}$/.test(result.reason)?result.reason:'NOT_ADMITTED';
  // Capacity was not admitted: preserve the current-head owner intent as
  // WATCHING while the existing signed queue handles future eligible slots.
  // Real safety denials still return BLOCKED and are never retried here.
  const waiting=new Set(['CAPACITY_UNVERIFIED','CAPACITY_UNKNOWN',
   'GHOST_WORKER_BUSY','WORKER_BUSY','RUNNERS_SATURATED','JOBS_SATURATED',
   'CORE_PRIORITY_PENDING','RESERVED_REQUIRES_REVIEW',
   'CLAIMED_AWAITING_OUTCOME']);
  return {dispatched:false,watching:waiting.has(cause),
   reason:'OWNER_REPAIR_DIRECT_'+cause};
 }
 // The bot GITHUB_TOKEN changes the workflow_dispatch actor to
 // github-actions[bot], which validOwnerRepairTarget deliberately rejects.
 if(typeof ownerToken!=='string'||!ownerToken.trim())
  return {reason:'OWNER_REPAIR_DISPATCH_TOKEN_NOT_CONFIGURED'};
 // A 204 dispatch is not proof that the resulting Actions run was authorized.
 // The trusted dispatcher accepts ONLY the actual repository owner as actor.
 // Read back token identity before consuming a new workflow or CI capacity.
 try{
  const response=await fetcher('https://api.github.com/user',{
   method:'GET',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(7000),
   headers:{Authorization:'Bearer '+ownerToken,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'}
  });
  if(response?.status!==200)return {reason:'OWNER_REPAIR_TOKEN_IDENTITY_UNVERIFIED'};
  const user=await response.json();
  if(user?.login!==OWNER||user?.id!==274943885||user?.type!=='User')
   return {reason:'OWNER_REPAIR_DISPATCH_ACTOR_MISMATCH'};
 }catch(_){return {reason:'OWNER_REPAIR_TOKEN_IDENTITY_UNVERIFIED'};}
 const requestId=require('node:crypto').randomUUID();
 const endpoint='https://api.github.com/repos/'+OWNER+'/'+REPO+
  '/actions/workflows/hh-pr-ten-minute-watchdog.yml/dispatches';
 try{
  const response=await fetcher(endpoint,{method:'POST',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(15000),headers:{
    Authorization:'Bearer '+ownerToken,Accept:'application/vnd.github+json',
    'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},
   body:JSON.stringify({ref:'codex/bootstrap-books',inputs:{
    pm_pr_number:String(cmd.pr),pm_expected_sha:cmd.sha,
    pm_request_id:requestId,dry_run:'false'}})});
  if(response?.status!==204)
   return {reason:'OWNER_REPAIR_DISPATCH_HTTP_'+String(response?.status||'UNKNOWN')};
 }catch(_){return {reason:'OWNER_REPAIR_DISPATCH_AMBIGUOUS_NO_RETRY'};}
 return {dispatched:true,reason:'OWNER_DISPATCH_ACCEPTED_UNCORRELATED'};
}
async function dispatchLive(github,cmd,{ownerToken,fetcher=fetch,dispatchDirect=null}={}){
 let pr;try{pr=(await github.rest.pulls.get({owner:OWNER,repo:REPO,pull_number:cmd.pr})).data;}
 catch(_){return {reason:'GITHUB_PR_READ_UNAVAILABLE'};}
 if(pr?.number!==cmd.pr||pr.base?.ref!=='codex/public-book-library'||
   pr.head?.repo?.full_name!==OWNER+'/'+REPO||!SHA.test(pr.head?.sha||''))
  return {reason:'UNVERIFIED_PROTECTED_PR'};
 if(pr.state==='closed'){
  if(pr.merged===true&&Number.isFinite(Date.parse(pr.merged_at||''))&&
    SHA.test(pr.merge_commit_sha||''))
   return {merged:true,mergeSha:pr.merge_commit_sha};
  return {reason:'PR_CLOSED_WITHOUT_VERIFIED_MERGE'};
 }
 if(pr.state!=='open'||pr.draft===true)return {reason:'PR_NOT_READY'};
 const labels=new Set((pr.labels||[]).map(x=>x.name));
 if(labels.has('hh:hold')||labels.has('hh:blocked'))
  return {watching:true,sha:pr.head.sha,reason:'OWNER_HOLD_NOT_OVERRIDDEN'};
 if(labels.has('hh:repair-needed')&&pr.mergeable===true){
  const repair=await dispatchRepair(github,{...cmd,sha:pr.head.sha},{ownerToken,fetcher,dispatchDirect});
  // Propagate HTTP 204 dispatch acceptance, but never conflate it with
  // runner start, model call, source patch, green CI or protected merge.
  return {watching:true,sha:pr.head.sha,dispatched:repair.dispatched===true,
   reason:repair.reason||'VERIFIED_SOURCE_DISPATCH_PENDING'};
 }
 return {watching:true,sha:pr.head.sha,
  reason:pr.mergeable===false?'CONFLICT_REQUIRES_SEMANTIC_OWNER_REVIEW':
   'EXISTING_CI_AND_PROTECTED_AUTO_MERGE'};
}

async function observeLive(github,comments,now=Date.now()){
 const receipts=comments.map(trustedReceipt).filter(Boolean);
 // Track accepted owner repair commands until GitHub independently proves a
 // merge or closure. Do NOT redispatch here: only the guarded exact-HEAD
 // queue dispatcher may retry and reserve another source writer.
 const active=comments.map(command).filter(c=>['live','repair'].includes(c?.kind)&&
   receipts.some(r=>r.commentId===c.id&&r.status==='WATCHING')&&
   !receipts.some(r=>r.commentId===c.id&&
     ['MERGED','CLOSED_UNMERGED','EXPIRED_UNVERIFIED'].includes(r.status)))
   .sort((a,b)=>nowMs(a.createdAt)-nowMs(b.createdAt)||a.id-b.id);
 if(!active.length)return {status:'NO_PENDING'};
 // Rotate the first three reads so one long-running PR cannot starve others.
 const start=Math.floor(now/1200000)%active.length;
 const selected=[...active.slice(start),...active.slice(0,start)].slice(0,3);
 let sent=0,open=0,unknown=0;
 for(const cmd of selected){
  let state='',detail='';
  if(now-nowMs(cmd.createdAt)>30*86400000){
   state='EXPIRED_UNVERIFIED';detail='PR #'+cmd.pr+' exceeded tracking retention without verified merge.';
  }else{
   let pr;try{pr=(await github.rest.pulls.get({owner:OWNER,repo:REPO,pull_number:cmd.pr})).data;}
   catch(_){unknown++;continue;}
   if(pr?.number!==cmd.pr||pr.base?.ref!=='codex/public-book-library'){unknown++;continue;}
   if(pr.state==='closed'&&pr.merged===true&&
      Number.isFinite(Date.parse(pr.merged_at||''))&&SHA.test(pr.merge_commit_sha||'')){
    state='MERGED';
    detail='GitHub PR #'+cmd.pr+' merged at '+pr.merged_at+
     '; verified merge SHA '+pr.merge_commit_sha+
     '; '+PREFIX+'/pull/'+cmd.pr+'. Production LIVE not yet verified.';
   }else if(pr.state==='closed'&&pr.merged!==true){
    state='CLOSED_UNMERGED';detail='PR #'+cmd.pr+' closed without GitHub merge. LIVE not claimed.';
   }else{open++;continue;}
  }
  const text='<!-- '+MARKER+' comment='+cmd.id+' status='+state+' -->\n'+
   '**PR Completion · '+state+'**\n\n'+detail+
   '\n\nOriginal request '+PREFIX+'/issues/'+ISSUE+'#issuecomment-'+cmd.id;
  try{if(!await send(github,text))return {status:'NOTICE_UNCONFIRMED'};}
  catch(_){return {status:'NOTICE_UNCONFIRMED'};}
  sent++;
 }
 return {status:sent?'COMPLETION_NOTICE_SENT':'WATCHING',sent,open,unknown,tracked:active.length};
}
async function dispatchSource(github,cmd,{ownerToken,fetcher=fetch}={}){
 const task=cmd?.task;
 if(!task||task.public_technical_only!==true)return {reason:'PUBLIC_TECHNICAL_APPROVAL_MISSING'};
 if(typeof ownerToken!=='string'||!ownerToken.trim())return {reason:'OWNER_SOURCE_DISPATCH_TOKEN_NOT_CONFIGURED'};
 try{
   const branch=(await github.rest.repos.getBranch({owner:OWNER,repo:REPO,branch:task.target_base})).data;
   if(branch?.commit?.sha!==task.expected_base_sha)return {reason:'SOURCE_BASE_SHA_MOVED'};
   const {branchName}=require('./ci-pr-commander-source-task.cjs');
   try{
     await github.rest.git.getRef({owner:OWNER,repo:REPO,ref:'heads/'+branchName(task)});
     return {reason:'SOURCE_TASK_BRANCH_ALREADY_EXISTS'};
   }catch(e){if(e?.status!==404)return {reason:'SOURCE_TASK_BRANCH_UNVERIFIED'};}
 }catch(_){return {reason:'SOURCE_PREFLIGHT_GITHUB_UNAVAILABLE'};}
 const endpoint='https://api.github.com/repos/'+OWNER+'/'+REPO+
  '/actions/workflows/hh-pr-repair-worker.yml/dispatches';
 try{
   const response=await fetcher(endpoint,{method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(15000),headers:{
     Authorization:'Bearer '+ownerToken,Accept:'application/vnd.github+json',
     'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},
    body:JSON.stringify({ref:'codex/bootstrap-books',inputs:{
     commander_source_task:JSON.stringify(task)}})});
   if(response?.status!==204)return {reason:'OWNER_SOURCE_DISPATCH_HTTP_'+String(response?.status||'UNKNOWN')};
   return {dispatched:true,reason:'SOURCE_WORKFLOW_DISPATCH_ACCEPTED_NOT_PROOF'};
 }catch(_){return {reason:'SOURCE_DISPATCH_AMBIGUOUS_NO_RETRY'};}
}
async function run({github,core,context,fetcher=fetch,token=undefined,
 ownerToken=undefined,ownerFetcher=fetch,dispatchDirect=null}={}){
 const issueComment=context.eventName==='issue_comment';
 const trustedIssueComment=issueComment&&context.payload?.issue?.number===ISSUE&&
  !context.payload?.issue?.pull_request&&context.payload?.comment?.user?.login===OWNER&&
  context.payload?.comment?.user?.id===274943885&&context.payload?.comment?.user?.type==='User';
 if(context?.repo?.owner!==OWNER||context?.repo?.repo!==REPO||
  context?.ref!=='refs/heads/codex/bootstrap-books'||
  !['schedule','workflow_dispatch','issue_comment'].includes(context.eventName)||
  (context.eventName==='workflow_dispatch'&&String(context.payload?.inputs?.dry_run||'false')==='true')||
  (issueComment&&!trustedIssueComment))
  return {status:'SKIPPED_UNTRUSTED_CONTEXT'};
 const runUrl=PREFIX+'/actions/runs/'+String(context.runId||'UNKNOWN');
 let snapshot;try{snapshot=await comments(github)}catch(_){return {status:'INBOX_FETCH_UNAVAILABLE'};}
 if(snapshot.error)return {status:snapshot.error};
 const pick=pending(snapshot.comments);
 if(pick.status!=='OK')return {status:pick.status};
 if(!pick.next)return observeLive(github,snapshot.comments);
 if(issueComment){
  const submitted=command(context.payload.comment);
  if(!submitted)return {status:'NO_OWNER_COMMAND'};
  if(pick.next.id!==submitted.id)return {status:'OLDER_COMMAND_PENDING',commandId:pick.next.id};
 }
 const cmd=pick.next;
 const cap=cmd.kind==='source'?3:cmd.kind==='repair'||cmd.kind==='live'?6:MAX_DAILY;
 if(pick.used>=cap)return {status:'INBOX_DAILY_CAP_HOLD',kind:cmd.kind,commandId:cmd.id};
 // Serialize by existing Watchdog job concurrency. Commit a durable claim
 // BEFORE any model/API call. Never retry ambiguous remote requests.
 try{if(!await send(github,claimBody(cmd,runUrl)))return {status:'CLAIM_NOT_CONFIRMED'};}
 catch(_){return {status:'CLAIM_UNAVAILABLE_NO_DISPATCH'};}
 let outcome;
 // The owner command was authenticated against GitHub issue #3890 above.
 // Only this claimed comment ID may become a same-run direct queue intent.
 const trustedDispatch=typeof dispatchDirect==='function'?
  target=>dispatchDirect({...target,ownerCommentId:cmd.id}):null;
 try{outcome=cmd.kind==='ask'?
  await askFree(cmd.text,{fetcher,token,run:runUrl}):cmd.kind==='source'?
  await dispatchSource(github,cmd,{ownerToken,fetcher:ownerFetcher}):cmd.kind==='live'?
  await dispatchLive(github,cmd,{ownerToken,fetcher:ownerFetcher,dispatchDirect:trustedDispatch}):
  await dispatchRepair(github,cmd,{ownerToken,fetcher:ownerFetcher,dispatchDirect:trustedDispatch});
 }catch(_){outcome={reason:'INBOX_EXECUTION_UNAVAILABLE_NO_RETRY'};}
 try{await send(github,resultBody(cmd,outcome,runUrl));}
 catch(_){return {status:'RESULT_COMMENT_UNCONFIRMED',kind:cmd.kind,commandId:cmd.id};}
 const finalStatus=outcome.merged?'MERGED':outcome.watching?'WATCHING':outcome.ok?'AI_REPLIED':outcome.dispatched?'DISPATCH_ACCEPTED_UNCORRELATED':'BLOCKED';
 if(core?.info)core.info('HH_PM_INBOX_RESULT '+JSON.stringify({
  commandId:cmd.id,kind:cmd.kind,status:finalStatus,
  reason:outcome.reason||null,model:outcome.model||null,
  cost:typeof outcome.cost==='number'&&Number.isFinite(outcome.cost)?outcome.cost:null,
  sourceCommitConfirmed:false
 }));
 return {status:finalStatus,kind:cmd.kind,commandId:cmd.id};
}
module.exports={run,ownerComment,trustedReceipt,command,pending,resultBody,askFree,dispatchSource,dispatchRepair,dispatchLive,dispatchOwnerQueue,observeLive};
