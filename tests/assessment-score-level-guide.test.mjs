import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { gaugeModel } from '../lib/assessments/dashboard-gauges.js'
import { descriptiveScoreLevels } from '../lib/assessments/descriptive-score-levels.js'

const resultFor = (key, values, locale = 'en') => {
  const definition = getAssessmentDefinition(key, 'v1', locale)
  assert.ok(definition, key)
  const answers = Object.fromEntries(definition.questions.map((question, index) =>
    [question.id, values[index] ?? question.min ?? definition.answerScale.min]))
  return scoreAssessment(definition, answers)
}

test('Copenhagen personal-burnout score 45.83 gets the actual third reading level in English and Russian', () => {
  const result = resultFor('cbi-personal', [3,2,2,2,1,1])
  assert.equal(result.dimensions.length, 1)
  const dimension = result.dimensions[0]
  assert.ok(Math.abs(dimension.value - 45.83) < .02)
  for (const locale of ['ru', 'en']) {
    const model = gaugeModel(dimension, result, locale)
    const guide = model.scoreLevelGuide
    assert.ok(guide)
    assert.equal(model.bands.length, 0, 'never invent published clinical bands')
    assert.equal(model.currentBand, null)
    assert.equal(guide.currentIndex, 2)
    assert.equal(guide.bands.length, 5)
    assert.deepEqual(guide.bands.map(b => b.current), [false,false,true,false,false])
    assert.equal(guide.bands[2].from, 40)
    assert.equal(guide.bands[2].to, 60)
    assert.equal(guide.bands[2].displayRange, locale === 'ru' ? '40–<60' : '40–<60')
    assert.ok(guide.bands.every(band => band.note.length > 70))
    assert.match(guide.caveat, locale === 'ru' ? /не являются опубликованными нормами/ : /not published norms/)
    assert.match(guide.overview, locale === 'ru' ? /CBI оценивает частоту/ : /CBI describes the frequency/)
  }
})

test('all three Copenhagen subscales receive direction-specific explanatory levels', () => {
  for (const key of ['cbi-personal', 'cbi-work', 'cbi-client']) {
    const result = resultFor(key, [])
    const model = gaugeModel(result.dimensions[0], result, 'ru')
    assert.equal(model.scoreLevelGuide?.bands?.length, 5, key)
    assert.match(model.scoreLevelGuide.overview, /истощения/, key)
    assert.equal(model.scoreLevelGuide.current.code, model.scoreLevelGuide.bands[model.scoreLevelGuide.currentIndex].code)
  }
})

test('published screening categories and original questionnaire anchors are not replaced by editorial intervals', () => {
  for (const key of ['phq-9', 'gad-7', 'brcs', 'hh-tantra-presence']) {
    const result = resultFor(key, [])
    for (const dimension of result.dimensions) {
      const model = gaugeModel(dimension, result)
      assert.ok(model, key)
      assert.equal(model.scoreLevelGuide, null, key)
      if (key === 'hh-tantra-presence') assert.ok(model.answerBands.length > 0)
      else assert.ok(model.bands.length > 0)
    }
  }
})

test('unverified, changed or invalid scores get no level guidance', () => {
  const result = resultFor('cbi-personal', [3,2,2,2,1,1])
  const dimension = result.dimensions[0]
  const damaged = { ...result, contentHash: 'tampered' }
  assert.equal(gaugeModel(dimension, damaged), null)
  for (const value of [NaN, -1, 101]) {
    const badDimension = {...dimension, value}
    assert.equal(descriptiveScoreLevels({
      result,
      section: {...badDimension, bandBasis:'descriptive'},
      model: {verified:true,bandBasis:'descriptive',bands:[],answerBands:[]},
    }), null)
  }
})

test('every five-part explanation is visible in shared report UI with a narrow-screen layout', () => {
  const component = readFileSync(new URL('../components/app/compact-assessment-report.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../components/app/compact-assessment-report.module.css', import.meta.url), 'utf8')
  assert.match(component, /model\?\.scoreLevelGuide/)
  assert.match(component, /data-descriptive-score-guide/)
  assert.match(component, /data-score-level-descriptions/)
  assert.match(component, /scoreLevelGuide\.bands\.map/)
  assert.match(component, /explainPublishedLevel\(band\.code, locale\)/)
  assert.match(css, /\.levelGuide\{/)
  assert.match(css, /\.levelList\{[^}]*grid-template-columns:minmax\(0,1fr\)/s)
  assert.match(css, /@media\(max-width:350px\)/)
})
