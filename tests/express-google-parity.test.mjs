import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GOOGLE_EXPRESS_FIELDS,GOOGLE_EXPRESS_EMAIL,GOOGLE_EXPRESS_SOURCE,
 GOOGLE_EXPRESS_VERSION,normalizeExpressGoogleParity,
 buildExpressGoogleParityQuestionnaire,expressGoogleParityProgress}
 from '../lib/coaching/express-google-parity.mjs';
import {buildTelegramCoachingSummary}
 from '../lib/coaching/diagnostic-enquiry.mjs';

const id='53f24ae8-8d60-4c5f-bb39-d98508ab2b78';
const sample=Object.fromEntries(GOOGLE_EXPRESS_FIELDS.map(f=>[f.id,'Answer for '+f.id]));
sample.whatsapp='+14376066502';
const input={operationId:id,locale:'en',values:sample,email:'HELLO@example.com',emailConsent:true};

test('native English source has exact question labels from owner Google Form',()=>{
 assert.match(GOOGLE_EXPRESS_SOURCE,/^https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLSeBA6gcIT8YZ13Ua_qxxV1Ac_v12V21kp1yQq62jizBgmallw\/viewform$/);
 assert.equal(GOOGLE_EXPRESS_FIELDS.length,14);
 assert.equal(GOOGLE_EXPRESS_FIELDS.filter(x=>x.required).length,13);
 assert.deepEqual(GOOGLE_EXPRESS_FIELDS.map(x=>x.id),[
  'name','city','whatsapp','request','activity','challenge','attempts','outcome',
  'importance','startingPoint','resources','questions','priority','extra']);
 assert.equal(GOOGLE_EXPRESS_FIELDS[0].en,'Your full name.');
 assert.equal(GOOGLE_EXPRESS_FIELDS[1].en,'Country & city you are living now.');
 assert.equal(GOOGLE_EXPRESS_FIELDS[2].en,'Your WhatsApp number (for sending the report):');
 assert.equal(GOOGLE_EXPRESS_FIELDS[3].en,'Briefly describe your main question or request for diagnostic:');
 assert.equal(GOOGLE_EXPRESS_FIELDS[5].en,'What bothering you, what is your biggest challenge right now? How long ago is this?');
 assert.equal(GOOGLE_EXPRESS_FIELDS[12].en,
  'What is the single most important question you would like to explore in depth? (One question for brief diagnostics).');
 assert.ok(GOOGLE_EXPRESS_FIELDS.every(f=>f.ru.length>12));
 assert.match(GOOGLE_EXPRESS_EMAIL.ru,/Email/);
 assert.match(GOOGLE_EXPRESS_VERSION,/google-parity/);
});
test('full RU/EN form maps losslessly to owner existing encrypted Telegram CRM model',()=>{
 for(const locale of ['ru','en']){
  const question=buildExpressGoogleParityQuestionnaire({...input,locale});
  assert.equal(question.locale,locale);
  assert.equal(question.offer,'free');
  assert.equal(question.topic,'other');
  assert.equal(question.confirmed,true);
  assert.equal(question.replyEmail,'hello@example.com');
  assert.equal(question.replyEmailConsent,true);
  assert.equal(question.replyPhone,'+14376066502');
  assert.equal(question.answers.request,sample.request);
  assert.equal(question.answers.occupation,sample.activity);
  assert.equal(question.answers.concern,sample.challenge);
  assert.equal(question.answers.idealOutcome,sample.outcome);
  assert.equal(question.answers.priorityQuestion,sample.priority);
  assert.equal(question.questions[0],sample.questions);
  const stored=buildTelegramCoachingSummary(question,{allowReplyEmail:true});
  assert.match(stored.text,/hello@example.com/);
  assert.match(stored.text,/\+14376066502/);
  assert.match(stored.text,/Answer for challenge/);
  assert.match(stored.text,/Answer for resources/);
  assert.match(stored.text,/not marketing consent/);
  assert.match(stored.referenceCode,/^HH-[A-F0-9]{12}$/);
  assert.throws(()=>buildTelegramCoachingSummary(question),
   /INVALID_COACHING_STRUCTURE/);
 }
});
test('email/contact consent is mandatory; malformed forms never claim success',()=>{
 assert.equal(expressGoogleParityProgress(sample).complete,13);
 assert.equal(expressGoogleParityProgress(sample).total,13);
 assert.throws(()=>normalizeExpressGoogleParity({...input,emailConsent:false}),/GOOGLE_PARITY_EMAIL_CONSENT_REQUIRED/);
 assert.throws(()=>normalizeExpressGoogleParity({...input,email:'invalid'}),/GOOGLE_PARITY_EMAIL_CONSENT_REQUIRED/);
 assert.throws(()=>normalizeExpressGoogleParity({...input,values:{...sample,challenge:' '}}),/MISSING_GOOGLE_PARITY_FIELD_challenge/);
 assert.throws(()=>normalizeExpressGoogleParity({...input,values:{...sample,request:'x'.repeat(1601)}}),/INVALID_GOOGLE_PARITY_FIELD_request/);
 assert.throws(()=>normalizeExpressGoogleParity({...input,locale:'fr'}),/INVALID_GOOGLE_PARITY_FORM/);
 assert.throws(()=>buildExpressGoogleParityQuestionnaire({...input,operationId:'bad'}),/INVALID_GOOGLE_PARITY_OPERATION/);
 const legal=buildExpressGoogleParityQuestionnaire(input);
 assert.throws(()=>buildTelegramCoachingSummary({...legal,replyPhone:'abc'},{allowReplyEmail:true}),/INVALID_COACHING_REPLY_PHONE/);
 assert.throws(()=>buildTelegramCoachingSummary({...legal,replyEmailConsent:false},{allowReplyEmail:true}),/INVALID_COACHING_REPLY_EMAIL/);
});
test('h2 Telegram alone renders native parity form and verified single-submit receipt',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const page=read('components/coaching-intake-form.tsx');
 const form=read('components/express-google-parity-form.tsx');
 const server=read('lib/crm/telegram-coaching-link.js');
 assert.match(page,/freeDiagnosticLinked&&telegramHandoff/);
 assert.match(page,/ExpressGoogleParityForm/);
 assert.match(form,/data-google-express-parity/);
 assert.match(form,/method:"POST",credentials:"same-origin"/);
 assert.match(form,/action:"submit",handoff,questionnaire/);
 assert.match(form,/result\?\.saved!==true/);
 assert.match(form,/emailConsent/);
 assert.match(server,/allowReplyEmail:true/);
 assert.match(server,/formReceipt:\{status:'received',referenceCode:payload\.referenceCode\}/);
 assert.doesNotMatch(form,/(?:forms\.gle|formResponse)/);
});
