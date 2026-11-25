import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {INNER_VECTOR_ITEMS,OUTER_VECTOR_ITEMS} from '../lib/profile/development-vectors.mjs'
import {firstIncompleteVector,nextIncompleteVector,vectorGuidedProgress} from '../lib/profile/development-guided-path.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('resume the first missing meaning axis without repeating accepted answers',()=>{
 const r=Object.fromEntries(INNER_VECTOR_ITEMS.slice(0,5).map(x=>[x.id,{current:'3',desired:'8'}]))
 const p=vectorGuidedProgress(INNER_VECTOR_ITEMS,r)
 assert.equal(p.complete,5)
 assert.deepEqual(p.missing,[5,6,7])
 assert.equal(firstIncompleteVector(INNER_VECTOR_ITEMS,r),5)
 assert.equal(nextIncompleteVector(INNER_VECTOR_ITEMS,r,5),6)
})
test('partially started scores remain unfinished even when a zero is authentic',()=>{
 const data={[OUTER_VECTOR_ITEMS[0].id]:{current:'0',desired:'10'},
  [OUTER_VECTOR_ITEMS[1].id]:{current:'0',desired:''}}
 const p=vectorGuidedProgress(OUTER_VECTOR_ITEMS,data)
 assert.equal(p.complete,1)
 assert.ok(p.missing.includes(1))
 assert.ok(p.partial.includes(1))
})
test('all complete is not an invitation to start an 8-question series again',()=>{
 const r=Object.fromEntries(INNER_VECTOR_ITEMS.map(x=>[x.id,{current:'0',desired:'0'}]))
 assert.equal(firstIncompleteVector(INNER_VECTOR_ITEMS,r),null)
 assert.equal(nextIncompleteVector(INNER_VECTOR_ITEMS,r,0),null)
})
test('skip only navigates; it never writes a fake answer',()=>{
 const x=Object.fromEntries(INNER_VECTOR_ITEMS.slice(0,7).map(a=>[a.id,{current:'4',desired:'7'}]))
 assert.equal(nextIncompleteVector(INNER_VECTOR_ITEMS,x,7),null)
 assert.equal(x[INNER_VECTOR_ITEMS[7].id],undefined)
})
test('both inner and outer guided modes use the same progress contract',()=>{
 const ui=read('components/app/development-vectors.jsx')
 assert.match(ui,/vectorGuidedProgress/)
 assert.match(ui,/firstIncompleteVector/)
 assert.match(ui,/nextIncompleteVector/)
 assert.match(ui,/guidedComplete/)
 assert.match(ui,/data-guided-vector-progress/)
 assert.doesNotMatch(ui,/localStorage|sessionStorage/)
})
