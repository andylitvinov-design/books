'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const m=require('../scripts/ci-pr-commander-source-task.cjs');
const base='a'.repeat(40), blob='b'.repeat(40), tree='c'.repeat(40), commit='d'.repeat(40);
const task={task_id:'confirmed_task_1234',target_base:'codex/bootstrap-books',
 expected_base_sha:base,path:'components/verify-example.js',mode:'literal',
 title:'Fix verified example logic',find:'return false;',replace:'return true;'};
const context={eventName:'workflow_dispatch',actor:'andylitvinov-design',
 repo:{owner:'andylitvinov-design',repo:'books'},ref:'refs/heads/codex/bootstrap-books'};
function gh(){const calls=[];const github={rest:{repos:{
 getBranch:async()=>({data:{commit:{sha:base}}}),
 getContent:async()=>({data:{type:'file',encoding:'base64',sha:blob,
   content:Buffer.from('function ok(){ return false; }').toString('base64')}})
 },git:{
 getRef:async()=>{const e=new Error('Not Found');e.status=404;throw e},
 getCommit:async()=>({data:{tree:{sha:tree}}}),
 createBlob:async x=>{calls.push(['blob',x]);return{data:{sha:blob}}},
 createTree:async x=>{calls.push(['tree',x]);return{data:{sha:tree}}},
 createCommit:async x=>{calls.push(['commit',x]);return{data:{sha:commit}}},
 createRef:async x=>{calls.push(['ref',x]);return{data:{}}}
 },pulls:{create:async x=>{calls.push(['pr',x]);return {data:{number:4001,html_url:'https://github.com/example/pull/4001'}};}}}};return {github,calls};}
test('reject unsafe file, sensitive path, stale/unknown base and missing task identity',()=>{
 for(const mutation of [{path:'.github/workflows/ci.yml'},
 {path:'app/api/admin/index.ts'},{path:'../../etc/passwd'},
 {expected_base_sha:'abc'},{target_base:'main'},{task_id:'xx'}]){
  assert.throws(()=>m.parseTask(JSON.stringify({...task,...mutation})),/REJECTED/);
 }
});
test('exact unique replacement only, no new files or no-op',()=>{
 assert.equal(m.literalChange('let a=1;','a=1','a=2'),'let a=2;');
 assert.throws(()=>m.literalChange('x x','x','z'),/NOT_UNIQUE/);
 assert.throws(()=>m.literalChange('abc','zzz','hello'),/NOT_UNIQUE/);
 assert.throws(()=>m.literalChange('abc','a','a'),/INVALID/);
});
test('syntax checks reject broken JS before any GitHub ref write',()=>{
 assert.equal(m.checkCandidateSyntax('components/verify-example.js','export const ok=true;'),'SYNTAX_OK');
 assert.equal(m.checkCandidateSyntax('components/verify-example.ts','const ok: boolean=true;'),'DEFERRED_TO_PROTECTED_CI');
 assert.throws(()=>m.checkCandidateSyntax('components/verify-example.js','function(){'),/SYNTAX_RED/);
});
test('free AI must return a strictly shaped literal proposal',()=>{
 assert.deepEqual(m.parseAiReply('{"find":"a","replace":"b"}'),{find:'a',replace:'b'});
 assert.throws(()=>m.parseAiReply('```json\n{}\n```'),/NOT_JSON/);
 assert.throws(()=>m.parseAiReply('{"find":"a","replace":"b","path":".github"}'),/SHAPE/);
});
test('owner/workflow are mandatory; no untrusted dispatch',()=>{
 assert.doesNotThrow(()=>m.assertOwner(context));
 assert.throws(()=>m.assertOwner({...context,actor:'collaborator'}),/UNTRUSTED/);
 assert.throws(()=>m.assertOwner({...context,eventName:'pull_request_target'}),/UNTRUSTED/);
});
test('prepare then publish produces exactly one protected draft PR and one source commit',async()=>{
 let data;const {github,calls}=gh();
 const plan=await m.prepare({github,context,raw:JSON.stringify(task),
  write:(name,value)=>{assert.equal(name,m.FILE);data=value}});
 assert.equal(plan.path,task.path);
 const published=await m.publish({github,context,raw:JSON.stringify(task),read:()=>data});
 assert.equal(published.pr_number,4001);
 assert.deepEqual(calls.map(x=>x[0]),['blob','tree','commit','ref','pr']);
 assert.equal(calls[1][1].tree[0].path,task.path);
 assert.deepEqual(calls[2][1].parents,[base]);
 assert.equal(calls[4][1].draft,true);
 assert.equal(calls[4][1].base,task.target_base);
});
test('stale base and branch collision fail closed without publication',async()=>{
 const {github,calls}=gh();
 github.rest.repos.getBranch=async()=>({data:{commit:{sha:'e'.repeat(40)}}});
 await assert.rejects(m.prepare({github,context,raw:JSON.stringify(task),write:()=>{}}),/BASE_MOVED/);
 assert.equal(calls.length,0);
 const h=gh();h.github.rest.git.getRef=async()=>({data:{ref:'refs/heads/existing'}});
 const candidate=m.encodedCandidate(task,'function ok(){ return false; }','function ok(){ return true; }',blob);
 await assert.rejects(m.publish({github:h.github,context,raw:JSON.stringify(task),
   read:()=>JSON.stringify(candidate)}),/ALREADY_PUBLISHED/);
 assert.equal(h.calls.length,0);
});
test('tampered artifact blocked before GitHub code writes',async()=>{
 const {github,calls}=gh();
 const candidate=m.encodedCandidate(task,'function ok(){ return false; }','function ok(){ return true; }',blob);
 candidate.new_content_sha256='f'.repeat(64);
 await assert.rejects(m.publish({github,context,raw:JSON.stringify(task),
   read:()=>JSON.stringify(candidate)}),/UNVERIFIED/);
 assert.equal(calls.length,0);
});
