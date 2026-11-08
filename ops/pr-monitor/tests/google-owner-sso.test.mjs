import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const handler=require('../api/google-owner-auth.js'),verify=handler.__test;
const source=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const CLIENT='12345678901-testclient.apps.googleusercontent.com';
const env={...process.env};
const restore=()=>{for(const key of ['HH_PM_GOOGLE_CLIENT_ID','SEO_SESSION_SECRET','HH_PM_GOOGLE_OWNER_EMAIL_HASH']){
 if(env[key]===undefined)delete process.env[key];else process.env[key]=env[key];}};
const res=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(s){this.body=s?JSON.parse(s):null}});
const b64=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
function sign(privateKey,kid,claims){
 const input=b64({alg:'RS256',kid,typ:'JWT'})+'.'+b64(claims);
 return input+'.'+crypto.sign('RSA-SHA256',Buffer.from(input),privateKey).toString('base64url');
}
test('unconfigured Google owner login fails closed and has no public fallback',async()=>{
 delete process.env.HH_PM_GOOGLE_CLIENT_ID;
 try{
  const out=res();await handler({method:'GET',headers:{host:'holistic-house-pr-monitor.vercel.app'}},out);
  assert.equal(out.statusCode,503);assert.equal(out.body.error,'GOOGLE_SSO_NOT_CONFIGURED');
 }finally{restore();}
});
test('nonce-bound, signature-verified owner Google ID token issues existing owner cookie',async()=>{
 const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk=publicKey.export({format:'jwk'}),kid='fixture-google-key';
 const oldFetch=global.fetch;
 process.env.HH_PM_GOOGLE_CLIENT_ID=CLIENT;
 process.env.SEO_SESSION_SECRET='test-secret-0123456789-test-secret-0123456789';
 process.env.HH_PM_GOOGLE_OWNER_EMAIL_HASH=crypto.createHash('sha256').update('owner@example.com').digest('hex');
 global.fetch=async()=>({ok:true,text:async()=>JSON.stringify({keys:[{...jwk,kid,alg:'RS256',use:'sig'}]})});
 try{
  const get=res();await handler({method:'GET',headers:{host:'holistic-house-pr-monitor.vercel.app'}},get);
  assert.equal(get.statusCode,200);assert.equal(get.body.clientId,CLIENT);
  const now=Math.floor(Date.now()/1000);
  const claims={iss:'https://accounts.google.com',aud:CLIENT,sub:'123456789012345678901',email:'owner@example.com',
   email_verified:true,nonce:get.body.nonce,iat:now,exp:now+2500};
  const req={method:'POST',headers:{host:'holistic-house-pr-monitor.vercel.app',
   origin:'https://holistic-house-pr-monitor.vercel.app','content-type':'application/json',
   cookie:(Array.isArray(get.headers['Set-Cookie'])?get.headers['Set-Cookie'][0]:get.headers['Set-Cookie']).split(';')[0]},body:{credential:sign(privateKey,kid,claims)}};
  const ok=res();await handler(req,ok);
  assert.equal(ok.statusCode,200);assert.equal(ok.body.authenticated,true);
  const session=ok.headers['Set-Cookie'][0];
  assert.match(session,/hh_seo_owner=v1\.\d{10}\.[a-f0-9]{64}/);
  assert.match(session,/HttpOnly/);assert.match(session,/Secure/);
  const deny=res();await handler({...req,headers:{...req.headers,origin:'https://evil.example'}},deny);
  assert.equal(deny.statusCode,403);
  const replay=res();await handler({...req,headers:{...req.headers,cookie:''}},replay);
  assert.equal(replay.statusCode,401);
  const other=res();await handler({...req,body:{credential:sign(privateKey,kid,{...claims,email:'other@example.com'})}},other);
  assert.equal(other.statusCode,401);
  const badSig=res();
  const otherKey=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
  await handler({...req,body:{credential:sign(otherKey.privateKey,kid,claims)}},badSig);
  assert.equal(badSig.statusCode,401);
 }finally{global.fetch=oldFetch;restore();}
});
test('owner-only pages retain existing authorization gate and provide Google first',()=>{
 const chat=source('chats.html'),editor=source('task-editor.html'),pm=source('pm-agent-chat.js');
 const js=source('commander-chats.js'),auth=source('owner-google-signin.js');
 assert.match(chat,/id="cc-google-owner"/);assert.match(editor,/id="ac-google-owner"/);
 assert.match(chat,/owner-google-signin\.js/);assert.match(editor,/owner-google-signin\.js/);
 assert.match(source('project-management-public.html'),/owner-google-signin\.js/);
 assert.match(pm,/HHGoogleOwnerSSO/);assert.match(js,/HHGoogleOwnerSSO/);
 assert.match(js,/indexedDB/);assert.match(js,/deviceMode/);
 assert.match(auth,/accounts\.google\.com\/gsi\/client/);
 assert.match(auth,/auto_select:!isiOS/);
 assert.doesNotMatch(auth,/localStorage|sessionStorage|window\.open/);
 assert.match(source('api/commander-chats.js'),/core\.owner\(req\)/);
 assert.match(source('api/commander-drafts.js'),/if\(!owner\(req\)\)/);
});

test('Google iPhone redirect uses nonce, double-submit CSRF and path allowlist',async()=>{
 const old=global.fetch;
 const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const kid='redirect-fixture',jwk=publicKey.export({format:'jwk'});
 process.env.HH_PM_GOOGLE_CLIENT_ID=CLIENT;
 process.env.SEO_SESSION_SECRET='a-test-signing-secret-over-32-characters';
 process.env.HH_PM_GOOGLE_OWNER_EMAIL_HASH=crypto.createHash('sha256').update('owner@example.com').digest('hex');
 global.fetch=async()=>({ok:true,text:async()=>JSON.stringify({keys:[{...jwk,kid,alg:'RS256',use:'sig'}]})});
 try{
  assert.equal(verify.safeReturn('https://evil.example'),'/chats.html');
  assert.equal(verify.safeReturn('/task-editor.html'),'/task-editor.html');
  const get=res();await handler({method:'GET',url:'/api/google-owner-auth?return=/task-editor.html',headers:{host:'holistic-house-pr-monitor.vercel.app'}},get);
  assert.equal(get.statusCode,200);
  const now=Math.floor(Date.now()/1000),nonce=get.body.nonce;
  const claims={iss:'https://accounts.google.com',aud:CLIENT,sub:'123456789012345678901',email:'owner@example.com',
   email_verified:true,nonce,iat:now,exp:now+2500};
  const cookies=get.headers['Set-Cookie'].map(v=>v.split(';')[0]).join('; ')+'; g_csrf_token=csrf-123';
  const req={method:'POST',url:'/api/google-owner-auth',headers:{host:'holistic-house-pr-monitor.vercel.app',
   origin:'https://accounts.google.com','content-type':'application/x-www-form-urlencoded',cookie:cookies},
   body:{credential:sign(privateKey,kid,claims),g_csrf_token:'csrf-123'}};
  const ok=res();await handler(req,ok);
  assert.equal(ok.statusCode,303);assert.equal(ok.headers.Location,'/task-editor.html');
  assert.ok(ok.headers['Set-Cookie'][0].includes('hh_seo_owner='));
  const denied=res();await handler({...req,body:{...req.body,g_csrf_token:'bad'}},denied);
  assert.equal(denied.statusCode,403);
  const attacker=res();await handler({...req,headers:{...req.headers,origin:'https://attacker.example'}},attacker);
  assert.equal(attacker.statusCode,403);
 }finally{global.fetch=old;restore();}
});

test('CSP allows narrowly scoped official Google Identity Services resources',()=>{
 const cfg=JSON.parse(source('vercel.json'));
 const headers=cfg.headers[0].headers;
 const csp=headers.find(x=>x.key==='Content-Security-Policy').value;
 for(const item of [`script-src 'self' https://accounts.google.com/gsi/client`,
  `frame-src https://accounts.google.com/gsi/`,
  `style-src 'self' https://accounts.google.com/gsi/style`,
  `connect-src 'self' https://api.github.com https://accounts.google.com/gsi/`,
  `default-src 'none'`,`frame-ancestors 'none'`]) assert.ok(csp.includes(item),item);
 assert.doesNotMatch(csp,/unsafe-inline|unsafe-eval|https:\/\/\*/);
 assert.match(source('owner-google-signin.js'),/ux_mode:'redirect'/);
 assert.match(source('owner-google-signin.js'),/login_uri/);
});
