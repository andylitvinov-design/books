// My Course v3 — deterministic practice schedule, not a clinical or AI triage algorithm.
// One approved scale is rehearsed across the fortnight; all other selected
// scales are revisited without becoming the new "main goal" every morning.
// Existing v2 cycles retain the legacy round-robin, keyed by content_version.
export const COURSE_CONTENT_V3 = 'hh-growth-v3-20261013'
export const V3_CORE_DAYS = Object.freeze([1, 2, 4, 6, 9, 14])
export const V3_SUPPORT_DAYS = Object.freeze(
  Array.from({length:14},(_,index)=>index+1).filter(day=>!V3_CORE_DAYS.includes(day))
)

export function v3FocusChoiceIndex(day, choiceCount) {
  if (!Number.isInteger(day) || day<1 || day>14 ||
      !Number.isInteger(choiceCount) || choiceCount<1 || choiceCount>5) return null
  if (choiceCount===1 || V3_CORE_DAYS.includes(day)) return 0
  return 1 + (V3_SUPPORT_DAYS.indexOf(day)%(choiceCount-1))
}

// Descriptive participation feedback, never a diagnosis, crisis score or
// autonomous change to a course. The client decides how to proceed.
export function v3ReturnSuggestion({day, sessions=[]}={}) {
  if (!Number.isInteger(day) || day<1 || day>14) return null
  const earlier=(Array.isArray(sessions)?sessions:[])
    .filter(item=>Number.isInteger(item.day)&&item.day<day&&item.day>=1)
    .sort((a,b)=>b.day-a.day)[0]
  if (earlier?.feedback==='uncomfortable') return 'gentle'
  if (day>=4 && (!earlier || day-earlier.day>2)) return 'restart'
  return null
}
