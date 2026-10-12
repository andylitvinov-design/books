import { verifiedResult, interpretationUnavailable } from './result-integrity.js'
import { STORED_INTERPRETATION_VERSION, matchingIdentity } from './stored-interpretation.js'

// No source-bundle fallback: every report surface consumes the server's selected
// database record. The authoring compiler is deliberately not imported here.
export function buildAssessmentResultReport(result, locale = 'en') {
  const language = locale === 'ru' ? 'ru' : 'en'
  if (!verifiedResult(result)) return interpretationUnavailable(language)
  const report = result?.interpretations?.[language]
  if (!report || report.status !== 'available' || report.origin !== 'database' ||
      report.interpretationVersion !== STORED_INTERPRETATION_VERSION ||
      report.uiLocale !== language || !matchingIdentity(result, report.identity) ||
      !/^sha256:[a-f0-9]{64}$/.test(report.payloadHash || '') ||
      !Array.isArray(report.sections) || report.sections.length !== result.dimensions.length)
    return interpretationUnavailable(language)
  const actual = new Map(result.dimensions.map(dimension => [dimension.key, dimension]))
  if (new Set(report.sections.map(section => section.key)).size !== actual.size ||
      report.sections.some(section => !actual.has(section.key) || section.value !== actual.get(section.key).value))
    return interpretationUnavailable(language)
  return report
}
