import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_SIGNATURE_SPEECH,COACH_SIGNATURE_CONTEXTS,getCoachSignatureSpeech,coachSignatureContext,selectCoachSignatureReply,coachSignatureReplyGuidance} from '../lib/coaching/coach-signature-speech.mjs'
import {coachPersonalityProfile,coachPersonalityTurn,coachPersonalityTurnGuidance,coachPersonalityBaseInstruction} from '../lib/coaching/coach-personality-dialogue.mjs'
import {getCoachStylePassport} from '../lib/coaching/coach-style-passports.mjs'
import {coachLivePersonalityGuidance,withCoachLivePersonality} from '../lib/coaching/coach-personality-live.mjs'

const ids=['mira','max','sofia','alex','merlin','harry','genie','caesar']
const locales=['en','ru','es']
const mood=emotion=>({emotion,evidence:'explicit_current_self_report',certainty:'explicit'})
test('128 original supporting and inspiring statements, 384 localized variants, shared immutable passports',()=>{
 assert.deepEqual(Object.keys(COACH_SIGNATURE_SPEECH),ids)
 for(const locale of locales){
  const seen=new Set()
  for(const id of ids){
   const profile=getCoachSignatureSpeech(id)
   assert.equal(coachPersonalityProfile(id).signatureSpeech,profile)
   assert.equal(getCoachStylePassport(id).signatureSpeech,profile)
   assert.ok(Object.isFrozen(profile))
   assert.match(coachPersonalityBaseInstruction(id),/SIGNATURE SPEECH/)
   for(const kind of COACH_SIGNATURE_CONTEXTS){
    assert.equal(profile[kind].length,2)
    for(const row of profile[kind]){
     assert.ok(Object.isFrozen(row))
     assert.ok(row[locale].length>=12&&row[locale].length<=180)
     assert.doesNotMatch(row[locale],/[?¿]/)
     assert.ok(!seen.has(row[locale]))
     seen.add(row[locale])
    }
   }
  }
  assert.equal(seen.size,128)
 }
 for(const id of ['__proto__','lea','noah','iris','ray','unknown'])assert.equal(getCoachSignatureSpeech(id),null)
})
test('recent heard assistant phrases rotate, suppress exhausted variants, never use client text as cues',()=>{
 for(const personaId of ids)for(const locale of locales)for(const kind of COACH_SIGNATURE_CONTEXTS){
  const a=selectCoachSignatureReply(personaId,kind,locale)
  const b=selectCoachSignatureReply(personaId,kind,locale,[{role:'assistant',content:a.text.toUpperCase()}])
  assert.ok(a&&b&&a.id!==b.id)
  assert.equal(selectCoachSignatureReply(personaId,kind,locale,[{role:'assistant',content:a.text},{role:'assistant',content:b.text}]),null)
  assert.equal(selectCoachSignatureReply(personaId,kind,locale,[{role:'user',content:a.text}]).id,a.id)
  assert.equal(coachSignatureReplyGuidance({...a,text:'PRIVATE_SENTINEL'},personaId,locale),'')
  assert.ok(coachSignatureReplyGuidance(a,personaId,locale).includes(a.text))
 }
})
test('Director mode governs supportive versus inspirational voice; no unsolicited technique or praise',()=>{
 for(const personaId of ids)for(const locale of locales){
  const p={personaId,locale,stage:'goal'}
  const samples=[
   [{...p,empathy:mood('fear')},'support'],
   [{...p,interventionId:'reduce_scope'},'uncertainty'],
   [{...p,noAdvice:true},'listen'],
   [{...p},'inspire'],
   [{...p,empathy:mood('joy')},'recognize'],
   [{...p,stage:'action'},'action'],
   [{...p,stage:'review'},'review'],
   [{...p,interventionId:'allow_close'},'close'],
   [{...p,interventionId:'answer_first',empathy:mood('fear')},null],
   [{...p,interventionId:'repair_misunderstanding'},null],
   [{...p,interventionId:'respond_socially'},null],
   [{...p,interventionId:'reflect_without_question'},null],
   [{...p,stage:'reality',empathy:{emotion:'joy',evidence:'guess',certainty:'low'}},null],
  ]
  for(const [input,expected] of samples){
   const turn=coachPersonalityTurn(input)
   assert.equal(turn.signatureKind,expected)
   assert.equal(Boolean(turn.signatureReply),Boolean(expected))
   const text=coachPersonalityTurnGuidance(turn)
   assert.match(text,/authorized move, evidence target, question limit/)
   if(expected){
    assert.ok(text.includes(turn.signatureReply.text))
    assert.match(text,/optional style-only example, not client data/)
    assert.doesNotMatch(text,/Fictional style-only example/)
   }
   const mandatory='Director: keep mandatory consent, current method, evidence and stage.'
   const voice=coachLivePersonalityGuidance(mandatory,turn)
   assert.ok(voice.startsWith(mandatory)&&voice.length<=620)
   if(expected)assert.ok(voice.includes(turn.signatureReply.text))
   for(const n of [500,590,619,620]){
    const required='X'.repeat(n)
    const g=coachLivePersonalityGuidance(required,turn)
    assert.ok(g.startsWith(required)&&g.length<=620)
   }
   const open=withCoachLivePersonality({guidance:mandatory,openingProgress:{completed:false}},turn)
   assert.doesNotMatch(open.guidance,/Optional voice cue/)
  }
  const a=coachPersonalityTurn(p),b=coachPersonalityTurn({...p,recentTurns:[{role:'assistant',content:a.signatureReply.text}]})
  const exhausted=coachPersonalityTurn({...p,recentTurns:[{role:'assistant',content:a.signatureReply.text},{role:'assistant',content:b.signatureReply.text}]})
  assert.equal(exhausted.signatureReply,null)
  assert.doesNotMatch(coachPersonalityTurnGuidance(exhausted),/Fictional style-only example|SIGNATURE SPEECH \(optional/)
 }
})
