import test from 'node:test'
import assert from 'node:assert/strict'
import {createCoachActiveClock} from '../lib/coaching/coach-active-clock.mjs'
import {readFileSync} from 'node:fs'
import {CLARITY_DAY_ONE_BUDGETS,clarityDayOneScenario,clarityDayOneTimebox,clarityDayOneGapPlan,clarityDayOneBalanceSummary,clarityDayOneTimeGuidance} from '../lib/coaching/clarity-day-one-scenario.mjs'
import {coachCourseProtocolGuidance,coachCourseCheckpointGuidance} from '../lib/coaching/coach-course-protocol-schema.mjs'
test('v5 budgets, stages and all localized protocol fields',()=>{
 for(const b of Object.values(CLARITY_DAY_ONE_BUDGETS))assert.equal(b.reduce((a,x)=>a+x,0),20)
 for(const l of ['ru','en','es']){
  const p=clarityDayOneScenario(l)
  assert.deepEqual(p.stages.map(s=>s.id),['contact','situation','balance','needs','support','integration']);assert.equal(new Set(p.fields.map(f=>f.id)).size,p.fields.length)
  assert.equal(p.fields.filter(f=>f.id.startsWith('outer_')).length,8)
  assert.ok(p.fields.every(f=>f.question&&f.alternative&&f.capture.length))
  assert.ok(p.fields.every(f=>p.stages.some(s=>s.id===f.progressStage)))
  assert.equal(p.fields.find(f=>f.id==='balance_review').progressStage,'balance')
 }
})
test('normal timing and reserved closing, not fabricated progress',()=>{
 for(const [t,s] of [[0,'situation'],[240,'balance'],[540,'verification'],[600,'needs'],[840,'support'],[960,'integration'],[1140,'reserve'],[1200,'ended']])assert.equal(clarityDayOneTimebox(t).stage,s)
 assert.equal(clarityDayOneTimebox(null).stage,'contact')
 assert.equal(clarityDayOneTimebox(540).progressStage,'balance')
 assert.equal(clarityDayOneTimebox(1140).progressStage,'integration')
 assert.equal(clarityDayOneGapPlan({elapsedSeconds:1200}).nextFieldId,null)
 assert.ok(clarityDayOneGapPlan({elapsedSeconds:1200}).coreMissing.includes('reviewed_summary'))
})
test('explicit verified consent required; decline bypass; no repeated known scores',()=>{
 const rows=[{id:'balance_consent',status:'confirmed'},{id:'outer_body_health',status:'confirmed',current:0}]
 assert.equal(clarityDayOneGapPlan({elapsedSeconds:250}).nextFieldId,'balance_consent')
 assert.equal(clarityDayOneGapPlan({rows,methodConsent:'accepted',elapsedSeconds:250}).nextFieldId,'outer_emotional_wellbeing')
 assert.equal(clarityDayOneGapPlan({rows,methodConsent:'declined',elapsedSeconds:250}).nextFieldId,'priority')
 assert.equal(clarityDayOneGapPlan({rows:[rows[1]],methodConsent:'accepted',elapsedSeconds:250}).nextFieldId,'balance_consent')
 assert.equal(clarityDayOneGapPlan({rows,methodConsent:'accepted',elapsedSeconds:1100}).nextFieldId,'learning')
 assert.deepEqual(clarityDayOneGapPlan({rows,elapsedSeconds:1200}).homeworkCandidates,[])
 assert.ok(!clarityDayOneGapPlan({rows,methodConsent:'declined',elapsedSeconds:1200,timedEnd:true}).homeworkCandidates.some(id=>id.startsWith('outer_')))
})
test('only confirmed valid numbers count; zero is real and no auto-priority',()=>{
 const r=clarityDayOneBalanceSummary([{id:'outer_body_health',status:'confirmed',current:0},{id:'outer_finance',status:'needs_confirmation',current:2},{id:'outer_relationships',status:'confirmed',current:8},{id:'outer_lifestyle',status:'confirmed',current:11}])
 assert.equal(r.coverage,2);assert.deepEqual(r.lowest,['body_health']);assert.deepEqual(r.highest,['relationships']);assert.equal(r.priority,null)
})
test('actual shared text/live prompt and timed checkpoint consume v5 policy',()=>{
 const p=coachCourseProtocolGuidance('clarity_day_1','ru')
 assert.match(p,/Clarity Day 1 v5.0/);assert.match(p,/Before any balance questions/);assert.match(p,/not two ratings/)
 const opening={completed:true,answers:{focus:{kind:'goal'}}}
 assert.equal(coachCourseCheckpointGuidance('clarity_day_1','ru',opening,{conversationAct:'substantive_reply',timebox:{elapsedSeconds:960}}),clarityDayOneTimeGuidance(960))
 assert.equal(coachCourseCheckpointGuidance('clarity_day_1','ru',opening,{conversationAct:'correction',timebox:{elapsedSeconds:960}}),'')
 assert.match(coachCourseProtocolGuidance('clarity_day_2','ru'),/Shared flow/)
})

import {clarityDayOneStageView,openingStagePosition,courseStagePosition} from '../lib/coaching/coach-session-stage-view.mjs'
import {coachProtocolSessionControlUtterance,coachProtocolEvidenceVeto} from '../lib/coaching/coach-protocol-relevance.mjs'
import {coachOpeningProgress} from '../lib/coaching/coach-opening-protocol.mjs'
test('owner regression: interface commands are not goals, facts or a refusal of coaching',()=>{
 for(const message of ['No, I want to check protocol of the session.','I want to check the protocol','I did not find an answer for the session today.','I didn\'t find an answer for the session today.','Нет, я хочу проверить протокол сессии','No, quiero ver el protocolo de la sesión']){
  assert.equal(coachProtocolSessionControlUtterance(message),true,message)
  assert.equal(coachProtocolEvidenceVeto(message),true,message)
  assert.equal(coachProtocolEvidenceVeto(message,{historicalReview:true}),false,message)
  const opening=coachOpeningProgress({turns:[message],locale:'en'})
  assert.equal(opening.declined,false)
  assert.equal(opening.current,'invitation')
 }
 assert.equal(coachProtocolEvidenceVeto('My problem is money.'),false)
 assert.equal(coachOpeningProgress({turns:['No.']}).declined,true)
 for(const word of ['sad','Sad','happy','triste','грустно']){
  const p=coachOpeningProgress({turns:['Yes',word]})
  assert.equal(p.current,'name')
  assert.equal(p.answers.name,undefined)
 }
 assert.equal(coachOpeningProgress({turns:['Yes','Call me Happy']}).answers.name.value,'Happy')
})
test('v5 wheel permission remains the next question in the verification window',()=>{
 assert.equal(clarityDayOneGapPlan({elapsedSeconds:550}).nextFieldId,'balance_consent')
 assert.equal(clarityDayOneGapPlan({elapsedSeconds:550,methodConsent:'declined'}).nextFieldId,'priority')
})
test('approved day one has six real groups before any answer; missing ledger fields stay open',()=>{
 for(const locale of ['en','ru','es']){
  const opening=openingStagePosition(coachOpeningProgress({turns:[],locale}),locale)
  const core=courseStagePosition([{id:'request',label:'Request',status:'confirmed',quote:'Money'},{id:'outer_finance',label:'Finance',status:'needs_confirmation',quote:'5'}])
  const view=clarityDayOneStageView(opening,core,locale,true)
  assert.deepEqual(view.position.rows.map(r=>r.id),['contact','situation','balance','needs','support','integration'])
  assert.equal(view.position.step,1)
  assert.equal(view.position.rows.find(r=>r.id==='balance').confirmed,0)
  assert.equal(view.position.rows.find(r=>r.id==='balance').status,'needs_confirmation')
  assert.equal(view.core.rows.find(r=>r.id==='balance_consent').protocolStatus,'not_explored')
  assert.equal(view.core.rows.find(r=>r.id==='request').status,'done')
  assert.equal(view.core.rows.filter(r=>r.id.startsWith('outer_')).length,8)
  assert.equal(view.position.rows.find(r=>r.id==='integration').status,'pending')
 }
})

import {clarityDayOneGateFields} from '../lib/coaching/clarity-day-one-scenario.mjs'
import {createCoachProtocolGate,coachProtocolGateNext,transitionCoachProtocolGate,coachMethodConsentDecision} from '../lib/coaching/coach-protocol-validation-gate.mjs'
import {openingCapturedAnswers,courseCapturedRows,coachCapturedClientTurns} from '../lib/coaching/coach-session-stage-view.mjs'
test('method consent is explicitly question-bound and requires a durable receipt before any wheel field',()=>{
 const fields=clarityDayOneGateFields().filter(f=>f.id==='balance_consent'||f.id.startsWith('outer_')||f.id==='priority')
 for(const [answer,expected,next] of [['Yes','accepted','outer_body_health'],['No','declined','priority'],['Not now','deferred','priority']]){
  let state=createCoachProtocolGate({sessionId:'session1',courseSessionId:'clarity_day_1',fields})
  const event=(type,fieldId,extra={})=>({id:'e:'+String(state.revision+1),type,sessionId:'session1',courseSessionId:'clarity_day_1',fieldId,coachId:'genie',expectedRevision:state.revision,...extra})
  const apply=(type,fieldId,extra={})=>{state=transitionCoachProtocolGate(state,event(type,fieldId,extra))}
  assert.equal(coachProtocolGateNext(state).fieldId,'balance_consent')
  assert.throws(()=>apply('issue','outer_body_health',{questionId:'q:wrong'}))
  apply('issue','balance_consent',{questionId:'q:1'})
  apply('delivery','balance_consent',{questionId:'q:1',deliveryId:'d:1',final:true})
  apply('answer','balance_consent',{questionId:'q:1',deliveryId:'d:1',turnId:'t:1',text:answer,final:true})
  assert.equal(state.pending.phase,'awaiting_save')
  assert.equal(state.pending.candidate.value,expected)
  assert.equal(coachProtocolGateNext(state).fieldId,'balance_consent')
  assert.throws(()=>apply('issue',next,{questionId:'q:wrong'}))
  apply('save_ack','balance_consent',{questionId:'q:1',receipt:state.pending.candidate.receipt,durableRevision:2})
  assert.equal(coachProtocolGateNext(state).fieldId,next)
  assert.equal(Object.keys(state.accepted).length,1)
  assert.equal(state.accepted.balance_consent.quote,answer)
  assert.equal(state.accepted.outer_body_health,undefined)
 }
 assert.equal(coachMethodConsentDecision('No, I want to check protocol of the session.'),null)
 assert.equal(coachMethodConsentDecision('Yes, but not now'),null)
 assert.throws(()=>createCoachProtocolGate({sessionId:'s',courseSessionId:'clarity_day_1',fields:[{id:'outer_finance',kind:'text',requiresConsent:'balance_consent'}]}))
})
test('unrelated interface commands and bare no are raw transcript only, not field captures',()=>{
 const rows=[{role:'user',content:'Yes'},{role:'user',content:'sad'},{role:'user',content:'No, I want to check protocol of the session.'}]
 const cap=openingCapturedAnswers(rows,h=>coachOpeningProgress({turns:h}))
 assert.equal(cap.name,undefined)
 assert.equal(coachCapturedClientTurns(rows).length,3)
 const questions=[{id:'feelings',status:'not_explored'}]
 for(const reply of ['No.','I want to check the protocol']){
  const turns=[{role:'assistant',content:'question'},{role:'user',content:reply}]
  assert.equal(courseCapturedRows(questions,turns,()=>true)[0].quote,undefined)
  assert.equal(coachCapturedClientTurns(turns).length,1)
 }
})

import {CLARITY_DAY_ONE_VERSION,CLARITY_DAY_ONE_REVIEW_VERSION} from '../lib/coaching/clarity-day-one-scenario.mjs'
import {coachCourseProtocolSchema,coachCourseProtocolRows,normalizeCoachCourseFieldReview} from '../lib/coaching/coach-course-protocol-schema.mjs'
import {checkpointConfirmation} from '../lib/coaching/coach-course-question-binding.mjs'
import {coachCourseGateTransition,coachCourseGateView} from '../lib/coaching/coach-course-gate-draft.mjs'
import {coachOpeningProtocolSnapshot} from '../lib/coaching/coach-opening-protocol.mjs'
test('server draft v5 preserves decision and moves directly to priority on refusal',()=>{
 const openingTurns=['Yes','Alex','My problem is money','I feel sad','Yes'].map(content=>({role:'user',content}))
 const opening=coachOpeningProtocolSnapshot(coachOpeningProgress({turns:openingTurns,locale:'en',personaId:'genie'}))
 assert.equal(opening.completed,true)
 const id='12345678-1234-4234-8234-123456789abc'
 let value={courseSessionId:'clarity_day_1',revision:1,protocol:{id,courseSessionId:'clarity_day_1',locale:'en',personaId:'genie',opening,turns:openingTurns}}
 const run=(action,extra={})=>{
  const next=coachCourseGateTransition(value,{action,id,revision:value.revision,consent:true,requestId:'87654321-4321-4321-8321-abcdefabcdef',...extra},'2026-11-26T12:00:00.000Z')
  value={...value,...next,revision:value.revision+1}
  return coachCourseGateView(value)
 }
 let view=run('course-gate-start')
 assert.equal(view.scenarioVersion,CLARITY_DAY_ONE_VERSION)
 assert.equal(view.review.version,CLARITY_DAY_ONE_REVIEW_VERSION)
 for(const field of ['situation','feelings','impact']){
  assert.equal(view.prompt.fieldId,field)
  view=run('course-gate-answer',{promptId:view.prompt.id,content:'skip this question'})
 }
 assert.equal(view.prompt.fieldId,'balance_consent')
 view=run('course-gate-answer',{promptId:view.prompt.id,content:'No'})
 assert.equal(view.prompt.fieldId,'priority')
 const rows=coachCourseProtocolRows('clarity_day_1',value.protocol.turns,view.review)
 assert.equal(rows.find(r=>r.id==='balance_consent').methodDecision,'declined')
 assert.ok(rows.filter(r=>r.id.startsWith('outer_')).every(r=>r.status==='not_explored'))
 assert.equal(rows.find(r=>r.id==='balance_review').status,'not_explored')
 assert.deepEqual(normalizeCoachCourseFieldReview(view.review,'clarity_day_1',value.protocol.turns),view.review)
})
test('v5 readback rejects forged consent, wrong axis and legacy pair for current-only question',()=>{
 for(const locale of ['en','ru','es']){
  const schema=coachCourseProtocolSchema('clarity_day_1',locale,{scenarioVersion:CLARITY_DAY_ONE_VERSION})
  const permission=schema.checkpoints.find(r=>r.id==='balance_consent').question
  const axis=schema.checkpoints.find(r=>r.id==='outer_finance').question
  const reply=locale==='ru'?'да':locale==='es'?'sí':'yes'
  const turns=[{role:'assistant',content:permission},{role:'user',content:reply},{role:'assistant',content:axis},{role:'user',content:'0'},{role:'assistant',content:checkpointConfirmation(axis,'0',locale)},{role:'user',content:reply}]
  const review={version:CLARITY_DAY_ONE_REVIEW_VERSION,courseSessionId:'clarity_day_1',events:[
   {fieldId:'balance_consent',status:'confirmed',turnIndex:1,quote:reply,revision:1,binding:{questionTurnIndex:0,decision:'accepted'}},
   {fieldId:'outer_finance',status:'confirmed',turnIndex:3,quote:'0',revision:2,binding:{questionTurnIndex:2,confirmationTurnIndex:5}}
  ]}
  assert.deepEqual(normalizeCoachCourseFieldReview(review,'clarity_day_1',turns),review)
  const rows=coachCourseProtocolRows('clarity_day_1',turns,review,locale)
  const rating=rows.find(r=>r.id==='outer_finance')
  assert.equal(rating.quote,'0')
  assert.equal(rating.current,0)
  assert.equal(rating.desired,null)
  assert.equal(rating.scenarioVersion,CLARITY_DAY_ONE_VERSION)
  assert.equal(rows.find(r=>r.id==='outer_body_health').current,undefined)
  const view=clarityDayOneStageView(openingStagePosition(null,locale),courseStagePosition([...rows,{id:'legacy_extra',label:'Historical',status:'confirmed',quote:'Old'}]),locale)
  assert.equal(view.core.rows.some(r=>r.id==='legacy_extra'),false)
  assert.equal(view.position.rows.find(r=>r.id==='balance').coreChildren.find(r=>r.id==='outer_finance').current,0)
  assert.equal(view.position.rows.find(r=>r.id==='balance').coreChildren.filter(r=>r.id.startsWith('outer_')).length,8)
  assert.equal(clarityDayOneBalanceSummary(rows).coverage,1)
  assert.equal(coachCourseProtocolSchema('clarity_day_1',locale).checkpoints.length,10)
  assert.throws(()=>normalizeCoachCourseFieldReview({...review,events:[{...review.events[1],revision:1}]},'clarity_day_1',turns))
  assert.throws(()=>normalizeCoachCourseFieldReview({...review,events:[{...review.events[0],binding:{questionTurnIndex:0,decision:'declined'}},review.events[1]]},'clarity_day_1',turns))
  const pair=turns.map((r,i)=>i===3?{...r,content:'5/10'}:i===4?{...r,content:checkpointConfirmation(axis,'5/10',locale)}:r)
  assert.throws(()=>normalizeCoachCourseFieldReview({...review,events:[review.events[0],{...review.events[1],quote:'5/10'}]},'clarity_day_1',pair))
 }
})

test('v5 private continuation retains the protocol and reissues only the unresolved field for a new coach',()=>{
 const openingTurns=['Yes','Alex','My problem is money','I feel sad','Yes'].map(content=>({role:'user',content}))
 const opening=coachOpeningProtocolSnapshot(coachOpeningProgress({turns:openingTurns,locale:'en',personaId:'genie'}))
 const id='12345678-1234-4234-8234-123456789abc'
 let value={courseSessionId:'clarity_day_1',revision:1,protocol:{id,courseSessionId:'clarity_day_1',locale:'en',personaId:'genie',opening,turns:openingTurns}}
 const run=(action,extra={})=>{
  const next=coachCourseGateTransition(value,{action,id,revision:value.revision,consent:true,requestId:'87654321-4321-4321-8321-abcdefabcdef',...extra},'2026-11-26T12:00:00.000Z')
  value={...value,...next,revision:value.revision+1}
  return coachCourseGateView(value)
 }
 let view=run('course-gate-start')
 view=run('course-gate-answer',{promptId:view.prompt.id,content:'I am looking for stable income'})
 view=run('course-gate-answer',{promptId:view.prompt.id,content:'Yes'})
 assert.equal(view.prompt.fieldId,'feelings')
 const prefix=JSON.stringify(value.protocol.turns),events=JSON.stringify(view.review.events)
 assert.match(view.resumeText,/stable income/)
 const oldPrompt=view.prompt.id
 assert.throws(()=>run('course-gate-continue',{coachId:'mira',resumeConfirmed:false}))
 view=run('course-gate-continue',{coachId:'mira',resumeConfirmed:true,requestId:'11111111-1111-4111-8111-111111111111'})
 assert.equal(value.protocol.id,id);assert.equal(value.protocol.personaId,'genie')
 assert.equal(view.activeCoachId,'mira');assert.equal(view.prompt.fieldId,'feelings');assert.notEqual(view.prompt.id,oldPrompt)
 assert.equal(JSON.stringify(value.protocol.turns.slice(0,JSON.parse(prefix).length)),prefix)
 assert.equal(JSON.stringify(view.review.events),events)
 assert.equal(value.protocol.turns.at(-1).authorPersonaId,'mira')
 assert.throws(()=>run('course-gate-answer',{promptId:view.prompt.id,content:'I feel calm',coachId:'genie'}))
 view=run('course-gate-answer',{promptId:view.prompt.id,content:'I feel calm',coachId:'mira'})
 assert.equal(view.prompt.kind,'confirm')
 view=run('course-gate-answer',{promptId:view.prompt.id,content:'Yes',coachId:'mira'})
 const row=coachCourseProtocolRows('clarity_day_1',value.protocol.turns,view.review).find(r=>r.id==='feelings')
 assert.equal(row.coachId,'mira');assert.equal(row.quote,'I feel calm')
})

test('v5 balance and final review show actual accepted answers, and corrections revoke stale review',()=>{
 const openingTurns=['Yes','Alex','My problem is money','I feel sad','Yes'].map(content=>({role:'user',content}))
 const opening=coachOpeningProtocolSnapshot(coachOpeningProgress({turns:openingTurns,locale:'en',personaId:'genie'}))
 const id='12345678-1234-4234-8234-123456789abc'
 let value={courseSessionId:'clarity_day_1',revision:1,protocol:{id,courseSessionId:'clarity_day_1',locale:'en',personaId:'genie',opening,turns:openingTurns}}
 const run=(action,extra={})=>{
  const next=coachCourseGateTransition(value,{action,id,revision:value.revision,consent:true,requestId:'87654321-4321-4321-8321-abcdefabcdef',...extra},'2026-11-26T12:00:00.000Z')
  value={...value,...next,revision:value.revision+1}
  return coachCourseGateView(value)
 }
 let view=run('course-gate-start')
 const answer=content=>{view=run('course-gate-answer',{promptId:view.prompt.id,content})}
 answer('I need stable income');answer('Yes')
 answer('skip this question');answer('skip this question')
 assert.equal(view.prompt.fieldId,'balance_consent');answer('Yes')
 assert.equal(view.prompt.fieldId,'outer_body_health');answer('0');answer('Yes')
 for(let i=0;i<7;i++){assert.match(view.prompt.fieldId,/^outer_/);answer('skip this question')}
 assert.equal(view.prompt.fieldId,'balance_review')
 assert.match(view.prompt.text,/0\/10/);assert.match(view.prompt.text,/7 fields remain/)
 answer('No');assert.equal(view.prompt.fieldId,'balance_review')
 answer('Yes');assert.equal(view.prompt.fieldId,'priority')
 for(let i=0;i<6;i++)answer('skip this question')
 assert.equal(view.prompt.fieldId,'reviewed_summary');assert.match(view.prompt.text,/stable income/)
 answer('Yes');assert.equal(view.completed,true)
 let rows=coachCourseProtocolRows('clarity_day_1',value.protocol.turns,view.review)
 assert.equal(rows.find(r=>r.id==='balance_review').reviewDecision,'accepted')
 assert.equal(rows.find(r=>r.id==='reviewed_summary').reviewDecision,'accepted')
 assert.equal(rows.find(r=>r.id==='homework_consent').status,'not_explored')
 view=run('course-gate-correct',{fieldId:'outer_body_health'})
 rows=coachCourseProtocolRows('clarity_day_1',value.protocol.turns,view.review)
 assert.equal(rows.find(r=>r.id==='balance_review').status,'not_explored')
 assert.equal(rows.find(r=>r.id==='reviewed_summary').status,'not_explored')
 assert.equal(view.prompt.fieldId,'outer_body_health')
 answer('6');answer('Yes')
 assert.equal(view.prompt.fieldId,'balance_review');assert.match(view.prompt.text,/6\/10/)
 assert.equal(view.review.events.filter(e=>e.fieldId==='balance_review'&&e.status==='confirmed').length,1)
})


test('Clarity day two and three handoff keeps the same immutable prefix and reissues the unresolved prompt',()=>{
 for(const courseSessionId of ['clarity_day_2','clarity_day_3']){
  const openingTurns=['Yes','Alex','My problem is money','I feel sad','Yes'].map(content=>({role:'user',content}))
  const opening=coachOpeningProtocolSnapshot(coachOpeningProgress({turns:openingTurns,locale:'en',personaId:'genie'}))
  const id='12345678-1234-4234-8234-123456789abc'
  let value={courseSessionId,revision:1,protocol:{id,courseSessionId,locale:'en',personaId:'genie',opening,turns:openingTurns}}
  const run=(action,extra={})=>{
   const next=coachCourseGateTransition(value,{action,id,revision:value.revision,consent:true,requestId:'87654321-4321-4321-8321-abcdefabcdef',...extra},'2026-11-26T12:00:00.000Z')
   value={...value,...next,revision:value.revision+1};return coachCourseGateView(value)
  }
  let view=run('course-gate-start')
  assert.equal(view.crossCoach,true)
  const before=JSON.stringify(value.protocol.turns),length=value.protocol.turns.length,field=view.prompt.fieldId,prompt=view.prompt.id
  assert.throws(()=>run('course-gate-continue',{coachId:'mira',resumeConfirmed:false}))
  view=run('course-gate-continue',{coachId:'mira',resumeConfirmed:true,requestId:'11111111-1111-4111-8111-111111111111'})
  assert.equal(value.protocol.id,id);assert.equal(value.protocol.personaId,'genie')
  assert.equal(view.activeCoachId,'mira');assert.equal(view.prompt.fieldId,field);assert.notEqual(view.prompt.id,prompt)
  assert.equal(JSON.stringify(value.protocol.turns.slice(0,length)),before)
  assert.equal(value.protocol.turns.at(-1).authorPersonaId,'mira')
  assert.throws(()=>run('course-gate-answer',{promptId:view.prompt.id,content:'I need support',coachId:'genie'}))
 }
})

test('restored verified minutes are frozen during recap, safety hold and unknown-time recovery',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 assert.ok(ui.includes('const courseClockHeld=courseResumeRequired||Boolean(courseGate?.step.paused)||clarityTimeUnknown'))
 assert.ok(ui.includes('!coachProfileOpenRef.current&&!courseClockHeld&&'))
 assert.ok(ui.includes('clarityVoiceActive,courseClockHeld,resumePending,restoredDraft])'))
 assert.ok(ui.includes('activeClockRef.current.restore(timeKnown?restoredTime.elapsedSeconds:p.durationSeconds||0)'))
 assert.ok(ui.includes("if(payload.action==='course-gate-continue')setCourseResumeRequired(false)"))
 assert.ok(ui.includes('&&!clarityTimeUnknown?Math.floor(activeSessionSeconds):null'))
 const clock=createCoachActiveClock()
 assert.equal(clock.restore(420),420)
 assert.equal(clock.sample(10000),420)
 clock.setRunning(10000,false)
 assert.equal(clock.sample(40000),420)
 clock.setRunning(40000,true)
 assert.equal(clock.sample(45000),425)
 clock.setRunning(45000,false)
 assert.equal(clock.sample(55000),425)
})


test('live course panel keeps authored wheel checkpoints in the same six groups and removes the competing generic method summary',async()=>{
 const {coachCourseProtocolSchema}=await import('../lib/coaching/coach-course-protocol-schema.mjs')
 for(const locale of ['ru','en','es']){
  const scenario=clarityDayOneScenario(locale)
  const schema=coachCourseProtocolSchema('clarity_day_1',locale,{scenarioVersion:'hh-clarity-day-one-v5'})
  const fields=schema.checkpoints.map(row=>({...row,status:'not_explored'}))
  const opening=openingStagePosition(coachOpeningProgress({turns:[],locale}),locale)
  const view=clarityDayOneStageView(opening,courseStagePosition(fields,{allowProvisional:false}),locale,true)
  const balance=view.position.rows.find(row=>row.id==='balance')
  assert.deepEqual(balance.coreChildren.map(row=>row.id),scenario.fields.filter(row=>row.progressStage==='balance').map(row=>row.id))
  assert.equal(balance.coreChildren.filter(row=>row.id.startsWith('outer_')).length,8)
  assert.equal(balance.confirmed,0)
  assert.equal(view.position.total,6)
  assert.equal(new Set(view.position.rows.flatMap(row=>row.coreChildren.map(field=>field.id))).size,view.core.rows.length)
 }
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const card=readFileSync(new URL('../components/my-coach-session-state-card.jsx',import.meta.url),'utf8')
 assert.ok(ui.includes("courseProtocol={coreMode==='course'}"))
  assert.ok(ui.includes('const stagePosition=approvedClarity?.position||groupedSessionPosition'))
  assert.ok(ui.includes('position={approvedClarity?.core||detailPosition}'))
  assert.ok(ui.includes('clarityVersionedStageView(selectedCourseId,openingPosition,detailPosition'))
 assert.ok(card.includes('{!courseProtocol&&<section className={styles.informationSection}'))
 assert.ok(card.includes('data-coach-preferred-name'))
})


test('early name heard in a real opening survives the same Clarity protocol snapshot',()=>{
 const turns=[
  {role:'assistant',content:'Как мне вас называть?'},
  {role:'user',content:'Alex'},
  {role:'assistant',content:'Хотите сегодня провести со мной коучинговую сессию?'}
 ]
 const run=rows=>coachOpeningProgress({turns:rows,locale:'ru',personaId:'mira'})
 assert.equal(run(turns).checkmarks.invitation,false)
 assert.equal(run(turns).checkmarks.name,false)
 const agreed=run([...turns,{role:'user',content:'Да, давайте начнём.'}])
 assert.equal(agreed.checkmarks.invitation,true)
 assert.equal(agreed.checkmarks.name,true)
 assert.equal(agreed.answers.name.value,'Alex')
 assert.equal(coachOpeningProtocolSnapshot(agreed).name,'Alex')
 for(const invalid of [
  [{...turns[0],interrupted:true},...turns.slice(1)],
  [{...turns[0],content:'Как ваше самочувствие?'},...turns.slice(1)],
  [turns[0],{...turns[1],unanswered:true},turns[2]]
 ]){
  assert.equal(run([...invalid,{role:'user',content:'Да, давайте начнём.'}]).checkmarks.name,false)
 }
})
