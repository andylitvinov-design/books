import test from 'node:test'
import assert from 'node:assert/strict'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationForDimension, interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'

const answers = (definition, position = 0) => Object.fromEntries(definition.questions.map(question => {
  const min = question.min ?? definition.answerScale.min
  const max = question.max ?? definition.answerScale.max
  return [question.id, Math.round(min + (max - min) * position)]
}))
const score = (definition, position = 0) => scoreAssessment(definition, answers(definition, position), syntheticTraumaContext(definition))
const bandCases = [
  ['phq-2', 'symptoms.phq2.total', [[0,2,'below_screen'], [3,6,'screen_signal']]],
  ['gad-2', 'symptoms.gad2.total', [[0,2,'below_screen'], [3,6,'screen_signal']]],
  ['phq-4', 'symptoms.phq4.total', [[0,2,'minimal'], [3,5,'mild'], [6,8,'moderate'], [9,12,'severe']]],
  ['phq-4', 'symptoms.phq4.depression', [[0,2,'below_screen'], [3,6,'screen_signal']]],
  ['phq-4', 'symptoms.phq4.anxiety', [[0,2,'below_screen'], [3,6,'screen_signal']]],
  ['phq-9', 'symptoms.phq9.total', [[0,4,'minimal'], [5,9,'mild'], [10,14,'moderate'], [15,19,'moderately_severe'], [20,27,'severe']]],
  ['phq-8', 'symptoms.phq_8.total', [[0,4,'minimal'], [5,9,'mild'], [10,14,'moderate'], [15,19,'moderately_severe'], [20,24,'severe']]],
  ['gad-7', 'symptoms.gad7.total', [[0,4,'minimal'], [5,9,'mild'], [10,14,'moderate'], [15,21,'severe']]],
  ['k6', 'symptoms.k6.total', [[0,12,'below_screen'], [13,24,'screen_signal']]],
  ['phq-15', 'symptoms.phq15.total', [[0,4,'minimal'], [5,9,'low'], [10,14,'medium'], [15,30,'high']]],
  ['brcs', 'resources.brcs.total', [[4,13,'low_coping'], [14,16,'mid_coping'], [17,20,'high_coping']]],
]
function scoreSum(definition, dimensionKey, desiredValue) {
  const values = answers(definition)
  const spec = definition.scoring.dimensions.find(item => item.key === dimensionKey)
  let remaining = desiredValue - spec.items.reduce((sum, id) => sum + values[id], 0)
  for (const id of spec.items) {
    const question = definition.questions.find(item => item.id === id)
    const add = Math.min(remaining, (question.max ?? definition.answerScale.max) - values[id])
    values[id] += add
    remaining -= add
  }
  assert.equal(remaining, 0)
  return scoreAssessment(definition, values)
}

test('published intervals match real scored outputs at every integer, with exact inclusive coverage', () => {
  for (const [key, dimensionKey, intervals] of bandCases) {
    const definition = getAssessmentDefinition(key, 'v1', 'en')
    for (const locale of ['en', 'ru']) for (let value = intervals[0][0]; value <= intervals.at(-1)[1]; value++) {
      const result = scoreSum(definition, dimensionKey, value)
      const dimension = result.dimensions.find(item => item.key === dimensionKey)
      const model = interpretationBandModel(result, dimension, locale)
      const expected = intervals.find(([from,to]) => value >= from && value <= to)
      assert.equal(model.verified, true, `${key}/${value}`)
      assert.equal(model.continuous, false)
      assert.equal(model.code, expected[2])
      assert.equal(model.currentBand.code, model.code)
      assert.equal(model.currentBand.label, model.label)
      assert.deepEqual(model.bands.map(b => [b.from,b.to,b.code]), intervals)
      assert.ok(model.bands.every(b => b.includeFrom && b.includeTo && b.source?.startsWith('https://')))
      assert.match(model.meaning, new RegExp(String(value)))
      assert.ok(model.actions[0].includes(String(value)))
    }
  }
})

test('published cutoffs fail closed for every mutated or missing provenance field', () => {
  for (const key of new Set(bandCases.map(([key]) => key))) {
    const definition = getAssessmentDefinition(key, 'v1', 'en')
    const result = score(definition, 1)
    const dimension = result.dimensions[0]
    for (const field of Object.keys(provenance(definition))) for (const value of [undefined, 'wrong']) {
      const changed = {...result, [field]: value}
      const model = interpretationBandModel(changed, dimension)
      assert.equal(model.basis, 'unavailable', `${key}/${field}`)
      assert.equal(model.verified, false)
      assert.deepEqual(model.bands, [])
      assert.deepEqual(model.actions, [])
    }
  }
})

test('published cutoffs reject changed dimensions, partial lists, fractions and unrelated scale identities', () => {
  const definition = getAssessmentDefinition('phq-4', 'v1', 'en')
  const result = score(definition)
  const dimension = result.dimensions[0]
  for (const patch of [{min:-1},{max:13},{key:'symptoms.gad7.total'},{direction:'higher-reported-resource'},
    {unit:'percent'},{timeframe:'today'},{dimensionClass:'trait'},{sourceConstruct:'other'},{displayKind:'other'},
    {value:.5},{value:13},{value:NaN},{value:Infinity}]) {
    const altered = {...dimension, ...patch}
    assert.equal(interpretationBandModel(result, altered).basis, 'unavailable', JSON.stringify(patch))
    const changed = {...result, dimensions:[altered, ...result.dimensions.slice(1)]}
    assert.equal(interpretationBandModel(changed, altered).basis, 'unavailable')
  }
  for (const dimensions of [[], [dimension], [...result.dimensions, dimension], [...result.dimensions].reverse()]) {
    assert.equal(interpretationBandModel({...result, dimensions}, dimension).basis, 'unavailable')
  }
})

test('unvalidated Russian GAD7 is descriptive in both report languages, never inherits English severity', () => {
  const definition = getAssessmentDefinition('gad-7', 'v1', 'ru')
  for (const locale of ['en','ru']) for (const value of [0,4,5,9,10,14,15,21]) {
    const result = scoreSum(definition, 'symptoms.gad7.total', value)
    const model = interpretationBandModel(result, result.dimensions[0], locale)
    assert.equal(model.basis, 'descriptive')
    assert.equal(model.code, 'continuous')
    assert.equal(model.recommendedReview, false)
    assert.equal(model.currentBand, null)
    assert.deepEqual(model.bands, [])
    assert.match(model.meaning, locale === 'ru' ? /без подтверждённой психометрической валидации/ : /without established independent psychometric validation/)
    assert.doesNotMatch(model.label, /mild|moderate|severe|слабо|умеренно|сильно/)
    assert.equal(model.verified, true)
  }
})

test('all 210 immutable definitions retain valid source-specific interpretation in both report languages', () => {
  assert.equal(ASSESSMENT_DEFINITIONS.length, 210)
  for (const definition of ASSESSMENT_DEFINITIONS) for (const position of [0,.5,1]) {
    const result = score(definition, position)
    for (const dimension of result.dimensions) for (const locale of ['en','ru']) {
      const model = interpretationBandModel(result, dimension, locale)
      const description = `${definition.key}/${definition.instrumentLocale}/${dimension.key}/${position}/${locale}`
      assert.equal(model.verified, true, description)
      assert.ok(model.meaning.length > 80, description)
      assert.ok(model.limitations.length >= 1, description)
      assert.equal(model.continuous, model.basis === 'descriptive', description)
      if (model.basis === 'descriptive') {
        assert.equal(model.code, 'continuous', description)
        assert.deepEqual(model.bands, [], description)
        assert.equal(model.currentBand, null, description)
        assert.doesNotMatch(model.label, /lower part|middle part|upper part|нижней части|средней части|верхней части/, description)
      }
      if (definition.administration) assert.deepEqual(model.actions, [], description)
      else {
        assert.equal(model.actions.length, 2, description)
        assert.ok(model.actions.every(action => action.length > 40), description)
        assert.ok(model.actions[0].includes(String(dimension.value)), description)
      }
    }
  }
})

test('continuous source contracts preserve K10 frequency, ERQ strategy distinctions and CBI exhaustion', () => {
  for (const [key, match] of [['k10', /frequency of non-specific psychological distress/], ['cbi-personal', /more reported exhaustion/]]) {
    const definition = getAssessmentDefinition(key)
    for (const position of [0,.5,1]) {
      const result = score(definition, position)
      const model = interpretationBandModel(result, result.dimensions[0])
      assert.match(model.meaning, match)
      assert.equal(model.code, 'continuous')
      assert.equal(model.bands.length, 0)
      assert.doesNotMatch(model.actions.join(' '), /personal style|change your personality/)
    }
  }
  const erq = score(getAssessmentDefinition('erq'))
  const reappraisal = interpretationBandModel(erq, erq.dimensions[0])
  const suppression = interpretationBandModel(erq, erq.dimensions[1])
  assert.match(reappraisal.meaning, /change how a situation is understood/)
  assert.match(suppression.meaning, /hold back outward emotional expression/)
  assert.notDeepEqual(reappraisal.actions, suppression.actions)
  assert.match(suppression.meaning, /not an absence of emotion/)
})

test('neutral traits stay continuous and score-tied without defect or clinical targets', () => {
  for (const key of ['mini-ipip-20','ipip-big-five-50','ipip-aspect-volatility-10','tipi-10','hh-socionics-32']) {
    const result = score(getAssessmentDefinition(key))
    for (const dimension of result.dimensions) {
      const model = interpretationBandModel(result, dimension)
      assert.equal(model.code, 'continuous')
      assert.equal(model.bands.length, 0)
      assert.equal(model.presentationDirection, 'neutral')
      assert.match(model.actions[0], /situation that fits.*exception/)
      assert.doesNotMatch(model.actions[0], /deficit|treat|diagnos|reduce.*trait/)
    }
  }
})

test('audited mixed-direction v1 totals have a neutral display without rewriting any score or provenance', () => {
  for (const key of ['hh-money-pressure','hh-screen-saturation','hh-overthinking-loop']) for (const locale of ['en','ru']) {
    const definition = getAssessmentDefinition(key,'v1',locale)
    const result = score(definition, 1)
    const before = JSON.stringify(result)
    const model = interpretationBandModel(result, result.dimensions[0],locale)
    assert.equal(model.reliableDirection, false)
    assert.equal(model.presentationDirection, 'neutral')
    assert.deepEqual(model.bands, [])
    assert.match(model.meaning,locale === 'ru' ? /трудност.*совладан/ : /difficulties and coping/)
    assert.match(model.limitations.join(' '),locale === 'ru' ? /без разворота ответов/ : /without reversing/)
    assert.equal(JSON.stringify(result),before)
    assert.equal(result.dimensions[0].value,4)
    assert.equal(result.contentHash,definition.contentHash)
  }
  const consistent = score(getAssessmentDefinition('hh-inner-critic','v1','en'))
  assert.equal(interpretationBandModel(consistent,consistent.dimensions[0]).reliableDirection,true)
})

test('ASRS counts keep their exact two ranges and trauma remains unbanded without actions', () => {
  for (const locale of ['en','ru']) {
    const definition = getAssessmentDefinition('asrs-6','v1',locale)
    const result = score(definition,1)
    const model = interpretationBandModel(result,result.dimensions[0],locale)
    assert.deepEqual(model.bands.map(b => [b.from,b.to]),[[0,3],[4,6]])
    assert.equal(model.currentBand.label,model.label)
    assert.equal(model.displayKind,'screening-count')
  }
  for (const key of ['pcl-5','itq-adult']) {
    const result = score(getAssessmentDefinition(key))
    for (const dimension of result.dimensions) {
      const model = interpretationBandModel(result,dimension)
      assert.deepEqual(model.bands,[])
      assert.deepEqual(model.actions,[])
    }
  }
})

test('continuous explanations never fabricate categories for mean fractions and signed reverse-scored traits', () => {
  const definition = getAssessmentDefinition('hh-sleep-reset')
  const values = answers(definition)
  values[definition.questions[0].id] = 1
  const result = scoreAssessment(definition,values)
  const model = interpretationForDimension(result,result.dimensions[0])
  assert.equal(result.dimensions[0].value,.17)
  assert.equal(model.code,'continuous')
  assert.match(model.meaning,/Mean of 6 responses/)
  assert.match(model.meaning,/Restorative sleep/)
})
