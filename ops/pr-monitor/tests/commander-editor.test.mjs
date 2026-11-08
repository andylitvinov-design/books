import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const api=require('../api/commander-drafts.js');
const store=require('../lib/commander-private-store.js');
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(raw){this.body=JSON.parse(raw)}}}
test('editor lives on the same domain and retains the original fixed mobile dock',()=>{
 const html=src('task-editor.html'),nav=src('project-management-nav.js'),transfer=src('commander-transfer.js');
 assert.match(html,/task-editor\.js/);assert.match(html,/project-management-nav\.js/);assert.match(html,/commander-shell\.css/);
 assert.match(nav,/\/task-editor\.html/);assert.match(transfer,/location\.assign\(PATH\)/);
 assert.doesNotMatch(html+transfer,/holistichouse\.vercel\.app\/admin/);
 for(const id of ['ac-login','ac-workspace','ac-source','ac-pr-search','ac-quality','ac-save-remote','ac-queue','ac-backup-save','ac-history'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(src('task-editor.css'),/safe-area-inset-bottom/);
 assert.match(src('commander-shell.css'),/#hh-cc-dock\{position:fixed/);
});
test('guest requests cannot read or save private tasks',async()=>{
 for(const method of ['GET','POST']){
  const res=response();
  await api({method,url:'/api/commander-drafts?action=status',
   headers:{host:'holistic-house-pr-monitor.vercel.app'},body:{record:{}}},res);
  assert.equal(res.statusCode,401);assert.equal(res.body.error,'OWNER_SESSION_REQUIRED');
  assert.match(res.headers['Cache-Control'],/no-store/);
 }
 const denied=response();
 await api({method:'POST',url:'/api/commander-drafts?action=save',
  headers:{host:'holistic-house-pr-monitor.vercel.app',origin:'https://evil.example'},body:{record:{}}},denied);
 assert.equal(denied.statusCode,403);
});
test('owner JWT is parsed for forwarding but verified by the private Edge Function',()=>{
 const exp=Math.floor(Date.now()/1000)+600;
 const payload=Buffer.from(JSON.stringify({sub:'123e4567-e89b-42d3-a456-426614174000',exp})).toString('base64url');
 const token='header.'+payload+'.signature';
 assert.equal(store.tokenFromRequest({headers:{cookie:'hh_commander_supabase_auth='+token}}),token);
 const helper=src('lib/commander-private-store.js');
 assert.match(helper,/Authorization:'Bearer '\+token/);
 assert.match(helper,/agent-commander-private-store-v1/);
 assert.match(helper,/redirect:'error'/);
});
test('editor saves and queues only verified owner tasks; no fake dispatch',()=>{
 const js=src('task-editor.js'),apiSource=src('api/commander-drafts.js');
 assert.match(js,/AES-GCM/);assert.match(js,/PBKDF2/);assert.match(js,/210000/);
 assert.match(js,/fetch\('\/api\/commander-session'/);
 assert.match(js,/api\('save'/);assert.match(js,/api\('queue'/);
 assert.match(apiSource,/commander_save_task/);assert.match(apiSource,/commander_queue_task/);
 assert.match(apiSource,/agentStarted/);assert.match(apiSource,/SUPABASE_PRIVATE/);
 assert.doesNotMatch(apiSource,/workflow_dispatch|HH_PM_GITHUB_WRITE_TOKEN|api\.github\.com/);
 assert.match(js,/Исполнитель не запущен/);
});
