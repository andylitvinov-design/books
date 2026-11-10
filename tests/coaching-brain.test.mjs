import test from 'node:test';
import assert from 'node:assert/strict';
import {nextCoachingTurn,selectCoachingMethod,validateBrainSuggestion,STAGES} from '../lib/personal-coaching/coaching-brain.mjs';

test('a non-empty answer does not advance the stage without confirmed exit evidence',()=>{
 for(const stage of STAGES){
  const result=nextCoachingTurn({stage,message:'I want to explore my choices',locale:'en'});
  assert.equal(result.nextStage,stage);
  assert.equal(result.status,'await_client');
  assert.deepEqual(result.evidence,[]);
 }
});

test('each GROW stage advances only after all explicit readiness conditions are confirmed',()=>{
 const fixtures=[
  ['goal',{goalRestated:true,goalConfirmed:true},'reality'],
  ['reality',{keyFactsCaptured:true,constraintsReviewed:true},'priority'],
  ['priority',{priorityChosen:true,priorityConfirmed:true},'options'],
  ['options',{optionsExplored:true},'action'],
  ['action',{clientActionApproved:true,timingSpecified:true,feasibilityChecked:true},'review'],
  ['review',{summaryReviewed:true},'review'],
 ];
 for(const [stage,readinessEvidence,nextStage] of fixtures){
  assert.equal(nextCoachingTurn({stage,message:'Continue',readinessEvidence}).nextStage,nextStage);
 }
});

test('empty answer asks for a grounded clarification without advancement',()=>{
 const result=nextCoachingTurn({stage:'reality',message:' ',locale:'ru'});
 assert.equal(result.nextStage,'reality');
 assert.equal(result.intervention,'clarify_goal');
});

test('client preference overrides heuristic',()=>{
 assert.equal(selectCoachingMethod({topic:'habit',preferred:'grow'}).method,'grow');
 assert.equal(selectCoachingMethod({topic:'I am afraid to start'}).method,'motivational');
});

test('safety interrupts normal coaching in three languages',()=>{
 for(const [locale,message] of [['en','I want to kill myself'],['ru','Я думаю о самоубийстве'],['es','quiero morir']]){
  const result=nextCoachingTurn({locale,message,stage:'action',readinessEvidence:{clientActionApproved:true,timingSpecified:true,feasibilityChecked:true}});
  assert.equal(result.status,'safety_interrupt');
  assert.equal(result.nextStage,'action');
  assert.equal(result.method,'grow');
  assert.equal(validateBrainSuggestion({stage:'review',reply:'Keep going now'},result),null);
 }
});

test('suggestion cannot change controller stage or claim diagnosis',()=>{
 const c=nextCoachingTurn({locale:'en',message:'I have a goal',stage:'goal'});
 assert.equal(validateBrainSuggestion({stage:'action',reply:'What is next?'},c),null);
 assert.equal(validateBrainSuggestion({stage:'reality',reply:'I diagnose you with anxiety'},c),null);
 assert.equal(validateBrainSuggestion({stage:'goal',reply:'What result would help today?'},c)?.stage,'goal');
});

test('unsupported locale and malformed inputs fail safely',()=>{
 assert.equal(nextCoachingTurn({locale:'de',stage:'unknown',message:null}).locale,'en');
 assert.equal(nextCoachingTurn({locale:'de',stage:'unknown',message:null}).status,'await_client');
});

test('overload selects prioritization rather than advancing blindly',()=>{
 const result=nextCoachingTurn({stage:'reality',locale:'en',message:'I have too many tasks and cannot keep up'});
 assert.equal(result.intervention,'prioritize');
 assert.equal(result.nextStage,'reality');
});

test('stop and correction do not become resistance',()=>{
 assert.equal(nextCoachingTurn({stage:'action',message:'I want to stop'}).status,'stopped');
 assert.equal(nextCoachingTurn({stage:'action',signals:{correction:true}}).intervention,'repair_misunderstanding');
});
