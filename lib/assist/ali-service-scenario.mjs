/** Public offer registry. Never identity, AI consent, a booking or CRM side effect. */
import {telegramBusinessServiceTitle,BUSINESS_STRATEGY_PAGE_TITLES} from './telegram-business-request.mjs';
import {aliSecretaryOfferJourney,aliSecretaryOfferPriceReply,aliSecretaryOfferLinkReply} from './ali-secretary-offer-journeys.mjs';
export const ALI_SERVICE_SCENARIO_VERSION='ali-service-scenario-v1';
const SCENARIOS=Object.freeze({
 "general": {
  "ru": [
   "Что вам хотелось бы узнать об этом варианте?",
   "Что для вас сейчас важнее всего?",
   "Какой следующий шаг вам удобен?"
  ],
  "en": [
   "What would you like to know about this option?",
   "What matters most to you here?",
   "What would you like to do next?"
  ],
  "es": [
   "¿Qué te gustaría saber sobre esta opción?",
   "¿Qué es lo más importante para ti?",
   "¿Qué paso te vendría mejor?"
  ]
 },
 "homeopathy": {
  "ru": [
   "С чем вы хотели бы обратиться?",
   "Что в этой ситуации особенно трудно?",
   "Что ещё мне важно знать?"
  ],
  "en": [
   "What would you like help with?",
   "What's been especially difficult?",
   "Anything else you'd like me to know?"
  ],
  "es": [
   "¿Qué te gustaría consultar?",
   "¿Qué es lo más difícil ahora?",
   "¿Quieres añadir algo más?"
  ]
 },
 "coaching": {
  "ru": [
   "С чем хотели бы поработать?",
   "Что пока мешает двигаться дальше?",
   "Что ещё важно для вас?"
  ],
  "en": [
   "What would you like to work on?",
   "What's getting in the way?",
   "Is there anything else that matters here?"
  ],
  "es": [
   "¿En qué te gustaría trabajar?",
   "¿Qué te está frenando?",
   "¿Hay algo más que quieras contar?"
  ]
 },
 "reiki": {
  "ru": [
   "Что привело вас к сеансу Рейки?",
   "На чём хотелось бы сосредоточиться?",
   "Что ещё важно для выбора формата?"
  ],
  "en": [
   "What brings you to a Reiki session?",
   "What would you like to focus on?",
   "Anything else important about the format?"
  ],
  "es": [
   "¿Qué te trae a una sesión de Reiki?",
   "¿En qué te gustaría centrarte?",
   "¿Algo más sobre el formato?"
  ]
 },
 "constellations": {
  "ru": [
   "Какую ситуацию хотите разобрать?",
   "Что в ней повторяется или тревожит?",
   "Что ещё стоит учесть?"
  ],
  "en": [
   "What situation would you like to explore?",
   "What keeps coming up for you?",
   "Anything else we should consider?"
  ],
  "es": [
   "¿Qué situación te gustaría explorar?",
   "¿Qué se repite en ella?",
   "¿Hay algo más que quieras considerar?"
  ]
 },
 "business": {
  "ru": [
   "Какой вопрос в бизнесе сейчас главный?",
   "Что больше всего тормозит решение?",
   "Что ещё важно для контекста?"
  ],
  "en": [
   "What's the main business question right now?",
   "What's holding things back?",
   "Anything else about the situation?"
  ],
  "es": [
   "¿Cuál es tu principal pregunta de negocio?",
   "¿Qué está frenando el avance?",
   "¿Algo más sobre la situación?"
  ]
 },
 "business_strategy": {
  "ru": [
   "Какое решение в бизнесе вы обдумываете?",
   "Что мешает определиться?",
   "Какие ограничения важно учитывать?"
  ],
  "en": [
   "What business decision is on your mind?",
   "What's making it difficult to decide?",
   "What constraints matter most?"
  ],
  "es": [
   "¿Qué decisión de negocio estás considerando?",
   "¿Qué dificulta decidir?",
   "¿Qué límites importan más?"
  ]
 }
});
export function aliServiceScenario(service,locale='en',offerId=null){
 if(typeof service!=='string'||!['ru','en','es'].includes(locale)||!Object.hasOwn(SCENARIOS,service))return null;
 const selected=aliSecretaryOfferJourney(offerId,service,locale);
 const title=selected?.title||(
   service==='general'?({ru:'Услуги Holistic House',en:'Holistic House services',es:'Servicios Holistic House'}[locale]):
   service==='business_strategy'?BUSINESS_STRATEGY_PAGE_TITLES[locale]:
   telegramBusinessServiceTitle(service,locale));
 const defaults=SCENARIOS[service][locale];
 const q=selected?[...selected.questions,defaults[2]]:defaults;
 return title&&q?.length===3?{id:service,title,mode:'secretary',flow:'service_intake',
   ...(selected?{offerId:selected.id,journeyKind:selected.kind,
     publicUrl:selected.url,priceKind:selected.priceKind}:{}),
   questions:{goal:q[0],challenge:q[1],situation:q[2]}}:null;
}
export function aliServiceReady(locale,title){
 if(!['ru','en','es'].includes(locale)||typeof title!=='string'||!title.trim()||title.length>160)return null;
 if(locale==='ru')return 'Понял вас 🌿 Можно передать запрос на «'+title+'». Проверьте заявку — время встречи согласует специалист.';
 if(locale==='es')return 'Perfecto 🌿 Podemos preparar tu consulta «'+title+'». Revisa la solicitud antes de enviarla.';
 return 'Got it 🌿 Let’s prepare your request for “'+title+'”. You can review it before sending.';
}
export function aliServiceFaq(text,locale,service,offerId=null){
 if(!aliServiceScenario(service,locale,offerId)||typeof text!=='string')return null;
 // Answer the chosen published offer, not a generic sales or payment script.
 const link=aliSecretaryOfferLinkReply(text,locale,service,offerId);
 if(link)return link;
 const exactPrice=aliSecretaryOfferPriceReply(text,locale,service,offerId);
 if(exactPrice)return exactPrice;
 if(/цен|стоим|сколько стоит|оплат|price|cost|pay|how much|precio|costo|pago|cu[aá]nto cuesta|cu[aá]nto vale/iu.test(text))
  return locale==='ru'?'Стоимость мастер уточнит до записи. Сейчас ничего оплачивать не нужно.':
   locale==='es'?'El profesional confirmará el precio antes de reservar. No tienes que pagar ahora.':
   'The practitioner will confirm the price before booking. No payment is needed now.';
 if(/когда|запис|доступн|онлайн|очно|формат|время|book|availab|schedule|online|format|cu[aá]ndo|reserva|disponib|horario/iu.test(text))
  return locale==='ru'?'Удобное время и формат согласуем с мастером. Пока запись не сделана.':
   locale==='es'?'Acordaremos el horario y formato con el profesional. Aún no hay reserva.':
   'We will check the time and format with the practitioner. Nothing is booked yet.';
 return null;
}
/** Advisory intent grid; signed provider, STOP, safety and consent take precedence. */
export function routeAliEntry({service=null,locale='en',requestedMode=null,stopped=false,safety=false}={}){
 if(stopped)return {kind:'stopped',mode:null};
 if(safety)return {kind:'safety',mode:null};
 if(!['ru','en','es'].includes(locale))return {kind:'unsupported',mode:null};
 if(['secretary_psychologist','free_diagnostic'].includes(requestedMode))
  return {kind:requestedMode,mode:requestedMode,requiresSeparateConsent:true};
 const selected=aliServiceScenario(service,locale);
 return selected?{kind:'service',mode:'secretary',service:selected.id,title:selected.title,locale,flow:selected.flow}:
  {kind:'general',mode:'secretary',locale};
}
