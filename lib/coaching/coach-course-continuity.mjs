import {clarityCourseDay} from './clarity-course.mjs'
import {CLARITY_DAY_ONE_VERSION} from './clarity-day-one-scenario.mjs'

// Only a persisted, non-paused Director gate can transfer the active coach.
// Day one must have the explicit v5 consent ledger; days two and three use
// their existing versionless canonical schemas. No guest/provider permission.
export function coachCourseHandoffEligible(courseSessionId,state){
 const day=clarityCourseDay(courseSessionId)
 return Boolean(day&&state&&state.paused!==true&&
   (day===1?state.scenarioVersion===CLARITY_DAY_ONE_VERSION:
     !state.scenarioVersion))
}
