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
const PM_MODEL='cohere/north-mini-code:free';
const PM_OTHER_MODEL='nvidia/nemotron-3.5-lightning:free';
const catalog=(id=PM_MODEL)=>({ok:true,status:200,json:async()=>({data:[{
 id,pricing:{prompt:'0',completion:'0'},architecture:{
  input_modalities:['text'],output_modalities:['text']}
}]})});
const pmFetcher=(payload,{model=PM_MODEL,calls=[]}={})=>async(url,settings)=>{
 calls.push({url,settings});
 if(settings?.method==='GET'){
  assert.match(url,/\/api\/v1\/models\?endpoints=/);
  assert.equal(settings.headers.Authorization,undefined);
  return catalog(model);
 }
 assert.equal(settings.method,'POST');
 assert.equal(JSON.parse(settings.body).model,model);
 return {ok:true,status:200,json:async()=>({model,...payload})};
};
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
  if(settings.method==='GET')return catalog();
  calls.push('openrouter');
  assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(settings.headers.Authorization,'Bearer mock-key');
  const pay=JSON.parse(settings.body);
  assert.equal(pay.model,PM_MODEL);
  assert.equal(pay.provider.allow_fallbacks,false);
  assert.deepEqual(pay.provider.max_price,{prompt:0,completion:0});
  assert.equal(pay.provider.data_collection,'deny');
  assert.equal(pay.modalities,undefined);
  return {ok:true,json:async()=>({model:PM_MODEL,usage:{cost:0},choices:[{message:{content:'Связанный PR следует проверять на exact HEAD.'}}]})};
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
test('page-two signed Core failure may enter existing owner dispatcher',async()=>{
 const sha='a'.repeat(40),pr=3826,pages=[];
 const signed={user:bot,performed_via_github_app:app,
  body:['<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->',
   'Failed jobs: core-lint-types-build, hh-merge-check'].join(String.fromCharCode(10))};
 const gh={rest:{
  pulls:{get:async()=>({data:{number:pr,state:'open',draft:false,user:owner,
   head:{sha,repo:{full_name:'andylitvinov-design/books'}},
   base:{ref:'codex/public-book-library'},mergeable:true,mergeable_state:'clean',
   labels:[{name:'hh:repair-needed'}]}})},
  issues:{listComments:async({page,per_page})=>{
   assert.equal(per_page,100);pages.push(page);
   return {data:page===1?Array.from({length:100},(_,i)=>({id:i+1,user:owner,body:'untrusted'})):
    page===2?[signed]:[]};
  }}
 }};
 let dispatched=0;
 const out=await inbox.dispatchRepair(gh,{pr,sha},{dispatchDirect:async()=>{
  dispatched++;return {dispatched:true,reason:'OWNER_DIRECT_QUEUE_DISPATCH_ACCEPTED'};
 }});
 assert.equal(out.dispatched,true);
 assert.equal(dispatched,1);
 assert.deepEqual(pages,[1,2]);
});
test('forged proof and incomplete GitHub history block source dispatch',async()=>{
 const sha='a'.repeat(40),pr=3826;
 let called=0;
 const gh={rest:{
  pulls:{get:async()=>({data:{number:pr,state:'open',draft:false,user:owner,
   head:{sha,repo:{full_name:'andylitvinov-design/books'}},
   base:{ref:'codex/public-book-library'},mergeable:true,mergeable_state:'clean',
   labels:[{name:'hh:repair-needed'}]}})},
  issues:{listComments:async()=>({data:[{user:owner,body:[
   '<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->',
   'Failed jobs: core-lint-types-build'].join(String.fromCharCode(10))}]})}
 }};
 const options={dispatchDirect:async()=>{called++;return {dispatched:true};}};
 const fake=await inbox.dispatchRepair(gh,{pr,sha},options);
 assert.equal(fake.reason,'SIGNED_FAILED_CORE_PROOF_MISSING');
 gh.rest.issues.listComments=async()=>({data:Array.from({length:100},(_,i)=>({
  id:i,user:owner,body:'untrusted'}))});
 const incomplete=await inbox.dispatchRepair(gh,{pr,sha},options);
 assert.equal(incomplete.reason,'SOURCE_PROOF_INCOMPLETE');
 assert.equal(called,0);
});
test('only signed bot receipt confirms claimed request; daily cap counts claims only',()=>{
 const arr=[cmd(99,'!pm ask Need PR status?'),receipt(300,99,'CLAIMED'),receipt(301,99,'REPLIED')];
 assert.equal(inbox.pending(arr).status,'OK');
 assert.equal(inbox.pending(arr).next,null);
 assert.equal(inbox.pending(arr).used,1);
 assert.equal(inbox.trustedReceipt({...receipt(302,99,'CLAIMED'),user:{login:'attacker',type:'User'}}),null);
});

test('catalog-verified PM model makes one portable free chat inference with $0 cap',async()=>{
 const observed=[];let request=null;
 const original=pmFetcher({usage:{cost:0},
  choices:[{finish_reason:'stop',message:{content:'Готовый краткий ответ.'}}]},{calls:observed});
 const fetcher=async(url,opts)=>{
  if(opts.method==='POST')request=JSON.parse(opts.body);
  return original(url,opts);
 };
 const out=await inbox.askFree('Нужен план?',{fetcher,token:'synthetic-key'});
 assert.equal(out.ok,true);assert.equal(out.model,PM_MODEL);
 assert.equal(out.text,'Готовый краткий ответ.');
 assert.equal(observed.length,2);
 assert.equal(request.model,PM_MODEL);
 assert.equal(request.max_tokens,2200);
 assert.equal(request.stream,false);
 for(const field of ['reasoning','temperature','modalities','n','tools','models'])
  assert.equal(request[field],undefined);
 assert.equal(request.provider.allow_fallbacks,false);
 assert.equal(request.provider.data_collection,'deny');
 assert.deepEqual(request.provider.max_price,{prompt:0,completion:0});
});
test('slow free completion preserves one bounded HTTP body deadline without paid retry',async()=>{
 let posts=0,signal=null,reads=0;
 const fetcher=async(_url,options)=>{
  if(options.method==='GET'){reads++;return catalog();}
  posts++;signal=options.signal;
  return {ok:true,status:200,json:async()=>({model:PM_MODEL,usage:{cost:0},
   choices:[{finish_reason:'stop',message:{content:'PR — pull request.'}}]})};
 };
 const answer=await inbox.askFree('Что такое PR?',{fetcher,token:'test'});
 assert.equal(reads,1,'catalog is checked once without secrets');
 assert.equal(posts,1,'one real inference request, no paid retry');
 assert.equal(signal.aborted,false);
 assert.equal(answer.ok,true);assert.equal(answer.cost,0);
 assert.equal(answer.text,'PR — pull request.');
});
test('aborted body and free provider errors are truthful, never retried or exposed',async()=>{
 let posts=0;
 const runCase=async failure=>inbox.askFree('Тест?',{token:'test',
  fetcher:async(_url,options)=>{
   if(options.method==='GET')return catalog();
   posts++;
   return {ok:true,status:200,json:async()=>{if(failure==='aborted')
     throw Object.assign(Error('body aborted'),{name:'AbortError'});
    if(failure==='invalid')throw SyntaxError('bad provider body');
    return {error:{message:'secret upstream data'}};
   }};
  }});
 assert.equal((await runCase('aborted')).reason,'OPENROUTER_RESPONSE_TIMEOUT_UNVERIFIED');
 assert.equal((await runCase('invalid')).reason,'OPENROUTER_RESPONSE_INVALID');
 const rejected=await runCase('provider');
 assert.equal(rejected.reason,'OPENROUTER_PROVIDER_ERROR');
 assert.ok(!JSON.stringify(rejected).includes('secret upstream'));
 assert.equal(posts,3);
});
test('reasoning-only 200 response gets explicit bounded blocker, never false success',async()=>{
 const fetcher=pmFetcher({choices:[{finish_reason:'length',message:{content:''}}],
  usage:{cost:0,completion_tokens:1600,completion_tokens_details:{reasoning_tokens:1599}}});
 const out=await inbox.askFree('Почему CI красная?',{fetcher,token:'synthetic-key'});
 assert.equal(out.ok,undefined);
 assert.equal(out.reason,'OPENROUTER_REASONING_EXHAUSTED_VISIBLE_BUDGET');
});
test('multipart text-only completion accepted but reasoning never exported',async()=>{
 const fetcher=pmFetcher({
  choices:[{finish_reason:'stop',message:{content:[{type:'text',text:'Ответ.'},{type:'reasoning',text:'secret model reasoning'}]}}],usage:{cost:0}});
 const out=await inbox.askFree('Test?',{fetcher,token:'synthetic-key'});
 assert.equal(out.ok,true);
 assert.equal(out.text,'Ответ.');
});


test('invalid, priced and non-text catalog cannot start free AI inference',async()=>{
 for(const value of [
  {data:[]},
  {data:[{id:PM_MODEL,pricing:{prompt:'0.01',completion:'0'},
   architecture:{input_modalities:['text'],output_modalities:['text']}}]},
  {data:[{id:PM_MODEL,pricing:{prompt:'0',completion:'0'},
   architecture:{input_modalities:['image'],output_modalities:['text']}}]}
 ]){
  let calls=0;
  const result=await inbox.askFree('Публичный технический вопрос?',{token:'synthetic-key',
   fetcher:async()=>{calls++;return {ok:true,json:async()=>value};}});
  assert.equal(result.reason,'OPENROUTER_NO_VERIFIED_FREE_PM_MODEL');
  assert.equal(calls,1,'no inference or paid fallback after invalid catalog');
 }
});
test('unexpected model after one request fails closed without reply or retry',async()=>{
 let calls=0;
 const answer=await inbox.askFree('Проверка?',{token:'synthetic-key',
  fetcher:async(_url,opts)=>{calls++;return opts.method==='GET'?catalog():{
   ok:true,json:async()=>({model:'paid/other',usage:{cost:0},
    choices:[{message:{content:'not a trusted answer'}}]})};}});
 assert.equal(answer.reason,'MODEL_ROUTING_NOT_VERIFIED_FREE');
 assert.equal(calls,2);
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
  const fetcher=pmFetcher({usage,
   choices:[{finish_reason:'stop',message:{content:'Ответ.'}}]});
  const out=await inbox.askFree('Проверка цены?',{fetcher,token:'synthetic-key'});
  assert.equal(out.ok,undefined);assert.equal(out.reason,reason);
 }
});
test('verified zero provider cost is included in owner-visible receipt and telemetry',async()=>{
 const fetcher=pmFetcher({usage:{cost:0},
  choices:[{finish_reason:'stop',message:{content:'Проверка пройдена.'}}]},{model:PM_OTHER_MODEL});
 const out=await inbox.askFree('Проверка цены?',{fetcher,token:'synthetic-key'});
 assert.equal(out.ok,true);assert.equal(out.cost,0);
 const body=inbox.resultBody({kind:'ask',id:777},{...out},'https://github.com/example/run/1');
 assert.match(body,/nvidia\/nemotron-3\.5-lightning:free/);
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


test('owner can request PR LIVE with one number while nonowners cannot',()=>{
 const live=inbox.command(cmd(801,'!pm live #4770'));
 assert.equal(live.kind,'live');assert.equal(live.pr,4770);
 assert.equal(inbox.command(cmd(802,'!pm complete 4770')).kind,'live');
 assert.equal(inbox.command({...cmd(803,'!pm live 4770'),user:bot}),null);
 assert.equal(inbox.command(cmd(804,'!pm live 0')),null);
});
test('owner PM repair dispatch uses the owner credential, never bot GITHUB_TOKEN',async()=>{
 const head='a'.repeat(40),prNumber=3826,requestCalls=[];
 const pr={number:prNumber,state:'open',draft:false,user:owner,
  head:{sha:head,repo:{full_name:'andylitvinov-design/books'}},
  base:{ref:'codex/public-book-library'},mergeable:true,mergeable_state:'clean',
  labels:[{name:'hh:repair-needed'}]};
 const gh={rest:{
  pulls:{get:async()=>({data:pr})},
  issues:{listComments:async()=>({data:[{
   user:bot,performed_via_github_app:app,
   body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+head+' -->\nFailed jobs: core-lint-types-build'
  }]})},
  actions:{createWorkflowDispatch:async()=>{throw Error('UNSAFE_BOT_ACTOR_DISPATCH');}}
 }};
 const withoutOwner=await inbox.dispatchRepair(gh,{pr:prNumber,sha:head});
 assert.equal(withoutOwner.reason,'OWNER_REPAIR_DISPATCH_TOKEN_NOT_CONFIGURED');
 const ok=await inbox.dispatchRepair(gh,{pr:prNumber,sha:head},{
  ownerToken:'synthetic-owner-only-token',fetcher:async(url,req)=>{
   requestCalls.push({url,req});
   if(url==='https://api.github.com/user')
    return {status:200,json:async()=>({login:'andylitvinov-design',id:274943885,type:'User'})};
   return {status:204};
  }});
 assert.equal(ok.dispatched,true);
 assert.equal(requestCalls.length,2);
 assert.equal(requestCalls[0].url,'https://api.github.com/user');
 assert.match(requestCalls[1].url,/hh-pr-ten-minute-watchdog\.yml\/dispatches$/);
 assert.equal(requestCalls[1].req.headers.Authorization,'Bearer synthetic-owner-only-token');
 const payload=JSON.parse(requestCalls[1].req.body);
 assert.equal(payload.ref,'codex/bootstrap-books');
 assert.equal(payload.inputs.pm_pr_number,'3826');
 assert.equal(payload.inputs.pm_expected_sha,head);
 assert.match(payload.inputs.pm_request_id,/^[a-f0-9-]{36}$/);
 assert.equal(payload.inputs.dry_run,'false');
});
test('PR LIVE observes merge from GitHub once and does not relaunch green CI',async()=>{
 const head='b'.repeat(40),mergedSha='c'.repeat(40);
 const pr={number:4770,state:'open',draft:false,merged:false,
  base:{ref:'codex/public-book-library'},
  head:{sha:head,repo:{full_name:'andylitvinov-design/books'}},
  mergeable:true,labels:[]};
 const fx=stub([cmd(805,'!pm live 4770')],{pr});
 const first=await inbox.run({github:fx.github,context,ownerFetcher:async()=>{
  throw Error('UNEXPECTED_SOURCE_OR_CI_DISPATCH');
 }});
 assert.equal(first.status,'WATCHING');
 assert.equal(fx.sent.length,2);assert.match(fx.sent[1],/status=WATCHING/);
 assert.equal(fx.dispatches.length,0);
 const second=await inbox.run({github:fx.github,context});
 assert.equal(second.status,'WATCHING');assert.equal(fx.sent.length,2);
 pr.state='closed';pr.merged=true;pr.merged_at=at();pr.merge_commit_sha=mergedSha;
 const done=await inbox.run({github:fx.github,context});
 assert.equal(done.status,'COMPLETION_NOTICE_SENT');
 assert.match(fx.sent[2],/status=MERGED/);
 assert.match(fx.sent[2],new RegExp(mergedSha));
 assert.match(fx.sent[2],/Production LIVE not yet verified/);
 assert.equal((await inbox.run({github:fx.github,context})).status,'NO_PENDING');
 assert.equal(fx.sent.length,3);
});
test('closed unmerged PR is not reported as merged; missing merge SHA holds',async()=>{
 const head='d'.repeat(40);
 const pr={number:4771,state:'open',draft:false,merged:false,
  base:{ref:'codex/public-book-library'},
  head:{sha:head,repo:{full_name:'andylitvinov-design/books'}},
  mergeable:true,labels:[{name:'hh:hold'}]};
 const fx=stub([cmd(806,'!pm live 4771')],{pr});
 assert.equal((await inbox.run({github:fx.github,context})).status,'WATCHING');
 assert.match(fx.sent[1],/OWNER_HOLD_NOT_OVERRIDDEN/);
 pr.state='closed';pr.merged=true;pr.merged_at=at();pr.merge_commit_sha=null;
 assert.equal((await inbox.run({github:fx.github,context})).status,'WATCHING');
 assert.equal(fx.sent.length,2);
 pr.merged=false;
 assert.equal((await inbox.run({github:fx.github,context})).status,'COMPLETION_NOTICE_SENT');
 assert.match(fx.sent[2],/status=CLOSED_UNMERGED/);
 assert.doesNotMatch(fx.sent[2],/status=MERGED/);
});

test('authenticated GitHub owner repair dispatches in-process with no PAT or extra Watchdog',async()=>{
 const head='a'.repeat(40),prNumber=3826,targets=[];
 const pr={number:prNumber,state:'open',draft:false,user:owner,
  head:{sha:head,repo:{full_name:'andylitvinov-design/books'}},
  base:{ref:'codex/public-book-library'},mergeable:true,mergeable_state:'clean',
  labels:[{name:'hh:repair-needed'}]};
 const signed={user:bot,performed_via_github_app:app,
  body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+head+' -->\nFailed jobs: core-lint-types-build'};
 const gh={rest:{pulls:{get:async()=>({data:pr})},
  issues:{listComments:async()=>({data:[signed]})}}};
 const repair=await inbox.dispatchRepair(gh,{pr:prNumber,sha:head},{
  ownerToken:'',fetcher:async()=>{throw Error('PAT_OR_WATCHDOG_HOP_FORBIDDEN')},
  dispatchDirect:async target=>{
   targets.push(target);
   return {dispatched:true,reason:'OWNER_DIRECT_QUEUE_DISPATCH_ACCEPTED'};
  }});
 assert.equal(repair.dispatched,true);
 assert.deepEqual(targets,[{pr:prNumber,sha:head}]);
 assert.equal(repair.reason,'OWNER_DIRECT_QUEUE_DISPATCH_ACCEPTED');
 const held=await inbox.dispatchRepair(gh,{pr:prNumber,sha:head},{
  dispatchDirect:async()=>({dispatched:false,reason:'GHOST_WORKER_BUSY'})});
 assert.equal(held.dispatched,false);
 assert.equal(held.reason,'OWNER_REPAIR_DIRECT_GHOST_WORKER_BUSY');
 const noProof={rest:{pulls:gh.rest.pulls,issues:{listComments:async()=>({data:[]})}}};
 let unsafe=0;
 const refused=await inbox.dispatchRepair(noProof,{pr:prNumber,sha:head},{
  dispatchDirect:async()=>{unsafe++;return {dispatched:true,reason:'OWNER_DIRECT_QUEUE_DISPATCH_ACCEPTED'};}});
 assert.equal(refused.reason,'SIGNED_FAILED_CORE_PROOF_MISSING');
 assert.equal(unsafe,0);
});
test('owner inbox passes authenticated comment ID to same-run direct callback',async()=>{
 const head='a'.repeat(40),prNumber=3826,ownerCommentId=663111;
 const pr={number:prNumber,state:'open',draft:false,user:owner,
  head:{sha:head,repo:{full_name:'andylitvinov-design/books'}},
  base:{ref:'codex/public-book-library'},mergeable:true,mergeable_state:'clean',
  labels:[{name:'hh:repair-needed'}]};
 const fx=stub([cmd(ownerCommentId,'!pm repair 3826 '+head)],{pr});
 const original=fx.github.rest.issues.listComments;
 fx.github.rest.issues.listComments=async args=>args.issue_number===3826?
  {data:[{user:bot,performed_via_github_app:app,
   body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+head+' -->\nFailed jobs: core-lint-types-build'}]}:
  original(args);
 let directCalls=0;
 const r=await inbox.run({github:fx.github,context,fetcher:fx.fetcher,
  ownerToken:'',dispatchDirect:async detail=>{
   directCalls++;assert.deepEqual(detail,{pr:3826,sha:head,ownerCommentId});
   return {dispatched:true,reason:'OWNER_DIRECT_QUEUE_DISPATCH_ACCEPTED'};
  }});
 assert.equal(r.status,'DISPATCH_ACCEPTED_UNCORRELATED');
 assert.equal(directCalls,1);
 assert.equal(fx.dispatches.length,0,'no second Watchdog run');
 assert.match(fx.sent[1],/DISPATCH_ACCEPTED_UNCORRELATED/);
});
test('capacity-saturated owner repair is WATCHING until verified merge, not a terminal BLOCKED claim',async()=>{
 const head='a'.repeat(40),number=3826,commentId=663111;
 const pr={number,state:'open',draft:false,user:owner,
  head:{sha:head,repo:{full_name:'andylitvinov-design/books'}},
  base:{ref:'codex/public-book-library'},mergeable:true,mergeable_state:'blocked',
  labels:[{name:'hh:repair-needed'}]};
 const fx=stub([cmd(commentId,'!pm repair '+number+' '+head)],{pr});
 const oldList=fx.github.rest.issues.listComments;
 fx.github.rest.issues.listComments=async args=>args.issue_number===number?
  {data:[{user:bot,performed_via_github_app:app,
   body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+head+' -->\nFailed jobs: core-lint-types-build'}]}:
  oldList(args);
 let calls=0;
 const first=await inbox.run({github:fx.github,context,fetcher:fx.fetcher,
  dispatchDirect:async()=>{calls++;return {reason:'CAPACITY_UNVERIFIED'};}});
 assert.equal(first.status,'WATCHING');
 assert.equal(calls,1);
 assert.match(fx.sent[1],/status=WATCHING/);
 assert.match(fx.sent[1],/OWNER_REPAIR_DIRECT_CAPACITY_UNVERIFIED/);
 assert.doesNotMatch(fx.sent[1],/source commit VERIFIED|LIVE_VERIFIED/);
 const same=await inbox.run({github:fx.github,context,fetcher:fx.fetcher,
  dispatchDirect:async()=>{throw Error('DUPLICATE_WRITER');}});
 assert.equal(same.status,'WATCHING');
 assert.equal(calls,1,'existing dispatcher, not PM poller, owns retries');
 assert.equal(fx.sent.length,2);
 pr.state='closed';pr.merged=true;
 pr.merged_at='2026-11-17T03:00:00Z';pr.merge_commit_sha='b'.repeat(40);
 const completed=await inbox.run({github:fx.github,context,fetcher:fx.fetcher});
 assert.equal(completed.status,'COMPLETION_NOTICE_SENT');
 assert.match(fx.sent[2],/status=MERGED/);
 assert.match(fx.sent[2],/Production LIVE not yet verified/);
 assert.equal((await inbox.run({github:fx.github,context})).status,'NO_PENDING');
});
test('wrong actor and unverifiable owner token cannot dispatch a repair workflow',async()=>{
 const head='a'.repeat(40),prNumber=3826;
 const pr={number:prNumber,state:'open',draft:false,user:owner,
  head:{sha:head,repo:{full_name:'andylitvinov-design/books'}},
  base:{ref:'codex/public-book-library'},mergeable:true,mergeable_state:'clean',
  labels:[{name:'hh:repair-needed'}]};
 const gh={rest:{
  pulls:{get:async()=>({data:pr})},
  issues:{listComments:async()=>({data:[{
   user:bot,performed_via_github_app:app,
   body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+head+' -->\nFailed jobs: core-lint-types-build'
  }]})}
 }};
 let dispatched=0;
 const wrong=await inbox.dispatchRepair(gh,{pr:prNumber,sha:head},{
  ownerToken:'synthetic-wrong-actor',fetcher:async(url)=>{
   if(url.endsWith('/user'))return {status:200,json:async()=>({login:'github-actions[bot]',id:41898282,type:'Bot'})};
   dispatched++;return {status:204};
  }});
 assert.equal(wrong.reason,'OWNER_REPAIR_DISPATCH_ACTOR_MISMATCH');
 const unknown=await inbox.dispatchRepair(gh,{pr:prNumber,sha:head},{
  ownerToken:'synthetic-unverifiable',fetcher:async(url)=>{
   if(url.endsWith('/user'))return {status:403};
   dispatched++;return {status:204};
  }});
 assert.equal(unknown.reason,'OWNER_REPAIR_TOKEN_IDENTITY_UNVERIFIED');
 assert.equal(dispatched,0);
});


test('dispatchLive retains owner-authenticated dispatch acceptance for private queue',async()=>{
 const head='a'.repeat(40),prNumber=3826,requests=[];
 const pr={number:prNumber,state:'open',draft:false,user:owner,
  head:{sha:head,repo:{full_name:'andylitvinov-design/books'}},
  base:{ref:'codex/public-book-library'},mergeable:true,mergeable_state:'clean',
  labels:[{name:'hh:repair-needed'}]};
 const gh={rest:{pulls:{get:async()=>({data:pr})},issues:{listComments:async()=>({
  data:[{user:bot,performed_via_github_app:app,
   body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+head+' -->\nFailed jobs: core-lint-types-build'}]
 })}}};
 const result=await inbox.dispatchLive(gh,{pr:prNumber},{ownerToken:'synthetic-owner-only-token',
  fetcher:async(url,req)=>{
   requests.push(url);
   if(url==='https://api.github.com/user')
    return {status:200,json:async()=>({login:'andylitvinov-design',id:274943885,type:'User'})};
   assert.match(url,/hh-pr-ten-minute-watchdog\.yml\/dispatches$/);
   assert.equal(JSON.parse(req.body).inputs.pm_expected_sha,head);
   return {status:204};
  }});
 assert.equal(result.watching,true);
 assert.equal(result.dispatched,true);
 assert.equal(result.reason,'OWNER_DISPATCH_ACCEPTED_UNCORRELATED');
 assert.equal(requests.length,2);
});
test('dispatchLive preserves numeric HTTP denial and does not report acceptance',async()=>{
 const head='a'.repeat(40),prNumber=3826;
 const pr={number:prNumber,state:'open',draft:false,user:owner,
  head:{sha:head,repo:{full_name:'andylitvinov-design/books'}},
  base:{ref:'codex/public-book-library'},mergeable:true,mergeable_state:'clean',
  labels:[{name:'hh:repair-needed'}]};
 const gh={rest:{pulls:{get:async()=>({data:pr})},issues:{listComments:async()=>({
  data:[{user:bot,performed_via_github_app:app,
   body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+head+' -->\nFailed jobs: core-lint-types-build'}]
 })}}};
 const result=await inbox.dispatchLive(gh,{pr:prNumber},{ownerToken:'synthetic-owner-only-token',
  fetcher:async url=>url==='https://api.github.com/user'?
   {status:200,json:async()=>({login:'andylitvinov-design',id:274943885,type:'User'})}:
   {status:403}});
 assert.equal(result.watching,true);
 assert.equal(result.dispatched,false);
 assert.equal(result.reason,'OWNER_REPAIR_DISPATCH_HTTP_403');
});
