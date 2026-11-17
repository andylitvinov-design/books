import {NextResponse} from 'next/server';
import {getAppConfig,requireSameOrigin,requestOrigin} from '@/lib/app/config';
import {createRequestAuth} from '@/lib/app/session';
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http';
import {AppError} from '@/lib/assessments/contracts';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const preferredRegion='yul1';
const EDGE='agent-commander-pr-completion-v1';

async function route(request,method){
 let auth=null;
 try{
  const config=getAppConfig();
  if(method==='POST')requireSameOrigin(request,config);
  else requestOrigin(request,config);
  auth=createRequestAuth(request,config);
  const actor=await auth.verified();
  let payload;
  if(method==='POST'){
   const raw=await request.text();
   if(raw.length>2500)throw new AppError('INVALID_PR_REQUEST',400);
   try{payload=JSON.parse(raw)}catch{throw new AppError('INVALID_JSON',400)}
   if(!payload||typeof payload!=='object'||Array.isArray(payload)||
     Object.keys(payload).some(k=>!['prNumber','requestId','chatNumber'].includes(k))||
     !Number.isSafeInteger(payload.prNumber)||payload.prNumber<1||payload.prNumber>99999999||
     typeof payload.requestId!=='string'||!
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.requestId)||
     (payload.chatNumber!==undefined&&(!Number.isSafeInteger(payload.chatNumber)||payload.chatNumber<1)))
    throw new AppError('INVALID_PR_REQUEST',400);
   payload={action:'submit',...payload};
  }else{
   const u=new URL(request.url);
   if([...u.searchParams.keys()].some(k=>k!=='pr')||u.searchParams.getAll('pr').length>1)
    throw new AppError('INVALID_PR_QUERY',400);
   const raw=u.searchParams.get('pr');
   if(raw!==null&&!/^[1-9]\d{0,7}$/.test(raw))throw new AppError('INVALID_PR_QUERY',400);
   payload={action:'status',...(raw?{prNumber:Number(raw)}:{})};
  }
  const response=await fetch(config.supabaseUrl+'/functions/v1/'+EDGE,{
   method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(11000),
   headers:{apikey:config.publishableKey,Authorization:'Bearer '+actor.accessToken,
    'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify(payload)});
  const raw=await response.text();
  if(raw.length>20000)throw new AppError('PR_COMPLETION_RESULT_TOO_LARGE',502);
  let data;try{data=JSON.parse(raw)}catch{throw new AppError('PR_COMPLETION_RESULT_INVALID',502)}
  const status=[200,400,401,403,404,409].includes(response.status)?response.status:503;
  if(!response.ok||data?.schema!=='HH_COMMANDER_PR_COMPLETION_V1'&&method==='GET')
   return auth.apply(NextResponse.json({error:data?.error||'PR_COMPLETION_UNAVAILABLE'},
    {status,headers:PRIVATE_HEADERS}));
  return auth.apply(NextResponse.json(data,{status:response.status,headers:PRIVATE_HEADERS}));
 }catch(error){
  const safe=safeError(error);
  const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
  return auth?auth.apply(result):result;
 }
}
export async function GET(request){return route(request,'GET')}
export async function POST(request){return route(request,'POST')}
