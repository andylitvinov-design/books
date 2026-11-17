/**
 * Sales Mind: consent-respecting, source-bounded service dialogue for Ali.
 * This is a pure role of the existing Holistic Intelligence, not an LLM,
 * webhook, CRM, provider, profiler or checkout. It performs no I/O.
 * An authenticated caller must apply its existing safety/consent gates first.
 */
import {resolveConsultantSuggestion} from '../assist/consultant-mind.mjs';
import {repeatedCoachQuestion} from '../coaching/unified-coach-policy.mjs';

export const SALES_MIND_VERSION = 'wave-sales-mind-v1';
export const SALES_DIALOGUE_STAGES = Object.freeze([
  'explore', 'understand', 'inform', 'consider', 'handoff', 'close',
]);
export const SALES_TALK_MOVES = Object.freeze({
  explore: 'Acknowledge genuine interest without assuming purchase intent.',
  understand: 'Ask one useful, optional question about the requested outcome.',
  inform: 'Answer plainly; distinguish verified facts from unknowns.',
  consider: 'Reflect an objection and offer a relevant, optional alternative.',
  handoff: 'If the client wants to order, hand over to Secretary Mind.',
  close: 'Respect hesitation, refusal, STOP, and topic changes without nudges.',
});
const locales = new Set(['ru','en','es']);
const topic = /(?:услуг|консультац|сесси|сеанс|психотерап|гомеопат|расстанов|рейки|мастер|специалист|практик|курсы?|академ|терапи|коучинг|service|consult|session|therapy|therapist|reiki|constellat|course|practitioner|appointment|servicio|consulta|sesion|sesión|terapia|curso|profesional)/iu;
const danger = /(?:суицид|самоубийств|не хочу жить|убить себя|хочу умереть|боль в груди|не могу дышать|suicid|kill myself|want to die|chest pain|cannot breathe|quiero morir|dolor en el pecho|no puedo respirar)/iu;
const refuse = /(?:^(?:стоп|хватит|отмена|stop|cancel|cancelar|no thanks|не надо|нет, спасибо)[.! ]*$|не (?:хочу|надо|нужно|предлагай(?:те)?) (?:мне )?(?:услуг|консультац|продаж|предложен|ничего)|без продаж|не продавай|не предлагай|просто (?:поговорим|послушай)|(?:don't|do not) (?:sell|pitch|recommend|offer)|no (?:sales|offers|services)|sin ofertas|no quiero (?:servicios|ofertas))/iu;
const reset = /(?:смен(?:им|ить|и) тему|другая тема|новая тема|поговорим о другом|не об этом|change (?:the )?(?:topic|subject)|new topic|something else|not about that|cambiar de tema|otro tema)/iu;
const booking = /(?:запиши(?:те)? меня|хочу записаться|готов(?:а)? (?:записаться|заказать|оплатить)|оформ(?:и|ить) (?:заявк|заказ)|как записаться|как (?:оплатить|заказать)|(?:book|schedule) (?:me|an appointment|a session|now)|(?:ready to|want to) (?:book|pay|order)|how (?:do i|can i) (?:book|pay)|quiero reservar|cómo reservar|como reservar)/iu;
const factual = /(?:сколько (?:это )?стоит|какова цена|какая цена|цена\??|сколько стоит|прайс|how much|what(?:'s| is) the (?:price|cost)|precio|cuánto cuesta|cuanto cuesta|подбер|посовет|рекоменд|сравн|отлича|что лучше|compare|recommend|suggest|which is better|diferenc|comparar|recomiend)/iu;
const explore = /(?:какие (?:у вас )?услуг|что (?:вы )?предлага|интересу(?:ет|юсь)|хочу узнать|просто уточня|расскажите (?:о|про)|как проходит|что входит|для чего|кому подходит|в ч[её]м (?:суть|смысл)|what (?:do you offer|services do you)|interested in|just (?:asking|inquiring|checking)|tell me about|how does .* work|what is included|is .* right for me|me interesa|quiero saber|solo pregunto|qué ofrecen|que ofrecen|cómo funciona|como funciona)/iu;
const objections = Object.freeze([
  ['hesitation', /(?:^|\s)(?:я подумаю|надо подумать|пока не готов[а]?|не сейчас|i(?:'ll| will) think about it|need to think|not ready|maybe later|lo pensar[eé]|no estoy list[oa]|más tarde)(?:[.!?, ]|$)/iu],
  ['price', /(?:дорог[оаи]|слишком дорого|не по карману|не могу позволить|не потяну|expensive|too much|can't afford|cannot afford|too pricey|caro|muy caro|no puedo pagarlo)/iu],
  ['trust', /(?:не доверяю|не уверен[а]? (?:в методе|в специалисте|в вас)|сомневаюсь (?:в методе|в специалисте)|нет отзывов|есть ли отзывы|don't trust|how can i trust|reviews|not sure (?:i trust|about the practitioner)|no confío|reseñas|no me fío)/iu],
  ['effect', /(?:поможет ли|будет ли результат|не уверен[а]?,? что (?:поможет|сработает)|есть ли гаранти|эффективн|результат гарант|will it work|does it help|guarantee|effective|does it actually work|funciona (?:de verdad|realmente)|(?:de verdad|realmente) funciona|es eficaz|garantiz)/iu],
  ['time', /(?:нет времени|мало времени|не успеваю|слишком долго|занят[а]?|no time|too busy|takes too long|don't have time|no tengo tiempo|muy ocupado)/iu],
  ['fit', /(?:не подойдет|не подходит|не уверена?,? что мне подходит|не знаю, подходит ли|боюсь идти|не хочу онлайн|not for me|not sure it's for me|doesn't fit|not comfortable|afraid to attend|no es para mí|no me conviene|no estoy seguro)/iu],
]);
const serviceNames = Object.freeze([
  ['homeopathy',/гомеопат|homeopath|homeopat/iu],
  ['therapy',/образн|символдрам|психотерап|гипнотерап|imagery|psychotherap|hypnotherap|psicoterap|hipnoterap/iu],
  ['constellation',/расстанов|constellat|constelac/iu],
  ['business',/бизнес.?(?:консультац|сесси)|business consult|business coaching|consultor[ií]a de negocios/iu],
  ['reiki',/рейки|reiki/iu],
  ['opora',/опора|opora/iu],
  ['review',/разбор ситуац|situation review|revisi[oó]n.*situaci[oó]n/iu],
]);
const copy = Object.freeze({
  ru:{
    explore:'Расскажу о наших вариантах без необходимости сразу записываться. Что вам сейчас важнее: разобраться в ситуации, освоить практику или поработать со специалистом?',
    inform:'Можно спокойно посмотреть описание метода, формата и ограничений на странице услуги. Что именно хотите уточнить: как проходит работа или для каких задач она предназначена?',
    price:'Понимаю, стоимость важна. Не стану обещать скидку или цену, которую не могу подтвердить. Хотите узнать о бесплатном разборе ситуации как первом шаге?',
    namedPrice:'Понимаю, что бюджет важен. Не буду предлагать несвязанную услугу вместо выбранной или обещать скидку. Хотите уточнить условия именно этого предложения у специалиста?',
    trust:'Разумно сначала разобраться, кому вы доверяете. Можно изучить метод, опыт специалиста и подтверждённые отзывы, если они опубликованы; я не стану придумывать отзывы. Хотите посмотреть описание?',
    effect:'Предсказать индивидуальный результат или гарантировать его нельзя. Важно сравнить цель, подход и ограничения. Хотите посмотреть, как описан метод?',
    time:'Не обязательно принимать решение сейчас. Хотите сначала посмотреть, какие форматы указаны в описании?',
    fit:'Не стоит выбирать услугу наугад. Что именно вызывает сомнения: сам подход или формат встречи?',
    hesitation:'Конечно, не торопитесь. Вернуться к этому можно, когда вам будет удобно.',
  },
  en:{
    explore:'Happy to explain the options without any obligation to book. Would you like to clarify a situation, learn a practice, or speak to a specialist?',
    inform:'You can first read the service description, format and limitations. Would you like to know how it works or what it is designed for?',
    price:"I understand that cost matters. I won't promise an unverified discount or price. Would you like to consider the free situation review as a first step?",
    namedPrice:"I understand that budget matters. I won't substitute an unrelated service or promise a discount. Would you like to ask the practitioner about this specific offer?",
    trust:"It's reasonable to check whom you trust. You can review the method, practitioner's background, and any published verified reviews; I won't invent testimonials. Would you like the description?",
    effect:"An individual outcome cannot be predicted or guaranteed. It's worth comparing goals, the method and limitations. Would you like to read the description?",
    time:"There's no need to decide now. Would you like to see which formats the service description actually lists?",
    fit:"There's no need to choose without enough information. Are you uncertain about the approach or the meeting format?",
    hesitation:"Of course, take your time. You're welcome to return to this when it suits you.",
  },
  es:{
    explore:'Puedo explicarte las opciones sin obligación de reservar. ¿Buscas aclarar una situación, aprender una práctica o hablar con un profesional?',
    inform:'Puedes consultar primero la descripción, el formato y los límites del servicio. ¿Quieres saber cómo funciona o para qué objetivos está pensado?',
    price:'Entiendo que el precio importa. No prometeré descuentos o precios sin verificar. ¿Quieres conocer la revisión gratuita como primer paso?',
    namedPrice:'Entiendo que el presupuesto importa. No sustituiré el servicio elegido por otro sin relación ni prometeré descuentos. ¿Quieres consultar las condiciones con el profesional?',
    trust:'Es razonable comprobar en quién confiar. Puedes consultar el método, la trayectoria y las opiniones verificadas publicadas, sin testimonios inventados. ¿Quieres ver la descripción?',
    effect:'No se puede predecir ni garantizar un resultado individual. Conviene comparar objetivos, método y límites. ¿Quieres leer la descripción?',
    time:'No es necesario decidir ahora. ¿Quieres ver qué formatos figuran en la descripción?',
    fit:'No tienes que elegir sin información suficiente. ¿Te genera dudas el enfoque o el formato de la sesión?',
    hesitation:'Por supuesto, tómate tu tiempo. Puedes retomar el tema cuando quieras.',
  },
});

function recentServiceContext(history) {
  if(!Array.isArray(history))return '';
  for(const item of history.slice(-8).reverse()){
    if(item?.role!=='user'||typeof item.text!=='string')continue;
    const text=item.text.trim().slice(0,400);
    if(refuse.test(text)||reset.test(text))return '';
    if(topic.test(text))return text;
  }
  return '';
}
function verifiedLink(key,locale){
  return resolveConsultantSuggestion('service:'+key,locale);
}
function namedService(text){
  return serviceNames.find(([,re])=>re.test(text))?.[0]||null;
}
function replyOf(locale,text,kind,suggestions=[]){
  return {status:'clarify',intent:'sales',stage:kind==='hesitation'?'close':
    kind==='explore'?'explore':kind==='inform'?'inform':'consider',
    objection:kind==='explore'||kind==='inform'?null:kind,locale,
    reply:text,suggestions:suggestions.filter(Boolean).slice(0,2),
    modelUsed:false,source:SALES_MIND_VERSION};
}
/**
 * Reply ONLY to explicit service exploration or objections in a live service
 * discussion. Never infer a need from distress, psychometrics or profile data.
 * Price/booking/selection facts remain with Consultant/Secretary Mind.
 */
export function salesMindTurn({message='',locale='en',history=[]}={}){
  if(typeof message!=='string'||message.length>1400)return null;
  const text=message.trim();
  const l=locales.has(locale)?locale:'en';
  // Reuse My Coach's pure question-repeat detector. The sales stage and
  // published-service evidence remain Sales Mind's responsibility; we only
  // avoid repeating a question or asking three consecutive questions.
  const guided=(candidate)=>{
    if(!candidate||candidate.stage==='close')return candidate;
    const turns=(Array.isArray(history)?history:[]).slice(-8)
      .filter(t=>t&&['assistant','user'].includes(t.role)&&typeof t.text==='string')
      .map(t=>({role:t.role,content:t.text.slice(0,700)}));
    const assistant=turns.filter(t=>t.role==='assistant').slice(-2);
    const streak=assistant.length===2&&assistant.every(t=>/[?？]\s*$/u.test(t.content.trim()));
    if(!streak&&!repeatedCoachQuestion(candidate.reply,turns))return candidate;
    const withoutQuestion=candidate.reply
      .replace(/(?:\s*[¿]?[^\n.!?¿？]{3,260}[?？])\s*$/u,'').trim();
    if(withoutQuestion.length<18)return candidate;
    return {...candidate,reply:withoutQuestion,questionDeferred:true};
  };

  if(!text||danger.test(text)||refuse.test(text)||reset.test(text)||booking.test(text))return null;
  const earlier=recentServiceContext(history);
  const hasTopic=topic.test(text);
  if(!hasTopic&&!earlier)return null;
  const key=namedService(text)||namedService(earlier);
  const service=key?verifiedLink(key,l):null;
  const objection=objections.find(([,re])=>re.test(text))?.[0]||null;
  if(objection){
    if(objection==='hesitation')return guided(replyOf(l,copy[l].hesitation,'hesitation'));
    if(objection==='price'){
      if(key)return guided(replyOf(l,copy[l].namedPrice,'price',[service]));
      return guided(replyOf(l,copy[l].price,'price',[verifiedLink('review',l)]));
    }
    if(objection==='effect'&&key==='homeopathy'){
      const caution={
        ru:'Гомеопатия не имеет надёжных доказательств эффективности при лечении заболеваний. ',
        en:'Homeopathy lacks reliable evidence for treating illness. ',
        es:'La homeopatía carece de evidencia fiable para tratar enfermedades. ',
      };
      return guided(replyOf(l,caution[l]+copy[l].effect,'effect',[service]));
    }
    if(objection==='fit')return guided(replyOf(l,copy[l].fit,'fit',[service]));
    return guided(replyOf(l,copy[l][objection],objection,[service]));
  }
  // Existing factual Consultant Mind must remain the single source of truth
  // for prices, service comparison, ranking and specific recommendations.
  if(factual.test(text))return null;
  if(!explore.test(text))return null;
  if(service)return guided(replyOf(l,copy[l].inform,'inform',[service]));
  return guided(replyOf(l,copy[l].explore,'explore'));
}
