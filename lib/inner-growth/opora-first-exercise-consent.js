// Invitation is deliberately separate from the exercise. A return from the
// safety dialog, stale UI event or generic Continue must never opt someone in.
export function needsOporaFirstExerciseConsent({day,moment,hasSaved=false,reviewOnly=false}={}){
  return Number(day)===1&&moment==='arrive'&&!hasSaved&&!reviewOnly
}
export function canAdvanceOporaFirstExercise({ready=false,...context}={}){
  return !needsOporaFirstExerciseConsent(context)||ready===true
}
