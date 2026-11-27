// Server-owned editorial settings. A program type is not a provider reply,
// user-supplied switch, clinical diagnosis, consent or entitlement.
export const COACH_PROGRAM_TYPES=Object.freeze(['coaching','therapy'])
export const ANTI_STRESS_PROGRAM_ID='anti-stress-three-session'
export const ANTI_STRESS_SESSION_IDS=Object.freeze(['anti_stress_ground','anti_stress_calm','anti_stress_resource'])
const profiles=Object.freeze({
 coaching:Object.freeze({type:'coaching',pace:'responsive',intervention:'goal-and-action',questionPolicy:'one-at-a-time',silence:'respect',priority:'client-autonomy'}),
 therapy:Object.freeze({type:'therapy',pace:'slow',intervention:'empathic-regulation',questionPolicy:'one-at-a-time-or-none',silence:'allow-longer',priority:'safety-and-stabilization'})
})
// Existing courses preserve their previous coaching behaviour. The old
// "Clarity & Anti-stress" label does not enroll a client in the new program.
const byProgram=Object.freeze({clarity:'coaching','clarity-three-day':'coaching',goal:'coaching',business:'coaching',[ANTI_STRESS_PROGRAM_ID]:'therapy'})
export function coachProgramSettings(programId=null){
 if(programId!==null&&!Object.hasOwn(byProgram,programId))throw Error('COACH_PROGRAM_TYPE_UNKNOWN')
 return profiles[programId===null?'coaching':byProgram[programId]]
}
export function coachProgramModeInstruction(programId=null){
 const p=coachProgramSettings(programId)
 return p.type==='therapy'?
  'PROGRAM MODE: THERAPY-ORIENTED SELF-REGULATION (AI support, not diagnosis or clinical treatment). Safety, consent and client pace override timing, persona style and goal-oriented methods. Use warm, slow, brief, empathic reflections; leave space for silence; never interrupt or fill silence with questions. Ask at most one gentle question, or none. Ask permission before each new practice; allow stop, skip, eyes open, external focus, or a smaller step. Never force breathing, disclosure, exposure, imagery, touch, or a positive result. Do not solicit traumatic memories or interpret symptoms. Distress worsening means stop the exercise, orient to the present, offer human support; imminent danger or urgent medical symptoms invoke the existing safety path. No action-plan pressure or invented progress.':
  'PROGRAM MODE: COACHING. Support client-led reflection, realistic goals, options and voluntary next steps; stay responsive, ask at most one useful question, respect refusal, silence, consent and safety. Never push goals or invent agreement.'
}
