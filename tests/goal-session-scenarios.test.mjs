import test from 'node:test';
import assert from 'node:assert/strict';
import {GOAL_SESSION_SCENARIOS,goalScenarioGuidance,goalScenarioTimeGuidance,goalResultOutline} from '../lib/coaching/goal-session-scenarios.mjs';
import {coachCourseProtocolSchema,coachCourseProtocolGuidance,coachCourseCheckpointGuidance} from '../lib/coaching/coach-course-protocol-schema.mjs';
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
test('Goal uses its authored time window without forcing questions, progress or action',()=>{
 const opening={completed:true,answers:{focus:{kind:'goal'}}};
 for(const s of GOAL_SESSION_SCENARIOS){
  assert.match(goalScenarioGuidance(s.id),/scenario is primary after consent/);
  assert.match(goalScenarioTimeGuidance(s.id,null),/Active time unverified/);
  assert.match(goalScenarioTimeGuidance(s.id,1200),/without opening another question/);
  for(const stage of s.stages){
   const hint=goalScenarioTimeGuidance(s.id,stage.start*60);
   assert.match(hint,new RegExp('Goal active phase: '+stage.id));
   for(const field of stage.fields)assert.ok(hint.includes(field));
   assert.match(hint,/Personal method is secondary/);
  }
  for(let seconds=0;seconds<=1200;seconds++)assert.ok(goalScenarioTimeGuidance(s.id,seconds).length<=450);
  for(const locale of ['en','ru','es']){
   const directive={conversationAct:'substantive_reply',timebox:{elapsedSeconds:300}};
   assert.equal(coachCourseCheckpointGuidance(s.id,locale,opening,directive,[],'I have considered this.'),goalScenarioTimeGuidance(s.id,300));
   assert.equal(coachCourseCheckpointGuidance(s.id,locale,opening,{...directive,conversationAct:'correction'},[],'No'), '');
   assert.equal(coachCourseCheckpointGuidance(s.id,locale,{...opening,completed:false},directive,[],'Yes'),'');
  }
 }
 assert.equal(goalScenarioTimeGuidance('business_strategy',300),'');
});
