import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { ASSESSMENT_DEFINITIONS, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationBandModel, INTERPRETATION_RULES_VERSION } from '../lib/assessments/interpretation-registry.js'
import { storedResultInterpretation, STORED_INTERPRETATION_VERSION, STORED_INTERPRETATION_RULES_VERSION } from '../lib/assessments/interpretation-resolution.js'
import { BACH_GUIDANCE } from '../lib/assessments/bach-guidance.js'
import { descriptiveScorePosition } from '../lib/assessments/descriptive-score-position.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'

const active = new Set(MONITORING_CATALOG.filter(row => row.startable).map(row => row.key + ':' + row.version))
const definitions = ASSESSMENT_DEFINITIONS.filter(definition => active.has(definition.key + ':' + definition.version))
const get = (key, locale = 'en') => definitions.find(definition => definition.key === key && definition.instrumentLocale === locale)
const answersAt = (definition, value) => Object.fromEntries(definition.questions.map(question => [question.id, value ?? question.min ?? definition.answerScale.min]))
const scoreAt = (definition, value) => scoreAssessment(definition, answersAt(definition, value), syntheticTraumaContext(definition))

function payloadFor(definition, result, locale) {
  return { schemaVersion: 'hh-interpretation.v1', interpretationVersion: STORED_INTERPRETATION_VERSION,
    rulesEngineVersion: INTERPRETATION_RULES_VERSION, sourceCommit: 'synthetic-semantic-v2-test', reportLocale: locale,
    provenance: { ...provenance(definition), assessmentVersionId: definition.id }, timeframe: result.timeframe,
    rendererStrategy: 'finite-domain-template.v1', dimensions: result.dimensions.map(dimension => ({
      signature: { ...dimension }, allowedValues: [dimension.value], variants: [{ values: [dimension.value], template: interpretationBandModel(result, dimension, locale) }],
    })) }
}

test('all 98 active HH answer-guide constructs agree with the keyed dimension at both actual scored extremes', () => {
  const pairs = new Set()
  for (const definition of definitions.filter(item => item.key.startsWith('hh-') && item.answerScale)) {
    for (const value of [definition.answerScale.min, definition.answerScale.max]) {
      const result = scoreAt(definition, value)
      for (const locale of ['en', 'ru']) for (const dimension of result.dimensions) {
        const model = interpretationBandModel(result, dimension, locale)
        if (!model.answerBands?.length) continue
        pairs.add(definition.key + ':' + dimension.key)
        const spec = definition.scoring.dimensions.find(item => item.key === dimension.key)
        assert.equal(spec.method, 'mean')
        assert.equal(spec.reverseItems?.length || 0, 0)
        assert.equal(dimension.value, value)
        assert.equal(model.presentationDirection, 'resource')
        assert.equal(model.basis, 'descriptive')
        assert.deepEqual(model.bands, [])
        for (const band of model.answerBands) assert.ok(band.note.includes('“' + model.construct + '”') || band.note.includes('«' + model.construct + '»'), definition.key + ':' + dimension.key + ':' + locale)
        assert.equal(model.currentAnswerBand.code, value === dimension.min ? 'answer-0' : 'answer-4')
      }
    }
  }
  assert.equal(pairs.size, 98)
})

test('approval and obstacles answer notes name scored capabilities, while money difficulty and coping remain distinct', () => {
  for (const [key, expected, misleading] of [
    ['hh-approval-pressure', 'Keeping personal choice when approval matters', 'Pressure to Be Liked'],
    ['hh-goal-obstacles', 'Recognising obstacles and planning a practical step', 'Obstacles on the Way to a Goal'],
  ]) for (const value of [0, 4]) {
    const definition = get(key), result = scoreAt(definition, value)
    const model = interpretationBandModel(result, result.dimensions[0], 'en')
    assert.equal(model.construct, expected)
    assert.ok(model.currentAnswerBand.note.includes('«' + expected + '»'))
    assert.ok(!model.currentAnswerBand.note.includes(misleading))
    assert.match(model.currentAnswerBand.note, value === 0 ? /weakly endorsed/ : /consistently reflected/)
    assert.equal(definition.questions.length, 6)
    assert.equal(definition.scoring.dimensions[0].direction, 'higher-reported-resource')
  }
  const result = scoreAt(get('hh-money-pressure'), 0)
  const [difficulty, coping] = result.dimensions.map(dimension => interpretationBandModel(result, dimension, 'en'))
  assert.equal(difficulty.construct, 'Money-related difficulty')
  assert.equal(coping.construct, 'Available money-related coping')
  assert.equal(difficulty.answerBands.length, 0)
  assert.ok(coping.currentAnswerBand.note.includes('«Available money-related coping»'))
})

test('TIPI key and reverse scoring yield every attainable mean with honest position and pole-specific prose in both locales', () => {
  let checked = 0
  for (const definition of definitions.filter(item => item.key === 'tipi-10')) for (let target = 1; target <= 7; target += 0.5) {
    const answers = answersAt(definition, 4)
    for (const spec of definition.scoring.dimensions) {
      assert.equal(spec.items.length, 2)
      assert.equal(spec.reverseItems.length, 1)
      spec.items.forEach((id, index) => { const keyed = index === 0 ? Math.floor(target) : Math.ceil(target); answers[id] = spec.reverseItems.includes(id) ? 8 - keyed : keyed })
    }
    const result = scoreAssessment(definition, answers)
    for (const locale of ['en', 'ru']) for (const dimension of result.dimensions) {
      assert.equal(dimension.value, target)
      const model = interpretationBandModel(result, dimension, locale)
      const position = descriptiveScorePosition(dimension, locale)
      assert.ok(model.summary.includes(position.text))
      assert.match(model.summary, locale === 'en' ? /lower scores|Lower scores/ : /низк|низш|меньш/i)
      assert.match(model.summary, locale === 'en' ? /higher scores|Higher scores/ : /высок|больш/i)
      assert.equal(model.continuous, true)
      assert.deepEqual(model.bands, [])
      assert.deepEqual(model.answerBands, [])
      assert.match(model.summary, locale === 'en' ? /not a percentile, population norm or clinical category/ : /не процентиль, популяционная норма или клиническая категория/)
      if (target === 4) assert.match(model.summary, locale === 'en' ? /neutral responses or from differing responses/ : /нейтральных, так и из различающихся/)
      checked++
    }
  }
  assert.equal(checked, 130)
})

test('all 38 Bach v2 weighted themes reuse authored emotional guidance at zero and endorsed scores, preserving full-report evidence', () => {
  let checked = 0
  for (const definition of definitions.filter(item => item.key === 'hh-bach-flower-profile')) {
    assert.equal(definition.version, 'v2')
    for (const value of [0, 1, 3, 5]) {
      const result = scoreAt(definition, value)
      assert.equal(result.dimensions.length, 38)
      for (const locale of ['en', 'ru']) {
        const report = buildAssessmentResultReport(result, locale)
        assert.equal(report.sections.length, 38)
        for (const dimension of result.dimensions) {
          const guide = BACH_GUIDANCE[dimension.sourceConstruct][locale]
          const model = interpretationBandModel(result, dimension, locale)
          assert.ok(model.construct.includes(guide.title))
          assert.ok(model.summary.includes(guide.title))
          assert.ok(model.actions.includes(guide.step))
          assert.ok(model.summary.includes(descriptiveScorePosition(dimension, locale, 'weighted-theme').text))
          assert.deepEqual(model.bands, [])
          assert.deepEqual(model.answerBands, [])
          assert.equal(model.basis, 'descriptive')
          assert.match(model.summary, locale === 'en' ? /not a clinical assessment, evidence of flower-essence efficacy or a prescription/ : /не клиническая оценка, доказательство эффективности эссенций или их назначение/)
          if (value === 0) assert.match(model.summary, locale === 'en' ? /no statements.*endorsed.*does not prove/ : /не были отмечены.*не доказательство/)
          else assert.match(model.summary, locale === 'en' ? /not a symptom proportion or an average response/ : /не позволяют читать его как долю симптомов или средний ответ/)
          const section = report.sections.find(item => item.key === dimension.key)
          assert.ok(section.followUp.length > 30)
          assert.equal(section.steps.length, 2)
          assert.equal(section.registrySource, 'code')
          checked++
        }
      }
    }
  }
  assert.equal(checked, 608)
})

test('score-position helper covers all five arithmetic positions and rejects invalid input without categories', () => {
  for (const locale of ['en', 'ru']) for (const kind of ['trait-mean', 'weighted-theme']) {
    for (const [value, position] of [[0, 'minimum'], [1, 'below-midpoint'], [2, 'midpoint'], [3, 'above-midpoint'], [4, 'maximum']]) {
      const output = descriptiveScorePosition({ value, min: 0, max: 4 }, locale, kind)
      assert.equal(output.position, position)
      assert.equal(output.midpoint, 2)
      assert.ok(output.text.length > 120)
    }
  }
  for (const input of [null, {}, { value: NaN, min: 0, max: 4 }, { value: Infinity, min: 0, max: 4 }, { value: -1, min: 0, max: 4 }, { value: 5, min: 0, max: 4 }, { value: 0, min: 0, max: 0 }, { value: 1, min: 4, max: 0 }]) assert.equal(descriptiveScorePosition(input), null)
  assert.equal(descriptiveScorePosition({ value: 2, min: 0, max: 4 }, 'en', 'unreviewed'), null)
})

test('wrong provenance, signature, out-of-range or off-lattice values never acquire TIPI or Bach v2 prose', () => {
  for (const key of ['tipi-10', 'hh-bach-flower-profile']) {
    const result = scoreAt(get(key)), original = result.dimensions[0]
    for (const mutate of [copy => { copy.definitionVersion = 'future' }, copy => { copy.contentHash = 'sha256:forged' }, copy => { copy.scoringVersion = 'other' }, copy => { copy.dimensions[0].direction = 'higher-reported-resource' }, copy => { copy.dimensions[0].value = original.max + 1 }, copy => { copy.dimensions[0].value = original.min + 0.123 }]) {
      const copy = structuredClone(result); mutate(copy)
      const model = interpretationBandModel(copy, copy.dimensions[0], 'en')
      assert.equal(model.basis, 'unavailable', key)
      assert.equal(model.verified, false)
      assert.doesNotMatch(model.meaning, /arithmetic position|Weighted matches concern|more outgoing/)
    }
  }
})

test('current reports reject old v1, missing and relabeled v10 rules and fall back to exact v13 code', () => {
  assert.equal(STORED_INTERPRETATION_VERSION, '2026-10-17.v3')
  assert.equal(INTERPRETATION_RULES_VERSION, '2026-10-17.v13')
  assert.equal(STORED_INTERPRETATION_RULES_VERSION, INTERPRETATION_RULES_VERSION)
  for (const key of ['hh-approval-pressure', 'tipi-10', 'hh-bach-flower-profile']) for (const locale of ['en', 'ru']) {
    const definition = get(key), result = scoreAt(definition), payload = payloadFor(definition, result, locale)
    const current = { ...result, interpretationRecords: { [locale]: payload } }
    assert.equal(storedResultInterpretation(current, current.dimensions[0], locale).registrySource, 'database')
    for (const changed of [{ ...payload, interpretationVersion: '2026-10-17.v2' }, { ...payload, rulesEngineVersion: '2026-10-17.v12' }, { ...payload, interpretationVersion: '2026-10-17.v1' }, { ...payload, rulesEngineVersion: '2026-10-16.v10' }, { ...payload, rulesEngineVersion: '2026-10-17.v11' }, { ...payload, rulesEngineVersion: undefined }]) {
      const stale = { ...result, interpretationRecords: { [locale]: changed } }
      for (const dimension of stale.dimensions) {
        assert.equal(storedResultInterpretation(stale, dimension, locale), null)
        assert.deepEqual(interpretationBandModel(stale, dimension, locale), interpretationBandModel(result, dimension, locale))
        assert.equal(interpretationBandModel(stale, dimension, locale).registrySource, 'code')
      }
    }
  }
})

test('GAD-7 Russian form remains descriptive and English form retains source bands', () => {
  for (const language of ['en', 'ru']) {
    const result = scoreAt(get('gad-7', language), 3)
    for (const locale of ['en', 'ru']) {
      const model = interpretationBandModel(result, result.dimensions[0], locale)
      if (language === 'ru') {
        assert.equal(model.basis, 'descriptive')
        assert.deepEqual(model.bands, [])
        assert.match(model.meaning, locale === 'en' ? /Russian|translation/ : /русск|перевод/)
      } else {
        assert.equal(model.currentBand.code, 'severe')
        assert.deepEqual(model.bands.map(band => band.from), [0, 5, 10, 15])
      }
    }
  }
})

test('export refuses rewriting historical v1 before opening database input or creating output; v1 receipt remains pinned', () => {
  const run = spawnSync(process.execPath, ['scripts/export-assessment-interpretations.mjs', '.', '/nonexistent-technical-input', '/nonexistent-output', '0'.repeat(40), '2026-10-17.v1'], { encoding: 'utf8', env: { PATH: process.env.PATH } })
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /Export version must match the source runtime version/)
  assert.doesNotMatch(run.stderr, /ENOENT/)
  const release = JSON.parse(readFileSync(new URL('../data/assessments/interpretation-registry-release.json', import.meta.url), 'utf8'))
  assert.equal(release.interpretationVersion, '2026-10-17.v1')
  assert.equal(release.recordCount, 460)
  assert.equal(release.sourceCommit, '584371be44e4eedc4c980a0bc483f0676402e2e9')
})
