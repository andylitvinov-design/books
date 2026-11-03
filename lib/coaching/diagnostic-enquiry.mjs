import { COACHING_FIELDS, COACHING_TOPICS } from './intake-model.js'

// Anonymous public requests use the existing AES-GCM sealed practitioner enquiry + CRM contact.
// This formatter never sends questionnaire answers to a messenger, analytics event or URL.
export const DIAGNOSTIC_START_KEY = 'hh-free-diagnostic-start-v1'
export const DIAGNOSTIC_SERVICE_TITLES = Object.freeze({
  free: 'Free Express Coaching Diagnostic · written review',
  short: 'Personal Coaching Session · 30 min · €50',
  full: 'Personal Coaching Session · 60 min · €100',
})
const LOCALES = ['en', 'ru', 'es']
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const invalidControl = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
function short(value, max) {
  if (typeof value !== 'string' || value.length > max || invalidControl.test(value)) throw new Error('INVALID_COACHING_FIELD')
  return value.trim()
}
function keys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).some(key => !allowed.includes(key))) throw new Error('INVALID_COACHING_STRUCTURE')
}

export function parseDiagnosticStart(raw, locale, now = Date.now()) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw
    keys(value, ['createdAt', 'locale', 'name', 'email', 'phone', 'topic', 'question'])
    if (value.locale !== locale || !LOCALES.includes(locale) || !Number.isFinite(value.createdAt) ||
      value.createdAt > now || now - value.createdAt > 30 * 60 * 1000) return null
    const name = short(value.name, 120)
    const email = short(value.email, 254)
    const phone = short(value.phone, 28)
    const question = short(value.question, 400)
    if ((!email && !phone) || !COACHING_TOPICS.some(topic => topic.id === value.topic)) return null
    return { name, email, phone, question, topic: value.topic }
  } catch { return null }
}

export function buildCoachingDiagnosticEnquiry(raw) {
  keys(raw, ['operationId', 'locale', 'offer', 'topic', 'name', 'city',
    'answers', 'questions', 'contact', 'contactConsent', 'website'])
  if (!UUID.test(raw.operationId || '') || !LOCALES.includes(raw.locale) ||
    !Object.hasOwn(DIAGNOSTIC_SERVICE_TITLES, raw.offer) ||
    !COACHING_TOPICS.some(topic => topic.id === raw.topic) ||
    raw.contactConsent !== true || (raw.website !== undefined && raw.website !== '')) {
    throw new Error('INVALID_COACHING_REQUEST')
  }
  const name = short(raw.name, 120)
  const city = short(raw.city, 150)
  keys(raw.answers, COACHING_FIELDS.map(field => field.id))
  const answers = []
  for (const field of COACHING_FIELDS) {
    const answer = short(raw.answers[field.id] ?? '', field.max)
    if (field.required && !answer) throw new Error('MISSING_COACHING_ANSWER')
    if (answer) answers.push(field.label[raw.locale] + '\n' + answer)
  }
  if (!Array.isArray(raw.questions) || raw.questions.length > 8 ||
    raw.questions.some(question => typeof question !== 'string')) throw new Error('INVALID_COACHING_QUESTIONS')
  const questions = raw.questions.map(question => short(question, 600)).filter(Boolean)
  keys(raw.contact, ['displayName', 'email', 'phone'])
  const email = short(raw.contact.email ?? '', 254)
  const phone = short(raw.contact.phone ?? '', 28)
  if (!email && !phone) throw new Error('CONTACT_REQUIRED')
  // The public enquiry validator performs the authoritative email/phone parsing.
  const option = DIAGNOSTIC_SERVICE_TITLES[raw.offer]
  const topic = COACHING_TOPICS.find(item => item.id === raw.topic).label[raw.locale]
  const description = [
    'Holistic House — authored coaching questionnaire (unscored, not a medical diagnosis)',
    'Requested service: ' + option,
    'Topic: ' + topic,
    ...(name ? ['Name: ' + name] : []),
    ...(city ? ['City: ' + city] : []),
    'Completed answers:', ...answers,
    ...(questions.length ? ['Additional questions:', ...questions.map((question, index) =>
      String(index + 1) + '. ' + question)] : []),
  ].join('\n\n')
  if (description.length > 40000) throw new Error('COACHING_ANSWERS_TOO_LONG')
  return {
    operationId: raw.operationId, locale: raw.locale,
    serviceTitle: option, description,
    sourcePath: '/' + raw.locale + '/coaching/intake',
    contact: { displayName: name || short(raw.contact.displayName ?? '', 120),
      email, phone },
    contactConsent: true, website: '',
  }
}
