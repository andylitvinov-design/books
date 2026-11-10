import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/app/config';
import { consumeRate } from '@/lib/app/database';
import { ownedGithubAppConfigured, publishOwnedDraftSource } from '@/lib/agent-director/github-app-source-publisher.mjs';
import { issueReviewedSource, verifyReviewedSource, validateReviewedPatch, independentlyVerifiedZeroCost } from '@/lib/agent-director/reviewed-source-patch.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=30;
const ORIGIN='https://holistichouse.vercel.app';
const EDGE='agent-commander-private-store-v1';
const REPO='andylitvinov-design/books',BRANCH='codex/public-book-library';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/i;
const HEADERS={'Cache-Control':'private, no-store','Vary':'Authorization, Origin',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
function json(status,body){return NextResponse.json(body,{status,headers:HEADERS})}
function stop(message,status=403){const e=new Error(message);e.status=status;throw e}
async function bodyJson(req){
 const text=await req.text();if(text.length>260000)stop('OWNED_SOURCE_BODY_TOO_LARGE',413);
 let data;try{data=JSON.parse(text)}catch{stop('OWNED_SOURCE_JSON_INVALID',400)}
 if(!data||typeof data!=='object'||Array.isArray(data)||
   Object.keys(data).some(k=>!['action','runId','chatId','issueNumber','baseSha','filesJson','commitMessage',
    'prTitle','reviewToken','confirmed'].includes(k)))stop('OWNED_SOURCE_ENVELOPE_INVALID',400);
 if(!['preview','publish'].includes(data.action))stop('OWNED_SOURCE_ACTION_INVALID',400);
 if(!UUID.test(data.runId||'')||!UUID.test(data.chatId||'')||
    !Number.isSafeInteger(data.issueNumber)||data.issueNumber<1||data.issueNumber>99999||
    !SHA.test(data.baseSha||''))stop('OWNED_SOURCE_ID_INVALID',400);
 return data;
}
function publicKey(value){
 if(/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(value||''))return true;
 try{return JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString('utf8')).role==='anon'}
 catch{return false}
}
async function ownerAndRun(req,data){
 const authorization=req.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9._-]{120,8000}$/.test(authorization))stop('OWNER_SESSION_REQUIRED',401);
 const origin=process.env.HH_APP_SUPABASE_URL||'';
 let url;try{url=new URL(origin)}catch{stop('OWNER_AUTH_NOT_CONFIGURED',503)}
 const key=process.env.HH_APP_SUPABASE_PUBLISHABLE_KEY||'';
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||
   url.search||url.hash||!publicKey(key))stop('OWNER_AUTH_NOT_CONFIGURED',503);
 const options=(body)=>({method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6000),
    headers:{Authorization:authorization,apikey:key,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify(body)});
 const f=globalThis.fetch,base=url.origin;
 const [userR,statusR,runsR]=await Promise.all([
    f(base+'/auth/v1/user',{method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6000),
      headers:{Authorization:authorization,apikey:key,Accept:'application/json'}}),
    f(base+'/functions/v1/'+EDGE,options({action:'status'})),
    f(base+'/functions/v1/'+EDGE,options({action:'commander_list_execution_runs',issueNumber:data.issueNumber}))
 ]);
 if(!userR.ok)stop('OWNER_SESSION_INVALID',401);
 const [user,status,runs]=await Promise.all([userR.json(),statusR.json(),runsR.json()]);
 if(!UUID.test(user?.id||'')||!user?.email_confirmed_at||
   !statusR.ok||!status?.owner||!status?.canWrite||!status?.privateStoreConfigured||
   !runsR.ok||runs?.chatId!==data.chatId)stop('OWNER_ACCESS_DENIED');
 const proof=(runs.runs||[]).find(x=>x?.run_id===data.runId);
 if(!proof||proof.executor!=='local'||proof.status!=='COMPLETED'||
   proof.receipt?.agentStarted!==true||proof.receipt?.executionVerified!==true||
   proof.receipt?.sourceWrite!==null||
   !['AGENT_DIRECTOR_READ_ONLY_RESPONSE','MODEL_RESPONSE_ZERO_COST_VERIFIED_READ_ONLY']
     .includes(proof.receipt?.proofLevel)||
   (proof.receipt?.proofLevel==='MODEL_RESPONSE_ZERO_COST_VERIFIED_READ_ONLY'&&
     (proof.receipt?.zeroCostVerified!==true||Number(proof.receipt?.costUsd)!==0)))
   stop('OWNED_SOURCE_RUN_NOT_VERIFIED');
 return {ownerId:user.id,authorization,key,supabaseOrigin:base};
}
async function githubGet(path,allow404=false){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
 try{
  const r=await fetch('https://api.github.com/repos/'+REPO+path,{method:'GET',redirect:'error',
    cache:'no-store',signal:controller.signal,
    headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
      'User-Agent':'HH-Agent-Director-Source-Review'}});
  if(r.status===404&&allow404)return null;
  if(!r.ok)stop('OWNED_SOURCE_GITHUB_READ_UNAVAILABLE',503);
  const raw=await r.text();if(raw.length>600000)stop('OWNED_SOURCE_GITHUB_PROOF_OVERSIZED',502);
  try{return JSON.parse(raw)}catch{stop('OWNED_SOURCE_GITHUB_PROOF_INVALID',502)}
 }finally{clearTimeout(timer)}
}
async function verifyCurrentFiles(baseSha,files){
 const branch=await githubGet('/git/ref/heads/'+BRANCH);
 if(branch?.object?.sha!==baseSha)stop('OWNED_SOURCE_BASE_HEAD_STALE',409);
 const previews=[];
 for(const file of files){
  const current=await githubGet('/contents/'+file.path.split('/').map(encodeURIComponent).join('/')+
    '?ref='+encodeURIComponent(baseSha),true);
  if(file.expectedBlobSha===null){
   if(current!==null)stop('OWNED_SOURCE_NEW_FILE_EXISTS',409);
   previews.push({path:file.path,before:'',after:file.content,expectedBlobSha:null});
  }else{
   if(!current||current.type!=='file'||current.sha!==file.expectedBlobSha||
      current.encoding!=='base64'||typeof current.content!=='string')
      stop('OWNED_SOURCE_BLOB_SHA_STALE',409);
   const bytes=Buffer.from(current.content.replace(/\s/g,''),'base64');
   if(bytes.length>80000||bytes.includes(0))stop('OWNED_SOURCE_CURRENT_FILE_UNSAFE',409);
   const before=bytes.toString('utf8');
   if(!Buffer.from(before,'utf8').equals(bytes))stop('OWNED_SOURCE_CURRENT_FILE_UNSAFE',409);
   previews.push({path:file.path,before,after:file.content,expectedBlobSha:file.expectedBlobSha});
  }
 }
 return previews;
}
async function saveChatProof({authorization,key,supabaseOrigin},issueNumber,proof){
 const text=('Owner-approved Draft PR #'+proof.prNumber+
  ' '+proof.prUrl+'; verified commit '+proof.commitSha+
  '. CI, merge and LIVE remain UNVERIFIED.').slice(0,1700);
 try{
  const r=await fetch(supabaseOrigin+'/functions/v1/'+EDGE,{
   method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
   headers:{Authorization:authorization,apikey:key,'Content-Type':'application/json'},
   body:JSON.stringify({action:'commander_append_event',issueNumber,eventId:crypto.randomUUID(),
     kind:'note',text})});
  const data=await r.json().catch(()=>null);
  return r.ok&&data?.appended===true;
 }catch{return false}
}
export async function POST(request){
 try{
  const origin=request.headers.get('origin');
  if(origin&&origin!==ORIGIN||request.headers.get('sec-fetch-site')==='cross-site')
    return json(403,{error:'ORIGIN_DENIED'});
  const input=await bodyJson(request);
  const identity=await ownerAndRun(request,input);
  await consumeRate(getAppConfig(),{op:'agent-director-source-review-minute',actorId:identity.ownerId},3,60);
  const common={ownerId:identity.ownerId,runId:input.runId,chatId:input.chatId,
    issueNumber:input.issueNumber,baseSha:input.baseSha,filesJson:input.filesJson,
    commitMessage:input.commitMessage};
  const reviewed=validateReviewedPatch(input.filesJson);
  if(input.action==='preview'){
   const files=await verifyCurrentFiles(input.baseSha,reviewed.files);
   const review=issueReviewedSource(common,{secret:process.env.HH_AGENT_DIRECTOR_BRIDGE_SECRET});
   return json(200,{schema:'HH_AGENT_SOURCE_REVIEW_V1',reviewToken:review.reviewToken,
    expiresAt:review.expiresAt,filesSha256:review.filesSha256,files,writePerformed:false,
    nextStep:'Inspect this exact diff and explicitly confirm one Draft PR publication.'});
  }
  if(input.confirmed!==true)return json(403,{error:'OWNED_SOURCE_EXPLICIT_CONFIRMATION_REQUIRED'});
  const {receipt}=verifyReviewedSource({...common,reviewToken:input.reviewToken},
    {secret:process.env.HH_AGENT_DIRECTOR_BRIDGE_SECRET});
  if(!ownedGithubAppConfigured(process.env))
    return json(503,{error:'OWNED_GITHUB_APP_NOT_CONFIGURED',writePerformed:false});
  if(!independentlyVerifiedZeroCost(process.env,receipt))
    return json(409,{error:'OWNED_GITHUB_CI_COST_UNVERIFIED',writePerformed:false});
  await verifyCurrentFiles(input.baseSha,reviewed.files);
  const job={id:input.runId,projectKey:'holistic-house',task:'Owner-approved source patch',
    githubPlan:{repo:REPO,baseBranch:BRANCH,
      prTitle:typeof input.prTitle==='string'?input.prTitle.slice(0,120):'Agent Director · approved patch',
      prBody:'Owner-reviewed diff, exactly-bound to a completed read-only Director run.'}};
  const project={repo:REPO,productionBranch:BRANCH,defaultBranch:'codex/bootstrap-books'};
  const published=await publishOwnedDraftSource({
   job,project,expectedBaseSha:input.baseSha,filesJson:reviewed.normalized,
   commitMessage:input.commitMessage,confirmWrite:true,
   ownerAuthorized:true,freeCiBudgetVerified:true
  },{env:process.env,signal:AbortSignal.timeout(20000)});
  const chatSaved=await saveChatProof(identity,input.issueNumber,published);
  return json(chatSaved?201:207,{schema:'HH_AGENT_SOURCE_PUBLISH_V1',
   status:'COMMIT_PUBLISHED_VERIFIED',proof:published,chatSaved,
   ciVerified:false,merged:false,deployed:false});
 }catch(error){
  const status=Number.isInteger(error?.status)?error.status:
    Number.isInteger(error?.statusCode)?error.statusCode:503;
  const reason=/^[A-Z0-9_]{3,100}$/.test(error?.message||'')?error.message:'OWNED_SOURCE_UNAVAILABLE';
  return json(status,{error:reason,writeSuccessUnconfirmed:status===503});
 }
}
