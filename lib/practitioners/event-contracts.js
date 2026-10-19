import { AppError, assertObject, onlyKeys, text } from '../assessments/contracts.js'

export const EVENT_CATEGORIES = ['somatic', 'connection', 'reiki', 'temple']
export const EVENT_FORMATS = ['in_person', 'online']
export const EVENT_PRICING = ['free', 'fixed', 'contact']
export const EVENT_CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP']
const EVENT_KEYS = [
  'title', 'description', 'category', 'format', 'startsAt', 'endsAt', 'timeZone',
  'city', 'location', 'posterUrl', 'registrationHref', 'pricingMode', 'priceAmount', 'currency',
]

function localized(value, max) {
  assertObject(value || {})
  onlyKeys(value || {}, ['en', 'ru', 'es'])
  return Object.fromEntries(['en', 'ru', 'es'].map(lang => [lang, text(value?.[lang] || '', max)]))
}

function schedule(value, required = false) {
  const normalized = text(value || '', 48)
  if (!normalized) {
    if (required) throw new AppError('EVENT_DATE_REQUIRED', 400)
    return ''
  }
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(normalized)
    || !Number.isFinite(Date.parse(normalized))) throw new AppError('INVALID_EVENT_DATE', 400)
  return normalized
}

function zone(value) {
  const normalized = text(value || 'America/Toronto', 64)
  if (!/^[a-zA-Z_0-9/+:-]{1,64}$/.test(normalized)) throw new AppError('INVALID_EVENT_TIMEZONE', 400)
  try { new Intl.DateTimeFormat('en', { timeZone: normalized }) }
  catch { throw new AppError('INVALID_EVENT_TIMEZONE', 400) }
  return normalized
}

function publicLink(value, required) {
  const normalized = text(value || '', 1000)
  if (!normalized) {
    if (required) throw new AppError('EVENT_REGISTRATION_REQUIRED', 400)
    return ''
  }
  if (normalized.startsWith('/') && !normalized.startsWith('//')
    && /^\/[a-zA-Z0-9/_?&=#.%-]*$/.test(normalized)) return normalized
  try {
    const url = new URL(normalized)
    if (url.protocol === 'https:' && !url.username && !url.password && !/\s/.test(normalized)) return url.toString()
  } catch {}
  throw new AppError('INVALID_EVENT_REGISTRATION', 400)
}

export function validatePractitionerEvent(value, { complete = false } = {}) {
  assertObject(value)
  onlyKeys(value, EVENT_KEYS)
  const title = localized(value.title, 160)
  const description = localized(value.description, 2500)
  const category = text(value.category || 'connection', 30)
  const format = text(value.format || 'in_person', 30)
  const pricingMode = text(value.pricingMode || 'free', 20)
  const currency = text(value.currency || 'CAD', 3)
  if (!EVENT_CATEGORIES.includes(category) || !EVENT_FORMATS.includes(format)
    || !EVENT_PRICING.includes(pricingMode) || !EVENT_CURRENCIES.includes(currency))
    throw new AppError('INVALID_EVENT', 400)

  const startsAt = schedule(value.startsAt, complete)
  const endsAt = schedule(value.endsAt)
  if (endsAt && (!startsAt || Date.parse(endsAt) <= Date.parse(startsAt)))
    throw new AppError('INVALID_EVENT_END', 400)

  const priceAmount = value.priceAmount === '' || value.priceAmount == null
    ? null : Number(value.priceAmount)
  if (priceAmount !== null && (!Number.isFinite(priceAmount)
    || priceAmount < 0 || priceAmount > 100000
    || Math.round(priceAmount * 100) !== priceAmount * 100))
    throw new AppError('INVALID_EVENT_PRICE', 400)
  if (complete && pricingMode === 'fixed' && (priceAmount === null || priceAmount <= 0))
    throw new AppError('INVALID_EVENT_PRICE', 400)

  const draft = {
    title, description, category, format, startsAt, endsAt,
    timeZone: zone(value.timeZone),
    city: text(value.city || '', 150),
    location: text(value.location || '', 250),
    posterUrl: text(value.posterUrl || '', 500),
    registrationHref: publicLink(value.registrationHref, complete),
    pricingMode, priceAmount: pricingMode === 'fixed' ? priceAmount : null, currency,
  }
  if (complete && !['en', 'ru', 'es'].some(lang => title[lang] && description[lang]))
    throw new AppError('EVENT_CONTENT_REQUIRED', 400)
  if (complete && format === 'in_person' && !draft.location)
    throw new AppError('EVENT_LOCATION_REQUIRED', 400)
  return draft
}

export function eventPublicProjection(id, practitionerSlug, practitionerName, value) {
  const draft = validatePractitionerEvent(value, { complete: true })
  const local = field => {
    const first = ['en', 'ru', 'es'].map(lang => field[lang]).find(Boolean) || ''
    return { en: field.en || first, ru: field.ru || first, es: field.es || first }
  }
  return {
    id: 'master-' + id, category: draft.category, format: draft.format,
    startsAt: draft.startsAt, endsAt: draft.endsAt || undefined,
    timeZone: draft.timeZone, city: draft.city || undefined,
    location: draft.format === 'in_person' ? draft.location : undefined,
    posterUrl: draft.posterUrl || undefined,
    registrationHref: draft.registrationHref,
    title: local(draft.title), description: local(draft.description),
    status: 'published',
    organizerName: practitionerName,
    organizerHref: '/en/masters/' + practitionerSlug,
    priceLabel: draft.pricingMode === 'free' ? 'Free' : draft.pricingMode === 'fixed'
      ? draft.priceAmount + ' ' + draft.currency : 'Contact organizer',
  }
}
