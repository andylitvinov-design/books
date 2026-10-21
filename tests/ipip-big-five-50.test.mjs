import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { IPIP_BIG_FIVE_50_EN_V1, IPIP_BIG_FIVE_50_CATALOG } from '../data/assessments/ipip-big-five-50-en-v1.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { MIND_BODY_MONITOR_REGISTRY } from '../data/assessments/mind-body-monitor-registry.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { interpretationBandModel } from '../lib/assessments/interpretation-registry.js'

const key = 'ipip-big-five-50'
const definition = IPIP_BIG_FIVE_50_EN_V1
const factorNames = [
  'extraversion', 'agreeableness', 'conscientiousness',
  'emotional_stability', 'intellect_imagination',
]
const refs = [
  'iip-32', 'iip-64', 'wai-sr-12', 'srs-pcoms-4', 'ysq-s3-90',
  'smi-118', 'rfq-8', 'des-ii-28', 'ecr-rs-9', 'csq-8',
  'hads-14', 'aas-collins-read-18', 'ace-10', 'beaq-15',
  'ius-12', 'ptgi-21', 'fad-gf-12',
]
const scaleAnswers = (dim, high) => {
  const reversed = new Set(dim.reverseItems)
  return Object.fromEntries(dim.items.map(id => [id, reversed.has(id) ? (high ? 1 : 5) : (high ? 5 : 1)]))
}

test('IPIP-50 original English questions, permission and immutable version are source-backed', async () => {
  assert.equal(definition.questions.length, 50)
  assert.equal(new Set(definition.questions.map(q => q.id)).size, 50)
  assert.ok(definition.questions.every(q => q.required === true && q.text.length > 8))
  assert.equal(definition.instrumentLocale, 'en')
  assert.equal(definition.source.permission, 'public-domain')
  assert.match(definition.source.permissionUrl, /ipip\.ori\.org\/newPermission\.htm/)
  assert.deepEqual(getAssessmentDefinition(key, 'v1', 'en'), definition)
  const { contentHash, ...body } = definition
  assert.equal(contentHash, 'sha256:' + createHash('sha256').update(canonicalJSON(body)).digest('hex'))
  assert.equal(IPIP_BIG_FIVE_50_CATALOG.length, 1)
  assert.equal(IPIP_BIG_FIVE_50_CATALOG[0].startable, true)
  assert.equal(IPIP_BIG_FIVE_50_CATALOG[0].starterEligible, false)
  assert.equal(MONITORING_CATALOG.filter(item => item.startable).length, 150)
  const migration = await readFile('supabase/migrations/20261011170000_hh_ipip_big_five_50.sql', 'utf8')
  assert.ok(migration.includes(contentHash))
  assert.ok(migration.includes(definition.id))
})

test('each of the five 10-item traits has correct official reverse coding and raw bounds', () => {
  assert.deepEqual(definition.scoring.dimensions.map(d => d.key), factorNames.map(f => 'trait.ipip50.' + f))
  assert.deepEqual(definition.scoring.dimensions.map(d => d.reverseItems.length), [5, 4, 4, 8, 3])
  const minAnswers = {}, maxAnswers = {}, midAnswers = {}
  for (const dim of definition.scoring.dimensions) {
    assert.equal(dim.items.length, 10)
    assert.equal(dim.min, 10)
    assert.equal(dim.max, 50)
    assert.equal(dim.direction, 'non-normative')
    assert.equal(dim.dimensionClass, 'trait')
    Object.assign(minAnswers, scaleAnswers(dim, false))
    Object.assign(maxAnswers, scaleAnswers(dim, true))
    Object.assign(midAnswers, Object.fromEntries(dim.items.map(id => [id, 3])))
  }
  assert.equal(Object.keys(minAnswers).length, 50)
  assert.deepEqual(scoreAssessment(definition, minAnswers, syntheticTraumaContext(definition)).dimensions.map(d => d.value), [10, 10, 10, 10, 10])
  assert.deepEqual(scoreAssessment(definition, maxAnswers, syntheticTraumaContext(definition)).dimensions.map(d => d.value), [50, 50, 50, 50, 50])
  assert.deepEqual(scoreAssessment(definition, midAnswers, syntheticTraumaContext(definition)).dimensions.map(d => d.value), [30, 30, 30, 30, 30])
  assert.throws(() => scoreAssessment(definition, { ...maxAnswers, 'ipip50.01': 6 }, syntheticTraumaContext(definition)), /INVALID_ANSWER/)
})

test('IPIP-50 is available in both explorer locales, but the questions remain identified as EN', () => {
  for (const locale of ['en', 'ru']) {
    for (const audience of ['guest', 'account']) {
      const entry = buildExplorerEntries({ locale, audience }).find(item => item.key === key)
      assert.ok(entry?.selectable, locale + ':' + audience)
      assert.equal(entry.questionCount, 50)
      assert.equal(entry.definition.instrumentLocale, 'en')
      assert.equal(entry.testStyle, 'professional')
      assert.equal(entry.testLength, 'comprehensive')
    }
  }
})

test('17 additional psychotherapy scales are searchable references, not unlicensed online tests', () => {
  assert.equal(MIND_BODY_MONITOR_REGISTRY.length, 168)
  assert.equal(new Set(MIND_BODY_MONITOR_REGISTRY.map(item => item.key)).size, 168)
  const guest = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const account = buildExplorerEntries({ locale: 'en', audience: 'account' })
  for (const ref of refs) {
    const row = MIND_BODY_MONITOR_REGISTRY.find(item => item.key === ref)
    assert.ok(row, ref)
    assert.equal(row.enabled, false, ref)
    assert.notEqual(row.rightsStatus, 'ready_public', ref)
    for (const entries of [guest, account]) {
      const entry = entries.find(item => item.key === ref)
      assert.ok(entry, ref)
      assert.equal(entry.selectable, false, ref)
      assert.equal(entry.definition, null, ref)
    }
  }
})


test('IPIP-50 Insights reports five distinct non-diagnostic trait interpretations and action prompts', () => {
  const answers = Object.fromEntries(definition.questions.map(q => [q.id, 3]))
  const scored = scoreAssessment(definition, answers, syntheticTraumaContext(definition))
  for (const locale of ['en','ru']) {
    const report = buildAssessmentResultReport(scored, locale)
    assert.equal(report.sections.length, 5)
    assert.equal(new Set(report.sections.map(section => section.construct)).size, 5)
    assert.ok(report.sections.every(section => section.domain === 'personality'))
    assert.ok(report.sections.every(section => section.steps.length >= 2 && section.steps.every(step => step.length > 30)))
    report.sections.forEach((section, index) => assert.deepEqual(section.steps.slice(0, 2),
      interpretationBandModel(scored, scored.dimensions[index], locale).actions.slice(0, 2)))
    assert.ok(report.sections.every(section => section.meaning.length > 100))
    assert.ok(report.sections.every(section => section.max === 50))
    assert.equal(report.seekSupport, null)
    if (locale === 'en') {
      assert.match(report.sections[3].meaning, /not an anxiety or mood-disorder screening/i)
      assert.match(report.sections[4].meaning, /not measured IQ/i)
    } else {
      assert.match(report.sections[3].meaning, /не результат диагностики/i)
      assert.match(report.sections[4].meaning, /не IQ/i)
    }
  }
})
