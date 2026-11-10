'use strict';
const {COOKIE,tokenFromRequest,isOriginAllowed,sendJson,callStore}=require('../lib/commander-private-store');
const REFRESH_COOKIE='hh_commander_supabase_refresh';
const REFRESH_MAX_AGE=60*60*24*30;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function refreshFromRequest(req){
  const raw=String(req.headers?.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(REFRESH_COOKIE+'='));
  if(!raw)return '';
  const value=raw.slice(REFRESH_COOKIE.length+1);
  return value.length>=12&&value.length<=4096&&/^[A-Za-z0-9._~-]+$/.test(value)?value:'';
}
function accessClaims(token){
  try{
    if(typeof token!=='string'||token.length<120||token.length>8192||
       !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))return null;
    const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
    if(!claims||!UUID.test(claims.sub||'')||!Number.isSafeInteger(claims.exp)||
       claims.exp<=Math.floor(Date.now()/1000))return null;
    return claims;
  }catch{return null;}
}
function setSessionCookies(res,accessToken,refreshToken,claims){
  const remaining=Math.max(1,Math.min(3600,claims.exp-Math.floor(Date.now()/1000)));
  res.setHeader('Set-Cookie',[
    COOKIE+'='+accessToken+'; Path=/; Max-Age='+remaining+'; HttpOnly; Secure; SameSite=Strict',
    REFRESH_COOKIE+'='+refreshToken+'; Path=/; Max-Age='+REFRESH_MAX_AGE+'; HttpOnly; Secure; SameSite=Strict',
  ]);
}
function clearSessionCookies(res){
  res.setHeader('Set-Cookie',[
    COOKIE+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict',
    REFRESH_COOKIE+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict',
  ]);
}
async function verifyOwner(req,token){
  const result=await callStore(req,'status',{}, {method:'GET',token});
  if(result.status!==200){
    if(result.status===401)return {ok:false,status:401};
    if(result.status===403)return {ok:false,status:403};
    return {ok:false,status:503};
  }
  if(result.data?.owner!==true||result.data?.privateStoreConfigured!==true)
    return {ok:false,status:403};
  return {ok:true,data:result.data};
}
async function refreshWithSupabase(req,refreshToken){
  const url=process.env.HH_PM_SUPABASE_URL,key=process.env.HH_PM_SUPABASE_PUBLISHABLE_KEY;
  if(url!=='https://shervdixkaxurnaecioe.supabase.co'||!key||
     !/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key))
    throw Object.assign(Error('PRIVATE_STORE_NOT_CONFIGURED'),{status:503});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(url+'/auth/v1/token?grant_type=refresh_token',{
      method:'POST',cache:'no-store',redirect:'error',signal:controller.signal,
      headers:{apikey:key,'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({refresh_token:refreshToken}),
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok||typeof data?.access_token!=='string'||typeof data?.refresh_token!=='string')
      throw Object.assign(Error('OWNER_REFRESH_REJECTED'),{status:response.status===400||response.status===401?401:503});
    const claims=accessClaims(data.access_token);
    if(!claims||data.refresh_token.length<12||data.refresh_token.length>4096)
      throw Object.assign(Error('OWNER_REFRESH_INVALID'),{status:401});
    const owner=await verifyOwner(req,data.access_token);
    if(!owner.ok)throw Object.assign(Error('OWNER_ACCESS_DENIED'),{status:owner.status});
    return {accessToken:data.access_token,refreshToken:data.refresh_token,claims,owner:owner.data};
  }finally{clearTimeout(timer);}
}

module.exports=async function(req,res) {
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Vary','Cookie, Origin');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');

  if(req.method==='GET'){
    const access=tokenFromRequest(req),claims=accessClaims(access);
    if(access&&claims){
      try{
        const owner=await verifyOwner(req,access);
        if(owner.ok)return sendJson(res,200,{authenticated:true,owner:true,privateStoreConfigured:true,
          storage:'SUPABASE_PRIVATE',expiresAt:claims.exp,refreshed:false});
        if(owner.status===403)return sendJson(res,403,{authenticated:false,error:'OWNER_ACCESS_DENIED'});
        if(owner.status===503)return sendJson(res,503,{authenticated:false,error:'OWNER_CHECK_UNAVAILABLE'});
      }catch(error){
        if(error.status===403)return sendJson(res,403,{authenticated:false,error:'OWNER_ACCESS_DENIED'});
        // A transient private-store failure is not a reason to discard a valid refresh session.
      }
    }
    const refreshToken=refreshFromRequest(req);
    if(!refreshToken)return sendJson(res,401,{authenticated:false,error:'OWNER_SESSION_REQUIRED'});
    try{
      const updated=await refreshWithSupabase(req,refreshToken);
      setSessionCookies(res,updated.accessToken,updated.refreshToken,updated.claims);
      return sendJson(res,200,{authenticated:true,owner:true,privateStoreConfigured:true,
        storage:'SUPABASE_PRIVATE',expiresAt:updated.claims.exp,refreshed:true});
    }catch(error){
      if(error.status===401){
        clearSessionCookies(res);
        return sendJson(res,401,{authenticated:false,error:'OWNER_SESSION_EXPIRED'});
      }
      return sendJson(res,error.status||503,{authenticated:false,error:error.message==='PRIVATE_STORE_NOT_CONFIGURED'?
        'PRIVATE_STORE_NOT_CONFIGURED':'OWNER_REFRESH_UNAVAILABLE'});
    }
  }

  if(req.method==='DELETE'){
    if(!isOriginAllowed(req))return sendJson(res,403,{error:'CROSS_ORIGIN_DENIED'});
    clearSessionCookies(res);
    return sendJson(res,200,{signedOut:true});
  }

  if(req.method!=='POST')return sendJson(res,405,{error:'METHOD_NOT_ALLOWED'});
  if(!isOriginAllowed(req))return sendJson(res,403,{error:'CROSS_ORIGIN_DENIED'});
  let body=req.body;
  if(typeof body==='string')try{body=JSON.parse(body)}catch{return sendJson(res,400,{error:'INVALID_JSON'})}
  if(!body||typeof body!=='object'||Array.isArray(body)||
     Object.keys(body).some(k=>!['token','refreshToken'].includes(k))||
     typeof body.token!=='string'||typeof body.refreshToken!=='string')
    return sendJson(res,400,{error:'INVALID_BODY'});
  const claims=accessClaims(body.token);
  if(!claims||body.refreshToken.length<12||body.refreshToken.length>4096||
     !/^[A-Za-z0-9._~-]+$/.test(body.refreshToken))
    return sendJson(res,401,{error:'INVALID_OWNER_SESSION'});
  try{
    const owner=await verifyOwner(req,body.token);
    if(!owner.ok)return sendJson(res,owner.status,{authenticated:false,error:'OWNER_ACCESS_DENIED'});
    setSessionCookies(res,body.token,body.refreshToken,claims);
    return sendJson(res,200,{authenticated:true,owner:true,privateStoreConfigured:true,
      expiresAt:claims.exp,refreshEnabled:true});
  }catch(error){return sendJson(res,error.status||503,{authenticated:false,error:error.code||'OWNER_CHECK_UNAVAILABLE'});}
};
module.exports.__test={REFRESH_COOKIE,REFRESH_MAX_AGE,refreshFromRequest,accessClaims};
