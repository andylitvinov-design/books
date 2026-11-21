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
// Reviewed editorial descriptions for published choices; no client inference.
const descriptions=Object.freeze({
 ru:Object.freeze({
  consultation_express:'Короткая индивидуальная встреча на 30 минут: один главный вопрос, обсуждение ситуации и возможного следующего шага. Для записи не нужен рисунок или личное интервью в боте.',
  consultation_full:'Индивидуальная часовая встреча для более подробного обсуждения выбранной темы и возможных дальнейших шагов.',
  services_imagery:'Индивидуальная работа с образами и внутренними переживаниями, в том числе с вопросами отношений.',
  services_constellations:'Системный подход для исследования семейных и личных ситуаций и повторяющихся взаимодействий.',
  consultation_free:'Бесплатный письменный разбор ситуации. Это отдельный формат, не 30-минутная сессия.',
  session:'Индивидуальный формат работы с мастером по выбранной теме.',
  course:'Учебный формат; программа и условия представлены на странице курса.',
  review:'Письменный разбор выбранной ситуации; формат указан на странице услуги.',
  access:'Самостоятельное знакомство с выбранным материалом на сайте.',
  reading:'Символическая интерпретация или чтение выбранным методом.',
  creative:'Создание персонализированного материала по выбранной теме.',
 }),
 en:Object.freeze({
  consultation_express:'A focused 30-minute one-to-one session for one main question, an initial discussion and possible next steps. No drawing or personal interview with the bot is needed to request it.',
  consultation_full:'A full 60-minute one-to-one session for exploring your chosen topic in more detail and considering next steps.',
  services_imagery:'Individual work with guided imagery and inner experiences, including relationship topics.',
  services_constellations:'A systemic approach to exploring family and personal situations and recurring relationship patterns.',
  consultation_free:'A free written situation review. This is separate from the 30-minute paid session.',
  session:'An individual session with the practitioner focused on your chosen topic.',
  course:'A learning programme with its curriculum and terms on the course page.',
  review:'A written review of your situation, with the format explained on its page.',
  access:'Self-guided access to the selected material on the website.',
  reading:'A symbolic reading or interpretation using the selected method.',
  creative:'A personalised creative resource related to the selected topic.',
 }),
 es:Object.freeze({
  consultation_express:'Una sesión individual de 30 minutos centrada en una pregunta principal, una primera conversación y posibles pasos siguientes. No hace falta un dibujo ni una entrevista personal con el bot para solicitarla.',
  consultation_full:'Una sesión individual de 60 minutos para explorar con más detalle el tema elegido y posibles pasos siguientes.',
  services_imagery:'Trabajo individual con imágenes guiadas y experiencias internas, también sobre relaciones.',
  services_constellations:'Un enfoque sistémico para explorar situaciones personales y familiares y patrones repetidos.',
  consultation_free:'Una revisión escrita gratuita de tu situación, distinta de la sesión de pago de 30 minutos.',
  session:'Una sesión individual con el profesional centrada en el tema elegido.',
  course:'Un programa de aprendizaje con contenidos y condiciones en su página.',
  review:'Una revisión escrita de la situación; los detalles están en su página.',
  access:'Acceso autónomo al material seleccionado en el sitio web.',
  reading:'Una lectura o interpretación simbólica con el método elegido.',
  creative:'Un recurso creativo personalizado sobre el tema elegido.',
 }),
});

export function telegramServiceMenuAnswer({locale='en',service='general',offerId=null,action}={}){
 const language=locales.has(locale)?locale:'en',c=msg(language);
 const offer=aliSecretaryOfferJourney(offerId,service,language);
 const title=offer?.title||aliServiceScenario(service,language)?.title;
 if(!title)return c.fallback;
 if(action==='serviceinfo'){
   const lines=[c.info+': '+title+'.',
     descriptions[language][offerId]||descriptions[language][offer?.kind]||
       descriptions[language].session];
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
