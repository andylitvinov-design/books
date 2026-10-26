import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { ADDITIONAL_PROFESSIONAL_DEFINITIONS } from '../data/assessments/professional-additions-2026.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { isolatedAdminConnection } from './helpers/app-db-fixture-policy.mjs'
import { fourIpipFixtureRows, seedFourIpipTestVersions } from './helpers/seed-four-ipip-versions.mjs'

const environment = () => ({
  CI: 'true', NODE_ENV: 'test', HH_APP_TEST_RUNTIME: 'isolated',
  HH_TEST_ADMIN_DATABASE_URL: 'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test',
  HH_APP_DATABASE_URL: 'postgres://hh_app_ci_login:synthetic-ci-only@127.0.0.1:5432/hh_app_test',
})
const freshFields = ['schemas', 'relations', 'routines', 'types', 'roles', 'databases', 'extensions', 'eventTriggers']
const clone = value => JSON.parse(JSON.stringify(value))
const digest = value => 'sha256:' + createHash('sha256').update(canonicalJSON(value)).digest('hex')
const jsonColumns = new Set(['definition', 'questions', 'answer_schema', 'result_schema', 'source_metadata'])
const expectedKeys = ['ipip-emotion-decision-making-9', 'ipip-responsive-joy-10',
  'ipip-responsive-distress-10', 'ipip-empathic-concern-10']

// A finite query recorder only. No pg dependency, connection or SQL interpreter.
function fixtureDatabase(options = {}) {
  const calls = [], staged = new Map(), committed = new Map()
  const existing = options.existing || []
  let insertCount = 0, readbackCount = 0
  const db = {
    connectionParameters: isolatedAdminConnection(environment()),
    async query(sql, values) {
      calls.push({ sql, values })
      if (sql === 'begin') return { rows: [] }
      if (sql === 'rollback') { staged.clear(); return { rows: [] } }
      if (sql === 'commit') {
        for (const [id, row] of staged) committed.set(id, row)
        staged.clear()
        return { rows: [] }
      }
      if (sql.startsWith('select id from app.assessment_versions')) {
        assert.match(sql, /id=\$1 or content_hash=\$2/)
        assert.match(sql, /definition_key=\$3 and definition_version=\$4 and instrument_locale=\$5 and translation_version=\$6/)
        const [id, content_hash, definition_key, definition_version, instrument_locale, translation_version] = values
        return { rows: existing.filter(row => row.id === id || row.content_hash === content_hash ||
          (row.definition_key === definition_key && row.definition_version === definition_version &&
           row.instrument_locale === instrument_locale && row.translation_version === translation_version)) }
      }
      if (sql.startsWith('insert into app.assessment_versions')) {
        assert.doesNotMatch(sql, /on conflict|update|delete|ignore/i)
        insertCount++
        if (insertCount === options.failInsert) throw Object.assign(new Error('Synthetic conflict'), { code: '23505' })
        const columns = sql.match(/\(([^)]+)\) values/)[1].split(',')
        assert.equal(columns.length, 15)
        assert.equal(values.length, 15)
        const row = Object.fromEntries(columns.map((key, index) => [
          key, jsonColumns.has(key) ? JSON.parse(values[index]) : values[index],
        ]))
        staged.set(row.id, row)
        return { rows: [] }
      }
      if (sql === 'select * from app.assessment_versions where id=$1') {
        readbackCount++
        if (readbackCount === options.missingReadback) return { rows: [] }
        const row = clone(staged.get(values[0]))
        if (readbackCount === options.corruptReadback) row.source_metadata.permission = 'not the reviewed source'
        return { rows: [{ ...row, published_at: '2026-10-24T00:00:00.000Z' }] }
      }
      throw new Error('Unexpected query in pure fixture recorder')
    },
  }
  const fixture = {
    client: db, identity: { name: 'hh_app_test', role: 'postgres', version: 170006 },
    occupied: Object.fromEntries(freshFields.map(key => [key, false])),
  }
  return { db, fixture, calls, staged, committed }
}

test('exact four source-derived rows match the complete reviewed registration contract; ONS remains excluded', () => {
  const rows = fourIpipFixtureRows()
  assert.deepEqual(rows.map(row => row.definition_key), expectedKeys)
  assert.equal(ADDITIONAL_PROFESSIONAL_DEFINITIONS.some(d => d.key === 'ons-personal-wellbeing-4'), true)
  assert.equal(rows.some(row => row.definition_key === 'ons-personal-wellbeing-4'), false)
  assert.equal(digest(rows), 'sha256:e6b562c4b0b7aa0b6353bcf122dec36853d9df5868c0fe3f01c6b68e9ee011e9')
  for (const row of rows) {
    const definition = ADDITIONAL_PROFESSIONAL_DEFINITIONS.find(d => d.key === row.definition_key)
    assert.equal(Object.keys(row).length, 15)
    assert.deepEqual(row.definition, definition)
    assert.deepEqual(row.questions, definition.questions)
    assert.deepEqual(row.source_metadata, definition.source)
    assert.deepEqual(row.answer_schema, { type: 'integer', minimum: 1, maximum: 5 })
    assert.equal(row.status, 'published')
    assert.equal(Object.hasOwn(row, 'published_at'), false, 'database default is not an insert value')
    assert.equal(Object.isFrozen(row), true)
  }
})

for (const [name, change] of [
  ['missing reviewed definition', definitions => { definitions.splice(0, 1) }],
  ['duplicate reviewed definition', definitions => { definitions.push(clone(definitions[0])) }],
  ['different ID', definitions => { definitions[0].id = '00000000-0000-4000-8000-000000000001' }],
  ['different version', definitions => { definitions[0].version = 'v2' }],
  ['different locale', definitions => { definitions[0].instrumentLocale = 'ru' }],
  ['changed limited hash', definitions => { definitions[0].contentHash = 'sha256:' + '0'.repeat(64) }],
  ['changed source metadata with unchanged limited hash', definitions => { definitions[0].source.permission += ' modified' }],
  ['changed scoring with unchanged limited hash', definitions => { definitions[0].scoring.dimensions[0].reverseItems.pop() }],
  ['changed item text', definitions => { definitions[0].questions[0].text += ' modified' }],
]) test('row mapping rejects ' + name, () => {
  const definitions = clone(ADDITIONAL_PROFESSIONAL_DEFINITIONS)
  change(definitions)
  assert.throws(() => fourIpipFixtureRows(definitions), /FOUR_IPIP_FIXTURE_(SOURCE|DEFINITION|LIMITED_HASH|ROW)_MISMATCH/)
})

test('helper inserts exactly four parameterized rows after all conflict checks and verifies all submitted fields', async () => {
  const state = fixtureDatabase()
  await seedFourIpipTestVersions(state.db, state.fixture, environment())
  assert.equal(state.calls[0].sql, 'begin')
  assert.equal(state.calls.at(-1).sql, 'commit')
  const firstInsert = state.calls.findIndex(call => call.sql.startsWith('insert'))
  assert.equal(firstInsert, 5, 'all four collision checks must precede the first insert')
  assert.equal(state.calls.filter(call => call.sql.startsWith('insert')).length, 4)
  assert.equal(state.calls.filter(call => call.sql.startsWith('select *')).length, 4)
  assert.deepEqual([...state.committed.values()], fourIpipFixtureRows())
  assert.equal(state.staged.size, 0)
  assert.equal(state.calls.some(call => /ons-personal-wellbeing-4/.test(JSON.stringify(call))), false)
})

for (const collision of ['id', 'content_hash', 'tuple', 'identical']) test('strict insert-only fixture rolls back on ' + collision + ' conflict', async () => {
  const target = fourIpipFixtureRows()[2]
  let row = { id: 'synthetic-other', content_hash: 'synthetic-other', definition_key: 'other' }
  if (collision === 'id') row.id = target.id
  if (collision === 'content_hash') row.content_hash = target.content_hash
  if (collision === 'tuple') for (const key of ['definition_key', 'definition_version', 'instrument_locale', 'translation_version']) row[key] = target[key]
  if (collision === 'identical') row = clone(target)
  const state = fixtureDatabase({ existing: [row] })
  await assert.rejects(seedFourIpipTestVersions(state.db, state.fixture, environment()), /FOUR_IPIP_FIXTURE_CONFLICT/)
  assert.equal(state.calls.at(-1).sql, 'rollback')
  assert.equal(state.calls.some(call => call.sql.startsWith('insert')), false)
  assert.equal(state.committed.size, 0)
})

for (const options of [{ failInsert: 3 }, { corruptReadback: 2 }, { missingReadback: 1 }])
  test('partial insert/readback failure remains atomic: ' + JSON.stringify(options), async () => {
    const state = fixtureDatabase(options)
    await assert.rejects(seedFourIpipTestVersions(state.db, state.fixture, environment()))
    assert.equal(state.calls.at(-1).sql, 'rollback')
    assert.equal(state.committed.size, 0)
    assert.equal(state.staged.size, 0)
  })

for (const [name, change] of [
  ['missing CI', env => { delete env.CI }],
  ['missing isolated mode', env => { delete env.HH_APP_TEST_RUNTIME }],
  ['production mode', env => { env.NODE_ENV = 'production' }],
  ['deployment marker', env => { env.VERCEL = '1' }],
  ['remote admin host', env => { env.HH_TEST_ADMIN_DATABASE_URL = env.HH_TEST_ADMIN_DATABASE_URL.replace('127.0.0.1', 'database.example.invalid') }],
  ['remote application host', env => { env.HH_APP_DATABASE_URL = env.HH_APP_DATABASE_URL.replace('127.0.0.1', 'database.example.invalid') }],
  ['different database', env => { env.HH_TEST_ADMIN_DATABASE_URL = env.HH_TEST_ADMIN_DATABASE_URL.replace('/hh_app_test', '/other') }],
  ['URL override', env => { env.HH_TEST_ADMIN_DATABASE_URL += '?host=database.example.invalid' }],
  ['session override', env => { env.PGOPTIONS = '-c search_path=other' }],
]) test('helper fails before any query for ' + name, async () => {
  const state = fixtureDatabase(), env = environment()
  change(env)
  await assert.rejects(seedFourIpipTestVersions(state.db, state.fixture, env))
  assert.equal(state.calls.length, 0)
})

test('helper requires the same guarded fresh client, not environment flags alone', async () => {
  for (const configure of [
    state => { state.fixture = undefined },
    state => { state.fixture.client = {} },
    state => { state.fixture.identity.name = 'other' },
    state => { state.fixture.identity.role = 'other' },
    state => { state.fixture.identity.version = 160000 },
    ...freshFields.map(key => state => { state.fixture.occupied[key] = true }),
    ...['host', 'port', 'database', 'user', 'password', 'ssl'].map(key => state => { state.db.connectionParameters[key] = 'not-the-fixture' }),
  ]) {
    const state = fixtureDatabase()
    configure(state)
    await assert.rejects(seedFourIpipTestVersions(state.db, state.fixture, environment()))
    assert.equal(state.calls.length, 0)
  }
})

test('bootstrap passes its actual pre-mutation metadata proof and CI runs pure seed checks first', () => {
  const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const setup = read('tests/helpers/app-db-setup.mjs')
  assert.match(setup, /import \{ seedFourIpipTestVersions \} from '\.\/seed-four-ipip-versions\.mjs'/)
  const freshness = setup.indexOf('assertFreshIsolatedFixture(identity,occupied)')
  const mutation = setup.indexOf('create role anon')
  const call = setup.indexOf('await seedFourIpipTestVersions(db,{client:db,identity,occupied})')
  assert.ok(freshness > 0 && freshness < mutation && mutation < call)
  assert.equal(setup.split('await seedFourIpipTestVersions(').length, 2)
  const workflow = read('.github/workflows/hh-app-r1.yml')
  assert.ok(workflow.indexOf('tests/four-ipip-db-seed.test.mjs') < workflow.indexOf('run: npm run test:app:db'))
})
