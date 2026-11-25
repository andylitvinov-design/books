import test from 'node:test'
import assert from 'node:assert/strict'
import {genieReturningNamePrompt} from '../lib/coaching/genie-coach-identity.mjs'
import {coachOpeningProgress,coachOpeningNextReply} from '../lib/coaching/coach-opening-protocol.mjs'

test('a saved account name alone never implies a previous coaching session',()=>{
 for(const locale of ['en','ru','es']){
  const prompt=genieReturningNamePrompt('Anna',locale)
  assert.match(prompt,/Anna/)
  assert.doesNotMatch(prompt,/previous|earlier|last time|session|прошл\S*|сесси\S*|anterior|sesión/iu)
  assert.match(prompt,/\?/)
 }
})

test('name-only opt-in produces truthful wording in the actual Genie opening',()=>{
 const p=coachOpeningProgress({personaId:'genie',locale:'en',turns:['yes'],
   allowPrior:true,priorSession:{name:'Anna',topic:''}})
 assert.equal(p.current,'name')
 const reply=coachOpeningNextReply(p)
 assert.match(reply,/Anna/)
 assert.doesNotMatch(reply,/earlier|previous|last time|session/iu)
})
