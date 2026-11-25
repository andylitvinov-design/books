import test from 'node:test'
import assert from 'node:assert/strict'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { interpretationForDimension } from '../lib/assessments/interpretation-registry.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'

const enabled = new Set(MONITORING_CATALOG.filter(item => item.startable).map(item => item.key + ':' + item.version))
const runnable = ASSESSMENT_DEFINITIONS.filter(def => enabled.has(def.key + ':' + def.version))
const answersFor = (definition, profile) => Object.fromEntries(definition.questions.map((question, index) => {
  const edge = profile === 'mixed' ? (index % 2 ? 'max' : 'min') : profile
  return [question.id, question[edge] ?? definition.answerScale[edge]]
}))
const score = (definition, profile = 'min') => scoreAssessment(definition, answersFor(definition, profile), syntheticTraumaContext(definition))
const numericOnly = value => /^.*: [\d.]+ \([\d.]+–[\d.]+\)\.$/.test(value)

test('all runnable compact reports provide semantic summaries rather than numeric-only introductions', () => {
  let checked = 0
  for (const definition of runnable) for (const profile of ['min', 'max', 'mixed']) {
    const result = score(definition, profile)
    for (const locale of ['en', 'ru']) {
      const report = buildAssessmentResultReport(result, locale)
      if (report.reportKind === 'bach' || definition.administration) continue
      for (const section of report.sections) {
        assert.equal(typeof section.summary, 'string', definition.id + '/' + section.key)
        assert.ok(section.summary.length > 40)
        assert.equal(numericOnly(section.summary), false, 'A repeated score is not an explanation')
        assert.ok(section.steps.length >= 2, 'Existing practical steps remain available')
        assert.ok(section.meaning.length >= section.summary.length, 'Detailed explanation is retained')
        if (definition.key.startsWith('hh-')) assert.ok(section.limitations.some(note => locale === 'ru'
          ? /авторский опросник Holistic House/.test(note) && /валидированной клинической/.test(note)
          : /original Holistic House/.test(note) && /validated clinical/.test(note)))
        checked++
      }
    }
  }
  // Four new one-scale IPIP forms and a four-scale ONS form extend the old
  // 2574 source/language/response-case checks by 8×2×3 without changing them.
  assert.equal(checked, 2574 + (4 + 4) * 2 * 3)
})

test('semantic descriptions preserve independent construct detail for decimal means', () => {
  const erq = getAssessmentDefinition('erq', 'v1', 'en')
  const answers = answersFor(erq, 'min')
  answers[erq.scoring.dimensions[0].items[0]] = 2
  const result = scoreAssessment(erq, answers)
  const report = buildAssessmentResultReport(result, 'en')
  assert.equal(result.dimensions[0].value, 1.17)
  assert.match(report.sections[0].summary, /change how a situation is understood/)
  assert.match(report.sections[1].summary, /hold back outward emotional expression/)
  assert.notEqual(report.sections[0].summary, report.sections[1].summary)
  assert.ok(report.sections[0].meaning.includes('1.17'))
  assert.match(report.sections[0].summary, /depends on context/)
})

test('equal PHQ-4 aggregate scores retain distinct mood and anxiety observations and next steps', () => {
  const definition = getAssessmentDefinition('phq-4', 'v1', 'en')
  const reports = ['symptoms.phq4.anxiety', 'symptoms.phq4.depression'].map(key => {
    const answers = answersFor(definition, 'min')
    for (const id of definition.scoring.dimensions.find(spec => spec.key === key).items) answers[id] = 3
    return buildAssessmentResultReport(scoreAssessment(definition, answers), 'en')
  })
  for (const report of reports) assert.equal(report.sections.find(section => section.key === 'symptoms.phq4.total').value, 6)
  for (const [index, key] of ['symptoms.phq4.anxiety', 'symptoms.phq4.depression'].entries()) {
    const section = reports[index].sections.find(item => item.key === key)
    const alternate = reports[1 - index].sections.find(item => item.key === key)
    assert.equal(section.value, 6)
    assert.equal(alternate.value, 0)
    assert.notEqual(section.summary, alternate.summary)
    assert.notDeepEqual(section.steps, alternate.steps)
    assert.match(section.summary, /do not diagnose/)
  }
})

test('split authorial difficulty and coping remain separate, optional reflections without severity bands', () => {
  for (const key of ['hh-money-pressure', 'hh-overthinking-loop', 'hh-screen-saturation']) {
    const definition = getAssessmentDefinition(key, 'v2', 'en')
    const answers = answersFor(definition, 'min')
    for (const id of definition.scoring.dimensions[0].items) answers[id] = 4
    for (const locale of ['en', 'ru']) {
      const report = buildAssessmentResultReport(scoreAssessment(definition, answers), locale)
      assert.equal(report.sections.length, 2)
      assert.deepEqual(report.sections.map(section => section.value), [4, 0])
      assert.ok(report.sections.every(section => section.bandBasis === 'descriptive' && !section.recommendedReview))
      assert.notEqual(report.sections[0].summary, report.sections[1].summary)
      assert.notEqual(report.sections[0].steps[1], report.sections[1].steps[1])
    }
  }
})

test('ASRS summary differentiates the 3/4 boundary without a diagnosis, severity or false reassurance', () => {
  const definition = getAssessmentDefinition('asrs-6', 'v1', 'en')
  for (const value of [3, 4]) {
    const answers = Object.fromEntries(definition.questions.map((question, index) => [question.id,
      index < value ? definition.scoring.positiveMinimumResponse[index] : 0]))
    const report = buildAssessmentResultReport(scoreAssessment(definition, answers), 'en')
    const summary = report.sections[0].summary
    assert.match(summary, value === 3 ? /below.*does not rule out ADHD/ : /at or above.*may be consistent/)
    assert.match(summary, /not a diagnosis or severity rating/)
    assert.match(summary, /regardless of the score/)
  }
})

test('rejected source identity never acquires a valid semantic explanation or authorial status', () => {
  for (const key of ['hh-money-pressure', 'gad-7', 'ipip-big-five-50']) {
    const definition = runnable.find(item => item.key === key)
    const result = score(definition, 'max')
    const rejected = { ...result, contentHash: 'not-the-registered-source' }
    for (const locale of ['en', 'ru']) for (const dimension of result.dimensions) {
      const classification = interpretationForDimension(rejected, dimension, locale)
      assert.equal(classification.basis, 'unavailable')
      assert.equal(classification.summary, classification.meaning)
      assert.equal(classification.source, null)
      assert.deepEqual(classification.actions, [])
      assert.doesNotMatch(classification.summary, /highest|lowest|выше|ниже|may be consistent/)
      assert.equal(classification.limitations.length, 1)
    }
  }
})
