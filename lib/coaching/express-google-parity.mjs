/**
 * Native, source-faithful Express Diagnostic Form.
 * Official English questions were checked against the owner-provided public
 * Google Form; RU is a faithful localized translation, not a second Google
 * Forms response source. Never submit automatically to Google Forms.
 */
export const GOOGLE_EXPRESS_SOURCE='https://docs.google.com/forms/d/e/1FAIpQLSeBA6gcIT8YZ13Ua_qxxV1Ac_v12V21kp1yQq62jizBgmallw/viewform';
export const GOOGLE_EXPRESS_VERSION='hh-express-diagnostic-google-parity-v1';
export const GOOGLE_EXPRESS_FIELDS=Object.freeze([
 {id:'name',kind:'text',max:120,required:true,en:'Your full name.',ru:'Ваше полное имя.'},
 {id:'city',kind:'text',max:150,required:true,en:'Country & city you are living now.',ru:'Страна и город, где вы сейчас живёте.'},
 {id:'whatsapp',kind:'tel',max:28,required:true,en:'Your WhatsApp number (for sending the report):',ru:'Ваш номер WhatsApp (для отправки отчёта):'},
 {id:'request',kind:'long',max:1600,required:true,en:'Briefly describe your main question or request for diagnostic:',ru:'Кратко опишите главный вопрос или запрос на диагностику:'},
 {id:'activity',kind:'long',max:800,required:true,en:'What do you do. Describe your situation (important details):',ru:'Чем вы занимаетесь? Опишите свою ситуацию (важные подробности):'},
 {id:'challenge',kind:'long',max:1400,required:true,en:'What bothering you, what is your biggest challenge right now? How long ago is this?',ru:'Что беспокоит вас больше всего? В чём ваш главный вызов сейчас? Как давно это продолжается?'},
 {id:'attempts',kind:'long',max:1400,required:true,en:'Have you tried to solve this issue yourself? What you were doing? What was the result?',ru:'Пытались ли вы решить эту проблему самостоятельно? Что делали и каков был результат?'},
 {id:'outcome',kind:'long',max:1400,required:true,en:'What would you like to change or achieve? What is the ideal outcome?',ru:'Что вы хотели бы изменить или достичь? Каков идеальный результат?'},
 {id:'importance',kind:'long',max:1200,required:true,en:'Why do you need it? How that will benefit to you?',ru:'Почему это для вас важно? Как это поможет вам?'},
 {id:'startingPoint',kind:'long',max:1400,required:true,en:'What is the starting point for now? What do you have now related to your issue?',ru:'Какова ваша исходная точка? Что у вас есть сейчас в отношении этого вопроса?'},
 {id:'resources',kind:'long',max:1400,required:true,en:'What resources do you possess that may help you with your situation (experience, skills, connections etc)?',ru:'Какие ресурсы могут помочь вам (опыт, навыки, связи и другое)?'},
 {id:'questions',kind:'long',max:600,required:true,en:'Please provide a list of specific questions you would like to get answered during the analysis/diagnostics. Indicate which details are most important for you to know.',ru:'Перечислите вопросы, на которые хотите получить ответы при анализе. Какие подробности для вас наиболее важны?'},
 {id:'priority',kind:'long',max:900,required:true,en:'What is the single most important question you would like to explore in depth? (One question for brief diagnostics).',ru:'Какой один вопрос вы хотели бы исследовать глубже всего? (Один вопрос для экспресс-диагностики.)'},
 {id:'extra',kind:'long',max:1600,required:false,en:'If you have anything to add, please send more information about your question. Background, possibilities, options etc.',ru:'Если хотите что-то добавить, расскажите о предпосылках, возможностях и вариантах.'},
]);
const EMAIL=/^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-zA-Z]{2,}$/;
const VALID_LANG=new Set(['ru','en']);
export const GOOGLE_EXPRESS_EMAIL=Object.freeze({
 en:'Email (for contacting you about your review)',
 ru:'Email (для связи по результатам разбора)',
});
export function normalizeExpressGoogleParity({locale,values,email,emailConsent}={}){
 if(!VALID_LANG.has(locale)||!values||typeof values!=='object'||Array.isArray(values))
  throw new Error('INVALID_GOOGLE_PARITY_FORM');
 const normalized={};
 for(const f of GOOGLE_EXPRESS_FIELDS){
  const raw=values[f.id];
  if(typeof raw!=='string'||raw.length>f.max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(raw))
    throw new Error('INVALID_GOOGLE_PARITY_FIELD_'+f.id);
  const value=raw.trim();
  if(f.required&&!value)throw new Error('MISSING_GOOGLE_PARITY_FIELD_'+f.id);
  normalized[f.id]=value;
 }
 if(typeof email!=='string'||email.length>254||!EMAIL.test(email.trim())||
   emailConsent!==true)throw new Error('GOOGLE_PARITY_EMAIL_CONSENT_REQUIRED');
 return {locale,fields:normalized,email:email.trim().toLowerCase(),emailConsent:true};
}
export function buildExpressGoogleParityQuestionnaire(
  {operationId,locale,values,email,emailConsent}={}){
 const v=normalizeExpressGoogleParity({locale,values,email,emailConsent});
 if(typeof operationId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId))
   throw new Error('INVALID_GOOGLE_PARITY_OPERATION');
 const a=v.fields;
 return {
  operationId,locale,offer:'free',topic:'other',name:a.name,city:a.city,
  replyEmail:v.email,replyEmailConsent:true,replyPhone:a.whatsapp,
  answers:{
   request:a.request,occupation:a.activity,concern:a.challenge,
   concernDuration:'',attempts:a.attempts,attemptsResult:'',
   biggestDifficulty:a.challenge,alreadyDone:a.startingPoint,
   currentResults:'',idealOutcome:a.outcome,importance:a.importance,
   expectedChange:'',resources:a.resources,existingSupport:'',
   paths:'',helpers:'',sessionOutcome:'',successEvidence:'',
   priorityQuestion:a.priority,extraContext:a.extra,
  },
  questions:[a.questions],
  confirmed:true,
 };
}
export function expressGoogleParityProgress(values={}){
 const required=GOOGLE_EXPRESS_FIELDS.filter(f=>f.required);
 return {complete:required.filter(f=>typeof values[f.id]==='string'&&values[f.id].trim()).length,
  total:required.length};
}
