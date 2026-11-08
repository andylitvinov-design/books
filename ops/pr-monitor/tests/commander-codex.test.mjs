import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const Module=require('node:module');
const original=Module._load;
let authorized=true,origin=true;
Module._load=function(name,...rest){
 if(name==='../lib/commander-private-store')return {
  callStore:async()=>{if(!authorized)throw Object.assign(Error('OWNER_SESSION_REQUIRED'),{status:401,code:'OWNER_SESSION_REQUIRED'});return {status:200,data:{owner:true,privateStoreConfigured:true}}},
  sendJson(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body))},
  isOriginAllowed:()=>origin
 };
 return original.call(this,name,...rest);
};
const handler=require('../api/commander-codex.js');
Module._load=original;
const {ready,cleanTask,publicText,marker}=handler.__test;
const id='123e4567-e89b-42d3-a456-426614174000';
const b={id,title:'Repair button on Commander',prompt:'Fix real button wiring and add focused smoke test.',
 project:'commander',mode:'issue',consentPublic:true,consentCredits:true,consentPolicy:true};
const config={HH_PM_CODEX_GITHUB_ENABLED:'true',HH_PM_CODEX_BUDGET_VERIFIED:'true',
 HH_PM_GITHUB_WRITE_TOKEN:'test-token-over-20-chars-xxxxx',
 HH_PM_CODEX_ASSIGNEE:'openai-code-agent[bot]',HH_PM_CODEX_PR_MENTION:'@codex'};
const prior={};
for(const [k,v] of Object.entries(config)){prior[k]=process.env[k];process.env[k]=v}
function response(){return{headers:{},setHeader(k,v){this.headers[k]=v},end(body){this.body=JSON.parse(body)}}}
async function call(method='GET',action='status',body){
 const headers={host:'holistic-house-pr-monitor.vercel.app',cookie:'hh_commander_supabase_auth=test',
  ...(method==='POST'?{origin:'https://holistic-house-pr-monitor.vercel.app','sec-fetch-site':'same-origin'}:{})};
 const req={method,url:'/api/commander-codex?action='+action,headers,body};
 const res=response();await handler(req,res);return res;
}
function gh(data,status=200){return new Response(status===204?null:JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})}
function validMocks({previous=false,active=false}={}){
 const calls=[];
 global.fetch=async(url,opt)=>{
  const s=String(url);calls.push([opt.method,s,opt.body&&JSON.parse(opt.body)]);
  if(s.endsWith('/books'))return gh({full_name:'andylitvinov-design/books',permissions:{push:true}});
  if(s.includes('/branches/'))return gh({commit:{sha:'a'.repeat(40)}});
  if(s.includes('/assignees/'))return gh(null,204);
  if(s.includes('/search/issues'))return gh({incomplete_results:false,items:previous?[{number:999,html_url:'https://github.com/andylitvinov-design/books/issues/999',body:marker(id)}]:[]});
  if(s.endsWith('/issues')&&opt.method==='POST')return gh({number:1000,html_url:'https://github.com/andylitvinov-design/books/issues/1000',assignees:[{login:config.HH_PM_CODEX_ASSIGNEE}]});
  if(s.endsWith('/pulls/3916'))return gh({number:3916,state:'open',draft:false,base:{ref:'codex/bootstrap-books'},head:{sha:'b'.repeat(40)}});
  if(s.includes('/check-runs'))return gh({total_count:1,check_runs:[{status:active?'in_progress':'completed'}]});
  if(s.includes('/issues/3916/comments')&&opt.method==='GET')return gh([]);
  if(s.endsWith('/issues/3916/comments')&&opt.method==='POST')return gh({id:111,html_url:'https://github.com/andylitvinov-design/books/pull/3916#issuecomment-111'});
  throw Error('UNEXPECTED_FETCH '+s);
 };
 return calls;
}
test('current private Supabase owner can use the manual handoff without GitHub write access',async()=>{
 process.env.HH_PM_GITHUB_WRITE_TOKEN='';
 const r=await call();assert.equal(r.statusCode,200);
 assert.equal(r.body.authenticated,true);assert.equal(r.body.owner,true);assert.equal(r.body.eligibleForDispatch,false);
 assert.equal(r.body.manualHandoffAvailable,true);
 assert.equal(r.body.manualHandoffUrl,'https://github.com/andylitvinov-design/books/issues/3890');
 process.env.HH_PM_GITHUB_WRITE_TOKEN=config.HH_PM_GITHUB_WRITE_TOKEN;
});
test('guest requests are rejected by the shared private-store owner gate',async()=>{
 authorized=false;let r=await call();assert.equal(r.statusCode,401);assert.equal(r.body.error,'OWNER_SESSION_REQUIRED');authorized=true;
});
test('same-origin is required before any direct GitHub write',async()=>{
 const calls=validMocks();origin=false;const r=await call('POST','dispatch',b);
 assert.equal(r.statusCode,403);assert.equal(calls.length,0);origin=true;
});
test('no-cost integration never claims automatic readiness without explicit config',()=>{
 assert.equal(ready(),true);
 process.env.HH_PM_CODEX_BUDGET_VERIFIED='false';assert.equal(ready(),false);
 process.env.HH_PM_CODEX_BUDGET_VERIFIED='true';
 process.env.HH_PM_CODEX_ASSIGNEE='random[bot]';assert.equal(ready(),false);
 process.env.HH_PM_CODEX_ASSIGNEE=config.HH_PM_CODEX_ASSIGNEE;
});
test('public handoff requires consent and refuses secrets',()=>{
 assert.throws(()=>cleanTask({...b,consentPublic:false}),/CONSENT_REQUIRED/);
 assert.throws(()=>cleanTask({...b,mode:'pr',pr:'oops'}),/INVALID_PR_NUMBER/);
 assert.throws(()=>publicText('token sk-proj-THISISASECRETKEY1234567',20,6000),/SECRET_OR_INVALID_PUBLIC_TEXT/);
 assert.equal(cleanTask(b).mode,'issue');
});
test('status never exposes the server credential or pretends Codex started',async()=>{
 validMocks();const r=await call();assert.equal(r.statusCode,200);
 assert.equal(r.body.configured,true);assert.equal(r.body.provider,'GitHub Codex');
 assert.doesNotMatch(JSON.stringify(r.body),/test-token/);
 assert.equal(r.body.codexStarted,undefined);
});
test('public issue dispatch requires a verified bot and returns only a GitHub receipt',async()=>{
 const calls=validMocks();const r=await call('POST','dispatch',b);
 assert.equal(r.statusCode,200);assert.equal(r.body.assignedOnGithub,true);assert.equal(r.body.codexStarted,false);
 assert.equal(calls.filter(c=>c[0]==='POST').length,1);
 assert.equal(calls.find(c=>c[0]==='POST')[2].agent_assignment.base_branch,'codex/bootstrap-books');
});
test('duplicate dispatch reuses the existing GitHub issue without another write',async()=>{
 const calls=validMocks({previous:true});const r=await call('POST','dispatch',b);
 assert.equal(r.statusCode,200);assert.equal(r.body.duplicate,true);
 assert.equal(calls.filter(c=>c[0]==='POST').length,0);
});
test('PR repair holds while CI is active and never posts a comment',async()=>{
 const calls=validMocks({active:true});const r=await call('POST','dispatch',{...b,mode:'pr',pr:3916});
 assert.equal(r.statusCode,409);assert.equal(r.body.error,'ACTIVE_CI_HOLD');
 assert.equal(calls.filter(c=>c[0]==='POST').length,0);
});
test('PR repair writes one Codex mention only after exact-head and CI checks',async()=>{
 const calls=validMocks({active:false});const r=await call('POST','dispatch',{...b,mode:'pr',pr:3916});
 assert.equal(r.statusCode,200);assert.equal(r.body.codexStarted,false);assert.equal(r.body.pr,3916);
 assert.equal(calls.filter(c=>c[0]==='POST').length,1);
 assert.match(calls.find(c=>c[0]==='POST')[2].body,/@codex/);
});
test('endpoint and UI use the current private owner session and expose only manual fallback without a token',()=>{
 const source=readFileSync(new URL('../api/commander-codex.js',import.meta.url),'utf8');
 const front=readFileSync(new URL('../commander-codex.js',import.meta.url),'utf8');
 assert.match(source,/commander-private-store/);assert.doesNotMatch(source,/commander-drafts\.js/);
 assert.match(front,/issues\/3890/);
 assert.match(front,/consentPublic:true,consentCredits:true,consentPolicy:true/);
 assert.doesNotMatch(front,/OPENAI_API_KEY|HH_PM_GITHUB_WRITE_TOKEN/);
});
test.after(()=>{for(const [k,v] of Object.entries(prior)){if(v===undefined)delete process.env[k];else process.env[k]=v}});
