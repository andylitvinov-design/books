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

import {coachProfileArchiveEnvelope,coachProfileArchiveExtends} from '../lib/coaching/coach-profile-archive-v3.mjs'
import {coachSavedProfileV3,coachSavedProfileV3Text} from '../lib/coaching/coach-profile-report-v3.mjs'
import {coachRatingValue,buildCoachRatingRadar} from '../lib/coaching/coach-rating-radar.mjs'
test('structured proof envelope is track-specific, retains zero, and reports missing values honestly',()=>{
 const b=buildCoachProfileArchiveV3(ledger)
 const p={...protocol,lifeBalanceCheckin:{block:b,receipt:'a'.repeat(64)}}
 assert.equal(coachProfileArchiveEnvelope(p).key,'lifeBalanceCheckin')
 const projection=coachSavedProfileV3(p,'ru')
 assert.equal(projection.rows[0].current.value,0)
 assert.equal(projection.rows[0].desired.value,null)
 const radar=buildCoachRatingRadar(projection.rows)
 assert.equal(radar.series[0].count,1)
 assert.deepEqual(radar.series[0].points[0],[110,110])
 assert.equal(radar.series[1].count,0)
 assert.equal(radar.series[0].complete,false)
 assert.match(coachSavedProfileV3Text(p,'ru'),/Тело и здоровье: Сейчас 0 \/ Желаемое Не исследовано/)
 assert.throws(()=>coachProfileArchiveEnvelope({...p,profileCheckin:{}}),/COACH_PROFILE_ARCHIVE_INVALID/)
 assert.throws(()=>coachProfileArchiveEnvelope({...protocol,meaningAxesCheckin:p.lifeBalanceCheckin}),/COACH_PROFILE_ARCHIVE_INVALID/)
 assert.throws(()=>coachProfileArchiveEnvelope({...p,lifeBalanceCheckin:{...p.lifeBalanceCheckin,receipt:'forged'}}),/COACH_PROFILE_ARCHIVE_INVALID/)
 assert.equal(coachProfileArchiveExtends(p,protocol),false)
 assert.equal(coachProfileArchiveExtends(p,p),true)
 assert.equal(coachProfileArchiveExtends(p,{...p,lifeBalanceCheckin:{...p.lifeBalanceCheckin,receipt:'b'.repeat(64)}}),false)
})


import {readFileSync} from 'node:fs'
test('private resume retains the same signed track envelope in checkpoints and final protocol only',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 assert.ok(ui.includes('restoredProfileProof.current=coachProfileArchiveEnvelope(p)'))
 const checkpoint=ui.slice(ui.indexOf('function queuePrivateDraft(rows)'),ui.indexOf('function retainPendingClient()'))
 const final=ui.slice(ui.indexOf('function currentProtocol()'),ui.indexOf('function exportProtocol('))
 for(const source of [checkpoint,final]){
  assert.ok(source.includes('[restoredProfileProof.current.key]:restoredProfileProof.current.value'))
  assert.ok(source.includes('restoredProfileProof.current?.value.block.locale||conversationLang'))
 }
 assert.ok(checkpoint.includes('if(profile&&!restoredProfileProof.current)'))
 assert.ok(ui.includes('if(restoredDraft)forceLocal=true'))
 assert.ok(ui.includes('restoredProfileProof.current=null\n        protocolIdRef.current=crypto.randomUUID()'))
 const b=buildCoachProfileArchiveV3(ledger)
 const p={...protocol,lifeBalanceCheckin:{block:b,receipt:'a'.repeat(64)}}
 const resumed={...p,turns:[...p.turns,{role:'assistant',content:'Continue privately'}]}
 assert.equal(coachProfileArchiveExtends(p,resumed),true)
 assert.equal(coachProfileArchiveExtends(p,protocol),false)
})


import {startCoachProfileDirectorV3,answerCoachProfileDirectorV3,prioritizeCoachProfileDirectorV3,
 correctCoachProfileDirectorV3,closeCoachProfileDirectorV3,coachProfileDirectorArchiveV3,confirmCoachProfilePromptV3} from '../lib/coaching/coach-profile-director-v3.mjs'
const deliverProfilePrompt=state=>confirmCoachProfilePromptV3(state,{expectedRevision:state.pending.question.revision,
 questionTurnId:state.pending.questionTurnId,content:state.pending.question.text},recordedAt)
test('server step adapter issues actual prompt, rejects stale answer and preserves authoritative source order',()=>{
 let state=startCoachProfileDirectorV3({sessionId,courseSessionId:'introductory',locale:'ru'},recordedAt)
 const first=state.pending.question
 assert.equal(state.transcript.length,0)
 assert.throws(()=>answerCoachProfileDirectorV3(state,{expectedRevision:0,questionId:first.id,content:'9'},recordedAt),/COACH_PROFILE_DIRECTOR_INVALID/)
 state=deliverProfilePrompt(state)
 assert.equal(state.transcript[0].content,first.text)
 assert.throws(()=>answerCoachProfileDirectorV3(state,{expectedRevision:0,questionId:'invented',content:'9'},recordedAt),/COACH_PROFILE_DIRECTOR_INVALID/)
 state=answerCoachProfileDirectorV3(state,{expectedRevision:0,questionId:first.id,content:'0'},recordedAt)
 assert.throws(()=>answerCoachProfileDirectorV3(state,{expectedRevision:0,questionId:first.id,content:'9'},recordedAt),/COACH_PROFILE_DIRECTOR_INVALID/)
 assert.equal(coachProfileDirectorArchiveV3(state).snapshot.ratings[0].current.value,0)
 assert.equal(state.transcript[1].role,'user')
 assert.equal(state.transcript[1].recordedAt,recordedAt)
 state=prioritizeCoachProfileDirectorV3(state,1,recordedAt)
 state=deliverProfilePrompt(state)
 state=answerCoachProfileDirectorV3(state,{expectedRevision:2,questionId:state.pending.question.id,content:'Тело и здоровье'},recordedAt)
 state=deliverProfilePrompt(state)
 state=answerCoachProfileDirectorV3(state,{expectedRevision:3,questionId:state.pending.question.id,content:'8'},recordedAt)
 state=correctCoachProfileDirectorV3(state,4,'body_health','current',recordedAt)
 state=deliverProfilePrompt(state)
 state=answerCoachProfileDirectorV3(state,{expectedRevision:5,questionId:state.pending.question.id,content:'3'},recordedAt)
 state=closeCoachProfileDirectorV3(state,6)
 const b=coachProfileDirectorArchiveV3(state)
 assert.equal(b.snapshot.ratings[0].current.value,3)
 assert.equal(b.snapshot.ratings[0].desired.value,8)
 assert.equal(b.snapshot.ratings[1].current.value,null)
 assert.equal(b.snapshot.corrections[0].previous.value,0)
 assert.equal(b.snapshot.closed,true)
 assert.throws(()=>answerCoachProfileDirectorV3(state,{expectedRevision:7,questionId:first.id,content:'9'},recordedAt),/COACH_PROFILE_DIRECTOR_INVALID/)
})
test('interrupted or nonfactual prompt evidence is never promoted',()=>{
 assert.throws(()=>buildCoachProfileArchiveV3({...ledger,transcript:[{...assistant,interrupted:true},turn]}),/COACH_PROFILE_ARCHIVE_INVALID/)
 const block=buildCoachProfileArchiveV3(ledger)
 assert.throws(()=>validateCoachProfileArchiveV3(block,{...protocol,turns:[{...assistant,interrupted:true},turn]}),/COACH_PROFILE_ARCHIVE_INVALID/)
 let state=startCoachProfileDirectorV3({sessionId,courseSessionId:'introductory',locale:'en'},recordedAt)
 for(const message of ['My mother said 7','Please repeat','8?']){
  const question=state.pending.question
  state=deliverProfilePrompt(state)
  state=answerCoachProfileDirectorV3(state,{expectedRevision:question.revision,questionId:question.id,content:message},recordedAt)
  assert.equal(coachProfileDirectorArchiveV3(state).snapshot.ratings[0].current.value,null)
 }
 assert.equal(state.pending.question.axis,'body_health')
})


test('question issuance does not certify delivery; interrupted attempts cannot bind later answers',()=>{
 let state=startCoachProfileDirectorV3({sessionId,courseSessionId:'introductory',locale:'en'},recordedAt)
 const first=state.pending
 assert.throws(()=>confirmCoachProfilePromptV3(state,{expectedRevision:0,questionTurnId:first.questionTurnId,content:'Wrong question'},recordedAt),/COACH_PROFILE_DIRECTOR_INVALID/)
 state=confirmCoachProfilePromptV3(state,{expectedRevision:0,questionTurnId:first.questionTurnId,content:'Body and health',interrupted:true},recordedAt)
 assert.equal(state.transcript[0].interrupted,true)
 assert.ok(state.pending.questionTurnId!==first.questionTurnId)
 assert.throws(()=>confirmCoachProfilePromptV3(state,{expectedRevision:0,questionTurnId:first.questionTurnId,content:first.question.text},recordedAt),/COACH_PROFILE_DIRECTOR_INVALID/)
 assert.throws(()=>answerCoachProfileDirectorV3(state,{expectedRevision:0,questionId:first.question.id,content:'8'},recordedAt),/COACH_PROFILE_DIRECTOR_INVALID/)
 state=deliverProfilePrompt(state)
 state=answerCoachProfileDirectorV3(state,{expectedRevision:0,questionId:first.question.id,content:'0'},recordedAt)
 const block=coachProfileDirectorArchiveV3(state)
 assert.equal(block.bindings[0].questionTurnIndex,1)
 assert.equal(block.snapshot.ratings[0].current.value,0)
 assert.equal(block.transcriptLength,3)
})

test('shared radar retains zero and independent desired scores, rejects unconfirmed or invalid values, and never bridges missing axes',()=>{
 const rows=Array.from({length:8},(_,i)=>({id:'axis-'+i,label:'Axis '+i,current:null,desired:null}))
 rows[0].current=0
 rows[1].current={status:'confirmed',value:5}
 rows[2].current={status:'proposed',value:8}
 rows[3].current=11
 rows[4].current='7'
 rows[5].desired=8
 rows[7].current=9
 const m=buildCoachRatingRadar(rows)
 assert.equal(m.series[0].count,3)
 assert.equal(m.series[1].count,1)
 assert.deepEqual(m.series[0].points[0],[110,110])
 assert.equal(m.rows[5].current,null)
 assert.equal(m.rows[5].desired,8)
 assert.equal(m.series[0].segments.length,2)
 assert.ok(m.series.every(s=>!s.complete))
 assert.equal(coachRatingValue({status:'skipped_by_client',value:6}),null)
 const full=buildCoachRatingRadar(rows.map(r=>({...r,current:10,desired:0})))
 assert.ok(full.series.every(s=>s.complete&&s.count===8&&s.segments.length===0))
 const empty=buildCoachRatingRadar(rows.map(r=>({...r,current:null,desired:null})))
 assert.equal(empty.hasData,false)
 assert.equal(buildCoachRatingRadar(rows.slice(0,7)),null)
 assert.equal(buildCoachRatingRadar(rows.map(r=>({...r,id:'duplicate'}))),null)
})
test('live result, Clarity and saved archive use one shared read-only chart',()=>{
 for(const path of ['my-coach-result-preview.jsx','clarity-semantic-result.jsx','app/my-coach-saved-profile-v3.jsx','app/my-coaching-plan.jsx']){
  const ui=readFileSync(new URL('../components/'+path,import.meta.url),'utf8')
  assert.ok(ui.includes('<CoachRatingRadar axes='))
 }
})
