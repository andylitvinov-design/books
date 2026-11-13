'use strict';
/* Owner-only read proxy to existing Commander Edge; never touches public project Brain or PR Monitor caches. */
const {callStore,sendJson,isOriginAllowed}=require('../lib/commander-private-store');
const ACTIONS=Object.freeze({list:'commander_list_agent_digests',detail:'commander_read_agent_digest',lessons:'commander_agent_lesson_candidates'});
const KEY=/^[a-z0-9][a-z0-9-]{0,80}$/;
const AGENT=/^[a-z0-9:_-]{1,80}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Cookie, Origin');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return sendJson(res,405,{error:'METHOD_NOT_ALLOWED'})}
 if(!isOriginAllowed(req))return sendJson(res,403,{error:'CROSS_ORIGIN_DENIED'});
 if(Number(req.headers?.['content-length']||'0')>2048)return sendJson(res,413,{error:'BODY_TOO_LARGE'});
 let b=req.body;
 if(typeof b==='string')try{b=JSON.parse(b)}catch{return sendJson(res,400,{error:'INVALID_JSON'})}
 if(!b||typeof b!=='object'||Array.isArray(b)||JSON.stringify(b).length>2048||
  Object.keys(b).some(k=>!['action','projectKey','agentId','status','limit','query','digestId'].includes(k)))
  return sendJson(res,400,{error:'INVALID_BODY'});
 const action=ACTIONS[b.action];
 if(!action)return sendJson(res,400,{error:'INVALID_ACTION'});
 if(b.projectKey!==undefined&&(typeof b.projectKey!=='string'||!KEY.test(b.projectKey)))return sendJson(res,400,{error:'INVALID_PROJECT'});
 if(b.agentId!==undefined&&(typeof b.agentId!=='string'||!AGENT.test(b.agentId)))return sendJson(res,400,{error:'INVALID_AGENT'});
 if(b.status!==undefined&&!['working','completed','blocked','unknown'].includes(b.status))return sendJson(res,400,{error:'INVALID_STATUS'});
 if(b.limit!==undefined&&(!Number.isInteger(b.limit)||b.limit<1||b.limit>50))return sendJson(res,400,{error:'INVALID_LIMIT'});
 if(b.query!==undefined&&(typeof b.query!=='string'||b.query.length>80))return sendJson(res,400,{error:'INVALID_QUERY'});
 if(b.action==='detail'&&!UUID.test(b.digestId||''))return sendJson(res,400,{error:'INVALID_DIGEST_ID'});
 const payload=b.action==='detail'?{digestId:b.digestId}:b.action==='lessons'?{projectKey:b.projectKey||'agent-commander'}:
  {projectKey:b.projectKey,agentId:b.agentId,status:b.status,limit:b.limit||25,query:b.query||''};
 try{
  const result=await callStore(req,action,payload,{method:'POST'});
  if(result.status!==200)return sendJson(res,result.status,{error:result.data?.error||'OWNER_MEMORY_UNAVAILABLE'});
  return sendJson(res,200,result.data);
 }catch(error){return sendJson(res,error.status||503,{error:error.code||'PRIVATE_STORE_UNAVAILABLE'})}
};
