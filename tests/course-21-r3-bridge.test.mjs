import test from 'node:test'
import assert from 'node:assert/strict'
import {getAssessmentDefinition,provenance} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {previewR3Course21,activateR3Course21,COURSE_21_CONSENT_VERSION} from '../lib/inner-growth/course-21-r3-bridge.js'
import {COURSE_CONTENT_21_VERSION,lessonFor21} from '../lib/inner-growth/lesson-library-21.js'
import {checkInBeforeLesson,dailyLesson} from '../lib/inner-growth/course-progression-21.js'

const now='2026-10-12T12:00:00.000Z',ownerId='synthetic-owner'
function result(def,locale='en',offset=0){
 const scored=scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,(q.min??def.answerScale.min)+offset])))
 const value={id:'synthetic-result-'+def.id,accountId:ownerId,status:'completed',measurementAt:now,...structuredClone(scored)}
 value.interpretations={[locale]:{status:'available',origin:'database',identity:provenance(def),uiLocale:locale,
  interpretationVersion:'2026-10-12.v2',payloadHash:'sha256:'+'a'.repeat(64),sections:value.dimensions.map(d=>({...d,
   compact:{meaning:'Prepared synthetic meaning for '+d.key},source:{title:'Synthetic registered content'}}))}}
 return value
}
function input({keys=['hh-weekly-pulse'],instrumentLocale='en',locale='en'}={}){
 const definitions=keys.map(key=>getAssessmentDefinition(key,'v1',instrumentLocale))
 return {ownerId,course:{id:'synthetic-r3-course',accountId:ownerId,stage:3,revision:4,testKeys:keys,
  durationDays:14,scaleKeys:[],dayCompletions:{}},planDefinitionIds:definitions.map(d=>d.id),
  results:definitions.map(d=>result(d,locale)),locale,now}
}
function activation(preview,extra={}){
 return {preview,ownerId,expectedCourseRevision:4,selectedR3ScaleKeys:preview.profile.rows.filter(r=>r.canChoosePractice).slice(0,3).map(r=>r.r3ScaleKey),
  consent:true,consentVersion:COURSE_21_CONSENT_VERSION,timeZone:'UTC',id:'synthetic-21-course',now,...extra}
}
test('R3 profile creates a separate 21-day journey from all exact owned scales without mutating enrolment or plan',()=>{
 for(const locale of ['en','ru']){
  const fixture=input({locale,instrumentLocale:locale}),before=structuredClone(fixture)
  const preview=previewR3Course21(fixture)
  assert.equal(preview.status,'ready-to-review');assert.equal(preview.profile.rows.length,8)
  assert.equal(preview.profile.priorityScaleIds.length,7)
  assert.equal(preview.source.bindings.length,1);assert.equal(preview.source.bindings[0].payloadHash,'a'.repeat(64))
  assert.equal(preview.source.bindings[0].interpretationVersion,'2026-10-12.v2')
  assert.deepEqual(preview.source.bindings[0].identity,provenance(getAssessmentDefinition('hh-weekly-pulse','v1',locale)))
  const active=activateR3Course21(activation(preview))
  assert.equal(active.journey.durationDays,21);assert.equal(active.journey.contentVersion,COURSE_CONTENT_21_VERSION)
  assert.equal(active.legacyCourseMutation,null);assert.equal(active.testPlanMutation,null)
  assert.equal(active.consent.privateTextStorage,'separate-per-submission-opt-in')
  assert.deepEqual(fixture,before)
  const checked=checkInBeforeLesson(active.journey,{day:1,skip:true,now,expectedRevision:0})
  assert.equal(dailyLesson(checked,{now,locale,lessonFor:lessonFor21}).status,'ready')
 }
})
test('RU display of an explicitly selected English form keeps English identity and Russian DB meaning',()=>{
 const preview=previewR3Course21(input({locale:'ru',instrumentLocale:'en'}))
 assert.equal(preview.status,'ready-to-review');assert.equal(preview.profile.rows.length,8)
 assert.ok(preview.profile.rows.every(r=>r.instrumentLocale==='en'&&r.canChoosePractice))
 assert.equal(preview.source.selectedForms[0].identity.instrumentLocale,'en')
})
test('new consent, exact notice version, account and source revision are mandatory',()=>{
 const preview=previewR3Course21(input()),args=activation(preview)
 for(const consent of [false,undefined,'true'])assert.throws(()=>activateR3Course21({...args,consent}),/NEW_COURSE_CONSENT_REQUIRED/)
 assert.throws(()=>activateR3Course21({...args,consentVersion:'old'}),/NEW_COURSE_CONSENT_REQUIRED/)
 assert.throws(()=>activateR3Course21({...args,ownerId:'another'}),/COURSE_OWNER_REQUIRED/)
 assert.throws(()=>activateR3Course21({...args,expectedCourseRevision:3}),/SOURCE_COURSE_CHANGED/)
 assert.throws(()=>activateR3Course21({...args,expectedCourseRevision:undefined}),/SOURCE_COURSE_CHANGED/)
 assert.throws(()=>activateR3Course21({...args,selectedR3ScaleKeys:['unknown']}),/UNKNOWN_R3_SCALE/)
 assert.throws(()=>activateR3Course21({...args,selectedR3ScaleKeys:args.selectedR3ScaleKeys.slice(0,2)}),/CHOOSE_THREE_TO_FIVE/)
})
test('existing 14-day programmes cannot be silently migrated or another account used',()=>{
 for(const stage of [1,2,4,5,6]){
  const fixture=input();fixture.course.stage=stage
  assert.throws(()=>previewR3Course21(fixture),/NEW_R3_PROFILE_REQUIRED/)
 }
 const fixture=input();fixture.course.accountId='another'
 assert.throws(()=>previewR3Course21(fixture),/COURSE_OWNER_REQUIRED/)
})
test('selected keys need one exact saved form; translations and duplicate IDs are never guessed',()=>{
 const fixture=input(),ru=getAssessmentDefinition('hh-weekly-pulse','v1','ru')
 assert.throws(()=>previewR3Course21({...fixture,planDefinitionIds:[]}),/SELECTED_TEST_NOT_IN_PLAN/)
 assert.throws(()=>previewR3Course21({...fixture,planDefinitionIds:[...fixture.planDefinitionIds,ru.id]}),/EXACT_FORM_SELECTION_REQUIRED/)
 assert.throws(()=>previewR3Course21({...fixture,planDefinitionIds:[...fixture.planDefinitionIds,...fixture.planDefinitionIds]}),/EXACT_PLAN_FORMS_REQUIRED/)
 const other=input({instrumentLocale:'ru'}).results[0]
 assert.equal(previewR3Course21({...fixture,results:[other]}).status,'tests-remaining')
})
test('missing, retired, malformed or stale DB interpretation blocks activation with no prose substitute',()=>{
 const mutations=[r=>delete r.interpretations,r=>r.interpretations.en.status='retired',
  r=>r.interpretations.en.payloadHash='wrong',r=>r.interpretations.en.identity.contentHash='wrong',
  r=>r.interpretations.en.interpretationVersion='unsupported',r=>r.interpretations.en.uiLocale='ru',
  r=>r.interpretations.en.sections[0].value++,r=>delete r.interpretations.en.sections[0].compact]
 for(const mutate of mutations){
  const fixture=input();mutate(fixture.results[0]);const preview=previewR3Course21(fixture)
  assert.equal(preview.status,'interpretations-unavailable');assert.ok(preview.profile.rows.every(r=>r.meaning===null))
  assert.throws(()=>activateR3Course21(activation(preview)),/INTERPRETATIONS_UNAVAILABLE/)
 }
})
test('changed provenance, impossible score, dimension shape, unfinished/future/foreign result cannot seed the profile',()=>{
 const mutations=[r=>r.contentHash='wrong',r=>r.dimensions[0].value=1000,r=>r.dimensions[0].value=.5,
  r=>r.dimensions[0].max++,r=>r.dimensions[0].direction='other',r=>r.dimensions.pop(),
  r=>r.dimensions[1]=r.dimensions[0],r=>r.status='in-progress',r=>r.accountId='another',
  r=>r.measurementAt='2026-10-13T00:00:00.000Z']
 for(const mutate of mutations){const fixture=input();mutate(fixture.results[0]);const preview=previewR3Course21(fixture)
  assert.equal(preview.status,'tests-remaining');assert.equal(preview.profile.rows.length,0)}
})
test('clinical screens and mixed-polarity composites stay visible but never become daily deficit targets',()=>{
 const preview=previewR3Course21(input({keys:['hh-weekly-pulse','phq-9','ces-d-20','hh-money-pressure']}))
 assert.equal(preview.status,'ready-to-review')
 const clinical=preview.profile.rows.find(r=>r.definitionKey==='phq-9')
 assert.equal(clinical.value,0);assert.equal(clinical.canChoosePractice,false);assert.equal(clinical.eligibleForPriority,false)
 assert.equal(clinical.coursePolarity,'lower-reported-difficulty')
 const ces=preview.profile.rows.find(r=>r.definitionKey==='ces-d-20')
 assert.equal(ces.canChoosePractice,false);assert.equal(ces.eligibleForPriority,false)
 const mixed=preview.profile.rows.find(r=>r.definitionKey==='hh-money-pressure')
 assert.equal(mixed.canChoosePractice,false);assert.equal(mixed.supportPosition,null)
 assert.equal(mixed.reason,'mixed-direction-composite')
 assert.equal(preview.profile.healthPercentage,null);assert.equal(preview.profile.clinicalSeverityComparison,false)
})
test('polarity is separate from raw position; ties are stable and retakes change the preview binding',()=>{
 const fixture=input(),preview=previewR3Course21(fixture)
 const tension=preview.profile.rows.find(r=>r.dimensionKey==='weekly.tension')
 const clarity=preview.profile.rows.find(r=>r.dimensionKey==='weekly.clarity')
 assert.equal(tension.rawPosition,0);assert.equal(tension.supportPosition,1)
 assert.equal(clarity.rawPosition,0);assert.equal(clarity.supportPosition,0)
 assert.equal(tension.comparisonBasis,'position-in-own-registered-range-not-clinical-comparability')
 assert.deepEqual(preview.profile.priorityScaleIds,previewR3Course21(fixture).profile.priorityScaleIds)
 const newer=structuredClone(fixture.results[0]);newer.id='synthetic-retake';newer.measurementAt='2026-10-12T12:01:00.000Z'
 newer.interpretations.en.payloadHash='sha256:'+'b'.repeat(64)
 const later=previewR3Course21({...fixture,results:[...fixture.results,newer],now:'2026-10-12T12:02:00.000Z'})
 assert.equal(later.source.bindings[0].resultId,newer.id);assert.equal(later.source.bindings[0].payloadHash,'b'.repeat(64))
 assert.notDeepEqual(later.source,preview.source)
})
