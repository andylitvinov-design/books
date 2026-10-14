// Client-side navigation for the private My Course testing phase.
// Course membership/order comes from the authenticated course API, never the
// account-wide battery or a URL containing private selections.
import { getDefinitionById } from '../assessments/definitions.js'
import { buildExplorerEntries } from '../assessments/test-explorer.js'

export function courseTestKeys(state, { testingOnly = false } = {}) {
  if (!state?.course || ![2, 3, 4].includes(state.course.stage) ||
      (testingOnly && state.course.stage !== 2)) return []
  return [...new Set((state.course.testKeys || []).filter(key => typeof key === 'string'))]
}

export function coursePendingKeys(state) {
  const chosen = courseTestKeys(state, { testingOnly: true })
  const status = new Map((state?.assessments?.selectedTests || []).map(item => [item.key, item]))
  // Missing server status is NOT proof that a test was completed.
  return chosen.filter(key => !status.get(key)?.completed)
}

export function isCourseTest(state, key) {
  return courseTestKeys(state, { testingOnly: true }).includes(key)
}

export function groupCourseTestRows(rows, state) {
  const keys = courseTestKeys(state)
  const byKey = new Map((rows || []).map(row => [row.key, row]))
  const chosen = new Set(keys)
  return {
    course: keys.map(key => byKey.get(key)).filter(Boolean),
    other: (rows || []).filter(row => !chosen.has(row.key)),
  }
}

export async function startOrResumeCourseTest({ courseState, key, locale = 'en', request }) {
  if (!isCourseTest(courseState, key)) throw new Error('COURSE_TEST_SELECTION_REQUIRED')
  if (typeof request !== 'function') throw new Error('COURSE_UNAVAILABLE')
  const snapshot = await request('bootstrap')
  const ids = [
    ...(snapshot.activeTestPlan?.definitionIds || []),
    ...(snapshot.latestTestPlan?.definitionIds || []),
  ]
  let definition = null
  for (const id of ids) {
    try {
      const candidate = getDefinitionById(id)
      if (candidate.key === key) { definition = candidate; break }
    } catch { /* Previous test catalog versions may no longer be available. */ }
  }
  if (!definition) {
    definition = buildExplorerEntries({ locale, audience: 'account' })
      .find(item => item.key === key && item.selectable)?.definition || null
  }
  if (!definition) throw new Error('COURSE_TEST_UNAVAILABLE')
  const existing = (snapshot.runs || []).find(run => run.definitionId === definition.id &&
    ['draft', 'in_progress'].includes(run.status))
  if (existing) return existing
  return request('runs', {
    definitionKey: definition.key,
    definitionVersion: definition.version,
    instrumentLocale: definition.instrumentLocale,
    operationId: crypto.randomUUID(),
  })
}


/** Day-14 retest: refresh the authenticated cycle at click time. A query
 * parameter alone never grants access to another person's course battery.
 * New runs remain ordinary owner-scoped My Tests results, not a parallel DB.
 */
export async function startOrResumeCourseFinalRetest({ key, locale = 'en', request }) {
  if (typeof request !== 'function' || typeof key !== 'string') throw new Error('COURSE_UNAVAILABLE')
  const today = await request('course/today?locale=' + encodeURIComponent(locale))
  const item = today?.finalRetest?.tests?.find(row => row.key === key)
  if (!today?.finalRetest?.ready || !item?.canRepeat) throw new Error('COURSE_RETEST_NOT_AVAILABLE')
  // A translated interface must not switch the test's original instrument
  // language, which would make repeated scores falsely incomparable.
  const entry = buildExplorerEntries({ locale:item.instrumentLocale || locale, audience: 'account' })
    .find(row => row.key === key && row.selectable && row.definitionVersion === item.definitionVersion &&
      row.definition?.instrumentLocale === item.instrumentLocale)
  if (!entry?.definition) throw new Error('COURSE_TEST_UNAVAILABLE')
  const definition = entry.definition
  const snapshot = await request('bootstrap')
  const existing = (snapshot.runs || []).find(run => run.definitionId === definition.id &&
    ['draft', 'in_progress'].includes(run.status))
  if (existing) return existing
  return request('runs', {
    definitionKey: definition.key, definitionVersion: definition.version,
    instrumentLocale: definition.instrumentLocale, operationId: crypto.randomUUID(),
  })
}
