import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { gaugeModel } from '../lib/assessments/dashboard-gauges.js'
import { interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
import { SITUATION_OBSERVATION, SITUATION_OBSERVATION_KEYS } from '../lib/assessments/situational-score-context.js'

const repoFile = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

function scored(key, version, locale, position = 'middle') {
  const definition = getAssessmentDefinition(key, version, locale)
  assert.ok(definition, key + '/' + version + '/' + locale)
  const answers = Object.fromEntries(definition.questions.map(question => {
    const min = question.min ?? definition.answerScale?.min
    const max = question.max ?? definition.answerScale?.max
    assert.ok(Number.isFinite(min) && Number.isFinite(max), key + '/' + question.id)
    const value = position === 'min' ? min : position === 'max' ? max : Math.round((min + max) / 2)
    return [question.id, value]
  }))
  return scoreAssessment(definition, answers)
}

test('all 50 original Holistic House situational reflections have a bespoke bilingual observation', () => {
  const keys = [...new Set(SITUATION_OBSERVATION_KEYS.filter(key => key.startsWith('hh-')))]
  assert.equal(keys.length, 50)
  for (const key of keys) {
    assert.ok(SITUATION_OBSERVATION[key].ru.length >= 45, key + '/ru')
    assert.ok(SITUATION_OBSERVATION[key].en.length >= 45, key + '/en')
    const item = MONITORING_CATALOG.find(item => item.key === key && item.startable)
    assert.ok(item, key + '/catalog')
    for (const locale of ['ru', 'en']) {
      const result = scored(key, item.version, locale, 'middle')
      for (const dimension of result.dimensions) {
        const model = gaugeModel(dimension, result, locale)
        assert.ok(model, key + '/' + locale)
        const sourceAnchor = model.currentAnswerBand
        const fiveIntervals = model.scoreLevelGuide
        assert.ok(sourceAnchor || fiveIntervals,
          key + '/' + dimension.key + '/' + locale + ': readable level or authentic answer anchor')
        if (sourceAnchor) {
          assert.equal(model.answerBands.length, 5, key)
          assert.ok(sourceAnchor.note.includes('«') || sourceAnchor.note.length > 70)
          assert.deepEqual(model.bands, [], key)
        }
        if (fiveIntervals) {
          assert.equal(fiveIntervals.bands.length, 5, key)
          assert.ok(fiveIntervals.current.note.length >= 75, key)
          assert.ok(fiveIntervals.current.note.includes('«'), key)
          assert.ok(fiveIntervals.observation || SITUATION_OBSERVATION[key][locale], key)
        }
      }
    }
  }
})

test('current state, weekly check and six split dimensions receive scale-specific guidance', () => {
  const cases = [
    ['hh-current-state', 'v2', 5],
    ['hh-weekly-pulse', 'v1', 8],
    ['hh-resource-pulse', 'v1', 7],
    ['hh-monthly-profile', 'v1', 7],
    ['hh-money-pressure', 'v2', 2],
    ['hh-overthinking-loop', 'v2', 2],
    ['hh-screen-saturation', 'v2', 2],
  ]
  for (const [key, version, expectedDimensions] of cases) for (const locale of ['ru','en']) {
    const result = scored(key, version, locale)
    assert.equal(result.dimensions.length, expectedDimensions, key + '/' + locale)
    for (const dimension of result.dimensions) {
      const model = gaugeModel(dimension, result, locale)
      assert.ok(model, key + '/' + dimension.key)
      assert.ok(SITUATION_OBSERVATION[dimension.key] || SITUATION_OBSERVATION[key],
        key + '/' + dimension.key + ' must have a reviewed topic')
      assert.ok(model.scoreLevelGuide || model.currentAnswerBand, key + '/' + dimension.key)
      if (model.scoreLevelGuide) {
        assert.equal(model.scoreLevelGuide.bands.length, 5)
        assert.ok(model.scoreLevelGuide.observation, dimension.key)
        assert.ok(model.scoreLevelGuide.bands.every(b => b.note.length > 70))
      }
    }
  }
})

test('historical mixed-polarity V1 totals never receive invented developmental or severity levels', () => {
  for (const key of ['hh-money-pressure','hh-overthinking-loop','hh-screen-saturation']) {
    for (const locale of ['en','ru']) {
      const result = scored(key,'v1',locale)
      for (const dimension of result.dimensions) {
        const classification = interpretationBandModel(result,dimension,locale)
        const gauge = gaugeModel(dimension,result,locale)
        assert.equal(classification.basis,'descriptive')
        assert.equal(classification.reliableDirection,false)
        assert.equal(gauge?.scoreLevelGuide,null,key + '/' + locale)
        assert.equal(gauge?.currentAnswerBand,null,key + '/' + locale)
        assert.match(classification.meaning,locale === 'ru' ? /без разворота ответов/ : /without reversing them/)
      }
    }
  }
})

test('ordinal physical-health ratings, 30-day symptom counts and published clinical bands get no synthetic intervals', () => {
  for (const [key,version,locale] of [
    ['cdc-hrqol-4','v1','en'],
    ['cdc-healthy-days-symptoms','v1','en'],
    ['cfpb-financial-wellbeing-5','v1','en'],
    ['phq-9','v1','en'],
  ]) {
    const result = scored(key,version,locale)
    for (const dimension of result.dimensions) {
      assert.equal(gaugeModel(dimension,result,locale)?.scoreLevelGuide,null,key + '/' + dimension.key)
    }
  }
})

test('mobile report leads with measured meaning and collapses only extra ranges and calculation text', () => {
  const ui = repoFile('components/app/compact-assessment-report.jsx')
  const css = repoFile('components/app/compact-assessment-report.module.css')
  assert.match(ui, /data-situation-observation/)
  assert.match(ui, /data-score-level-disclosure/)
  assert.match(ui, /data-technical-score-reading/)
  assert.match(ui, /scoreLevelGuide\.observation/)
  assert.match(ui, /hasPlainLanguageGuide/)
  assert.match(css, /\.levelDisclosure>summary/)
  assert.match(css, /@media\(max-width:460px\)/)
})
