import test from 'node:test'
import assert from 'node:assert/strict'
import {coachPersonalityTurn} from '../lib/coaching/coach-personality-dialogue.mjs'
import {coachLivePersonalityGuidance,withCoachLivePersonality} from '../lib/coaching/coach-personality-live.mjs'
import {geminiFreeLiveCheckpoint} from '../lib/coaching/gemini-live-free.mjs'
import {PUBLIC_COACH_PERSONA_IDS} from '../lib/coaching/persona-registry.mjs'

test('Live personality only appends whole bounded delivery hints to the mandatory checkpoint',()=>{
 for(const personaId of PUBLIC_COACH_PERSONA_IDS)for(const emotion of ['fear','shame','sad','anger','overload','joy','relief',null]){
  const turn=coachPersonalityTurn({personaId,stage:'reality',settings:{directness:5,pace:'fast',depth:'deep'},empathy:emotion?{emotion,evidence:'explicit_current_self_report',certainty:'explicit'}:null})
  const original=Object.freeze({guidance:'Required opening: wait for clear consent. Never claim missing evidence is confirmed.',stage:'reality',readiness:{ready:false},private:'PRIVATE_SENTINEL'})
  const result=withCoachLivePersonality(original,turn)
  assert.ok(result.guidance.startsWith(original.guidance))
  assert.equal(result.stage,original.stage)
  assert.equal(result.readiness,original.readiness)
  assert.doesNotMatch(result.guidance,/PRIVATE_SENTINEL/)
  if(['fear','shame','sad','anger','overload'].includes(emotion)){
   assert.match(result.guidance,/directness 2\/5/)
   assert.match(result.guidance,/No jokes\./)
   assert.match(result.guidance,/No metaphors\./)
  }
  for(const n of [500,590,619,620]){
   const required='X'.repeat(n)
   const out=coachLivePersonalityGuidance(required,turn)
   assert.ok(out.startsWith(required))
   assert.ok(out.length<=620)
  }
 }
 assert.equal(coachLivePersonalityGuidance('original',null),'original')
})
test('real Gemini checkpoint uses the same registered Caesar delivery policy without new consent or progress',()=>{
 const body={personaId:'caesar',locale:'en',settings:{directness:5,pace:'fast',depth:'deep'},consent:true,voiceConsent:true,trainingUseConsent:true,message:'I am afraid and I feel overwhelmed.',turns:[],openingHistory:[],elapsedSeconds:0}
 const result=geminiFreeLiveCheckpoint(body)
 assert.equal(result.schema,'HH_GEMINI_LIVE_DIRECTOR_V1')
 assert.equal(result.openingProgress.completed,false)
 assert.match(result.guidance,/Required opening:/)
 assert.match(result.guidance,/directness 2\/5/)
 assert.match(result.guidance,/No jokes\./)
 assert.ok(result.guidance.length<=620)
})
