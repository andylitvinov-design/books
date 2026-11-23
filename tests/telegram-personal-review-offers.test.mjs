import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {whatsappEnquiryUrl,telegramEnquiryUrlFromWhatsApp} from '../lib/whatsapp-enquiry.js';
import {parseTelegramServiceDraft,parseTelegramPublicServiceRequest,telegramBusinessConversationReply} from '../lib/assist/telegram-business-request.mjs';

const offers={
  en:{
    express:{id:'personal_express_review',title:'Express review'},
    extended:{id:'personal_extended_review',title:'Extended review'},
  },
  ru:{
    express:{id:'personal_express_review',title:'Экспресс-диагностика'},
    extended:{id:'personal_extended_review',title:'Расширенная диагностика'},
  },
  es:{
    express:{id:'personal_express_review',title:'Revisión exprés'},
    extended:{id:'personal_extended_review',title:'Revisión ampliada'},
  },
};

test('Express review and Extended review keep distinct approved IDs through Telegram handoff in all locales',()=>{
  for(const [locale,choices] of Object.entries(offers))for(const [kind,offer] of Object.entries(choices)){
    const source=whatsappEnquiryUrl({locale,service:offer.title,
      request:'private client context must not leave the website',pagePath:`/${locale}/services`});
    const telegram=new URL(telegramEnquiryUrlFromWhatsApp(source));
    const draft=telegram.searchParams.get('text');
    assert.match(draft,new RegExp(`\\[HH-REQ:${offer.id}:${locale}\\]$`));
    assert.doesNotMatch(draft,/private client context/);
    assert.deepEqual(parseTelegramServiceDraft(draft),{
      service:'personal_review',locale,name:offer.title,offerId:offer.id,
      sourcePath:`/${locale}/services`,
    },`${locale} ${kind} resolves to its own service`);
  }
});

test('the extended review continuation acknowledges the selected offer in the current message language',()=>{
  const ru=telegramBusinessConversationReply('review_context',{
    locale:'ru',service:'personal_review',offerId:'personal_extended_review',titleLocale:'en',
  });
  assert.match(ru,/Extended review/);
  assert.match(ru,/с вашего согласия/iu);
  assert.match(ru,/три вопроса/iu);
  assert.doesNotMatch(ru,/какую ситуацию|что вы хотите изменить/iu);
  assert.equal((ru.match(/[?？]/gu)||[]).length,1);
});

test('short natural interest text resolves only one exact published review title',()=>{
  assert.equal(parseTelegramPublicServiceRequest("I'm interested in Extended review")?.offerId,
    'personal_extended_review');
  assert.equal(parseTelegramPublicServiceRequest('Хочу заказать «Экспресс-диагностика»')?.offerId,
    'personal_express_review');
  assert.equal(parseTelegramPublicServiceRequest('Quiero solicitar Revisión ampliada')?.offerId,
    'personal_extended_review');
  assert.equal(parseTelegramPublicServiceRequest('Interested in Express review and Extended review'),null);
  assert.equal(parseTelegramPublicServiceRequest('I have Extended review questions'),null);
});

test('Express and Extended are separate Secretary scenarios with published offer metadata',async()=>{
  const {TELEGRAM_SERVICE_OPTIONS}=await import('../lib/assist/telegram-service-options.mjs');
  const express=TELEGRAM_SERVICE_OPTIONS.personal_express_review;
  const extended=TELEGRAM_SERVICE_OPTIONS.personal_extended_review;
  assert.equal(express.scenario,'express_review');
  assert.equal(express.price.kind,'free');
  assert.equal(extended.scenario,'extended_review');
  assert.equal(extended.price.kind,'quote');
  assert.notEqual(express.scenario,extended.scenario);
  const reply=telegramBusinessConversationReply('review_intro',{
    locale:'en',service:'personal_review',offerId:express.scenario==='express_review'
      ?'personal_express_review':'personal_extended_review',titleLocale:'en',
  });
  assert.match(reply,/free written review/i);
  assert.match(reply,/May I ask three short questions/i);
  assert.doesNotMatch(reply,/what situation|what would you like to change/i);
  const paid=telegramBusinessConversationReply('review_intro',{
    locale:'en',service:'personal_review',offerId:'personal_extended_review',titleLocale:'en'
  });
  assert.match(paid,/price and details/i);
  assert.doesNotMatch(paid,/what situation|personal details/i);
  const preview=telegramBusinessConversationReply('confirm',{
    locale:'en',service:'personal_review',offerId:'personal_extended_review',
    titleLocale:'en',format:'async'
  });
  assert.match(preview,/time and price|price to be confirmed/i);
  assert.match(preview,/Reply.*Confirm/i);
});

test('the public Personal consultation Order buttons send distinct Business offer IDs',()=>{
  const component=readFileSync(new URL('../components/services-personal-consultation-mobile.tsx',import.meta.url),'utf8');
  assert.match(component,/telegramUrl=\{telegramServiceRequestUrl\("personal_express_review", locale\)/);
  assert.match(component,/telegramUrl=\{telegramServiceRequestUrl\("personal_extended_review", locale\)/);
  assert.match(component,/TELEGRAM_SERVICE_OPTIONS\.personal_express_review\.titles/);
  assert.match(component,/TELEGRAM_SERVICE_OPTIONS\.personal_extended_review\.titles/);
});

test('an unregistered service title stays on a safe manual route without an invented service marker',()=>{
  const source=whatsappEnquiryUrl({locale:'en',service:'Unknown private service',
    request:'please help me',pagePath:'/en/services'});
  const draft=new URL(telegramEnquiryUrlFromWhatsApp(source)).searchParams.get('text');
  assert.doesNotMatch(draft,/\[HH-REQ:/);
  assert.match(draft,/Unknown private service/);
});
