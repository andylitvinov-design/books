import { shouldShowFreeCourseFinalOffer } from './course-membership.js'

// Single source of truth for OPORA slide assembly and public lesson QA.
// AS-2.1 educational screen passport for new seven-skill OPORA cycles.
// Timings are indicative UX budgets, never compulsory waiting or evidence of a skill.
export const OPORA_SEVEN_SCREEN_MODEL = Object.freeze([
  {key:'skill-intro',kind:'skill-intro',order:1,role:'learning-goal',
    title:{ru:'Какой навык сегодня',en:'Today’s skill'},seconds:30,practice:false,
    expectedAction:'recognise lesson goal or explicitly defer',evidence:'lesson_goal_presented'},
  {key:'skill-prepare',kind:'skill-prepare',order:2,role:'recognise-situation',
    title:{ru:'Когда это бывает',en:'Recognise the moment'},seconds:45,practice:false,
    expectedAction:'identify one neutral everyday cue and choose an accessible format',evidence:'scenario_recognition_optional'},
  {key:'skill-practice',kind:'skill-practice',order:3,role:'guided-demonstration-and-practice',
    title:{ru:'Делаю вместе с подсказками',en:'Guided demonstration and practice'},seconds:300,practice:true,
    expectedAction:'attempt one concrete skill through short guided actions',evidence:'self_reported_guided_attempt'},
  {key:'skill-repeat',kind:'skill-repeat',order:4,role:'independent-retrieval',
    title:{ru:'Пробую самостоятельно',en:'Try it myself'},seconds:75,practice:true,
    expectedAction:'try the same skill with fewer or optional hints',evidence:'self_reported_attempt_and_hint'},
  {key:'skill-scenario',kind:'skill-scenario',order:5,role:'safe-transfer',
    title:{ru:'Пробую в другой ситуации',en:'Apply in a new situation'},seconds:60,practice:true,
    expectedAction:'choose one skill-specific response to a different everyday situation',evidence:'scenario_response_or_skip'},
  {key:'skill-review',kind:'skill-review',order:6,role:'honest-reflection',
    title:{ru:'Что заметил(а)',en:'What I noticed'},seconds:45,practice:false,
    expectedAction:'describe fit without a required improvement or second diagnostic scale',evidence:'comfort_or_decline'},
  {key:'skill-result',kind:'skill-result',order:7,role:'personal-takeaway-and-server-save',
    title:{ru:'Мой навык на сегодня',en:'My skill takeaway'},seconds:45,practice:false,
    expectedAction:'review only actual attempts and explicitly save or leave',evidence:'server_confirmed_completion'},
].map(item=>Object.freeze({...item,title:Object.freeze(item.title)})))

export const SEVEN_SKILLS_SLIDES=Object.freeze(
  OPORA_SEVEN_SCREEN_MODEL.map(({key,kind})=>Object.freeze({key,kind}))
)
// Pure function: no DOM, no auth, no individual client data.
export function buildCourseSlides(lesson) {
  if(lesson?.antiStress?.sevenSkillsV1)return SEVEN_SKILLS_SLIDES
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
