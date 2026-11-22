import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getCoachPersona,PUBLIC_COACH_PERSONA_IDS,buildCoachBehaviorPolicy,coachSessionHref} from '../lib/coaching/persona-registry.mjs'
import {getCoachCompactProfile} from '../lib/coaching/coach-compact-profiles.mjs'
import {getCoachPresentation} from '../lib/coaching/persona-presentations.mjs'
import {coachOpeningIntro,coachOpeningProgress,COACH_OPENING_QUESTION_BANK} from '../lib/coaching/coach-opening-protocol.mjs'
import {approvedGeminiVoice,allowedGeminiCoachVoice} from '../lib/coaching/gemini-voice-catalog.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('Samir is a seventh visible coach with full localized profile and formal opening',()=>{
  assert.equal(PUBLIC_COACH_PERSONA_IDS.length,7)
  assert.equal(PUBLIC_COACH_PERSONA_IDS.at(-1),'genie')
  const p=getCoachPersona('genie')
  assert.deepEqual(p.methods,['WOOP','Appreciative inquiry'])
  for(const lang of ['en','ru','es']){
    const profile=getCoachCompactProfile('genie',lang)
    assert.ok(profile?.archetype?.length>10)
    assert.ok(profile?.style?.length>15)
    assert.ok(profile?.workStyle?.length>15)
    assert.equal(profile.focus.length,3)
    assert.ok(getCoachPresentation('genie',lang)?.text.includes(p.name[lang]))
    assert.ok(coachOpeningIntro('genie',lang).includes(p.name[lang]))
    assert.match(coachSessionHref(lang,'genie'),new RegExp('^/'+lang+'/coaching/sessions\\?coach=genie'))
    assert.equal(COACH_OPENING_QUESTION_BANK.genie.invitation[lang].length,4)
    const policy=buildCoachBehaviorPolicy('genie',{},lang)
    assert.match(policy.systemInstructions,/Never diagnose/)
    assert.ok(policy.systemInstructions.includes(profile.archetype))
  }
})
test('maybe or no never advances consent; client owns each stage',()=>{
  for(const utterance of ['может быть','нет']){
    const p=coachOpeningProgress({personaId:'genie',locale:'ru',turns:[utterance]})
    assert.equal(p.checkmarks.invitation,false)
  }
  const p=coachOpeningProgress({personaId:'genie',locale:'ru',
    turns:['да','Меня зовут Саша','goal','мне радостно','да']})
  assert.equal(p.completed,true)
  assert.equal(p.answers.name.value,'Саша')
})
test('provisional Gemini voice is allowed without changing the six owner-approved presets',()=>{
  assert.equal(approvedGeminiVoice('genie','ru'),'Puck')
  assert.equal(approvedGeminiVoice('genie','en'),'Puck')
  assert.equal(approvedGeminiVoice('genie','es'),null)
  assert.equal(allowedGeminiCoachVoice('genie','Puck'),true)
})
test('original static media exists and does not claim a nonexistent video',()=>{
  const svg=read('public/images/holistic-house/my-coach-motion/genie-still.svg')
  assert.ok(svg.startsWith('<svg '))
  assert.ok(svg.includes('Samir the Genie'))
  assert.ok(!svg.toLowerCase().includes('disney'))
  assert.ok(!svg.toLowerCase().includes('aladdin'))
  const media=read('components/my-coach-motion-media.jsx')
  assert.ok(media.includes("personaId==='genie'?MEDIA_ROOT+'genie-still.svg'"))
  assert.ok(media.includes("const VIDEO_PERSONAS=new Set(['mira','max','sofia','alex','merlin','harry'])"))
  assert.ok(read('components/app/coaching-avatar.jsx').includes('genie-still.svg'))
})
test('deeper Genie character passport reaches client-facing profile and model safely',()=>{
 const profile=getCoachCompactProfile('genie','ru')
 assert.match(profile.character,/настоящим потребностям/)
 assert.match(profile.workStyle,/Компас трёх искр/)
 assert.match(profile.mission,/реалистичный шаг/)
 assert.match(profile.emotionalTone,/спокойствие/)
 assert.match(profile.guardrail,/молчание/)
 assert.equal(profile.specialty,'Компас трёх искр')
 assert.equal(profile.specialtySteps.length,3)
 assert.ok(profile.specialtySteps.every(step=>step.length>18))
 const behavior=buildCoachBehaviorPolicy('genie',{},'ru').systemInstructions
 assert.match(behavior,/Original Samir behavior standards/)
 assert.match(behavior,/Never invent memories/)
 assert.match(behavior,/drop theatrical metaphors/)
 assert.match(behavior,/Ask at most one question/)
 for(const id of ['mira','max','sofia','alex','merlin','harry'])
  assert.equal(getCoachCompactProfile(id,'ru').specialty,null)
 const component=read('components/my-coach-compact-profile.jsx')
 assert.ok(component.includes('data-genie-compass-profile'))
 assert.ok(component.includes("personaId==='genie'"))
});
