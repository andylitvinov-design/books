import { validateAnswers, getDefinitionById, provenance } from './definitions.js'
import { canonicalJSON, fail, deepFreeze } from './contracts.js'
export function scoreAssessment(definition, answers) {
  const registered = getDefinitionById(definition.id)
  if (canonicalJSON(definition) !== canonicalJSON(registered)) fail('INVALID_PROVENANCE')
  const valid = validateAnswers(registered, answers)
  let dimensions
  switch (`${registered.scoringKey}:${registered.scoringVersion}`) {
    case 'raw-state:v1':
      dimensions = registered.questions.map((q) => ({
        key: q.id,
        value: valid[q.id],
        min: q.min,
        max: q.max,
        unit: 'points',
        timeframe: registered.timeframe,
        direction: q.direction,
        dimensionClass: 'state',
        sourceConstruct: q.id,
      }))
      break
    case 'raw-dimensions:v1':
      dimensions = registered.questions.map((q) => ({
        key: q.id,
        value: valid[q.id],
        min: q.min,
        max: q.max,
        unit: 'points',
        timeframe: registered.timeframe,
        direction: q.direction,
        dimensionClass: q.dimensionClass,
        sourceConstruct: q.id,
      }))
      break
    case 'mini-ipip-20:v1':
      dimensions = registered.factors.map((factor) => {
        const questions = registered.questions.filter((q) => q.factor === factor.key)
        if (questions.length !== 4 || questions.some((q) => !['+', '-'].includes(q.keyed)))
          fail('INVALID_INSTRUMENT')
        const value = questions.reduce(
          (total, q) => total + (q.keyed === '+' ? valid[q.id] : 6 - valid[q.id]),
          0,
        )
        return {
          key: `trait.${factor.key}`,
          value,
          min: factor.min,
          max: factor.max,
          unit: 'points',
          timeframe: registered.timeframe,
          direction: 'non-normative',
          dimensionClass: 'trait',
          sourceConstruct: factor.label,
        }
      })
      break
    case 'configured:v1':
      dimensions = registered.scoring.dimensions.map((spec) => {
        if (!Array.isArray(spec.items) || spec.items.length === 0) fail('INVALID_INSTRUMENT')
        // Preserve original validated instrument scoring, including reverse-keyed CBI items.
        const reverseItems = spec.reverseItems === undefined ? [] : spec.reverseItems
        if (!Array.isArray(reverseItems) || reverseItems.some((id) => !spec.items.includes(id)))
          fail('INVALID_INSTRUMENT')
        const values = spec.items.map((id) => {
          if (!Object.hasOwn(valid, id)) fail('INVALID_INSTRUMENT')
          if (!reverseItems.includes(id)) return valid[id]
          const question = registered.questions.find((candidate) => candidate.id === id)
          const min = question?.min ?? registered.answerScale?.min
          const max = question?.max ?? registered.answerScale?.max
          if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max)
            fail('INVALID_INSTRUMENT')
          return min + max - valid[id]
        })
        let value
        if (spec.method === 'sum') value = values.reduce((sum, part) => sum + part, 0)
        else if (spec.method === 'mean')
          value = values.reduce((sum, part) => sum + part, 0) / values.length
        else if (spec.method === 'value' && values.length === 1) value = values[0]
        else if (['capped_sum', 'healthy_days'].includes(spec.method) && values.length === 2) {
          // CDC Healthy Days uses a maximum 30-day window even if both health dimensions overlap.
          if (!Number.isInteger(spec.cap) || spec.cap !== 30 || values.some((part) => part < 0 || part > spec.cap))
            fail('INVALID_INSTRUMENT')
          const unhealthyDays = Math.min(spec.cap, values.reduce((sum, part) => sum + part, 0))
          value = spec.method === 'healthy_days' ? spec.cap - unhealthyDays : unhealthyDays
        }
        else fail('INVALID_INSTRUMENT')
        // CBI reports 0,25,50,75,100 item points; the UI captures equivalent 0..4 choices.
        const multiplier = spec.multiplier === undefined ? 1 : spec.multiplier
        if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 100)
          fail('INVALID_INSTRUMENT')
        value = Math.round(value * multiplier * 100) / 100
        if (!Number.isFinite(value) || value < spec.min || value > spec.max)
          fail('INVALID_INSTRUMENT')
        return {
          key: spec.key,
          value,
          min: spec.min,
          max: spec.max,
          unit: 'points',
          timeframe: registered.timeframe,
          direction: spec.direction || 'non-normative',
          dimensionClass: spec.dimensionClass || 'state',
          sourceConstruct: spec.sourceConstruct || spec.key,
        }
      })
      break
    default:
      fail('UNKNOWN_SCORER')
  }
  return deepFreeze({ ...provenance(registered), dimensions })
}
