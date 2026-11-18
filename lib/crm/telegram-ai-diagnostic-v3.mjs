import {aliServiceScenario,routeAliEntry} from '../assist/ali-service-scenario.mjs';
import {telegramServiceOption,telegramServiceOptionStart} from '../assist/telegram-service-options.mjs';
import {SECRETARY_MODES,SECRETARY_PSYCHOLOGIST_COPY,v3PsychologistStart} from '../assist/secretary-modes.mjs';
import {FREE_DIAGNOSTIC_MODE,FREE_DIAGNOSTIC_FIELDS,FREE_DIAGNOSTIC_PHASES} from '../assist/ali-free-diagnostic-library.mjs';
export {SECRETARY_PSYCHOLOGIST_COPY,v3PsychologistStart};
// Telegram CRM free-review V3: pure, versioned conversation contracts.
// No provider credentials, database access, or model execution in this file.
export const TELEGRAM_AI_DIAGNOSTIC_V3 = 3;
const LANGUAGES = new Set(['ru', 'en', 'es']);
const SERVICE_CODES = new Set(['general','homeopathy','coaching','reiki','constellations','business','business_strategy']);
const INTAKE_STAGES = new Set([...FREE_DIAGNOSTIC_PHASES]);
export function v3ServiceStart(text){
 const option=telegramServiceOptionStart(text);
 if(option)return option;
 const m=/^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hhservice_(homeopathy|coaching|reiki|constellations|business|business_strategy)_(ru|en|es)$/i.exec(String(text||'').trim());
 if(!m)return null;
 const service=m[1].toLowerCase(),locale=m[2].toLowerCase();
 const route=routeAliEntry({service,locale});
 return route.kind==='service'?{service:route.service,locale:route.locale}:null;
}
export function v3ServiceTitle(service,locale,offerId=null){
 if(!SERVICE_CODES.has(service))return null;
 const selected=telegramServiceOption(offerId,v3Locale(locale));
 return selected?.service===service?selected.title:aliServiceScenario(service,v3Locale(locale))?.title||null;
}
export function v3ServiceCopy(locale,service,offerId=null){
 const l=v3Locale(locale),title=v3ServiceTitle(service,l,offerId);
 if(!title)return null;
 if(l==='ru')return {
  title,intro:'Привет! 🌿 Я Ali, помощник Holistic House.\n\nВы выбрали «'+title+'». Давайте спокойно поговорим о том, что для вас важно.',
  consent:'Один важный момент 🌿 Я цифровой помощник; AI через OpenRouter может обрабатывать ваши ответы. Пожалуйста, без медицинских документов. Андрею передам только то, что вы одобрите. Продолжим?',
  welcomeNudge:'Рад знакомству! 🌿 Нажмите «Давайте 🌿», когда захотите продолжить.',
  consentNudge:'Если всё подходит, нажмите «Согласен, продолжим».',
  first:aliServiceScenario(service,l).questions.goal,
  reviewTitle:'Заявка на «'+title+'»:\n\n',reviewQuestion:'\n\nВсё верно? Отправить мастеру?',
  submitted:ref=>'Заявка '+ref+' сохранена в защищённой CRM мастера. Запись и оплата пока не подтверждены.',
 };
 if(l==='es')return {
  title,intro:'¡Hola! 🌿 Soy Ali, del equipo de Holistic House.\n\nVeo que te interesa «'+title+'». Me encantará escucharte, con calma.',
  consent:'Una cosa importante 🌿 Soy un asistente digital y la IA de OpenRouter puede procesar tus respuestas. No envíes documentos médicos. Solo compartiré con Andrey lo que apruebes. ¿Seguimos?',
  welcomeNudge:'Me alegra conocerte 🌿 Pulsa «Hablemos 🌿» cuando quieras.',
  consentNudge:'Si te parece bien, pulsa «Acepto, seguimos».',
  first:aliServiceScenario(service,l).questions.goal,
  reviewTitle:'Solicitud de «'+title+'»:\n\n',reviewQuestion:'\n\n¿Es correcto? ¿Enviar al profesional?',
  submitted:ref=>'Solicitud '+ref+' guardada en el CRM seguro del profesional. No se ha confirmado cita ni pago.',
 };
 return {title,
  intro:'Hi! 🌿 I’m Ali from Holistic House.\n\nI see you’re interested in “'+title+'”. I’d be happy to hear what’s on your mind.',
  consent:'One quick note 🌿 I’m a digital assistant, and AI via OpenRouter may process your replies. Please don’t send medical records. Nothing goes to Andrey unless you approve it. Is that okay?',
  welcomeNudge:'Lovely to meet you! 🌿 Tap “Let’s talk 🌿” whenever you’re ready.',
  consentNudge:'If that works for you, tap “I agree, let’s talk”.',
  first:aliServiceScenario(service,l).questions.goal,
  reviewTitle:'Request for “'+title+'”:\n\n',reviewQuestion:'\n\nIs this right? Send to the practitioner?',
  submitted:ref=>'Request '+ref+' is saved in the practitioner’s secure CRM. No appointment or payment has been confirmed.',
 };
}
export const V3_LABELS = Object.freeze({
  ru: Object.freeze({
    agree: 'Давайте 🌿', serviceagree: 'Согласен, продолжим', decline: 'Не сейчас', finish: 'Посмотреть заявку', skip: 'Пропустить вопрос',
    continue: 'Продолжить разговор', chatagree: 'Поговорить с Ali', chatlater: 'Поговорим позже', voiceagree: 'Разрешить голос', voicedecline: 'Не сейчас (голос)', send: 'Передать на личный разбор',
    edit: 'Уточнить запрос', cancel: 'Не передавать', servicesend: 'Отправить заявку',
  }),
  en: Object.freeze({
    agree: 'Let’s talk 🌿', serviceagree: 'I agree, let’s talk', decline: 'Not now', finish: 'Review request', skip: 'Skip question',
    continue: 'Keep talking', chatagree: 'Chat with Ali', chatlater: 'Talk later', voiceagree: 'Allow voice', voicedecline: 'Not now (voice)', send: 'Send for personal review',
    edit: 'Clarify my request', cancel: 'Do not send', servicesend: 'Send request',
  }),
  es: Object.freeze({
    agree: 'Hablemos 🌿', serviceagree: 'Acepto, seguimos', decline: 'Ahora no', finish: 'Ver solicitud', skip: 'Omitir pregunta',
    continue: 'Seguir conversando', chatagree: 'Hablar con Ali', chatlater: 'Hablar luego', voiceagree: 'Permitir voz', voicedecline: 'Ahora no (voz)', send: 'Enviar para revisión personal',
    edit: 'Aclarar mi solicitud', cancel: 'No enviar', servicesend: 'Enviar solicitud',
  }),
});
export const V3_BUTTONS = Object.freeze(Object.values(V3_LABELS).flatMap(x=>Object.values(x)));
export const V3_COPY = Object.freeze({
  ru: Object.freeze({
    intro: 'Привет! 🌿 Я Ali, помощник Holistic House. Можем спокойно поговорить о том, что вам важно.\n\nПри согласии ответы может обработать AI через OpenRouter. Без медицинских документов, пожалуйста. Это не диагноз и не психотерапия. Остановить: /stop.',
    nudge: 'Я рядом 🌿 Если хотите поговорить, нажмите «Давайте 🌿». Можно и позже.',
    first: 'Что вы сейчас больше всего хотите понять или изменить?',
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
    photo: 'По фото я не могу достоверно оценить здоровье или «энергию». Фото не нужно. Если захотите добавить рисунок «Я — цель — препятствие», согласуйте защищённый способ с мастером; не присылайте личные изображения сюда.',
  }),
  en: Object.freeze({
    intro: 'Hi! 🌿 I’m Ali from Holistic House. We can talk about what matters, at your pace.\n\nWith your consent, AI via OpenRouter may process your replies. Please don’t send medical records. This isn’t diagnosis or therapy. Stop: /stop.',
    nudge: 'I’m here 🌿 Tap “Let’s talk 🌿” whenever you feel ready.',
    first: 'What would you most like to understand or change in your situation?',
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
    photo: 'I cannot reliably assess health or “energy” from a photo. You do not need one. If you wish to share a “Me — Goal — Obstacle” drawing, arrange a secure method with the practitioner; please do not send private images here.',
  }),
  es: Object.freeze({
    intro: '¡Hola! 🌿 Soy Ali, de Holistic House. Podemos hablar con calma sobre lo que te importa.\n\nCon tu permiso, la IA de OpenRouter puede procesar tus respuestas. No envíes documentos médicos. No es un diagnóstico ni terapia. Detener: /stop.',
    nudge: 'Aquí estoy 🌿 Pulsa «Hablemos 🌿» cuando quieras. Sin prisa.',
    first: '¿Qué te gustaría comprender o cambiar de tu situación?',
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
    photo: 'No puedo evaluar de forma fiable la salud ni la «energía» por una foto. No hace falta. Para compartir un dibujo «Yo — Meta — Obstáculo», acuerda un medio seguro con el profesional; no envíes imágenes privadas aquí.',
  }),
});
export function v3Locale(value) { return LANGUAGES.has(value) ? value : 'en'; }
export function v3StartLocale(text) {
  return /^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hh(?:review|diagnostic|secretary)_(ru|en|es)$/i.exec(String(text||'').trim())?.[1]?.toLowerCase() || null;
}
export function v3FreeDiagnosticStart(text){
  const match=/^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hh(?:review|diagnostic)_(ru|en|es)$/i.exec(String(text||'').trim());
  return match?{locale:match[1].toLowerCase(),mode:FREE_DIAGNOSTIC_MODE}:null;
}
export function v3IsStop(value) {
  return /^(?:\/(?:stop|unsubscribe)(?:@[A-Za-z0-9_]+)?|стоп|остановить(?: диалог)?|stop|parar|detener)$/iu.test(String(value||'').trim());
}
export function v3Action(event) {
  if(event?.inlineAction?.startsWith('v3:'))return event.inlineAction==='v3:servicesend'?'send':event.inlineAction.slice(3);
  const raw=String(event?.rawText||'').trim();
  if(/^(?:начать диалог с ии|поговорить с (?:wave|али)|start ai conversation|chat with (?:wave|ali)|empezar conversación con ia|hablar con (?:wave|ali))$/iu.test(raw))return 'chatagree';
  if(/^(?:поговорим позже|talk later|hablar luego)$/iu.test(raw))return 'chatlater';
  if(Object.values(V3_LABELS).some(labels=>labels.serviceagree===raw))return 'serviceagree';
  if(/^(?:да|да, начать|давайте(?: 🌿)?|yes|start interview|let['’]s talk(?: 🌿)?|sí|si|empezar entrevista|hablemos(?: 🌿)?)[.! ]*$/iu.test(raw))return 'agree';
  if(/^(?:не сейчас|not now|ahora no|отложить диагностику|maybe later|más tarde)[.! ]*$/iu.test(raw))return 'decline';
  if(/^\/finish(?:@[A-Za-z0-9_]+)?$/i.test(raw))return 'finish';
  if(/^(?:\/skip|пропустить(?: вопрос)?|skip question|omitir pregunta)$/iu.test(raw))return 'skip';
  if(/^\/stop(?:@[A-Za-z0-9_]+)?$/i.test(raw))return 'stop';
  return null;
}
export function v3ButtonsFor(locale,stage,turnCount=0,serviceRequest=null){
  const t=V3_LABELS[v3Locale(locale)];
  if(stage==='consent')return [[t.agree,t.decline]];
  if(stage==='service_consent')return [[t.serviceagree,t.decline]];
  if(stage==='chat_consent')return [[t.chatagree,t.chatlater]];
  if(stage==='voice_consent')return [[t.voiceagree,t.voicedecline]];
  if(stage==='free_interview')return turnCount>0?[[t.skip,t.finish]]:[[t.skip]];
  if(stage==='interview' && turnCount>=2)return [[t.finish,t.continue]];
  if(stage==='review_confirm')return [[SERVICE_CODES.has(serviceRequest)?t.servicesend:t.send],[t.edit,t.cancel]];
  return [];
}
export function v3Context(raw){
  if(!raw || typeof raw!=='object' || !Array.isArray(raw.turns))return {turns:[],pending:null,summary:null};
  const maxTurns=raw.mode===SECRETARY_MODES.PSYCHOLOGIST?30:20;
  const turns=raw.turns.slice(-maxTurns).filter(x=>['user','assistant'].includes(x?.role) && typeof x.text==='string')
    .map(x=>({role:x.role,text:x.text.slice(0,1000)}));
  const pending=raw.pending && Number.isSafeInteger(raw.pending.id) &&
    ['question','summary'].includes(raw.pending.kind) ? {
      id:raw.pending.id,kind:raw.pending.kind,text:String(raw.pending.text||'').slice(0,1200),
      queuedAt:Number.isSafeInteger(raw.pending.queuedAt)?raw.pending.queuedAt:0,
      ...(raw.pending.voice===true?{voice:true}:{}),
    }:null;
  return {turns,pending,summary:typeof raw.summary==='string'?raw.summary.slice(0,950):null,
    ...(raw.mode===SECRETARY_MODES.PSYCHOLOGIST?{mode:SECRETARY_MODES.PSYCHOLOGIST}:{}),
    ...(raw.mode===FREE_DIAGNOSTIC_MODE?{mode:FREE_DIAGNOSTIC_MODE}:{}),
    ...(raw.mode===FREE_DIAGNOSTIC_MODE&&FREE_DIAGNOSTIC_PHASES.includes(raw.freeRetryStage)
      ?{freeRetryStage:raw.freeRetryStage}:{}),
    ...(SERVICE_CODES.has(raw.serviceRequest)?{serviceRequest:raw.serviceRequest}:{}),
    ...(SERVICE_CODES.has(raw.serviceRequest)&&raw.serviceDisclosureSeen===true?{serviceDisclosureSeen:true}:{}),
    ...(telegramServiceOption(raw.offerId,'en')?.service===raw.serviceRequest
      ?{offerId:raw.offerId}:{}),
    ...(INTAKE_STAGES.has(raw.intakeStage)?{intakeStage:raw.intakeStage}:{}),
    ...(raw.intakeSlots&&typeof raw.intakeSlots==='object'?{intakeSlots:Object.fromEntries(
      (raw.mode===FREE_DIAGNOSTIC_MODE?FREE_DIAGNOSTIC_FIELDS:['goal','challenge','situation','source']).flatMap(key=>
        typeof raw.intakeSlots[key]==='string'&&raw.intakeSlots[key].trim()
          ?[[key,raw.intakeSlots[key].trim().slice(0,key==='source'?180:360)]]:[]))}:{}),
    ...(raw.conversationKind==='general'?{conversationKind:'general'}:{}),
    ...(typeof raw.voiceConsentAt==='string'&&Number.isFinite(Date.parse(raw.voiceConsentAt))
      ?{voiceConsentAt:new Date(raw.voiceConsentAt).toISOString()}:{}),
    ...(Number.isSafeInteger(raw.voiceOfferUpdateId)&&raw.voiceOfferUpdateId>0
      ?{voiceOfferUpdateId:raw.voiceOfferUpdateId}:{}),
    ...(typeof raw.voiceOfferAt==='string'&&Number.isFinite(Date.parse(raw.voiceOfferAt))
      ?{voiceOfferAt:new Date(raw.voiceOfferAt).toISOString()}:{}),
    ...(Number.isSafeInteger(raw.voiceOfferMessageId)&&raw.voiceOfferMessageId>0
      ?{voiceOfferMessageId:raw.voiceOfferMessageId}:{}),
    ...(Number.isSafeInteger(raw.voiceDeliveryPendingId)&&raw.voiceDeliveryPendingId>0
      ?{voiceDeliveryPendingId:raw.voiceDeliveryPendingId}:{}),
  };
}

/** A voice approval button is valid only for its actual Telegram bot message.
 * Expired/old buttons (including those from before /voice_off) fail closed. */
export function v3VoiceOfferValid(ctx,callbackMessageId,now=Date.now()){
  const at=Date.parse(ctx?.voiceOfferAt||'');
  return Number.isSafeInteger(callbackMessageId)&&callbackMessageId>0&&
    Number.isSafeInteger(ctx?.voiceOfferMessageId)&&
    ctx.voiceOfferMessageId===callbackMessageId&&
    Number.isSafeInteger(ctx?.voiceOfferUpdateId)&&ctx.voiceOfferUpdateId>0&&
    Number.isFinite(at)&&at<=now&&now-at<=5*60*1000;
}
export function v3DailyReplyCount(row,day){
  const dbDay=row?.reply_day instanceof Date
    ?(Number.isFinite(row.reply_day.getTime())?row.reply_day.toISOString().slice(0,10):'')
    :String(row?.reply_day||'').slice(0,10);
  if(dbDay!==day)return 0;
  const count=Number(row?.reply_count);
  return Number.isFinite(count)?Math.min(40,Math.max(0,Math.trunc(count))):0;
}
/** Ali's consented local dialogue can remain available when both hosted LLMs are down.
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
/**
 * Consent reminders are short, locale-specific and never invoke a model.
 * Service welcome/disclosure happens before this function; a disabled
 * provider always returns the no-inference message.
 */
export function v3ConsentReminder({general=false,chatAllowed=false,allowed=false,
  serviceCopy=null,chat=null,copy=null}={}){
  const unavailable=typeof copy?.notReady==='string'?copy.notReady:'';
  if(general)return chatAllowed&&typeof chat?.nudge==='string'?
    chat.nudge:unavailable;
  if(!allowed)return unavailable;
  if(typeof serviceCopy?.consentNudge==='string'&&
     serviceCopy.consentNudge.trim())return serviceCopy.consentNudge;
  return typeof copy?.nudge==='string'&&copy.nudge.trim()?
    copy.nudge:unavailable;
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
    !/^(?:да|да, начать|давайте(?: 🌿)?|не сейчас|нет|отложить диагностику|yes|start interview|let['’]s talk(?: 🌿)?|not now|no|maybe later|sí|si|empezar entrevista|hablemos(?: 🌿)?|ahora no|más tarde)[.!? ]*$/iu.test(raw);
}
export const V3_CHAT_COPY=Object.freeze({
 ru:Object.freeze({
   intro: "Привет! Я Ali — помощник Holistic House 🌿 Давайте просто поговорим. Это не диагностика. С вашего согласия текст может обрабатываться облачной языковой моделью, в том числе внешним сервисом OpenRouter. Не присылайте медицинские документы, пароли и личные секреты; это не терапия. Остановить диалог: /stop.",
   nudge: "Я Ali 🌿 Нажмите «Поговорить с Ali», если согласны продолжить диалог.",
   first:'Конечно, давайте поговорим 🌿 О чём вам хотелось бы поговорить?',
   later:'Хорошо, можно поговорить позже.',
   ended:'Диалог завершён. Для нового разговора просто напишите мне.',
   failed: "Ali на связи, но сейчас не удалось подготовить ответ. Диалог сохранён; можно попробовать позже.",
 }),
 en:Object.freeze({
   intro: "Hi! I'm Ali, the Holistic House assistant 🌿 We can simply chat; this is not a diagnostic interview. With your consent, messages may be processed by a cloud language model, including external provider OpenRouter. Please do not send medical records, passwords or private secrets; this is not therapy. Stop with /stop.",
   nudge: "Ali is here 🌿 Choose “Chat with Ali” to consent and continue.",
   first:'Of course, we can talk 🌿 What would you like to discuss?',
   later:'Okay, we can chat another time.',
   ended:'Chat ended. Write again to start a new conversation.',
   failed: "Ali is here, but I could not prepare a reply just now. Your conversation is saved; you can try later.",
 }),
 es:Object.freeze({
   intro: "¡Hola! Soy Ali, el asistente de Holistic House 🌿 Podemos conversar sin entrevista diagnóstica. Con tu consentimiento, los mensajes pueden procesarse mediante un modelo en la nube, incluido el proveedor externo OpenRouter. No envíes documentos médicos, contraseñas ni secretos; esto no es terapia. Para parar: /stop.",
   nudge: "Ali está aquí 🌿 Elige «Hablar con Ali» para aceptar y continuar.",
   first:'Claro, podemos hablar 🌿 ¿De qué te gustaría conversar?',
   later:'De acuerdo, podemos hablar más tarde.',
   ended:'Conversación terminada. Escribe para iniciar otra.',
   failed: "Ali sigue aquí, pero ahora no pude preparar una respuesta. Se conserva la conversación; puedes probar después.",
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
