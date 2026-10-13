import { validateProvenance } from './definitions.js'
import { scoreAssessment } from './scoring.js'

const expectedShapes = new Map()
const validScoreDomains = new Map()
function scoreInDomain(definition, dimension) {
  if (definition.scoringKey === 'bach-flower') return Number.isInteger(dimension.value * 2)
  if (definition.scoringKey !== 'configured') return Number.isInteger(dimension.value)
  const cacheKey = definition.id + '/' + dimension.key
  let domain = validScoreDomains.get(cacheKey)
  if (!domain) {
    const spec = definition.scoring.dimensions.find(candidate => candidate.key === dimension.key)
    const questions = spec.items.map(id => definition.questions.find(question => question.id === id))
    const min = questions.reduce((sum, question) => sum + (question.min ?? definition.answerScale.min), 0)
    const max = questions.reduce((sum, question) => sum + (question.max ?? definition.answerScale.max), 0)
    domain = new Set()
    for (let sum = min; sum <= max; sum++) {
      const raw = spec.method === 'mean' ? sum / questions.length
        : spec.method === 'capped_sum' ? Math.min(spec.cap, sum)
          : spec.method === 'healthy_days' ? spec.cap - Math.min(spec.cap, sum) : sum
      domain.add(Math.round(raw * (spec.multiplier || 1) * 100) / 100)
    }
    validScoreDomains.set(cacheKey, domain)
  }
  return domain.has(dimension.value)
}
export function verifiedResult(result) {
  try {
    const definition = validateProvenance(result)
    let shape = expectedShapes.get(definition.id)
    if (!shape) {
      // Only synthetic minimum answers are used to obtain the authoritative
      // dimension schema. No participant answers are read or recomputed.
      const answers = Object.fromEntries(definition.questions.map(question => [question.id, question.min ?? definition.answerScale.min]))
      shape = scoreAssessment(definition, answers).dimensions
      expectedShapes.set(definition.id, shape)
    }
    if (!Array.isArray(result.dimensions) || result.dimensions.length !== shape.length) return false
    const byKey = new Map(result.dimensions.map(dimension => [dimension.key, dimension]))
    if (byKey.size !== shape.length) return false
    return shape.every(expected => {
      const actual = byKey.get(expected.key)
      return actual && ['min', 'max', 'unit', 'timeframe', 'direction', 'dimensionClass', 'sourceConstruct'].every(key => actual[key] === expected[key]) &&
        Number.isFinite(actual.value) && actual.value >= expected.min && actual.value <= expected.max && scoreInDomain(definition, actual)
    })
  } catch { return false }
}


export function interpretationUnavailable(locale = 'en') {
  const reason = locale === 'ru'
    ? 'Пояснение недоступно: нет проверенной записи для этого ключа, версии, языка или результата. Нельзя надёжно объяснить балл или подобрать рекомендации.'
    : 'Interpretation unavailable: no verified record matches this key, version, language or result. The score cannot be reliably interpreted or matched to recommendations.'
  return {status: 'unavailable', title: locale === 'ru' ? 'Пояснение недоступно' : 'Interpretation unavailable', purpose: reason, note: reason, sections: [], contextNote: null, seekSupport: null}
}
