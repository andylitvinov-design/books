import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIRST_CONTACT_DIRECTOR_VERSION, emptyFirstContactState,
  assessFirstContactStage, advanceFirstContact,
} from '../lib/holistic-support/first-contact-director.mjs';

const evidence = (slot,value,quote,quality=1)=>({slot,value,quote,quality});
const run = (state,utterance,clientEvidence=[],host={},extras={})=>
  advanceFirstContact(state,{turnId:'turn_'+(state.revision+1),utterance,clientEvidence,host,...extras});

test('approved version, five stages, and transparent sufficiency score',()=>{
  const s=emptyFirstContactState();
  assert.equal(s.version,FIRST_CONTACT_DIRECTOR_VERSION);
  assert.equal(s.stage,'contact');
  assert.deepEqual(assessFirstContactStage(s),{
    stage:'contact',score:0,threshold:70,requiredMissing:['intent'],missing:['intent','topic'],ready:false,
  });
});

test('one rich user utterance fulfills 1, 2, and 3 without redundant questions',()=>{
  const message='В отношениях я всегда уступаю, потому что боюсь конфликтов. Хочу научиться говорить о своих желаниях.';
  const facts=[
    evidence('intent','разобраться в отношениях','В отношениях'),
    evidence('situation','я всегда уступаю','я всегда уступаю'),
    evidence('difficulty','боюсь конфликтов','боюсь конфликтов'),
    evidence('desiredOutcome','говорить о своих желаниях','Хочу научиться говорить о своих желаниях'),
  ];
  const r=run(emptyFirstContactState(),message,facts);
  assert.equal(r.move,'await_verified_catalogue');
  assert.equal(r.state.stage,'match');
  assert.equal(r.state.stageResults.contact.score,70);
  assert.equal(r.state.stageResults.understand.score,80);
  assert.equal(r.state.stageResults.goal.score,70);
  assert.equal(r.question,null);
});

test('partial response causes a new single clarification rather than automatic stage completion',()=>{
  const initial=run(emptyFirstContactState(),'Хочу разобраться с работой',
    [evidence('intent','разобраться с работой','Хочу разобраться с работой')]);
  assert.equal(initial.state.stage,'understand');
  assert.equal(initial.assessment.score,0);
  assert.equal(initial.move,'ask_one_question');
  assert.match(initial.question,/происходит/);
  const next=run(initial.state,'Меня постоянно перебивают на совещаниях',
    [evidence('situation','меня перебивают','постоянно перебивают'),
     evidence('difficulty','трудно говорить','Меня постоянно перебивают')]);
  assert.equal(next.state.stage,'goal');
  assert.match(next.question,/изменить/);
  assert.equal(next.state.stageResults.understand.score,80);
});

test('a vague response is not treated as 70% complete by counting words',()=>{
  const start=run(emptyFirstContactState(),'У меня проблемы');
  assert.equal(start.assessment.score,0);
  assert.equal(start.state.stage,'contact');
  assert.equal(start.move,'ask_one_question');
  const text='Сейчас мне трудно, но я пока не знаю, как сформулировать свою просьбу';
  const fake=run(start.state,text,[
    evidence('intent','уверенность в отношениях','фраза, которой здесь нет'),
  ]);
  assert.equal(fake.assessment.score,0);
  assert.equal(fake.move,'ask_one_question');
  const exhausted=run(fake.state,'Пока не знаю');
  assert.equal(exhausted.move,'offer_skip_or_pause');
  assert.match(exhausted.question,/позже/);
});

test('native-direct request with a verified service skips discovery but does not fake booking',()=>{
  const r=run(emptyFirstContactState(),'Запишите на выбранную услугу',[],{
    directVerifiedServiceId:'service:verified-constellations',
    explicitDirectAction:true,
  });
  assert.equal(r.state.stage,'act');
  assert.equal(r.move,'await_authorized_action');
  assert.equal(r.assessment.score,40);
  assert.equal(r.state.actionStatus,null);
  assert.equal(r.state.stageResults.understand.status,'skipped_direct_action');
});

test('catalogue must verify two items; selection must be one of them',()=>{
  const state=emptyFirstContactState();
  state.stage='match';
  let r=run(state,'Покажи варианты',[],{verifiedOfferIds:['service:one','service:two'],fitExplained:true});
  assert.equal(r.assessment.score,60);
  assert.equal(r.move,'ask_one_question');
  assert.match(r.question,/двух путей/);
  r=run(r.state,'Хочу третий',[],{selectedOfferId:'service:three'});
  assert.equal(r.state.stage,'match');
  assert.equal(r.state.selectedOfferId,null);
  r=run(r.state,'Выбираю второй',[],{selectedOfferId:'service:two'});
  assert.equal(r.state.stage,'act');
  assert.equal(r.move,'await_authorized_action');
  assert.equal(r.state.evidence.chosenAction,'service:two');
  assert.equal(r.state.stageResults.match.score,100);
});

test('only authorized host receipt completes action, not a client claim',()=>{
  const state=emptyFirstContactState();
  state.stage='act';
  state.evidence.chosenAction='service:one';
  let r=run(state,'Я записался');
  assert.equal(r.move,'await_authorized_action');
  assert.equal(r.state.status,'active');
  r=run(r.state,'Подтверждение получено',[],{
    receipt:{id:'receipt_42',status:'enquiry_sent'},
  });
  assert.equal(r.move,'completed');
  assert.equal(r.state.status,'completed');
  assert.equal(r.assessment.score,100);
  assert.equal(r.state.actionStatus,'enquiry_sent'); // not falsely marked booked
});

test('respect pause, no-advice and changed topic before asking more',()=>{
  const s=emptyFirstContactState();
  const paused=run(s,'Без советов',[],{}, {boundary:'no_advice'});
  assert.equal(paused.move,'pause');
  assert.equal(paused.state.status,'paused');
  const reset=run(paused.state,'Теперь хочу обсудить отношения',[
    evidence('intent','обсудить отношения','хочу обсудить отношения'),
  ],{}, {topicChanged:true});
  assert.equal(reset.state.stage,'understand');
  assert.equal(reset.state.status,'active');
});

test('Spanish and voluntary psychologist depth preserve one question and a 3-question ceiling',()=>{
  let state=emptyFirstContactState({locale:'es',role:'secretary_psychologist'});
  for(let i=0;i<3;i++){
    const r=run(state,'No sé');
    assert.ok(['ask_one_question','offer_skip_or_pause'].includes(r.move));
    if(r.question)assert.equal((r.question.match(/[?？]/g)||[]).length,1);
    state=r.state;
  }
  const stop=run(state,'No sé');
  assert.equal(stop.move,'offer_skip_or_pause');
  assert.equal(stop.state.questionCounts.contact,3);
});
