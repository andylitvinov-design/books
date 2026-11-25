import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { seedBachV2TestVersions } from './helpers/seed-bach-v2-versions.mjs'
import { BACH_V2_DEFINITIONS } from '../data/assessments/bach-flower-v2.js'

function syntheticDatabase({ conflict=false, corrupt=false, failInsert=false }={}) {
  const calls=[], rows=new Map()
  return { calls, rows, async query(sql, values=[]) {
    calls.push({sql,values})
    if (sql.startsWith('select id ')) return {rows:conflict?[{id:'synthetic-existing'}]:[]}
    if (sql.startsWith('insert ')) {
      if (failInsert) throw new Error('SYNTHETIC_INSERT_FAILURE')
      const columns=sql.match(/\(([^)]+)\)/)[1].split(',')
      const row=Object.fromEntries(columns.map((c,i)=>[c,['definition','questions','answer_schema','result_schema','source_metadata'].includes(c)?JSON.parse(values[i]):values[i]]))
      rows.set(row.id,row)
    }
    if (sql.startsWith('select * ')) {
      const row=structuredClone(rows.get(values[0]))
      if(corrupt) row.scoring_version='incorrect'
      return {rows:[row]}
    }
    return {rows:[]}
  }}
}

test('two Bach v2 fixtures are isolated, exact, insert-only, conflict-aborting and readback-verified', async t => {
  const keys=['CI','HH_APP_TEST_RUNTIME','VERCEL','HH_TEST_ADMIN_DATABASE_URL']
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]))
  const isolated=()=>{
    process.env.CI='true';process.env.HH_APP_TEST_RUNTIME='isolated'
    delete process.env.VERCEL
    process.env.HH_TEST_ADMIN_DATABASE_URL='postgres://127.0.0.1/hh_app_test'
  }
  try {
    isolated()
    await t.test('all technical fields match two reviewed Bach definitions', async()=>{
      const db=syntheticDatabase();await seedBachV2TestVersions(db)
      assert.equal(db.rows.size,2)
      assert.equal(db.calls[0].sql,'begin');assert.equal(db.calls.at(-1).sql,'commit')
      const inserts=db.calls.filter(c=>c.sql.startsWith('insert '))
      assert.equal(inserts.length,2)
      assert.equal(db.calls.slice(1,3).every(c=>c.sql.startsWith('select id ')),true,'All conflict checks precede writes')
      for(const d of BACH_V2_DEFINITIONS) assert.deepEqual(db.rows.get(d.id),{
        id:d.id,definition_key:d.key,definition_version:d.version,instrument_locale:d.instrumentLocale,
        translation_version:d.translationVersion,definition:d,questions:d.questions,
        answer_schema:{type:'integer',minimum:0,maximum:5},scoring_key:d.scoringKey,
        scoring_version:d.scoringVersion,result_schema:{version:d.resultVersion},timeframe:d.timeframe,
        source_metadata:d.source,content_hash:d.contentHash,status:'published',
      })
      for(const call of db.calls)assert.doesNotMatch(call.sql,/\b(update|delete|alter|drop)\b|on conflict/i)
    })
    await t.test('existing identity aborts before any insert',async()=>{
      const db=syntheticDatabase({conflict:true})
      await assert.rejects(()=>seedBachV2TestVersions(db),/BACH_V2_FIXTURE_CONFLICT/)
      assert.equal(db.rows.size,0);assert.equal(db.calls.at(-1).sql,'rollback')
    })
    await t.test('readback mismatch aborts transaction',async()=>{
      const db=syntheticDatabase({corrupt:true})
      await assert.rejects(()=>seedBachV2TestVersions(db),/BACH_V2_FIXTURE_READBACK_MISMATCH/)
      assert.equal(db.calls.at(-1).sql,'rollback');assert.equal(db.calls.some(c=>c.sql==='commit'),false)
    })
    await t.test('insertion failure aborts transaction',async()=>{
      const db=syntheticDatabase({failInsert:true})
      await assert.rejects(()=>seedBachV2TestVersions(db),/SYNTHETIC_INSERT_FAILURE/)
      assert.equal(db.calls.at(-1).sql,'rollback')
    })
    await t.test('production, remote, wrong database and missing flags cause zero queries',async()=>{
      for(const [key,value] of [['CI','false'],['HH_APP_TEST_RUNTIME','production'],['VERCEL','1'],['HH_TEST_ADMIN_DATABASE_URL','postgres://remote.example.invalid/hh_app_test'],['HH_TEST_ADMIN_DATABASE_URL','postgres://localhost/production'],['HH_TEST_ADMIN_DATABASE_URL',undefined]]) {
        isolated();if(value===undefined)delete process.env[key];else process.env[key]=value
        const db=syntheticDatabase();await assert.rejects(()=>seedBachV2TestVersions(db),/Isolated loopback/)
        assert.equal(db.calls.length,0)
      }
    })
  } finally {
    for(const key of keys)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]
  }
})

test('empty isolated DB setup registers Bach fixtures without production migration',()=>{
  const setup=readFileSync(new URL('./helpers/app-db-setup.mjs',import.meta.url),'utf8')
  assert.match(setup,/import \{seedBachV2TestVersions\} from '\.\/seed-bach-v2-versions\.mjs'/)
  assert.match(setup,/await seedBachV2TestVersions\(db\)/)
  const productionSeed=readFileSync(new URL('../scripts/app-seed.mjs',import.meta.url),'utf8')
  assert.doesNotMatch(productionSeed,/seedBachV2TestVersions|seed-bach-v2-versions/)
})
