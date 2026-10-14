import { COURSE_ENTRY_INTENT_KEY, makeCourseEntryIntent, parseCourseEntryIntent } from './course-entry-intent.js'

// Temporary SAME-TAB navigation between the public picker and consent screen.
// Only selected editorial categories/test IDs; never course records, scores,
// answers, free text or the signed-in user's information.
export function storeCourseEntryIntent(entries, preferences) {
  try {
    window.sessionStorage.setItem(COURSE_ENTRY_INTENT_KEY, makeCourseEntryIntent(entries, preferences))
    return true
  } catch { return false }
}

export function readCourseEntryIntent() {
  try {
    const intent = parseCourseEntryIntent(window.sessionStorage.getItem(COURSE_ENTRY_INTENT_KEY))
    if (!intent) window.sessionStorage.removeItem(COURSE_ENTRY_INTENT_KEY)
    return intent
  } catch { return null }
}

export function discardCourseEntryIntent() {
  try { window.sessionStorage.removeItem(COURSE_ENTRY_INTENT_KEY) } catch { /* private mode */ }
}
