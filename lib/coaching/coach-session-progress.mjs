/**
 * One Director-owned method sequence, plus five plain-language conversation
 * themes. Neither progress contract is based on LLM output, turn count or time.
 * The chosen alternate method retains its own names and prerequisites.
 */
export const COACH_SESSION_PROGRESS_VERSION='hh-coach-session-progress-v1'
export const COACH_MEANING_JOURNEY_VERSION='hh-coach-meaning-journey-v1'
const methodSteps=Object.freeze({
 grow:Object.freeze(['goal','reality','options','way_forward','review']),
 tgrow:Object.freeze(['topic','goal','reality','options','way_forward','review']),
 woop:Object.freeze(['wish','outcome','internal_obstacle','if_then','review']),
 oskar:Object.freeze(['outcome','scaling','know_how','affirm_action','review']),
 solution_focused:Object.freeze(['preferred_future','exceptions','strengths','experiment','review']),
 appreciative_inquiry:Object.freeze(['discover','dream','design','deliver','review'])
})
const meaningSteps=Object.freeze(['contact','goal','reality','options','integration'])
function coachMeaningJourney(methodId,stepId,supported,evidence,completed){
 let index=0,stageId=stepId
 if(methodId==='grow'||methodId==='tgrow'){
   const contactEstablished=evidence?.topicNamed===true||
     evidence?.goalRestated===true||evidence?.workingFocusEstablished===true
   index=stepId==='topic'?0:stepId==='goal'?(contactEstablished?1:0):
     stepId==='reality'?2:stepId==='options'?3:4
   stageId=meaningSteps[index]
 }else{
   // WOOP, OSKAR etc. are not GROW in disguise: use their actual stages.
   index=Math.min(4,supported.length)
   stageId=methodSteps[methodId][index]
 }
 return Object.freeze({
   schema:COACH_MEANING_JOURNEY_VERSION,source:'director-client-evidence',
   methodId,index,step:index+1,total:5,stageId,completed
 })
}
export function coachSessionProgress(directive){
 const methodId=directive?.methodId,order=methodSteps[methodId]
 const id=directive?.methodStepId,supported=directive?.supportedStages
 if(!order||typeof id!=='string'||!id.startsWith(methodId+':')||
   !Array.isArray(supported)||supported.length>order.length||
   !supported.every((step,index)=>step===order[index]))return null
 const stepId=id.slice(methodId.length+1)
 if(stepId!==order[Math.min(supported.length,order.length-1)])return null
 const completed=stepId==='review'&&supported.length===order.length&&
   directive?.readiness?.ready===true&&
   Array.isArray(directive?.readiness?.missing)&&directive.readiness.missing.length===0
 // Retain six-position transport fields for existing consumers.
 const index=Math.min(5,supported.length)
 return Object.freeze({
   schema:COACH_SESSION_PROGRESS_VERSION,source:'director-client-evidence',
   methodId,stepId:completed?'complete':stepId,
   index,step:index+1,total:6,completed,
   journey:coachMeaningJourney(methodId,stepId,supported,directive?.evidence,completed)
 })
}

/** The same Director-owned method order, projected into the existing visible
 * five-stage journey. Legacy 6-position transport stays read-only compatible.
 */
export function coachSessionVisibleStageIds(methodId,{legacy=false}={}){
 const actual=methodSteps[methodId]||meaningSteps
 const stages=legacy?[...actual]:methodId==='grow'||methodId==='tgrow'
   ?[...meaningSteps]:[...actual]
 if(legacy&&stages.length<6)stages.push('complete')
 return Object.freeze(stages)
}
