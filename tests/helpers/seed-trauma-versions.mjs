// Test-only registration. Never imported by app routes, production seed or migrations.
import { createHash } from 'node:crypto'
import { TRAUMA_SCREENING_DEFINITIONS } from '../../data/assessments/trauma-screening-2026.js'
import { canonicalJSON } from '../../lib/assessments/contracts.js'
import { assertIsolated } from './app-db-setup.mjs'
export async function seedTraumaTestVersions(db) {
  assertIsolated()
  for (const definition of TRAUMA_SCREENING_DEFINITIONS) {
    const { contentHash, ...body } = definition
    if ('sha256:' + createHash('sha256').update(canonicalJSON(body)).digest('hex') !== contentHash) throw new Error('TRAUMA_FIXTURE_HASH_MISMATCH')
    const expected = {
      id: definition.id, definition_key: definition.key, definition_version: definition.version,
      instrument_locale: definition.instrumentLocale, translation_version: definition.translationVersion,
      definition, questions: definition.questions, answer_schema: { type: 'integer', minimum: 0, maximum: 4 },
      scoring_key: definition.scoringKey, scoring_version: definition.scoringVersion,
      result_schema: { version: definition.resultVersion }, timeframe: definition.timeframe,
      source_metadata: definition.source, content_hash: contentHash, status: 'published',
    }
    const columns = Object.keys(expected)
    const existing = (await db.query('select * from app.assessment_versions where id=$1 or (definition_key=$2 and definition_version=$3 and instrument_locale=$4)', [definition.id, definition.key, definition.version, definition.instrumentLocale])).rows
    if (existing.length) {
      if (existing.length !== 1 || columns.some(key => canonicalJSON(existing[0][key]) !== canonicalJSON(expected[key]))) throw new Error('TRAUMA_FIXTURE_CONFLICT')
      continue
    }
    await db.query(`insert into app.assessment_versions (${columns.join(',')}) values (${columns.map((_,i)=>'$'+(i+1)).join(',')})`, columns.map(key => ['definition','questions','answer_schema','result_schema','source_metadata'].includes(key) ? JSON.stringify(expected[key]) : expected[key]))
    const stored = (await db.query('select * from app.assessment_versions where id=$1', [definition.id])).rows[0]
    if (!stored || columns.some(key => canonicalJSON(stored[key]) !== canonicalJSON(expected[key]))) throw new Error('TRAUMA_FIXTURE_READBACK_MISMATCH')
  }
}
