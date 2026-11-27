import './coach-archive-quality.test.mjs';
import './coach-supervisor.test.mjs';
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

import {coachCourseScenarioFirst,coachCourseLiveInstruction} from '../lib/coaching/coach-course-journey.mjs';
import {coachCourseIndependentQuestion} from '../lib/coaching/coach-course-protocol-schema.mjs';
import {coachSessionDirectivePrompt,enforceCoachSessionDirective} from '../lib/coaching/coach-session-director.mjs';
import {vetoMethodStepQuestion} from '../lib/coaching/method-protocol-v4.mjs';
import {geminiLiveThematicCheckpointGuidance} from '../lib/coaching/gemini-live-free.mjs';
test('all existing registered programs prefer their scenario, not the persona model',()=>{
 for(const group of COACH_PROGRAM_GROUPS)for(const item of group.sessions)for(const locale of ['en','ru','es']){
  assert.equal(coachCourseScenarioFirst(item.id),true);
  assert.match(coachCourseLiveInstruction(item.id,locale),/COURSE SCENARIO FIRST/);
  assert.match(coachCourseLiveInstruction(item.id,locale),/secondary toolbox/);
 }
 for(const id of [null,undefined,'life_direction','introductory','meaning_axes_inner_growth','goal_forged']){
  assert.equal(coachCourseScenarioFirst(id),false);
 }
});
test('course-first Director and Live preserve evidence and action safety',()=>{
 const base={version:'test',personaId:'mira',personaVersion:'test',methodId:'grow',methodShape:'Goal → Reality → Options',methodProtocolVersion:'test',provisionalPhase:'discovery',phase:'discovery',stageLimit:'goal',methodStepId:'grow:goal',interventionId:'clarify_goal',timebox:{elapsedSeconds:480,phase:'exploration'},evidence:{},readiness:{missing:[]},allowQuestion:true,canOfferAction:false,locale:'en'};
 assert.match(coachSessionDirectivePrompt(base),/Locked primary method=grow/);
 const d={...base,courseScenarioFirst:true,courseScenarioActive:true,courseSessionId:'goal_possibilities'};
 const prompt=coachSessionDirectivePrompt(d);
 assert.match(prompt,/COURSE SCENARIO FIRST/);
 assert.doesNotMatch(prompt,/Locked primary method=grow/);
 assert.match(prompt,/Do NOT suggest a plan/);
 assert.match(geminiLiveThematicCheckpointGuidance('',d,' Goal active phase: method.'),/course scenario first/);
 assert.doesNotMatch(geminiLiveThematicCheckpointGuidance('',d,' Goal active phase: method.'),/step grow:goal/);
 const row=coachCourseProtocolSchema(d.courseSessionId,'en').checkpoints.find(x=>x.id==='options');
 assert.equal(coachCourseIndependentQuestion(d.courseSessionId,'en',row.question),true);
 const response={mode:'ai',message:row.question,planSuggestion:'',evidenceQuote:''};
 assert.equal(enforceCoachSessionDirective(response,d).message,row.question);
 assert.throws(()=>enforceCoachSessionDirective({...response,message:'You must commit to a deadline.'},d));
 assert.throws(()=>enforceCoachSessionDirective(response,{...d,allowQuestion:false}));
 assert.equal(vetoMethodStepQuestion('When will you start?',{methodId:'oskar',methodStepId:'oskar:outcome'},{courseOwnedQuestion:true}),true);
});

import {goalCheckpointStage} from '../lib/coaching/goal-session-scenarios.mjs';
import {openingStagePosition,courseStagePosition,groupedSessionPosition} from '../lib/coaching/coach-session-stage-view.mjs';
test('Goal detailed questions and six UI segments share the scenario mapping without inventing archive answers',()=>{
 const required={goal_result:['why','next','timing'],goal_motivation:['future_scene','next','timing'],goal_plan:['success','review'],goal_resources:['practices','resource_observation'],goal_obstacles:['facts','stop_rule'],goal_possibilities:['stop_rule','decision_rule'],goal_acceleration:['learning','sustainable_pace'],goal_integration:['outcome_status','changes','resources','review']};
 for(const s of GOAL_SESSION_SCENARIOS)for(const locale of ['en','ru','es']){
  const fields=coachCourseProtocolSchema(s.id,locale).checkpoints;
  for(const id of required[s.id]){const row=fields.find(r=>r.id===id);assert.ok(row?.question);assert.ok(goalCheckpointStage(s.id,id));assert.ok(!row.question.includes('What would you like to record about'))}
  const ui=groupedSessionPosition(openingStagePosition({current:'invitation'},locale),courseStagePosition(fields.map(f=>({...f,status:'not_explored'}))),{mode:'course',courseId:s.id,locale});
  assert.equal(ui.total,6);assert.ok(ui.rows.every(r=>r.tone==='gray'));
  for(const group of ui.rows)assert.deepEqual(group.coreChildren.map(f=>f.id),s.stages.find(t=>t.id===group.id).fields);
 }
});
