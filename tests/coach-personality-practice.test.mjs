import test from 'node:test'
import assert from 'node:assert/strict'
import {PUBLIC_COACH_PERSONA_IDS} from '../lib/coaching/persona-registry.mjs'
import {coachPersonalityPractice,coachPersonalityHomeworkOffer} from '../lib/coaching/coach-personality-practice.mjs'
test('24 optional practices in RU/EN/ES, no imposed assignment',()=>{
 const ids=new Set()
 for(const personaId of PUBLIC_COACH_PERSONA_IDS)for(const day of [1,2,3]){
  for(const locale of ['en','ru','es']){
   const p=coachPersonalityPractice(personaId,day,locale)
   assert.equal(p.personaId,personaId)
   assert.equal(p.day,day)
   assert.equal(p.optional,true)
   assert.ok(p.title&&p.instruction)
   assert.ok(Object.isFrozen(p))
   ids.add(p.id)
  }
 }
 assert.equal(ids.size,24)
 assert.equal(coachPersonalityPractice('__proto__',1),null)
})
test('only an authoritative reviewed day-one timebox receipt can offer exact unresolved questions',()=>{
 const rows=[{id:'a',status:'not_explored',question:'Original A?'},{id:'b',status:'needs_confirmation',question:'Original B?'},{id:'a',status:'not_explored',question:'Duplicate?'},{id:'c',status:'confirmed',question:'Already answered?'},{id:'d',status:'skipped_by_client',question:'Client skipped?'}]
 const input={personaId:'caesar',locale:'ru',courseSessionId:'clarity_day_1',completion:{reason:'timebox',reviewed:true,activeSeconds:1200},protocolId:'protocol-1',rows}
 const offer=coachPersonalityHomeworkOffer(input)
 assert.deepEqual(offer.questions.map(x=>x.question),['Original A?','Original B?'])
 assert.ok(offer.optional&&offer.practice.optional)
 for(const reason of ['disconnect','pause','manual_end','transport_error'])assert.equal(coachPersonalityHomeworkOffer({...input,completion:{...input.completion,reason}}),null)
 assert.equal(coachPersonalityHomeworkOffer({...input,courseSessionId:'clarity_day_2'}),null)
 assert.equal(coachPersonalityHomeworkOffer({...input,completion:{...input.completion,activeSeconds:1199}}),null)
 assert.equal(coachPersonalityHomeworkOffer({...input,completion:{...input.completion,reviewed:false}}),null)
 assert.equal(coachPersonalityHomeworkOffer({...input,rows:[rows[3],rows[4]]}),null)
})
