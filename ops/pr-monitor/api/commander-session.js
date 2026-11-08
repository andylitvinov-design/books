'use strict';
const {COOKIE,tokenFromRequest,isOriginAllowed,sendJson,callStore}=require('../lib/commander-private-store');

module.exports=async function(req,res) {
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Vary','Cookie, Origin');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  if(req.method==='GET') {
    try{
      const result=await callStore(req,'status',{}, {method:'GET'});
      if(result.status!==200||result.data?.owner!==true||result.data?.privateStoreConfigured!==true)
        return sendJson(res,result.status===401?401:403,{authenticated:false,error:'OWNER_SESSION_REQUIRED'});
      return sendJson(res,200,{authenticated:true,owner:true,privateStoreConfigured:true,
        storage:'SUPABASE_PRIVATE',checkedAt:result.data.checkedAt});
    }catch(error){return sendJson(res,error.status||503,{authenticated:false,error:error.code||'OWNER_SESSION_REQUIRED'});}
  }
  if(req.method==='DELETE') {
    if(!isOriginAllowed(req))return sendJson(res,403,{error:'CROSS_ORIGIN_DENIED'});
    res.setHeader('Set-Cookie',COOKIE+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
    return sendJson(res,200,{signedOut:true});
  }
  if(req.method!=='POST')return sendJson(res,405,{error:'METHOD_NOT_ALLOWED'});
  if(!isOriginAllowed(req))return sendJson(res,403,{error:'CROSS_ORIGIN_DENIED'});
  let body=req.body;
  if(typeof body==='string')try{body=JSON.parse(body)}catch{return sendJson(res,400,{error:'INVALID_JSON'})}
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='token')||typeof body.token!=='string')
    return sendJson(res,400,{error:'INVALID_BODY'});
  const token=body.token;
  if(token.length<120||token.length>8192)return sendJson(res,401,{error:'INVALID_OWNER_TOKEN'});
  let claims;
  try{
    claims=JSON.parse(Buffer.from(token.split('.')[1]||'','base64url').toString('utf8'));
    if(!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)||
       !Number.isSafeInteger(claims.exp)||claims.exp<=Math.floor(Date.now()/1000))throw Error();
  }catch{return sendJson(res,401,{error:'INVALID_OWNER_TOKEN'})}
  try{
    const result=await callStore(req,'status',{}, {method:'GET',token});
    if(result.status!==200||result.data?.owner!==true||result.data?.privateStoreConfigured!==true)
      return sendJson(res,result.status===401?401:403,{authenticated:false,error:'OWNER_ACCESS_DENIED'});
    const seconds=Math.max(1,Math.min(900,claims.exp-Math.floor(Date.now()/1000)));
    res.setHeader('Set-Cookie',COOKIE+'='+token+'; Path=/; Max-Age='+seconds+'; HttpOnly; Secure; SameSite=Strict');
    return sendJson(res,200,{authenticated:true,owner:true,privateStoreConfigured:true,
      expiresAt:Math.floor(Date.now()/1000)+seconds});
  }catch(error){return sendJson(res,error.status||503,{authenticated:false,error:error.code||'OWNER_CHECK_UNAVAILABLE'});}
};
