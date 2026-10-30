import 'server-only'
import { verifiedHistoryView } from '../assessments/verified-history.js'
import { buildDevelopmentPlan, normalizeDevelopmentGoals } from '../profile/development-program.js'

// The caller owns authorization and separate consent for goals and results.
// Return only the public programme identifier, never raw private inputs.
export function projectDevelopmentCourse({ results, accountId, snapshot, now = Date.now() } = {}) {
  if (!Array.isArray(results) || typeof accountId !== 'string' || !accountId ||
      !snapshot || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 || !Number.isFinite(now))
    throw new Error('INVALID_DEVELOPMENT_PLAN')
  if (snapshot.revision === 0) return { courseId: null }
  const goals = normalizeDevelopmentGoals(snapshot.goals)
  if (!goals) throw new Error('INVALID_DEVELOPMENT_PLAN')
  const own = results.filter(row => row?.accountId === accountId &&
    Number.isFinite(Date.parse(row.measurementAt)) && Date.parse(row.measurementAt) <= now)
  const current = verifiedHistoryView(own).current
  const plan = buildDevelopmentPlan({ results: current, goals, now })
  const eligible = plan.courses.find(course => course.id === 'stress' && course.available === true)
  return { courseId: eligible ? 'stress' : null }
}
