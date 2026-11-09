import test from 'node:test'
import assert from 'node:assert/strict'
import {buildCoachingReportV2Draft,validateCoachingReportV2} from '../lib/personal-coaching/report-v2.js'
import {reviewCoachingReportDraft} from '../lib/personal-coaching/report-review.mjs'

const now='2026-11-09T20:00:00.000Z'
const make=()=>buildCoachingReportV2Draft({session:{id:'session-1',status:'completed',answers:{goal:'Rest more',action:'Take a short walk'},reflections:{}},questions:[{id:'goal',stepKey:'goal'},{id:'action',stepKey:'action'}],sourceRevision:7})

test('explicit client review binds an acceptance to the existing evidence and server timestamp',()=>{
 const draft=make(),candidate=draft.actionCandidates[0]
 const reviewed=reviewCoachingReportDraft(draft,[{candidateId:candidate.candidateId,status:'accepted'}],now)
 assert.equal(reviewed.status,'reviewed')
 assert.equal(reviewed.review.confirmedAt,now)
 assert.equal(reviewed.actionCandidates[0].acceptedAt,now)
 assert.equal(reviewed.actionCandidates[0].text,candidate.text)
 assert.ok(reviewed.evidence.some(e=>e.kind==='client_action_acceptance'&&e.value===candidate.text&&e.capturedAt===now))
 assert.equal(validateCoachingReportV2(reviewed).valid,true)
 assert.equal(draft.status,'draft')
})
test('review rejects missing, invented, duplicate or modified action decisions',()=>{
 const draft=make(),id=draft.actionCandidates[0].candidateId
 for(const choices of [[],[{candidateId:'invented',status:'accepted'}],[{candidateId:id,status:'draft'}],[{candidateId:id,status:'accepted',text:'fabricated'}],[{candidateId:id,status:'accepted'},{candidateId:id,status:'declined'}]])
  assert.throws(()=>reviewCoachingReportDraft(draft,choices,now),/COACHING_REPORT_REVIEW_INVALID/)
})
test('decline and defer never generate acceptance, and reflection-only may be reviewed without actions',()=>{
 for(const status of ['deferred','declined']){
  const draft=make(),reviewed=reviewCoachingReportDraft(draft,[{candidateId:draft.actionCandidates[0].candidateId,status}],now)
  assert.equal(reviewed.actionCandidates[0].status,status)
  assert.equal(reviewed.actionCandidates[0].acceptedAt,null)
  assert.equal(reviewed.evidence.some(e=>e.kind==='client_action_acceptance'),false)
 }
 const reflection=make();reflection.actionCandidates=[];reflection.sections.actionPlan.candidateIds=[];reflection.sections.actionPlan.status='not_captured';reflection.sections.actionPlan.text=null;reflection.sections.actionPlan.evidenceIds=[]
 assert.equal(reviewCoachingReportDraft(reflection,[],now).review.status,'confirmed')
})
