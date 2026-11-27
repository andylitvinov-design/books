import test from 'node:test'
import assert from 'node:assert/strict'
import {clarityScenarioVersion,clarityScenarioReviewVersion,clarityVersionedScenario,clarityScenarioGateFields,clarityScenarioReviewOf,clarityScenarioGuidance,clarityScenarioTimeGuidance,clarityMetricScore,clarityPracticeStatus} from '../lib/coaching/clarity-course-scenarios.mjs'
import {coachCourseProtocolSchema,coachCourseProtocolRows,normalizeCoachCourseFieldReview,clarityDayOneReviewPrompt,coachCourseProtocolGuidance} from '../lib/coaching/coach-course-protocol-schema.mjs'
import {checkpointConfirmation,checkpointQuestionMatches,checkpointLiveAnswerMismatch} from '../lib/coaching/coach-course-question-binding.mjs'
import {createCoachProtocolGate} from '../lib/coaching/coach-protocol-validation-gate.mjs'
import {courseStagePosition,groupedSessionPosition} from '../lib/coaching/coach-session-stage-view.mjs'
import {claritySemanticResult} from '../lib/coaching/clarity-session-fields.mjs'
import {claritySessionProtocol} from '../lib/coaching/clarity-course-protocol.mjs'
import {coachCourseHandoffEligible} from '../lib/coaching/coach-course-continuity.mjs'
const ids=['clarity_day_2','clarity_day_3']
const locales=['en','ru','es']
test('B/C: one versioned registry feeds questions, gate, display, report and resume',()=>{
 for(const course of ids)for(const locale of locales){
  const version=clarityScenarioVersion(course),s=clarityVersionedScenario(course,locale)
  assert.equal(s.stages.length,6)
  const schema=coachCourseProtocolSchema(course,locale,{scenarioVersion:version})
  assert.deepEqual(schema.checkpoints.map(r=>r.id),s.fields.map(f=>f.id))
  assert.equal(new Set(s.fields.map(f=>f.id)).size,s.fields.length)
  assert.equal(new Set(s.fields.map(f=>f.question)).size,s.fields.length)
  for(const f of s.fields){
   assert.ok(s.stages.some(g=>g.id===f.progressStage))
   const row=schema.checkpoints.find(r=>r.id===f.id)
   assert.equal(row.question,f.question)
   assert.ok(checkpointQuestionMatches(row,locale,f.question))
   assert.ok(!checkpointQuestionMatches(row,locale,'unrelated question'))
   if(f.requiresConsent)assert.ok(s.fields.some(r=>r.id===f.requiresConsent&&r.kind==='consent'))
  }
  const gates=clarityScenarioGateFields(course)
  assert.doesNotThrow(()=>createCoachProtocolGate({sessionId:'s1',courseSessionId:course,fields:gates}))
  assert.ok(gates.every(g=>schema.checkpoints.some(r=>r.id===g.id)))
  assert.ok(!gates.some(g=>g.id==='homework_consent'||g.id==='separate_plan_consent'))
  const review={version:clarityScenarioReviewVersion(course),courseSessionId:course,events:[]}
  const rows=coachCourseProtocolRows(course,[],review,locale)
  assert.equal(rows.length,s.fields.length)
  assert.ok(rows.every(r=>r.status==='not_explored'&&!r.quote))
  const grouped=groupedSessionPosition({rows:[]},courseStagePosition(rows),{mode:'course',courseId:course,locale})
  assert.deepEqual(grouped.rows.map(r=>r.id),s.stages.map(g=>g.id))
  assert.equal(grouped.rows.flatMap(r=>r.coreChildren).length,rows.length)
  assert.ok(grouped.rows.every(r=>r.tone==='gray'))
  assert.ok(clarityScenarioGuidance(course,locale).includes(version))
  assert.ok(coachCourseProtocolGuidance(course,locale).includes(version))
  assert.ok(clarityScenarioTimeGuidance(course,1020).includes('Integrate'))
  assert.ok(clarityScenarioTimeGuidance(course,1200).includes('Time limit'))
  assert.ok( coachCourseHandoffEligible(course,{scenarioVersion:version,paused:false}))
  assert.ok(!coachCourseHandoffEligible(course,{scenarioVersion:clarityScenarioVersion(course===ids[0]?ids[1]:ids[0]),paused:false}))
  const draft=claritySessionProtocol({id:'s1',courseSessionId:course,provenance:'client_autosaved_unreviewed_draft',turns:[]},course===ids[0]?2:3,locale,{draftReview:review,scenarioVersion:version})
  assert.deepEqual(draft.rows.map(r=>r.id),rows.map(r=>r.id))
 }
})
const fixture=(course,locale='en')=>{
 const scenarioVersion=clarityScenarioVersion(course),schema=coachCourseProtocolSchema(course,locale,{scenarioVersion})
 const turns=[],events=[]
 const add=(id,quote,kind='text',decision=null)=>{
  const question=kind==='review'?clarityDayOneReviewPrompt(id,coachCourseProtocolRows(course,turns,{version:clarityScenarioReviewVersion(course),courseSessionId:course,events},locale),locale,false,course):schema.checkpoints.find(r=>r.id===id).question
  const n=turns.length+1
  turns.push({role:'assistant',content:question},{role:'user',content:quote})
  const binding={questionTurnIndex:n-1}
  if(kind==='consent')binding.decision=decision
  else if(kind==='review')binding.review='accepted'
  else{turns.push({role:'assistant',content:checkpointConfirmation(question,quote,locale)},{role:'user',content:'yes'});binding.confirmationTurnIndex=n+2}
  events.push({fieldId:id,status:'confirmed',turnIndex:n,quote,revision:events.length+1,binding})
 }
 const review=()=>({version:clarityScenarioReviewVersion(course),courseSessionId:course,events})
 return {turns,events,add,review,schema}
}
test('B: explicit consent gates inner axes and trial; zero is not missing, no invented effect',()=>{
 const course=ids[0],f=fixture(course)
 f.add('episode','I worked late twice')
 f.add('needs','A quieter evening')
 f.add('resources','A colleague can share tasks')
 f.add('selected_support','Ask the colleague')
 f.add('practice_consent','no','consent','declined')
 f.add('transfer_action','Ask about one task')
 f.add('timing_or_condition','Tomorrow at four')
 f.add('helpfulness_indicator','Whether I finish on time')
 f.add('inner_consent','no','consent','declined')
 f.add('reviewed_summary','yes','review')
 const review=f.review(),rows=coachCourseProtocolRows(course,f.turns,review)
 const result=claritySemanticResult(2,rows)
 assert.equal(result.kind,'support')
 assert.equal(result.axes,undefined)
 assert.equal(rows.find(r=>r.id==='test_status').status,'not_explored')
 assert.equal(result.nodes.find(r=>r.id==='transfer_action').value,'Ask about one task')
 assert.equal(result.nodes.find(r=>r.id==='test_observation'),undefined)
 const bad=fixture(course);bad.add('inner_anchor','2/8')
 assert.throws(()=>normalizeCoachCourseFieldReview(bad.review(),course,bad.turns))
 const other=fixture(course);other.add('support_scale_consent','yes','consent','accepted');other.add('optional_scale_before','0')
 assert.equal(claritySemanticResult(2,coachCourseProtocolRows(course,other.turns,other.review())).metrics[0].value,0)
 assert.equal(clarityMetricScore('confidence','11'),null)
 assert.equal(checkpointLiveAnswerMismatch('confidence','maybe 6'),true)
})
test('C: deferred choice never creates a goal; accepted consent alone does not create a goal',()=>{
 const course=ids[1],f=fixture(course)
 f.add('priority','Relationships')
 f.add('goal_status','Not now','consent','deferred')
 f.add('next','Reflect on what matters')
 f.add('timing','Tomorrow evening')
 f.add('reviewed_summary','yes','review')
 const result=claritySemanticResult(3,coachCourseProtocolRows(course,f.turns,f.review()))
 assert.equal(result.goalStatus,'deferred')
 assert.equal(result.nodes.find(r=>r.id==='goal'),undefined)
 const bad=fixture(course);bad.add('goal','More time for rest')
 assert.throws(()=>normalizeCoachCourseFieldReview(bad.review(),course,bad.turns))
 const a=fixture(course);a.add('goal_status','yes','consent','accepted')
 assert.equal(claritySemanticResult(3,coachCourseProtocolRows(course,a.turns,a.review())).goalStatus,null)
 a.add('goal','More time for rest');a.add('why','Recover time for family');a.add('baseline','Two late evenings');a.add('success','Two on-time evenings');a.add('horizon','Four weeks');a.add('next','Review my task list');a.add('timing','Tomorrow at four');a.add('reviewed_summary','yes','review')
 const selected=claritySemanticResult(3,coachCourseProtocolRows(course,a.turns,a.review()))
 assert.equal(selected.goalStatus,'chosen')
 assert.equal(selected.nodes.find(r=>r.id==='baseline').value,'Two late evenings')
 assert.equal(selected.nodes.find(r=>r.id==='horizon').value,'Four weeks')
})
test('historical B/C remain versionless and do not reclassify past answers',()=>{
 for(const course of ids){
  const old=coachCourseProtocolSchema(course)
  assert.ok(!old.checkpoints.some(r=>r.scenarioVersion))
  assert.ok(old.checkpoints.some(r=>r.id===(course===ids[0]?'inner_anchor':'dream_image')))
  assert.equal(coachCourseProtocolSchema(course,'en',{scenarioVersion:clarityScenarioVersion(course===ids[0]?ids[1]:ids[0])}),null)
 }
})

test('explicit practice status is not inferred from a suggestion or plan',()=>{
 assert.equal(clarityPracticeStatus('tried: asked one question'),'attempted')
 assert.equal(clarityPracticeStatus('Запланировала: на завтра'),'planned')
 assert.equal(clarityPracticeStatus('solo conversamos'),'listening_only')
 assert.equal(clarityPracticeStatus('I might try tomorrow'),null)
 assert.equal(clarityPracticeStatus('The coach told me to try'),null)
 assert.ok(checkpointLiveAnswerMismatch('test_status','I might try tomorrow'))
 const f=fixture(ids[0]);f.add('practice_consent','yes','consent','accepted')
 f.add('test_status','planned for later')
 const result=claritySemanticResult(2,coachCourseProtocolRows(ids[0],f.turns,f.review()))
 assert.equal(result.practiceStatus,'planned')
 assert.equal(result.nodes.find(r=>r.id==='test_observation'),undefined)
})

test('timecode guidance targets current scenario checkpoints, preserves dialogue and closing',()=>{
 const cases=[
 ['clarity_day_2',0,'situation','episode'],['clarity_day_2',240,'resources','resources'],
 ['clarity_day_2',480,'practice','practice_consent'],['clarity_day_2',840,'transfer','transfer_action'],
 ['clarity_day_3',0,'review','priority'],['clarity_day_3',180,'goal','goal_status'],
 ['clarity_day_3',420,'reality','baseline'],['clarity_day_3',660,'action','next']
 ]
 for(const [course,seconds,stage,field] of cases){
  const hint=clarityScenarioTimeGuidance(course,seconds)
  assert.ok(hint.includes('Active phase: '+stage))
  assert.ok(hint.includes(field))
  assert.match(hint,/one relevant unanswered eligible checkpoint/)
  assert.match(hint,/Time hint only/)
 }
 for(const course of ['clarity_day_2','clarity_day_3']){
  assert.match(clarityScenarioTimeGuidance(course,null),/explicit consent/)
  assert.match(clarityScenarioTimeGuidance(course,1020),/reviewed_summary/)
  assert.match(clarityScenarioTimeGuidance(course,1140),/reserve/)
  assert.match(clarityScenarioTimeGuidance(course,1200),/do not start another question/)
  for(const locale of ['ru','en','es']){
   assert.match(clarityScenarioGuidance(course,locale),/Active-time windows/)
   assert.match(coachCourseProtocolGuidance(course,locale),/Follow the live dialogue first/)
  }
 }
 assert.match(clarityScenarioTimeGuidance('clarity_day_1',1200),/do not start another coaching question/)
 assert.match(clarityScenarioTimeGuidance('clarity_day_1',240),/4–9 min balance/)
})
