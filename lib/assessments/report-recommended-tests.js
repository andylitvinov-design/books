import { buildExplorerEntries } from './test-explorer.js'

// The consultation report links directly into the existing guest test journey.
// Never invent a test URL, include research-only instruments or store display
// names that can drift when the catalog is updated.
const MAX_RECOMMENDED_TESTS = 12
let cachedOptions = null

export function getReportTestOptions() {
  if (cachedOptions) return cachedOptions
  const byKey = new Map()
  for (const locale of ['en', 'ru']) {
    for (const entry of buildExplorerEntries({ locale, audience: 'guest' })) {
      if (!entry.selectable || !entry.guestEligible || !entry.startable ||
          entry.rightsStatus !== 'cleared' || !entry.definition) continue
      const title = entry.catalog?.title || {}
      const previous = byKey.get(entry.key)
      if (previous) {
        previous.availableLocales.push(locale)
        continue
      }
      byKey.set(entry.key, {
        key: entry.key,
        title: {
          en: title.en || entry.title,
          ru: title.ru || title.en || entry.title,
        },
        questionCount: entry.questionCount,
        durationMinutes: entry.durationMinutes,
        availableLocales: [locale],
      })
    }
  }
  cachedOptions = Object.freeze([...byKey.values()]
    .map(option => Object.freeze({
      ...option,
      title: Object.freeze(option.title),
      availableLocales: Object.freeze(option.availableLocales),
    }))
    .sort((a, b) => a.title.en.localeCompare(b.title.en, 'en')))
  return cachedOptions
}

export function normalizeReportTestKeys(value) {
  if (value == null) return []
  if (!Array.isArray(value) || value.length > MAX_RECOMMENDED_TESTS ||
      new Set(value).size !== value.length) {
    throw new Error('Invalid recommended tests')
  }
  const available = new Set(getReportTestOptions().map(option => option.key))
  if (value.some(key => typeof key !== 'string' || !available.has(key))) {
    throw new Error('Invalid recommended tests')
  }
  return [...value]
}

export function recommendedTestsForReport(keys, locale = 'en') {
  if (!Array.isArray(keys) || keys.length === 0) return []
  const options = new Map(getReportTestOptions().map(option => [option.key, option]))
  const language = locale === 'ru' ? 'ru' : 'en'
  const seen = new Set()
  return keys.flatMap(key => {
    if (typeof key !== 'string' || seen.has(key) || !options.has(key)) return []
    seen.add(key)
    const option = options.get(key)
    const testLocale = option.availableLocales.includes(language) ? language
      : option.availableLocales.includes('en') ? 'en' : 'ru'
    return [{
      key,
      title: option.title[language] || option.title.en,
      testLocale,
      href: '/' + testLocale + '/client?startTests=' + encodeURIComponent(key),
    }]
  })
}
