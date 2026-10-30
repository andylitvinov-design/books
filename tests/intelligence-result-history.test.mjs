import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { projectVerifiedCompletedTestKeys } from '../lib/holistic-support/intelligence-result-history.js'

const owner='10000000-0000-4000-8000-000000000001', other='10000000-0000-4000-8000-000000000002'
const def=getAssessmentDefinition('hh-resource-pulse','v1','en')
const result=(accountId,measurementAt,id)=>({
  ...scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,q.min??def.answerScale.min]))),
  accountId,measurementAt,id,
})
test('only this owner’s verified current completed instruments are projected',()=>{
  const own=result(owner,'2026-01-01T00:00:00Z','own-private-result')
  const foreign=result(other,'2026-01-02T00:00:00Z','foreign-private-result')
  const projection=projectVerifiedCompletedTestKeys({results:[own,foreign],accountId:owner,now:Date.parse('2026-02-01')})
  assert.deepEqual(projection,{completedKeys:['hh-resource-pulse']})
  assert.doesNotMatch(JSON.stringify(projection),/private-result|dimensions|accountId/)
  assert.deepEqual(projectVerifiedCompletedTestKeys({results:[foreign],accountId:owner,now:Date.parse('2026-02-01')}),{completedKeys:[]})
})
test('a corrupt latest result cannot promote an older result and future records are ignored',()=>{
  const old=result(owner,'2026-01-01T00:00:00Z','old')
  const corrupt={...result(owner,'2026-01-02T00:00:00Z','corrupt'),contentHash:'sha256:tampered'}
  const future=result(owner,'2999-01-01T00:00:00Z','future')
  assert.deepEqual(projectVerifiedCompletedTestKeys({results:[old,corrupt,future],accountId:owner,now:Date.parse('2026-02-01')}),{completedKeys:[]})
  assert.throws(()=>projectVerifiedCompletedTestKeys({results:null,accountId:owner}),/INVALID_RESULT_HISTORY/)
})
