import test from 'node:test';import assert from 'node:assert/strict';import{advanceFeature}from'../scripts/feature-release-state.mjs';
test('no live without matching SHA and smoke',()=>{assert.deepEqual(advanceFeature({state:'MERGED'},{productionReadySha:'a',mergedSha:'b',liveSmokePassed:true}),{state:'MERGED',reason:'live-not-verified'});assert.equal(advanceFeature({state:'MERGED'},{productionReadySha:'a',mergedSha:'a',liveSmokePassed:true}),'LIVE')});
test('no release candidate without QA evidence',()=>assert.deepEqual(advanceFeature({state:'LAB_QA'},{qaPassed:true}),{state:'LAB_QA',reason:'qa-incomplete'}));
test('no merge without checks',()=>assert.deepEqual(advanceFeature({state:'GITHUB_CI'},{exactHeadGreen:true}),{state:'GITHUB_CI',reason:'release-gate-incomplete'}));
