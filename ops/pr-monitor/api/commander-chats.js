'use strict';
/* Private Agent Commander chat API. All chat headers and events are owner-scoped in Supabase. */
const {callStore,sendJson,isOriginAllowed}=require('../lib/commander-private-store');
async function freeModels(req,res){
 const owner=await callStore(req,'status',{}, {method:'GET'});
 if(owner.status!==200||owner.data?.owner!==true||owner.data?.privateStoreConfigured!==true)
  return sendJson(res,owner.status===401?401:403,{error:'OWNER_SESSION_REQUIRED'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
 try{
  const response=await fetch('https://openrouter.ai/api/v1/models?endpoints='+encodeURIComponent('/api/v1/chat/completions'),{
   method:'GET',cache:'no-store',redirect:'error',signal:controller.signal,headers:{Accept:'application/json'}
  });
  if(!response.ok)return sendJson(res,503,{error:'FREE_MODEL_CATALOG_UNAVAILABLE'});
  const raw=await response.text();if(raw.length>8*1024*1024)return sendJson(res,502,{error:'FREE_MODEL_CATALOG_TOO_LARGE'});
  const data=JSON.parse(raw);if(!Array.isArray(data.data))return sendJson(res,502,{error:'FREE_MODEL_CATALOG_INVALID'});
  const models=data.data.filter(m=>{
   if(typeof m?.id!=='string'||!m.id.endsWith(':free'))return false;
   const p=m.pricing;if(!p||typeof p!=='object'||p.prompt===undefined||p.completion===undefined)return false;
   if(!Object.values(p).every(v=>(typeof v==='number'||typeof v==='string')&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)===0))return false;
   return Array.isArray(m.architecture?.input_modalities)&&m.architecture.input_modalities.includes('text')&&
    Array.isArray(m.architecture?.output_modalities)&&m.architecture.output_modalities.includes('text')&&
    (!Array.isArray(m.endpoints)||m.endpoints.includes('/api/v1/chat/completions'));
  }).slice(0,40).map(m=>({id:m.id,name:String(m.name||m.id).slice(0,100),pricing:'$0 verified by live catalog'}));
  return sendJson(res,200,{schema:'HH_COMMANDER_EXECUTOR_FREE_MODELS_V1',models,verifiedAt:new Date().toISOString(),pricing:'zero_only',source:'OPENROUTER_LIVE_CATALOG',actualRequestCostMustBeVerifiedByHermes:true});
 }catch(error){return sendJson(res,503,{error:error?.name==='AbortError'?'FREE_MODEL_CATALOG_TIMEOUT':'FREE_MODEL_CATALOG_UNAVAILABLE'});}
 finally{clearTimeout(timer);}
}
// No model inference is triggered by this GET; it never returns the account key or raw provider details.
async function readMonitorFreeQuota(){
 const schema="HH_COMMANDER_FREE_QUOTA_V1",observedAt=new Date().toISOString();
 const unavailable=reason=>({schema,status:"UNAVAILABLE",reason,observedAt});
 const key=process.env.HH_PM_OPENROUTER_API_KEY||"";
 if(!key)return unavailable("KEY_NOT_CONFIGURED");
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
 try{
  const result=await fetch("https://openrouter.ai/api/v1/key",{
   method:"GET",redirect:"error",cache:"no-store",signal:controller.signal,
   headers:{Authorization:"Bearer "+key,Accept:"application/json"}
  });
  if(!result.ok)return unavailable("PROVIDER_UNAVAILABLE");
  const raw=await result.text();
  if(raw.length>16000)return unavailable("PROVIDER_RESPONSE_TOO_LARGE");
  const counter=JSON.parse(raw)?.data?.free_model_daily_requests;
  if(!counter||![counter.used,counter.limit,counter.remaining].every(Number.isSafeInteger)||
     counter.used<0||counter.limit<0||counter.remaining<0||counter.remaining>counter.limit)
   return unavailable("QUOTA_NOT_REPORTED");
  return {schema,status:"VERIFIED",remaining:counter.remaining,
   used:counter.used,limit:counter.limit,source:"OPENROUTER_KEY_API",
   sharedAcrossFreeModels:true,observedAt};
 }catch{return unavailable("PROVIDER_UNAVAILABLE")}
 finally{clearTimeout(timer)}
}
async function freeQuota(req,res){
 // Reuse the authenticated Supabase owner ACL BEFORE consulting the Vercel provider key.
 const worker=await callStore(req,"commander_free_model_quota",{}, {method:"GET"});
 if(worker.status!==200)return sendJson(res,worker.status,{error:worker.data?.error||"OWNER_QUOTA_UNAVAILABLE"});
 const monitor=await readMonitorFreeQuota();
 return sendJson(res,200,{schema:"HH_COMMANDER_QUOTA_MENU_V1",worker:worker.data,
  monitor,observedAt:new Date().toISOString(),sharedCounterPerProviderAccount:true});
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
   else if(name==='free_models'||name==='executor_models')return await freeModels(req,res);
   else if(name==='free_quota')return await freeQuota(req,res);
   else if(name==='list')action='commander_list_chats';
   else if(name==='read'){action='commander_read_chat';body.issueNumber=Number(url.searchParams.get('issue'))}
   else if(name==='proof'){action='commander_pr_proof';body.pr=Number(url.searchParams.get('pr'))}
   else if(name==='runs'){action='commander_list_execution_runs';body.issueNumber=Number(url.searchParams.get('issue'))}
   else if(name==='ci_events'){
    action='commander_list_ci_events';
    const prValue=url.searchParams.get('pr'),limitValue=url.searchParams.get('limit');
    if(prValue!==null)body.pr=Number(prValue);
    if(limitValue!==null)body.limit=Number(limitValue);
    // Forward only a paired, owner-authenticated cursor to the existing store.
    // No public database access or separate scheduled pagination service.
    const before=url.searchParams.get('before'),beforeId=url.searchParams.get('before_id');
    if((before===null)!==(beforeId===null))
      return sendJson(res,400,{error:'INCOMPLETE_CI_EVENT_CURSOR'});
    if(before!==null){body.before=before;body.beforeId=beforeId;}
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
   else if(name==='run'){
    action='commander_start_run';
    // This project is first-party only. Never forward code execution to legacy Hermes Cloud.
    if(body.executor==='hermes')return sendJson(res,410,{error:'EXTERNAL_HERMES_SERVICE_DISABLED_FIRST_PARTY_ONLY'});
    // Owner-only named models must be exactly an editorially verified :free ID.
    // The existing Supabase service independently rechecks the live catalogue.
    if(body.executor==='local'&&body.modelId!=='owned-default'&&
       !(typeof body.modelId==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*:free$/.test(body.modelId)))
      return sendJson(res,400,{error:'VERIFIED_FREE_MODEL_REQUIRED'});
    if(body.executor==='hermes'&&(typeof body.modelId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*:free$/.test(body.modelId)))
      return sendJson(res,400,{error:'VERIFIED_FREE_MODEL_REQUIRED'});
    if(body.confirmGitHubWrite!==undefined&&typeof body.confirmGitHubWrite!=='boolean')return sendJson(res,400,{error:'INVALID_GITHUB_WRITE_CONSENT'});
    if(body.executor==='local'&&body.confirmGitHubWrite===true)
      return sendJson(res,403,{error:'OWNED_DIRECTOR_SOURCE_WRITE_NOT_AVAILABLE'});
    body={issueNumber:body.issueNumber,runId:body.runId,idempotencyKey:body.idempotencyKey,executor:body.executor,message:body.message,modelId:body.modelId||'',confirmGitHubWrite:body.executor==='hermes'&&body.confirmGitHubWrite===true};
   }
   else return sendJson(res,400,{error:'UNKNOWN_ACTION'});
  }
  const result=await callStore(req,action,body,{method:req.method});
  if(result.status===200&&action==='status')return sendJson(res,200,{schema:'HH_COMMANDER_THREAD_V1',
   authenticated:true,privateStoreConfigured:true,storage:'SUPABASE_PRIVATE',executorDispatch:result.data.executorDispatch===true,dispatchAvailable:result.data.dispatchAvailable===true,dispatchMode:result.data.dispatchMode||null,executionRunLedger:result.data.executionRunLedger===true,dispatchReason:result.data.dispatchReason||'NO_VERIFIED_EXECUTOR_RUNTIME',liveVerification:false,
   observedAt:result.data.checkedAt||new Date().toISOString()});
  return sendJson(res,result.status,result.data);
 }catch(error){return sendJson(res,error.status||503,{error:error.code||'PRIVATE_STORE_UNAVAILABLE'})}
};
