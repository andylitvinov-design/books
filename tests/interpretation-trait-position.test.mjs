import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { IPIP_TRAIT_GUIDANCE } from '../lib/assessments/ipip50-guidance.js'
import { HH_PERSONALITY_TYPE_KEYS, personalityDimensionGuidance, personalityTypeHypothesis } from '../lib/assessments/personality-type-interpretation.js'
import { descriptiveScorePosition } from '../lib/assessments/descriptive-score-position.js'

const keys = ['ipip-big-five-50', ...HH_PERSONALITY_TYPE_KEYS]
const definitions = ASSESSMENT_DEFINITIONS.filter(definition => keys.includes(definition.key))
function scoreSum(definition, spec, target) {
  assert.equal(spec.method, 'sum')
  const answers = Object.fromEntries(definition.questions.map(question => [question.id, question.min ?? definition.answerScale.min]))
  let remaining = target - spec.min
  for (const id of spec.items) {
    const question = definition.questions.find(item => item.id === id)
    const min = question.min ?? definition.answerScale.min, max = question.max ?? definition.answerScale.max
    const increment = Math.min(remaining, max - min), keyed = min + increment
    remaining -= increment
    answers[id] = spec.reverseItems?.includes(id) ? min + max - keyed : keyed
  }
  assert.equal(remaining, 0)
  const result = scoreAssessment(definition, answers)
  assert.equal(result.dimensions.find(dimension => dimension.key === spec.key).value, target)
  return result
}
const guidance = (definition, dimension, locale) => definition.key === 'ipip-big-five-50'
  ? IPIP_TRAIT_GUIDANCE[dimension.key].meaning[locale === 'ru' ? 1 : 0]
  : personalityDimensionGuidance(dimension, locale).meaning

test('five shared IPIP50 passages are the unchanged existing full-report guidance', () => {
  assert.equal(Object.keys(IPIP_TRAIT_GUIDANCE).length, 5)
  assert.equal(crypto.createHash('sha256').update(canonicalJSON(IPIP_TRAIT_GUIDANCE)).digest('hex'), '65baafefe65ac6c53bbe025bbdaf5b8464953d4e44db64d1154b72ca10e3a1cc')
})

test('all 30 reviewed trait scales explain each actual attainable sum using their own guidance and arithmetic position', () => {
  const pairs = new Set(), summaries = { en: new Set(), ru: new Set() }; let checked = 0
  assert.equal(definitions.length, 9)
  for (const definition of definitions) for (const spec of definition.scoring.dimensions) {
    pairs.add(definition.key + ':' + spec.key)
    for (let value = spec.min; value <= spec.max; value++) {
      const result = scoreSum(definition, spec, value), dimension = result.dimensions.find(item => item.key === spec.key)
      for (const locale of ['en', 'ru']) {
        const model = interpretationBandModel(result, dimension, locale), ownMeaning = guidance(definition, dimension, locale)
        const position = descriptiveScorePosition(dimension, locale, 'trait-sum')
        assert.equal(model.summary, ownMeaning + ' ' + position.text)
        assert.ok(model.meaning.includes(ownMeaning))
        assert.equal(model.basis, 'descriptive'); assert.equal(model.continuous, true)
        assert.deepEqual(model.bands, []); assert.deepEqual(model.answerBands, [])
        assert.equal(model.currentBand, null); assert.equal(model.recommendedReview, false)
        assert.match(model.summary, locale === 'en' ? /A low score does not establish an opposite trait/ : /Низкий балл не доказывает противоположную черту/)
        assert.match(model.summary, locale === 'en' ? /not a percentile, population norm or clinical category/ : /не процентиль, популяционная норма или клиническая категория/)
        assert.doesNotMatch(model.summary, /two items|two responses|два пункта|два ответа/)
        const report = buildAssessmentResultReport(result, locale), section = report.sections.find(item => item.key === dimension.key)
        assert.equal(section.summary, model.summary, 'visible summary must include actual position')
        assert.equal(section.meaning, model.meaning, 'shared guidance must not be duplicated')
        assert.ok(section.followUp.length > 20)
        assert.ok(section.steps.length >= 2)
        assert.deepEqual(report.personalityType, personalityTypeHypothesis(result, locale), 'existing cautious whole-profile hypothesis is preserved')
        summaries[locale].add(ownMeaning); checked++
      }
    }
  }
  assert.equal(pairs.size, 30)
  assert.equal(summaries.en.size, 30); assert.equal(summaries.ru.size, 30)
  assert.equal(checked, 2174)
})

test('IPIP50 reversal and emotional-stability polarity remain exact; a midpoint never establishes a type', () => {
  for (const definition of definitions) {
    for (const spec of definition.scoring.dimensions) {
      const midpoint = (spec.min + spec.max) / 2
      const result = scoreSum(definition, spec, midpoint), dimension = result.dimensions.find(item => item.key === spec.key)
      const model = interpretationBandModel(result, dimension, 'en')
      assert.match(model.summary, /numerical midpoint/)
      assert.match(model.summary, /Different response patterns can produce the same total/)
      assert.match(model.summary, /midpoint is not a validated cutoff/)
      if (spec.key === 'trait.ipip50.emotional_stability') {
        assert.equal(spec.reverseItems.length, 8)
        assert.match(model.summary, /Higher raw scores here correspond to endorsing calmer reactions/)
      }
      if (spec.key === 'trait.ipip50.intellect_imagination') assert.match(model.summary, /not measured IQ or intellectual capacity/)
    }
  }
})

test('unsupported versions, hashes, key/signature changes and invalid sums fail closed for every reviewed family', () => {
  for (const definition of definitions) {
    const spec = definition.scoring.dimensions[0], baseline = scoreSum(definition, spec, spec.min)
    for (const mutate of [result => { result.definitionVersion = 'future' }, result => { result.contentHash = 'forged' }, result => { result.scoringVersion = 'future' }, result => { result.dimensions[0].sourceConstruct = 'Wrong construct' }, result => { result.dimensions[0].value = spec.min + 0.5 }, result => { result.dimensions[0].value = spec.max + 1 }]) {
      const result = structuredClone(baseline); mutate(result)
      const model = interpretationBandModel(result, result.dimensions[0], 'en')
      assert.equal(model.basis, 'unavailable'); assert.equal(model.verified, false)
      assert.deepEqual(model.actions, [])
      assert.doesNotMatch(model.meaning, /arithmetic position|keyed total|Your answers describe agreement/)
    }
  }
})
