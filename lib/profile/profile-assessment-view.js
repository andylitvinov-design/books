import { getDefinitionById } from '../assessments/definitions.js'
import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { TEST_EXPLORER_AXIS_LABELS } from '../assessments/test-explorer.js'

// Pure, owner-scoped view model. The caller passes only the authenticated
// /api/app/bootstrap result, never an unauthenticated public selection.
const asArray = (value) => Array.isArray(value) ? value : []
const dateNumber = (value) => {
  const millis = Date.parse(value || '')
  return Number.isFinite(millis) ? millis : 0
}
const labelForAxis = (key, locale) =>
  TEST_EXPLORER_AXIS_LABELS[key]?.[locale] ||
  TEST_EXPLORER_AXIS_LABELS[key]?.en || key.replaceAll('_', ' ')
const niceConstruct = (text) => String(text || '').replace(/^trait\./, '').replaceAll('_', ' ').replaceAll('.', ' · ')
const safeDefinition = (id) => {
  try { return getDefinitionById(id) } catch { return null }
}
function expectedScales(definition, locale) {
  const item = monitoringCatalogItem(definition.key)
  // These are coverage labels, NOT generated measurements or "0%" scores.
  const axes = asArray(item?.analysisAxes)
    .map((axis) => axis.key)
    .filter((key) => typeof key === 'string')
  const names = [...new Set(axes)].map((key) => labelForAxis(key, locale))
  if (names.length) return names.slice(0, 3)
  const scoreLabels = asArray(definition.scoring?.dimensions).map((scale) => niceConstruct(scale.sourceConstruct || scale.key))
  if (scoreLabels.length) return scoreLabels.slice(0, 3)
  return asArray(definition.factors).map((factor) => factor.label || niceConstruct(factor.key)).slice(0, 3)
}
export function buildProfileAssessmentView(data = {}, locale = 'en') {
  const results = asArray(data.results)
  const runs = asArray(data.runs)
  const plan = data.activeTestPlan || data.latestTestPlan || null
  const completedRunIds = new Set(asArray(plan?.completedRunIds))
  const completedDefinitionIds = new Set(results
    .filter((result) => completedRunIds.has(result.runId))
    .map((result) => result.definitionId))
  const pending = asArray(plan?.definitionIds).flatMap((definitionId) => {
    if (completedDefinitionIds.has(definitionId)) return []
    const definition = safeDefinition(definitionId)
    if (!definition) return []
    const item = monitoringCatalogItem(definition.key)
    const run = runs.find((candidate) => candidate.definitionId === definitionId &&
      ['draft', 'in_progress'].includes(candidate.status)) || null
    const answered = run ? definition.questions.filter((question) =>
      Object.prototype.hasOwnProperty.call(run.answers || {}, question.id)).length : 0
    return [{
      id: definitionId,
      key: definition.key,
      title: item?.title?.[locale] || item?.title?.en || definition.title || definition.key,
      description: item?.description?.[locale] || item?.description?.en || '',
      minutes: item?.durationMinutes || Math.max(1, Math.round(definition.questions.length / 6)),
      questionCount: definition.questions.length,
      expectedScales: expectedScales(definition, locale),
      runId: run?.id || null,
      progress: run ? Math.min(99, Math.round(100 * answered / Math.max(1, definition.questions.length))) : 0,
      definitionKey: definition.key,
      definitionVersion: definition.version,
      instrumentLocale: definition.instrumentLocale,
    }]
  })
  const measured = asArray(data.snapshot?.dimensions)
    .filter((d) => {
      const min = Number(d.min), max = Number(d.max), value = Number(d.value)
      return [min, max, value].every(Number.isFinite) && max > min && value >= min && value <= max
    })
    .map((dimension) => ({
      key: dimension.key,
      label: niceConstruct(dimension.sourceConstruct || dimension.key),
      value: Number(dimension.value),
      min: Number(dimension.min),
      max: Number(dimension.max),
      unit: dimension.unit || 'points',
      date: dimension.measurementAt || null,
      sourceDefinitionId: dimension.sourceDefinitionId || null,
      testTitle: (() => {
        const definition = safeDefinition(dimension.sourceDefinitionId)
        if (!definition) return ''
        const item = monitoringCatalogItem(definition.key)
        return item?.title?.[locale] || item?.title?.en || definition.title || definition.key
      })(),
      ratio: (Number(dimension.value) - Number(dimension.min)) /
        (Number(dimension.max) - Number(dimension.min)),
      // A relative position is not a medical probability, ideal or percentile.
    }))
    .sort((a, b) => dateNumber(b.date) - dateNumber(a.date) || a.label.localeCompare(b.label))
  const completedDefinitions = new Set(results.map((result) => result.definitionId))
  return {
    planId: plan?.id || null,
    pending,
    measured,
    completedCount: completedDefinitions.size,
    selectedCount: asArray(plan?.definitionIds).length,
    completedInPlanCount: completedDefinitionIds.size,
  }
}
