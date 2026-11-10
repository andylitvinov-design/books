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
 assert.match(session,/HttpOnly/);assert.match(session,/SameSite=Strict/);
 assert.match(session,/REFRESH_COOKIE/);
 assert.ok(session.includes('/auth/v1/token?grant_type=refresh_token'));
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
 assert.ok(html.includes('commander-chats.js?v=20261110-recent-voice-composer-v1'));
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
 assert.ok(html.includes('commander-chats.js?v=20261110-recent-voice-composer-v1'));
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


test('Commander Hermes adapter passes only verified free models and keeps source writes disabled',()=>{
 const api=src('api/commander-chats.js'),ui=src('commander-chats.js');
 assert.match(api,/name==='free_models'/);assert.match(api,/m\.id\.endsWith\(':free'\)/);
 assert.match(api,/GITHUB_WRITE_CONFIRMATION_UI_NOT_AVAILABLE/);
 assert.match(api,/modelId:body\.modelId,confirmGitHubWrite:false/);
 assert.match(ui,/SERVER\+'\?action=free_models'/);
 assert.match(ui,/modelId:selectedModel,confirmGitHubWrite:false/);
 assert.match(ui,/executorModelReady/);assert.match(ui,/refreshExecutionRuns/);assert.match(ui,/startExecutionPolling/);
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
 assert.ok(ui.includes("Запрос сохранён. Исполнитель НЕ запущен"));
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
 assert.ok(js.includes("el('history-all').addEventListener('toggle',renderList)"));
 assert.ok(js.includes("await assignSelectedExecutor(c,mode)"));
 assert.ok(js.includes("el('new-mode').value=aiReady?'openrouter':'local'"));
 assert.ok(css.includes('HH_COMMANDER_ONE_BOX_CHAT_V1'));
 assert.ok(css.includes('.cc-context-dialog::backdrop'));
 assert.ok(css.includes('body.hh-cc-shell:has(#cc-board textarea:focus) #hh-cc-dock'));
 assert.ok(html.includes('commander-chats.css?v=20261110-recent-voice-composer-v1'));
});

test('compact mobile chat never silently swallows validation or duplicates a timed-out creation',()=>{
 const html=src('chats.html'),js=src('commander-chats.js'),css=src('commander-chats.css');
 assert.match(html,/<form id="cc-create-form" novalidate>/);
 assert.match(html,/id="cc-create-feedback"[^>]*role="alert"/);
 assert.ok(js.includes('pendingCreateId||(pendingCreateId=id())'));
 assert.ok(js.includes("listing.chats?.find(x=>x.id===data.id"));
 assert.ok(js.includes('feedback.scrollIntoView'));
 assert.ok(js.includes("button.textContent='⋯'"));
 assert.ok(js.includes("if(busy)return fail("));
 assert.ok(js.includes("el('create-form').addEventListener('input'"));
 assert.ok(css.includes('.cc-create-feedback:not([hidden])'));
});


test('question-first chat completes owner-scoped create, reply, save and reopen in a browser-like runtime',async()=>{
 const html=src('chats.html'),source=src('commander-chats.js');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 const elements={};
 class Element {
  constructor(id=''){
   Object.assign(this,{id,hidden:false,open:false,value:'',textContent:'',children:[],
    listeners:{},dataset:{},disabled:false,scrollHeight:0,scrollTop:0,attrs:{}});
   this.classList={add(){},remove(){}};
  }
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
  async fire(type){for(const fn of this.listeners[type]||[])await fn({preventDefault(){},target:this})}
  setAttribute(key,value){this.attrs[key]=value}
  getAttribute(key){return this.attrs[key]??null}
  append(...children){this.children.push(...children)}
  replaceChildren(...children){this.children=[...children]}
  querySelector(){return new Element()}
  querySelectorAll(){return []}
  scrollIntoView(){}
  focus(){}
  reset(){
   for(const key of ['question','title','tasks','prs','description'])elements['cc-new-'+key].value='';
   elements['cc-new-mode'].value='local';
   elements['cc-new-project'].value='commander';
  }
  close(){this.open=false}
  showModal(){this.open=true}
 }
 for(const id of ids)elements[id]=new Element(id);
 assert.ok(elements['cc-chat-root']&&elements['cc-create-form']);
 elements['cc-new-project'].value='commander';
 elements['cc-new-mode'].value='local';
 elements['cc-mode'].value='local';
 elements['cc-filter'].value='all';
 elements['cc-create-send'].textContent='Отправить';
 elements['cc-create'].hidden=true;
 elements['cc-thread'].hidden=true;
 let created=null,createdCount=0,eventRows=[],seq=0;
 const network=[];
 const response=(data,status=200)=>({ok:status>=200&&status<400,status,json:async()=>data});
 const doc={
  getElementById:id=>elements[id]||null,
  createElement:tag=>new Element(tag),
  addEventListener(){}
 };
 const win={
  crypto:{randomUUID(){
   seq++;
   return '123e4567-e89b-42d3-a456-'+String(426614174000+seq);
  },subtle:{}},
  setTimeout(){return 1},clearTimeout(){},
  setInterval(){return 2},clearInterval(){},addEventListener(){},
  location:{pathname:'/chats.html',search:''},history:{replaceState(){}},
  async fetch(url,options={}){
   const target=new URL(url,'https://holistic-house-pr-monitor.vercel.app');
   const action=target.searchParams.get('action');
   const body=options.body?JSON.parse(options.body):{};
   network.push({path:target.pathname,action,method:options.method||'GET'});
   if(target.pathname==='/api/commander-session')return response({authenticated:true,owner:true,privateStoreConfigured:true,expiresAt:2000000000});
   if(target.pathname==='/api/pm-agent-chat'){
    if(action==='status')return response({authenticated:true,modes:{local:true,openrouter:false}});
    if(action==='chat')return response({reply:'Синтетический ответ советника',model:'local'});
    if(action==='reports')return response({reports:[]});
   }
   if(target.pathname==='/api/commander-chats'){
    if(action==='status')return response({authenticated:true,privateStoreConfigured:true});
    if(action==='list')return response({chats:created?[created]:[]});
    if(action==='create'){
     createdCount++;
     created={...body.chat,issueNumber:42};
     return response({chat:created,issueNumber:42},201);
    }
    if(action==='event'){
     const event={...body,id:body.eventId,kind:body.kind==='ai'?'assistant_unverified':body.kind,
      author:body.kind==='ai'?'AI-ответ':'Владелец',createdAt:'2026-11-10T00:00:00Z'};
     eventRows.push(event);
     return response({event});
    }
    if(action==='read')return response({chat:created,messages:eventRows});
   }
   throw new Error('Unexpected network call: '+url);
  }
 };
 // Execute the real browser script with a DOM adapter and deterministic, fake
 // owner-verified responses. No Supabase credentials or production writes.
 new Function('window','document',source)(win,doc);
 for(let i=0;i<30;i++)await Promise.resolve();
 assert.equal(elements['cc-board'].hidden,false,'verified owner sees the workspace');
 elements['cc-new-question'].value='Проверь работу сохранения рабочего чата';
 await elements['cc-create-form'].fire('submit');
 assert.equal(createdCount,1);
 assert.equal(created.title,'Вопрос: Проверь работу сохранения рабочего чата');
 assert.deepEqual(created.executors,['local']);
 assert.deepEqual(eventRows.map(e=>e.kind),['owner','assistant_unverified']);
 assert.equal(eventRows[0].text,'Проверь работу сохранения рабочего чата');
 assert.equal(eventRows[1].text,'Синтетический ответ советника');
 assert.equal(elements['cc-thread'].hidden,false);
 assert.equal(elements['cc-create'].hidden,true);
 assert.equal(elements['cc-messages'].children.length,2);
 assert.match(elements['cc-chat-feedback'].textContent,/Ответ сохранён/);
 assert.equal(elements['cc-create-send'].disabled,false);
 assert.ok(network.some(x=>x.action==='create'&&x.method==='POST'));
 assert.ok(network.some(x=>x.action==='chat'&&x.method==='POST'));

 // Re-open using the real list card callback. History must be returned by the
 // owner-scoped read endpoint, not silently replaced with a local archive.
 await elements['cc-close-thread'].fire('click');
 assert.equal(elements['cc-create'].hidden,false);
 elements['cc-new-question'].value='x';
 await elements['cc-create-form'].fire('submit');
 assert.equal(createdCount,1,'invalid question must not create a chat');
 assert.match(elements['cc-create-feedback'].textContent,/2–1200/);
 const card=elements['cc-chat-list'].children.find(x=>x.className==='cc-chat-card');
 assert.ok(card,'saved chat must appear in history');
 await card.fire('click');
 assert.equal(elements['cc-thread'].hidden,false);
 assert.equal(elements['cc-messages'].children.length,2);
 assert.ok(network.some(x=>x.action==='read'&&x.method==='GET'));
 await elements['cc-verify-chat'].fire('click');
 assert.match(elements['cc-verify-status'].textContent,/вопрос и ответ сохранены в Supabase/);
 assert.equal(elements['cc-verify-chat'].disabled,false);
});

test('last chats stay at the top and one fixed bottom composer supports typed and spoken questions',()=>{
 const html=src('chats.html'),js=src('commander-chats.js'),css=src('commander-chats.css');
 const history=html.indexOf('id="cc-history"');
 const thread=html.indexOf('id="cc-thread"');
 const composer=html.indexOf('id="cc-composer-space"');
 assert.ok(history>0&&thread>history&&composer>thread,'Recent list before thread before bottom composer');
 assert.match(html,/id="cc-new-question"[^>]*minlength="2"[^>]*maxlength="1200"/);
 assert.ok(html.includes('id="cc-chat-form"'));
 assert.ok(html.includes('id="cc-voice-new"'));
 assert.ok(html.includes('id="cc-voice-thread"'));
 assert.ok(html.includes('id="cc-voice-status"'));
 assert.ok(html.includes('id="cc-history-all"'));
 assert.ok(!html.includes('<h2>Новый чат</h2>'),'Do not draw giant new chat form above history');
 assert.ok(js.includes("el('history-all').open"));
 assert.ok(js.includes('filtered.slice(0,5)'));
 assert.ok(js.includes("show('chat-form',true)"));
 assert.ok(js.includes("show('chat-form',false)"));
 assert.ok(js.includes('win.SpeechRecognition||win.webkitSpeechRecognition'));
 assert.ok(js.includes("engine.lang='ru-RU'"));
 assert.ok(js.includes("engine.interimResults=true"));
 assert.ok(js.includes("engine.start()"));
 assert.ok(js.includes("engine.abort()"));
 assert.ok(js.includes('const session={engine,button,target,original:target.value'));
 assert.ok(js.includes("el('voice-new').addEventListener('click'"));
 assert.ok(js.includes("el('voice-thread').addEventListener('click'"));
 assert.ok(js.includes('--cc-keyboard-offset'));
 assert.ok(css.includes('HH_COMMANDER_RECENT_VOICE_COMPOSER_V1'));
 assert.match(css,/grid-template-columns:repeat\(8,minmax\(0,1fr\)\)/);
 assert.match(css,/\.cc-composer-space\s*\{\s*position:fixed/);
 assert.match(css,/\.cc-composer-space \.cc-send-primary/);
 assert.match(css,/\.cc-composer-space \.cc-voice-toggle/);
});

test('owner history verification is read-only and free-model setup remains hidden in context',()=>{
 const html=src('chats.html'),js=src('commander-chats.js');
 assert.match(html,/id="cc-verify-chat"/);
 assert.match(html,/id="cc-verify-status"[^>]*role="status"/);
 assert.match(html,/id="cc-free-model-status"[^>]*hidden/);
 assert.match(html,/HH_PM_OPENROUTER_API_KEY/);
 const i=js.indexOf('async function verifySavedThread()'),j=js.indexOf('function startReportPolling()',i);
 assert.ok(i>=0&&j>i);
 const body=js.slice(i,j);
 assert.match(body,/SERVER\+'\?action=read&issue='/);
 assert.match(body,/read\.chat\?\.id!==current\.id/);
 assert.match(body,/answerIndex>ownerIndex/);
 assert.doesNotMatch(body,/action=create|method:\s*'POST'|service_role|localStorage/);
 assert.match(js,/el\('verify-chat'\)\.addEventListener\('click',verifySavedThread\)/);
 assert.match(js,/show\('free-model-status',!aiReady\)/);
});

test('private Commander writes raw JSON text through text-to-jsonb casts, not JSONB scalar double-encoding',()=>{
 const edge=src('../../supabase/functions/agent-commander-private-store-v1/index.ts');
 assert.doesNotMatch(edge,/\$\d+::jsonb\b/);
 const jsonbParams=[...edge.matchAll(/\$\d+::text::jsonb\b/g)];
 assert.equal(jsonbParams.length,14);
 for(const field of ['failed_jobs','failed_steps','commander_tasks','commander_chats','commander_chat_events'])
  assert.ok(edge.includes(field));
 assert.match(edge,/JSON\.stringify\(event\.failed_jobs\)/);
 assert.match(edge,/JSON\.stringify\(event\.failed_steps\)/);
 assert.match(edge,/JSON\.stringify\(record\)/);
 assert.match(edge,/JSON\.stringify\(chat\)/);
 assert.match(edge,/JSON\.stringify\(event\)/);
});

test('verified GitHub CI reports carry the top-level source URL consumed by the chat renderer',()=>{
 const edge=src('../../supabase/functions/agent-commander-private-store-v1/index.ts');
 const render=src('commander-chats.js');
 assert.match(edge,/kind: "github_report"[\s\S]{0,1200}url: event\.run_url/);
 assert.match(render,/if\(msg\.kind==='github_report'\)htmlLink\(c,'Источник GitHub',msg\.url\)/);
});



test('Director silently refreshes the existing Google owner session before asking for another login',()=>{
 const js=src('commander-chats.js');
 const start=js.lastIndexOf("request('/api/commander-session')");
 assert.ok(start>=0,'startup checks the existing monitor session first');
 const boot=js.slice(start,start+900);
 assert.match(boot,/request\(AI\+'\?action=status'\)/);
 assert.match(js,/async function refreshOwnerSession\(\)/);
 assert.match(js,/r\.status===401&&!retried/);
 assert.match(js,/return request\(url,method,body,true\)/);
 assert.match(js,/ownerRefreshPromise/);
});
