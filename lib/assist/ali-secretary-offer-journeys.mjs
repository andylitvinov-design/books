/**
 * Ali Secretary Mind · published 35-link conversation journey catalogue.
 * Exact site destinations/prices mirror ServicesThreeVisibleOptions; no guess,
 * model inference, booking, payment or database write. Signed caller owns
 * consent, STOP, encrypted progress and reviewed CRM handoff.
 */
import {TELEGRAM_SERVICE_OPTIONS} from './telegram-service-options.mjs';
export const ALI_SECRETARY_JOURNEYS_VERSION='ali-secretary-offers-v2';
const RAW={
  "reiki_remote": [
    "session",
    "services/remote-energy-support",
    "quote",
    "Какую поддержку хотите получить на дистанционном сеансе?",
    "Вам удобнее живой онлайн-сеанс или формат без видео?",
    "What would you like support with in a remote session?",
    "Would you prefer a live online session or support without video?",
    "¿Qué buscas en una sesión a distancia?",
    "¿Prefieres una sesión en directo o sin vídeo?"
  ],
  "reiki_tantra": [
    "access",
    "academy/reiki/tantra-reiki/free-initiation",
    "free",
    "Хотите познакомиться с практикой или узнать об инициации?",
    "Что хотелось бы попробовать в первую очередь?",
    "Would you like an introduction to the practice or initiation information?",
    "What would you like to explore first?",
    "¿Prefieres conocer la práctica o informarte sobre la iniciación?",
    "¿Qué te gustaría explorar primero?"
  ],
  "reiki_yggdrasil": [
    "course",
    "academy/reiki/yggdrasil",
    "quote",
    "Какую ступень Рейки Иггдрасиль вы рассматриваете?",
    "Интереснее программа или личное обучение с мастером?",
    "Which level of Yggdrasil Reiki interests you?",
    "Are you looking for the programme or guidance from a teacher?",
    "¿Qué nivel de Reiki Yggdrasil te interesa?",
    "¿Buscas el programa o aprender con un maestro?"
  ],
  "browse_tests": [
    "access",
    "tests",
    "free",
    "Что хотите проверить: энергию, отношения или работу?",
    "Хотите подобрать тест или пройти один сразу?",
    "Would you like to explore energy, relationships or work?",
    "Would you like help choosing a test or to start one?",
    "¿Quieres explorar energía, relaciones o trabajo?",
    "¿Te ayudo a elegir una prueba o prefieres empezar?"
  ],
  "browse_situation": [
    "review",
    "services/free-situation-review",
    "free",
    "Какую ситуацию хотите разобрать письменно?",
    "Какого изменения вы ждёте в этой ситуации?",
    "What situation would you like a written review of?",
    "What would you most like to change about it?",
    "¿Qué situación quieres revisar por escrito?",
    "¿Qué te gustaría cambiar en ella?"
  ],
  "browse_wuxing": [
    "access",
    "services/dao-health-profile",
    "free",
    "В какой сфере хотите найти больше ресурсов?",
    "Что сейчас ощущается как нехватка?",
    "Where would you like to find more personal resources?",
    "What feels most depleted right now?",
    "¿En qué área buscas más recursos personales?",
    "¿Qué sientes que te falta ahora?"
  ],
  "reading_iching": [
    "access",
    "holistic-support#dao-guidance",
    "free",
    "Какой вопрос хотели бы осмыслить через И-Цзин?",
    "Хотите попробовать бесплатную подсказку сейчас?",
    "What question would you like to reflect on with I Ching?",
    "Would you like to try the free reflection now?",
    "¿Qué pregunta quieres explorar con el I Ching?",
    "¿Te gustaría probar la reflexión gratuita ahora?"
  ],
  "reading_tao": [
    "reading",
    "services/spiritual-reading#spiritual-tao",
    "quote",
    "Какую жизненную тему хотите обсудить с мастером?",
    "Какая ясность была бы полезна после беседы?",
    "What life question would you like to discuss with a practitioner?",
    "What clarity would be useful afterwards?",
    "¿Qué tema de tu vida quieres conversar con el profesional?",
    "¿Qué claridad te gustaría obtener?"
  ],
  "reading_tarot": [
    "reading",
    "services/spiritual-reading#spiritual-tarot",
    "quote",
    "Какой вопрос хотите рассмотреть через Таро?",
    "Что в этой ситуации пока неясно?",
    "What question would you like to explore through Tarot?",
    "What remains unclear in this situation?",
    "¿Qué pregunta quieres explorar con el Tarot?",
    "¿Qué sigue sin estar claro?"
  ],
  "consultation_free": [
    "review",
    "services/free-situation-review",
    "free",
    "Что хотите прояснить в бесплатном письменном разборе?",
    "Что сейчас мешает больше всего?",
    "What would you like to clarify in your free written review?",
    "What's getting in the way right now?",
    "¿Qué quieres aclarar en la revisión escrita gratuita?",
    "¿Qué te dificulta avanzar ahora?"
  ],
  "consultation_express": [
    "session",
    "services/free-consultation",
    "express",
    "Какой один вопрос нужен для 30-минутной встречи?",
    "Что важно успеть обсудить?",
    "What one question matters most for a 30-minute session?",
    "What would you like to cover in that time?",
    "¿Qué pregunta es clave para una sesión de 30 minutos?",
    "¿Qué te gustaría abordar en ese tiempo?"
  ],
  "consultation_full": [
    "session",
    "services/free-consultation",
    "full",
    "Какую тему хотите подробно обсудить за час?",
    "Что стало бы полезным результатом встречи?",
    "What would you like to explore in a full hour?",
    "What would make the session useful to you?",
    "¿Qué tema te gustaría explorar durante una hora?",
    "¿Qué resultado te sería útil?"
  ],
  "services_imagery": [
    "session",
    "services/imagery-therapy",
    "from50",
    "Какая ситуация в отношениях для вас сейчас важна?",
    "Что в ней особенно переживается?",
    "What relationship situation matters most to you?",
    "What feels most difficult about it?",
    "¿Qué situación de relaciones te importa ahora?",
    "¿Qué es lo más difícil de ella?"
  ],
  "services_constellations": [
    "session",
    "services/systemic-constellations",
    "from50",
    "Какую семейную или личную ситуацию хотите исследовать?",
    "Что в ней повторяется или остаётся неясным?",
    "What family or personal situation would you like to explore?",
    "What keeps repeating or feeling unresolved?",
    "¿Qué situación familiar o personal quieres explorar?",
    "¿Qué se repite o sigue sin aclararse?"
  ],
  "services_business": [
    "session",
    "services/business-consulting",
    "from50",
    "Какую ситуацию в команде или бизнесе хотите исследовать?",
    "Что тормозит решение или повторяется?",
    "What team or business situation would you like to explore?",
    "What's blocking a decision or repeating?",
    "¿Qué situación de equipo o negocio quieres explorar?",
    "¿Qué frena una decisión o se repite?"
  ],
  "video_intention": [
    "creative",
    "holistic-support/mandala",
    "quote",
    "Какую цель хотите выразить в коротком видео?",
    "Какие образы или настроение вам ближе?",
    "What intention would you like a short video to express?",
    "What images or mood would feel right?",
    "¿Qué intención quieres expresar en un vídeo breve?",
    "¿Qué imágenes o ambiente prefieres?"
  ],
  "video_meditation": [
    "creative",
    "holistic-support/mandala",
    "quote",
    "Какую тему хотите поддержать видео-медитацией?",
    "Нужен спокойный или более энергичный ритм?",
    "What would you like your video meditation to focus on?",
    "Would a calm or more energetic pace suit you?",
    "¿En qué tema quieres centrar la vídeo meditación?",
    "¿Prefieres un ritmo tranquilo o más activo?"
  ],
  "video_message": [
    "creative",
    "holistic-support/mandala",
    "quote",
    "Какую мысль хотите передать в видео-послании?",
    "Кому оно адресовано?",
    "What message would you like the video to convey?",
    "Who would you like the video message to be for?",
    "¿Qué mensaje quieres transmitir en el vídeo?",
    "¿A quién va dirigido?"
  ],
  "courses_opora": [
    "access",
    "courses/antistress",
    "free",
    "Что хочется поддержать с курсом ОПОРА: спокойствие или силы?",
    "Хотите начать с первого короткого занятия?",
    "Would you like OPORA to support calm or energy?",
    "Would you like to start with the first short lesson?",
    "¿Buscas más calma o energía con OPORA?",
    "¿Quieres empezar con la primera lección breve?"
  ],
  "courses_practitioner": [
    "access",
    "academy/principles-of-energywork/learn",
    "free",
    "Вам интереснее вводные уроки Рейки или путь к практике?",
    "Вы уже знакомы с Рейки?",
    "Would you like introductory Reiki lessons or a path into practice?",
    "Have you tried Reiki before?",
    "¿Te interesan las lecciones introductorias o comenzar a practicar Reiki?",
    "¿Has probado Reiki antes?"
  ],
  "courses_yggdrasil": [
    "course",
    "academy/reiki/yggdrasil",
    "quote",
    "Какой уровень обучения Иггдрасиль вас интересует?",
    "Нужны детали программы или разговор с мастером?",
    "Which Yggdrasil training level interests you?",
    "Would you prefer programme details or to speak with a teacher?",
    "¿Qué nivel de formación Yggdrasil te interesa?",
    "¿Prefieres detalles del programa o hablar con un maestro?"
  ],
  "coach_diagnostic": [
    "access",
    "coaching/intake",
    "free",
    "Какую задачу хотите прояснить в коучинговой анкете?",
    "Что было бы полезно понять после ответов?",
    "What would you like to clarify through the coaching questions?",
    "What would be useful to understand afterwards?",
    "¿Qué quieres aclarar con el formulario de coaching?",
    "¿Qué te gustaría comprender después?"
  ],
  "coach_ai": [
    "access",
    "my-coach",
    "quote",
    "О чём хотите поговорить с AI-коучем?",
    "Нужны идеи или спокойное прояснение?",
    "What would you like to explore with the AI coach?",
    "Would ideas or a gentle reflection be most useful?",
    "¿Sobre qué quieres hablar con el coach IA?",
    "¿Prefieres ideas o una reflexión tranquila?"
  ],
  "coach_human": [
    "session",
    "services/free-consultation",
    "from50",
    "С какой темой хотите прийти на личную встречу?",
    "Что хотели бы получить от разговора?",
    "What would you like to discuss in a personal session?",
    "What would make the conversation useful?",
    "¿Qué te gustaría tratar en una sesión personal?",
    "¿Qué te sería útil obtener de la conversación?"
  ],
  "magical_wellbeing": [
    "creative",
    "temple-support",
    "quote",
    "Какое состояние хотите символически поддержать мандалой?",
    "Какие образы или цвета вам близки?",
    "What feeling would you like your mandala to symbolize?",
    "What colours or images speak to you?",
    "¿Qué estado quieres representar con la mandala?",
    "¿Qué colores o imágenes te atraen?"
  ],
  "magical_money": [
    "creative",
    "temple-support",
    "quote",
    "Какую денежную цель хотите выразить символически?",
    "Какой образ или настроение с ней связано?",
    "What financial intention would you like to represent symbolically?",
    "What image or mood comes to mind?",
    "¿Qué meta financiera quieres representar simbólicamente?",
    "¿Qué imagen o sensación te evoca?"
  ],
  "magical_talisman": [
    "creative",
    "temple-support",
    "quote",
    "Какое качество хотите символически усилить талисманом?",
    "Важнее символ, материал или форма?",
    "What quality would you like a talisman to symbolize?",
    "Does symbol, material or shape matter most?",
    "¿Qué cualidad quieres simbolizar con un talismán?",
    "¿Importa más el símbolo, el material o la forma?"
  ],
  "homeopathy_free": [
    "review",
    "services/free-situation-review",
    "free",
    "Какую ситуацию хотите прояснить в бесплатном разборе?",
    "Что сейчас мешает?",
    "What situation would you like to clarify in a free review?",
    "What's making it difficult now?",
    "¿Qué situación quieres aclarar en una revisión gratuita?",
    "¿Qué lo hace difícil ahora?"
  ],
  "homeopathy_express": [
    "session",
    "services/alchemy-of-soul",
    "express",
    "Какую личную ситуацию хотите разобрать за 30 минут?",
    "Что сейчас самое существенное?",
    "What personal situation would you like to explore in 30 minutes?",
    "What matters most in it right now?",
    "¿Qué situación personal quieres explorar en 30 minutos?",
    "¿Qué es lo más importante ahora?"
  ],
  "homeopathy_full": [
    "session",
    "services/alchemy-of-soul",
    "full",
    "Какую личную тему хотите исследовать глубже?",
    "Какие обстоятельства важно учесть?",
    "What personal question would you like to explore more deeply?",
    "What circumstances should be considered?",
    "¿Qué tema personal quieres explorar más a fondo?",
    "¿Qué circunstancias conviene tener en cuenta?"
  ],
  "business_review": [
    "review",
    "services/free-situation-review",
    "free",
    "Какую деловую ситуацию хотите прояснить письменно?",
    "Что в этой ситуации мешает принять решение?",
    "What business situation would you like to clarify in writing?",
    "What is making a decision difficult?",
    "¿Qué situación empresarial quieres aclarar por escrito?",
    "¿Qué dificulta tomar una decisión?"
  ],
  "business_consult": [
    "session",
    "services/business-consulting",
    "quote",
    "Какой деловой вопрос хотите обсудить с консультантом?",
    "Что сейчас тормозит следующий шаг?",
    "What business question would you like to explore with a consultant?",
    "What is blocking the next step?",
    "¿Qué cuestión empresarial quieres tratar con un consultor?",
    "¿Qué frena el siguiente paso?"
  ],
  "business_team": [
    "session",
    "services/business-consulting",
    "quote",
    "Какое взаимодействие в команде хотите исследовать?",
    "Какие роли или отношения вызывают затруднение?",
    "What team interaction would you like to explore?",
    "Which roles or relationships feel difficult?",
    "¿Qué interacción del equipo quieres explorar?",
    "¿Qué roles o relaciones resultan difíciles?"
  ],
  "courses_meditations": [
    "access",
    "meditations",
    "free",
    "Какое состояние хотите поддержать медитацией?",
    "Вам ближе короткое аудио или видео-практика?",
    "What would you like a guided meditation to support?",
    "Would you prefer a short audio or video practice?",
    "¿Qué te gustaría trabajar con una meditación guiada?",
    "¿Prefieres una práctica breve en audio o vídeo?"
  ],
  "courses_personal-video": [
    "creative",
    "video-studio",
    "quote",
    "Какую личную тему хотите выразить в видео?",
    "Какие образы или настроение хотели бы использовать?",
    "What personal theme would you like your video to express?",
    "What images or mood would you like to use?",
    "¿Qué tema personal quieres expresar en un vídeo?",
    "¿Qué imágenes o ambiente te gustaría utilizar?"
  ],
  "personal_express_review": [
    "review",
    "services",
    "free",
    "Какой вопрос хотите прояснить в экспресс-диагностике?",
    "Какого короткого результата ждёте от письменного разбора?",
    "What would you like clarified in the express review?",
    "What concise outcome would make the written review useful?",
    "¿Qué te gustaría aclarar en la revisión exprés?",
    "¿Qué resultado breve haría útil la revisión por escrito?"
  ],
  "personal_extended_review": [
    "review",
    "services",
    "quote",
    "Какую тему хотите исследовать в расширенной диагностике?",
    "Какой контекст важно учесть при дистанционном разборе?",
    "What would you like explored in the extended review?",
    "What context should be considered for a remote review?",
    "¿Qué tema quieres explorar en la revisión ampliada?",
    "¿Qué contexto conviene tener en cuenta en la revisión a distancia?"
  ]
};
export const ALI_SECRETARY_OFFER_JOURNEYS=Object.freeze(Object.fromEntries(
  Object.entries(RAW).map(([id,row])=>[id,Object.freeze({
    kind:row[0],path:row[1],priceKind:row[2],fixedLocale:id==='courses_practitioner'?'en':null,
    questions:Object.freeze({
      ru:Object.freeze([row[3],row[4]]),
      en:Object.freeze([row[5],row[6]]),
      es:Object.freeze([row[7],row[8]]),
    }),
  })])
));
const LOCALES=new Set(['ru','en','es']);
const PRICE=Object.freeze({
 ru:Object.freeze({free:'Бесплатно',express:'€50 · 30 мин',full:'€100 · 60 мин',from50:'от €50',quote:'Условия согласуются с мастером'}),
 en:Object.freeze({free:'Free',express:'€50 · 30 min',full:'€100 · 60 min',from50:'from €50',quote:'Terms confirmed with the practitioner'}),
 es:Object.freeze({free:'Gratis',express:'€50 · 30 min',full:'€100 · 60 min',from50:'desde €50',quote:'Condiciones a confirmar con el profesional'})
});
export function aliSecretaryOfferJourney(id,service,locale='en'){
 if(typeof id!=='string'||!LOCALES.has(locale)||!Object.hasOwn(ALI_SECRETARY_OFFER_JOURNEYS,id)||
    !Object.hasOwn(TELEGRAM_SERVICE_OPTIONS,id)||
    TELEGRAM_SERVICE_OPTIONS[id].service!==service)return null;
 const journey=ALI_SECRETARY_OFFER_JOURNEYS[id];
 return {id,service,kind:journey.kind,title:TELEGRAM_SERVICE_OPTIONS[id].titles[locale],
   priceKind:journey.priceKind,price:PRICE[locale][journey.priceKind],
   questions:journey.questions[locale],url:'https://holistichouse.vercel.app/'+
     (journey.fixedLocale||locale)+'/'+journey.path};
}
const OPEN=/^(?:(?:open|start|begin|show|view|see)(?:\s+(?:this|the|my|a|course|program|test|page|practice|lesson|service|option|link|now)){0,4}|(?:send|share|give)(?:\s+me)?(?:\s+the)?\s+link|where (?:is|can i find) (?:the|this) (?:link|course|page|lesson)|(?:ссылку|ссылка|дайте ссылку|открыть|показать|покажи|начать|пройти тест|где (?:курс|тест|программа|ссылка))|(?:abrir|empezar|ver|mostrar|enlace|dame el enlace|quiero empezar))(?:[\s.!?¿¡]*)$/iu;
export function aliSecretaryOfferLinkReply(message,locale,service,id){
 if(typeof message!=='string'||message.trim().length>90||!OPEN.test(message.trim()))return null;
 const offer=aliSecretaryOfferJourney(id,service,locale);
 if(!offer)return null;
 return (locale==='ru'?'Вот страница выбранной услуги 🌿\n':
   locale==='es'?'Aquí tienes la página de esta opción 🌿\n':
   'Here is the page for your chosen option 🌿\n')+offer.url;
}
export function aliSecretaryOfferPriceReply(message,locale,service,id){
 const offer=aliSecretaryOfferJourney(id,service,locale);
 if(!offer||typeof message!=='string'||message.length>150||
   !/(?:сколько стоит|какая цена|цен[аеы]|стоимост|бесплатн|price|cost|how much|(?:is|it) (?:this |it )?free|\bfree\b|cu[aá]nto cuesta|precio|costo|gratis)/iu.test(message))return null;
 return (locale==='ru'?'По выбранной услуге: ':
   locale==='es'?'Para esta opción: ':'For this option: ')+offer.price+'.';
}

/**
 * High-confidence, user-authored initial service intent. Not a classifier of
 * psychological state and never consent. Called only for a fresh signed bot
 * session; ambiguous text falls back to ordinary Ali conversation.
 * Specific offers outrank broader services; refusal/STOP/safety are excluded.
 */
const DIRECT_INTENTS=Object.freeze([
  ['business','services_business',/(?:бизнес.{0,14}расстанов|business.{0,14}constellation|constelaci[oó]n.{0,14}empresarial)/iu],
  ['constellations','services_constellations',/(?:расстановк|constellation|constelacion|constelaci[oó]n)/iu],
  ['coaching','services_imagery',/(?:образн.{0,15}(?:психотерап|терап)|guided imagery|imagery therapy|im[aá]genes guiadas)/iu],
  ['general','courses_opora',/(?:\bopora\b|опора.{0,12}(?:курс|антистресс)|курс.{0,12}опора)/iu],
  ['general','courses_practitioner',/(?:reiki practitioner course|курс.{0,18}практик.{0,10}рейки|curso.{0,10}reiki)/iu],
  ['general','reading_tarot',/(?:таро|\btarot\b)/iu],
  ['general','reading_iching',/(?:и[\s-]?цзин|\bi[\s-]?ching\b|\byijing\b)/iu],
  ['general','browse_wuxing',/(?:у[\s-]?син|\bwu[\s-]?xing\b)/iu],
  ['general','magical_talisman',/(?:талисман|\btalisman\b|talism[aá]n)/iu],
  ['general','magical_money',/(?:денежн.{0,12}мандал|money.{0,12}mandala|mandala.{0,14}dinero)/iu],
  ['general','magical_wellbeing',/(?:мандал|\bmandala\b)/iu],
  ['general','video_meditation',/(?:видео[\s-]?медитац|video meditation|v[ií]deo meditaci[oó]n)/iu],
  ['general','video_message',/(?:видео[\s-]?послан|video message|v[ií]deo mensaje)/iu],
  ['general','browse_tests',/(?:тесты самочувств|wellbeing (?:tests|check)|pruebas de bienestar)/iu],
  ['general','consultation_free',/(?:бесплатн.{0,20}письменн.{0,18}разбор|free written review|revisi[oó]n escrita gratuita)/iu],
  ['coaching','consultation_express',/(?:30[\s-]?(?:минут|minut)|express session|sesi[oó]n expr[eé]s)/iu],
  ['coaching','consultation_full',/(?:60[\s-]?(?:минут|minut)|full personal session|sesi[oó]n personal completa)/iu],
  ['general','coach_ai',/(?:ии[\s-]?коуч|ai coach|coach ia)/iu],
  ['business',null,/(?:бизнес[\s-]?(?:консультац|анализ)|business consulting|business analysis|consultor[ií]a de negocios)/iu],
  ['homeopathy',null,/(?:гомеопат|homeopath|homeopat)/iu],
  ['reiki',null,/(?:рейки|рэйки|\breiki\b)/iu],
]);
const REJECT_INITIAL=/(?:^\s*(?:не хочу|не интересует|мне не нужен|i (?:don't|do not) want|not interested|no quiero|no me interesa)(?:\s|$)|\/stop|(?:суицид|хочу умереть|не могу дышать|боль в груди|suicid|chest pain|cannot breathe|no puedo respirar))/iu;
export function aliSecretaryInitialServiceIntent(message,locale='en'){
 if(typeof message!=='string'||message.trim().length<5||
    message.length>220||message.startsWith('/')||/https?:\/\//iu.test(message)||
    !LOCALES.has(locale)||REJECT_INITIAL.test(message))return null;
 const hits=DIRECT_INTENTS.filter(([, ,pattern])=>pattern.test(message));
 if(hits.length===0)return null;
 const [service,id]=hits[0];
 // Conflicting themes are ambiguous unless one is a more specific offer of
 // the same family. Never guess a client service in a multi-topic question.
 if(hits.some(([otherService])=>otherService!==service&&
   !(service==='business'&&otherService==='constellations')&&
   !(service==='general'&&otherService==='reiki'&&
     /^(?:reiki_|courses_practitioner)/.test(id||''))))return null;
 const offer=id?aliSecretaryOfferJourney(id,service,locale):null;
 return {service,locale,...(offer?{offerId:offer.id}:{}),mode:'secretary',
   source:'first_party_explicit_service_mention'};
}

/** Give a client the real next step for published self-service learning and tests. */
export function aliSecretaryOfferActionHint(id,service,locale='en'){
 const offer=aliSecretaryOfferJourney(id,service,locale);
 if(!offer||!['access','course'].includes(offer.kind))return null;
 return (locale==='ru'?'Начать можно здесь 🌿\n':
   locale==='es'?'Puedes empezar aquí 🌿\n':
     'You can start here 🌿\n')+offer.url;
}
