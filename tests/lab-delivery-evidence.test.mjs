import test from 'node:test';import assert from 'node:assert/strict';import {classifyDelivery} from '../scripts/lab-delivery-evidence.mjs';
const a='a'.repeat(40),b='b'.repeat(40);
const pr={number:22,headSha:a,merged:true,mergeSha:b,mergedAt:'2026-10-31T12:00:00Z'};
const productionDeployment={readyState:'READY',target:'production',sha:b,readyAt:'2026-10-31T12:03:00Z'};
test('exact merged SHA + READY production + smoke required',()=>{
 assert.equal(classifyDelivery({pr,productionDeployment,smoke:{passed:true,sha:b}}).state,'LIVE');
 assert.equal(classifyDelivery({pr,productionDeployment:{...productionDeployment,sha:a},smoke:{passed:true,sha:b}}).state,'MERGED');
 assert.equal(classifyDelivery({pr,productionDeployment:{...productionDeployment,target:null},smoke:{passed:true,sha:b}}).state,'MERGED');
 assert.equal(classifyDelivery({pr,productionDeployment,smoke:{passed:true,sha:a}}).state,'MERGED');
 assert.equal(classifyDelivery({pr:{...pr,merged:false},productionDeployment,smoke:{passed:true,sha:b}}).state,'GITHUB_CI');
});
