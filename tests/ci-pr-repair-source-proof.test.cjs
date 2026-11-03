'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {claimedRepairMissingSourceProof}=require('../scripts/ci-pr-repair-worker.cjs');

test('a claimed Repair Worker must not report green without verified source publication',()=>{
 const claimed={claim_status:'claimed',source_published:false};
 for(const state of ['MANUAL','FAILED','VERIFY_REQUIRED','REJECTED'])
   assert.equal(claimedRepairMissingSourceProof({...claimed,state}),true,state);
 assert.equal(claimedRepairMissingSourceProof({...claimed,state:'PUBLISHED',source_published:true}),false);
 assert.equal(claimedRepairMissingSourceProof({...claimed,state:'SUPERSEDED'}),false);
 assert.equal(claimedRepairMissingSourceProof({...claimed,claim_status:'skipped',state:'MANUAL'}),false);
 assert.equal(claimedRepairMissingSourceProof(null),false);
 assert.equal(claimedRepairMissingSourceProof({state:'already_finalized'}),false);
});

test('trusted publisher records exact-HEAD outcome before failing unverified claim',()=>{
 const wf=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const marker='      - name: Finalize on publisher runner';
 assert.ok(wf.includes(marker));
 const section=wf.split(marker)[1].split('\n  finalize:')[0];
 assert.match(section,/worker\.claimedRepairMissingSourceProof\(result\)/);
 assert.match(section,/core\.setFailed\('HH_REPAIR_SOURCE_NOT_PUBLISHED:/);
 assert.ok(section.indexOf('worker.finalize({')>=0);
 assert.ok(section.indexOf('worker.finalize({')<section.indexOf('core.setFailed('));
 assert.ok(section.indexOf("core.info('HH_REPAIR_FINAL_OUTCOME ")<section.indexOf('core.setFailed('));
});
