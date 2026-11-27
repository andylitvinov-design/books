import test from 'node:test'
import assert from 'node:assert/strict'
import {clarityScenarioVersion,clarityScenarioReviewVersion,clarityVersionedScenario,clarityScenarioGateFields,clarityScenarioReviewOf,clarityScenarioGuidance,clarityScenarioTimeGuidance,clarityMetricScore,clarityPracticeStatus} from '../lib/coaching/clarity-course-scenarios.mjs'
import {coachCourseProtocolSchema,coachCourseProtocolRows,normalizeCoachCourseFieldReview,clarityDayOneReviewPrompt,coachCourseProtocolGuidance,coachCourseCheckpointGuidance} from '../lib/coaching/coach-course-protocol-schema.mjs'
import {checkpointConfirmation,checkpointQuestionMatches,checkpointLiveAnswerMismatch} from '../lib/coaching/coach-course-question-binding.mjs'
import {createCoachProtocolGate,coachProtocolGateNext,transitionCoachProtocolGate} from '../lib/coaching/coach-protocol-validation-gate.mjs'
import {courseStagePosition,groupedSessionPosition} from '../lib/coaching/coach-session-stage-view.mjs'
import {claritySemanticResult,clarityMethodOutcome} from '../lib/coaching/clarity-session-fields.mjs'
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

test('all Clarity time hints fit the Gemini Director sideband budget',()=>{
 for(const course of ['clarity_day_1','clarity_day_2','clarity_day_3']){
  for(let seconds=0;seconds<=1200;seconds++){
   const hint=clarityScenarioTimeGuidance(course,seconds)
   assert.ok(hint.length<=450,course+' '+seconds+' '+hint.length)
  }
 }
})

test('a current answer is verified before a timed transition, while closing remains protected',()=>{
 const opening={completed:true,answers:{focus:{kind:'goal'}}}
 for(const locale of ['ru','en','es']){
  for(const [course,field,seconds,closeAt] of [['clarity_day_1','situation',240,960],['clarity_day_2','episode',240,1020],['clarity_day_3','priority',180,1020]]){
   const schema=coachCourseProtocolSchema(course,locale,{scenarioVersion:clarityScenarioVersion(course)})
   const row=schema.checkpoints.find(x=>x.id===field)
   assert.ok(row)
   const turns=[{role:'assistant',content:row.question}]
   const directive={conversationAct:'substantive_reply',timebox:{elapsedSeconds:seconds}}
   const hint=coachCourseCheckpointGuidance(course,locale,opening,directive,turns,'I have been considering my work and relationships.')
   assert.match(hint,/Current field:/)
   assert.match(hint,/Finish or leave this field open/)
   assert.ok(hint.length<=450)
   assert.equal(coachCourseCheckpointGuidance(course,locale,opening,{...directive,timebox:{elapsedSeconds:closeAt}},turns,'I need more time.'),clarityScenarioTimeGuidance(course,closeAt))
   assert.equal(coachCourseCheckpointGuidance(course,locale,opening,{...directive,conversationAct:'correction'},turns,'No'), '')
  }
 }
})

test('unverified time uses short scenario-order guidance; separate permissions never become live questions',()=>{
 const opening={completed:true,answers:{focus:{kind:'goal'}}}
 for(const course of ['clarity_day_1','clarity_day_2','clarity_day_3']){
  for(const locale of ['en','ru','es']){
   const schema=coachCourseProtocolSchema(course,locale,{scenarioVersion:clarityScenarioVersion(course)})
   for(const elapsedSeconds of [null,undefined,NaN,-1]){
    const directive={conversationAct:'substantive_reply',timebox:{elapsedSeconds}}
    const hint=coachCourseCheckpointGuidance(course,locale,opening,directive,[],'I want to explore this.')
    assert.match(hint,/Active time unverified/)
    assert.match(hint,/approved scenario order/)
    assert.ok(hint.length<=450)
   }
   for(const row of schema.checkpoints.filter(x=>x.requiresSeparateReview)){
    const directive={conversationAct:'substantive_reply',timebox:{elapsedSeconds:300}}
    const hint=coachCourseCheckpointGuidance(course,locale,opening,directive,[{role:'assistant',content:row.question}],'yes')
    assert.doesNotMatch(hint,/Current field:/)
    assert.equal(hint,clarityScenarioTimeGuidance(course,300))
   }
  }
 }
})


test('method outcome distinguishes confirmed core from optional coverage, independent homework and timed completion',()=>{
 const v=clarityScenarioVersion(ids[1]),make=(id,extra={})=>({id,scenarioVersion:v,status:'confirmed',quote:'Client answer',source:'client_reviewed_quote',...extra})
 const rows=['priority','goal','why','success','next','timing'].map(k=>make(k))
 rows.push(make('goal_status',{methodDecision:'accepted'}),make('reviewed_summary',{reviewDecision:'accepted'}))
 assert.equal(clarityMethodOutcome(3,rows).outcome,'goal_partial_plan')
 rows.push(make('baseline'),make('horizon'))
 assert.equal(clarityMethodOutcome(3,rows).outcome,'goal_plan')
 assert.equal(clarityMethodOutcome(3,rows.map(r=>r.id==='goal'?{...r,status:'self_reported',source:'daybook'}:r)).outcome,'partial')
 assert.equal(clarityMethodOutcome(3,rows.map(r=>r.id==='reviewed_summary'?{...r,reviewDecision:null}:r)).outcome,'partial')
 assert.equal(clarityMethodOutcome(3,rows.map(r=>r.id==='goal_status'?{...r,methodDecision:'deferred'}:r)).outcome,'goal_deferred')
 const b=fixture(ids[0]);b.add('episode','Late work');b.add('needs','Time to rest');b.add('selected_support','Ask a colleague');b.add('practice_consent','yes','consent','accepted');b.add('test_status','tried');b.add('transfer_action','Ask tomorrow');b.add('timing_or_condition','Tomorrow morning');b.add('helpfulness_indicator','Finish on time');b.add('reviewed_summary','yes','review')
 const result=claritySemanticResult(2,coachCourseProtocolRows(ids[0],b.turns,b.review()))
 assert.equal(result.methodOutcome.outcome,'partial');assert.ok(result.methodOutcome.coreMissing.includes('test_observation'))
 assert.equal(clarityMethodOutcome(1,[]),null)
})


import {coachCourseResumeRecap} from '../lib/coaching/coach-course-gate-draft.mjs'
test('resume recap prioritizes recent verified answers and the exact outstanding prompt',()=>{
 const course=ids[0],f=fixture(course)
 f.add('episode','I worked late twice');f.add('needs','A quieter evening');f.add('resources','A colleague can share tasks');f.add('selected_support','Ask the colleague');f.add('practice_consent','no','consent','declined');f.add('transfer_action','Ask about one task')
 const scenarioVersion=clarityScenarioVersion(course),protocol={courseSessionId:course,locale:'en',turns:f.turns}
 const gate={pending:null,fields:[{id:'timing_or_condition',kind:'text'}],accepted:{}}
 const prompt={fieldId:'timing_or_condition',text:'When exactly will you try this next step?'}
 const value={protocol,courseGate:{scenarioVersion,paused:false,review:f.review(),gate,prompt}}
 const recap=coachCourseResumeRecap(value)
 assert.ok(recap.includes('Ask about one task'));assert.ok(!recap.includes('I worked late twice'));assert.ok(recap.includes(prompt.text));assert.ok(recap.includes('Continue this same coaching session?'))
 const fallback=coachCourseResumeRecap({...value,courseGate:{...value.courseGate,prompt:null}})
 assert.ok(fallback.includes(f.schema.checkpoints.find(r=>r.id==='timing_or_condition').label))
})

test('B observation requires a confirmed attempt in the real gate and review ledger',()=>{
 const course=ids[0]
 for(const [status,expected] of [['planned for later',false],['just talked',false],['declined',false],['tried',true],['stopped',true]]){
  const f=fixture(course)
  f.add('practice_consent','yes','consent','accepted')
  f.add('test_status',status)
  const rows=coachCourseProtocolRows(course,f.turns,f.review())
  assert.equal(rows.find(r=>r.id==='test_observation').status,'not_explored')
  f.add('test_observation','No change in how I felt')
  if(expected)assert.equal(coachCourseProtocolRows(course,f.turns,f.review()).find(r=>r.id==='test_observation').status,'confirmed')
  else assert.throws(()=>normalizeCoachCourseFieldReview(f.review(),course,f.turns))
  const fields=clarityScenarioGateFields(course).filter(x=>['practice_consent','test_status','test_observation','transfer_action'].includes(x.id))
  let gate=createCoachProtocolGate({sessionId:'s1',courseSessionId:course,fields})
  let seq=0
  const transition=(type,fieldId,extra={})=>{gate=transitionCoachProtocolGate(gate,{id:'e:'+String(++seq),type,fieldId,sessionId:'s1',courseSessionId:course,coachId:'mira',expectedRevision:gate.revision,...extra})}
  const answer=(id,quote,revision)=>{
   const q='q:'+id,d='d:'+id
   transition('issue',id,{questionId:q})
   transition('delivery',id,{questionId:q,deliveryId:d,final:true})
   transition('answer',id,{questionId:q,deliveryId:d,turnId:'t:'+id,text:quote,final:true,explicitFieldEntry:true})
   transition('save_ack',id,{questionId:q,receipt:gate.pending.candidate.receipt,durableRevision:revision})
  }
  answer('practice_consent','yes',1)
  answer('test_status',status,2)
  assert.equal(coachProtocolGateNext(gate).fieldId,expected?'test_observation':'transfer_action')
  if(expected){
   answer('test_observation','No change in how I felt',3)
   transition('reopen','test_status',{turnId:'correction:1',explicitCorrection:true})
   assert.equal(gate.accepted.test_observation,undefined)
   assert.equal(coachProtocolGateNext(gate).fieldId,'test_status')
  }
 }
})

import {coachCourseScenarioFirst,coachCourseLiveInstruction,COACH_PROGRAM_SESSIONS} from '../lib/coaching/coach-course-journey.mjs'
import {coachCourseIndependentQuestion} from '../lib/coaching/coach-course-protocol-schema.mjs'
import {coachSessionDirectivePrompt,enforceCoachSessionDirective} from '../lib/coaching/coach-session-director.mjs'
import {vetoMethodStepQuestion} from '../lib/coaching/method-protocol-v4.mjs'
import {geminiLiveThematicCheckpointGuidance} from '../lib/coaching/gemini-live-free.mjs'

test('registered courses own scenario, standalone sessions keep personal method',()=>{
 const courses=[...COACH_PROGRAM_SESSIONS.map(x=>x.id),'clarity_day_1','clarity_day_2','clarity_day_3']
 for(const id of courses)for(const locale of ['ru','en','es']){
  assert.equal(coachCourseScenarioFirst(id),true)
  assert.match(coachCourseLiveInstruction(id,locale),/COURSE SCENARIO FIRST/)
  assert.match(coachCourseLiveInstruction(id,locale),/secondary toolbox/)
 }
 for(const id of [undefined,null,'life_direction','introductory','meaning_axes_inner_growth','goal_forged']){
  assert.equal(coachCourseScenarioFirst(id),false)
 }
})
test('course priority never authorizes dependent questions or separate permissions',()=>{
 for(const locale of ['ru','en','es']){
  for(const [course,id,expected] of [
   ['clarity_day_1','situation',true],['clarity_day_1','outer_body_health',false],['clarity_day_1','homework_consent',false],
   ['clarity_day_2','episode',true],['clarity_day_2','test_status',false],
   ['clarity_day_3','priority',true],['clarity_day_3','goal',false]]){
   const row=coachCourseProtocolSchema(course,locale,{scenarioVersion:clarityScenarioVersion(course)}).checkpoints.find(x=>x.id===id)
   assert.ok(row)
   assert.equal(coachCourseIndependentQuestion(course,locale,row.question),expected)
  }
 }
 assert.equal(coachCourseIndependentQuestion('goal_forged','en','What should I do?'),false)
})
test('personal method remains locked as evidence but no longer supplies course roadmap or competing live checkpoint',()=>{
 const base={version:'test',personaId:'mira',personaVersion:'test',methodId:'grow',methodShape:'Goal → Reality → Options',methodProtocolVersion:'test',provisionalPhase:'discovery',phase:'discovery',stageLimit:'goal',methodStepId:'grow:goal',interventionId:'clarify_goal',timebox:{elapsedSeconds:480,phase:'exploration'},evidence:{},readiness:{missing:[]},allowQuestion:true,locale:'en'}
 const ordinary=coachSessionDirectivePrompt(base)
 assert.match(ordinary,/Locked primary method=grow/)
 assert.match(ordinary,/MANDATORY next conversational move/)
 const course={...base,courseScenarioFirst:true,courseSessionId:'clarity_day_2'}
 const prompt=coachSessionDirectivePrompt(course)
 assert.match(prompt,/COURSE SCENARIO FIRST/)
 assert.match(prompt,/Advisory active elapsed time: 480 seconds/)
 assert.doesNotMatch(prompt,/Locked primary method=grow/)
 assert.doesNotMatch(prompt,/Five conversational themes/)
 assert.match(prompt,/Do NOT suggest a plan/)
 assert.match(geminiLiveThematicCheckpointGuidance('',course,' Active phase: resources.'),/Director: course scenario first/)
 assert.doesNotMatch(geminiLiveThematicCheckpointGuidance('',course,' Active phase: resources.'),/step grow:goal/)
 assert.match(geminiLiveThematicCheckpointGuidance('',base,' Active phase: resources.'),/step grow:goal/)
})
test('personal topic-order veto yields only to recognized course question, never premature action',()=>{
 const d={methodId:'oskar',methodStepId:'oskar:outcome'}
 assert.equal(vetoMethodStepQuestion('On a scale of 0 to 10?',d),true)
 assert.equal(vetoMethodStepQuestion('On a scale of 0 to 10?',d,{courseOwnedQuestion:true}),false)
 assert.equal(vetoMethodStepQuestion('When will you start?',d,{courseOwnedQuestion:true}),true)
 const base={methodId:'grow',methodStepId:'grow:goal',interventionId:'clarify_goal',phase:'discovery',allowQuestion:true,evidence:{},canOfferAction:false,locale:'en',courseScenarioFirst:true,courseScenarioActive:true,courseSessionId:'goal_possibilities'}
 const row=coachCourseProtocolSchema('goal_possibilities','en').checkpoints.find(x=>x.id==='options')
 const response={mode:'ai',message:row.question,planSuggestion:'',evidenceQuote:''}
 assert.equal(enforceCoachSessionDirective(response,base).message,row.question)
 assert.throws(()=>enforceCoachSessionDirective({...response,message:'You must commit to a deadline.'},base))
 assert.throws(()=>enforceCoachSessionDirective(response,{...base,allowQuestion:false}))
})

test('day two support outcome requires the resource and preserves trial versus plan',()=>{
 const v=clarityScenarioVersion('clarity_day_2'),make=(id,extra={})=>({id,scenarioVersion:v,status:'confirmed',quote:'Client answer',source:'client_reviewed_quote',...extra})
 const rows=['episode','needs','selected_support','transfer_action','timing_or_condition','helpfulness_indicator'].map(k=>make(k))
 rows.push(make('practice_consent',{methodDecision:'accepted'}),make('test_status',{quote:'planned'}),make('reviewed_summary',{reviewDecision:'accepted'}))
 assert.equal(clarityMethodOutcome(2,rows).outcome,'partial')
 assert.ok(clarityMethodOutcome(2,rows).coreMissing.includes('resources'))
 rows.push(make('resources'))
 assert.equal(clarityMethodOutcome(2,rows).outcome,'support_planned')
 assert.equal(clarityMethodOutcome(2,rows.map(r=>r.id==='resources'?{...r,status:'self_reported',source:'daybook'}:r)).outcome,'partial')
 for(const locale of locales){
  const guide=clarityScenarioGuidance('clarity_day_2',locale)
  assert.match(guide,/do not propose ending the session/)
  assert.match(guide,/Comfort ratings are not the optional support-availability scale/)
  assert.match(guide,/independent reflections are not confirmed dialogue evidence/)
 }
})
