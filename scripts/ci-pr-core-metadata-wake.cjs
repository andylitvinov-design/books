'use strict';
/**
 * Wake real PR Core CI using a PAT-authored Ready-for-review transition.
 * Never creates source commits, changes refs, or manufactures check results.
 */
const {taskFor,parseRecords,readCompleteIssueComments,externalOwnerLeaseStatus,
  trustedControlComment,commentBody}=require('./ci-pr-task-state.cjs');
const {stageLine}=require('./ci-pr-stage-receipts.cjs');
const REPO='andylitvinov-design/books',DEFAULT='refs/heads/codex/bootstrap-books';
const PROD='codex/public-book-library',CORE='hh-pr-core-release.yml';
const SHA=/^[a-f0-9]{40}$/i,KEY=/^[a-f0-9]{32}$/i;
const WAKE_MARKER='HH_PR_CI_METADATA_WAKE_V1';
function eligible(pr,number,sha,key){
  if(!pr||pr.state!=='open'||pr.draft||pr.number!==number||
    pr.user?.login!=='andylitvinov-design'||pr.base?.ref!==PROD||
    pr.head?.repo?.full_name!==REPO||pr.head.sha!==sha||
    pr.mergeable!==true||!['clean','blocked'].includes(pr.mergeable_state)||
    pr.auto_merge!=null||
    typeof pr.body!=='string'||pr.body.length>55000)return false;
  const labels=new Set((pr.labels||[]).map(l=>l.name));
  if(!labels.has('hh:ci-needed')||labels.has('hh:ci-bootstrap-attempted')||
    labels.has('hh:hold')||labels.has('hh:repair-manual')||labels.has('hh:blocked'))return false;
  return taskFor(pr,{})?.task_key===key;
}
function signedReservation(comments,taskKey,sha,reservationId){
  if(!Array.isArray(comments)||!parseRecords(comments))return false;
  const signed=[];
  for(const c of comments){
    if(!trustedControlComment(c))continue;
    const records=parseRecords([c]);
    if(!records)return false;
    for(const r of records)if(r.task_key===taskKey&&r.head_sha===sha)
      signed.push({record:r,id:c.id});
  }
  if(!signed.length||signed.some(x=>!Number.isSafeInteger(x.id)))return false;
  signed.sort((a,b)=>a.id-b.id);
  const latest=signed.at(-1).record;
  return latest.schema==='HH_PR_TASK_V1'&&latest.state==='RESERVED'&&
    latest.lane==='ci'&&latest.owner_run_id===reservationId&&
    latest.head_sha===sha&&latest.task_key===taskKey&&
    !signed.some(x=>['CLAIMED','PUBLISHED','CI_WAKE_REQUESTED'].includes(x.record.state));
}
async function run({github,context,token,number,expectedSha,taskKey,
  reservationRunId,dryRun=false,fetcher=globalThis.fetch,now=Date.now()}={}){
  const result={schema:'HH_PR_CI_METADATA_WAKE_V1',pr_number:number,
    status:'SKIPPED',reason:null,claimed:false,metadataEditAccepted:false,
    sourceChanged:false,coreRunVerified:false,terminalFailure:false,dryRun};
  const stop=(reason,terminalFailure=false)=>{
    result.reason=reason;result.terminalFailure=terminalFailure;return result;
  };
  if(dryRun)return stop('DRY_RUN_NO_WRITES');
  if(context?.repo?.owner+'/'+context?.repo?.repo!==REPO||
    context?.ref!==DEFAULT||context?.eventName!=='workflow_dispatch')
    return stop('UNTRUSTED_DISPATCH_EVENT');
  if(!Number.isSafeInteger(number)||number<1||!SHA.test(expectedSha||'')||
    !KEY.test(taskKey||'')||!/^[1-9][0-9]{0,18}$/.test(reservationRunId||''))
    return stop('ADDRESS_OR_RESERVATION_MISSING');
  if(!token||typeof token!=='string'||typeof fetcher!=='function')
    return stop('OWNER_TOKEN_MISSING',true);
  const {owner,repo}=context.repo;
  let pr;
  try{pr=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;}
  catch{return stop('PR_READ_UNAVAILABLE');}
  if(!eligible(pr,number,expectedSha,taskKey))
    return stop('PR_STATE_OR_ATTEMPT_UNSAFE');
  if(pr.body.includes(WAKE_MARKER+' task='+taskKey))
    return stop('WAKE_ALREADY_REQUESTED');
  let comments;
  try{
    let pages=0;
    comments=await readCompleteIssueComments(github,owner,repo,number,async(_,fn)=>{
      if(++pages>5)throw Error('COMMENT_HISTORY_BOUNDED');
      return fn();
    });
  }catch{return stop('RESERVATION_HISTORY_UNAVAILABLE');}
  if(!signedReservation(comments,taskKey,expectedSha,reservationRunId))
    return stop('SIGNED_RESERVATION_MISSING_OR_SUPERSEDED');
  if(externalOwnerLeaseStatus(comments,expectedSha,now)!=='FREE')
    return stop('SOURCE_OWNER_LEASE_NOT_FREE');
  let hist;
  try{
    hist=(await github.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
      owner,repo,workflow_id:CORE,branch:pr.head.ref,event:'pull_request',per_page:1
    })).data;
  }catch{return stop('CORE_HISTORY_UNAVAILABLE');}
  if(!hist||hist.total_count!==0||!Array.isArray(hist.workflow_runs)||
    hist.workflow_runs.length!==0)return stop('CORE_HISTORY_EXISTS_OR_UNKNOWN');
  let children;
  try{children=(await github.rest.pulls.list({owner,repo,state:'open',base:pr.head.ref,per_page:1})).data;}
  catch{return stop('STACKED_CHILDREN_UNVERIFIED');}
  if(!Array.isArray(children)||children.length)return stop('STACKED_PARENT');
  async function ownerCall(method,path,body){
    const response=await fetcher('https://api.github.com'+path,{
      method,
      headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
        'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},
      ...(body?{body:JSON.stringify(body)}:{}),
      signal:AbortSignal.timeout(20000)
    });
    if(!response?.ok){
      const err=new Error('OWNER_API_'+method+'_HTTP_'+(response?.status||'UNKNOWN'));
      err.status=response?.status;throw err;
    }
    return response.json();
  }
  let patPR;
  try{
    const who=await ownerCall('GET','/user');
    if(who?.login!=='andylitvinov-design')return stop('TOKEN_OWNER_MISMATCH',true);
    patPR=await ownerCall('GET','/repos/'+REPO+'/pulls/'+number);
  }catch(err){return stop('PAT_READ_UNAVAILABLE',err?.status===401||err?.status===403);}
  if(patPR?.head?.sha!==expectedSha||patPR?.base?.ref!==PROD||
    patPR?.state!=='open'||patPR?.draft!==false||
    patPR?.body!==pr.body||patPR?.auto_merge!=null)
    return stop('PAT_PR_STATE_CHANGED');
  const nodeId=patPR?.node_id;
  if(typeof nodeId!=='string'||!/^PR_[A-Za-z0-9_-]{1,160}$/.test(nodeId))
    return stop('PAT_PR_NODE_ID_UNVERIFIED');
  const payload={schema:'HH_PR_TASK_V1',task_key:taskKey,pr_number:number,
    head_sha:expectedSha,head_ref:pr.head.ref,base_ref:PROD,lane:'ci',
    state:'CLAIMED',reservation_run_id:reservationRunId,
    owner_run_id:String(context.runId||''),source_published:false,
    created_at:new Date(now).toISOString()};
  if(!/^[1-9][0-9]{0,18}$/.test(payload.owner_run_id))
    return stop('WORKER_RUN_ID_MISSING');
  try{
    await github.rest.issues.createComment({owner,repo,issue_number:number,
      body:commentBody(payload)+'\n'+stageLine({stage:'claimed',pr_number:number,
        head_sha:expectedSha,run_id:context.runId,task_key:taskKey,
        at:new Date().toISOString(),source:'ci_worker_claim'})});
  }catch{return stop('AUTHENTICATED_CLAIM_WRITE_FAILED');}
  result.claimed=true;
  // A PAT-authored PR body edit can return HTTP 200 without delivering
  // pull_request.edited (observed on #2269, 2026-11-02). A real
  // Ready-for-review event DOES launch current-HEAD Core and browser CI.
  // We never alter source, refs, required checks or the PR's approved body.
  const changed=async(ready)=>{
    const field=ready?'markPullRequestReadyForReview':'convertPullRequestToDraft';
    const query='mutation($id:ID!){'+field+'(input:{pullRequestId:$id}){pullRequest{id isDraft}}}';
    const data=await ownerCall('POST','/graphql',{query,variables:{id:nodeId}});
    const observed=data?.data?.[field]?.pullRequest;
    if(data?.errors?.length||observed?.id!==nodeId||
       observed?.isDraft!==!ready)throw Error('PAT_GRAPHQL_TRANSITION_UNVERIFIED');
  };
  const readPat=()=>ownerCall('GET','/repos/'+REPO+'/pulls/'+number);
  const stillSame=(current,draft)=>current?.head?.sha===expectedSha&&
    current?.base?.ref===PROD&&current?.state==='open'&&
    current?.draft===draft&&current?.body===pr.body;
  try{
    await changed(false);
    const current=await readPat();
    if(!stillSame(current,true))return stop('PAT_DRAFT_READBACK_UNVERIFIED',true);
  }catch(error){
    return stop('PAT_DRAFT_TRANSITION_UNVERIFIED',
      error?.status===401||error?.status===403);
  }
  // If Ready's response is ambiguous, re-read before a bounded retry.
  // Never call the request successful if the PR remained Draft.
  let ready=false;
  for(let attempt=0;attempt<2;attempt++){
    try{await changed(true);}catch(error){/* re-read controls the outcome */}
    let current;
    try{current=await readPat();}catch{continue;}
    if(stillSame(current,false)){ready=true;break;}
    if(!stillSame(current,true))return stop('PAT_READY_HEAD_OR_BODY_CHANGED',true);
  }
  if(!ready)return stop('PAT_READY_RESTORE_REQUIRED',true);
  let fresh;
  try{fresh=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;}
  catch{return stop('POST_READY_HEAD_UNVERIFIED');}
  if(fresh?.state!=='open'||fresh.draft!==false||
    fresh?.head?.sha!==expectedSha||fresh?.base?.ref!==PROD)
    return stop('POST_READY_HEAD_UNVERIFIED');
  const marker='<!-- '+WAKE_MARKER+' task='+taskKey+' head='+expectedSha+
    ' reservation='+reservationRunId+' ready_event=true source_unchanged=true -->';
  try{
    await github.rest.issues.createComment({owner,repo,issue_number:number,
      body:marker+'\n'+commentBody({...payload,state:'CI_WAKE_REQUESTED',
        event:'pull_request.ready_for_review',
        observed_at:new Date().toISOString(),source_published:false})+'\n'+
        stageLine({stage:'ready',pr_number:number,head_sha:expectedSha,
          run_id:context.runId,task_key:taskKey,at:new Date().toISOString(),
          source:'ready_for_review_readback'})});
  }catch{return stop('WAKE_RECEIPT_WRITE_FAILED');}
  result.status='CI_WAKE_REQUESTED';result.reason='AWAITING_REAL_CORE_RUN';
  result.metadataEditAccepted=true;return result;
}
module.exports={eligible,signedReservation,run,WAKE_MARKER};
