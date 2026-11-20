import test from 'node:test'
import assert from 'node:assert/strict'
import {projectCoachContextSnapshot as buildCoachContextSnapshot} from '../lib/personal-coaching/client-context.mjs'

const plan={
  plan:{planVersion:7,updatedAt:'2026-11-20T10:00:00.000Z'},
  contextPermissions:[{sessionId:'11111111-1111-4111-8111-111111111111'}],
  goals:[
    {id:'g1',sourceSessionId:'11111111-1111-4111-8111-111111111111',title:'Protect focused work time',status:'active',updatedAt:'2026-11-20T10:00:00.000Z'},
    {id:'g2',sourceSessionId:'22222222-2222-4222-8222-222222222222',title:'Must not be exposed',status:'active'},
  ],
  actions:[
    {id:'a1',goalId:'g1',sourceSessionId:'11111111-1111-4111-8111-111111111111',description:'Block Tuesday morning',status:'in_progress'},
  ],
}

test('selects only consented server-owned goals and actions within the model budget',()=>{
  const snapshot=buildCoachContextSnapshot({plan,latestUserTurn:'I need help with focus'})
  assert.equal(snapshot.version,'hh-coach-context-snapshot-v1')
  assert.equal(snapshot.items.length,2)
  assert.equal(snapshot.items[0].text,'Protect focused work time')
  assert.equal(snapshot.items[1].text,'Block Tuesday morning')
  assert.equal(JSON.stringify(snapshot).includes('Must not be exposed'),false)
  assert.equal(snapshot.excludedReasonCodes.length,0)
})

test('latest correction or topic switch suppresses durable context',()=>{
  const snapshot=buildCoachContextSnapshot({plan,latestUserTurn:'Actually, I want to talk about my relationship instead.',latestTurnAct:'topic_shift'})
  assert.deepEqual(snapshot.items,[])
  assert.deepEqual(snapshot.excludedReasonCodes,['LATEST_TURN_OVERRIDES_CONTEXT'])
})

test('returns no durable context after consent has been revoked',()=>{
  const snapshot=buildCoachContextSnapshot({...plan,contextPermissions:[]})
  assert.deepEqual(snapshot.items,[])
  assert.deepEqual(snapshot.excludedReasonCodes,['NO_ACTIVE_CONTEXT_GRANT'])
})
