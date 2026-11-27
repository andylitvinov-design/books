import test from 'node:test'
import assert from 'node:assert/strict'
import {prepareSupervisorCandidate,validateSupervisorVerdict,reviewCoachCandidate,supervisorFieldCriterion,supervisorDirectorDisposition} from '../lib/coaching/coach-supervisor.mjs'
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

const scoped=(courseSessionId,version,mode,fieldId)=>({...input,scenario:{courseSessionId,version},mode,fieldId})
test('version-bound coaching and therapy criteria fail closed for wrong session, version, mode or control field',()=>{
 const cases=[
 ['clarity_day_1','hh-clarity-day-one-v5','coaching',['impact','priority','outer_body_health','outer_meaning_purpose'],['episode','balance_consent','balance_review']],
 ['clarity_day_2','hh-clarity-day-two-support-v1','coaching',['episode','test_status','test_observation','optional_scale_before','inner_self-realization','development_focus','development_reason'],['goal','practice_consent','outer_body_health']],
 ['clarity_day_3','hh-clarity-day-three-goal-v1','coaching',['goal','controllable_scope','dream_image','if_then','confidence'],['episode','goal_status','separate_plan_consent']],
 ['anti_stress_ground','hh-anti-stress-v2-s1','therapy',['resource_images','resource_selected','resource_details','resource_phrase','stress_before'],['goal','meditation_consent','practice_consent','calm_variant']],
 ['anti_stress_calm','hh-anti-stress-v2-s2','therapy',['calm_signal','calm_steps','calm_fallback','meditation_feedback','stress_after'],['resource_images','practice_status','goal']],
 ['anti_stress_resource','hh-anti-stress-v2-s3','therapy',['available_resources','resource_plan','low_energy_option','support_threshold','skill_confidence'],['resource_details','meditation_consent','goal']]
 ]
 for(const [id,version,mode,valid,invalid] of cases){
  for(const field of valid){
   const i=scoped(id,version,mode,field),p=prepareSupervisorCandidate(i)
   assert.ok(p, id+':'+field)
   assert.equal(p.binding.courseSessionId,id);assert.equal(p.binding.scenarioVersion,version);assert.equal(p.binding.mode,mode)
   assert.ok(!Object.hasOwn(p.payload,'courseSessionId')&&!Object.hasOwn(p.payload,'scenarioVersion'))
   assert.equal(prepareSupervisorCandidate({...i,scenario:{courseSessionId:id,version:version+'-unknown'}}),null)
   assert.equal(prepareSupervisorCandidate({...i,mode:mode==='coaching'?'therapy':'coaching'}),null)
  }
  for(const field of invalid)assert.equal(prepareSupervisorCandidate(scoped(id,version,mode,field)),null)
 }
 assert.equal(prepareSupervisorCandidate({...input,mode:'therapy'}),null)
 for(const scenario of [null,{},[],{courseSessionId:'__proto__',version:'x'},{courseSessionId:'clarity_day_1',version:'hh-clarity-day-one-v5',extra:true}])assert.equal(prepareSupervisorCandidate({...input,scenario}),null)
 assert.match(supervisorFieldCriterion('outer_finance',{courseSessionId:'clarity_day_1',version:'hh-clarity-day-one-v5'}),/current 0–10/)
 assert.match(supervisorFieldCriterion('inner_love',{courseSessionId:'clarity_day_2',version:'hh-clarity-day-two-support-v1'}),/current and desired/)
 assert.match(supervisorFieldCriterion('resource_images',{courseSessionId:'anti_stress_ground',version:'hh-anti-stress-v2-s1'},'therapy'),/no invented image/)
})
test('Director receives one localized clarification only for an exact validated current candidate; never a save or advance',()=>{
 for(const locale of ['en','ru','es']){
  const i={...scoped('clarity_day_3','hh-clarity-day-three-goal-v1','coaching','goal'),locale,context:[{turnId:'t2',quote:'I want to close the studio',reviewed:true}]}
  const p=prepareSupervisorCandidate(i)
  for(const [verdict,reasonCode] of [['MATCH','sufficient'],['PARTIAL','incomplete'],['MISMATCH','unrelated'],['AMBIGUOUS','uncertain_meaning'],['CONTRADICTION','conflicting_source']]){
   const raw={...answer,verdict,reasonCode,evidence:[...answer.evidence,...(verdict==='CONTRADICTION'?[{turnId:'t2',quote:'close the studio'}]:[])]}
   const reviewed=validateSupervisorVerdict(p,raw),d=supervisorDirectorDisposition(i,reviewed)
   assert.equal(d.maySave,false);assert.equal(d.mayAdvance,false)
   assert.equal(d.kind,verdict==='MATCH'?'relevant_needs_existing_confirmation_gate':'clarify_same_field')
   assert.equal(typeof d.clarification,verdict==='MATCH'?'object':'string')
   for(const changed of [{...i,revision:i.revision+1},{...i,turnId:'other'},{...i,quote:'another answer'},{...i,quote:i.quote+', но не сейчас'},{...i,question:i.question+' другое уточнение'},{...i,context:[{turnId:'t2',quote:'I want to close the studio later',reviewed:true}]},{...i,scenario:{courseSessionId:'clarity_day_2',version:'hh-clarity-day-two-support-v1'}}])assert.equal(supervisorDirectorDisposition(changed,reviewed).kind,'unverified')
  }
  assert.equal(supervisorDirectorDisposition(i,{...validateSupervisorVerdict(p,answer),evidence:[{turnId:'t1',quote:'invented'}]}).kind,'unverified')
  assert.equal(supervisorDirectorDisposition(i,{status:'unavailable'}).kind,'unverified')
 }
})
