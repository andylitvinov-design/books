import { HH_CORE_CHECKIN_DEFINITIONS } from '../../data/assessments/hh-core-checkins-v3.js'
import { exactInterpretationDefinition } from './interpretation-context.js'
import { analyzeCheckin, compareCheckinObservations } from './checkin-analysis.js'
import { provenance } from './definitions.js'

const ids = new Set(HH_CORE_CHECKIN_DEFINITIONS.map(definition => definition.id))
const forms = new Set(HH_CORE_CHECKIN_DEFINITIONS.map(definition => `${definition.key}:${definition.version}`))
// Recognise a claimed new form even if an identity field is forged; never fall
// back to a legacy interpretation for a malformed candidate result.
export function isCoreCheckinResult(result) {
  return ids.has(result?.definitionId) || forms.has(`${result?.definitionKey}:${result?.definitionVersion}`)
}
export function exactCoreCheckinDefinition(result) {
  if (!isCoreCheckinResult(result)) return null
  const definition = exactInterpretationDefinition(result)
  return definition && ids.has(definition.id) ? definition : null
}
export function savedCheckinProfile(result) {
  const definition = exactCoreCheckinDefinition(result)
  if (!definition) return null
  const answers = Object.fromEntries(result.dimensions.map(dimension => [dimension.key, dimension.value]))
  return analyzeCheckin(definition, answers)
}
export function checkinResultComparison(current, previous) {
  const currentDefinition = exactCoreCheckinDefinition(current)
  const previousDefinition = exactCoreCheckinDefinition(previous)
  if (!currentDefinition || !previousDefinition) return { comparable: false, reason: 'unverified-result', facets: [] }
  const observation = (result, definition) => ({
    provenance: provenance(definition), accountId: result.accountId,
    measurementAt: result.measurementAt,
    answers: Object.fromEntries(result.dimensions.map(dimension => [dimension.key, dimension.value])),
  })
  try { return compareCheckinObservations(observation(previous, previousDefinition), observation(current, currentDefinition)) }
  catch { return { comparable: false, reason: 'invalid-observation', facets: [] } }
}
export function checkinComparisonRows(current, previous) {
  return checkinResultComparison(current, previous).facets.filter(facet => facet.comparable).map(facet => ({
    key: facet.key, current: facet.current, prior: facet.previous, delta: facet.delta,
    unit: 'points', currentAt: current.measurementAt, priorAt: previous.measurementAt,
  }))
}
export function checkinTrendResults(series, current, dimensionKey) {
  if (!isCoreCheckinResult(current)) return series
  if (!exactCoreCheckinDefinition(current)) return []
  return series.filter(result => result === current || checkinComparisonRows(current, result).some(row => row.key === dimensionKey))
}
export function checkinComparisonNote(result, dimensionKey, locale = 'en') {
  if (!isCoreCheckinResult(result)) return null
  const subject = ['state.problem_intensity', 'state.current_interference'].includes(dimensionKey)
  return locale === 'ru'
    ? subject ? 'Для сравнения нужно знать, что речь об одной и той же трудности. Автоматическая динамика не показана.' : 'Это разница отдельных ответов, не доказательство улучшения или эффекта практики. Периоды воспоминания могут пересекаться.'
    : subject ? 'Comparison requires the same difficulty to be established. Automatic change is not shown.' : 'These are differences between individual responses, not proof of improvement or an effect of a practice. Recall periods may overlap.'
}
export function buildCheckinResultReport(result, locale = 'en') {
  const ru = locale === 'ru'
  const profile = savedCheckinProfile(result)
  const unavailable = ru ? 'Версия или ответы не подтверждены. Числовой профиль недоступен.' : 'The version or responses could not be verified. The numeric profile is unavailable.'
  if (!profile) return { reportKind: 'checkin-facets', verified: false, sections: [], title: ru ? 'Чек-ин: требуется проверка' : 'Check-in: verification needed', intro: unavailable }
  const definition = exactCoreCheckinDefinition(result)
  const recall = { 'right-now': ru ? 'в момент ответа' : 'at the time of answering', 'past-7-days': ru ? 'последние 7 дней в целом' : 'the past 7 days as a whole', 'past-30-days': ru ? 'последние 30 дней' : 'the past 30 days' }[definition.timeframe]
  const note = ru ? 'Это отдельные авторские самооценки, а не диагноз или общий показатель психического здоровья. Формы и переводы не прошли эмпирическую валидацию.' : 'These are separate authored self-reports, not a diagnosis or an overall mental health score. Forms and translations have not been empirically validated.'
  return {
    reportKind: 'checkin-facets', verified: true, rulesVersion: 'checkin-facets-v1', definitionVersion: definition.version,
    title: definition.title, instrumentLocale: definition.instrumentLocale,
    intro: ru ? `Ваши ответы: ${recall}. Каждый аспект показан отдельно.` : `Your responses: ${recall}. Each aspect is shown separately.`,
    purpose: note, methodology: note, note, completeness: profile.completeness,
    sections: profile.facets.map(facet => {
      const label = facet.responseAnchors?.[facet.value] || null
      const meaning = ru ? `Ваш ответ: ${facet.value} из ${facet.max}${label ? ` — ${label}` : ''}. Это ответ на отдельный вопрос, без категории тяжести.` : `Your response: ${facet.value} of ${facet.max}${label ? ` — ${label}` : ''}. This is an answer to one question, without a severity category.`
      return { ...facet, title: facet.label, construct: facet.label, meaning, summary: meaning, band: null, bandBasis: 'authored-response', steps: [], primarySupport: null, recommendedReview: false, source: null, followUp: null, limitations: [note], responseLabel: label }
    }),
    seekSupport: null,
  }
}

export function checkinFacetLabel(result, dimensionKey) {
  const definition = exactCoreCheckinDefinition(result)
  return definition?.questions.find(question => question.id === dimensionKey)?.label || null
}
