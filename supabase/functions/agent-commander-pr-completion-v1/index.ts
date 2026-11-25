import postgres from 'npm:postgres@3.4.5';

const FUNCTION='HH_COMMANDER_PR_COMPLETION_V1';
const REPO='andylitvinov-design/books', BASE='codex/public-book-library';
const ORIGINS=new Set(['https://holistichouse.vercel.app','https://holistic-house-pr-monitor.vercel.app']);
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/i;
const OWNER_WORKFLOW=REPO+'/.github/workflows/hh-pr-ten-minute-watchdog.yml@refs/heads/codex/bootstrap-books';
const AUD='hh-commander-pr';
const T='business_brain.commander_pr_completions';
// Strictly prove *no dispatch* before rearming a source repair grant.
// OIDC worker + HEAD/lease CAS still required; ambiguous results never retry.
const SAFE_CAPACITY_HOLDS=new Set([
 'OWNER_REPAIR_DIRECT_CAPACITY_UNVERIFIED','OWNER_REPAIR_DIRECT_CAPACITY_UNKNOWN',
 'OWNER_REPAIR_DIRECT_GHOST_WORKER_BUSY','OWNER_REPAIR_DIRECT_WORKER_BUSY',
 'OWNER_REPAIR_DIRECT_RUNNERS_SATURATED','OWNER_REPAIR_DIRECT_JOBS_SATURATED',
 'OWNER_REPAIR_DIRECT_CORE_PRIORITY_PENDING'
]);
const label=x=>typeof x==='string'&&/^[A-Z0-9_]{3,90}$/.test(x)?x:'UNKNOWN';
const validNum=n=>Number.isSafeInteger(n)&&n>0&&n<=99999999;
const json=(status,value,origin)=>new Response(JSON.stringify(value),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'x-content-type-options':'nosniff','vary':'authorization,origin',
 ...(ORIGINS.has(origin)?{'access-control-allow-origin':origin,
 'access-control-allow-methods':'POST, OPTIONS',
 'access-control-allow-headers':'authorization,apikey,content-type'}:{})}});
function unbase(value){
 const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((value.length+3)%4);
 return Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
}
const decode=x=>JSON.parse(new TextDecoder().decode(unbase(x)));
let cachedKeys=null,keysUntil=0;
async function checkOidc(request){
 const raw=request.headers.get('authorization')||'';
 const matched=/^Bearer ([A-Za-z0-9._-]{100,8000})$/.exec(raw);
 if(!matched)return false;
 const parts=matched[1].split('.');
 if(parts.length!==3)return false;
 try{
  const header=decode(parts[0]),claims=decode(parts[1]),now=Math.floor(Date.now()/1000);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||
   claims.iss!=='https://token.actions.githubusercontent.com'||
   claims.aud!==AUD||claims.repository!==REPO||
   claims.repository_owner!=='andylitvinov-design'||
   claims.ref!=='refs/heads/codex/bootstrap-books'||
   claims.workflow_ref!==OWNER_WORKFLOW||
   !['schedule','workflow_dispatch','workflow_run','push'].includes(claims.event_name)||
   (claims.job_workflow_ref&&claims.job_workflow_ref!==OWNER_WORKFLOW)||
   !Number.isSafeInteger(claims.exp)||!Number.isSafeInteger(claims.iat)||
   claims.exp<=now||claims.exp>now+900||claims.iat>now+60||claims.iat<now-900||
   (claims.nbf!=null&&(!Number.isSafeInteger(claims.nbf)||claims.nbf>now+60)))
   return false;
  if(!cachedKeys||Date.now()>=keysUntil){
   const r=await fetch('https://token.actions.githubusercontent.com/.well-known/jwks',{
    cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});
   if(!r.ok)return false;
   const value=await r.json();
   if(!Array.isArray(value?.keys)||value.keys.length<1||value.keys.length>30)return false;
   cachedKeys=value.keys;keysUntil=Date.now()+300000;
  }
  const jwk=cachedKeys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig'));
  if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify({name:'RSASSA-PKCS1-v1_5'},key,
   unbase(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{return false}
}
async function authenticatedOwner(req){
 const authorization=req.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9._-]{120,8000}$/.test(authorization))return null;
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY');
 if(!url||!anon)throw Error('OWNER_AUTH_NOT_CONFIGURED');
 const r=await fetch(url.replace(/\/$/,'')+'/auth/v1/user',{
  method:'GET',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6500),
  headers:{apikey:anon,Authorization:authorization,Accept:'application/json'}});
 if(!r.ok)return null;
 const user=await r.json().catch(()=>null);
 return user&&UUID.test(user.id||'')&&user.email_confirmed_at?user.id:null;
}
async function readPR(number,{terminalControlReadback=false}={}){
 const r=await fetch('https://api.github.com/repos/'+REPO+'/pulls/'+number,{
  cache:'no-store',redirect:'error',signal:AbortSignal.timeout(9000),
  headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
   'User-Agent':'HH-Commander-PR-Completion'}});
 if(!r.ok)throw Error('GITHUB_PR_READ_'+r.status);
 const raw=await r.text();
 if(raw.length>200000)throw Error('GITHUB_PR_RESPONSE_OVERSIZED');
 const pr=JSON.parse(raw);
 // Only a previously BLOCKED owner request may reconcile a terminal PR on
 // the protected control base. Never admit an open control PR for repair.
 const controlTerminal=terminalControlReadback&&pr.state==='closed'&&
  pr.base?.ref==='codex/bootstrap-books';
 if(pr.number!==number||(!controlTerminal&&pr.base?.ref!==BASE)||
  pr.base?.repo?.full_name!==REPO||
  pr.head?.repo?.full_name!==REPO||!SHA.test(pr.head?.sha||''))
  throw Error('PR_UNSUPPORTED_REPO_OR_SHA');
 return pr;
}
const publicRow=r=>({requestId:r.request_id,prNumber:r.pr_number,headSha:r.observed_head_sha||r.requested_head_sha,
 status:r.state,reasonCode:r.reason_code||null,dispatchAccepted:r.dispatch_accepted===true,
 mergeSha:r.observed_merge_sha||null,mergedAt:r.merged_at||null,
 createdAt:r.created_at,updatedAt:r.updated_at,lastCheckedAt:r.last_checked_at,
 // Owner-only progress facts, not an inferred AI/model/patch receipt.
 requestedHeadSha:r.requested_head_sha,firstAttemptAt:r.first_attempt_at||null,
 leaseUntil:r.lease_until||null,dispatchAttemptedAt:r.dispatch_attempted_at||null,
 checkedCount:Number.isSafeInteger(Number(r.checked_count))?Number(r.checked_count):0});

const safeInfo=(value,max=110)=>typeof value==='string'?value.slice(0,max):null;
const cleanCiRow=r=>{
 const cls=r.classification&&typeof r.classification==='object'?r.classification:{};
 const route=r.route_receipt&&typeof r.route_receipt==='object'?r.route_receipt:{};
 const assignment=r.assignment_receipt&&typeof r.assignment_receipt==='object'?r.assignment_receipt:{};
 const response=r.diagnostic_receipt&&typeof r.diagnostic_receipt==='object'?r.diagnostic_receipt:{};
 const model=safeInfo(r.diagnostic_model,130);
 const status=safeInfo(r.diagnostic_status,30);
 const verified=status==='COMPLETED'&&
   response.schema==='HH_OPENROUTER_WORKER_RECEIPT_V1'&&
   response.status==='COMPLETED'&&
   response.proofLevel==='MODEL_RESPONSE_ZERO_COST_VERIFIED_READ_ONLY'&&
   r.diagnostic_cost!==null&&Number(r.diagnostic_cost)===0&&
   response.costUsd===0&&typeof model==='string'&&model.endsWith(':free')&&
   typeof response.answerSha256==='string'&&
   /^[a-f0-9]{64}$/.test(response.answerSha256);
 const diagnostic=typeof assignment.diagnosticRunId==='string'&&
   /^[0-9a-f-]{36}$/i.test(assignment.diagnosticRunId)?{
    runId:assignment.diagnosticRunId,executor:'openrouter',
    status:verified?'COMPLETED_VERIFIED':status==='COMPLETED'?'COMPLETED_UNVERIFIED':
      ['QUEUED','RUNNING','FAILED','BLOCKED'].includes(status)?status:'NOT_CONFIRMED',
    workerClaimed:!!r.diagnostic_started_at&&
      ['RUNNING','COMPLETED','FAILED'].includes(status),
    modelResponseVerified:verified,model:verified?model:null,
    costUsd:verified?0:null,answerSha256:verified?response.answerSha256:null,
    reasonCode:safeInfo(r.diagnostic_reason,100),
    attempts:Number.isSafeInteger(Number(r.diagnostic_attempts))?Number(r.diagnostic_attempts):null,
    startedAt:r.diagnostic_started_at||null,completedAt:r.diagnostic_completed_at||null
   }:null;
 const sha=SHA.test(r.head_sha||'')?r.head_sha:
  SHA.test(r.workflow_run_head_sha||'')?r.workflow_run_head_sha:null;
 return {headSha:sha,runId:r.workflow_run_id!=null&&Number.isSafeInteger(Number(r.workflow_run_id))?
   Number(r.workflow_run_id):null,
  attempt:r.run_attempt!=null&&Number.isSafeInteger(Number(r.run_attempt))?Number(r.run_attempt):null,
  workflowName:safeInfo(r.workflow_name,90),
  conclusion:safeInfo(r.conclusion,30),
  category:safeInfo(r.category||cls.category,70),
  reasonCode:safeInfo(cls.reason_code,100),
  classificationStatus:safeInfo(cls.status,60),
  responsibleRole:safeInfo(cls.responsible_role||route.responsibleRole,90),
  routeState:safeInfo(route.state,65),
  routeReason:safeInfo(route.reason,100),
  workerStarted:route.workerStarted===true||assignment.workerStarted===true,
  dispatchAccepted:route.dispatchAcknowledged===true||assignment.dispatchAccepted===true,
  diagnostic,sourceRunAt:r.source_run_created_at||null,recordedAt:r.created_at||null};
};

async function eventFor(sql,row){
 if(!row.chat_id||!['MERGED','CLOSED_UNMERGED','BLOCKED'].includes(row.state))return;
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(
  'HH_OWNER_PR_COMPLETION_EVENT_V1:'+row.request_id+':'+row.state+':'+(row.observed_merge_sha||''))));
 const hex=[...hash].map(v=>v.toString(16).padStart(2,'0')).join('');
 const id=hex.slice(0,8)+'-'+hex.slice(8,12)+'-8'+hex.slice(13,16)+'-'+((parseInt(hex[16],16)&3)|8).toString(16)+hex.slice(17,20)+'-'+hex.slice(20,32);
 const merged=row.state==='MERGED';
 const message='PR #'+row.pr_number+': '+(merged?'GitHub MERGED':'STOPPED '+row.state)+
  (merged?' / SHA '+row.observed_merge_sha:' / '+label(row.reason_code))+
  '. https://github.com/'+REPO+'/pull/'+row.pr_number+
  '. Production LIVE is NOT verified by this receipt.';
 const payload={schema:'HH_COMMANDER_EVENT_V1',id,kind:'github_report',
  author:'GitHub PR Completion · verified gateway',text:message,
  prNumber:row.pr_number,requestId:row.request_id,
  sourceVerified:true,proofLevel:merged?'GITHUB_MERGE_READBACK':'GITHUB_PR_GATEWAY_HOLD',
  liveVerified:false,createdAt:new Date().toISOString()};
 await sql.unsafe(
  'insert into business_brain.commander_chat_events (event_id,chat_id,owner_id,kind,payload,source_verified) '+
  "values ($1::uuid,$2::uuid,$3::uuid,'github_report',$4::text::jsonb,true) on conflict(event_id) do nothing",
  [id,row.chat_id,row.owner_id,JSON.stringify(payload)]);
 await sql.unsafe('update business_brain.commander_chats set updated_at=now() where chat_id=$1::uuid and owner_id=$2::uuid',
  [row.chat_id,row.owner_id]);
}
// Owner-only public control heartbeat; successful pg_cron polling is NOT
// proof that GitHub Actions actually scheduled the trusted Watchdog.
async function watchdogHealth(sql){
 try{
  const rows=await sql.unsafe(
   "select checked_at,last_request_at,last_http_200_at,"+
   " watchdog_scheduled_at,status,"+
   " round(extract(epoch from (checked_at-watchdog_scheduled_at))/60)::integer as age_minutes"+
   " from agent_ops.github_scheduler_overview limit 1");
  const r=rows[0];
  if(!r||!['MONITOR_STALE','GITHUB_API_NOT_VERIFIED','GITHUB_WATCHDOG_STALE',
     'WATCHDOG_RECENT_VERIFY_CONSECUTIVE_RUNS'].includes(r.status))
   return {status:'HEALTH_UNAVAILABLE',watchdogLastRun:null,ageMinutes:null};
  return {status:r.status,
   watchdogLastRun:r.watchdog_scheduled_at||null,
   monitorLastPoll:r.last_request_at||null,
   lastGithubApi200:r.last_http_200_at||null,
   ageMinutes:Number.isSafeInteger(Number(r.age_minutes))?Number(r.age_minutes):null};
 }catch{return {status:'HEALTH_UNAVAILABLE',watchdogLastRun:null,ageMinutes:null}}
}
async function ownerAction(sql,req,body,action,origin){
 const owner=await authenticatedOwner(req);
 if(!owner)return json(401,{error:'OWNER_SESSION_REQUIRED'},origin);
 const acl=await sql.unsafe('select can_read,can_write from business_brain.owner_access where user_id=$1::uuid limit 1',[owner]);
 if(acl.length!==1||acl[0].can_read!==true||(action==='submit'&&acl[0].can_write!==true))
  return json(403,{error:'OWNER_ACCESS_DENIED'},origin);
 if(action==='history'){
  const pr=Number(body.prNumber),page=body.page===undefined?1:Number(body.page);
  if(!validNum(pr)||!Number.isSafeInteger(page)||page<1||page>1000)
   return json(400,{error:'PR_HISTORY_QUERY_INVALID'},origin);
  const queue=await sql.unsafe('select * from '+T+
   ' where owner_id=$1::uuid and pr_number=$2 order by created_at desc limit 5',
   [owner,pr]);
  if(!queue.length)return json(404,{error:'OWNER_PR_NOT_IN_QUEUE'},origin);
  // Read only the verified owner's linked diagnostic runs; never expose prompts.
  const ci=await sql.unsafe(
   "select e.head_sha,e.workflow_run_head_sha,e.workflow_run_id,e.run_attempt,"+
   " e.workflow_name,e.conclusion,e.category,e.classification,e.route_receipt,"+
   " e.assignment_receipt,e.source_run_created_at,e.created_at,"+
   " r.status as diagnostic_status,r.actual_model_id as diagnostic_model,"+
   " r.cost_usd as diagnostic_cost,r.reason_code as diagnostic_reason,"+
   " r.worker_attempt_count as diagnostic_attempts,r.started_at as diagnostic_started_at,"+
   " r.completed_at as diagnostic_completed_at,r.receipt as diagnostic_receipt"+
   " from business_brain.commander_ci_event_inbox e"+
   " left join business_brain.commander_execution_runs r"+
   " on r.run_id=case when (e.assignment_receipt->>'diagnosticRunId')"+
   " ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'"+
   " then (e.assignment_receipt->>'diagnosticRunId')::uuid else null end"+
   " and r.owner_id=e.inbox_owner_id and r.task_id=e.associated_task_id"+
   " and r.executor='openrouter'"+
   " and r.request_payload->'contextCapsule'->>'headSha'=e.head_sha"+
   " and r.request_payload->'contextCapsule'->>'prNumber'=e.pr_number::text"+
   " where e.pr_number=$1 and e.repository=$2 and e.inbox_owner_id=$4::uuid"+
   " order by e.created_at desc,e.ci_event_id desc limit 31 offset $3",
   [pr,REPO,(page-1)*30,owner]);
  return json(200,{schema:FUNCTION,items:queue.map(publicRow),ownerOnly:true,
   ciHistoryAvailable:true,ciPage:page,ciHasMore:ci.length>30,
   ciEvents:ci.slice(0,30).map(cleanCiRow)},origin);
 }
 if(action==='status'){
  const pr=body.prNumber===undefined?null:Number(body.prNumber);
  if(pr!==null&&!validNum(pr))return json(400,{error:'PR_NUMBER_INVALID'},origin);
  const rows=pr===null
   ?await sql.unsafe('select * from '+T+' where owner_id=$1::uuid order by created_at desc limit 20',[owner])
   :await sql.unsafe('select * from '+T+' where owner_id=$1::uuid and pr_number=$2 order by created_at desc limit 5',[owner,pr]);
  const watchdog=await watchdogHealth(sql);
  return json(200,{schema:FUNCTION,items:rows.map(publicRow),ownerOnly:true,
   watchdogHealth:watchdog},origin);
 }
 const n=Number(body.prNumber),id=body.requestId,chatNumber=body.chatNumber===undefined?null:Number(body.chatNumber);
 if(!validNum(n)||!UUID.test(id||'')||chatNumber!==null&&(!Number.isSafeInteger(chatNumber)||chatNumber<1))
  return json(400,{error:'REQUEST_ID_OR_PR_INVALID'},origin);
 let chatId=null;
 if(chatNumber!==null){
  const chats=await sql.unsafe('select chat_id from business_brain.commander_chats where chat_number=$1 and owner_id=$2::uuid limit 1',
   [chatNumber,owner]);
  if(chats.length!==1)return json(404,{error:'OWNER_CHAT_NOT_FOUND'},origin);
  chatId=chats[0].chat_id;
 }
 const previous=await sql.unsafe('select * from '+T+' where request_id=$1::uuid and owner_id=$2::uuid limit 1',[id,owner]);
 if(previous.length)return json(200,{schema:FUNCTION,created:false,duplicate:true,item:publicRow(previous[0])},origin);
 const pr=await readPR(n);
 const completed=pr.state==='closed';
 const merged=completed&&pr.merged===true&&
  SHA.test(pr.merge_commit_sha||'')&&Number.isFinite(Date.parse(pr.merged_at||''));
 const state=completed?(merged?'MERGED':'CLOSED_UNMERGED'):'QUEUED';
 const reason=completed?(merged?'GITHUB_MERGE_VERIFIED':'GITHUB_CLOSED_NO_MERGE'):'REQUEST_ACCEPTED_NOT_DISPATCHED';
 const inserted=await sql.unsafe('insert into '+T+
  ' (request_id,owner_id,chat_id,pr_number,requested_head_sha,observed_head_sha,state,reason_code,observed_merge_sha,merged_at,last_checked_at) '+
  'values ($1::uuid,$2::uuid,$3::uuid,$4,$5,$5,$6,$7,$8,$9,$10) on conflict do nothing returning *',
  [id,owner,chatId,n,pr.head.sha,state,reason,
   merged?pr.merge_commit_sha:null,merged?pr.merged_at:null,completed?new Date():null]);
 let row=inserted[0];
 if(!row){
  const existing=await sql.unsafe('select * from '+T+" where owner_id=$1::uuid and pr_number=$2 and state in ('QUEUED','LEASED','WATCHING') order by created_at desc limit 1",[owner,n]);
  if(existing.length)row=existing[0];
 }
 if(!row)return json(409,{error:'PR_QUEUE_CONFLICT_RETRY_SAME_REQUEST_ID'},origin);
 if(row.state==='MERGED'||row.state==='CLOSED_UNMERGED')await eventFor(sql,row);
 return json(200,{schema:FUNCTION,created:row.request_id===id,duplicate:row.request_id!==id,
  item:publicRow(row)},origin);
}
async function workerAction(sql,body,action,origin){
 if(action==='next'){
  const result=await sql.begin(async tx=>{
   const rows=await tx.unsafe('select * from '+T+
    " where state='QUEUED' or (state='WATCHING' and (last_checked_at is null or last_checked_at<now()-interval '3 minutes'))"+
    " or (state='LEASED' and lease_until<now())"+
    // Stale historical BLOCKED tasks are observed at low frequency, after all
    // live requests. They are NEVER new repair grants, even if HEAD changed.
    " or (state='BLOCKED' and (last_checked_at is null or last_checked_at<now()-interval '45 minutes'))"+
    " order by case when state='QUEUED' then 0 when state='WATCHING' then 1 when state='LEASED' then 2 else 3 end, coalesce(last_checked_at,created_at),created_at for update skip locked limit 1");
   if(!rows.length)return null;
   // An already-blocked owner command remains forever read-only, including
   // after verified conflict resolution moves BLOCKED -> WATCHING. A new
   // authenticated owner command is needed for a new code-writer grant.
   const row=rows[0],previouslyBlocked=row.state==='BLOCKED'||
    row.evidence?.blockedRecheckOnly===true;
   const first=!previouslyBlocked&&row.dispatch_attempted_at==null;
   const lease=crypto.randomUUID();
   const evidence={...(row.evidence&&typeof row.evidence==='object'?row.evidence:{}),
    blockedRecheckOnly:previouslyBlocked};
   await tx.unsafe('update '+T+
    " set state='LEASED',lease_token=$1::uuid,lease_until=now()+interval '4 minutes',"+
    " first_attempt_at=coalesce(first_attempt_at,now()),updated_at=now(),"+
    " evidence=$3::text::jsonb"+
    ' where request_id=$2::uuid',[lease,row.request_id,JSON.stringify(evidence)]);
   return {requestId:row.request_id,leaseToken:lease,prNumber:row.pr_number,
    requestedHeadSha:row.requested_head_sha,dispatchEligibleOnce:first,
    blockedRecheckOnly:previouslyBlocked,
    previousReasonCode:previouslyBlocked?label(row.reason_code):null};
  });
  return json(200,{schema:FUNCTION,item:result},origin);
 }
 if(action==='arm_dispatch'){
  // A durable CAS fence BEFORE the remote GitHub dispatch. Merely watching
  // a green/pending CI must NEVER consume the only source-repair opportunity.
  const id=body.requestId,lease=body.leaseToken;
  if(!UUID.test(id||'')||!UUID.test(lease||''))
   return json(400,{error:'DISPATCH_ARM_ID_INVALID'},origin);
  const updated=await sql.unsafe('update '+T+
   ' set dispatch_attempted_at=now(),updated_at=now()'+
   " where request_id=$1::uuid and lease_token=$2::uuid and state='LEASED'"+
   ' and lease_until>now() and dispatch_attempted_at is null returning request_id',
   [id,lease]);
  return json(200,{schema:FUNCTION,armed:updated.length===1},origin);
 }
 if(action!=='finish')return json(400,{error:'WORKER_ACTION_INVALID'},origin);
 const id=body.requestId,lease=body.leaseToken,state=body.status;
 if(!UUID.test(id||'')||!UUID.test(lease||'')||
  !['WATCHING','BLOCKED','MERGED','CLOSED_UNMERGED'].includes(state)||
  !SHA.test(body.headSha||''))
  return json(400,{error:'WORKER_RECEIPT_INVALID'},origin);
 const prior=await sql.unsafe('select * from '+T+
  " where request_id=$1::uuid and state='LEASED' and lease_token=$2::uuid and lease_until>now() limit 1",
  [id,lease]);
 if(prior.length!==1)return json(409,{error:'LEASE_EXPIRED_OR_MOVED'},origin);
 let mergedAt=null,mergeSha=null,code=label(body.reasonCode);
 // Trust only an OIDC worker's explicit non-dispatch witness for a known
 // pre-dispatch capacity refusal. An active or past accepted worker is fenced.
 const verifiedNoDispatch=state==='WATCHING'&&
  body.noDispatchVerified===true&&body.dispatchAccepted!==true&&
  prior[0].dispatch_accepted!==true&&prior[0].dispatch_attempted_at!=null&&
  SAFE_CAPACITY_HOLDS.has(code);
 // Follow a changing HEAD only after a fresh exact-GitHub PR readback.
 // Signed owner intent is for the PR, not one stale SHA. Preserve the one
 // source-write fence and never treat the new SHA as an AI patch receipt.
 let verifiedFollowedHead=null;
 if(state==='WATCHING'&&body.headSha!==prior[0].requested_head_sha){
  try{
   const current=await readPR(prior[0].pr_number);
   if(current.state==='open'&&current.draft!==true&&
      current.head.sha===body.headSha)verifiedFollowedHead=current.head.sha;
  }catch{
   // GitHub temporary failure cannot authorize a source writer.
  }
 }
 if(state==='MERGED'||state==='CLOSED_UNMERGED'){
  const pr=await readPR(prior[0].pr_number,{
   terminalControlReadback:body.blockedRecheckOnly===true&&
    prior[0].evidence?.blockedRecheckOnly===true});
  if(pr.state!=='closed'||state==='MERGED'&&(
    pr.merged!==true||!SHA.test(pr.merge_commit_sha||'')||
    !Number.isFinite(Date.parse(pr.merged_at||'')))||
    state==='CLOSED_UNMERGED'&&pr.merged===true)
   return json(409,{error:'MERGE_READBACK_UNVERIFIED'},origin);
  if(state==='MERGED'){mergedAt=pr.merged_at;mergeSha=pr.merge_commit_sha;code='GITHUB_MERGE_VERIFIED'}
  else code='GITHUB_CLOSED_NO_MERGE';
 }
 const rows=await sql.unsafe('update '+T+
  ' set state=$1,reason_code=$2,observed_head_sha=$3,observed_merge_sha=$4,'+
  ' merged_at=$5::timestamptz,dispatch_accepted=dispatch_accepted or $6,'+
  ' requested_head_sha=coalesce($10::text,requested_head_sha),'+
  ' dispatch_attempted_at=case when $11::boolean then null else dispatch_attempted_at end,'+
  ' lease_token=null,lease_until=null,last_checked_at=now(),checked_count=checked_count+1,updated_at=now(),'+
  ' evidence=$7::text::jsonb where request_id=$8::uuid and lease_token=$9::uuid and state=\'LEASED\' and lease_until>now() returning *',
  [state,code,body.headSha,mergeSha,mergedAt,body.dispatchAccepted===true,
   JSON.stringify({schema:'HH_PR_COMPLETION_WORKER_V1',source:'SIGNED_GITHUB_ACTIONS_OIDC',
    workflowRunId:validNum(body.workflowRunId)?body.workflowRunId:null,
    dispatchAccepted:body.dispatchAccepted===true,
    candidateProof:'NOT_ATTESTED_BY_GATEWAY',liveVerified:false,
    followedCurrentHead:verifiedFollowedHead!==null,
    blockedRecheckOnly:prior[0].evidence?.blockedRecheckOnly===true,
    safeCapacityRetryDeferred:verifiedNoDispatch}),
   id,lease,verifiedFollowedHead,verifiedNoDispatch]);
 if(rows.length!==1)return json(409,{error:'LEASE_CAS_FAILED'},origin);
 if(['MERGED','CLOSED_UNMERGED','BLOCKED'].includes(state))await eventFor(sql,rows[0]);
 return json(200,{schema:FUNCTION,accepted:true,item:publicRow(rows[0])},origin);
}
Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'';
 if(request.method==='OPTIONS')return ORIGINS.has(origin)?new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization,apikey,content-type'}}):json(403,{error:'ORIGIN_DENIED'},origin);
 if(request.method!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'},origin);
 if(origin&&!ORIGINS.has(origin))return json(403,{error:'ORIGIN_DENIED'},origin);
 const raw=await request.text();
 if(raw.length>10000)return json(413,{error:'BODY_TOO_LARGE'},origin);
 let body;try{body=JSON.parse(raw)}catch{return json(400,{error:'INVALID_JSON'},origin)}
 if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.action!=='string')
  return json(400,{error:'INVALID_ENVELOPE'},origin);
 const action=body.action;
 if(!['submit','status','history','next','finish','arm_dispatch'].includes(action))return json(400,{error:'UNKNOWN_ACTION'},origin);
 if(['next','finish','arm_dispatch'].includes(action)&&!(await checkOidc(request)))
  return json(401,{error:'GITHUB_WORKFLOW_OIDC_DENIED'},origin);
 const dbUrl=Deno.env.get('SUPABASE_DB_URL');
 if(!dbUrl)return json(503,{error:'OWNER_QUEUE_DATABASE_UNAVAILABLE'},origin);
 const sql=postgres(dbUrl,{max:1,connect_timeout:6,idle_timeout:4,ssl:'require',prepare:false});
 try{
  return ['next','finish','arm_dispatch'].includes(action)
   ?await workerAction(sql,body,action,origin)
   :await ownerAction(sql,request,body,action,origin);
 }catch(e){
  console.error('HH_OWNER_PR_COMPLETION',String(e?.message||'ERROR').slice(0,110));
  return json(503,{error:'PR_COMPLETION_UNAVAILABLE'},origin);
 }finally{await sql.end({timeout:2})}
});
