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
 const state=result.ok?'REPLIED':result.dispatched?'DISPATCH_ACCEPTED_UNCORRELATED':'BLOCKED';
 const head='<!-- '+MARKER+' comment='+cmd.id+' status='+state+' -->\n';
 const summary=result.ok?'**OpenRouter Free · ответ на технический вопрос**':
   result.dispatched?(cmd.kind==='source'?'**Source Worker dispatch accepted; source commit NOT yet verified**':
    '**Watchdog dispatch accepted; Repair Worker not yet verified**'):'**Agent request blocked**';
 const text=result.ok?trim(result.text,2300):result.dispatched?
   (cmd.kind==='source'?
    'Existing owner Source Worker workflow_dispatch accepted for public technical task '+cmd.task.task_id+
    '. No source SHA, draft PR, CI, merge or LIVE is yet verified. Check the linked Actions workflow.':
    'Request accepted by GitHub Actions for PR #'+cmd.pr+' exact HEAD '+cmd.sha+
    '. This is NOT runner start, patch, commit, CI green, merge, or LIVE.'):
   'Reason: '+trim(result.reason||'UNKNOWN',140);
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
 let response;
 try{
  response=await fetcher('https://openrouter.ai/api/v1/chat/completions',{
   method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(22000),
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',
    'HTTP-Referer':'https://holistic-house-pr-monitor.vercel.app',
    'X-Title':'HH PM GitHub Free Agent'},
   body:JSON.stringify({model:'openrouter/free',messages,max_tokens:1600,temperature:0.25,
    reasoning:{enabled:false,exclude:true},
    provider:{allow_fallbacks:false,max_price:{prompt:0,completion:0}},usage:{include:true}})
  });
 }catch(_){return {reason:'OPENROUTER_NETWORK_UNKNOWN_NO_RETRY'};}
 if(!response?.ok)return {reason:'OPENROUTER_HTTP_'+String(response?.status||'UNKNOWN')};
 let data;try{data=await response.json()}catch(_){return {reason:'OPENROUTER_RESPONSE_INVALID'};}
 const cost=data?.usage?.cost;
 if(typeof cost!=='number'||!Number.isFinite(cost))return {reason:'MODEL_BILLING_UNVERIFIED_HOLD'};
 if(cost!==0)return {reason:'MODEL_REPORTED_NONZERO_COST_HOLD'};
 const model=String(data?.model||'');
 if(model&&model!=='openrouter/free'&&!model.endsWith(':free'))return {reason:'MODEL_ROUTING_NOT_VERIFIED_FREE'};
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
 return {ok:true,text,model:model||'openrouter/free',cost};
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
 let proof;try{proof=await github.rest.issues.listComments({owner:OWNER,repo:REPO,issue_number:cmd.pr,per_page:100,page:1});}
 catch(_){return {reason:'SIGNED_SOURCE_PROOF_UNAVAILABLE'};}
 if(!Array.isArray(proof?.data)||proof.data.length>=100)return {reason:'SOURCE_PROOF_INCOMPLETE'};
 const marker='<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+cmd.sha+' -->\n';
 const signed=proof.data.some(c=>c.user?.id===41898282&&c.user?.login==='github-actions[bot]'&&
  c.user?.type==='Bot'&&c.performed_via_github_app?.id===15368&&
  c.performed_via_github_app?.slug==='github-actions'&&typeof c.body==='string'&&
  c.body.startsWith(marker)&&/^Failed jobs: ([^\n]+)$/m.test(c.body)&&
  c.body.match(/^Failed jobs: ([^\n]+)$/m)[1].split(',').some(s=>s.trim()==='core-lint-types-build'));
 if(!signed)return {reason:'SIGNED_FAILED_CORE_PROOF_MISSING'};
 return {ok:true};
}
async function dispatchRepair(github,cmd){
 const trusted=await trustedRepair(github,cmd);
 if(!trusted.ok)return trusted;
 const crypto=require('node:crypto'),requestId=crypto.randomUUID();
 try{
  await github.rest.actions.createWorkflowDispatch({
   owner:OWNER,repo:REPO,workflow_id:'hh-pr-ten-minute-watchdog.yml',
   ref:'codex/bootstrap-books',inputs:{pm_pr_number:String(cmd.pr),pm_expected_sha:cmd.sha,
    pm_request_id:requestId,dry_run:'false'}
  });
 }catch(_){return {reason:'DISPATCH_AMBIGUOUS_NO_RETRY'};}
 return {dispatched:true,reason:'DISPATCH_ACCEPTED_UNCORRELATED'};
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
 ownerToken=undefined,ownerFetcher=fetch}={}){
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
 if(pick.status!=='OK'||!pick.next)return {status:pick.status==='OK'?'NO_PENDING':pick.status};
 if(issueComment){
  const submitted=command(context.payload.comment);
  if(!submitted)return {status:'NO_OWNER_COMMAND'};
  if(pick.next.id!==submitted.id)return {status:'OLDER_COMMAND_PENDING',commandId:pick.next.id};
 }
 const cmd=pick.next;
 const cap=cmd.kind==='source'?3:cmd.kind==='repair'?6:MAX_DAILY;
 if(pick.used>=cap)return {status:'INBOX_DAILY_CAP_HOLD',kind:cmd.kind,commandId:cmd.id};
 // Serialize by existing Watchdog job concurrency. Commit a durable claim
 // BEFORE any model/API call. Never retry ambiguous remote requests.
 try{if(!await send(github,claimBody(cmd,runUrl)))return {status:'CLAIM_NOT_CONFIRMED'};}
 catch(_){return {status:'CLAIM_UNAVAILABLE_NO_DISPATCH'};}
 let outcome;
 try{outcome=cmd.kind==='ask'?
  await askFree(cmd.text,{fetcher,token,run:runUrl}):cmd.kind==='source'?
  await dispatchSource(github,cmd,{ownerToken,fetcher:ownerFetcher}):
  await dispatchRepair(github,cmd);
 }catch(_){outcome={reason:'INBOX_EXECUTION_UNAVAILABLE_NO_RETRY'};}
 try{await send(github,resultBody(cmd,outcome,runUrl));}
 catch(_){return {status:'RESULT_COMMENT_UNCONFIRMED',kind:cmd.kind,commandId:cmd.id};}
 if(core?.info)core.info('HH_PM_INBOX_RESULT '+JSON.stringify({
  commandId:cmd.id,kind:cmd.kind,status:outcome.ok?'AI_REPLIED':outcome.dispatched?'DISPATCH_ACCEPTED_UNCORRELATED':'BLOCKED',
  reason:outcome.reason||null,model:outcome.model||null,
  cost:typeof outcome.cost==='number'&&Number.isFinite(outcome.cost)?outcome.cost:null,
  sourceCommitConfirmed:false
 }));
 return {status:outcome.ok?'AI_REPLIED':outcome.dispatched?'DISPATCH_ACCEPTED_UNCORRELATED':'BLOCKED',kind:cmd.kind,commandId:cmd.id};
}
module.exports={run,ownerComment,trustedReceipt,command,pending,resultBody,askFree,dispatchSource};
