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
 assert.equal(at.length,1);
 assert.equal(late.length,1,'late :50 tick must still admit a candidate');
 assert.equal(late[0].pr_number,at[0].pr_number,
  'a second 10-minute tick of one hour reuses the exact same task');
 assert.equal(next.length,1);
 assert.notEqual(next[0].pr_number,at[0].pr_number,
  'next UTC hour rotates without waiting for :40');
 const receipt=task.taskFor(old[0],{tier:'P4',direction:'academy-courses'});
 assert.equal(task.reservationStatus(receipt,
  [{body:task.commentBody({...receipt,state:'PREPARED'})}],NOW),
  'ALREADY_HANDLED','terminal receipt prevents redundant source preparation');
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

test('legacy cloud preflight must not be finalized early on claim runner',()=>{
 const yaml=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const start=yaml.indexOf('      - name: Finalize no-fix task on claim runner');
 const end=yaml.indexOf('        uses: actions/github-script@v7',start);
 assert.ok(start>=0 && end>start,'claim terminal step must remain explicit');
 const guard=yaml.slice(start,end);
 assert.match(guard,/steps\.select\.outputs\.strategy != 'legacy'/,
  'legacy strategy must reach cloud preflight and finalizer before any terminal receipt');
 assert.match(yaml,/needs\.claim\.outputs\.strategy == 'legacy'/,
  'legacy fix job still runs with its existing no-credentials boundary');
});
