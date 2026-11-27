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

import {geminiFreeLiveConfig,issueGeminiFreeLiveToken,normalizeGeminiFreeLiveStart} from '../lib/coaching/gemini-live-free.mjs'
import {geminiLiveSetupForToken} from '../lib/coaching/gemini-live-transport.mjs'
import {COACH_AUDIO_PROFILE_VERSION} from '../lib/coaching/coach-audio-wire.mjs'
import {normalizeGeminiCoachTtsInput,synthesizeGeminiCoachTts} from '../lib/coaching/gemini-coach-tts.mjs'
const body={personaId:'mira',locale:'ru',settings:{},voiceName:'Sulafat',consent:true,voiceConsent:true,trainingUseConsent:true}
test('all 16 approved public Coaching configurations reach exact outbound token JSON and browser setup',async()=>{
 const config=geminiFreeLiveConfig({HH_GEMINI_FREE_API_KEY:'AIza'+'A'.repeat(36),HH_MY_COACH_GEMINI_FREE_ENABLED:'true',HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED:'true',HH_MY_COACH_GEMINI_FREE_DATA_APPROVED:'true',HH_MY_COACH_GEMINI_LIVE_FREE_ENABLED:'true',HH_COACHING_BRAIN_ENABLED:'true',HH_COACHING_LIVE_VOICE_ENABLED:'true',HH_COACHING_LIVE_VOICE_APPROVED:'true'})
 for(const id of ['mira','max','sofia','alex','merlin','harry','genie','caesar'])for(const locale of ['ru','en']){
  const voice=approvedGeminiVoice(id,locale),start=normalizeGeminiFreeLiveStart({...body,personaId:id,locale,voiceName:voice});let sent;
  const token=await issueGeminiFreeLiveToken(config,start,{now:1795100000000,fetcher:async(_url,o)=>{sent=JSON.parse(o.body);return {ok:true,status:200,json:async()=>({name:'auth_tokens/synthetic-audio-profile'})}}});
  const setup=sent.bidiGenerateContentSetup;assert.ok(sent.fieldMask.split(',').includes('systemInstruction'));assert.ok(setup.systemInstruction.parts[0].text.includes(coachVocalDelivery(id,locale,voice,'coaching')));assert.ok(!setup.systemInstruction.parts[0].text.includes(coachVocalDelivery(id,locale,voice,'therapy')));
  assert.equal(token.audioProfile.version,COACH_AUDIO_PROFILE_VERSION);assert.equal(token.audioProfile.mode,'coaching');assert.equal(token.audioProfile.voiceName,voice);
  const socket=geminiLiveSetupForToken(token,start).setup;assert.deepEqual(socket.generationConfig.speechConfig,setup.generationConfig.speechConfig);assert.deepEqual(socket.realtimeInputConfig,setup.realtimeInputConfig);
  for(const patch of [{mode:'therapy'},{version:'wrong'},{locale:'es'},{voiceName:'wrong'},{silenceDurationMs:1},{courseSessionId:'different'}])assert.throws(()=>geminiLiveSetupForToken({...token,audioProfile:{...token.audioProfile,...patch}},start));
  assert.throws(()=>geminiLiveSetupForToken({...token,audioProfile:null},start)); const {audioProfile,...legacy}=token;assert.equal(geminiLiveSetupForToken(legacy,start).setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,voice)
 }
 assert.throws(()=>normalizeGeminiFreeLiveStart({...body,courseSessionId:'anti_stress_ground'}));assert.throws(()=>normalizeGeminiFreeLiveStart({...body,mode:'therapy'}))
})
test('TTS default sends the same profile and public request cannot select therapy',async()=>{
 const request={provider:'gemini_tts_free',locale:'ru',personaId:'mira',text:'Нейтральный тест.',voiceName:'Sulafat',voiceConsent:true,cloudVoiceConsent:true,trainingUseConsent:true};assert.throws(()=>normalizeGeminiCoachTtsInput({...request,mode:'therapy'}));const input=normalizeGeminiCoachTtsInput(request);let sent;
 await assert.rejects(synthesizeGeminiCoachTts({config:{provider:'gemini_tts_free',model:'gemini-3.8-flash-lite-tts',apiKey:'AIza'+'A'.repeat(36)},input,fetcher:async(_u,o)=>{sent=JSON.parse(o.body);return {ok:false,status:503}}}),/GEMINI_COACH_TTS_UNAVAILABLE/);assert.equal(sent.input[0].content[0].annotations[0].style,coachVocalDelivery('mira','ru',input.voiceName,'coaching'));assert.equal(sent.store,false)
})
