import test from 'node:test'
import assert from 'node:assert/strict'
import {coachLiveMemoryNote,coachLiveMemoryScopes} from '../lib/coaching/coach-live-memory-note.mjs'
const prior={preferredName:'Майя',hasPreviousSession:true,previous:[{
  date:'2026-11-20',topic:'Работа',clientConclusions:'Я хочу выбирать сама',
  clientNextStep:'Обсудить с коллегой',provenance:'client_reviewed_dialogue',
  turns:[{content:'PRIVATE TRANSCRIPT'}]
}]}
const personal={context:{items:[
  {kind:'goals',sourceKind:'saved_life_plan',text:'Двигаться к цели'},
  {kind:'test_results',sourceKind:'selected_assessment',text:'PRIVATE SCORE'},
  {kind:'goals',sourceKind:'ai_only',text:'BAD'},
]},profile:{preferredLanguage:'ru'}}
test('no memories without category-specific client approval',()=>{
 assert.equal(coachLiveMemoryNote({prior,personal}), '')
 assert.equal(coachLiveMemoryNote({prior,priorAllowed:true}).includes('PRIVATE TRANSCRIPT'),false)
})
test('name is available at invitation; reviewed prior conclusions only after continuity choice',()=>{
 const first=coachLiveMemoryNote({prior,priorAllowed:true})
 assert.match(first,/Майя/)
 assert.doesNotMatch(first,/Обсудить с коллегой/)
 const next=coachLiveMemoryNote({prior,priorAllowed:true,continuity:'previous'})
 assert.match(next,/Обсудить с коллегой/)
 assert.doesNotMatch(next,/PRIVATE TRANSCRIPT/)
})
test('goals and test results have independent consent; non-approved source never passes',()=>{
 const goals=coachLiveMemoryNote({personal,goalsAllowed:true,topicKey:'career_business'})
 assert.match(goals,/Двигаться к цели/)
 assert.doesNotMatch(goals,/PRIVATE SCORE|BAD/)
 const scores=coachLiveMemoryNote({personal,assessmentsAllowed:true,topicKey:'personal_growth'})
 assert.match(scores,/PRIVATE SCORE/)
 assert.doesNotMatch(scores,/Двигаться к цели/)
})
test('live revoke scope is category and topic specific',()=>{
 assert.deepEqual(coachLiveMemoryScopes({priorAllowed:true,goalsAllowed:true,topicKey:'finance'}),['preferred_name','goals:finance'])
 assert.deepEqual(coachLiveMemoryScopes({}),[])
})
