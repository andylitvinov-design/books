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
 const checked=archiveQualityProjection(p,[{fieldId:'goal',state:'reviewed',verdict:'MATCH'}],true)
 assert.equal(checked.semanticReviewed,1);assert.equal(checked.qualityScore,null)
 assert.equal(archiveQualityProjection(p,[{fieldId:'goal',state:'revoked'}],false).semanticReviewed,0)
 assert.equal(JSON.stringify(p),original)
})
