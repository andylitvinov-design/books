/**
 * Ali booking secretary. Never a therapy or diagnostic interview.
 * Explicit user preferences only; signed caller retains consent/STOP/CRM Send.
 * Personal questions are exclusive to the separate free-diagnostic workflow.
 */
const LANG=Object.freeze({
 ru:Object.freeze({
  first:'Хотите оформить заявку на эту услугу?',when:'Какой день или время вам удобны?',
  format:'Вам удобнее онлайн или очно?',choice:'Нужна ссылка или помощь с заявкой?',
  clarify:'Я помогу уточнить услугу и условия записи. Хотите оформить заявку?',
  details:'Личные подробности для записи не нужны.',
  decline:'Понял. Заявку не отправляю.',
  timeAgain:'Для записи достаточно удобного дня или времени. Когда вам удобно?',
  formatAgain:'Для заявки достаточно выбрать формат: онлайн или очно?',
  choiceAgain:'Вы хотите получить ссылку или передать заявку мастеру?',
  ready:'Спасибо. Проверьте заявку перед отправкой. Время ещё не подтверждено.',
  link:'Страница выбранной услуги:',
  interest:'Интерес к услуге',time:'Предпочтительное время',mode:'Формат',
  request:'Пожелание по заявке',service:'Услуга',
 }),
 en:Object.freeze({
  first:'Would you like to request this service?',when:'What day or time would suit you?',
  format:'Would you prefer online or in person?',
  choice:'Would you like the details link or help with a request?',
  clarify:'I can help with service details and scheduling. Would you like to request it?',
  details:'No personal details are needed to arrange this service.',
  decline:'Understood. I will not send a request.',
  timeAgain:'I only need your preferred day or time. When would suit you?',
  formatAgain:'For the request, would you prefer online or in person?',
  choiceAgain:'Would you like the link or help sending a request?',
  ready:'Thank you. Please review your request before sending. Nothing is booked yet.',
  link:'Selected service page:',
  interest:'Interest in service',time:'Preferred time',mode:'Format',
  request:'Request preference',service:'Service',
 }),
 es:Object.freeze({
  first:'¿Quieres solicitar este servicio?',when:'¿Qué día u hora te conviene?',
  format:'¿Prefieres online o presencial?',
  choice:'¿Quieres el enlace o ayuda para enviar la solicitud?',
  clarify:'Puedo ayudarte con el servicio y la reserva. ¿Quieres solicitarlo?',
  details:'No necesitas contar detalles personales para solicitar este servicio.',
  decline:'Entendido. No enviaré ninguna solicitud.',
  timeAgain:'Solo necesito un día u horario que te convenga. ¿Cuál prefieres?',
  formatAgain:'Para la solicitud, ¿prefieres online o presencial?',
  choiceAgain:'¿Quieres el enlace o ayuda para enviar la solicitud?',
  ready:'Gracias. Revisa la solicitud antes de enviarla. Todavía no hay reserva.',
  link:'Página del servicio:',
  interest:'Interés en el servicio',time:'Horario preferido',mode:'Formato',
  request:'Preferencia de solicitud',service:'Servicio',
 }),
});
const YES=/^(?:да(?:,?\s*интересно)?|да,?\s*хочу|ага|угу|конечно|интересно|хочу(?:\s+(?:записаться|эту услугу|консультацию|сеанс))?|запишите меня|yes|yes,?\s*(?:please|i(?:'d| would) like to|interested)|sure|interested|please|i(?:'d| would) like to (?:book|request)|i want to (?:book|schedule|request)|book(?: me)?|sí|si|claro|me interesa|quiero (?:reservar|solicitar)|por favor)[.!\s]*$/iu;
const NO=/^(?:нет|не интересно|не интересует|не хочу(?:\s+записываться)?|не готов[а]?\s+записываться|не сейчас|позже|no|no thanks|not interested|not now|no thank you|(?:i )?(?:don't|do not) want to book|not ready to book|no quiero|no me interesa|no quiero reservar|ahora no)[.!\s]*$/iu;
const CONFUSED=/^(?:[?!¿¡.\s]{1,8}|что\??|что именно\??|не понял[а]?\??|в смысле\??|huh\??|what\??|what do you mean\??|sorry\??|que\??|qué\??|no entiendo\??)$/iu;
const PERSONAL=/(?:отношен|конфликт|тревог|стыд|страда|пережива|расстава|чувств|болит|семь|депресс|anxiety|feelings|relationship problem|breakup|depress|struggl|conflict|trauma|pain|sentimient|conflicto|ansiedad|ruptura|trauma)/iu;
const TIME=/(?:\b(?:today|tomorrow|tonight|morning|afternoon|evening|weekday|weekend|week|month|next|later|soon|anytime|flexible|monday|tuesday|wednesday|thursday|friday|saturday|sunday|am|pm)\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|\d{1,2}[:.]\d{2}|\d{1,2}[./-]\d{1,2}|сегодн|завтра|послезавтра|утром|дн[её]м|вечером|ночью|недел|месяц|понедел|вторник|сред|четверг|пятниц|суббот|воскресен|удобно\s+в\s+любое|в\s+любое\s+время|cuando|mañana|tarde|noche|semana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|cualquier\s+hora|flexible)/iu;
const FORMAT=/(?:\bonline\b|\bremote\b|\bvideo\b|\bin[ -]?person\b|\beither\b|\bboth\b|\bno preference\b|онлайн|очно|лично|дистанц|вживую|неважно|без\s+разницы|indiferente|presencial|en persona|a distancia|virtual|cualquiera)/iu;
const LINK=/(?:\blink\b|\bdetails\b|\bpage\b|\bopen\b|ссылк|подробност|страниц|enlace|detalles|página|pagina)/iu;
const HELP=/(?:\bhelp\b|\brequest\b|\bsubmit\b|\barrange\b|\bbook\b|\bappointment\b|помоги|помощ|заявк|запис|организ|solicitud|ayuda|reserv)/iu;
const appointment=kind=>!['access','course','creative','review'].includes(kind);
const copy=locale=>LANG[locale]||LANG.en;
const bounded=value=>typeof value==='string'?value.trim().slice(0,360):'';
const selectedSlots=slots=>Object.fromEntries(['goal','challenge','situation'].flatMap(key=>bounded(slots?.[key])?[[key,bounded(slots[key])]]:[]));
export function aliServiceSecretaryFirst(locale='en'){return copy(locale).first;}
export function aliServiceSecretaryQuestion(locale='en',stage='goal',kind='session'){
 const c=copy(locale);return stage==='challenge'?(appointment(kind)?c.when:c.choice):
   stage==='situation'?c.format:c.first;
}
export function aliServiceSecretaryTurn({message='',locale='en',stage='goal',slots={},kind='session',url=null}={}){
 const c=copy(locale),raw=bounded(message),saved=selectedSlots(slots),session=appointment(kind);
 if(!raw||raw.startsWith('/'))return null;
 if(CONFUSED.test(raw))return {stage,slots:saved,kind:'meta',reply:c.clarify};
 if(NO.test(raw)&&stage==='goal')return {stage,slots:saved,kind:'boundary',reply:c.decline};
 // Do not mirror a disclosure into a booking application.
 if(PERSONAL.test(raw)&&!YES.test(raw))
   return {stage,slots:saved,kind:'boundary',reply:c.details+' '+aliServiceSecretaryQuestion(locale,stage,kind)};
 if(stage==='goal'){
   if(!YES.test(raw))return {stage,slots:saved,kind:'meta',reply:c.clarify};
   saved.goal=raw;
   return {stage:'challenge',slots:saved,reply:session?c.when:c.choice};
 }
 if(stage==='challenge'){
   if(!session){
     if(LINK.test(raw)&&typeof url==='string'&&url.startsWith('https://holistichouse.vercel.app/'))
       return {stage,slots:saved,kind:'link',reply:c.link+' '+url};
     if(!HELP.test(raw))return {stage,slots:saved,kind:'meta',reply:c.choiceAgain};
     saved.challenge=raw;
     return {stage:'ready',slots:saved,reply:c.ready};
   }
   if(!TIME.test(raw))return {stage,slots:saved,kind:'meta',reply:c.timeAgain};
   saved.challenge=raw;
   return {stage:'situation',slots:saved,reply:c.format};
 }
 if(stage==='situation'){
   if(!FORMAT.test(raw))return {stage,slots:saved,kind:'meta',reply:c.formatAgain};
   saved.situation=raw;
   return {stage:'ready',slots:saved,reply:c.ready};
 }
 return {stage:'ready',slots:saved,reply:c.ready};
}
export function aliServiceSecretarySummary({locale='en',slots={},title='',kind='session'}={}){
 const c=copy(locale),s=selectedSlots(slots);
 if(!s.goal||!s.challenge||(appointment(kind)&&!s.situation))return null;
 const rows=[c.service+': '+bounded(title),c.interest+': '+s.goal,
   (appointment(kind)?c.time:c.request)+': '+s.challenge];
 if(appointment(kind))rows.push(c.mode+': '+s.situation);
 return rows.join('\n').slice(0,900);
}
