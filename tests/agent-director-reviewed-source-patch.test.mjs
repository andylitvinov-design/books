import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {issueReviewedSource,verifyReviewedSource,independentlyVerifiedZeroCost,
 validateReviewedPatch} from '../lib/agent-director/reviewed-source-patch.mjs';

const secret='approval-secret-'.repeat(4);
const ownerId='11111111-1111-4111-8111-111111111111';
const runId='22222222-2222-4222-8222-222222222222';
const chatId='33333333-3333-4333-8333-333333333333';
const baseSha='a'.repeat(40);
const input={ownerId,runId,chatId,issueNumber:123,baseSha,
 filesJson:JSON.stringify([{path:'docs/agent-director-review.md',content:'Approved, non-sensitive fixture.',expectedBlobSha:null}]),
 commitMessage:'docs: add approved fixture'};
test('one owner-bound preview token requires identical patch, run, exact HEAD and explicit fresh signature',()=>{
 const {reviewToken,expiresAt,filesSha256}=issueReviewedSource(input,{secret,now:100000});
 assert.equal(expiresAt,400000);
 assert.equal(filesSha256.length,64);
 assert.equal(verifyReviewedSource({...input,reviewToken},{secret,now:130000}).receipt.runId,runId);
 for(const patch of [
  {ownerId:'44444444-4444-4444-8444-444444444444'},
  {runId:'55555555-5555-4555-8555-555555555555'},
  {baseSha:'b'.repeat(40)},
  {filesJson:JSON.stringify([{path:'docs/agent-director-review.md',content:'other',expectedBlobSha:null}])},
  {commitMessage:'docs: changed message'}
 ])assert.throws(()=>verifyReviewedSource({...input,...patch,reviewToken},{secret,now:130000}),
     /OWNED_REVIEW_APPROVAL_STALE_OR_CHANGED/);
 assert.throws(()=>verifyReviewedSource({...input,reviewToken},{secret,now:400000}),
  /OWNED_REVIEW_APPROVAL_STALE_OR_CHANGED/);
});
test('sensitive and restricted paths fail before source publication',()=>{
 for(const path of ['.github/workflows/a.yml','supabase/migrations/test.sql',
  'app/api/auth/route.js','docs/secret-keys.md','ops/pr-monitor/api/safe.js'])
  assert.throws(()=>validateReviewedPatch(JSON.stringify([{path,content:'test',expectedBlobSha:null}])),
    /OWNED_GITHUB_PATCH_(PATH_REJECTED|SCOPE_DENIED)/);
 assert.throws(()=>validateReviewedPatch(JSON.stringify([{
  path:'docs/probe.md',content:'sk-or-v1-abcdefghijklmnopqrstuvwxyz123',expectedBlobSha:null
 }])),/OWNED_GITHUB_PATCH_SCOPE_DENIED/);
});
test('cost approval is never inherited from browser booleans or owner review signature',()=>{
 const issue=issueReviewedSource(input,{secret,now:100000});
 const review=verifyReviewedSource({...input,reviewToken:issue.reviewToken},{secret,now:130000}).receipt;
 assert.equal(independentlyVerifiedZeroCost({confirmed:true,freeCiBudgetVerified:true},review,130000),false);
 const payload={schema:'HH_PR_CI_BUDGET_ATTESTATION_V1',issuer:'HH_PR_COST_CONTROL',
  repository:'andylitvinov-design/books',baseSha,filesSha256:review.filesSha256,
  ownerId,runId,maxAdditionalUsd:0,expiresAt:200000};
 const key='separate-trusted-cost-signer-'.repeat(3);
 const data=Buffer.from(JSON.stringify(payload)).toString('base64url');
 const signature=crypto.createHmac('sha256',key).update(data).digest('base64url');
 const env={HH_AGENT_CI_COST_ATTESTATION_SECRET:key,
   HH_AGENT_CI_ZERO_COST_ATTESTATION:data+'.'+signature};
 assert.equal(independentlyVerifiedZeroCost(env,review,130000),true);
 assert.equal(independentlyVerifiedZeroCost(env,review,201000),false);
 assert.equal(independentlyVerifiedZeroCost({...env,HH_AGENT_CI_ZERO_COST_ATTESTATION:data+'.broken'},review,130000),false);
});
test('native route requires completed owner-scoped run, consent, cost attestation and a non-LIVE Draft receipt',()=>{
 const src=fs.readFileSync('app/api/agent-director/source-pr/route.js','utf8');
 for(const gate of ['OWNER_SESSION_REQUIRED','OWNER_ACCESS_DENIED','OWNED_SOURCE_RUN_NOT_VERIFIED',
   "input.confirmed!==true",'ownedGithubAppConfigured','independentlyVerifiedZeroCost',
   'verifyCurrentFiles','publishOwnedDraftSource','saveChatProof','ciVerified:false','deployed:false'])
  assert.ok(src.includes(gate),gate);
 assert.doesNotMatch(src,/merge_pull_request|autoMerge|forcePush|process\.env\.GITHUB_PAT/);
});
