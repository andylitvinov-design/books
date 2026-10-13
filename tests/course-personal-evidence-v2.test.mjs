import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { personalCourseEvidenceFromResults } from '../lib/inner-growth/course-personal-evidence-v2.js'

const now = '2026-10-12T12:00:00.000Z', ownerId = 'synthetic-owner'
function fixture({ instrumentLocale = 'en', locale = 'en', revision = '2026-10-12.v2' } = {}) {
  const definition = getAssessmentDefinition('hh-weekly-pulse', 'v1', instrumentLocale)
  const result = { id: 'synthetic-result', accountId: ownerId, status: 'completed', measurementAt: now,
    ...structuredClone(scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min])))) }
  result.interpretations = { [locale]: { status: 'available', origin: 'database', identity: provenance(definition), uiLocale: locale,
    interpretationVersion: revision, payloadHash: 'sha256:' + 'a'.repeat(64), sections: result.dimensions.map(d => ({ ...d,
      meaning: `Prepared v1 synthetic ${d.key}`, compact: { meaning: `Prepared v2 synthetic ${d.key}` },
      source: { title: 'Synthetic prepared source', url: 'https://example.org/synthetic' } })) } }
  return { selection: { confirmed: true, selected: [{ definitionId: definition.id, definitionKey: definition.key, identity: provenance(definition) }] },
    ownerId, locale, now, results: [result] }
}
test('both UI languages preserve the exact selected instrument form, all scales and two independent hashes', () => {
  for (const instrumentLocale of ['en', 'ru']) for (const locale of ['en', 'ru']) {
    const input = fixture({ instrumentLocale, locale }), before = structuredClone(input), out = personalCourseEvidenceFromResults(input)
    assert.equal(out.status, 'ready'); assert.equal(out.scales.length, input.results[0].dimensions.length)
    for (const scale of out.scales) {
      assert.equal(scale.identity.instrumentLocale, instrumentLocale)
      assert.equal(scale.interpretation.uiLocale, locale)
      assert.equal(scale.interpretation.contentHash, 'a'.repeat(64))
      assert.equal(scale.identity.contentHash, input.results[0].contentHash)
      assert.match(scale.interpretation.meaning, /^Prepared v2 synthetic/)
      assert.deepEqual(scale.interpretation.sourceMetadata, input.results[0].interpretations[locale].sections[0].source)
      assert.equal(scale.value, 0)
      assert.equal(scale.verificationStatus, 'verified')
    }
    assert.deepEqual(input, before)
  }
})
test('released v1 report uses only its prepared meaning, never fabricated compact content', () => {
  const input = fixture({ revision: '2026-10-12.v1' }), out = personalCourseEvidenceFromResults(input)
  assert.ok(out.scales.every(row => row.interpretation.meaning.startsWith('Prepared v1 synthetic')))
})
test('missing or invalid whole report keeps raw scales visible but supplies no available interpretation', () => {
  const mutations = [r => delete r.interpretations, r => r.interpretations.en.payloadHash = 'bad',
    r => r.interpretations.en.identity.translationVersion = 'other', r => r.interpretations.en.sections.pop(),
    r => r.interpretations.en.sections[0].value++, r => r.interpretations.en.interpretationVersion = 'unknown',
    r => r.interpretations.en.origin = 'browser', r => r.interpretations.en.sections[0].compact.meaning = '']
  for (const mutate of mutations) {
    const input = fixture(); mutate(input.results[0]); const out = personalCourseEvidenceFromResults(input)
    assert.equal(out.status, 'interpretations-unavailable')
    assert.equal(out.scales.length, 8)
    assert.ok(out.scales.every(row => row.interpretation.status === 'unavailable' && !row.interpretation.meaning && row.value === 0))
  }
})
test('foreign, future, unfinished, wrong-form, incomplete or impossible result never becomes verified scale evidence', () => {
  const mutations = [r => r.accountId = 'someone-else', r => r.status = 'in-progress',
    r => r.measurementAt = '2026-10-13T00:00:00Z', r => r.contentHash = 'wrong', r => r.dimensions.pop(),
    r => r.dimensions[0].value = .5, r => r.dimensions[0].value = 100, r => r.dimensions[0].direction = 'changed']
  for (const mutate of mutations) {
    const input = fixture(); mutate(input.results[0]); const out = personalCourseEvidenceFromResults(input)
    assert.equal(out.status, 'tests-remaining'); assert.equal(out.scales.length, 0)
  }
  const input = fixture(); input.results = fixture({ instrumentLocale: 'ru' }).results
  assert.equal(personalCourseEvidenceFromResults(input).scales.length, 0)
})
test('whole-result aggregate inconsistency is rejected before splitting resource dimensions', () => {
  const definition = getAssessmentDefinition('hh-resource-pulse', 'v1', 'ru')
  const input = fixture({ instrumentLocale: 'ru' })
  input.selection.selected = [{ definitionId: definition.id, definitionKey: definition.key, identity: provenance(definition) }]
  input.results = [{ id: 'synthetic-resource', accountId: ownerId, measurementAt: now,
    ...structuredClone(scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min])))) }]
  input.results[0].dimensions.find(d => d.key === 'resources.overall').value = 1
  assert.equal(personalCourseEvidenceFromResults(input).scales.length, 0)
})
test('newest exact valid result is selected deterministically and instrument dimension order is preserved', () => {
  const input = fixture(), older = structuredClone(input.results[0]); older.id = 'older'; older.measurementAt = '2026-10-10T12:00:00Z'
  const expectedKeys = input.results[0].dimensions.map(d => d.key)
  input.results[0].dimensions.reverse(); input.results.unshift(older)
  const out = personalCourseEvidenceFromResults(input)
  assert.ok(out.scales.every(row => row.resultId === 'synthetic-result'))
  assert.deepEqual(out.scales.map(row => row.key), expectedKeys)
  const duplicate = fixture(); duplicate.results.push(structuredClone(duplicate.results[0]))
  assert.throws(() => personalCourseEvidenceFromResults(duplicate), /AMBIGUOUS_RESULT_ID/)
})
test('source metadata and hash are independent copies of exact prepared fields', () => {
  const input = fixture(), out = personalCourseEvidenceFromResults(input)
  input.results[0].interpretations.en.sections[0].source.title = 'later mutation'
  assert.equal(out.scales[0].interpretation.sourceMetadata.title, 'Synthetic prepared source')
  const changed = fixture(); changed.results[0].interpretations.en.payloadHash = 'sha256:' + 'b'.repeat(64)
  assert.notEqual(personalCourseEvidenceFromResults(changed).scales[0].interpretation.source, out.scales[0].interpretation.source)
})
test('selection confirmation, exact provenance, unique forms, locale, owner and time are mandatory', () => {
  for (const change of [x => x.selection.confirmed = false, x => x.selection.selected[0].identity.scoringVersion = 'other',
    x => x.selection.selected.push(structuredClone(x.selection.selected[0])), x => x.ownerId = '',
    x => x.now = 'invalid', x => x.locale = 'fr']) {
    const input = fixture(); change(input); assert.throws(() => personalCourseEvidenceFromResults(input))
  }
})
