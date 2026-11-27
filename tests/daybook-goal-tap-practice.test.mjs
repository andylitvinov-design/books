import test from 'node:test';import assert from 'node:assert/strict';
import {goalTapPractice,goalTapResult} from '../lib/app/goal-tap-practice.mjs';
import {getGuideTask} from '../lib/app/daybook-guide.mjs';
test('eight localized tap exercises target existing private draft fields, no invented completion',()=>{
 const ids=[['discover','area'],['vision','why'],['plan','firstStep'],['resources','strengths'],['obstacles','ifThen'],['options','experiment'],['progress','adjust'],['review','summary']];
 for(const [week,step] of ids)for(const locale of ['ru','en','es']){
 const p=goalTapPractice(week,step,locale);assert.ok(p.title);assert.ok(getGuideTask(week,1,step).fields.some(f=>f.id===p.fieldId&&f.type==='text'));assert.equal(p.steps.length,3);assert.equal(goalTapResult(p,[0,0]),null);assert.equal(goalTapResult(p,[0,99,0]),null);assert.ok(goalTapResult(p,[0,0,0]).length<1200);}
 assert.equal(goalTapPractice('unknown','area'),null);
});
