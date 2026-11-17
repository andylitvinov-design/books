/**
 * Ali's small, source-bounded Secretary intake journey.
 * Pure presentation and user-authored facts only. The signed caller owns
 * consent, encrypted session state, STOP, CRM review and provider delivery.
 * This module never identifies a person, diagnoses or reads photographs.
 */
import {aliServiceScenario,aliServiceReady,aliServiceFaq} from './ali-service-scenario.mjs';
const LOCALES=new Set(['ru','en','es']);
const STEPS=Object.freeze(['goal','challenge','situation','ready']);
const COPY=Object.freeze({
  ru:{
    questions:{
      goal:'Что вы больше всего хотите понять или изменить в своей ситуации?',
      challenge:'Что сейчас больше всего мешает этому?',
      situation:'Что происходит в вашей жизни сейчас и почему этот вопрос стал важен именно теперь?',
    },
    hello:'Здравствуйте! Я Ali, цифровой помощник Holistic House.',
    empathy:'Похоже, сейчас у вас непростой период. Спасибо, что поделились.',
    thanks:'Спасибо, что рассказали.',
    clarify:'Можно ответить в двух-трёх предложениях.',
    first:'Не нужно извиняться — можно начать с самых простых слов.',
    unsure:'Ничего страшного, если пока нет ясного ответа.',
    identity:'Я Ali, цифровой помощник, а не врач, психотерапевт или ясновидящий. О работе специалиста могу рассказать по опубликованной информации.',
    photo:'По фотографии я не могу достоверно определить состояние здоровья, «энергию» или причину жизненных событий. Для начала достаточно вашего описания.',
    requirements:'Чтобы подготовить запрос, достаточно коротко описать желаемый результат, трудность и то, что происходит сейчас. Фото не требуется.',
    referral:'Рад, что вы нашли нас. ',
    hold:'Хорошо, не будем задавать новые вопросы. Можно закончить здесь или проверить краткое резюме уже сказанного.',
    ready:'Спасибо. Для первого разбора информации достаточно. При желании позже можно добавить рисунок «Я — цель — препятствие» через согласованный с мастером защищённый способ; фотография не обязательна. Нажмите «Завершить интервью», чтобы проверить резюме. Мастеру ничего не отправится без вашего подтверждения.',
    more:'Это уточнение можно учесть при подготовке резюме. Нажмите «Завершить интервью», когда захотите проверить запрос.',
    labels:{goal:'Чего хочет клиент (его слова)',challenge:'Трудность (его слова)',situation:'Текущая ситуация (его слова)',source:'Как нашёл нас (его слова)',other:'Другие слова клиента'},
  },
  en:{
    questions:{
      goal:'What would you most like to understand or change in your situation?',
      challenge:'What is making that difficult for you right now?',
      situation:'What is happening in your life at the moment that makes this important now?',
    },
    hello:"Hi! I'm Ali, the Holistic House digital assistant.",
    empathy:'That sounds like a difficult stretch. Thank you for sharing it.',
    thanks:'Thank you for telling me.',
    clarify:'A couple of sentences is enough.',
    first:"No need to apologize. It's fine to start in your own words.",
    unsure:"It's okay not to have a clear answer yet.",
    identity:"I'm Ali, a digital assistant, not a doctor, therapist or psychic. I can explain the practitioner's published services.",
    photo:"I can't reliably assess health, 'energy' or the cause of life events from a photo. Your description is enough to begin.",
    requirements:"To prepare your request, a short description of your goal, what's challenging and what's happening now is enough. A photo isn't required.",
    referral:"Thanks for finding us. ",
    hold:"Of course. We can stop asking questions. You may end here or review a short summary of what you've already shared.",
    ready:'Thank you. This is enough for an initial review. If you wish, you can later add a simple “Me — Goal — Obstacle” drawing through a secure method agreed with the practitioner; a photo is optional, not required. Choose “Finish interview” to check the summary. Nothing goes to the practitioner without your approval.',
    more:'I can include that as an additional detail. Choose “Finish interview” whenever you want to review your request.',
    labels:{goal:"Client's desired outcome (their words)",challenge:"Difficulty (their words)",situation:"Current situation (their words)",source:"How the client found us (their words)",other:"Other words from the client"},
  },
  es:{
    questions:{
      goal:'¿Qué te gustaría comprender o cambiar de tu situación?',
      challenge:'¿Qué te está dificultando lograrlo ahora?',
      situation:'¿Qué está pasando en tu vida que hace importante este asunto ahora?',
    },
    hello:'Hola, soy Ali, el asistente digital de Holistic House.',
    empathy:'Parece que estás pasando por una etapa difícil. Gracias por contarlo.',
    thanks:'Gracias por compartirlo.',
    clarify:'Bastan unas pocas frases.',
    first:'No tienes que disculparte. Puedes empezar con tus propias palabras.',
    unsure:'Está bien si todavía no tienes una respuesta clara.',
    identity:'Soy Ali, un asistente digital, no médico, psicoterapeuta ni vidente. Puedo explicar los servicios publicados del profesional.',
    photo:'No puedo evaluar de forma fiable la salud, la «energía» ni las causas de los acontecimientos a partir de una foto. Basta con tu descripción.',
    requirements:'Para preparar tu solicitud, basta describir la meta, la dificultad y lo que ocurre ahora. No hace falta una foto.',
    referral:'Gracias por encontrarnos. ',
    hold:'Por supuesto. No haremos más preguntas. Puedes terminar aquí o revisar un resumen de lo que ya has contado.',
    ready:'Gracias. Es suficiente para una primera revisión. Si quieres, más adelante puedes añadir un dibujo «Yo — Meta — Obstáculo» por un medio seguro acordado con el profesional; la foto es opcional. Elige «Terminar entrevista» para comprobar el resumen. No se enviará nada sin tu confirmación.',
    more:'Puedo incluirlo como un detalle adicional. Elige «Terminar entrevista» cuando quieras revisar tu solicitud.',
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
const DIFFICULT=/(?:failing at life|negative event|everything is going wrong|i feel lost|struggling|i'm overwhelmed|меня всё достало|всё плохо|неудач|много негативн|сложн.{0,15}период|estoy perdiendo|me siento perdid|muchos problemas)/iu;
const LABELS={
 goal:/^(?:(?:1)[).:\-]?\s*)?(?:(?:my|моя|mi)\s+)?(?:goal(?:\/desire)?|desire|цель|желание|meta|deseo)\s*(?::|[-—]|is|это|es)\s*(.+)$/iu,
 challenge:/^(?:(?:2)[).:\-]?\s*)?(?:(?:my|моя|mi)\s+)?(?:challenge|problem|obstacle|проблема|препятствие|сложность|problema|obst[aá]culo|dificultad)\s*(?::|[-—]|is|это|es)\s*(.+)$/iu,
 situation:/^(?:(?:3)[).:\-]?\s*)?(?:(?:my|моя|mi)\s+)?(?:current situation|right now|currently|сейчас|ситуация сейчас|ahora|situaci[oó]n actual)\s*(?::|[-—]|is|это|es)\s*(.+)$/iu,
};
const boundedText=value=>String(value||'').trim().slice(0,1000);
const correctStage=value=>STEPS.includes(value)?value:'goal';
const nextStage=(stage,slots={})=>{
 let index=STEPS.indexOf(correctStage(stage))+1;
 while(index<3&&slots[STEPS[index]])index++;
 return STEPS[Math.min(index,3)];
};
const normalizedSlots=slots=>Object.fromEntries(['goal','challenge','situation','source']
  .flatMap(key=>typeof slots?.[key]==='string'&&slots[key].trim()
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
  (/[?？]\s*$/.test(value)||IDENTITY.test(value)||PHOTO.test(value)||WHAT_NEEDED.test(value));
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
export function aliIntakeStageFromTurns(turns=[]){
 const answered=(Array.isArray(turns)?turns:[]).filter(turn=>
   turn?.role==='user'&&typeof turn.text==='string'&&
   turn.text.trim().length>=3&&!GREETING.test(turn.text.trim())&&
   !standaloneQuestion(turn.text.trim())&&!UNSURE.test(turn.text.trim()));
 return STEPS[Math.min(3,answered.length)];
}
/** At most ONE question per response. All slot values are verbatim user-authored. */
export function aliGuidedIntakeTurn({message='',locale='en',stage='goal',
  slots={},turns=[],serviceRequest=null}={}){
 const lang=LOCALES.has(locale)?locale:'en';
 const copy=COPY[lang],raw=boundedText(message),phase=correctStage(stage);
 const chosen=aliServiceScenario(serviceRequest,lang);
 const questions=chosen?.questions||copy.questions;
 const readyText=chosen?aliServiceReady(lang,chosen.title):copy.ready;
 const safeSlots=normalizedSlots(slots);
 if(!raw||raw.startsWith('/')||DANGER.test(raw))return null;
 if(HOLD.test(raw))return {stage:'ready',slots:safeSlots,reply:copy.hold};
 if(standaloneQuestion(raw))return {stage:phase,slots:safeSlots,
   reply:(aliServiceFaq(raw,lang,serviceRequest)||questionPrefix(raw,copy))+(phase==='ready'?'':'\n\n'+questions[phase])};
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
 if(UNSURE.test(raw)){
   const prior=(Array.isArray(turns)?turns:[]).filter(x=>
     x?.role==='user'&&UNSURE.test(String(x.text||'').trim()));
   if(prior.length<1)return {stage:phase,slots:safeSlots,
     reply:copy.unsure+(phase==='ready'?'':' '+copy.clarify+' '+questions[phase])};
   const skip=nextStage(phase,safeSlots);
   return {stage:skip,slots:safeSlots,reply:copy.unsure+
     (skip==='ready'?' '+readyText:' '+copy.questions[skip])};
 }
 const named=explicitFields(raw);
 Object.assign(safeSlots,named);
 if(Object.keys(named).length===3)return {stage:'ready',slots:safeSlots,
   reply:readyText};
 if(phase==='ready')return {stage:'ready',slots:safeSlots,reply:copy.more};
 // A short first-time apology or vague first message isn't a stated goal.
 if(phase==='goal'&&((FIRST.test(raw)&&raw.length<85)||
   (DIFFICULT.test(raw)&&!/(?:want to|would like|wish to|i need|my goal|хочу|хотел[ао] бы|моя цель|quiero|me gustaría|deseo)/iu.test(raw))||
   /^(?:my happening life|my life|моя жизнь|life is hard|lots of negative events|mi vida)$/iu.test(raw))){
   // A difficult situation is NOT the same as a desired result. Preserve only
   // the client's words in the situation slot, with no inferred goal.
   if(DIFFICULT.test(raw)&&raw.length>25&&!safeSlots.situation)
     safeSlots.situation=raw.slice(0,360);
   const priorUser=(Array.isArray(turns)?turns:[]).filter(t=>
     t?.role==='user'&&typeof t.text==='string').length;
   const question=priorUser>0
     ?(lang==='ru'?'Если представить, что ситуация стала лучше, что изменилось бы первым?'
       :lang==='es'?'Si las cosas mejoraran, ¿qué te gustaría que cambiara primero?'
       :'If things began to improve, what would you most want to change first?')
     :questions.goal;
   return {stage:phase,slots:safeSlots,reply:beginning(raw,copy)+' '+question};
 }
 if(!safeSlots[phase])safeSlots[phase]=raw.slice(0,360);
 const next=nextStage(phase,safeSlots);
 return {stage:next,slots:safeSlots,reply:next==='ready'
   ?readyText:beginning(raw,copy)+' '+questions[next]};
}
/** Client-visible draft, never an evaluation, photo reading or CRM action. */
export function aliGuidedIntakeSummary({locale='en',slots={},turns=[]}={}){
 const lang=LOCALES.has(locale)?locale:'en',copy=COPY[lang];
 const chosen=normalizedSlots(slots);
 const text=Object.entries(copy.labels).filter(([key])=>key!=='other'&&chosen[key])
   .map(([key,label])=>label+': '+chosen[key]);
 const extra=(Array.isArray(turns)?turns:[]).filter(x=>
   x?.role==='user'&&typeof x.text==='string'&&x.text.trim()&&
   !standaloneQuestion(x.text.trim())&&!GREETING.test(x.text.trim())&&
   !UNSURE.test(x.text.trim())&&!HOLD.test(x.text.trim())&&
   !Object.values(chosen).some(v=>x.text.trim().startsWith(v)))
   .slice(-2).map(x=>x.text.trim().slice(0,180));
 if(text.length&&extra.length)text.push(copy.labels.other+': '+extra.join(' / '));
 if(!text.length){
   const verbatim=(Array.isArray(turns)?turns:[]).filter(x=>
     x?.role==='user'&&typeof x.text==='string'&&x.text.trim()&&
     !standaloneQuestion(x.text.trim())).slice(-3).map(x=>x.text.trim().slice(0,220));
   if(verbatim.length)text.push(copy.labels.other+': '+verbatim.join(' / '));
 }
 return text.join('\n').slice(0,900)||null;
}
