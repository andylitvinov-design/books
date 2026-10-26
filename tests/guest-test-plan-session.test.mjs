import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import * as contracts from '../lib/assessments/contracts.js'

const require = createRequire(import.meta.url)
const ts = require('typescript')
// Execute the complete repository source; only its SQL transport and unused
// dependencies are replaced. Fixtures are synthetic and no live DB is loaded.
const source = readFileSync(new URL('../lib/app/guest-repository.js', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText
const SESSION = '00000000-0000-4000-8000-000000000001'
const OTHER = '00000000-0000-4000-8000-000000000002'
const PLAN = '00000000-0000-4000-8000-000000000003'
const NOW = Date.parse('2026-10-25T12:00:00.000Z')
class FixedDate extends Date { static now() { return NOW } }
const future = new Date(NOW + 60000).toISOString()
const credential = { id: SESSION, secretHash: 'synthetic-session-hash' }
const unused = () => assert.fail('Unexpected dependency invocation')
const dependencies = {
  './result-interpretations.js': { withResultInterpretation: unused, withResultInterpretations: unused },
  'server-only': {},
  '../assessments/contracts.js': contracts,
  '../assessments/definitions.js': { getAssessmentDefinition: unused, getDefinitionById: unused, provenance: unused, validateAnswers: unused, validateContext: unused },
  '../assessments/trauma-administration.js': { TRAUMA_SCREENING_RELEASED: false, hasTraumaAdministration: unused, assertTraumaSave: unused },
  '../assessments/scoring.js': { scoreAssessment: unused },
  './crypto.js': { openSealed: unused, operationHash: unused, seal: unused },
  './guest-session.js': { guestTtlSeconds: unused },
  './mood.js': { moodView: unused, validateMoodInput: unused },
  './test-plans.js': { validateTestPlanInput: unused },
  '../../data/assessments/catalog.js': { monitoringCatalogItem: unused },
}
function harness({ session = {}, plan = {} } = {}) {
  const queries = []
  const config = Object.freeze({ synthetic: true })
  const sessionRecord = session === null ? null : {
    id: SESSION, secret_hash: credential.secretHash, expires_at: future, revoked_at: null, ...session,
  }
  const planRecord = plan === null ? null : {
    id: PLAN, guest_session_id: SESSION, definition_ids: ['synthetic-definition'],
    completed_run_ids: [], status: 'active', current_index: 0, revision: 7,
    created_at: new FixedDate(NOW - 1000), updated_at: new FixedDate(NOW),
    completed_at: null, expires_at: future, ...plan,
  }
  const db = { async query(sql, values) {
    const q = sql.replace(/\s+/g, ' ').trim()
    queries.push({ q, values: [...values] })
    if (q === 'select * from app_private.guest_sessions where id=$1 and secret_hash=$2 for share') {
      assert.equal(queries.length, 1, 'Session authentication must be the first query')
      return { rows: sessionRecord && sessionRecord.id === values[0] && sessionRecord.secret_hash === values[1] ? [sessionRecord] : [] }
    }
    if (q === 'select * from app_private.assessment_plans where id=$1 and guest_session_id=$2') {
      assert.equal(queries.length, 2, 'Never read a plan before authenticating the session')
      assert.deepEqual(queries[0].values, [SESSION, credential.secretHash])
      return { rows: planRecord && planRecord.id === values[0] && planRecord.guest_session_id === values[1] ? [planRecord] : [] }
    }
    assert.fail('Unexpected SQL; no live fallback: ' + q)
  } }
  const runtime = { exports: {}, Date: FixedDate, require(name) {
    if (name === './database.js') return { transaction: async (cfg, actor, fn, options) => {
      assert.equal(cfg, config)
      assert.equal(actor, null)
      assert.equal(JSON.stringify(options), '{"server":true}')
      return fn(db)
    } }
    assert.ok(Object.hasOwn(dependencies, name), 'Unexpected import: ' + name)
    return dependencies[name]
  } }
  vm.runInNewContext(compiled, runtime, { filename: 'lib/app/guest-repository.js' })
  return { queries, read: (auth = credential, id = PLAN) => runtime.exports.createGuestRepository(config).getTestPlan(auth, id) }
}
test('valid session is authenticated with the exact credentials before unchanged plan projection', async () => {
  const h = harness()
  const result = await h.read()
  assert.equal(typeof result.createdAt, 'string')
  assert.equal(typeof result.updatedAt, 'string')
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    id: PLAN, definitionIds: ['synthetic-definition'], completedRunIds: [],
    status: 'active', currentIndex: 0, revision: 7,
    createdAt: new Date(NOW - 1000).toISOString(), updatedAt: new Date(NOW).toISOString(),
    completedAt: null, expiresAt: future,
  })
  assert.equal(h.queries.length, 2)
  assert.deepEqual(h.queries[1].values, [PLAN, SESSION])
})
for (const [name, auth, session, count] of [
  ['missing credential', null, {}, 0],
  ['missing session id', { secretHash: credential.secretHash }, {}, 0],
  ['missing session secret', { id: SESSION }, {}, 0],
  ['incorrect secret', { ...credential, secretHash: 'synthetic-wrong-hash' }, {}, 1],
  ['incorrect session id', { ...credential, id: OTHER }, {}, 1],
  ['missing session record', credential, null, 1],
  ['revoked session', credential, { revoked_at: new Date(NOW - 1).toISOString() }, 1],
  ['expired session', credential, { expires_at: new Date(NOW - 1).toISOString() }, 1],
  ['session expiry boundary', credential, { expires_at: new Date(NOW).toISOString() }, 1],
]) test(name + ' rejects with 401 without any plan query', async () => {
  const h = harness({ session })
  await assert.rejects(h.read(auth), error => error.code === 'GUEST_SESSION_REQUIRED' && error.status === 401)
  assert.equal(h.queries.length, count)
  assert.ok(h.queries.every(({ q }) => q.includes('guest_sessions')))
})
for (const [name, plan] of [
  ['missing plan', null],
  ['other session plan', { guest_session_id: OTHER }],
  ['expired plan', { expires_at: new Date(NOW - 1).toISOString() }],
  ['plan expiry boundary', { expires_at: new Date(NOW).toISOString() }],
]) test(name + ' preserves 404 after session authentication', async () => {
  const h = harness({ plan })
  await assert.rejects(h.read(), error => error.code === 'NOT_FOUND' && error.status === 404)
  assert.equal(h.queries.length, 2)
})
test('malformed plan id preserves validation after session authentication', async () => {
  const h = harness()
  await assert.rejects(h.read(credential, 'invalid'), error => error.code === 'INVALID_ID' && error.status === 400)
  assert.equal(h.queries.length, 1)
})
test('invalid session is rejected before even validating the plan id', async () => {
  const h = harness({ session: null })
  await assert.rejects(h.read(credential, 'invalid'), error => error.code === 'GUEST_SESSION_REQUIRED' && error.status === 401)
  assert.equal(h.queries.length, 1)
})

