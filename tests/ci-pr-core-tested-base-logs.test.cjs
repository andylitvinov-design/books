'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseTestedBaseLog,recoverTestedBase}=require('../scripts/ci-pr-core-tested-base-logs.cjs');
const OLD='9e84af6e730328ab34099f97b98cb14211bc08af',HEAD='e'.repeat(40);
const logs='2026-11-10T23:19:45.0000000Z ##[group]Verify bounded shallow scope ancestry before PR routing\n'+
 '2026-11-10T23:19:47.4471074Z   HH_TESTED_BASE_VERIFIED: '+OLD+'\n'+
 '2026-11-10T23:19:48.3302013Z   HH_TESTED_BASE_VERIFIED: '+OLD+'\n';
function fixture(){
 return {owner:'andylitvinov-design',repo:'books',token:'not-a-real-token',
  pr:{number:4303,head:{ref:'codex/reasoning-mind-20261110',sha:HEAD}},
  run:{id:42922287638,name:'HH PR core release gate',
   event:'pull_request',status:'completed',conclusion:'success',
   path:'.github/workflows/hh-pr-core-release.yml',
   head_sha:HEAD,head_branch:'codex/reasoning-mind-20261110',
   check_suite_id:116243651946,
   repository:{full_name:'andylitvinov-design/books'},
   head_repository:{full_name:'andylitvinov-design/books'},pull_requests:[]},
  jobs:[{id:130199870316,run_id:42922287638,name:'core-lint-types-build',
   status:'completed',conclusion:'success',steps:[{
    name:'Verify bounded shallow scope ancestry before PR routing',
    status:'completed',conclusion:'success'}]}],
  rows:[{status:'M',filename:'lib/ai/reasoning-mind.ts'}],
  fetcher:async()=>({ok:true,headers:{get:()=>String(logs.length)},text:async()=>logs})};
}
test('trusts only the actual runner environment value, never an echoed command',()=>{
 assert.equal(parseTestedBaseLog(logs),OLD);
 assert.equal(parseTestedBaseLog('echo "HH_TESTED_BASE_VERIFIED='+OLD+'"'),null);
 assert.equal(parseTestedBaseLog(logs.replaceAll(OLD,'z'.repeat(40))),null);
 assert.equal(parseTestedBaseLog(logs+'2026-11-10T23:19:50.1234567Z   HH_TESTED_BASE_VERIFIED: '+'f'.repeat(40)+'\n'),null);
});
test('recovers #4303 exact tested base from real job-log contract with empty association',async()=>{
 let requests=0;
 const args=fixture(),orig=args.fetcher;
 args.fetcher=async(url,opts)=>{requests++;
  assert.equal(url,'https://api.github.com/repos/andylitvinov-design/books/actions/jobs/130199870316/logs');
  assert.equal(opts.redirect,'follow');
  return orig();
 };
 assert.equal(await recoverTestedBase(args),OLD);
 assert.equal(requests,1);
});
test('never trusts logs if PR modified workflow/action or ancestry step did not pass',async()=>{
 for(const path of ['.github/workflows/hh-pr-core-release.yml','.github/actions/release/action.yml','scripts/ci-pr-readiness.mjs']){
  const args=fixture();args.rows=[{status:'M',filename:path}];
  args.fetcher=async()=>{throw Error('unauthorized access')};
  assert.equal(await recoverTestedBase(args),null,path);
 }
 const args=fixture();
 args.jobs[0].steps[0].conclusion='failure';
 assert.equal(await recoverTestedBase(args),null);
});
test('fail closed on wrong source HEAD, workflow path, association, or ambiguous log',async()=>{
 for(const edit of [
  x=>{x.run.head_sha='f'.repeat(40);},
  x=>{x.run.path='.github/workflows/other.yml';},
  x=>{x.run.pull_requests=[{number:4303}];},
  x=>{x.jobs[0].run_id=7;},
  x=>{x.jobs[0].status='in_progress';},
  x=>{x.run.conclusion='failure';},
  x=>{x.fetcher=async()=>({ok:true,headers:{get:()=>String(4_000_000)},text:async()=>logs});}
 ]){
  const args=fixture();edit(args);assert.equal(await recoverTestedBase(args),null);
 }
});
