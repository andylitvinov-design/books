import test from 'node:test';import assert from 'node:assert/strict';import{validateReviewReceipt}from'../scripts/lab-review-policy.mjs';
const a='a'.repeat(40),b='b'.repeat(40);
const receipt={featureId:'LAB-101',headSha:a,baseSha:b,reviewerId:'independent-review-service',decision:'LAB_ACCEPTED',evidenceId:'evidence-1',checks:[{status:'passed',runUrl:'https://example.invalid/run/1'}],findings:[]};
const context={featureId:'LAB-101',headSha:a,baseSha:b,authorId:'developer',trustedReviewerId:'independent-review-service'};
test('trusted independent receipt eligible',()=>assert.equal(validateReviewReceipt(receipt,context).ok,true));
test('self review blocked',()=>assert.equal(validateReviewReceipt({...receipt,reviewerId:'developer'},{...context,trustedReviewerId:'developer'}).ok,false));
test('stale head blocked',()=>assert.equal(validateReviewReceipt({...receipt,headSha:b},context).ok,false));
test('unresolved blocker blocked',()=>assert.equal(validateReviewReceipt({...receipt,findings:[{severity:'blocking',resolved:false}]},context).ok,false));
