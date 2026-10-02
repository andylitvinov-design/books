import {validateAnswers} from './definitions.js'

export function scoreAssessment(definition, answers) {
  const validAnswers = validateAnswers(definition, answers)
  if (definition.key === 'hh-current-state') return {
    definitionKey: definition.key,
    definitionVersion: definition.version,
    dimensions: definition.questions.map(question => ({key: question.id, value: validAnswers[question.id], min: question.min, max: question.max, unit: 'points', timeframe: definition.timeframe, direction: question.direction}))
  }
  const dimensions = definition.factors.map(factor => {
    const questions = definition.questions.filter(question => question.factor === factor.key)
    const value = questions.reduce((total, question) => total + (question.keyed === '+' ? validAnswers[question.id] : 6 - validAnswers[question.id]), 0)
    return {key: factor.key, value, min: factor.min, max: factor.max, unit: 'points', timeframe: definition.timeframe, sourceConstruct: factor.label}
  })
  return {definitionKey: definition.key, definitionVersion: definition.version, dimensions}
}
