import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchTelegramPublishedSpiritualInterestDraft,telegramPublishedSpiritualInterestAcknowledgement}
 from '../lib/crm/telegram-business-site-interest.mjs';
const template={
 en:title=>'Hello! I am interested in «'+title+'». Could you help me make a request?',
 ru:title=>'Здравствуйте! Меня интересует «'+title+'». Подскажите, как оформить запрос.',
 es:title=>'¡Hola! Me interesa «'+title+'». ¿Cómo puedo solicitarlo?',
};
for(const locale of ['en','ru','es'])for(const [service,title] of Object.entries({
 spiritual:'Spiritual Reading',tao:'Taoist Reading',tarot:'Tarot Reading',
})){
 test(locale+' public '+service+' message gets safe first-party acknowledgement',()=>{
  const matched=matchTelegramPublishedSpiritualInterestDraft(template[locale](title));
  assert.deepEqual(matched,{kind:'spiritual_interest',locale,service});
  const result=telegramPublishedSpiritualInterestAcknowledgement(matched);
  assert.equal(result.handled,true);
  assert.equal(result.kind,'spiritual_interest');
  assert.ok(result.text.length>60&&result.text.length<=600);
  assert.equal(result.buttons.length,1);
  assert.equal(result.buttons[0].url,
   'https://holistichouse.vercel.app/'+locale+'/services/spiritual-reading');
 });
}
test('unrelated, tampered and private inputs do not trigger a reading request',()=>{
 for(const input of [
  template.en('Business Strategy & Archetypal Coaching'),template.en('Secret service'),
  template.en('Spiritual Reading')+'\nprivate note',template.en('Spiritual Reading')+' /stop',
  '/stop','confirm','online',null,'x'.repeat(350),
 ]) assert.equal(matchTelegramPublishedSpiritualInterestDraft(input),null);
 assert.equal(telegramPublishedSpiritualInterestAcknowledgement({locale:'en',service:'unsupported'}),null);
});
test('Business replies remain signed, can_reply verified, STOP suppressed and rate limited',()=>{
 const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const secretary=file('lib/crm/telegram-secretary-service.js');
 const route=file('app/api/app/crm/messenger/webhook/[provider]/route.js');
 assert.match(secretary,/telegramBusinessMessageFromUpdate\(update\)/);
 assert.match(secretary,/assertHolisticBusinessConnection/);
 assert.match(secretary,/secretaryStopped\(event,config\)/);
 assert.match(secretary,/matchTelegramPublishedSpiritualInterestDraft\(event\.text\)/);
 assert.match(secretary,/telegramPublishedSpiritualInterestAcknowledgement\(spiritualInterest\)/);
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request.headers\)/);
 assert.match(route,/gateTelegramBusinessSecretaryOptOut\(body,config\)/);
 assert.match(route,/processTelegramBusinessSecretary\(body,config,process\.env,\{/);
 assert.match(route,/allowClarification:telegramBusinessInbox\?\.matched===true&&\s*telegramBusinessInbox\.recorded===true&&\s*businessLead\?\.created===false&&businessLead\?\.suppressed===false/);
 assert.match(route,/hh-tg-secretary-reply/);
 assert.match(route,/sendHolisticBusinessRequestReply/);
});
