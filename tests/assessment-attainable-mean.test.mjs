import test from 'node:test'
import assert from 'node:assert/strict'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { exactInterpretationDefinition } from '../lib/assessments/interpretation-context.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'

const meanDefinitions = ASSESSMENT_DEFINITIONS.filter(definition =>
  definition.scoring?.dimensions?.some(spec => spec.method === 'mean'))
const bounds = (definition, question) => [
  question.min ?? definition.answerScale.min,
  question.max ?? definition.answerScale.max,
]
const fixtures = []

function answersForTotal(definition, spec, total) {
  const answers = Object.fromEntries(definition.questions.map(question =>
    [question.id, bounds(definition, question)[0]]))
  const questions = spec.items.map(id => definition.questions.find(question => question.id === id))
  let remaining = total - questions.reduce((sum, question) => sum + bounds(definition, question)[0], 0)
  for (const question of questions) {
    const [min, max] = bounds(definition, question)
    const increment = Math.min(remaining, max - min)
    const keyedValue = min + increment
    answers[question.id] = spec.reverseItems?.includes(question.id) ? min + max - keyedValue : keyedValue
    remaining -= increment
  }
  assert.equal(remaining, 0)
  return answers
}

for (const definition of meanDefinitions) for (const spec of definition.scoring.dimensions.filter(spec => spec.method === 'mean')) {
  const questions = spec.items.map(id => definition.questions.find(question => question.id === id))
  fixtures.push({ definition, spec,
    minimum: questions.reduce((sum, question) => sum + bounds(definition, question)[0], 0),
    maximum: questions.reduce((sum, question) => sum + bounds(definition, question)[1], 0),
  })
}

test('all frozen mean dimensions retain every attainable integer-response total, reverse code and rounded multiplier output', t => {
  let scorerOutputs = 0
  for (const {definition, spec, minimum, maximum} of fixtures) {
    for (let total = minimum; total <= maximum; total++) {
      const result = scoreAssessment(definition, answersForTotal(definition, spec, total))
      const dimension = result.dimensions.find(dimension => dimension.key === spec.key)
      const expected = Math.round((total / spec.items.length) * (spec.multiplier ?? 1) * 100) / 100
      assert.equal(dimension.value, expected, definition.key + '/' + spec.key + '/' + total)
      assert.equal(exactInterpretationDefinition(result, dimension), definition,
        definition.key + '/' + definition.instrumentLocale + '/' + spec.key + '/' + total)
      scorerOutputs++
    }
  }
  t.diagnostic(JSON.stringify({definitions:meanDefinitions.length,dimensions:fixtures.length,scorerOutputs}))
})

test('every impossible hundredth inside each frozen mean range is unavailable without changing the saved value', t => {
  let impossibleHundredths = 0
  for (const {definition, spec, minimum, maximum} of fixtures) {
    const allowed = new Set()
    for (let total = minimum; total <= maximum; total++)
      allowed.add(Math.round((total / spec.items.length) * (spec.multiplier ?? 1) * 100) / 100)
    const result = scoreAssessment(definition, answersForTotal(definition, spec, minimum))
    for (let hundredths = Math.ceil(spec.min * 100); hundredths <= Math.floor(spec.max * 100); hundredths++) {
      const value = hundredths / 100
      if (allowed.has(value)) continue
      const changed = { ...result, dimensions: result.dimensions.map(dimension =>
        dimension.key === spec.key ? { ...dimension, value } : dimension) }
      assert.equal(exactInterpretationDefinition(changed), null, definition.key + '/' + spec.key + '/' + value)
      assert.equal(changed.dimensions.find(dimension => dimension.key === spec.key).value, value)
      impossibleHundredths++
    }
  }
  t.diagnostic(JSON.stringify({impossibleHundredths}))
})

test('off-grid imported means remain visible with unavailable explanation and no score-specific actions in both languages', () => {
  for (const [key, value] of [['ipip-via-r-curiosity-4',3.13],['cbi-work',14.28],['scs-sf',1.09]]) {
    const definition = getAssessmentDefinition(key, 'v1', 'en')
    const spec = definition.scoring.dimensions[0]
    const result = scoreAssessment(definition, Object.fromEntries(definition.questions.map(question =>
      [question.id, bounds(definition, question)[0]])))
    const changed = { ...result, dimensions: result.dimensions.map((dimension,index) => index ? dimension : {...dimension,value}) }
    const before = JSON.stringify(changed)
    for (const locale of ['en','ru']) {
      const report = buildAssessmentResultReport(changed, locale)
      const section = report.sections.find(section => section.key === spec.key)
      assert.equal(section.value, value)
      assert.equal(section.bandBasis, 'unavailable')
      assert.ok(section.meaning.length > 20)
      assert.deepEqual(section.steps, [])
      assert.equal(report.personalityType, null)
    }
    assert.equal(JSON.stringify(changed), before)
  }
})

test('the scorer rounding is retained; extra precision, missing results and incomplete dimensions remain unavailable', () => {
  const definition = getAssessmentDefinition('cbi-work','v1','en')
  const spec = definition.scoring.dimensions[0]
  const result = scoreAssessment(definition, answersForTotal(definition,spec,4))
  assert.equal(result.dimensions[0].value,14.29)
  assert.equal(exactInterpretationDefinition(result),definition)
  for (const value of [14.28,14.285714285714286,14.29000001,null,undefined,NaN,Infinity]) {
    const changed = {...result,dimensions:[{...result.dimensions[0],value}]}
    assert.equal(exactInterpretationDefinition(changed),null)
  }
  assert.equal(exactInterpretationDefinition({...result,dimensions:[]}),null)
  assert.equal(exactInterpretationDefinition({...result,scoringVersion:'unknown'}),null)
  assert.equal(exactInterpretationDefinition(null),null)
})
