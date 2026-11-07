import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';
const require=createRequire(import.meta.url);
const api=require('../api/commander-chats.js'),m=api.__test;
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const id='123e4567-e89b-42d3-a456-426614174000';
const record=()=>({id,title:'Видео · устранить дефект рендера',project:'video',status:'planned',
 tasks:['ci-head:A01'],prs:[3886],executors:['local','openrouter'],description:'Проверка код → CI → Merge → LIVE'});
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(raw){this.body=JSON.parse(raw)}});
test('multiple assignees, PR/task references and no false DONE or LIVE',()=>{
 const a=m.normalize(record());assert.equal(a.revision,1);
 assert.deepEqual(a.executors,['local','openrouter']);assert.deepEqual(a.prs,[3886]);
 assert.equal(a.liveVerified,false);assert.equal(a.executionState,'UNVERIFIED_ASSIGNMENT_ONLY');
 const b=m.normalize({...record(),title:'Отредактировано',status:'review'},a);
 assert.equal(b.revision,2);assert.equal(b.id,id);
 for(const status of ['done','merged','live_verified'])
  assert.throws(()=>m.normalize({...record(),status}),/INVALID_CHAT_STATUS/);
 assert.throws(()=>m.normalize({...record(),executors:[]}),/INVALID_EXECUTORS/);
 assert.throws(()=>m.normalize({...record(),tasks:['unknown:1']}),/INVALID_TASK_IDS/);
 assert.throws(()=>m.normalize({...record(),prs:[-1]}),/INVALID_PR_NUMBERS/);
});
test('private issue and append-only event serialization are stable',()=>{
 const rec=m.normalize(record()),decoded=m.unpack({body:m.pack(rec)});
 assert.equal(decoded.id,rec.id);assert.equal(decoded.title,rec.title);
 assert.equal(m.unpack({body:'<!-- HH_COMMANDER_THREAD_V1:bad -->'}),null);
 const event=m.cleanEvent({eventId:id,kind:'ai',text:'Это только совет',model:'free-model'});
 assert.equal(event.kind,'assistant_unverified');assert.equal(event.sourceVerified,false);
 assert.equal(event.proofLevel,'NOT_CODE_OR_LIVE_PROOF');
 assert.equal(m.unpackEvent({body:m.packEvent(event)}).id,id);
 assert.throws(()=>m.cleanEvent({eventId:id,kind:'github_report',text:'forged'}),/INVALID_EVENT_KIND/);
});
test('unauthenticated requests never read chat data',async()=>{
 const res=response();
 await api({method:'GET',url:'/api/commander-chats?action=list',headers:{host:'holistic-house-pr-monitor.vercel.app'}},res);
 assert.equal(res.statusCode,401);assert.equal(res.body.error,'OWNER_SESSION_REQUIRED');
 assert.match(res.headers['Cache-Control'],/no-store/);
});
test('status accurately reports private store disabled and no agent dispatch',async()=>{
 const values={secret:process.env.SEO_SESSION_SECRET,key:process.env.HH_PM_GITHUB_WRITE_TOKEN,
  repo:process.env.HH_PM_TASKS_PRIVATE_REPO};
 process.env.SEO_SESSION_SECRET='test-only-long-owner-secret';
 delete process.env.HH_PM_GITHUB_WRITE_TOKEN;delete process.env.HH_PM_TASKS_PRIVATE_REPO;
 try{
  const expiry=String(Math.floor(Date.now()/1000)+500);
  const sig=crypto.createHmac('sha256',process.env.SEO_SESSION_SECRET).update('v1.'+expiry).digest('hex');
  const req={method:'GET',url:'/api/commander-chats?action=status',
   headers:{host:'holistic-house-pr-monitor.vercel.app',cookie:'hh_seo_owner=v1.'+expiry+'.'+sig}};
  const res=response();await api(req,res);
  assert.equal(res.statusCode,200);assert.equal(res.body.privateStoreConfigured,false);
  assert.equal(res.body.executorDispatch,false);assert.equal(res.body.liveVerification,false);
  const denied=response();await api({...req,method:'POST',url:'/api/commander-chats?action=create',
   headers:{...req.headers,origin:'https://evil.example'},body:{chat:record()}},denied);
  assert.notEqual(denied.statusCode,200);
 }finally{
  const restore=(k,v)=>v===undefined?delete process.env[k]:process.env[k]=v;
  restore('SEO_SESSION_SECRET',values.secret);restore('HH_PM_GITHUB_WRITE_TOKEN',values.key);
  restore('HH_PM_TASKS_PRIVATE_REPO',values.repo);
 }
});
test('mobile same-site UI, encrypted local vault and source-verified reports',()=>{
 const html=source('chats.html'),css=source('commander-chats.css'),js=source('commander-chats.js');
 const backend=source('api/commander-chats.js'),drafts=source('api/commander-drafts.js');
 const nav=source('project-management-nav.js');
 for(const id of ['cc-login','cc-vault','cc-board','cc-chat-list','cc-thread','cc-messages','cc-executors','cc-pr-proof','cc-report-list'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(css,/safe-area-inset-bottom/);assert.match(css,/max-width:480px/);
 assert.match(js,/AES-GCM/);assert.match(js,/PBKDF2/);assert.match(js,/ciphertext/);
 assert.doesNotMatch(js,/innerHTML|service_role|HH_PM_GITHUB_WRITE_TOKEN|api\/v1\/chat\/completions/);
 assert.match(backend,/core\.assertPrivate/);assert.match(backend,/CHAT_INDEX_INCOMPLETE_HOLD/);
 assert.match(backend,/REPORT_ONLY_NOT_COMMIT/);assert.match(backend,/liveVerified:false/);
 assert.match(drafts,/__private=\{owner,originOK,ready,github,assertPrivate\}/);
 assert.match(nav,/\/chats\.html/);
 assert.match(source('commander-ui.js'),/Рабочие чаты по задачам/);
 assert.match(source('project-management-public.html'),/Рабочие чаты/);
 assert.match(source('pm-agent-chat.js'),/Открыть рабочие чаты/);
});