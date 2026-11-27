import test from 'node:test'
import assert from 'node:assert/strict'
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
