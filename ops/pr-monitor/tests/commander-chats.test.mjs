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
 assert.ok(html.includes('commander-chats.js?v=20261112-free-models-quota-rich-v1'));
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


test('Council routes through owner-authenticated free worker and exposes a persistent status',()=>{
 const html=src('chats.html'),js=src('commander-chats.js'),css=src('commander-chats.css');
 assert.match(html,/option value="council-free"/);
 assert.match(html,/id="cc-run-status"[^>]*role="status"/);
 assert.match(html,/id="cc-retry-run"/);
 assert.doesNotMatch(html,/<iframe|cc-council-frame|Открыть отдельно/);
 assert.doesNotMatch(js,/request\(AI\+'\?action=council','POST'/);
 assert.match(js,/executor:'openrouter'/);
 assert.match(js,/request\(SERVER\+'\?action=run','POST'/);
 assert.match(js,/lastQuestion\(\)/);
 assert.match(css,/\.cc-run-status/);
 assert.match(html,/20261110-rich-markdown-v1/);
});

test('Commander Hermes adapter exposes only owner-authenticated free models and consented writes',()=>{
 const api=src('api/commander-chats.js'),ui=src('commander-chats.js');
 assert.match(api,/name==='free_models'\|\|name==='executor_models'/);
 assert.match(api,/HH_COMMANDER_EXECUTOR_FREE_MODELS_V1/);
 assert.match(api,/VERIFIED_FREE_MODEL_REQUIRED/);
 assert.match(api,/confirmGitHubWrite:body\.executor==='hermes'&&body\.confirmGitHubWrite===true/);
 assert.match(ui,/SERVER\+'\?action=executor_models'/);
 assert.match(ui,/modelId:model,confirmGitHubWrite:writeApproved/);
 assert.match(ui,/refreshExecutionRuns/);
 assert.match(ui,/startExecutionPolling/);
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
 assert.ok(ui.includes("Запрос и попытка сохранены. Запуск НЕ подтверждён"));
 assert.ok(ui.includes("Локальная копия не может запускать исполнителей"));
});


test('Commander execution run snapshots a bounded revision-pinned task context and marks PR hints unverified',()=>{
 const edge=src('../../supabase/functions/agent-commander-private-store-v1/index.ts');
 assert.ok(edge.includes('HH_COMMANDER_TASK_CONTEXT_V1'));
 assert.ok(edge.includes('chatRevision:Number.isSafeInteger(chat.revision)?chat.revision:0'));
 assert.ok(edge.includes('linkedPrHintsVerified:false'));
 assert.ok(edge.includes('requiredBeforeSourceChange:"Resolve live GitHub PR and exact HEAD before any source change."'));
 assert.ok(edge.includes('jsonbText({message,goal,acceptanceCriteria,skillIds,parentTaskId,contextCapsule,modelId,confirmGitHubWrite:writeConfirmed})'));
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
 assert.ok(js.includes("await assignSelectedExecutor(c,chosenFreeModel?'local':mode)"),
   "named :free selection uses existing owner-checked local worker, not a new executor");
 const preferred="el('new-mode').value=ownedDirectorAvailable?'director':(aiReady?'openrouter':'local')";
 assert.equal(js.split(preferred).length-1,2,'authenticated Director default remains set on both initial load and chat creation');
 assert.ok(js.includes("ownedDirectorAvailable=remote&&status.dispatchAvailable===true&&status.dispatchMode==='FIRST_PARTY_AGENT_DIRECTOR'"));
 assert.ok(css.includes('HH_COMMANDER_ONE_BOX_CHAT_V1'));
 assert.ok(css.includes('.cc-context-dialog::backdrop'));
 assert.ok(css.includes('body.hh-cc-shell:has(#cc-board textarea:focus) #hh-cc-dock'));
 assert.ok(html.includes('commander-chats.css?v=20261110-rich-markdown-v1'));
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
  querySelectorAll(selector){
   if(selector==="option"&&["cc-mode","cc-new-mode"].includes(this.id))return this._options||[];
   return [];
  }
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
 const menuChoices=["local","director","openrouter","council-free","codex"];
 const menuOptions={};
 for(const scope of ["cc-mode","cc-new-mode"]){
  menuOptions[scope]=menuChoices.map(value=>Object.assign(new Element(),{value}));
  elements[scope]._options=menuOptions[scope];
 }
 elements['cc-create'].hidden=true;
 elements['cc-thread'].hidden=true;
 let created=null,createdCount=0,eventRows=[],seq=0,queuedRun=null;
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
    if(action==='chat')return response({reply:'**Синтетический ответ советника**\n\n### 1. Проверка\n- **Шаг:** сохранить\n- [Ссылка](https://example.org)\n\nПервая строка\nВторая строка\n\n<script>alert(1)</script> [опасно](javascript:alert(1))',model:'local'});
    if(action==='council')return response({reply:'Синтетический ответ Совета ИИ, это проверенный тестовый ответ.',model:'Council free'});
    if(action==='reports')return response({reports:[]});
   }
   if(target.pathname==='/api/commander-chats'){
    if(action==='status')return response({authenticated:true,privateStoreConfigured:true});
    if(action==='free_quota')return response({schema:"HH_COMMANDER_QUOTA_MENU_V1",
     worker:{schema:"HH_COMMANDER_FREE_QUOTA_V1",status:"VERIFIED",remaining:7,limit:50,used:43},
     monitor:{schema:"HH_COMMANDER_FREE_QUOTA_V1",status:"UNAVAILABLE"}});
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
    if(action==='runs')return response({runs:queuedRun?[queuedRun]:[]});
    if(action==='run'){
     queuedRun={run_id:body.runId,status:'QUEUED',reason_code:'OPENROUTER_WORKER_QUEUED',created_at:new Date().toISOString(),worker_attempt_count:0};
     return response({run:queuedRun,status:'QUEUED'},202);
    }
   }
   throw new Error('Unexpected network call: '+url);
  }
 };
 // Execute the real browser script with a DOM adapter and deterministic, fake
 // owner-verified responses. No Supabase credentials or production writes.
 new Function('window','document',source)(win,doc);
 for(let i=0;i<30;i++)await Promise.resolve();
 assert.equal(elements['cc-board'].hidden,false,'verified owner sees the workspace');
 assert.ok(network.some(x=>x.action==="free_quota"&&x.method==="GET"));
 for(const scope of ["cc-mode","cc-new-mode"]){
  const byId=Object.fromEntries(menuOptions[scope].map(o=>[o.value,o.textContent]));
  assert.match(byId.director,/ — 7 осталось$/);
  assert.match(byId["council-free"],/ — 7 осталось$/,"Council shares Director account counter");
  assert.match(byId.openrouter,/ — нет данных$/,"legacy Vercel key has independent unknown quota");
  assert.match(byId.local,/ — без лимита$/);
  assert.match(byId.codex,/ — лимит неизвестен$/);
 }
 elements['cc-new-question'].value='Проверь работу сохранения рабочего чата';
 await elements['cc-create-form'].fire('submit');
 assert.equal(createdCount,1);
 assert.equal(created.title,'Вопрос: Проверь работу сохранения рабочего чата');
 assert.deepEqual(created.executors,['local']);
 assert.deepEqual(eventRows.map(e=>e.kind),['owner','assistant_unverified']);
 assert.equal(eventRows[0].text,'Проверь работу сохранения рабочего чата');
 assert.match(eventRows[1].text,/\*\*Синтетический ответ советника\*\*/);
 assert.equal(elements['cc-thread'].hidden,false);
 assert.equal(elements['cc-create'].hidden,true);
 assert.equal(elements['cc-messages'].children.length,2);
 const descendants=node=>[node,...node.children.flatMap(descendants)];
 const renderedReply=descendants(elements['cc-messages'].children[1]);
 for(const tag of ['strong','h4','ul','li','br','a'])assert.ok(renderedReply.some(node=>node.id===tag),tag);
 assert.equal(renderedReply.filter(node=>node.id==='a').length,1,'unsafe scheme must remain plain text');
 assert.ok(!renderedReply.some(node=>node.id==='script'),'model HTML must not execute');
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
 // The exact same owner chat receives the Council answer on ONE Send.
 elements['cc-mode'].value='council-free';
 elements['cc-message'].value='Какие тренды ИИ сейчас основные?';
 await elements['cc-chat-form'].fire('submit');
 assert.equal(network.filter(x=>x.action==='council').length,0);
 assert.equal(network.filter(x=>x.action==='run').length,1);
 assert.equal(eventRows.at(-1).kind,'owner');
 assert.equal(elements['cc-run-status'].hidden,false);
 assert.match(elements['cc-run-status-label'].textContent,/в очереди/);
 assert.equal(elements['cc-send'].disabled,false);
 assert.match(elements['cc-chat-feedback'].textContent,/очередь OpenRouter/);
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
 assert.ok(jsonbParams.length>=21,'all original JSONB casts and new CI route receipts use text-to-jsonb');
 for(const field of ['failed_jobs','failed_steps','commander_tasks','commander_chats','commander_chat_events','commander_execution_runs'])
  assert.ok(edge.includes(field));
 assert.match(edge,/jsonbText\(event\.failed_jobs\)/);
 assert.match(edge,/jsonbText\(event\.failed_steps\)/);
 assert.match(edge,/jsonbText\(record\)/);
 assert.match(edge,/jsonbText\(chat\)/);
 assert.match(edge,/jsonbText\(event\)/);
});

test('Hermes source writes require one-shot owner consent and use only a verified zero-price model',()=>{
 const html=src('chats.html'),ui=src('commander-chats.js'),api=src('api/commander-chats.js'),css=src('commander-chats.css');
 for(const id of ['new-model-label','new-model','new-github-write-wrap','new-github-write','github-write-wrap','github-write'])
  assert.ok(html.includes('id="cc-'+id+'"'),id);
 assert.ok(html.includes('type="checkbox" id="cc-github-write"'));
 assert.ok(api.includes("name==='executor_models'"));
 assert.ok(api.includes('HH_COMMANDER_EXECUTOR_FREE_MODELS_V1'));
 assert.ok(api.includes('Number(v)===0'));
 assert.ok(api.includes("confirmGitHubWrite:body.executor==='hermes'&&body.confirmGitHubWrite===true"));
 assert.ok(ui.includes("SERVER+'?action=executor_models'"));
 assert.ok(ui.includes("mode==='hermes'&&el('github-write').checked===true"));
 assert.ok(ui.includes('modelId:model,confirmGitHubWrite:writeApproved'));
 assert.ok(ui.includes("el('github-write').checked=false"));
 assert.ok(ui.includes("configureModels('new')"));
 assert.ok(ui.includes("configureModels('thread')"));
 assert.ok(ui.includes("msg.kind==='agent_final'&&msg.sourceWrite?.verified===true"));
 assert.ok(css.includes('.cc-github-write-wrap[hidden]'));
 assert.doesNotMatch(ui,/HERMES_SHARED_SECRET|GITHUB_TOKEN|service_role/);
});
test('free Hermes model catalogue authenticates owner before its read-only public request',()=>{
 const api=src('api/commander-chats.js');
 const owner=api.indexOf("const owner=await callStore(req,'status'");
 const request=api.indexOf("const response=await fetch('https://openrouter.ai/api/v1/models");
 assert.ok(owner>=0&&request>owner);
 assert.ok(api.includes("m.id.endsWith(':free')"));
 assert.doesNotMatch(api.slice(0,api.indexOf('async function readMonitorFreeQuota()')),/Authorization:\s*'Bearer '|OPENROUTER_API_KEY/);
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

test('owner-only global CI Inbox is visible and polls independently of opening or closing chats',()=>{
 const html=src('chats.html'),js=src('commander-chats.js'),api=src('api/commander-chats.js');
 for(const id of ['cc-ci-inbox','cc-ci-meta','cc-ci-list','cc-ci-refresh'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/SERVER\+'\?action=ci_events&limit=30'/);
 assert.match(js,/function startCIInboxPolling\(\)/);
 assert.match(js,/120000\)/);
 assert.match(js,/doc\.visibilityState!=='hidden'/);
 assert.match(js,/association_status/);
 assert.match(js,/event\.head_sha/);assert.match(js,/event\.failed_jobs/);assert.match(js,/event\.failed_steps/);
 assert.match(api,/name==='ci_events'/);assert.match(api,/commander_list_ci_events/);
 assert.match(api,/callStore\(req,action,body/);
 assert.doesNotMatch(api,/service_role|SUPABASE_DB_URL|HERMES_SHARED_SECRET/);
 const poll=js.slice(js.indexOf('function startCIInboxPolling'),js.indexOf('const from64='));
 assert.doesNotMatch(poll,/startReportPolling/);
});


test('new chat sends bounded acceptance criteria and Skill IDs as references only',()=>{
 const html=src('chats.html'),js=src('commander-chats.js'),api=src('api/commander-chats.js');
 assert.match(html,/id="cc-new-acceptance"/);
 assert.match(html,/id="cc-new-skill-ids"/);
 assert.match(html,/Skill IDs сами по себе не выдают доступ/);
 assert.match(js,/const rawCriteria=value\('acceptance'\)\.split\(/);
 assert.match(js,/if\(rawCriteria\.length>5/);
 assert.match(js,/rawSkills=value\('skill-ids'\)\.split\(','\)/);
 assert.match(js,/r\.acceptanceCriteria=rawCriteria/);
 assert.match(js,/r\.skillIds=rawSkills/);
 assert.match(api,/body=\{issueNumber:body\.issueNumber,expectedRevision:body\.expectedRevision,chat:body\.chat\}/);
 assert.doesNotMatch(js,/grantCapabilities|autoGrantSkills|skillIds.*capabilit/i);
});




test('first-party cloud Director queues owner-scoped OpenRouter Free work read-only',()=>{
  const edge=src('../../supabase/functions/agent-commander-private-store-v1/index.ts');
  const begin=edge.indexOf('if(action==="commander_start_run")');
  const end=edge.indexOf('if(action==="commander_list_ci_events")',begin);
  assert.ok(begin>=0&&end>begin);
  const handler=edge.slice(begin,end);
  assert.ok(handler.includes('const canDispatch=(executor==="local"||executor==="openrouter")&&!writeConfirmed&&openRouterReady'));
  assert.match(handler,/OPENROUTER_WORKER_QUEUED/);
 assert.match(handler,/OPENROUTER_API_KEY_NOT_CONFIGURED/);
 assert.match(edge,/HH_PM_OPENROUTER_API_KEY/);
 assert.match(edge,/receiveCommanderCiRoute\(req,origin\)/);
 assert.match(edge,/route_receipt/);
  assert.match(handler,/status:"QUEUED"/);
  assert.match(handler,/dispatchAttempted:false,agentStarted:false,executionVerified:false/);
  assert.match(handler,/GITHUB_WRITE_REQUIRES_SEPARATE_APPROVAL/);
  assert.match(handler,/EXTERNAL_HERMES_SERVICE_DISABLED_FIRST_PARTY_ONLY/);
  assert.doesNotMatch(handler,/ownedDirectorCall\(req|trustedOwnedDirectorReceipt\(remote/);
  assert.doesNotMatch(handler,/confirmGitHubWrite:true|sourceWriteAuthorized:true/);
  assert.match(edge,/value\.sourceWrite!==null/);
});

test('legacy external Hermes code executor is disabled in UI and rejected before private-store dispatch',async()=>{
 const html=src('chats.html'),ui=src('commander-chats.js'),backend=src('api/commander-chats.js');
 assert.equal((html.match(/option value="hermes" disabled/g)||[]).length,2);
 assert.match(ui,/if\(legacy\)legacy\.disabled=true/);
 assert.match(ui,/if\(el\('mode'\)\.value==='hermes'\)el\('mode'\)\.value='local'/);
 assert.match(backend,/body\.executor==='hermes'\)return sendJson\(res,410,\{error:'EXTERNAL_HERMES_SERVICE_DISABLED_FIRST_PARTY_ONLY'\}\)/);
 const out=response();
 await api({method:'POST',url:'/api/commander-chats?action=run',headers:{
   host:'holistic-house-pr-monitor.vercel.app',origin:'https://holistic-house-pr-monitor.vercel.app',
   'sec-fetch-site':'same-origin'
  },body:{executor:'hermes',modelId:'provider/model:free',confirmGitHubWrite:false}},out);
 assert.equal(out.statusCode,410);
 assert.equal(out.body.error,'EXTERNAL_HERMES_SERVICE_DISABLED_FIRST_PARTY_ONLY');
});

test('CI Inbox displays the shared diagnostic recommendation and retry policy without granting execution authority',()=>{
 const html=src('chats.html'),js=src('commander-chats.js'),css=src('commander-chats.css');
 assert.match(html,/commander-chats\.js\?v=20261112-free-models-quota-rich-v1/);
 assert.match(html,/commander-chats\.css\?v=20261110-rich-markdown-v1/);
 assert.match(js,/event\.classification&&typeof event\.classification==='object'/);
 for(const field of ['recommended_action','recommended_status','reason_code','responsible_role','retry','requires_human','ruleset_version','confidence'])
  assert.ok(js.includes('classification.'+field)||js.includes('classification?.'+field),field);
 assert.match(js,/Классификатор не разрешает запись в GitHub, retry, merge или deploy автоматически/);
 assert.match(css,/\.cc-ci-classification-action/);
});

test('owner chat accurately labels first-party OpenRouter Free and translates every fail-closed provider reason',()=>{
 const html=src('chats.html'),js=src('commander-chats.js');
 assert.equal((html.match(/Agents Director · OpenRouter Free \(анализ\)/g)||[]).length,2);
 assert.match(html,/commander-chats\.js\?v=20261112-free-models-quota-rich-v1/);
 assert.match(js,/director:'Agents Director · OpenRouter Free'/);
 for(const code of ['OWNED_MODEL_RUNTIME_NOT_CONFIGURED','OWNED_MODEL_FREE_RATE_LIMIT',
   'OWNED_MODEL_NO_VERIFIED_FREE_MODELS','OWNED_MODEL_COST_UNVERIFIED',
   'OWNED_MODEL_BILLABLE_RESPONSE_HOLD','OWNED_MODEL_OPENROUTER_KEY_REJECTED'])
  assert.ok(js.includes(code+':'),code);
 assert.doesNotMatch(js,/OWNED_MODEL_RUNTIME_NOT_CONFIGURED:'Собственная модель/);
});


test('terminal BLOCKED run reloads its persisted private chat event just like COMPLETED and FAILED',()=>{
 const js=src('commander-chats.js');
 const start=js.indexOf('async function refreshExecutionRuns()');
 const end=js.indexOf('function startExecutionPolling()',start);
 assert.ok(start>=0&&end>start);
 const refresh=js.slice(start,end);
 assert.match(refresh,/if\(\['COMPLETED','FAILED','BLOCKED'\]\.includes\(run\.status\)\)/);
 assert.match(refresh,/const latest=await request\(SERVER\+'\?action=read&issue='\+thread\.issueNumber\)/);
 assert.match(refresh,/renderMessages\(\)/);
 // A terminal blocker is never portrayed as an executing model; polling ends.
 assert.match(js,/!\['QUEUED','STARTING','RUNNING'\]\.includes\(run\.status\)/);
});


test('first question defaults to the authenticated cloud Director and its real final answer is verifiable after reload',()=>{
 const html=src('chats.html'),css=src('commander-chats.css'),js=src('commander-chats.js');
 assert.match(js,/el\('new-mode'\)\.value=ownedDirectorAvailable\?'director':\(aiReady\?'openrouter':'local'\)/);
 assert.equal(js.split("el('new-mode').value=ownedDirectorAvailable?'director':(aiReady?'openrouter':'local')").length-1,2);
 assert.match(js,/const lastAnswer=\[\.\.\.messages\]\.reverse\(\)\.find\(m=>\['assistant_unverified','agent_final','ai'\]\.includes\(m\.kind\)\)/);
 assert.match(js,/\['assistant_unverified','agent_final','ai'\]\.includes\(m\.kind\)\)\:-1/);
 assert.match(js,/MODE[Ll]_RESPONSE_ZERO_COST_VERIFIED_READ_ONLY|OPENROUTER_RESPONSE_VERIFIED|const labels=\{QUEUED:/);
 assert.match(js,/startExecutionPolling\(\)/);
 assert.match(html,/id="cc-run-status"/);
 assert.match(css,/\.cc-run-status/);
});

// Free-model menu quota is owner-scoped, read-only and never tests an allowance with billable inference.
test("free-model quota is derived from provider key daily request counter, not credit balance",async()=>{
 const edge=src("../../supabase/functions/agent-commander-private-store-v1/index.ts");
 const apiSource=src("api/commander-chats.js");
 const ui=src("commander-chats.js");
 const html=src("chats.html");
 for(const server of [edge,apiSource]){
  assert.match(server,/https:\/\/openrouter\.ai\/api\/v1\/key/);
  assert.match(server,/free_model_daily_requests/);
  assert.match(server,/Number\.isSafeInteger/);
  assert.doesNotMatch(server,/limit_remaining/);
  assert.match(server,/KEY_NOT_CONFIGURED/);
  assert.match(server,/QUOTA_NOT_REPORTED/);
 }
 assert.match(edge,/if\(action==="commander_free_model_quota"\)/);
 assert.match(apiSource,/name==='free_quota'/);
 assert.match(apiSource,/callStore\(req,"commander_free_model_quota",\{\}, \{method:"GET"\}\)/);
 assert.match(apiSource,/HH_COMMANDER_QUOTA_MENU_V1/);
 assert.match(ui,/remainingLabel/);
 assert.match(ui,/QUOTA_OPTION_LABELS/);
 assert.match(ui,/SERVER\+"\?action=free_quota"/);
 assert.match(ui,/refreshFreeQuota\(true\)/);
 assert.match(html,/commander-chats\.js\?v=20261112-free-models-quota-rich-v1/);
 const unauth=response();
 await api({method:"GET",url:"/api/commander-chats?action=free_quota",
  headers:{host:"holistic-house-pr-monitor.vercel.app"}},unauth);
 assert.equal(unauth.statusCode,401);
 assert.equal(unauth.body.error,"OWNER_SESSION_REQUIRED");
 assert.match(unauth.headers["Cache-Control"],/no-store/);
});

test("provider daily free quota contract is parsed safely without inference or leaking the API key",async()=>{
 const server=src("api/commander-chats.js");
 const match=server.match(/async function readMonitorFreeQuota\(\)\{[\s\S]*?\n\}\nasync function freeQuota/);
 assert.ok(match,"read-only OpenRouter key helper");
 const source=match[0].replace(/\nasync function freeQuota$/,"");
 const secret="synthetic-test-only-key";
 const observed=[];
 const helper=(impl,key=secret)=>new Function("fetch","process","AbortController","setTimeout","clearTimeout",
  source+"\nreturn readMonitorFreeQuota;")(
  async(url,options)=>{observed.push({url,options});return impl();},
  {env:{HH_PM_OPENROUTER_API_KEY:key}},AbortController,setTimeout,clearTimeout);
 const readOk=helper(()=>({ok:true,text:async()=>JSON.stringify({
  data:{free_model_daily_requests:{used:37,limit:50,remaining:13},
   limit_remaining:9999,usage_daily:12.5,label:"private-account-label"}
 })}));
 const valid=await readOk();
 assert.equal(valid.remaining,13);
 assert.equal(valid.status,"VERIFIED");
 assert.equal(valid.limit,50);
 assert.equal(valid.sharedAcrossFreeModels,true);
 assert.ok(!JSON.stringify(valid).includes(secret));
 assert.ok(!JSON.stringify(valid).includes("private-account-label"));
 assert.equal(observed.length,1);
 assert.equal(observed[0].url,"https://openrouter.ai/api/v1/key");
 assert.equal(observed[0].options.method,"GET");
 assert.equal(observed[0].options.headers.Authorization,"Bearer "+secret);
 assert.equal(observed[0].options.cache,"no-store");
 const bad=await helper(()=>({ok:true,text:async()=>JSON.stringify({data:{limit_remaining:99}})}))();
 assert.equal(bad.status,"UNAVAILABLE");
 assert.equal(bad.reason,"QUOTA_NOT_REPORTED");
 const blocked=await helper(()=>({ok:false,status:429}))();
 assert.equal(blocked.status,"UNAVAILABLE");
 assert.equal(blocked.reason,"PROVIDER_UNAVAILABLE");
 const missing=await helper(()=>{throw Error("should not fetch")},"")();
 assert.equal(missing.status,"UNAVAILABLE");
 assert.equal(missing.reason,"KEY_NOT_CONFIGURED");
});


test('historic flattened AI Markdown is recovered without injecting model HTML',()=>{
 const source=src('commander-chats.js');
 const start=source.indexOf(' // HH_COMMANDER_RICH_MARKDOWN_V1: DOM only');
 const end=source.indexOf(' function renderMessages(){',start);
 assert.ok(start>0&&end>start);
 const make=(tag,cls,text)=>({tag,cls,text,children:[],append(...children){this.children.push(...children)}});
 const rich=Function('make',source.slice(start,end)+';return richMessage;')(make);
 const descendants=node=>[node,...node.children.flatMap(descendants)];
 const historic=descendants(rich('Вот тренды: ### 1. Мультимодальность - **Что это:** описание - **Примеры:** GPT'));
 assert.ok(historic.some(node=>node.tag==='h4'));
 assert.equal(historic.filter(node=>node.tag==='li').length,2);
 assert.equal(historic.filter(node=>node.tag==='strong').length,2);
 const modern=descendants(rich('## Заголовок\n\n**Жирный** и *курсив*\n\n1. Шаг\n2. Второй\n\nФраза\nещё фраза\n\n' +
  '[ссылка](https://example.org) [опасно](javascript:alert(1)) <script>alert(1)</script>'));
 for(const tag of ['h3','strong','em','ol','li','br','a'])assert.ok(modern.some(node=>node.tag===tag),tag);
 assert.equal(modern.filter(node=>node.tag==='a').length,1);
 assert.ok(!modern.some(node=>node.tag==='script'));
 assert.ok(modern.some(node=>node.tag==='span'&&node.text?.includes('<script>')));
});


test('one selector supports live-catalog named free models without breaking owner quota and Markdown',()=>{
 const js=src('commander-chats.js'),api=src('api/commander-chats.js'),html=src('chats.html');
 const store=src('../../supabase/functions/agent-commander-private-store-v1/index.ts');
 const worker=src('../../supabase/functions/agent-commander-openrouter-worker/index.ts');
 assert.match(js,/const FREE_MODEL_MODE='free:'/);
 assert.match(js,/isVerifiedFreeChoice=mode=>/);
 assert.match(js,/function refreshFreeChoices\(\)/);
 assert.match(js,/group\.setAttribute\('data-director-free'/);
 assert.match(js,/modelsList\.slice\(0,15\)/);
 assert.match(js,/label\+' — '\+remainingLabel\('director'\)/);
 assert.match(js,/selectedFreeModel\(mode\)/);
 assert.match(js,/chosenFreeModel\?\{modelId:chosenFreeModel,confirmGitHubWrite:false\}/);
 assert.match(js,/executor:mode==='director'\|\|chosenFreeModel\?'local':mode/);
 assert.match(js,/HH_COMMANDER_QUOTA_MENU_V1/);
 assert.match(js,/HH_COMMANDER_RICH_MARKDOWN_V1/);
 assert.match(html,/commander-chats\.js\?v=20261112-free-models-quota-rich-v1/);
 assert.match(api,/VERIFIED_FREE_MODEL_REQUIRED/);
 assert.match(api,/name==='free_quota'\)return await freeQuota\(req,res\)/);
 assert.match(store,/await verifyFreeModel\(modelId\)/);
 assert.match(store,/HH_COMMANDER_FREE_QUOTA_V1/);
 assert.match(worker,/model: requestedModel, messages/);
 assert.match(worker,/actualModel !== requestedModel/);
 assert.match(worker,/allow_fallbacks: false/);
 assert.match(worker,/max_price: \{ prompt: 0, completion: 0 \}/);
 assert.match(worker,/data_collection: "deny"/);
 assert.match(worker,/cleanMultiline\(assistant\.content/);
 assert.doesNotMatch(js,/modelId:chosenFreeModel,confirmGitHubWrite:true/);
});

test('PR Monitor source release keeps owner APIs on their own deployment (no stale catch-all rewrite)',()=>{
 const config=JSON.parse(src('vercel.json'));
 assert.ok(Array.isArray(config.headers)&&config.headers.length>0);
 assert.ok(!Array.isArray(config.rewrites)||!config.rewrites.some(rule=>
  rule.source==='/:path*'||rule.source==='/(.*)'||String(rule.destination||'').includes('2yqc9bhgt')),
  'standalone monitor owner/session/API paths must not be forwarded to the old deployment');
 assert.match(src('api/commander-chats.js'),/commander-private-store/);
 assert.match(src('lib/commander-private-store.js'),/callStore/);
});
