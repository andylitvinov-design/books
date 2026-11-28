import test from 'node:test'
import assert from 'node:assert/strict'
import {ACQUAINTANCE_FIELDS,acquaintanceScenario,acquaintanceInstruction,applyReviewedAcquaintance,projectAcquaintanceProfile} from '../lib/coaching/coach-acquaintance.mjs'

const review=(overrides={})=>({expectedRevision:0,protocolId:'protocol-1',recordedAt:'2026-11-28T12:00:00Z',shareApproved:true,changes:[{field:'support_preferences',status:'confirmed',value:'Please ask one question at a time',quote:'Please ask one question at a time',turnId:'turn-1'}],...overrides})
test('separate six-stage acquaintance, localized, five minutes advisory',()=>{
 for(const l of ['en','ru','es']){
  const s=acquaintanceScenario(l)
  assert.equal(s.id,'acquaintance');assert.equal(s.targetSeconds,300);assert.equal(s.stages.length,6)
  assert.equal(s.stages[0].start,0);assert.equal(s.stages.at(-1).end,300)
  assert.equal(s.stages.every((x,i)=>x.title&&x.question&&(!i||x.start===s.stages[i-1].end)),true)
  assert.match(acquaintanceInstruction(l),/One question at a time/)
  assert.match(acquaintanceInstruction(l),/separate/i)
 }
 assert.equal(new Set(ACQUAINTANCE_FIELDS).size,ACQUAINTANCE_FIELDS.length)
})
test('only explicit sharing and exact reviewed evidence update the singleton',()=>{
 assert.throws(()=>applyReviewedAcquaintance(null,review({shareApproved:false})),/CONSENT_REQUIRED/)
 assert.throws(()=>applyReviewedAcquaintance(null,review({changes:[{...review().changes[0],quote:'different words'}]})),/INVALID/)
 assert.throws(()=>applyReviewedAcquaintance(null,review({changes:[{...review().changes[0],status:'candidate'}]})),/INVALID/)
 assert.throws(()=>applyReviewedAcquaintance(null,review({changes:[{...review().changes[0],field:'diagnosis'}]})),/INVALID/)
 const p=applyReviewedAcquaintance(null,review())
 assert.equal(p.revision,1);assert.equal(p.fields.support_preferences.value,review().changes[0].value)
 assert.deepEqual(projectAcquaintanceProfile(p),[])
 assert.deepEqual(projectAcquaintanceProfile(p,{shareApproved:true,allowedFields:['priorities']}),[])
 const result=projectAcquaintanceProfile(p,{shareApproved:true,allowedFields:['support_preferences']})
 assert.equal(result.length,1);assert.equal(result[0].historical,true)
 assert.equal('quote' in result[0],false);assert.equal('source' in result[0],true);assert.equal('turnId' in result[0],false)
})
test('cross-coach correction merges without erasing other fields or accepting stale writes',()=>{
 const initial=applyReviewedAcquaintance(null,review())
 const change={field:'priorities',status:'confirmed',value:'Finding time for family',quote:'Finding time for family',turnId:'turn-2'}
 const updated=applyReviewedAcquaintance(initial,review({expectedRevision:1,protocolId:'protocol-2',recordedAt:'2026-11-29T12:00:00Z',changes:[change]}))
 assert.equal(updated.revision,2);assert.deepEqual(updated.fields.support_preferences,initial.fields.support_preferences)
 assert.throws(()=>applyReviewedAcquaintance(updated,review()),/REVISION_CONFLICT/)
 const cleared=applyReviewedAcquaintance(updated,review({expectedRevision:2,protocolId:'protocol-3',recordedAt:'2026-11-30T12:00:00Z',changes:[{...review().changes[0],status:'cleared',value:'',quote:'Please forget that preference',turnId:'turn-3'}]}))
 assert.equal(cleared.fields.support_preferences.value,null)
 assert.deepEqual(projectAcquaintanceProfile(cleared,{shareApproved:true,allowedFields:['support_preferences']}),[])
 assert.throws(()=>applyReviewedAcquaintance(cleared,review({expectedRevision:3})),/STALE_EVIDENCE/)
})
