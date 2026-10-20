import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { withResultInterpretations as enrichResults } from '../lib/app/result-interpretations.js'
import { storedResultInterpretation, STORED_INTERPRETATION_VERSION, STORED_INTERPRETATION_RULES_VERSION } from '../lib/assessments/interpretation-resolution.js'

const approvedDigests = {}
const withResultInterpretations = (db, results) => enrichResults(db, results, { approvedDigests })
const canonical = value => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}'
function fixture(locale = 'en') {
  const signature = { key: 'synthetic.score', min: 0, max: 1, unit: 'points', timeframe: 'past-week', direction: 'non-normative', dimensionClass: 'state', sourceConstruct: 'Synthetic' }
  const provenance = { assessmentVersionId: 'synthetic-id', definitionKey: 'synthetic', definitionVersion: 'v1', instrumentLocale: 'en', translationVersion: 'en-v1', scoringKey: 'synthetic', scoringVersion: 'v1', resultVersion: 'v1', contentHash: 'sha256:synthetic' }
  const template = { verified: true, construct: 'Synthetic', meaning: 'Stored value {{value}}', summary: 'Stored explanation', basis: 'descriptive', code: 'continuous', label: 'Descriptive score', actions: [], limitations: [], source: null, recommendedReview: false, reliableDirection: false, presentationDirection: 'neutral', bands: [], currentBand: null, continuous: true }
  const payload = { schemaVersion: 'hh-interpretation.v1', interpretationVersion: STORED_INTERPRETATION_VERSION, reportLocale: locale, provenance, timeframe: 'past-week', sourceCommit: 'synthetic-source', rulesEngineVersion: STORED_INTERPRETATION_RULES_VERSION, rendererStrategy: 'finite-domain-template.v1', dimensions: [{ signature, allowedValues: [0, 1], variants: [{ values: [0, 1], template }] }] }
  const result = { ...provenance, definitionId: provenance.assessmentVersionId, timeframe: payload.timeframe, dimensions: [{ ...signature, value: 1 }] }
  const bytes = canonical(payload)
  const row = { assessment_version_id: result.definitionId, definition_content_hash: result.contentHash, interpretation_version: STORED_INTERPRETATION_VERSION, report_locale: locale, provenance, source_commit: payload.sourceCommit, rules_engine_version: payload.rulesEngineVersion, payload, payload_canonical: bytes, payload_sha256: 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex') }
  approvedDigests[JSON.stringify([result.definitionId, result.contentHash, STORED_INTERPRETATION_VERSION, locale])] = row.payload_sha256
  return { result, row }
}
function database(rows, failure = false) {
  const calls = []
  return { calls, async query(sql, params) {
    calls.push({ sql, params })
    if (!sql.startsWith('SELECT')) return { rows: [] }
    if (failure) throw new Error('optional registry unavailable')
    return { rows: rows.filter(row => row.assessment_version_id === params[0] && row.report_locale === params[2]) }
  } }
}
test('exact database records are read per identity, projected and actually rendered', async () => {
  const { result, row } = fixture()
  const db = database([row, fixture('ru').row])
  const enriched = await withResultInterpretations(db, [result, structuredClone(result)])
  assert.equal(db.calls.filter(call => call.sql.startsWith('SELECT')).length, 2)
  assert.deepEqual(result.interpretationRecords, undefined)
  for (const value of enriched) {
    for (const locale of ['en', 'ru']) {
      assert.equal(value.interpretationRecords[locale].transportProjection, 'exact-result-v1')
      const model = storedResultInterpretation(value, value.dimensions[0], locale)
      assert.equal(model.meaning, 'Stored value 1')
      assert.equal(model.registrySource, 'database')
      assert.equal(model.interpretationVersion, STORED_INTERPRETATION_VERSION)
    }
  }
  assert.ok(db.calls.every(call => !/insert|update|delete|assessment_results|guest_results/i.test(call.sql)))
})
test('missing, duplicate and tampered rows never become database interpretations', async () => {
  const { result, row } = fixture()
  const tampered = structuredClone(row)
  tampered.payload.dimensions[0].variants[0].template.meaning = 'Unverified change'
  for (const rows of [[], [row, row], [tampered]]) {
    const [value] = await withResultInterpretations(database(rows), [result])
    assert.equal(storedResultInterpretation(value, value.dimensions[0], 'en'), null)
  }
})
test('optional SQL failure rolls back savepoint and stops repeated reads', async () => {
  const { result } = fixture()
  const db = database([], true)
  const values = await withResultInterpretations(db, [result, result])
  assert.deepEqual(db.calls.map(call => call.sql.split(' WHERE')[0]), [
    'SAVEPOINT assessment_interpretation_read',
    'SELECT assessment_version_id, interpretation_version, report_locale, definition_content_hash, provenance, source_commit, rules_engine_version, payload_sha256, payload_canonical, payload FROM app.assessment_interpretation_versions',
    'ROLLBACK TO SAVEPOINT assessment_interpretation_read',
    'RELEASE SAVEPOINT assessment_interpretation_read',
  ])
  assert.ok(values.every(value => Object.keys(value.interpretationRecords).length === 0))
})
test('projection rejects score, sibling signature, locale and version reuse', async () => {
  const { result, row } = fixture()
  const [value] = await withResultInterpretations(database([row]), [result])
  for (const mutate of [v => { v.dimensions[0].value = 0 }, v => { v.dimensions[0].timeframe = 'other' }, v => { v.definitionVersion = 'v2' }, v => { v.contentHash = 'other' }, v => { v.interpretationRecords.en.interpretationVersion = 'other' }, v => { v.interpretationRecords.en.rulesEngineVersion = '2026-10-16.v10' }, v => { delete v.interpretationRecords.en.rulesEngineVersion }]) {
    const changed = structuredClone(value)
    mutate(changed)
    assert.equal(storedResultInterpretation(changed, changed.dimensions[0], 'en'), null)
  }
  assert.equal(storedResultInterpretation(value, value.dimensions[0], 'ru'), null)
  assert.equal(storedResultInterpretation(value, { ...value.dimensions[0] }, 'en'), null)
})
test('authenticated and guest bootstrap, submit, replay and result reads enrich response DTOs', () => {
  for (const file of ['repository', 'guest-repository']) {
    const source = readFileSync(new URL(`../lib/app/${file}.js`, import.meta.url), 'utf8')
    if (file === 'repository') assert.match(source,
      /results: portraitOnly \? results : await withResultInterpretations\(db, results\)/)
    else assert.match(source, /results: await withResultInterpretations\(db, results\)/)
    assert.match(source, /return withResultInterpretation\(db, (?:guestResultView|resultView)\(existing\)\)/)
    assert.ok((source.match(/return withResultInterpretation\(db,/g) || []).length >= 3)
  }
})

test('large repeated histories deduplicate reads and bound projected bytes without dropping results', async () => {
  const { result, row } = fixture()
  const db = database([row, fixture('ru').row])
  const history = Array.from({ length: 2000 }, (_, index) => ({ ...structuredClone(result), id: String(index) }))
  const enriched = await withResultInterpretations(db, history)
  assert.equal(enriched.length, history.length)
  assert.deepEqual(enriched.map(value => value.id), history.map(value => value.id))
  assert.equal(db.calls.filter(call => call.sql.startsWith('SELECT')).length, 2)
  const bytes = enriched.reduce((sum, value) => sum + Object.values(value.interpretationRecords).reduce((total, payload) => total + Buffer.byteLength(JSON.stringify(payload)), 0), 0)
  assert.ok(bytes <= 512 * 1024)
  assert.equal(Object.keys(enriched[0].interpretationRecords).length, 0)
  assert.equal(Object.keys(enriched.at(-1).interpretationRecords).length, 2)
  assert.ok(enriched.flatMap(value => Object.values(value.interpretationRecords)).every(payload => payload.dimensions.every(dimension => dimension.allowedValues.length === 1 && dimension.variants.length === 1 && dimension.variants[0].values.length === 1)))
})

test('different historical definitions cannot issue unbounded registry reads', async () => {
  const { result } = fixture()
  const db = database([])
  const history = Array.from({ length: 1000 }, (_, index) => ({ ...structuredClone(result), definitionId: `synthetic-${index}` }))
  const values = await withResultInterpretations(db, history)
  assert.equal(values.length, 1000)
  assert.equal(db.calls.filter(call => call.sql.startsWith('SELECT')).length, 32)
})

test('fallback stays honest and preserves specialized report semantics', async () => {
  const { withReportInterpretationSource } = await import('../lib/assessments/report-interpretation-source.js')
  const { result, row } = fixture()
  const [value] = await withResultInterpretations(database([row]), [result])
  const section = { key: result.dimensions[0].key, meaning: 'Specialized evidence tied to multiple answers', steps: ['Preserve advice'], limitations: ['Preserve warning'] }
  const report = withReportInterpretationSource({ sections: [section], rulesVersion: 'code-v1', personalityType: { context: 'preserved' } }, value, 'en')
  assert.equal(report.sections[0].meaning, section.meaning)
  assert.deepEqual(report.sections[0].steps, section.steps)
  assert.equal(report.sections[0].registrySource, 'code')
  assert.equal(report.sections[0].interpretationSourceCommit, null)
  assert.deepEqual(report.personalityType, { context: 'preserved' })
  assert.match(report.sections[0].limitations.at(-1), /application rules/)
})

test('real report caller consumes stored meaning and declares the exact database version', async () => {
  const { ASSESSMENT_DEFINITIONS, provenance } = await import('../lib/assessments/definitions.js')
  const { scoreAssessment } = await import('../lib/assessments/scoring.js')
  const { interpretationBandModel } = await import('../lib/assessments/interpretation-registry.js')
  const { buildAssessmentResultReport } = await import('../lib/assessments/result-report.js')
  const definition = ASSESSMENT_DEFINITIONS.find(item => item.key === 'cbi-personal')
  const answers = Object.fromEntries(definition.questions.map(question => [question.id, question.min ?? definition.answerScale.min]))
  const result = scoreAssessment(definition, answers)
  const payload = { ...fixture().row.payload, provenance: { ...provenance(definition), assessmentVersionId: definition.id }, timeframe: result.timeframe, dimensions: result.dimensions.map(dimension => ({ signature: { ...dimension }, allowedValues: [dimension.value], variants: [{ values: [dimension.value], template: { ...interpretationBandModel(result, dimension, 'en'), meaning: 'A synthetic verified database explanation.', summary: 'Database summary.' } }] })) }
  const value = { ...result, interpretationRecords: { en: payload } }
  const report = buildAssessmentResultReport(value, 'en')
  assert.equal(report.sections[0].meaning, 'A synthetic verified database explanation.')
  assert.equal(report.sections[0].registrySource, 'database')
  assert.equal(report.sections[0].interpretationVersion, STORED_INTERPRETATION_VERSION)
  assert.match(report.sections[0].limitations.at(-1), /versioned database registry/)
  const fallback = buildAssessmentResultReport({ ...value, definitionVersion: 'unknown' }, 'en')
  assert.equal(fallback.sections[0].registrySource, 'code')
  assert.equal(fallback.sections[0].bandBasis, 'unavailable')
})

test('missing-table and permission errors recover the transaction before exact-code fallback', async () => {
  for (const code of ['42P01', '42501']) {
    let aborted = false
    const db = { async query(sql) {
      if (sql.startsWith('SELECT')) { aborted = true; throw Object.assign(new Error('optional registry unavailable'), { code }) }
      if (sql.startsWith('ROLLBACK TO')) { aborted = false; return { rows: [] } }
      assert.equal(aborted, false, 'transaction must recover before any next query')
      return { rows: [] }
    } }
    const { result } = fixture()
    const [value] = await withResultInterpretations(db, [result])
    await db.query('SELECT_AFTER_FALLBACK'.replace('SELECT', 'CHECK'))
    assert.deepEqual(value.interpretationRecords, {})
    assert.equal(storedResultInterpretation(value, value.dimensions[0], 'en'), null)
  }
})

test('opening an old selected result obtains exact metadata independently of bootstrap budget', async () => {
  const { withResultInterpretation } = await import('../lib/app/result-interpretations.js')
  const { result, row } = fixture()
  const detail = await withResultInterpretation(database([row]), result, { approvedDigests })
  assert.equal(storedResultInterpretation(detail, detail.dimensions[0], 'en').registrySource, 'database')
  const workspace = readFileSync(new URL('../components/app/app-workspace.jsx', import.meta.url), 'utf8')
  assert.match(workspace, /appFetch\('results\/' \+ id\)/)
  const route = readFileSync(new URL('../app/api/app/[...path]/route.js', import.meta.url), 'utf8')
  assert.match(route, /repo\.getResult\(actor, path\[1\]\)/)
  assert.match(route, /guestRepo\.getResult\(credential, path\[2\]\)/)
})

test('malformed history dimensions cannot throw or borrow registry metadata', async () => {
  const { result, row } = fixture()
  const sparse = new Array(2); sparse[1] = result.dimensions[0]
  const malformed = [null, undefined, [], new Array(1), sparse, { length: 1, 0: result.dimensions[0] }, [null], [undefined]]
  const history = malformed.map((dimensions, index) => ({ ...result, id: `malformed-${index}`, dimensions }))
  history.splice(3, 0, { ...result, id: 'valid' })
  const db = database([row])
  const values = await withResultInterpretations(db, history)
  assert.equal(values.length, history.length)
  assert.deepEqual(values.map(value => value.id), history.map(value => value.id))
  for (let index = 0; index < values.length; index++) {
    const value = values[index]
    assert.strictEqual(value.dimensions, history[index].dimensions, 'preserve raw dimensions DTO')
    if (value.id === 'valid') assert.equal(storedResultInterpretation(value, value.dimensions[0], 'en').registrySource, 'database')
    else assert.deepEqual(value.interpretationRecords, {})
  }
  assert.equal(db.calls.filter(call => call.sql.startsWith('SELECT')).length, 2, 'malformed rows should not spend metadata reads')
  const { withReportInterpretationSource } = await import('../lib/assessments/report-interpretation-source.js')
  for (const dimensions of malformed) {
    const report = withReportInterpretationSource({ sections: [{ key: 'synthetic.score', meaning: 'Unverified saved result' }] }, { ...result, dimensions }, 'en')
    assert.equal(report.sections[0].registrySource, 'code')
  }
})

test('canonical low-level loader requires independent approval, not merely a self-consistent DB checksum', async () => {
  const { loadInterpretationRecord, interpretationRecordApprovalKey } = await import('../lib/assessments/interpretation-record-integrity.js')
  const { result, row } = fixture()
  const identity = { definitionId: result.definitionId, contentHash: result.contentHash, interpretationVersion: STORED_INTERPRETATION_VERSION, reportLocale: 'en' }
  assert.equal(await loadInterpretationRecord(database([row]), identity), null, 'C1 empty manifest defaults to code fallback')
  const key = interpretationRecordApprovalKey(identity)
  assert.deepEqual(await loadInterpretationRecord(database([row]), identity, { approvedDigests: { [key]: row.payload_sha256 } }), row.payload)
  const tampered = structuredClone(row)
  tampered.payload.dimensions[0].variants[0].template.meaning = 'Different coherent payload'
  tampered.payload_canonical = canonical(tampered.payload)
  tampered.payload_sha256 = 'sha256:' + crypto.createHash('sha256').update(tampered.payload_canonical).digest('hex')
  assert.equal(await loadInterpretationRecord(database([tampered]), identity, { approvedDigests: { [key]: row.payload_sha256 } }), null)
  for (const changed of [{ ...identity, reportLocale: 'ru' }, { ...identity, interpretationVersion: 'other' }, { ...identity, contentHash: 'other' }]) {
    assert.equal(await loadInterpretationRecord(database([row]), changed, { approvedDigests: { [key]: row.payload_sha256 } }), null)
  }
})

test('account and guest missing-result guards remain before metadata enrichment', () => {
  const account = readFileSync(new URL('../lib/app/repository.js', import.meta.url), 'utf8').split('async getResult(actor, id)')[1].split('async createRequest')[0]
  assert.ok(account.indexOf('if (!row) notFound()') < account.indexOf('withResultInterpretation(db, result)'))
  const guest = readFileSync(new URL('../lib/app/guest-repository.js', import.meta.url), 'utf8').split('async getResult(credential, id)')[1]
  assert.match(guest, /if \(!row\) throw new AppError\('NOT_FOUND', 404\)/)
  assert.ok(guest.indexOf("if (!row) throw new AppError('NOT_FOUND', 404)") < guest.indexOf('withResultInterpretation(db, guestResultView(row))'))
})
