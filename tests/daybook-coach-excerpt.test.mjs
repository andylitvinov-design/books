import test from 'node:test'
import assert from 'node:assert/strict'
import { daybookCoachExcerpt, parseDaybookCoachExcerptRevision } from '../lib/app/daybook-coach-excerpt.mjs'
const entry={revision:4,text:'Private beginning. I will walk today. Private ending.'}
const range={revision:4,topicKey:'body_health',start:19,end:37}
test('excerpt is exactly the selected current-source substring; metadata contains no source text',()=>{
 const result=daybookCoachExcerpt(entry,range)
 assert.equal(result.text,entry.text.slice(range.start,range.end))
 assert.deepEqual(parseDaybookCoachExcerptRevision(result.sourceRevision),range)
 assert.ok(result.sourceRevision.length<=128)
 assert.ok(!result.sourceRevision.includes(result.text))
})
test('source revision, topic, integer bounds and input whitelist are checked',()=>{
 for(const patch of [{revision:3},{revision:0},{topicKey:'unknown'},{start:-1},{start:1.5},
 {end:50000},{end:19},{start:38},{end:'37'},{text:'injected'}]){
  assert.throws(()=>daybookCoachExcerpt(entry,{...range,...patch}))
 }
 for(const value of [null,'','journal:1:4:body_health:19:37:extra','journal:1:04:body_health:19:37',
 'journal:1:4:body_health:19:19','journal:1:4:unknown:19:37','x'.repeat(129)]){
  assert.equal(parseDaybookCoachExcerptRevision(value),null)
 }
})
test('UTF-16 browser selection cannot split emoji; multilingual text is preserved',()=>{
 const source={revision:1,text:'🙂 Привет, mañana!'}
 assert.throws(()=>daybookCoachExcerpt(source,{revision:1,topicKey:'personal_growth',start:1,end:4}))
 assert.throws(()=>daybookCoachExcerpt(source,{revision:1,topicKey:'personal_growth',start:0,end:1}))
 const result=daybookCoachExcerpt(source,{revision:1,topicKey:'personal_growth',start:0,end:source.text.length})
 assert.equal(result.text,source.text)
})
test('empty, over-budget, control characters and sensitive excerpts are not coach-shareable',()=>{
 for(const text of ['   ','a'.repeat(241),'secret\u0000text','My diagnosis is private','У меня диагноз','Tengo depresión']){
  assert.throws(()=>daybookCoachExcerpt({revision:1,text},{revision:1,topicKey:'body_health',start:0,end:text.length}))
 }
 const text='a'.repeat(240)
 assert.equal(daybookCoachExcerpt({revision:1,text},{revision:1,topicKey:'body_health',start:0,end:240}).text,text)
 // An unrelated private part of the entry is never projected.
 const source={revision:1,text:'Private diagnosis. I will walk.'}
 assert.equal(daybookCoachExcerpt(source,{revision:1,topicKey:'body_health',start:19,end:31}).text,'I will walk.')
})
test('material annotations bind review to the current source version while preserving the exact excerpt',()=>{
 const version='a'.repeat(24),linked={...entry,material:{kind:'photo',id:'portrait'}}
 const reviewed=daybookCoachExcerpt(linked,range,version)
 assert.equal(reviewed.text,entry.text.slice(range.start,range.end))
 assert.deepEqual(parseDaybookCoachExcerptRevision(reviewed.sourceRevision),{...range,materialVersion:version})
 assert.notEqual(daybookCoachExcerpt(linked,range,'b'.repeat(24)).sourceRevision,reviewed.sourceRevision)
 assert.throws(()=>daybookCoachExcerpt(linked,range,'unverified'))
 assert.throws(()=>daybookCoachExcerpt(entry,range,version))
 assert.equal(parseDaybookCoachExcerptRevision('journal:2:4:body_health:19:37'),null)
})
