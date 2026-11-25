import test from 'node:test'
import assert from 'node:assert/strict'
import {createCoachProfileSessionV3,coachProfileQuestionV3,applyCoachProfileAnswerV3,requestCoachProfilePriorityV3} from '../lib/coaching/coach-profile-session-v3.mjs'
import {buildCoachProfileArchiveV3,validateCoachProfileArchiveV3} from '../lib/coaching/coach-profile-archive-v3.mjs'
const sessionId='11111111-1111-4111-8111-111111111111'
const recordedAt='2026-11-25T12:00:00.000Z'
const initial=createCoachProfileSessionV3({sessionId,courseSessionId:'introductory',locale:'ru'})
const q=coachProfileQuestionV3(initial)
const turn={id:'user-2',role:'user',content:'0',final:true,questionId:q.id,recordedAt}
const assistant={id:'coach-1',role:'assistant',content:q.text,final:true,questionId:q.id,recordedAt}
const ledger={sessionId,courseSessionId:'introductory',locale:'ru',events:[{kind:'answer',question:q,questionTurnId:assistant.id,turn}],transcript:[assistant,turn]}
const protocol={id:sessionId,courseSessionId:'introductory',locale:'ru',turns:ledger.transcript.map(({role,content})=>({role,content}))}
test('archive replays exact server transcript, retains zero and binds question to source position',()=>{
 const b=buildCoachProfileArchiveV3(ledger)
 assert.equal(b.snapshot.ratings[0].current.value,0)
 assert.equal(b.snapshot.ratings[0].desired.value,null)
 assert.equal(b.bindings[0].turnIndex,1)
 assert.equal(b.bindings[0].questionTurnIndex,0)
 assert.equal(b.bindings[0].questionTurnId,assistant.id)
 assert.equal(validateCoachProfileArchiveV3(b,protocol).prefix.length,2)
 assert.equal(validateCoachProfileArchiveV3(b,{...protocol,turns:[...protocol.turns,{role:'assistant',content:'Далее'}]}).prefix.length,2)
})
test('reject a fabricated or changed source, wrong role, course, session or timestamp',()=>{
 for(const bad of [{...turn,content:'9'},{...turn,recordedAt:'2026-11-24T12:00:00.000Z'},{...turn,id:'not-in-ledger'}]){
  assert.throws(()=>buildCoachProfileArchiveV3({...ledger,events:[{kind:'answer',question:q,questionTurnId:assistant.id,turn:bad}]}),/COACH_PROFILE_ARCHIVE_INVALID/)
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

test('archive preserves partial wheel and explicitly chosen priority after server timebox handoff',()=>{
 const state=applyCoachProfileAnswerV3(initial,q,turn)
 const priorityQuestion=coachProfileQuestionV3(requestCoachProfilePriorityV3(state))
 const priorityTurn={id:'user-4',role:'user',content:'Тело и здоровье',final:true,questionId:priorityQuestion.id,recordedAt}
 const priorityPrompt={id:'coach-3',role:'assistant',content:priorityQuestion.text,final:true,questionId:priorityQuestion.id,recordedAt}
 const events=[...ledger.events,{kind:'prioritize'},{kind:'answer',question:priorityQuestion,questionTurnId:priorityPrompt.id,turn:priorityTurn}]
 const transcript=[...ledger.transcript,priorityPrompt,priorityTurn]
 const block=buildCoachProfileArchiveV3({...ledger,events,transcript})
 assert.deepEqual(block.snapshot.priority.axisIds,['body_health'])
 assert.equal(block.snapshot.status,'partial')
 assert.equal(block.snapshot.ratings[1].current.value,null)
 assert.equal(block.bindings[1].turnIndex,3)
 assert.equal(validateCoachProfileArchiveV3(block,{...protocol,turns:transcript}).prefix.length,4)
})

test('requires actual finalized question in the transcript, not merely a reconstructed expected prompt',()=>{
 for(const bad of [{...assistant,content:'Unrelated question?'},{...assistant,role:'user'},{...assistant,final:false},{...assistant,questionId:'wrong'},{...assistant,recordedAt:'2026-11-26T12:00:00.000Z'}]){
  assert.throws(()=>buildCoachProfileArchiveV3({...ledger,transcript:[bad,turn]}),/COACH_PROFILE_ARCHIVE_INVALID/)
 }
 assert.throws(()=>buildCoachProfileArchiveV3({...ledger,events:[{...ledger.events[0],questionTurnId:'absent'}]}),/COACH_PROFILE_ARCHIVE_INVALID/)
 const block=buildCoachProfileArchiveV3(ledger)
 assert.throws(()=>validateCoachProfileArchiveV3(block,{...protocol,turns:[{role:'assistant',content:'Unrelated question?'},protocol.turns[1]]}),/COACH_PROFILE_ARCHIVE_INVALID/)
})
