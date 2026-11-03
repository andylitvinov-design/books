import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'

// Editorial/source audit queue, not empirical validation data.
// Audit coverage without manufacturing a psychometric validity percentage.
const family = readFileSync(new URL('../docs/assessments/hh-original-family-review-2026-10-19.csv',import.meta.url),'utf8')
const dimensions = readFileSync(new URL('../docs/assessments/hh-original-dimension-review-2026-10-19.csv',import.meta.url),'utf8')
const names = source => [...source.matchAll(/^"(hh-[^"]+)"/gm)].map(m=>m[1])
const current = new Map(MONITORING_CATALOG
  .filter(row=>row.startable && row.key.startsWith('hh-'))
  .map(row=>[row.key,row.version]))

test('every active authored method appears exactly once in the 73-family review queue',()=>{
  const keys=names(family)
  assert.equal(keys.length,73)
  assert.equal(new Set(keys).size,keys.length)
  assert.deepEqual(keys.slice().sort(),[...current.keys()].sort())
  assert.equal((family.match(/"PENDING independent human review"/g)||[]).length,keys.length)
  assert.equal((family.match(/"NOT independently established"/g)||[]).length,keys.length)
  assert.ok((family.match(/"P0"/g)||[]).length>=10)
})

test('registered active EN source dimensions have independently reviewable source links',()=>{
  const dims=names(dimensions)
  assert.equal(dims.length,137)
  let covered=0
  for(const def of ASSESSMENT_DEFINITIONS){
    if(def.instrumentLocale!=='en'||def.version!==current.get(def.key))continue
    for(const score of def.scoring?.dimensions||[]){
      const rowPrefix='"'+def.key+'","'+def.version+'","'+score.key+'",'
      assert.ok(dimensions.includes(rowPrefix),'Missing review row: '+rowPrefix)
      covered++
    }
  }
  assert.ok(covered>=100)
})

test('single-item registered means stay queued for review, without clinical-validity claims',()=>{
  for(const name of ['hh-overthinking-loop','hh-screen-saturation'])
    assert.match(dimensions,new RegExp('"'+name+'","v2","[^"]+","mean","1"'))
  assert.doesNotMatch(family,/clinical validity (?:confirmed|certified)/i)
  assert.doesNotMatch(dimensions,/psychiatric diagnosis confirmed/i)
})
