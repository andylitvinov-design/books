import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_OPENING_STEPS,coachOpeningSnapshot,coachOpeningResponse} from '../lib/coaching/coach-opening-protocol.mjs'
import {normalizeMyCoachProtocol,myCoachProtocolPdfOptions} from '../lib/personal-coaching/session-protocol.mjs'

test('all six opening steps have stable order and separate checkmarks',()=>{
  assert.deepEqual([...COACH_OPENING_STEPS],['invitation','name','continuity','focus','feelings','confirmation'])
  const first=coachOpeningSnapshot({locale:'en'})
  assert.equal(first.step,'invitation')
  const asked=coachOpeningSnapshot({answers:['Yes, let us try','My name is Ana','challenge','I feel nervous','yes']})
  assert.equal(asked.complete,true)
  assert.deepEqual(asked.done,[true,true,true,true,true,true])
  assert.equal(asked.name,'Ana')
  assert.equal(asked.continuity,'new')
  assert.equal(asked.focus,'challenge')
  assert.equal(asked.feelings,'I feel nervous')
  assert.equal(asked.lights.identityAndContinuity,true)
  assert.equal(asked.lights.confirmation,true)
})

test('a qualified maybe counts as tentative opt-in, but maybe later is a refusal',()=>{
  assert.equal(coachOpeningSnapshot({answers:['Maybe']}).step,'name')
  const no=coachOpeningSnapshot({answers:['Maybe later']})
  assert.equal(no.step,'invitation')
  assert.equal(no.blocked,true)
  assert.equal(no.done[0],false)
  const answer=coachOpeningResponse({before:coachOpeningSnapshot({}),after:no,locale:'ru'})
  assert.match(answer.reflection,/не будем/)
  assert.equal(answer.question,'')
})

test('no model talk or off-topic answer can fake a step',()=>{
  const state=coachOpeningSnapshot({answers:['I do not know']})
  assert.equal(state.step,'invitation')
  assert.equal(state.done[0],false)
  const next=coachOpeningSnapshot({answers:['Yes','I do not know my name']})
  assert.equal(next.step,'name')
  assert.equal(next.done[1],false)
})

test('saved name and topic are only used with explicit cross-session consent',()=>{
  const prior={name:'Andrey',topic:'Stress',consent:true}
  const accepted=coachOpeningSnapshot({answers:['Yes'],prior})
  assert.equal(accepted.step,'continuity')
  assert.equal(accepted.name,'Andrey')
  assert.equal(accepted.answers.name.source,'consented_saved_history')
  assert.equal(accepted.done[2],false)
  const without=coachOpeningSnapshot({answers:['Yes'],prior:{...prior,consent:false}})
  assert.equal(without.step,'name')
  const complete=coachOpeningSnapshot({answers:['Yes','Continue the previous topic','goal','calm today','Yes'],prior})
  assert.equal(complete.complete,true)
  assert.equal(complete.continuity,'continue')
})

test('feelings may be skipped without a tone or separate lamp',()=>{
  const s=coachOpeningSnapshot({answers:['Yes','Меня зовут Анна','сложность','пропустить вопрос'],locale:'ru'})
  assert.equal(s.step,'confirmation')
  assert.equal(s.answers.feelings.source,'skipped')
  assert.equal(s.lights.confirmation,false)
  assert.equal(Object.keys(s.lights).length,4)
})

test('a rejection at confirmation cannot be interpreted as a commitment',()=>{
  const s=coachOpeningSnapshot({answers:['Yes','I am Anna','goal','I feel fine','No']})
  assert.equal(s.complete,false)
  assert.equal(s.step,'confirmation')
  assert.equal(s.done[5],false)
})

test('full opening works in Russian and Spanish, including Unicode word endings',()=>{
  const russian=coachOpeningSnapshot({
    answers:['да','Меня зовут Анна','сложность','мне тревожно','да'],locale:'ru'})
  assert.equal(russian.complete,true)
  assert.equal(russian.name,'Анна')
  assert.equal(russian.focus,'challenge')
  const spanish=coachOpeningSnapshot({
    answers:['sí','Me llamo Lucía','desafío','me siento triste','sí'],locale:'es'})
  assert.equal(spanish.complete,true)
  assert.equal(spanish.name,'Lucía')
  assert.equal(spanish.focus,'challenge')
  const no=coachOpeningSnapshot({answers:['нет'],locale:'ru'})
  assert.equal(no.blocked,true)
  assert.equal(no.done[0],false)
})

test('a new topic is not mistaken for a given name at step 2',()=>{
  const candidate=coachOpeningSnapshot({answers:['Yes','New topic']})
  assert.equal(candidate.step,'name')
  assert.equal(candidate.name,'')
})

test('Gemini Live coach-first invitation survives private transcript review and PDF',()=>{
  const t0=new Date(Date.now()-60000).toISOString()
  const t1=new Date(Date.now()-30000).toISOString()
  const value={id:'11111111-1111-4111-8111-111111111111',personaId:'mira',locale:'en',
    startedAt:t0,completedAt:t1,goal:'',
    turns:[
      {role:'assistant',content:'Would you like a session?',mode:'opening'},
      {role:'user',content:'Yes'},
      {role:'assistant',content:'What name would you like me to use?',mode:'opening'}
    ]}
  const normalized=normalizeMyCoachProtocol(value)
  assert.equal(normalized.turns[0].role,'assistant')
  assert.equal(normalized.turns[1].role,'user')
  const pdf=myCoachProtocolPdfOptions(value)
  assert.equal(pdf.entries.length,2)
  assert.match(pdf.entries[0].answer,/Would you like/)
})
