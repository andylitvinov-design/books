'use strict';
/* Private Agent Commander task API; durable task records live in Supabase. */
const {callStore,sendJson,isOriginAllowed}=require('../lib/commander-private-store');
module.exports=async function(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie, Origin');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 if(!['GET','POST'].includes(req.method))return sendJson(res,405,{error:'METHOD_NOT_ALLOWED'});
 if(req.method==='POST'&&!isOriginAllowed(req))return sendJson(res,403,{error:'CROSS_ORIGIN_DENIED'});
 const url=new URL(req.url,'https://holistic-house-pr-monitor.vercel.app'),name=url.searchParams.get('action')||'status';
 try{
  let action,body={};
  if(req.method==='GET'){
   if(name==='status')action='status';
   else if(name==='list')action='commander_list_tasks';
   else if(name==='read'){action='commander_read_task';body.issueNumber=Number(url.searchParams.get('id'))}
   else return sendJson(res,400,{error:'UNKNOWN_ACTION'});
  }else{
   body=req.body;if(typeof body==='string')try{body=JSON.parse(body)}catch{return sendJson(res,400,{error:'INVALID_JSON'})}
   if(!body||typeof body!=='object'||Array.isArray(body))return sendJson(res,400,{error:'INVALID_BODY'});
   if(name==='save'){action='commander_save_task';body={record:body.record,issueNumber:body.issueNumber}}
   else if(name==='queue'){action='commander_queue_task';body={issueNumber:body.issueNumber}}
   else return sendJson(res,400,{error:'UNKNOWN_ACTION'});
  }
  const result=await callStore(req,action,body,{method:req.method});
  if(result.status===200&&action==='status')return sendJson(res,200,{authenticated:true,privateStoreConfigured:true,
    queueMeans:'SUPABASE_PRIVATE_REVIEW_QUEUE_ONLY_NO_EXECUTOR_DISPATCH',observedAt:result.data.checkedAt||new Date().toISOString()});
  return sendJson(res,result.status,result.data);
 }catch(error){return sendJson(res,error.status||503,{error:error.code||'PRIVATE_STORE_UNAVAILABLE'})}
};
