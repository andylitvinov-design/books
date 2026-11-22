'use strict';
/* Owner-only PR→LIVE bridge for the existing Agent Commander Tasks tab.
 * Reuse the exact authenticated private queue. No GitHub write token in
 * browser, no new PR repair service, paid model, cron or automatic CI run.
 */
const {sendJson,isOriginAllowed,tokenFromRequest,callStore}=require('../lib/commander-private-store');
const SCHEMA='HH_COMMANDER_PR_COMPLETION_V1';
const EDGE='https://shervdixkaxurnaecioe.supabase.co/functions/v1/agent-commander-pr-completion-v1';
const URL='https://shervdixkaxurnaecioe.supabase.co';
const PR=/^[1-9][0-9]{0,7}$/,UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function number(v){
 if(typeof v==='number'&&Number.isSafeInteger(v)&&v>0&&v<=99999999)return v;
 return typeof v==='string'&&PR.test(v)?Number(v):null;
}
function parseBody(raw){
 let b=raw;
 if(typeof raw==='string'){try{b=JSON.parse(raw)}catch{return {error:'INVALID_JSON'}}}
 if(!b||typeof b!=='object'||Array.isArray(b))return {error:'INVALID_BODY'};
 const action=b.action;
 if(!['submit','status','history'].includes(action))return {error:'ACTION_NOT_ALLOWED'};
 const allowed=action==='status'?new Set(['action','prNumber']):
  action==='history'?new Set(['action','prNumber','page']):
   new Set(['action','prNumber','requestId']);
 if(Object.keys(b).some(k=>!allowed.has(k)))return {error:'EXTRA_FIELDS_NOT_ALLOWED'};
 const n=b.prNumber===undefined?null:number(b.prNumber);
 if((action!=='status'||b.prNumber!==undefined)&&n===null)return {error:'PR_NUMBER_INVALID'};
 if(action==='submit'&&(!UUID.test(b.requestId||'')||typeof b.requestId!=='string'))
  return {error:'REQUEST_ID_INVALID'};
 const page=b.page===undefined?1:Number(b.page);
 if(action==='history'&&(!Number.isSafeInteger(page)||page<1||page>20))
  return {error:'PAGE_INVALID'};
 const body={action};
 if(n!==null)body.prNumber=n;
 if(action==='submit')body.requestId=b.requestId;
 if(action==='history')body.page=page;
 return {body};
}
async function forward(req,body,token){
 const key=process.env.HH_PM_SUPABASE_PUBLISHABLE_KEY;
 if(process.env.HH_PM_SUPABASE_URL!==URL||
  typeof key!=='string'||!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key))
  return {status:503,data:{error:'PR_GATEWAY_NOT_CONFIGURED'}};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),11500);
 try{
  const response=await fetch(EDGE,{method:'POST',cache:'no-store',redirect:'error',
   signal:controller.signal,headers:{apikey:key,Authorization:'Bearer '+token,
    'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify(body)});
  const raw=await response.text();
  if(raw.length>300000)return {status:502,data:{error:'PR_UPSTREAM_OVERSIZED'}};
  let data;try{data=JSON.parse(raw)}catch{return {status:502,data:{error:'PR_UPSTREAM_INVALID_JSON'}}}
  if(!data||typeof data!=='object'||Array.isArray(data))
   return {status:502,data:{error:'PR_UPSTREAM_INVALID_SCHEMA'}};
  if(response.status===200&&data.schema!==SCHEMA)
   return {status:502,data:{error:'PR_UPSTREAM_SCHEMA_CHANGED'}};
  return {status:response.status,data};
 }catch{return {status:503,data:{error:'PR_GATEWAY_UNAVAILABLE'}}}
 finally{clearTimeout(timer)}
}
module.exports=async function(req,res){
 res.setHeader('Vary','Cookie, Origin');
 res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 if(req.method!=='POST')return sendJson(res,405,{error:'METHOD_NOT_ALLOWED'});
 if(!isOriginAllowed(req))return sendJson(res,403,{error:'CROSS_ORIGIN_DENIED'});
 if(Number(req.headers?.['content-length']||0)>2200)return sendJson(res,413,{error:'BODY_TOO_LARGE'});
 const parsed=parseBody(req.body);
 if(parsed.error)return sendJson(res,400,{error:parsed.error});
 try{
  const token=tokenFromRequest(req);
  if(!token)return sendJson(res,401,{error:'OWNER_SESSION_REQUIRED'});
  // Explicit owner+RLS check before any private queue read/write.
  const owner=await callStore(req,'status',{}, {method:'GET',token});
  if(owner.status!==200||owner.data?.owner!==true||owner.data?.privateStoreConfigured!==true)
   return sendJson(res,owner.status===401?401:owner.status===503?503:403,
    {error:'OWNER_ACCESS_NOT_VERIFIED'});
  const result=await forward(req,parsed.body,token);
  return sendJson(res,result.status,result.data);
 }catch(error){
  return sendJson(res,error.status===401?401:error.status===403?403:503,
   {error:error.code||'PR_GATEWAY_UNAVAILABLE'});
 }
};
module.exports.__test={parseBody,number,EDGE,SCHEMA};
