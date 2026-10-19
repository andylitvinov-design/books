import { isCoreCheckinResult, checkinComparisonRows } from '../assessments/checkin-result-analysis.js'
import { traumaDimensionShape } from '../assessments/trauma-administration.js'
import { validateProvenance, getDefinitionById } from '../assessments/definitions.js'
import { scoreAssessment } from '../assessments/scoring.js'
import { requireUUID, requireDate, fail, deepFreeze } from '../assessments/contracts.js'
const provenanceKeys = [
  'definitionId',
  'definitionKey',
  'definitionVersion',
  'instrumentLocale',
  'translationVersion',
  'contentHash',
  'scoringKey',
  'scoringVersion',
  'resultVersion',
  'timeframe',
]
const dimensionKeys = [
  'key',
  'min',
  'max',
  'unit',
  'timeframe',
  'direction',
  'dimensionClass',
  'sourceConstruct',
  'displayKind',
]
// Marginal score membership, not reconstruction of private answers or proof
// that a set of subscales is jointly attainable. Use the exact configured
// scorer operation order and rounding; do not round stored values to fit.
const configuredValues = new WeakMap()
function configuredScoreValues(definition, key) {
  let cached = configuredValues.get(definition)
  if (!cached) { cached = new Map(); configuredValues.set(definition, cached) }
  if (cached.has(key)) return cached.get(key)
  const values = new Set()
  cached.set(key, values)
  const spec = definition.scoring?.dimensions?.find(item => item.key === key)
  if (!spec?.items?.length) return values
  // Repeated references to one item share the same answer, not independent
  // choices. Reverse scoring preserves that item's integer response domain.
  const counts = new Map()
  for (const id of spec.items) counts.set(id, (counts.get(id) || 0) + 1)
  let sums = new Set([0])
  for (const [id, count] of counts) {
    const question = definition.questions.find(item => item.id === id)
    const min = question?.min ?? definition.answerScale?.min
    const max = question?.max ?? definition.answerScale?.max
    if (!question || !Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) return values
    const next = new Set()
    for (const sum of sums) for (let answer = min; answer <= max; answer++) next.add(sum + answer * count)
    sums = next
  }
  const multiplier = spec.multiplier === undefined ? 1 : spec.multiplier
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 100) return values
  for (const sum of sums) {
    let value
    if (spec.method === 'sum') value = sum
    else if (spec.method === 'mean') value = sum / spec.items.length
    else if (spec.method === 'value' && spec.items.length === 1) value = sum
    else if (['capped_sum', 'healthy_days'].includes(spec.method) && spec.items.length === 2 && spec.cap === 30)
      value = spec.method === 'healthy_days' ? spec.cap - Math.min(spec.cap, sum) : Math.min(spec.cap, sum)
    else continue
    values.add(Math.round(value * multiplier * 100) / 100)
  }
  return values
}
export function validateResult(result) {
  requireUUID(result?.id)
  requireUUID(result?.accountId)
  requireDate(result?.measurementAt)
  const def = validateProvenance(result)
  if (!Array.isArray(result.dimensions) || Array.from(result.dimensions).some(
    dimension => !dimension || typeof dimension !== 'object' || Array.isArray(dimension),
  )) fail('INVALID_RESULT')
  const shape = traumaDimensionShape(def) || scoreAssessment(
    def,
    Object.fromEntries(def.questions.map((q) => [q.id, q.min ?? def.answerScale.min])),
  ).dimensions
  if (
    result.dimensions.length !== shape.length ||
    new Set(result.dimensions.map((d) => d.key)).size !== shape.length
  )
    fail('INVALID_RESULT')
  for (const expected of shape) {
    const value = result.dimensions.find((d) => d.key === expected.key)
    if (
      !value ||
      dimensionKeys.some((k) => value[k] !== expected[k]) ||
      !Number.isFinite(value.value) ||
      value.value < value.min ||
      value.value > value.max ||
      (def.scoringKey === 'configured' && !configuredScoreValues(def, expected.key).has(value.value)) ||
      (!['configured', 'bach-flower'].includes(def.scoringKey) && !Number.isInteger(value.value))
    )
      fail('INVALID_RESULT')
  }
  return result
}
export function compatibilityKey(result) {
  validateResult(result)
  return provenanceKeys.map((key) => result[key]).join('|')
}
export function compareResults(current, prior) {
  validateResult(current)
  validateResult(prior)
  if (current.accountId !== prior.accountId) fail('OWNER_MISMATCH', 403)
  if (compatibilityKey(current) !== compatibilityKey(prior)) fail('INCOMPATIBLE_RESULTS', 409)
  if (isCoreCheckinResult(current) || isCoreCheckinResult(prior)) return checkinComparisonRows(current, prior)
  return current.dimensions.map((dimension) => {
    const before = prior.dimensions.find((d) => d.key === dimension.key)
    if (!before || dimensionKeys.some((k) => before[k] !== dimension[k]))
      fail('INCOMPATIBLE_RESULTS', 409)
    return {
      key: dimension.key,
      current: dimension.value,
      prior: before.value,
      delta: dimension.value - before.value,
      unit: dimension.unit,
      currentAt: current.measurementAt,
      priorAt: prior.measurementAt,
    }
  })
}
export function chronological(results) {
  return [...results].sort(
    (a, b) => Date.parse(a.measurementAt) - Date.parse(b.measurementAt) || a.id.localeCompare(b.id),
  )
}
export function seriesFor(results, selected) {
  const key = compatibilityKey(selected)
  return chronological(
    results.filter((r) => r.accountId === selected.accountId && compatibilityKey(r) === key),
  )
}
export function createProfileSnapshot({
  id,
  accountId,
  generatedResult,
  carriedResults = [],
  createdAt,
}) {
  requireUUID(id)
  requireUUID(accountId)
  requireDate(createdAt)
  for (const result of [generatedResult, ...carriedResults]) {
    validateResult(result)
    if (result.accountId !== accountId) fail('OWNER_MISMATCH', 403)
  }
  const byInstrument = new Map()
  for (const result of chronological(carriedResults)) byInstrument.set(result.definitionKey, result)
  byInstrument.set(generatedResult.definitionKey, generatedResult)
  const dimensions = [],
    seen = new Set()
  for (const result of [...byInstrument.values()].sort((a, b) =>
    a.definitionKey.localeCompare(b.definitionKey),
  )) {
    const def = getDefinitionById(result.definitionId)
    for (const dimension of result.dimensions) {
      // Scale keys are local to their immutable instrument definition.
      // Full profiles and standalone scales can legitimately share a raw key.
      const identity = `${def.id}::${dimension.key}`
      if (seen.has(identity)) fail('DIMENSION_COLLISION')
      seen.add(identity)
      dimensions.push({
        ...dimension,
        sourceResultId: result.id,
        sourceDefinitionId: def.id,
        measurementAt: result.measurementAt,
        instrumentLocale: result.instrumentLocale,
        remeasured: result.id === generatedResult.id,
      })
    }
  }
  return deepFreeze({
    id,
    accountId,
    generatingResultId: generatedResult.id,
    createdAt,
    dimensions,
  })
}
// End of the snapshot contract. Historical source records are never mutated.
