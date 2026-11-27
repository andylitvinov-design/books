import test from 'node:test'
import assert from 'node:assert/strict'
import {prepareSupervisorCandidate,validateSupervisorVerdict,reviewCoachCandidate,supervisorFieldCriterion} from '../lib/coaching/coach-supervisor.mjs'
import {coachQualityRubric,evaluateCoachQualityRubric} from '../lib/personal-coaching/coach-quality-rubric.mjs'
const input={reviewId:'r1',sessionId:'private-session',questionId:'q1',candidateId:'c1',turnId:'t1',revision:2,locale:'ru',mode:'coaching',fieldId:'goal',question:'Какого результата вы хотите достичь?',quote:'Я хочу открыть студию',final:true,role:'user',context:[]}
const answer={reviewId:'r1',fieldId:'goal',verdict:'MATCH',informationType:'goal',reasonCode:'sufficient',evidence:[{turnId:'t1',quote:'открыть студию'}]}
test('supervisor binds exact candidate and minimizes data; never creates facts or grants progress',()=>{
 const p=prepareSupervisorCandidate(input)
 assert.ok(p);assert.equal(JSON.stringify(p.payload).includes(input.sessionId),false)
 assert.equal(validateSupervisorVerdict(p,answer).authority,'advisory_only')
 for(const v of [{...answer,fieldId:'next'},{...answer,reviewId:'stale'},{...answer,evidence:[{turnId:'t1',quote:'invented'}]},{...answer,save:true},{...answer,verdict:'CONTRADICTION',reasonCode:'conflicting_source'}])assert.equal(validateSupervisorVerdict(p,v),null)
 for(const i of [{...input,final:false},{...input,role:'assistant'},{...input,fieldId:'unknown'},{...input,context:[{turnId:'t2',quote:'not reviewed',reviewed:false}]},{...input,quote:'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ'}])assert.equal(prepareSupervisorCandidate(i),null)
 for(const field of ['goal','feelings','needs','resource_observation','controls_metrics'])assert.ok(supervisorFieldCriterion(field))
})
test('supervisor verdict handles separate semantic types across three locales and grounded contradictions',()=>{
 for(const [locale,quote] of [['en','I feel anxious'],['ru','Я чувствую тревогу'],['es','Me siento ansioso']]){
  const p=prepareSupervisorCandidate({...input,locale,quote})
  const r=validateSupervisorVerdict(p,{...answer,verdict:'MISMATCH',reasonCode:'wrong_information_type',informationType:'emotion',evidence:[{turnId:'t1',quote}]})
  assert.equal(r.clarificationIntent,'return_to_field')
 }
 const p=prepareSupervisorCandidate({...input,context:[{turnId:'t2',quote:'Я хочу закрыть студию',reviewed:true}]})
 assert.ok(validateSupervisorVerdict(p,{...answer,verdict:'CONTRADICTION',reasonCode:'conflicting_source',evidence:[...answer.evidence,{turnId:'t2',quote:'закрыть студию'}]}))
})
test('separate reviewer fails closed without consent, reservation, current revision or valid output',async()=>{
 let calls=0,checks=0
 const invoke=async()=>{calls++;return answer}
 const allow={authorize:async()=>true,reserve:async()=>true,invoke}
 assert.equal((await reviewCoachCandidate(input)).verdict,'UNAVAILABLE')
 assert.equal((await reviewCoachCandidate(input,{...allow,authorize:async()=>false})).reason,'not_authorized')
 assert.equal((await reviewCoachCandidate(input,{...allow,reserve:async()=>false})).reason,'lease_unavailable')
 assert.equal(calls,0)
 assert.equal((await reviewCoachCandidate(input,allow)).status,'reviewed')
 assert.equal(calls,1)
 assert.equal((await reviewCoachCandidate(input,{...allow,authorize:async()=>++checks<3})).reason,'stale_or_revoked')
 assert.equal((await reviewCoachCandidate(input,{...allow,invoke:async()=>({...answer,fieldId:'next'})})).reason,'invalid_review')
 assert.equal((await reviewCoachCandidate(input,{...allow,timeoutMs:2,invoke:()=>new Promise(()=>{})})).reason,'review_unavailable')
})
test('distinct rubrics withhold score without independent evidence, coverage and safety/privacy pass',()=>{
 const turns=[{role:'assistant',content:'How do you feel?'},{role:'user',content:'Calm'}]
 for(const mode of ['coaching','therapy']){
  const rubric=coachQualityRubric(mode)
  assert.equal(rubric.criteria.reduce((s,c)=>s+c.weight,0),100)
  const ratings=rubric.criteria.map(c=>({id:c.id,score:90,evidence:[{turnIndex:0,quote:'How do you feel?'}]}))
  assert.equal(evaluateCoachQualityRubric({mode,turns,ratings}).overallScore,null)
  assert.equal(evaluateCoachQualityRubric({mode,turns,ratings,safety:'passed',privacy:'passed'}).overallScore,90)
  assert.equal(evaluateCoachQualityRubric({mode,turns,ratings:ratings.slice(0,1),safety:'passed',privacy:'passed'}).overallScore,null)
  assert.equal(evaluateCoachQualityRubric({mode,turns,ratings,safety:'failed',privacy:'passed'}).overallScore,null)
  assert.equal(evaluateCoachQualityRubric({mode,turns,ratings:ratings.map(r=>({...r,evidence:[{turnIndex:0,quote:'invented'}]})),safety:'passed',privacy:'passed'}).coverage,0)
 }
 assert.equal(coachQualityRubric('unknown'),null)
})
