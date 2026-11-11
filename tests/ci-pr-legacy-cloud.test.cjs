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
  mergeable:null,mergeable_state:'unknown',
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
 // The additional rotating probes are read-only and cannot start legacy
 // workers: only the single hourly candidate has no probe-only flag.
 const atAll=planCandidates(old,NOW);
 const at=atAll.filter(x=>x.lane==='legacy'&&!x.manual_conflict_probe);
 const late=planCandidates(old,NOW+600000).filter(x=>x.lane==='legacy'&&!x.manual_conflict_probe);
 const next=planCandidates(old,NOW+1200000).filter(x=>x.lane==='legacy'&&!x.manual_conflict_probe);
 assert.equal(atAll.filter(x=>x.manual_conflict_probe).length,2,
  'two bounded read-only probes never become extra hourly preflight workers');
 assert.equal(at.length,1);
 assert.equal(late.length,1,'late :50 tick preserves the single signed candidate');
 assert.deepEqual(late.map(x=>x.pr_number),at.map(x=>x.pr_number),
  'repeated delayed ticks in the same UTC hour probe the same exact task');
 assert.equal(next.length,1);
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
 const dirty=pr(204,{mergeable:false,mergeable_state:'dirty',
  labels:[{name:'hh:repair-manual'},{name:'hh:repair-needed'}]});
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
  candidateSnapshot:'3,0,2,1,0,0',
  publishResult:'skipped'});
 assert.equal(result.state,'PREPARED');
 assert.equal(result.lane,'legacy');
 assert.equal(result.source_published,false);
 assert.equal(result.detail_code,'SHALLOW_ANCESTRY_UNAVAILABLE');
 assert.deepEqual(result.legacy_snapshot_summary?.counts,
  {identical:0,divergent:2,only_legacy:1,only_production:0,unknown:0});
 assert.equal(result.legacy_snapshot_summary?.merge_authorized,false);
 assert.equal(comments.length,1);
 assert.match(comments[0],/"legacy_snapshot_summary"/);
 assert.match(comments[0],/"state":"PREPARED"/);
 assert.doesNotMatch(comments[0],/FIX_JOB_SKIPPED/);
 assert.deepEqual(changes,[],'manual and source labels are untouched');
});


const {safePath:legacySnapshotPath,treeEntry:legacyTreeEntry,
  compareLegacySnapshot}=require('../scripts/ci-pr-legacy-snapshot.cjs');
const snapBlob=(p,sha,mode='100644')=>({status:0,
 stdout:mode+' blob '+sha+'\t'+p+'\0'});
test('shallow legacy snapshot: identical blobs are not merge authorization',()=>{
 const path='components/reiki-hero.tsx';
 const x=compareLegacySnapshot({files:[path],read:(ref,p)=>snapBlob(p,HEAD)});
 assert.equal(x.state,'ALL_PATHS_IDENTICAL_UNANCHORED');
 assert.deepEqual(x.counts,{identical:1,divergent:0,only_legacy:0,
  only_production:0,unknown:0});
 assert.equal(x.merge_authorized,false);assert.equal(x.source_write_authorized,false);
 assert.equal(x.ancestry_verified,false);
});
test('shallow legacy snapshot: changed/missing tracked paths require semantic review',()=>{
 const files=['components/a.tsx','lib/b.js'];
 const x=compareLegacySnapshot({files,read:(ref,p)=>p===files[0]?
  snapBlob(p,ref==='HEAD'?HEAD:OLD):
  ref==='HEAD'?snapBlob(p,HEAD):{status:0,stdout:''}});
 assert.equal(x.counts.divergent,1);
 assert.equal(x.counts.only_legacy,1);
 assert.equal(x.state,'PATHS_DIVERGED_REQUIRE_SEMANTIC_REVIEW');
});
test('shallow legacy snapshot: unsafe path, symlink and timeout fail closed',()=>{
 const path='components/a.tsx',bad='../unsafe.ts';
 const x=compareLegacySnapshot({files:[path,bad],read:(ref,p)=>
  snapBlob(p,HEAD,ref==='HEAD'?'120000':'100644')});
 assert.equal(x.counts.unknown,2);
 assert.equal(x.state,'INCOMPLETE_UNANCHORED_SNAPSHOT');
 assert.equal(legacySnapshotPath('app/[locale]/page.tsx'),true);
 assert.equal(legacySnapshotPath('lib/foo/../bar.js'),false);
 assert.equal(legacyTreeEntry({status:1,stdout:''},path).state,
  'UNVERIFIED_TREE_READ');
});
test('shallow legacy snapshot: empty on both sides is unknown',()=>{
 const r=compareLegacySnapshot({files:['lib/missing.js'],
  read:()=>({status:0,stdout:''})});
 assert.equal(r.state,'INCOMPLETE_UNANCHORED_SNAPSHOT');
 assert.equal(r.counts.unknown,1);
});
test('shallow legacy snapshot: bounded lookups and invalid duplicate source fail closed',()=>{
 let now=0;
 const r=compareLegacySnapshot({files:['lib/a.js'],now:()=>{now+=1000;return now;},
  budgetMs:1000,read:()=>snapBlob('lib/a.js',HEAD)});
 assert.equal(r.counts.unknown,1);
 assert.throws(()=>compareLegacySnapshot({files:['lib/a.js','lib/a.js'],
  read:()=>snapBlob('lib/a.js',HEAD)}),/INVALID/);
 const yml=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.match(yml,/compareLegacySnapshot\(\{files/);
 assert.match(yml,/'ls-tree','-z',ref/);
 assert.match(yml,/SHALLOW_ANCESTRY_UNAVAILABLE/);
});


test('legacy worker skips npm only when no safe focused tests exist',()=>{
 const yml=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const fix=yml.split('  fix:\n')[1]?.split('  code_fix:\n')[0]||'';
 assert.match(fix,/id: legacy_deps/);
 assert.match(fix,/HH_LEGACY_DEPENDENCY_SCOPE/);
 assert.ok(fix.includes('.hh-trusted/scripts/ci-pr-repair-free-agent.cjs'));
 const gating="if: steps.fresh_head.outputs.current == 'true' && (needs.claim.outputs.strategy != 'legacy' || steps.legacy_deps.outputs.needed == 'true')";
 assert.equal(fix.split(gating).length-1,2,
  'Node setup and npm ci must share the same fail-closed HEAD and dependency condition');
 assert.ok(fix.includes('if(allowlisted.length)'),
  'existing focused legacy tests must still run when allowed source exists');
 assert.match(fix,/npm ci --ignore-scripts --no-audit --no-fund/);
 const {safeSourcePath}=require('../scripts/ci-pr-repair-free-agent.cjs');
 assert.equal(['components/remote-support-enquiry-contact.tsx',
  'components/auth/private.tsx'].some(safeSourcePath),false);
 assert.equal(['components/reiki-hero.tsx',
  'scripts/verify-remote-inline-order-browser.mjs'].some(safeSourcePath),true);
});

test('trusted legacy snapshot summary is bounded and cannot authorize merge',()=>{
 const parse=worker.parseLegacySnapshotSummary;
 const good=parse('3,0,2,1,0,0');
 assert.equal(good.paths,3);
 assert.equal(good.counts.divergent,2);
 for(const key of ['ancestry_verified','source_write_authorized','merge_authorized'])
   assert.equal(good[key],false);
 for(const wrong of ['0,0,0,0,0,0','3,0,2,8,0,0','1,0,0,0,0,0',
   '3,0,2,1,0,0,0','3,0,02,1,0,0','3,0,2,1,0,0\\nleak',
   '9,0,0,0,0,9'])assert.equal(parse(wrong),null);
 const yml=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.ok(yml.includes('candidate_snapshot: ${{ steps.legacy_scan.outputs.candidate_snapshot }}'));
 assert.ok(yml.includes('HH_CANDIDATE_SNAPSHOT: ${{ needs.fix.outputs.candidate_snapshot }}'));
 assert.ok(yml.includes('candidateSnapshot:process.env.HH_CANDIDATE_SNAPSHOT'));
 assert.ok(yml.includes('summaryNumbers.slice(1).reduce'));
});

test('legacy verified merge base is evidence-only and requires protected exact SHA',()=>{
 const {verifiedLegacyMergeBase}=require('../scripts/ci-pr-legacy-snapshot.cjs');
 const prod={protected:true,commit:{sha:OLD}};
 const cmp={status:'diverged',base_commit:{sha:HEAD},
  merge_base_commit:{sha:'c'.repeat(40)}};
 assert.deepEqual(verifiedLegacyMergeBase({prSha:HEAD,production:prod,compare:cmp}),{
  production_sha:OLD,merge_base_sha:'c'.repeat(40),
  source_write_authorized:false,merge_authorized:false});
 assert.equal(verifiedLegacyMergeBase({prSha:HEAD,production:{...prod,protected:false},compare:cmp}),null);
 assert.equal(verifiedLegacyMergeBase({prSha:HEAD,production:prod,
  compare:{...cmp,base_commit:{sha:OLD}}}),null);
 assert.equal(verifiedLegacyMergeBase({prSha:HEAD,production:prod,
  compare:{...cmp,merge_base_commit:{sha:'bad'}}}),null);
 assert.equal(verifiedLegacyMergeBase({prSha:HEAD,production:prod,
  compare:{...cmp,status:'unknown'}}),null);
 assert.equal(verifiedLegacyMergeBase({prSha:OLD,production:prod,
  compare:{...cmp,base_commit:{sha:OLD}}}),null);
});
test('legacy shallow merge-tree uses authenticated ancestor without releasing manual hold',()=>{
 const yml=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 for(const proof of [
  "legacy_production_sha: ${{ steps.select.outputs.legacy_production_sha }}",
  "legacy_base_sha: ${{ steps.select.outputs.legacy_base_sha }}",
  'github.rest.repos.compareCommits({',
  'verifiedLegacyMergeBase({',
  'LEGACY_PRODUCTION_SHA',
  'LEGACY_MERGE_BASE_SHA',
  "'--merge-base='+base",
  "base_compare_source='GITHUB_VERIFIED_MERGE_BASE'",
  "mode:'READ_ONLY_NO_SOURCE_PUBLICATION'"
 ])assert.ok(yml.includes(proof),proof);
 assert.ok(yml.includes("ref==='FETCH_HEAD'&&report.production_base_sha"),
  'snapshot must retain production SHA after extra fetch replaces FETCH_HEAD');
 assert.match(yml,/needs.claim.outputs.strategy == 'legacy'/);
});
