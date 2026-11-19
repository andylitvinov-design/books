import test from 'node:test';
import assert from 'node:assert/strict';
import {planWaveMagicTurn} from '../lib/holistic-support/wave-magic-director.mjs';
const gate={status:'clear'};
const rows=[
 {id:'test:one',kind:'test',title:'Check-in',href:'/en/client/tests'},
 {id:'service:two',kind:'service',title:'Consultation',href:'/en/services/alchemy-of-soul'},
 {id:'service:three',kind:'service',title:'Other',href:'/en/services/business-consulting'},
 {id:'service:evil',kind:'service',title:'Not real',href:'https://elsewhere.test'}];
test('one Alchemy Mind for Web and Telegram offers exactly two verified links',()=>{
 for(const channel of ['web','telegram']){
  const p=planWaveMagicTurn({message:'What do you offer?',locale:'en',
   channel,safety:gate,verifiedRecommendations:rows});
  assert.equal(p.mode,'sales');assert.equal(p.dialogueStage,'OFFER_TWO');
  assert.deepEqual(p.recommendations.map(x=>x.id),['test:one','service:two']);
  assert.equal(p.constraints.noCRMWrite,true);
 }
});
test('explicit feelings never open coaching or sell anything',()=>{
 const p=planWaveMagicTurn({message:'Мне страшно и тревожно',locale:'ru',
  safety:gate,verifiedRecommendations:rows});
 assert.equal(p.mode,'secretary');assert.equal(p.recommendations.length,0);
 assert.equal(p.depth,'brief');
});
test('psychologist requires server verified consent, not a text yes',()=>{
 const p=planWaveMagicTurn({message:'Хочу глубокую беседу',locale:'ru',safety:gate});
 assert.equal(p.consentRequired,true);assert.equal(p.mode,'secretary');
 const q=planWaveMagicTurn({message:'Мне страшно',locale:'ru',safety:gate,
  currentRole:'secretary_psychologist',requestedRole:'secretary_psychologist',
  sessionRoleVerified:true,validatedPsychologistConsent:true});
 assert.equal(q.mode,'secretary_psychologist');assert.equal(q.depth,'deep_optional');
});
test('booking never becomes a CRM acceptance without explicit server authority',()=>{
 for(const message of ['yes','да','Book me a session']){
  const p=planWaveMagicTurn({message,locale:'en',safety:gate,serverStage:'CRM_ACCEPTED'});
  assert.notEqual(p.dialogueStage,'CRM_ACCEPTED');assert.equal(p.selectionContext,null);
 }
 const p=planWaveMagicTurn({message:'Book me a session',locale:'en',safety:gate,
  verifiedSelection:{serverVerified:true,id:'service:two'}});
 assert.equal(p.nextAction,'verified_booking_intake');assert.equal(p.handoff.maySubmit,false);
 const confirmed=planWaveMagicTurn({message:'Status',locale:'en',safety:gate,
  serverStage:'CRM_ACCEPTED',serverStageVerified:true});
 assert.equal(confirmed.dialogueStage,'CRM_ACCEPTED');
});
test('no pressure, STOP, refusal, different locale and host safety are authoritative',()=>{
 for(const message of ['/stop','я подумаю','без продаж','без советов']){
  const p=planWaveMagicTurn({message,locale:'ru',safety:gate,verifiedRecommendations:rows});
  assert.equal(p.recommendations.length,0);
 }
 const p=planWaveMagicTurn({message:'What do you offer?',locale:'ru',safety:gate,
  verifiedRecommendations:rows});
 assert.equal(p.recommendations.length,0);
 const unsafe=planWaveMagicTurn({message:'What do you offer?',locale:'en',
  safety:{status:'human_review'},verifiedRecommendations:rows});
 assert.equal(unsafe.nextAction,'host_safety_handoff');
});
test('never pads the second option and only explicit goal requests open Coach',()=>{
 const p=planWaveMagicTurn({message:'What do you offer?',locale:'en',
  safety:gate,verifiedRecommendations:rows.slice(0,1)});
 assert.equal(p.recommendations.length,1);
 assert.equal(planWaveMagicTurn({message:'I am anxious',locale:'en',safety:gate}).mode,'secretary');
 assert.equal(planWaveMagicTurn({message:'Help me work on my goal',locale:'en',safety:gate}).mode,'coach');
});

test('naturally phrased direct booking is recognized in RU/EN/ES without synthetic approval',()=>{
 for(const [locale,message] of [
  ['ru','Можно сразу записаться?'],
  ['en','Can I book a session?'],
  ['es','¿Puedo reservar una consulta?'],
 ]){
  const plan=planWaveMagicTurn({message,locale,channel:'telegram',safety:gate,
   verifiedSelection:{serverVerified:true,id:'service:two'}});
  assert.equal(plan.intent,'booking',message);
  assert.equal(plan.nextAction,'verified_booking_intake');
  assert.equal(plan.handoff.maySubmit,false);
  assert.equal(plan.recommendations.length,0);
 }
});
test('verified practices, koans and specialists remain eligible recommendations',()=>{
 const options=[
  {id:'practice:calm',kind:'practice',title:'Gentle exercise',href:'/en/practices/calm'},
  {id:'koan:reflect',kind:'koan',title:'Reflection',href:'/en/koans/reflection'},
  {id:'specialist:andrey',kind:'specialist',title:'Human support',href:'/en/services'},
 ];
 const plan=planWaveMagicTurn({message:'What can I try?',locale:'en',safety:gate,
  verifiedRecommendations:options,channel:'telegram'});
 assert.equal(plan.intent,'options');
 assert.deepEqual(plan.recommendations.map(x=>x.id),['practice:calm','koan:reflect']);
 const chosen=planWaveMagicTurn({message:'What do you offer?',locale:'en',safety:gate,
  verifiedRecommendations:[options[2]]});
 assert.deepEqual(chosen.recommendations.map(x=>x.id),['specialist:andrey']);
});
