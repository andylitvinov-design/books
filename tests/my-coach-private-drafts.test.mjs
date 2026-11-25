import test from 'node:test'
import assert from 'node:assert/strict'
import {draftWriteDecision,draftRevision,normalizeMyCoachDraft,MY_COACH_DRAFT_PROVENANCE} from '../lib/personal-coaching/my-coach-draft.mjs'
const id='11111111-1111-4111-8111-111111111111'
const date='2026-11-24T19:00:00.000Z'
const protocol={id,personaId:'genie',locale:'ru',methodId:'woop',startedAt:date,completedAt:date,turnLayout:'chronological',turns:[{role:'user',content:'Да',unanswered:true}]}
test('one real client utterance survives as an unreviewed checkpoint',()=>{
 const p=normalizeMyCoachDraft({protocol,status:'active',courseSessionId:'life_direction'})
 assert.equal(p.provenance,MY_COACH_DRAFT_PROVENANCE)
 assert.equal(p.completedAt,undefined)
 assert.equal(p.turns[0].content,'Да')
 assert.equal(p.turns[0].unanswered,true)
 assert.throws(()=>normalizeMyCoachDraft({protocol:{...protocol,turns:[{role:'assistant',content:'Hi'}]},status:'active'}))
})
test('CAS idempotency, stale writers and erasure tombstones',()=>{
 const p=normalizeMyCoachDraft({protocol,status:'active'})
 assert.equal(draftWriteDecision(null,0,p),'insert')
 assert.equal(draftWriteDecision({revision:1,payload:p},0,p),'retry')
 assert.equal(draftWriteDecision({revision:1,payload:p},1,{...p,status:'ended'}),'update')
 assert.equal(draftWriteDecision({revision:2,payload:p},0,p),'conflict')
 assert.equal(draftWriteDecision({revision:2,deleted:true},1,p),'conflict')
 assert.equal(draftWriteDecision(null,1,p),'conflict')
 assert.throws(()=>draftRevision(-1))
})
