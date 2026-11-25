import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GROW_DIALOGUE_QUESTIONS,selectGrowDialogueQuestions,growDialogueQuestionGuidance} from '../lib/coaching/grow-dialogue-question-bank.mjs'
const moves={goal:'clarify_goal',reality:'ground_in_example',options:'surface_options',
 way_forward:'explore_client_owned_step',review:'confirm_client_summary'}
const missing={goal:['goalRestated','workingFocusEstablished'],
 reality:['keyFactsCaptured','constraintsReviewed'],options:['optionsExplored'],
 way_forward:['clientActionApproved','timingSpecified','feasibilityChecked'],review:['summaryReviewed']}
const d=(step,overrides={})=>({
 methodId:'grow',methodStepId:'grow:'+step,interventionId:moves[step],
 locale:'ru',allowQuestion:true,timebox:{elapsedSeconds:1150},
 evidence:{},readiness:{missing:missing[step]},...overrides
})
test('23 original versioned translated questions map to existing GROW model and steps',()=>{
 assert.equal(GROW_DIALOGUE_QUESTIONS.length,23)
 assert.equal(new Set(GROW_DIALOGUE_QUESTIONS.map(q=>q.key)).size,23)
 for(const q of GROW_DIALOGUE_QUESTIONS){
  assert.match(q.key,/^grow_dialogue_[a-z0-9_]+_v1$/)
  assert.equal(q.modelKey,'grow_v1')
  assert.equal(q.interventionId,moves[q.stepId])
  assert.ok(missing[q.stepId].includes(q.evidenceKey))
  assert.equal(q.dbStepKey,q.stepId==='way_forward'?'will':q.stepId)
  for(const lang of ['ru','en','es'])assert.match(q.texts[lang],/[?¿]/u)
 }
})
test('elapsed time and a model-selected other step cannot advance the stage',()=>{
 const a=selectGrowDialogueQuestions(d('goal'),{},4)
 assert.ok(a.length>0&&a.every(q=>q.stepId==='goal'))
 assert.deepEqual(selectGrowDialogueQuestions(d('goal',{methodId:'oskar'})),[])
 assert.deepEqual(selectGrowDialogueQuestions(d('goal',{allowQuestion:false})),[])
 assert.deepEqual(selectGrowDialogueQuestions(d('goal',{interventionId:'invite_reflective_close'})),[])
 assert.deepEqual(selectGrowDialogueQuestions(d('goal',{methodStepId:'grow:options'})),[])
})
test('choose missing client evidence and never demand a commitment prematurely',()=>{
 for(const step of Object.keys(moves))for(const locale of ['ru','en','es']){
  const q=selectGrowDialogueQuestions(d(step,{locale}),{},2)
  assert.ok(q.length>0&&q.every(x=>x.stepId===step))
  assert.match(growDialogueQuestionGuidance(d(step,{locale}),{}),/at most ONE/)
 }
 assert.ok(selectGrowDialogueQuestions(d('way_forward'),{},4)
  .every(q=>q.evidenceKey==='clientActionApproved'))
 const later=selectGrowDialogueQuestions(d('way_forward',{
  evidence:{clientActionApproved:true},readiness:{missing:['timingSpecified','feasibilityChecked']}
 }),{},4)
 assert.ok(later.some(q=>q.evidenceKey==='timingSpecified'))
 assert.ok(later.some(q=>q.evidenceKey==='feasibilityChecked'))
})
test('do not repeat a recently posed coach question',()=>{
 const first=selectGrowDialogueQuestions(d('reality'),{message:'Вчера мне было трудно'},2)[0]
 const second=selectGrowDialogueQuestions(d('reality'),{message:'Вчера мне было трудно',turns:[
  {role:'assistant',content:first.texts.ru}
 ]},2)
 assert.ok(second.length>0&&second[0].key!==first.key)
})
test('My Coach connects optional questions to existing Director policy and model prompts',()=>{
 const src=readFileSync(new URL('../lib/coaching/conversational-persona.mjs',import.meta.url),'utf8')
 assert.match(src,/growDialogueQuestionGuidance\(directive,input\)/)
 assert.match(src,/coachSessionDirectivePrompt\(directive\)/)
})
