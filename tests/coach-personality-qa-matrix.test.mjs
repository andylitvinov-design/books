import test from 'node:test'
import assert from 'node:assert/strict'
import {PUBLIC_COACH_PERSONA_IDS} from '../lib/coaching/persona-registry.mjs'
import {coachPersonalityTurn,coachPersonalityTurnGuidance} from '../lib/coaching/coach-personality-dialogue.mjs'
import {coachLivePersonalityGuidance} from '../lib/coaching/coach-personality-live.mjs'
import {COACH_PERSONALITY_QA_SITUATIONS} from './fixtures/coach-personality-qa-situations.mjs'

test('480 distinct persona x Director scenarios, 1440 locale checks; holdout kept outside runtime prompts',()=>{
 let combinations=0,localized=0,holdout=0
 for(const personaId of PUBLIC_COACH_PERSONA_IDS)for(const f of COACH_PERSONALITY_QA_SITUATIONS){
  combinations++
  if(f.split==='holdout')holdout++
  for(const locale of ['en','ru','es']){
   const input={personaId,locale,stage:f.stage,interventionId:f.interventionId,
    settings:{warmth:2,directness:5,pace:'fast',depth:'deep'},noAdvice:f.noAdvice===true,
    timebox:{offerWrapUp:f.wrap===true},empathy:f.emotion?{emotion:f.emotion,evidence:'explicit_current_self_report',certainty:'explicit'}:null}
   const turn=coachPersonalityTurn(input)
   assert.equal(turn.mode,f.expectedMode,f.id)
   assert.equal(turn.personaId,personaId)
   assert.equal(turn.locale,locale)
   if(f.soft){assert.ok(turn.style.directness<=2);assert.equal(turn.style.pace,'slow');assert.equal(turn.humorAllowed,false);assert.equal(turn.metaphorAllowed,false)}
   if(f.wrap){assert.equal(turn.concise,true);assert.equal(turn.humorAllowed,false)}
   if(['repair','answer','close','listen'].includes(f.expectedMode))assert.equal(turn.humorAllowed,false)
   const mandatory='Director: preserve client consent, evidence and the authorized stage.'
   const guide=coachLivePersonalityGuidance(mandatory,turn)
   assert.ok(guide.startsWith(mandatory)&&guide.length<=620)
   assert.match(coachPersonalityTurnGuidance(turn),/authorized move, evidence target, question limit/)
   localized++
  }
 }
 assert.equal(combinations,480)
 assert.equal(localized,1440)
 assert.equal(holdout,96)
})
