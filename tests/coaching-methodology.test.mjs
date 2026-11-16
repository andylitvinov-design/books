import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROW_STAGES, classifyCoachingDifficulty, chooseCoachingMethod, resolveDepth,
  assessStageReadiness, selectNextBestAction, adjustActionForFeasibility, evaluateCoachingPlan,
} from '../lib/personal-coaching/coaching-methodology.mjs';

test('classifies the current task, not a client trait',()=>{
 assert.equal(classifyCoachingDifficulty({message:'I have too many tasks and cannot keep up'}),'overload');
 assert.equal(classifyCoachingDifficulty({message:'I am afraid to start'}),'ambivalence');
 assert.equal(classifyCoachingDifficulty({message:'Can you tell me what I should do?'}),'advice_requested');
 assert.equal(classifyCoachingDifficulty({message:'What should I do?'}),'advice_requested');
 assert.equal(classifyCoachingDifficulty({message:'Tell me what to do'}),'advice_requested');
 assert.equal(classifyCoachingDifficulty({message:'¿Qué hago?'}),'advice_requested');
 assert.equal(classifyCoachingDifficulty({message:'I do not know'}),'uncertainty');
 assert.equal(classifyCoachingDifficulty({message:'I need to stop now'}),'stop_request');
});
test('safety, stop, pause and correction have deterministic precedence',()=>{
 assert.equal(classifyCoachingDifficulty({message:'I want to kill myself and stop this session'}),'safety_hold');
 assert.equal(classifyCoachingDifficulty({message:'Stop please',clientSignals:{correction:true}}),'stop_request');
 assert.equal(classifyCoachingDifficulty({message:'',clientSignals:{correction:true}}),'coach_misunderstanding');
 assert.equal(classifyCoachingDifficulty({message:'',clientSignals:{pause:true}}),'pause_request');
});
test('client method choice takes precedence over heuristic selection',()=>{
 assert.equal(chooseCoachingMethod({preferredMethod:'grow',difficulty:'ambivalence'}).method,'grow');
 assert.equal(chooseCoachingMethod({difficulty:'ambivalence'}).method,'motivational');
 assert.equal(chooseCoachingMethod({difficulty:'action_too_large'}).method,'woop');
});
test('depth stays at task level unless explicitly consented and relevant',()=>{
 assert.equal(resolveDepth({requestedDepth:'pattern',consented:false,goalRelevant:true}).depth,'task');
 assert.equal(resolveDepth({requestedDepth:'meaning',consented:true,goalRelevant:false}).depth,'task');
 assert.equal(resolveDepth({requestedDepth:'meaning',consented:true,goalRelevant:true}).depth,'meaning');
 assert.equal(resolveDepth({requestedDepth:'pattern',consented:true,goalRelevant:true,safetyHold:true}).depth,'task');
});
test('GROW stage cannot advance without explicit exit conditions',()=>{
 const goal=assessStageReadiness('goal',{goalRestated:true});
 assert.equal(goal.ready,false);
 assert.deepEqual(goal.missing,['goalConfirmed']);
 assert.equal(assessStageReadiness('goal',{goalRestated:true,goalConfirmed:true}).nextStage,'reality');
 assert.deepEqual(GROW_STAGES,['goal','reality','priority','options','action','review']);
});
test('one grounded intervention is selected in EN/RU/ES',()=>{
 for(const locale of ['en','ru','es']){
  const result=selectNextBestAction({stage:'reality',message:'',locale});
  assert.equal(result.locale,locale);
  assert.equal(result.questionCount,1);
  assert.ok(result.question.length>10);
  assert.equal(result.shouldWaitForClient,true);
 }
});
test('overload routes to prioritization without stage advancement',()=>{
 const result=selectNextBestAction({stage:'reality',message:'Слишком много дел, не успеваю'});
 assert.equal(result.difficulty,'overload');
 assert.equal(result.intervention,'prioritize');
 assert.equal(result.stage,'reality');
});
test('ambivalence and advice request use different non-leading interventions',()=>{
 assert.equal(selectNextBestAction({stage:'action',message:'I am afraid and cannot start'}).intervention,'explore_ambivalence');
 assert.equal(selectNextBestAction({stage:'options',message:'What should I do?'}).intervention,'offer_advice_with_permission');
});
test('safety and stop suspend normal coaching',()=>{
 assert.equal(selectNextBestAction({stage:'action',message:'Я думаю о самоубийстве',locale:'ru'}).status,'safety_hold');
 assert.equal(selectNextBestAction({stage:'options',message:'I want to stop'}).status,'stopped');
});
test('low confidence shrinks an action without pressure',()=>{
 const low=adjustActionForFeasibility({confidence:4,action:'Write a 20-page plan'});
 assert.equal(low.action,'');
 assert.equal(low.needsSmallerStep,true);
 assert.equal(low.requiresClientChoice,true);
 assert.equal(adjustActionForFeasibility({confidence:8,action:'Send one email'}).action,'Send one email');
});
test('a plan requires all fields and explicit client approval',()=>{
 const draft={action:'Prepare agenda',firstStep:'Open notes',timing:'Tomorrow',obstacle:'No time',fallback:'Try 10 minutes later'};
 assert.equal(evaluateCoachingPlan(draft).ready,false);
 assert.equal(evaluateCoachingPlan({...draft,clientApproved:true}).ready,true);
});
