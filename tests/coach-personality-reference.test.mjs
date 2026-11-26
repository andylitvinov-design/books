import test from 'node:test'
import assert from 'node:assert/strict'
import {PUBLIC_COACH_PERSONA_IDS} from '../lib/coaching/persona-registry.mjs'
import {COACH_PERSONALITY_REFERENCES,coachPersonalityReference,coachPersonalityReferenceGuidance} from '../lib/coaching/coach-personality-reference.mjs'
import {coachPersonalityTurn,coachPersonalityTurnGuidance,coachPersonalityBaseInstruction} from '../lib/coaching/coach-personality-dialogue.mjs'

test('80 independently authored fictional reply examples, each localized RU/EN/ES, without user history',()=>{
 let n=0
 for(const id of PUBLIC_COACH_PERSONA_IDS){
  const profile=COACH_PERSONALITY_REFERENCES[id]
  assert.equal(Object.keys(profile).length,10)
  for(const [key,locales] of Object.entries(profile)){
   const mode=['support','repair','listen','close','action','review'].includes(key)?key:'explore'
   for(const locale of ['en','ru','es']){
    const ref=coachPersonalityReference(id,mode,key,locale)
    assert.equal(ref,locales[locale])
    assert.ok(Object.isFrozen(ref))
    assert.ok(ref.coach.length>12)
    assert.ok((ref.coach.match(/\?/g)||[]).length<=1)
    assert.match(coachPersonalityReferenceGuidance(id,mode,key,locale),/not client data, do not repeat/)
    n++
   }
  }
 }
 assert.equal(n,240)
 assert.equal(coachPersonalityReference('genie','answer','goal','en'),null)
 assert.equal(coachPersonalityReference('__proto__','explore','goal','en'),null)
})
test('explicit distress selects a localized character reference without inventing client facts or decisions',()=>{
 const t=coachPersonalityTurn({personaId:'caesar',stage:'reality',locale:'ru',settings:{directness:5},empathy:{emotion:'fear',evidence:'explicit_current_self_report',certainty:'explicit'}})
 const guidance=coachPersonalityTurnGuidance(t)
 assert.match(guidance,/Нет необходимости принимать трудное решение/)
 assert.match(guidance,/not client data/)
 assert.match(guidance,/No humor this turn/)
 assert.match(coachPersonalityBaseInstruction('caesar'),/only after the Director authorizes a practice/)
})
