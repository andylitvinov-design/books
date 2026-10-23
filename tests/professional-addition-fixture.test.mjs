import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ADDITIONAL_PROFESSIONAL_DEFINITIONS as definitions } from '../data/assessments/professional-additions-2026.js'
import { professionalAdditionFixtureRow, seedProfessionalAdditionTestVersions } from './helpers/seed-professional-additions.mjs'
const isolated = { CI: 'true', HH_APP_TEST_RUNTIME: 'isolated', HH_TEST_ADMIN_DATABASE_URL: 'postgres://synthetic:synthetic@localhost:5432/hh_app_test', VERCEL: '' }
async function withEnvironment(patch, action) {
  const keys = Object.keys(isolated), previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  Object.assign(process.env, isolated, patch)
  try { return await action() } finally { for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key] }
}
// In-memory query double only. Never imports pg, opens sockets, or runs SQL.
function databaseDouble({ conflict = false, corrupt = false } = {}) {
  const calls = [], rows = new Map()
  return { calls, rows, async query(sql, values) {
    calls.push(sql)
    if (sql.startsWith('select id')) return { rows: conflict ? [{ id: 'synthetic-conflict' }] : [] }
    if (sql.startsWith('insert into')) {
      const columns = sql.match(/\(([^)]+)\)/)[1].split(',')
      const row = Object.fromEntries(columns.map((key, i) => [key, ['definition','questions','answer_schema','result_schema','source_metadata'].includes(key) ? JSON.parse(values[i]) : values[i]]))
      rows.set(row.id, row); return { rows: [] }
    }
    if (sql.startsWith('select *')) { const row = rows.get(values[0]); return { rows: corrupt ? [{ ...row, status: 'draft' }] : [row] } }
    assert.ok(['begin','commit','rollback'].includes(sql), sql)
    return { rows: [] }
  } }
}
test('exact five existing English v1 fingerprints and complete row contracts remain intact', () => {
  assert.deepEqual(definitions.map(d => d.key), ['ipip-emotion-decision-making-9','ipip-responsive-joy-10','ipip-responsive-distress-10','ipip-empathic-concern-10','ons-personal-wellbeing-4'])
  for (const definition of definitions) {
    const row = professionalAdditionFixtureRow(definition)
    assert.equal(row.definition_version, 'v1'); assert.equal(row.instrument_locale, 'en'); assert.equal(row.status, 'published')
    assert.deepEqual(row.definition, definition); assert.deepEqual(row.questions, definition.questions)
    assert.deepEqual(row.source_metadata, definition.source)
    assert.deepEqual(row.answer_schema, {type:'integer', minimum:definition.answerScale.min, maximum:definition.answerScale.max})
    assert.equal(row.content_hash, definition.contentHash)
    for (const change of [d => d.questions[0].text += ' changed', d => d.contentHash = 'sha256:'+'0'.repeat(64)]) {
      const altered = structuredClone(definition); change(altered)
      assert.throws(() => professionalAdditionFixtureRow(altered), /HASH_MISMATCH/)
    }
    const altered = structuredClone(definition); altered.source.permission = 'unreviewed'
    assert.throws(() => professionalAdditionFixtureRow(altered), /DEFINITION_MISMATCH/)
  }
})
test('in-memory empty fixture gets exactly five inserts with full readback and commit', async () => withEnvironment({}, async () => {
  const db = databaseDouble(); await seedProfessionalAdditionTestVersions(db)
  assert.equal(db.rows.size, 5); assert.equal(db.calls.filter(x=>x.startsWith('insert')).length,5)
  assert.equal(db.calls.at(-1),'commit'); assert.ok(!db.calls.some(x=>/update|delete|on conflict/i.test(x)))
  for (const d of definitions) assert.deepEqual(db.rows.get(d.id), professionalAdditionFixtureRow(d))
}))
test('all isolation failures reject before even a synthetic query', async () => {
  for (const patch of [{CI:'false'},{HH_APP_TEST_RUNTIME:'production'},{VERCEL:'1'},
    {HH_TEST_ADMIN_DATABASE_URL:'postgres://synthetic@remote.invalid/hh_app_test'},
    {HH_TEST_ADMIN_DATABASE_URL:'postgres://synthetic@localhost/production'}]) {
    await withEnvironment(patch, async()=>{const db=databaseDouble();await assert.rejects(seedProfessionalAdditionTestVersions(db),/Isolated loopback/);assert.equal(db.calls.length,0)})
  }
})
test('duplicate identity rejects before insertion and readback corruption never commits', async () => withEnvironment({}, async () => {
  for (const options of [{conflict:true},{corrupt:true}]) {
    const db=databaseDouble(options)
    await assert.rejects(seedProfessionalAdditionTestVersions(db),options.conflict?/CONFLICT/:/READBACK_MISMATCH/)
    assert.equal(db.calls.at(-1),'rollback');assert.ok(!db.calls.includes('commit'))
    if(options.conflict)assert.equal(db.rows.size,0)
  }
}))
test('helper is wired once only in the guarded empty database setup',()=>{
 const source=readFileSync(new URL('./helpers/app-db-setup.mjs',import.meta.url),'utf8')
 assert.equal((source.match(/await seedProfessionalAdditionTestVersions\(db\)/g)||[]).length,1)
 assert.ok(source.indexOf('Refusing to initialize nonempty test DB')<source.indexOf('await seedProfessionalAdditionTestVersions(db)'))
})
