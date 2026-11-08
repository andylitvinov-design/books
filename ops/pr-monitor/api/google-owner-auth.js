'use strict';
/* HH_PM_GOOGLE_OWNER_SSO_V1: verified Google Identity credential -> existing owner cookie.
 * No anonymous authorization, cross-site session copying, or new paid provider.
 * The email digest defaults to the canonical practitioner-owner identity hash
 * already used by Holistic House. Override only with an owner-controlled env hash.
 */
const crypto=require('node:crypto');
const CLIENT='HH_PM_GOOGLE_CLIENT_ID';
const OWNER_EMAIL_HASH='21e4f271e694b4a15ba466421033f55877ffafd5ff9b50b88c93903a64f7990b';
const CERTS='https://www.googleapis.com/oauth2/v3/certs';
const SESSION='hh_seo_owner',CHALLENGE='hh_pm_google_nonce',RETURN='hh_pm_google_return',LIFETIME=14*86400;
const SAFE_RETURN=new Set(['/chats.html','/task-editor.html','/project-management-public.html']);
const safeReturn=s=>SAFE_RETURN.has(s)?s:'/chats.html';
const respond=(res,code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body))};
function envReady(){
 return /^\d{8,}-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(process.env[CLIENT]||'')&&
  String(process.env.SEO_SESSION_SECRET||'').length>=32&&
  /^[a-f0-9]{64}$/.test(process.env.HH_PM_GOOGLE_OWNER_EMAIL_HASH||OWNER_EMAIL_HASH);
}
function cookie(req,name){
 const raw=String(req.headers?.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));
 return raw?raw.slice(name.length+1):'';
}
function originOK(req){
 try{
  const o=new URL(String(req.headers?.origin||'')),host=String(req.headers?.host||'').toLowerCase();
  return o.protocol==='https:'&&o.host===host&&o.pathname==='/'&&!o.search&&!o.hash&&
   req.headers?.['sec-fetch-site']!=='cross-site';
 }catch{return false}
}
const safeSame=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&a.length>0&&
 crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
const ownHash=email=>crypto.createHash('sha256').update(String(email||'').trim().toLowerCase()).digest('hex');
function ownerMatch(email){
 const a=Buffer.from(ownHash(email),'hex'),b=Buffer.from(process.env.HH_PM_GOOGLE_OWNER_EMAIL_HASH||OWNER_EMAIL_HASH,'hex');
 return b.length===32&&crypto.timingSafeEqual(a,b);
}
function parseJwt(s){
 if(typeof s!=='string'||s.length<200||s.length>7200||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s))throw Error('INVALID_CREDENTIAL');
 const p=s.split('.');
 const header=JSON.parse(Buffer.from(p[0],'base64url').toString('utf8'));
 const claims=JSON.parse(Buffer.from(p[1],'base64url').toString('utf8'));
 if(!header||typeof header!=='object'||!claims||typeof claims!=='object'||Array.isArray(claims))throw Error('INVALID_CREDENTIAL');
 if(header.alg!=='RS256'||typeof header.kid!=='string'||!/^[\w-]{1,120}$/.test(header.kid))throw Error('INVALID_SIGNATURE_ALGORITHM');
 return {parts:p,header,claims};
}
async function publicKey(kid,fetcher=fetch){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6000);
 try{
  const r=await fetcher(CERTS,{redirect:'error',cache:'no-store',signal:ctrl.signal,headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('GOOGLE_KEYS_UNAVAILABLE');
  const raw=await r.text();
  if(raw.length>30000)throw Error('GOOGLE_KEYS_UNAVAILABLE');
  const d=JSON.parse(raw);
  const key=Array.isArray(d.keys)?d.keys.find(k=>k.kid===kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig')):null;
  if(!key||!key.n||!key.e)throw Error('UNKNOWN_GOOGLE_KEY');
  return crypto.createPublicKey({key,format:'jwk'});
 }finally{clearTimeout(timer)}
}
async function verifyGoogleToken(credential,nonce,fetcher=fetch){
 const {parts,header,claims}=parseJwt(credential),now=Math.floor(Date.now()/1000);
 if(!nonce||claims.nonce!==nonce||claims.aud!==process.env[CLIENT]||
  !['https://accounts.google.com','accounts.google.com'].includes(claims.iss)||
  claims.email_verified!==true||typeof claims.email!=='string'||claims.email.length>254||
  typeof claims.sub!=='string'||!/^\d{8,40}$/.test(claims.sub)||
  !Number.isSafeInteger(claims.iat)||claims.iat>now+60||claims.iat<now-3600||
  !Number.isSafeInteger(claims.exp)||claims.exp<=now||claims.exp>now+4000||
  (claims.nbf!==undefined&&(!Number.isSafeInteger(claims.nbf)||claims.nbf>now+60)))
  throw Error('GOOGLE_ASSERTION_INVALID');
 const key=await publicKey(header.kid,fetcher);
 if(!crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),key,Buffer.from(parts[2],'base64url')))
  throw Error('INVALID_GOOGLE_SIGNATURE');
 if(!ownerMatch(claims.email))throw Error('OWNER_ACCOUNT_NOT_ALLOWED');
 return {sub:claims.sub};
}
function ownerSession(){
 const expires=String(Math.floor(Date.now()/1000)+LIFETIME);
 const signature=crypto.createHmac('sha256',process.env.SEO_SESSION_SECRET).update('v1.'+expires).digest('hex');
 return SESSION+'=v1.'+expires+'.'+signature+'; Max-Age='+LIFETIME+'; Path=/; Secure; HttpOnly; SameSite=Lax';
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Cookie, Origin');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Referrer-Policy','no-referrer');
 if(!['GET','POST'].includes(req.method))return respond(res,405,{error:'METHOD_NOT_ALLOWED'});
 if(!envReady())return respond(res,503,{error:'GOOGLE_SSO_NOT_CONFIGURED'});
 if(req.method==='GET'){
  const nonce=crypto.randomBytes(24).toString('base64url');
  const u=new URL(req.url||'/api/google-owner-auth','https://holistic-house-pr-monitor.vercel.app');
  const target=safeReturn(u.searchParams.get('return'));
  // Google iOS Redirect UX submits a cross-site form POST; challenge cookies must
  // survive that top-level redirect. Server still enforces nonce, CSRF and signature.
  const common='; Max-Age=600; Path=/api/google-owner-auth; Secure; HttpOnly; SameSite=None';
  res.setHeader('Set-Cookie',[CHALLENGE+'='+nonce+common,RETURN+'='+encodeURIComponent(target)+common]);
  return respond(res,200,{clientId:process.env[CLIENT],nonce,mode:'GOOGLE_VERIFIED_OWNER'});
 }
 const kind=String(req.headers?.['content-type']||'').split(';')[0].trim().toLowerCase();
 const redirected=kind==='application/x-www-form-urlencoded';
 if(kind!=='application/json'&&!redirected)return respond(res,415,{error:'INVALID_CONTENT_TYPE'});
 if(Number(req.headers?.['content-length']||0)>8000)return respond(res,413,{error:'PAYLOAD_TOO_LARGE'});
 if(!redirected&&!originOK(req))return respond(res,403,{error:'CROSS_ORIGIN_DENIED'});
 if(redirected&&req.headers?.origin){
  const host=String(req.headers.host||'').toLowerCase(),o=req.headers.origin;
  if(o!=='https://accounts.google.com'&&o!=='https://'+host)
   return respond(res,403,{error:'CROSS_ORIGIN_DENIED'});
 }
 let body=req.body;
 if(redirected){
  if(typeof body==='string'){const data=new URLSearchParams(body);
   body=Object.fromEntries(data);}
  if(!body||typeof body!=='object'||Array.isArray(body)||
   !safeSame(String(body.g_csrf_token||''),cookie(req,'g_csrf_token'))||
   String(body.g_csrf_token||'').length>150)return respond(res,403,{error:'GOOGLE_CSRF_DENIED'});
 }else if(typeof body==='string')try{body=JSON.parse(body)}catch{return respond(res,400,{error:'INVALID_JSON'})}
 if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>8000)
  return respond(res,400,{error:'INVALID_BODY'});
 const nonce=cookie(req,CHALLENGE);
 if(!/^[A-Za-z0-9_-]{32}$/.test(nonce))return respond(res,401,{error:'GOOGLE_CHALLENGE_REQUIRED'});
 try{
  await verifyGoogleToken(body.credential,nonce);
  res.setHeader('Set-Cookie',[ownerSession(),
   CHALLENGE+'=; Max-Age=0; Path=/api/google-owner-auth; Secure; HttpOnly; SameSite=None',
   RETURN+'=; Max-Age=0; Path=/api/google-owner-auth; Secure; HttpOnly; SameSite=None']);
  if(redirected){res.statusCode=303;res.setHeader('Location',safeReturn(decodeURIComponent(cookie(req,RETURN))));
   return res.end('');}
  return respond(res,200,{authenticated:true,role:'owner',session:'EXISTING_HH_SEO_OWNER'});
 }catch(e){
  return respond(res,e.message==='GOOGLE_KEYS_UNAVAILABLE'?503:401,
   {error:e.message==='GOOGLE_KEYS_UNAVAILABLE'?'GOOGLE_VERIFICATION_UNAVAILABLE':'GOOGLE_OWNER_NOT_VERIFIED'});
 }
};
module.exports.__test={envReady,ownerMatch,originOK,parseJwt,verifyGoogleToken,ownerSession,safeReturn};
