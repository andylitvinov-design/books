import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
import { gaugeModel } from '../lib/assessments/dashboard-gauges.js'

const scoreAnswers = (definition, value) => scoreAssessment(definition,
  Object.fromEntries(definition.questions.map(question => [question.id, value])))

test('Tantric Presence has five source-derived EN/RU response ranges and clear 2/4 meaning', () => {
  const ranges = ['0–<0.5', '0.5–<1.5', '1.5–<2.5', '2.5–<3.5', '3.5–4']
  for (const locale of ['en', 'ru']) {
    const definition = getAssessmentDefinition('hh-tantra-presence', 'v1', locale)
    assert.ok(definition)
    for (const value of [0, 2, 4]) {
      const result = scoreAnswers(definition, value)
      assert.equal(result.dimensions.length, 2)
      for (const dimension of result.dimensions) {
        const report = interpretationBandModel(result, dimension, locale)
        assert.equal(report.basis, 'descriptive')
        assert.equal(report.currentBand, null, 'no fake clinical cutoff')
        assert.deepEqual(report.bands, [], 'original anchors are not published norms')
        assert.deepEqual(report.answerBands.map(band => band.label), definition.responseAnchors)
        assert.deepEqual(report.answerBands.map(band => band.displayRange), ranges)
        assert.equal(report.currentAnswerBand.label, definition.responseAnchors[value])
        assert.ok(report.currentAnswerBand.note.length > 40)
        assert.equal(report.answerBands.filter(band => band.code === report.currentAnswerBand.code).length, 1)
        const gauge = gaugeModel(dimension, result, locale)
        assert.equal(gauge.answerBands.length, 5)
        assert.equal(gauge.currentAnswerBand.label, definition.responseAnchors[value])
        assert.equal(gauge.currentBand, null)
        assert.equal(gauge.continuous, true, 'source response anchors are separate from clinical bands')
      }
    }
  }
})

test('response ranges are fail-closed on unverified source, unknown norms and non-original instruments', () => {
  const definition = getAssessmentDefinition('hh-tantra-presence', 'v1', 'en')
  const verified = scoreAnswers(definition, 2)
  const changed = { ...verified, contentHash: 'unverified-translation-or-score' }
  for (const dimension of changed.dimensions) {
    const interpretation = interpretationBandModel(changed, dimension)
    assert.equal(interpretation.basis, 'unavailable')
    assert.deepEqual(interpretation.answerBands, [])
    assert.equal(gaugeModel(dimension, changed), null)
  }
  for (const key of ['phq-9', 'cbi-personal', 'ipip-big-five-50']) {
    const instrument = getAssessmentDefinition(key, 'v1', 'en')
    assert.ok(instrument, key)
    const result = scoreAnswers(instrument, instrument.answerScale.min)
    for (const dimension of result.dimensions) {
      assert.deepEqual(interpretationBandModel(result, dimension).answerBands, [], key)
      assert.deepEqual(gaugeModel(dimension, result).answerBands, [], key)
    }
  }
})

test('mobile report presents original source ranges, specific assessment and collapses repeated caveats', () => {
  const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const component = read('components/app/compact-assessment-report.jsx')
  const dial = read('components/app/assessment-gauge.jsx')
  const css = read('components/app/compact-assessment-report.module.css')
  assert.match(component, /data-answer-interpretation/)
  assert.match(component, /data-answer-ranges/)
  assert.match(component, /model\.answerBands\.map/)
  assert.match(component, /More about this scale/)
  assert.match(component, /showCaveatsInline && section\.limitations\?\.map/)
  assert.match(component, /!showCaveatsInline && section\.limitations\?\.map/)
  assert.match(component, /section\.bandBasis === 'descriptive' && section\.band/)
  assert.match(css, /\.quietGauge figure > small/)
  assert.match(css, /\.rangeList li\[data-active-answer-range\]/)
  assert.match(css, /@media\(max-width:570px\)/)
  assert.match(dial, /data-answer-anchor/)
  assert.match(dial, /Closest answer:/)
})
