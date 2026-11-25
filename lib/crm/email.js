import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const ADDRESS = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const SITE = 'https://holistichouse.vercel.app'
export const CRM_EMAIL_TEXT_LIMIT = 3000
export const CRM_EMAIL_WEBHOOK_URL = 'https://holistichouse.vercel.app/api/app/crm/webhook'

function clean(value, limit) {
  return typeof value === 'string' && value.trim() && value.length <= limit && !/[\u0000\r]/.test(value)
}
export function getCrmEmailConfig(env = process.env) {
  if (env.HH_CRM_EMAIL_ENABLED !== 'true') return { enabled: false, reason: 'email_disabled' }
  if (env.VERCEL_ENV === 'production' && env.HH_CRM_EMAIL_PRODUCTION_APPROVED !== 'true')
    return { enabled: false, reason: 'production_not_approved' }
  const from = String(env.HH_CRM_FROM_EMAIL || '').trim().toLowerCase()
  const replyTo = String(env.HH_CRM_REPLY_TO || '').trim().toLowerCase()
  const domain = String(env.HH_CRM_VERIFIED_DOMAIN || '').trim().toLowerCase()
  const name = String(env.HH_CRM_SENDER_NAME || '').trim()
  const postal = String(env.HH_CRM_POSTAL_ADDRESS || '').trim()
  const key = String(env.HH_CRM_RESEND_API_KEY || '')
  const webhookSecret = String(env.HH_CRM_RESEND_WEBHOOK_SECRET || '')
  if (!ADDRESS.test(from) || !ADDRESS.test(replyTo) || !clean(name, 90) || !clean(postal, 250) ||
    name.includes('<') || name.includes('>') ||
    !domain || from.split('@')[1] !== domain ||
    ['gmail.com','outlook.com','resend.dev','vercel.app'].includes(domain) ||
    domain.endsWith('.vercel.app') || env.HH_CRM_SENDER_VERIFIED !== 'true' ||
    !key.startsWith('re_') || !webhookSecret.startsWith('whsec_'))
    return { enabled: false, reason: 'sender_not_configured' }
  return { enabled: true, from, replyTo, name, postal, apiKey: key, webhookSecret, domain }
}

// Safe for the owner-only CRM response: names only, never credentials or contact data.
export function emailSetupStatus(env = process.env) {
  const from = String(env.HH_CRM_FROM_EMAIL || '').trim().toLowerCase()
  const replyTo = String(env.HH_CRM_REPLY_TO || '').trim().toLowerCase()
  const domain = String(env.HH_CRM_VERIFIED_DOMAIN || '').trim().toLowerCase()
  const name = String(env.HH_CRM_SENDER_NAME || '').trim()
  const postal = String(env.HH_CRM_POSTAL_ADDRESS || '').trim()
  const missingKeys = []
  if (env.HH_CRM_EMAIL_ENABLED !== 'true') missingKeys.push('HH_CRM_EMAIL_ENABLED')
  if (env.VERCEL_ENV === 'production' && env.HH_CRM_EMAIL_PRODUCTION_APPROVED !== 'true')
    missingKeys.push('HH_CRM_EMAIL_PRODUCTION_APPROVED')
  if (!String(env.HH_CRM_RESEND_API_KEY || '').startsWith('re_')) missingKeys.push('HH_CRM_RESEND_API_KEY')
  if (!String(env.HH_CRM_RESEND_WEBHOOK_SECRET || '').startsWith('whsec_')) missingKeys.push('HH_CRM_RESEND_WEBHOOK_SECRET')
  if (!ADDRESS.test(from)) missingKeys.push('HH_CRM_FROM_EMAIL')
  if (!domain || from.split('@')[1] !== domain || ['gmail.com', 'outlook.com', 'resend.dev', 'vercel.app'].includes(domain) || domain.endsWith('.vercel.app'))
    missingKeys.push('HH_CRM_VERIFIED_DOMAIN')
  if (env.HH_CRM_SENDER_VERIFIED !== 'true') missingKeys.push('HH_CRM_SENDER_VERIFIED')
  if (!clean(name, 90) || name.includes('<') || name.includes('>')) missingKeys.push('HH_CRM_SENDER_NAME')
  if (!ADDRESS.test(replyTo)) missingKeys.push('HH_CRM_REPLY_TO')
  if (!clean(postal, 250)) missingKeys.push('HH_CRM_POSTAL_ADDRESS')
  const config = getCrmEmailConfig(env)
  return { enabled: config.enabled, reason: config.reason || 'ready', missingKeys, webhookUrl: CRM_EMAIL_WEBHOOK_URL }
}

export function validateEmailMessage(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
    Object.keys(input).some(k => !['subject','body'].includes(k)))
    throw new Error('INVALID_EMAIL_MESSAGE')
  const subject = String(input.subject || '').trim()
  const body = String(input.body || '').trim()
  if (!clean(subject, 140) || !clean(body, CRM_EMAIL_TEXT_LIMIT) || body.length < 5 ||
    /[\r\n]/.test(subject) || /[\u0000]/.test(body) || !subject)
    throw new Error('INVALID_EMAIL_MESSAGE')
  return { subject, body }
}

export function createEmailToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, digest: emailTokenDigest(token) }
}

export function emailTokenDigest(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{42,64}$/.test(token)) throw new Error('INVALID_EMAIL_TOKEN')
  return createHash('sha256').update(token, 'utf8').digest('hex')
}
export function makeEmailLink(locale, kind, token) {
  if (!['en','ru','es'].includes(locale) || !['u','v'].includes(kind)) throw new Error('INVALID_EMAIL_LINK')
  emailTokenDigest(token)
  return SITE + '/' + locale + '/email-preferences#' + kind + '=' + token
}
export function formatVerificationMail(config, locale, token) {
  const url = makeEmailLink(locale, 'v', token)
  const words = locale === 'ru' ? {
    subject:'Подтвердите ваш email · Holistic House',
    line:'Если вы согласились получать новости Holistic House, подтвердите свой адрес по ссылке:',
    ignore:'Если вы не запрашивали подтверждение, просто проигнорируйте это письмо.',
  } : locale === 'es' ? {
    subject:'Confirma tu correo · Holistic House',
    line:'Si aceptaste recibir novedades de Holistic House, confirma tu dirección con este enlace:',
    ignore:'Si no solicitaste este correo, ignóralo.',
  } : {
    subject:'Confirm your email · Holistic House',
    line:'If you opted in to updates from Holistic House, confirm your email address here:',
    ignore:'If you did not request this, please ignore this email.',
  }
  return { subject: words.subject, text: [words.line, url, '', words.ignore, '', config.name, config.replyTo].join('\n') }
}
export function formatMarketingMail(config, locale, payload, token) {
  const message = validateEmailMessage(payload)
  const link = makeEmailLink(locale, 'u', token)
  const unsubscribe = locale === 'ru' ? 'Отписаться от рассылки' : locale === 'es' ? 'Cancelar suscripción' : 'Unsubscribe from updates'
  return { subject: message.subject, text: [message.body, '', '—', config.name, config.postal, config.replyTo, unsubscribe + ': ' + link].join('\n') }
}
export function safeEmailIdempotency(id, type) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i.test(id) || !['verification','message'].includes(type))
    throw new Error('INVALID_EMAIL_IDEMPOTENCY')
  return 'hh-crm-' + type + '-' + id
}
export async function sendResendEmail({ config, idempotencyKey, to, subject, text }, fetcher = fetch) {
  if (!config?.enabled || !ADDRESS.test(String(to||'')) || !clean(subject, 140) ||
    !clean(text, 6500) || !/^hh-crm-(verification|message)-[0-9a-f-]{36}$/i.test(idempotencyKey))
    throw new Error('EMAIL_NOT_CONFIGURED')
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 12000)
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + config.apiKey, 'Content-Type':'application/json', 'Idempotency-Key': idempotencyKey },
      signal: abort.signal,
      body: JSON.stringify({ from: config.name + ' <' + config.from + '>', to: [to], reply_to: config.replyTo, subject, text }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || typeof data.id !== 'string' || data.id.length > 120) throw new Error('EMAIL_DELIVERY_UNCONFIRMED')
    return { accepted: true, providerId: data.id }
  } catch {
    // No automatic retry: a timeout can mean the provider already accepted the email.
    throw new Error('EMAIL_DELIVERY_UNCONFIRMED')
  } finally { clearTimeout(timer) }
}

// Resend uses Standard Webhooks (Svix). Verify RAW bytes, timestamp and all versions.
export function verifyResendWebhook(body, headers, secret, now = Date.now()) {
  if (typeof body !== 'string' || body.length > 64000 || !String(secret||'').startsWith('whsec_'))
    throw new Error('INVALID_WEBHOOK')
  const id = headers.get('svix-id'), ts = headers.get('svix-timestamp'), provided = headers.get('svix-signature')
  if (!id || id.length > 128 || !/^[0-9]{10,13}$/.test(ts||'') || !provided ||
    Math.abs(now - Number(ts)*1000) > 300000) throw new Error('INVALID_WEBHOOK')
  const key = Buffer.from(secret.slice(6), 'base64')
  if (key.length < 16) throw new Error('INVALID_WEBHOOK')
  const expected = createHmac('sha256', key).update(id + '.' + ts + '.' + body).digest()
  const ok = provided.split(/\s+/).some(part => {
    if (!part.startsWith('v1,')) return false
    try {
      const actual = Buffer.from(part.slice(3), 'base64')
      return actual.length === expected.length && timingSafeEqual(expected, actual)
    } catch { return false }
  })
  if (!ok) throw new Error('INVALID_WEBHOOK')
  const event = JSON.parse(body)
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('INVALID_WEBHOOK')
  return { id, event }
}
