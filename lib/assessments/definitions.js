import {CURRENT_STATE_V1} from '../../data/assessments/current-state-v1.js'
import {MINI_IPIP_20_EN_V1} from '../../data/assessments/mini-ipip-20-en-v1.js'

const definitions = new Map([
  [`${CURRENT_STATE_V1.key}:${CURRENT_STATE_V1.version}`, CURRENT_STATE_V1],
  [`${MINI_IPIP_20_EN_V1.key}:${MINI_IPIP_20_EN_V1.version}`, MINI_IPIP_20_EN_V1]
])

export function getAssessmentDefinition(key, version) {
  const definition = definitions.get(`${key}:${version}`)
  if (!definition) throw new Error('Unknown assessment definition')
  return definition
}

export function validateAnswers(definition, answers, {requireComplete = true} = {}) {
  if (!answers || Array.isArray(answers) || typeof answers !== 'object') throw new Error('Answers must be an object')
  const questionIds = new Set(definition.questions.map(question => question.id))
  for (const key of Object.keys(answers)) if (!questionIds.has(key)) throw new Error(`Unknown answer key: ${key}`)
  for (const question of definition.questions) {
    const value = answers[question.id]
    if (value === undefined || value === null) {
      if (requireComplete && question.required !== false) throw new Error(`Required answer missing: ${question.id}`)
      continue
    }
    const min = question.min ?? definition.answerScale?.min
    const max = question.max ?? definition.answerScale?.max
    if (!Number.isInteger(value)) throw new Error(`Answer must be an integer: ${question.id}`)
    if (!Number.isInteger(min) || !Number.isInteger(max)) throw new Error(`Answer range is not defined: ${question.id}`)
    if (value < min || value > max) throw new Error(`Answer outside range: ${question.id}`)
  }
  return Object.fromEntries(definition.questions.filter(question => answers[question.id] !== undefined).map(question => [question.id, answers[question.id]]))
}
