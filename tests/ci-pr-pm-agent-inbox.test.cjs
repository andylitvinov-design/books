'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const inbox=require('../scripts/ci-pr-pm-agent-inbox.cjs');
const owner={login:'andylitvinov-design',type:'User',id:274943885};
const bot={login:'github-actions[bot]',type:'Bot',id:41898282};
const app={slug:'github-actions',id:15368};
const at=()=>new Date().toISOString();
const cmd=(id,body)=>({id,body,user:owner,created_at:at()});
const receipt=(id,commandId,state)=>({id,body:'<!-- HH_PM_INBOX_STATE_V1 comment='+commandId+' status='+state+' -->\nResult',user:bot,performed_via_github_app:app,created_at:at()});
const context={repo:{owner:'andylitvinov-design',repo:'books'},ref:'refs/heads/codex/bootstrap-books',eventName:'schedule',runId:123};
function stub(initial,options={}){
 const comments=[...initial],dispatches=[],calls=[],sent=[];
 const github={rest:{
  issues:{
   get:async()=>({data:{number:3890,state:'open',user:owner,body:'<!-- HH_PM_PUBLIC_AGENT_INBOX_V1 -->\nPublic technical only',comments:comments.length}}),
   listComments:async()=>({data:[...comments]}),
   createComment:async({body})=>{
    sent.push(body);
    const found=/^<!-- HH_PM_INBOX_STATE_V1 comment=([1-9]\d*) status=([A-Z_]+) -->/.exec(body);
    comments.push({id:comments.length+900,body,created_at:at(),user:bot,performed_via_github_app:app});
    return {data:{id:comments.length+900}};
   }
  },
  pulls:{get:async()=>{calls.push('pull');return {data:options.pr||{}}}},
  actions:{createWorkflowDispatch:async x=>{dispatches.push(x);return {status:204}}}
 }};
 const fetcher=async(url,settings)=>{
  calls.push('openrouter');
  assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(settings.headers.Authorization,'Bearer mock-key');
  const pay=JSON.parse(settings.body);
  assert.equal(pay.model,'openrouter/free');
  assert.equal(pay.provider.allow_fallbacks,false);
  assert.deepEqual(pay.provider.max_price,{prompt:0,completion:0});
  return {ok:true,json:async()=>({model:'openrouter/free',usage:{cost:0},choices:[{message:{content:'Связанный PR следует проверять на exact HEAD.'}}]})};
 };
 return {github,fetcher,comments,dispatches,calls,sent};
}
test('owner commands only; arbitrary text or attacker rejected',()=>{
 assert.equal(inbox.command(cmd(1,'!pm ask Explain current HEAD?')).kind,'ask');
 assert.equal(inbox.command(cmd(2,'!pm repair #3826 '+'a'.repeat(40))).kind,'repair');
 assert.equal(inbox.command({...cmd(3,'!pm ask HI'),user:{login:'attacker',type:'User'}}),null);
 assert.equal(inbox.command(cmd(4,'hello unrelated')),null);
});
test('claim and reply durable, no duplicate free calls on next scheduled run',async()=>{
 const fx=stub([cmd(17,'!pm ask Почему не зеленый CI?')]);
 const a=await inbox.run({github:fx.github,context,fetcher:fx.fetcher,token:'mock-key'});
 assert.equal(a.status,'AI_REPLIED');
 assert.equal(fx.calls.filter(x=>x==='openrouter').length,1);
 assert.equal(fx.sent.length,2);
 assert.match(fx.sent[0],/status=CLAIMED/);
 assert.match(fx.sent[1],/status=REPLIED/);
 assert.doesNotMatch(fx.sent.join('\n'),/mock-key/);
 const b=await inbox.run({github:fx.github,context,fetcher:fx.fetcher,token:'mock-key'});
 assert.equal(b.status,'NO_PENDING');
 assert.equal(fx.calls.filter(x=>x==='openrouter').length,1);
});
test('only schedule/default branch; no key never calls OpenRouter',async()=>{
 const fx=stub([cmd(18,'!pm ask Explain current HEAD?')]);
 const block=await inbox.run({github:fx.github,context:{...context,ref:'refs/heads/fork'},fetcher:fx.fetcher,token:'mock-key'});
 assert.equal(block.status,'SKIPPED_UNTRUSTED_CONTEXT');
 const state=await inbox.run({github:fx.github,context,fetcher:fx.fetcher,token:''});
 assert.equal(state.status,'BLOCKED');
 assert.equal(fx.calls.length,0);
 assert.match(fx.sent.join('\n'),/OPENROUTER_FREE_SECRET_NOT_AVAILABLE/);
});
test('repair requires eligible PR and signed source receipt; holds fail closed',async()=>{
 const fx=stub([cmd(19,'!pm repair 3826 '+'a'.repeat(40))]);
 const a=await inbox.run({github:fx.github,context,fetcher:fx.fetcher,token:'mock-key'});
 assert.equal(a.status,'BLOCKED');
 assert.equal(fx.dispatches.length,0);
 assert.match(fx.sent.join('\n'),/PR_NOT_CURRENT_ELIGIBLE/);
});
test('only signed bot receipt confirms claimed request; daily cap counts claims only',()=>{
 const arr=[cmd(99,'!pm ask Need PR status?'),receipt(300,99,'CLAIMED'),receipt(301,99,'REPLIED')];
 assert.equal(inbox.pending(arr).status,'OK');
 assert.equal(inbox.pending(arr).next,null);
 assert.equal(inbox.pending(arr).used,1);
 assert.equal(inbox.trustedReceipt({...receipt(302,99,'CLAIMED'),user:{login:'attacker',type:'User'}}),null);
});

test('bounded free router requests sufficient visible budget and suppresses reasoning',async()=>{
 let request=null;
 const fetcher=async(_url,options)=>{request=JSON.parse(options.body);return {ok:true,
  json:async()=>({model:'openrouter/free',usage:{cost:0},choices:[{finish_reason:'stop',message:{content:'Готовый краткий ответ.'}}]})};};
 const out=await inbox.askFree('Нужен план?',{fetcher,token:'synthetic-key'});
 assert.equal(out.ok,true);
 assert.equal(out.text,'Готовый краткий ответ.');
 assert.equal(request.max_tokens,1600);
 assert.deepEqual(request.reasoning,{enabled:false,exclude:true});
 assert.equal(request.provider.max_price.prompt,0);
 assert.equal(request.provider.max_price.completion,0);
});
test('reasoning-only 200 response gets explicit bounded blocker, never false success',async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({model:'openrouter/free',
  choices:[{finish_reason:'length',message:{content:''}}],
  usage:{cost:0,completion_tokens:1600,completion_tokens_details:{reasoning_tokens:1599}}})});
 const out=await inbox.askFree('Почему CI красная?',{fetcher,token:'synthetic-key'});
 assert.equal(out.ok,undefined);
 assert.equal(out.reason,'OPENROUTER_REASONING_EXHAUSTED_VISIBLE_BUDGET');
});
test('multipart text-only completion accepted but reasoning never exported',async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({model:'openrouter/free',
  choices:[{finish_reason:'stop',message:{content:[{type:'text',text:'Ответ.'},{type:'reasoning',text:'secret model reasoning'}]}}],usage:{cost:0}})});
 const out=await inbox.askFree('Test?',{fetcher,token:'synthetic-key'});
 assert.equal(out.ok,true);
 assert.equal(out.text,'Ответ.');
});


test('public technical source command requires real owner, validation and explicit public consent',()=>{
 const task={task_id:'commander_public_source_20261107',target_base:'codex/bootstrap-books',
  expected_base_sha:'a'.repeat(40),path:'components/example.js',title:'Fix verified UI behavior',
  mode:'literal',find:'oldLabel',replace:'newLabel',public_technical_only:true};
 const valid=inbox.command(cmd(101,'!pm source '+JSON.stringify(task)));
 assert.equal(valid.kind,'source');
 assert.equal(valid.task.path,'components/example.js');
 assert.equal(inbox.command({...cmd(102,'!pm source '+JSON.stringify(task)),user:{login:'intruder',type:'User'}}),null);
 assert.equal(inbox.command(cmd(103,'!pm source '+JSON.stringify({...task,public_technical_only:false}))),null);
 assert.equal(inbox.command(cmd(104,'!pm source '+JSON.stringify({...task,path:'api/secrets.js'}))),null);
 assert.equal(inbox.command(cmd(105,'!pm source '+JSON.stringify({...task,replace:'github_pat_mockSecret12345678901234567890'}))),null);
});
test('public source dispatch calls existing worker once with owner token, accepts HTTP 204 only',async()=>{
 const task={task_id:'commander_public_source_20261107',target_base:'codex/bootstrap-books',
  expected_base_sha:'a'.repeat(40),path:'components/example.js',title:'Fix verified UI behavior',
  mode:'literal',find:'oldLabel',replace:'newLabel',public_technical_only:true};
 const calls=[];
 const gh={rest:{repos:{getBranch:async()=>({data:{commit:{sha:task.expected_base_sha}}})},
  git:{getRef:async()=>{const e=Error('missing');e.status=404;throw e;}}}};
 const out=await inbox.dispatchSource(gh,{task},{ownerToken:'test-placeholder-token',
  fetcher:async(url,req)=>{calls.push({url,req});return {status:204};}});
 assert.equal(out.dispatched,true);
 assert.equal(calls.length,1);
 assert.match(calls[0].url,/\/actions\/workflows\/hh-pr-repair-worker\.yml\/dispatches$/);
 const data=JSON.parse(calls[0].req.body);
 assert.equal(data.ref,'codex/bootstrap-books');
 assert.deepEqual(JSON.parse(data.inputs.commander_source_task),task);
 assert.match(inbox.resultBody({kind:'source',id:101,task},{dispatched:true},'https://example.test/run'),/NOT yet verified/);
 assert.doesNotMatch(inbox.resultBody({kind:'source',id:101,task},{dispatched:true},'https://example.test/run'),/LIVE_VERIFIED/);
});
test('source request without owner token or exact current base refuses dispatch',async()=>{
 const task={task_id:'commander_public_source_20261107',target_base:'codex/bootstrap-books',
  expected_base_sha:'a'.repeat(40),path:'components/example.js',title:'Fix verified UI behavior',
  mode:'literal',find:'oldLabel',replace:'newLabel',public_technical_only:true};
 let sent=0;
 const gh={rest:{repos:{getBranch:async()=>({data:{commit:{sha:'b'.repeat(40)}}})},
  git:{getRef:async()=>{throw Error('should not reach getRef');}}}};
 const fetcher=async()=>{sent++;return {status:204}};
 const none=await inbox.dispatchSource(gh,{task},{ownerToken:'',fetcher});
 assert.equal(none.reason,'OWNER_SOURCE_DISPATCH_TOKEN_NOT_CONFIGURED');
 const stale=await inbox.dispatchSource(gh,{task},{ownerToken:'placeholder',fetcher});
 assert.equal(stale.reason,'SOURCE_BASE_SHA_MOVED');
 assert.equal(sent,0);
});
test('unknown or nonzero provider billing is blocked and never reported as free',async()=>{
 const cases=[[{},'MODEL_BILLING_UNVERIFIED_HOLD'],[{cost:null},'MODEL_BILLING_UNVERIFIED_HOLD'],
  [{cost:'0'},'MODEL_BILLING_UNVERIFIED_HOLD'],[{cost:0.000001},'MODEL_REPORTED_NONZERO_COST_HOLD']];
 for(const [usage,reason] of cases){
  const fetcher=async()=>({ok:true,json:async()=>({model:'openrouter/free',usage,
   choices:[{finish_reason:'stop',message:{content:'Ответ.'}}]})});
  const out=await inbox.askFree('Проверка цены?',{fetcher,token:'synthetic-key'});
  assert.equal(out.ok,undefined);assert.equal(out.reason,reason);
 }
});
test('verified zero provider cost is included in owner-visible receipt and telemetry',async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({model:'nvidia/nemotron-3.5-super-vl:free',
  usage:{cost:0},choices:[{finish_reason:'stop',message:{content:'Проверка пройдена.'}}]})});
 const out=await inbox.askFree('Проверка цены?',{fetcher,token:'synthetic-key'});
 assert.equal(out.ok,true);assert.equal(out.cost,0);
 const body=inbox.resultBody({kind:'ask',id:777},{...out},'https://github.com/example/run/1');
 assert.match(body,/nvidia\/nemotron-3\.5-super-vl:free/);
 assert.match(body,/verified provider cost: \$0/);
});

test('owner issue-comment trigger processes only a fresh command on public Inbox #3890',async()=>{
 const ownerContext={...context,eventName:'issue_comment',payload:{
  issue:{number:3890,body:'<!-- HH_PM_PUBLIC_AGENT_INBOX_V1 -->'},
  comment:cmd(701,'!pm ask Сколько независимых фактов нужно для LIVE?')
 }};
 const fx=stub([ownerContext.payload.comment]);
 const out=await inbox.run({github:fx.github,context:ownerContext,fetcher:fx.fetcher,token:'mock-key'});
 assert.equal(out.status,'AI_REPLIED');
 assert.equal(out.commandId,701);
 assert.equal(fx.calls.filter(x=>x==='openrouter').length,1);
});
test('issue-comment trigger rejects pull requests, other issues, bots, other users and non-command comments',async()=>{
 const valid=cmd(702,'!pm ask Нужен короткий технический ответ?');
 const cases=[
  {...context,eventName:'issue_comment',payload:{issue:{number:7},comment:valid}},
  {...context,eventName:'issue_comment',payload:{issue:{number:3890,pull_request:{url:'https://api.github.com/pulls/3890'}},comment:valid}},
  {...context,eventName:'issue_comment',payload:{issue:{number:3890},comment:{...valid,user:bot}}},
  {...context,eventName:'issue_comment',payload:{issue:{number:3890},comment:{...valid,user:{login:'intruder',id:1,type:'User'}}}},
 ];
 for(const ctx of cases){
  const fx=stub([valid]);
  const out=await inbox.run({github:fx.github,context:ctx,fetcher:fx.fetcher,token:'mock-key'});
  assert.equal(out.status,'SKIPPED_UNTRUSTED_CONTEXT');
  assert.equal(fx.calls.length,0);
 }
 const noCommand={...context,eventName:'issue_comment',payload:{
  issue:{number:3890},comment:cmd(703,'Обычный комментарий без команды')
 }};
 const fx=stub([valid]);
 const out=await inbox.run({github:fx.github,context:noCommand,fetcher:fx.fetcher,token:'mock-key'});
 assert.equal(out.status,'NO_OWNER_COMMAND');
 assert.equal(fx.calls.length,0);
});
test('issue-comment trigger does not skip FIFO when an earlier owner command is pending',async()=>{
 const older=cmd(704,'!pm ask Старый ожидающий запрос?');
 const submitted=cmd(705,'!pm ask Новый запрос?');
 const ctx={...context,eventName:'issue_comment',payload:{issue:{number:3890},comment:submitted}};
 const fx=stub([older,submitted]);
 const out=await inbox.run({github:fx.github,context:ctx,fetcher:fx.fetcher,token:'mock-key'});
 assert.equal(out.status,'OLDER_COMMAND_PENDING');
 assert.equal(fx.calls.length,0);
 assert.equal(fx.sent.length,0);
});
