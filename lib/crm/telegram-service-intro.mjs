/**
 * Public, pre-consent Telegram service information.
 * No user text is stored, no model is called and no CRM lead is created.
 * Titles, prices and destinations come from the published offer catalogue.
 */
import {aliSecretaryOfferJourney} from '../assist/ali-secretary-offer-journeys.mjs';
import {aliServiceScenario} from '../assist/ali-service-scenario.mjs';

const locales=new Set(['ru','en','es']);
const messages=Object.freeze({
 ru:Object.freeze({
  fallback:'Вы можете выбрать один из вариантов ниже или задать вопрос Ali.',
  info:'Услуга',fee:'Стоимость и длительность',conditions:'Формат и удобное время согласовываются с мастером перед записью.',
  access:'Все подробности и возможность начать — на странице выбранного варианта.',
  more:'Подробнее',unknown:'Подробности конкретного формата уточнит мастер. Пока ничего оформлять не нужно.',
  master:'Сессии проводит Andy. Более 24 лет он ведёт индивидуальные и групповые программы. В работе использует образную и телесно-ориентированную практику, а также системные расстановки.',
  biography:'Подробнее о мастере',
  booking:'Для записи Ali уточнит удобный день и формат встречи, затем покажет черновик заявки. Мастер подтвердит время отдельно. До вашего подтверждения ничего не отправляется.',
  request:'Если хотите начать, выберите «Начать запись».',
  digitalBooking:'Этот вариант можно изучить по ссылке. Если нужна помощь мастера, Ali подготовит запрос и покажет его до отправки.',
  consent:'Прежде чем собирать пожелания по записи, подтвердите, пожалуйста, согласие продолжить. Личных историй и подробностей не требуется.',
 }),
 en:Object.freeze({
  fallback:'Choose an option below, or ask Ali a question.',
  info:'Service',fee:'Price and duration',conditions:'Format and a suitable time are agreed with the practitioner before booking.',
  access:'The selected option can be explored on its published page.',
  more:'Details',unknown:'The practitioner will clarify the format. Nothing needs to be booked yet.',
  master:'Sessions are hosted by Andy. He has over 24 years of experience facilitating personal and group work, including guided imagery, body-oriented approaches and systemic constellations.',
  biography:'About the practitioner',
  booking:'To request an appointment, Ali will ask for a preferred day and format, then show you a draft. The practitioner confirms the time separately. Nothing is sent until you approve it.',
  request:'Choose “Start booking” if you would like to proceed.',
  digitalBooking:'You can explore this option using its published link. If you need help, Ali can prepare a request for your approval.',
  consent:'Before collecting booking preferences, please confirm you wish to continue. You do not need to share personal details.',
 }),
 es:Object.freeze({
  fallback:'Elige una opción o haz una pregunta a Ali.',
  info:'Servicio',fee:'Precio y duración',conditions:'El formato y el horario se acuerdan con el profesional antes de reservar.',
  access:'Puedes explorar esta opción en su página publicada.',
  more:'Más información',unknown:'El profesional confirmará el formato. Todavía no necesitas reservar.',
  master:'Las sesiones las facilita Andy. Tiene más de 24 años de experiencia en trabajo individual y grupal, imágenes guiadas, enfoques corporales y constelaciones sistémicas.',
  biography:'Sobre el profesional',
  booking:'Para solicitar una cita, Ali preguntará por el día y el formato, y te mostrará un borrador. El profesional confirma la hora aparte. No se envía nada sin tu aprobación.',
  request:'Elige «Empezar reserva» cuando lo decidas.',
  digitalBooking:'Puedes explorar esta opción desde su página. Si necesitas ayuda, Ali preparará una solicitud para tu aprobación.',
  consent:'Antes de recoger preferencias de reserva, confirma que deseas continuar. No necesitas compartir detalles personales.',
 }),
});
const msg=locale=>messages[locales.has(locale)?locale:'en'];
const sessionLike=kind=>!['course','access','creative','review'].includes(kind);

export function telegramServiceMenuAnswer({locale='en',service='general',offerId=null,action}={}){
 const language=locales.has(locale)?locale:'en',c=msg(language);
 const offer=aliSecretaryOfferJourney(offerId,service,language);
 const title=offer?.title||aliServiceScenario(service,language)?.title;
 if(!title)return c.fallback;
 if(action==='serviceinfo'){
   const lines=[c.info+': '+title+'.'];
   if(offer)lines.push(c.fee+': '+offer.price+'.');
   lines.push(offer&& !sessionLike(offer.kind)?c.access:offer?c.conditions:c.unknown);
   if(offer?.url)lines.push(c.more+': '+offer.url);
   return lines.join('\n').slice(0,950);
 }
 if(action==='masterinfo')
   return c.master+'\n'+c.biography+': https://holistichouse.vercel.app/'+language+'/about';
 if(action==='servicebooking')
   return (offer&&!sessionLike(offer.kind)?c.digitalBooking:c.booking)+
     '\n'+c.request+(offer?.url?'\n'+c.more+': '+offer.url:'');
 if(action==='servicebegin')return c.consent;
 return c.fallback;
}

/** Only public FAQ intent. An unknown statement is NOT booking, intake or consent. */
export function telegramServiceMenuIntent(value){
 const raw=typeof value==='string'?value.trim().slice(0,180):'';
 if(!raw||raw.startsWith('/')||raw.length>180)return null;
 if(/(?:^|\b)(?:who (?:is|will be) (?:the |my )?(?:practitioner|therapist|master)|about (?:the )?(?:practitioner|master|andy)|about (?:the )?teacher)|(?:кто (?:вед[её]т|мастер)|о мастере|про мастера|об андре[её])|(?:qui[eé]n es el (?:profesional|maestro)|sobre el (?:profesional|maestro))/iu.test(raw))
   return 'masterinfo';
 if(/(?:how (?:do|can) (?:i|we) (?:book|reserve)|how to book|booking|appointment|schedule|(?:как|где) записаться|как оформить запись|условия записи|c[oó]mo reservar|reservar cita)/iu.test(raw))
   return 'servicebooking';
 if(/(?:about (?:the |this )?(?:service|session|option)|tell me (?:about|more)|what(?:'s| is) (?:this|included)|price|cost|duration|details|(?:расскажи|расскажите) (?:об услуге|про услугу)|(?:сколько стоит|стоимость|цена|подробнее|что (?:входит|это за услуга))|(?:sobre el servicio|cu[aá]nto cuesta|precio|detalles|en qu[eé] consiste))/iu.test(raw))
   return 'serviceinfo';
 return null;
}
