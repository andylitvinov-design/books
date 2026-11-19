import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTelegramCoachingSummary} from '../lib/coaching/diagnostic-enquiry.mjs';
import {COACHING_FIELDS} from '../lib/coaching/intake-model.js';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const payload={
 operationId:'d0e6da44-7326-46bb-a1b8-91537e124eea',
 locale:'en',offer:'free',topic:'personal',name:'',city:'',
 answers:Object.fromEntries(COACHING_FIELDS.filter(f=>f.required).map(f=>[f.id,'I would like clarity'])),
 questions:[],confirmed:true,
};
test('signed free coaching questionnaire accepts client-approved email without marketing consent',()=>{
 const result=buildTelegramCoachingSummary({...payload,
   replyEmail:' Client.Example@Example.Org ',replyEmailConsent:true},
   {allowReplyEmail:true});
 assert.match(result.text,/Client-approved reply email \(not marketing consent\): client\.example@example\.org/);
 assert.match(result.text,/Completed answers:/);
 assert.equal(result.offer,'free');
 assert.match(result.referenceCode,/^HH-[A-F0-9]{12}$/);
});
test('explicit consent and validated email are required for storage, but email can be omitted',()=>{
 for(const input of [
  {replyEmail:'client@example.org',replyEmailConsent:false},
  {replyEmail:'client@example.org'},
  {replyEmail:'client@example.org',replyEmailConsent:'yes'},
  {replyEmail:'client@@example.org',replyEmailConsent:true},
  {replyEmail:'oops@server',replyEmailConsent:true},
  {replyEmail:'client@example.org\nanother@example.org',replyEmailConsent:true},
  {replyEmail:'',replyEmailConsent:true},
 ]){
  assert.throws(()=>buildTelegramCoachingSummary({...payload,...input},
    {allowReplyEmail:true}),/INVALID_COACHING_REPLY_EMAIL|INVALID_COACHING_FIELD/);
 }
 const without=buildTelegramCoachingSummary({...payload,replyEmail:'',replyEmailConsent:false},
   {allowReplyEmail:true});
 assert.doesNotMatch(without.text,/reply email/i);
});
test('existing V2 Telegram Mini App does not accept new email fields',()=>{
 assert.throws(()=>buildTelegramCoachingSummary({
   ...payload,replyEmail:'client@example.org',replyEmailConsent:true,
 }),/INVALID_COACHING_STRUCTURE/);
 assert.ok(buildTelegramCoachingSummary(payload).text.includes('Completed answers'));
});
test('email stays inside existing signed V3 CRM questionnaire and is not in URLs or owner notifications',()=>{
 const backend=source('lib/crm/telegram-coaching-link.js');
 const form=source('components/coaching-intake-form.tsx');
 const owner=source('lib/crm/telegram-free-package-owner-notice.js');
 const sender=source('lib/app/client-telegram-transport.js');
 assert.match(backend,/buildTelegramCoachingSummary\(questionnaire,\{allowReplyEmail:true\}\)/);
 assert.match(backend,/crm_msg_ingest/);
 assert.match(form,/data-free-diagnostic-reply-email/);
 assert.match(form,/replyEmailConsent:Boolean\(replyContact\.email\.trim\(\)\)&&crmEmailConsent/);
 assert.match(form,/This is not marketing consent/);
 assert.match(form,/type="email"/);
 assert.doesNotMatch(owner,/sendOwnerTelegramEventMessage\(\{[\s\S]*replyEmail/);
 assert.doesNotMatch(sender,/replyEmail/);
 assert.match(source('lib/coaching/telegram-free-diagnostic-handoff.mjs'),/free_diagnostic_form/);
});
