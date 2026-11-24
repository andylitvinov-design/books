/**
 * One source-bounded Secretary Mind for the existing Telegram Business chatbot.
 * Pure, no LLM, no CRM writes, no client data in links, no pseudo-products.
 * Publication/permissions are verified by the server before this is called.
 */
import {planWaveMagicTurn} from '../holistic-support/wave-magic-director.mjs';
import {inferAssistPreferences,rankAssistOffers} from '../assist/service-match.mjs';
import {consultServiceQuestion} from '../assist/consultant-mind.mjs';
import {salesMindTurn} from '../holistic-support/sales-mind.mjs';
import {getPublicServiceDetailHref} from '../practitioners/public-service-links.js';

export const TELEGRAM_SECRETARY_VERSION='hh-tg-unified-secretary-v1';
export const TELEGRAM_SITE='https://holistichouse.vercel.app';
// Shared deterministic Ali clarification for signed Telegram Business,
// Telegram Bot and WhatsApp. Never interprets vague text as an order or consent.
const TELEGRAM_SECRETARY_CLARIFY_COPY=Object.freeze({
 en:{
  general:'I can help with services, a free review or a session request. Which would you like to discuss?',
  unclear:'I didn’t quite understand. Do you mean our services, a free review or arranging a session?',
  assent:'Just to clarify, would you like to discuss a service or make a session request?',
  decline:'Understood. Would you prefer another service or to write to the practitioner?',
  time:'Do you mean available session times or when the practitioner will reply?',
  location:'Are you asking about online sessions or the location of an in-person visit?',
  human:'You can leave your question here for the practitioner; a reply time isn’t confirmed. What would you like to ask?',
 },
 ru:{
  general:'Могу рассказать об услугах, бесплатном разборе или помочь с заявкой на сессию. Что вас интересует?',
  unclear:'Не совсем понял. Вы спрашиваете об услугах, бесплатном разборе или записи на сессию?',
  assent:'Уточню: вы хотите обсудить услугу или оформить заявку на сессию?',
  decline:'Понял. Хотите рассмотреть другую услугу или написать мастеру?',
  time:'Вы спрашиваете о времени сессии или о том, когда ответит мастер?',
  location:'Вас интересует онлайн-сессия или место очной встречи?',
  human:'Можете оставить вопрос мастеру здесь. Срок ответа пока не подтверждён. Что хотите уточнить?',
 },
 es:{
  general:'Puedo informar sobre servicios, una revisión gratuita o solicitar una sesión. ¿Qué te interesa?',
  unclear:'No entendí del todo. ¿Preguntas por servicios, una revisión gratuita o una sesión?',
  assent:'Para aclarar, ¿quieres consultar un servicio o solicitar una sesión?',
  decline:'Entiendo. ¿Prefieres otro servicio o escribir al profesional?',
  time:'¿Preguntas por horarios de sesión o por cuándo responderá el profesional?',
  location:'¿Te interesa una sesión online o la ubicación de una consulta presencial?',
  human:'Puedes dejar una pregunta aquí para el profesional; no hay plazo confirmado. ¿Qué deseas preguntar?',
 },
});
const ALI_EXTRA_CLARIFY=Object.freeze({
 en:{
  media:'I received an attachment but cannot interpret it here. Which service is it about?',
  long:'I received a long message. Could you summarize the question or name the service?',
  unreadable:'I received your message, but could not read the text. Could you rephrase it?',
  ack:'Thanks for confirming. Would you like service details or help with a request?',
  bye:'Thanks for writing. Is there anything else you wanted to clarify?',
  command:'I do not recognize that command. Do you need service information or help making a request?',
  reference:'I cannot recognize that service code. Which service did you mean?',
  symbol:'I received your symbol or emoji. Could you explain in words what you need?',
 },
 ru:{
  media:'Вложение получено, но я не могу определить его содержание здесь. К какой услуге оно относится?',
  long:'Получил длинное сообщение. Можете кратко сформулировать вопрос или назвать услугу?',
  unreadable:'Сообщение пришло, но текст не читается. Можете написать вопрос другими словами?',
  ack:'Спасибо за ответ. Рассказать об услуге или помочь оформить заявку?',
  bye:'Спасибо за обращение. Осталось ли что-то, что хотите уточнить?',
  command:'Не знаю такую команду. Рассказать об услугах или помочь оформить заявку?',
  reference:'Не удалось определить код услуги. Какую услугу вы хотели уточнить?',
  symbol:'Получил ваш знак или эмодзи. Можете написать словами, чем помочь?',
 },
 es:{
  media:'Recibí el archivo, pero no puedo interpretarlo aquí. ¿Con qué servicio se relaciona?',
  long:'Recibí un mensaje largo. ¿Podrías resumir la pregunta o indicar el servicio?',
  unreadable:'Recibí tu mensaje, pero no pude leerlo. ¿Puedes reformular tu pregunta?',
  ack:'Gracias por confirmar. ¿Quieres información de un servicio o ayuda con una solicitud?',
  bye:'Gracias por escribir. ¿Hay algo más que quieras aclarar?',
  command:'No reconozco ese comando. ¿Quieres información de servicios o ayuda para solicitar uno?',
  reference:'No pude reconocer el código de servicio. ¿Sobre qué servicio preguntas?',
  symbol:'Recibí tu símbolo o emoji. ¿Puedes explicar con palabras qué necesitas?',
 },
});
const ALI_STOP_ONLY=/^(?:\/(?:stop|unsubscribe)(?:@[a-z0-9_]+)?|stop|стоп|остановить(?: диалог)?|unsubscribe|отписаться|parar|detener)[.!?\s]*$/iu;
const ALI_ACK_ONLY=/^(?:thanks|thank you|cheers|ok|okay|спасибо|благодарю|хорошо|gracias|vale|👍|👌|🙏)[.!?\s]*$/iu;
const ALI_BYE_ONLY=/^(?:bye|goodbye|пока|до свидания|adiós|adios|👋)[.!?\s]*$/iu;
// Every user-authored nonempty string has a safe answer, even if the intent
// classifier never saw this text. STOP is the deliberate exception.
export function composeTelegramSecretaryClarification(message,locale='en',options={}){
 if(typeof message!=='string')return null;
 const mediaKind=['photo','voice','sticker','document','media'].includes(options?.mediaKind)
   ?options.mediaKind:null;
 const raw=message.replace(/[\u200b-\u200d\u2060\ufeff]/gu,'').trim();
 if(ALI_STOP_ONLY.test(raw)||/^HHWA(?:\s|$)/iu.test(raw))return null;
 if(!raw&&!mediaKind&&message.length===0)return null;
 const language=Object.hasOwn(TELEGRAM_SECRETARY_CLARIFY_COPY,locale)?locale:'en';
 const defaults=TELEGRAM_SECRETARY_CLARIFY_COPY[language];
 if(!mediaKind&&!options?.longText&&/^(?:hi|hello|hey|привет|здравствуйте|добрый день|hola|buenas)[!.? ]*$/iu.test(raw)){
   const welcome={
    en:'Hello! I’m Ali. You can start with our free situation review, free self-checks or free Reiki Practitioner course. What interests you?',
    ru:'Здравствуйте! Я Ali. Можно начать с бесплатного разбора ситуации, бесплатных тестов или бесплатного курса практикующего Рейки. Что вас интересует?',
    es:'Hola, soy Ali. Puedes empezar con una revisión gratuita, pruebas gratuitas o el curso gratuito de Reiki. ¿Qué te interesa?',
   };
   return {handled:true,kind:'clarify',text:welcome[language],
    buttons:['review','tests','reiki_course'].map(key=>section(key,language)).map(row=>({text:row.title.slice(0,48),url:row.href})),
    modelUsed:false,clarificationReason:'welcome'};
 }
 let reason='general';
 if(mediaKind)reason='media';
 else if(options?.longText===true||message.length>800)reason='long';
 else if(!raw)reason='unreadable';
 else if(ALI_ACK_ONLY.test(raw))reason='ack';
 else if(ALI_BYE_ONLY.test(raw))reason='bye';
 else if(/^\/[^\s]+/u.test(raw))reason='command';
 else if(/^\[HH-REQ:/iu.test(raw))reason='reference';
 else if(/^(?:yes|yeah|yep|sure|да|ага|конечно|согласен|sí|si)[.!?\s]*$/iu.test(raw))reason='assent';
 else if(/^(?:no|nope|нет|неа|не хочу|cancel|cancelar|отмена|отменить|не надо)[.!?\s]*$/iu.test(raw))reason='decline';
 else if(/^(?:когда|во сколько|when|what time|cu[aá]ndo|a qu[eé] hora)[?？!.\s]*$/iu.test(raw))reason='time';
 else if(/^(?:where|где|куда|d[oó]nde)[?？!.\s]*$/iu.test(raw))reason='location';
 else if(/^(?:human|person|operator|оператор|человек|мастер|persona|humano)[?？!.\s]*$/iu.test(raw))reason='human';
 else if(/^(?:what|что|чего|чё|how|как|why|почему|que|qu[eé]|cómo|como|\?+|¿\?+|🤔|🤷)$/iu.test(raw)||
         /(?:не понял|не понимаю|неясно|непонятно|not understand|don't understand|confus|no entiendo)/iu.test(raw))
  reason='unclear';
 else if(!/[\p{L}\p{N}]/u.test(raw))reason='symbol';
 return {handled:true,kind:'clarify',
   text:defaults[reason]||ALI_EXTRA_CLARIFY[language][reason]||defaults.general,
   buttons:[],modelUsed:false,clarificationReason:reason};
}

const SAFE_SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_TITLE=/^[^\u0000-\u001f<>]{2,135}$/u;
const LOCALES=new Set(['ru','en','es']);
const STOP=/^(?:\/stop|stop|стоп|отмена|cancel|cancelar|не надо|не интересует|no thanks|no quiero)$/iu;
const DANGER=/(?:суицид|покончить с собой|убить себя|хочу умереть|боль в груди|не могу дышать|suicide|kill myself|chest pain|cannot breathe|quiero morir|dolor en el pecho|no puedo respirar)/iu;
const RESOURCE=/(?:услуг|сесси|консультац|практик|видео|ролик|mytube|курс|академ|рейки|reiki|тест|диагност|у.?син|wu.?xing|расстанов|гомеопат|coaching|coach|бизнес|психотерап|образн|imagery|psychother|hipnoterap|psicoterap|записат|покуп|купит|продукт|каталог|мастер|мандал|stress|стресс|тревож|work|business|service|appointment|session|course|academy|video|test|catalog|practitioner|master|mandala|consulta|terapia|curso|vídeo|prueba|estrés|relaciones|salud)/iu;
const ASK=/(?:подбер|подскаж|предлож|покаж|посовет|пришл|отправ|ссылк|что есть|где найти|какие есть|сколько|цен[ауеы]|стоит|хочу|интересует|нужен|нужна|нужно|можно ли|доступн|записат|пожалуйста|отлича|разниц|сравн|качеств|отзыв|эффективн|recom|suggest|difference|compare|quality|reviews|diferencia|comparar|calidad|opiniones|recommend|show|send|share|link|what|which|how much|price|cost|want|need|looking for|book|please|list|ver|enviar|mostrar|tienen|quiero|busco|cuanto|cuánto|precio|necesito|puedes)/iu;
const SERVICE_MATCH=Object.freeze({
 homeopathy:/гомеопат|homeopath|homeopat/iu,
 therapy:/образн|символдрам|психотерап|гипнотерап|imagery|psychotherap|hypnotherap|psicoterap|hipnoterap/iu,
 business:/бизнес|делов|финанс|карьер|money|business|work|dinero|negocio/iu,
 constellation:/расстанов|constellat|constelac|семь|семейн/iu,
 reiki:/рейки|reiki|энерг|energy|energía/iu,
});
const CATEGORY=Object.freeze({
 video:/видео|mytube|ролик|watch|video|vídeo|ver video/iu,
 course:/курс|обучен|академ|опора|course|academy|learn|curso|aprender|opora/iu,
 test:/тест|диагностик|у.?син|wu.?xing|assessment|test|questionnaire|prueba|evaluaci/iu,
 master:/мастер|специалист|консультант|practitioner|specialist|master|professional|profesional/iu,
 mandala:/мандал|талисман|mandala|talisman/iu,
 price:/цен[ауеы]|сколько.{0,40}(?:стоит|платить)|стоимост|price|pricing|cost|fee|how much|cuánto|cuanto|precio/iu,
 session:/сесси|консультац|встреч|записат|session|appointment|consult|book|consulta|sesión|presencial/iu,
});
const EMOTION=/стресс|тревог|страх|выгоран|напряж|устал|stress|anxiety|burnout|tired|ansiedad|estrés|cansad/iu;
const LOCALE_TEXT={
 ru:{intro:'Вот варианты, которые могут вам подойти:',
  none:'По вашему запросу нет подтверждённого предложения. Уточните, пожалуйста, хотите видео, курс или консультацию?',
  more:'Какой вариант вас интересует?',
  price:'Уточняется у специалиста',from:'от',free:'Бесплатно',
  safety:'Если сейчас есть опасность для жизни или серьёзные симптомы, обратитесь за неотложной помощью. Здесь могу помочь найти человека для разговора.',
  sections:{videos:'MyTube — опубликованные видео',opora:'Курс ОПОРА — программа антистресс',
   academy:'Reiki Academy — программы обучения',reiki_course:'Бесплатный курс практикующего Рейки',tantra_intro:'Тантра Рейки · бесплатное введение',reiki_session:'Дистанционная сессия Рейки',tests:'Тесты и самопроверка',
   masters:'Специалисты Holistic House',review:'Бесплатный разбор ситуации',
   mandalas:'Символические практики и мандалы'}},
 en:{intro:'Here are a few options you might like:',
  none:'No verified offer matches this request. Would you prefer a video, a course or a consultation?',
  more:'Which option interests you?',
  price:'Ask the practitioner',from:'from',free:'Free',
  safety:'If you are in immediate danger or have serious symptoms, seek urgent help. I can help you find a person to talk to.',
  sections:{videos:'MyTube — published videos',opora:'OPORA — anti-stress course',
   academy:'Reiki Academy — learning programs',reiki_course:'Free Reiki Practitioner Course',tantra_intro:'Tantra Reiki · free introduction',reiki_session:'Remote Reiki session',tests:'Wellbeing tests and self-checks',
   masters:'Holistic House practitioners',review:'Free situation review',
   mandalas:'Symbolic practices and mandalas'}},
 es:{intro:'Estas opciones pueden interesarte:',
  none:'No hay una oferta verificada que coincida. ¿Prefieres vídeo, curso o consulta?',
  more:'¿Qué opción te interesa?',
  price:'Consultar al profesional',from:'desde',free:'Gratis',
  safety:'Si hay peligro inmediato o síntomas graves, busca ayuda urgente. Puedo ayudarte a encontrar apoyo humano.',
  sections:{videos:'MyTube — vídeos publicados',opora:'OPORA — curso antiestrés',
   academy:'Reiki Academy — programas de aprendizaje',reiki_course:'Curso gratuito de Reiki',tantra_intro:'Tantra Reiki · introducción gratuita',reiki_session:'Sesión de Reiki a distancia',tests:'Pruebas de bienestar',
   masters:'Profesionales de Holistic House',review:'Revisión gratuita de la situación',
   mandalas:'Prácticas simbólicas y mandalas'}},
};
// Explicit first-party pages only; no generated URL or inferred product ID.
const CONSULTANT_PAGES=Object.freeze({
 therapy:'services/imagery-therapy',
 constellation:'services/systemic-constellations',
 business:'services/business-consulting',
 homeopathy:'services/alchemy-of-soul',
 reiki:'services/remote-energy-support',
 review:'services/free-situation-review',
 tests:'tests',
 mytube:'mytube',
 opora:'courses/antistress',
 academy:'academy/reiki',
 masters:'masters',
 aiCoach:'my-coach',
 mandala:'holistic-support/mandala',
 talisman:'holistic-support/mobile',
});
const KNOWN_SECTIONS=Object.freeze({
 videos:'mytube',opora:'courses/antistress',academy:'academy/reiki',reiki_course:'academy/principles-of-energywork',tantra_intro:'academy/reiki/tantra-reiki/free-initiation',reiki_session:'services/remote-energy-support',tests:'tests',
 masters:'masters',review:'services/free-situation-review',mandalas:'holistic-support/mobile',
});
const euro=(s)=>s==='EUR'?'€':s==='CAD'?'CAD ':s==='USD'?'$':s+' ';
function priceLabel(s,l){
 const copy=LOCALE_TEXT[l],mode=s.pricing_mode;
 if(mode==='free')return copy.free;
 const price=s.confirmed_price;
 if(['fixed','from'].includes(mode) &&
   (typeof price==='number'||typeof price==='string') &&
   String(price).trim()!=='' && Number.isFinite(Number(price)) &&
   Number(price)>=0 && Number(price)<=100000 &&
   /^[A-Z]{3}$/.test(String(s.currency||''))){
   if(Number(price)===0)return copy.free;
   const amount=Number(price).toLocaleString(l+'-GB',{maximumFractionDigits:2});
   const formatted=euro(s.currency)+amount;
   return mode==='from'?copy.from+' '+formatted:formatted;
 }
 return copy.price;
}
// Budget limits are EUR tiers. "from" is a minimum, NOT proof that
// the final price is within the customer's hard ceiling.
function verifiedFixedEUR(s){
 if(s.pricing_mode!=='fixed'||s.currency!=='EUR')return null;
 const value=s.confirmed_price;
 if((typeof value!=='string'&&typeof value!=='number')||
    String(value).trim()===''||!Number.isFinite(Number(value))||
    Number(value)<0||Number(value)>100000)return null;
 return Number(value);
}
function cleanTitle(title){
 return typeof title==='string'&&SAFE_TITLE.test(title.trim())?title.trim():null;
}
/**
 * Only ACTIVE, published records of APPROVED public practitioners are accepted.
 * A non-approved/draft/unpublished item is never allowed into output, even if
 * a caller inadvertently supplied it in a query result.
 */
export function publishedTelegramServiceOffers(rows,locale='en'){
 const l=LOCALES.has(locale)?locale:'en';
 const seen=new Set();
 return (Array.isArray(rows)?rows:[]).flatMap(s=>{
  if(s?.active!==true||s?.status!=='published'||
    s.practitioner_active!==true||s.practitioner_status!=='approved'||
    !SAFE_SLUG.test(s.slug||'')||!SAFE_SLUG.test(s.practitioner_slug||'')||
    !['fixed','from','contact','free'].includes(s.pricing_mode)||
    !['assessment','session','intro','course'].includes(s.offering_type))
   return [];
  const title=cleanTitle(s.localized_copy?.[l]?.title)||
    cleanTitle(s.localized_copy?.en?.title);
  const key=String(s.id||'');
  if(!title||!/^[a-f0-9-]{36}$/.test(key)||seen.has(key))return [];
  seen.add(key);
  const path=getPublicServiceDetailHref(l,s.practitioner_slug,s.slug);
  if(!new RegExp('^/'+l+'/services/[a-z0-9/-]+$').test(path))return [];
  return [{id:key,kind:'service',title,href:TELEGRAM_SITE+path,
    slug:s.slug,category:s.category||'',type:s.offering_type,
    price:priceLabel(s,l),pricingMode:s.pricing_mode,currency:s.currency,
    fixedEUR:verifiedFixedEUR(s),
    free:s.pricing_mode==='free'||(s.pricing_mode==='fixed'&&priceLabel(s,l)===LOCALE_TEXT[l].free)}];
 });
}
function section(key,l){
 if(!Object.hasOwn(KNOWN_SECTIONS,key))return null;
 return {id:'section:'+key,kind:'section',title:LOCALE_TEXT[l].sections[key],
   href:TELEGRAM_SITE+'/'+l+'/'+KNOWN_SECTIONS[key],free:['review','tests','videos','reiki_course','tantra_intro'].includes(key)};
}
// Explicit, source-bounded operational FAQs in the verified Business chat.
// Generic personal conversation stays with the human; no model, CRM write or booking.
const SECRETARY_FAQ_INTENTS=Object.freeze([
 ['human',/(?:поговор|связаться|соедин|задать вопрос).{0,40}(?:человеком|мастером|специалистом|консультантом)|(?:нужен|нужна).{0,15}(?:живой|человек)|(?:speak|talk|chat|contact|connect).{0,45}(?:human|real person|person|practitioner|agent)|(?:hablar|contactar|conectar).{0,45}(?:persona|humano|especialista)/iu],
 ['status',/(?:заявк|заказ).{0,40}(?:статус|отправлен|получен|поступил)|(?:статус|отправлен|получили).{0,40}(?:заявк|заказ)|(?:request|application|enquiry).{0,40}(?:status|submitted|received)|(?:status|submitted).{0,40}(?:request|application|enquiry)|solicitud.{0,40}(?:estado|enviad|recibid)|estado.{0,40}solicitud/iu],
 ['stop_help',/(?:как|можно|хочу).{0,30}(?:отключить|остановить|выключить).{0,25}(?:бот|автоответ|сообщени)|(?:how|can i).{0,35}(?:stop|disable|turn off).{0,25}(?:bot|automatic replies)|(?:c[oó]mo|puedo).{0,35}(?:detener|desactivar).{0,25}(?:bot|respuestas)/iu],
 ['response_time',/когда.{0,45}(?:ответ|свяж|напиш)|сколько.{0,35}(?:ждать|ожидат)|when.{0,45}(?:reply|respond|hear back|contact)|how long.{0,40}(?:reply|respond|answer)|cu[aá]ndo.{0,40}(?:respon|contest|contact)/iu],
 ['booking',/(?:как|хочу|можно|нужно|где).{0,40}(?:записат|запись|оформить заявк|заказат консультац)|(?:how|where|can i|i want to).{0,40}(?:book|schedule|make an appointment|submit a request)|c[oó]mo.{0,40}(?:reserv|agend|solicit)/iu],
 ['format',/(?:можно|возможно|есть|работаете|проводите).{0,35}(?:онлайн|дистанцион)|(?:онлайн|дистанцион).{0,30}(?:консультац|сеанс|сесси)|(?:offer|available|do you have|do you do).{0,35}(?:online|remote)|(?:online|remote).{0,30}(?:session|consultation|available|possible)|(?:ofrecen|consulta|sesión).{0,35}(?:online|en l[ií]nea)|(?:online|en l[ií]nea).{0,30}(?:consulta|sesión)/iu],
 ['free_review',/бесплатн.{0,35}(?:разбор|анализ|консультац)|(?:free|complimentary).{0,30}(?:review|consultation|assessment)|(?:revisi[oó]n|an[aá]lisis|consulta).{0,35}gratis/iu],
 ['price',/сколько.{0,40}(?:стоит|платить|цена)|какова.{0,30}цен|(?:how much|what(?:'s| is) the).{0,30}(?:cost|price|fee)|\b(?:cost|price|pricing|fee)\b|(?:cu[aá]nto|qu[eé]).{0,30}(?:cuesta|vale|precio)|\bprecio\b/iu],
 ['contact',/(?:как|где).{0,30}(?:связаться|написать|позвонить)|(?:how|where).{0,35}(?:contact you|reach you|write to you)|c[oó]mo.{0,30}(?:contactar|escribir)/iu],
]);
const SECRETARY_FAQ_COPY=Object.freeze({
 ru:Object.freeze({
  human:'Это личный чат @holistichouse. Опишите вопрос здесь для мастера. Чтобы отключить автоматические ответы, отправьте /stop.',
  status:'Я не могу проверить статус заявки по тексту сообщения. Если у вас есть номер HH, укажите его здесь для мастера.',
  stop_help:'Команда /stop отключает дальнейшие автоматические ответы в этом чате. Она не создаёт и не отменяет запись.',
  response_time:'Подтверждённого срока ответа мастера у меня нет. О какой услуге или заявке вы спрашиваете?',
  booking:'Помогу подготовить запрос, но переписка ещё не означает запись. Какая услуга вас интересует?',
  format:'Онлайн- или очный формат зависит от конкретной услуги и подтверждается мастером. Какая услуга вас интересует?',
  free_review:'Можно ознакомиться с описанием бесплатного разбора ситуации. Это не отправка заявки и не подтверждение записи.',
  price:'Цена зависит от конкретной услуги и опубликованного предложения. Какая услуга вас интересует?',
  contact:'Вы уже в личном чате @holistichouse. Опишите здесь ваш вопрос, и мастер сможет ответить.',
 }),
 en:Object.freeze({
  human:'You are in the @holistichouse personal chat. Please write your question for the practitioner here. To stop automated replies, send /stop.',
  status:'I cannot verify a request status from this message alone. If you have an HH reference, you can share it here with the practitioner.',
  stop_help:'The /stop command disables further automated replies in this chat. It does not create or cancel a booking.',
  response_time:'I do not have a confirmed response time for the practitioner. Which service or request is your question about?',
  booking:'I can help prepare an enquiry, but a chat message is not a confirmed booking. Which service interests you?',
  format:'Online or in-person arrangements depend on the service and the practitioner’s confirmation. Which service interests you?',
  free_review:'You can read about the free situation review. Opening the page does not submit a request or confirm an appointment.',
  price:'Pricing depends on the chosen service and its verified published offer. Which service interests you?',
  contact:'You are already chatting with @holistichouse. Write your question here so the practitioner can respond.',
 }),
 es:Object.freeze({
  human:'Estás en el chat personal de @holistichouse. Escribe aquí tu pregunta para el profesional. Para detener las respuestas automáticas, envía /stop.',
  status:'No puedo verificar el estado de una solicitud solo con este mensaje. Si tienes una referencia HH, puedes compartirla aquí con el profesional.',
  stop_help:'El comando /stop desactiva las respuestas automáticas en este chat. No crea ni cancela una reserva.',
  response_time:'No tengo un plazo confirmado de respuesta del profesional. ¿Sobre qué servicio o solicitud preguntas?',
  booking:'Puedo ayudarte a preparar una solicitud, pero un mensaje no confirma una reserva. ¿Qué servicio te interesa?',
  format:'La modalidad en línea o presencial depende del servicio y la confirmación del profesional. ¿Qué servicio te interesa?',
  free_review:'Puedes consultar información sobre la revisión gratuita. Abrir la página no envía una solicitud ni confirma una cita.',
  price:'El precio depende del servicio y de la oferta verificada y publicada. ¿Qué servicio te interesa?',
  contact:'Ya estás en el chat de @holistichouse. Escribe tu pregunta aquí para que responda el profesional.',
 }),
});
function classifyTelegramSecretaryFaq(text){
 for(const [topic,pattern] of SECRETARY_FAQ_INTENTS){
  if(!pattern.test(text))continue;
  // Named service/pricing questions still use independently verified offers.
  if((topic==='price'||topic==='booking')&&Object.values(SERVICE_MATCH).some(match=>match.test(text)))continue;
  return topic;
 }
 return null;
}

export function classifyTelegramSecretaryQuery(message,locale='en'){
 if(typeof message!=='string'||message.length>800)return null;
 const text=message.trim();
 if(!text||STOP.test(text)||/\[HH-REQ:/.test(text))return null;
 const l=LOCALES.has(locale)?locale:'en';
 if(DANGER.test(text))return {kind:'safety',locale:l};
 const faqTopic=classifyTelegramSecretaryFaq(text);
 if(faqTopic)return {kind:'faq',locale:l,topic:faqTopic};
 // Sales Mind is a pure, narrow exploratory response. Single-turn Telegram
 // Business messages never inherit an unverified cross-chat sales context.
 const mode=planWaveMagicTurn({message:text,locale:l,channel:'telegram',safety:{status:'clear'}});
 const sales=mode.mode==='sales'?salesMindTurn({message:text,locale:l}):null;
 const firstDiscovery=Boolean(sales&&!sales.objection&&(
   sales.stage==='explore'||(SERVICE_MATCH.reiki.test(text)&&
   !CATEGORY.session.test(text)&&!CATEGORY.price.test(text)&&!CATEGORY.master.test(text))));
 if(sales&&!firstDiscovery)return {kind:'sales',locale:l,sales};
 const explicit=firstDiscovery||ASK.test(text)||text.length<35&&RESOURCE.test(text);
 if(!explicit||!RESOURCE.test(text))return null;
 const focus=EMOTION.test(text)?'stress':
   SERVICE_MATCH.business.test(text)?'work':
   /отношен|семь|любов|relation|pareja|amor/.test(text)?'relationships':
   SERVICE_MATCH.reiki.test(text)?'energy':'general';
 const category=Object.fromEntries(Object.entries(CATEGORY).map(([k,re])=>[k,re.test(text)]));
 const named=Object.keys(SERVICE_MATCH).filter(k=>SERVICE_MATCH[k].test(text));
 const preferences=inferAssistPreferences(text);
 const role=mode.mode;
 const consultant=consultServiceQuestion({message:text,locale:l});
 // Currency conversion is not authorized or available. A CAD/USD hard cap
 // is not an implicit EUR cap; clarify before any budget-sensitive selection.
 const otherCurrencyCap=preferences.budget==='otherCurrency'||Boolean(consultant?.intent==='choose'&&
   /(?:до|under|up to|hasta|max(?:imum)?)\s*(?:\$\s*\d+|(?:cad|usd)\s*\d+|\d+\s*(?:cad|usd))/iu.test(text)&&
   !/(?:€|\beur\b|\beuro\b|евро)/iu.test(text));
 return {kind:'catalog',locale:l,focus,category,named,preferences,otherCurrencyCap,
   rank:rankAssistOffers(focus,preferences,5).map(x=>x.id),
   sourceRole:role,sourceConsultant:Boolean(consultant),
   consultantDecision:consultant&&['price','quality','compare','choose'].includes(consultant.intent)
      ?{intent:consultant.intent,reply:consultant.reply,
        suggestions:consultant.suggestions}:null};
}
function eligibleOffer(offer,q){
 if(q.preferences.budget==='free'&&!offer.free)return false;
 const cap=q.preferences.budget==='under50'?50:q.preferences.budget==='under100'?100:null;
 if(cap!==null&&!offer.free&&!(offer.fixedEUR!==null&&
   Number.isFinite(offer.fixedEUR)&&offer.fixedEUR<=cap))return false;
 const category=q.category,slug=offer.slug||'',area=offer.category||'';
 // Do not push an unrelated, even cheaper Reiki/energy session to someone
 // asking about relationships, career or stress. Published ≠ relevant.
 if(!q.named.length&&q.focus!=='general'){
   const related={
     relationships:/relationship|relaci|couple|family|constellat|therapy|imagery|coaching/,
     work:/business|career|founder|work|money|finance/,
     stress:/stress|anxiety|wellbeing|therapy|imagery|hypno|coaching/,
     energy:/energy|reiki|spiritual/,
     health:/^$/,
   }[q.focus];
   if(related&&!related.test(slug+' '+area))return false;
 }
 if(q.named.includes('homeopathy'))return /homeopath/.test(slug)||/homeopath/.test(area);
 if(q.named.includes('therapy'))return /imagery|therap|hypnoth/.test(slug)||/imagery|therap|hypnoth/.test(area);
 if(q.named.includes('business'))return /business/.test(slug)||/business/.test(area);
 if(q.named.includes('constellation'))return /constellat/.test(slug)||/constellat/.test(area);
 if(q.named.includes('reiki')){
   if(category.course&&!category.session&&!category.price&&offer.type!=='course')return false;
   if(category.session&&!category.course&&offer.type==='course')return false;
   return /energy|reiki/.test(slug)||/energy|spiritual/.test(area);
 }
 if(category.course&&!category.session&&!category.price)return offer.type==='course';
 if(category.test)return offer.type==='assessment';
 if(category.session||category.price)return offer.type==='session'||offer.type==='intro';
 return q.focus==='general'||offer.type==='intro';
}
function verifiedConsultantLink(row,l){
 if(!row||typeof row.id!=='string'||typeof row.title!=='string'||
   typeof row.href!=='string')return null;
 const id=row.id.replace(/^service:/,'');
 if(!Object.hasOwn(CONSULTANT_PAGES,id)||
   row.href!==('/'+l+'/'+CONSULTANT_PAGES[id])||
   !SAFE_TITLE.test(row.title))return null;
 return {id:'consultant:'+id,kind:'section',
   title:row.title,href:TELEGRAM_SITE+row.href};
}
export function composeTelegramSecretaryAnswer(query,services=[]){
 if(query?.kind==='sales'&&LOCALES.has(query.locale)){
  const sales=query.sales;
  if(!sales||typeof sales.reply!=='string'||sales.reply.length>700)return null;
  const buttons=(Array.isArray(sales.suggestions)?sales.suggestions:[])
    .map(row=>verifiedConsultantLink(row,query.locale))
    .filter(Boolean).slice(0,2)
    .map(row=>({text:row.title.slice(0,48),url:row.href}));
  return {handled:true,kind:'sales',text:sales.reply,buttons,
    modelUsed:false,sourceRole:'sales'};
 }

 if(query?.kind==='safety')
  return {handled:true,text:LOCALE_TEXT[query.locale].safety,buttons:[],kind:'safety',modelUsed:false};
 if(query?.kind==='faq'&&LOCALES.has(query.locale)){
  const message=SECRETARY_FAQ_COPY[query.locale]?.[query.topic];
  if(!message)return null;
  const page=query.topic==='free_review'?section('review',query.locale):null;
  return {handled:true,kind:'faq',text:message,
    buttons:page?[{text:page.title.slice(0,48),url:page.href}]:[],modelUsed:false};
 }
 if(query?.kind!=='catalog'||!LOCALES.has(query.locale))return null;
 const l=query.locale,t=LOCALE_TEXT[l],p=query.category;
 const entries=[];
 const add=item=>{if(item&&!entries.some(x=>x.id===item.id||x.href===item.href))entries.push(item);};
 const consultant=query.consultantDecision;
 // The client has not described a goal: ask ONE question, not sell random
 // catalogue items or push the diagnostic flow.
 if(query.otherCurrencyCap){
   const explain={
     ru:'Вы указали бюджет в другой валюте. Я не перевожу CAD/USD в евро автоматически. Уточните, пожалуйста, бюджет в евро или выберите бесплатный вариант.',
     en:'Your budget is in a different currency. I cannot automatically convert CAD/USD to euros. Would you give a EUR ceiling or prefer a free option?',
     es:'Tu presupuesto está en otra moneda. No convierto CAD/USD a euros automáticamente. ¿Prefieres indicar un límite en EUR o una opción gratuita?',
   };
   return {handled:true,kind:'clarify',text:explain[l],
     buttons:[],modelUsed:false,sourceRole:query.sourceRole};
 }
 if(consultant?.intent==='choose'&&(!consultant.suggestions?.length)&&
    query.focus==='general'&&!query.named.length&&!Object.values(p).some(Boolean))
   return {handled:true,kind:'clarify',text:consultant.reply,
     buttons:[],modelUsed:false,sourceRole:query.sourceRole};
 // The free first-party course is outside app.service_offerings.
 const reikiInquiry=query.named.includes('reiki')&&(!p.session||p.course)&&!p.price&&!p.video&&!p.test&&!p.master&&!p.mandala;
 if(reikiInquiry){add(section('reiki_course',l));add(section('tantra_intro',l));}
 if(!query.named.length&&query.focus==='general'&&!Object.values(p).some(Boolean)){
   add(section('review',l));add(section('tests',l));add(section('reiki_course',l));
 }
 if(p.video)add(section('videos',l));
 if(p.course){
  // Match the requested learning topic before adding any course link.
  if(query.focus==='stress')add(section('opora',l));
  else if(query.named.includes('reiki')||query.focus==='energy'){add(section('reiki_course',l));add(section('tantra_intro',l));add(section('academy',l));}
  else {add(section('reiki_course',l));add(section('opora',l));add(section('academy',l));}
 }
 if(p.test)add(section('tests',l));
 if(p.master)add(section('masters',l));
 if(p.mandala)add(section('mandalas',l));
 if(query.focus==='stress'&&!p.session&&!p.price){
  add(section('opora',l));add(section('videos',l));add(section('review',l));
 }
 const catalogKind=offer=>({
   'homeopathy-consultation':'homeopathy',
   'business-situation-constellation':'business',
   'personal-constellation-session':'constellation',
   'remote-energy-support':'reiki',
   'free-intro-availability-request':'review',
   'free-wu-xing-diagnostic':'tests',
  })[offer.slug]||null;
 const rank=offer=>{
  const id=catalogKind(offer),pos=query.rank.indexOf(id);
  return pos>=0?pos:50;
 };
 const offered=publishedTelegramServiceOffers(services,l)
   .filter(x=>eligibleOffer(x,query))
   .sort((a,b)=>Number(b.free)-Number(a.free)||rank(a)-rank(b)||a.slug.localeCompare(b.slug));
 const resourceOnly=p.video||p.course||p.test||p.master||p.mandala;
 if(!resourceOnly||p.price||p.session||query.named.length)
   for(const offer of offered)add(offer);
 if(reikiInquiry&&!p.course&&!offered.some(offer=>!offer.free&&offer.type==='session')&&
   !['free','under50','under100'].includes(query.preferences.budget))add(section('reiki_session',l));
 // First-party Consultant Mind is an authority for its own published paths.
 // Do not substitute unrelated tests if a named live practitioner is absent.
 if(!entries.length&&consultant?.suggestions?.length){
   for(const row of consultant.suggestions){
     if(entries.length>=3)break;
     // A named request is NOT permission to replace Reiki with video,
     // a constellation with a test, or any other different category.
     if(query.named.length&&!query.named.includes(String(row.id||'').replace(/^service:/,'')))continue;
     add(verifiedConsultantLink(row,l));
   }
 }
 if(!entries.length&&query.named.length&&consultant?.intent==='choose'&&
    ['under50','under100','free'].includes(query.preferences?.budget)){
   const boundary={
     ru:'Не вижу подтверждённой услуги этого типа в вашем бюджете. Цена «от» не гарантирует итоговую стоимость. Хотите увеличить предел или уточнить его у мастера?',
     en:'I cannot verify this kind of service within your budget. A “from” price does not guarantee the final fee. Would you change the ceiling or ask a practitioner?',
     es:'No puedo confirmar este tipo de servicio dentro de tu presupuesto. Un precio «desde» no garantiza el costo final. ¿Cambiar el límite o consultar al profesional?',
   };
   return {handled:true,kind:'no_match',text:boundary[l],
     buttons:[],modelUsed:false,sourceRole:query.sourceRole};
 }
 if(!entries.length){
  // A named paid service is never replaced with unrelated substitutes when
  // the authoritative published-offer read is empty or unavailable.
  if(query.named.length)return {handled:true,text:t.none,buttons:[],kind:'empty',modelUsed:false};
  if(query.focus==='general'){add(section('review',l));add(section('tests',l));add(section('reiki_course',l));}
  else {add(section('review',l));add(section('tests',l));}
 }
 // Free options first, before the Telegram provider's three-button cap.
 // Only a direct price question permits monetary prices in discovery.
 const selected=entries.filter(row=>query.preferences.budget!=='free'||row.free===true)
   .sort((a,b)=>Number(b.free===true)-Number(a.free===true)).slice(0,3);
 if(!selected.length)return {handled:true,text:t.none,buttons:[],kind:'empty',modelUsed:false};
 const showPrice=p.price===true;
 const lines=selected.map((s,i)=>(i+1)+'. '+s.title+
   (s.kind==='service'&&(showPrice||s.free)?' — '+(s.free?t.free:s.price):''));
 let text=t.intro+'\n'+lines.join('\n')+'\n'+t.more;
 // No dynamic/untrusted URL appears in the body; only validated first-party
 // links in Telegram inline URL buttons. Limit responses to provider caps.
 if(text.length>580)text=text.slice(0,575).trimEnd()+'…';
 return {handled:true,kind:'catalog',text,buttons:selected.map(s=>({
   text:s.title.slice(0,48),url:s.href,
 })),modelUsed:false,sourceRole:query.sourceRole};
}

/**
 * Ali's local service-dialogue path for an ALREADY CONSENTED private chatbot.
 * Reuses Sales/Consultant Mind and My Coach's anti-repeat rule without making
 * any provider call, persisting a profile or creating a service order.
 * Only hard-coded, source-validated Holistic House URLs leave this function.
 * The caller keeps its existing signed-chat, consent, STOP and safety gates.
 */
export function composeTelegramAliServiceReply(message,locale='en',history=[]){
 const l=LOCALES.has(locale)?locale:'en';
 if(typeof message!=='string'||!message.trim()||message.length>1400)return null;
 const publicReiki=SERVICE_MATCH.reiki.test(message)&&!CATEGORY.session.test(message)&&
   !CATEGORY.price.test(message)&&!DANGER.test(message);
 if(publicReiki){
   const published=composeTelegramWavePublicReply(message,l);
   if(published)return {...published,kind:'consultant',role:'secretary'};
 }
 const bounded=Array.isArray(history)?history.slice(-8)
   .filter(t=>t&&['user','assistant'].includes(t.role)&&typeof t.text==='string')
   .map(t=>({role:t.role,text:t.text.slice(0,700)})):[];
 // Reuse the exact same role policy as public website and V3 model prompts.
 // The client cannot authorize psychologist mode by writing a role name.
 const role=planWaveMagicTurn({message,locale:l,history:bounded,channel:'telegram',
   safety:{status:DANGER.test(message)?'human_review':'clear'}}).mode;
 const sales=role==='sales'?salesMindTurn({message,locale:l,history:bounded}):null;
 const consultant=sales?null:consultServiceQuestion({message,locale:l,history:bounded});
 const selected=sales||consultant;
 if(!selected||typeof selected.reply!=='string'||!selected.reply.trim())return null;
 const links=(Array.isArray(selected.suggestions)?selected.suggestions:[])
   .map(row=>verifiedConsultantLink(row,l)).filter(Boolean).slice(0,2)
   .map(row=>row.href);
 const text=selected.reply.trim()+(links.length?'\n'+links.join('\n'):'');
 if(text.length>1100||(text.match(/[?？]/gu)||[]).length>1)return null;
 return {text,kind:sales?'sales':'consultant',role:sales?'sales':'secretary',
   modelUsed:false,source:'ali-local-service-director-v1'};
}

/**
 * An ordinary, consented Wave bot chat can use the same verified editorial
 * catalogue as Telegram Business, without its separate CRM/provider privileges.
 * Only fixed first-party index pages are approved here, never fabricated
 * personal services, prices, individual courses or user-derived URLs.
 */
export function composeTelegramWavePublicReply(message,locale='en'){
 const q=classifyTelegramSecretaryQuery(message,locale);
 const broadReiki=q?.kind==='catalog'&&q.named.length===1&&q.named[0]==='reiki'&&
   !q.category.price&&!q.category.session&&!q.category.master&&!q.category.video&&!q.category.test&&!q.category.mandala;
 if(q?.kind!=='catalog'||q.category.price||q.category.session||
   (!broadReiki&&!['course','video','test','master','mandala'].some(k=>q.category[k])))return null;
 if(q.named.length&&!broadReiki)
   return null;
 if(q.category.course&&['work','relationships'].includes(q.focus))return null;
 const planned=composeTelegramSecretaryAnswer(q,[]);
 if(planned?.kind!=='catalog'||!Array.isArray(planned.buttons)||!planned.buttons.length)return null;
 const paths=new Set(Object.values(KNOWN_SECTIONS).map(path=>
   TELEGRAM_SITE+'/'+q.locale+'/'+path));
 if(planned.buttons.some(b=>!paths.has(b.url)))return null;
 const links=planned.buttons.map((b,i)=>(i+1)+'. '+b.url).join('\n');
 const text=planned.text+'\n'+links;
 if(text.length>1100)return null;
 return {text,modelUsed:false,source:'verified-public-catalogue'};
}
