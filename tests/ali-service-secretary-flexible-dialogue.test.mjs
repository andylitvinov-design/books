import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aliServiceSecretaryTurn,aliServiceSecretarySummary}
  from '../lib/assist/ali-service-secretary.mjs';
import {aliGuidedIntakeTurn,aliGuidedIntakeSummary}
  from '../lib/assist/ali-guided-intake.mjs';

const questions=reply=>(reply.match(/[?？]/gu)||[]).length;
const cases=[
 {locale:'ru',consent:'да',both:'Да, завтра в 16:00 онлайн',
  direct:'Хочу записаться в субботу в 16:00 онлайн',
  time:'в пятницу вечером',later:'лучше в субботу после 17',
  format:'онлайн',changeFormat:'лучше очно',
  noTime:'не могу в пятницу',noFormat:'не хочу онлайн',
  changeTime:'поменять время',ask:'А можно в субботу?'},
 {locale:'en',consent:'yes',both:'Yes, Friday after 5 online',
  direct:'I want to book Friday after 5 online',
  time:'Friday evening',later:'Actually Tuesday at 6',
  format:'online',changeFormat:'in person instead',
  noTime:"I can't Friday",noFormat:'not online',
  changeTime:'change the time',ask:'Can you do Saturday?'},
 {locale:'es',consent:'sí',both:'Sí, sábado a las 5 online',
  direct:'Quiero reservar sábado a las 5 online',
  time:'viernes por la tarde',later:'mejor el domingo a las 6',
  format:'online',changeFormat:'mejor presencial',
  noTime:'No puedo el viernes',noFormat:'no quiero online',
  changeTime:'cambiar el horario',ask:'¿Hay horario el sábado?'},
];

function ready(c){
 const first=aliServiceSecretaryTurn({locale:c.locale,message:c.consent});
 assert.equal(first.stage,'challenge',c.locale);
 assert.equal(questions(first.reply),1,c.locale);
 const time=aliServiceSecretaryTurn({locale:c.locale,stage:first.stage,
   slots:first.slots,message:c.time});
 assert.equal(time.stage,'situation',c.locale);
 assert.equal(questions(time.reply),1,c.locale);
 const mode=aliServiceSecretaryTurn({locale:c.locale,stage:time.stage,
   slots:time.slots,message:c.format});
 assert.equal(mode.stage,'ready',c.locale);
 assert.equal(questions(mode.reply),0,c.locale);
 return mode;
}
const summary=(c,r)=>aliServiceSecretarySummary({locale:c.locale,
  title:'Selected verified service',slots:r.slots});

test('multi-intent first replies finish only a reviewed draft in RU/EN/ES',()=>{
 for(const c of cases){
   for(const text of [c.both,c.direct]){
     const r=aliServiceSecretaryTurn({locale:c.locale,message:text});
     assert.equal(r.stage,'ready',c.locale+' '+text);
     assert.equal(questions(r.reply),0);
     const draft=summary(c,r);
     assert.ok(draft?.includes('Selected verified service'),text);
     assert.match(draft,c.locale==='ru'?/онлайн/iu:/online/iu);
     assert.doesNotMatch(draft,/booked|confirmed|оплачено|оплата прошла/i);
   }
 }
});

test('accepts booking fields in any order, without repeating a known question',()=>{
 for(const c of cases){
   const first=aliServiceSecretaryTurn({locale:c.locale,message:c.consent});
   const format=aliServiceSecretaryTurn({locale:c.locale,stage:first.stage,
     slots:first.slots,message:c.format});
   assert.equal(format.stage,'challenge',c.locale);
   assert.equal(format.slots.situation,c.format);
   assert.equal(format.slots.challenge,undefined);
   assert.equal(questions(format.reply),1);
   const date=aliServiceSecretaryTurn({locale:c.locale,stage:format.stage,
     slots:format.slots,message:c.time});
   assert.equal(date.stage,'ready',c.locale);
   assert.equal(questions(date.reply),0);
   assert.ok(summary(c,date)?.includes(c.time),c.locale);
 }
});

test('editing a ready request changes the specified field, never the other one',()=>{
 for(const c of cases){
   const done=ready(c);
   const changeDate=aliServiceSecretaryTurn({locale:c.locale,
     stage:'ready',slots:done.slots,message:c.later});
   assert.equal(changeDate.stage,'ready',c.locale);
   assert.equal(changeDate.slots.challenge,c.later);
   assert.equal(changeDate.slots.situation,c.format);
   assert.equal(questions(changeDate.reply),0);
   assert.ok(summary(c,changeDate)?.includes(c.later));
   assert.ok(!summary(c,changeDate)?.includes(c.time));
   const changeMode=aliServiceSecretaryTurn({locale:c.locale,
     stage:'ready',slots:changeDate.slots,message:c.changeFormat});
   assert.equal(changeMode.stage,'ready',c.locale);
   assert.equal(changeMode.slots.challenge,c.later);
   assert.ok(summary(c,changeMode));
   assert.equal(questions(changeMode.reply),0);
 }
});

test('unresolved changes remove old data and ask one question, not send a stale draft',()=>{
 for(const c of cases){
   const done=ready(c);
   const requested=aliServiceSecretaryTurn({locale:c.locale,
     stage:'ready',slots:done.slots,message:c.changeTime});
   assert.equal(requested.stage,'challenge',c.locale);
   assert.equal(requested.slots.challenge,undefined);
   assert.equal(summary(c,requested),null);
   assert.equal(questions(requested.reply),1);
   const instead=aliServiceSecretaryTurn({locale:c.locale,
     stage:'ready',slots:done.slots,message:c.noTime});
   assert.equal(instead.stage,'challenge',c.locale);
   assert.equal(instead.slots.challenge,undefined);
   assert.equal(summary(c,instead),null);
   const noFormat=aliServiceSecretaryTurn({locale:c.locale,
     stage:'ready',slots:done.slots,message:c.noFormat});
   assert.equal(noFormat.stage,'situation',c.locale);
   assert.equal(noFormat.slots.situation,undefined);
   assert.equal(summary(c,noFormat),null);
   assert.equal(questions(noFormat.reply),1);
 }
});

test('a timing interruption updates only timing; a timing question never fakes availability',()=>{
 for(const c of cases){
   const done=ready(c);
   const inBetween=aliServiceSecretaryTurn({locale:c.locale,
     stage:'situation',slots:{goal:c.consent,challenge:c.time},
     message:c.later});
   assert.equal(inBetween.stage,'situation',c.locale);
   assert.equal(inBetween.slots.challenge,c.later);
   assert.equal(inBetween.slots.situation,undefined);
   assert.equal(questions(inBetween.reply),1);
   const availability=aliServiceSecretaryTurn({locale:c.locale,
     stage:'ready',slots:done.slots,message:c.ask});
   assert.equal(availability.kind,'meta',c.locale);
   assert.deepEqual(availability.slots,done.slots,c.locale);
   assert.equal(questions(availability.reply),1);
 }
});

test('Telegram selected-service wrapper keeps edits visible to client before signed Send',()=>{
 for(const c of cases){
   const first=aliGuidedIntakeTurn({locale:c.locale,serviceRequest:'coaching',
     message:c.consent});
   const second=aliGuidedIntakeTurn({locale:c.locale,serviceRequest:'coaching',
     stage:first.stage,slots:first.slots,message:c.time});
   const third=aliGuidedIntakeTurn({locale:c.locale,serviceRequest:'coaching',
     stage:second.stage,slots:second.slots,message:c.format});
   assert.equal(third.stage,'ready',c.locale);
   const correction=aliGuidedIntakeTurn({locale:c.locale,
     serviceRequest:'coaching',stage:'ready',slots:third.slots,
     message:c.later});
   assert.equal(correction.stage,'ready',c.locale);
   const draft=aliGuidedIntakeSummary({locale:c.locale,
     serviceRequest:'coaching',slots:correction.slots});
   assert.ok(draft.includes(c.later),c.locale);
   assert.ok(!draft.includes(c.time),c.locale);
   assert.equal(questions(correction.reply),0,c.locale);
 }
});

test('privacy, opt-out and vague answers do not overwrite booking information',()=>{
 for(const c of cases){
   const done=ready(c);
   for(const raw of ['??','I feel anxiety about my relationship']){
     const interrupted=aliServiceSecretaryTurn({locale:c.locale,
       stage:'ready',slots:done.slots,message:raw});
     assert.deepEqual(interrupted.slots,done.slots,c.locale);
     assert.ok(['meta','boundary'].includes(interrupted.kind),c.locale);
   }
   const vague=aliServiceSecretaryTurn({locale:c.locale,
     stage:'ready',slots:done.slots,message:'thanks'});
   assert.deepEqual(vague.slots,done.slots);
   assert.equal(vague.stage,'ready');
   const decline=aliServiceSecretaryTurn({locale:c.locale,
     stage:'ready',slots:done.slots,message:c.locale==='ru'?'не сейчас':
       c.locale==='es'?'ahora no':'not now'});
   assert.equal(decline.kind,'boundary',c.locale);
   assert.deepEqual(decline.slots,{});
   assert.equal(summary(c,decline),null);
 }
});

test('only the approved summary is forwarded to CRM, not unreviewed chat turns',()=>{
 const service=readFileSync(new URL('../lib/crm/telegram-ai-diagnostic-v3-service.js',
   import.meta.url),'utf8');
 const review=service.slice(service.indexOf("if(row.stage==='review_confirm')"),
   service.indexOf("if(row.stage!=='interview')"));
 assert.ok(review.length>900);
 assert.match(review,/if\(action==='send'\)/);
 assert.match(review,/const notes=\[\];/);
 assert.match(review,/ctx\.summary\.slice\(0,950\)/);
 assert.doesNotMatch(review,/ctx\.turns\.filter\(x=>x\.role==='user'\)/);
 assert.match(service,/ai_review_consent_at=now\(\)/);
});

test('booking request with a personal topic continues gently without retaining private text',()=>{
 for(const [locale,raw] of [
  ['ru','Хочу записаться на консультацию по отношениям в пятницу онлайн'],
  ['en','I want to book a consultation about anxiety Friday online'],
  ['es','Quiero reservar una consulta por ansiedad el viernes online'],
 ]){
   const next=aliServiceSecretaryTurn({locale,message:raw,kind:'session'});
   assert.equal(next.stage,'challenge',locale);
   assert.equal(next.kind,'clarify',locale);
   assert.ok(next.slots.goal,locale);
   assert.ok(next.slots.situation,locale);
   assert.equal(next.slots.challenge,undefined,locale);
   assert.doesNotMatch(next.slots.goal,/отношен|anxiety|ansiedad/iu);
   assert.doesNotMatch(next.reply,/отношен|anxiety|ansiedad/iu);
   assert.equal(questions(next.reply),1,locale);
   assert.equal(summary({locale},next),null);
 }
});
