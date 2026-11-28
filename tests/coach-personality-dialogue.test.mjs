import test from 'node:test'
import assert from 'node:assert/strict'
import {PUBLIC_COACH_PERSONA_IDS,buildCoachBehaviorPolicy} from '../lib/coaching/persona-registry.mjs'
import {coachPersonalityProfile,coachPersonalityBaseInstruction,coachPersonalityTurn,coachPersonalityTurnGuidance,coachPersonalityAffinities} from '../lib/coaching/coach-personality-dialogue.mjs'
import {coachSessionDirective,coachSessionDirectivePrompt} from '../lib/coaching/coach-session-director.mjs'

test('eight expanded profiles share the existing registered identity, with distinct stage lenses',()=>{
 const prompts=[]
 for(const id of PUBLIC_COACH_PERSONA_IDS){
  const p=coachPersonalityProfile(id)
  assert.ok(Object.isFrozen(p.stages))
  for(const stage of ['goal','reality','resources','options','action','review']){
   const turn=coachPersonalityTurn({personaId:id,stage,settings:{warmth:3,directness:4,pace:'balanced',depth:'deep'}})
   assert.equal(turn.lens,p.stages[stage])
   assert.equal(turn.style.directness,4)
  }
  for(const lang of ['ru','en','es'])assert.ok(buildCoachBehaviorPolicy(id,{},lang).systemInstructions.includes(coachPersonalityBaseInstruction(id)))
  prompts.push(coachPersonalityBaseInstruction(id))
 }
 assert.equal(new Set(prompts).size,8)
 assert.equal(coachPersonalityProfile('__proto__'),null)
 assert.equal(coachPersonalityTurn({personaId:'lea'}),null)
 assert.deepEqual(coachPersonalityAffinities('genie'),['creative','reflective'])
 assert.deepEqual(coachPersonalityAffinities('caesar'),['direct','analytic'])
})
test('explicit client distress softens every character while a direct request remains first',()=>{
 for(const id of PUBLIC_COACH_PERSONA_IDS)for(const emotion of ['fear','shame','sad','anger','overload']){
  const turn=coachPersonalityTurn({personaId:id,stage:'action',interventionId:'answer_first',settings:{warmth:2,directness:5,pace:'fast',depth:'deep'},empathy:{emotion,evidence:'explicit_current_self_report',certainty:'explicit'}})
  assert.equal(turn.mode,'answer')
  assert.equal(turn.style.directness,2)
  assert.equal(turn.style.pace,'slow')
  assert.equal(turn.style.warmth,4)
  assert.equal(turn.visualCue,'empathy')
  assert.equal(turn.humorAllowed,false)
  assert.equal(turn.metaphorAllowed,false)
 }
 const unknown=coachPersonalityTurn({personaId:'genie',stage:'goal',settings:{directness:5},empathy:{emotion:'fear',evidence:'guess',certainty:'low'}})
 assert.equal(unknown.style.directness,5)
 assert.equal(unknown.visualCue,'calm')
})
test('latest correction, refusal and timebox outrank personality; no client text in guidance',()=>{
 for(const id of PUBLIC_COACH_PERSONA_IDS){
  const no=coachPersonalityTurn({personaId:id,stage:'action',interventionId:'respect_no',noAdvice:true})
  assert.equal(no.mode,'listen')
  assert.equal(no.humorAllowed,false)
  const repair=coachPersonalityTurn({personaId:id,stage:'goal',interventionId:'repair_misunderstanding'})
  assert.equal(repair.mode,'repair')
  const close=coachPersonalityTurn({personaId:id,stage:'goal',interventionId:'invite_reflective_close',timebox:{offerWrapUp:true},message:'PRIVATE_SENTINEL'})
  assert.equal(close.mode,'close')
  assert.equal(close.concise,true)
  assert.doesNotMatch(coachPersonalityTurnGuidance(close),/PRIVATE_SENTINEL/)
 }
})
test('the real Director includes the selected personality without changing locked method and client evidence',()=>{
 const p=buildCoachBehaviorPolicy('caesar',{directness:5},'en')
 const d=coachSessionDirective({locale:'en',message:'I am afraid and I feel overwhelmed.',turns:[],elapsedSeconds:40},p)
 assert.equal(d.methodId,'grow')
 assert.equal(d.personality.personaId,'caesar')
 assert.equal(d.personality.style.directness,2)
 assert.equal(d.personality.visualCue,'empathy')
 assert.ok(coachSessionDirectivePrompt(d).includes('PERSONALITY TURN'))
 assert.equal(d.canOfferAction,false)
})


test('supporting identities use canonical contextual memory without becoming expanded public profiles',()=>{
 for(const [personaId,latestMessage] of [['lea','approval'],['noah','money'],['iris','changed my mind'],['ray','creative collaboration']]){
  assert.equal(coachPersonalityProfile(personaId),null)
  const input={personaId,latestMessage,locale:'en',interventionId:'answer_first'}
  const turn=coachPersonalityTurn(input)
  assert.ok(turn?.memoryEntryId,personaId)
  assert.equal(turn.mode,'answer')
  assert.deepEqual(turn.affinity,[])
  assert.equal(coachPersonalityTurn({...input,latestMessage:'ZXQJ unrelated'}),null)
  assert.equal(coachPersonalityTurn({...input,noAdvice:true}),null)
  assert.equal(coachPersonalityTurn({...input,memoryBlocked:true}),null)
  assert.equal(coachPersonalityTurn({...input,empathy:{emotion:'fear',evidence:'explicit_current_self_report',certainty:'explicit'}}),null)
 }
 assert.equal(coachPersonalityTurn({personaId:'constructor',latestMessage:'approval',interventionId:'answer_first'}),null)
})
