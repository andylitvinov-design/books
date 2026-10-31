import test from 'node:test';import assert from 'node:assert/strict';import{planReleaseQueue}from'../scripts/lab-release-queue.mjs';
const a='a'.repeat(40),b='b'.repeat(40);
const candidate={id:'LAB-101',status:'RELEASE_CANDIDATE',qaPassed:true,testEvidence:true,headSha:b,baseSha:a,productionBaseSha:a,targetBranch:'codex/public-book-library',readyAt:'2026-10-31T10:00:00Z',acceptance:{accepted:true,headSha:b,reviewEvidenceId:'review-123'}};
test('one verified candidate handed off',()=>{const r=planReleaseQueue([candidate]);assert.equal(r.action,'HANDOFF_ONE');assert.equal(r.candidates.length,1)});
test('duplicates and capacity block',()=>{assert.equal(planReleaseQueue([candidate],{existingPrs:[{state:'open',labId:'LAB-101'}]}).action,'HOLD');assert.equal(planReleaseQueue([candidate],{activePrCount:2}).reason,'capacity')});
test('base mismatch and absent QA block',()=>{assert.equal(planReleaseQueue([{...candidate,productionBaseSha:b}]).action,'HOLD');assert.equal(planReleaseQueue([{...candidate,testEvidence:false}]).action,'HOLD')});

