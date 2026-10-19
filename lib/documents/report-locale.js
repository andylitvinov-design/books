/**
 * A saved single-language client document owns its presentation language.
 * /en or /ru in the surrounding site URL is only a UI fallback for legacy
 * bilingual documents; it must not silently translate an authored report.
 */
export function resolveSavedReportLocale(record, viewerLocale = 'en') {
  if (record?.languagePreference === 'ru' || record?.languagePreference === 'en') {
    return record.languagePreference
  }
  return viewerLocale === 'ru' ? 'ru' : 'en'
}
