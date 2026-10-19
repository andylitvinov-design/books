import test from 'node:test'
import assert from 'node:assert/strict'
import { ADDITIONAL_PROFESSIONAL_CATALOG, ADDITIONAL_PROFESSIONAL_DEFINITIONS } from '../data/assessments/professional-additions-2026.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { auditTestKey, testKindFor } from '../lib/assessments/test-kinds.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { buildExplorerEntries, estimatedTestMatchPercent, rankExplorerEntries, rankPublicTestMatches } from '../lib/assessments/test-explorer.js'
import { rankAssessmentDefinitions } from '../lib/assessments/test-recommendations.js'

const NEW_KEYS = [
  'ipip-emotion-decision-making-9', 'ipip-responsive-joy-10',
  'ipip-responsive-distress-10', 'ipip-empathic-concern-10',
  'ons-personal-wellbeing-4',
]

test('five distinct, source-backed, fully startable professional questionnaires join the existing catalog', () => {
  const catalogKeys = new Set(MONITORING_CATALOG.map(item => item.key))
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  assert.equal(ADDITIONAL_PROFESSIONAL_CATALOG.length, 5)
  assert.equal(ADDITIONAL_PROFESSIONAL_DEFINITIONS.length, 5)
  assert.deepEqual(ADDITIONAL_PROFESSIONAL_CATALOG.map(item => item.key), NEW_KEYS)
  assert.equal(new Set(NEW_KEYS).size, NEW_KEYS.length)
  assert.equal(catalogKeys.size, MONITORING_CATALOG.length)
  for (const key of NEW_KEYS) {
    const item = MONITORING_CATALOG.find(value => value.key === key)
    const entry = entries.find(value => value.key === key)
    const definition = getAssessmentDefinition(key, 'v1', 'en')
    assert.ok(item && entry && definition, key)
    assert.equal(item.startable, true, key)
    assert.equal(item.rightsStatus, 'cleared', key)
    assert.equal(item.instrumentLocale, 'en', key)
    assert.equal(item.questionCount, definition.questions.length, key)
    assert.equal(item.testStyle, 'professional', key)
    assert.equal(item.starterEligible, true, key)
    assert.equal(entry.testKind, 'professional', key)
    assert.equal(testKindFor({ key, source: 'product', catalog: item, definition }), 'professional', key)
    assert.equal(entry.selectable, true, key)
    assert.equal(auditTestKey({ catalog: item, definition }).status, 'ready', key)
    assert.match(definition.source.url, /^https:\/\//, key)
    assert.match(definition.contentHash, /^sha256:[a-f0-9]{64}$/, key)
    assert.equal(definition.scoring.dimensions.length, key === 'ons-personal-wellbeing-4' ? 4 : 1)
    assert.equal(definition.questions.length, new Set(definition.questions.map(question => question.id)).size)
    assert.ok(definition.questions.every(question => question.required === true), key)
  }
})

test('each original questionnaire scores its official dimensions without fabricated clinical totals', () => {
  for (const definition of ADDITIONAL_PROFESSIONAL_DEFINITIONS) {
    const low = {}, high = {}
    const reverse = new Set(definition.scoring.dimensions[0].reverseItems || [])
    for (const question of definition.questions) {
      const min = question.min ?? definition.answerScale.min
      const max = question.max ?? definition.answerScale.max
      low[question.id] = reverse.has(question.id) ? max : min
      high[question.id] = reverse.has(question.id) ? min : max
    }
    const lowResult = scoreAssessment(definition, low)
    const highResult = scoreAssessment(definition, high)
    assert.equal(lowResult.dimensions.length, definition.scoring.dimensions.length, definition.key)
    for (let i = 0; i < definition.scoring.dimensions.length; i++) {
      const spec = definition.scoring.dimensions[i]
      assert.equal(lowResult.dimensions[i].key, spec.key, definition.key)
      assert.equal(lowResult.dimensions[i].value, spec.min, definition.key + ' low ' + i)
      assert.equal(highResult.dimensions[i].value, spec.max, definition.key + ' high ' + i)
    }
    for (const locale of ['en', 'ru']) {
      const report = buildAssessmentResultReport(highResult, locale)
      assert.equal(report.sections.length, highResult.dimensions.length, definition.key + ' ' + locale)
      assert.ok(report.sections.every(section => section.meaning?.length > 40 && section.followUp?.length > 20 && section.steps?.length >= 2), definition.key + ' ' + locale)
    }
  }
  const ons = getAssessmentDefinition('ons-personal-wellbeing-4', 'v1', 'en')
  assert.equal(ons.scoring.dimensions.filter(dim => dim.method === 'value').length, 4)
  assert.ok(!ons.scoring.dimensions.some(dim => /total|composite|sum/.test(dim.key)))
  assert.equal(ons.scoring.dimensions[3].direction, 'lower-reported-difficulty')
})

test('small professional ordering bonus is limited to discovery; actual topic relevance remains dominant', () => {
  const shared = {
    key:'comparison-fixture', selectable:true, scaleGuide:{ measurementAxes:[], scales:[] },
    topics:['mood'], analysisAxes:[{key:'mood',weight:0.75}],
    depth:'balanced', durationMinutes:3, testStyle:'professional',
    testLength:'medium', priority:'B', originalIndex:10,
  }
  const professional = { ...shared, testKind:'professional' }
  const checkin = { ...shared, testKind:'monitoring' }
  const ranked = rankExplorerEntries([checkin, professional])
  assert.equal(ranked[0].testKind, 'professional')
  assert.equal(ranked[0].score - ranked[1].score, 7)
  assert.equal(estimatedTestMatchPercent(professional) - estimatedTestMatchPercent(checkin), 3)
  const guest = buildExplorerEntries({locale:'en',audience:'guest'})
  const real = rankPublicTestMatches(guest, {focus:['relationships'],depth:'balanced'})
  assert.ok(real.some(entry => NEW_KEYS.includes(entry.key)))
  assert.ok(real.every(entry => entry.selectable))
  const definitions = [
    getAssessmentDefinition('ipip-empathic-concern-10','v1','en'),
    getAssessmentDefinition('hh-current-state','v2','en'),
  ]
  assert.equal(rankAssessmentDefinitions(definitions).length, 2)
})

test('new items do not silently become Russian questionnaire translations', () => {
  const entriesRu = buildExplorerEntries({locale:'ru',audience:'guest'})
  for (const key of NEW_KEYS) {
    const item = entriesRu.find(entry => entry.key === key)
    assert.ok(item?.selectable && item.definition?.instrumentLocale === 'en', key)
    assert.match(item.title, /EN|IPIP/, key)
  }
})
