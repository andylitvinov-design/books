import { NextResponse } from 'next/server';
import { executeOwnedCommanderRun } from '@/lib/agent-director/commander-owned-runtime.mjs';
import { getAppConfig } from '@/lib/app/config';
import { consumeRate } from '@/lib/app/database';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=30;

const PRIVATE_HEADERS={
  'Cache-Control':'private, no-store, max-age=0',
  'Vary':'Authorization, Origin',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer'
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EDGE_FUNCTION='agent-commander-private-store-v1';
const APP_ORIGIN='https://holistichouse.vercel.app';

function json(status,body){
  return NextResponse.json(body,{status,headers:PRIVATE_HEADERS});
}
async function readJson(request){
  const raw=await request.text();
  if(raw.length>20000)throw Object.assign(Error('PAYLOAD_TOO_LARGE'),{status:413});
  try{return JSON.parse(raw)}catch{throw Object.assign(Error('INVALID_JSON'),{status:400})}
}
async function verifyOwner(request,body,fetcher){
  const authorization=request.headers.get('authorization')||'';
  if(!/^Bearer [A-Za-z0-9._-]{120,8000}$/.test(authorization))
    throw Object.assign(Error('OWNER_SESSION_REQUIRED'),{status:401});
  const supabaseUrl=process.env.HH_APP_SUPABASE_URL||'';
  const publishableKey=process.env.HH_APP_SUPABASE_PUBLISHABLE_KEY||'';
  let origin;
  try{origin=new URL(supabaseUrl)}catch{throw Object.assign(Error('OWNER_AUTH_NOT_CONFIGURED'),{status:503})}
  let publicKeyValid=/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(publishableKey);
  if(!publicKeyValid&&/^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/.test(publishableKey)){
    try{publicKeyValid=JSON.parse(Buffer.from(publishableKey.split('.')[1],'base64url').toString('utf8')).role==='anon'}catch{}
  }
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||!publicKeyValid)
    throw Object.assign(Error('OWNER_AUTH_NOT_CONFIGURED'),{status:503});
  if(!Number.isSafeInteger(body.issueNumber)||body.issueNumber<1||body.issueNumber>99999||
    typeof body.requestSha256!=='string'||! /^[a-f0-9]{64}$/.test(body.requestSha256))
    throw Object.assign(Error('AGENT_DIRECTOR_RUN_PROVENANCE_REQUIRED'),{status:400});
  // Verify the owner session, owner write ACL and the exact pre-created run row.
  const [userResponse,storeResponse,runsResponse]=await Promise.all([
    fetcher(origin.origin+'/auth/v1/user',{
      method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
      headers:{apikey:publishableKey,Authorization:authorization,Accept:'application/json'}
    }),
    fetcher(origin.origin+'/functions/v1/'+EDGE_FUNCTION,{
      method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
      headers:{apikey:publishableKey,Authorization:authorization,'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({action:'status'})
    }),
    fetcher(origin.origin+'/functions/v1/'+EDGE_FUNCTION,{
      method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
      headers:{apikey:publishableKey,Authorization:authorization,'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({action:'commander_list_execution_runs',issueNumber:body.issueNumber})
    })
  ]);
  if(!userResponse.ok)throw Object.assign(Error('OWNER_SESSION_INVALID'),{status:401});
  const [user,store,runs]=await Promise.all([
    userResponse.json().catch(()=>null),storeResponse.json().catch(()=>null),runsResponse.json().catch(()=>null)
  ]);
  if(!user||!UUID.test(user.id||'')||!user.email_confirmed_at||body.ownerId!==user.id)
    throw Object.assign(Error('OWNER_IDENTITY_MISMATCH'),{status:403});
  if(!storeResponse.ok||store?.ok!==true||store?.owner!==true||store?.canWrite!==true||
    store?.privateStoreConfigured!==true||store?.service!=='AGENT_COMMANDER_PRIVATE_STORE_V1')
    throw Object.assign(Error('OWNER_PRIVATE_STORE_WRITE_DENIED'),{status:403});
  const run=Array.isArray(runs?.runs)?runs.runs.find(value=>value?.run_id===body.runId):null;
  if(!runsResponse.ok||runs?.chatId!==body.chatId||!run||run.executor!=='local'||
    run.request_sha256!==body.requestSha256||run.status!=='STARTING')
    throw Object.assign(Error('AGENT_DIRECTOR_RUN_NOT_AUTHORIZED'),{status:403});
  return {authorization,ownerId:user.id};
}

export async function POST(request){
  try{
    const origin=request.headers.get('origin');
    if(origin&&origin!==APP_ORIGIN)return json(403,{error:'ORIGIN_DENIED'});
    if(request.headers.get('sec-fetch-site')==='cross-site')return json(403,{error:'ORIGIN_DENIED'});
    const body=await readJson(request);
    if(!body||typeof body!=='object'||Array.isArray(body)||
      Object.keys(body).some(k=>!['schemaVersion','runId','chatId','issueNumber','requestSha256','ownerId','projectKey','message','modelId','confirmGitHubWrite','contextCapsule'].includes(k))||
      body.schemaVersion!==1)return json(400,{error:'INVALID_AGENT_DIRECTOR_ENVELOPE'});
    const fetcher=globalThis.fetch;
    const identity=await verifyOwner(request,body,fetcher);
    const config=getAppConfig();
    await consumeRate(config,{op:'agent-director-run-minute',actorId:identity.ownerId},5,60);
    await consumeRate(config,{op:'agent-director-run-daily',actorId:identity.ownerId},50,86400);
    const receipt=await executeOwnedCommanderRun({
      runId:body.runId,chatId:body.chatId,ownerId:identity.ownerId,
      projectKey:body.projectKey,message:body.message,modelId:body.modelId,
      confirmGitHubWrite:body.confirmGitHubWrite,contextCapsule:body.contextCapsule
    },{env:process.env,fetcher,signal:AbortSignal.timeout(18000)});
    return json(200,receipt);
  }catch(error){
    const status=Number.isInteger(error?.status)?error.status:503;
    const code=/^[A-Z0-9_]{2,80}$/.test(error?.message||'')?error.message:'AGENT_DIRECTOR_RUNTIME_UNAVAILABLE';
    return json(status,{error:code});
  }
}
