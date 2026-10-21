// Test-only registration, never a production seed or a release mechanism.
import { createHash } from 'node:crypto'
import { ADDITIONAL_PROFESSIONAL_DEFINITIONS } from '../../data/assessments/professional-additions-2026.js'
import { canonicalJSON } from '../../lib/assessments/contracts.js'

export async function seedProfessionalAdditionTestVersions(db) {
  const url = new URL(process.env.HH_TEST_ADMIN_DATABASE_URL || 'http://invalid')
  if (process.env.CI !== 'true' || process.env.HH_APP_TEST_RUNTIME !== 'isolated' || process.env.VERCEL ||
      !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/hh_app_test' ||
      !['postgres:', 'postgresql:'].includes(url.protocol) || url.search || url.hash)
    throw new Error('Isolated loopback test database required')
  const expectedRows = ADDITIONAL_PROFESSIONAL_DEFINITIONS.map(definition => {
    // These five published definitions use an item/polarity fingerprint, not a
    // whole-definition hash. Preserve that existing identity exactly.
    const items = definition.questions.map(question => question.text)
    const fingerprint = definition.key.startsWith('ipip-')
      ? { key: definition.key, items, positiveCount: items.length - definition.scoring.dimensions[0].reverseItems.length }
      : { key: definition.key, items }
    if ('sha256:' + createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex') !== definition.contentHash)
      throw new Error('PROFESSIONAL_ADDITION_FIXTURE_HASH_MISMATCH')
    return {
      id: definition.id, definition_key: definition.key, definition_version: definition.version,
      instrument_locale: definition.instrumentLocale, translation_version: definition.translationVersion,
      definition, questions: definition.questions,
      answer_schema: { type: 'integer', minimum: definition.answerScale.min, maximum: definition.answerScale.max },
      scoring_key: definition.scoringKey, scoring_version: definition.scoringVersion,
      result_schema: { version: definition.resultVersion }, timeframe: definition.timeframe,
      source_metadata: definition.source, content_hash: definition.contentHash, status: 'published',
    }
  })
  await db.query('begin')
  try {
    // Check every identity before writing; even an identical existing row is a
    // conflict in the empty-DB fixture. Never update or silently overwrite it.
    for (const row of expectedRows) {
      const existing = await db.query(`select id from app.assessment_versions where id=$1 or content_hash=$2 or
        (definition_key=$3 and definition_version=$4 and instrument_locale=$5)`,
      [row.id, row.content_hash, row.definition_key, row.definition_version, row.instrument_locale])
      if (existing.rows.length) throw new Error('PROFESSIONAL_ADDITION_FIXTURE_CONFLICT')
    }
    for (const row of expectedRows) {
      const columns = Object.keys(row)
      await db.query(`insert into app.assessment_versions (${columns.join(',')}) values (${columns.map((_, i) => '$' + (i + 1)).join(',')})`,
        columns.map(key => ['definition', 'questions', 'answer_schema', 'result_schema', 'source_metadata'].includes(key) ? JSON.stringify(row[key]) : row[key]))
      const stored = (await db.query('select * from app.assessment_versions where id=$1', [row.id])).rows[0]
      if (!stored || columns.some(key => canonicalJSON(stored[key]) !== canonicalJSON(row[key])))
        throw new Error('PROFESSIONAL_ADDITION_FIXTURE_READBACK_MISMATCH')
    }
    await db.query('commit')
  } catch (error) {
    await db.query('rollback')
    throw error
  }
}
