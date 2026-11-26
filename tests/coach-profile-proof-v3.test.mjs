import test from 'node:test'
import assert from 'node:assert/strict'
import {startCoachProfileDirectorV3,confirmCoachProfilePromptV3,answerCoachProfileDirectorV3} from '../lib/coaching/coach-profile-director-v3.mjs'
import {issueCoachProfileArchiveProof,verifyCoachProfileArchiveProof,assertCoachProfileArchiveProof} from '../lib/app/my-coach-profile-proof.js'
const config={encryptionKey:Buffer.alloc(32,17)}
const actor={id:'11111111-1111-4111-8111-111111111111'}
const other={id:'22222222-2222-4222-8222-222222222222'}
const time='2026-11-25T12:00:00.000Z'
test('actual HMAC receipt is account/session/track/transcript bound; append-only, not a model grant',()=>{
 let ledger=startCoachProfileDirectorV3({sessionId:'33333333-3333-4333-8333-333333333333',courseSessionId:'introductory',locale:'ru'},time)
 const pending=ledger.pending
 ledger=confirmCoachProfilePromptV3(ledger,{expectedRevision:0,questionTurnId:pending.questionTurnId,content:pending.question.text},time)
 ledger=answerCoachProfileDirectorV3(ledger,{expectedRevision:0,questionId:pending.question.id,content:'0'},time)
 const value=issueCoachProfileArchiveProof(config,actor,ledger)
 const protocol={id:ledger.sessionId,courseSessionId:ledger.courseSessionId,locale:ledger.locale,
  turns:ledger.transcript.map(({role,content})=>({role,content})),lifeBalanceCheckin:value}
 assert.equal(verifyCoachProfileArchiveProof(config,actor,protocol,value),true)
 assert.equal(assertCoachProfileArchiveProof(config,actor,protocol),protocol)
 assert.equal(verifyCoachProfileArchiveProof(config,other,protocol,value),false)
 assert.equal(verifyCoachProfileArchiveProof({encryptionKey:Buffer.alloc(32,18)},actor,protocol,value),false)
 const altered=structuredClone(value);altered.block.snapshot.ratings[0].current.value=9
 assert.equal(verifyCoachProfileArchiveProof(config,actor,protocol,altered),false)
 assert.throws(()=>assertCoachProfileArchiveProof(config,actor,{...protocol,lifeBalanceCheckin:altered}),/COACH_PROFILE_ARCHIVE_INVALID/)
 for(const invalid of [{...protocol,id:'44444444-4444-4444-8444-444444444444'},{...protocol,locale:'es'},
  {...protocol,courseSessionId:'meaning_axes_inner_growth'},
  {...protocol,turns:[protocol.turns[0],{role:'user',content:'8'}]}])
   assert.equal(verifyCoachProfileArchiveProof(config,actor,invalid,value),false)
 assert.equal(verifyCoachProfileArchiveProof(config,actor,{...protocol,turns:[...protocol.turns,{role:'assistant',content:'Continue'}]},value),true)
})
