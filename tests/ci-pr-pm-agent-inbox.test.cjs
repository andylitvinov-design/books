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
