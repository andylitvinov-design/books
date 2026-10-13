// Server-owned R3 snapshots enter here after account ownership and exact report
// loading. No client registry, topic inference, result lookup or text generation.
import { previewR3Course21 } from './course-21-r3-bridge.js'
import { personalCourseProfileV2 } from './course-personal-profile-v2.js'
import { createPersonalCourseRuntimeAdapter } from './course-personal-runtime-v2.js'
import { CURRICULUM_21 } from '../../data/inner-growth/curriculum-21.js'

export const PERSONAL_COURSE_CONSENT_VERSION = 'hh-course-21-personal-consent-v2'
const clone = value => structuredClone(value)
const fail = code => { throw Error(code) }
const R3_FOCUS={stress:'calm_regulation',mood:'emotional_flexibility',energy:'energy_agency',attention:'attention_clarity',relationships:'connection_boundaries',resources:'inner_support'}
export function personalFocusFromR3(tags=[]) {
 if(!Array.isArray(tags)||tags.length>6||new Set(tags).size!==tags.length||tags.some(tag=>!Object.hasOwn(R3_FOCUS,tag)))fail('INVALID_FOCUS_TOPICS')
 return tags.map(tag=>R3_FOCUS[tag])
}
export function previewPersonalR3Course21({ registry = null, focusTopicIds, ...input } = {}) {
  const focus=focusTopicIds??personalFocusFromR3(input.course?.focusTags??[])
  const source = previewR3Course21(input)
  const profile = personalCourseProfileV2({ ownerId:input.ownerId, results:input.results,
    selection:{confirmed:true,selected:source.source.selectedForms},locale:input.locale,now:input.now,registry,focusTopicIds:focus })
  return { ...source,source:{...source.source,confirmedFocusTopicIds:focus},status:profile.status,profile,consentVersion:PERSONAL_COURSE_CONSENT_VERSION,
    personalization:'exact-reviewed-scale-objective-practice',contentVersion:registry?.contentVersion??null,
    registry:registry?{id:registry.id,version:registry.version,contentVersion:registry.contentVersion}:null,
    supportsPlanRevision:true,chosenLoadOptions:[2,5],clinicalValidation:false }
}
export function activatePersonalR3Course21({ preview, registry = null, ownerId, expectedCourseRevision,
  selectedR3ScaleKeys, consent = false, consentVersion, timeZone, id, now, loadMinutes = 5, weeklyAccents = {} } = {}) {
  if(consent!==true||consentVersion!==PERSONAL_COURSE_CONSENT_VERSION)fail('NEW_COURSE_CONSENT_REQUIRED')
  if(!ownerId||preview?.source?.accountId!==ownerId)fail('COURSE_OWNER_REQUIRED')
  if(!Number.isInteger(expectedCourseRevision)||preview.source.courseRevision!==expectedCourseRevision)fail('SOURCE_COURSE_CHANGED')
  if(preview.status!=='ready-to-review'||preview.profile?.status!=='ready-to-review')fail('PERSONAL_PROFILE_UNAVAILABLE')
  if(!Array.isArray(selectedR3ScaleKeys)||new Set(selectedR3ScaleKeys).size!==selectedR3ScaleKeys.length||selectedR3ScaleKeys.some(key=>typeof key!=='string'))fail('INVALID_R3_SCALE_SELECTION')
  const selectedRows=selectedR3ScaleKeys.map(key=>preview.profile.rows.find(row=>row.r3ScaleKey===key&&row.canChoosePractice)||fail('UNKNOWN_R3_SCALE'))
  if(selectedRows.length<preview.profile.minimumChoices||selectedRows.length>5||!selectedRows.length)fail('CHOOSE_THREE_TO_FIVE_WHEN_AVAILABLE')
  if(![2,5].includes(loadMinutes))fail('INVALID_CHOSEN_LOAD')
  const runtime=createPersonalCourseRuntimeAdapter(registry).create({id,now,timeZone,consent:true,
    scales:preview.profile.evidence.scales,selectedScaleIds:selectedRows.map(row=>row.id),
    uiLocale:preview.profile.evidence.uiLocale,loadMinutes,weeklyAccents})
  if(JSON.stringify(runtime.registry)!==JSON.stringify(preview.registry))fail('COURSE_PREVIEW_CHANGED')
  const choices={confirmed:true,durationDays:21,scaleIds:[...runtime.plan.selectedScaleIds],
    topics:runtime.plan.selectedScales.map(row=>({scaleId:row.scaleId,track:row.topicId}))}
  return { source:clone(preview.source),selectedR3ScaleKeys:[...selectedR3ScaleKeys],
    consent:{version:consentVersion,at:now,privateTextStorage:'separate-per-submission-opt-in'},
    choices,journey:runtime.journey,personal:{version:runtime.version,registry:runtime.registry,plan:runtime.plan},
    legacyCourseMutation:null,testPlanMutation:null }
}
export function personalRuntimeFromState(state) {
  return state?.personal ? {...clone(state.personal),journey:clone(state.journey)} : null
}
export function storePersonalRuntime(state,runtime) {
  return {...state,journey:runtime.journey,personal:{...state.personal,version:runtime.version,registry:runtime.registry,plan:runtime.plan}}
}
export function personalCourseOutline(runtime,locale='en') {
  if(!['en','ru'].includes(locale))fail('UNSUPPORTED_LOCALE')
  return {version:CURRICULUM_21.version,mode:'personal-exact',contentVersion:runtime.registry.contentVersion,clinicalValidation:false,
    weeks:CURRICULUM_21.weeks.map(week=>({week:week.week,title:week.title[locale],goal:week.goal[locale],
      days:runtime.plan.slots.filter(slot=>slot.week===week.week).map(slot=>({day:slot.day,review:slot.kind==='review',
        skill:slot.commonObjective.skill,learningOutcome:slot.commonObjective.objective,track:slot.topicId,
        selectedScaleId:slot.selectedScaleId,reviewScaleIds:clone(slot.reviewScaleIds??[]),practiceId:slot.practiceId,
        contentLocale:slot.practice?.contentLocale??null,planRevision:slot.planRevision}))})),
    sources:CURRICULUM_21.sources.map(source=>({id:source.id,url:source.url,title:source.title,principle:source.principle[locale]}))}
}
