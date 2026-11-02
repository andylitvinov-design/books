import { storedResultInterpretation } from './interpretation-resolution.js'

// Whole-report guidance remains in its original builder. Only use a stored scale
// template when its meaning is already the report's exact semantic prefix.
// In particular, Bach evidence/context prose must never be replaced by generic
// scalar prose. Such sections retain an honest code source.
export function withReportInterpretationSource(report, result, locale = 'en') {
  const language = locale === 'ru' ? 'ru' : 'en'
  const sections = (report.sections || []).map(section => {
    const dimension = Array.isArray(result?.dimensions) ? result.dimensions.find(item => item?.key === section.key) : null
    const stored = dimension ? storedResultInterpretation(result, dimension, language) : null
    const usesStoredMeaning = !!stored && typeof section.meaning === 'string' &&
      (section.meaning === stored.meaning || section.meaning.startsWith(stored.meaning + ' '))
    const registrySource = usesStoredMeaning ? 'database' : 'code'
    const interpretationVersion = usesStoredMeaning ? stored.interpretationVersion : report.rulesVersion
    const sourceNote = language === 'ru'
      ? `Источник пояснения шкалы: ${usesStoredMeaning ? 'версионный реестр базы данных' : 'проверенные правила приложения'}${interpretationVersion ? ` (${interpretationVersion})` : ''}.`
      : `Scale explanation source: ${usesStoredMeaning ? 'versioned database registry' : 'verified application rules'}${interpretationVersion ? ` (${interpretationVersion})` : ''}.`
    return {
      ...section,
      // Consume the matching stored prefix without changing context-specific
      // suffixes, advice, type hypotheses or clinical safeguards.
      ...(usesStoredMeaning ? { meaning: stored.meaning + section.meaning.slice(stored.meaning.length) } : {}),
      registrySource,
      interpretationVersion: interpretationVersion || null,
      interpretationSourceCommit: usesStoredMeaning ? stored.interpretationSourceCommit : null,
      limitations: [...(section.limitations || []), sourceNote],
    }
  })
  const sources = new Set(sections.map(section => section.registrySource))
  return { ...report, sections, scaleInterpretationSource: sources.size === 1 ? [...sources][0] : sources.size ? 'mixed' : 'code' }
}
