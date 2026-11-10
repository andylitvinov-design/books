'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {OWNER_RATE_RESERVE,JOB_RATE_RESERVE,eligible,chooseRepairWriter}=
 require('../scripts/ci-pr-repair-credential-policy.cjs');
const valid=remaining=>({ok:true,canPush:true,remaining});
test('dedicated owner token preferred only when rate reserve permits',()=>{
 assert.equal(OWNER_RATE_RESERVE,100);assert.equal(JOB_RATE_RESERVE,24);
 assert.equal(chooseRepairWriter({owner:valid(100),job:valid(200)}),'owner');
 assert.equal(chooseRepairWriter({owner:valid(200)}),'owner');
});
test('low owner rate safely chooses scoped job credential',()=>{
 assert.equal(chooseRepairWriter({owner:valid(99),job:valid(24)}),'job');
 assert.equal(chooseRepairWriter({owner:valid(0),job:valid(1000)}),'job');
 assert.equal(chooseRepairWriter({owner:{ok:false,canPush:false,remaining:0},job:valid(800)}),'job');
 assert.equal(chooseRepairWriter({job:valid(1000)}),'job');
});
test('unknown or weak credentials fail closed before source mutation',()=>{
 for(const bad of [null,undefined,{}, {ok:false,canPush:true,remaining:1000},
 {ok:true,canPush:false,remaining:1000},{ok:true,canPush:true,remaining:null},
 {ok:true,canPush:true,remaining:NaN},{ok:true,canPush:true,remaining:-1},
 {ok:true,canPush:true,remaining:23.5},valid(23)]){
  assert.equal(eligible(bad,JOB_RATE_RESERVE),false);
  assert.throws(()=>chooseRepairWriter({owner:valid(99),job:bad}),
   /NO_VERIFIED_WRITER_CREDENTIAL_OR_API_RATE/);
 }
});
test('write scope is exclusively the trusted publisher and CI wake retained',()=>{
 const w=fs.readFileSync(path.join(__dirname,'../.github/workflows/hh-pr-repair-worker.yml'),'utf8');
 const chunk=(name,next)=>{
  const start=w.indexOf('\n  '+name+':\n');
  const end=next?w.indexOf('\n  '+next+':\n',start+1):w.length;
  assert.ok(start>=0&&end>start,name);return w.slice(start,end);
 };
 for(const [section,next] of [['claim','fix'],['fix','code_fix'],
   ['code_fix','code_verify'],['code_verify','publish']])
  assert.doesNotMatch(chunk(section,next),/^\s+contents: write\s*$/m);
 const publish=chunk('publish','finalize');
 assert.match(publish,/^\s+contents: write\s*$/m);
 assert.match(publish,/HH_REPAIR_JOB_TOKEN: \$\{\{ github\.token \}\}/);
 assert.match(publish,/HH_AUTOMERGE_TOKEN: \$\{\{ secrets\.HH_AUTOMERGE_TOKEN \}\}/);
 assert.match(publish,/chooseRepairWriter\(\{owner:ownerProbe,job:jobProbe\}\)/);
 assert.match(publish,/await worker\.publish\(\{github,core,context,/);
 assert.match(publish,/HH_REPAIR_REMOTE_REF VERIFIED/);
 assert.match(publish,/Verify and recover the next exact-HEAD Core CI wave/);
});
