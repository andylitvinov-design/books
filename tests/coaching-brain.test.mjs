import test from 'node:test';
import assert from 'node:assert/strict';
import {nextCoachingTurn,selectCoachingMethod,validateBrainSuggestion,STAGES} from '../lib/personal-coaching/coaching-brain.mjs';

test('stage transitions are deterministic and do not skip ahead',()=>{
 for(let i=0;i<STAGES.length;i++){
  const result=nextCoachingTurn({stage:STAGES[i],message:'I want to explore my choices',locale:'en'});
  assert.equal(result.nextStage,STAGES[Math.min(i+1,STAGES.length-1)]);
  assert.equal(result.evidence[0].confirmed,false);
 }
});
test('empty answer asks for clarification without advancement',()=>{
 const result=nextCoachingTurn({stage:'reality',message:' ',locale:'ru'});
 assert.equal(result.nextStage,'reality');
 assert.equal(result.status,'clarify');
});
test('client preference overrides heuristic',()=>{
 assert.equal(selectCoachingMethod({topic:'habit',preferred:'grow'}).method,'grow');
 assert.equal(selectCoachingMethod({topic:'habit'}).method,'woop');
 assert.equal(selectCoachingMethod({goal:'I am afraid to start'}).method,'motivational');
});
test('safety interrupts normal coaching in three languages',()=>{
 for(const [locale,message] of [['en','I want to kill myself'],['ru','Я думаю о самоубийстве'],['es','quiero morir']]){
  const result=nextCoachingTurn({locale,message,stage:'action'});
  assert.equal(result.status,'safety_interrupt');
  assert.equal(result.nextStage,'action');
  assert.equal(result.method,null);
  assert.equal(result.evidence,undefined);
  assert.equal(validateBrainSuggestion({stage:'review',reply:'Keep going now'},result),null);
 }
});
test('suggestion cannot change controller stage or claim diagnosis',()=>{
 const c=nextCoachingTurn({locale:'en',message:'I have a goal',stage:'goal'});
 assert.equal(validateBrainSuggestion({stage:'action',reply:'What is next?'},c),null);
 assert.equal(validateBrainSuggestion({stage:'reality',reply:'I diagnose you with anxiety'},c),null);
 assert.equal(validateBrainSuggestion({stage:'reality',reply:'What is one recent example?'},c)?.stage,'reality');
});
test('unsupported locale and malformed inputs fail safely',()=>{
 assert.equal(nextCoachingTurn({locale:'de',stage:'unknown',message:null}).locale,'en');
 assert.equal(nextCoachingTurn({locale:'de',stage:'unknown',message:null}).status,'clarify');
});
