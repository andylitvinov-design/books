import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFeature} from '../scripts/feature-release-state.mjs';
const A='a'.repeat(40),B='b'.repeat(40);
const check=(state,evidence,expected,reason)=>assert.deepEqual(advanceFeature({state},evidence),{state:expected,reason});
test('lab progression requires isolation and QA',()=>{
 check('LOCAL',{labReady:true},'LOCAL','lab-not-ready');
 check('LOCAL',{labReady:true,isolated:true},'LAB_QA','lab-ready');
 check('LAB_QA',{qaPassed:true},'LAB_QA','qa-incomplete');
 check('LAB_QA',{qaPassed:true,testEvidence:true},'RELEASE_CANDIDATE','qa-verified');
});
test('release requires verified PR, checks and real merge',()=>{
 check('RELEASE_CANDIDATE',{prNumber:1,prHeadSha:A,productionBaseVerified:true},'GITHUB_CI','pr-verified');
 check('GITHUB_CI',{exactHeadGreen:true,applicableChecksGreen:true,mergeAllowed:true,mergedSha:A,prHeadSha:A},'GITHUB_CI','release-gate-incomplete');
 check('GITHUB_CI',{exactHeadGreen:true,applicableChecksGreen:true,mergeAllowed:true,mergedAtVerified:true,mergedSha:A,prHeadSha:A},'MERGED','merge-verified');
});
test('live requires nonempty matching production SHA and smoke',()=>{
 check('MERGED',{liveSmokePassed:true},'MERGED','live-not-verified');
 check('MERGED',{mergedSha:A,productionReadySha:B,liveSmokePassed:true},'MERGED','live-not-verified');
 check('MERGED',{mergedSha:A,productionReadySha:A,liveSmokePassed:true},'LIVE','live-verified');
});
test('unknown and terminal states cannot auto-promote',()=>{
 check('bogus',{},'BLOCKED','unknown-state');
 check('BLOCKED',{},'BLOCKED','terminal-state');
 check('LIVE',{},'LIVE','terminal-state');
});
