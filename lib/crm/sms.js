import { createHmac, timingSafeEqual } from 'node:crypto'
import { validateMessageText } from './messenger-policy.js'

export const SMS_WEBHOOK_URL = 'https://holistichouse.vercel.app/api/app/crm/sms/webhook'
const PHONE = /^\+[1-9]\d{7,14}$/
const TWILIO_ACCOUNT = /^AC[0-9a-f]{32}$/i
const TWILIO_SERVICE = /^MG[0-9a-f]{32}$/i
const TWILIO_MESSAGE = /^SM[0-9a-f]{32}$/i
const MAX_SMS_SEGMENTS = 4
const GSM_BASIC = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
const GSM_EXTENDED = '^{}\\[~]|€'

export function smsSegments(value) {
  let units = 0
  let gsm = true
  for (const char of value) {
    if (GSM_BASIC.includes(char)) units++
    else if (GSM_EXTENDED.includes(char)) units += 2
    else { gsm = false; break }
  }
  if (!gsm) {
    units = 0
    for (const char of value) units += char.codePointAt(0) > 0xffff ? 2 : 1
  }
  const single = gsm ? 160 : 70
  const multipart = gsm ? 153 : 67
  return { encoding: gsm ? 'GSM-7' : 'UCS-2', segments: units <= single ? 1 : Math.ceil(units / multipart) }
}

export function getSmsConfig(env = process.env) {
  if (env.HH_CRM_SMS_ENABLED !== 'true') return { enabled: false, reason: 'sms_disabled' }
  if (env.VERCEL_ENV === 'production' && env.HH_CRM_SMS_PRODUCTION_APPROVED !== 'true')
    return { enabled: false, reason: 'sms_production_not_approved' }
  if (!TWILIO_ACCOUNT.test(env.HH_CRM_TWILIO_ACCOUNT_SID || '') ||
      !TWILIO_SERVICE.test(env.HH_CRM_TWILIO_MESSAGING_SERVICE_SID || '') ||
      !/^[0-9a-f]{32}$/i.test(env.HH_CRM_TWILIO_AUTH_TOKEN || '') ||
      env.HH_CRM_SMS_SENDER_VERIFIED !== 'true' ||
      env.HH_CRM_SMS_CONTACT_DETAILS_VERIFIED !== 'true')
    return { enabled: false, reason: 'sms_provider_not_configured' }
  const testPhone = env.HH_CRM_SMS_TEST_PHONE || ''
  const live = env.HH_CRM_SMS_LIVE_APPROVED === 'true'
  if (!live && (!PHONE.test(testPhone) || env.HH_CRM_SMS_PILOT_APPROVED !== 'true'))
    return { enabled: false, reason: 'sms_test_gate_not_approved' }
  return { enabled: true, live, testPhone: live ? null : testPhone,
    accountSid: env.HH_CRM_TWILIO_ACCOUNT_SID, authToken: env.HH_CRM_TWILIO_AUTH_TOKEN,
    messagingServiceSid: env.HH_CRM_TWILIO_MESSAGING_SERVICE_SID }
}

export function smsSetupStatus(env = process.env) {
  const keys = ['HH_CRM_TWILIO_ACCOUNT_SID','HH_CRM_TWILIO_AUTH_TOKEN','HH_CRM_TWILIO_MESSAGING_SERVICE_SID',
    'HH_CRM_SMS_SENDER_VERIFIED','HH_CRM_SMS_CONTACT_DETAILS_VERIFIED','HH_CRM_SMS_ENABLED','HH_CRM_SMS_PRODUCTION_APPROVED']
  const missingKeys = keys.filter(key => !env[key] || env[key] !== 'true' && key.endsWith('_VERIFIED') ||
    env[key] !== 'true' && (key === 'HH_CRM_SMS_ENABLED' || key === 'HH_CRM_SMS_PRODUCTION_APPROVED'))
  const config = getSmsConfig(env)
  return { enabled: config.enabled, reason: config.reason || 'ready', live: config.live || false,
    missingKeys, webhookUrl: SMS_WEBHOOK_URL }
}

export function validateSmsBody(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => key !== 'body')) throw new Error('INVALID_SMS_MESSAGE')
  let message
  try { message = validateMessageText(input.body) }
  catch (error) { throw new Error(error.message === 'PRIVATE_CONTENT_BLOCKED' ? 'PRIVATE_CONTENT_BLOCKED' : 'INVALID_SMS_MESSAGE') }
  if (message.length > 240 || message.length < 3) throw new Error('INVALID_SMS_MESSAGE')
  const formatted = 'Holistic House: ' + message + '\nInfo: holistichouse.vercel.app · Reply STOP to unsubscribe.'
  const cost = smsSegments(formatted)
  if (cost.segments > MAX_SMS_SEGMENTS) throw new Error('SMS_TOO_LONG')
  return { body: message, formatted, segments: cost.segments, encoding: cost.encoding }
}

export function smsRecipientFingerprint(phone, encryptionKey) {
  if (!PHONE.test(phone) || !encryptionKey) throw new Error('INVALID_SMS_PHONE')
  return createHmac('sha256', encryptionKey).update('hh-crm-sms-to-v1:' + phone).digest('hex')
}

export async function sendTwilioSms({config, to, text}, fetcher = fetch) {
  if (!config?.enabled || !PHONE.test(to) || !text || smsSegments(text).segments > MAX_SMS_SEGMENTS ||
      (!config.live && to !== config.testPhone)) throw new Error('SMS_NOT_CONFIGURED')
  const url = 'https://api.twilio.com/2010-04-01/Accounts/' + config.accountSid + '/Messages.json'
  const form = new URLSearchParams({To:to,MessagingServiceSid:config.messagingServiceSid,
    Body:text,StatusCallback:SMS_WEBHOOK_URL})
  const timer = new AbortController()
  const timeout = setTimeout(() => timer.abort(), 12000)
  try {
    const response = await fetcher(url, {method:'POST',signal:timer.signal,
      headers:{'Content-Type':'application/x-www-form-urlencoded',
        Authorization:'Basic '+Buffer.from(config.accountSid+':'+config.authToken).toString('base64')},
      body:form.toString()})
    const result = await response.json().catch(() => ({}))
    if (!response.ok || !TWILIO_MESSAGE.test(result.sid || '') || result.account_sid !== config.accountSid)
      throw new Error('SMS_DELIVERY_UNCONFIRMED')
    return { accepted: true, providerId: result.sid, status: result.status }
  } catch { throw new Error('SMS_DELIVERY_UNCONFIRMED') }
  finally { clearTimeout(timeout) }
}

// Twilio signs URL plus ALL alphabetically sorted form params. No query strings are accepted.
export function verifyTwilioWebhook(raw, headers, authToken, url = SMS_WEBHOOK_URL) {
  if (typeof raw !== 'string' || raw.length > 16000 || !/^[0-9a-f]{32}$/i.test(authToken || '') ||
      url !== SMS_WEBHOOK_URL) throw new Error('INVALID_SMS_WEBHOOK')
  const params = new URLSearchParams(raw)
  if (!params.size || [...params.keys()].some(key => params.getAll(key).length !== 1))
    throw new Error('INVALID_SMS_WEBHOOK')
  const sid = params.get('MessageSid') || params.get('SmsSid') || ''
  if (!TWILIO_MESSAGE.test(sid)) throw new Error('INVALID_SMS_WEBHOOK')
  const signature = headers.get('x-twilio-signature') || ''
  let base = url
  for (const [key, value] of [...params.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0)) base += key + value
  const expected = createHmac('sha1', authToken).update(base, 'utf8').digest()
  const actual = Buffer.from(signature,'base64')
  if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) throw new Error('INVALID_SMS_WEBHOOK')
  return params
}
