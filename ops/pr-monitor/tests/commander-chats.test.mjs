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
 const js=src('commander-chats.js'),html=src('chats.html');
 assert.match(js,/13000/);
 assert.match(js,/AbortError/);
 assert.match(js,/if\(remote\)\{await listRemote\(\)/);
 assert.match(js,/else if\(authorized\)\{await authenticated\(\)/);
 assert.match(js,/A transient API failure must not silently replace server chats/);
 assert.match(js,/Серверное хранилище временно недоступно/);
 assert.ok(html.includes('commander-chats.js?v=20261110-compact-composer-v1'));
 assert.match(js,/Проверка защищённого серверного хранилища временно не завершилась/);
 assert.match(js,/if\(statusError\)/);
});

test('monitor-side owner token handoff is bounded, retryable and removes bearer from URL',()=>{
 const auth=src('commander-auth.js');
 assert.match(auth,/fetchWithTimeout/);
 assert.match(src('commander-auth.html'),/commander-auth\.js\?v=20261109-handoff-retry-v1/);
 assert.match(auth,/11000/);
 assert.match(auth,/history\.replaceState\(null,'',location\.pathname\+location\.search\)/);
 assert.match(auth,/sessionToken=''/);
 assert.match(auth,/retryAction\(message,\(\)=>exchangeToken\(next\)\)/);
 assert.match(auth,/sessionToken=''[\s\S]{0,100}location\.replace\(next\)/);
 assert.match(auth,/if\(response\.status===401\|\|response\.status===403\)sessionToken=''/);
 assert.match(auth,/HttpOnly|api\/commander-session/);
});

test('owner chat API exposes a bounded CI event inbox query through the private store only', async () => {
 const backend=src('api/commander-chats.js');
 assert.match(backend,/name==='ci_events'/);
 assert.match(backend,/commander_list_ci_events/);
 assert.match(backend,/body\.limit=Number\(limitValue\)/);
 assert.match(backend,/callStore\(req,action,body/);
 assert.doesNotMatch(backend,/HERMES_SHARED_SECRET|service_role|SUPABASE_DB_URL/);
 const edge=src('../../supabase/functions/agent-commander-private-store-v1/index.ts');
 assert.match(edge,/action==="commander_list_ci_events"/);
 assert.match(edge,/business_brain\.commander_ci_event_inbox/);
 assert.match(edge,/Math\.min\(100,Number\(body\.limit\)\|\|30\)/);
});


test('AI Council Free is embedded in a persistent Director chat with strict cross-origin validation and explicit consent',()=>{
 const html=src('chats.html'),js=src('commander-chats.js'),css=src('commander-chats.css'),csp=src('vercel.json');
 assert.ok(html.includes('option value="council-free"'));
 assert.ok(html.includes('id="cc-council-frame"'));
 assert.ok(html.includes('data-src="https://ai-council-free-super10.vercel.app/?embed=agents-director"'));
 assert.ok(html.includes('sandbox="allow-scripts allow-forms allow-same-origin'));
 assert.ok(html.includes('commander-chats.js?v=20261110-compact-composer-v1'));
 assert.ok(js.includes("COUNCIL_ORIGIN='https://ai-council-free-super10.vercel.app'"));
 assert.ok(js.includes("event.origin!==COUNCIL_ORIGIN||event.source!==el('council-frame').contentWindow"));
 assert.ok(js.includes('HH_AI_COUNCIL_SET_PROMPT_V1'));
 assert.ok(js.includes('HH_AI_COUNCIL_RESULT_V1'));
 assert.ok(js.includes('data.report.length>18000'));
 assert.ok(js.includes('HH_AI_COUNCIL_SAVE_ACK_V1'));
 assert.ok(js.includes('HH_AI_COUNCIL_SAVE_FAILED_V1'));
 assert.ok(js.includes('eventId:eventIdOverride||id()'));
 assert.ok(js.includes('councilChunkEventId(data.requestId,index)'));
 assert.ok(js.includes('AI Council Free · часть'));
 assert.ok(js.includes("mode!=='council-free'&&!thread.executors.includes(mode)"));
 assert.match(css,/cc-council-panel/);
 assert.match(css,/min-height:600px/);
 assert.ok(csp.includes('frame-src https://accounts.google.com/gsi/ https://ai-council-free-super10.vercel.app;'));
 assert.ok(html.includes('API-ключ'));
});
test('Director Council flow records only the explicit owner question before iframe handoff',()=>{
 const js=src('commander-chats.js');
 const start=js.indexOf("if(mode==='council-free'){");
 const end=js.indexOf('const context=messages.slice',start);
 const block=js.slice(start,end);
 assert.ok(block.includes("await append(c,'owner',text,'')"));
 assert.ok(block.includes('councilPending={requestId:id(),prompt:text,chat:c,sent:false}'));
 assert.ok(!block.includes('tasks:c.tasks'));
 assert.ok(!block.includes('history:context'));
 assert.ok(!block.includes('action=chat'));
 assert.ok(!block.includes('executor'));
});


test('execution API is owner-gated, idempotent and reports blocked instead of fake executor start',()=>{
 const backend=src('api/commander-chats.js');
 const edge=src('../../supabase/functions/agent-commander-private-store-v1/index.ts');
 const ui=src('commander-chats.js');
 assert.ok(backend.includes("name==='runs'"));
 assert.ok(backend.includes("commander_list_execution_runs"));
 assert.ok(backend.includes("name==='run'"));
 assert.ok(backend.includes("commander_start_run"));
 assert.ok(edge.includes("commander_execution_runs"));
 assert.ok(edge.includes("on conflict(owner_id,chat_id,idempotency_key) do nothing"));
 assert.ok(edge.includes("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST"));
 assert.ok(edge.includes("agentStarted:false"));
 assert.ok(edge.includes("NOT_STARTED_NO_EXECUTION_RECEIPT"));
 assert.ok(ui.includes("SERVER+'?action=run'"));
 assert.ok(ui.includes("Запрос и попытка сохранены. Исполнитель НЕ запущен"));
 assert.ok(ui.includes("Локальная копия не может запускать исполнителей"));
});


test('Commander execution run snapshots a bounded revision-pinned task context and marks PR hints unverified',()=>{
 const edge=src('../../supabase/functions/agent-commander-private-store-v1/index.ts');
 assert.ok(edge.includes('HH_COMMANDER_TASK_CONTEXT_V1'));
 assert.ok(edge.includes('chatRevision:Number.isSafeInteger(chat.revision)?chat.revision:0'));
 assert.ok(edge.includes('linkedPrHintsVerified:false'));
 assert.ok(edge.includes('Resolve each linked PR against live GitHub metadata and exact current HEAD'));
 assert.ok(edge.includes('JSON.stringify({message,contextCapsule})'));
 assert.ok(edge.includes('String(contextCapsule.chatRevision)'));
});

test('Commander one-box UX shows the question first and keeps task metadata in an optional sheet',()=>{
 const html=src('chats.html'),js=src('commander-chats.js'),css=src('commander-chats.css');
 assert.ok(html.indexOf('id="cc-new-question"')>=0);
 assert.ok(html.indexOf('id="cc-new-question"')<html.indexOf('id="cc-new-context"'));
 assert.ok(html.includes('<dialog id="cc-new-context"'));
 for(const id of ['cc-new-mode','cc-create-send','cc-context-toggle','cc-context-close',
   'cc-new-title','cc-new-project','cc-new-tasks','cc-new-prs','cc-new-description','cc-history'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.doesNotMatch(html,/id="cc-new-title"[^>]*required/);
 assert.ok(html.includes('id="cc-history" class="cc-history"'));
 assert.ok(!html.includes('<fieldset id="cc-new-executors"'));
 assert.match(js,/if\(!el\('new-title'\)\.value\.trim\(\)\)el\('new-title'\)\.value=/);
 assert.ok(js.includes("await send({preventDefault(){}})"));
 assert.ok(js.includes("el('new-context').close()"));
 assert.ok(js.includes("el('history').open=false"));
 assert.ok(js.includes("await assignSelectedExecutor(c,mode)"));
 assert.ok(js.includes("el('new-mode').value=aiReady?'openrouter':'local'"));
 assert.ok(css.includes('HH_COMMANDER_ONE_BOX_CHAT_V1'));
 assert.ok(css.includes('.cc-context-dialog::backdrop'));
 assert.ok(css.includes('body.hh-cc-shell:has(#cc-board textarea:focus) #hh-cc-dock'));
 assert.ok(html.includes('commander-chats.css?v=20261110-compact-composer-v1'));
});

test('compact mobile chat never silently swallows validation or duplicates a timed-out creation',()=>{
 const html=src('chats.html'),js=src('commander-chats.js'),css=src('commander-chats.css');
 assert.match(html,/<form id="cc-create-form" novalidate>/);
 assert.match(html,/id="cc-create-feedback"[^>]*role="alert"/);
 assert.ok(js.includes('pendingCreateId||(pendingCreateId=id())'));
 assert.ok(js.includes("listing.chats?.find(x=>x.id===data.id"));
 assert.ok(js.includes('feedback.scrollIntoView'));
 assert.ok(js.includes("button.textContent='Создаю…'"));
 assert.ok(js.includes("if(busy)return fail("));
 assert.ok(js.includes("el('create-form').addEventListener('input'"));
 assert.ok(css.includes('.cc-create-feedback:not([hidden])'));
});
