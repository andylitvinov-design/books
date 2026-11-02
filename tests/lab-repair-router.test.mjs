import test from 'node:test';import assert from 'node:assert/strict';import{planLabRepair}from'../scripts/lab-repair-router.mjs';
const sha='a'.repeat(40);
const base={featureId:'LAB-101',authorId:'agent-dev',reviewerId:'agent-qa',headSha:sha,findings:[{id:'BUG-1',sha,blocking:true}]};
test('blocking finding returns to author',()=>{const r=planLabRepair(base);assert.equal(r.action,'REPAIR');assert.equal(r.owner,'agent-dev')});
test('three failed cycles escalate',()=>assert.equal(planLabRepair({...base,attempts:3}).action,'ESCALATE'));
test('reviewer cannot self-review',()=>assert.equal(planLabRepair({...base,reviewerId:'agent-dev'}).action,'HOLD'));
test('old SHA findings are ignored',()=>assert.equal(planLabRepair({...base,findings:[{id:'BUG-1',sha:'b'.repeat(40),blocking:true}]}).action,'ACCEPTANCE_RECHECK'));
