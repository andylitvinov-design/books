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
test('bounded old queue rotates once per hour rather than six times',()=>{
 const old=Array.from({length:12},(_,i)=>pr(i+204));
 const at=planCandidates(old,NOW);
 assert.equal(at.filter(x=>x.lane==='legacy').length,1);
 assert.equal(planCandidates(old,NOW+600000).filter(x=>x.lane==='legacy').length,0);
 assert.equal(WORKFLOWS.legacy,WORKFLOWS.repair);
 const cap=computeCapacity([],[],[]);
 assert.equal(admission('legacy',cap),'ADMIT');
 cap.activeWorker[WORKFLOWS.legacy]=1;
 assert.equal(admission('legacy',cap),'WORKER_BUSY');
});
test('no manual source retry without real bot history, clean HEAD and non-sensitive paths',()=>{
 const dirty=pr(204,{labels:[{name:'hh:repair-manual'},{name:'hh:repair-needed'}]});
 assert.equal(worker.trustedLegacySourceRetry(dirty,[],['components/reiki-hero.jsx']),false);
 const clean={...dirty,mergeable:true,mergeable_state:'clean'};
 assert.equal(worker.trustedLegacySourceRetry(clean,[],['components/reiki-hero.jsx']),false);
 assert.equal(worker.trustedLegacySourceRetry(clean,[],['components/auth/private.ts']),false);
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
