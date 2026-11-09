import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const api=require('../api/commander-chats.js');
const store=require('../lib/commander-private-store.js');
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(raw){this.body=JSON.parse(raw)}}}
function jwt(exp=Math.floor(Date.now()/1000)+600){
 const payload=Buffer.from(JSON.stringify({sub:'123e4567-e89b-42d3-a456-426614174000',aud:'authenticated',exp})).toString('base64url');
 return 'header.'+payload+'.signature';
}
test('Supabase monitor cookie accepts bounded JWT shape and rejects expired or malformed tokens',()=>{
 const value=jwt(),token=store.tokenFromRequest({headers:{cookie:'hh_commander_supabase_auth='+value}});
 assert.equal(token,value);
 assert.equal(store.tokenFromRequest({headers:{cookie:'hh_commander_supabase_auth='+jwt(Math.floor(Date.now()/1000)-1)}}),'');
 assert.equal(store.tokenFromRequest({headers:{cookie:'hh_commander_supabase_auth=not-a-jwt'}}),'');
 assert.equal(store.tokenFromRequest({headers:{cookie:''}}),'');
});
test('write requests are bound to the exact monitor origin and host',()=>{
 const base={host:'holistic-house-pr-monitor.vercel.app',origin:'https://holistic-house-pr-monitor.vercel.app','sec-fetch-site':'same-origin'};
 assert.equal(store.isOriginAllowed({headers:base}),true);
 assert.equal(store.isOriginAllowed({headers:{...base,origin:'https://evil.example'}}),false);
 assert.equal(store.isOriginAllowed({headers:{...base,host:'evil.example'}}),false);
 assert.equal(store.isOriginAllowed({headers:{...base,'sec-fetch-site':'cross-site'}}),false);
});
test('guest requests cannot list or mutate private chats',async()=>{
 const get=response();
 await api({method:'GET',url:'/api/commander-chats?action=list',headers:{host:'holistic-house-pr-monitor.vercel.app'}},get);
 assert.equal(get.statusCode,401);assert.equal(get.body.error,'OWNER_SESSION_REQUIRED');
 assert.match(get.headers['Cache-Control'],/no-store/);
 const post=response();
 await api({method:'POST',url:'/api/commander-chats?action=create',
  headers:{host:'holistic-house-pr-monitor.vercel.app',origin:'https://evil.example'},body:{chat:{}}},post);
 assert.equal(post.statusCode,403);assert.equal(post.body.error,'CROSS_ORIGIN_DENIED');
});
test('chat adapter uses only the owner-verified Supabase private store',()=>{
 const backend=src('api/commander-chats.js'),drafts=src('api/commander-drafts.js'),
  session=src('api/commander-session.js'),helper=src('lib/commander-private-store.js');
 assert.match(backend,/commander_from_task/);assert.match(backend,/commander_append_event/);
 assert.match(backend,/callStore/);assert.doesNotMatch(backend,/core\.github|HH_PM_GITHUB_WRITE_TOKEN|PRIVATE_GITHUB_ISSUE/);
 assert.match(drafts,/commander_save_task/);assert.match(drafts,/SUPABASE_PRIVATE/);
 assert.doesNotMatch(drafts,/api\.github\.com|HH_PM_GITHUB_WRITE_TOKEN/);
 assert.match(helper,/agent-commander-private-store-v1/);
 assert.match(helper,/HH_PM_SUPABASE_PUBLISHABLE_KEY/);
 assert.match(session,/HttpOnly/);assert.match(session,/SameSite=Lax/);
 assert.match(session,/callStore/);
});
test('chat UI keeps encrypted local recovery and does not claim assignment is execution',()=>{
 const html=src('chats.html'),css=src('commander-chats.css'),js=src('commander-chats.js');
 for(const id of ['cc-login','cc-vault','cc-board','cc-chat-list','cc-thread','cc-messages','cc-executors','cc-pr-proof','cc-report-list'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(css,/safe-area-inset-bottom/);assert.match(css,/max-width:480px/);
 assert.match(js,/AES-GCM/);assert.match(js,/PBKDF2/);assert.match(js,/ciphertext/);
 assert.match(js,/openRequestedTask/);assert.match(js,/AWAITING|Ожидается подтверждённый ответ/);
 assert.match(js,/UNVERIFIED_ASSIGNMENT_ONLY/);
 assert.doesNotMatch(js,/service_role|HH_PM_GITHUB_WRITE_TOKEN|api\.github\.com\/repos\/.*issues/);
});

test('linked PR chats automatically sync signed CI/Repair reports with stable private event IDs',()=>{
 const js=src('commander-chats.js'),html=src('chats.html');
 assert.match(js,/reportList\(\{automatic:true,silent:true\}\)/);
 assert.match(js,/reportRefreshTimer=win\.setInterval/);
 assert.match(js,/120000\)/);
 assert.match(js,/doc\.visibilityState!=='hidden'/);
 assert.match(js,/reportMentionsPr/);
 assert.match(js,/stableReportEventId/);
 assert.match(js,/eventIdOverride\|\|id\(\)/);
 assert.match(js,/proofLevel:'REPORT_ONLY_NOT_COMMIT'/);
 assert.match(js,/reportSyncBusy/);
 assert.match(html,/CI \/ Repair/);
 assert.match(html,/2 минуты/);
});

test('server chat refresh is retryable and never silently switches to a local archive',()=>{
 const js=src('commander-chats.js');
 assert.match(js,/13000/);
 assert.match(js,/AbortError/);
 assert.match(js,/if\(remote\)\{await listRemote\(\)/);
 assert.match(js,/else if\(authorized\)\{await authenticated\(\)/);
 assert.match(js,/A transient API failure must not silently replace server chats/);
 assert.match(js,/Серверное хранилище временно недоступно/);
 assert.match(html,/commander-chats\.js\?v=20261109-retry-v1/);
 assert.match(js,/Проверка защищённого серверного хранилища временно не завершилась/);
 assert.match(js,/if\(statusError\)/);
});

test('monitor-side owner token handoff is bounded, retryable and removes bearer from URL',()=>{
 const auth=src('commander-auth.js');
 assert.match(auth,/fetchWithTimeout/);
 assert.match(auth,/11000/);
 assert.match(auth,/history\.replaceState\(null,'',location\.pathname\+location\.search\)/);
 assert.match(auth,/sessionToken=''/);
 assert.match(auth,/retryAction\(message,\(\)=>exchangeToken\(next\)\)/);
 assert.match(auth,/sessionToken=''[\s\S]{0,100}location\.replace\(next\)/);
 assert.match(auth,/if\(response\.status===401\|\|response\.status===403\)sessionToken=''/);
 assert.match(auth,/HttpOnly|api\/commander-session/);
});
