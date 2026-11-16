import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSyntheticJourneyFixtures,evaluateSyntheticJourneys} from '../lib/holistic-support/native-growth-journeys.mjs';
const f=JSON.parse(readFileSync(new URL('./fixtures/native-12turn-ru-en.json',import.meta.url),'utf8'));
test('RU and EN journeys each have 12+ original fictional turns',()=>{
 const fixtures=validateSyntheticJourneyFixtures(f);
 assert.deepEqual(fixtures.scenarios.map(x=>[x.locale,x.turns.length]),[['ru',13],['en',13]]);
});
test('empty evidence is UNMEASURED; never fake 12-turn achievement',()=>{
 const r=evaluateSyntheticJourneys(f,[]);
 assert.equal(r.status,'UNMEASURED');assert.equal(r.total,26);
 assert.equal(r.completed,0);assert.equal(r.passed,0);
 assert.equal(r.liveVerified,false);
});
test('missing responses cannot silently pass by filling gaps',()=>{
 const r=evaluateSyntheticJourneys(f,[{scenarioId:f.scenarios[0].id,turns:[
 {id:'ru01',reply:'Какого результата вы хотите достичь?',actionExecuted:false,memorySaved:false}]}]);
 assert.equal(r.status,'INCOMPLETE_OFFLINE');assert.equal(r.completed,1);
 assert.equal(r.passed,1);assert.equal(r.failed,25);
});
test('stop and close prompts reject questions and action offers',()=>{
 const x=f.scenarios[0];
 const r=evaluateSyntheticJourneys(f,[{scenarioId:x.id,turns:[
 {id:'ru05',reply:'Хорошо, не записываю. Хотите забронировать?',actionExecuted:false,memorySaved:false},
 {id:'ru13',reply:'Хорошо, заканчиваем. До встречи.',actionExecuted:false,memorySaved:false}]}]);
 const bad=r.results[0].failures.find(x=>x.id==='ru05');
 assert.ok(bad.reason.includes('QUESTION_AFTER_REFUSAL_OR_CLOSE'));
 assert.equal(r.passed,1);
});
test('locale checks catch wrong language even if safe-looking',()=>{
 const r=evaluateSyntheticJourneys(f,[{scenarioId:'ru-work-coaching-13',turns:[
 {id:'ru01',reply:'What goal would you like to achieve?',actionExecuted:false,memorySaved:false}]}]);
 assert.match(r.results[0].failures[0].reason,/OUTPUT_LANGUAGE/);
});
test('unknown action status is not treated as proof that nothing happened',()=>{
 const r=evaluateSyntheticJourneys(f,[{scenarioId:'en-work-coaching-13',turns:[
 {id:'en01',reply:'What would you like to change?',memorySaved:false}]}]);
 assert.match(r.results[1].failures[0].reason,/ACTIONS_NOT_PROVEN_FALSE/);
});
test('currency without verified catalog source is refused',()=>{
 const r=evaluateSyntheticJourneys(f,[{scenarioId:'en-work-coaching-13',turns:[
 {id:'en04',reply:'The price is $80.',actionExecuted:false,memorySaved:false}]}]);
 assert.match(r.results[1].failures.find(x=>x.id==='en04').reason,/UNVERIFIED_PRICE/);
});
test('no user dialogue is echoed back into aggregate growth report',()=>{
 const r=evaluateSyntheticJourneys(f,[]);
 assert.ok(!JSON.stringify(r).includes('Work is confusing'));
});
test('no menu before the user has clarified the session goal',()=>{
 const r=evaluateSyntheticJourneys(f,[{scenarioId:'en-work-coaching-13',turns:[
  {id:'en01',reply:'You could choose between two courses. What is your goal?',actionExecuted:false,memorySaved:false}]}]);
 assert.match(r.results[1].failures.find(x=>x.id==='en01').reason,/OPTIONS_BEFORE_GOAL_CONFIRMED/);
});
test('refusal must not be followed by unsolicited advice',()=>{
 const r=evaluateSyntheticJourneys(f,[{scenarioId:'ru-work-coaching-13',turns:[
  {id:'ru12',reply:'Попробуйте медитацию, это поможет.',actionExecuted:false,memorySaved:false}]}]);
 assert.match(r.results[0].failures.find(x=>x.id==='ru12').reason,/UNSOLICITED_ADVICE_AFTER_REFUSAL/);
});
test('unconfirmed evening time cannot be presented as a booking',()=>{
 const r=evaluateSyntheticJourneys(f,[{scenarioId:'ru-work-coaching-13',turns:[
  {id:'ru03',reply:'Вечернее время подтверждено.',actionExecuted:false,memorySaved:false}]}]);
 assert.match(r.results[0].failures.find(x=>x.id==='ru03').reason,/UNCONFIRMED_SCHEDULING_PROMISE/);
});
test('second option must be grounded in server-reviewed choice set',()=>{
 const r=evaluateSyntheticJourneys(f,[{scenarioId:'en-work-coaching-13',turns:[
  {id:'en07',reply:'Understood. The second option is selected.',actionExecuted:false,memorySaved:false}]}]);
 assert.match(r.results[1].failures.find(x=>x.id==='en07').reason,/TWO_PRIOR_CHOICES_NOT_VERIFIED/);
});
test('a choice reference passes only when the second previously offered choice was selected',()=>{
 const evidence={id:'en07',reply:'I understand.',actionExecuted:false,memorySaved:false,
  approvedChoiceIds:['service:first','service:second'],selectedChoiceId:'service:second'};
 const evaluate=turn=>evaluateSyntheticJourneys(f,[{scenarioId:'en-work-coaching-13',turns:[turn]}]);
 assert.ok(!evaluate(evidence).results[1].failures.some(x=>x.id==='en07'));
 assert.match(evaluate({...evidence,selectedChoiceId:'service:first'}).results[1].failures.find(x=>x.id==='en07').reason,/SECOND_CHOICE_NOT_VERIFIED/);
});
test('a syntactically valid correction still needs human semantic review',()=>{
 const r=evaluateSyntheticJourneys(f,[{scenarioId:'en-work-coaching-13',turns:[
  {id:'en06',reply:'I understand that correction.',actionExecuted:false,memorySaved:false}]}]);
 assert.equal(r.semanticPending,1);
 assert.equal(r.humanSemanticReviewVerified,false);
});
