import test from 'node:test'
import assert from 'node:assert/strict'
import {CLARITY_PRACTICE_COUNT,clarityPracticeNotes,clarityPracticeProgress,clarityPracticeSteps,clarityPracticeTag} from '../lib/app/clarity-practice.mjs'
const note=(n,more={})=>({id:'note-'+n,revision:1,kind:'note',goalId:null,text:'answer '+n,tags:[clarityPracticeTag(n)],...more})
test('seven localized steps with the existing vectors and profile tools',()=>{
 assert.equal(CLARITY_PRACTICE_COUNT,7)
 for(const locale of ['en','ru','es']){
  const steps=clarityPracticeSteps(locale)
  assert.equal(steps.length,7)
  assert.deepEqual(steps.map(s=>s.number),[1,2,3,4,5,6,7])
  assert.ok(steps.every(s=>s.title&&s.body&&s.question))
  assert.deepEqual(steps.filter(s=>s.tool).map(s=>s.tool),['vectors','vectors','profile'])
 }
 assert.throws(()=>clarityPracticeTag(0))
 assert.throws(()=>clarityPracticeTag(8))
 assert.throws(()=>clarityPracticeTag('1'))
})
test('only unambiguous verified notes count; older reflection, drafts and foreign goal notes do not',()=>{
 const full=Array.from({length:7},(_,i)=>note(i+1))
 assert.deepEqual(clarityPracticeProgress([]),{done:0,total:7,firstMissing:1,complete:false,valid:Array(7).fill(false)})
 assert.equal(clarityPracticeProgress(full).complete,true)
 assert.equal(clarityPracticeProgress(full.slice(0,6)).done,6)
 assert.equal(clarityPracticeProgress(full.filter((_,i)=>i!==2)).firstMissing,3)
 assert.equal(clarityPracticeProgress(full.filter((_,i)=>i!==2)).done,5)
 assert.equal(clarityPracticeProgress([...full,note(3,{id:'other'})]).complete,false)
 assert.equal(clarityPracticeNotes([note(1,{revision:0}),note(1,{goalId:'foreign'}),note(1,{tags:['clarity-v2-day-1']})],1).length,0)
 assert.equal(clarityPracticeProgress([note(7)]).done,0)
})
