import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {ALI_PERSONAS,ALI_DEFAULT_PERSONA_ID,ALI_PERSONA_STORAGE_KEY,
 getAliPersona,isAliPersonaId,aliPersonaGreeting} from '../lib/holistic-support/ali-personas.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('four portrait choices: two male and two female with distinct preapproved voice IDs',()=>{
 assert.equal(ALI_PERSONAS.length,4)
 assert.equal(ALI_PERSONAS.filter(p=>p.gender==='male').length,2)
 assert.equal(ALI_PERSONAS.filter(p=>p.gender==='female').length,2)
 assert.deepEqual(new Set(ALI_PERSONAS.map(p=>p.id)).size,4)
 assert.equal(getAliPersona('bogus').id,ALI_DEFAULT_PERSONA_ID)
 assert.equal(isAliPersonaId('bogus'),false)
 assert.equal(isAliPersonaId('mira'),true)
 assert.equal(ALI_PERSONA_STORAGE_KEY,'hh:ai-chat-persona-v1')
 for(const persona of ALI_PERSONAS){
  assert.ok(existsSync(new URL('../public'+persona.image,import.meta.url)),persona.image)
  for(const locale of ['ru','en','es']){
   assert.ok(persona.name[locale])
   assert.ok(persona.role[locale])
   const text=aliPersonaGreeting(persona.id,locale)
   assert.ok(text.includes(persona.name[locale]),'localized speaker name must be spoken')
   assert.ok(text.length>50&&text.length<500,'safe short fixed speech')
  }
 }
 const fish=source('lib/coaching/my-coach-fish-voice.mjs')
 const google=source('lib/coaching/my-coach-google-chirp.mjs')
 for(const persona of ALI_PERSONAS){
  assert.match(fish,new RegExp(persona.id+":'"))
  assert.match(google,new RegExp(persona.id+":'"))
 }
})

test('UI retains protected chat and history while exposing visible selectable voice samples',()=>{
 const header=source('components/app/messages-orders-clients.jsx')
 const picker=source('components/app/ali-persona-picker.jsx')
 const landing=source('components/app/messenger-ai-landing.tsx')
 const chat=source('components/holistic-agent-chat.tsx')
 const audio=source('components/app/ali-persona-audio.js')
 assert.match(header,/data-hh-ali-persona-open/)
 assert.match(header,/<AliPersonaPicker open=\{personaOpen\}/)
 assert.match(header,/<MessengerAiWorkspace key=\{aiSession\}/)
 assert.match(picker,/data-ali-voice-preview=\{persona.id\}/)
 assert.match(picker,/ALI_PERSONAS.map\(/)
 assert.match(picker,/role="dialog" aria-modal="true"/)
 assert.match(picker,/hh:messenger-open-history/)
 assert.match(landing,/data-hh-ai-persona-voice-play/)
 assert.match(landing,/playAliPersonaAudio\(persona.id,locale/)
 assert.match(landing,/data-hh-ai-intro-play onClick=\{start\}/)
 assert.match(chat,/src=\{persona.image\|\|/)
 assert.match(chat,/voice.setVoiceId\(selected\)/)
 assert.match(audio,/window.speechSynthesis/)
 assert.doesNotMatch(audio,/JSON.stringify\(\{.*message/)
})

test('public natural voice route is fixed-content, rate-limited and does not accept private chat turns',()=>{
 const route=source('app/api/ali/voice/[locale]/[persona]/route.js')
 assert.match(route,/aliPersonaGreeting\(persona,locale\)/)
 assert.match(route,/url.search/)
 assert.match(route,/export async function HEAD/)
 assert.match(route,/my-coach-google-global/)
 assert.match(route,/my-coach-public-intro-global-day/)
 assert.match(route,/s-maxage=86400/)
 assert.doesNotMatch(route,/request.json\(/)
 assert.doesNotMatch(route,/searchParams.get\(/)
 const styles=source('components/app/ali-persona-picker.module.css')
 assert.match(styles,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
 assert.match(styles,/env\(safe-area-inset-top\)/)
 assert.match(styles,/max-height:100%/)
})
