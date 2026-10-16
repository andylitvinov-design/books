import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import pg from 'pg'
import { HH_SPLIT_V2_DEFINITIONS } from '../data/assessments/hh-split-reflections-v2.js'
import { BACH_V2_DEFINITIONS } from '../data/assessments/bach-flower-v2.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'

const expectedSqlHash = '52d23a2ec3f3fe022ba690bf35d17a45a82273215a45b531bf90cbdb6df0c554'
const definitions = [...HH_SPLIT_V2_DEFINITIONS, ...BACH_V2_DEFINITIONS]
const historical = definitions.map(d => getAssessmentDefinition(d.key, 'v1', d.instrumentLocale))
const sha = value => createHash('sha256').update(value).digest('hex')
const sql = await readFile(new URL('../docs/assessments/registry-proposals/eight-v2-append-only.sql', import.meta.url), 'utf8')
assert.equal(sha(sql), expectedSqlHash, 'Proposal bytes must match the independently reviewed SQL')
assert.deepEqual(JSON.parse(sql.match(/\$definitions\$([\s\S]+?)\$definitions\$::jsonb/)[1]), definitions)
assert.equal((sql.match(/^BEGIN;$/gm) || []).length, 1)
assert.equal((sql.match(/^COMMIT;$/gm) || []).length, 1)
assert.match(sql, /COMMIT;\s*$/)
assert.equal(new Set(definitions.map(d => d.id)).size, 8)
for (const { contentHash, ...body } of [...definitions, ...historical]) {
  assert.equal(contentHash, 'sha256:' + sha(canonicalJSON(body)))
}
const withoutPayload = sql.replace(/\$definitions\$[\s\S]+?\$definitions\$::jsonb/, "'[]'::jsonb").replace(/^--.*$/gm, '')
assert.doesNotMatch(withoutPayload, /\b(?:UPDATE|DELETE|TRUNCATE|ALTER|CREATE|DROP|GRANT|REVOKE)\b/i)
assert.doesNotMatch(withoutPayload, /ON\s+CONFLICT/i)
assert.deepEqual([...new Set(withoutPayload.match(/app\.[a-z_]+/g))], ['app.assessment_versions'])

function isolatedTarget(env) {
  let url
  try { url = new URL(env.HH_TEST_ADMIN_DATABASE_URL || 'http://invalid') } catch { throw new Error('Isolated loopback test database required') }
  if (env.CI !== 'true' || env.HH_APP_TEST_RUNTIME !== 'isolated' || env.VERCEL !== undefined || url.search || url.hash ||
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/hh_app_test') {
    throw new Error('Isolated loopback test database required')
  }
  return url.toString()
}
const validEnv = { CI: 'true', HH_APP_TEST_RUNTIME: 'isolated', HH_TEST_ADMIN_DATABASE_URL: 'postgres://127.0.0.1/hh_app_test' }
assert.ok(isolatedTarget(validEnv))
for (const [key, value] of [['CI', 'false'], ['HH_APP_TEST_RUNTIME', 'production'], ['VERCEL', '1'], ['VERCEL', ''],
  ['HH_TEST_ADMIN_DATABASE_URL', 'postgres://remote.example.invalid/hh_app_test'],
  ['HH_TEST_ADMIN_DATABASE_URL', 'postgres://localhost/production'],
  ['HH_TEST_ADMIN_DATABASE_URL', 'https://localhost/hh_app_test'],
  ['HH_TEST_ADMIN_DATABASE_URL', 'postgres://127.0.0.1/hh_app_test?host=remote.example.invalid'],
  ['HH_TEST_ADMIN_DATABASE_URL', 'postgres://localhost/hh_app_test?database=production'],
  ['HH_TEST_ADMIN_DATABASE_URL', 'postgres://localhost/hh_app_test?options=-c%20search_path%3Dpublic'],
  ['HH_TEST_ADMIN_DATABASE_URL', 'postgres://localhost/hh_app_test#fragment'], ['HH_TEST_ADMIN_DATABASE_URL', undefined]]) {
  assert.throws(() => isolatedTarget({ ...validEnv, [key]: value }), /Isolated loopback/)
}
console.log('PASS source proof: exact eight executable payloads, 16 new/historical canonical hashes, pinned SQL, insert-only shape, and isolation guards')
if (process.argv.includes('--source-only')) {
  console.log('Source-only check complete; no database connection attempted. Hosted PostgreSQL execution still required.')
} else {
  const db = new pg.Client({ connectionString: isolatedTarget(process.env) })
  await db.connect()
  try {
    const target = (await db.query('select current_database() as name')).rows[0]
    assert.equal(target.name, 'hh_app_test')
    // The client endpoint is strictly loopback; GitHub's Docker port mapping may give the
    // PostgreSQL server a private container address, so inet_server_addr is not a loopback test.
    const fixtureFingerprint = async () => (await db.query("select count(*)::integer as count, md5(coalesce(jsonb_agg(to_jsonb(av) order by av.id)::text,'')) as fingerprint from app.assessment_versions av")).rows[0]
    const originalFixture = await fixtureFingerprint()
    // The source fixture registry is read only. All mutations below target this connection's temporary copy.
    await db.query('create temporary table assessment_versions (like app.assessment_versions including all) on commit preserve rows')
    const testSql = sql.replaceAll('app.assessment_versions', 'pg_temp.assessment_versions')
    const snapshot = async (target = 'pg_temp.assessment_versions') => (await db.query(`select to_jsonb(av) as row from ${target} av order by id`)).rows.map(x => x.row)
    const insert = async (d, overrides = {}, target = 'pg_temp.assessment_versions', client = db) => {
      const row = {
        id: d.id, definition_key: d.key, definition_version: d.version, instrument_locale: d.instrumentLocale,
        translation_version: d.translationVersion, definition: d, questions: d.questions,
        answer_schema: { type: 'integer', minimum: d.answerScale.min, maximum: d.answerScale.max },
        scoring_key: d.scoringKey, scoring_version: d.scoringVersion, result_schema: { version: d.resultVersion },
        timeframe: d.timeframe, source_metadata: d.source, content_hash: d.contentHash, status: 'published', ...overrides,
      }
      const keys = Object.keys(row)
      await client.query(`insert into ${target} (${keys.join(',')}) values (${keys.map((_, i) => '$' + (i + 1)).join(',')})`, keys.map(k => typeof row[k] === 'object' ? JSON.stringify(row[k]) : row[k]))
    }
    const reset = async () => {
      await db.query('truncate pg_temp.assessment_versions')
      for (const d of historical) await insert(d)
      return snapshot()
    }
    const rejectsWithoutChanges = async (expectedError, statement = testSql) => {
      const before = await snapshot()
      await assert.rejects(db.query(statement), expectedError)
      await db.query('rollback')
      assert.deepEqual(await snapshot(), before, 'Failed release must add zero rows and preserve every prior technical field')
    }
    const originalHistorical = await reset()
    await db.query(testSql)
    const stored = await snapshot()
    assert.equal(stored.length, 16)
    assert.deepEqual(stored.filter(r => r.definition_version === 'v1'), originalHistorical)
    for (const d of definitions) {
      const r = stored.find(row => row.id === d.id)
      assert.ok(r.published_at)
      assert.deepEqual({ ...r, published_at: undefined }, {
        id: d.id, definition_key: d.key, definition_version: d.version, instrument_locale: d.instrumentLocale,
        translation_version: d.translationVersion, definition: d, questions: d.questions,
        answer_schema: { type: 'integer', minimum: d.answerScale.min, maximum: d.answerScale.max },
        scoring_key: d.scoringKey, scoring_version: d.scoringVersion, result_schema: { version: d.resultVersion },
        timeframe: d.timeframe, source_metadata: d.source, content_hash: d.contentHash, status: 'published', published_at: undefined,
      })
      const { contentHash, ...body } = r.definition
      assert.equal(contentHash, 'sha256:' + sha(canonicalJSON(body)))
    }
    console.log('PASS successful atomic insertion: eight new published rows, exact full readback, canonical hashes, and eight unchanged historical rows')
    await rejectsWithoutChanges(/Existing registry identity\/hash/)
    console.log('PASS identical retry conflict: zero extra inserts and no overwrites')
    await reset()
    await insert(definitions.at(-1), { id: randomUUID(), translation_version: 'fixture-retired-alternative', content_hash: 'sha256:' + 'a'.repeat(64), status: 'retired' })
    await rejectsWithoutChanges(/Existing registry identity\/hash/)
    console.log('PASS retired semantic conflict with different ID, translation, and hash: zero extra inserts')
    await reset()
    await insert(definitions.at(-1), { definition_key: 'fixture-different-key', definition_version: 'fixture', content_hash: 'sha256:' + 'b'.repeat(64), status: 'retired' })
    await rejectsWithoutChanges(/Existing registry identity\/hash/)
    console.log('PASS retired ID conflict with different key and hash: zero extra inserts')
    await reset()
    await insert(definitions.at(-1), { id: randomUUID(), definition_key: 'fixture-hash-collision', definition_version: 'fixture', status: 'retired' })
    await rejectsWithoutChanges(/Existing registry identity\/hash/)
    console.log('PASS retired content-hash conflict with different ID and key: zero extra inserts')
    await reset()
    await db.query(`alter table pg_temp.assessment_versions add constraint fixture_fail_last_insert check (id <> '${definitions.at(-1).id}'::uuid)`)
    await rejectsWithoutChanges(/fixture_fail_last_insert/)
    await db.query('alter table pg_temp.assessment_versions drop constraint fixture_fail_last_insert')
    console.log('PASS eighth-row SQL failure: all seven preceding inserts roll back and historical rows remain exact')
    await reset()
    await db.query(`create function pg_temp.corrupt_v2_definition() returns trigger language plpgsql as $$ begin if new.definition_version='v2' then new.definition=jsonb_set(new.definition,'{title}','"synthetic readback corruption"'::jsonb); end if; return new; end $$`)
    await db.query('create trigger fixture_corrupt_v2 before insert on pg_temp.assessment_versions for each row execute function pg_temp.corrupt_v2_definition()')
    await rejectsWithoutChanges(/Exact full registry readback failed/)
    await db.query('drop trigger fixture_corrupt_v2 on pg_temp.assessment_versions')
    console.log('PASS complete-JSON readback corruption: all eight new inserts roll back')
    const rollbackBaseline = await reset()
    await db.query(testSql.replace(/COMMIT;\s*$/, 'ROLLBACK;'))
    assert.deepEqual(await snapshot(), rollbackBaseline)
    console.log('PASS successful rollback rehearsal: all validation runs, then none of the eight rows persist')
    // PostgreSQL temporary tables cannot be shared by two sessions. This disposable, uniquely
    // named technical table exists only in the already verified isolated CI database.
    const sharedTable = 'public.hh_v2_registry_lock_' + randomUUID().replaceAll('-', '')
    const other = new pg.Client({ connectionString: isolatedTarget(process.env) })
    await other.connect()
    try {
      await db.query(`create unlogged table ${sharedTable} (like app.assessment_versions including all)`)
      for (const d of historical) await insert(d, {}, sharedTable)
      const sharedBefore = await snapshot(sharedTable)
      const sharedSql = sql.replaceAll('app.assessment_versions', sharedTable)
      await other.query('begin')
      await other.query(`lock table ${sharedTable} in share row exclusive mode`)
      await assert.rejects(db.query(sharedSql), /lock timeout/)
      await db.query('rollback')
      await other.query('rollback')
      assert.deepEqual(await snapshot(sharedTable), sharedBefore)
      console.log('PASS competing registry writer: bounded lock timeout aborts before all inserts; no existing rows change')
      await other.query('begin')
      await insert(definitions.at(-1), {
        id: randomUUID(), translation_version: 'fixture-concurrent-retired',
        content_hash: 'sha256:' + 'c'.repeat(64), status: 'retired',
      }, sharedTable, other)
      // Start the exact proposal while another transaction holds ROW EXCLUSIVE, then commit
      // the retired semantic conflict. The waiting proposal must see it after acquiring its lock.
      const waiting = db.query(sharedSql).then(() => ({ success: true }), error => ({ error }))
      await new Promise(resolve => setTimeout(resolve, 200))
      await other.query('commit')
      const outcome = await waiting
      assert.match(outcome.error?.message || '', /Existing registry identity\/hash/)
      await db.query('rollback')
      const afterConcurrent = await snapshot(sharedTable)
      assert.equal(afterConcurrent.length, 9)
      assert.equal(afterConcurrent.filter(r => definitions.some(d => d.id === r.id)).length, 0)
      assert.deepEqual(afterConcurrent.filter(r => r.definition_version === 'v1'), sharedBefore)
      console.log('PASS concurrent retired/different-hash semantic conflict: lock waits, preflight sees committed conflict, zero proposed inserts')
    } finally {
      await other.query('rollback').catch(() => {})
      await db.query('rollback').catch(() => {})
      await db.query(`drop table if exists ${sharedTable}`)
      await other.end()
    }
    assert.deepEqual(await fixtureFingerprint(), originalFixture)
    console.log('PASS original isolated fixture registry is unchanged; no client tables queried or modified')
    console.log('Eight-v2 append-only proposal PostgreSQL proof passed: 11 database checks plus source/isolation proof')
  } finally {
    await db.query('rollback').catch(() => {})
    await db.end()
  }
}
