/** Own bounded secretary reply composer. Statistical intent model, not a generative LLM. */
import {classifyNativeSecretaryIntentForLocale} from './native-intent-model.mjs';
import {normalizeNativeText} from './native-intent-features.mjs';
import {hasExplicitActionRefusal} from './conversation-intelligence.mjs';
export const NATIVE_SECRETARY_VERSION='hh-native-secretary-v1';
const LOCALES=new Set(['ru','en','es']);
// Domain actions are handled by their existing authenticated workflows, never by this model.
const BLOCK_DIRECT=/(?:\b(?:generate|render|make|create|send|delete|pay|purchase|cancel|order|upload|download|start|save|buy|change)\b.{0,60}\b(?:video|audio|file|order|payment|subscription|profile|account|course)|(?:создай|сделай|сгенерируй|удали|оплати|купи|отмени|скачай|загрузи|сохрани|начни|отправь).{0,60}(?:видео|файл|аудио|заказ|оплат|подписк|профил|аккаунт|курс)|(?:crea|genera|paga|borra|cancela|descarga|envia|compra).{0,60}(?:video|audio|archivo|pedido|pago|cuenta|curso))/iu;
const BLOCK_SENSITIVE=/(?:суицид|самоубийств|умереть|покончу с собой|боль в груди|не могу дышать|меня бьют|насилие|депресси|психоз|травм|диагноз|лекарств|суицид|suicid|kill myself|chest pain|cant breathe|domestic violence|depression|psychosis|diagnos|trauma|prescription|quiero morir|me quiero matar|dolor en el pecho|violencia|depresion|diagnostico)/iu;
// A refusal or mixed reply must not be reduced to a catalog/thanks label.
const BLOCK_REFUSAL=/(?:^|[\s,;.!])(?:не (?:хочу|надо|нужно|предлагай|интересуют)|мне не нужен|перестань|хватит|no quiero|no me interesa|no necesito|deja de|i (?:do not|don't|no longer) want|please don't|stop suggesting|not interested in)(?:[\s,;.!]|$)/iu;
// A polite social opener with a new request is NOT a stand-alone greeting/thanks.
// Let the existing contextual dialogue controller interpret the full RU/EN turn.
// Spanish stays on its unchanged route; these cues intentionally match RU/EN only.
const GREETING_WITH_REQUEST=/^(?:привет(?:ик)?|здравствуй(?:те)?|добрый (?:день|вечер)|доброе утро|hello|hi|hey)(?: there)?[\s,!—.:;-]+(?:мне нужн|я хочу|хочу|подскажи|подскажите|помоги|помогите|какие|как|что|где|почему|можешь|можете|i (?:want|need|have|am looking)|can you|could you|what|how|where|why|show me|help me|please)/iu;
const THANKS_WITH_REQUEST=/^(?:спасибо|благодарю|thank you|thanks)(?:[^\n!?]{0,100})(?:[,;—-]\s*|\s+)(?:но|а (?:теперь|ещё|еще)|можешь|можете|подскажи|подскажите|хочу|мне нужн|у меня|but|however|also|i (?:still|have|want|need)|can you|could you|what|how|where|why)/iu;
const MIXED_SOCIAL=/^(?:спасибо|thank you|thanks|gracias)[,;.!\s]+(?:но|but|pero|мне|i |necesito|quiero).+/iu;
const COPY={
ru:{
hello:['Привет! Я цифровой помощник Holistic House. Чем помочь?','Здравствуйте! Расскажите, что вам хотелось бы узнать.'],
thanks:['Пожалуйста!','Рад помочь.'],bye:['До встречи!','Всего доброго!'],
identity:['Я цифровой помощник Holistic House, не человек. Пока умею помогать с простыми вопросами о сайте.'],
capabilities:['Могу подсказать, где искать курсы, услуги, цены и личные заказы. Сложные вопросы лучше уточнить у специалиста. Что вас интересует?'],
courses:['Курсы и практики собраны в разделе обучения. Для чего вы подбираете курс?'],
services:['Услуги и личные консультации представлены на сайте. Какая тема интересует: работа, отношения или личное развитие?'],
pricing:['Я не могу проверить актуальную цену. Если вопрос об услуге Holistic House, посмотрите её карточку.'],
human:['Для связи с живым специалистом откройте раздел «Мастер» и выберите нужную услугу. Я не отправлял сообщение специалисту.'],
booking:['Запись оформляется через страницу выбранной услуги или напрямую со специалистом. Я не бронирую время и не вижу свободные слоты.'],
technical:['Похоже на техническую проблему. Что именно не работает: вход, страница или отправка сообщения?'],
privacy:['Для сохранения истории и использования личных предпочтений нужно отдельное согласие. Этот базовый ответ не отправляет текст стороннему AI API.'],
status:['Проверить реальный статус можно в личном кабинете. Я не вижу здесь состояние конкретного заказа и не могу назвать срок.'],
unsure:['Можно начать без выбора метода. Что сейчас ближе: разобраться в вопросе или найти информацию на сайте?'],
smalltalk:['Можем немного поболтать. Что у вас сегодня на уме?','Я здесь и готов общаться. О чём хочется поговорить?']},
en:{
hello:['Hi! I’m the Holistic House digital assistant. How can I help?','Hello! What would you like to find out?'],
thanks:['You’re welcome!','Glad to help.'],bye:['See you!','Take care!'],
identity:['I’m the Holistic House digital assistant, not a person. I can help with basic questions about the site.'],
capabilities:['I can help you find courses, services, pricing and your account area. A human specialist is better placed for complex questions. What are you looking for?'],
courses:['You can browse courses and practices in the learning section. What are you hoping to learn?'],
services:['Services and personal consultations are listed on the site. Are you exploring work, relationships or personal growth?'],
pricing:['I cannot check the current price. If you mean a Holistic House service, please check its listing.'],
human:['To speak with a person, browse the Master section and choose the appropriate service. I haven’t contacted anyone for you.'],
booking:['Appointments are arranged through the selected service or directly with its practitioner. I cannot book a slot or verify availability.'],
technical:['That sounds like a technical issue. Is it sign-in, a page or sending a message that is failing?'],
privacy:['Chat history and personal preferences require separate permission. This basic reply does not send your text to a third-party AI API.'],
status:['Please check your account for the actual status. I cannot see this order or confirm a completion time here.'],
unsure:['There’s no need to choose a method yet. Would you rather talk through a question or find something on the site?'],
smalltalk:['We can chat a little. What’s on your mind today?','I’m here and ready to talk. What would you like to discuss?']},
es:{
hello:['¡Hola! Soy el asistente digital de Holistic House. ¿En qué puedo ayudarte?','¡Buenas! ¿Qué te gustaría saber?'],
thanks:['¡De nada!','Encantado de ayudar.'],bye:['¡Hasta luego!','¡Que te vaya bien!'],
identity:['Soy el asistente digital de Holistic House, no una persona. Puedo ayudar con preguntas básicas sobre el sitio.'],
capabilities:['Puedo ayudarte a encontrar cursos, servicios, precios y tu cuenta. Para asuntos complejos es mejor consultar a una persona. ¿Qué buscas?'],
courses:['Los cursos y prácticas están en la sección de aprendizaje. ¿Para qué buscas un curso?'],
services:['Los servicios y consultas personales aparecen en el sitio. ¿Te interesan trabajo, relaciones o desarrollo personal?'],
pricing:['El precio depende del servicio. Consulta su ficha para ver las condiciones actuales; no puedo procesar pagos.'],
human:['Para hablar con una persona, abre la sección Master y elige un servicio. No he contactado con nadie por ti.'],
booking:['Las citas se gestionan desde el servicio elegido o con el profesional. No puedo reservar ni comprobar horarios.'],
technical:['Parece un problema técnico. ¿Falla el acceso, una página o el envío de mensajes?'],
privacy:['El historial y las preferencias personales requieren permiso separado. Esta respuesta básica no envía texto a una API externa de IA.'],
status:['Consulta tu cuenta para ver el estado real. No puedo comprobar este pedido ni prometer una fecha de finalización.'],
unsure:['No hace falta elegir un método todavía. ¿Prefieres hablar sobre una duda o buscar algo en el sitio?'],
smalltalk:['Podemos charlar un poco. ¿Qué tienes hoy en mente?','Aquí estoy y puedo conversar. ¿De qué te gustaría hablar?']}
};
export function nativeSecretaryAllowsUtterance(message){
  return typeof message==='string'&&Boolean(message.trim())&&message.length<=600&&
    !BLOCK_DIRECT.test(message)&&!BLOCK_SENSITIVE.test(message)&&!BLOCK_REFUSAL.test(message)&&
    !hasExplicitActionRefusal(message)&&!MIXED_SOCIAL.test(message)&&
    !GREETING_WITH_REQUEST.test(message)&&!THANKS_WITH_REQUEST.test(message);
}
/** Status is account-specific; require an explicit referent before this fallback. */
export function nativeSecretaryAllowsIntent(message,locale,intent){
 if(intent!=='status'||!['ru','en'].includes(locale))return true;
 if(typeof message!=='string')return false;
 return locale==='ru'?
  /(?:статус|заказ|заявк|обращени|запрос|готов|обработ|выполн|достав|результат|стади|этап|процесс|ролик|видео|файл)/iu.test(message):
  /\b(?:status|order|request|progress|finished|ready|complete[ds]?|processing|processed|delivery|result|stage|video|file)\b/iu.test(message);
}
export function nativeSecretaryTurn({message='',locale='en',history=[]}={}){
  if(!nativeSecretaryAllowsUtterance(message))return null;
  const lang=LOCALES.has(locale)?locale:'en';
  const {prediction:candidate,modelVersion}=classifyNativeSecretaryIntentForLocale(message,locale);
  if(!candidate.accepted)return null;
  if(!nativeSecretaryAllowsIntent(message,lang,candidate.intent))return null;
  const options=COPY[lang][candidate.intent];
  if(!options)return null;
  const continuation=Array.isArray(history)&&history.some(row=>row?.role==='assistant'&&typeof row.text==='string'&&row.text.length<800);
  const selection=(normalizeNativeText(message).length+(continuation?1:0))%options.length;
  return {status:'clarify',reply:options[selection],source:NATIVE_SECRETARY_VERSION,
    intent:candidate.intent,modelKind:'first_party_statistical_intent',
    modelVersion,modelUsed:false,
    memorySaved:false,actionExecuted:false,
    confidenceClass:candidate.score>=.75?'high':'medium'};
}
