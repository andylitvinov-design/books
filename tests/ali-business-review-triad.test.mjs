import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aliBusinessReviewConsent,aliBusinessReviewAnswer,aliBusinessReviewSummary,
 aliBusinessReviewValidated,ALI_BUSINESS_REVIEW_STAGES} from '../lib/assist/ali-business-review-intake.mjs';
import {telegramBusinessConversationReply} from '../lib/assist/telegram-business-request.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('an explicit yes is needed before any sensitive fact is accepted',()=>{
 for(const word of ['да','yes','sí','Подтвердить'])assert.equal(aliBusinessReviewConsent(word),'yes');
 for(const word of ['нет','no thanks','ahora no'])assert.equal(aliBusinessReviewConsent(word),'no');
 assert.equal(aliBusinessReviewConsent('My family is complicated'),null);
 assert.equal(aliBusinessReviewValidated({version:1,consented:false,answers:{goal:'Important'}}),null);
});
test('three natural-language answers advance only goal, obstacle, current situation',()=>{
 assert.deepEqual(ALI_BUSINESS_REVIEW_STAGES,{
   review_understanding:'goal',review_outcome:'challenge',review_action:'situation'});
 const stages=['review_understanding','review_outcome','review_action'];
 const words=['I want to make a career decision','My priorities conflict','At present I have two job offers'];
 const answers={};
 for(let i=0;i<3;i++){
   const p=aliBusinessReviewAnswer({message:words[i],stage:stages[i]});
   assert.equal(p.field,['goal','challenge','situation'][i]);
   assert.equal(p.next,['review_outcome','review_action','confirm'][i]);
   answers[p.field]=p.text;
 }
 assert.equal(aliBusinessReviewSummary('en',answers).includes('job offers'),true);
 assert.equal(aliBusinessReviewValidated({version:1,consented:true,answers})?.answers.situation,words[2]);
});
test('FAQs, receipt claims and approval are not captured as client facts',()=>{
 for(const msg of ['yes','send request','I uploaded my photo','my questionnaire','how much?', 'Can I send a drawing?','нет']){
   assert.equal(aliBusinessReviewAnswer({message:msg,stage:'review_action'}),null,msg);
 }
 assert.equal(aliBusinessReviewSummary('ru',{goal:'A goal',challenge:'A problem'}),null);
});
test('three localized prompts and final review keep one question and no fictional booking',()=>{
 for(const locale of ['ru','en','es']){
   const offer='personal_extended_review';
   for(const type of ['review_intro','review_first','review_outcome','review_action']){
     const line=telegramBusinessConversationReply(type,{
       locale,service:'personal_review',offerId:offer,titleLocale:locale});
     assert.ok(line.includes('?')||line.includes('？')||line.includes('¿'),locale+' '+type);
     assert.equal((line.match(/[?？]/gu)||[]).length,1,type);
   }
   const text=telegramBusinessConversationReply('review_summary',{
     locale,service:'personal_review',offerId:offer,titleLocale:locale,
     reviewSummary:aliBusinessReviewSummary(locale,{goal:'More clarity',challenge:'I cannot choose',
       situation:'I have two alternatives'})});
   assert.ok(text.length<=600);
   assert.match(text,locale==='ru'?/Подтвердить/:locale==='en'?/Confirm/:/Confirmar/);
 }
});
test('live Business processor encrypts each fact and only shares it at final approval',()=>{
 const service=source('lib/crm/telegram-business-service.js');
 const parser=source('lib/assist/telegram-business-request.mjs');
 assert.match(service,/reviewedAnswers\(old,config\)/);
 assert.ok(service.indexOf("if(boundary?.kind==='safety')") <
   service.indexOf('const answer=action?null:aliBusinessReviewAnswer'),
   'safety must win before all diagnostic slot recording');
 assert.match(service,/composeTelegramSecretaryAnswer\(boundary,\[\]\)/);
 assert.match(service,/set stage=\$3,intake_answers_ciphertext=\$4,last_update_id=\$5/);
 assert.match(service,/if\(intent.service==='personal_review'\)\{/);
 assert.match(service,/aliBusinessReviewSummary\(intent.locale,progress.answers\)/);
 const reviewStart=service.indexOf('const nextStage=answer.next');
 const reviewEnd=service.indexOf("if(!request&&!action&&",reviewStart);
 const reviewFlow=service.slice(reviewStart,reviewEnd);
 assert.match(reviewFlow,/delivery_format=case when \$3='confirm' then 'async'/);
 const aiStart=service.indexOf('if(aiStep<5){');
 const aiEnd=service.indexOf('if(aiStep<5){')+450;
 assert.doesNotMatch(service.slice(aiStart,aiEnd),/delivery_format=case when/);
 assert.match(service,/old.service_key!=='personal_review'&&\['format','confirm'\]/);
 assert.match(service,/if\(old.service_key==='personal_review'\)\{\s*const complete=reviewedAnswers\(old,config\)/);
 assert.match(service,/if\(action\?\.kind==='confirm'&&old.stage==='confirm'/);
 assert.match(parser,/reviewSummary=null/);
});
