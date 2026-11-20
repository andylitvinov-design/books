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
  availability:'Свободное время уточнит мастер. Какой день или время вам удобны?',
  timeAgain:'Можно указать удобный день или написать «пока не знаю». Когда вам удобно?',
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
  availability:'The practitioner will confirm availability. What day or time suits you?',
  timeAgain:'You can give a preferred time or say “not sure yet”. What works for you?',
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
  availability:'El profesional confirmará los horarios. ¿Qué día u hora te conviene?',
  timeAgain:'Puedes indicar un horario o decir «no lo sé todavía». ¿Qué te conviene?',
  formatAgain:'Para la solicitud, ¿prefieres online o presencial?',
  choiceAgain:'¿Quieres el enlace o ayuda para enviar la solicitud?',
  ready:'Gracias. Revisa la solicitud antes de enviarla. Todavía no hay reserva.',
  link:'Página del servicio:',
  interest:'Interés en el servicio',time:'Horario preferido',mode:'Formato',
  request:'Preferencia de solicitud',service:'Servicio',
 }),
});
const YES=/^(?:да(?:[\s,!.-]*(?:интересно|хочу(?:\s+.{1,45})?|конечно|запишите(?:\s+меня)?|подходит|давайте))?|ага|угу|конечно|интересно|интересует(?:\s+.{1,45})?|меня\s+интересует(?:\s+.{1,45})?|хочу(?:\s+(?:записаться|эту\s+услугу|консультацию|сеанс|попробовать|оформить\s+заявку))?|мне\s+подходит|запишите(?:\s+меня)?|yes(?:[,\s!.-]*(?:please|i(?:'d| would)?\s*like\s*to\s*(?:book|schedule|request)|interested))?|yeah|yep|sure|interested|i(?:'m| am)\s+interested(?:\s+in\s+(?:this|the)\s+(?:service|session|option))?|i(?:'d| would)\s+like\s+to\s+(?:book|request|schedule|reserve|try)|i\s+want\s+to\s+(?:book|schedule|request)|book(?:\s+me)?|sí|si|claro|me\s+interesa(?:\s+.{1,45})?|estoy\s+interesad[oa]|me\s+gustar[ií]a\s+(?:reservar|solicitar|una\s+cita)|quiero\s+(?:reservar|solicitar)|por\s+favor)[.!\s]*$/iu;
const NO=/^(?:нет|не\s+интересно|не\s+интересует|не\s+хочу(?:\s+записываться)?|не\s+готов[а]?\s+записываться|не\s+сейчас|позже|может\s+позже|отмен(?:а|ить)|передумал[а]?|без\s+вопросов|хватит\s+вопросов|no|no\s+thanks|not\s+interested|not\s+now|no\s+thank\s+you|maybe\s+later|no\s+more\s+questions|please\s+stop\s+asking|(?:i\s+)?(?:don't|do\s+not)\s+want\s+to\s+book|not\s+ready\s+to\s+book|cancel(?:\s+it)?|no\s+quiero|no\s+me\s+interesa|no\s+quiero\s+reservar|ahora\s+no|quiz[aá]s\s+despu[eé]s|cancelar)[.!?\s]*$/iu;
const CONFUSED=/^(?:[?!¿¡.\s]{1,8}|что\??|что именно\??|не понял[а]?\??|в смысле\??|huh\??|what\??|what do you mean\??|sorry\??|que\??|qué\??|no entiendo\??)$/iu;
const PERSONAL=/(?:отношен|конфликт|тревог|стыд|страда|пережива|расстава|чувств|болит|семь|депресс|anxiety|feelings|relationship problem|breakup|depress|struggl|conflict|trauma|pain|sentimient|conflicto|ansiedad|ruptura|trauma)/iu;
const TIME=/(?:\b(?:today|tomorrow|tonight|morning|afternoon|evening|weekday|weekend|week|month|next|later|soon|anytime|flexible|monday|tuesday|wednesday|thursday|friday|saturday|sunday|am|pm)\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|\d{1,2}[:.]\d{2}|\d{1,2}[./-]\d{1,2}|сегодн|завтра|послезавтра|утром|дн[её]м|вечером|ночью|недел|месяц|понедел|вторник|сред|четверг|пятниц|суббот|воскресен|удобно\s+в\s+любое|в\s+любое\s+время|cuando|mañana|tarde|noche|semana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|cualquier\s+hora|flexible)/iu;
const FORMAT=/(?:\bonline\b|\bremote\b|\bvideo\b|\bin[ -]?person\b|\beither\b|\bboth\b|\bno preference\b|онлайн|очно|лично|дистанц|вживую|неважно|без\s+разницы|indiferente|presencial|en persona|a distancia|virtual|cualquiera)/iu;
const UNSURE=/^(?:не\s+знаю|не\s+уверен[а]?|пока\s+не\s+знаю|любой\s+вариант|без\s+разницы|not\s+sure|i\s+don't\s+know|i\s+do\s+not\s+know|either|no\s+preference|flexible|no\s+s[eé]|no\s+estoy\s+segur[oa]|cualquiera|indiferente)[.!?\s]*$/iu;
const AVAILABILITY=/^(?:what\s+(?:time|dates?)\s+(?:is|are)?\s*(?:available|open)|when\s+(?:are|is)\s+.*available|are\s+there\s+any\s+(?:appointments|slots)|когда\s+можно|есть\s+ли\s+(?:свободное\s+)?время|какое\s+время\s+доступно|какие\s+времена\s+свободны|cu[aá]ndo\s+hay\s+horarios|qu[eé]\s+horarios\s+hay)[?!.\s]*$/iu;
const LINK=/(?:\blink\b|\bdetails\b|\bpage\b|\bopen\b|ссылк|подробност|страниц|enlace|detalles|página|pagina)/iu;
const HELP=/(?:\bhelp\b|\brequest\b|\bsubmit\b|\barrange\b|\bbook\b|\bappointment\b|помоги|помощ|заявк|запис|организ|solicitud|ayuda|reserv)/iu;
// Preserve user-authored scheduling corrections without asking a completed stage again.
// These are hints only, never appointment availability or a confirmed booking.
const EXTRA_TIME=/(?:\b(?:at|after|before|around)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b|(?:в|после|до|к|около)\s*\d{1,2}(?::\d{2})?\b|\ba\s+las\s+\d{1,2}(?::\d{2})?\b)/iu;
const hasTime=value=>TIME.test(value)||EXTRA_TIME.test(value);
const POSITIVE_ALTERNATIVE=/(?:\b(?:but|instead|rather|prefer)\b|(?:но|зато|лучше|вместо|а\s+(?:в|на|после))|(?:pero|mejor|prefiero|en\s+vez\s+de))/iu;
const NEGATIVE_TIME=/^(?:не\s+(?:могу|подходит|удобно|получится)|неудобно|нельзя|(?:i\s+)?(?:can'?t|cannot)\b|not\s+(?:available|possible)|doesn'?t\s+work|no\s+(?:puedo|me\s+viene\s+bien))/iu;
const NEGATIVE_FORMAT=/^(?:не\s+(?:хочу|могу|надо)(?:\s|$)|(?:i\s+)?(?:don't|do\s+not)\s+(?:want|like)\b|not\b|no\s+quiero\b|sin\b)/iu;
const negativeTimeOnly=value=>NEGATIVE_TIME.test(value)&&!POSITIVE_ALTERNATIVE.test(value);
const negativeFormatOnly=value=>NEGATIVE_FORMAT.test(value)&&FORMAT.test(value)&&!POSITIVE_ALTERNATIVE.test(value);
const CHANGE_TIME=/(?:поменя|измен|перенес|исправ|другой\s+(?:день|час)|другое\s+время|change\s+(?:the\s+)?(?:day|date|time)|reschedule|different\s+(?:day|date|time)|cambiar\s+(?:el\s+)?(?:d[ií]a|horario|hora)|otr[oa]\s+(?:d[ií]a|hora))/iu;
const CHANGE_FORMAT=/(?:поменя.{0,18}формат|измен.{0,18}формат|другой\s+формат|смен.{0,10}формат|change\s+(?:the\s+)?(?:format|mode)|different\s+(?:format|mode)|cambiar\s+(?:el\s+)?formato|otro\s+formato)/iu;
const YES_WITH_DETAILS=/^(?:да|ага|угу|yes|yeah|yep|s[ií])(?:[,!.\s]+|$)/iu;
const BOOKING_WITH_DETAILS=/^(?:(?:хочу|хотел[ао]?\s+бы|можно|запиши(?:те)?).{0,75}(?:запис|консультац|сеанс)|(?:i\s+(?:want|would\s+like)\s+to|can\s+i|please)\b.{0,75}(?:book|schedule|request)|(?:quiero|quisiera|me\s+gustar[ií]a)\b.{0,75}(?:reserv|cita|solicitar))/iu;
const hasInterest=value=>YES.test(value)||BOOKING_WITH_DETAILS.test(value)||
  ((hasTime(value)||FORMAT.test(value))&&YES_WITH_DETAILS.test(value));
const interestValue=(value,locale)=>YES.test(value)?value:
  locale==='ru'?'да':locale==='es'?'sí':'yes';
const formatValue=value=>{
  if(UNSURE.test(value))return value;
  const matches=value.match(/\bonline\b|\bremote\b|\bvideo\b|\bin[ -]?person\b|\beither\b|\bboth\b|\bno preference\b|онлайн|очно|лично|дистанц\p{L}*|вживую|неважно|без\s+разницы|indiferente|presencial|en persona|a distancia|virtual|cualquiera/giu);
  return matches?.length===1?matches[0]:value;
};
const availabilityQuestion=value=>{
  const plain=value.trim().replace(/^[¿¡]+/u,'');
  return /[?？]\s*$/u.test(plain)&&
    (hasTime(plain)||/(?:availability|available|appointment|slot|время|свободн|доступн|horario|disponib)/iu.test(plain))&&
    /^(?:а\s+)?(?:есть\s+ли|можно(?:\s+ли)?|какое|какие|когда|возможно|what|which|when|are\s+there|do\s+you\s+have|could\s+i|can\s+i|can\s+you|is\s+there|hay|tienes|se\s+puede|cu[aá]ndo|qu[eé])/iu.test(plain);
};
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
 // Older sessions sometimes contain unsolicited personal information. Only
 // consent and booking logistics can survive into a reviewed request.
 if(!YES.test(saved.goal||'')){delete saved.goal;delete saved.challenge;delete saved.situation;}
 else{
   if(saved.challenge&&(PERSONAL.test(saved.challenge)||
     !(session?(hasTime(saved.challenge)||UNSURE.test(saved.challenge))&&
       !negativeTimeOnly(saved.challenge):HELP.test(saved.challenge))))
     delete saved.challenge;
   if(saved.situation&&(PERSONAL.test(saved.situation)||
     !(FORMAT.test(saved.situation)||UNSURE.test(saved.situation))||
     negativeFormatOnly(saved.situation)))delete saved.situation;
 }
 let phase=['goal','challenge','situation','ready'].includes(stage)?stage:'goal';
 if(!saved.goal)phase='goal';
 else if(!saved.challenge&&['situation','ready'].includes(phase))phase='challenge';
 else if(session&&!saved.situation&&phase==='ready')phase='situation';
 // STOP/refusal always wins, including after the user has approved a draft.
 if(NO.test(raw))return {stage:'goal',slots:{},kind:'boundary',reply:c.decline};
 if(CONFUSED.test(raw))return {stage:phase,slots:saved,kind:'meta',
   reply:phase==='challenge'?(session?c.timeAgain:c.choiceAgain):
     phase==='situation'?c.formatAgain:phase==='ready'?c.ready:c.clarify};
 if(PERSONAL.test(raw)&&!YES.test(raw)){
   // "I want to book for anxiety" contains a private topic AND a booking
   // request. Respect the booking request without storing the disclosure.
   if(phase==='goal'&&hasInterest(raw)){
     saved.goal=interestValue(raw,locale);
     if(session&&FORMAT.test(raw)&&!negativeFormatOnly(raw))
       saved.situation=formatValue(raw);
     return {stage:'challenge',slots:saved,kind:'clarify',
       reply:c.details+' '+(session?c.when:c.choice)};
   }
   return {stage:phase,slots:saved,kind:'boundary',
     reply:c.details+' '+aliServiceSecretaryQuestion(locale,phase,kind)};
 }
 if(LINK.test(raw)&&typeof url==='string'&&url.startsWith('https://holistichouse.vercel.app/'))
   return {stage:phase,slots:saved,kind:'link',reply:c.link+' '+url};
 if(AVAILABILITY.test(raw)||availabilityQuestion(raw))
   return {stage:phase,slots:saved,kind:'meta',reply:c.availability};
 if(session&&phase!=='goal'){
   if(CHANGE_TIME.test(raw)&&!hasTime(raw)){
     delete saved.challenge;
     return {stage:'challenge',slots:saved,kind:'clarify',reply:c.timeAgain};
   }
   if(CHANGE_FORMAT.test(raw)&&!FORMAT.test(raw)){
     delete saved.situation;
     return {stage:saved.challenge?'situation':'challenge',slots:saved,
       kind:'clarify',reply:saved.challenge?c.formatAgain:c.timeAgain};
   }
   if(negativeTimeOnly(raw)&&hasTime(raw)){
     delete saved.challenge;
     return {stage:'challenge',slots:saved,kind:'clarify',reply:c.timeAgain};
   }
   if(negativeFormatOnly(raw)){
     delete saved.situation;
     return {stage:saved.challenge?'situation':'challenge',slots:saved,
       kind:'clarify',reply:saved.challenge?c.formatAgain:c.timeAgain};
   }
 }
 const time=hasTime(raw)&&!negativeTimeOnly(raw);
 const format=FORMAT.test(raw)&&!negativeFormatOnly(raw);
 if(phase==='goal'){
   if(!hasInterest(raw))return {stage:phase,slots:saved,kind:'meta',reply:c.clarify};
   saved.goal=interestValue(raw,locale);
   if(session){
     if(time)saved.challenge=raw;
     if(format)saved.situation=formatValue(raw);
     if(saved.challenge&&saved.situation)
       return {stage:'ready',slots:saved,reply:c.ready};
     return {stage:saved.challenge?'situation':'challenge',slots:saved,
       reply:saved.challenge?c.format:c.when};
   }
   return {stage:'challenge',slots:saved,reply:c.choice};
 }
 if(!session){
   if(phase==='challenge'){
     if(!HELP.test(raw))return {stage:phase,slots:saved,kind:'meta',reply:c.choiceAgain};
     saved.challenge=raw;
   }
   return {stage:'ready',slots:saved,reply:c.ready};
 }
 if(phase==='challenge'){
   // Reply order is free: "online" before a day is useful evidence, not a
   // reason to re-ask the online/in-person question after the day arrives.
   if(format)saved.situation=formatValue(raw);
   if(time||UNSURE.test(raw))saved.challenge=raw;
   if(!saved.challenge)return {stage:'challenge',slots:saved,
     kind:'clarify',reply:c.timeAgain};
   if(saved.situation)return {stage:'ready',slots:saved,reply:c.ready};
   return {stage:'situation',slots:saved,reply:c.format};
 }
 if(phase==='situation'){
   if(time)saved.challenge=raw;
   if(format||UNSURE.test(raw))saved.situation=format?formatValue(raw):raw;
   if(!saved.situation)return {stage:'situation',slots:saved,kind:'clarify',reply:c.formatAgain};
   return {stage:'ready',slots:saved,reply:c.ready};
 }
 // A reviewed request is still editable. Only the corrected field changes;
 // an unknown "yes" here never creates or transmits a new request.
 if(time)saved.challenge=raw;
 if(format)saved.situation=formatValue(raw);
 return {stage:'ready',slots:saved,reply:c.ready};
}
export function aliServiceSecretarySummary({locale='en',slots={},title='',kind='session'}={}){
 const c=copy(locale),s=selectedSlots(slots);
 if(!YES.test(s.goal||'')||PERSONAL.test(s.challenge||'')||PERSONAL.test(s.situation||'')||!(appointment(kind)?
   (hasTime(s.challenge||'')||UNSURE.test(s.challenge||''))&&
   !negativeTimeOnly(s.challenge||'')&&
   (FORMAT.test(s.situation||'')||UNSURE.test(s.situation||''))&&
   !negativeFormatOnly(s.situation||''):
   HELP.test(s.challenge||'')))return null;
 const rows=[c.service+': '+bounded(title),c.interest+': '+s.goal,
   (appointment(kind)?c.time:c.request)+': '+s.challenge];
 if(appointment(kind))rows.push(c.mode+': '+s.situation);
 return rows.join('\n').slice(0,900);
}
