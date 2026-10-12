// Synthetic protocol fixture only. This changes cloned flags to exercise trusted
// composition; it is not an editorial approval or a production registry export.
import { PERSONAL_COURSE_PILOT_DRAFT_BUNDLE, PERSONAL_COURSE_PILOT_VERSION, getPersonalCoursePilotContent } from '../../data/inner-growth/course-personal-practices-v2.js'
import { PERSONAL_COURSE_MAPPING_EXTENSIONS } from '../../data/inner-growth/course-personal-mapping-extensions-v2.js'
import { PERSONAL_COURSE_SUPPORT_FAMILIES_MAPPINGS, getPersonalCourseSupportFamilyContent } from '../../data/inner-growth/course-personal-support-families-v2.js'
import { PERSONAL_LESSON_FRAME_VERSION } from '../../data/inner-growth/course-personal-lesson-frame-v2.js'
import { COURSE_GOAL_STATEMENTS_V1 } from '../../data/inner-growth/course-goal-statements-v1.js'
export function syntheticPersonalRegistry() {
 const mappings=structuredClone([...PERSONAL_COURSE_PILOT_DRAFT_BUNDLE.mappings,...PERSONAL_COURSE_MAPPING_EXTENSIONS,...PERSONAL_COURSE_SUPPORT_FAMILIES_MAPPINGS])
 const reviewMapping=structuredClone(PERSONAL_COURSE_PILOT_DRAFT_BUNDLE.reviewMapping)
 for(const mapping of [...mappings,reviewMapping]){mapping.status='reviewed';for(const reference of mapping.practices)reference.reviewStatus='reviewed'}
 return {id:'synthetic-personal-registry',version:'synthetic-only-v1',contentVersion:PERSONAL_COURSE_PILOT_VERSION,status:'reviewed',
  source:'SYNTHETIC TEST ONLY',goalStatements:structuredClone(COURSE_GOAL_STATEMENTS_V1),mappings,reviewMapping,frameApproval:{version:PERSONAL_LESSON_FRAME_VERSION,status:'reviewed',source:'SYNTHETIC TEST ONLY'},
  getContent(selector){const card=getPersonalCoursePilotContent(selector)??getPersonalCourseSupportFamilyContent(selector);return card?{...card,reviewStatus:'reviewed',contentStatus:'REVIEWED'}:null}}
}
