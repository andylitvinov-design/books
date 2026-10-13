import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getAssessmentDefinition, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { CURRICULUM_21 } from '../data/inner-growth/curriculum-21.js'
import { PERSONAL_COURSE_PILOT_DRAFT_BUNDLE, getPersonalCoursePilotContent } from '../data/inner-growth/course-personal-practices-v2.js'
import { PERSONAL_LESSON_FRAME_VERSION, PERSONAL_LESSON_FRAME_STATUS, PERSONAL_LESSON_FRAMES } from '../data/inner-growth/course-personal-lesson-frame-v2.js'
import { createCourseJourney } from '../lib/inner-growth/course-progression-21.js'
import { createPersonalCourseRuntimeAdapter, PERSONAL_COURSE_RUNTIME_VERSION } from '../lib/inner-growth/course-personal-runtime-v2.js'

// Entirely synthetic trusted-registry fixtures. These tests do not approve the
// shipped pilot, framing, mapping or translation for production delivery.
const NOW = '2026-10-12T12:00:00.000Z'
const atDay = day => new Date(Date.parse(NOW) + (day - 1) * 86400000).toISOString()
const clone = value => structuredClone(value)
const REF_KEYS = ['objectiveId', 'skillId', 'practiceId', 'contentVersion', 'contentLocale', 'variant', 'durationMinutes', 'intensity', 'reviewStatus', 'minimumEntry']
const ref = card => Object.fromEntries(REF_KEYS.map(key => [key, card[key]]))
const DIMENSIONS = [
  ['hh-resource-pulse', 'resource.energy', 'energy_agency'],
  ['hh-resource-pulse', 'resource.self_support', 'inner_support'],
  ['hh-weekly-pulse', 'weekly.tension', 'calm_regulation'],
]
function evidence(key, dimensionKey) {
  const definition = getAssessmentDefinition(key, 'v1', 'ru')
  const dimensions = scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))).dimensions
  const dimension = dimensions.find(row => row.key === dimensionKey)
  const identity = { ...provenance(definition), dimensionKey }
  return { ...dimension, value: 3, identity, scaleId: `${definition.id}/${dimensionKey}`,
    resultId: `synthetic-result:${definition.id}`, measurementAt: NOW, resultStatus: 'completed', verificationStatus: 'verified',
    referenceStatus: 'synthetic-no-norm', interpretation: { identity: clone(identity), value: 3, status: 'available',
      version: 'synthetic-report-v1', contentHash: 'b'.repeat(64), source: 'synthetic-test-only', meaning: 'Synthetic interpretation.' } }
}
function fixture() {
  const scales = DIMENSIONS.map(([key, dim]) => evidence(key, dim)), contents = new Map()
  function card(day, dimensionKey, topicId, locale, variant) {
    const route = CURRICULUM_21.route[day - 1], review = route.review
    const action = locale === 'ru' ? `Учебное действие ${dimensionKey}, день ${day}, вариант ${variant}.` : `Synthetic action ${dimensionKey}, day ${day}, variant ${variant}.`
    return {
      practiceId: `synthetic/${dimensionKey}/${day}/${variant}/${locale}`, skillId: `synthetic-skill/${dimensionKey}`,
      objectiveId: `${CURRICULUM_21.version}/day/${day}`, day, week: route.week,
      kind: review ? 'whole-goal-review' : 'practice', topicId, dimensionKey: review ? null : dimensionKey,
      contentVersion: 'synthetic-personal-content-v1', contentLocale: locale, variant,
      durationMinutes: variant === 'standard' ? 5 : 2, intensity: 'gentle', minimumEntry: true,
      reviewStatus: 'reviewed', contentStatus: 'REVIEWED', curriculumVersion: CURRICULUM_21.version,
      sharedObjective: route.objective[locale], title: `${route.skill[locale]} ${dimensionKey} ${variant}`,
      entry: `Synthetic entry ${locale}.`, safety: `Synthetic optional-stop safety ${locale}.`,
      steps: variant === 'standard' ? ['Synthetic preparation.', action] : [action], action,
      stoppingPoint: `Synthetic stopping point ${locale}.`, finish: `Synthetic finish ${locale}.`,
      optionalReflection: variant === 'standard' ? `Synthetic reflection ${locale}?` : null,
      optionalTransfer: variant === 'standard' ? `Synthetic transfer ${locale}.` : null,
      source: 'SYNTHETIC TEST ONLY', practiceMethod: `${dimensionKey}/${variant}`,
      alternativeDifference: variant === 'alternative' ? `Distinct synthetic method ${locale}.` : null,
      accessibility: { eyesOpen: true, naturalBreathing: true, stopAnytime: true },
      ...(review ? { coversAllSelectedGoals: true, reviewScope: 'all-selected-goals', includesUnpractisedGoals: true } : {}),
    }
  }
  function cardsFor(dim, topic, days) {
    return days.flatMap(day => ['en', 'ru'].flatMap(locale => ['standard', 'short', ...(day === 5 ? ['alternative'] : [])].map(variant => {
      const value = card(day, dim, topic, locale, variant)
      contents.set(value.practiceId, value)
      return ref(value)
    })))
  }
  const practiceDays = Array.from({ length: 21 }, (_, index) => index + 1).filter(day => day % 7)
  const mappings = scales.map((scale, index) => ({ identity: clone(scale.identity), topicId: DIMENSIONS[index][2],
    mappingVersion: `synthetic-mapping/${scale.identity.dimensionKey}`, status: 'reviewed', source: 'SYNTHETIC MAPPING REVIEW',
    curriculumVersion: CURRICULUM_21.version, practices: cardsFor(scale.identity.dimensionKey, DIMENSIONS[index][2], practiceDays) }))
  const reviewMapping = { mappingVersion: 'synthetic-review-map', status: 'reviewed', source: 'SYNTHETIC REVIEW MAPPING',
    curriculumVersion: CURRICULUM_21.version, coversAllSelectedGoals: true, practices: cardsFor('all-goals', null, [7, 14, 21]) }
  const registry = { id: 'synthetic-registry', version: 'synthetic-registry-v1', contentVersion: 'synthetic-personal-content-v1',
    status: 'reviewed', source: 'SYNTHETIC TEST ONLY', mappings, reviewMapping,
    frameApproval: { version: PERSONAL_LESSON_FRAME_VERSION, status: 'reviewed', source: 'SYNTHETIC FRAME APPROVAL ONLY' },
    getContent(selector) { const found = contents.get(selector.practiceId); return found && found.contentVersion === selector.contentVersion && found.contentLocale === selector.contentLocale ? clone(found) : null },
  }
  const input = { id: 'synthetic-personal-journey', scales, selectedScaleIds: scales.map(row => row.scaleId),
    consent: true, uiLocale: 'en', loadMinutes: 5, timeZone: 'UTC', now: NOW }
  const adapter = createPersonalCourseRuntimeAdapter(registry)
  return { registry, contents, input, adapter }
}
function checked(f, state, day, extra = {}) {
  return f.adapter.checkIn(state, { day, skip: true, now: atDay(day), expectedRevision: state.journey.revision, ...extra })
}
function finish(f, state, day, options = {}) {
  const now = options.now ?? atDay(day)
  const view = f.adapter.dailyLesson(state, { now, ...options })
  return f.adapter.finishDay(state, { day, lessonId: view.lesson?.id, now,
    expectedRevision: state.journey.revision, expectedPlanRevision: state.plan.revision, ...options })
}
function through(f, endDay, options = {}) {
  let state = f.adapter.create({ ...f.input, ...options })
  for (let day = 1; day <= endDay; day++) state = finish(f, checked(f, state, day), day)
  return state
}
function deepFreeze(value) { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(deepFreeze) }; return value }

for (const locale of ['en', 'ru']) for (const loadMinutes of [2, 5]) test(`all 21 days ${locale}/${loadMinutes} minutes use exact slots and factual completion`, () => {
  const f = fixture()
  let state = f.adapter.create({ ...f.input, uiLocale: locale, loadMinutes })
  assert.equal(state.version, PERSONAL_COURSE_RUNTIME_VERSION)
  const originalTopics = clone(state.journey.topics)
  for (let day = 1; day <= 21; day++) {
    state = checked(f, state, day)
    const before = clone(state), view = f.adapter.dailyLesson(deepFreeze(state), { now: atDay(day), uiLocale: locale })
    assert.equal(view.status, 'ready', `day ${day}`)
    assert.equal(view.lesson.day, day)
    assert.equal(view.lesson.contentLocale, locale)
    assert.equal(view.lesson.durationSeconds, loadMinutes * 60)
    assert.equal(view.lesson.sections.reduce((sum, section) => sum + section.seconds, 0), loadMinutes * 60)
    assert.equal(view.lesson.variant, loadMinutes === 2 ? 'quick' : 'standard')
    assert.equal(view.lesson.preparedVariant, loadMinutes === 2 ? 'short' : 'standard')
    assert.equal(view.lesson.practiceReference.practiceId, view.slot.practiceId)
    assert.equal(view.lesson.sections.find(section => section.kind === 'meditation').text, view.preparedContent.steps.join('\n'))
    assert.ok(view.lesson.sections.find(section => section.kind === 'learn').text.length > 20)
    assert.equal(view.lesson.thoughtIsQuotation, false)
    if (day % 7 === 0) {
      assert.equal(view.track, null); assert.equal(view.lesson.domain, null); assert.equal(view.lesson.selectedScaleId, null)
      assert.deepEqual(view.relatedScaleIds, f.input.selectedScaleIds)
      assert.deepEqual(view.lesson.reviewScaleIds, f.input.selectedScaleIds)
      assert.equal(view.lesson.curriculum.reviewScope, 'all-selected-goals')
    } else assert.deepEqual(view.relatedScaleIds, [view.slot.selectedScaleId])
    state = finish(f, state, day)
    assert.deepEqual(before.journey.topics, originalTopics)
    assert.deepEqual(state.journey.topics, originalTopics)
    assert.deepEqual(state.journey.sessions[day].slot, view.slot)
    assert.deepEqual(state.journey.sessions[day].lessonSnapshot, view.lesson)
    assert.deepEqual(state.journey.sessions[day].preparedContent, view.preparedContent)
    assert.equal(state.journey.sessions[day].track, view.track)
    assert.deepEqual(f.adapter.reviewLesson(state, { day, uiLocale: locale }).lesson, view.lesson)
    assert.equal(state.journey.revision, day * 2)
  }
  const summary = f.adapter.completion(state, { uiLocale: locale })
  assert.equal(summary.completedDays, 21); assert.equal(summary.resolvedDays, 21); assert.equal(summary.skippedDays, 0)
  assert.equal(summary.completedLessons.filter(row => row.replayable).length, 21)
  assert.deepEqual(summary.weeks.map(row => row.completedDays), [7, 7, 7])
  assert.equal(summary.subjectiveCheckins, null)
  assert.equal(summary.formalAssessment, false)
  assert.equal(summary.progressMeaning, 'lessons-completed-not-health-improvement')
  assert.equal(f.adapter.status(state, atDay(22)).status, 'finished')
})

test('no registry and actual draft pilot are unavailable; caller flags cannot promote them', () => {
  const f = fixture()
  assert.throws(() => createPersonalCourseRuntimeAdapter().create({ ...f.input, verified: true, reviewed: true, registry: f.registry }), /REVIEWED_REGISTRY_REQUIRED/)
  const draft = { ...clone(PERSONAL_COURSE_PILOT_DRAFT_BUNDLE), getContent: getPersonalCoursePilotContent }
  assert.throws(() => createPersonalCourseRuntimeAdapter(draft).create(f.input), /REVIEWED_REGISTRY_REQUIRED/)
  assert.equal(PERSONAL_COURSE_PILOT_DRAFT_BUNDLE.status, 'draft')
  assert.equal(PERSONAL_LESSON_FRAME_STATUS, 'ORIGINAL_DRAFT_REVIEW_REQUIRED')
  assert.equal(PERSONAL_LESSON_FRAMES.length, 21)
  for (const field of ['frameApproval', 'getContent', 'source']) {
    const registry = { ...f.registry }; delete registry[field]
    assert.throws(() => createPersonalCourseRuntimeAdapter(registry).create(f.input), /REVIEWED_REGISTRY_REQUIRED/)
  }
})

test('draft prepared records, mismatched identifiers, versions, objectives, dimensions and safety fail closed', () => {
  for (const [field, value] of [['reviewStatus', 'draft'], ['contentStatus', 'ORIGINAL_DRAFT_REVIEW_REQUIRED'], ['practiceId', 'wrong'],
    ['contentVersion', 'wrong'], ['contentLocale', 'ru'], ['objectiveId', 'wrong'], ['dimensionKey', 'wrong'], ['topicId', 'wrong'],
    ['sharedObjective', 'wrong'], ['durationMinutes', 8], ['steps', []], ['accessibility', {}]]) {
    const f = fixture(), first = f.adapter.create(f.input).plan.slots[0]
    f.contents.get(first.practiceId)[field] = value
    assert.throws(() => f.adapter.create({ ...f.input, verified: true, reviewed: true }), /EXACT_PREPARED_CONTENT_REQUIRED/, field)
  }
})

test('active exact-content drift or removal cannot borrow a topic/day fallback', () => {
  for (const field of ['practiceId', 'contentVersion', 'objectiveId']) {
    const f = fixture(), state = checked(f, f.adapter.create(f.input), 1), id = state.plan.slots[0].practiceId
    f.contents.get(id)[field] = 'drift'
    const view = f.adapter.dailyLesson(state, { now: NOW })
    assert.equal(view.status, 'material-unavailable', field)
    assert.throws(() => f.adapter.finishDay(state, { day: 1, lessonId: id, now: NOW, expectedRevision: state.journey.revision, expectedPlanRevision: 0 }), /EXACT_CURRENT_LESSON_REQUIRED/)
  }
  const f = fixture(), state = checked(f, f.adapter.create(f.input), 1)
  f.contents.delete(state.plan.slots[0].practiceId)
  assert.equal(f.adapter.dailyLesson(state, { now: NOW }).status, 'material-unavailable')
  const drifted = createPersonalCourseRuntimeAdapter({ ...f.registry, version: 'different-registry' })
  assert.equal(drifted.dailyLesson(state, { now: NOW }).status, 'material-unavailable')
})

test('registry mapping snapshots reject wrong identities and duplicate references; request mappings are ignored', () => {
  const f = fixture()
  const changed = { ...f.registry, mappings: clone(f.registry.mappings) }
  changed.mappings[0].identity.scoringVersion = 'drift'
  assert.throws(() => createPersonalCourseRuntimeAdapter(changed).create({ ...f.input, mappings: f.registry.mappings }), /PERSONAL_PLAN_UNAVAILABLE/)
  const duplicated = { ...f.registry, mappings: clone(f.registry.mappings) }
  duplicated.mappings[0].practices.push(clone(duplicated.mappings[0].practices[0]))
  assert.throws(() => createPersonalCourseRuntimeAdapter(duplicated).create(f.input), /PERSONAL_PLAN_UNAVAILABLE|EXACT_PREPARED_CONTENT_REQUIRED/)
  f.registry.mappings[0].status = 'draft'
  assert.equal(f.adapter.create(f.input).plan.status, 'ready', 'factory metadata snapshot remains unchanged')
})

test('actual prepared day-5 alternative differs; day-6 alternative and review alternatives remain unavailable', () => {
  const f = fixture()
  let state = checked(f, through(f, 4), 5)
  const standard = f.adapter.dailyLesson(state, { now: atDay(5) })
  const alternative = f.adapter.dailyLesson(state, { now: atDay(5), choice: 'alternative' })
  assert.equal(alternative.status, 'ready'); assert.equal(alternative.lesson.variant, 'grounding')
  assert.deepEqual(alternative.availableChoices, ['keep', 'short', 'alternative', 'rest'])
  assert.equal(alternative.alternativeAvailable, true)
  assert.notEqual(alternative.lesson.id, standard.lesson.id)
  assert.notEqual(alternative.preparedContent.action, standard.preparedContent.action)
  state = finish(f, state, 5, { choice: 'alternative' })
  assert.deepEqual(state.journey.sessions[5].lessonSnapshot, alternative.lesson)
  state = checked(f, state, 6)
  assert.equal(f.adapter.dailyLesson(state, { now: atDay(6), choice: 'alternative' }).status, 'alternative-unavailable')
  assert.deepEqual(f.adapter.dailyLesson(state, { now: atDay(6) }).availableChoices, ['keep', 'short', 'rest'])
  assert.equal(f.adapter.dailyLesson(state, { now: atDay(6) }).alternativeAvailable, false)
  state = finish(f, state, 6)
  state = checked(f, state, 7)
  assert.equal(f.adapter.dailyLesson(state, { now: atDay(7), choice: 'alternative' }).status, 'alternative-unavailable')
  assert.equal(f.adapter.dailyLesson(state, { now: atDay(7) }).alternativeAvailable, false)
  assert.equal(f.adapter.dailyLesson(state, { now: atDay(7), targetScaleId: f.input.selectedScaleIds[0] }).status, 'material-unavailable')
})

test('short check-ins and confirmed feedback use actual short records without mutating preferences by projection', () => {
  for (const checkin of [{ energy: 'low' }, { feelingChange: 'worse' }, { availableTime: 'quick' }]) {
    const f = fixture(), state = checked(f, f.adapter.create(f.input), 1, { skip: false, ...checkin })
    const view = f.adapter.dailyLesson(state, { now: NOW })
    assert.equal(view.lesson.preparedVariant, 'short'); assert.equal(view.lesson.durationSeconds, 120)
    assert.equal(view.preparedContent.steps.length, 1)
    const next = finish(f, state, 1)
    assert.deepEqual(next.journey.preferences, state.journey.preferences)
    assert.deepEqual(next.journey.checkins, state.journey.checkins)
  }
  const f = fixture()
  let state = checked(f, f.adapter.create(f.input), 1)
  const noApply = finish(f, state, 1, { feedback: { difficulty: 'too-hard' }, applyFeedback: false })
  assert.equal(noApply.journey.preferences.length, 'standard')
  state = finish(f, state, 1, { feedback: { difficulty: 'too-hard' }, applyFeedback: true })
  state = checked(f, state, 2)
  assert.equal(f.adapter.dailyLesson(state, { now: atDay(2) }).lesson.preparedVariant, 'short')
})

test('whole-goal short reviews use authored short records and preserve all goals', () => {
  const f = fixture(), state = checked(f, through(f, 6), 7, { skip: false, energy: 'low' })
  const view = f.adapter.dailyLesson(state, { now: atDay(7) })
  assert.equal(view.status, 'ready'); assert.equal(view.lesson.preparedVariant, 'short')
  assert.equal(view.preparedContent.kind, 'whole-goal-review')
  assert.deepEqual(view.slot.reviewScaleIds, f.input.selectedScaleIds)
  assert.deepEqual(view.slot.provenanceBinding.goals.map(goal => goal.scaleId), f.input.selectedScaleIds)
  const next = finish(f, state, 7)
  assert.equal(next.journey.sessions[7].track, null)
  assert.equal(next.journey.sessions[7].lessonSnapshot.domain, null)
})

test('rest is non-mutating; explicit skip and pause follow existing release rules', () => {
  const f = fixture(), original = f.adapter.create(f.input)
  assert.equal(f.adapter.dailyLesson(original, { now: NOW }).status, 'check-in-required')
  const checkedState = checked(f, original, 1), before = clone(checkedState)
  assert.equal(f.adapter.dailyLesson(deepFreeze(checkedState), { now: NOW, choice: 'rest' }).status, 'rest-chosen')
  assert.deepEqual(checkedState, before)
  const skipped = finish(f, checkedState, 1, { status: 'skipped', choice: 'rest' })
  assert.equal(skipped.journey.sessions[1].status, 'skipped'); assert.equal(skipped.journey.sessions[1].lessonSnapshot, null)
  assert.equal(f.adapter.status(skipped, NOW).status, 'next-local-day')
  assert.equal(f.adapter.reviewLesson(skipped, { day: 1 }).mode, 'optional-catchup')
  const paused = f.adapter.pause(skipped, { paused: true, now: NOW, expectedRevision: skipped.journey.revision })
  assert.equal(f.adapter.status(paused, atDay(2)).status, 'paused')
  const restCheckin = checked(f, original, 1, { pauseRequested: true })
  assert.equal(f.adapter.dailyLesson(restCheckin, { now: NOW }).status, 'rest-chosen')
  assert.throws(() => finish(f, restCheckin, 1), /EXACT_CURRENT_LESSON_REQUIRED/)
})

test('uncomfortable feedback asks for comfortable choice; absent alternatives stay unavailable', () => {
  const f = fixture()
  let state = finish(f, checked(f, f.adapter.create(f.input), 1), 1, { feedback: { comfort: 'uncomfortable' }, applyFeedback: true })
  state = checked(f, state, 2)
  assert.equal(f.adapter.dailyLesson(state, { now: atDay(2) }).status, 'choose-comfortable-option')
  assert.equal(f.adapter.dailyLesson(state, { now: atDay(2), confirmAlternative: true }).status, 'alternative-unavailable')
  assert.equal(f.adapter.dailyLesson(state, { now: atDay(2), choice: 'short', confirmAlternative: true }).status, 'ready')
  assert.equal(f.adapter.dailyLesson(state, { now: atDay(2), choice: 'rest' }).status, 'rest-chosen')
})

test('local date, stale CAS, monotonic time, current check-in and feedback constraints are inherited', () => {
  const f = fixture()
  let state = f.adapter.create({ ...f.input, timeZone: 'America/Los_Angeles', now: '2026-10-12T06:50:00.000Z' })
  state = f.adapter.checkIn(state, { day: 1, now: '2026-10-12T06:50:00.000Z', expectedRevision: 0 })
  assert.throws(() => f.adapter.checkIn(state, { day: 1, now: '2026-10-12T06:50:00.000Z', expectedRevision: 0 }), /STALE_COURSE_REVISION/)
  state = finish(f, state, 1, { now: '2026-10-12T06:50:00.000Z' })
  assert.equal(f.adapter.status(state, '2026-10-12T06:59:00.000Z').status, 'next-local-day')
  assert.equal(f.adapter.status(state, '2026-10-12T07:00:00.000Z').status, 'check-in-required')
  state = f.adapter.checkIn(state, { day: 2, now: '2026-10-12T07:00:00.000Z', expectedRevision: state.journey.revision })
  assert.equal(f.adapter.dailyLesson(state, { now: '2026-10-13T07:00:00.000Z' }).status, 'check-in-required')
  assert.throws(() => f.adapter.setPreferences(state, { ...state.journey.preferences, now: '2026-10-12T06:59:00.000Z', expectedRevision: state.journey.revision }), /NON_MONOTONIC_TIME/)
  assert.throws(() => finish(f, state, 2, { now: '2026-10-12T07:00:00.000Z', feedback: { comment: 'x'.repeat(1001) } }), /INVALID_PRIVATE_COMMENT/)
  assert.throws(() => finish(f, state, 2, { now: '2026-10-12T07:00:00.000Z', expectedPlanRevision: 99 }), /STALE_PLAN_REVISION/)
})

test('UI language switches never alter pinned active IDs, snapshots or exact repetition', () => {
  const f = fixture(), state = checked(f, f.adapter.create({ ...f.input, uiLocale: 'en' }), 1)
  const en = f.adapter.dailyLesson(state, { now: NOW, uiLocale: 'en' })
  const ru = f.adapter.dailyLesson(state, { now: NOW, uiLocale: 'ru' })
  assert.deepEqual(ru.lesson, en.lesson); assert.deepEqual(ru.slot, en.slot)
  assert.equal(ru.contentLocale, 'en'); assert.equal(ru.requestedUiLocale, 'ru'); assert.equal(ru.contentLanguageDiffersFromUi, true)
  const done = finish(f, state, 1, { uiLocale: 'ru' }), retained = clone(done)
  f.contents.clear()
  const repeat = f.adapter.reviewLesson(deepFreeze(done), { day: 1, uiLocale: 'ru' })
  assert.equal(repeat.status, 'ready'); assert.deepEqual(repeat.lesson, en.lesson)
  repeat.lesson.sections[0].text = 'Caller mutation'
  assert.deepEqual(done, retained)
  assert.deepEqual(createPersonalCourseRuntimeAdapter().reviewLesson(done, { day: 1 }).lesson, en.lesson)
})

test('confirmed future plan revision preserves exact past sessions, supports new future language, and has one progress CAS', () => {
  const f = fixture(), state = through(f, 2), before = clone(state)
  const revised = f.adapter.revise(deepFreeze(state), { fromDay: 3, expectedRevision: state.journey.revision, expectedPlanRevision: 0,
    now: atDay(3), consent: true, scales: f.input.scales, selectedScaleIds: [...f.input.selectedScaleIds].reverse(), uiLocale: 'ru', loadMinutes: 2 })
  assert.equal(revised.plan.revision, 1); assert.equal(revised.journey.revision, state.journey.revision + 1)
  assert.equal(revised.journey.nextDay, 3)
  assert.deepEqual(revised.journey.sessions, before.journey.sessions)
  assert.deepEqual(revised.plan.slots.slice(0, 2), before.plan.slots.slice(0, 2))
  assert.deepEqual(state, before)
  assert.equal(f.adapter.reviewLesson(revised, { day: 1, uiLocale: 'ru' }).contentLocale, 'en')
  const ready = checked(f, revised, 3)
  const view = f.adapter.dailyLesson(ready, { now: atDay(3), uiLocale: 'en' })
  assert.equal(view.contentLocale, 'ru'); assert.equal(view.lesson.preparedVariant, 'short')
  assert.equal(view.slot.planRevision, 1)
  const done = finish(f, ready, 3)
  assert.deepEqual(done.journey.sessions[1], before.journey.sessions[1])
  for (const change of [{ consent: false }, { expectedPlanRevision: 99 }, { expectedRevision: 99 }, { fromDay: 2 }]) {
    assert.throws(() => f.adapter.revise(state, { fromDay: 3, expectedRevision: state.journey.revision, expectedPlanRevision: 0,
      now: atDay(3), consent: true, scales: f.input.scales, selectedScaleIds: f.input.selectedScaleIds, ...change }), /CONSENT|STALE|IMMUTABLE/)
  }
})

test('explicit target choice saves actual override slot; original planned slot and old journey are not mutated', () => {
  const f = fixture(), state = checked(f, f.adapter.create(f.input), 1), original = clone(state)
  const target = f.input.selectedScaleIds[1]
  const view = f.adapter.dailyLesson(state, { now: NOW, targetScaleId: target })
  assert.equal(view.slot.selectedScaleId, target)
  const done = finish(f, state, 1, { targetScaleId: target })
  assert.equal(done.journey.sessions[1].slot.selectedScaleId, target)
  assert.deepEqual(done.journey.sessions[1].slot, view.slot)
  assert.deepEqual(done.journey.sessions[1].plannedSlot, state.plan.slots[0])
  assert.deepEqual(state, original)
  const old = createCourseJourney({ id: 'old-v1', choices: { confirmed: true, durationDays: 21, topics: [{ scaleId: 'old', track: 'calm_regulation' }] },
    consent: true, timeZone: 'UTC', contentVersion: 'old-v1', now: NOW })
  const oldBefore = clone(old)
  assert.throws(() => f.adapter.dailyLesson(old, { now: NOW }), /INVALID_PERSONAL_RUNTIME/)
  assert.throws(() => f.adapter.checkIn(old, { day: 1, now: NOW, expectedRevision: 0 }), /INVALID_PERSONAL_RUNTIME/)
  assert.deepEqual(old, oldBefore)
})

test('completion and continuation retain exact historical references, all-goal reviews and private feedback facts', () => {
  const f = fixture()
  let state = f.adapter.create(f.input)
  for (let day = 1; day <= 21; day++) {
    state = checked(f, state, day, day === 2 ? { skip: false, wellbeing: 0, energy: 'low' } : {})
    state = finish(f, state, day, { status: day === 4 ? 'skipped' : 'completed',
      feedback: day === 7 ? { helpfulness: 'helpful', comment: 'Private journal.', reflectionAnswer: 'Private reflection.' } : {} })
  }
  f.contents.clear()
  const before = clone(state), summary = f.adapter.completion(deepFreeze(state), { uiLocale: 'ru' })
  assert.equal(summary.completedDays, 20); assert.equal(summary.skippedDays, 1); assert.equal(summary.completedLessons.length, 20)
  assert.equal(summary.subjectiveCheckins.initial.wellbeing, 0)
  assert.deepEqual(summary.helpfulLessons.map(row => row.day), [7])
  assert.equal(JSON.stringify(summary).includes('Private journal.'), false)
  const saved = f.adapter.saveContinuation(state, { practiceDays: [7, 1], pace: 'own-pace', consent: true,
    expectedRevision: state.journey.revision, now: atDay(22), uiLocale: 'ru' })
  assert.deepEqual(saved.journey.sessions, before.journey.sessions)
  assert.deepEqual(saved.journey.topics, before.journey.topics)
  assert.deepEqual(saved.journey.checkins, before.journey.checkins)
  assert.equal(saved.journey.revision, state.journey.revision + 1)
  assert.deepEqual(saved.journey.continuationPlan.practiceRefs.map(row => row.day), [1, 7])
  assert.equal(saved.journey.continuationPlan.practiceRefs[1].track, null)
  for (const reference of saved.journey.continuationPlan.practiceRefs) assert.equal(reference.id, summary.completedLessons.find(row => row.day === reference.day).id)
  assert.ok(f.adapter.completion(saved).continuationPlan.practiceRefs.every(row => row.replayable))
  assert.deepEqual(state, before)
  assert.throws(() => f.adapter.saveContinuation(state, { practiceDays: [4], consent: true, expectedRevision: state.journey.revision, now: atDay(22) }), /EXACT_COMPLETED_LESSON_REQUIRED/)
  assert.throws(() => f.adapter.saveContinuation(state, { practiceDays: [1], consent: false, expectedRevision: state.journey.revision, now: atDay(22) }), /CONTINUATION_CONSENT_REQUIRED/)
})

test('missing or drifted completed snapshots are not replaced by registry or current plan', () => {
  const f = fixture(), state = through(f, 21)
  for (const mutate of [s => { delete s.lessonSnapshot }, s => { s.lessonId = 'drift' }, s => { s.lessonVariant = 'grounding' },
    s => { s.slot.practice.contentVersion = 'drift' }, s => { s.lessonSnapshot.practiceReference.practiceId = 'drift' },
    s => { s.contentReference.contentLocale = 'ru' }, s => { s.lessonSnapshot.sections = [null] }]) {
    const broken = clone(state); mutate(broken.journey.sessions[1])
    assert.equal(f.adapter.reviewLesson(broken, { day: 1 }).status, 'material-unavailable')
    assert.equal(f.adapter.completion(broken).completedDays, 21)
    assert.equal(f.adapter.completion(broken).completedLessons[0].replayable, false)
    assert.throws(() => f.adapter.saveContinuation(broken, { practiceDays: [1], consent: true, expectedRevision: broken.journey.revision, now: atDay(22) }), /EXACT_COMPLETED_LESSON_REQUIRED/)
  }
})

test('runtime is opt-in and contains no legacy-library or draft-pilot fallback imports', async () => {
  const source = await readFile(new URL('../lib/inner-growth/course-personal-runtime-v2.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /from ['"].*(?:lesson-library|course-personal-practices-v2|lib\/app|supabase)/)
  assert.match(source, /createPersonalCourseRuntimeAdapter\(trustedRegistry = null\)/)
})

test('explicit reviewed family reuse separates selected result from authored-card context and exposes limitations', () => {
  const f = fixture(), originalIdentity = clone(f.registry.mappings[0].identity)
  const selected = evidence('hh-weekly-pulse', 'weekly.recovery')
  f.registry.mappings[0] = { ...f.registry.mappings[0], identity: clone(selected.identity), mappingVersion: 'synthetic-explicit-reuse',
    rationale: { en: 'Synthetic exact relation.', ru: 'Учебное точное соответствие.' },
    limitations: { en: 'Only the explicitly named facet; no broader claim.', ru: 'Только указанная сторона; без более широких выводов.' },
    sourceMetadata: { sourceType: 'synthetic-editorial-audit' },
    familyReuse: { sourceSkillId: 'synthetic-skill/resource.energy', sourcePilotIdentity: originalIdentity,
      sourceContentVersion: f.registry.contentVersion, limitedFacet: { en: 'One manageable action.', ru: 'Одно посильное действие.' } } }
  f.input.scales[0] = selected; f.input.selectedScaleIds[0] = selected.scaleId
  f.adapter = createPersonalCourseRuntimeAdapter(f.registry)
  const state = checked(f, f.adapter.create(f.input), 1)
  const view = f.adapter.dailyLesson(state, { now: NOW })
  assert.equal(view.status, 'ready')
  assert.equal(view.lesson.selectedIdentity.dimensionKey, 'weekly.recovery')
  assert.equal(view.lesson.selectedScaleId, selected.scaleId)
  assert.equal(view.lesson.authoredPracticeContext.dimensionKey, 'resource.energy')
  assert.deepEqual(view.lesson.familyReuse, f.registry.mappings[0].familyReuse)
  assert.deepEqual(view.lesson.mappingLimitations, f.registry.mappings[0].limitations)
  assert.deepEqual(finish(f, state, 1).journey.sessions[1].slot.provenanceBinding.identity, selected.identity)
  for (const field of ['familyReuse', 'rationale', 'limitations']) {
    const mappings = clone(f.registry.mappings); delete mappings[0][field]
    assert.throws(() => createPersonalCourseRuntimeAdapter({ ...f.registry, mappings }).create(f.input), /EXACT_PREPARED_CONTENT_REQUIRED/)
  }
  for (const field of ['sourceSkillId', 'sourceContentVersion', 'sourcePilotIdentity', 'limitedFacet']) {
    const mappings = clone(f.registry.mappings); delete mappings[0].familyReuse[field]
    assert.throws(() => createPersonalCourseRuntimeAdapter({ ...f.registry, mappings }).create(f.input), /EXACT_PREPARED_CONTENT_REQUIRED/)
  }
  for (const field of Object.keys(originalIdentity)) {
    const mappings = clone(f.registry.mappings); mappings[0].familyReuse.sourcePilotIdentity[field] = 'not-registered'
    assert.throws(() => createPersonalCourseRuntimeAdapter({ ...f.registry, mappings }).create(f.input), /EXACT_PREPARED_CONTENT_REQUIRED/, field)
  }
  const mappings = clone(f.registry.mappings)
  mappings[0].familyReuse.sourcePilotIdentity = { ...provenance(getAssessmentDefinition('hh-weekly-pulse', 'v1', 'ru')), dimensionKey: originalIdentity.dimensionKey }
  assert.throws(() => createPersonalCourseRuntimeAdapter({ ...f.registry, mappings }).create(f.input), /EXACT_PREPARED_CONTENT_REQUIRED/, 'real definition with absent source dimension')
})


test('runtime refuses deferred future revisions rather than silently changing preserved upcoming language or goals', () => {
  const f = fixture(), state = through(f, 2), before = clone(state)
  assert.throws(() => f.adapter.revise(state, { fromDay: 5, expectedRevision: state.journey.revision, expectedPlanRevision: 0,
    now: atDay(3), consent: true, scales: f.input.scales, selectedScaleIds: [...f.input.selectedScaleIds].reverse(), uiLocale: 'ru' }),
  /REVISION_MUST_START_AT_NEXT_UNRESOLVED_DAY/)
  assert.deepEqual(state, before)
  const ready = checked(f, state, 3, { availableTime: 'quick' })
  assert.equal(f.adapter.dailyLesson(ready, { now: atDay(3), uiLocale: 'ru' }).lesson.contentLocale, 'en')
})


test('routing projection never changes check-in history or factual completion summaries', () => {
  const f = fixture()
  let state = f.adapter.create(f.input)
  const savedCheckins = {}
  for (let day = 1; day <= 21; day++) {
    const answers = day === 1 ? { skip: false, energy: 'low', feelingChange: 'worse', availableTime: 'quick' }
      : day === 21 ? { skip: false, energy: 'usual', feelingChange: 'better', availableTime: 'standard' } : {}
    state = checked(f, state, day, answers)
    savedCheckins[day] = clone(state.journey.checkins[day])
    state = finish(f, deepFreeze(state), day)
    assert.deepEqual(state.journey.checkins, savedCheckins, `day ${day} factual check-in history`)
  }
  const expected = { count: 2,
    initial: { day: 1, at: atDay(1), wellbeing: null, energy: 'low', feelingChange: 'worse' },
    latest: { day: 21, at: atDay(21), wellbeing: null, energy: 'usual', feelingChange: 'better' },
    measure: 'optional-subjective-checkin', formalAssessment: false }
  assert.deepEqual(f.adapter.completion(state).subjectiveCheckins, expected)
  const next = f.adapter.saveContinuation(state, { practiceDays: [1], consent: true, expectedRevision: state.journey.revision, now: atDay(22) })
  assert.deepEqual(next.journey.checkins, savedCheckins)
  assert.deepEqual(f.adapter.completion(next).subjectiveCheckins, expected)
})


test('readiness requires standard and short bytes for every selected goal/day and whole-goal review', () => {
  for (const loadMinutes of [2, 5]) for (const variant of ['standard', 'short']) for (const day of [1, 7]) {
    const f = fixture()
    // Day 1 is scheduled for scale 0, so scale 1 exercises an unscheduled target.
    const missing = [...f.contents.values()].find(card => card.day === day && card.variant === variant && card.contentLocale === 'en' &&
      (day === 7 || card.dimensionKey === f.input.scales[1].identity.dimensionKey))
    assert.ok(missing)
    f.contents.delete(missing.practiceId)
    assert.throws(() => f.adapter.create({ ...f.input, loadMinutes }), /EXACT_PREPARED_CONTENT_REQUIRED/, `${loadMinutes}/${variant}/${day}`)
  }
  const f = fixture(), state = through(f, 1), before = clone(state)
  const missing = [...f.contents.values()].find(card => card.day === 3 && card.variant === 'short' && card.contentLocale === 'en' &&
    card.dimensionKey === f.input.scales[1].identity.dimensionKey)
  f.contents.delete(missing.practiceId)
  assert.throws(() => f.adapter.revise(state, { fromDay: 2, expectedRevision: state.journey.revision, expectedPlanRevision: 0,
    now: atDay(2), consent: true, scales: f.input.scales, selectedScaleIds: f.input.selectedScaleIds }), /EXACT_PREPARED_CONTENT_REQUIRED/)
  assert.deepEqual(state, before)
})

test('future preflight does not require past content again and alternatives remain optional', () => {
  const f = fixture(), state = through(f, 1)
  for (const [id, card] of f.contents) if (card.day === 1 || card.variant === 'alternative') f.contents.delete(id)
  const revised = f.adapter.revise(state, { fromDay: 2, expectedRevision: state.journey.revision, expectedPlanRevision: 0,
    now: atDay(2), consent: true, scales: f.input.scales, selectedScaleIds: f.input.selectedScaleIds })
  assert.equal(revised.plan.status, 'ready')
  assert.equal(f.adapter.reviewLesson(revised, { day: 1 }).status, 'ready')
  const another = fixture()
  for (const [id, card] of another.contents) if (card.variant === 'alternative') another.contents.delete(id)
  assert.equal(another.adapter.create(another.input).plan.status, 'ready')
})


test('larger-load variant coverage cannot mask missing bytes selected at the actual target-switch load', () => {
  const f = fixture(), mapping = f.registry.mappings[1]
  const missing = mapping.practices.find(practice => practice.objectiveId.endsWith('/day/1') && practice.variant === 'standard' && practice.contentLocale === 'en')
  const longer = { ...clone(f.contents.get(missing.practiceId)), practiceId: 'synthetic/aaa-eight-minute', skillId: 'aaa-eight-minute', durationMinutes: 8 }
  f.contents.delete(missing.practiceId)
  f.contents.set(longer.practiceId, longer)
  mapping.practices.push(ref(longer))
  f.adapter = createPersonalCourseRuntimeAdapter(f.registry)
  assert.throws(() => f.adapter.create(f.input), /EXACT_PREPARED_CONTENT_REQUIRED/)
  const shortState = f.adapter.create({ ...f.input, loadMinutes: 2 })
  assert.equal(shortState.plan.status, 'ready')
  assert.throws(() => f.adapter.revise(shortState, { fromDay: 1, expectedRevision: shortState.journey.revision, expectedPlanRevision: 0,
    now: NOW, consent: true, scales: f.input.scales, selectedScaleIds: f.input.selectedScaleIds, loadMinutes: 5 }), /EXACT_PREPARED_CONTENT_REQUIRED/)
  assert.equal(shortState.plan.loadMinutes, 2)
  const checkedShort = checked(f, shortState, 1)
  assert.equal(f.adapter.dailyLesson(checkedShort, { now: NOW, targetScaleId: f.input.selectedScaleIds[1] }).lesson.preparedVariant, 'short')
})


test('available choices reflect exact prepared bytes for the current target instead of promised alternatives', () => {
  const f = fixture(), state = checked(f, through(f, 4), 5)
  const original = f.adapter.dailyLesson(state, { now: atDay(5) })
  assert.equal(original.alternativeAvailable, true)
  const missing = [...f.contents.values()].find(card => card.day === 5 && card.contentLocale === 'en' && card.variant === 'alternative' && card.skillId === original.slot.skillId)
  f.contents.delete(missing.practiceId)
  const current = f.adapter.dailyLesson(state, { now: atDay(5) })
  assert.equal(current.status, 'ready')
  assert.equal(current.alternativeAvailable, false)
  assert.deepEqual(current.availableChoices, ['keep', 'short', 'rest'])
  const other = state.plan.selectedScaleIds.find(id => id !== current.slot.selectedScaleId)
  const otherView = f.adapter.dailyLesson(state, { now: atDay(5), targetScaleId: other })
  assert.equal(otherView.alternativeAvailable, true)
  assert.ok(otherView.availableChoices.includes('alternative'))
  const unavailableRegistry = createPersonalCourseRuntimeAdapter().dailyLesson(state, { now: atDay(5) })
  assert.deepEqual(unavailableRegistry.availableChoices, ['rest'])
  assert.equal(unavailableRegistry.alternativeAvailable, false)
})
