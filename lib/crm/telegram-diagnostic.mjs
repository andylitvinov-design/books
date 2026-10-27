// Clean-room Telegram diagnostic journey. Pure, deterministic, no provider or DB calls.
import { transitionTelegramDiagnosticV2 } from './telegram-diagnostic-v2.mjs'
import { telegramPublicDiagnosticReady } from './messenger-policy.js'
// This is not the preview-only CRM SalesBot executor; it is a single opt-in channel flow.
export const TELEGRAM_DIAGNOSTIC_PHOTO_LIMIT = 5 * 1024 * 1024
const STAGES = new Set(['consent', 'focus', 'question', 'photo', 'done', 'stopped'])
const FOCUS = new Set(['/situation', '/energy'])
const COMMAND = /^\/[a-z_]+(?:@[A-Za-z0-9_]+)?(?:\s|$)/i
const copy = {
  en: {
    consent: 'Holistic House · Free personal written review.\nWe ask for a short question and, optionally, one photo. By sending /agree, you agree to a personal reply about this enquiry only (no marketing). Telegram is not suitable for medical records, test scores or sensitive health details. Use /stop to withdraw.',
    focus: 'What would you like reviewed?\n/situation — a personal situation\n/energy — energy and wellbeing (not a medical diagnosis)\n/stop — cancel',
    question: 'In 1–2 sentences, what would you like to understand or change? Do not send diagnoses, medical records or test results. You may /skip.',
    photo: 'Optional: send ONE photo to attach to your private enquiry (maximum 5 MB), or /skip. Photos sent through Telegram are processed by Telegram; use the protected website form instead for sensitive materials.',
    done: 'Thank you. Your enquiry has been registered for a personal response. Andrey will reply here. No appointment, health diagnosis or payment is confirmed. Send a message to add information; /stop ends contact.',
    stopped: 'Your request to stop has been recorded. We will not contact you through this chat.',
    choose: 'Please use /situation or /energy.',
    agree: 'To continue, use /agree. Otherwise use /stop.',
    askPhoto: 'Please send one photo smaller than 5 MB, or use /skip.',
    askQuestion: 'Please write a short question, or use /skip.',
  },
  ru: {
    consent: 'Holistic House · Бесплатный личный письменный разбор.\nМы попросим кратко описать вопрос и по желанию прислать одно фото. Отправляя /agree, вы соглашаетесь на личный ответ только по этой заявке, без рекламы. Не присылайте в Telegram медицинские документы, результаты тестов и сведения о здоровье. /stop — отменить согласие.',
    focus: 'Что вы хотите разобрать?\n/situation — личная ситуация\n/energy — энергия и самочувствие (не медицинский диагноз)\n/stop — отменить',
    question: 'В 1–2 предложениях: что вы хотели бы понять или изменить? Не присылайте диагнозы, анализы и результаты тестов. Можно /skip.',
    photo: 'По желанию отправьте ОДНО фото для приватной заявки (до 5 МБ) или /skip. Telegram обрабатывает отправленные фото; чувствительные материалы лучше загружать в защищённую форму на сайте.',
    done: 'Спасибо! Заявка зарегистрирована для личного ответа. Андрей ответит вам здесь. Запись, медицинский диагноз и оплата не подтверждены. Можно дополнить запрос сообщением; /stop — прекратить контакт.',
    stopped: 'Запрос на прекращение связи сохранён. Мы больше не будем писать в этот чат.',
    choose: 'Выберите /situation или /energy.',
    agree: 'Для продолжения отправьте /agree, для отмены — /stop.',
    askPhoto: 'Пришлите одно фото до 5 МБ или /skip.',
    askQuestion: 'Опишите вопрос коротко или /skip.',
  },
  es: {
    consent: 'Holistic House · Revisión personal escrita gratuita.\nTe pediremos una pregunta breve y, si quieres, una foto. Al enviar /agree, aceptas una respuesta personal solo sobre esta solicitud, sin publicidad. No envíes expedientes médicos, resultados de pruebas ni datos sensibles de salud por Telegram. /stop cancela el consentimiento.',
    focus: '¿Qué quieres explorar?\n/situation — una situación personal\n/energy — energía y bienestar (sin diagnóstico médico)\n/stop — cancelar',
    question: 'En 1–2 frases, ¿qué te gustaría comprender o cambiar? Evita diagnósticos y resultados médicos. Puedes usar /skip.',
    photo: 'Opcional: envía UNA foto para tu solicitud privada (máximo 5 MB), o /skip. Telegram procesa las fotos; usa el formulario protegido del sitio para información sensible.',
    done: '¡Gracias! Se registró tu solicitud para una respuesta personal. Andrey contestará aquí. No hay cita, diagnóstico médico ni pago confirmado. Puedes añadir un mensaje; /stop termina el contacto.',
    stopped: 'Tu solicitud de no recibir más mensajes ha sido registrada.',
    choose: 'Elige /situation o /energy.',
    agree: 'Para continuar, envía /agree; para cancelar, /stop.',
    askPhoto: 'Envía una foto de hasta 5 MB o usa /skip.',
    askQuestion: 'Escribe una pregunta breve o usa /skip.',
  },
}

export function parseDiagnosticStart(text) {
  const match = /^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hhreview_(en|ru|es)$/i.exec(String(text || '').trim())
  return match ? match[1].toLowerCase() : null
}

// Only Telegram's real Start command may create a new public session.
export function telegramPublicStartRequested(value) {
  return /^\/start(?:@[A-Za-z0-9_]{5,32})?(?:\s+hh(?:review|dao)_(?:en|ru|es))?$/i.test(String(value||'').trim())
}
export function telegramDiagnosticReady(env = process.env) {
  // A separate CRM provider and owner approval are required, not the owner practice bot.
  return env.HH_CRM_TG_DIAGNOSTIC_ENABLED === 'true' &&
    env.HH_CRM_MSG_TELEGRAM_ENABLED === 'true' &&
    (env.HH_CRM_MSG_PRODUCTION_APPROVED === 'true' ||
      telegramPublicDiagnosticReady(env) ||
      (env.HH_CRM_MSG_TELEGRAM_PILOT_ENABLED === 'true' && /^\d{5,25}$/.test(env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID || '')))
}

export function telegramDiagnosticPublicUrl(locale, env = process.env) {
  // An explicit scoped rollout is enough: never turn on global messenger sending.
  if (!telegramPublicDiagnosticReady(env) || !telegramDiagnosticReady(env)) return null
  const username = env.HH_CRM_MSG_TELEGRAM_USERNAME || ''
  if (!/^[A-Za-z0-9_]{5,32}$/.test(username) || !/bot$/i.test(username)) return null
  if (!['en', 'ru', 'es'].includes(locale)) return null
  return 'https://t.me/' + username + '?start=hhreview_' + locale
}

// Instagram's Dao Wisdom entry reuses the same authenticated, consent-first
// diagnostic bot. No separate bot, account, global transport approval or PII.
export function telegramDaoPublicUrl(locale,env=process.env){
  const canonical=telegramDiagnosticPublicUrl(locale,env)
  return canonical?canonical.replace('?start=hhreview_','?start=hhdao_'):null
}

function keyboard(stage) {
  if (stage === 'consent') return [['/agree', '/stop']]
  if (stage === 'focus') return [['/situation', '/energy'], ['/stop']]
  if (stage === 'question' || stage === 'photo') return [['/skip', '/stop']]
  if (stage === 'done') return [['/stop']]
  return []
}

function result(stage, locale, {body = null, photoFileId = null, stop = false, replyKey = null, consent = false} = {}) {
  const lang = copy[locale] ? locale : 'en'
  return {
    handled: true, stage, locale: lang, body, photoFileId, stop, consent,
    reply: replyKey ? copy[lang][replyKey] : null,
    keyboard: replyKey ? keyboard(stage) : [],
  }
}

export function transitionTelegramDiagnosticLegacy(session, event) {
  const raw = String(event?.rawText ?? '').trim()
  const startLang = parseDiagnosticStart(raw)
  const lang = copy[session?.locale] ? session.locale :
    copy[event?.locale] ? event.locale : 'en'
  const stage = STAGES.has(session?.stage) ? session.stage : null
  const agreed = Boolean(session?.consentAt)

  if (stage === 'stopped') return result('stopped', lang)
  // Telegram's ordinary Start button has no deep-link payload. It must start
  // the same consent-first intake, never fall through to generic CRM ingestion.
  if (startLang || /^\/start(?:@[A-Za-z0-9_]{5,32})?$/i.test(raw))
    return result('consent', startLang || lang, {replyKey:'consent'})
  if (!stage) {
    // Explicit /stop before consent must not create a CRM lead.
    if (/^\/stop(?:@[A-Za-z0-9_]+)?$/i.test(raw)) return result('stopped',lang)
    // Unsolicited first texts/photos are not leads. Discard their content
    // and invite consent; do not save anything before the explicit /agree.
    return result('consent',lang,{replyKey:'consent'})
  }
  if (/^\/(?:stop|unsubscribe)(?:@[A-Za-z0-9_]+)?$/i.test(raw)) {
    return result('stopped',lang,{body:agreed ? '/stop' : null,stop:agreed})
  }
  if (/^\/help(?:@[A-Za-z0-9_]+)?$/i.test(raw)) {
    return result(stage,lang,{replyKey:stage === 'consent' ? 'consent' :
      stage === 'focus' ? 'focus' : stage === 'question' ? 'question' :
        stage === 'photo' ? 'photo' : 'done'})
  }
  if (stage === 'consent') {
    if (/^\/agree(?:@[A-Za-z0-9_]+)?$/i.test(raw))
      return result('focus',lang,{body:'One-time personal reply consent; no marketing',consent:true,replyKey:'focus'})
    return result('consent',lang,{replyKey:'agree'})
  }
  if (stage === 'focus') {
    const focus = raw.toLowerCase().replace(/@[a-z0-9_]+$/,'')
    if (FOCUS.has(focus)) return result('question',lang,{
      body:focus === '/situation' ? 'Personal written review · situation' : 'Personal written review · energy and wellbeing',
      replyKey:'question',
    })
    return result('focus',lang,{replyKey:'choose'})
  }
  if (stage === 'question') {
    if (/^\/skip(?:@[A-Za-z0-9_]+)?$/i.test(raw))
      return result('photo',lang,{replyKey:'photo'})
    if (raw.length > 1 && raw.length <= 1200 && !COMMAND.test(raw) && !event?.photoFileId)
      return result('photo',lang,{body:raw,replyKey:'photo'})
    return result('question',lang,{replyKey:'askQuestion'})
  }
  if (stage === 'photo') {
    if (/^\/skip(?:@[A-Za-z0-9_]+)?$/i.test(raw))
      return result('done',lang,{replyKey:'done'})
    if (typeof event?.photoFileId === 'string' &&
        /^[A-Za-z0-9_-]{10,256}$/.test(event.photoFileId) &&
        Number.isSafeInteger(event.photoBytes) && event.photoBytes > 0 &&
        event.photoBytes <= TELEGRAM_DIAGNOSTIC_PHOTO_LIMIT)
      return result('done',lang,{body:'[Voluntary photo attached for private review]',
        photoFileId:event.photoFileId,replyKey:'done'})
    return result('photo',lang,{replyKey:'askPhoto'})
  }
  if (stage === 'done') {
    if (event?.photoFileId && /^[A-Za-z0-9_-]{10,256}$/.test(event.photoFileId) &&
        Number.isSafeInteger(event.photoBytes) && event.photoBytes > 0 &&
        event.photoBytes <= TELEGRAM_DIAGNOSTIC_PHOTO_LIMIT)
      return result('done',lang,{body:'[Additional voluntary photo]',
        photoFileId:event.photoFileId})
    // Subsequent user-authored messages go to the manual CRM inbox; no auto-reply.
    if (raw && !COMMAND.test(raw)) return result('done',lang,{body:raw.slice(0,1200)})
    return result('done',lang,{replyKey:'done'})
  }
  return {handled:false}
}

// Preserve in-progress V1 sessions and their consent, but start every NEW or
// explicit restarted chat with the natural V2 dialogue. STOP stays terminal.
export function transitionTelegramDiagnostic(session,event){
  if(session?.stage==='stopped')
    return transitionTelegramDiagnosticLegacy(session,event)
  const raw=String(event?.rawText||'').trim()
  // One explicit client message can restart the natural six-step dialogue.
  // STOP remains terminal; no bot message is initiated automatically.
  const restart=/^\/start(?:@[A-Za-z0-9_]{5,32})?(?:\s+hh(?:review|dao)_(?:en|ru|es))?$/i.test(raw) ||
    /^(?:начать заново|start again|empezar de nuevo)$/i.test(raw)
  if(!session||session.flowVersion===2||restart)
    return transitionTelegramDiagnosticV2(session,event)
  return transitionTelegramDiagnosticLegacy(session,event)
}
