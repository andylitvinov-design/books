'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {probeOwnerToken,safeBranch}=require('../scripts/ci-pr-owner-token-probe.cjs');
const SHA='a'.repeat(40),TREE='b'.repeat(40),TOKEN='fake-very-secret-value';
const base={state:'open',base:{ref:'codex/public-book-library'},
  head:{ref:'fix/test-2169',sha:SHA,repo:{full_name:'andylitvinov-design/books'}}};
function fixture({status={},pr=base,throwAt='',owner='andylitvinov-design'}={}){
  const calls=[],reported=[];
  const github={rest:{pulls:{get:async()=>({data:pr})}}};
  const fetcher=async(url,opts)=>{
    assert.ok(['GET','POST'].includes(opts.method));
    if(opts.method==='POST'){
      assert.ok(url.endsWith('/git/blobs'));
      assert.deepEqual(JSON.parse(opts.body),{content:'HH_OWNER_TOKEN_WRITE_PROBE_V1\n',encoding:'utf-8'});
      calls.push('GIT_BLOB_WRITE');
      return {status:status.GIT_BLOB_WRITE??201,json:async()=>({sha:TREE})};
    }
    assert.equal(opts.headers.Authorization,'Bearer '+TOKEN);
    assert.ok(url.startsWith('https://api.github.com/'));
    const stage=url.endsWith('/user')?'TOKEN_OWNER':url.endsWith('/books')?'REPOSITORY_METADATA':
      url.includes('/git/ref/heads/')?'SOURCE_REF_READ':'SOURCE_COMMIT_READ';
    calls.push(stage);
    if(stage===throwAt)throw Error('fake network error containing '+TOKEN);
    return {status:status[stage]??200,json:async()=>{
      if(stage==='TOKEN_OWNER')return {login:owner};
      if(stage==='REPOSITORY_METADATA')return {full_name:'andylitvinov-design/books'};
      if(stage==='SOURCE_REF_READ')return {ref:'refs/heads/'+pr.head.ref,object:{sha:pr.head.sha}};
      return {tree:{sha:TREE}};
    }};
  };
  const run=(writeProbe=false)=>probeOwnerToken({github,fetcher,ownerToken:TOKEN,prNumber:2169,writeProbe,
    report:x=>reported.push(x)});
  return {run,calls,reported};
}
test('no writes; exact-owner and exact-head read-only sequence',async()=>{
  const f=fixture();const r=await f.run();
  assert.equal(r.status,'READ_OK_WRITE_UNVERIFIED');
  assert.deepEqual(f.calls,['TOKEN_OWNER','REPOSITORY_METADATA','SOURCE_REF_READ','SOURCE_COMMIT_READ']);
  assert.equal(r.sourceChanged,false);
  assert.equal(r.writePermissionVerified,false);
  assert.ok(!JSON.stringify(r).includes(TOKEN));
  assert.ok(!JSON.stringify(f.reported).includes(TOKEN));
});
test('HTTP 403 at authenticated user identifies credential or identity blocker without ref reads',async()=>{
  const f=fixture({status:{TOKEN_OWNER:403}});const r=await f.run();
  assert.equal(r.status,'TOKEN_OWNER_UNVERIFIED');
  assert.deepEqual(f.calls,['TOKEN_OWNER']);
  assert.equal(r.stages[0].http_status,403);
});
test('HTTP 403 at ref is distinguished from failure at commit',async()=>{
  const f=fixture({status:{SOURCE_REF_READ:403}});const r=await f.run();
  assert.equal(r.status,'SOURCE_REF_UNVERIFIED');
  assert.equal(r.stages.at(-1).http_status,403);
  const g=fixture({status:{SOURCE_COMMIT_READ:403}});const s=await g.run();
  assert.equal(s.status,'SOURCE_COMMIT_UNVERIFIED');
  assert.equal(s.stages.at(-1).http_status,403);
});
test('wrong token owner fails closed even if repository is public',async()=>{
  const f=fixture({owner:'another-account'});const r=await f.run();
  assert.equal(r.status,'TOKEN_OWNER_UNVERIFIED');
  assert.deepEqual(f.calls,['TOKEN_OWNER']);
});
test('token absent, stale or invalid PR cannot authorize any request',async()=>{
  const r=await probeOwnerToken({github:{rest:{pulls:{get:async()=>({data:base})}}},ownerToken:''});
  assert.equal(r.status,'SECRET_MISSING');
  const g=fixture({pr:{...base,head:{...base.head,sha:'not-a-sha'}}});
  assert.equal((await g.run()).status,'PR_SCOPE_OR_HEAD_UNVERIFIED');
  assert.equal(g.calls.length,0);
});
test('network exceptions have no token or raw response leakage',async()=>{
  const f=fixture({throwAt:'SOURCE_REF_READ'});const r=await f.run();
  assert.equal(r.status,'SOURCE_REF_UNVERIFIED');
  assert.equal(r.stages.at(-1).result,'NETWORK_ERROR');
  assert.ok(!JSON.stringify(r).includes(TOKEN));
});
test('rejects unsafe branch refs',()=>{
  for(const name of ['../oops','a//b','a@{b}','/a','a/','a'.repeat(161),''])
    assert.equal(safeBranch(name),false);
  assert.equal(safeBranch('fix/coaching-intake-crm-one-submit-20261026'),true);
});
test('CI worker offers dedicated read-only probe without new write token or job',()=>{
  const y=fs.readFileSync('.github/workflows/hh-pr-ci-worker.yml','utf8');
  assert.match(y,/      token_probe:/);
  assert.match(y,/HH_OWNER_TOKEN_PROBE /);
  assert.match(y,/READ_OK_WRITE_UNVERIFIED/);
  assert.match(y,/context\.eventName==='push'/);
});

test('scoped blob write succeeds without modifying branch or creating a commit',async()=>{
  const f=fixture();const r=await f.run(true);
  assert.equal(r.status,'GIT_OBJECT_WRITE_OK_REF_UNVERIFIED');
  assert.equal(r.writePermissionVerified,false);
  assert.equal(r.sourceChanged,false);
  assert.equal(r.stages.at(-1).http_status,201);
  assert.equal(f.calls.at(-1),'GIT_BLOB_WRITE');
  assert.ok(!JSON.stringify(r).includes(TOKEN));
});
test('HTTP 403 on minimal blob write is diagnosed without any ref mutation',async()=>{
  const f=fixture({status:{GIT_BLOB_WRITE:403}});const r=await f.run(true);
  assert.equal(r.status,'GIT_BLOB_WRITE_DENIED');
  assert.equal(r.stages.at(-1).http_status,403);
  assert.equal(r.sourceChanged,false);
  assert.ok(!JSON.stringify(f.reported).includes(TOKEN));
});
