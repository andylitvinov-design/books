import test from 'node:test'
import assert from 'node:assert/strict'
import { seedEightIpipTestVersions, seedFiveLegacyTestVersions } from './helpers/ipip-eight-db-seed.mjs'
import { IPIP_THREE_DEFINITIONS } from '../data/assessments/ipip-three-2026.js'
import { IPIP_FIVE_DEFINITIONS } from '../data/assessments/ipip-five-2026.js'

test('isolated eight-scale fixture inserts exact published definitions and rejects remote targets', async () => {
  const keys = ['CI', 'HH_APP_TEST_RUNTIME', 'VERCEL', 'HH_TEST_ADMIN_DATABASE_URL']
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  const calls = []
  const db = { query: async (sql, values) => { calls.push({ sql, values }); return { rows: [] } } }
  try {
    process.env.CI = 'true'
    process.env.HH_APP_TEST_RUNTIME = 'isolated'
    delete process.env.VERCEL
    process.env.HH_TEST_ADMIN_DATABASE_URL = 'postgres://localhost/hh_app_test'
    await seedEightIpipTestVersions(db)
    const definitions = [...IPIP_THREE_DEFINITIONS, ...IPIP_FIVE_DEFINITIONS]
    assert.equal(calls.length, 8)
    calls.forEach(({ sql, values }, index) => {
      const d = definitions[index]
      assert.match(sql, /^insert into app\.assessment_versions/)
      assert.doesNotMatch(sql, /update|delete|on conflict/i)
      assert.deepEqual(values, [d.id, d.key, d.version, 'en', d.translationVersion,
        d, JSON.stringify(d.questions), { type: 'integer', minimum: 1, maximum: 5 },
        d.scoringKey, d.scoringVersion, { version: d.resultVersion },
        d.timeframe, d.source, d.contentHash, 'published'])
    })
    await seedFiveLegacyTestVersions(db)
    assert.equal(calls.length, 13, 'The five separately source-verified legacy versions are seeded only in the isolated fixture')
    assert.deepEqual(calls.slice(8).map(call => call.values[1]).sort(), [
      'ipip-emotion-decision-making-9','ipip-empathic-concern-10','ipip-responsive-distress-10','ipip-responsive-joy-10','ons-personal-wellbeing-4',
    ])
    process.env.HH_TEST_ADMIN_DATABASE_URL = 'postgres://example.invalid/hh_app_test'
    await assert.rejects(() => seedEightIpipTestVersions(db), /loopback/)
    assert.equal(calls.length, 13)
    process.env.HH_TEST_ADMIN_DATABASE_URL = 'postgres://localhost/hh_app_test'
    process.env.HH_APP_TEST_RUNTIME = 'production'
    await assert.rejects(() => seedEightIpipTestVersions(db), /Isolated test runtime/)
    assert.equal(calls.length, 13)
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  }
})
