'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {MUTATION,verifiedAtomicCommitRequest,verifiedAtomicCommitResponse}=
 require('../scripts/ci-pr-repair-graphql-commit.cjs');
const sha='a'.repeat(40),next='b'.repeat(40);
const file={path:'components/acquisition-event-link.tsx',
 content:Buffer.from('export const safe = true;\n').toString('base64')};
const input={owner:'andylitvinov-design',repo:'books',
 branch:'test/pr-repair-scoped-actions-v10-20261110',
 expectedSha:sha,files:[file],number:4288,repairKind:'lint'};
test('atomic GraphQL request binds exact HEAD, file bytes, branch and verified commit ID',()=>{
 const req=verifiedAtomicCommitRequest(input);
 assert.equal(req.variables.input.expectedHeadOid,sha);
 assert.deepEqual(req.variables.input.branch,{
  repositoryNameWithOwner:'andylitvinov-design/books',branchName:input.branch});
 assert.deepEqual(req.variables.input.fileChanges,{additions:[{path:file.path,contents:file.content}]});
 assert.equal(req.variables.input.message.headline,
  'fix(ci): verified deterministic source repair for PR #4288');
 assert.equal(req.variables.input.clientMutationId,'hh-repair-4288-aaaaaaaaaaaa');
 assert.match(MUTATION,/CreateCommitOnBranchInput!/);
 assert.match(MUTATION,/createCommitOnBranch\(input: \$input\)/);
 assert.match(MUTATION,/commit \{ oid \}/);
 assert.match(MUTATION,/ref \{ target \{ oid \} \}/);
 assert.equal(req.variables.input.fileChanges.deletions,undefined);
});
test('publisher rejects foreign repository, base branch, bad ref, nonexistent or duplicate files',()=>{
 const bad=[
  {...input,owner:'attacker'},
  {...input,branch:'codex/bootstrap-books'},
  {...input,branch:'codex/public-book-library'},
  {...input,branch:'../main'},
  {...input,branch:'test/../../main'},
  {...input,expectedSha:'invalid'},
  {...input,number:0},
  {...input,repairKind:'unknown'},
  {...input,files:[]},
  {...input,files:Array(9).fill(file)},
 ];
 for(const item of bad)assert.throws(()=>verifiedAtomicCommitRequest(item),
  /INVALID_SOURCE_IDENTITY|INVALID_VERIFIED_FILE/);
 for(const f of [
  {...file,path:'.github/workflows/malicious.yml'},
  {...file,path:'tests/unsafe.test.mjs'},
  {...file,path:'../secret.ts'},
  {...file,content:'not-base64'},
  {...file,content:'x'.repeat(200001)}])
  assert.throws(()=>verifiedAtomicCommitRequest({...input,files:[f]}),
   /INVALID_VERIFIED_FILE/);
 assert.throws(()=>verifiedAtomicCommitRequest({...input,files:[file,file]}),
  /INVALID_VERIFIED_FILE/);
});
test('GraphQL CAS receipt requires authenticated new commit and matching updated Ref',()=>{
 const valid={data:{createCommitOnBranch:{commit:{oid:next},ref:{target:{oid:next}}}}};
 assert.deepEqual(verifiedAtomicCommitResponse(valid,sha),{sha:next});
 for(const body of [null,{}, {errors:[{message:'access denied'}]}, {data:null},
  {data:{createCommitOnBranch:null}},
  {data:{createCommitOnBranch:{commit:{oid:sha},ref:{target:{oid:sha}}}}},
  {data:{createCommitOnBranch:{commit:{oid:next},ref:{target:{oid:sha}}}}},
  {data:{createCommitOnBranch:{commit:{oid:'invalid'},ref:{target:{oid:next}}}}}])
   assert.throws(()=>verifiedAtomicCommitResponse(body,sha),
    /GRAPHQL_COMMIT_REJECTED|GRAPHQL_COMMIT_NOT_VERIFIED/);
});
test('trusted writer does not call the denied REST Git ref PATCH or bypass independent proof',()=>{
 const flow=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const publisher=flow.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.match(publisher,/permissions:\n      contents: write/);
 assert.match(publisher,/HH_REPAIR_JOB_TOKEN: \$\{\{ github\.token \}\}/);
 assert.match(publisher,/verifiedAtomicCommitRequest\(\{/);
 assert.match(publisher,/verifiedAtomicCommitResponse\(result,expectedSha\)/);
 assert.match(publisher,/current\.object\?\.sha!==expectedSha/);
 assert.match(fs.readFileSync('scripts/ci-pr-repair-graphql-commit.cjs','utf8'),
  /expectedHeadOid:expectedSha/);
 assert.match(publisher,/HH_REPAIR_REMOTE_REF_UPDATE_NOT_VERIFIED/);
 assert.match(publisher,/await worker\.publish\(\{github,core,context,/);
 assert.match(flow,/Independently verify exact SHA, direct tests, lint, TS and diff/);
 assert.match(flow,/Verify and recover the next exact-HEAD Core CI wave/);
 assert.doesNotMatch(publisher,/await call\('PATCH',base\+'\/git\/refs\/heads/);
});
