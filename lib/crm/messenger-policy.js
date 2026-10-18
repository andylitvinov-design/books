// Pure messenger policy: no marketing automation, no health data, fail-closed.
export const MESSENGER_CHANNELS = Object.freeze(['telegram','whatsapp','instagram','messenger'])
export function validateMessageText(value) {
  if (typeof value !== 'string') throw new Error('INVALID_MESSAGE')
  const text = value.trim()
  if (!text || text.length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))
    throw new Error('INVALID_MESSAGE')
  // Never send full secret-bearing cabinet/session links or plainly clinical material.
  if (/\/client\/(?:session\/)?[^\s]*#|(?:https?:\/\/[^\s]+)#(?:[A-Za-z0-9_-]{12,})/i.test(text) ||
      /\b(?:diagnos(?:is|es)|prescription|dosage|potency|patient report|lab results|clinical assessment)\b|(?:диагноз|назначени[ея]|потенци[яи]|результат[ы]? анализ)/i.test(text))
    throw new Error('PRIVATE_CONTENT_BLOCKED')
  return text
}
export function canReply({channel,lastInboundAt,suppressed,enabled,now=Date.now()}) {
  if (!MESSENGER_CHANNELS.includes(channel)) return {ok:false,reason:'INVALID_CHANNEL'}
  if (!enabled) return {ok:false,reason:'CHANNEL_NOT_CONNECTED'}
  if (suppressed) return {ok:false,reason:'CONTACT_BLOCKED'}
  const inbound = Date.parse(lastInboundAt||'')
  if (!Number.isFinite(inbound) || inbound>now+300000) return {ok:false,reason:'CUSTOMER_MUST_START'}
  // For Meta, allow only conservative one-to-one customer-service replies.
  if (channel!=='telegram' && (now-inbound>23*60*60*1000 || now-inbound<0))
    return {ok:false,reason:'REPLY_WINDOW_CLOSED'}
  return {ok:true,reason:'CUSTOMER_INITIATED_REPLY'}
}
export function channelTransportReady(channel,env=process.env){
  if (!MESSENGER_CHANNELS.includes(channel)) return false
  if (env.VERCEL_ENV==='production' && env.HH_CRM_MSG_PRODUCTION_APPROVED!=='true') return false
  if (channel==='telegram') return env.HH_CRM_MSG_TELEGRAM_ENABLED==='true' &&
    !!env.HH_CRM_MSG_TELEGRAM_TOKEN && !!env.HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET && /^\d{5,25}$/.test(env.HH_CRM_MSG_TELEGRAM_BOT_ID||'')
  if (channel==='whatsapp') return env.HH_CRM_MSG_WHATSAPP_ENABLED==='true' &&
    !!env.HH_CRM_MSG_WHATSAPP_TOKEN && !!env.HH_CRM_MSG_WHATSAPP_PHONE_ID &&
    !!env.HH_CRM_MSG_META_APP_SECRET && !!env.HH_CRM_MSG_META_VERIFY_TOKEN &&
    /^v\d{1,2}\.0$/.test(env.HH_CRM_MSG_META_API_VERSION||'')
  if (channel==='instagram') return env.HH_CRM_MSG_INSTAGRAM_ENABLED==='true' &&
    !!env.HH_CRM_MSG_INSTAGRAM_TOKEN && !!env.HH_CRM_MSG_INSTAGRAM_ID &&
    !!env.HH_CRM_MSG_META_APP_SECRET && !!env.HH_CRM_MSG_META_VERIFY_TOKEN &&
    /^v\d{1,2}\.0$/.test(env.HH_CRM_MSG_META_API_VERSION||'')
  return env.HH_CRM_MSG_MESSENGER_ENABLED==='true' &&
    !!env.HH_CRM_MSG_MESSENGER_TOKEN && !!env.HH_CRM_MSG_MESSENGER_PAGE_ID &&
    !!env.HH_CRM_MSG_META_APP_SECRET && !!env.HH_CRM_MSG_META_VERIFY_TOKEN &&
    /^v\d{1,2}\.0$/.test(env.HH_CRM_MSG_META_API_VERSION||'')
}
