// Telegram CRM free-review V3: pure, versioned conversation contracts.
// No provider credentials, database access, or model execution in this file.
export const TELEGRAM_AI_DIAGNOSTIC_V3 = 3;
const LANGUAGES = new Set(['ru', 'en', 'es']);
export const V3_LABELS = Object.freeze({
  ru: Object.freeze({
    agree: 'Да, начать', decline: 'Отложить диагностику', finish: 'Завершить интервью',
    continue: 'Продолжить разговор', send: 'Передать на личный разбор',
    edit: 'Уточнить запрос', cancel: 'Не передавать',
  }),
  en: Object.freeze({
    agree: 'Start interview', decline: 'Maybe later', finish: 'Finish interview',
    continue: 'Keep talking', send: 'Send for personal review',
    edit: 'Clarify my request', cancel: 'Do not send',
  }),
  es: Object.freeze({
    agree: 'Empezar entrevista', decline: 'Más tarde', finish: 'Terminar entrevista',
    continue: 'Seguir conversando', send: 'Enviar para revisión personal',
    edit: 'Aclarar mi solicitud', cancel: 'No enviar',
  }),
});
export const V3_BUTTONS = Object.freeze(Object.values(V3_LABELS).flatMap(x=>Object.values(x)));
export const V3_COPY = Object.freeze({
  ru: Object.freeze({
    intro: 'Привет! Я ИИ-помощник Holistic House. Помогу прояснить твою ситуацию и подготовить запрос для личного разбора.\n\nПри твоём согласии текст беседы обрабатывается внешней ИИ-моделью через OpenRouter с ограничением передачи данных для обучения. Не присылай медицинские документы и результаты анализов. Это не медицинский диагноз и не разговор с психотерапевтом.\n\nМожно остановиться в любой момент (/stop). Начнём?',
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
    intro: 'Hello! I am the Holistic House AI assistant. I can help clarify what matters to you and prepare a request for a personal review.\n\nWith your consent, conversation text is processed by an external AI model via OpenRouter with a no-training data preference. Please do not send medical documents or lab results. This is not a medical diagnosis or a therapist session.\n\nYou may stop at any time (/stop). Shall we begin?',
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
    intro: '¡Hola! Soy el asistente de IA de Holistic House. Te ayudaré a aclarar tu situación y preparar una solicitud de revisión personal.\n\nCon tu consentimiento, el texto de la conversación se procesa mediante un modelo externo a través de OpenRouter, con preferencia de no uso para entrenamiento. No envíes documentos médicos ni análisis. Esto no es un diagnóstico médico ni una sesión de terapia.\n\nPuedes detenerte cuando quieras (/stop). ¿Empezamos?',
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
  if(/^(?:да|да, начать|yes|start interview|sí|si|empezar entrevista)[.! ]*$/iu.test(raw))return 'agree';
  if(/^\/finish(?:@[A-Za-z0-9_]+)?$/i.test(raw))return 'finish';
  if(/^\/stop(?:@[A-Za-z0-9_]+)?$/i.test(raw))return 'stop';
  return null;
}
export function v3ButtonsFor(locale,stage,turnCount=0){
  const t=V3_LABELS[v3Locale(locale)];
  if(stage==='consent')return [[t.agree,t.decline]];
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
    }:null;
  return {turns,pending,summary:typeof raw.summary==='string'?raw.summary.slice(0,950):null};
}
export function v3CanStart(env=process.env){
  return env.VERCEL_ENV==='production' &&
    env.HH_CRM_TG_AI_V3_ENABLED==='true' &&
    env.HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED==='true' &&
    typeof (env.HH_CRM_TG_AI_V3_OPENROUTER_KEY ||
      (env.HH_CRM_TG_AI_V3_SHARED_KEY_APPROVED==='true' && env.HH_COUNCIL_OPENROUTER_API_KEY))==='string';
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
