import test from 'node:test';import assert from 'node:assert/strict';import{validatePublish}from'../scripts/lab-pr-publisher.mjs';
const a='a'.repeat(40),b='b'.repeat(40);
const packet={id:'LAB-101',status:'RELEASE_CANDIDATE',targetBranch:'codex/public-book-library',headSha:b,baseSha:a,qaPassed:true,testEvidence:true,changedFiles:['app/page.tsx'],acceptance:{accepted:true,headSha:b,reviewEvidenceId:'review-123'}};
test('clean candidate passes',()=>assert.equal(validatePublish(packet,{head:b,base:a,prs:[]}),null));
test('stale base fails',()=>assert.equal(validatePublish(packet,{head:b,base:b,prs:[]}), 'stale-sha'));
test('existing PR blocks',()=>assert.equal(validatePublish(packet,{head:b,base:a,prs:[{headRefOid:b}]}),'existing-pr'));
test('missing inventory blocks',()=>assert.equal(validatePublish(packet,{head:b,base:a}), 'missing-pr-inventory'));

test('no acceptance blocks',()=>assert.equal(validatePublish({...packet,acceptance:null},{head:b,base:a,prs:[]}), 'acceptance-required'));
test('stale acceptance blocks',()=>assert.equal(validatePublish({...packet,acceptance:{accepted:true,headSha:a,reviewEvidenceId:'review-123'}},{head:b,base:a,prs:[]}), 'acceptance-required'));
