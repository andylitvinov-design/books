/**
 * Six visual positions for the already evidence-ordered My Coach method.
 * The current Director, not LLM prose, timer, number of turns or a client
 * progress field, supplies supportedSteps. This is an ephemeral display
 * snapshot; it is NOT persisted consent, a completed treatment or a booking.
 */
export const COACH_SESSION_PROGRESS_VERSION='hh-coach-session-progress-v1'
const methods=new Set(['grow','tgrow','woop','oskar','solution_focused','appreciative_inquiry'])
const steps=new Set(['topic','goal','reality','options','way_forward','review','wish',
  'outcome','internal_obstacle','if_then','scaling','know_how','affirm_action',
  'preferred_future','exceptions','strengths','experiment','discover','dream','design','deliver'])

export function coachSessionProgress(directive){
  const methodId=directive?.methodId
  const id=directive?.methodStepId
  const supported=directive?.supportedStages
  if(!methods.has(methodId)||typeof id!=='string'||!id.startsWith(methodId+':')||
    !Array.isArray(supported)||supported.length>6||
    supported.some((step,index)=>typeof step!=='string'||!steps.has(step)||supported.indexOf(step)!==index))
    return null
  const stepId=id.slice(methodId.length+1)
  if(!steps.has(stepId))return null
  const completed=stepId==='review'&&supported.includes('review')&&
    directive?.readiness?.ready===true&&
    Array.isArray(directive?.readiness?.missing)&&directive.readiness.missing.length===0
  // Five-step methods occupy positions 1–5, with the final sixth position
  // unlocked only after an actual client-reviewed summary. TGROW has six
  // ordinary steps. Never advance on a mere coach recommendation or timer.
  const index=Math.min(5,supported.length)
  return Object.freeze({
    schema:COACH_SESSION_PROGRESS_VERSION,source:'director-client-evidence',
    methodId,stepId:completed?'complete':stepId,
    index,step:index+1,total:6,completed
  })
}
