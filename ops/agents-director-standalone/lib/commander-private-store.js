'use strict';
const COOKIE='hh_commander_supabase_auth';
const HOST='holistic-house-agents-director.vercel.app';
const STORE_URL='https://shervdixkaxurnaecioe.supabase.co/functions/v1/agent-commander-private-store-v1';

class StoreError extends Error {
  constructor(status,code){super(code);this.status=status;this.code=code;}
}
function tokenFromRequest(req) {
  const cookie=String(req.headers?.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='));
  if(!cookie)return '';
  const token=cookie.slice(COOKIE.length+1);
  if(token.length<120||token.length>8192||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))return '';
  try{
    const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
    if(!claims||typeof claims.sub!=='string'||!/^[0-9a-f-]{36}$/i.test(claims.sub)||
       !Number.isSafeInteger(claims.exp)||claims.exp<=Math.floor(Date.now()/1000))return '';
    return token;
  }catch{return '';}
}
function isOriginAllowed(req) {
  const host=String(req.headers?.host||'').toLowerCase();
  const origin=req.headers?.origin;
  return host===HOST&&origin==='https://'+HOST&&req.headers?.['sec-fetch-site']!=='cross-site';
}
function sendJson(res,status,body) {
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.end(JSON.stringify(body));
}
async function callStore(req,action,body={},options={}) {
  const method=options.method||'POST';
  if(String(req.headers?.host||'').toLowerCase()!==HOST)throw new StoreError(403,'ORIGIN_DENIED');
  if(method==='POST'&&!isOriginAllowed(req))throw new StoreError(403,'CROSS_ORIGIN_DENIED');
  const token=options.token||tokenFromRequest(req);
  if(!token)throw new StoreError(401,'OWNER_SESSION_REQUIRED');
  const url=process.env.HH_PM_SUPABASE_URL;
  const key=process.env.HH_PM_SUPABASE_PUBLISHABLE_KEY;
  if(url!=='https://shervdixkaxurnaecioe.supabase.co'||!key||!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key))
    throw new StoreError(503,'PRIVATE_STORE_NOT_CONFIGURED');
  let endpoint=url+'/functions/v1/agent-commander-private-store-v1';
  if(method==='GET'){
    const query=new URLSearchParams({action});
    for(const [key,value] of Object.entries(body||{})){
      if(value===undefined||value===null)continue;
      if(!['string','number','boolean'].includes(typeof value))throw new StoreError(400,'INVALID_QUERY_VALUE');
      query.set(key,String(value));
    }
    endpoint+='?'+query.toString();
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9500);
  try{
    const response=await fetch(endpoint,{
      method,cache:'no-store',redirect:'error',signal:controller.signal,
      headers:{apikey:key,Authorization:'Bearer '+token,Accept:'application/json',
        ...(method==='POST'?{'Content-Type':'application/json'}:{})},
      ...(method==='POST'?{body:JSON.stringify({action,...body})}:{})
    });
    const text=await response.text();
    if(text.length>1200000)throw new StoreError(503,'PRIVATE_STORE_RESPONSE_TOO_LARGE');
    let data;
    try{data=JSON.parse(text)}catch{throw new StoreError(503,'PRIVATE_STORE_INVALID_RESPONSE');}
    return {status:response.status,data};
  }catch(error){
    if(error instanceof StoreError)throw error;
    throw new StoreError(503,'PRIVATE_STORE_UNAVAILABLE');
  }finally{clearTimeout(timer);}
}
module.exports={COOKIE,StoreError,tokenFromRequest,isOriginAllowed,sendJson,callStore};
