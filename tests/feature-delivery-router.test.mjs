import test from 'node:test';import assert from 'node:assert/strict';import {routeFeature} from '../scripts/feature-delivery-router.mjs';
for(const [input,lane,status] of [
 [{},'lab','LOCAL_ONLY'],
 [{kind:'feature',labReady:true},'lab','LAB_QA'],
 [{kind:'feature',labReady:true,qaPassed:true},'release-candidate','READY_FOR_RELEASE_REVIEW'],
 [{kind:'feature',labReady:true,qaPassed:true,releaseApproved:true},'github-release','PR_REQUIRED'],
 [{kind:'ci'},'github-hotfix','PR_REQUIRED'],
 [{kind:'production-incident'},'github-hotfix','PR_REQUIRED'],
 [{kind:'feature',risk:'payments'},'lab-isolated','HOLD_FOR_ISOLATION'],
 [{kind:'feature',risk:'auth',urgent:true},'lab-isolated','HOLD_FOR_ISOLATION'],
 [{kind:'security-hotfix'},'github-hotfix','PR_REQUIRED'],
 [{kind:'feature',risk:'critical',urgent:true},'github-hotfix','PR_REQUIRED']
])test(JSON.stringify(input),()=>{const r=routeFeature(input);assert.equal(r.lane,lane);assert.equal(r.status,status)});
