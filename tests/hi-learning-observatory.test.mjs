import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  validateHiLearningFeedback,observedHiLearningVersion,gateHiLearningCandidate,parseHiTelegramRating
} from '../lib/holistic-support/hi-learning-policy.mjs';
import {assertHiLearningIndependentFixture} from '../scripts/hi-learning-candidate.mjs';
import fixture from './fixtures/hi-learning-independent-v1.json' with {type:'json'};
import {nativeDialogueEventFromUtterance} from '../lib/holistic-support/conversation-intelligence.mjs';
import {emptyNativeDialogueState,transitionNativeDialogueState} from '../lib/holistic-support/native-dialogue-state.mjs';

test('voluntary feedback rejects arbitrary text, IDs, secrets, forged source and implicit consent',()=>{
  const base={channel:'services',locale:'ru',signal:'helpful',consent:true};
  assert.deepEqual(validateHiLearningFeedback(base),{channel:'services',locale:'ru',signal:'helpful'});
  for(const extra of [
    {text:'private dialogue'},{accountId:'123'},{rawMessage:'body'},
    {secret:'x'},{modelVersion:'fake'},{ip:'127.0.0.1'}
  ])assert.equal(validateHiLearningFeedback({...base,...extra}),null);
  for(const bad of [
    {...base,consent:false},{...base,consent:undefined},{...base,locale:'de'},
    {...base,signal:'medical_emergency'},{...base,channel:'unknown'},
    {channel:'telegram',locale:'en',signal:'helpful',consent:true},
    {channel:'services',locale:'en',signal:'order_completed',consent:true}
  ])assert.equal(validateHiLearningFeedback(bad),null);
  assert.deepEqual(validateHiLearningFeedback(
    {channel:'telegram',locale:'en',signal:'helpful',consent:true},{trustedTelegram:true}),
  {channel:'telegram',locale:'en',signal:'helpful'});
  assert.equal(observedHiLearningVersion('my_coach'),'hi-my-coach-external-model-unattributed-v1');
  assert.equal(observedHiLearningVersion('other'),null);
});

const score=(changes={})=>({macroF1:.70,accuracy:.75,positives:45,negatives:16,
  falseAccepts:1,safetyFailures:0,...changes});
const hash='a'.repeat(64);
const baseline=()=>({holdoutHash:hash,scores:{ru:score(),en:score(),es:score()}});
const candidate=()=>({version:'hh-native-intent-ru-research-v9-balanced-sqrt-char2-8192-v1',
  holdoutHash:hash,deployable:false,automaticPromotion:false,
  scores:{ru:score({macroF1:.73}),en:score(),es:score()},
  dataPolicy:{privateClientData:false,trainingHoldoutOverlap:false,
    provenanceVerified:true,humanReviewComplete:true},
  evaluation:{locked:true,independentRuEn:true,esRegression:true,
    telegramOrders:true,safetyPassed:true}});
test('promotion can only nominate an improvement for protected human review',()=>{
  const outcome=gateHiLearningCandidate({baseline:baseline(),candidate:candidate()});
  assert.equal(outcome.status,'ELIGIBLE_FOR_PROTECTED_REVIEW');
  assert.equal(outcome.automaticPromotion,false);
  assert.equal(outcome.productionChanged,false);
});
test('training leakage, missing human review, safety and regressions always veto promotion',()=>{
  const cases=[
    c=>{c.dataPolicy.privateClientData=true},
    c=>{c.dataPolicy.trainingHoldoutOverlap=true},
    c=>{c.dataPolicy.humanReviewComplete=false},
    c=>{c.dataPolicy.provenanceVerified=false},
    c=>{c.evaluation.independentRuEn=false},
    c=>{c.evaluation.telegramOrders=false},
    c=>{c.evaluation.esRegression=false},
    c=>{c.scores.ru.safetyFailures=1},
    c=>{c.scores.en.macroF1=.67},
    c=>{c.scores.ru.accuracy=.50},
    c=>{c.scores.en.falseAccepts=3},
    c=>{c.scores.es.macroF1=.69},
    c=>{c.scores.ru.macroF1=.70},
    c=>{c.holdoutHash='b'.repeat(64)},
    c=>{c.deployable=true},
    c=>{c.automaticPromotion=true},
    c=>{c.scores.en.positives=30},
  ];
  for(const mutate of cases){
    const c=candidate();mutate(c);
    assert.equal(gateHiLearningCandidate({baseline:baseline(),candidate:c}).status,'BLOCKED',String(mutate));
  }
  assert.equal(gateHiLearningCandidate({}).status,'BLOCKED');
});
test('locked synthetic independent RU/EN dialogues, ES control and signed Telegram codes are disjoint from training',()=>{
  assert.equal(assertHiLearningIndependentFixture(fixture),true);
  const duplicate=structuredClone(fixture);
  duplicate.cases[0].text='привет';
  assert.throws(()=>assertHiLearningIndependentFixture(duplicate),/TRAIN_TEST_LEAKAGE/);
  const unreviewed=structuredClone(fixture);
  unreviewed.privateClientData=true;
  assert.throws(()=>assertHiLearningIndependentFixture(unreviewed),/INVALID_INDEPENDENT_FIXTURE/);
});

test('Telegram rating requires an exact voluntary customer command',()=>{
  for(const [input,locale,signal] of [
    ['/quality helpful','en','helpful'],['/quality unhelpful','en','unhelpful'],
    ['/оценка полезно','ru','helpful'],['/оценка не помогло','ru','unhelpful'],
    ['/calidad util','es','helpful'],['/calidad no util','es','unhelpful']
  ])assert.deepEqual(parseHiTelegramRating(input),{locale,signal});
  for(const input of ['Thanks', 'confirm', '/quality', '/quality helpful but also my report',
    '[HH-REQ:reiki:ru]',null,'/quality helpful\nPrivate client text'])
    assert.equal(parseHiTelegramRating(input),null);
});

test('same existing dialogue state respects explicit correction, refusal and topic change (RU/EN)',()=>{
  for(const locale of ['ru','en']){
    let state=emptyNativeDialogueState();
    const apply=message=>{
      const event=nativeDialogueEventFromUtterance({locale,message,state});
      const result=transitionNativeDialogueState(state,{...event,
        turnId:'t-'+(state.revision+1),expectedRevision:state.revision});
      state=result.state;
      return event;
    };
    assert.equal(apply(locale==='ru'?'Хочу консультацию':'I want a consultation').type,'set_goal');
    assert.equal(state.goal.value,'consultation');
    assert.equal(apply(locale==='ru'?'Нет, не записывай, просто поговорим':'No, do not book, just talk').type,'cancel_to_talk');
    assert.equal(apply(locale==='ru'?'Пожалуйста, не давай советов.':'Please do not give me advice.').type,'refuse_advice');
    assert.equal(state.declinedAdvice.value,'advice');
    apply(locale==='ru'?'Продолжим разговор':'Let us continue talking');
    assert.equal(state.declinedAdvice.value,'advice');
    assert.equal(apply(locale==='ru'?'Теперь можешь дать совет.':'Now you can offer advice.').type,'allow_advice');
    assert.equal(state.declinedAdvice,null);
    assert.equal(apply(locale==='ru'?'Меняем тему: хочу поговорить об отношениях.':'New topic: I want to talk about relationships.').type,'set_topic');
    assert.equal(state.topic.value,'relationships');
  }
});
