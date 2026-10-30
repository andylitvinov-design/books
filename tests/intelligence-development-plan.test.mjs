import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { DEFAULT_DEVELOPMENT_TARGETS } from '../lib/profile/development-program.js'
import { projectDevelopmentCourse } from '../lib/holistic-support/intelligence-development-plan.js'
import { planIntelligenceRequest } from '../lib/holistic-support/intelligence-plan.mjs'

const owner='10000000-0000-4000-8000-000000000001', other='10000000-0000-4000-8000-000000000002'
const now=Date.parse('2026-10-29T00:00:00Z')
const def=getAssessmentDefinition('hh-weekly-pulse','v1','en')
const sample=(accountId=owner,measurementAt='2026-10-25T00:00:00Z',id='synthetic')=>({
  ...scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,q.max??def.answerScale.max]))), accountId,measurementAt,id,
})
const goals={revision:1,goals:{version:1,targets:{...DEFAULT_DEVELOPMENT_TARGETS,body:95,work:95,growth:95},details:{}}}
const project=(results,snapshot=goals)=>projectDevelopmentCourse({results,accountId:owner,snapshot,now})

test('only owner-verified fresh source and saved goals can yield a published course',()=>{
  const output=project([sample()])
  assert.deepEqual(output,{courseId:'stress'})
  assert.doesNotMatch(JSON.stringify(output),/synthetic|accountId|dimensions|score|95/)
  assert.deepEqual(project([sample(other)]),{courseId:null})
  assert.deepEqual(project([sample()],{...goals,revision:0}),{courseId:null})
  assert.deepEqual(project([sample(owner,'2026-01-01T00:00:00Z')]),{courseId:null})
  assert.deepEqual(project([sample(owner,'2999-01-01T00:00:00Z')]),{courseId:null})
})

test('a corrupted latest source does not revive an older result',()=>{
  const old=sample(owner,'2026-10-25T00:00:00Z','older')
  const corrupt={...sample(owner,'2026-10-26T00:00:00Z','newer'),contentHash:'sha256:tampered'}
  assert.deepEqual(project([old,corrupt]),{courseId:null})
})

test('goal and result analysis occurs only on the explicit private choice after safety preflight',async()=>{
  const body={requestId:'d4502108-a8b8-4d3b-813f-c255b452bde4',surface:'cabinet',
    intent:{language:'en',selectedTopics:['goals'],formats:['course']},
    preflight:{immediateDanger:'no',selfHarmThoughts:'no'}}
  let reads=0
  const loadDevelopmentPlan=async()=>{reads++;return {courseId:'stress'}}
  await planIntelligenceRequest(body,{loadDevelopmentPlan})
  assert.equal(reads,0)
  const chosen={...body,courseSelection:'development_plan'}
  await planIntelligenceRequest({...chosen,preflight:{...body.preflight,selfHarmThoughts:'yes'}},{loadDevelopmentPlan})
  assert.equal(reads,0)
  await assert.rejects(planIntelligenceRequest({...chosen,surface:'meditation'},{loadDevelopmentPlan}),/INVALID_INTELLIGENCE_REQUEST/)
  const result=await planIntelligenceRequest(chosen,{loadDevelopmentPlan})
  assert.equal(reads,1)
  assert.equal(result.status,'recommend')
  assert.equal(result.primary.href,'/en/app/course?program=stress')
  assert.equal(result.primary.requiresUserConfirmation,true)
  assert.doesNotMatch(JSON.stringify(result),/accountId|dimensions|resultId|score|95/)
  assert.equal((await planIntelligenceRequest(chosen,{loadDevelopmentPlan:async()=>({courseId:null})})).status,'no_match')
  assert.equal((await planIntelligenceRequest(chosen,{loadDevelopmentPlan:async()=>({courseId:'unapproved'})})).status,'unavailable')
})
