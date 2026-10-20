import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import { parse } from 'acorn'
import { seedProfessionalAdditionTestVersions } from './helpers/seed-professional-addition-versions.mjs'
import { ADDITIONAL_PROFESSIONAL_DEFINITIONS } from '../data/assessments/professional-additions-2026.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'

function syntheticDatabase({ conflict=false, conflictAt=0, corrupt=false, failInsert=false }={}) {
  const calls=[], rows=new Map()
  let preflightCount=0
  return { calls, rows, async query(sql, values=[]) {
    calls.push({sql,values})
    if (sql.startsWith('select id ')) {
      preflightCount++
      return {rows:conflict||preflightCount===conflictAt?[{id:'synthetic-existing'}]:[]}
    }
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

function seedWithSyntheticDefinitions(definitions) {
  const source=readFileSync(new URL('./helpers/seed-professional-addition-versions.mjs',import.meta.url),'utf8')
  const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'})
  const declaration=ast.body.find(node=>node.type==='ExportNamedDeclaration'&&
    node.declaration?.id?.name==='seedProfessionalAdditionTestVersions')?.declaration
  assert.ok(declaration,'Execute the actual exported seed function, not a test reimplementation')
  return vm.runInNewContext('('+source.slice(declaration.start,declaration.end)+')',{
    createHash,canonicalJSON,URL,ADDITIONAL_PROFESSIONAL_DEFINITIONS:definitions,
    process:{env:{CI:'true',HH_APP_TEST_RUNTIME:'isolated',
      HH_TEST_ADMIN_DATABASE_URL:'postgres://127.0.0.1/hh_app_test'}},
  })
}

test('five professional-addition fixtures are isolated, exact, insert-only, conflict-aborting and readback-verified', async t => {
  const keys=['CI','HH_APP_TEST_RUNTIME','VERCEL','HH_TEST_ADMIN_DATABASE_URL']
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]))
  const isolated=()=>{
    process.env.CI='true';process.env.HH_APP_TEST_RUNTIME='isolated'
    delete process.env.VERCEL
    process.env.HH_TEST_ADMIN_DATABASE_URL='postgres://127.0.0.1/hh_app_test'
  }
  try {
    isolated()
    await t.test('all technical fields match five current canonical definitions', async()=>{
      const db=syntheticDatabase();await seedProfessionalAdditionTestVersions(db)
      assert.equal(db.rows.size,5)
      assert.equal(db.calls[0].sql,'begin');assert.equal(db.calls.at(-1).sql,'commit')
      const inserts=db.calls.filter(c=>c.sql.startsWith('insert '))
      assert.equal(inserts.length,5)
      assert.equal(db.calls.slice(1,6).every(c=>c.sql.startsWith('select id ')),true,'All conflict checks precede writes')
      for(const d of ADDITIONAL_PROFESSIONAL_DEFINITIONS) assert.deepEqual(db.rows.get(d.id),{
        id:d.id,definition_key:d.key,definition_version:d.version,instrument_locale:d.instrumentLocale,
        translation_version:d.translationVersion,definition:d,questions:d.questions,
        answer_schema:{type:'integer',minimum:d.answerScale.min,maximum:d.answerScale.max},scoring_key:d.scoringKey,
        scoring_version:d.scoringVersion,result_schema:{version:d.resultVersion},timeframe:d.timeframe,
        source_metadata:d.source,content_hash:d.contentHash,status:'published',
      })
      for(const call of db.calls)assert.doesNotMatch(call.sql,/\b(update|delete|alter|drop)\b|on conflict/i)
    })
    await t.test('existing identity aborts before any insert',async()=>{
      const db=syntheticDatabase({conflict:true})
      await assert.rejects(()=>seedProfessionalAdditionTestVersions(db),/PROFESSIONAL_ADDITION_FIXTURE_CONFLICT/)
      assert.equal(db.rows.size,0);assert.equal(db.calls.at(-1).sql,'rollback')
    })
    await t.test('conflict on the fifth identity still aborts before every insert',async()=>{
      const db=syntheticDatabase({conflictAt:5})
      await assert.rejects(()=>seedProfessionalAdditionTestVersions(db),/PROFESSIONAL_ADDITION_FIXTURE_CONFLICT/)
      assert.equal(db.calls.filter(call=>call.sql.startsWith('select id ')).length,5)
      assert.equal(db.calls.some(call=>call.sql.startsWith('insert ')),false)
      assert.equal(db.rows.size,0)
      assert.equal(db.calls.at(-1).sql,'rollback')
      assert.equal(db.calls.some(call=>call.sql==='commit'),false)
    })
    await t.test('changed source items or scoring polarity fail the fingerprint before any query',async()=>{
      for(const mutate of [
        definitions=>{definitions[0].questions[0].text+=' synthetic alteration'},
        definitions=>{definitions[0].scoring.dimensions[0].reverseItems.pop()},
        definitions=>{definitions.at(-1).questions[0].text+=' synthetic ONS alteration'},
      ]) {
        const definitions=structuredClone(ADDITIONAL_PROFESSIONAL_DEFINITIONS)
        mutate(definitions)
        const seed=seedWithSyntheticDefinitions(definitions),db=syntheticDatabase()
        await assert.rejects(()=>seed(db),/PROFESSIONAL_ADDITION_FIXTURE_HASH_MISMATCH/)
        assert.equal(db.calls.length,0,'Fingerprint mismatch must precede even BEGIN')
        assert.equal(db.rows.size,0)
      }
    })
    await t.test('readback mismatch aborts transaction',async()=>{
      const db=syntheticDatabase({corrupt:true})
      await assert.rejects(()=>seedProfessionalAdditionTestVersions(db),/PROFESSIONAL_ADDITION_FIXTURE_READBACK_MISMATCH/)
      assert.equal(db.calls.at(-1).sql,'rollback');assert.equal(db.calls.some(c=>c.sql==='commit'),false)
    })
    await t.test('insertion failure aborts transaction',async()=>{
      const db=syntheticDatabase({failInsert:true})
      await assert.rejects(()=>seedProfessionalAdditionTestVersions(db),/SYNTHETIC_INSERT_FAILURE/)
      assert.equal(db.calls.at(-1).sql,'rollback')
    })
    await t.test('production, remote, wrong database and missing flags cause zero queries',async()=>{
      for(const [key,value] of [['CI','false'],['HH_APP_TEST_RUNTIME','production'],['VERCEL','1'],['HH_TEST_ADMIN_DATABASE_URL','postgres://remote.example.invalid/hh_app_test'],['HH_TEST_ADMIN_DATABASE_URL','postgres://localhost/production'],['HH_TEST_ADMIN_DATABASE_URL','postgres://localhost/hh_app_test?host=remote.example.invalid'],['HH_TEST_ADMIN_DATABASE_URL','postgres://localhost/hh_app_test#fragment'],['HH_TEST_ADMIN_DATABASE_URL','http://localhost/hh_app_test'],['HH_TEST_ADMIN_DATABASE_URL',undefined]]) {
        isolated();if(value===undefined)delete process.env[key];else process.env[key]=value
        const db=syntheticDatabase();await assert.rejects(()=>seedProfessionalAdditionTestVersions(db),/Isolated loopback/)
        assert.equal(db.calls.length,0)
      }
    })
  } finally {
    for(const key of keys)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]
  }
})

test('empty isolated DB setup registers only the five missing fixtures without production migration',()=>{
  const setup=readFileSync(new URL('./helpers/app-db-setup.mjs',import.meta.url),'utf8')
  assert.match(setup,/import \{seedProfessionalAdditionTestVersions\} from '\.\/seed-professional-addition-versions\.mjs'/)
  assert.match(setup,/await seedProfessionalAdditionTestVersions\(db\)/)
  const productionSeed=readFileSync(new URL('../scripts/app-seed.mjs',import.meta.url),'utf8')
  assert.doesNotMatch(productionSeed,/seedProfessionalAdditionTestVersions|seed-professional-addition-versions/)
})
