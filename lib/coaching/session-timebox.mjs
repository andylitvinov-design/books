/**
 * My Coach 20-minute focus guide — a soft target, never a forced timeout.
 * This is derived from active browser time and treated as UNTRUSTED advice
 * by the server: it cannot authorize payment, saving, clinical decisions or
 * a model call. All safety and user consent gates remain independent.
 */
export const COACH_FOCUS_TARGET_SECONDS=20*60
export const COACH_TIMEBOX_VERSION='hh-coach-focus-20m-v1'
const MAX_SECONDS=2*60*60
export function normalizeCoachElapsedSeconds(value){
  if(value===undefined)return null
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0||value>MAX_SECONDS)
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  return value
}
export function coachTimeboxState(elapsedSeconds=null){
  const seconds=elapsedSeconds===null?null:normalizeCoachElapsedSeconds(elapsedSeconds)
  const phase=seconds===null?'not_started':seconds>=COACH_FOCUS_TARGET_SECONDS?'flexible_close':
    seconds>=18*60?'closing':seconds>=15*60?'integration':seconds>=3*60?'exploration':'focus'
  return Object.freeze({
    version:COACH_TIMEBOX_VERSION,phase,elapsedSeconds:seconds,
    targetSeconds:COACH_FOCUS_TARGET_SECONDS,
    remainingSeconds:seconds===null?COACH_FOCUS_TARGET_SECONDS:
      Math.max(0,COACH_FOCUS_TARGET_SECONDS-seconds),
    offerWrapUp:seconds!==null&&seconds>=17*60,
    targetReached:seconds!==null&&seconds>=COACH_FOCUS_TARGET_SECONDS
  })
}
export function coachTimeboxPrompt(state){
  if(!state||state.phase==='not_started')return ''
  if(state.phase==='flexible_close'||state.phase==='closing')return [
    'A NON-AUTHORITATIVE browser active-time hint suggests the 20-minute target is near or reached.',
    'Answer the client latest question first. Invite a gentle close by reflecting ONLY confirmed client words',
    'and asking what has become clearer or what remains open. A partial outcome is valid.',
    'Ask whether the client wants to close, pause, or continue; NEVER claim time is up or end a conversation by force.',
    'Do not invent commitments, achievements or clinical insights, even at the time target.'
  ].join(' ')
  if(state.phase==='integration')return [
    'The optional 20-minute time target is approaching. After responding naturally,',
    'invite the client to notice an insight, useful distinction or tentative option.',
    'Do not impose an exercise, rushed solution or a predetermined step.'
  ].join(' ')
  if(state.phase==='focus')return [
    'A short-session format is intended: align with ONE client-chosen topic and desired usefulness,',
    'without forcing goals, measures or a questionnaire. Listen first.'
  ].join(' ')
  return 'Explore one specific example, reflect rather than interview, and adapt to the client needs.'
}
