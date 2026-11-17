import {NextResponse} from 'next/server';
import {getAppConfig,requireSameOrigin,requestOrigin} from '@/lib/app/config';
import {createRequestAuth} from '@/lib/app/session';
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http';
import {AppError} from '@/lib/assessments/contracts';
import {buildPrCompletionJourney} from '@/lib/agent-director/pr-completion-journey.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const preferredRegion='yul1';
const EDGE='agent-commander-pr-completion-v1';
const REPO='andylitvinov-design/books';
const GITHUB='https://api.github.com/repos/'+REPO;
const SHA=/^[a-f0-9]{40}$/i;
async function githubJson(path,maxBytes=240000){
 const response=await fetch(GITHUB+path,{method:'GET',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(6000),
  headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
   'User-Agent':'HH-Commander-PR-Journey'}});
 if(!response.ok)throw Error('GITHUB_READ_UNAVAILABLE');
 const raw=await response.text();
 if(raw.length>maxBytes)throw Error('GITHUB_READ_TOO_LARGE');
 return JSON.parse(raw);
}
async function githubJourneyEvidence(number){
 let pr;
 try{pr=await githubJson('/pulls/'+number)}
 catch{return {pr:null,checksComplete:false,commentsComplete:false}}
 if(pr?.number!==number||pr.head?.repo?.full_name!==REPO||
    pr.base?.repo?.full_name!==REPO||
    pr.base?.ref!=='codex/public-book-library'||!SHA.test(pr.head?.sha||''))
  return {pr:null,checksComplete:false,commentsComplete:false};
 const [checks,comments]=await Promise.allSettled([
  githubJson('/commits/'+pr.head.sha+'/check-runs?per_page=100&filter=latest',320000),
  githubJson('/issues/'+number+'/comments?per_page=100&page=1',380000)
 ]);
 const checked=checks.status==='fulfilled'&&
  Number.isSafeInteger(checks.value?.total_count)&&
  checks.value.total_count>=0&&checks.value.total_count<=100&&
  Array.isArray(checks.value?.check_runs)&&
  checks.value.check_runs.length===checks.value.total_count;
 const commented=comments.status==='fulfilled'&&
  Array.isArray(comments.value)&&comments.value.length<100;
 return {pr,checks:checked?checks.value.check_runs:[],
  checksComplete:checked,
  comments:commented?comments.value:[],commentsComplete:commented};
}

async function route(request,method){
 let auth=null;
 try{
  const config=getAppConfig();
  if(method==='POST')requireSameOrigin(request,config);
  else requestOrigin(request,config);
  auth=createRequestAuth(request,config);
  const actor=await auth.verified();
  let payload,detailsRequested=false,detailsPr=null;
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
   if([...u.searchParams.keys()].some(k=>!['pr','details'].includes(k))||
     u.searchParams.getAll('pr').length>1||u.searchParams.getAll('details').length>1||
     u.searchParams.has('details')&&u.searchParams.get('details')!=='1')
    throw new AppError('INVALID_PR_QUERY',400);
   const raw=u.searchParams.get('pr');
   if(raw!==null&&!/^[1-9]\d{0,7}$/.test(raw))
    throw new AppError('INVALID_PR_QUERY',400);
   detailsRequested=u.searchParams.get('details')==='1';
   if(detailsRequested&&raw===null)
    throw new AppError('PR_DETAILS_REQUIRE_EXACT_NUMBER',400);
   detailsPr=raw?Number(raw):null;
   payload={action:'status',...(raw?{prNumber:detailsPr}:{})};
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
  if(detailsRequested){
   const item=Array.isArray(data.items)?
    data.items.find(x=>x?.prNumber===detailsPr):null;
   if(!item)return auth.apply(NextResponse.json({error:'OWNER_PR_NOT_IN_QUEUE'},
    {status:404,headers:PRIVATE_HEADERS}));
   const evidence=await githubJourneyEvidence(detailsPr);
   const result=buildPrCompletionJourney({
    item,github:evidence,observedAt:new Date().toISOString()
   });
   return auth.apply(NextResponse.json(result,{status:200,headers:PRIVATE_HEADERS}));
  }
  return auth.apply(NextResponse.json(data,{status:response.status,headers:PRIVATE_HEADERS}));
 }catch(error){
  const safe=safeError(error);
  const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
  return auth?auth.apply(result):result;
 }
}
export async function GET(request){return route(request,'GET')}
export async function POST(request){return route(request,'POST')}
