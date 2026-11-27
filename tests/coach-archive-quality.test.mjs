import test from 'node:test'
import assert from 'node:assert/strict'
import {archivedSupervisorCandidate,archiveQualityProjection,archiveReviewStoredVerdict} from '../lib/personal-coaching/coach-archive-quality.mjs'
import {coachCourseProtocolSchema,COACH_COURSE_FIELD_REVIEW_VERSION} from '../lib/coaching/coach-course-protocol-schema.mjs'
import {checkpointConfirmation} from '../lib/coaching/coach-course-question-binding.mjs'
import {prepareSupervisorCandidate,validateSupervisorVerdict} from '../lib/coaching/coach-supervisor.mjs'
const id='11111111-1111-4111-8111-111111111111'
function fixture(locale='ru'){
 const courseSessionId='goal_result',field=coachCourseProtocolSchema(courseSessionId,locale).checkpoints.find(f=>f.id==='goal')
 const quote=({ru:'Хочу открыть студию',en:'I want to open a studio',es:'Quiero abrir un estudio'})[locale]
 const yes=({ru:'Да',en:'Yes',es:'Sí'})[locale]
 const turns=[{role:'assistant',content:field.question},{role:'user',content:quote},{role:'assistant',content:checkpointConfirmation(field.question,quote,locale)},{role:'user',content:yes}]
 return {id,provenance:'client_reviewed_dialogue',locale,courseSessionId,turns,courseFieldReview:{version:COACH_COURSE_FIELD_REVIEW_VERSION,courseSessionId,events:[{fieldId:'goal',status:'confirmed',turnIndex:1,quote,revision:1,binding:{questionTurnIndex:0,confirmationTurnIndex:3}}]}}
}
test('archive review selects only exact question-bound owner-source coaching fields in all languages',()=>{
 for(const locale of ['ru','en','es']){
  const p=fixture(locale),c=archivedSupervisorCandidate(p,'goal','review1')
  assert.ok(c);assert.equal(c.input.mode,'coaching');assert.equal(c.input.quote,p.turns[1].content)
  assert.deepEqual(c.input.context,[]);assert.equal(c.source.revision,1)
  assert.equal(archivedSupervisorCandidate({...p,provenance:'client_autosaved_unreviewed_draft'},'goal','review1'),null)
  const {binding,...manual}=p.courseFieldReview.events[0]
  assert.equal(archivedSupervisorCandidate({...p,courseFieldReview:{...p.courseFieldReview,events:[manual]}},'goal','review1'),null)
  assert.equal(archivedSupervisorCandidate({...p,turns:p.turns.map((r,i)=>i===1?{...r,content:'forged'}:r)},'goal','review1'),null)
  assert.equal(archivedSupervisorCandidate(p,'next','review1'),null)
 }
})
test('archive report distinguishes exact client evidence from independent semantic assessment, no grades or transcript',()=>{
 const p=fixture(),c=archivedSupervisorCandidate(p,'goal','review1'),original=JSON.stringify(p)
 const report=archiveQualityProjection(p,[],false)
 assert.equal(report.reviewEnabled,false);assert.equal(report.semanticEligible,1);assert.equal(report.semanticReviewed,0);assert.equal(report.qualityScore,null)
 assert.equal(JSON.stringify(report).includes(p.turns[1].content),false)
 const answer={reviewId:'review1',fieldId:'goal',verdict:'MATCH',informationType:'goal',reasonCode:'sufficient',evidence:[{turnId:'t:1',quote:p.turns[1].content}]}
 const valid=validateSupervisorVerdict(prepareSupervisorCandidate(c.input),answer)
 assert.equal(archiveReviewStoredVerdict(c,valid).verdict,'MATCH')
 assert.equal(archiveReviewStoredVerdict(c,{...valid,binding:{...valid.binding,revision:9}}),null)
 assert.equal(archiveReviewStoredVerdict(c,{...valid,evidence:[{turnId:'t:1',quote:'forged'}]}),null)
 for(const bad of [{...valid,binding:null},{...valid,binding:{...valid.binding,unexpected:'x'}},{...valid,informationType:'invalid'},{...valid,reasonCode:'unrelated'},{...valid,clarificationIntent:'clarify_missing'},{...valid,evidence:[...valid.evidence,...valid.evidence]}])assert.equal(archiveReviewStoredVerdict(c,bad),null)
 const checked=archiveQualityProjection(p,[{fieldId:'goal',state:'reviewed',verdict:'MATCH'}],true)
 assert.equal(checked.semanticReviewed,1);assert.equal(checked.qualityScore,null)
 assert.equal(archiveQualityProjection(p,[{fieldId:'goal',state:'revoked'}],false).semanticReviewed,0)
 assert.equal(JSON.stringify(p),original)
})

import {liveSupervisorCandidate,liveSupervisorAdvisory} from '../lib/coaching/coach-live-supervisor-binding.mjs'
test('live advisory binds only current persisted typed candidate and rejects stale or changed drafts',()=>{
 const p=fixture(),q=p.turns[0].content,a=p.turns[1].content,e=p.turns[2].content
 const state={protocol:{...p,provenance:'client_autosaved_unreviewed_draft',turns:p.turns.slice(0,3)},revision:5,courseSessionId:p.courseSessionId,courseGate:{paused:false,prompt:{kind:'confirm',fieldId:'goal',questionId:'q:1',text:e,turnIndex:2},gate:{sessionId:id,courseSessionId:p.courseSessionId,pending:{phase:'awaiting_echo',fieldId:'goal',questionId:'q:1',deliveryId:'display:0',candidate:{sourceId:'t:1',quote:a}},history:[{type:'issue',fieldId:'goal',questionId:'q:1'},{type:'delivery',fieldId:'goal',questionId:'q:1',deliveryId:'display:0',final:true},{type:'answer',fieldId:'goal',questionId:'q:1',deliveryId:'display:0',turnId:'t:1',text:a,final:true}]}}}
 const c=liveSupervisorCandidate(state,'review1');assert.ok(c);assert.equal(c.revision,5);assert.equal(c.question,q)
 const v=validateSupervisorVerdict(prepareSupervisorCandidate(c),{reviewId:'review1',fieldId:'goal',verdict:'PARTIAL',informationType:'goal',reasonCode:'incomplete',evidence:[{turnId:'t:1',quote:a}]})
 assert.equal(liveSupervisorAdvisory(state,v).intent,'clarify_missing')
 assert.equal(liveSupervisorAdvisory({...state,revision:6},v),null)
 assert.equal(liveSupervisorCandidate({...state,protocol:{...state.protocol,turns:[...state.protocol.turns,{role:'user',content:'Да'}]}},'review1'),null)
 assert.equal(liveSupervisorCandidate({...state,courseGate:{...state.courseGate,paused:true}},'review1'),null)
 assert.equal(liveSupervisorAdvisory(state,{...v,evidence:[{turnId:'t:1',quote:'fabricated'}]}),null)
 for(const bad of [{...v,binding:{reviewId:'review1'}},{...v,binding:{...v.binding,unexpected:'x'}},{...v,version:'unknown'},{...v,informationType:'invalid'},{...v,reasonCode:'sufficient'},{...v,clarificationIntent:'confirm_literal'},{...v,evidence:[...v.evidence,...v.evidence]}])assert.equal(liveSupervisorAdvisory(state,bad),null)
})


test('archive and live binding reject same-revision changes to the finalized candidate fingerprint',()=>{
 const p=fixture(),c=archivedSupervisorCandidate(p,'goal','review1')
 assert.ok(c)
 const reviewed=validateSupervisorVerdict(prepareSupervisorCandidate(c.input),{reviewId:'review1',fieldId:'goal',verdict:'MATCH',informationType:'goal',reasonCode:'sufficient',evidence:[{turnId:'t:1',quote:c.input.quote}]})
 assert.ok(reviewed);assert.match(reviewed.binding.candidateFingerprint,/^[a-f0-9]{64}$/)
 assert.equal(archiveReviewStoredVerdict(c,reviewed).verdict,'MATCH')
 for(const input of [{...c.input,quote:c.input.quote+' — later'},{...c.input,question:c.input.question+'?'},{...c.input,scenario:{courseSessionId:'clarity_day_3',version:'hh-clarity-day-three-goal-v1'}}])assert.equal(archiveReviewStoredVerdict({...c,input},reviewed),null)
 const {candidateFingerprint,...legacyBinding}=reviewed.binding
 assert.ok(candidateFingerprint)
 assert.equal(archiveReviewStoredVerdict(c,{...reviewed,binding:legacyBinding}),null)
})
