// Test-only registration. Never import from app routes, production seed or migrations.
import { createHash } from 'node:crypto'
import { BACH_V2_DEFINITIONS } from '../../data/assessments/bach-flower-v2.js'
import { canonicalJSON } from '../../lib/assessments/contracts.js'

export async function seedBachV2TestVersions(db) {
  const url = new URL(process.env.HH_TEST_ADMIN_DATABASE_URL || 'http://invalid')
  if (process.env.CI !== 'true' || process.env.HH_APP_TEST_RUNTIME !== 'isolated' || process.env.VERCEL ||
      !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/hh_app_test')
    throw new Error('Isolated loopback test database required')
  const expectedRows = BACH_V2_DEFINITIONS.map(definition => {
    const { contentHash, ...body } = definition
    if ('sha256:' + createHash('sha256').update(canonicalJSON(body)).digest('hex') !== contentHash)
      throw new Error('BACH_V2_FIXTURE_HASH_MISMATCH')
    return {
      id: definition.id, definition_key: definition.key, definition_version: definition.version,
      instrument_locale: definition.instrumentLocale, translation_version: definition.translationVersion,
      definition, questions: definition.questions,
      answer_schema: { type: 'integer', minimum: 0, maximum: 5 },
      scoring_key: definition.scoringKey, scoring_version: definition.scoringVersion,
      result_schema: { version: definition.resultVersion }, timeframe: definition.timeframe,
      source_metadata: definition.source, content_hash: contentHash, status: 'published',
    }
  })
  await db.query('begin')
  try {
    // Stop even on an identical prior row: this is an empty-DB setup fixture,
    // not a production upsert or a replacement for reviewed registry release.
    for (const row of expectedRows) {
      const existing = await db.query(`select id from app.assessment_versions where id=$1 or content_hash=$2 or
        (definition_key=$3 and definition_version=$4 and instrument_locale=$5)`,
      [row.id, row.content_hash, row.definition_key, row.definition_version, row.instrument_locale])
      if (existing.rows.length) throw new Error('BACH_V2_FIXTURE_CONFLICT')
    }
    for (const row of expectedRows) {
      const columns = Object.keys(row)
      await db.query(`insert into app.assessment_versions (${columns.join(',')}) values (${columns.map((_, i) => '$' + (i + 1)).join(',')})`,
        columns.map(key => ['definition', 'questions', 'answer_schema', 'result_schema', 'source_metadata'].includes(key) ? JSON.stringify(row[key]) : row[key]))
      const stored = (await db.query('select * from app.assessment_versions where id=$1', [row.id])).rows[0]
      if (!stored || columns.some(key => canonicalJSON(stored[key]) !== canonicalJSON(row[key])))
        throw new Error('BACH_V2_FIXTURE_READBACK_MISMATCH')
    }
    await db.query('commit')
  } catch (error) {
    await db.query('rollback')
    throw error
  }
}
