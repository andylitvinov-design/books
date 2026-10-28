import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import {
  assertIsolatedDatabaseEnvironment, isolatedAdminConnection,
  assertFreshIsolatedFixture, ISOLATED_SCHEMA_DEPENDENCIES, monitoringRegistryDiagnostic,
} from './helpers/app-db-fixture-policy.mjs'

const environment = () => ({
  CI: 'true', NODE_ENV: 'test', HH_APP_TEST_RUNTIME: 'isolated',
  HH_TEST_ADMIN_DATABASE_URL: 'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test',
  HH_APP_DATABASE_URL: 'postgres://hh_app_ci_login:synthetic-ci-only@127.0.0.1:5432/hh_app_test',
})
const identity = () => ({ name: 'hh_app_test', role: 'postgres', version: 170006 })
const empty = () => ({ schemas: false, relations: false, routines: false, types: false,
  roles: false, databases: false, extensions: false, eventTriggers: false })
const denied = /Fresh dedicated synthetic loopback hh_app_test database required/
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8')

test('isolated guards accept only the current test/development fixture and pin the admin transport', () => {
  for (const NODE_ENV of ['test', 'development']) {
    const env = { ...environment(), NODE_ENV, PGHOST: 'not-a-fixture.invalid', PGDATABASE: 'not_the_test_database', PGSSLMODE: 'require' }
    assert.equal(assertIsolatedDatabaseEnvironment(env), env.HH_TEST_ADMIN_DATABASE_URL)
    const config = isolatedAdminConnection(env)
    assert.equal(config.host, '127.0.0.1')
    assert.equal(config.database, 'hh_app_test')
    assert.equal(config.user, 'postgres')
    assert.equal(config.password, 'synthetic-ci-admin')
    assert.equal(config.ssl, false)
    assert.equal(config.port, 5432)
    assert.equal(config.connectionString, undefined)
  }
  const env = environment()
  env.HH_TEST_ADMIN_DATABASE_URL = env.HH_TEST_ADMIN_DATABASE_URL.replace('127.0.0.1:5432', 'localhost:5439')
  env.HH_APP_DATABASE_URL = env.HH_APP_DATABASE_URL.replace('5432', '5439')
  assert.equal(isolatedAdminConnection(env).port, 5439)
})

for (const [name, change] of [
  ['missing CI opt-in', env => { delete env.CI }],
  ['missing isolated opt-in', env => { delete env.HH_APP_TEST_RUNTIME }],
  ['production runtime', env => { env.NODE_ENV = 'production' }],
  ['deployment runtime', env => { env.VERCEL = '1' }],
  ['deployment environment', env => { env.VERCEL_ENV = 'preview' }],
  ['inherited session options', env => { env.PGOPTIONS = '-c search_path=untrusted' }],
  ['inherited replication mode', env => { env.PGREPLICATION = 'database' }],
  ['inherited client encoding', env => { env.PGCLIENT_ENCODING = 'SQL_ASCII' }],
  ['missing admin URL', env => { delete env.HH_TEST_ADMIN_DATABASE_URL }],
  ['missing app URL', env => { delete env.HH_APP_DATABASE_URL }],
  ['malformed URL', env => { env.HH_TEST_ADMIN_DATABASE_URL = 'not a URL' }],
  ['non-Postgres URL', env => { env.HH_TEST_ADMIN_DATABASE_URL = env.HH_TEST_ADMIN_DATABASE_URL.replace('postgres:', 'https:') }],
  ['remote admin host', env => { env.HH_TEST_ADMIN_DATABASE_URL = env.HH_TEST_ADMIN_DATABASE_URL.replace('127.0.0.1', 'database.example.invalid') }],
  ['remote app host', env => { env.HH_APP_DATABASE_URL = env.HH_APP_DATABASE_URL.replace('127.0.0.1', 'database.example.invalid') }],
  ['ambiguous localhost app listener', env => { env.HH_APP_DATABASE_URL = env.HH_APP_DATABASE_URL.replace('127.0.0.1', 'localhost') }],
  ['lookalike loopback host', env => { env.HH_TEST_ADMIN_DATABASE_URL = env.HH_TEST_ADMIN_DATABASE_URL.replace('127.0.0.1', 'localhost.example.invalid') }],
  ['different admin database', env => { env.HH_TEST_ADMIN_DATABASE_URL = env.HH_TEST_ADMIN_DATABASE_URL.replace('hh_app_test', 'postgres') }],
  ['different app database', env => { env.HH_APP_DATABASE_URL = env.HH_APP_DATABASE_URL.replace('hh_app_test', 'postgres') }],
  ['admin host query override', env => { env.HH_TEST_ADMIN_DATABASE_URL += '?host=database.example.invalid' }],
  ['app database query override', env => { env.HH_APP_DATABASE_URL += '?database=postgres' }],
  ['URL fragment', env => { env.HH_TEST_ADMIN_DATABASE_URL += '#not-a-fixture' }],
  ['different admin identity', env => { env.HH_TEST_ADMIN_DATABASE_URL = env.HH_TEST_ADMIN_DATABASE_URL.replace('//postgres:', '//other:') }],
  ['non-synthetic admin credential', env => { env.HH_TEST_ADMIN_DATABASE_URL = env.HH_TEST_ADMIN_DATABASE_URL.replace('synthetic-ci-admin', 'different') }],
  ['different app identity', env => { env.HH_APP_DATABASE_URL = env.HH_APP_DATABASE_URL.replace('hh_app_ci_login', 'postgres') }],
  ['non-synthetic app credential', env => { env.HH_APP_DATABASE_URL = env.HH_APP_DATABASE_URL.replace('synthetic-ci-only', 'different') }],
  ['different app port', env => { env.HH_APP_DATABASE_URL = env.HH_APP_DATABASE_URL.replace('5432', '5433') }],
]) {
  test('isolated guard rejects ' + name + ' without creating any client', () => {
    const env = environment()
    change(env)
    assert.throws(() => assertIsolatedDatabaseEnvironment(env), denied)
    assert.throws(() => isolatedAdminConnection(env), denied)
  })
}

test('fresh-service proof rejects wrong identity, wrong PostgreSQL version and any shared state', () => {
  assert.doesNotThrow(() => assertFreshIsolatedFixture(identity(), empty()))
  for (const changed of [
    { name: 'postgres' }, { role: 'application' }, { version: 160000 },
    { version: 180000 }, { version: '170006' }, { version: undefined },
  ]) assert.throws(() => assertFreshIsolatedFixture({ ...identity(), ...changed }, empty()), denied)
  for (const key of Object.keys(empty())) {
    assert.throws(() => assertFreshIsolatedFixture(identity(), { ...empty(), [key]: true }), denied)
    const incomplete = empty()
    delete incomplete[key]
    assert.throws(() => assertFreshIsolatedFixture(identity(), incomplete), denied)
  }
  assert.throws(() => assertFreshIsolatedFixture(undefined, empty()), denied)
})

test('dependency closure uses only fifteen existing sources in prerequisite order', async () => {
  assert.equal(Object.isFrozen(ISOLATED_SCHEMA_DEPENDENCIES), true)
  assert.equal(new Set(ISOLATED_SCHEMA_DEPENDENCIES).size, 15)
  const pathOf = part => ISOLATED_SCHEMA_DEPENDENCIES.find(path => path.includes(part))
  const before = (earlier, later) => {
    assert.ok(pathOf(earlier), earlier)
    assert.ok(pathOf(later), later)
    assert.ok(ISOLATED_SCHEMA_DEPENDENCIES.indexOf(pathOf(earlier)) < ISOLATED_SCHEMA_DEPENDENCIES.indexOf(pathOf(later)))
  }
  before('request_messages_', 'client_message_push_optin')
  before('client-delivery-sessions-', 'private-pdfs-')
  before('private-pdfs-', 'report_engagement_opt_in')
  for (const required of ['public_service_enquiries_secure', 'request_read_state_', 'request_followup_tasks_'])
    assert.ok(pathOf(required), required)
  assert.equal(ISOLATED_SCHEMA_DEPENDENCIES.some(path => /assessment|registry|verify-app-r1|seed/.test(path)), false)
  for (const path of ISOLATED_SCHEMA_DEPENDENCIES) {
    const sql = (await read(path)).replace(/--[^\n]*/g, '')
    assert.doesNotMatch(sql, /\b(?:pg_net|dblink|http_get|http_post|cron)\b/i, path)
    assert.doesNotMatch(sql, /\b(?:create|alter|drop)\s+(?:extension|role|user)\b/i, path)
    assert.doesNotMatch(sql, /\bgrant\s+[a-z_][a-z0-9_]*\s+to\s+[a-z_]/i, path)
  }
  const optin = await read(pathOf('client_message_push_optin'))
  assert.match(optin, /message_alerts boolean not null default false/)
  assert.match(optin, /security definer\s+set search_path = ''/i)
  assert.match(optin, /revoke all on function app_private\.client_message_push_targets\(uuid\) from anon,authenticated/i)
})

test('bootstrap validates both connections and fresh service before roles or schema writes', async () => {
  const setup = await read('tests/helpers/app-db-setup.mjs')
  assert.match(setup, /new Client\(isolatedAdminConnection\(process\.env\)\)/)
  const guarded = setup.indexOf('assertFreshIsolatedFixture(identity,occupied)')
  const firstRole = setup.indexOf('create role anon')
  assert.ok(guarded > setup.indexOf('const occupied=') && guarded < firstRole)
  assert.ok(setup.includes("nspname !~ '^pg_temp_[0-9]+$'"))
  assert.ok(setup.includes("nspname !~ '^pg_toast_temp_[0-9]+$'"))
  assert.ok(setup.includes("rolname !~ '^pg_'"))
  for (const catalog of ['pg_proc', 'pg_type', 'pg_extension', 'pg_event_trigger'])
    assert.ok(setup.indexOf(catalog) < guarded && setup.indexOf(catalog) > 0, catalog)
  assert.match(setup, /create role service_role nologin noinherit nosuperuser nobypassrls nocreatedb nocreaterole noreplication/)
  assert.doesNotMatch(setup, /grant[^;\n]+to service_role/i)
  const storage = setup.indexOf("await db.query('create schema storage")
  const dependencies = setup.indexOf('for(const path of ISOLATED_SCHEMA_DEPENDENCIES)')
  const login = setup.indexOf('create role hh_app_ci_login')
  assert.ok(storage > firstRole && storage < dependencies && dependencies < login)
  assert.match(setup, /for\(const path of ISOLATED_SCHEMA_DEPENDENCIES\)\{\s+assertIsolated\(\)\s+await db\.query/)
  assert.doesNotMatch(setup, /professional-additions|ADDITIONAL_PROFESSIONAL/)
})

test('session integration keeps ownership/private-bucket assertions without late duplicate DDL', async () => {
  const suite = await read('tests/app-database.integration.mjs')
  const session = suite.slice(suite.indexOf("test('private session share grants"), suite.indexOf("test('an explicitly selected Session"))
  assert.match(session, /assert\.equal\(bucket\.public,false\)/)
  assert.match(session, /e=>e\.code==='23503'/)
  assert.match(session, /client_delivery_assets_asset_kind_check/)
  assert.doesNotMatch(session, /readFile|create schema|create table|db\.query\(sql\)/)
  assert.match(suite, /if \(error\?\.code !== 'INSTRUMENT_UNAVAILABLE'\) throw error/)
  assert.match(suite, /assert\.fail\(monitoringRegistryDiagnostic\(definition\)\)/)
})

test('registry diagnostic exposes only instrument key/version/locale and does not mask missing registration', () => {
  const marker = 'MUST_NOT_APPEAR'
  const message = monitoringRegistryDiagnostic({
    key: 'synthetic-instrument', version: 'v1', instrumentLocale: 'en',
    answers: marker, context: marker, accountId: marker, contentHash: marker, databaseUrl: marker,
  })
  assert.equal(message, 'Monitoring registry unavailable: {"key":"synthetic-instrument","version":"v1","locale":"en"}')
  assert.equal(message.includes(marker), false)
})

test('database CI runs pure fixture safety tests before the existing integration command', async () => {
  const workflow = await read('.github/workflows/hh-app-r1.yml')
  const databaseJob = workflow.slice(workflow.indexOf('  database:\n'))
  const safety = databaseJob.indexOf('run: node --test tests/app-db-fixture-policy.test.mjs')
  const integration = databaseJob.indexOf('run: npm run test:app:db')
  assert.ok(safety > 0 && safety < integration)
  assert.match(databaseJob, /image: postgres:17-alpine/)
  assert.match(databaseJob, /HH_APP_TEST_RUNTIME: isolated/)
})

test('read-path closure retains the original eight and exactly seven unchanged schema sources', async () => {
  const original = [
    "supabase/migrations/20261019121144_hh_practitioner_request_messages_20261019.sql",
    "supabase/migrations/20261019152000_hh_public_service_enquiries_secure.sql",
    "supabase/migrations/20261019174312_hh_practitioner_request_read_state_20261019.sql",
    "supabase/migrations/20261019180000_hh_client_message_push_optin.sql",
    "supabase/migrations/20261020123209_hh_practitioner_request_followup_tasks_20261020.sql",
    "sql/client-delivery-sessions-20261015.sql",
    "sql/client-delivery-session-private-pdfs-20261015.sql",
    "supabase/migrations/20261020192118_hh_report_engagement_opt_in_20261020.sql"
  ]
  const readSchemas = [
    {
      "path": "supabase/migrations/20261017181000_hh_academy_energywork_progress.sql",
      "sha": "f7c8ec677d6102be649ebd6161333d048941219d"
    },
    {
      "path": "supabase/migrations/20261018184658_hh_reiki_course_private_crm_leads_20261018.sql",
      "sha": "a5ff2a3422a0af2aa7b94b32983947d35a9da7a2"
    },
    {
      "path": "supabase/migrations/20261019030943_hh_reiki_course_public_reviews_20261019.sql",
      "sha": "33f2a9cb6dbbd84601105882e0134699730d73ec"
    },
    {
      "path": "supabase/migrations/20261025173000_hh_practitioner_express_reports.sql",
      "sha": "5d87a12e0eb62cf7d80fc1198e19f0d7d7f69299"
    },
    {
      "path": "supabase/migrations/20261026133321_hh_free_express_guest_continuation_rls_20261025.sql",
      "sha": "5e565c87495b7d34ad0c6872c7fad82357cd2ab1"
    },
    {
      "path": "supabase/migrations/20261026164817_hh_free_express_owner_account_reply_20261026.sql",
      "sha": "d14756fdb7318d569c874cf0664202e5d9790122"
    },
    {
      "path": "supabase/migrations/20261021162000_hh_practitioner_course_builder.sql",
      "sha": "97102d50aff61a910eafb7a5b60b845ce5de9eb1"
    }
  ]
  // This is a bounded source-wiring test, not proof of live PostgreSQL behavior.
  // No Academy enrollment/resume, express create/send, CRM or Telegram delivery closure.
  assert.deepEqual(ISOLATED_SCHEMA_DEPENDENCIES, [
    ...original, ...readSchemas.map(source => source.path),
  ])
  const before = (earlier, later) => {
    const first = ISOLATED_SCHEMA_DEPENDENCIES.findIndex(path => path.includes(earlier))
    const last = ISOLATED_SCHEMA_DEPENDENCIES.findIndex(path => path.includes(later))
    assert.ok(first >= 0 && last > first, earlier + ' before ' + later)
  }
  before('public_service_enquiries_secure', 'free_express_guest_continuation_rls')
  before('free_express_guest_continuation_rls', 'free_express_owner_account_reply')
  before('academy_energywork_progress', 'reiki_course_private_crm_leads')
  before('reiki_course_private_crm_leads', 'reiki_course_public_reviews')
  assert.equal(readSchemas.some(({ path }) =>
    /claimed_enquiry_delivery|client_telegram|messenger_pending|crm_owner|assessment|registry|seed|proposed/i.test(path)), false)
  for (const { path, sha } of readSchemas) {
    const source = await readFile(new URL('../' + path, import.meta.url))
    const actual = createHash('sha1').update('blob ' + source.length + '\0').update(source).digest('hex')
    // Pins include every byte: never strip proposal sentinels, policies or grants.
    assert.equal(actual, sha, 'Unchanged reviewed SQL source required: ' + path)
  }
  const setup = await read('tests/helpers/app-db-setup.mjs')
  assert.ok(setup.includes(
    "for(const path of ISOLATED_SCHEMA_DEPENDENCIES){\n" +
    "   assertIsolated()\n" +
    "   await db.query(await readFile(new URL('../../'+path,import.meta.url),'utf8'))\n" +
    " }"), 'Guarded setup executes the unchanged files in explicit list order')
})


test('learning-journey course reads use the existing restricted schema and local Storage double', async () => {
  const journey = await read('lib/app/learning-journey-repository.js')
  // Read source only: never import the database repository in this pure suite.
  assert.match(journey, /return transaction\(config, actor, async db =>/)
  assert.match(journey, /app\.practitioner_courses c[\s\S]*as authored_draft/)
  assert.match(journey, /app\.practitioner_courses c[\s\S]*as authored_published/)
  assert.deepEqual([...new Set([...journey.matchAll(/\b(?:from|join)\s+(app(?:_private)?\.[a-z_]+)/g)].map(match => match[1]))].sort(), [
    'app.accounts', 'app.assessment_results', 'app.consultation_requests',
    'app.practitioner_courses', 'app.practitioners', 'app.service_offerings',
    'app_private.academy_course_progress',
  ])
  const path = 'supabase/migrations/20261021162000_hh_practitioner_course_builder.sql'
  assert.equal(ISOLATED_SCHEMA_DEPENDENCIES.at(-1), path)
  const sql = await read(path)
  assert.match(sql, /create table if not exists app\.practitioner_courses/)
  assert.match(sql, /create table if not exists app\.practitioner_course_assets/)
  for (const table of ['practitioner_courses', 'practitioner_course_assets'])
    assert.ok(sql.includes('alter table app.' + table + ' enable row level security;'))
  assert.match(sql, /revoke all on app\.practitioner_courses,app\.practitioner_course_assets from public,anon,authenticated;/)
  assert.match(sql, /p\.trusted_auth_user_id=\(select auth\.uid\(\)\)/)
  assert.match(sql, /and \(select app_private\.account_active\(\)\)/)
  assert.match(sql, /values\('hh-practitioner-course-media','hh-practitioner-course-media',false,25000000,/)
  assert.match(sql, /on conflict \(id\) do nothing;/)
  assert.doesNotMatch(sql, /storage\.objects|create\s+(?:role|extension)/i)
  const setup = await read('tests/helpers/app-db-setup.mjs')
  const loop = setup.indexOf('for(const path of ISOLATED_SCHEMA_DEPENDENCIES)')
  for (const prerequisite of [
    'create function auth.uid()', '20261002164037_hh_app_r1_foundation.sql',
    '20261005164140_hh_master_network_r2.sql',
    'create schema storage;create table storage.buckets',
  ]) assert.ok(setup.indexOf(prerequisite) >= 0 && setup.indexOf(prerequisite) < loop, prerequisite)
  const foundation = await read('supabase/migrations/20261002164037_hh_app_r1_foundation.sql')
  assert.match(foundation, /create table app\.practitioners\(/)
  assert.match(foundation, /create function app_private\.account_active\(\)/)
  assert.match(foundation, /create role hh_app_backend nologin nobypassrls/)
  const network = await read('supabase/migrations/20261005164140_hh_master_network_r2.sql')
  assert.match(network, /alter table app\.practitioners[\s\S]*add column if not exists status/)
})
