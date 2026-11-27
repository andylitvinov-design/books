import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_PERSONAS} from '../lib/coaching/persona-registry.mjs'
import {COACH_AUDIO_PROFILES,coachAudioDirection,coachAudioModeForCourse} from '../lib/coaching/coach-audio-profiles.mjs'
import {approvedGeminiVoice,coachVocalDelivery} from '../lib/coaching/gemini-voice-catalog.mjs'
test('all twelve registered personas have distinct coaching and therapy audio profiles',()=>{
 assert.deepEqual(Object.keys(COACH_AUDIO_PROFILES).sort(),COACH_PERSONAS.map(p=>p.id).sort())
 for(const p of COACH_PERSONAS){
  const profile=COACH_AUDIO_PROFILES[p.id];assert.ok(profile.therapy.wpm<profile.coaching.wpm)
  for(const locale of ['ru','en','es']){
   const coaching=coachAudioDirection(p.id,locale,'coaching');const therapy=coachAudioDirection(p.id,locale,'therapy');
   assert.ok(coaching.includes(profile.identity));assert.ok(therapy.includes(profile.identity));assert.notEqual(coaching,therapy)
   assert.match(therapy,/permission before exercises/);assert.match(therapy,/not a licensed therapist/)
   assert.ok(coachVocalDelivery(p.id,locale,approvedGeminiVoice(p.id,locale),'therapy').includes(therapy))
  }
 }
 assert.equal(coachAudioDirection('__proto__','ru','therapy'),'')
 assert.equal(coachAudioModeForCourse(null),'coaching');assert.equal(coachAudioModeForCourse({programType:'therapy'}),'therapy');assert.equal(coachAudioModeForCourse({mode:'therapy'}),'coaching')
})
