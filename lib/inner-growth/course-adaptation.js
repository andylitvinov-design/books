// OPORA 1.5: deterministic EDUCATIONAL suggestions, not diagnoses or treatment decisions.
// Nothing here mutates a person's goal, practice or account preference.
export const PRACTICE_CHOICES = Object.freeze(['keep','simplify','neutral','skip'])

export function practiceAdjustmentSuggestion({comfort=null,usefulness=null,flexibility=null,tooDemanding=false}={}) {
  if (comfort==='uncomfortable') return {kind:'stop',reason:'safety_first'}
  if (tooDemanding===true) return {kind:'simplify',reason:'too_demanding'}
  if (comfort===null||comfort==='skip') return null
  if (comfort==='comfortable'&&(usefulness==='useful'||flexibility==='more_choice'))
    return {kind:'keep',reason:'self_reported_acceptable'}
  if (comfort==='neutral'&&usefulness==='unchanged')
    return {kind:'simplify',reason:'optional_lower_load'}
  if (comfort==='comfortable'&&usefulness==='unchanged')
    return {kind:'neutral',reason:'optional_alternative'}
  return null
}

export function effectiveLessonPreferences(preferences={},priorChosenAdaptation=null) {
  const base={...preferences,length:preferences.length==='quick'?'quick':'standard',
    imagery:preferences.imagery==='no_imagery'?'no_imagery':'optional'}
  if(priorChosenAdaptation==='simplify')return {...base,length:'quick'}
  if(priorChosenAdaptation==='neutral')return {...base,imagery:'no_imagery'}
  return base
}
