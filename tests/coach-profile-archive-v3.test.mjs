import test from 'node:test'
import assert from 'node:assert/strict'
import {createCoachProfileSessionV3,coachProfileQuestionV3} from '../lib/coaching/coach-profile-session-v3.mjs'
import {buildCoachProfileArchiveV3,validateCoachProfileArchiveV3} from '../lib/coaching/coach-profile-archive-v3.mjs'
const sessionId='11111111-1111-4111-8111-111111111111'
const recordedAt='2026-11-25T12:00:00.000Z'
const initial=createCoachProfileSessionV3({sessionId,courseSessionId:'introductory',locale:'ru'})
const q=coachProfileQuestionV3(initial)
const turn={id:'user-2',role:'user',content:'0',final:true,questionId:q.id,recordedAt}
const assistant={id:'coach-1',role:'assistant',content:q.text,final:true,recordedAt}
const ledger={sessionId,courseSessionId:'introductory',locale:'ru',events:[{kind:'answer',question:q,turn}],transcript:[assistant,turn]}
const protocol={id:sessionId,courseSessionId:'introductory',locale:'ru',turns:ledger.transcript.map(({role,content})=>({role,content}))}
test('archive replays exact server transcript, retains zero and binds question to source position',()=>{
 const b=buildCoachProfileArchiveV3(ledger)
 assert.equal(b.snapshot.ratings[0].current.value,0)
 assert.equal(b.snapshot.ratings[0].desired.value,null)
 assert.equal(b.bindings[0].turnIndex,1)
 assert.equal(validateCoachProfileArchiveV3(b,protocol).prefix.length,2)
 assert.equal(validateCoachProfileArchiveV3(b,{...protocol,turns:[...protocol.turns,{role:'assistant',content:'Далее'}]}).prefix.length,2)
})
test('reject a fabricated or changed source, wrong role, course, session or timestamp',()=>{
 for(const bad of [{...turn,content:'9'},{...turn,recordedAt:'2026-11-24T12:00:00.000Z'},{...turn,id:'not-in-ledger'}]){
  assert.throws(()=>buildCoachProfileArchiveV3({...ledger,events:[{kind:'answer',question:q,turn:bad}]}),/COACH_PROFILE_ARCHIVE_INVALID/)
 }
 assert.throws(()=>buildCoachProfileArchiveV3({...ledger,transcript:[assistant,{...turn,final:false}]}),/COACH_PROFILE_ARCHIVE_INVALID/)
 const b=buildCoachProfileArchiveV3(ledger)
 for(const p of [{...protocol,courseSessionId:'meaning_axes_inner_growth'},{...protocol,id:'22222222-2222-4222-8222-222222222222'},
  {...protocol,turns:[assistant,{...turn,content:'9'}]},{...protocol,turns:[assistant,{...turn,role:'assistant'}]}])
  assert.throws(()=>validateCoachProfileArchiveV3(b,p),/COACH_PROFILE_ARCHIVE_INVALID/)
})
test('cannot bind a source twice or append evidence after close',()=>{
 assert.throws(()=>buildCoachProfileArchiveV3({...ledger,events:[...ledger.events,...ledger.events]}),/COACH_PROFILE_ARCHIVE_INVALID/)
 assert.throws(()=>buildCoachProfileArchiveV3({...ledger,events:[{kind:'close'},...ledger.events]}),/COACH_PROFILE_ARCHIVE_INVALID/)
})
