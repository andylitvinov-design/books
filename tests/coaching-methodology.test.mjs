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
 assert.equal(classifyCoachingDifficulty({message:'I do not know'}),'uncertainty');
 assert.equal(classifyCoachingDifficulty({message:'I need to stop now'}),'stop_request');
});

test('safety, stop, pause and correction signals have deterministic precedence',()=>{
 assert.equal(classifyCoachingDifficulty({message:'I want to kill myself and stop this session'}),'safety_hold');
 assert.equal(classifyCoachingDifficulty({message:'Stop please',clientSignals:{correction:true}}),'stop_request');
 assert.equal(classifyCoachingDifficulty({message:'',clientSignals:{correction:true}}),'coach_misunderstanding');
 assert.equal(classifyCoachingDifficulty({message:'',clientSignals:{pause:true}}),'pause_request');
});

test('client method choice takes precedence over heuristic selection',()=>{
 assert.deepEqual(chooseCoachingMethod({preferredMethod:'grow',difficulty:'ambivalence'}),{method:'grow',reason:'client_preference'});
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
 const ready=assessStageReadiness('goal',{goalRestated:true,goalConfirmed:true});
 assert.equal(ready.nextStage,'reality');
 assert.deepEqual(GROW_STAGES,['goal','reality','priority','options','action','review']);
});

test('next best action selects one grounded intervention in all supported locales',()=>{
 for(const locale of ['en','ru','es']){
  const result=selectNextBestAction({stage:'reality',message:'',locale});
  assert.equal(result.locale,locale);
  assert.equal(result.questionCount,1);
  assert.ok(result.question.length>10);
  assert.equal(result.shouldWaitForClient,true);
 }
});

test('overload routes to priority without forcing a stage transition',()=>{
 const result=selectNextBestAction({stage:'reality',message:'Слишком много дел, не успеваю'});
 assert.equal(result.difficulty,'overload');
 assert.equal(result.intervention,'prioritize');
 assert.equal(result.stage,'reality');
 assert.equal(result.status,'await_client');
});

test('ambivalence and advice request use different, consent-respecting interventions',()=>{
 const ambivalent=selectNextBestAction({stage:'action',message:'I am afraid and cannot start'});
 assert.equal(ambivalent.intervention,'explore_ambivalence');
 const advice=selectNextBestAction({stage:'options',message:'What should I do?'});
 assert.equal(advice.intervention,'offer_advice_with_permission');
});

test('safety and stop responses suspend normal stage work',()=>{
 const risk=selectNextBestAction({stage:'action',message:'Я думаю о самоубийстве',locale:'ru'});
 assert.equal(risk.status,'safety_hold');
 assert.equal(risk.depth,'task');
 assert.equal(risk.shouldWaitForClient,false);
 const stop=selectNextBestAction({stage:'options',message:'I want to stop'});
 assert.equal(stop.status,'stopped');
 assert.equal(stop.shouldWaitForClient,false);
});

test('client correction and skip do not get misclassified as resistance',()=>{
 assert.equal(selectNextBestAction({signals:{correction:true}}).intervention,'repair_misunderstanding');
 assert.equal(selectNextBestAction({signals:{skip:true}}).status,'skipped');
});

test('low confidence shrinks the plan instead of increasing pressure',()=>{
 const low=adjustActionForFeasibility({confidence:4,action:'Write a 20-page plan'});
 assert.equal(low.action,'');
 assert.equal(low.needsSmallerStep,true);
 assert.equal(low.requiresClientChoice,true);
 const high=adjustActionForFeasibility({confidence:8,action:'Send one email'});
 assert.equal(high.action,'Send one email');
});

test('plan cannot be marked ready without each field and explicit approval',()=>{
 const draft=evaluateCoachingPlan({action:'Prepare agenda',firstStep:'Open notes',timing:'Tomorrow',obstacle:'No time',fallback:'10 minutes later'});
 assert.equal(draft.ready,false);
 assert.equal(draft.approvalRequired,true);
 const approved=evaluateCoachingPlan({action:'Prepare agenda',firstStep:'Open notes',timing:'Tomorrow',obstacle:'No time',fallback:'10 minutes later',clientApproved:true});
 assert.equal(approved.ready,true);
});

test('unknown and missing data fail to conservative defaults',()=>{
 assert.equal(classifyCoachingDifficulty({message:null}),'insufficient_input');
 assert.equal(resolveDepth({requestedDepth:'deep',consented:true,goalRelevant:true}).depth,'task');
 assert.equal(assessStageReadiness('unknown',{}).stage,'goal');
});
