'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {MUTATION,validateInput,mutationInput,atomicGraphqlCommit}=
 require('../scripts/ci-pr-repair-graphql-writer.cjs');
const owner='andylitvinov-design',repo='books',branch='test/pr-repair-graphql-canary';
const expectedSha='a'.repeat(40),newSha='b'.repeat(40);
const files=[{path:'components/public-card.tsx',content:Buffer.from(
 'export const content = "verified";\n','utf8').toString('base64')}];
const valid={owner,repo,branch,expectedSha,files,number:4288,token:'synthetic-no-access-key'};
function successfulResponse(){return {
 ok:true,status:200,json:async()=>({data:{createCommitOnBranch:{
  commit:{oid:newSha},ref:{target:{oid:newSha}}}}})
};}
test('official atomic createCommitOnBranch uses the exact ref CAS and verified file bytes',async()=>{
 let calls=0,request;
 const fetchImpl=async(url,opts)=>{
   calls++;assert.equal(url,'https://api.github.com/graphql');
   assert.equal(opts.method,'POST');assert.equal(opts.redirect,'error');
   request=JSON.parse(opts.body);
   assert.equal(opts.headers.Authorization,'Bearer synthetic-no-access-key');
   return successfulResponse();
 };
 const result=await atomicGraphqlCommit({...valid,fetchImpl});
 assert.deepEqual(result,{sha:newSha,method:'GRAPHQL_ATOMIC_EXPECTED_HEAD_CAS',
   sourceWriteVerified:false});
 assert.equal(calls,1);
 assert.match(MUTATION,/CreateCommitOnBranchInput!/);
 assert.deepEqual(request.variables.input,{
   branch:{repositoryNameWithOwner:'andylitvinov-design/books',branchName:branch},
   expectedHeadOid:expectedSha,
   fileChanges:{additions:files.map(f=>({path:f.path,contents:f.content}))},
   message:{headline:'fix(ci): verified deterministic source repair for PR #4288'}
 });
 assert.doesNotMatch(JSON.stringify(request),/token|secret|github_pat/i);
});
test('rejected and malformed GraphQL results cannot manufacture a published child SHA',async()=>{
 const bad=[
  {ok:false,status:403},
  {ok:true,status:200,json:async()=>({errors:[{message:'denied'}]})},
  {ok:true,status:200,json:async()=>({data:{createCommitOnBranch:{
    commit:{oid:newSha},ref:{target:{oid:expectedSha}}}}})},
  {ok:true,status:200,json:async()=>({data:{createCommitOnBranch:{
    commit:{oid:expectedSha},ref:{target:{oid:expectedSha}}}}})},
  {ok:true,status:200,json:async()=>({data:{createCommitOnBranch:null}})},
  {ok:true,status:200,json:async()=>{throw Error('garbled')}}
 ];
 const codes=[
  /HH_REPAIR_GRAPHQL_HTTP_403/,
  /HH_REPAIR_GRAPHQL_MUTATION_DENIED_OR_UNVERIFIED/,
  /HH_REPAIR_GRAPHQL_NEW_HEAD_NOT_PROVEN/,
  /HH_REPAIR_GRAPHQL_NEW_HEAD_NOT_PROVEN/,
  /HH_REPAIR_GRAPHQL_NEW_HEAD_NOT_PROVEN/,
  /HH_REPAIR_GRAPHQL_MUTATION_RESULT_UNCONFIRMED/
 ];
 for(let i=0;i<bad.length;i++){
   let calls=0;
   await assert.rejects(()=>atomicGraphqlCommit({...valid,fetchImpl:async()=>{
     calls++;return bad[i]}}),codes[i]);
   assert.equal(calls,1,'never retry a possibly side-effecting mutation');
 }
 await assert.rejects(()=>atomicGraphqlCommit({...valid,fetchImpl:async()=>{
   throw Error('response lost after write')}}),/RESULT_UNCONFIRMED/);
});
test('GitHub mutation is rejected locally before sending unsafe file, target, or bytes',async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;return successfulResponse()};
 const invalid=[
  {...valid,expectedSha:'f'.repeat(39)},
  {...valid,branch:'codex/public-book-library'},
  {...valid,branch:'codex/bootstrap-books'},
  {...valid,branch:'a/../b'},
  {...valid,branch:'a//@{name}'},
  {...valid,owner:'someone-else'},
  {...valid,files:[{...files[0],path:'.github/workflows/main.yml'}]},
  {...valid,files:[{...files[0],path:'app/api/private/route.ts'}]},
  {...valid,files:[files[0],files[0]]},
  {...valid,files:[{...files[0],content:'$$INVALID'}]},
  {...valid,files:[{...files[0],content:Buffer.from([0]).toString('base64')}]},
  {...valid,files:Array.from({length:9},(_,i)=>({
    path:'lib/public-'+i+'.js',content:files[0].content}))},
  {...valid,number:0},
  {...valid,token:''}
 ];
 for(const x of invalid){
   assert.equal(validateInput(x),false);
   await assert.rejects(()=>atomicGraphqlCommit({...x,fetchImpl}),/INVALID_VERIFIED_SCOPE/);
 }
 assert.equal(calls,0,'reject before any credential-bound remote API call');
});
test('GraphQL CAS is reached only after first definite integration-denied Git blob',()=>{
 const workflow=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const trusted=workflow.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.match(trusted,/permissions:\n      contents: write/);
 assert.match(trusted,/for\(const \[index,file\] of files\.entries\(\)\)/);
 assert.match(trusted,/if\(index!==0\|\|mode!=='job'\|\|error\?\.status!==403/);
 assert.match(trusted,/error\?\.operation!=='CREATE_BLOB'/);
 assert.match(trusted,/error\?\.kind!=='INTEGRATION_PERMISSION_DENIED'/);
 assert.match(trusted,/error\?\.message!=='HH_REPAIR_GIT_DATA_CREATE_BLOB_HTTP_403'/);
 assert.doesNotMatch(trusted,/\['git_blob','git_tree','git_commit','git_ref'\]/);
 assert.match(trusted,/beforeCas\.object\?\.sha!==expectedSha/);
 assert.match(trusted,/atomicWriter\.atomicGraphqlCommit/);
 assert.match(trusted,/posted\.object\?\.sha!==atomic\.sha/);
 assert.match(trusted,/HH_REPAIR_REMOTE_REF VERIFIED/);
 assert.match(trusted,/failure\.kind=receipt\.kind/);
 assert.match(trusted,/force:false/);
 assert.match(trusted,/verify_next_ci/);
 for(const job of ['code_fix','code_verify']){
   const piece=workflow.split('\n  '+job+':\n')[1]?.split(/\n  [a-z_]+:\n/)[0];
   assert.ok(piece,'must retain isolated '+job+' job');
   assert.match(piece,/permissions:\n      contents: read/);
   assert.doesNotMatch(piece,/contents: write|HH_AUTOMERGE_TOKEN|HH_REPAIR_JOB_TOKEN/);
 }
 const publisher=fs.readFileSync('scripts/ci-pr-repair-worker.cjs','utf8');
 assert.match(publisher,/HH_REPAIR_PUBLISH_PARENT_UNVERIFIED/);
 assert.match(publisher,/HH_REPAIR_PUBLISH_REMOTE_REF_UNVERIFIED/);
});
