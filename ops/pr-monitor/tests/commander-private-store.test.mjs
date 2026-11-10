import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const store=require('../lib/commander-private-store.js');
const session=require('../api/commander-session.js');
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(raw){this.body=JSON.parse(raw)}}}
function jwt(exp=Math.floor(Date.now()/1000)+600){
 const payload=Buffer.from(JSON.stringify({sub:'123e4567-e89b-42d3-a456-426614174000',exp})).toString('base64url');
 return 'header.'+payload+'.signature';
}
test('session endpoint is fail-closed for guests and cross-origin POST',async()=>{
 const guest=response();
 await session({method:'GET',headers:{host:'holistic-house-pr-monitor.vercel.app'}},guest);
 assert.equal(guest.statusCode,401);
 const cross=response();
 await session({method:'POST',headers:{host:'holistic-house-pr-monitor.vercel.app',origin:'https://evil.example'},body:{token:jwt()}},cross);
 assert.equal(cross.statusCode,403);assert.equal(cross.body.error,'CROSS_ORIGIN_DENIED');
});
test('monitor session uses HttpOnly access and refresh cookies with silent refresh',()=>{
 const fs=require('node:fs'),source=fs.readFileSync(new URL('../api/commander-session.js',import.meta.url),'utf8');
 assert.match(source,/HttpOnly/);assert.match(source,/Secure/);assert.match(source,/SameSite=Lax/);
 assert.match(source,/Math\.min\(900/);
 assert.doesNotMatch(source,/localStorage|sessionStorage/);
});
test('GET read parameters are forwarded with the action and never require a POST body',()=>{
 const helper=require('node:fs').readFileSync(new URL('../lib/commander-private-store.js',import.meta.url),'utf8');
 assert.match(helper,/new URLSearchParams\(\{action\}\)/);
 assert.match(helper,/query\.set\(key,String\(value\)\)/);
});
test('Origin is exact and owner JWT is not accepted from query parameters',()=>{
 assert.equal(store.isOriginAllowed({headers:{host:'holistic-house-pr-monitor.vercel.app',origin:'https://holistic-house-pr-monitor.vercel.app'}}),true);
 assert.equal(store.isOriginAllowed({headers:{host:'holistic-house-pr-monitor.vercel.app',origin:'https://evil.example'}}),false);
 const fs=require('node:fs'),helper=fs.readFileSync(new URL('../lib/commander-private-store.js',import.meta.url),'utf8');
 assert.match(helper,/req\.headers\?\.cookie/);assert.match(helper,/Authorization:'Bearer '\+token/);
 assert.doesNotMatch(helper,/req\.query|location\.hash/);
});


test('Commander handoff accepts only a verified access token plus the paired refresh token',()=>{
 const fs=require('node:fs');
 const sessionSource=fs.readFileSync(new URL('../api/commander-session.js',import.meta.url),'utf8');
 const authSource=fs.readFileSync(new URL('../commander-auth.js',import.meta.url),'utf8');
 assert.match(sessionSource,/Object\\.keys\\(body\\)\\.some\\(k=>!\\['token','refreshToken'\\]\\.includes\\(k\\)/);
 assert.match(sessionSource,/verifyOwner\\(req,body\\.token\\)/);
 assert.match(sessionSource,/REFRESH_COOKIE/);
 assert.match(authSource,/values\\.get\\('refresh_token'\\)/);
 assert.match(authSource,/refreshToken:sessionRefreshToken/);
 assert.match(authSource,/history\\.replaceState\\(null,'',location\\.pathname\\+location\\.search\\)/);
});
test('session refresh is not exposed through URL, browser storage or query parameters',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync(new URL('../api/commander-session.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/req\\.query|localStorage|sessionStorage|location\\.hash/);
 assert.match(source,/HttpOnly; Secure; SameSite=Strict/);
 assert.match(source,/Vary','Cookie, Origin/);
});
