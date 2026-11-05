'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const task=require('../scripts/ci-pr-task-state.cjs');
const worker=require('../scripts/ci-pr-repair-worker.cjs');
const {planCandidates}=require('../scripts/ci-pr-queue-dispatcher.cjs');
const {WORKFLOWS,admission,computeCapacity}=require('../scripts/ci-pr-capacity.cjs');
const {held}=require('../scripts/ci-pr-native-merge-policy.cjs');
const HEAD='a'.repeat(40),OLD='b'.repeat(40),NOW=Date.parse('2026-11-04T20:40:00Z');
function pr(number,extra={}){
 return {number,state:'open',draft:false,title:'feat(reiki): legacy restore',
  user:{login:'andylitvinov-design'},base:{ref:'codex/public-book-library'},
  head:{ref:'legacy-'+number,sha:HEAD,repo:{full_name:'andylitvinov-design/books'}},
  mergeable:false,mergeable_state:'dirty',
  labels:[{name:'hh:repair-manual'},{name:'hh:conflict-repair-needed'}],...extra};
}
test('manual PR is read-only eligible but NEVER auto-source eligible',()=>{
 const old=pr(204);
 assert.equal(task.validPR(old),false);
 assert.equal(task.validLegacyPrep(old),true);
 assert.equal(worker.eligible(old,'andylitvinov-design/books'),false);
 assert.equal(worker.legacyPrepEligible(old,'andylitvinov-design/books'),true);
 assert.equal(task.laneOf(old),'legacy');
 assert.equal(task.taskFor(old,{tier:'P4'}).next_action,'LEGACY_CLOUD_PREFLIGHT');
 assert.equal(held(old),'hh:repair-manual');
});
test('Draft/explicit hold/foreign source prevent both manual prep and source',()=>{
 for(const extra of [{draft:true},
   {labels:[{name:'hh:repair-manual'},{name:'hh:hold'}]},
   {head:{ref:'legacy',sha:HEAD,repo:{full_name:'other/repo'}}}]){
  const x=pr(204,extra);
  assert.equal(task.validLegacyPrep(x),false);
  assert.equal(task.laneOf(x),null);
 }
});
test('stable old candidate survives arbitrary delayed cron ticks and rotates hourly',()=>{
 const old=Array.from({length:12},(_,i)=>pr(i+204));
 const at=planCandidates(old,NOW).filter(x=>x.lane==='legacy');
 const late=planCandidates(old,NOW+600000).filter(x=>x.lane==='legacy');
 const next=planCandidates(old,NOW+1200000).filter(x=>x.lane==='legacy');
 assert.equal(at.length,4);
 assert.equal(late.length,4,'late :50 tick preserves the same bounded pool');
 assert.deepEqual(late.map(x=>x.pr_number),at.map(x=>x.pr_number),
  'a repeated 10-minute tick in one hour probes the same signed tasks');
 assert.equal(next.length,4);
 assert.notDeepEqual(next.map(x=>x.pr_number),at.map(x=>x.pr_number),
  'next UTC hour rotates to avoid starvation');
 const receipt=task.taskFor(old[0],{tier:'P4',direction:'academy-courses'});
 assert.equal(task.reservationStatus(receipt,
  [{body:task.commentBody({...receipt,state:'PREPARED'})}],NOW),
  'ALREADY_HANDLED','terminal receipt prevents redundant source preparation');
 assert.equal(WORKFLOWS.legacy,WORKFLOWS.repair);
 const cap=computeCapacity([],[],[]);
 assert.equal(admission('legacy',cap),'ADMIT');
 cap.activeWorker[WORKFLOWS.legacy]=1;
 assert.equal(admission('legacy',cap),'ADMIT',
  'one ordinary Repair Worker cannot block the existing second free slot');
 cap.activeWorker[WORKFLOWS.legacy]=2;
 assert.equal(admission('legacy',cap),'WORKER_BUSY',
  'the existing two-worker hard cap remains unchanged');
});
test('no manual source retry without real bot history, clean HEAD and non-sensitive paths',()=>{
 const dirty=pr(204,{labels:[{name:'hh:repair-manual'},{name:'hh:repair-needed'}]});
 assert.equal(worker.trustedLegacySourceRetry(dirty,[],['components/reiki-hero.jsx']),false);
 const clean={...dirty,mergeable:true,mergeable_state:'clean'};
 assert.equal(worker.trustedLegacySourceRetry(clean,[],['components/reiki-hero.jsx']),false);
 assert.equal(worker.trustedLegacySourceRetry(clean,[],['components/auth/private.ts']),false);
 const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'}};
 const prior={...bot,body:'<!-- HH_PR_TASK_V1 -->\n```json\n'+
  JSON.stringify({schema:'HH_PR_TASK_V1',task_key:'c'.repeat(32),
   head_sha:OLD,state:'MANUAL',lane:'repair'})+'\n```'};
 const source={...bot,body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+
  HEAD+' -->\nFailed jobs: core-lint-types-build.\n'};
 assert.equal(worker.trustedLegacySourceRetry(clean,[prior,source],
  ['components/reiki-hero.jsx']),true,
  'a verified old worker MANUAL, new Core source failure and clean safe HEAD can repair');
 assert.equal(worker.trustedLegacySourceRetry(clean,[prior,source],
  ['components/auth/private.ts']),false,'sensitive files always stop');
 assert.equal(worker.trustedLegacySourceRetry(dirty,[prior,source],
  ['components/reiki-hero.jsx']),false,'dirty conflicts never get automatic source repair');
 assert.equal(worker.trustedLegacySourceRetry({...clean,labels:[
  ...clean.labels,{name:'hh:release-gate-review'}]},[prior,source],
  ['components/reiki-hero.jsx']),false,'independent release hold cannot be bypassed');
 assert.equal(worker.trustedLegacySourceRetry(clean,[{...prior,user:{login:'forged'}},source],
  ['components/reiki-hero.jsx']),false,'untrusted old receipt cannot authorize new source');
});
test('cloud worker records PREPARED without demanding a fake source SHA',()=>{
 assert.equal(worker.claimedRepairMissingSourceProof({
  state:'PREPARED',claim_status:'claimed',source_published:false}),false);
 assert.equal(worker.claimedRepairMissingSourceProof({
  state:'FAILED',claim_status:'claimed',source_published:false}),true);
 const yml=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.match(yml,/needs.claim.outputs.strategy == 'legacy'/);
 assert.match(yml,/HH_LEGACY_CLOUD_PREFLIGHT_V1/);
 assert.match(yml,/name: hh-legacy-preflight/);
 assert.match(yml,/needs.claim.outputs.strategy == 'legacy'/);
 assert.match(yml,/needs.fix.result == 'success'/);
 assert.match(yml,/runs-on: ubuntu-24.04/);
 assert.doesNotMatch(yml,/runs-on: (?:self-hosted|ubuntu-latest-large)/);
});

// Regression from actual #2467 / Actions run 41972035311: claim-stage
// finalization used to write FAILED/FIX_JOB_SKIPPED while legacy fix was
// still running. Only the post-fix finalizer is allowed to write PREPARED.
test('legacy cloud preflight is finalized after fix; never early FAILED',async()=>{
 const yaml=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const claim=yaml.split('  claim:\n')[1].split('  fix:\n')[0];
 const finish=yaml.split('  finalize:\n')[1];
 assert.match(claim,/steps.select.outputs.strategy != 'legacy'/);
 assert.match(finish,/needs.claim.outputs.strategy == 'legacy'/);
 assert.match(finish,/needs.claim.result == 'success'/);
 assert.doesNotMatch(finish,/needs.claim.outputs.strategy == 'legacy' &&\s*needs.fix.result == 'success'/);
 const comments=[],changes=[];
 const github={rest:{
  pulls:{get:async()=>({data:pr(2467)})},
  issues:{
   listComments:async()=>({data:[]}),
   createComment:async({body})=>{comments.push(body);return {data:{id:1}};},
   addLabels:async x=>changes.push(x),
   removeLabel:async x=>changes.push(x)
  },
  actions:{listJobsForWorkflowRun:async()=>({data:{jobs:[
   {name:'fix',conclusion:'success',steps:[{name:'Cloud-only legacy source comparison and focused test preflight',
    started_at:'2026-11-05T05:08:46.000Z',conclusion:'success'}]}
  ]}})}
 }};
 const core={info(){},warning(){},summary:{
  addHeading(){return this},addCodeBlock(){return this},async write(){}
 }};
 const result=await worker.finalize({github,core,
  context:{repo:{owner:'andylitvinov-design',repo:'books'},runId:41972035311,
   payload:{inputs:{}}},
  number:2467,expectedSha:HEAD,taskKey:'e'.repeat(32),
  claimStatus:'claimed',claimResult:'success',strategy:'legacy',
  fixResult:'success',candidateStatus:'prepared',
  candidateDetail:'SHALLOW_ANCESTRY_UNAVAILABLE',
  publishResult:'skipped'});
 assert.equal(result.state,'PREPARED');
 assert.equal(result.lane,'legacy');
 assert.equal(result.source_published,false);
 assert.equal(result.detail_code,'SHALLOW_ANCESTRY_UNAVAILABLE');
 assert.equal(comments.length,1);
 assert.match(comments[0],/"state":"PREPARED"/);
 assert.doesNotMatch(comments[0],/FIX_JOB_SKIPPED/);
 assert.deepEqual(changes,[],'manual and source labels are untouched');
});
