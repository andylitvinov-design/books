export const DAYBOOK_INSPIRATIONS_CONSENT = 'hh-daybook-inspirations-v1'
export const DAYBOOK_REPEAT_DAYS = 30
export const DAYBOOK_SUPPORTED_CHANNEL = 'telegram'
const LOCALES = new Set(['ru','en','es'])
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

export function validateDaybookPreferences(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_PREFERENCES')
  const locale = input.locale
  const dailyAt = input.dailyAt
  const timeZone = input.timeZone
  if (!LOCALES.has(locale) || typeof dailyAt !== 'string' || !TIME.test(dailyAt) ||
    typeof timeZone !== 'string' || timeZone.length < 2 || timeZone.length > 64 ||
    /[\u0000-\u001f]/.test(timeZone)) throw new Error('INVALID_PREFERENCES')
  try { new Intl.DateTimeFormat('en', { timeZone }).format(new Date()) }
  catch { throw new Error('INVALID_PREFERENCES') }
  return { locale, dailyAt, timeZone }
}
export function daybookSendEnabled(env = process.env, telegramReady = false) {
  return env.VERCEL_ENV === 'production' &&
    env.HH_DAYBOOK_INSPIRATIONS_ENABLED === 'true' &&
    env.HH_DAYBOOK_INSPIRATIONS_SEND_APPROVED === 'true' &&
    telegramReady === true
}
export function formatDaybookMessage(phrase, locale = 'en') {
  if (typeof phrase !== 'string' || phrase.length < 10 || phrase.length > 600) throw new Error('INVALID_PHRASE')
  const language = LOCALES.has(locale) ? locale : 'en'
  const title = language === 'ru' ? '🌿 Daybook · Послание дня' :
    language === 'es' ? '🌿 Daybook · Inspiración del día' : '🌿 Daybook · Daily Inspiration'
  const footer = language === 'ru' ? 'Открыть мой Daybook' :
    language === 'es' ? 'Abrir mi Daybook' : 'Open my Daybook'
  return title + '\n\n' + phrase + '\n\n' + footer + ': https://holistichouse.vercel.app/' +
    language + '/my-page\n\n/stop'
}
// Pure model for the SQL contract: calendar days, not elapsed 24-hour windows.
// A claimed or ambiguous provider attempt also excludes a phrase until day 31.
export function eligibleDaybookIds(catalog, history, localDay) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDay)) throw new Error('INVALID_DAY')
  const today = Date.parse(localDay + 'T00:00:00Z')
  if (!Number.isFinite(today)) throw new Error('INVALID_DAY')
  const reserved = new Set(history.filter(item => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.localDay || '')) return false
    const gap = Math.round((today - Date.parse(item.localDay + 'T00:00:00Z')) / 86400000)
    return gap >= 0 && gap <= DAYBOOK_REPEAT_DAYS
  }).map(item => item.phraseId))
  return catalog.filter(item => item?.published === true && !reserved.has(item.id))
    .map(item => item.id)
}
