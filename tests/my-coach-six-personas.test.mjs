import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,statSync} from 'node:fs'
import {COACH_PERSONAS,PUBLIC_COACH_PERSONA_IDS,PUBLIC_COACH_PERSONAS,getCoachPersona,
  coachSessionHref,buildCoachBehaviorPolicy} from '../lib/coaching/persona-registry.mjs'
import {getCoachPresentation} from '../lib/coaching/persona-presentations.mjs'
import {COACH_CONVERSATION_VOICES,COACH_STYLE_MOVES} from '../lib/coaching/conversational-persona.mjs'
import {COACH_CHIRP_VOICE_NAMES,googleChirpVoice} from '../lib/coaching/my-coach-google-chirp.mjs'
import {MY_COACH_FISH_VOICES,myCoachFishVoice} from '../lib/coaching/my-coach-fish-voice.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('six public AI coaches and four historical hidden characters',()=>{
  assert.deepEqual(PUBLIC_COACH_PERSONA_IDS,['mira','max','sofia','alex','merlin','harry'])
  assert.deepEqual(PUBLIC_COACH_PERSONAS.map(p=>p.id),PUBLIC_COACH_PERSONA_IDS)
  assert.equal(COACH_PERSONAS.length,10)
  for(const id of ['lea','noah','iris','ray'])assert.ok(!PUBLIC_COACH_PERSONA_IDS.includes(id))
  const catalog=read('components/my-coach-catalog.jsx')
  assert.ok(catalog.includes('const displayedCoaches = visibleList'))
  assert.ok(!catalog.includes('visibleList.slice(0, 4)'))
  assert.ok(catalog.includes('PUBLIC_COACH_PERSONA_IDS.map(id =>'))
})
test('Merlin and Harry have distinct EN/RU/ES voices, safe stages and session routing',()=>{
  for(const id of ['merlin','harry']){
    const persona=getCoachPersona(id)
    assert.ok(persona)
    assert.ok(COACH_CONVERSATION_VOICES[id]?.character)
    assert.ok(COACH_STYLE_MOVES[id])
    assert.ok(MY_COACH_FISH_VOICES[id])
    for(const lang of ['en','ru','es']){
      const intro=getCoachPresentation(id,lang)
      assert.ok(intro?.text?.length>=130,id+'/'+lang)
      assert.ok(intro?.text?.includes(persona.name[lang]),id+'/'+lang)
      assert.ok(intro?.style?.length>15,id+'/'+lang)
      assert.match(coachSessionHref(lang,id),new RegExp('^/'+lang+'/coaching/sessions\\?coach='+id))
      const policy=buildCoachBehaviorPolicy(id,{},lang)
      assert.equal(policy.settings.questionsPerTurn,1)
      assert.match(policy.systemInstructions,/Never diagnose/)
    }
  }
  assert.notEqual(getCoachPresentation('merlin','ru').style,getCoachPresentation('harry','ru').style)
})
test('six unique Google voices retain the previous cost and consent gates',()=>{
  for(const lang of ['en','ru','es']){
    const voices=PUBLIC_COACH_PERSONA_IDS.map(id=>googleChirpVoice(lang,id)?.name)
    assert.equal(new Set(voices).size,6)
    assert.ok(voices.every(Boolean))
  }
  assert.equal(Object.keys(COACH_CHIRP_VOICE_NAMES).length,10)
  assert.equal(myCoachFishVoice('merlin','ru',{}),MY_COACH_FISH_VOICES.merlin)
  assert.equal(myCoachFishVoice('harry','ru',{}),MY_COACH_FISH_VOICES.harry)
  assert.match(read('lib/coaching/my-coach-google-chirp.mjs'),/HH_MY_COACH_GOOGLE_CHIRP_COST_APPROVED/)
})
test('distinct static artwork and no unprovided MP4 requests',()=>{
  assert.ok(statSync(new URL('../public/images/holistic-house/my-coach-motion/merlin-still.webp',import.meta.url)).size>1000)
  assert.match(read('public/images/holistic-house/my-coach-motion/harry-still.svg'),/<svg[^>]+xmlns=/)
  const media=read('components/my-coach-motion-media.jsx')
  assert.match(media,/const VIDEO_PERSONAS=new Set\(\['mira','max','sofia','alex'\]\)/)
  assert.ok(media.includes("MEDIA_ROOT+'harry-still.svg'"))
  assert.ok(media.includes("MEDIA_ROOT+personaId+'-still.webp'"))
  const api=read('app/api/coaching/intro/[locale]/[coach]/route.js')
  const audio=read('lib/personal-coaching/direct-coach-intro-audio.mjs')
  for(const source of [api,audio])assert.match(source,/mira\|max\|sofia\|alex\|merlin\|harry/)
})
