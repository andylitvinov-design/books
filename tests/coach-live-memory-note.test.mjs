import test from 'node:test'
import assert from 'node:assert/strict'
import {coachLiveMemoryNote,coachLiveMemoryScopes} from '../lib/coaching/coach-live-memory-note.mjs'
import {coachPriorRecaps,coachPriorRecapRole} from '../lib/coaching/coach-staged-memory.mjs'
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

test('latest reviewed recap survives a full UTF-8 memory budget',()=>{
 const record=(topic,date)=>({topic,date,clientConclusions:'界'.repeat(170),clientNextStep:'界'.repeat(80),provenance:'client_reviewed_dialogue'})
 const latest=record('LATEST','2026-11-27'),foundation=record('FOUNDATION','2026-11-01')
 const input={preferredName:'界'.repeat(60),hasPreviousSession:true,foundation,foundationKind:'introductory',foundationSearchComplete:true,previous:[latest,record('OLDER','2026-11-26')],preconsultation:{version:1,checkStep:true,known:['a'.repeat(40),'b'.repeat(40),'c'.repeat(40)]}}
 const note=coachLiveMemoryNote({prior:input,priorAllowed:true,continuity:'previous'})
 const payload=JSON.parse(note.slice(note.indexOf('{')))
 const recaps=payload.items.filter(x=>x.category==='prior_session')
 assert.equal(recaps[0].topic,'LATEST')
 assert.equal(recaps[0].date,'2026-11-27')
 assert.equal(recaps[0].nextStep,latest.clientNextStep)
 assert.ok(new TextEncoder().encode(JSON.stringify({...payload,trust:'untrusted_reference_data'})).length<=1850)
 assert.doesNotMatch(coachLiveMemoryNote({prior:input,priorAllowed:true,continuity:'new'}),/LATEST|FOUNDATION/)
 const pendingNote=coachLiveMemoryNote({prior:input,priorAllowed:true,continuity:'pending'})
 const pending=JSON.parse(pendingNote.slice(pendingNote.indexOf('{')))
 assert.deepEqual(pending.items.map(x=>x.category),['preferred_name','prior_topic'])
 assert.equal(pending.items[1].topic,'LATEST')
 assert.equal(coachLiveMemoryNote({prior:input,priorAllowed:false,continuity:'previous'}),'')
})
test('deduplication preserves introductory role and ignores unreviewed or empty recaps',()=>{
 const foundation={date:'2026-11-01',topic:'Intro',provenance:'client_reviewed_dialogue'}
 const input={hasPreviousSession:true,foundation,foundationKind:'introductory',foundationSearchComplete:true,previous:[{...foundation},{topic:'unreviewed',provenance:'draft'}]}
 assert.deepEqual(coachPriorRecaps(input),[foundation])
 assert.equal(coachPriorRecapRole(input,coachPriorRecaps(input)[0]),'introductory')
 assert.deepEqual(coachPriorRecaps({...input,foundation:null,previous:[{topic:'',provenance:'client_reviewed_dialogue'},{topic:'later',provenance:'client_reviewed_dialogue'}]}).map(x=>x.topic),['later'])
})
