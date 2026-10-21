import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

// Source-only execution: never import the repository's database, crypto,
// client-data or provider adapters. Every external operation below is a stub.
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const repositorySource = read('lib/practitioners/repository.js')
const helperSource = read('lib/practitioners/practice-activation.mjs')
const contractsSource = read('lib/practitioners/contracts.js')
const hasGuard = /async requireActivated\(actor\)/.test(repositorySource)

class AppError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status }
}
const forbidden = name => () => { throw new Error('Unexpected adapter: ' + name) }

function evaluate(source, exports, bindings = {}) {
  const body = source.replace(/^import[^\n]*(?:\n|$)/gm, '').replace(/^export /gm, '')
  assert.doesNotMatch(body, /^\s*(?:import|export)\b/m)
  return runInNewContext(body + '\n;({' + exports.join(',') + '})', bindings, {
    timeout: 2000,
    contextCodeGeneration: { strings: false, wasm: false },
  })
}

// Execute the actual pure helper and actual public-profile projection, not a
// duplicated eligibility implementation. Unrelated contract adapters fail hard.
const { hasActivatedPractice } = evaluate(helperSource, ['hasActivatedPractice'])
const { publicProfile } = evaluate(contractsSource, ['publicProfile'], {
  AppError,
  assertObject: forbidden('assertObject'), onlyKeys: forbidden('onlyKeys'),
  text: forbidden('text'), normalizeVideoPresentation: forbidden('normalizeVideoPresentation'),
})

const ACTOR_A = '11111111-1111-4111-8111-111111111111'
const ACTOR_B = '22222222-2222-4222-8222-222222222222'
const MASTER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const MASTER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const actor = Object.freeze({ id: ACTOR_A, claims: Object.freeze({ sub: ACTOR_A }) })
const config = Object.freeze({ syntheticFixture: true })
const profile = (status = 'submitted', extra = {}) => ({
  id: MASTER_A, trusted_auth_user_id: ACTOR_A, status,
  draft_profile: { displayName: 'Synthetic practitioner' }, public_profile: {}, ...extra,
})
const service = (status = 'submitted', practitioner_id = MASTER_A) => ({ status, practitioner_id })
const normalize = sql => sql.replace(/\s+/g, ' ').trim()
const ACCOUNT_SQL = 'select id,status,onboarding_state from app.accounts where id=$1'
const MASTER_SQL = 'select * from app.practitioners where trusted_auth_user_id=$1'
const SERVICE_SQL = "select status from app.service_offerings where practitioner_id=$1 and status in ('submitted','changes_requested','published','paused') limit 1"
const ELIGIBLE = new Set(['submitted', 'changes_requested', 'published', 'paused'])

function fixture({
  account = { id: ACTOR_A, status: 'active', onboarding_state: 'active' },
  practitioners = [profile()], services = [service()], transactionError = null,
  queryFailure = null, source = repositorySource,
} = {}) {
  const calls = []
  let transactions = 0
  const db = {
    async query(sql, params) {
      const statement = normalize(sql)
      const values = Array.from(params || [])
      calls.push({ statement, values })
      if (statement === ACCOUNT_SQL) {
        assert.deepEqual(values, [actor.id], 'readyAccount must use the authenticated actor')
        if (queryFailure === 'account') throw new Error('synthetic account failure')
        return { rows: account && account.id === values[0] ? [account] : [] }
      }
      if (statement === MASTER_SQL) {
        assert.deepEqual(values, [actor.id], 'ownedPractitioner must use the same actor')
        if (queryFailure === 'practitioner') throw new Error('synthetic practitioner failure')
        return { rows: practitioners.filter(row => row.trusted_auth_user_id === values[0]).slice(0, 1) }
      }
      if (statement === SERVICE_SQL) {
        const owned = practitioners.find(row => row.trusted_auth_user_id === actor.id)
        assert.ok(owned, 'a service query requires an owned practitioner')
        assert.deepEqual(values, [owned.id], 'only the owned practitioner may supply service eligibility')
        if (queryFailure === 'service') throw new Error('synthetic service failure')
        return { rows: services.filter(row => row.practitioner_id === values[0] && ELIGIBLE.has(row.status))
          .slice(0, 1).map(row => ({ status: row.status })) }
      }
      throw new Error('Query outside activation whitelist: ' + statement)
    },
  }
  const bindings = {
    AppError, publicProfile, hasActivatedPractice,
    async transaction(...args) {
      transactions += 1
      assert.equal(args.length, 3, 'no server/moderator or permission override')
      assert.equal(args[0], config, 'preserve repository configuration identity')
      assert.equal(args[1], actor, 'preserve authenticated actor and claims identity')
      if (transactionError) throw transactionError
      return args[2](db)
    },
  }
  for (const name of ['randomUUID', 'onlyKeys', 'requireUUID', 'revision', 'text',
    'openSealed', 'operationHash', 'validateCredential', 'validateProfile',
    'validateServiceDraft', 'slugify', 'serviceCopy', 'summarizeServiceAnalytics',
    'getHobbyServiceQuota', 'assertOwnedReadyPresentation', 'listPublicServiceEnquiries',
    'updatePublicServiceEnquiry', 'torontoToday']) bindings[name] = forbidden(name)
  bindings.HOBBY_SERVICE_LIMIT = 10
  const { createPractitionerRepository } = evaluate(source, ['createPractitionerRepository'], bindings)
  const repository = createPractitionerRepository(config)
  return { repository, calls, get transactions() { return transactions }, run: () => repository.requireActivated(actor) }
}

const onboardingRequired = error => error.code === 'PRACTICE_ONBOARDING_REQUIRED' && error.status === 403
const accountRequired = error => error.code === 'ACCOUNT_REQUIRED' && error.status === 401
const guarded = (name, fn) => test(name, { skip: !hasGuard }, fn)

test('repository provides the historical activation method and pure-helper import', () => {
  assert.match(repositorySource, /^import \{ hasActivatedPractice \} from '\.\/practice-activation\.mjs'$/m)
  assert.equal(typeof fixture().repository.requireActivated, 'function')
})

guarded('normal activation preserves transaction, actor and exact owned query ordering', async () => {
  const f = fixture()
  assert.equal(await f.run(), true)
  assert.equal(f.transactions, 1)
  assert.deepEqual(f.calls.map(call => call.statement), [ACCOUNT_SQL, MASTER_SQL, SERVICE_SQL])
  assert.deepEqual(f.calls.map(call => call.values), [[ACTOR_A], [ACTOR_A], [MASTER_A]])
})

guarded('missing, inactive or unfinished accounts fail before any practitioner query', async () => {
  for (const account of [null,
    { id: ACTOR_A, status: 'suspended', onboarding_state: 'active' },
    { id: ACTOR_A, status: 'active', onboarding_state: 'pending' },
    { id: ACTOR_B, status: 'active', onboarding_state: 'active' }]) {
    const f = fixture({ account })
    await assert.rejects(f.run(), accountRequired)
    assert.deepEqual(f.calls.map(call => call.statement), [ACCOUNT_SQL])
  }
})

guarded('missing or foreign practitioner fails without reading services', async () => {
  for (const practitioners of [[], [profile('approved', { id: MASTER_B, trusted_auth_user_id: ACTOR_B })]]) {
    const f = fixture({ practitioners })
    await assert.rejects(f.run(), onboardingRequired)
    assert.deepEqual(f.calls.map(call => call.statement), [ACCOUNT_SQL, MASTER_SQL])
  }
})

guarded('approved legacy practitioner needs neither first service nor a new active-flag rule', async () => {
  for (const active of [undefined, true, false]) {
    const f = fixture({ practitioners: [profile('approved', { active, draft_profile: {} })], services: [] })
    assert.equal(await f.run(), true)
    assert.deepEqual(f.calls.map(call => call.statement), [ACCOUNT_SQL, MASTER_SQL])
  }
})

guarded('each historical submitted practitioner and first-service status is eligible', async () => {
  for (const status of ['submitted', 'changes_requested']) {
    for (const offeringStatus of ELIGIBLE) {
      const f = fixture({ practitioners: [profile(status)], services: [service(offeringStatus)] })
      assert.equal(await f.run(), true, status + '/' + offeringStatus)
    }
  }
})

guarded('draft, suspended, rejected, archived and unknown practitioners stay denied', async () => {
  for (const status of ['draft', 'suspended', 'rejected', 'archived', 'unknown']) {
    const f = fixture({ practitioners: [profile(status)] })
    await assert.rejects(f.run(), onboardingRequired)
  }
})

guarded('missing, blank and whitespace profile names cannot activate a new practitioner', async () => {
  for (const displayName of [undefined, '', '   ']) {
    const f = fixture({ practitioners: [profile('submitted', { draft_profile: { displayName } })] })
    await assert.rejects(f.run(), onboardingRequired)
  }
})

guarded('actual profile projection retains the historical public-name fallback', async () => {
  const f = fixture({ practitioners: [profile('submitted', {
    draft_profile: {}, public_profile: { displayName: 'Synthetic public name', unlistedKey: 'not needed' },
  })] })
  assert.equal(await f.run(), true)
})

guarded('absent, draft, suspended, archived or foreign services never unlock practice', async () => {
  for (const services of [[], [service('draft')], [service('suspended')], [service('archived')],
    [service('published', MASTER_B)], [service('draft'), service('submitted', MASTER_B)]]) {
    const f = fixture({ services })
    await assert.rejects(f.run(), onboardingRequired)
  }
})

guarded('foreign profiles and service rows cannot replace the authenticated owner', async () => {
  const f = fixture({ practitioners: [
    profile('approved', { id: MASTER_B, trusted_auth_user_id: ACTOR_B }), profile('submitted'),
  ], services: [service('published', MASTER_B), service('draft', MASTER_A)] })
  await assert.rejects(f.run(), onboardingRequired)
  assert.deepEqual(f.calls.at(-1).values, [MASTER_A])
})

guarded('transaction and query failures propagate instead of returning an allow result', async () => {
  const failure = new AppError('SIGN_IN_REQUIRED', 401)
  const tx = fixture({ transactionError: failure })
  await assert.rejects(tx.run(), error => error === failure)
  assert.equal(tx.calls.length, 0)
  for (const queryFailure of ['account', 'practitioner', 'service']) {
    const f = fixture({ queryFailure })
    await assert.rejects(f.run(), new RegExp('synthetic ' + queryFailure + ' failure'))
  }
})

guarded('query whitelist rejects missing ownership filters and any added client read', async () => {
  for (const source of [
    repositorySource.replace('where trusted_auth_user_id=$1', 'where true'),
    repositorySource.replace('where practitioner_id=$1 and status in', 'where true and status in'),
    repositorySource.replace('async requireActivated(actor){',
      "async requireActivated(actor){ await transaction(config,actor,db=>db.query('select * from app.consultation_requests',[]));"),
  ]) {
    assert.notEqual(source, repositorySource)
    await assert.rejects(fixture({ source }).run(), /Query outside activation whitelist/)
  }
})

guarded('historical helper denial is not bypassed by the repository wrapper', async () => {
  const source = repositorySource.replace('if(!hasActivatedPractice(practitionerView(p),submitted))', 'if(false)')
  assert.notEqual(source, repositorySource)
  const f = fixture({ source, practitioners: [profile('suspended')] })
  // This intentional source mutation must violate the real denied-state contract.
  await assert.rejects(async () => assert.rejects(f.run(), onboardingRequired), { code: 'ERR_ASSERTION' })
})
