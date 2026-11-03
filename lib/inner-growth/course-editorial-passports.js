// A transparent editorial backlog derived from existing authored courses.
// 84 in the repository != 84 independently reviewed or clinically validated lessons.
import { TRACKS, COURSE_CONTENT_VERSION, COURSE_CONTENT_V4 } from './lesson-library.js'
import { GROWTH_GOALS } from './course-model.js'

export function lessonEditorialPassports(locale='en') {
  const language=locale==='ru'?'ru':'en',column=language==='ru'?1:0
  return Object.entries(TRACKS).flatMap(([domain,days])=>days.map((entry,index)=>({
    id:domain+':'+String(index+1).padStart(2,'0')+':'+language,
    domain,day:index+1,locale:language,sourceContentVersion:COURSE_CONTENT_VERSION,contentVersion:COURSE_CONTENT_V4,
    title:entry.title[column],
    stateGoal:GROWTH_GOALS[domain]?.title?.[language]||domain,
    sourceText:entry.teaching[column],
    practiceText:entry.guide[column],
    voluntaryTransferText:entry.action[column],
    // Purposefully unverified, requiring editorial/rights/safety review.
    borrowedPrinciple:null,verifiedSource:null,authorAdaptation:null,
    practiceSafetyReview:null,mediaRightsReview:null,reviewer:null,
    editorialReviewed:false,usabilityPiloted:false,effectivenessEvidence:false,
  })))
}
