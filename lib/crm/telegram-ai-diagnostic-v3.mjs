// Telegram CRM free-review V3: pure, versioned conversation contracts.
// No provider credentials, database access, or model execution in this file.
export const TELEGRAM_AI_DIAGNOSTIC_V3 = 3;
const LANGUAGES = new Set(['ru', 'en', 'es']);
export const V3_LABELS = Object.freeze({
  ru: Object.freeze({
    agree: 'Да, начать', decline: 'Отложить диагностику', finish: 'Завершить интервью',
    continue: 'Продолжить разговор', chatagree: 'Поговорить с Wave', chatlater: 'Поговорим позже', voiceagree: 'Разрешить голос', voicedecline: 'Не сейчас (голос)', send: 'Передать на личный разбор',
    edit: 'Уточнить запрос', cancel: 'Не передавать',
  }),
  en: Object.freeze({
    agree: 'Start interview', decline: 'Maybe later', finish: 'Finish interview',
    continue: 'Keep talking', chatagree: 'Chat with Wave', chatlater: 'Talk later', voiceagree: 'Allow voice', voicedecline: 'Not now (voice)', send: 'Send for personal review',
    edit: 'Clarify my request', cancel: 'Do not send',
  }),
  es: Object.freeze({
    agree: 'Empezar entrevista', decline: 'Más tarde', finish: 'Terminar entrevista',
    continue: 'Seguir conversando', chatagree: 'Hablar con Wave', chatlater: 'Hablar luego', voiceagree: 'Permitir voz', voicedecline: 'Ahora no (voz)', send: 'Enviar para revisión personal',
    edit: 'Aclarar mi solicitud', cancel: 'No enviar',
  }),
});
export const V3_BUTTONS = Object.freeze(Object.values(V3_LABELS).flatMap(x=>Object.values(x)));
export const V3_COPY = Object.freeze({
  ru: Object.freeze({
    intro: 'Здравствуйте! Я Wave — помощник Holistic House 🌿 Помогу уточнить ваш вопрос и подготовить запрос на личный разбор.\n\nЕсли вы согласитесь начать, сообщения будут обрабатываться внешней ИИ-моделью через OpenRouter (с предпочтением не использовать данные для обучения). Не присылайте медицинские документы и анализы. Это не медицинский диагноз и не сеанс психотерапии. Остановить разговор можно командой /stop.',
    nudge: 'Я здесь 🌿 Если хотите продолжить, нажмите «Да, начать». Можно вернуться позже.',
    first: 'Что сейчас больше всего тебя волнует и что хотелось бы понять или изменить?',
    later: 'Хорошо. Если захочешь вернуться, отправь /review.',
    declined: 'Хорошо, запрос не передан. Можно продолжить разговор позже.',
    busy: 'Я ещё обрабатываю предыдущий ответ. Пожалуйста, дождись его, прежде чем присылать новый.',
    unclear: 'Расскажи, пожалуйста, чуть подробнее, что сейчас для тебя важно.',
    notReady: 'Свободный ИИ-разговор временно недоступен. Попробуй позже или свяжись с мастером через сайт.',
    providerError: 'Сейчас не получается получить ответ ИИ. Твой запрос сохранён только внутри этой беседы. Можешь повторить мысль позже или завершить интервью.',
    reviewTitle: 'Я подготовил черновик твоего запроса:\n\n',
    reviewQuestion: '\n\nВсё ли верно? Передать этот запрос Андрею для личного разбора?',
    submitted: 'Спасибо! Твой запрос передан на личный разбор. Ответ подготовит человек; точное время ответа пока не подтверждено.',
    stopped: 'Диалог остановлен. ИИ больше не обрабатывает этот запрос, новые сообщения не отправляются.',
    empty: 'Чтобы составить запрос, сначала расскажи немного о своей ситуации.',
    photo: 'Фотография для беседы не нужна. Чувствительные изображения и документы не отправляй в Telegram.',
  }),
  en: Object.freeze({
    intro: 'Hello! I\'m Wave, the Holistic House assistant 🌿 I can help clarify your question and prepare a request for a personal review.\n\nIf you choose to begin, an external AI model processes the conversation through OpenRouter (with a no-training preference). Please don\'t send medical records or lab results. This is not a medical diagnosis or therapy session. You can stop with /stop.',
    nudge: 'I\'m here 🌿 Choose “Start interview” when you\'re ready, or “Maybe later”.',
    first: 'What is concerning you most right now, and what would you like to understand or change?',
    later: 'Of course. Send /review whenever you want to return.',
    declined: 'Understood. No request has been submitted. We can continue another time.',
    busy: 'I am still processing your previous reply. Please wait for that response before sending another.',
    unclear: 'Could you tell me a little more about what matters most right now?',
    notReady: 'The AI interview is temporarily unavailable. Please try later or contact a practitioner through the website.',
    providerError: 'The AI could not respond just now. Your message remains in this private conversation. You can try again later or finish the interview.',
    reviewTitle: 'Here is the draft summary of your request:\n\n',
    reviewQuestion: '\n\nDoes that look right? Would you like to send it to Andrey for a personal review?',
    submitted: 'Thank you! Your request has been submitted for personal review. A human will prepare the response; the exact timing is not yet confirmed.',
    stopped: 'This conversation has stopped. AI processing and further messages for this request have been halted.',
    empty: 'Please tell me a little about your situation before preparing the summary.',
    photo: 'A photograph is not required for this conversation. Please do not send sensitive documents or images in Telegram.',
  }),
  es: Object.freeze({
    intro: '¡Hola! Soy Wave, el asistente de Holistic House 🌿 Puedo ayudarte a aclarar tu pregunta y preparar una solicitud de revisión personal.\n\nSi aceptas empezar, un modelo externo de IA procesará la conversación mediante OpenRouter (con preferencia de no usar los datos para entrenamiento). No envíes historiales médicos ni análisis. Esto no es un diagnóstico médico ni una sesión de terapia. Puedes detenerlo con /stop.',
    nudge: 'Aquí estoy 🌿 Pulsa «Empezar entrevista» cuando quieras, o «Más tarde».',
    first: '¿Qué es lo que más te preocupa ahora y qué te gustaría comprender o cambiar?',
    later: 'Por supuesto. Envía /review cuando quieras volver.',
    declined: 'Entendido. No se ha enviado ninguna solicitud. Podemos continuar después.',
    busy: 'Todavía estoy procesando tu respuesta anterior. Espera la contestación antes de escribir otra.',
    unclear: '¿Puedes contarme un poco más de lo que más te importa ahora?',
    notReady: 'La entrevista de IA no está disponible temporalmente. Inténtalo más tarde o contacta a un profesional en el sitio.',
    providerError: 'La IA no ha podido responder ahora. Tu mensaje permanece en esta conversación privada. Puedes intentarlo después o terminar la entrevista.',
    reviewTitle: 'He preparado un borrador de tu solicitud:\n\n',
    reviewQuestion: '\n\n¿Es correcto? ¿Quieres enviarlo a Andrey para una revisión personal?',
    submitted: '¡Gracias! Tu solicitud se ha enviado para una revisión personal. Responderá una persona; el plazo exacto no está confirmado.',
    stopped: 'El diálogo se ha detenido. El procesamiento de IA y los mensajes posteriores se han suspendido.',
    empty: 'Cuéntame primero algo de tu situación para preparar el resumen.',
    photo: 'No es necesaria una fotografía. No envíes documentos o imágenes sensibles por Telegram.',
  }),
});
export function v3Locale(value) { return LANGUAGES.has(value) ? value : 'en'; }
export function v3StartLocale(text) {
  return /^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hhreview_(ru|en|es)$/i.exec(String(text||'').trim())?.[1]?.toLowerCase() || null;
}
export function v3IsStop(value) {
  return /^(?:\/(?:stop|unsubscribe)(?:@[A-Za-z0-9_]+)?|стоп|остановить(?: диалог)?|stop|parar|detener)$/iu.test(String(value||'').trim());
}
export function v3Action(event) {
  if(event?.inlineAction?.startsWith('v3:'))return event.inlineAction.slice(3);
  const raw=String(event?.rawText||'').trim();
  if(/^(?:начать диалог с ии|поговорить с wave|start ai conversation|chat with wave|empezar conversación con ia|hablar con wave)$/iu.test(raw))return 'chatagree';
  if(/^(?:поговорим позже|talk later|hablar luego)$/iu.test(raw))return 'chatlater';
  if(/^(?:да|да, начать|yes|start interview|sí|si|empezar entrevista)[.! ]*$/iu.test(raw))return 'agree';
  if(/^\/finish(?:@[A-Za-z0-9_]+)?$/i.test(raw))return 'finish';
  if(/^\/stop(?:@[A-Za-z0-9_]+)?$/i.test(raw))return 'stop';
  return null;
}
export function v3ButtonsFor(locale,stage,turnCount=0){
  const t=V3_LABELS[v3Locale(locale)];
  if(stage==='consent')return [[t.agree,t.decline]];
  if(stage==='chat_consent')return [[t.chatagree,t.chatlater]];
  if(stage==='voice_consent')return [[t.voiceagree,t.voicedecline]];
  if(stage==='interview' && turnCount>=2)return [[t.finish,t.continue]];
  if(stage==='review_confirm')return [[t.send],[t.edit,t.cancel]];
  return [];
}
export function v3Context(raw){
  if(!raw || typeof raw!=='object' || !Array.isArray(raw.turns))return {turns:[],pending:null,summary:null};
  const turns=raw.turns.slice(-20).filter(x=>['user','assistant'].includes(x?.role) && typeof x.text==='string')
    .map(x=>({role:x.role,text:x.text.slice(0,1000)}));
  const pending=raw.pending && Number.isSafeInteger(raw.pending.id) &&
    ['question','summary'].includes(raw.pending.kind) ? {
      id:raw.pending.id,kind:raw.pending.kind,text:String(raw.pending.text||'').slice(0,1200),
      queuedAt:Number.isSafeInteger(raw.pending.queuedAt)?raw.pending.queuedAt:0,
      ...(raw.pending.voice===true?{voice:true}:{}),
    }:null;
  return {turns,pending,summary:typeof raw.summary==='string'?raw.summary.slice(0,950):null,
    ...(raw.conversationKind==='general'?{conversationKind:'general'}:{}),
    ...(typeof raw.voiceConsentAt==='string'&&Number.isFinite(Date.parse(raw.voiceConsentAt))
      ?{voiceConsentAt:new Date(raw.voiceConsentAt).toISOString()}:{}),
  };
}
export function v3DailyReplyCount(row,day){
  const dbDay=row?.reply_day instanceof Date
    ?(Number.isFinite(row.reply_day.getTime())?row.reply_day.toISOString().slice(0,10):'')
    :String(row?.reply_day||'').slice(0,10);
  if(dbDay!==day)return 0;
  const count=Number(row?.reply_count);
  return Number.isFinite(count)?Math.min(40,Math.max(0,Math.trunc(count))):0;
}
/** Wave's consented local dialogue can remain available when both hosted LLMs are down.
 * This never enables an external inference call, diagnostic interview or CRM handoff.
 * The signed, schema-ready production webhook and STOP/consent checks still apply.
 */
export function v3CanChat(env=process.env){
  return env.VERCEL_ENV==='production' &&
    env.HH_CRM_TG_AI_V3_SCHEMA_READY==='true' &&
    env.HH_CRM_TG_AI_V3_ENABLED==='true' &&
    env.HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED==='true';
}
export function v3CanStart(env=process.env){
  const key=env.HH_CRM_TG_AI_V3_OPENROUTER_KEY ||
    (env.HH_CRM_TG_AI_V3_SHARED_KEY_APPROVED==='true'&&env.HH_COUNCIL_OPENROUTER_API_KEY);
  return env.VERCEL_ENV==='production' &&
    env.HH_CRM_TG_AI_V3_ENABLED==='true' &&
    env.HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED==='true' &&
    typeof key==='string' && key.trim().length>=15;
}
export function v3ModelKey(env=process.env){
  if(!v3CanStart(env))return null;
  return env.HH_CRM_TG_AI_V3_OPENROUTER_KEY ||
    (env.HH_CRM_TG_AI_V3_SHARED_KEY_APPROVED==='true'?env.HH_COUNCIL_OPENROUTER_API_KEY:null);
}
export function v3CanCallModel(text){
  if(typeof text!=='string')return false;
  const value=text.trim();
  return value.length>=2 && value.length<=1200 && !value.startsWith('/');
}

/** A natural Telegram message cannot silently authorize a diagnostic or AI provider. */
export function v3WantsGeneralChat(text){
  const raw=String(text||'').trim();
  return v3CanCallModel(raw)&&
    !/^(?:да|да, начать|нет|отложить диагностику|yes|start interview|no|maybe later|sí|si|empezar entrevista|más tarde)[.!? ]*$/iu.test(raw);
}
export const V3_CHAT_COPY=Object.freeze({
 ru:Object.freeze({
   intro: "Привет! Я Wave — помощник Holistic House 🌿 Давайте просто поговорим. Это не диагностика. С вашего согласия текст может обрабатываться облачной языковой моделью, в том числе внешним сервисом OpenRouter. Не присылайте медицинские документы, пароли и личные секреты; это не терапия. Остановить диалог: /stop.",
   nudge: "Я Wave 🌿 Нажмите «Поговорить с Wave», если согласны продолжить диалог.",
   first:'Конечно, давайте поговорим 🌿 О чём вам хотелось бы поговорить?',
   later:'Хорошо, можно поговорить позже.',
   ended:'Диалог завершён. Для нового разговора просто напишите мне.',
   failed: "Wave на связи, но сейчас не удалось подготовить ответ. Диалог сохранён; можно попробовать позже.",
 }),
 en:Object.freeze({
   intro: "Hi! I'm Wave, the Holistic House assistant 🌿 We can simply chat; this is not a diagnostic interview. With your consent, messages may be processed by a cloud language model, including external provider OpenRouter. Please do not send medical records, passwords or private secrets; this is not therapy. Stop with /stop.",
   nudge: "Wave is here 🌿 Choose “Chat with Wave” to consent and continue.",
   first:'Of course, we can talk 🌿 What would you like to discuss?',
   later:'Okay, we can chat another time.',
   ended:'Chat ended. Write again to start a new conversation.',
   failed: "Wave is here, but I could not prepare a reply just now. Your conversation is saved; you can try later.",
 }),
 es:Object.freeze({
   intro: "¡Hola! Soy Wave, el asistente de Holistic House 🌿 Podemos conversar sin entrevista diagnóstica. Con tu consentimiento, los mensajes pueden procesarse mediante un modelo en la nube, incluido el proveedor externo OpenRouter. No envíes documentos médicos, contraseñas ni secretos; esto no es terapia. Para parar: /stop.",
   nudge: "Wave está aquí 🌿 Elige «Hablar con Wave» para aceptar y continuar.",
   first:'Claro, podemos hablar 🌿 ¿De qué te gustaría conversar?',
   later:'De acuerdo, podemos hablar más tarde.',
   ended:'Conversación terminada. Escribe para iniciar otra.',
   failed: "Wave sigue aquí, pero ahora no pude preparar una respuesta. Se conserva la conversación; puedes probar después.",
 }),
});


/** Unconsented Telegram text may still require an immediate human-safety reply.
 * This helper performs no model call, profiling, storage or diagnostic intake.
 */
export function v3ChatPreConsentSafetyReply(message,locale='en'){
  const value=typeof message==='string'?message.trim().slice(0,1200):'';
  if(!value||!/(?:не хочу (?:больше )?жить|хочу умереть|покончу с собой|хочу убить себя|суицид|самоубийств|боль в груди|не могу дышать|трудно дышать|меня бьют|i want to die|i want to kill myself|kill myself|suicid|end my life|chest pain|can't breathe|cannot breathe|domestic violence|quiero morir|me quiero matar|dolor en el pecho|no puedo respirar|violencia domestica)/iu.test(value))return null;
  return ({
    ru:'Если есть непосредственная опасность, сильная боль в груди или затруднённое дыхание, немедленно обратитесь в местную экстренную службу. Если опасность связана с мыслями о самоубийстве или насилием, свяжитесь также с человеком, которому доверяете. Я могу выслушать, но не заменяю срочную помощь.',
    en:'If you are in immediate danger, have severe chest pain or difficulty breathing, contact your local emergency services now. If you are thinking about suicide or experiencing violence, contact someone you trust as well. I can listen, but I cannot replace emergency help.',
    es:'Si estás en peligro inmediato, tienes dolor fuerte en el pecho o dificultad para respirar, contacta ahora a los servicios de emergencia locales. Si tienes pensamientos suicidas o sufres violencia, contacta también a alguien de confianza. Puedo escucharte, pero no sustituyo la ayuda urgente.',
  })[v3Locale(locale)];
}
