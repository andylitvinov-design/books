import test from 'node:test';
import assert from 'node:assert/strict';
import {GOAL_SESSION_SCENARIOS,goalScenarioGuidance,goalResultOutline} from '../lib/coaching/goal-session-scenarios.mjs';
import {coachCourseProtocolSchema,coachCourseProtocolGuidance} from '../lib/coaching/coach-course-protocol-schema.mjs';
import {COACH_PROGRAM_GROUPS} from '../lib/coaching/coach-program-topics.mjs';
test('eight Goal topics map all existing fields once and preserve partial results',()=>{
 assert.deepEqual(GOAL_SESSION_SCENARIOS.map(s=>s.id),COACH_PROGRAM_GROUPS.find(g=>g.id==='goal').sessions.map(s=>s.id));
 for(const s of GOAL_SESSION_SCENARIOS){
  assert.deepEqual(s.stages.map(t=>[t.start,t.end]),[[0,2],[2,5],[5,9],[9,13],[13,17],[17,20]]);
  const ids=s.stages.flatMap(t=>t.fields);assert.equal(new Set(ids).size,ids.length);
  for(const lang of ['en','ru','es']){
   assert.deepEqual([...ids].sort(),coachCourseProtocolSchema(s.id,lang).checkpoints.map(f=>f.id).sort());
   assert.ok(s.resultTitle[lang]);assert.ok(coachCourseProtocolGuidance(s.id,lang).includes('Goal course scenario'));
  }
  assert.equal(goalResultOutline(s.id).completeness,'partial');
  const rows=ids.map(id=>({id,status:'confirmed',quote:'A real client answer',turnIndex:1,source:'client_reviewed_quote'}));
  assert.equal(goalResultOutline(s.id,rows).completeness,'complete');
  assert.equal(goalResultOutline(s.id,[...rows,rows[0]]).completeness,'partial');
  assert.equal(goalResultOutline(s.id,rows.map(r=>({...r,source:'lexical_candidate'}))).completeness,'partial');
 }
 assert.equal(goalScenarioGuidance('clarity_discover'),'');assert.equal(goalResultOutline('business_strategy'),null);
});