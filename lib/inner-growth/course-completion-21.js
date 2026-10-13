// A factual archive of the 21 learning days. No assessment or interpretation I/O.
import { courseTrackForDay } from './course-progression-21.js'

export const COURSE_COMPLETION_21_VERSION = 'hh-growth-completion-21-v1'
export const COURSE_CONTINUATION_21_VERSION = 'hh-growth-continuation-21-v1'
export const COURSE_CONTINUATION_21_CONSENT_VERSION = 'hh-growth-continuation-consent-21-v1'

const fail = code => { throw new Error(code) }
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonblank = value => typeof value === 'string' && value.trim().length > 0
const timestamp = value => {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN
  if (!Number.isFinite(parsed)) fail('INVALID_TIME')
  return parsed
}

function finishedSessions(journey) {
  // Reuse the established journey guard without consulting any lesson library.
  courseTrackForDay(journey, 1)
  if (journey.status !== 'finished' || journey.nextDay !== 22 || !nonblank(journey.id) ||
    !record(journey.sessions) || !record(journey.checkins) || Object.keys(journey.sessions).length !== 21) {
    fail('INVALID_FINISHED_JOURNEY')
  }
  const created = timestamp(journey.createdAt), updated = timestamp(journey.updatedAt)
  if (updated < created) fail('INVALID_FINISHED_JOURNEY')
  const sessions = []
  let previous = created
  for (let day = 1; day <= 21; day++) {
    const session = journey.sessions[day]
    if (!record(session) || session.day !== day || !['completed', 'skipped'].includes(session.status)) {
      fail('INVALID_FINISHED_JOURNEY')
    }
    const at = timestamp(session.at)
    if (at < previous || at > updated) fail('INVALID_FINISHED_JOURNEY')
    previous = at
    sessions.push(session)
  }
  return sessions
}

function lessonReference(journey, session) {
  const ref = {
    day: session.day,
    track: session.track ?? null,
    lessonId: session.lessonId ?? null,
    lessonVersion: session.lessonVersion ?? null,
    lessonVariant: session.lessonVariant ?? null,
  }
  // Locale and mutable progress/revision are deliberately excluded from identity.
  const identity = [journey.id, ref.day, ref.track, ref.lessonId, ref.lessonVersion, ref.lessonVariant]
  return { id: `course-practice:${encodeURIComponent(JSON.stringify(identity))}`, ...ref }
}

function replayableLesson(journey, ref, locale, lessonFor) {
  if (typeof lessonFor !== 'function' || !nonblank(ref.lessonId) || !nonblank(ref.lessonVersion) ||
    ref.lessonVersion !== journey.contentVersion || !['standard', 'quick', 'grounding'].includes(ref.lessonVariant) ||
    ref.track !== courseTrackForDay(journey, ref.day)) return null
  let lesson
  // Missing archived content must not hide the factual completion summary.
  try { lesson = lessonFor(ref.track, ref.day, locale, ref.lessonVariant) }
  catch { return null }
  if (!lesson || lesson.id !== ref.lessonId || lesson.version !== ref.lessonVersion ||
    lesson.variant !== ref.lessonVariant || lesson.domain !== ref.track || lesson.day !== ref.day ||
    !['title', 'aphorism', 'ritual', 'reflection'].every(key => nonblank(lesson[key])) ||
    !Array.isArray(lesson.sections) || !['arrive', 'learn', 'meditation', 'ritual', 'finish'].every(kind =>
      lesson.sections.some(section => section?.kind === kind && nonblank(section.text))) ||
    lesson.accessibility?.eyesOpen !== true || lesson.accessibility?.naturalBreathing !== true ||
    lesson.accessibility?.stopAnytime !== true) return null
  return lesson
}

function subjectiveCheckins(journey, sessions) {
  const answers = sessions.flatMap(session => {
    const checkin = journey.checkins[session.day]
    if (!record(checkin) || checkin.skipped !== false || checkin.day !== session.day) return []
    const wellbeing = Number.isInteger(checkin.wellbeing) && checkin.wellbeing >= 0 && checkin.wellbeing <= 10 ? checkin.wellbeing : null
    const energy = ['low', 'usual', 'ample'].includes(checkin.energy) ? checkin.energy : null
    const feelingChange = ['better', 'same', 'worse'].includes(checkin.feelingChange) ? checkin.feelingChange : null
    if (wellbeing === null && energy === null && feelingChange === null) return []
    return [{ day: session.day, at: checkin.at, wellbeing, energy, feelingChange }]
  })
  if (!answers.length) return null
  return {
    count: answers.length,
    initial: { ...answers[0] },
    latest: { ...answers[answers.length - 1] },
    measure: 'optional-subjective-checkin',
    formalAssessment: false,
  }
}

const counts = sessions => ({
  completedDays: sessions.filter(session => session.status === 'completed').length,
  skippedDays: sessions.filter(session => session.status === 'skipped').length,
  resolvedDays: sessions.length,
})

function continuationView(plan, completedLessons) {
  if (!plan) return null
  const saved = structuredClone(plan)
  // Preserve archived references even if their content is no longer available.
  saved.practiceRefs = (Array.isArray(saved.practiceRefs) ? saved.practiceRefs : []).map(ref => {
    const current = completedLessons.find(candidate =>
      ['id', 'day', 'track', 'lessonId', 'lessonVersion', 'lessonVariant'].every(key => candidate[key] === ref[key]))
    return { ...ref, title: current?.title ?? null, replayable: current?.replayable === true }
  })
  return saved
}

/** Finished-course facts only; availability of interpretations is irrelevant. */
export function courseCompletion21(journey, { locale = 'en', lessonFor } = {}) {
  if (!journey || journey.status !== 'finished') return null
  if (!['en', 'ru'].includes(locale) || (lessonFor !== undefined && typeof lessonFor !== 'function')) fail('INVALID_CONTENT_REQUEST')
  const sessions = finishedSessions(journey)
  const completed = sessions.filter(session => session.status === 'completed')
  const completedLessons = completed.map(session => {
    const ref = lessonReference(journey, session)
    const lesson = replayableLesson(journey, ref, locale, lessonFor)
    return { ...ref, title: lesson?.title ?? null, replayable: lesson !== null }
  })
  const helpfulDays = new Set(completed.filter(session => session.feedback?.helpfulness === 'helpful').map(session => session.day))
  return {
    version: COURSE_COMPLETION_21_VERSION,
    journeyId: journey.id,
    contentVersion: journey.contentVersion,
    createdAt: journey.createdAt,
    finishedAt: sessions[20].at,
    durationDays: 21,
    ...counts(sessions),
    weeks: [1, 2, 3].map(week => ({
      week, fromDay: (week - 1) * 7 + 1, toDay: week * 7,
      ...counts(sessions.slice((week - 1) * 7, week * 7)),
    })),
    subjectiveCheckins: subjectiveCheckins(journey, sessions),
    feedback: {
      helpfulDays: helpfulDays.size,
      notHelpfulDays: completed.filter(session => session.feedback?.helpfulness === 'not-helpful').length,
      uncomfortableDays: completed.filter(session => session.feedback?.comfort === 'uncomfortable').length,
    },
    journal: {
      entryDays: sessions.filter(session => nonblank(session.feedback?.comment) || nonblank(session.feedback?.reflectionAnswer)).length,
      commentDays: sessions.filter(session => nonblank(session.feedback?.comment)).length,
      reflectionDays: sessions.filter(session => nonblank(session.feedback?.reflectionAnswer)).length,
    },
    completedLessons,
    helpfulLessons: completedLessons.filter(ref => helpfulDays.has(ref.day)).map(ref => ({ ...ref })),
    continuationPlan: continuationView(journey.continuationPlan, completedLessons),
    formalAssessment: false,
    progressMeaning: 'lessons-completed-not-health-improvement',
  }
}

/** Saves an explicitly chosen plan; never starts a new course or changes history. */
export function saveCourseContinuation(journey, {
  practiceDays = [], pace = 'own-pace', now, expectedRevision, consent = false, locale = 'en', lessonFor,
} = {}) {
  if (journey?.status !== 'finished') fail('FINISHED_COURSE_REQUIRED')
  finishedSessions(journey)
  if (journey.revision !== expectedRevision) fail('STALE_COURSE_REVISION')
  if (timestamp(now) < timestamp(journey.updatedAt)) fail('NON_MONOTONIC_TIME')
  if (consent !== true) fail('CONTINUATION_CONSENT_REQUIRED')
  if (!['own-pace', 'occasional', 'pause'].includes(pace) || !Array.isArray(practiceDays) ||
    practiceDays.length > 3 || practiceDays.some(day => !Number.isInteger(day) || day < 1 || day > 21) ||
    new Set(practiceDays).size !== practiceDays.length ||
    (pace === 'pause' ? practiceDays.length !== 0 : practiceDays.length === 0)) fail('INVALID_CONTINUATION_PLAN')
  const summary = courseCompletion21(journey, { locale, lessonFor })
  const practiceRefs = [...practiceDays].sort((a, b) => a - b).map(day => {
    const ref = summary.completedLessons.find(candidate => candidate.day === day)
    if (!ref?.replayable) fail('EXACT_COMPLETED_LESSON_REQUIRED')
    // Save identity, not translated titles or a stale availability flag.
    return lessonReference(journey, journey.sessions[day])
  })
  const next = structuredClone(journey)
  next.revision++
  next.updatedAt = now
  next.continuationPlan = {
    version: COURSE_CONTINUATION_21_VERSION,
    consent: true,
    consentVersion: COURSE_CONTINUATION_21_CONSENT_VERSION,
    pace,
    practiceRefs,
    savedAt: now,
  }
  return next
}
