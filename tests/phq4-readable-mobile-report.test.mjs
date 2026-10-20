import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'

const def = getAssessmentDefinition('phq-4', 'v1', 'en')
const items = key => def.scoring.dimensions.find(dimension => dimension.key === key).items
function phq4Result(mood, anxiety) {
  const answers = Object.fromEntries(def.questions.map(question => [question.id, 0]))
  for (const [key, value] of [
    ['symptoms.phq4.depression', mood], ['symptoms.phq4.anxiety', anxiety],
  ]) {
    const [first, second] = items(key)
    answers[first] = Math.min(3, value)
    answers[second] = Math.max(0, value - 3)
  }
  return scoreAssessment(def, answers)
}

test('PHQ-4 1/6 mood, 5/6 anxiety and 6/12 total explain the different findings', () => {
  const result = phq4Result(1, 5)
  const values = Object.fromEntries(result.dimensions.map(d => [d.key, d.value]))
  assert.equal(values['symptoms.phq4.total'], 6)
  assert.equal(values['symptoms.phq4.depression'], 1)
  assert.equal(values['symptoms.phq4.anxiety'], 5)
  for (const locale of ['en', 'ru']) {
    const report = buildAssessmentResultReport(result, locale)
    assert.equal(report.verified, true)
    const sections = Object.fromEntries(report.sections.map(section => [section.key, section]))
    const mood = sections['symptoms.phq4.depression']
    const anxiety = sections['symptoms.phq4.anxiety']
    const total = sections['symptoms.phq4.total']
    assert.equal(mood.recommendedReview, false)
    assert.equal(anxiety.recommendedReview, true)
    assert.match(mood.summary, locale === 'en' ? /1\/6.*below the 3\/6 screening threshold/ : /1\/6.*ниже скринингового порога 3\/6/)
    assert.match(anxiety.summary, locale === 'en' ? /5\/6.*at or above the 3\/6 threshold/ : /5\/6.*на уровне или выше порога 3\/6/)
    assert.match(total.summary, /6\/12/)
    assert.match(total.summary, locale === 'en' ? /anxiety questions contribute 5 points versus 1 for mood/ : /5 баллов относятся к вопросам о тревоге, а 1 — к настроению/)
    assert.ok(total.meaning.length >= total.summary.length)
    assert.ok(mood.meaning.length >= mood.summary.length)
    assert.ok(anxiety.meaning.length >= anxiety.summary.length)
    assert.ok(mood.source && anxiety.source && total.source, 'Existing published source links remain intact')
    assert.match(anxiety.summary, locale === 'en' ? /do not diagnose/ : /не устанавливают диагноз/)
  }
})

test('PHQ-4 screening text changes at actual source cutoff 3, never invented severity bands', () => {
  for (const score of [0, 2, 3, 6]) {
    const report = buildAssessmentResultReport(phq4Result(0, score), 'en')
    const section = report.sections.find(section => section.key === 'symptoms.phq4.anxiety')
    assert.match(section.summary, score >= 3 ? /at or above the 3\/6 threshold/ : /below the 3\/6 screening threshold/)
    assert.equal(section.recommendedReview, score >= 3)
    assert.doesNotMatch(section.summary, /percent of health|probability of disorder|definite diagnosis/)
  }
})

test('modified source identity cannot inherit PHQ-4 published thresholds or the new narrative', () => {
  const original = phq4Result(1, 5)
  const report = buildAssessmentResultReport({ ...original, contentHash: 'tampered' }, 'en')
  assert.equal(report.verified, false)
  assert.ok(report.sections.every(section => section.bandBasis === 'unavailable'))
  assert.ok(report.sections.every(section => !/threshold of 3\/6/.test(section.summary)))
})

test('mobile cards contain the full score legend and 3 short PHQ-4 tabs', () => {
  const component = readFileSync('components/app/compact-assessment-report.jsx', 'utf8')
  const css = readFileSync('components/app/compact-assessment-report.module.css', 'utf8')
  const parent = readFileSync('app/[locale]/app/[[...path]]/assessment-dashboard.css', 'utf8')
  assert.match(component, /data-phq4-overview/)
  assert.match(component, /data-phq4-compact-tabs/)
  assert.match(component, /showLegend=\{false\} showScaleNote=\{false\}/)
  assert.match(component, /data-score-band-strip/)
  assert.match(css, /\.phq4ScaleTabs\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css, /\.measure\{display:grid;grid-template-columns:minmax\(0,155px\) minmax\(0,1fr\)/)
  assert.match(css, /@media\(max-width:350px\)\{\s*\.measure\{grid-template-columns:minmax\(0,84px\) minmax\(0,1fr\)/)
  assert.match(parent, /\.hh-app \.hh-result-page\{min-width:0;max-width:100%;grid-template-columns:minmax\(0,1fr\)\}/)
})
