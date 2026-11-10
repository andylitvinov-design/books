'use strict';
/* Private Agent Commander chat API. All chat headers and events are owner-scoped in Supabase. */
const {callStore,sendJson,isOriginAllowed}=require('../lib/commander-private-store');

const ZERO_PRICE_MODEL=/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*:free$/;
async function serveFreeExecutorModels(req,res){
 // Authenticate with the *existing* Supabase owner gate before querying the
 // public catalog. No OpenRouter credential and no inference request.
 const owner=await callStore(req,'status',{},{method:'GET'});
 if(owner.status!==200)return sendJson(res,owner.status,owner.data);
 if(owner.data?.owner!==true)return sendJson(res,403,{error:'OWNER_ACCESS_DENIED'});
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),6500);
 try{
  const catalogUrl='https://openrouter.ai/api/v1/models?endpoints='+encodeURIComponent('/api/v1/chat/completions');
  const response=await fetch(catalogUrl,{method:'GET',redirect:'error',cache:'no-store',
   signal:ctl.signal,headers:{Accept:'application/json'}});
  if(!response.ok)return sendJson(res,503,{error:'FREE_EXECUTOR_CATALOG_UNAVAILABLE'});
  const raw=await response.text();
  if(raw.length>8*1024*1024)return sendJson(res,503,{error:'FREE_EXECUTOR_CATALOG_TOO_LARGE'});
  const catalog=JSON.parse(raw);
  if(!Array.isArray(catalog?.data))return sendJson(res,503,{error:'FREE_EXECUTOR_CATALOG_INVALID'});
  const models=catalog.data.filter(entry=>{
   if(typeof entry?.id!=='string'||!ZERO_PRICE_MODEL.test(entry.id))return false;
   const p=entry.pricing;
   if(!p||typeof p!=='object'||Array.isArray(p)||
     !Object.hasOwn(p,'prompt')||!Object.hasOwn(p,'completion'))return false;
   if(Object.values(p).some(v=>!(typeof v==='string'||typeof v==='number')||
     String(v).trim()===''||!Number.isFinite(Number(v))||Number(v)!==0))return false;
   if(!entry.architecture?.input_modalities?.includes('text')||
      !entry.architecture?.output_modalities?.includes('text'))return false;
   return entry.endpoints===undefined||
     (Array.isArray(entry.endpoints)&&entry.endpoints.includes('/api/v1/chat/completions'));
  }).map(entry=>({id:entry.id,name:String(entry.name||entry.id).slice(0,120)}))
    .sort((a,b)=>a.name.localeCompare(b.name,'en')).slice(0,60);
  return sendJson(res,200,{schema:'HH_COMMANDER_EXECUTOR_FREE_MODELS_V1',
   models,catalogVerifiedAt:new Date().toISOString(),pricing:'CATALOG_ALL_FIELDS_ZERO',
   actualRequestCostMustBeVerifiedByHermes:true});
 }catch{return sendJson(res,503,{error:'FREE_EXECUTOR_CATALOG_UNAVAILABLE'})}
 finally{clearTimeout(timer)}
}

module.exports=async function(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie, Origin');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
 if(!['GET','POST'].includes(req.method))return sendJson(res,405,{error:'METHOD_NOT_ALLOWED'});
 if(req.method==='POST'&&!isOriginAllowed(req))return sendJson(res,403,{error:'CROSS_ORIGIN_DENIED'});
 try{
  const url=new URL(req.url,'https://holistic-house-pr-monitor.vercel.app'),name=url.searchParams.get('action')||'status';
  let action,body={};
  if(req.method==='GET'){
   if(name==='status')action='status';
   else if(name==='list')action='commander_list_chats';
   else if(name==='read'){action='commander_read_chat';body.issueNumber=Number(url.searchParams.get('issue'))}
   else if(name==='proof'){action='commander_pr_proof';body.pr=Number(url.searchParams.get('pr'))}
   else if(name==='runs'){action='commander_list_execution_runs';body.issueNumber=Number(url.searchParams.get('issue'))}
   else if(name==='executor_models')return await serveFreeExecutorModels(req,res);
   else if(name==='ci_events'){
    action='commander_list_ci_events';
    const prValue=url.searchParams.get('pr'),limitValue=url.searchParams.get('limit');
    if(prValue!==null)body.pr=Number(prValue);
    if(limitValue!==null)body.limit=Number(limitValue);
   }
   else return sendJson(res,400,{error:'UNKNOWN_ACTION'});
  }else{
   body=req.body;if(typeof body==='string')try{body=JSON.parse(body)}catch{return sendJson(res,400,{error:'INVALID_JSON'})}
   if(!body||typeof body!=='object'||Array.isArray(body))return sendJson(res,400,{error:'INVALID_BODY'});
   if(name==='from_task'){action='commander_from_task';body={taskId:body.taskId}}
   else if(name==='create'){action='commander_create_chat';body={chat:body.chat}}
   else if(name==='update'){action='commander_update_chat';body={issueNumber:body.issueNumber,expectedRevision:body.expectedRevision,chat:body.chat}}
   else if(name==='event'){action='commander_append_event';body={issueNumber:body.issueNumber,eventId:body.eventId,kind:body.kind,text:body.text,model:body.model}}
   else if(name==='attach'){action='commander_attach_event';body={issueNumber:body.issueNumber,eventId:body.eventId,url:body.url}}
   else if(name==='run'){action='commander_start_run';body={issueNumber:body.issueNumber,runId:body.runId,idempotencyKey:body.idempotencyKey,executor:body.executor,message:body.message,
     modelId:typeof body.modelId==='string'?body.modelId:'',confirmGitHubWrite:body.confirmGitHubWrite===true}}
   else return sendJson(res,400,{error:'UNKNOWN_ACTION'});
  }
  const result=await callStore(req,action,body,{method:req.method});
  if(result.status===200&&action==='status')return sendJson(res,200,{schema:'HH_COMMANDER_THREAD_V1',
   authenticated:true,privateStoreConfigured:true,storage:'SUPABASE_PRIVATE',executorDispatch:result.data.executorDispatch===true,executionRunLedger:result.data.executionRunLedger===true,dispatchReason:result.data.dispatchReason||'NO_VERIFIED_EXECUTOR_RUNTIME',liveVerification:false,
   observedAt:result.data.checkedAt||new Date().toISOString()});
  return sendJson(res,result.status,result.data);
 }catch(error){return sendJson(res,error.status||503,{error:error.code||'PRIVATE_STORE_UNAVAILABLE'})}
};
