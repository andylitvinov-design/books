import test from 'node:test'
import assert from 'node:assert/strict'
import {getAssessmentDefinition,provenance} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {personalCourseObjective,createPersonalCoursePlan} from '../lib/inner-growth/course-personal-plan-v2.js'
import {personalCourseProfileV2} from '../lib/inner-growth/course-personal-profile-v2.js'
const ownerId='synthetic-profile-owner',now='2026-10-12T12:00:00Z'
function fixture(locale='en',instrumentLocale=locale){
 const def=getAssessmentDefinition('hh-weekly-pulse','v1',instrumentLocale)
 const result={id:'synthetic-result',accountId:ownerId,status:'completed',measurementAt:now,...structuredClone(scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,0]))))}
 result.interpretations={[locale]:{status:'available',origin:'database',identity:provenance(def),uiLocale:locale,interpretationVersion:'2026-10-12.v2',payloadHash:'sha256:'+'c'.repeat(64),sections:result.dimensions.map(d=>({...d,compact:{meaning:'Prepared synthetic '+d.key},source:{title:'Synthetic source'}}))}}
 const refs=days=>days.flatMap(day=>['standard','short'].map(variant=>({objectiveId:personalCourseObjective(day).id,contentLocale:locale,variant,reviewStatus:'reviewed',minimumEntry:true,intensity:'gentle',practiceId:`synthetic/${day}/${variant}`,contentVersion:'synthetic-v1',skillId:'synthetic-skill',durationMinutes:variant==='short'?2:5})))
 const practiceDays=Array.from({length:21},(_,i)=>i+1).filter(day=>day%7!==0)
 const mappings=[['weekly.tension','calm_regulation'],['weekly.clarity','attention_clarity'],['weekly.mood','emotional_flexibility']].map(([dimensionKey,topicId])=>({identity:{...provenance(def),dimensionKey},mappingVersion:'synthetic-map-'+dimensionKey,status:'reviewed',source:'synthetic mapping source',limitations:'Synthetic editorial fixture only',topicId,curriculumVersion:personalCourseObjective(1).curriculumVersion,practices:refs(practiceDays)}))
 return {ownerId,now,locale,selection:{confirmed:true,selected:[{definitionId:def.id,definitionKey:def.key,identity:provenance(def)}]},results:[result],registry:{status:'reviewed',mappings,reviewMapping:{mappingVersion:'synthetic-review',status:'reviewed',source:'synthetic review source',curriculumVersion:personalCourseObjective(7).curriculumVersion,coversAllSelectedGoals:true,practices:refs([7,14,21])}}}
}
test('all exact scales remain visible; only complete reviewed mappings are selectable in EN/RU',()=>{
 for(const locale of ['en','ru'])for(const instrumentLocale of ['en','ru']){
  const input=fixture(locale,instrumentLocale),before=structuredClone(input),profile=personalCourseProfileV2(input)
  assert.equal(profile.rows.length,8);assert.equal(profile.availablePracticeCount,3);assert.equal(profile.unsupportedCount,5)
  assert.equal(profile.minimumChoices,3);assert.equal(profile.status,'ready-to-review')
  assert.ok(profile.rows.filter(row=>row.canChoosePractice).every(row=>row.practiceReason===null))
  assert.ok(profile.rows.every(row=>row.identity.instrumentLocale===instrumentLocale&&row.meaning))
  assert.ok(profile.rows.filter(row=>!row.canChoosePractice).every(row=>row.practiceReason==='mapping-unavailable'))
  assert.deepEqual(input,before)
 }
})
test('suggestions follow explicit focus then distinct topics, never raw values or severity',()=>{
 const input=fixture();input.focusTopicIds=['attention_clarity']
 const before=personalCourseProfileV2(input)
 assert.match(before.priorityScaleIds[0],/weekly.clarity$/)
 for(const d of input.results[0].dimensions)d.value=10
 for(const section of input.results[0].interpretations.en.sections)section.value=10
 const after=personalCourseProfileV2(input)
 assert.deepEqual(after.priorityScaleIds,before.priorityScaleIds)
 assert.equal(after.priorityBasis,'confirmed-focus-then-distinct-topics-not-severity')
 assert.ok(after.rows.every(row=>!row.automaticDeficit&&!row.clinicalSeverityComparison))
})
test('draft or missing registry remains information-only, with prepared meaning intact',()=>{
 for(const registry of [null,{status:'draft',mappings:fixture().registry.mappings}]){
  const profile=personalCourseProfileV2({...fixture(),registry})
  assert.equal(profile.status,'no-practice-mapping');assert.equal(profile.availablePracticeCount,0)
  assert.equal(profile.rows.length,8);assert.ok(profile.rows.every(row=>row.meaning))
 }
})
test('missing short day or review material cannot be offered as a complete selectable course',()=>{
 const input=fixture();input.registry.mappings[0].practices=input.registry.mappings[0].practices.filter(p=>p.objectiveId!==personalCourseObjective(20).id||p.variant!=='short')
 assert.equal(personalCourseProfileV2(input).availablePracticeCount,2)
 input.registry.reviewMapping.practices=input.registry.reviewMapping.practices.filter(p=>p.objectiveId!==personalCourseObjective(14).id)
 const profile=personalCourseProfileV2(input);assert.equal(profile.availablePracticeCount,0)
 assert.ok(profile.rows.filter(row=>row.mappingVersion).every(row=>row.practiceReason==='review-material-unavailable'))
})
test('missing report and missing result keep distinct statuses without zero-filled rows',()=>{
 const noReport=fixture();delete noReport.results[0].interpretations
 assert.equal(personalCourseProfileV2(noReport).status,'interpretations-unavailable')
 assert.ok(personalCourseProfileV2(noReport).rows.every(row=>row.meaning===null&&!row.canChoosePractice))
 const missing=personalCourseProfileV2({...fixture(),results:[]})
 assert.equal(missing.status,'tests-remaining');assert.deepEqual(missing.rows,[])
})
test('source metadata, report identity and mapping limitations remain visible independently',()=>{
 const profile=personalCourseProfileV2(fixture()),row=profile.rows.find(r=>r.canChoosePractice)
 assert.deepEqual(row.source,{title:'Synthetic source'})
 assert.equal(row.interpretationContentHash,'c'.repeat(64));assert.match(row.identity.contentHash,/^sha256:/)
 assert.equal(row.mappingLimitations,'Synthetic editorial fixture only');assert.equal(profile.healthPercentage,null)
})
test('unknown/duplicate focus names are rejected rather than guessed',()=>{
 for(const focusTopicIds of [['invented'],['calm_regulation','calm_regulation']])assert.throws(()=>personalCourseProfileV2({...fixture(),focusTopicIds}),/INVALID_FOCUS_TOPICS/)
})

test('omitted display locale consistently uses the evidence adapter English default',()=>{
 const input=fixture();delete input.locale
 assert.equal(personalCourseProfileV2(input).availablePracticeCount,3)
})

test('ambiguous duplicate practice references cannot masquerade as a fully supported choice',()=>{
 const input=fixture();input.registry.mappings[0].practices.push(structuredClone(input.registry.mappings[0].practices[0]))
 assert.equal(personalCourseProfileV2(input).availablePracticeCount,2)
 input.registry.reviewMapping.practices.push(structuredClone(input.registry.reviewMapping.practices[0]))
 assert.equal(personalCourseProfileV2(input).availablePracticeCount,0)
})


test('profile minimum and planner accept all selectable goals when another mapping lacks short content',()=>{
 const input=fixture();input.registry.mappings[0].practices=input.registry.mappings[0].practices.filter(p=>p.objectiveId!==personalCourseObjective(20).id||p.variant!=='short')
 const profile=personalCourseProfileV2(input), selectedScaleIds=profile.rows.filter(row=>row.canChoosePractice).map(row=>row.id)
 assert.equal(profile.minimumChoices,2)
 const plan=createPersonalCoursePlan({scales:profile.evidence.scales,mappings:input.registry.mappings,reviewMapping:input.registry.reviewMapping,selectedScaleIds,consent:true,uiLocale:'en'})
 assert.equal(plan.status,'ready');assert.equal(plan.selectedScales.length,2)
})
