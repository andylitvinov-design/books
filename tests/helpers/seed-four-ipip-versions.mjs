// Test-only mirror of the four reviewed IPIP registrations, not a production seed.
// ONS is intentionally excluded. Keep unresolved availability failures visible.
import { createHash } from 'node:crypto'
import { ADDITIONAL_PROFESSIONAL_DEFINITIONS } from '../../data/assessments/professional-additions-2026.js'
import { canonicalJSON, deepFreeze } from '../../lib/assessments/contracts.js'
import { isolatedAdminConnection, assertFreshIsolatedFixture } from './app-db-fixture-policy.mjs'

const reviewed = deepFreeze([
  { key: 'ipip-emotion-decision-making-9', id: '13deba1e-e350-5593-85c7-30f2c9815cbd',
    contentHash: 'sha256:85ba815ae4a2a57da10a5fbf0136fc0bbfbe0e5a32fc3011fe8ef0a34003d35b',
    definitionHash: 'sha256:f01f176ee964a57d9deba6e7b2590ab8fca9c26e6f6afcfc35effc1de769fafe',
    rowHash: 'sha256:367d8f2a49aab4c6e6f67b99e49526635bb77c82b5af9354b66c582b0e9c4bc7' },
  { key: 'ipip-responsive-joy-10', id: '00089afb-3905-5e84-8efb-f0566342aff5',
    contentHash: 'sha256:191b04f9610931d98dab5270fc733c687a8bd05c5cc21cf052ce5e952397538c',
    definitionHash: 'sha256:73b1b9bf69bf744baef41037c6429034c3da0e03a94dbd6a314c580facbb93c0',
    rowHash: 'sha256:c1c3cf32f22ecaaaa1a9d91e13a1c251ebfc78994aebf0b9646b3bef550e4392' },
  { key: 'ipip-responsive-distress-10', id: 'eea5bd21-9620-5fd6-bc2a-9809e590fbd2',
    contentHash: 'sha256:3f6e099c8027c79bc1fe1d8d46910d0f56c63ed08989714e984d04addde8b282',
    definitionHash: 'sha256:f7e03bf8edf3f40a829b9b74b5ae44073d2c81802ca0f9c92a3ca228b0d4ec94',
    rowHash: 'sha256:0f1298eae7a9a908034bc059ee434a545589b3a9fe3ac7c816fc4aed17e2243e' },
  { key: 'ipip-empathic-concern-10', id: '608dce45-8984-51bc-9f1d-5dc8aa9eac8e',
    contentHash: 'sha256:e8661dad68762e77e466943ab40231675c2447a6872176063c3a74165067558f',
    definitionHash: 'sha256:47a5b1b47c242650f8f8232ee9390dc121371e935f22a7875cefd60e4b2a7bc4',
    rowHash: 'sha256:32d9bc46e9335fc2be9c1086822c8b76a00468b8d7dba51d3c2893f75b6c2cf8' },
])
const hash = value => 'sha256:' + createHash('sha256').update(value).digest('hex')
const jsonColumns = new Set(['definition', 'questions', 'answer_schema', 'result_schema', 'source_metadata'])

export function fourIpipFixtureRows(definitions = ADDITIONAL_PROFESSIONAL_DEFINITIONS) {
  return deepFreeze(reviewed.map(expected => {
    const matches = definitions.filter(definition => definition.key === expected.key)
    if (matches.length !== 1) throw new Error('FOUR_IPIP_FIXTURE_SOURCE_MISMATCH')
    const definition = matches[0]
    if (definition.id !== expected.id || definition.version !== 'v1' || definition.instrumentLocale !== 'en' ||
        definition.contentHash !== expected.contentHash || hash(canonicalJSON(definition)) !== expected.definitionHash)
      throw new Error('FOUR_IPIP_FIXTURE_DEFINITION_MISMATCH')
    // This legacy content_hash intentionally fingerprints only this limited payload.
    // The separate full definition and complete-row pins above/below cover all fields.
    const dimension = definition.scoring.dimensions[0]
    const limited = { key: definition.key, items: definition.questions.map(question => question.text),
      positiveCount: definition.questions.length - dimension.reverseItems.length }
    if (hash(JSON.stringify(limited)) !== expected.contentHash)
      throw new Error('FOUR_IPIP_FIXTURE_LIMITED_HASH_MISMATCH')
    const row = {
      id: definition.id, definition_key: definition.key, definition_version: definition.version,
      instrument_locale: definition.instrumentLocale, translation_version: definition.translationVersion,
      definition, questions: definition.questions,
      answer_schema: { type: 'integer', minimum: definition.answerScale.min, maximum: definition.answerScale.max },
      scoring_key: definition.scoringKey, scoring_version: definition.scoringVersion,
      result_schema: { version: definition.resultVersion }, timeframe: definition.timeframe,
      source_metadata: definition.source, content_hash: definition.contentHash, status: 'published',
    }
    if (hash(canonicalJSON(row)) !== expected.rowHash) throw new Error('FOUR_IPIP_FIXTURE_ROW_MISMATCH')
    return row
  }))
}

export function assertFourIpipFixtureContext(db, fixture, environment) {
  const expected = isolatedAdminConnection(environment)
  // setup supplies the same client's verified empty-service snapshot captured
  // before its first mutation. Never substitute a newly fabricated live snapshot.
  if (!fixture || fixture.client !== db) throw new Error('FOUR_IPIP_FRESH_FIXTURE_REQUIRED')
  assertFreshIsolatedFixture(fixture.identity, fixture.occupied)
  const actual = db?.connectionParameters
  for (const key of ['host', 'port', 'database', 'user', 'password', 'ssl']) {
    if (!actual || actual[key] !== expected[key]) throw new Error('FOUR_IPIP_ISOLATED_CLIENT_REQUIRED')
  }
}

export async function seedFourIpipTestVersions(db, fixture, environment = process.env) {
  assertFourIpipFixtureContext(db, fixture, environment)
  const rows = fourIpipFixtureRows()
  await db.query('begin')
  try {
    // Stop on every collision, including identical rows. No upsert or ignore.
    for (const row of rows) {
      const existing = await db.query(`select id from app.assessment_versions where id=$1 or content_hash=$2 or
        (definition_key=$3 and definition_version=$4 and instrument_locale=$5 and translation_version=$6)`,
      [row.id, row.content_hash, row.definition_key, row.definition_version, row.instrument_locale, row.translation_version])
      if (existing.rows.length) throw new Error('FOUR_IPIP_FIXTURE_CONFLICT')
    }
    for (const row of rows) {
      const columns = Object.keys(row)
      await db.query(`insert into app.assessment_versions (${columns.join(',')}) values (${columns.map((_, i) => '$' + (i + 1)).join(',')})`,
        columns.map(key => jsonColumns.has(key) ? JSON.stringify(row[key]) : row[key]))
      const stored = (await db.query('select * from app.assessment_versions where id=$1', [row.id])).rows[0]
      if (!stored || columns.some(key => canonicalJSON(stored[key]) !== canonicalJSON(row[key])))
        throw new Error('FOUR_IPIP_FIXTURE_READBACK_MISMATCH')
    }
    await db.query('commit')
  } catch (error) {
    await db.query('rollback')
    throw error
  }
}
