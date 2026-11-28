import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_METHOD_QUESTION_VARIANTS,methodQuestionVariants}
 from '../lib/coaching/coach-method-question-variants.mjs'
import {COACH_PERSONA_SPEECH_VARIANTS,personaSpeechCue}
 from '../lib/coaching/coach-persona-speech-variants.mjs'
import {selectCoachDialogueVariant,coachDialogueBankGuidance}
 from '../lib/coaching/coach-dialogue-selector.mjs'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {coachSessionDirective} from '../lib/coaching/coach-session-director.mjs'
import {conversationalCoachMessages} from '../lib/coaching/conversational-persona.mjs'

const methods={
 grow:['goal','reality','options','way_forward','review'],
 tgrow:['topic','goal','reality','options','way_forward','review'],
 woop:['wish','outcome','internal_obstacle','if_then','review'],
 oskar:['outcome','scaling','know_how','affirm_action','review'],
 solution_focused:['preferred_future','exceptions','strengths','experiment','review'],
 appreciative_inquiry:['discover','dream','design','deliver','review']
}
const personaIds=['mira','max','sofia','alex','merlin','harry','genie','caesar','lea','noah','iris','ray']
const directive=(methodId='grow',step='goal',extra={})=>({
 locale:'ru',personaId:'mira',methodId,methodStepId:methodId+':'+step,
 stage:step==='review'?'review':'goal',interventionId:'clarify_goal',
 allowQuestion:true,canOfferAction:false,readiness:{missing:['goalRestated']},
 ...extra,
})
const input=(message='Я хочу разобраться с важным решением',turns=[])=>({locale:'ru',message,turns})
const policy=(extra={})=>({
 conversationAct:'substantive_reply',allowQuestion:true,questionStreak:false,
 noAdvice:false,...extra,
})
test('all six existing method shapes have three unique original questions per step in RU/EN/ES',()=>{
 assert.deepEqual(Object.keys(COACH_METHOD_QUESTION_VARIANTS).sort(),Object.keys(methods).sort())
 const uniqueIds=new Set()
 for(const [method,steps] of Object.entries(methods)){
  assert.deepEqual(Object.keys(COACH_METHOD_QUESTION_VARIANTS[method]),steps)
  for(const step of steps){
   const original=COACH_METHOD_QUESTION_VARIANTS[method][step]
   assert.equal(original.length,3,method+':'+step)
   for(const row of original){
    assert.ok(!uniqueIds.has(row.id),row.id)
    uniqueIds.add(row.id)
   }
   for(const locale of ['ru','en','es']){
    const variants=methodQuestionVariants(method,step,locale)
    assert.equal(variants.length,3)
    for(const {text,target} of variants){
     assert.ok(text.length>=25&&text.length<=185,method+':'+step+':'+locale)
     assert.match(text,/[?？]$/)
     assert.ok(target&&typeof target==='string')
    }
   }
  }
 }
 assert.equal(uniqueIds.size,93)
})
test('all twelve persona styles have eight distinct speech acts per locale, no imposed scripted questions',()=>{
 assert.deepEqual(Object.keys(COACH_PERSONA_SPEECH_VARIANTS).sort(),[...personaIds].sort())
 const acts=['contact','reflect','clarify','repair','transition','pause','review','action']
 for(const id of personaIds){
  assert.deepEqual(Object.keys(COACH_PERSONA_SPEECH_VARIANTS[id]),acts)
  for(const locale of ['ru','en','es']){
   const all=acts.map(act=>personaSpeechCue(id,act,locale))
   assert.equal(new Set(all).size,acts.length)
   all.forEach(text=>{assert.ok(text.length>=18&&text.length<=280);assert.doesNotMatch(text,/[?？]$/)})
  }
 }
})
test('server Director step and missing client evidence control next question, not turn count',()=>{
 for(const [method,steps] of Object.entries(methods)){
  for(const step of steps){
   const variants=methodQuestionVariants(method,step,'ru')
   const d=directive(method,step,{interventionId:'stage_move',readiness:{missing:[variants[0].target]}})
   const result=selectCoachDialogueVariant(input(),d,policy())
   assert.equal(result.methodStepId,method+':'+step)
   assert.equal(result.methodId,method)
   assert.ok(variants.some(x=>x.id===result.questionId))
   assert.ok(result.question)
  }
 }
 const wrong=selectCoachDialogueVariant(input(),directive('grow','goal',{methodStepId:'woop:outcome'}),policy())
 assert.equal(wrong.questionId,null)
 assert.equal(wrong.reasonCode,'unsupported_editorial_context')
})
test('greeting, direct question, refusal, no-advice, streak, brief dictation and wrap-up prevent method interrogation',()=>{
 const d=directive()
 const i=input()
 for(const act of ['greeting','question_to_coach','clarification_request','gratitude','correction','topic_shift','negation','affirmation','option_reference']){
  const result=selectCoachDialogueVariant(i,d,policy({conversationAct:act}))
  assert.equal(result.questionId,null,act)
 }
 assert.equal(selectCoachDialogueVariant(i,d,policy({noAdvice:true})).question,null)
 assert.equal(selectCoachDialogueVariant(i,d,policy({questionStreak:true})).question,null)
 assert.equal(selectCoachDialogueVariant(i,d,policy({allowQuestion:false})).question,null)
 assert.equal(selectCoachDialogueVariant(i,{...d,allowQuestion:false},policy()).question,null)
 assert.equal(selectCoachDialogueVariant(i,d,policy(),{shortFragment:true}).question,null)
 assert.equal(selectCoachDialogueVariant(i,{...d,interventionId:'invite_reflective_close'},policy()).question,null)
 assert.equal(selectCoachDialogueVariant(i,d,policy({conversationAct:'uncertainty'})).question,null)
})
test('a recently asked question is skipped even with the same allowed step',()=>{
 const d=directive()
 const i=input()
 const first=selectCoachDialogueVariant(i,d,policy())
 assert.ok(first.questionId)
 const again=selectCoachDialogueVariant(input(i.message,[
  {role:'assistant',content:first.question},
 ]),d,policy())
 assert.notEqual(again.questionId,first.questionId)
 assert.equal(selectCoachDialogueVariant(input(i.message,[
  {role:'assistant',content:methodQuestionVariants('grow','goal','ru')[0].text},
  {role:'assistant',content:methodQuestionVariants('grow','goal','ru')[1].text},
  {role:'assistant',content:methodQuestionVariants('grow','goal','ru')[2].text},
 ]),d,policy()).question,null)
})
test('no extra model call and no private text in system prompt guidance',()=>{
 const secret='PRIVATE_CLIENT_FACT_NOT_FOR_SYSTEM_PROMPTS'
 const i=input(secret)
 const prompt=coachDialogueBankGuidance(i,directive(),policy())
 assert.match(prompt,/WAVE COACHING DIALOGUE BANK/)
 assert.match(prompt,/question-id=grow:goal:/)
 assert.doesNotMatch(prompt,/PRIVATE_CLIENT_FACT/)
 for(const override of [
   policy({conversationAct:'correction'}),
   policy({noAdvice:true}),
 ]){
  const quiet=coachDialogueBankGuidance(i,directive(),override)
  assert.match(quiet,/No method-step question is recommended/)
 }
})
test('existing My Coach generated-turn prompt actually includes stage questions and persona speech cues',()=>{
 const {input:client,persona}=normalizeGenerativeCoachInput({
  personaId:'mira',locale:'ru',consent:true,
  message:'Я хочу поговорить о выборе работы, уже три недели сомневаюсь',turns:[],
 })
 const director=coachSessionDirective(client,persona)
 const messages=conversationalCoachMessages(client,persona,director.methodId,director.stage,{type:'none'})
 assert.equal(messages.at(-1).content,client.message)
 assert.match(messages[1].content,/WAVE COACHING DIALOGUE BANK/)
 assert.match(messages[1].content,/speech act=/)
 assert.match(messages[1].content,/method-step=grow:/)
 assert.match(messages[1].content,/DO NOT copy verbatim/)
 assert.ok(messages.every(m=>m.role!=='system'||!m.content.includes(client.message)))
})

// Protect every authored persona cue, not just the public coach roster.
test('all persona speech acts and locales contain no unsolicited session-exit cues',()=>{
 const exit=/we can stop here|close the lamp for today|ideas can wait|можем остановиться|закрыть лампу на сегодня|идеи могут подождать|podemos parar|cerrar la lámpara por hoy|ideas pueden esperar|would you prefer to pause|сделать паузу|hacer una pausa/iu
 for(const id of personaIds)for(const lang of ['en','ru','es'])for(const act of ['contact','reflect','clarify','repair','transition','pause','review','action']){
  const cue=personaSpeechCue(id,act,lang)
  assert.ok(cue,id+'/'+lang+'/'+act)
  assert.doesNotMatch(cue,exit,id+'/'+lang+'/'+act)
 }
})
