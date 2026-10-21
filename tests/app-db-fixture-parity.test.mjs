import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { parse } from 'acorn'
import { assertIsolated } from './helpers/app-db-setup.mjs'
import * as contracts from '../lib/assessments/contracts.js'
import * as definitions from '../lib/assessments/definitions.js'
import * as trauma from '../lib/assessments/trauma-administration.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
// Execute the actual source guard with a synthetic query object, never a DB
// client. This is negative-contract evidence, not a claim of PostgreSQL/RLS proof.
function guard(path, name, globals = {}) {
  const source = read(path)
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
  const node = ast.body.map(item => item.declaration || item)
    .find(item => item.type === 'FunctionDeclaration' && item.id.name === name)
  assert.ok(node, 'Source function must remain independently identifiable: ' + name)
  // Preserve statements while relocating import.meta.url into this source-only VM.
  const body = source.slice(node.start, node.end)
    .replaceAll('import.meta.url', JSON.stringify(new URL('../' + path, import.meta.url).href))
  return vm.runInNewContext('(' + body + ')', { URL, ...globals })
}

test('isolated fixture rejects remote, ambiguous and non-test targets before connecting', async () => {
  let clients = 0
  class NoDatabaseClient {
    constructor() { clients++; throw new Error('A rejected target must not create a database client') }
  }
  const adminClient = guard('tests/helpers/app-db-setup.mjs', 'adminClient',
    { Client: NoDatabaseClient, assertIsolated })
  const setup = guard('tests/helpers/app-db-setup.mjs', 'setup', { adminClient })
  const keys = ['CI', 'HH_APP_TEST_RUNTIME', 'HH_TEST_ADMIN_DATABASE_URL', 'VERCEL']
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  const isolated = () => {
    process.env.CI = 'true'
    process.env.HH_APP_TEST_RUNTIME = 'isolated'
    process.env.HH_TEST_ADMIN_DATABASE_URL = 'postgres://127.0.0.1/hh_app_test'
    delete process.env.VERCEL
  }
  try {
    isolated()
    assert.equal(assertIsolated(), 'postgres://127.0.0.1/hh_app_test')
    for (const [key, value] of [
      ['CI', 'false'], ['HH_APP_TEST_RUNTIME', 'production'], ['VERCEL', '1'],
      ['HH_TEST_ADMIN_DATABASE_URL', 'postgres://remote.example.invalid/hh_app_test'],
      ['HH_TEST_ADMIN_DATABASE_URL', 'postgres://localhost/production'],
      ['HH_TEST_ADMIN_DATABASE_URL', 'postgres://127.0.0.1/postgres'],
      ['HH_TEST_ADMIN_DATABASE_URL', 'postgres://localhost/hh_app_test?host=remote.example.invalid'],
      ['HH_TEST_ADMIN_DATABASE_URL', 'postgres://localhost/hh_app_test#fragment'],
      ['HH_TEST_ADMIN_DATABASE_URL', 'http://localhost/hh_app_test'],
    ]) {
      isolated()
      process.env[key] = value
      assert.throws(assertIsolated, /Isolated loopback test database required/)
      await assert.rejects(setup, /Isolated loopback test database required/)
      assert.equal(clients, 0, 'No connection or SQL is possible before the isolation guard')
    }
  } finally {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key]
      else process.env[key] = before[key]
    }
  }
})

test('fixture refuses a nonempty database before loading schema or creating roles', async () => {
  const queries = []
  let ended = false
  const setup = guard('tests/helpers/app-db-setup.mjs', 'setup', {
    adminClient: async () => ({
      query: async sql => { queries.push(sql); return { rows: [{ present: 'app.accounts' }] } },
      end: async () => { ended = true },
    }),
  })
  await assert.rejects(setup, /Refusing to initialize nonempty test DB/)
  assert.deepEqual(queries, ["select to_regclass('app.accounts') as present"])
  assert.equal(ended, true)
})

test('fixture initializes exact canonical session and engagement SQL before housekeeping', async () => {
  const sessionPath = 'sql/client-delivery-sessions-20261015.sql'
  const engagementPath = 'supabase/migrations/20261020192118_hh_report_engagement_opt_in_20261020.sql'
  const sessionSql = read(sessionPath), engagementSql = read(engagementPath)
  const queries = [], reads = []
  let ended = false
  const noSeed = async () => {}
  const setup = guard('tests/helpers/app-db-setup.mjs', 'setup', {
    adminClient: async () => ({
      query: async sql => { queries.push(sql); return { rows: [{ present: null }] } },
      end: async () => { ended = true },
    }),
    readFile: async (url, encoding) => {
      assert.equal(encoding, 'utf8')
      const path = [sessionPath, engagementPath].find(path => url.pathname.endsWith('/' + path))
      reads.push(path)
      return readFileSync(url, encoding)
    },
    seedApp: noSeed, seedEightIpipTestVersions: noSeed, seedTraumaTestVersions: noSeed,
    seedHhSplitTestVersions: noSeed, seedBachV2TestVersions: noSeed,
    seedProfessionalAdditionTestVersions: noSeed, A: 'synthetic-a', B: 'synthetic-b',
    SA: 'synthetic-session-a', SB: 'synthetic-session-b',
  })
  await setup()
  assert.equal(ended, true)
  assert.deepEqual(reads.filter(Boolean), [sessionPath, engagementPath])
  for (const sql of [sessionSql, engagementSql]) assert.equal(queries.filter(query => query === sql).length, 1)
  const storage = queries.indexOf('create schema if not exists storage')
  const sessions = queries.indexOf(sessionSql), engagement = queries.indexOf(engagementSql)
  const actors = queries.findIndex(sql => sql.startsWith('insert into auth.users'))
  assert.ok(storage > 0 && storage < sessions && sessions < engagement && engagement < actors)
  const serviceRole = queries.find(sql => sql.startsWith('create role service_role'))
  assert.equal(serviceRole,
    'create role service_role nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls')
  assert.ok(sessions < queries.indexOf(serviceRole) && queries.indexOf(serviceRole) < engagement)
  assert.doesNotMatch(queries.join('\n'), /grant[^;]*\bto\s+service_role\b|grant\s+service_role\b/i)
  assert.doesNotMatch(read('tests/app-database.integration.mjs'), /readFile\([^\n]*client-delivery-sessions-20261015\.sql/)
  assert.match(read('tests/app-database.integration.mjs'), /before\(async \(\) => \{\s*await setup\(\)/)
  assert.match(read('lib/app/maintenance.js'), /from app_private\.client_session_engagement_events/)
  assert.match(read('lib/app/maintenance.js'), /from app_private\.client_session_viewer_sessions/)
  for (const table of ['client_session_engagement_consents', 'client_session_engagement_events']) {
    for (const mode of ['enable', 'force'])
      assert.ok(engagementSql.includes('alter table app_private.' + table + ' ' + mode + ' row level security;'))
    assert.ok(engagementSql.includes('revoke all on app_private.' + table + ' from public,anon,authenticated,service_role;'))
    assert.ok(engagementSql.includes('grant select,insert,update,delete on app_private.' + table + ' to hh_app_backend;'))
  }
  assert.match(engagementSql, /viewer_id uuid primary key references app_private\.client_session_viewer_sessions\(id\) on delete cascade/)
  assert.match(engagementSql, /grant_id uuid not null references app_private\.client_session_share_grants\(id\) on delete cascade/)
  assert.match(engagementSql, /constraint hh_session_engagement_duration_check check/)
  assert.match(engagementSql, /create unique index if not exists hh_session_engagement_one_minute/)
  assert.doesNotMatch(engagementSql, /disable row level security|grant all/i)
})

test('fixture loads existing messaging dependencies with their owner/participant RLS intact', () => {
  const setup = read('tests/helpers/app-db-setup.mjs')
  const files = [
    ['20261019121144_hh_practitioner_request_messages_20261019.sql', 'practitioner_request_messages'],
    ['20261019152000_hh_public_service_enquiries_secure.sql', 'public_service_enquiries'],
    ['20261019174312_hh_practitioner_request_read_state_20261019.sql', 'practitioner_request_reads'],
    ['20261020123209_hh_practitioner_request_followup_tasks_20261020.sql', 'practitioner_request_tasks'],
  ]
  for (const [file, table] of files) {
    assert.ok(setup.includes(file), file)
    const sql = read('supabase/migrations/' + file)
    assert.match(sql, new RegExp('alter table app\\.' + table + ' (enable|force) row level security', 'i'))
    assert.match(sql, /force row level security/i)
    assert.match(sql, /revoke all .*from public,\s*anon,\s*authenticated/i)
    assert.match(sql, /trusted_auth_user_id=\(select auth\.uid\(\)\)/i)
    assert.match(sql, /app_private\.account_active\(\)/)
    assert.doesNotMatch(sql, /disable row level security|using\s*\(\s*true\s*\)|grant all/i)
  }
  const optin = '20261019180000_hh_client_message_push_optin.sql'
  assert.ok(setup.includes(optin))
  assert.match(read('supabase/migrations/' + optin), /message_alerts boolean not null default false/)
  assert.match(read('supabase/migrations/' + optin), /pref\.enabled=true and pref\.message_alerts=true/)
  assert.ok(setup.indexOf('Refusing to initialize nonempty test DB') < setup.indexOf(files[0][0]))
})

test('article ownership guard still rejects inactive, unconsented and non-practitioner accounts', async () => {
  const own = guard('lib/practitioners/article-repository.js', 'own', { AppError: contracts.AppError })
  const actor = { id: '10000000-0000-4000-8000-000000000003' }
  for (const account of [undefined, { status: 'inactive', onboarding_state: 'active' }, { status: 'active', onboarding_state: 'pending' }]) {
    let queries = 0
    await assert.rejects(() => own({ query: async () => { queries++; return { rows: account ? [account] : [] } } }, actor),
      { code: 'ACCOUNT_REQUIRED' })
    assert.equal(queries, 1, 'Account/consent guard must stop before querying practitioner ownership')
  }
  const queries = []
  const db = { query: async (sql, values) => {
    queries.push({ sql, values })
    return { rows: sql.includes('app.accounts') ? [{ status: 'active', onboarding_state: 'active' }] : [] }
  } }
  await assert.rejects(() => own(db, actor), { code: 'PRACTITIONER_REQUIRED' })
  assert.match(queries[1].sql, /where trusted_auth_user_id=\$1/)
  assert.equal(queries[1].values[0], actor.id, 'Another practitioner is never substituted')
})

test('instrument guard still rejects absent, wrong-hash and wrong-definition registry entries', async () => {
  const definition = definitions.getAssessmentDefinition('ipip-emotion-decision-making-9', 'v1', 'en')
  const check = guard('lib/app/repository.js', 'definitionChecked', { ...contracts, ...definitions, ...trauma })
  const exact = { content_hash: definition.contentHash, definition }
  for (const row of [
    undefined,
    { ...exact, content_hash: 'sha256:' + '0'.repeat(64) },
    { ...exact, definition: { ...definition, title: 'Synthetic stale fixture' } },
  ]) {
    const db = { query: async (sql, values) => {
      assert.match(sql, /app\.assessment_versions where id=\$1/)
      assert.equal(values[0], definition.id)
      return { rows: row ? [row] : [] }
    } }
    await assert.rejects(() => check(db, definition.id), { code: 'INSTRUMENT_UNAVAILABLE' })
  }
  assert.equal(await check({ query: async () => ({ rows: [exact] }) }, definition.id), definition)
  const lockedTrauma = definitions.getAssessmentDefinition('pcl-5', 'v1', 'en')
  const releaseBlocked = guard('lib/app/repository.js', 'definitionChecked',
    { ...contracts, ...definitions, ...trauma, TRAUMA_SCREENING_RELEASED: false })
  await assert.rejects(() => releaseBlocked({ query: async () => ({ rows: [
    { content_hash: lockedTrauma.contentHash, definition: lockedTrauma },
  ] }) }, lockedTrauma.id), { code: 'INSTRUMENT_UNAVAILABLE' })
})
