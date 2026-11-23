import {telegramSupportStartSelection,telegramSupportSelection} from './telegram-support-quiz.mjs';
import {aliServiceScenario,routeAliEntry} from '../assist/ali-service-scenario.mjs';
import {aliServiceSecretaryFirst} from '../assist/ali-service-secretary.mjs';
import {telegramServiceOption,telegramServiceOptionStart} from '../assist/telegram-service-options.mjs';
import {SECRETARY_MODES,SECRETARY_PSYCHOLOGIST_COPY,v3PsychologistStart} from '../assist/secretary-modes.mjs';
import {FREE_DIAGNOSTIC_MODE,FREE_DIAGNOSTIC_FIELDS,FREE_DIAGNOSTIC_PHASES} from '../assist/ali-free-diagnostic-library.mjs';
export {SECRETARY_PSYCHOLOGIST_COPY,v3PsychologistStart};
export const v3SupportStart=telegramSupportStartSelection;
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
  title,intro:'Здравствуйте! Я Ali, секретарь Holistic House. Вы выбрали «'+title+'». Выберите, что вам хотелось бы узнать.',
  consent:'Ответы остаются в защищённой беседе. Андрею можно передать только резюме, которое вы одобрите.',
  welcomeNudge:'Рад знакомству! 🌿 Нажмите «Давайте 🌿», когда захотите продолжить.',
  consentNudge:'Если всё подходит, нажмите «Согласен, продолжим».',
  first:aliServiceSecretaryFirst(l),
  reviewTitle:'Заявка на «'+title+'»:\n\n',reviewQuestion:'\n\nВсё верно? Отправить мастеру?',
  submitted:ref=>'Заявка '+ref+' сохранена в защищённой CRM мастера. Запись и оплата пока не подтверждены.',
 };
 if(l==='es')return {
  title,intro:'Hola, soy Ali, asistente de Holistic House. Has elegido «'+title+'». ¿Qué te gustaría saber primero?',
  consent:'Tus respuestas quedan protegidas. Andrey recibirá únicamente el resumen que apruebes.',
  welcomeNudge:'Me alegra conocerte 🌿 Pulsa «Hablemos 🌿» cuando quieras.',
  consentNudge:'Si te parece bien, pulsa «Acepto, seguimos».',
  first:aliServiceSecretaryFirst(l),
  reviewTitle:'Solicitud de «'+title+'»:\n\n',reviewQuestion:'\n\n¿Es correcto? ¿Enviar al profesional?',
  submitted:ref=>'Solicitud '+ref+' guardada en el CRM seguro del profesional. No se ha confirmado cita ni pago.',
 };
 return {title,
  intro:'Hello, I’m Ali, the Holistic House assistant. You selected “'+title+'”. What would you like to know first?',
  consent:'Your replies are kept private. Only the summary you approve can be shared with Andrey.',
  welcomeNudge:'Lovely to meet you! 🌿 Tap “Let’s talk 🌿” whenever you’re ready.',
  consentNudge:'If that works for you, tap “I agree, let’s talk”.',
  first:aliServiceSecretaryFirst(l),
  reviewTitle:'Request for “'+title+'”:\n\n',reviewQuestion:'\n\nIs this right? Send to the practitioner?',
  submitted:ref=>'Request '+ref+' is saved in the practitioner’s secure CRM. No appointment or payment has been confirmed.',
 };
}
export const V3_LABELS = Object.freeze({
  ru: Object.freeze({
    agree: 'Давайте 🌿', serviceagree: 'Согласен, продолжим', book: '🗓 Записаться к Андрею', decline: 'Не сейчас', finish: 'Посмотреть заявку', skip: 'Пропустить вопрос', skipportrait:'⏭ Без личного фото', skipdrawing:'⏭ Без рисунка',
    continue: 'Продолжить разговор', chatagree: 'Поговорить с Ali', chatlater: 'Поговорим позже', voiceagree: 'Разрешить голос', voicedecline: 'Не сейчас (голос)', send: 'Передать на личный разбор',
    edit: 'Уточнить запрос', cancel: 'Не передавать', servicesend: 'Отправить заявку',
    serviceinfo:'📋 Об услуге', masterinfo:'👤 О мастере', servicebooking:'🗓 Как записаться',
    servicebegin:'✅ Начать запись', servicechat:'💬 Задать вопрос Ali',
  }),
  en: Object.freeze({
    agree: 'Let’s talk 🌿', serviceagree: 'I agree, let’s talk', book: '🗓 Book with Andrey', decline: 'Not now', finish: 'Review request', skip: 'Skip question', skipportrait:'⏭ No personal photo', skipdrawing:'⏭ No drawing photo',
    continue: 'Keep talking', chatagree: 'Chat with Ali', chatlater: 'Talk later', voiceagree: 'Allow voice', voicedecline: 'Not now (voice)', send: 'Send for personal review',
    edit: 'Clarify my request', cancel: 'Do not send', servicesend: 'Send request',
    serviceinfo:'📋 About the service', masterinfo:'👤 About practitioner', servicebooking:'🗓 How to book',
    servicebegin:'✅ Start booking', servicechat:'💬 Ask Ali',
  }),
  es: Object.freeze({
    agree: 'Hablemos 🌿', serviceagree: 'Acepto, seguimos', book: '🗓 Reservar con Andrey', decline: 'Ahora no', finish: 'Ver solicitud', skip: 'Omitir pregunta', skipportrait:'⏭ Sin foto personal', skipdrawing:'⏭ Sin dibujo',
    continue: 'Seguir conversando', chatagree: 'Hablar con Ali', chatlater: 'Hablar luego', voiceagree: 'Permitir voz', voicedecline: 'Ahora no (voz)', send: 'Enviar para revisión personal',
    edit: 'Aclarar mi solicitud', cancel: 'No enviar', servicesend: 'Enviar solicitud',
    serviceinfo:'📋 Sobre el servicio', masterinfo:'👤 Sobre el profesional', servicebooking:'🗓 Cómo reservar',
    servicebegin:'✅ Empezar reserva', servicechat:'💬 Preguntar a Ali',
  }),
});
export const V3_BUTTONS = Object.freeze(Object.values(V3_LABELS).flatMap(x=>Object.values(x)));
export const V3_COPY = Object.freeze({
  ru: Object.freeze({
    intro: "Привет! 🌿 Я Ali. Давайте спокойно разберём ваш вопрос. AI поможет только с вашего согласия. Поговорим?",
    nudge: 'Я рядом 🌿 Если хотите поговорить, нажмите «Давайте 🌿». Можно и позже.',
    first: 'Что вы сейчас больше всего хотите понять или изменить?',
    later: 'Хорошо. Если захочешь вернуться, отправь /review.',
    declined: 'Хорошо, запрос не передан. Можно продолжить разговор позже.',
    busy: "Я ещё читаю ваш ответ. Секундочку 🌿",
    unclear: 'Расскажи, пожалуйста, чуть подробнее, что сейчас для тебя важно.',
    notReady: "Сейчас не получается продолжить. Можно написать мастеру через сайт.",
    providerError: "Не удалось ответить. Можем попробовать ещё раз или посмотреть резюме.",
    reviewTitle: 'Я подготовил черновик твоего запроса:\n\n',
    reviewQuestion: "\n\nВсё верно? Передать Андрею?",
    submitted: "Спасибо! Запрос передан Андрею для личного ответа.",
    stopped: "Диалог остановлен.",
    empty: 'Чтобы составить запрос, сначала расскажи немного о своей ситуации.',
    photo: "По фотографии я не оцениваю состояние. Можем опираться на ваши слова.",
  }),
  en: Object.freeze({
    intro: "Hi! 🌿 I’m Ali. Tell me what’s on your mind. With your consent, AI can help us explore it. Shall we talk?",
    nudge: 'I’m here 🌿 Tap “Let’s talk 🌿” whenever you feel ready.',
    first: 'What would you most like to understand or change in your situation?',
    later: 'Of course. Send /review whenever you want to return.',
    declined: 'Understood. No request has been submitted. We can continue another time.',
    busy: "I’m reading your message. One moment 🌿",
    unclear: 'Could you tell me a little more about what matters most right now?',
    notReady: "I can't continue right now. You can contact Andrey through the site.",
    providerError: "I couldn't respond just now. We can try again or review your summary.",
    reviewTitle: 'Here is the draft summary of your request:\n\n',
    reviewQuestion: "\n\nDoes this look right? Send to Andrey?",
    submitted: "Thanks! Your request is with Andrey for a personal reply.",
    stopped: "The conversation has stopped.",
    empty: 'Please tell me a little about your situation before preparing the summary.',
    photo: "I can't assess your situation from a photo. Your words are more helpful.",
  }),
  es: Object.freeze({
    intro: "¡Hola! 🌿 Soy Ali. Cuéntame qué te preocupa. Con tu permiso, la IA puede ayudarnos a aclararlo. ¿Hablamos?",
    nudge: 'Aquí estoy 🌿 Pulsa «Hablemos 🌿» cuando quieras. Sin prisa.',
    first: '¿Qué te gustaría comprender o cambiar de tu situación?',
    later: 'Por supuesto. Envía /review cuando quieras volver.',
    declined: 'Entendido. No se ha enviado ninguna solicitud. Podemos continuar después.',
    busy: "Estoy leyendo tu respuesta. Un momento 🌿",
    unclear: '¿Puedes contarme un poco más de lo que más te importa ahora?',
    notReady: "Ahora no puedo continuar. Puedes contactar a Andrey desde la web.",
    providerError: "No he podido responder. Podemos probar otra vez o revisar el resumen.",
    reviewTitle: 'He preparado un borrador de tu solicitud:\n\n',
    reviewQuestion: "\n\n¿Está bien? ¿Lo enviamos a Andrey?",
    submitted: "¡Gracias! Tu solicitud está con Andrey para una respuesta personal.",
    stopped: "La conversación se ha detenido.",
    empty: 'Cuéntame primero algo de tu situación para preparar el resumen.',
    photo: "No evalúo tu situación por fotos. Tus palabras ayudan más.",
  }),
});
export function v3Locale(value) { return LANGUAGES.has(value) ? value : 'en'; }
export function v3StartLocale(text) {
  return /^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hh(?:review|diagnostic|secretary)_(ru|en|es)$/i.exec(String(text||'').trim())?.[1]?.toLowerCase() || null;
}
// A dedicated Telegram menu entry; it grants no service, diagnostic or AI consent.
export function v3AssistantStart(text){
 const m=/^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hhassistant_(ru|en|es)$/i.exec(String(text||'').trim());
 return m?{locale:m[1].toLowerCase()}:null;
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
  for(const [key] of Object.entries(V3_LABELS.en).filter(([key])=>['serviceinfo','masterinfo','servicebooking','servicebegin','servicechat'].includes(key)))
    if(Object.values(V3_LABELS).some(labels=>labels[key]===raw))return key;
  if(Object.values(V3_LABELS).some(labels=>labels.serviceagree===raw))return 'serviceagree';
  if(Object.values(V3_LABELS).some(labels=>labels.book===raw))return 'book';
  // Direct booking intent stays in THIS bot; only the later Send action
  // authorizes a request. Negated, conditional and general advice are excluded.
  if(raw.length<130&&!/(?:не хочу|не готов|не буду|don't want|not ready|no quiero|no estoy list)/iu.test(raw)&&
    /^(?:(?:я )?(?:хочу|хотел[ао]? бы|готов[а]?) (?:записаться(?: на (?:консультацию|сессию|встречу))?|на консультацию)|запиши(?:те)? меня(?: на консультацию)?|i (?:want|would like|am ready) to book(?: a (?:session|consultation))?|(?:please )?book (?:me|a session)|quiero reservar(?: una consulta)?|me gustar[ií]a reservar(?: una consulta)?)[.!?\s]*$/iu.test(raw))
    return 'book';
  if(/^(?:да|да, начать|давайте(?: 🌿)?|yes|start interview|let['’]s talk(?: 🌿)?|sí|si|empezar entrevista|hablemos(?: 🌿)?)[.! ]*$/iu.test(raw))return 'agree';
  if(/^(?:не сейчас|not now|ahora no|отложить диагностику|maybe later|más tarde)[.! ]*$/iu.test(raw))return 'decline';
  if(/^(?:завершить интервью|finish interview|terminar entrevista)$/iu.test(raw))return 'finish';
  if(/^(?:⏭\s*)?(?:пропустить фото|без личного фото|skip photo|no personal photo|omitir foto|sin foto personal)$/iu.test(raw))return 'skipportrait';
  if(/^(?:⏭\s*)?(?:пропустить рисунок|без рисунка|skip drawing|no drawing photo|omitir dibujo|sin dibujo)$/iu.test(raw))return 'skipdrawing';
  if(/^(?:дай(?:те)? ссылку на (?:форму|анкету)|отправьте ссылку на анкету|send (?:me )?(?:the )?(?:form|questionnaire) link|env[ií]ame el enlace del formulario)$/iu.test(raw))return 'form';
  if(/^\/(?:status|progress)(?:@[A-Za-z0-9_]+)?$/i.test(raw))return 'status';
  if(/^\/(?:form|questionnaire)(?:@[A-Za-z0-9_]+)?$/i.test(raw))return 'form';
  if(/^\/finish(?:@[A-Za-z0-9_]+)?$/i.test(raw))return 'finish';
  if(/^(?:\/skip|пропустить(?: вопрос)?|skip question|omitir pregunta)$/iu.test(raw))return 'skip';
  if(/^\/stop(?:@[A-Za-z0-9_]+)?$/i.test(raw))return 'stop';
  return null;
}
export function v3ButtonsFor(locale,stage,turnCount=0,serviceRequest=null){
  const t=V3_LABELS[v3Locale(locale)];
  if(stage==='consent')return [[t.agree,t.decline]];
  if(stage==='free_consent')return [[t.agree,t.decline],[t.book]];
  if(stage==='free_ready')return [[t.finish,t.book]];
  if(stage==='service_menu')return [[t.serviceinfo,t.masterinfo],[t.servicebooking]];
  if(stage==='service_followup')return [[t.serviceinfo,t.masterinfo,t.servicebooking],[t.servicebegin,t.servicechat]];
  if(stage==='service_consent')return [[t.serviceagree,t.decline]];
  if(stage==='chat_consent')return [[t.chatagree,t.chatlater]];
  if(stage==='voice_consent')return [[t.voiceagree,t.voicedecline]];
  if(stage==='free_interview')return turnCount>0?[[t.skip,t.finish],[t.book]]:[[t.skip,t.book]];
  if(stage==='free_portrait')return [[t.skipportrait]];
  if(stage==='free_drawing')return [[t.skipdrawing]];
  if(stage==='psych_interview')return turnCount>0?[[t.finish,t.book],[t.skip]]:[[t.skip,t.book]];
  if(stage==='interview' && turnCount>=2)return [[t.finish,t.book],[t.continue]];
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
    ...(raw.mode===FREE_DIAGNOSTIC_MODE&&
      typeof raw.verifiedTelegramUserId==='string'&&
      /^[1-9][0-9]{0,24}$/.test(raw.verifiedTelegramUserId)
      ?{verifiedTelegramUserId:raw.verifiedTelegramUserId}:{}),
    ...(raw.mode===FREE_DIAGNOSTIC_MODE&&
      typeof raw.linkedBusinessReference==='string'&&
      /^HH-[A-F0-9]{12}$/.test(raw.linkedBusinessReference)
      ?{linkedBusinessReference:raw.linkedBusinessReference}:{}),
    ...(raw.mode===FREE_DIAGNOSTIC_MODE&&
      ['portrait','drawing','review','form_pending','complete'].includes(raw.mediaStep)
      ?{mediaStep:raw.mediaStep}:{}),
    ...(raw.mode===FREE_DIAGNOSTIC_MODE&&raw.mediaReceipts&&
      typeof raw.mediaReceipts==='object'?{mediaReceipts:Object.fromEntries(
        ['portrait','drawing'].flatMap(step=>{
          const receipt=raw.mediaReceipts[step];
          if(receipt?.status==='skipped')return [[step,{status:'skipped'}]];
          if(receipt?.status==='received'&&
             /^[A-Za-z0-9_-]{10,256}$/.test(receipt.fileId||'')&&
             Number.isSafeInteger(receipt.bytes)&&receipt.bytes>0&&
             receipt.bytes<=5242880&&typeof receipt.messageId==='string'&&
             receipt.messageId.length>=8&&receipt.messageId.length<=180)
            return [[step,{status:'received',fileId:receipt.fileId,
              bytes:receipt.bytes,messageId:receipt.messageId}]];
          return [];
        }))}:{}),
    ...(raw.mode===FREE_DIAGNOSTIC_MODE&&raw.mediaPending&&
      Number.isSafeInteger(raw.mediaPending.updateId)&&
      ['portrait','drawing'].includes(raw.mediaPending.step)&&
      /^[A-Za-z0-9_-]{10,256}$/.test(raw.mediaPending.fileId||'')&&
      Number.isSafeInteger(raw.mediaPending.bytes)&&raw.mediaPending.bytes>=0&&
      raw.mediaPending.bytes<=5242880&&typeof raw.mediaPending.messageId==='string'&&
      raw.mediaPending.messageId.length>=8&&raw.mediaPending.messageId.length<=180
      ?{mediaPending:{updateId:raw.mediaPending.updateId,
        step:raw.mediaPending.step,fileId:raw.mediaPending.fileId,
        bytes:raw.mediaPending.bytes,messageId:raw.mediaPending.messageId,
        at:Number.isSafeInteger(raw.mediaPending.at)?raw.mediaPending.at:0}}:{}),
    ...(raw.mode===FREE_DIAGNOSTIC_MODE&&raw.formReceipt?.status==='received'&&
      /^HH-[A-F0-9]{12}$/.test(raw.formReceipt.referenceCode||'')
      ?{formReceipt:{status:'received',referenceCode:raw.formReceipt.referenceCode}}:{}),
    ...(raw.mode===FREE_DIAGNOSTIC_MODE&&raw.ownerNotices&&
      typeof raw.ownerNotices==='object'?{ownerNotices:Object.fromEntries(
        ['goal','challenge','situation','impact','attempts','support','portrait','drawing','portrait_skipped','drawing_skipped','form_pending','form','complete']
          .flatMap(key=>Number.isSafeInteger(raw.ownerNotices[key])&&
            raw.ownerNotices[key]>0?[[key,raw.ownerNotices[key]]]:[]))}:{}) ,
    ...(raw.mode===FREE_DIAGNOSTIC_MODE&&FREE_DIAGNOSTIC_PHASES.includes(raw.freeRetryStage)
      ?{freeRetryStage:raw.freeRetryStage}:{}),
    ...(SERVICE_CODES.has(raw.serviceRequest)?{serviceRequest:raw.serviceRequest}:{}),
    ...(telegramSupportSelection(raw.supportSelection)?{supportSelection:raw.supportSelection}:{}),
    ...(SERVICE_CODES.has(raw.serviceRequest)&&raw.serviceDisclosureSeen===true?{serviceDisclosureSeen:true}:{}),
    ...(SERVICE_CODES.has(raw.serviceRequest)&&raw.serviceMenuShown===true?{serviceMenuShown:true}:{}),
    ...(SERVICE_CODES.has(raw.serviceRequest)&&raw.serviceBookingStarted===true?{serviceBookingStarted:true}:{}),
    ...(telegramServiceOption(raw.offerId,'en')?.service===raw.serviceRequest
      ?{offerId:raw.offerId}:{}),
    ...(INTAKE_STAGES.has(raw.intakeStage)?{intakeStage:raw.intakeStage}:{}),
    ...(raw.intakeSlots&&typeof raw.intakeSlots==='object'?{intakeSlots:Object.fromEntries(
      (raw.mode===FREE_DIAGNOSTIC_MODE||raw.mode===SECRETARY_MODES.PSYCHOLOGIST?FREE_DIAGNOSTIC_FIELDS:['goal','challenge','situation','source']).flatMap(key=>
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
/** Existing schema-ready, consent-gated service Secretary needs no external AI key. */
export function v3ServiceIntakeReady(env=process.env){
 // Secretary, Secretary Psychologist and service orders are native, model-free.
 // Their admission must NOT depend on an OpenRouter/free-tier quota or key.
 return env.VERCEL_ENV==='production'&&
   env.HH_CRM_TG_AI_V3_SCHEMA_READY==='true'&&
   env.HH_CRM_TG_AI_V3_ENABLED==='true';
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
    !/^(?:да|да, начать|давайте(?: 🌿)?|не сейчас|нет|отложить диагностику|yes|start interview|let['’]s talk(?: 🌿)?|not now|no|maybe later|sí|si|empezar entrevista|hablemos(?: 🌿)?|ahora no|más tarde)[.!? ]*$/iu.test(raw);
}
export const V3_CHAT_COPY=Object.freeze({
 ru:Object.freeze({
   intro: "Привет! 🌿 Я Ali. Можем просто поговорить. Я использую собственный движок Holistic House. О чём хотите рассказать?",
   nudge: "Я Ali 🌿 Нажмите «Поговорить с Ali», если согласны продолжить диалог.",
   first:'Конечно, давайте поговорим 🌿 О чём вам хотелось бы поговорить?',
   later:'Хорошо, можно поговорить позже.',
   ended:'Диалог завершён. Для нового разговора просто напишите мне.',
   failed: "Ali на связи, но сейчас не удалось подготовить ответ. Диалог сохранён; можно попробовать позже.",
 }),
 en:Object.freeze({
   intro: "Hi! 🌿 I'm Ali. We can talk. I use Holistic House's own dialogue engine. What's on your mind?",
   nudge: "Ali is here 🌿 Choose “Chat with Ali” to consent and continue.",
   first:'Of course, we can talk 🌿 What would you like to discuss?',
   later:'Okay, we can chat another time.',
   ended:'Chat ended. Write again to start a new conversation.',
   failed: "Ali is here, but I could not prepare a reply just now. Your conversation is saved; you can try later.",
 }),
 es:Object.freeze({
   intro: "¡Hola! 🌿 Soy Ali. Podemos conversar con el motor de diálogo propio de Holistic House. ¿De qué te gustaría hablar?",
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
