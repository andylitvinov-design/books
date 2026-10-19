// Reuse the same rights, runnable-definition and integrity gates as the public
// Test Explorer. A practitioner's recommendation never bypasses test access.
import { buildExplorerEntries } from '../assessments/test-explorer.js'

export const MAX_REPORT_RECOMMENDED_TESTS = 8
const LANGUAGES = ['en', 'ru']
let allowedByLocale = null

function eligible() {
  if (!allowedByLocale) {
    allowedByLocale = Object.fromEntries(LANGUAGES.map(locale => [
      locale,
      new Map(buildExplorerEntries({ locale, audience: 'guest' })
        .filter(entry => entry.selectable && entry.guestEligible === true &&
          entry.startable === true && entry.rightsStatus === 'cleared')
        .map(entry => [entry.key, entry])),
    ]))
  }
  return allowedByLocale
}

function selectedEntry(key, locale) {
  const lists = eligible()
  const language = locale === 'ru' ? 'ru' : 'en'
  const own = lists[language].get(key)
  if (own) return { entry: own, startLocale: language }
  const fallback = language === 'en' ? 'ru' : 'en'
  const alternate = lists[fallback].get(key)
  return alternate ? { entry: alternate, startLocale: fallback } : null
}

export function getRecommendedTestOptions(locale = 'en') {
  const language = locale === 'ru' ? 'ru' : 'en'
  const lists = eligible()
  const keys = new Set([...lists.en.keys(), ...lists.ru.keys()])
  return [...keys].map(key => {
    const match = selectedEntry(key, language)
    if (!match) return null
    const { entry, startLocale } = match
    return {
      key,
      title: entry.catalog?.title?.[language] || entry.title,
      startLocale,
      href: `/${startLocale}/client?startTests=${encodeURIComponent(key)}`,
      // Only compact public catalogue metadata; client report text is never
      // sent to the server for matching or to an external model.
      measurementAxes: (entry.measurementAxes || []).filter(value => typeof value === 'string'),
      analysisAxes: (entry.analysisAxes || []).map(value => value.key).filter(Boolean),
      topics: (entry.topics || []).filter(value => typeof value === 'string'),
      durationMinutes: Number.isFinite(entry.durationMinutes) ? entry.durationMinutes : null,
    }
  }).filter(Boolean).sort((a, b) =>
    a.title.localeCompare(b.title, language === 'ru' ? 'ru' : 'en'))
}

// Only runnable, rights-cleared, guest-accessible tests may be attached to an
// invitation. IDs are revalidated on the server, regardless of client UI.
export function normalizeRecommendedTestKeys(input) {
  if (input == null) return []
  if (!Array.isArray(input) || input.length > MAX_REPORT_RECOMMENDED_TESTS)
    throw new Error('Invalid recommended tests')
  const keys = new Set()
  for (const key of input) {
    if (typeof key !== 'string' || !/^[a-z0-9][a-z0-9-]{0,100}$/.test(key) ||
      !selectedEntry(key, 'en'))
      throw new Error('Unknown or unavailable recommended test')
    keys.add(key)
  }
  return [...keys]
}

// Legacy report records without this optional field remain readable. A saved
// link always resolves from the latest verified catalog, never from client text.
export function resolveRecommendedTests(input, locale = 'en') {
  const keys = Array.isArray(input) ? input : input?.recommendedTestKeys
  if (!Array.isArray(keys)) return []
  const options = new Map(getRecommendedTestOptions(locale).map(item => [item.key, item]))
  return [...new Set(keys)].slice(0, MAX_REPORT_RECOMMENDED_TESTS)
    .map(key => options.get(key)).filter(Boolean)
}

export function recommendedTestAbsoluteUrl(item, origin) {
  const base = typeof origin === 'string' && /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?\/?$/i.test(origin)
    ? origin : 'https://holistichouse.vercel.app'
  return new URL(item.href, base).toString()
}
