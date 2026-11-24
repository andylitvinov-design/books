/**
 * Ali's small, source-bounded Secretary intake journey.
 * Pure presentation and user-authored facts only. The signed caller owns
 * consent, encrypted session state, STOP, CRM review and provider delivery.
 * This module never identifies a person, diagnoses or reads photographs.
 */
import {aliServiceScenario,aliServiceReady,aliServiceFaq} from './ali-service-scenario.mjs';
import {aliSecretaryOfferLinkReply} from './ali-secretary-offer-journeys.mjs';
import {aliSecretarySupportJourney} from './ali-secretary-support-journeys.mjs';
import {aliServiceSecretaryTurn,aliServiceSecretarySummary} from './ali-service-secretary.mjs';
import {planEmpathyTurn} from '../holistic-support/empathy-mind.mjs';
import {planDialogueDirectorTurn} from '../holistic-support/dialogue-director.mjs';
const LOCALES=new Set(['ru','en','es']);
const STEPS=Object.freeze(['goal','challenge','situation','ready']);
// An actual request to book is not a request to complete a long interview.
const BOOKING_REQUEST=/(?:хочу записаться|запиши(?:те)? меня|готов(?:а)? записаться|хотел(?:а|ось) бы записаться|можно(?: ли)?(?: сразу)? записаться|как записаться|i (?:want|would like|\u0027d like) to book|(?:can|could) i (?:book|schedule)|how (?:do|can) i book|please book (?:me|a session)|ready to book|quiero reservar|me gustar[ií]a reservar|quiero una cita|puedo reservar|c[oó]mo reservo)/iu;
const BOOKING_DECLINE=/(?:не хочу записываться|не готов(?:а)? записываться|don\u0027t want to book|not ready to book|no quiero reservar)/iu;
const BOOKING_QUESTION=Object.freeze({
 ru:'Конечно, помогу 🌿 На какую консультацию хотите записаться?',
 en:'Happy to help 🌿 Which consultation would you like?',
 es:'Con gusto 🌿 ¿Qué consulta te interesa?',
});
const COPY=Object.freeze({
  ru:{
    questions:{
      goal:'Что вы больше всего хотите понять или изменить в своей ситуации?',
      challenge:'Что сейчас больше всего мешает этому?',
      situation:'Что происходит в вашей жизни сейчас и почему этот вопрос стал важен именно теперь?',
    },
    hello:'Здравствуйте! Я Ali, цифровой помощник Holistic House.',
    empathy:'Звучит непросто. Спасибо, что рассказали.',
    thanks:'Понял вас.',
    clarify:'Можно ответить в двух-трёх предложениях.',
    first:'Не нужно извиняться — можно начать с самых простых слов.',
    unsure:'Ничего страшного, если пока нет ясного ответа.',
    identity:'Я Ali, цифровой помощник, а не врач, психотерапевт или ясновидящий. О работе специалиста могу рассказать по опубликованной информации.',
    photo:'По фотографии я не могу достоверно определить состояние здоровья, «энергию» или причину жизненных событий. Для начала достаточно вашего описания.',
    requirements:'Достаточно пары слов о том, что важно. Фото не нужно.',
    referral:'Рад, что вы нашли нас. ',
    hold:'Хорошо, не будем задавать новые вопросы. Можно закончить здесь или проверить краткое резюме уже сказанного.',
    ready:'Спасибо, главное уже понятно 🌿 Можно посмотреть черновик. Мастеру ничего не уйдёт без вашего согласия.',
    more:'Добавлю эту деталь к вашим словам. Можно посмотреть черновик, когда захотите.',
    labels:{goal:'Чего хочет клиент (его слова)',challenge:'Трудность (его слова)',situation:'Текущая ситуация (его слова)',source:'Как нашёл нас (его слова)',other:'Другие слова клиента'},
  },
  en:{
    questions:{
      goal:'What would you most like to understand or change in your situation?',
      challenge:'What is making that difficult for you right now?',
      situation:'What is happening in your life at the moment that makes this important now?',
    },
    hello:"Hi! I'm Ali, the Holistic House digital assistant.",
    empathy:'That sounds hard. Thanks for telling me.',
    thanks:'I hear you.',
    clarify:'A couple of sentences is enough.',
    first:"No need to apologize. It's fine to start in your own words.",
    unsure:"It's okay not to have a clear answer yet.",
    identity:"I'm Ali, a digital assistant, not a doctor, therapist or psychic. I can explain the practitioner's published services.",
    photo:"I can't reliably assess health, 'energy' or the cause of life events from a photo. Your description is enough to begin.",
    requirements:"A few words about what matters are enough. No photo is needed.",
    referral:"Thanks for finding us. ",
    hold:"Of course. We can stop asking questions. You may end here or review a short summary of what you've already shared.",
    ready:'Thank you, I have enough for a short draft 🌿 You decide whether to send it to the practitioner.',
    more:'I can include that detail. You can review the draft whenever you like.',
    labels:{goal:"Client's desired outcome (their words)",challenge:"Difficulty (their words)",situation:"Current situation (their words)",source:"How the client found us (their words)",other:"Other words from the client"},
  },
  es:{
    questions:{
      goal:'¿Qué te gustaría comprender o cambiar de tu situación?',
      challenge:'¿Qué te está dificultando lograrlo ahora?',
      situation:'¿Qué está pasando en tu vida que hace importante este asunto ahora?',
    },
    hello:'Hola, soy Ali, el asistente digital de Holistic House.',
    empathy:'Suena difícil. Gracias por contarlo.',
    thanks:'Te escucho.',
    clarify:'Bastan unas pocas frases.',
    first:'No tienes que disculparte. Puedes empezar con tus propias palabras.',
    unsure:'Está bien si todavía no tienes una respuesta clara.',
    identity:'Soy Ali, un asistente digital, no médico, psicoterapeuta ni vidente. Puedo explicar los servicios publicados del profesional.',
    photo:'No puedo evaluar de forma fiable la salud, la «energía» ni las causas de los acontecimientos a partir de una foto. Basta con tu descripción.',
    requirements:'Basta con contar lo que importa. No hace falta una foto.',
    referral:'Gracias por encontrarnos. ',
    hold:'Por supuesto. No haremos más preguntas. Puedes terminar aquí o revisar un resumen de lo que ya has contado.',
    ready:'Gracias, ya tengo lo esencial 🌿 Tú decides si enviamos el borrador al profesional.',
    more:'Puedo añadir ese detalle. Revisa el borrador cuando quieras.',
    labels:{goal:'Meta del cliente (sus palabras)',challenge:'Dificultad (sus palabras)',situation:'Situación actual (sus palabras)',source:'Cómo nos encontró (sus palabras)',other:'Otras palabras del cliente'},
  },
});
const DANGER=/(?:суицид|покончить с собой|убить себя|хочу умереть|не могу дышать|боль в груди|suicid|kill myself|want to die|chest pain|cannot breathe|no puedo respirar|quiero morir|dolor en el pecho)/iu;
const HOLD=/^(?:хватит|не хочу (?:отвечать|продолжать|говорить)|без вопросов|достаточно вопросов|stop questions|no more questions|please stop asking|i don't want to answer|basta|no más preguntas|no quiero responder)[!.\s]*$/iu;
const UNSURE=/^(?:не знаю|не уверен[а]?|не понимаю|сложно сказать|i don't know|not sure|i'm not sure|no sé|no estoy segur[oa])[.!…\s]*$/iu;
const GREETING=/^(?:hi|hey|hello|привет|здравствуйте|добрый день|hola|buenas)(?:[!.\s🌿]*)$/iu;
const REFERRAL=/(?:\b(?:got|found|received|followed)\b.{0,65}\b(?:link|meet\s*up|eventbrite|telegram|website|site|app)\b|\b(?:came|arrived)\s+from\s+(?:the\s+)?(?:meet\s*up|eventbrite|telegram|website|site|app)\b|(?:наш[её]л|увидел[а]?|приш[её]л|переш[её]л|получил[а]?).{0,55}(?:ссылк|meet\s*up|митап|телеграм|сайт)|(?:encontr[eé]|recib[ií]|llegu[eé]).{0,55}(?:enlace|meet\s*up|sitio))/iu;
const GENERAL_HELP=/^(?:i need help|i just need help|please help me|нужна помощь|мне нужна помощь|помогите мне|necesito ayuda|necesito ayuda por favor)[!.\s]*$/iu;
const FIRST=/(?:sorry|first time|извините|простите|впервые|первый раз|perd[oó]n|primera vez)/iu;
const PHOTO=/(?:photo\s*(?:scan|reading|analysis)|scan\s*(?:my|a)\s*photo|check\s*my\s*energy|pls\s*chk\s*my\s*energy|считыван.{0,15}(?:фото|фотографии)|диагностик.{0,12}(?:по фото|по фотографии)|провер.{0,12}энерг|leer.{0,10}foto|lectura.{0,10}foto)/iu;
const IDENTITY=/(?:are you.{0,30}(?:therapist|physic|psychic|doctor|human)|you (?:are|r) (?:a |the )?(?:therapist|physic|psychic|doctor)|ты.{0,25}(?:врач|психотерапевт|экстрасенс|человек)|вы.{0,25}(?:врач|психотерапевт|экстрасенс|человек)|eres.{0,20}(?:terapeuta|m[eé]dico|vidente))/iu;
const HELP_ONLY=/^(?:help(?: me)?(?: please| pls)?(?: lol)?|помогите(?: пожалуйста)?|ayuda(?: por favor)?)[!.\s]*$/iu;
const WHAT_NEEDED=/(?:what (?:information|details) (?:do you|would you) need|what do you need exactly|что (?:нужно|необходимо) (?:рассказать|указать|описать)|какие данные вам нужны|qu[eé] informaci[oó]n necesitas)/iu;
// Recognize only situations the visitor explicitly describes; never infer a diagnosis.
const DIFFICULT=/(?:failing at life|negative event|everything is going wrong|i feel lost|struggling|i'm overwhelmed|anxious|stressed|worried|argu(?:e|ing|ment)|conflict|breakup|exhausted|меня всё достало|всё плохо|неудач|много негативн|сложн.{0,15}период|тревож|ссор|поссор|конфликт|расстал|расставан|обидно|выгор|уволил|меня бросил|estoy perdiendo|me siento perdid|muchos problemas|ansios|preocupad|discusi|discut|pele[aeé]|agotad|estresad)/iu;
const LABELS={
 goal:/^(?:(?:1)[).:\-]?\s*)?(?:(?:my|моя|mi)\s+)?(?:goal(?:\/desire)?|desire|цель|желание|meta|deseo)\s*(?::|[-—]|is|это|es)\s*(.+)$/iu,
 challenge:/^(?:(?:2)[).:\-]?\s*)?(?:(?:my|моя|mi)\s+)?(?:challenge|problem|obstacle|проблема|препятствие|сложность|problema|obst[aá]culo|dificultad)\s*(?::|[-—]|is|это|es)\s*(.+)$/iu,
 situation:/^(?:(?:3)[).:\-]?\s*)?(?:(?:my|моя|mi)\s+)?(?:current situation|right now|currently|сейчас|ситуация сейчас|ahora|situaci[oó]n actual)\s*(?::|[-—]|is|это|es)\s*(.+)$/iu,
};
const boundedText=value=>String(value||'').trim().slice(0,1000);

/** Conversational control and explanation are not client situation evidence. */
const META_CONFUSED=/^(?:что|чего|что это|что именно|в смысле|не понял[а]?|не понимаю(?: вопрос)?|поясните|что вы имеете в виду|what|huh|pardon|sorry what|i (?:don't|do not) understand|what do you mean|qué|que|no entiendo)$/iu;
const META_PHOTO=/^(?:(?:а\s+)?(?:почему|зачем|для чего)(?:\s+[\p{L}]+){0,4}\s+фото(?:графи[яю])?|фото(?:графи[яю])?\s+(?:зачем|почему)|why (?:do you (?:need|ask for)\s+)?(?:a\s+|the\s+)?(?:photo|picture)|por qu[eé] (?:la\s+)?foto|para qu[eé] (?:la\s+)?foto)$/iu;
const META_CONSENT=/^(?:i agree(?:,\s*|\s+)let['’]s talk|i agree|(?:я )?согласен(?:,?\s*продолжим)?|давайте (?:поговорим|начн[её]м)|да,?\s*давайте|ok(?:ay)?|ага|хорошо|i'm ready|let['’]s talk|hablemos|s[ií],?\s*hablemos)$/iu;
const PERSONAL_QUERY=/(?:почему (?:я|мне)|как (?:мне|я)|что (?:со мной|мне делать)|(?:какая|какие).{0,10}у меня|why (?:do i|am i)|how (?:do i|can i)|what (?:should i|is happening to me)|por qu[eé] (?:yo|me)|c[oó]mo (?:puedo|me))/iu;
const META_RESPONSE=Object.freeze({
  ru:{confused:'Я не очень понятно спросил, извините.',photo:'Фото не требуется. Для начала достаточно ваших слов.',consent:'Хорошо, давайте начнём.',
    ready:'Можем продолжить разговор, если хотите.',questions:{goal:'С какой ситуацией хотите разобраться?',challenge:'Что в этой ситуации труднее всего?',situation:'Что происходит сейчас?'}},
  en:{confused:"I wasn't clear, sorry.",photo:"No photo is needed. We can begin with your words.",consent:"Great, let's begin.",
    ready:"We can keep talking if you'd like.",questions:{goal:'What situation would you like help with?',challenge:'What feels most difficult about it?',situation:'What is happening now?'}},
  es:{confused:'No me expliqué bien, perdona.',photo:'No necesitas una foto. Podemos empezar con tus palabras.',consent:'Bien, empecemos.',
    ready:'Podemos seguir conversando si quieres.',questions:{goal:'¿Qué situación te gustaría abordar?',challenge:'¿Qué es lo más difícil de esa situación?',situation:'¿Qué está pasando ahora?'}},
});
function intakeMetaKind(value){
  const raw=String(value||'').trim().replace(/^[¿¡]+/u,'').replace(/[?？!。.,\s]+$/gu,'').trim().replace(/\s+/gu,' ');
  if(raw.length>110)return null;
  if(META_CONFUSED.test(raw))return 'confused';
  if(META_PHOTO.test(raw))return 'photo';
  if(META_CONSENT.test(raw))return 'consent';
  return null;
}
function isClientIntakeEvidence(value){
  const raw=String(value||'').trim();
  if(raw.length<3||intakeMetaKind(raw)||GREETING.test(raw)||HOLD.test(raw)||
     UNSURE.test(raw)||GENERAL_HELP.test(raw)||HELP_ONLY.test(raw)||
     IDENTITY.test(raw)||PHOTO.test(raw)||WHAT_NEEDED.test(raw)||
     standaloneQuestion(raw)||REFERRAL.test(raw))return false;
  return true;
}

const correctStage=value=>STEPS.includes(value)?value:'goal';
const nextStage=(stage,slots={})=>{
 let index=STEPS.indexOf(correctStage(stage))+1;
 while(index<3&&slots[STEPS[index]])index++;
 return STEPS[Math.min(index,3)];
};
const normalizedSlots=slots=>Object.fromEntries(['goal','challenge','situation','source']
  .flatMap(key=>typeof slots?.[key]==='string'&&slots[key].trim()&&
      (key==='source'||isClientIntakeEvidence(slots[key]))
    ?[[key,slots[key].trim().slice(0,key==='source'?180:360)]]:[]));
function explicitFields(message){
 const fields={};
 for(const line of message.split(/[\n;]+/).map(x=>x.trim()).filter(Boolean)){
   for(const [key,pattern] of Object.entries(LABELS)){
     const match=pattern.exec(line);
     if(match)fields[key]=match[1].trim().slice(0,360);
   }
 }
 return fields;
}
const standaloneQuestion=value=>value.length<=250&&
  (intakeMetaKind(value)!==null||IDENTITY.test(value)||PHOTO.test(value)||WHAT_NEEDED.test(value)||
   (/[?？]\s*$/.test(value)&&!PERSONAL_QUERY.test(value)));
function questionPrefix(value,copy){
 if(PHOTO.test(value))return copy.photo;
 if(IDENTITY.test(value))return copy.identity;
 if(WHAT_NEEDED.test(value))return copy.requirements;
 return copy.requirements;
}
function beginning(value,copy){
 if(FIRST.test(value))return copy.first;
 if(DIFFICULT.test(value))return copy.empathy;
 return copy.thanks;
}
/** Recover safely from old V3 sessions without resetting their completed turns. */
export function aliIntakeStageFromTurns(turns=[],shortService=false){
 const rows=(Array.isArray(turns)?turns:[]).filter(row=>
   row&&['user','assistant'].includes(row.role)&&typeof row.text==='string'&&
   (row.role==='assistant'||isClientIntakeEvidence(row.text)));
 const index=rows.findLastIndex(row=>row.role==='user');
 if(index<0)return 'goal';
 const plan=planDialogueDirectorTurn({message:rows[index].text,locale:'en',
   history:rows.slice(0,index),selectedService:Boolean(shortService),
   safety:{status:'clear'}});
 const e=plan.evidence;
 if(e.goal&&e.challenge&&(e.situation||shortService))return 'ready';
 if(e.goal&&e.challenge)return shortService?'ready':'situation';
 if(e.goal)return 'challenge';
 return 'goal';
}
/** At most ONE question per response. All slot values are verbatim user-authored. */
export function aliGuidedIntakeTurn({message='',locale='en',stage='goal',
  slots={},turns=[],serviceRequest=null,offerId=null,supportSelection=null}={}){
 const lang=LOCALES.has(locale)?locale:'en';
 const copy=COPY[lang],raw=boundedText(message),phase=correctStage(stage);
 const chosen=aliSecretarySupportJourney(supportSelection,lang)||
   aliServiceScenario(serviceRequest,lang,offerId);
 const questions=chosen?.questions||copy.questions;
 const readyText=chosen?aliServiceReady(lang,chosen.title):copy.ready;
 const safeSlots=normalizedSlots(slots);
 if(!raw||raw.startsWith('/')||DANGER.test(raw))return null;
 // Selected services only gather logistics, never personal therapy details.
 // The separate consented Free Diagnostic planner remains unchanged.
 if(chosen){
   const link=aliSecretaryOfferLinkReply(raw,lang,serviceRequest,offerId);
   if(link)return {stage:phase,slots:slots||{},kind:'link',reply:link};
   const faq=(/[?？]\s*$/.test(raw)||/^(?:price|cost|сколько стоит|цена|стоимость|precio)$/iu.test(raw))
     ?aliServiceFaq(raw,lang,serviceRequest,offerId):null;
   if(faq)return {stage:phase,slots:slots||{},kind:'faq',reply:faq};
   return aliServiceSecretaryTurn({message:raw,locale:lang,stage:phase,slots,
     kind:chosen.journeyKind||'session',url:chosen.publicUrl||null});
 }
 if(HOLD.test(raw))return {stage:'ready',slots:safeSlots,reply:copy.hold};
 // Explicit refusal to book is a boundary, not the visitor's therapy goal.
 if(BOOKING_DECLINE.test(raw))return {stage:phase,slots:safeSlots,kind:'boundary',
   reply:lang==='ru'?'Конечно, без записи 🌿 Можем просто поговорить.':
     lang==='es'?'Claro, sin reserva 🌿 Podemos conversar.':
       'Of course, no booking 🌿 We can simply talk.'};
 // A request for an existing course/test/booking page gets its verified URL,
 // never an extra questionnaire or an unverified payment promise.
 const link=aliSecretaryOfferLinkReply(raw,lang,serviceRequest,offerId);
 if(link)return {stage:phase,slots:safeSlots,kind:'link',reply:link};
 const meta=intakeMetaKind(raw);
 if(meta){
   const simple=META_RESPONSE[lang];
   return {stage:phase,slots:safeSlots,kind:'meta',reply:simple[meta]+
     // In an already-selected service, answer the interruption first.
     // Keep the unanswered slot without pushing another questionnaire item.
     (chosen||phase==='ready'?'':' '+simple.questions[phase])};
 }
 if(BOOKING_REQUEST.test(raw)&&!BOOKING_DECLINE.test(raw)){
   if(!chosen)return {stage:phase,slots:safeSlots,reply:BOOKING_QUESTION[lang]};
   safeSlots.goal ||=raw.slice(0,360);
   return {stage:'ready',slots:safeSlots,reply:readyText};
 }
 // Use the shared Wave empathy layer only for stated feelings, never guessing.
 const empathy=chosen?planEmpathyTurn({message:raw,locale:lang,history:turns,
   role:'secretary',safety:{status:'clear'}}):null;
 const opener=empathy?.locale===lang&&empathy.reflection?
   empathy.reflection:beginning(raw,copy);
 if(standaloneQuestion(raw))return {stage:phase,slots:safeSlots,
   // Visitors may ask about cost, identity, photos or format without being
   // pushed into a new question. The unfinished slot survives untouched.
   reply:(aliServiceFaq(raw,lang,serviceRequest,offerId)||questionPrefix(raw,copy))+
     (chosen||phase==='ready'?'':'\n\n'+questions[phase])};
 if(GREETING.test(raw)||HELP_ONLY.test(raw))return {stage:phase,slots:safeSlots,
   reply:copy.hello+(phase==='ready'?'':'\n\n'+questions[phase])};
 if(REFERRAL.test(raw)&&!/\b(?:my goal|my desire|i want|i would like|my challenge)\b|(?:моя цель|я хочу|моя проблема|mi meta|quiero|mi problema)/iu.test(raw)){
   // A referral is a useful, client-stated lead source, NOT a personal goal.
   if(!safeSlots.source)safeSlots.source=raw.slice(0,180);
   return {stage:phase,slots:safeSlots,
     reply:copy.referral+(phase==='ready'?copy.more:questions[phase])};
 }
 if(GENERAL_HELP.test(raw))return {stage:phase,slots:safeSlots,
   reply:copy.clarify+(phase==='ready'?'':' '+questions[phase])};
 if(/^(?:да|нет|ага|ок|окей|угу|yes|no|ok|okay|vale|sí|si)[.!\s]*$/iu.test(raw))
   return {stage:phase,slots:safeSlots,reply:phase==='ready'?copy.more:
     copy.clarify+' '+(questions[phase]||questions.goal)};
 if(UNSURE.test(raw)){
   const prior=(Array.isArray(turns)?turns:[]).filter(x=>
     x?.role==='user'&&UNSURE.test(String(x.text||'').trim()));
   if(prior.length<1)return {stage:phase,slots:safeSlots,
     reply:copy.unsure+(phase==='ready'?'':' '+copy.clarify+' '+questions[phase])};
   const skip=nextStage(phase,safeSlots);
   return {stage:skip,slots:safeSlots,reply:copy.unsure+
     (skip==='ready'?' '+readyText:' '+questions[skip])};
 }
 const named=explicitFields(raw);
 Object.assign(safeSlots,named);
 if(Object.keys(named).length===3||
   (chosen&&safeSlots.goal&&safeSlots.challenge))
   return {stage:'ready',slots:safeSlots,reply:readyText};
 if(phase==='ready')return {stage:'ready',slots:safeSlots,reply:copy.more};
 // A visitor may already explain both the desired change and obstacle in
 // one sentence. Use only their own two clauses, without interpreting them.
 if(chosen&&phase==='goal'&&!safeSlots.goal&&!safeSlots.challenge&&
    /\b(?:i want|i need|i'd like|my goal|quiero|necesito)\b|(?:хочу|хотел[аи]? бы|моя цель)/iu.test(raw)){
   const marker=/\b(?:but|because|however|pero|porque)\b|(?:но|потому что|из-за|мешает)/iu.exec(raw);
   if(marker){
     const left=raw.slice(0,marker.index).trim(),right=raw.slice(marker.index+marker[0].length).trim();
     if(left.length>=10&&right.length>=12){
       safeSlots.goal=left.slice(0,360);
       safeSlots.challenge=right.slice(0,360);
       return {stage:'ready',slots:safeSlots,reply:readyText};
     }
   }
 }
 // A short first-time apology or vague first message isn't a stated goal.
 if(phase==='goal'&&((FIRST.test(raw)&&raw.length<85)||
   ((DIFFICULT.test(raw)||PERSONAL_QUERY.test(raw))&&
    !/(?:want to|would like|wish to|i need|my goal|хочу|хотел[ао] бы|моя цель|мне нужно|хотелось бы|quiero|me gustaría|necesito|deseo)/iu.test(raw))||
   /^(?:my happening life|my life|моя жизнь|life is hard|lots of negative events|mi vida)$/iu.test(raw))){
   // A difficult situation is NOT the same as a desired result. Preserve only
   // the client's words in the situation slot, with no inferred goal.
   if((DIFFICULT.test(raw)||PERSONAL_QUERY.test(raw))&&raw.length>=10&&!safeSlots.situation)
     safeSlots.situation=raw.slice(0,360);
   const priorUser=(Array.isArray(turns)?turns:[]).filter(t=>
     t?.role==='user'&&typeof t.text==='string').length;
   const question=priorUser>0
     ?(lang==='ru'?'Если представить, что ситуация стала лучше, что изменилось бы первым?'
       :lang==='es'?'Si las cosas mejoraran, ¿qué te gustaría que cambiara primero?'
       :'If things began to improve, what would you most want to change first?')
     :questions.goal;
   return {stage:phase,slots:safeSlots,reply:opener+' '+question};
 }
 if(!safeSlots[phase])safeSlots[phase]=raw.slice(0,360);
 // For a selected service, two meaningful answers are sufficient. Never
 // require an extra "current situation" answer just because a slot exists.
 const next=chosen&&phase==='challenge'&&safeSlots.goal?'ready':nextStage(phase,safeSlots);
 return {stage:next,slots:safeSlots,reply:next==='ready'
   ?readyText:opener+' '+questions[next]};
}
/** Client-visible draft, never an evaluation, photo reading or CRM action. */
export function aliGuidedIntakeSummary({locale='en',slots={},turns=[],serviceRequest=null,
 offerId=null,supportSelection=null}={}){
 const lang=LOCALES.has(locale)?locale:'en',copy=COPY[lang];
 const selected=aliSecretarySupportJourney(supportSelection,lang)||
   aliServiceScenario(serviceRequest,lang,offerId);
 if(selected)return aliServiceSecretarySummary({locale:lang,slots,title:selected.title,
   kind:selected.journeyKind||'session'});
 const chosen=normalizedSlots(slots);
 const text=Object.entries(copy.labels).filter(([key])=>key!=='other'&&chosen[key])
   .map(([key,label])=>label+': '+chosen[key]);
 const extra=(Array.isArray(turns)?turns:[]).filter(x=>
   x?.role==='user'&&isClientIntakeEvidence(x.text)&&
   !Object.values(chosen).some(v=>x.text.trim().startsWith(v)))
   .slice(-2).map(x=>x.text.trim().slice(0,180));
 // A consent message, confusion, a photo FAQ or a referral alone cannot
 // become the user's goal/problem or authorize a client-facing draft.
 if(!chosen.goal&&!chosen.challenge&&!chosen.situation&&!extra.length)return null;
 if(extra.length)text.push(copy.labels.other+': '+extra.join(' / '));
 return text.join('\n').slice(0,900)||null;
}
