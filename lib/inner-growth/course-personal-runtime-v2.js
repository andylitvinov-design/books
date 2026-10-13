/**
 * Pure, opt-in personal-course runtime. No imports of the draft pilot, old lesson
 * libraries, repositories, authentication, SQL, providers, or generated advice.
 *
 * Integration contract:
 * - Construct createPersonalCourseRuntimeAdapter(TRUSTED_REGISTRY) in trusted
 *   application composition, NEVER from request JSON/client reviewed flags.
 * - Registry: { id, version, contentVersion, status:'reviewed', source, mappings,
 *   reviewMapping, frameApproval:{version:PERSONAL_LESSON_FRAME_VERSION,
 *   status:'reviewed',source}, getContent({practiceId,contentVersion,contentLocale}) }.
 *   getContent is synchronous, exact and immutable for the version. Mappings use
 *   course-personal-plan-v2's contract. Returned records use the pilot card shape
 *   but MUST have reviewStatus:'reviewed', contentStatus:'REVIEWED'. Approval must
 *   cover the exact mapping, bilingual bytes, safety, common frame and total load.
 *   The shipped pilot AND frames remain DRAFT: no default registry or promotion.
 * - create accepts authorised evidence DTOs from course-personal-evidence-v2.
 *   Server ownership, result verification, persisted snapshot integrity and CAS
 *   are the caller's responsibility, never established by a client boolean.
 * - Exact reviewed family reuse is optional mapping metadata: rationale:{en,ru},
 *   limitations:{en,ru}, sourceMetadata and familyReuse:{sourceSkillId,
 *   sourcePilotIdentity (complete assessment/dimension identity),
 *   sourceContentVersion,limitedFacet (text or {en,ru})}. This identifies the
 *   card's authoring context separately from the user's selected scale. It is
 *   never inferred from a topic; mapping context/limits are returned for display.
 *   Source authoring identity is checked against registered provenance/dimensions.
 * - Persist the whole returned {version,registry,journey,plan} atomically. Only
 *   journey.revision is the progress CAS; plan.revision identifies explicit plan
 *   changes. finishDay requires both expectedRevision and expectedPlanRevision.
 * - checkIn/setPreferences/pause delegate existing invariants. dailyLesson returns
 *   an exact slot + prepared lesson; pass its lesson.id and chosen day options to
 *   finishDay. There is no progress mutation until finishDay. Rest alone does not
 *   resolve a day; explicitly finishing status:'skipped' does. No catch-up debt.
 *   availableChoices/alternativeAvailable describe exact prepared options for
 *   the current target; the UI must not promise an absent alternative.
 * - Course language is PINNED PER PLAN REVISION. uiLocale only requests UI labels;
 *   it NEVER localizes content or changes IDs. A consented revise with uiLocale
 *   changes FUTURE slots only. Old repeats use saved text in its original language.
 *   Runtime revisions start at journey.nextDay (the next unresolved lesson).
 *   Scheduling an edit for a later future day is deliberately unsupported here:
 *   that needs separately retained planning contexts for the intervening slots.
 * - Existing progression uses a technical track internally. We pass disposable
 *   routing projections only; returned journeys retain real topics and sessions.
 *   Reviews have domain/track:null and all goal IDs, never a pretend scale focus.
 * - Completed sessions retain exact slot, prepared record, lesson and references.
 *   Repeat and continuation replay these snapshots, not mutable current mappings.
 *   Missing/corrupt snapshots fail closed. Old 14-day/v1 journeys are rejected and
 *   never rewritten. Existing completion facts/consent/CAS rules are reused.
 */
import { getDefinitionById, provenance } from '../assessments/definitions.js'
import { scoreAssessment } from '../assessments/scoring.js'
import { PERSONAL_COURSE_PLAN_VERSION, createPersonalCoursePlan, choosePersonalCourseDay,
  revisePersonalCoursePlan } from './course-personal-plan-v2.js'
import { createCourseJourney, courseTrackForDay, journeyStatus, checkInBeforeLesson,
  dailyLesson as progressionLesson, finishCourseDay, setCoursePreferences,
  pauseCourseJourney } from './course-progression-21.js'
import { courseCompletion21, saveCourseContinuation } from './course-completion-21.js'
import { CURRICULUM_21 } from '../../data/inner-growth/curriculum-21.js'
import { PERSONAL_LESSON_FRAME_VERSION, personalLessonFrame } from '../../data/inner-growth/course-personal-lesson-frame-v2.js'

export const PERSONAL_COURSE_RUNTIME_VERSION = 'hh-personal-course-runtime-21-v2'
const ROUTING_TRACK = 'attention_clarity' // Transport only; never returned as review focus.
const IDENTITY = ['definitionId', 'definitionKey', 'definitionVersion', 'instrumentLocale', 'translationVersion', 'contentHash', 'scoringKey', 'scoringVersion', 'resultVersion', 'timeframe', 'dimensionKey']
const PRACTICE = ['objectiveId', 'skillId', 'practiceId', 'contentVersion', 'contentLocale', 'variant', 'durationMinutes', 'intensity', 'reviewStatus', 'minimumEntry']
const KINDS = ['arrive', 'learn', 'meditation', 'ritual', 'finish']
const TITLES = { en: ['Arrive', 'Today’s idea', 'Try one action', 'Stop or transfer', 'Finish'], ru: ['Начало', 'Идея дня', 'Одно действие', 'Остановка или перенос', 'Завершение'] }
const clone = value => structuredClone(value)
const fail = code => { throw new Error(code) }
const nonblank = value => typeof value === 'string' && value.trim().length > 0
const sameFields = (a, b, keys) => Boolean(a && b && keys.every(key => a[key] === b[key]))
const sameIdentity = (a, b) => sameFields(a, b, IDENTITY) && IDENTITY.every(key => nonblank(a[key]))
const sameJSON = (a, b) => {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameJSON(a[key], b[key]))
}
const sourceDimensions = new Map()
function registeredIdentity(identity) {
  try {
    const definition = getDefinitionById(identity?.definitionId)
    if (!sameIdentity(identity, { ...provenance(definition), dimensionKey: identity.dimensionKey })) return false
    if (!sourceDimensions.has(definition.id)) sourceDimensions.set(definition.id, scoreAssessment(definition,
      Object.fromEntries(definition.questions.map(question => [question.id, question.min ?? definition.answerScale.min]))).dimensions.map(dimension => dimension.key))
    return sourceDimensions.get(definition.id).includes(identity.dimensionKey)
  } catch { return false }
}
const practiceRef = practice => Object.fromEntries(PRACTICE.map(key => [key, practice[key]]))
const bilingual = value => value && ['en', 'ru'].every(locale => nonblank(value[locale]))
const mappingContext = binding => ({
  mappingRationale: clone(binding.mappingRationale ?? null), mappingLimitations: clone(binding.mappingLimitations ?? null),
  mappingSourceMetadata: clone(binding.mappingSourceMetadata ?? null), familyReuse: clone(binding.familyReuse ?? null),
})
const matchesContext = (mapping, binding) => sameJSON(mappingContext(binding), {
  mappingRationale: mapping.rationale ?? null, mappingLimitations: mapping.limitations ?? null,
  mappingSourceMetadata: mapping.sourceMetadata ?? null, familyReuse: mapping.familyReuse ?? null,
})
const lessonVariant = variant => ({ standard: 'standard', short: 'quick', alternative: 'grounding' })[variant]
const topicChoices = plan => ({ confirmed: true, durationDays: 21,
  topics: plan.selectedScales.map(row => ({ scaleId: row.scaleId, track: row.topicId })) })
const registryRef = registry => ({ id: registry.id, version: registry.version, contentVersion: registry.contentVersion })

function assertRuntime(runtime) {
  if (runtime?.version !== PERSONAL_COURSE_RUNTIME_VERSION || runtime.plan?.version !== PERSONAL_COURSE_PLAN_VERSION ||
    !Array.isArray(runtime.plan.slots) || runtime.plan.slots.length !== 21 ||
    runtime.plan.slots.some((slot, index) => slot.day !== index + 1) ||
    !Number.isInteger(runtime.plan.revision) || runtime.plan.revision < 0 || !['en', 'ru'].includes(runtime.plan.uiLocale) ||
    !runtime.registry || runtime.journey?.contentVersion !== runtime.registry.contentVersion) fail('INVALID_PERSONAL_RUNTIME')
  courseTrackForDay(runtime.journey, 1) // Established state guard, without time or content I/O.
}
function withJourney(runtime, journey) { return { ...clone(runtime), journey } }
function projectJourney(journey) {
  const projected = clone(journey)
  projected.topics = [{ scaleId: 'personal-runtime-routing-only', track: ROUTING_TRACK }]
  for (const session of Object.values(projected.sessions)) if (session.status === 'completed') session.track = ROUTING_TRACK
  return projected
}
function projectLesson(lesson) { return lesson ? { ...clone(lesson), domain: ROUTING_TRACK } : null }
function restoreJourney(original, projected) {
  return { ...projected, topics: clone(original.topics), checkins: clone(original.checkins), sessions: clone(original.sessions) }
}
function languageView(locale, requested) {
  if (!['en', 'ru'].includes(requested)) fail('UNSUPPORTED_LOCALE')
  return { contentLocale: locale, requestedUiLocale: requested, languagePolicy: 'pinned-per-plan-revision',
    languageChangeRequiresConfirmedRevision: true, contentLanguageDiffersFromUi: locale !== requested }
}
function exactArchivedSession(runtime, day) {
  const session = runtime.journey.sessions[day], slot = session?.slot, lesson = session?.lessonSnapshot, content = session?.preparedContent
  if (session?.status !== 'completed' || slot?.status !== 'ready' || slot.day !== day ||
    !Number.isInteger(slot.planRevision) || slot.planRevision < 0 || slot.planRevision > runtime.plan.revision ||
    session.planRevision !== slot.planRevision || session.practiceId !== slot.practiceId || session.skillId !== slot.skillId ||
    session.track !== slot.topicId || !sameFields(slot.practice, slot.provenanceBinding, ['practiceId', 'skillId', 'contentVersion', 'contentLocale']) ||
    !sameFields(slot.practice, content, PRACTICE) || !sameJSON(session.contentReference, practiceRef(slot.practice)) ||
    !sameJSON(lesson?.practiceReference, session.contentReference) || lesson?.id !== session.lessonId ||
    lesson?.version !== session.lessonVersion || lesson?.variant !== session.lessonVariant || lesson?.domain !== session.track ||
    lesson?.day !== day || lesson?.contentLocale !== slot.practice.contentLocale ||
    lesson?.variant !== lessonVariant(slot.practice.variant) ||
    !['title', 'aphorism', 'ritual', 'reflection'].every(key => nonblank(lesson[key])) ||
    !Array.isArray(lesson.sections) || !KINDS.every(kind => lesson.sections.some(section => section?.kind === kind && nonblank(section.text))) ||
    lesson.accessibility?.eyesOpen !== true || lesson.accessibility?.naturalBreathing !== true || lesson.accessibility?.stopAnytime !== true) return null
  return session
}

export function createPersonalCourseRuntimeAdapter(trustedRegistry = null) {
  // Snapshot registry metadata and mappings so later incidental mutation cannot
  // alter an in-flight plan. The exact content resolver remains a trusted function.
  const getContent = trustedRegistry?.getContent
  const registry = trustedRegistry ? clone(Object.fromEntries(Object.entries(trustedRegistry).filter(([key]) => key !== 'getContent'))) : null
  const eligible = registry && registry.status === 'reviewed' &&
    ['id', 'version', 'contentVersion', 'source'].every(key => nonblank(registry[key])) &&
    registry.contentVersion.length <= 100 && Array.isArray(registry.mappings) && typeof getContent === 'function' &&
    registry.frameApproval?.status === 'reviewed' && registry.frameApproval.version === PERSONAL_LESSON_FRAME_VERSION && nonblank(registry.frameApproval.source)
  const availableRegistry = runtime => Boolean(eligible && (!runtime || sameJSON(runtime.registry, registryRef(registry))))
  const needRegistry = runtime => { if (!availableRegistry(runtime)) fail('REVIEWED_REGISTRY_REQUIRED') }

  function mappingForSlot(slot) {
    const binding = slot.provenanceBinding
    if (!binding || slot.status !== 'ready' || !slot.practice || slot.practiceId !== slot.practice.practiceId ||
      slot.skillId !== slot.practice.skillId || !sameFields(slot.practice, binding, ['practiceId', 'skillId', 'contentVersion', 'contentLocale']) ||
      binding.objectiveId !== slot.commonObjective?.id || binding.curriculumVersion !== CURRICULUM_21.version) return null
    let mapping
    if (slot.kind === 'review') {
      mapping = registry.reviewMapping
      if (slot.topicId !== null || slot.selectedScaleId !== null || binding.coversAllSelectedGoals !== true ||
        mapping?.coversAllSelectedGoals !== true || !Array.isArray(binding.goals) || !binding.goals.length ||
        !sameJSON(binding.goals.map(goal => goal.scaleId), slot.reviewScaleIds) || new Set(slot.reviewScaleIds).size !== slot.reviewScaleIds.length ||
        binding.goals.some(goal => registry.mappings.filter(row => sameIdentity(row.identity, goal.identity) && row.mappingVersion === goal.mappingVersion && row.status === 'reviewed' && matchesContext(row, goal)).length !== 1)) return null
    } else if (slot.kind === 'practice') {
      const matches = registry.mappings.filter(row => sameIdentity(row.identity, binding.identity))
      if (matches.length !== 1) return null
      mapping = matches[0]
      if (!matchesContext(mapping, binding) || mapping.topicId !== slot.topicId || slot.selectedScaleId !== `${binding.identity.definitionId}/${binding.identity.dimensionKey}`) return null
    } else return null
    if (mapping?.status !== 'reviewed' || mapping.mappingVersion !== binding.mappingVersion || mapping.source !== binding.mappingSource ||
      mapping.curriculumVersion !== binding.curriculumVersion || !Array.isArray(mapping.practices)) return null
    const matches = mapping.practices.filter(row => sameFields(row, slot.practice, ['practiceId', 'contentVersion', 'contentLocale']))
    return matches.length === 1 && sameFields(matches[0], slot.practice, PRACTICE) ? mapping : null
  }

  function validAuthoringContext(content, slot, mapping) {
    const reuse = mapping.familyReuse
    if (!reuse) return content.dimensionKey === slot.provenanceBinding.identity.dimensionKey
    return reuse.sourceSkillId === content.skillId && reuse.sourceContentVersion === content.contentVersion &&
      registeredIdentity(reuse.sourcePilotIdentity) && reuse.sourcePilotIdentity.dimensionKey === content.dimensionKey &&
      bilingual(mapping.rationale) && bilingual(mapping.limitations) &&
      (nonblank(reuse.limitedFacet) || bilingual(reuse.limitedFacet))
  }

  function prepare(slot) {
    if (!slot) return null
    const mapping = mappingForSlot(slot)
    if (!mapping) return null
    let content
    try { content = getContent({ practiceId: slot.practiceId, contentVersion: slot.practice.contentVersion, contentLocale: slot.practice.contentLocale }) }
    catch { return null }
    if (!content || !sameFields(content, slot.practice, PRACTICE) || content.reviewStatus !== 'reviewed' || content.contentStatus !== 'REVIEWED' ||
      content.contentVersion !== registry.contentVersion || content.day !== slot.day || content.curriculumVersion !== CURRICULUM_21.version ||
      content.objectiveId !== slot.commonObjective.id || content.minimumEntry !== true || content.intensity !== 'gentle' ||
      !Number.isFinite(content.durationMinutes) || content.durationMinutes <= 0 || content.durationMinutes > slot.loadMinutes ||
      !['title', 'entry', 'safety', 'action', 'stoppingPoint', 'finish', 'source', 'sharedObjective', 'practiceMethod'].every(key => nonblank(content[key])) ||
      !Array.isArray(content.steps) || !content.steps.length || !content.steps.every(nonblank) || !content.steps.includes(content.action) ||
      content.accessibility?.eyesOpen !== true || content.accessibility?.naturalBreathing !== true || content.accessibility?.stopAnytime !== true ||
      (content.variant === 'alternative' && !nonblank(content.alternativeDifference)) ||
      (slot.kind === 'review' ? content.kind !== 'whole-goal-review' || content.topicId !== null || content.dimensionKey !== null ||
        content.coversAllSelectedGoals !== true || content.reviewScope !== 'all-selected-goals' || content.includesUnpractisedGoals !== true :
        content.kind !== 'practice' || content.topicId !== slot.topicId || !validAuthoringContext(content, slot, mapping))) return null
    const locale = content.contentLocale, frame = personalLessonFrame(slot.day, locale)
    if (!frame) return null
    const route = CURRICULUM_21.route[slot.day - 1]
    if (content.sharedObjective !== route.objective[locale]) return null
    const seconds = content.durationMinutes * 60, allocations = [0.1, 0.15, 0.5, 0.15, 0.1]
    const texts = [`${content.entry}\n${content.safety}`, frame.teaching, content.steps.join('\n'),
      [content.stoppingPoint, content.optionalTransfer].filter(nonblank).join('\n'), content.finish]
    const reference = practiceRef(content)
    const lesson = {
      id: `personal-practice:${encodeURIComponent(JSON.stringify([reference.practiceId, reference.contentVersion, reference.contentLocale, reference.objectiveId]))}`,
      version: content.contentVersion, sourceContentVersion: content.contentVersion,
      day: slot.day, week: slot.week, review: slot.kind === 'review', domain: slot.topicId,
      selectedScaleId: slot.selectedScaleId, reviewScaleIds: clone(slot.reviewScaleIds ?? []),
      selectedIdentity: clone(slot.provenanceBinding.identity ?? null),
      ...mappingContext(slot.provenanceBinding),
      reviewGoals: clone(slot.provenanceBinding.goals ?? []),
      authoredPracticeContext: { skillId: content.skillId, dimensionKey: content.dimensionKey, contentVersion: content.contentVersion },
      title: content.title, aphorism: frame.thought, thoughtAttribution: frame.source, thoughtIsQuotation: false,
      ritual: texts[3], reflection: content.optionalReflection ?? route.reflection[locale], reflectionOptional: true,
      sections: KINDS.map((kind, index) => ({ kind, title: TITLES[locale][index], text: texts[index], seconds: seconds * allocations[index] })),
      accessibility: clone(content.accessibility), variant: lessonVariant(content.variant), preparedVariant: content.variant,
      length: content.variant === 'standard' ? 'standard' : 'quick', durationSeconds: seconds, durationIsEstimate: true,
      completionTimerRequired: false, contentLocale: locale, practiceReference: reference,
      source: content.source, frameVersion: frame.version, frameReviewSource: registry.frameApproval.source,
      curriculum: { version: content.curriculumVersion, objectiveId: content.objectiveId,
        skill: route.skill[locale], objective: content.sharedObjective, learningOutcome: route.outcome[locale],
        requiresPreviousTopicLesson: false, reviewScope: slot.kind === 'review' ? 'all-selected-goals' : null },
      contentStatus: 'REVIEWED', scope: 'supportive-skills-not-treatment', generativeAI: false,
      clinicalValidation: false, efficacyClaim: false, formalAssessment: false,
    }
    return { lesson, preparedContent: clone(content) }
  }

  function preparedPlanRange(plan, fromDay = 1) {
    // Preflight every reachable chosen-goal/day combination, not only the
    // scheduled target. Both standard and short bytes are required even when
    // today's chosen load is two minutes. Alternatives remain optional.
    const probe = clone(plan)
    for (const slot of probe.slots) slot.loadMinutes = 8 // Validation only; never persisted/offered.
    for (const original of plan.slots.slice(fromDay - 1)) {
      if (!prepare(original)) return false
      if (original.kind === 'practice') {
        for (const targetScaleId of plan.selectedScaleIds) for (const choice of ['keep', 'short']) {
          // A larger budget can select a different skill/reference. Validate the
          // actual switch path first, then separately prove both variants exist.
          const actual = choosePersonalCourseDay(plan, { day: original.day, targetScaleId, choice,
            mappings: registry.mappings, reviewMapping: registry.reviewMapping })
          if (actual.status !== 'ready' || !prepare(actual.slot)) return false
          const selected = choosePersonalCourseDay(probe, { day: original.day, targetScaleId, choice,
            mappings: registry.mappings, reviewMapping: registry.reviewMapping })
          if (selected.status !== 'ready' || selected.slot.practice.variant !== (choice === 'keep' ? 'standard' : 'short') || !prepare(selected.slot)) return false
        }
      } else {
        const short = choosePersonalCourseDay(probe, { day: original.day, choice: 'short',
          mappings: registry.mappings, reviewMapping: registry.reviewMapping })
        if (short.status !== 'ready' || !prepare(short.slot)) return false
        const candidates = registry.reviewMapping.practices.filter(practice =>
          practice.objectiveId === original.commonObjective.id && practice.contentLocale === original.practice.contentLocale &&
          practice.variant === 'standard' && practice.reviewStatus === 'reviewed' && practice.minimumEntry === true &&
          practice.intensity === 'gentle' && Number.isFinite(practice.durationMinutes) && practice.durationMinutes > 0 && practice.durationMinutes <= 8)
          .sort((a, b) => a.skillId < b.skillId ? -1 : a.skillId > b.skillId ? 1 : a.practiceId < b.practiceId ? -1 : a.practiceId > b.practiceId ? 1 : 0)
        if (!candidates.length) return false
        const practice = candidates[0]
        const standard = { ...clone(original), loadMinutes: 8, practice: clone(practice), practiceId: practice.practiceId, skillId: practice.skillId,
          provenanceBinding: { ...clone(original.provenanceBinding), practiceId: practice.practiceId, skillId: practice.skillId,
            contentVersion: practice.contentVersion, contentLocale: practice.contentLocale } }
        if (!prepare(standard)) return false
      }
    }
    return true
  }

  function create({ id, scales, selectedScaleIds, weeklyAccents = {}, loadMinutes = 5, uiLocale = 'en', consent = false, timeZone, now } = {}) {
    needRegistry()
    const plan = createPersonalCoursePlan({ scales, selectedScaleIds, weeklyAccents, loadMinutes, uiLocale, consent,
      mappings: registry.mappings, reviewMapping: registry.reviewMapping })
    if (plan.status !== 'ready') fail('PERSONAL_PLAN_UNAVAILABLE')
    // Prepared bytes for all selected goals, loads and reviews are required now.
    if (!preparedPlanRange(plan)) fail('EXACT_PREPARED_CONTENT_REQUIRED')
    const journey = createCourseJourney({ id, choices: topicChoices(plan), consent, timeZone, contentVersion: registry.contentVersion, now })
    return { version: PERSONAL_COURSE_RUNTIME_VERSION, registry: registryRef(registry), journey, plan }
  }

  function preparedDayChoices(plan, day, targetScaleId) {
    const availableChoices = ['keep', 'short', 'alternative'].filter(choice => {
      const selected = choosePersonalCourseDay(plan, { day, targetScaleId, choice,
        mappings: registry.mappings, reviewMapping: registry.reviewMapping })
      return selected.status === 'ready' && Boolean(prepare(selected.slot))
    })
    return { availableChoices: [...availableChoices, 'rest'], alternativeAvailable: availableChoices.includes('alternative') }
  }

  function dailyLesson(runtime, { now, uiLocale = runtime?.plan?.uiLocale, choice = null, targetScaleId = null, confirmAlternative = false } = {}) {
    assertRuntime(runtime)
    if (typeof confirmAlternative !== 'boolean' || (choice !== null && !['keep', 'short', 'alternative', 'rest'].includes(choice))) fail('INVALID_DAY_CHOICE')
    const { journey, plan } = runtime, view = journeyStatus(journey, now), original = plan.slots[journey.nextDay - 1]
    const language = languageView(original?.practice?.contentLocale ?? plan.uiLocale, uiLocale)
    const restOnly = { availableChoices: ['rest'], alternativeAvailable: false }
    if (view.status !== 'lesson-ready') return { ...view, ...language, ...restOnly, lesson: null, slot: null }
    const choices = availableRegistry(runtime) ? preparedDayChoices(plan, journey.nextDay, targetScaleId) : restOnly
    if (choice === 'rest') return { ...view, ...language, ...choices, status: 'rest-chosen', lesson: null, slot: null, changesProgress: false, canRest: true, canStop: true }
    if (!availableRegistry(runtime)) return { ...view, ...language, ...choices, status: 'material-unavailable', reason: 'reviewed-registry-unavailable', lesson: null, slot: null, canRest: true }
    if (journey.preferences.stopOffer && !confirmAlternative) return { ...view, ...language, ...choices, status: 'choose-comfortable-option', lesson: null, slot: null, canRest: true, canStop: true, automaticIntensityIncrease: false }
    const checkin = journey.checkins[journey.nextDay]
    const short = journey.preferences.length === 'quick' || checkin.energy === 'low' || checkin.feelingChange === 'worse' || checkin.availableTime === 'quick'
    const selectedChoice = choice ?? (journey.preferences.alternativeRequested ? 'alternative' : short ? 'short' : 'keep')
    const selected = choosePersonalCourseDay(plan, { day: journey.nextDay, choice: selectedChoice, targetScaleId,
      mappings: registry.mappings, reviewMapping: registry.reviewMapping, feelingChange: checkin.feelingChange })
    const prepared = selected.status === 'ready' ? prepare(selected.slot) : null
    if (!prepared) return { ...view, ...language, ...choices, status: selectedChoice === 'alternative' ? 'alternative-unavailable' : 'material-unavailable',
      reason: selected.reason ?? selected.slot?.reason ?? 'exact-reviewed-content-unavailable', lesson: null, slot: null, canRest: true, canStop: true }
    const projected = projectionForChoice(journey, prepared.lesson)
    const checked = progressionLesson(projected, { now, locale: prepared.lesson.contentLocale, confirmAlternative,
      lessonFor: (track, day, locale, variant) => day === prepared.lesson.day && locale === prepared.lesson.contentLocale && variant === prepared.lesson.variant ? projectLesson(prepared.lesson) : null })
    if (checked.status !== 'ready') return { ...checked, ...language, ...choices, lesson: null, slot: null }
    return { ...checked, ...language, ...choices, track: selected.slot.topicId,
      relatedScaleIds: selected.slot.kind === 'review' ? clone(selected.slot.reviewScaleIds) : [selected.slot.selectedScaleId],
      lesson: clone(prepared.lesson), slot: clone(selected.slot), preparedContent: clone(prepared.preparedContent),
      selectedChoice, targetScaleId, planRevision: plan.revision, optional: null, repeatSuggestion: null,
      personalization: 'exact-reviewed-scale-objective-practice', changesProgress: false }
  }
  function projectionForChoice(journey, lesson) {
    const projected = projectJourney(journey)
    projected.preferences.length = lesson.variant === 'standard' ? 'standard' : 'quick'
    projected.preferences.alternativeRequested = lesson.variant === 'grounding'
    projected.checkins[journey.nextDay] = { ...projected.checkins[journey.nextDay], energy: null, feelingChange: null, availableTime: 'standard' }
    return projected
  }

  function finishDay(runtime, { day, lessonId = null, status = 'completed', expectedPlanRevision, ...options } = {}) {
    assertRuntime(runtime)
    if (expectedPlanRevision !== runtime.plan.revision) fail('STALE_PLAN_REVISION')
    const { journey } = runtime
    let current = null, projected = projectJourney(journey)
    if (status === 'completed') {
      current = dailyLesson(runtime, options)
      if (current.status !== 'ready' || current.lesson.id !== lessonId || day !== current.day) fail('EXACT_CURRENT_LESSON_REQUIRED')
      projected = projectionForChoice(journey, current.lesson)
    }
    const progressed = finishCourseDay(projected, { ...options, day, lessonId, status,
      locale: current?.lesson.contentLocale ?? runtime.plan.uiLocale,
      lessonFor: () => projectLesson(current?.lesson) })
    const nextJourney = restoreJourney(journey, progressed)
    // Projection-only preferences must not become user preferences. Apply only the
    // already validated, explicitly accepted feedback proposal to original values.
    nextJourney.preferences = clone(journey.preferences)
    const session = progressed.sessions[day]
    if (session.feedbackApplied) {
      const proposal = session.feedback.proposal
      if (proposal.length) nextJourney.preferences.length = proposal.length
      if (proposal.alternativeRequested) nextJourney.preferences.alternativeRequested = true
      if (proposal.stopOffer) nextJourney.preferences.stopOffer = true
    }
    nextJourney.sessions[day] = { ...session, track: current?.slot.topicId ?? null,
      planRevision: current?.slot.planRevision ?? runtime.plan.slots[day - 1].planRevision,
      practiceId: current?.slot.practiceId ?? null, skillId: current?.slot.skillId ?? null,
      slot: current ? clone(current.slot) : null, plannedSlot: clone(runtime.plan.slots[day - 1]),
      contentReference: current ? clone(current.lesson.practiceReference) : null,
      lessonSnapshot: current ? clone(current.lesson) : null,
      preparedContent: current ? clone(current.preparedContent) : null }
    return withJourney(runtime, nextJourney)
  }

  function reviewLesson(runtime, { day, uiLocale = runtime?.plan?.uiLocale } = {}) {
    assertRuntime(runtime)
    if (!Number.isInteger(day) || day < 1 || day > 21 || !runtime.journey.sessions[day]) fail('LESSON_NOT_YET_RELEASED')
    const session = exactArchivedSession(runtime, day)
    const locale = runtime.journey.sessions[day].lessonSnapshot?.contentLocale ?? runtime.journey.sessions[day].plannedSlot?.practice?.contentLocale ?? runtime.plan.uiLocale
    const language = languageView(locale, uiLocale)
    // A skip is not a completed practice eligible for repetition/continuation.
    if (runtime.journey.sessions[day].status === 'skipped') {
      const prepared = availableRegistry(runtime) ? prepare(runtime.journey.sessions[day].plannedSlot) : null
      return { ...language, status: prepared ? 'ready' : 'material-unavailable', lesson: prepared ? clone(prepared.lesson) : null,
        mode: 'optional-catchup', changesProgress: false }
    }
    return { ...language, status: session ? 'ready' : 'material-unavailable', lesson: session ? clone(session.lessonSnapshot) : null,
      slot: session ? clone(session.slot) : null, mode: 'optional-repeat', changesProgress: false }
  }

  function completion(runtime, { uiLocale = runtime?.plan?.uiLocale } = {}) {
    assertRuntime(runtime)
    languageView(runtime.plan.uiLocale, uiLocale)
    const summary = courseCompletion21(runtime.journey, { locale: uiLocale })
    if (!summary) return null
    const refs = summary.completedLessons.map(ref => {
      const session = exactArchivedSession(runtime, ref.day)
      return { ...ref, title: session?.lessonSnapshot.title ?? null, replayable: Boolean(session),
        contentLocale: session?.lessonSnapshot.contentLocale ?? null,
        practiceReference: session ? clone(session.contentReference) : null,
        selectedScaleId: session?.slot.selectedScaleId ?? null, reviewScaleIds: clone(session?.slot.reviewScaleIds ?? []) }
    })
    summary.completedLessons = refs
    summary.helpfulLessons = refs.filter(ref => runtime.journey.sessions[ref.day].feedback?.helpfulness === 'helpful').map(clone)
    if (summary.continuationPlan) summary.continuationPlan.practiceRefs = summary.continuationPlan.practiceRefs.map(ref => {
      const found = refs.find(candidate => sameFields(candidate, ref, ['id', 'day', 'track', 'lessonId', 'lessonVersion', 'lessonVariant']))
      return { ...ref, title: found?.title ?? null, replayable: found?.replayable === true }
    })
    return { ...summary, runtimeVersion: PERSONAL_COURSE_RUNTIME_VERSION, languagePolicy: 'pinned-per-plan-revision' }
  }

  function saveContinuation(runtime, { uiLocale = runtime?.plan?.uiLocale, ...options } = {}) {
    assertRuntime(runtime)
    const summary = completion(runtime, { uiLocale })
    const projected = projectJourney(runtime.journey)
    const next = saveCourseContinuation(projected, { ...options, locale: uiLocale,
      lessonFor: (track, day) => projectLesson(exactArchivedSession(runtime, day)?.lessonSnapshot) })
    const restored = restoreJourney(runtime.journey, next)
    restored.continuationPlan.practiceRefs = next.continuationPlan.practiceRefs.map(ref => {
      const actual = summary.completedLessons.find(candidate => candidate.day === ref.day)
      return Object.fromEntries(['id', 'day', 'track', 'lessonId', 'lessonVersion', 'lessonVariant'].map(key => [key, actual[key]]))
    })
    return withJourney(runtime, restored)
  }

  function revise(runtime, { fromDay, expectedRevision, expectedPlanRevision, now, consent = false,
    scales, selectedScaleIds, uiLocale, loadMinutes, weeklyAccents } = {}) {
    assertRuntime(runtime); needRegistry(runtime)
    if (expectedRevision !== runtime.journey.revision) fail('STALE_COURSE_REVISION')
    if (runtime.journey.status === 'finished' || fromDay < runtime.journey.nextDay) fail('PAST_PLAN_SLOTS_IMMUTABLE')
    if (fromDay !== runtime.journey.nextDay) fail('REVISION_MUST_START_AT_NEXT_UNRESOLVED_DAY')
    const plan = revisePersonalCoursePlan(runtime.plan, { fromDay, expectedRevision: expectedPlanRevision, consent,
      scales, selectedScaleIds, uiLocale, loadMinutes, weeklyAccents,
      mappings: registry.mappings, reviewMapping: registry.reviewMapping, sessions: Object.values(runtime.journey.sessions) })
    if (plan.status !== 'ready' || !preparedPlanRange(plan, fromDay)) fail('EXACT_PREPARED_CONTENT_REQUIRED')
    // Established monotonic-time/progress-CAS implementation; identical preferences.
    const journey = setCoursePreferences(runtime.journey, { ...runtime.journey.preferences, now, expectedRevision })
    journey.topics = topicChoices(plan).topics
    return { ...clone(runtime), journey, plan }
  }

  return Object.freeze({ create, dailyLesson, finishDay, reviewLesson, completion, saveContinuation, revise,
    checkIn(runtime, input) { assertRuntime(runtime); return withJourney(runtime, checkInBeforeLesson(runtime.journey, input)) },
    setPreferences(runtime, input) { assertRuntime(runtime); return withJourney(runtime, setCoursePreferences(runtime.journey, input)) },
    pause(runtime, input) { assertRuntime(runtime); return withJourney(runtime, pauseCourseJourney(runtime.journey, input)) },
    status(runtime, now) { assertRuntime(runtime); return journeyStatus(runtime.journey, now) },
  })
}
