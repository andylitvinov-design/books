import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assertGuestSnapshot, assertGuestSaveIntent, guestFinishLabel, guestAnalysisLabel } from '../scripts/helpers/guest-scale-verifier.mjs'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { PERSONALITY_TYPE_DEFINITIONS } from '../data/assessments/personality-types-original-2026.js'
import { MHC_SF_DEFINITIONS } from '../data/assessments/mhc-sf-adult-dec2011.js'
import { COMPASSION_DEFINITIONS } from '../data/assessments/compassion-2026.js'
import { ASRS6_DEFINITIONS } from '../data/assessments/asrs-v1-6-nyu.js'
import { RELATIONSHIPS_INTIMACY_DEFINITIONS } from '../data/assessments/relationships-intimacy-v1.js'
const definitions = [...PERSONALITY_TYPE_DEFINITIONS, ...MHC_SF_DEFINITIONS, ...COMPASSION_DEFINITIONS, ...ASRS6_DEFINITIONS, ...RELATIONSHIPS_INTIMACY_DEFINITIONS]
function fixture(definition, locale) {
  const result = { ...scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))), id: 'displayed-result' }
  const report = buildAssessmentResultReport(result, locale), ru = locale === 'ru'
  const scales = report.sections.map(section => ({ key: section.key, title: section.construct || section.title || section.key,
    numeric: `${ru ? 'Баллы' : 'Score'}: ${section.value} · ${ru ? 'Диапазон' : 'Range'} ${section.min}–${section.max}`,
    text: [section.band, section.meaning, section.bandBasis === 'screening'
      ? ru ? 'Опубликованный скрининговый диапазон. Это не диагноз.' : 'Published screening band. This is not a diagnosis.'
      : ru ? 'Описательный балл — не клинический диагноз и не процент здоровья.' : 'This descriptive score is not a clinical diagnosis or health percentage.'].join(' ') }))
  return { result, snapshot: { scales, text: scales.map(s => s.text).join(' '), methodology: [report.methodology, report.note].join(' '), source: `${result.definitionKey} · ${result.definitionVersion} · ${result.instrumentLocale.toUpperCase()}`, accountAnalysisCount: 0, analysisCtaCount: 1, analysisLabel: guestAnalysisLabel(locale) } }
}
for (const d of definitions) for (const locale of ['en', 'ru']) test(`${d.id}: ${locale} exact scales and rejection controls`, () => {
  const { result, snapshot } = fixture(d, locale)
  assertGuestSnapshot(snapshot, result, locale)
  for (const mutate of [
    s => s.scales.pop(),
    s => { s.scales[0].numeric = s.scales[0].numeric.replace(/: [^ ]+/, ': 999') },
    s => { s.scales[0].key = 'another-scale' },
    s => { s.methodology = '' },
    s => { s.source = 'another-test · v1 · EN' },
    s => { s.accountAnalysisCount = 1 },
    s => { s.analysisCtaCount = 2 },
    s => { s.analysisLabel = guestAnalysisLabel(locale === 'ru' ? 'en' : 'ru') },
  ]) { const broken = structuredClone(snapshot); mutate(broken); assert.throws(() => assertGuestSnapshot(broken, result, locale)) }
  const step = buildAssessmentResultReport(result, locale).sections.flatMap(s => s.steps || [])[0]
  if (step) assert.throws(() => assertGuestSnapshot({ ...snapshot, text: snapshot.text + step }, result, locale))
  const payload = { sourceKind: 'guest_result', sourceId: result.id, operationId: '00000000-0000-4000-8000-000000000000' }
  assertGuestSaveIntent(payload, result)
  assert.throws(() => assertGuestSaveIntent({ ...payload, sourceId: 'another-result' }, result))
  assert.throws(() => assertGuestSaveIntent({ ...payload, sourceKind: 'guest_plan' }, result))
  assert.throws(() => assertGuestSaveIntent({ ...payload, resultIds: [result.id, 'another-result'] }, result))
})
test('Guest UI contract is bound to canonical component and all five audience-specific verifiers', () => {
  const sourceRoot = process.env.HH_VERIFIER_SOURCE_ROOT ? new URL('file://' + process.env.HH_VERIFIER_SOURCE_ROOT.replace(/\/$/, '') + '/') : new URL('../', import.meta.url)
  const component = readFileSync(new URL('components/app/guest-scale-interpretation.jsx', sourceRoot), 'utf8')
  for (const token of ['data-guest-scale-interpretation', 'data-guest-scale={section.key}', '<strong>{section.value}</strong>', '{section.min}–{section.max}', '{report.methodology}', '{report.note}', '{section.meaning}']) assert.ok(component.includes(token), token)
  assert.doesNotMatch(component, /section\.steps|PersonalResultReport|personalityType/)
  for (const name of ['personality-types', 'mhc-sf', 'compassion-assessments', 'asrs6', 'relationships-assessments']) {
    const script = readFileSync(new URL('../scripts/verify-' + name + '.mjs', import.meta.url), 'utf8')
    assert.match(script, /guest\s*\?\s*guestFinishLabel\(locale\)/)
    assert.match(script, /await assertGuestScaleResult\(page,\s*expect,\s*(result|stored),\s*locale\)/)
    assert.ok(script.includes('[data-personal-result-report]'), 'Account report assertion retained')
  }
  assert.equal(guestFinishLabel('en'), 'See scores and scale explanations')
  assert.equal(guestFinishLabel('ru'), 'Посмотреть шкалы и расшифровку')
})
