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
 assert.equal(coachAudioModeForCourse(null),'coaching');assert.equal(coachAudioModeForCourse({type:'therapy'}),'therapy');assert.equal(coachAudioModeForCourse({mode:'therapy'}),'coaching');assert.equal(coachAudioModeForCourse({programType:'therapy'}),'coaching')
})

import {geminiFreeLiveSetup,normalizeGeminiFreeLiveStart} from '../lib/coaching/gemini-live-free.mjs'
import {ANTI_STRESS_SESSION_IDS,ANTI_STRESS_PROGRAM_ID,coachProgramSettings} from '../lib/coaching/coach-program-mode.mjs'
import {normalizeGeminiCoachTtsInput,synthesizeGeminiCoachTts} from '../lib/coaching/gemini-coach-tts.mjs'
const body={personaId:'mira',locale:'ru',settings:{},voiceName:'Sulafat',consent:true,voiceConsent:true,trainingUseConsent:true}
test('live tokens preserve each approved base voice and select exact mode only in guarded therapy path',()=>{
 for(const id of ['mira','max','sofia','alex','merlin','harry','genie','caesar'])for(const locale of ['ru','en']){
  const voice=approvedGeminiVoice(id,locale)
  const start=normalizeGeminiFreeLiveStart({...body,personaId:id,locale,voiceName:voice})
  const ordinary=geminiFreeLiveSetup(start), internal={...start,courseSessionId:ANTI_STRESS_SESSION_IDS[0]}
  assert.throws(()=>geminiFreeLiveSetup(internal)); assert.throws(()=>normalizeGeminiFreeLiveStart({...body,courseSessionId:ANTI_STRESS_SESSION_IDS[0]}))
  const therapy=geminiFreeLiveSetup(internal,{trustedTherapy:true})
  assert.equal(ordinary.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,voice);assert.equal(therapy.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,voice)
  assert.ok(ordinary.systemInstruction.parts[0].text.includes(coachVocalDelivery(id,locale,voice,'coaching')))
  assert.ok(therapy.systemInstruction.parts[0].text.includes(coachVocalDelivery(id,locale,voice,'therapy')))
  assert.ok(!therapy.systemInstruction.parts[0].text.includes(coachVocalDelivery(id,locale,voice,'coaching')))
  assert.equal(therapy.realtimeInputConfig.automaticActivityDetection.silenceDurationMs,1400)
 }
 assert.equal(coachAudioModeForCourse(coachProgramSettings(ANTI_STRESS_PROGRAM_ID)),'therapy')
})
test('TTS public request rejects mode overrides; internal trusted course changes delivery without changing voice or making a vendor call',async()=>{
 const request={provider:'gemini_tts_free',locale:'ru',personaId:'mira',text:'Нейтральный тест.',voiceName:'Sulafat',voiceConsent:true,cloudVoiceConsent:true,trainingUseConsent:true}
 assert.throws(()=>normalizeGeminiCoachTtsInput({...request,mode:'therapy'}));assert.throws(()=>normalizeGeminiCoachTtsInput({...request,trustedProgramSettings:{type:'therapy'}}))
 const input=normalizeGeminiCoachTtsInput(request), config={provider:'gemini_tts_free',model:'gemini-3.8-flash-lite-tts',apiKey:'AIza'+'A'.repeat(36)}
 for(const mode of ['coaching','therapy']){
  let sent;const fetcher=async(_url,o)=>{sent=JSON.parse(o.body);return {ok:false,status:503}}
  await assert.rejects(synthesizeGeminiCoachTts({config,input,fetcher,trustedProgramSettings:coachProgramSettings(mode==='therapy'?ANTI_STRESS_PROGRAM_ID:null)}),/GEMINI_COACH_TTS_UNAVAILABLE/)
  assert.equal(sent.input[0].content[0].annotations[0].style,coachVocalDelivery('mira','ru',input.voiceName,mode));assert.equal(sent.generation_config.speech_config[0].voice,input.voiceName);assert.equal(sent.store,false)
 }
})
