import {clarityCourseDay} from './clarity-course.mjs'
import {clarityScenarioVersion} from './clarity-course-scenarios.mjs'

// Only a persisted, non-paused Director gate can transfer the active coach.
// New A/B/C gates must match the exact course version; legacy B/C drafts
// retain their historical versionless handoff. No guest/provider permission.
export function coachCourseHandoffEligible(courseSessionId,state){
 const day=clarityCourseDay(courseSessionId)
 return Boolean(day&&state&&state.paused!==true&&
   (state.scenarioVersion===clarityScenarioVersion(courseSessionId)||(day!==1&&!state.scenarioVersion)))
}
