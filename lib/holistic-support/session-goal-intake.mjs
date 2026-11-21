// Goal-first, private-by-default Sessions intake for the existing Messenger.
// Pure editorial routing: no diagnosis, provider calls, personal data storage or charges.
const choices = {
  en: [
    {id:"personal",label:"Understand my situation",description:"Make sense of a personal difficulty or choice"},
    {id:"relationships",label:"Relationships & family",description:"Explore communication and recurring patterns"},
    {id:"wellbeing",label:"Stress & inner state",description:"Work with feelings, tension or self-support"},
    {id:"business",label:"Work & business",description:"Clarify a decision, conflict or team challenge"},
  ],
  ru: [
    {id:"personal",label:"Разобраться в ситуации",description:"Понять личную трудность или сложный выбор"},
    {id:"relationships",label:"Отношения и семья",description:"Разобрать общение и повторяющиеся ситуации"},
    {id:"wellbeing",label:"Стресс и внутреннее состояние",description:"Поработать с переживаниями и напряжением"},
    {id:"business",label:"Работа и бизнес",description:"Прояснить решение, конфликт или вопрос команды"},
  ],
  es: [
    {id:"personal",label:"Comprender mi situación",description:"Aclarar una dificultad o decisión personal"},
    {id:"relationships",label:"Relaciones y familia",description:"Explorar la comunicación y los patrones repetidos"},
    {id:"wellbeing",label:"Estrés y bienestar",description:"Trabajar con emociones y tensión"},
    {id:"business",label:"Trabajo y negocios",description:"Aclarar una decisión, un conflicto o un reto de equipo"},
  ],
};
const copy = {
  en:{
    detail:"What would you like to understand or change as a result? You can describe it in your own words; you don't need to choose a therapy.",
    offersLabel:"Options matched to your goal",
    results:{
      personal:"For your personal question, these may be useful starting points. You can decide whether to book anything.",
      relationships:"For a relationship or family goal, these approaches may be relevant. The choice is yours.",
      wellbeing:"For support with your inner state, here are some possible starting points—not a diagnosis or a promise of treatment.",
      business:"For your work or business goal, these options may help clarify the next steps.",
    },
  },
  ru:{
    detail:"Что именно вы хотите понять или изменить в результате? Можно ответить своими словами — выбирать метод терапии пока не нужно.",
    offersLabel:"Варианты под вашу цель",
    results:{
      personal:"Для вашего личного запроса могут подойти следующие первые шаги. Запись необязательна.",
      relationships:"Для запроса об отношениях или семье можно рассмотреть эти подходы. Выбор остаётся за вами.",
      wellbeing:"Для работы с внутренним состоянием можно рассмотреть такие варианты. Это не диагноз и не обещание лечения.",
      business:"Для вопроса о работе или бизнесе могут подойти эти способы прояснить дальнейшие действия.",
    },
  },
  es:{
    detail:"¿Qué te gustaría comprender o cambiar como resultado? Puedes explicarlo libremente; aún no necesitas elegir una terapia.",
    offersLabel:"Opciones según tu objetivo",
    results:{
      personal:"Para tu situación personal, estos pueden ser primeros pasos útiles. Reservar es opcional.",
      relationships:"Para un objetivo familiar o de relaciones, estas opciones pueden ser pertinentes. Tú decides.",
      wellbeing:"Para explorar tu estado emocional, estas son algunas posibilidades, no un diagnóstico ni una promesa de tratamiento.",
      business:"Para tu objetivo laboral o empresarial, estas opciones pueden ayudar a aclarar los próximos pasos.",
    },
  },
};
const offerDescriptions = {
  en:{
    "free-review":"A free written first look to clarify what kind of support you want.",
    imagery:"A guided session exploring inner experiences and responses.",
    constellations:"For reflecting on repeated patterns in family and relationships.",
    business:"For decisions, team dynamics and business priorities.",
  },
  ru:{
    "free-review":"Бесплатный письменный разбор, чтобы уточнить запрос до записи.",
    imagery:"Направленная работа с внутренними образами и переживаниями.",
    constellations:"Чтобы исследовать повторяющиеся сценарии в семье и отношениях.",
    business:"Для решений, командных отношений и приоритетов в бизнесе.",
  },
  es:{
    "free-review":"Una revisión escrita gratuita para aclarar el objetivo antes de reservar.",
    imagery:"Una sesión guiada para explorar experiencias y respuestas internas.",
    constellations:"Para explorar patrones repetidos en la familia y las relaciones.",
    business:"Para decisiones, equipos y prioridades empresariales.",
  },
};
export function sessionGoalChoices(locale){return choices[locale]||choices.en;}
export function sessionCopy(locale){return copy[locale]||copy.en;}
export function sessionOfferDescription(locale,id){return (offerDescriptions[locale]||offerDescriptions.en)[id]||"";}
export function sessionGoalForText(value){
  if(typeof value!=="string"||!value.trim())return null;
  const text=value.normalize("NFKC").toLocaleLowerCase();
  if(/relationship|family|partner|marriage|couple|divorc|parent|mother|father|love|отношени|семь|партн|супруг|развод|родител|мам|пап|любов|relaci[oó]n|familia|pareja|matrimonio|divorcio|madre|padre|amor/iu.test(text))return "relationships";
  if(/stress|anxiet|overwhelm|burnout|fear|worr|tension|fatigue|sadness|эмоци|тревог|стресс|страх|напряж|выгоран|устал|паник|agotamiento|ansiedad|estr[eé]s|miedo|tensi[oó]n|emocion|cansancio/iu.test(text))return "wellbeing";
  if(/business|workplace|at work|work-related|office|career|colleague|boss|manager|team|job|employment|company|бизнес|на работе|работа|работе|работы|рабоч|карьер|коллег|начальн|руковод|negoci|empresa|trabajo|laboral|equipo|jefe|empleo|oficina|carrera/iu.test(text))return "business";
  if(/situation|choice|decision|uncertain|myself|understand|goal|ситуац|выбор|решени|поня|разобрат|смысл|личн|problema|situaci[oó]n|decisi[oó]n|comprender|objetivo/iu.test(text))return "personal";
  return null;
}
export function sessionOfferIds(goal){
  switch(goal){
    case "business": return ["business","free-review"];
    case "relationships": return ["constellations","imagery","free-review"];
    case "wellbeing": return ["free-review","imagery"];
    default: return ["free-review","imagery"];
  }
}


/**
 * Ali's compact website Sessions secretary. No diagnosis, consent grant,
 * booking, CRM transfer, invented availability, price or third-party model.
 * Match only explicit published service names; do not choose a service from
 * an emotion or a guessed psychological cause.
 */
const SESSION_EXACT_SERVICES=Object.freeze([
  ['free-review',/(?:бесплатн\p{L}*.{0,28}(?:разбор|анализ\s+ситуаци|письменн\p{L}*.{0,10}анализ)|(?:разбор|анализ\s+ситуаци).{0,20}бесплатн|free.{0,24}(?:written|situation|personal).{0,15}review|free.{0,15}review|revisi[oó]n.{0,20}gratuita|an[aá]lisis.{0,20}gratuito)/iu],
  ['imagery',/(?:символдрам|(?:образн|воображени).{0,20}(?:психотерап|терап)|(?:психотерап|терап).{0,20}(?:образ|воображени)|guided imagery|imagery therapy|terapia.{0,20}im[aá]genes|im[aá]genes guiadas)/iu],
  ['constellations',/(?:расстановк|расстановок|constellation|constelaci[oó]n)/iu],
  ['business',/(?:бизнес.{0,14}(?:консультац|анализ)|(?:консультац|анализ).{0,14}бизнес|business consult|business analys|consultor[ií]a.{0,16}negoci|consulta.{0,16}negoci|an[aá]lisis.{0,16}empresarial)/iu],
]);
const SESSION_GREETING=/^(?:привет(?:ик)?|здравствуй(?:те)?|добрый день|hello|hi|hey|hola|buenas)[!?.\s]*$/iu;
const SESSION_TOPIC_CHANGE=/^(?:сменим тему|сменить тему|другая тема|новая тема|let'?s change the subject|change topic|new topic|switch topics|cambiar de tema|otro tema)[!?.\s]*$/iu;
const SESSION_STOP=/^(?:\/stop|стоп|отмена|отменить|хватит|не сейчас|не хочу продолжать|нет(?:,?\s*спасибо)?|позже|stop|cancel|not now|no(?:,?\s*thanks)?|maybe later|don't continue|do not continue|basta|parar|cancelar|ahora no|no(?:,?\s*gracias)?|quiz[aá]s despu[eé]s)[.!?\s]*$/iu;
const SESSION_NO_BOOK=/(?:не хочу (?:записыват|записыв|бронироват)|не надо меня записывать|без записи|(?:i\s+)?(?:do not|don't)\s+want\s+to\s+(?:book|schedule)|no bookings?|no quiero reservar|sin reserva)/iu;
const SESSION_PRICE=/(?:сколько\s+сто|цен[аеуы]|стоимост|платн|бесплатн\p{L}*\s*\??$|how much|cost|price|fee|is it free|cu[aá]nto cuesta|cu[aá]nto vale|precio|costo|gratis\s*\??$)/iu;
const SESSION_AVAILABILITY=/(?:есть ли.{0,30}(?:время|окошк|свободн)|когда.{0,20}(?:запис|можно)|какое\s+время|which.{0,12}(?:time|day)|when.{0,16}(?:available|appointment|book)|(?:are there|do you have).{0,25}(?:slots|appointments|time)|disponib|horarios|cu[aá]ndo.{0,12}(?:cita|reservar))/iu;
const SESSION_INFO=/^(?:что\s+такое|как\s+(?:работа|проход|устроен)|расскажи(?:те)?\s+(?:про|об?|пожалуйста)|есть\s+ли\s+у\s+вас|у\s+вас\s+есть|what\s+(?:is|are)|how\s+does|how\s+do|tell\s+me\s+about|can\s+you\s+explain|do\s+you\s+(?:have|offer)|what\s+happens\s+in|qu[eé]\s+es|c[oó]mo\s+(?:funciona|se\s+realiza)|cu[eé]ntame|ofrecen|tienen)/iu;
const SESSION_PHOTO=/(?:почему.{0,15}фото|зачем.{0,15}фото|фото.{0,15}(?:нужно|требует)|why.{0,15}(?:photo|picture)|foto.{0,15}(?:necesari|obligatori)|por qu[eé].{0,15}foto)/iu;
const SESSION_CONFUSED=/^(?:что|что именно|не понял[а]?|поясните|в смысле|why|what|huh|what do you mean|no entiendo|qu[eé]|que)[?!.\s]*$/iu;
const SESSION_NEGATED_PREFIX=/(?:^|[\s,;.!])(?:не(?:\s+(?:хочу|нужн[аоы]|надо|интересует|интересуют))?|не\s+нравится|no(?:\s+(?:quiero|me interesa))?|not(?:\s+interested\s+in)?|don['’]?t\s+want|do\s+not\s+want)\s*$/iu;
const SESSION_NEGATED_SUFFIX=/^\s*(?:не\s+(?:хочу|интересует|интересуют)|not\s+interested|no\s+quiero)/iu;
function explicitlyNegatedService(text,match){
  const prefix=text.slice(Math.max(0,match.index-45),match.index);
  const suffix=text.slice(match.index+match[0].length,match.index+match[0].length+36);
  return SESSION_NEGATED_PREFIX.test(prefix)||SESSION_NEGATED_SUFFIX.test(suffix);
}
const SESSION_BOOK=/(?:хочу записаться|хочу консультацию|мне нужна консультация|можно (?:ли )?записаться|запиши(?:те)? меня|записаться на|(?:i\s+)?(?:want|would like)\s+(?:to\s+(?:book|schedule)|a\s+(?:consultation|session))|(?:can|could)\s+i\s+(?:book|schedule)|book\s+(?:a|me)|make an appointment|quiero reservar|quiero una consulta|puedo reservar|me gustar[ií]a reservar|agendar una cita)/iu;
const SESSION_BARE_YES=/^(?:да|ага|угу|ок|окей|yes|yep|sure|okay|ok|s[ií]|vale|claro)[!?.\s]*$/iu;
const SESSION_UNSURE_SERVICE=/(?:не\s+(?:уверен|уверена|знаю)|сомневаюсь|not\s+sure\s+(?:about|if)|unsure\s+about|no\s+estoy\s+segur[oa]|tengo\s+dudas\s+sobre)/iu;
const SESSION_OUTCOME=/(?:хочу|хотел[ао]? бы|мне (?:нужно|важно)|желаю|цель|для того чтобы|чтобы (?:стало|решить|изменить)|i (?:want|need|would like|hope)|i'd like|so that|my goal|i wish|quiero|necesito|me gustar[ií]a|mi objetivo|para poder)/iu;
const SESSION_COPIES=Object.freeze({
  ru:Object.freeze({priceUnknown:'Цена зависит от конкретной услуги. Какую услугу вы рассматриваете?',availabilityUnknown:'Время согласуется со специалистом после заявки. Для какой услуги хотите уточнить расписание?',information:'Могу показать опубликованную страницу услуги и её описание. Это не запись и не обещание результата.',greeting:'Здравствуйте! Мы можем просто уточнить нужную услугу, без личных подробностей. Что вас интересует?',topic:'Конечно, сменим тему. О чём хотели бы поговорить?',stop:'Хорошо, остановимся. Ничего не отправлено и запись не оформлена.',
    noBooking:'Конечно, без записи. Можно просто посмотреть информацию об услугах.',
    price:'Стоимость и условия зависят от конкретной услуги. Актуальные сведения — в её карточке; я не подтверждаю оплату.',
    availability:'Свободное время уточняет специалист. Пока запись не сделана.',
    photo:'Для выбора услуги или заявки личное фото не требуется.',
    confused:'Можно коротко назвать нужную услугу или описать цель. Подробности личной жизни не обязательны.',
    book:'Помогу найти нужную услугу. На какую консультацию хотите записаться?',
    ambiguity:'Вы назвали несколько услуг. Какую из них хотите рассмотреть сначала?',
    selection:'Вы выбрали эту услугу. Ниже её проверенная страница — там указаны подробности и порядок обращения. Запись пока не оформлена.'}),
  en:Object.freeze({priceUnknown:'The cost depends on the service. Which one are you asking about?',availabilityUnknown:'The practitioner confirms availability after a request. Which service do you mean?',information:'I can show the published service description and options. This is not a booking or a guarantee of results.',greeting:'Hello! We can find a service without personal questions. What interests you?',topic:'Of course, we can change topics. What would you like to discuss?',stop:'Of course, we can stop. Nothing has been sent or booked.',
    noBooking:'Of course, no booking. You can simply explore service information.',
    price:'Prices and conditions depend on the selected service. Please check its published page; no payment has been confirmed.',
    availability:'The practitioner will confirm available times. Nothing has been booked yet.',
    photo:'You do not need a personal photo to choose or request a service.',
    confused:'You can name the service or describe what you hope to achieve. Personal details are not required.',
    book:'I can help you find the right service. Which consultation would you like to request?',
    ambiguity:'You mentioned more than one service. Which would you like to explore first?',
    selection:'You selected this service. Its verified page is below with details and request options. Nothing has been booked yet.'}),
  es:Object.freeze({priceUnknown:'El precio depende del servicio. ¿Cuál te interesa?',availabilityUnknown:'El profesional confirma la disponibilidad después de la solicitud. ¿De qué servicio se trata?',information:'Puedo mostrar la página publicada del servicio y sus condiciones. No es una reserva ni una garantía de resultados.',greeting:'¡Hola! Podemos buscar un servicio sin preguntas personales. ¿Qué te interesa?',topic:'Claro, cambiamos de tema. ¿De qué te gustaría hablar?',stop:'Claro, paramos aquí. No se ha enviado ni reservado nada.',
    noBooking:'Claro, sin reserva. Puedes consultar la información de los servicios.',
    price:'Los precios y las condiciones dependen del servicio. Consulta su página publicada; no se ha confirmado ningún pago.',
    availability:'El profesional confirmará la disponibilidad. Todavía no hay ninguna reserva.',
    photo:'No necesitas una foto personal para elegir o solicitar un servicio.',
    confused:'Puedes nombrar el servicio o contar qué te gustaría conseguir. No hacen falta detalles personales.',
    book:'Te ayudo a encontrar el servicio. ¿Qué consulta te gustaría solicitar?',
    ambiguity:'Has mencionado más de un servicio. ¿Cuál quieres explorar primero?',
    selection:'Has elegido este servicio. Su página verificada aparece abajo con los detalles. Aún no hay reserva.'}),
});
export function sessionSecretaryCopy(locale='en'){
  return SESSION_COPIES[locale]||SESSION_COPIES.en;
}
export function sessionHasOutcome(value){
  return typeof value==='string'&&SESSION_OUTCOME.test(value);
}
/** @returns {{kind: 'continue'|'topic'|'stop'|'greeting'|'no_booking'|'photo'|'price'|'availability'|'information'|'confused'|'ambiguous'|'service'|'booking', reply: string, serviceId?: string}} */
export function sessionSecretaryMessage(value,locale='en'){
  if(typeof value!=='string')return Object.freeze({kind:'continue',reply:''});
  const raw=value.trim().slice(0,320),c=sessionSecretaryCopy(locale);
  if(!raw)return Object.freeze({kind:'continue',reply:''});
  if(SESSION_TOPIC_CHANGE.test(raw))return Object.freeze({kind:'topic',reply:c.topic});
  if(SESSION_STOP.test(raw))return Object.freeze({kind:'stop',reply:c.stop});
  if(SESSION_GREETING.test(raw))return Object.freeze({kind:'greeting',reply:c.greeting});
  if(SESSION_NO_BOOK.test(raw))return Object.freeze({kind:'no_booking',reply:c.noBooking});
  if(SESSION_PHOTO.test(raw))return Object.freeze({kind:'photo',reply:c.photo});
  const matched=SESSION_EXACT_SERVICES.flatMap(([id,pattern])=>{
    const match=pattern.exec(raw);
    return match?[{id,match}]:[];
  });
  const found=matched.filter(({match})=>!explicitlyNegatedService(raw,match));
  // A service name in a price/availability question is context, not a
  // booking instruction. Return its VERIFIED catalogue id as a link hint only.
  const pageHint=found.length===1?{serviceId:found[0].id}:{};
  if(SESSION_PRICE.test(raw)&&
    (/[?？]\s*$/.test(raw)||/^(?:сколько|цена|стоимость|how much|what(?:'s| is)|price|cost|precio|cu[aá]nto)/iu.test(raw)))
    return Object.freeze({kind:'price',reply:found.length===1?c.price:c.priceUnknown,...pageHint});
  if(SESSION_AVAILABILITY.test(raw))
    return Object.freeze({kind:'availability',reply:found.length===1?c.availability:c.availabilityUnknown,...pageHint});
  if(SESSION_INFO.test(raw.replace(/^[¿¡]+/u,'')))
    return found.length>0?Object.freeze({kind:'information',reply:c.information,...pageHint}):
      Object.freeze({kind:'confused',reply:c.confused});
  if(SESSION_UNSURE_SERVICE.test(raw)&&matched.length>0)
    return Object.freeze({kind:'confused',reply:c.confused});
  if(matched.length>0&&found.length===0)
    return Object.freeze({kind:'no_booking',reply:c.noBooking});
  if(found.length>1)return Object.freeze({kind:'ambiguous',reply:c.ambiguity});
  if(found.length===1)return Object.freeze({kind:'service',serviceId:found[0].id,reply:c.selection});
  if(SESSION_BARE_YES.test(raw))return Object.freeze({kind:'confused',reply:c.confused});
  if(SESSION_CONFUSED.test(raw)||/^[?？!。.,\s]{1,6}$/u.test(raw))return Object.freeze({kind:'confused',reply:c.confused});
  if(SESSION_BOOK.test(raw))return Object.freeze({kind:'booking',reply:c.book});
  return Object.freeze({kind:'continue',reply:''});
}
