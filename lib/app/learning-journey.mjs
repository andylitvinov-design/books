// Participation-only rewards. Never infer clinical improvement or professional rights from XP.
// Each milestone is calculated from persisted, authenticated account-owned records.
export const JOURNEY_MAX_XP = 540
export const JOURNEY_LEVELS = Object.freeze([0, 60, 180, 310, 500])

function int(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : 0
}

export function summarizeLearningJourney(evidence = {}) {
  const tests = Math.min(3, int(evidence.completedTests))
  const course = evidence.freeCourseCompleted === true
  // "Requested" is deliberately not "attended" or "completed".
  const consultationRequested = evidence.freeConsultationRequested === true
  const status = ['submitted', 'changes_requested', 'approved'].includes(evidence.practitionerStatus)
    ? evidence.practitionerStatus : null
  const approved = status === 'approved' && evidence.practitionerActive === true
  const applied = status !== null
  const drafted = evidence.hasAuthoredCourse === true
  const published = approved && drafted && evidence.hasPublishedCourse === true

  const xp = tests * 30 + (course ? 130 : 0) + (consultationRequested ? 20 : 0) +
    (approved ? 100 : applied ? 45 : 0) + (drafted ? 120 : 0) + (published ? 80 : 0)
  let level = xp >= 310 ? 4 : xp >= 180 ? 3 : xp >= 60 ? 2 : 1
  // A professional badge is granted by approval, never merely by earning points.
  if (xp >= 500 && approved && published) level = 5

  const steps = [
    { id: 'tests', done: tests === 3, count: tests, target: 3, earned: tests * 30, reward: 90 },
    { id: 'course', done: course, earned: course ? 130 : 0, reward: 130 },
    { id: 'consultation', done: consultationRequested,
      requested: consultationRequested, attended: false,
      earned: consultationRequested ? 20 : 0, reward: 20 },
    { id: 'master', done: approved, applied, approved,
      earned: approved ? 100 : applied ? 45 : 0, reward: 100 },
    { id: 'author', done: published, drafted, published,
      earned: (drafted ? 120 : 0) + (published ? 80 : 0), reward: 200 },
  ]
  const next = steps.find(item => !item.done && !(item.id === 'master' && applied)) ||
    steps.find(item => !item.done) || null
  return { version: 1, xp, maxXp: JOURNEY_MAX_XP, level,
    testsCompleted: tests, courseCompleted: course, consultationRequested,
    practitionerStatus: status, practitionerApproved: approved, authoredDraft: drafted,
    authoredPublished: published, steps, nextId: next?.id || null }
}
