// No provider calls or automatic marketing consent. Signed Telegram webhook only.
export const TELEGRAM_MARKETING_CONSENT_VERSION = 'hh-tg-marketing-v1'
export function telegramMarketingIntent(value) {
  const text=String(value||'').trim().toLocaleLowerCase()
  if (/^\/subscribe(?:@[a-z0-9_]+)?$/.test(text) ||
      ['подписаться на новости','подписаться на рассылку','subscribe to updates','suscribirme a novedades'].includes(text))
    return 'granted'
  if (/^\/unsubnews(?:@[a-z0-9_]+)?$/.test(text) ||
      ['отписаться от новостей','отписаться от рассылки','unsubscribe from updates','cancelar noticias'].includes(text))
    return 'withdrawn'
  return null
}
export function telegramMarketingActive(state) {
  if(!state||state.stage==='stopped'||!state.consent_at)return false
  const granted=Date.parse(state.marketing_opt_in_at||'')
  const revoked=Date.parse(state.marketing_opt_out_at||'')
  return Number.isFinite(granted)&&(!Number.isFinite(revoked)||granted>revoked)
}
const replies={
  en:{granted:'You subscribed to Holistic House updates. To stop news only: /unsubnews. To stop all contact: /stop.',
    withdrawn:'You are unsubscribed from news. Your existing personal conversation remains open until /stop.',
    needsConsent:'First start the personal conversation and explicitly confirm consent. News subscriptions remain optional.'},
  ru:{granted:'Вы подписались на новости Holistic House. Отписаться только от новостей: /unsubnews. Прекратить все сообщения: /stop.',
    withdrawn:'Вы отписались от новостей. Личная переписка остаётся доступной до команды /stop.',
    needsConsent:'Сначала начните личную переписку и явно подтвердите согласие. Подписка на новости необязательна.'},
  es:{granted:'Te has suscrito a las novedades de Holistic House. Solo noticias: /unsubnews. Detener todos los mensajes: /stop.',
    withdrawn:'Ya no recibirás novedades. La conversación personal continúa hasta /stop.',
    needsConsent:'Primero inicia una conversación personal y confirma el consentimiento. Las novedades son opcionales.'},
}
export function telegramMarketingNotice(locale,kind) {
  const lang=Object.hasOwn(replies,locale)?locale:'en'
  return replies[lang][kind]||''
}
