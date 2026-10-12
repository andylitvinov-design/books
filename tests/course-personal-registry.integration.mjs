import test from 'node:test'
import assert from 'node:assert/strict'
import {PERSONAL_COURSE_REGISTRY_VERSION,PERSONAL_COURSE_MATERIAL_DIGEST,personalCourseRegistryReviewSummary,reviewedPersonalCourseRegistry,getReviewedPersonalCourseRegistry} from '../lib/app/course-personal-registry.js'
import {getAssessmentDefinition,provenance} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {previewPersonalR3Course21,activatePersonalR3Course21,personalRuntimeFromState} from '../lib/inner-growth/course-personal-r3-bridge-v2.js'
import {createPersonalCourseRuntimeAdapter} from '../lib/inner-growth/course-personal-runtime-v2.js'
import {PERSONAL_COURSE_PILOT_DRAFT_BUNDLE} from '../data/inner-growth/course-personal-practices-v2.js'
const receipt={clinicalValidation:false,psychometricValidation:false,efficacyClaim:false,status:'reviewed-original-educational',registryVersion:PERSONAL_COURSE_REGISTRY_VERSION,materialDigest:PERSONAL_COURSE_MATERIAL_DIGEST,reviewId:'SYNTHETIC TEST ONLY',source:'SYNTHETIC TEST ONLY — no production approval',reviewedAt:'2026-10-12T12:00:00Z'}
const ownerId='synthetic-owner',now='2026-10-12T12:00:00Z',keys=['hh-weekly-pulse','hh-resource-pulse']
function source(locale,instrumentLocale){
 const definitions=keys.map(key=>getAssessmentDefinition(key,'v1',instrumentLocale))
 const results=definitions.map(def=>{
  const result={id:'synthetic-'+def.id,accountId:ownerId,status:'completed',measurementAt:now,...structuredClone(scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,q.min??def.answerScale.min]))))}
  result.interpretations=Object.fromEntries(['en','ru'].map(lang=>[lang,{status:'available',origin:'database',identity:provenance(def),uiLocale:lang,interpretationVersion:'2026-10-12.v2',payloadHash:'sha256:'+'a'.repeat(64),sections:result.dimensions.map(d=>({...d,source:{title:'Synthetic report source'},compact:{meaning:'Synthetic prepared meaning '+d.key}}))}]))
  return result
 })
 return {ownerId,course:{id:'synthetic-course',accountId:ownerId,stage:3,revision:1,testKeys:keys,focusTags:['attention']},planDefinitionIds:definitions.map(def=>def.id),results,locale,now}
}
test('missing or mismatched editorial receipt cannot promote the original drafts',()=>{
 assert.equal(getReviewedPersonalCourseRegistry().editorialReview.materialDigest,PERSONAL_COURSE_MATERIAL_DIGEST)
 assert.equal(getReviewedPersonalCourseRegistry().editorialReview.clinicalValidation,false)
 for(const approval of [null,{...receipt,clinicalValidation:true},{...receipt,psychometricValidation:true},{...receipt,efficacyClaim:true},{...receipt,status:'reviewed'},{...receipt,materialDigest:'a'.repeat(64)},{...receipt,registryVersion:'other'},{...receipt,source:''}])assert.equal(reviewedPersonalCourseRegistry(approval),null)
 const registry=reviewedPersonalCourseRegistry(receipt)
 assert.ok(registry);assert.equal(PERSONAL_COURSE_PILOT_DRAFT_BUNDLE.status,'draft')
 assert.deepEqual(personalCourseRegistryReviewSummary(),{version:PERSONAL_COURSE_REGISTRY_VERSION,contentVersion:registry.contentVersion,materialDigest:PERSONAL_COURSE_MATERIAL_DIGEST,exactFormCount:4,constructCount:14,mappingCount:28,cardCount:672,definitionKeys:keys,aggregateGoalIncluded:false,clinicalValidation:false,professionalCatalogCoverage:false})
})
test('all fourteen constructs support exact complete routes across form/UI languages and two loads',()=>{
 const registry=reviewedPersonalCourseRegistry(receipt),adapter=createPersonalCourseRuntimeAdapter(registry)
 for(const locale of ['en','ru'])for(const instrumentLocale of ['en','ru']){
  const input=source(locale,instrumentLocale),p=previewPersonalR3Course21({...input,registry})
  assert.equal(p.profile.rows.length,15);assert.equal(p.profile.availablePracticeCount,14)
  const aggregate=p.profile.rows.find(row=>row.dimensionKey==='resources.overall')
  assert.equal(aggregate.canChoosePractice,false);assert.equal(aggregate.practiceReason,'aggregate-profile-only-not-a-separate-goal');assert.ok(aggregate.meaning)
  const available=p.profile.rows.filter(row=>row.canChoosePractice)
  for(const row of available)for(const loadMinutes of [2,5]){
   const selected=[row,...available.filter(other=>other.id!==row.id).slice(0,2)]
   const active=activatePersonalR3Course21({preview:p,registry,ownerId,expectedCourseRevision:1,selectedR3ScaleKeys:selected.map(item=>item.r3ScaleKey),consent:true,consentVersion:p.consentVersion,timeZone:'UTC',id:'synthetic-id',now,loadMinutes})
   let runtime=personalRuntimeFromState(active)
   assert.equal(runtime.plan.slots.length,21);assert.ok(runtime.plan.slots.every(slot=>slot.status==='ready'))
   runtime=adapter.checkIn(runtime,{day:1,skip:true,now,expectedRevision:0})
   const today=adapter.dailyLesson(runtime,{now,uiLocale:locale,targetScaleId:row.id})
   assert.equal(today.status,'ready',row.dimensionKey);assert.equal(today.lesson.selectedIdentity.dimensionKey,row.dimensionKey)
   assert.equal(today.lesson.contentLocale,locale);assert.equal(today.lesson.clinicalValidation,false)
  }
 }
})
