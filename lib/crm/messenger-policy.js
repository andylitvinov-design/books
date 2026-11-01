// Pure messenger policy: no marketing automation, no health data, fail-closed.
export const MESSENGER_CHANNELS = Object.freeze(['telegram','whatsapp','instagram','messenger'])
// BotFather tokens start with the numeric bot ID. Derive it server-side so a
// sensitive, non-readable Vercel token does not require copying its ID again.
// Explicit override is allowed only when it agrees with the token; getMe must
// independently confirm the identity before owner connects this CRM channel.
export function telegramBotBusinessId(env=process.env){
  const token=env.HH_CRM_MSG_TELEGRAM_TOKEN
  const match=typeof token==='string' ? /^(\d{5,25}):[A-Za-z0-9_-]{20,}$/.exec(token) : null
  if(!match)return null
  const specified=env.HH_CRM_MSG_TELEGRAM_BOT_ID
  if(specified!==undefined&&specified!==null&&specified!==''&&String(specified)!==match[1])return null
  return match[1]
}
// A read-only owner verification may test BotFather credentials BEFORE
// the separate allowlisted pilot chat exists. This does NOT open the transport
// to any inbound webhook or outbound send; channelTransportReady stays gated.
export function telegramCredentialPreflightReady(env=process.env){
  const username=String(env.HH_CRM_MSG_TELEGRAM_USERNAME||'').replace(/^@/,'')
  return env.HH_CRM_MSG_TELEGRAM_ENABLED==='true' &&
    !!telegramBotBusinessId(env) &&
    /^[A-Za-z0-9_-]{1,256}$/.test(env.HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET||'') &&
    /^[A-Za-z0-9_]{5,32}$/.test(username) && /bot$/i.test(username)
}
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
// Narrow scope: ONLY the owner's existing @tao.ideas Instagram professional
// inbox can be enabled independently of Telegram, WhatsApp or paid Meta ads.
// This is not permission for automated DMs, scraping or another account.
export function instagramTaoInboxApproved(env=process.env){
  return env.VERCEL_ENV==='production' &&
    env.HH_CRM_MSG_INSTAGRAM_INBOX_APPROVED==='true' &&
    String(env.HH_CRM_MSG_INSTAGRAM_USERNAME||'').replace(/^@/,'').toLowerCase()==='tao.ideas'
}
// A narrowly scoped public, customer-initiated Telegram diagnostic.
// Does not approve Meta, marketing, arbitrary notifications or the global send gate.
export function telegramPublicDiagnosticReady(env=process.env){
  return env.VERCEL_ENV==='production' &&
    env.HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED==='true' &&
    env.HH_CRM_TG_DIAGNOSTIC_ENABLED==='true' &&
    telegramCredentialPreflightReady(env)
}
export function telegramPilotReady(env=process.env){
  // The short-lived invitation pilot is retired when permanent public intake is enabled.
  return env.VERCEL_ENV==='production' &&
    !telegramPublicDiagnosticReady(env) &&
    env.HH_CRM_MSG_PRODUCTION_APPROVED!=='true' &&
    env.HH_CRM_MSG_TELEGRAM_PILOT_ENABLED==='true' &&
    /^\d{5,25}$/.test(env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID||'')
}
export function channelTransportReady(channel,env=process.env){
  if (!MESSENGER_CHANNELS.includes(channel)) return false
  // This user's exact Instagram production inbox must never ingest customer
  // messages from a preview build sharing a database or callback.
  if(channel==='instagram'&&env.VERCEL_ENV!=='production')return false
  if (env.VERCEL_ENV==='production' && env.HH_CRM_MSG_PRODUCTION_APPROVED!=='true' &&
      !(channel==='telegram'&&(telegramPilotReady(env)||telegramPublicDiagnosticReady(env))) &&
      !(channel==='instagram'&&instagramTaoInboxApproved(env))) return false
  if (channel==='telegram') return env.HH_CRM_MSG_TELEGRAM_ENABLED==='true' &&
    !!env.HH_CRM_MSG_TELEGRAM_TOKEN && !!env.HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET &&
    /^[A-Za-z0-9_-]{1,256}$/.test(env.HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET||'') &&
    !!telegramBotBusinessId(env)
  if (channel==='whatsapp') return env.HH_CRM_MSG_WHATSAPP_ENABLED==='true' &&
    !!env.HH_CRM_MSG_WHATSAPP_TOKEN && !!env.HH_CRM_MSG_WHATSAPP_PHONE_ID &&
    !!env.HH_CRM_MSG_META_APP_SECRET && !!env.HH_CRM_MSG_META_VERIFY_TOKEN &&
    /^v\d{1,2}\.0$/.test(env.HH_CRM_MSG_META_API_VERSION||'')
  // Even a global Meta send approval must not auto-enable this unrelated
  // Instagram handle. Require explicit one-account approval, always.
  if (channel==='instagram') return instagramTaoInboxApproved(env) &&
    env.HH_CRM_MSG_INSTAGRAM_ENABLED==='true' &&
    /^\d{5,25}$/.test(String(env.HH_CRM_MSG_INSTAGRAM_ID||'')) &&
    String(env.HH_CRM_MSG_INSTAGRAM_USERNAME||'').replace(/^@/,'').toLowerCase()==='tao.ideas' &&
    !!env.HH_CRM_MSG_INSTAGRAM_TOKEN && !!env.HH_CRM_MSG_META_APP_SECRET &&
    !!env.HH_CRM_MSG_META_VERIFY_TOKEN &&
    /^v\d{1,2}\.0$/.test(env.HH_CRM_MSG_META_API_VERSION||'')
  return env.HH_CRM_MSG_MESSENGER_ENABLED==='true' &&
    !!env.HH_CRM_MSG_MESSENGER_TOKEN && !!env.HH_CRM_MSG_MESSENGER_PAGE_ID &&
    !!env.HH_CRM_MSG_META_APP_SECRET && !!env.HH_CRM_MSG_META_VERIFY_TOKEN &&
    /^v\d{1,2}\.0$/.test(env.HH_CRM_MSG_META_API_VERSION||'')
}

// Owner-only guidance link for an ALREADY connected, restricted Telegram pilot.
// URL contains only a public bot username and a static locale: never a chat ID,
// token, customer identifier or even a signed deep-link session value.
export function telegramOwnerPilotLinks(env=process.env){
  if(!telegramPilotReady(env)||!channelTransportReady('telegram',env))return null
  const username=String(env.HH_CRM_MSG_TELEGRAM_USERNAME||'').replace(/^@/,'')
  if(!/^[A-Za-z0-9_]{5,32}$/.test(username)||!/bot$/i.test(username))return null
  return Object.fromEntries(['en','ru','es'].map(locale=>
    [locale,'https://t.me/'+username+'?start=hhreview_'+locale]))
}

const REQUIRED_SECRETS=Object.freeze({
  telegram:['HH_CRM_MSG_TELEGRAM_TOKEN','HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET'],
  whatsapp:['HH_CRM_MSG_WHATSAPP_TOKEN','HH_CRM_MSG_WHATSAPP_PHONE_ID',
    'HH_CRM_MSG_META_APP_SECRET','HH_CRM_MSG_META_VERIFY_TOKEN','HH_CRM_MSG_META_API_VERSION'],
  instagram:['HH_CRM_MSG_INSTAGRAM_TOKEN','HH_CRM_MSG_INSTAGRAM_ID','HH_CRM_MSG_INSTAGRAM_USERNAME',
    'HH_CRM_MSG_META_APP_SECRET','HH_CRM_MSG_META_VERIFY_TOKEN','HH_CRM_MSG_META_API_VERSION'],
  messenger:['HH_CRM_MSG_MESSENGER_TOKEN','HH_CRM_MSG_MESSENGER_PAGE_ID',
    'HH_CRM_MSG_META_APP_SECRET','HH_CRM_MSG_META_VERIFY_TOKEN','HH_CRM_MSG_META_API_VERSION'],
})
const CHANNEL_ENABLED_KEYS=Object.freeze({
  telegram:'HH_CRM_MSG_TELEGRAM_ENABLED',
  whatsapp:'HH_CRM_MSG_WHATSAPP_ENABLED',
  instagram:'HH_CRM_MSG_INSTAGRAM_ENABLED',
  messenger:'HH_CRM_MSG_MESSENGER_ENABLED',
})
// Return only key NAMES and boolean setup states to authenticated owners.
// NEVER expose tokens, IDs, webhook secrets or their actual values.
export function messengerSetupStatus(channel,env=process.env){
  if(!MESSENGER_CHANNELS.includes(channel))return null
  const missing=REQUIRED_SECRETS[channel].filter(key=>{
    const value=env[key]
    if(!value||!String(value).trim())return true
    if(key==='HH_CRM_MSG_META_API_VERSION'&&!/^v\d{1,2}\.0$/.test(value))return true
    if(key==='HH_CRM_MSG_INSTAGRAM_USERNAME'&&String(value).replace(/^@/,'').toLowerCase()!=='tao.ideas')return true
    if(key==='HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET'&&!/^[A-Za-z0-9_-]{1,256}$/.test(value))return true
    if(/_(PHONE_ID|INSTAGRAM_ID|PAGE_ID)$/.test(key)&&!/^\d{5,25}$/.test(value))return true
    return false
  })
  if(channel==='telegram'&&!telegramBotBusinessId(env)&&!missing.includes('HH_CRM_MSG_TELEGRAM_TOKEN'))
    missing.push('HH_CRM_MSG_TELEGRAM_TOKEN')
  const publicIntake=channel==='telegram'&&telegramPublicDiagnosticReady(env)
  const liveApproved=channel==='instagram'
    ?instagramTaoInboxApproved(env)
    :env.VERCEL_ENV!=='production'||env.HH_CRM_MSG_PRODUCTION_APPROVED==='true'||publicIntake
  const pilot=channel==='telegram'&&telegramPilotReady(env)
  const enabled=env[CHANNEL_ENABLED_KEYS[channel]]==='true'
  const configured=channelTransportReady(channel,env)
  const callbackUrl='https://holistichouse.vercel.app/api/app/crm/messenger/webhook/'+channel
  const pilotLinks=channel==='telegram'&&configured&&pilot?telegramOwnerPilotLinks(env):null
  return {channel,missingKeys:missing,enabled,liveApproved,pilot,publicIntake,configured,callbackUrl,
    ...(pilotLinks?{pilotLinks}:{})}
}
