import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const api=require('../api/commander-drafts.js');
function fakeRes(){
 const headers={};return {statusCode:200,headers,setHeader(k,v){headers[k]=v},end(raw){this.body=JSON.parse(raw)}};
}
function ownerCookie(secret){
 const expires=String(Math.floor(Date.now()/1000)+1200);
 return 'hh_seo_owner=v1.'+expires+'.'+crypto.createHmac('sha256',secret).update('v1.'+expires).digest('hex');
}
test('editor lives on the same domain and loads the original fixed dock',()=>{
 const html=src('task-editor.html'),nav=src('project-management-nav.js'),transfer=src('commander-transfer.js');
 assert.match(html,/task-editor\.js/);assert.match(html,/project-management-nav\.js/);
 assert.match(html,/commander-shell\.css/);
 assert.match(nav,/\/task-editor\.html/);assert.match(transfer,/location\.assign\(PATH\)/);
 assert.doesNotMatch(html+transfer,/holistichouse\.vercel\.app\/admin/);
 for(const id of ['ac-login','ac-workspace','ac-source','ac-pr-search','ac-quality','ac-save-remote','ac-queue','ac-backup-save','ac-history'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(src('task-editor.css'),/safe-area-inset-bottom/);
 assert.match(src('commander-shell.css'),/#hh-cc-dock\{position:fixed/);
});
test('private drafts API rejects guests before any read or write',async()=>{
 const backup=process.env.SEO_SESSION_SECRET;process.env.SEO_SESSION_SECRET='local-test-secret';
 try{
  for(const method of ['GET','POST']){
   const res=fakeRes();
   await api({method,url:'/api/commander-drafts?action=save',headers:{host:'holistic-house-pr-monitor.vercel.app',
    origin:'https://holistic-house-pr-monitor.vercel.app'},body:{record:{}}},res);
   assert.equal(res.statusCode,401);assert.equal(res.body.error,'OWNER_SESSION_REQUIRED');
   assert.match(res.headers['Cache-Control'],/no-store/);
  }
 }finally{if(backup===undefined)delete process.env.SEO_SESSION_SECRET;else process.env.SEO_SESSION_SECRET=backup}
});
test('authorized owner gets honest not-configured response without a private store',async()=>{
 const secret='local-test-secret',before={};
 for(const name of ['SEO_SESSION_SECRET','HH_PM_TASKS_PRIVATE_REPO','HH_PM_GITHUB_WRITE_TOKEN']){
  before[name]=process.env[name];delete process.env[name];
 }
 process.env.SEO_SESSION_SECRET=secret;
 try{
  const req={method:'GET',url:'/api/commander-drafts?action=status',
   headers:{host:'holistic-house-pr-monitor.vercel.app',cookie:ownerCookie(secret)}};
  const res=fakeRes();await api(req,res);
  assert.equal(res.statusCode,200);assert.equal(res.body.privateStoreConfigured,false);
  assert.match(res.body.queueMeans,/NO_AGENT_EXECUTION/);
  req.url='/api/commander-drafts?action=list';
  const noStore=fakeRes();await api(req,noStore);
  assert.equal(noStore.statusCode,503);assert.equal(noStore.body.error,'PRIVATE_STORE_NOT_CONFIGURED');
 }finally{for(const name of Object.keys(before)){
  if(before[name]===undefined)delete process.env[name];else process.env[name]=before[name];
 }}
});
test('only strict same-origin and validated private records can be written',()=>{
 assert.equal(api.__test.originOK({headers:{host:'holistic-house-pr-monitor.vercel.app',
  origin:'https://holistic-house-pr-monitor.vercel.app'}}),true);
 assert.equal(api.__test.originOK({headers:{host:'holistic-house-pr-monitor.vercel.app',
  origin:'https://holistichouse.vercel.app'}}),false);
 const rec=api.__test.clean({
  taskId:'12345678-1234-4234-9234-123456789abc',title:'Проверить старые PR',
  source:'Найти PR и продолжить прежнюю работу',prompt:'ГОТОВЫЙ ПРОМПТ: проверить все старые PR и связать с задачей',
  project:'commander',priority:'normal',mode:'repair',executor:'agent-commander',
  relatedPr:[3874,3874,3884],restrictions:{noCost:true,noDuplicate:true,verifyLive:true}
 });
 assert.deepEqual(rec.relatedPr,[3874,3884]);
 const draft=api.__test.unpack({body:api.__test.makeBody(rec,'DRAFT')});
 assert.equal(draft.title,rec.title);assert.equal(draft.state,'DRAFT');
 assert.throws(()=>api.__test.clean({...rec,project:'secret'}));
 assert.throws(()=>api.__test.clean({...rec,relatedPr:['3874']}));
 assert.match(src('api/commander-drafts.js'),/repo\?\.private!==true/);
});
test('client keeps drafts encrypted, does not fake remote save or execution',()=>{
 const js=src('task-editor.js'),apiSource=src('api/commander-drafts.js');
 assert.match(js,/AES-GCM/);assert.match(js,/PBKDF2/);
 assert.match(js,/210000/);assert.match(js,/sourceAtPrompt===r\.source/);
 assert.match(js,/no-store/);assert.match(js,/relatedPr/);
 assert.match(js,/github\.com\/repos\/andylitvinov-design\/books/);
 assert.match(js,/NOT_STARTED/);
 assert.doesNotMatch(js,/HH_PM_GITHUB_WRITE_TOKEN|service_role|workflow_dispatch/);
 assert.match(apiSource,/PRIVATE_GITHUB_ISSUE/);
 assert.match(apiSource,/agentStarted:false/);
 assert.doesNotMatch(apiSource,/workflow_dispatch|api\.vercel\.com.*deployments/);
});
