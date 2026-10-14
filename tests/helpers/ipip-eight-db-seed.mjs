import { IPIP_THREE_DEFINITIONS } from '../../data/assessments/ipip-three-2026.js'
import { IPIP_FIVE_DEFINITIONS } from '../../data/assessments/ipip-five-2026.js'

// Test-only fixture: caller must initialize the guarded, empty loopback test DB.
export async function seedEightIpipTestVersions(db) {
  if (process.env.CI !== 'true' || process.env.HH_APP_TEST_RUNTIME !== 'isolated' || process.env.VERCEL)
    throw new Error('Isolated test runtime required')
  const url = new URL(process.env.HH_TEST_ADMIN_DATABASE_URL || 'http://invalid')
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/hh_app_test')
    throw new Error('Isolated loopback test database required')
  for (const d of [...IPIP_THREE_DEFINITIONS, ...IPIP_FIVE_DEFINITIONS]) {
    await db.query(
      `insert into app.assessment_versions
       (id,definition_key,definition_version,instrument_locale,translation_version,
        definition,questions,answer_schema,scoring_key,scoring_version,result_schema,
        timeframe,source_metadata,content_hash,status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [d.id, d.key, d.version, d.instrumentLocale, d.translationVersion,
        d, JSON.stringify(d.questions),
        { type: 'integer', minimum: d.answerScale.min, maximum: d.answerScale.max },
        d.scoringKey, d.scoringVersion, { version: d.resultVersion },
        d.timeframe, d.source, d.contentHash, 'published'],
    )
  }
}
