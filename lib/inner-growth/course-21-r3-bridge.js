// Pure activation proposal. Inputs are server-owned R3/plan/result snapshots,
// never trusted client JSON. The repository must re-read them under an owner lock.
import {getDefinitionById,provenance} from '../assessments/definitions.js'
import {MONITORING_CATALOG} from '../../data/assessments/catalog.js'
import {courseProfile,chooseCourseScales} from './course-21-evidence.js'
import {courseInterpretationFromResult} from './course-interpretation-adapter.js'
import {createCourseJourney} from './course-progression-21.js'
import {COURSE_CONTENT_21_VERSION} from './lesson-library-21.js'

export const COURSE_21_CONSENT_VERSION='hh-course-21-consent-v1'
const fail=code=>{throw new Error(code)}
const uniqueStrings=a=>Array.isArray(a)&&a.every(v=>typeof v==='string')&&new Set(a).size===a.length
const runnable=new Set(MONITORING_CATALOG.filter(t=>t.startable&&t.rightsStatus==='cleared'&&t.free!==false).map(t=>t.key))
export function previewR3Course21({ownerId,course,planDefinitionIds,results=[],locale='en',now}={}){
 if(!ownerId||course?.accountId!==ownerId||typeof course.id!=='string'||!course.id)fail('COURSE_OWNER_REQUIRED')
 if(course.stage!==3)fail('NEW_R3_PROFILE_REQUIRED') // no hidden migration of active14-day programmes
 if(!Number.isInteger(course.revision)||course.revision<0)fail('INVALID_SOURCE_REVISION')
 if(!uniqueStrings(course.testKeys)||!course.testKeys.length||course.testKeys.length>12||course.testKeys.some(k=>!runnable.has(k)))fail('INVALID_R3_TEST_SELECTION')
 if(!uniqueStrings(planDefinitionIds))fail('EXACT_PLAN_FORMS_REQUIRED')
 const definitions=planDefinitionIds.map(id=>getDefinitionById(id))
 const selected=course.testKeys.map(key=>{
  const matches=definitions.filter(d=>d.key===key)
  if(matches.length!==1)fail(matches.length?'EXACT_FORM_SELECTION_REQUIRED':'SELECTED_TEST_NOT_IN_PLAN')
  return {definitionId:matches[0].id,definitionKey:key,identity:provenance(matches[0])}
 })
 const profile=courseProfile({selection:{confirmed:true,selected},ownerId,results,locale,now,interpretationFor:courseInterpretationFromResult})
 const rows=profile.rows.map(r=>({...r,r3ScaleKey:r.definitionKey+'::'+r.dimensionKey}))
 const bindings=[...new Set(rows.map(r=>r.resultId))].map(id=>{
  const result=results.find(r=>r.id===id&&r.accountId===ownerId),report=courseInterpretationFromResult(result,locale)
  const interpretations=Object.fromEntries(['en','ru'].flatMap(lang=>{
   const attached=courseInterpretationFromResult(result,lang)
   return attached?[[lang,{revision:attached.revision,contentHash:attached.contentHash}]]:[]
  }))
  return {resultId:id,identity:result?provenance(getDefinitionById(result.definitionId)):null,
   interpretationVersion:report?.revision??null,payloadHash:report?.contentHash??null,interpretations}
 })
 return {status:profile.status,profile:{...profile,rows},source:{accountId:ownerId,courseId:course.id,
  courseRevision:course.revision,selectedForms:selected,bindings},durationDays:21,
  requiresNewConsent:true,consentVersion:COURSE_21_CONSENT_VERSION,
  preservedLegacyProgramme:true,createsAnotherTestPlan:false}
}
export function activateR3Course21({preview,ownerId,expectedCourseRevision,selectedR3ScaleKeys,consent=false,consentVersion,timeZone,id,now}={}){
 if(consent!==true||consentVersion!==COURSE_21_CONSENT_VERSION)fail('NEW_COURSE_CONSENT_REQUIRED')
 if(!ownerId||preview?.source?.accountId!==ownerId)fail('COURSE_OWNER_REQUIRED')
 if(!Number.isInteger(expectedCourseRevision)||preview.source.courseRevision!==expectedCourseRevision)fail('SOURCE_COURSE_CHANGED')
 if(!preview.profile||!Array.isArray(preview.profile.rows))fail('INVALID_PREVIEW')
 if(!uniqueStrings(selectedR3ScaleKeys))fail('INVALID_R3_SCALE_SELECTION')
 const ids=selectedR3ScaleKeys.map(key=>preview.profile.rows.find(r=>r.r3ScaleKey===key)?.id||fail('UNKNOWN_R3_SCALE'))
 const choices=chooseCourseScales(preview.profile,ids,{consent:true})
 const journey=createCourseJourney({id,choices,consent:true,timeZone,contentVersion:COURSE_CONTENT_21_VERSION,now})
 return {source:structuredClone(preview.source),selectedR3ScaleKeys:[...selectedR3ScaleKeys],
  consent:{version:consentVersion,at:now,privateTextStorage:'separate-per-submission-opt-in'},
  choices,journey,legacyCourseMutation:null,testPlanMutation:null}
}
