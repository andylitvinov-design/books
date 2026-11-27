import test from 'node:test';import assert from 'node:assert/strict';
import {goalTapPractice,goalTapResult} from '../lib/app/goal-tap-practice.mjs';
import {getGuideTask} from '../lib/app/daybook-guide.mjs';
test('eight localized tap exercises target existing private draft fields, no invented completion',()=>{
 const ids=[['discover','area'],['vision','why'],['plan','firstStep'],['resources','strengths'],['obstacles','ifThen'],['options','experiment'],['progress','adjust'],['review','summary']];
 for(const [week,step] of ids)for(const locale of ['ru','en','es']){
 const p=goalTapPractice(week,step,locale);assert.ok(p.title);assert.ok(getGuideTask(week,1,step).fields.some(f=>f.id===p.fieldId&&f.type==='text'));assert.equal(p.steps.length,3);assert.equal(goalTapResult(p,[0,0]),null);assert.equal(goalTapResult(p,[0,99,0]),null);assert.ok(goalTapResult(p,[0,0,0]).length<1200);}
 assert.equal(goalTapPractice('unknown','area'),null);
});

import {goalReviewedResult} from '../lib/coaching/goal-reviewed-results.mjs';
import {appendCoachCourseFieldReview} from '../lib/coaching/coach-course-protocol-schema.mjs';
import {myCoachProtocolPdfOptions} from '../lib/personal-coaching/session-protocol.mjs';
test('Goal results PDF only contains reviewed checkpoint answers, never raw transcript or pending candidates',()=>{
 const protocol={id:'8afbf841-49a0-46e1-b5c1-124a116efa28',personaId:'mira',locale:'en',startedAt:'2026-11-19T20:00:00.000Z',completedAt:'2026-11-19T20:20:00.000Z',durationSeconds:1200,courseSessionId:'goal_result',turns:[{role:'user',content:'I want to improve my daily planning.'},{role:'assistant',content:'A private coach suggestion not to export.'},{role:'user',content:'A private unrelated user statement.'},{role:'assistant',content:'Please tell me more.'}]};
 const review=appendCoachCourseFieldReview(null,'goal_result',protocol.turns,'goal','turn:0');
 const saved={...protocol,courseFieldReview:review};
 for(const locale of ['en','ru','es']){
  const result=goalReviewedResult(saved,locale);assert.equal(result.confirmed,1);assert.equal(result.completeness,'partial');
  const pdf=myCoachProtocolPdfOptions(saved,{locale,documentKind:'results'});assert.equal(pdf.entries.length,0);assert.match(pdf.protocolOverview,/improve my daily planning/);assert.doesNotMatch(JSON.stringify(pdf),/private coach suggestion|private unrelated user statement/);
 }
 assert.equal(goalReviewedResult(protocol).confirmed,0);
 assert.throws(()=>myCoachProtocolPdfOptions({...protocol,courseSessionId:'clarity_discover'},{documentKind:'results'}));
});
