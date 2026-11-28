import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {COACH_PERSONAS,PUBLIC_COACH_PERSONA_IDS,getCoachPersona,resolveCoachMethodId,coachSessionHref,resolveCoachSelection,coachStagePrompt,buildCoachBehaviorPolicy} from '../lib/coaching/persona-registry.mjs'
import {getCoachCompactProfile} from '../lib/coaching/coach-compact-profiles.mjs'
import {getCoachPresentation} from '../lib/coaching/persona-presentations.mjs'
import {COACH_OPENING_PUBLIC_IDS,COACH_OPENING_IDS,COACH_OPENING_QUESTION_BANK,coachOpeningIntro} from '../lib/coaching/coach-opening-protocol.mjs'
import {approvedGeminiVoice,allowedGeminiCoachVoice} from '../lib/coaching/gemini-voice-catalog.mjs'
import {coachIntroAudioPath} from '../lib/personal-coaching/direct-coach-intro-audio.mjs'
import {coachGreetingObjectKey} from '../lib/coaching/coach-greeting-mp3-store.mjs'
import {normalizeMyCoachProtocol,myCoachProtocolPdfOptions} from '../lib/personal-coaching/session-protocol.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('Caesar is the eighth public persona, not a replacement or a hidden duplicate',()=>{
 assert.deepEqual(PUBLIC_COACH_PERSONA_IDS,['mira','max','sofia','alex','merlin','harry','genie','caesar'])
 assert.deepEqual(COACH_OPENING_PUBLIC_IDS,PUBLIC_COACH_PERSONA_IDS)
 assert.equal(COACH_PERSONAS.length,12)
 assert.equal(resolveCoachMethodId('caesar'),'grow')
 assert.equal(resolveCoachMethodId('caesar','tgrow'),'tgrow')
 assert.equal(resolveCoachMethodId('caesar','woop'),null)
})

test('Caesar has independent localized profile, five compass steps and one-question policy',()=>{
 const persona=getCoachPersona('caesar')
 for(const locale of ['ru','en','es']){
  const profile=getCoachCompactProfile('caesar',locale)
  assert.equal(profile.name,persona.name[locale])
  assert.equal(profile.specialtySteps.length,5)
  assert.equal(profile.methodId,'grow')
  assert.ok(profile.character&&profile.archetype&&profile.guardrail&&profile.quote)
  assert.ok(getCoachPresentation('caesar',locale).text.includes(persona.name[locale]))
  assert.ok(coachOpeningIntro('caesar',locale).includes(persona.name[locale]))
  for(const stage of COACH_OPENING_IDS)assert.equal(COACH_OPENING_QUESTION_BANK.caesar[stage][locale].length,4)
  for(const stage of ['goal','reality','resources','options','action'])assert.equal((coachStagePrompt('caesar',stage,locale).match(/\?/g)||[]).length,1)
  const selected=resolveCoachSelection(Object.fromEntries(new URL(coachSessionHref(locale,'caesar'), 'https://example.test').searchParams))
  assert.equal(selected.personaId,'caesar')
  const policy=buildCoachBehaviorPolicy('caesar',{questionsPerTurn:99},locale)
  assert.equal(policy.settings.questionsPerTurn,1)
  assert.ok(policy.systemInstructions.includes(profile.guardrail))
 }
})

test('Caesar greeting and approved voice are independent; no unapproved Spanish voice',()=>{
 for(const locale of ['ru','en']){
  assert.equal(approvedGeminiVoice('caesar',locale),locale==='ru'?'Algenib':'Alnilam')
  assert.equal(coachIntroAudioPath('caesar',locale),'/api/coaching/intro/'+locale+'/caesar?v=5')
  assert.equal(coachGreetingObjectKey('caesar',locale,'v5'),'v5/'+locale+'/caesar.mp3')
 }
 assert.equal(approvedGeminiVoice('caesar','es'),null)
 assert.equal(allowedGeminiCoachVoice('caesar','Puck'),false)
 assert.equal(allowedGeminiCoachVoice('caesar','Achird'),false)
 assert.equal(coachGreetingObjectKey('caesar','es','v5'),null)
 assert.equal(coachGreetingObjectKey('max','ru','v5'),null)
})

test('Caesar protocol remains in the shared archive with its own method and identity',()=>{
 const protocol=normalizeMyCoachProtocol({
 id:'8afbf841-49a0-46e1-b5c1-124a116efa28',personaId:'caesar',locale:'ru',
 startedAt:'2026-11-26T13:00:00.000Z',completedAt:'2026-11-26T13:20:00.000Z',durationSeconds:1200,
 goal:'Принять решение',clientSummary:'Я могу выбрать свой следующий шаг.',clientNextStep:'Назначить встречу.',
 turns:[{role:'user',content:'Хочу прояснить свою позицию.'},{role:'assistant',content:'Что сейчас зависит от вас?',mode:'ai'}]})
 assert.equal(protocol.personaId,'caesar')
 assert.equal(protocol.methodId,'grow')
 assert.equal(protocol.clientNextStep,'Назначить встречу.')
 assert.equal(myCoachProtocolPdfOptions(protocol,{locale:'ru'}).slug,'my-coach-caesar')
})

test('visual identity is honest and existing owner video pilot is Caesar-only',()=>{
 const live=read('components/my-coach-gemini-live.jsx')
 assert.match(live,/personaId\s*===\s*['"]caesar['"]/)
 assert.ok(live.includes('NEXT_PUBLIC_HH_SIMLI_OWNER_DIALOGUE_PILOT'))
 assert.ok(read('public/images/holistic-house/my-coach-motion/caesar-emblem.svg').includes('<svg'))
 assert.ok(read('components/my-coach-motion-media.jsx').includes('caesar-emblem.svg'))
})

// Execute the bounded static-video checks in the existing coaching release suite.
import './coach-caesar-static-video.test.mjs'
import './caesar-webrtc-capture.test.mjs'
import './caesar-capture-ui.test.mjs'
