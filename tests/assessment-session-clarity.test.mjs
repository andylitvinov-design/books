import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { HH_SESSION_CLARITY_DEFINITIONS } from '../data/assessments/hh-session-clarity-v1.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildExplorerEntries, buildPublicStarterBattery } from '../lib/assessments/test-explorer.js'
import { interpretationRegistryCoverage } from '../lib/assessments/interpretation-registry.js'

test('original session reflection is versioned, nonclinical, bilingual, immutable and separately scored', () => {
  assert.equal(HH_SESSION_CLARITY_DEFINITIONS.length, 2)
  const catalog = MONITORING_CATALOG.find((entry) => entry.key === 'hh-session-clarity')
  assert.equal(catalog.startable, true)
  assert.equal(catalog.rightsStatus, 'cleared')
  assert.equal(catalog.starterEligible, false)
  assert.equal(catalog.guestEligible, false)
  assert.equal(catalog.testStyle, 'engaging')
  for (const locale of ['en', 'ru']) {
    const d = getAssessmentDefinition('hh-session-clarity', 'v1', locale)
    const { contentHash, ...rest } = d
    const computed = createHash('sha256').update(canonicalJSON(rest)).digest('hex')
    assert.equal(contentHash, 'sha256:' + computed)
    assert.equal(d.questions.length, 6)
    assert.equal(new Set(d.questions.map((q) => q.id)).size, 6)
    assert.equal(d.source.status, 'original-playful-non-diagnostic-reflection')
    const answers = Object.fromEntries(d.questions.map((q) => [q.id, 3]))
    assert.equal(Object.keys(validateAnswers(d, answers)).length, 6)
    const result = scoreAssessment(d, answers)
    assert.equal(result.dimensions.length, 1)
    assert.equal(result.dimensions[0].value, 3)
    assert.equal(result.dimensions[0].direction, 'higher-reported-resource')
    const account = buildExplorerEntries({ locale, audience: 'account' })
    const guest = buildExplorerEntries({ locale, audience: 'guest' })
    assert.equal(account.find((entry) => entry.key === d.key)?.selectable, true)
    assert.equal(guest.find((entry) => entry.key === d.key)?.selectable, false)
    assert.ok(!buildPublicStarterBattery(account, {}).some((entry) => entry.key === d.key))
  }
  assert.equal(interpretationRegistryCoverage(MONITORING_CATALOG).uncovered.length, 0)
})

test('database migration registers exactly original EN/RU questionnaire versions without copying licensed items', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261014140000_hh_session_clarity_v1.sql', import.meta.url), 'utf8')
  for (const d of HH_SESSION_CLARITY_DEFINITIONS) {
    assert.ok(sql.includes(d.id), d.id)
    assert.ok(sql.includes(d.contentHash), d.contentHash)
    assert.ok(sql.includes(d.questions[0].text), d.instrumentLocale)
  }
  assert.match(sql, /on conflict \(id\) do nothing/)
  assert.ok(!sql.includes('WAI-SR items'))
})
