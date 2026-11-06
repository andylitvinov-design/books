'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {handoff,parseWebhookConfig,handoffPrompt}=require('../scripts/ci-pr-manus-handoff.cjs');
const {commentBody}=require('../scripts/ci-pr-task-state.cjs');
const sha='a'.repeat(40),taskKey='b'.repeat(32),runId=1024;
const cfg={enabled:'true',creditsApproved:'true',
  url:'https://hooks.manus.im/abc',authHeader:'Authorization: Bearer secret'};
const owner='andylitvinov-design',repo='books';
const signed=body=>({body,user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'}});
function fixture({labels=['hh:repair-manual'],head=sha,files=['lib/a.ts'],
  comments,sendStatus=200}={}){
  const log={posts:[],sent:[],calls:0};
  const records=comments??[signed(commentBody({schema:'HH_PR_TASK_V1',
    state:'MANUAL',claim_status:'claimed',pr_number:7,head_sha:sha,
    task_key:taskKey,owner_run_id:String(runId),source_published:false}))];
  const github={rest:{pulls:{get:async()=>({data:{state:'open',draft:false,
    user:{login:owner},head:{sha:head,repo:{full_name:owner+'/'+repo}},
    base:{ref:'codex/public-book-library'},mergeable_state:'blocked',
    labels:labels.map(name=>({name}))}}),
    listFiles:async()=>({data:files.map(filename=>({filename,status:'modified'}))})},
    issues:{listComments:async()=>({data:records}),
    createComment:async x=>{log.posts.push(x.body)}}}};
  const core={info:()=>{},warning:()=>{}};
  const context={repo:{owner,repo},runId};
  const fetchImpl=async(url,opts)=>{log.calls++;log.sent.push({url,opts});
    return {ok:sendStatus===200,status:sendStatus};};
  const args={github,core,context,number:7,sha,taskKey,terminalState:'MANUAL',
    terminalReason:'FREE_AI_EXECUTOR_NOT_CONFIGURED',claimStatus:'claimed',
    fetchImpl,now:Date.parse('2026-11-06T00:00:00Z'),...cfg};
  return {args,log,records};
}
test('webhook requires explicit activation, approved credits, HTTPS trusted host, secure auth header',()=>{
  assert.equal(parseWebhookConfig({...cfg,creditsApproved:'false'}),null);
  assert.equal(parseWebhookConfig({...cfg,url:'https://evil.test/hook'}),null);
  assert.equal(parseWebhookConfig({...cfg,authHeader:'Cookie: xyz'}),null);
  assert.equal(parseWebhookConfig({...cfg,authHeader:'X-Manus-Key: token\nX-Bypass: yes'}),null);
  assert.equal(parseWebhookConfig(cfg).headerName,'Authorization');
});
test('disabled integration performs no GitHub reads or external requests',async()=>{
  const f=fixture();f.args.enabled='false';
  assert.equal((await handoff(f.args)).status,'DISABLED');
  assert.equal(f.log.calls,0);assert.equal(f.log.posts.length,0);
});
test('terminal result, signed exact head and owner gates launch once with private scoped payload',async()=>{
  const f=fixture();const r=await handoff(f.args);
  assert.equal(r.status,'DISPATCHED');assert.equal(f.log.calls,1);
  assert.equal(f.log.posts.length,2);
  assert.match(f.log.posts[0],/HH_MANUS_HANDOFF_V1/);
  const payload=JSON.parse(f.log.sent[0].opts.body);
  assert.equal(payload.expected_sha,sha);
  assert.equal(payload.pr_number,7);
  assert.equal(payload.source_files[0],'lib/a.ts');
  assert.match(payload.instruction,/No incremental pushes/);
  assert.equal(f.log.sent[0].opts.headers.Authorization,'Bearer secret');
  assert.ok(!JSON.stringify(payload).includes('Bearer secret'));
});
test('duplicate signed handoff marker prevents a second credit-consuming call',async()=>{
  const f=fixture();f.records.push(signed('<!-- HH_MANUS_HANDOFF_V1 '+sha+' -->'));
  const r=await handoff(f.args);
  assert.equal(r.reason,'ALREADY_HANDOFF_FOR_THIS_HEAD');assert.equal(f.log.calls,0);
});
test('stale HEAD, hold, unsafe path and unsigned outcome do not dispatch',async()=>{
  for(const opts of [{head:'c'.repeat(40)},
    {labels:['hh:repair-manual','hh:hold']},{files:['.github/workflows/pwn.yml']},
    {comments:[{body:commentBody({schema:'HH_PR_TASK_V1',state:'MANUAL',
      claim_status:'claimed',pr_number:7,head_sha:sha,task_key:taskKey,
      owner_run_id:String(runId),source_published:false})}]}]){
    const f=fixture(opts);const r=await handoff(f.args);
    assert.equal(r.status,'HOLD');assert.equal(f.log.calls,0);
  }
});
test('webhook 500 cannot trigger unsafe retry: marker remains and no second POST',async()=>{
  const f=fixture({sendStatus:500});const r=await handoff(f.args);
  assert.equal(r.status,'HOLD');assert.equal(f.log.calls,1);
  assert.equal(f.log.posts.length,1);
  assert.match(f.log.posts[0],/HH_MANUS_HANDOFF_V1/);
});
test('handoff prompt scopes Manus to one existing PR without merge bypass',()=>{
  const prompt=handoffPrompt({url:'https://github.com/andylitvinov-design/books/pull/7',
    sha,runUrl:'https://github.com/andylitvinov-design/books/actions/runs/1024',
    reason:'TEST_FAILURE',files:['lib/a.ts']});
  assert.match(prompt,/GLOBAL|pr-one-publish-standard/);
  assert.match(prompt,/Do not auto-merge/);
  assert.match(prompt,/Expected immutable HEAD/);
});
