import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  courseCompletion21, saveCourseContinuation, COURSE_COMPLETION_21_VERSION,
  COURSE_CONTINUATION_21_VERSION, COURSE_CONTINUATION_21_CONSENT_VERSION,
} from '../lib/inner-growth/course-completion-21.js'
import {
  createCourseJourney, checkInBeforeLesson, dailyLesson, finishCourseDay,
} from '../lib/inner-growth/course-progression-21.js'

const NOW = '2026-10-12T12:00:00.000Z'
const atDay = day => new Date(Date.parse(NOW) + (day - 1) * 86400000).toISOString()
const lessonFor = (track, day, locale = 'en', variant = 'standard') => ({
  id: `synthetic:${track}:${day}`, version: 'synthetic-content-v1', domain: track, day, variant, length: variant,
  title: locale === 'ru' ? `Учебная практика ${day}` : `Synthetic lesson ${day}`,
  aphorism: 'Synthetic reflection', ritual: 'Synthetic action', reflection: 'Synthetic question',
  sections: ['arrive', 'learn', 'meditation', 'ritual', 'finish'].map(kind => ({ kind, text: `Synthetic ${locale} ${kind}` })),
  accessibility: { eyesOpen: true, naturalBreathing: true, stopAnytime: true },
})
const choices = { confirmed: true, durationDays: 21, topics: [
  { scaleId: 'synthetic:a', track: 'calm_regulation' },
  { scaleId: 'synthetic:b', track: 'inner_support' },
] }
function createJourney() {
  return createCourseJourney({ id: 'synthetic-journey', choices, consent: true, timeZone: 'UTC', contentVersion: 'synthetic-content-v1', now: NOW })
}
function finishJourney({ skipDays = [], checkins = {}, feedback = {}, times = atDay, endDay = 21 } = {}) {
  let journey = createJourney()
  for (let day = 1; day <= endDay; day++) {
    const now = times(day)
    journey = checkInBeforeLesson(journey, {
      day, skip: true, ...checkins[day], now, expectedRevision: journey.revision,
    })
    const lesson = dailyLesson(journey, { now, lessonFor, confirmAlternative: true }).lesson
    journey = finishCourseDay(journey, {
      day, lessonId: lesson?.id, status: skipDays.includes(day) ? 'skipped' : 'completed',
      feedback: feedback[day] ?? {}, now, expectedRevision: journey.revision, lessonFor, confirmAlternative: true,
    })
  }
  return journey
}
const save = (journey, options = {}) => saveCourseContinuation(journey, {
  practiceDays: [1], pace: 'own-pace', now: atDay(22), expectedRevision: journey.revision,
  consent: true, lessonFor, ...options,
})

test('completion is absent until the 21 learning days are resolved', () => {
  assert.equal(courseCompletion21(null), null)
  assert.equal(courseCompletion21(createJourney()), null)
  const unfinished = finishJourney({ endDay: 20 })
  assert.equal(courseCompletion21(unfinished, { lessonFor }), null)
  assert.equal(courseCompletion21({ ...unfinished, status: 'paused' }), null)
  assert.throws(() => save(unfinished), /FINISHED_COURSE_REQUIRED/)
})

test('all-completed archive reports deterministic three-week activity and exact lesson identities', () => {
  const journey = finishJourney({ feedback: { 2: { helpfulness: 'helpful' }, 17: { helpfulness: 'helpful' } } })
  const before = structuredClone(journey)
  const summary = courseCompletion21(journey, { lessonFor })
  assert.equal(summary.version, COURSE_COMPLETION_21_VERSION)
  assert.equal(summary.journeyId, journey.id)
  assert.equal(summary.contentVersion, journey.contentVersion)
  assert.equal(summary.durationDays, 21)
  assert.equal(summary.createdAt, NOW)
  assert.equal(summary.finishedAt, atDay(21))
  assert.deepEqual([summary.completedDays, summary.skippedDays, summary.resolvedDays], [21, 0, 21])
  assert.deepEqual(summary.weeks, [1, 2, 3].map(week => ({ week, fromDay: (week - 1) * 7 + 1, toDay: week * 7, completedDays: 7, skippedDays: 0, resolvedDays: 7 })))
  assert.equal(summary.completedLessons.length, 21)
  assert.equal(new Set(summary.completedLessons.map(ref => ref.id)).size, 21)
  assert.deepEqual(summary.helpfulLessons.map(ref => ref.day), [2, 17])
  for (const ref of summary.completedLessons) {
    assert.equal(ref.lessonId, journey.sessions[ref.day].lessonId)
    assert.equal(ref.lessonVersion, journey.sessions[ref.day].lessonVersion)
    assert.equal(ref.lessonVariant, journey.sessions[ref.day].lessonVariant)
    assert.equal(ref.track, journey.sessions[ref.day].track)
    assert.equal(ref.replayable, true)
  }
  assert.deepEqual(courseCompletion21(journey, { lessonFor }), summary)
  assert.deepEqual(journey, before)
  assert.equal(summary.formalAssessment, false)
  assert.equal(summary.progressMeaning, 'lessons-completed-not-health-improvement')
})

test('mixed skips and long calendar gaps retain actual learning-week counts', () => {
  const skipDays = [1, 3, 7, 10, 17, 18, 19, 20, 21]
  const journey = finishJourney({ skipDays, times: day => atDay(day * 3), feedback: {
    1: { helpfulness: 'helpful', comfort: 'uncomfortable', comment: 'Saved even on a skipped day' },
    2: { helpfulness: 'not-helpful', comfort: 'uncomfortable' },
    3: { helpfulness: 'not-helpful' },
    4: { helpfulness: 'helpful', reflectionAnswer: 'My own reflection' },
    8: { comment: 'My own comment', reflectionAnswer: 'Another reflection' },
    9: { comment: '  ', reflectionAnswer: '\n' },
  } })
  const summary = courseCompletion21(journey, { lessonFor })
  assert.deepEqual([summary.completedDays, summary.skippedDays, summary.resolvedDays], [12, 9, 21])
  assert.deepEqual(summary.weeks.map(week => [week.completedDays, week.skippedDays, week.resolvedDays]), [[4, 3, 7], [6, 1, 7], [2, 5, 7]])
  assert.deepEqual(summary.feedback, { helpfulDays: 1, notHelpfulDays: 1, uncomfortableDays: 1 })
  assert.deepEqual(summary.helpfulLessons.map(ref => ref.day), [4])
  assert.equal(summary.completedLessons.some(ref => skipDays.includes(ref.day)), false)
  assert.deepEqual(summary.journal, { entryDays: 3, commentDays: 2, reflectionDays: 2 })
  assert.equal(summary.finishedAt, atDay(63))
  assert.equal(JSON.stringify(summary).includes('My own'), false)
  assert.throws(() => save(journey, { practiceDays: [1], now: atDay(64) }), /EXACT_COMPLETED_LESSON_REQUIRED/)
})

test('zero answers or all skips invent no subjective comparison, helpfulness, or journal entries', () => {
  const journey = finishJourney({ skipDays: Array.from({ length: 21 }, (_, index) => index + 1) })
  const summary = courseCompletion21(journey)
  assert.deepEqual([summary.completedDays, summary.skippedDays, summary.resolvedDays], [0, 21, 21])
  assert.equal(summary.subjectiveCheckins, null)
  assert.deepEqual(summary.helpfulLessons, [])
  assert.deepEqual(summary.completedLessons, [])
  assert.deepEqual(summary.feedback, { helpfulDays: 0, notHelpfulDays: 0, uncomfortableDays: 0 })
  assert.deepEqual(summary.journal, { entryDays: 0, commentDays: 0, reflectionDays: 0 })
  assert.equal(summary.continuationPlan, null)
  const paused = save(journey, { pace: 'pause', practiceDays: [], lessonFor: undefined })
  assert.equal(paused.status, 'finished')
  assert.equal(paused.continuationPlan.pace, 'pause')
})

test('subjective checkins expose only explicit first/latest answers, including zero', () => {
  const journey = finishJourney({ checkins: {
    1: { skip: true, wellbeing: 7, energy: 'ample' },
    2: { skip: false, wellbeing: 0, energy: 'low' },
    4: { skip: false, wellbeing: 3 },
    8: { skip: false },
    20: { skip: false, wellbeing: 8, energy: 'usual', feelingChange: 'same' },
  } })
  const checkins = courseCompletion21(journey, { lessonFor }).subjectiveCheckins
  assert.deepEqual(checkins, {
    count: 3,
    initial: { day: 2, at: atDay(2), wellbeing: 0, energy: 'low', feelingChange: null },
    latest: { day: 20, at: atDay(20), wellbeing: 8, energy: 'usual', feelingChange: 'same' },
    measure: 'optional-subjective-checkin', formalAssessment: false,
  })
  assert.equal(Object.hasOwn(checkins, 'change'), false)
  const single = courseCompletion21(finishJourney({ checkins: { 7: { skip: false, energy: 'usual' } } })).subjectiveCheckins
  assert.equal(single.count, 1)
  assert.deepEqual(single.initial, single.latest)
  assert.notEqual(single.initial, single.latest)
})

test('English and Russian replay titles keep identical stored identities', () => {
  const journey = finishJourney({ checkins: { 3: { skip: false, availableTime: 'quick' } } })
  const english = courseCompletion21(journey, { lessonFor, locale: 'en' })
  const russian = courseCompletion21(journey, { lessonFor, locale: 'ru' })
  assert.match(english.completedLessons[0].title, /Synthetic/)
  assert.match(russian.completedLessons[0].title, /Учебная/)
  assert.deepEqual(english.completedLessons.map(ref => ref.id), russian.completedLessons.map(ref => ref.id))
  assert.equal(english.completedLessons[2].lessonVariant, 'quick')
  assert.throws(() => courseCompletion21(journey, { locale: 'de', lessonFor }), /INVALID_CONTENT_REQUEST/)
})

test('changed content version, identity, variant, track, day, or required content fails replay closed', () => {
  const journey = finishJourney({ feedback: { 1: { helpfulness: 'helpful' } } })
  const mutations = [
    { version: 'replacement-version' }, { id: 'replacement-id' }, { variant: 'quick' },
    { domain: 'energy_agency' }, { day: 2 }, { title: '' }, { sections: [] },
    { accessibility: { eyesOpen: true, naturalBreathing: true, stopAnytime: false } },
  ]
  for (const changes of mutations) {
    const changed = (...args) => ({ ...lessonFor(...args), ...changes })
    const summary = courseCompletion21(journey, { lessonFor: changed })
    assert.equal(summary.completedDays, 21)
    assert.equal(summary.helpfulLessons[0].replayable, false)
    assert.equal(summary.helpfulLessons[0].title, null)
    assert.equal(summary.helpfulLessons[0].lessonId, journey.sessions[1].lessonId)
    assert.throws(() => save(journey, { lessonFor: changed }), /EXACT_COMPLETED_LESSON_REQUIRED/)
  }
  for (const loader of [undefined, () => null, () => { throw new Error('Unavailable content') }]) {
    const summary = courseCompletion21(journey, { lessonFor: loader })
    assert.equal(summary.completedLessons.every(ref => !ref.replayable), true)
    assert.equal(summary.feedback.helpfulDays, 1)
  }
})

test('corrupt stored replay identity never substitutes a currently available practice', () => {
  const journey = finishJourney()
  for (const changes of [
    { lessonId: 'replaced' }, { lessonVersion: 'older-version' }, { lessonVariant: null },
    { track: 'energy_agency' },
  ]) {
    const changed = structuredClone(journey)
    Object.assign(changed.sessions[1], changes)
    assert.equal(courseCompletion21(changed, { lessonFor }).completedLessons[0].replayable, false)
    assert.throws(() => save(changed), /EXACT_COMPLETED_LESSON_REQUIRED/)
  }
  const changed = { ...journey, contentVersion: 'changed-journey-version' }
  assert.equal(courseCompletion21(changed, { lessonFor }).completedLessons.every(ref => !ref.replayable), true)
})

test('an explicit plan records bounded exact references and separate consent without changing the course archive', () => {
  const journey = finishJourney()
  const before = structuredClone(journey)
  const selected = [21, 1, 8]
  const next = save(journey, { practiceDays: selected, pace: 'occasional' })
  assert.deepEqual(journey, before)
  assert.deepEqual(selected, [21, 1, 8])
  assert.equal(next.status, 'finished')
  assert.equal(next.nextDay, 22)
  assert.equal(next.revision, journey.revision + 1)
  assert.equal(next.updatedAt, atDay(22))
  assert.deepEqual(next.sessions, journey.sessions)
  assert.deepEqual(next.checkins, journey.checkins)
  assert.deepEqual(next.topics, journey.topics)
  assert.deepEqual(next.preferences, journey.preferences)
  assert.equal(next.continuationPlan.version, COURSE_CONTINUATION_21_VERSION)
  assert.equal(next.continuationPlan.consent, true)
  assert.equal(next.continuationPlan.consentVersion, COURSE_CONTINUATION_21_CONSENT_VERSION)
  assert.equal(next.continuationPlan.savedAt, atDay(22))
  assert.equal(next.continuationPlan.pace, 'occasional')
  assert.deepEqual(next.continuationPlan.practiceRefs.map(ref => ref.day), [1, 8, 21])
  assert.equal(next.continuationPlan.practiceRefs.every(ref => !Object.hasOwn(ref, 'title') && !Object.hasOwn(ref, 'replayable')), true)
  const summary = courseCompletion21(next, { lessonFor })
  assert.equal(summary.continuationPlan.practiceRefs.every(ref => ref.replayable), true)
  assert.equal(summary.finishedAt, atDay(21))
  assert.deepEqual(summary.completedLessons.map(ref => ref.id), courseCompletion21(journey, { lessonFor }).completedLessons.map(ref => ref.id))
})

test('accepted identical plan commands still increment revision; HTTP operation IDs own idempotency', () => {
  const initial = save(finishJourney())
  const next = save(initial, { now: initial.updatedAt })
  assert.equal(next.revision, initial.revision + 1)
  assert.deepEqual(next.continuationPlan, initial.continuationPlan)
  assert.deepEqual(next.sessions, initial.sessions)
  const paused = save(next, { pace: 'pause', practiceDays: [], now: atDay(23) })
  assert.equal(paused.revision, next.revision + 1)
  assert.equal(paused.status, 'finished')
  assert.deepEqual(paused.continuationPlan.practiceRefs, [])
})

test('plan mutations reject stale revisions, backwards timestamps, absent consent, and invalid choices without writes', () => {
  const journey = finishJourney()
  const before = structuredClone(journey)
  for (const [options, error] of [
    [{ expectedRevision: journey.revision - 1 }, /STALE_COURSE_REVISION/],
    [{ expectedRevision: String(journey.revision) }, /STALE_COURSE_REVISION/],
    [{ now: atDay(20) }, /NON_MONOTONIC_TIME/],
    [{ now: 'bad-time' }, /INVALID_TIME/],
    [{ consent: false }, /CONTINUATION_CONSENT_REQUIRED/],
    [{ consent: 'true' }, /CONTINUATION_CONSENT_REQUIRED/],
    [{ pace: 'daily' }, /INVALID_CONTINUATION_PLAN/],
    [{ practiceDays: [] }, /INVALID_CONTINUATION_PLAN/],
    [{ pace: 'occasional', practiceDays: [] }, /INVALID_CONTINUATION_PLAN/],
    [{ pace: 'pause', practiceDays: [1] }, /INVALID_CONTINUATION_PLAN/],
    [{ practiceDays: [1, 2, 3, 4] }, /INVALID_CONTINUATION_PLAN/],
    [{ practiceDays: [1, 1] }, /INVALID_CONTINUATION_PLAN/],
    [{ practiceDays: ['1'] }, /INVALID_CONTINUATION_PLAN/],
    [{ practiceDays: [0] }, /INVALID_CONTINUATION_PLAN/],
    [{ practiceDays: [22] }, /INVALID_CONTINUATION_PLAN/],
    [{ practiceDays: [1.5] }, /INVALID_CONTINUATION_PLAN/],
    [{ practiceDays: null }, /INVALID_CONTINUATION_PLAN/],
    [{ lessonFor: undefined }, /EXACT_COMPLETED_LESSON_REQUIRED/],
  ]) assert.throws(() => save(journey, options), error)
  assert.deepEqual(journey, before)
})

test('saved plans preserve exact identities when content later disappears and views never mutate the archive', () => {
  const journey = save(finishJourney())
  const before = structuredClone(journey)
  const changed = (...args) => ({ ...lessonFor(...args), variant: 'grounding' })
  const unavailable = courseCompletion21(journey, { lessonFor: changed })
  const ref = unavailable.continuationPlan.practiceRefs[0]
  assert.equal(ref.replayable, false)
  assert.equal(ref.title, null)
  assert.equal(ref.lessonVariant, 'standard')
  assert.equal(ref.id, journey.continuationPlan.practiceRefs[0].id)
  unavailable.continuationPlan.practiceRefs[0].lessonId = 'modified-view'
  unavailable.helpfulLessons.push({ day: 99 })
  assert.deepEqual(journey, before)
  assert.equal(courseCompletion21(journey, { lessonFor }).continuationPlan.practiceRefs[0].replayable, true)
})

test('invalid finished-state claims cannot produce a completion archive or save a plan', () => {
  const journey = finishJourney()
  const missing = structuredClone(journey)
  delete missing.sessions[21]
  const invalidStatus = structuredClone(journey)
  invalidStatus.sessions[21].status = 'available'
  const duplicateDay = structuredClone(journey)
  duplicateDay.sessions[21].day = 20
  const reversedTime = structuredClone(journey)
  reversedTime.sessions[21].at = atDay(1)
  for (const invalid of [missing, invalidStatus, duplicateDay, reversedTime, { ...journey, nextDay: 21 }]) {
    assert.throws(() => courseCompletion21(invalid, { lessonFor }), /INVALID_FINISHED_JOURNEY/)
    assert.throws(() => save(invalid), /INVALID_FINISHED_JOURNEY/)
  }
})

test('completion source has no assessment-loader dependency or generated health interpretation', async () => {
  const source = await readFile(new URL('../lib/inner-growth/course-completion-21.js', import.meta.url), 'utf8')
  assert.equal(/import[^\n]*(?:assessment|interpretation|supabase)/i.test(source), false)
  const summary = courseCompletion21(finishJourney(), { lessonFor })
  for (const field of ['healthScore', 'healthRating', 'diagnosis', 'improvement', 'meaning', 'interpretation', 'norm', 'causality']) {
    assert.equal(Object.hasOwn(summary, field), false)
  }
})
