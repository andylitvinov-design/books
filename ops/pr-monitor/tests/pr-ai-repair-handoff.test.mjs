import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {checkPr,hasSignedFailedCore,command,preflight}=require('../pr-ai-repair-handoff.js');
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const SHA='a'.repeat(40);
const valid={
  number:3910,state:'open',draft:false,user:{login:'andylitvinov-design'},
  head:{sha:SHA,repo:{full_name:'andylitvinov-design/books'}},
  base:{ref:'codex/public-book-library'},mergeable:true,mergeable_state:'blocked',
  labels:[{name:'hh:repair-needed'}]
};
const proof={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+SHA+' -->\nFailed jobs: core-lint-types-build\n'};
const response=(obj,status=200)=>({ok:status===200,status,json:async()=>obj});

test('only exact current ready production PR with repair label can request owner handoff',()=>{
  assert.deepEqual(checkPr(valid,3910),{ok:true,number:3910,sha:SHA});
  const bad=[
    {...valid,state:'closed'}, {...valid,draft:true},
    {...valid,user:{login:'stranger'}},
    {...valid,head:{...valid.head,repo:{full_name:'stranger/books'}}},
    {...valid,head:{...valid.head,sha:'truncated'}},
    {...valid,base:{ref:'codex/bootstrap-books'}},
    {...valid,mergeable:null},{...valid,mergeable_state:'dirty'},
    {...valid,labels:[]},{...valid,labels:[...valid.labels,{name:'hh:hold'}]},
    {...valid,labels:[...valid.labels,{name:'hh:repair-manual'}]},
    {...valid,labels:[...valid.labels,{name:'hh:worker-claimed'}]},
    {...valid,labels:[...valid.labels,{name:'hh:blocked'}]}
  ];
  for(const item of bad)assert.equal(checkPr(item,3910).ok,false);
  assert.equal(checkPr(valid,'../3910').ok,false);
  assert.equal(checkPr(valid,3909).ok,false);
});
test('only signed trusted GitHub App exact-HEAD failed Core proof is sufficient',()=>{
  assert.equal(hasSignedFailedCore([proof],SHA),true);
  assert.equal(hasSignedFailedCore([proof],'b'.repeat(40)),false);
  assert.equal(hasSignedFailedCore([{...proof,user:{...proof.user,id:99}}],SHA),false);
  assert.equal(hasSignedFailedCore([{...proof,performed_via_github_app:{id:99,slug:'github-actions'}}],SHA),false);
  assert.equal(hasSignedFailedCore([{...proof,body:proof.body.replace('core-lint-types-build','README')}],SHA),false);
  assert.equal(hasSignedFailedCore([proof,...Array(99).fill(proof)],SHA),false);
  assert.equal(hasSignedFailedCore({},SHA),false);
});
test('public handoff command binds exact PR number and full HEAD SHA without extra data',()=>{
  assert.equal(command(3910,SHA),'!pm repair 3910 '+SHA);
  assert.throws(()=>command(0,SHA),/INVALID_PR_HEAD/);
  assert.throws(()=>command(3910,'short'),/INVALID_PR_HEAD/);
  assert.throws(()=>command('../3910',SHA),/INVALID_PR_HEAD/);
});
test('preflight reads two GitHub public endpoints only and never auto-dispatches',async()=>{
  const urls=[];const mock=async(url,opts)=>{
    urls.push({url,opts});return url.endsWith('/pulls/3910')?response(valid):response([proof]);
  };
  const out=await preflight(3910,mock);
  assert.equal(out.ok,true);
  assert.equal(out.command,'!pm repair 3910 '+SHA);
  assert.equal(out.modelPolicy.includes('North Mini Code'),true);
  assert.equal(urls.length,2);
  assert.equal(urls[0].url,'https://api.github.com/repos/andylitvinov-design/books/pulls/3910');
  assert.equal(urls[1].url,'https://api.github.com/repos/andylitvinov-design/books/issues/3910/comments?per_page=100&page=1');
  for(const call of urls){
    assert.equal(call.opts.method,'GET');
    assert.equal(call.opts.credentials,'omit');
    assert.equal(call.opts.headers.Authorization,undefined);
  }
  assert.match(out.inbox,/github.com\/andylitvinov-design\/books\/issues\/3890/);
});
test('stale, held, unsigned or quota-blocked preflight cannot prepare runnable command',async()=>{
  for(const item of [
    {...valid,head:{...valid.head,sha:'b'.repeat(40)}},
    {...valid,labels:[{name:'hh:hold'},{name:'hh:repair-needed'}]}
  ]){
    let calls=0;
    const fetcher=async()=>{calls++;return calls===1?response(item):response([proof]);};
    const result=await preflight(3910,fetcher);
    assert.equal(result.ok,false);
    assert.equal(result.command,undefined);
    assert.ok(calls<=2);
  }
  let missing=await preflight(3910,async url=>url.includes('/pulls/')?response(valid):response([]));
  assert.equal(missing.ok,false);
  await assert.rejects(preflight(3910,async()=>response({},403)),/Лимит GitHub API/);
  await assert.rejects(preflight(3910,async()=>{throw Error('network');}),/GitHub сейчас недоступен/);
});
test('mobile PR and task screens use the existing GitHub Inbox; no keys, POST, workflow dispatch or HTML injection',()=>{
  const html=read('project-management-public.html'),js=read('pr-ai-repair-handoff.js'),
    css=read('pr-ai-repair-handoff.css'),agents=read('commander-ui.js');
  assert.match(html,/pr-ai-repair-handoff\.js/);
  assert.match(html,/pr-ai-repair-handoff\.css/);
  assert.match(js,/pm-pr-inline/);
  assert.match(js,/hh-pt-pr-head/);
  assert.match(js,/MutationObserver/);
  assert.match(js,/window==='undefined'/);
  assert.match(js,/HH_PR_10MIN_SOURCE_REPAIR_V1/);
  assert.match(js,/GitHub Agent Inbox|GitHub Issue #3890/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/min-height:44px/);
  assert.match(agents,/AI PR Repair/);
  assert.doesNotMatch(js,/innerHTML|\bPOST\b|workflow_dispatch|Authorization\s*:|apiKey|service_role|setInterval/i);
  assert.doesNotMatch(js,/fetch\s*\(\s*['"]https:\/\/openrouter/i);
});
