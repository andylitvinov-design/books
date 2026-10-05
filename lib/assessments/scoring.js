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
    default:
      fail('UNKNOWN_SCORER')
  }
  return deepFreeze({ ...provenance(registered), dimensions })
}
