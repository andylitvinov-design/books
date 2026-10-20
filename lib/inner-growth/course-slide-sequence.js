import { shouldShowFreeCourseFinalOffer } from './course-membership.js'
import { OPORA_SKILL_SLIDE_MODEL } from './anti-stress-skills-v5.js'
import { OPORA54_SLIDE_MODEL, OPORA54_PRE_SAVE_KEYS } from './anti-stress-skills-v6.js'

// Experience-first route for AS-5.5/V7 current learners. Keep the
// historical fifteen-screen key contract unchanged for old sessions/CI.
export const OPORA_EXPERIENCE_PRE_SAVE_KEYS=Object.freeze([
  'arrive','practice','feel','affirmation','save',
])

// Extended educational journey for days 2-14. The old five-key array above
// remains accepted by the server for tabs opened before this release.
export const OPORA_EXPERIENCE_EXTENDED_KEYS=Object.freeze([
  'arrive','support','understand','story','options','practice',
  'repeat','feel','everyday','affirmation','save',
])

// Day 1 restores the five original gentle opening screens before practical work.
// Keep the original five-moment contract for days 2-14 and for old open clients.
export const OPORA_DAY_ONE_RESTORED_KEYS=Object.freeze([
  'welcome','baseline','checkin','recall','affirmation',
  'arrive','practice','feel','save',
])

// Single source of truth for OPORA slide assembly and public lesson QA.
// Pure function: no DOM, no auth, no individual client data.
export function buildCourseSlides(lesson) {
  if(lesson?.antiStress?.slideModel===OPORA54_SLIDE_MODEL){
    const authored=lesson?.opora54?.screens
    if(!Array.isArray(authored)||authored.length!==OPORA54_PRE_SAVE_KEYS.length)
      throw new Error('OPORA54_LESSON_SCREENS_MISSING')
    return OPORA54_PRE_SAVE_KEYS.map((key,index)=>{
      const screen=authored[index]
      if(screen?.key!==key||typeof screen.text!=='string'||screen.text.length<24)
        throw new Error('OPORA54_LESSON_SCREEN_MISMATCH')
      return {key,kind:key,title:screen.title,text:screen.text}
    })
  }
  if(lesson?.antiStress?.slideModel===OPORA_SKILL_SLIDE_MODEL){
    const main=lesson?.sections?.find(section=>section.kind==='meditation')
    if(!main)throw new Error('OPORA_SKILLS_MAIN_PRACTICE_MISSING')
    return [
      {key:'welcome',kind:'welcome'},
      {key:'checkin',kind:'checkin'},
      {key:'guided-practice',kind:'guided',section:main},
      {key:'ritual',kind:'ritual'},
      {key:'transfer',kind:'transfer'},
      {key:'reflection',kind:'reflection'},
      {key:'feedback',kind:'feedback'},
    ]
  }
  const guided=(lesson?.sections||[]).filter(section=>['arrive','meditation','finish'].includes(section.kind))
  const hasArrival=guided.some(section=>section.kind==='arrive')
  return [
    {key:'welcome',kind:'welcome'},
    {key:'baseline',kind:'baseline'},
    {key:'checkin',kind:'checkin'},
    ...(lesson?.practiceV3?.recall?[{key:'recall',kind:'recall'}]:[]),
    {key:'idea',kind:'idea'},
    ...(!hasArrival&&(lesson?.sections||[]).some(section=>section.kind==='learn')?
      [{key:'understand',kind:'understand'}]:[]),
    ...(lesson?.workbook?.workingPosition?[{key:'phrase',kind:'phrase'}]:[]),
    ...guided.map((section,index)=>({key:'guided-'+index,kind:'guided',section})),
    {key:'ritual',kind:'ritual'},
    ...(lesson?.workbook?.microPractice?[{key:'transfer',kind:'transfer'}]:[]),
    ...(lesson?.practiceV4?[{key:'symbol',kind:'symbol'}]:[]),
    {key:'reflection',kind:'reflection'},
    {key:'moment',kind:'moment'},
    {key:'feedback',kind:'feedback'},
  ]
}

export const OPORA_EXPECTED_SLIDES=Object.freeze([
  'welcome','baseline','checkin','recall','idea','phrase',
  'guided','guided','guided','ritual','transfer','symbol',
  'reflection','moment','feedback',
])

// The optional first-party ad is a final slide of the 14-day FREE course,
// never a post-save gate or an additional daily advertisement.
export function withFinalFreeOffer(slides, eligibility = {}) {
  const core = Array.isArray(slides) ? slides : []
  return shouldShowFreeCourseFinalOffer(eligibility)
    ? [...core, {key: 'free-course-offer', kind: 'course-offer'}] : core
}

// Authenticated lesson submissions acknowledge the expected slide sequence.
// This is not cryptographic proof of human attention, but prevents partial or
// alternate lesson routes from accidentally marking the day completed.
export function verifyCourseSlideVisitOrder(expectedSlides, visitKeys) {
  return Array.isArray(expectedSlides) && expectedSlides.length > 0 &&
    Array.isArray(visitKeys) && expectedSlides.length === visitKeys.length &&
    expectedSlides.every((slide, index) => typeof slide.key === 'string' &&
      slide.key === visitKeys[index])
}
