import {NextResponse} from 'next/server';
import {getAppConfig,requireSameOrigin,requestOrigin} from '@/lib/app/config';
import {createRequestAuth} from '@/lib/app/session';
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http';
import {AppError} from '@/lib/assessments/contracts';
import {buildPrCompletionJourney} from '@/lib/agent-director/pr-completion-journey.mjs';
import {verifyPrLiveReadback} from '@/lib/agent-director/pr-live-identity.mjs';
import {buildPrHeadHistory} from '@/lib/agent-director/pr-head-history.mjs';

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


async function githubHistoryEvidence(pr,ciEvents,page){
 if(!pr)return {commits:[],checksBySha:{},forcePushes:[],
  page,pageCount:1,commitHistoryComplete:false,checksComplete:false};
 const total=Number.isSafeInteger(pr.commits)&&pr.commits>=0?pr.commits:0;
 const pageCount=Math.max(1,Math.ceil(total/10)),gitPage=pageCount-page+1;
 const [commitsResponse,timelineResponse,filesResponse]=await Promise.allSettled([
  gitPage>0?githubJson('/pulls/'+pr.number+'/commits?per_page=10&page='+gitPage,220000):Promise.resolve([]),
  page===1?githubJson('/issues/'+pr.number+'/timeline?per_page=100&page=1',360000):Promise.resolve([]),
  githubJson('/pulls/'+pr.number+'/files?per_page=100',220000)
 ]);
 const commitHistoryComplete=commitsResponse.status==='fulfilled'&&Array.isArray(commitsResponse.value);
 const commits=commitHistoryComplete?commitsResponse.value:[];
 const timeline=timelineResponse.status==='fulfilled'&&Array.isArray(timelineResponse.value)?
  timelineResponse.value:[];
 const forcePushes=timeline.filter(x=>x?.event==='head_ref_force_pushed').map(x=>({
  before:x.before_commit?.sha||x.before_commit,
  after:x.after_commit?.sha||x.after_commit,at:x.created_at
 }));
 const files=filesResponse.status==='fulfilled'&&Array.isArray(filesResponse.value)?filesResponse.value:[];
 const siteRuntimeOnly=Number.isSafeInteger(pr.changed_files)&&
  pr.changed_files>0&&pr.changed_files===files.length&&
  files.every(f=>typeof f.filename==='string'&&
    !/^supabase\/(?:functions|migrations)\//.test(f.filename))&&
  files.some(f=>/^(?:app\/|components\/|public\/|lib\/(?!ci\/)|styles\/|content\/|data\/|next\.config\.)/.test(f.filename));
 const releaseScope=Number.isSafeInteger(pr.changed_files)&&pr.changed_files>0&&
  pr.changed_files===files.length&&files.every(f=>typeof f.filename==='string'&&
   /^supabase\/(functions|migrations)\//.test(f.filename))?'SUPABASE_ONLY':
  pr.changed_files===files.length?'SITE_OR_MIXED':'UNKNOWN';
 const unique=new Set();
 for(const sha of [pr.head.sha,...commits.map(x=>x?.sha),
  ...ciEvents.slice(0,8).map(x=>x?.headSha),
  ...forcePushes.flatMap(x=>[x.before,x.after])]){
  if(SHA.test(sha||''))unique.add(sha.toLowerCase());
 }
 // Bounded, on-demand source reads. Never poll every PR or trigger CI.
 const selected=[...unique].slice(0,20);
 const checksBySha={};let checksComplete=unique.size<=selected.length;
 const result=await Promise.allSettled(selected.map(sha=>
  githubJson('/commits/'+sha+'/check-runs?per_page=100&filter=all',320000)));
 result.forEach((out,i)=>{
  const sha=selected[i];
  if(out.status==='fulfilled'&&Array.isArray(out.value?.check_runs)&&
    Number.isSafeInteger(out.value?.total_count)&&
    out.value.total_count===out.value.check_runs.length){
   checksBySha[sha]=out.value.check_runs;
  }else checksComplete=false;
 });
 return {commits,checksBySha,forcePushes,page,pageCount,
  commitHistoryComplete,checksComplete,releaseScope,siteRuntimeOnly};
}

async function route(request,method){
 let auth=null;
 try{
  const config=getAppConfig();
  if(method==='POST')requireSameOrigin(request,config);
  else requestOrigin(request,config);
  auth=createRequestAuth(request,config);
  const actor=await auth.verified();
  let payload,detailsRequested=false,detailsPr=null,historyPage=1;
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
   if([...u.searchParams.keys()].some(k=>!['pr','details','historyPage'].includes(k))||
     u.searchParams.getAll('pr').length>1||u.searchParams.getAll('details').length>1||
     u.searchParams.getAll('historyPage').length>1||
     u.searchParams.has('details')&&u.searchParams.get('details')!=='1')
    throw new AppError('INVALID_PR_QUERY',400);
   const raw=u.searchParams.get('pr');
   if(raw!==null&&!/^[1-9]\d{0,7}$/.test(raw))
    throw new AppError('INVALID_PR_QUERY',400);
   detailsRequested=u.searchParams.get('details')==='1';
   if(detailsRequested&&raw===null)
    throw new AppError('PR_DETAILS_REQUIRE_EXACT_NUMBER',400);
   detailsPr=raw?Number(raw):null;
   const rawHistoryPage=u.searchParams.get('historyPage');
   if(rawHistoryPage!==null&&(!detailsRequested||!/^[1-9]\d{0,2}$/.test(rawHistoryPage)))
    throw new AppError('INVALID_PR_HISTORY_PAGE',400);
   historyPage=rawHistoryPage?Number(rawHistoryPage):1;
   payload={action:detailsRequested?'history':'status',
    ...(raw?{prNumber:detailsPr}:{}),...(detailsRequested?{page:historyPage}:{})};
  }
  const edgeRequest=body=>fetch(config.supabaseUrl+'/functions/v1/'+EDGE,{
   method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(11000),
   headers:{apikey:config.publishableKey,Authorization:'Bearer '+actor.accessToken,
    'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify(body)});
  let response=await edgeRequest(payload);
  let raw=await response.text();
  if(raw.length>(detailsRequested?65000:20000))
   throw new AppError('PR_COMPLETION_RESULT_TOO_LARGE',502);
  let data;try{data=JSON.parse(raw)}catch{throw new AppError('PR_COMPLETION_RESULT_INVALID',502)}
  // Until the compatible Edge update is deployed, keep the existing owner queue usable.
  if(detailsRequested&&response.status===400&&data?.error==='UNKNOWN_ACTION'){
   response=await edgeRequest({action:'status',prNumber:detailsPr});
   raw=await response.text();
   if(raw.length>20000)throw new AppError('PR_COMPLETION_RESULT_TOO_LARGE',502);
   try{data=JSON.parse(raw)}catch{throw new AppError('PR_COMPLETION_RESULT_INVALID',502)}
   data.ciHistoryAvailable=false;
  }
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
   const observedAt=new Date().toISOString();
   const ciEvents=data.ciHistoryAvailable===true&&Array.isArray(data.ciEvents)?
    data.ciEvents:[];
   const historyEvidence=await githubHistoryEvidence(evidence.pr,ciEvents,historyPage);
   const scope=historyEvidence.releaseScope||'UNKNOWN';
   // The site bundle cannot prove separate Supabase Edge or SQL changes.
   const production=historyEvidence.siteRuntimeOnly===true&&
     evidence.pr?.state==='closed'&&evidence.pr.merged===true?
     await verifyPrLiveReadback(evidence.pr):
     {verified_live:false,reason:historyEvidence.siteRuntimeOnly===true?
      'PR_NOT_MERGED':'NON_SITE_RUNTIME_SCOPE_UNVERIFIED'};
   const journey=buildPrCompletionJourney({item,github:evidence,production,ciEvents,observedAt,
    verifiedCommitShas:historyEvidence.commitHistoryComplete?
     historyEvidence.commits.map(c=>c.sha):[]});
   const history=evidence.pr?buildPrHeadHistory({
    pr:evidence.pr,item,ciEvents,observedAt,...historyEvidence,
    ciHistoryAvailable:data.ciHistoryAvailable===true,
    ciHistoryComplete:data.ciHistoryAvailable===true&&data.ciHasMore!==true
   }):null;
   const isSupabaseOnly=scope==='SUPABASE_ONLY';
   const receipt=evidence.pr?.merged===true&&evidence.commentsComplete?
    evidence.comments.find(c=>c?.user?.login==='andylitvinov-design'&&
     typeof c.body==='string'&&
     c.body.includes('<!-- HH_PR_PRODUCTION_RECEIPT_V1 pr='+detailsPr+
      ' merge='+evidence.pr.merge_commit_sha+' ')):null;
   const reportedRelease=receipt?{
    status:/status=`([A-Z_]+)`/.exec(receipt.body)?.[1]||'UNVERIFIED',
    observedAt:receipt.created_at||null,
    url:Number.isSafeInteger(receipt.id)?
     'https://github.com/'+REPO+'/pull/'+detailsPr+'#issuecomment-'+receipt.id:null,
    proofLevel:'OWNER_NOTE_NOT_INDEPENDENT_ACCEPTANCE'}:null;
   const corrected=isSupabaseOnly&&journey.currentStage==='live'?{
    ...journey,currentStageTitle:'Проверка Supabase runtime',
    stages:journey.stages.map(step=>step.id==='live'?{...step,
     title:'Проверка Supabase runtime',
     detail:'Это изменение только Supabase. GitHub merge и Vercel READY не подтверждают работу Edge/API; нужен отдельный runtime-тест.'}:step)
   }:journey;
   return auth.apply(NextResponse.json({...corrected,
    history:history?{...history,releaseScope:scope,reportedRelease}:null},
    {status:200,headers:PRIVATE_HEADERS}));
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
