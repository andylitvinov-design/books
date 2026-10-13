// Pure, opt-in planning contract. NOT a replacement for existing R3/21-day journeys.
// Integration must supply authorised, fully verified completed-result evidence and
// trusted reviewed mappings; client-provided `verified` / `reviewed` flags are not
// an authorisation or editorial-review boundary. This module performs no I/O.
//
// Scale evidence: { scaleId, identity: {...provenance(definition), dimensionKey},
//   resultId, measurementAt, verificationStatus: 'verified', resultStatus: 'completed',
//   value, min, max, unit, timeframe, direction, dimensionClass, sourceConstruct,
//   referenceStatus, interpretation: { status: 'available', identity, version,
//     contentHash: lowercase 64-hex report hash, source, meaning, value } }.
// This report hash is separate from identity.contentHash (instrument definition).
// Mapping: { identity, mappingVersion, status: 'reviewed', source, topicId,
//   curriculumVersion, practices: [Practice] }.
// Practice: { objectiveId, skillId, practiceId, contentVersion, contentLocale,
//   variant: 'standard'|'short'|'alternative', durationMinutes, intensity: 'gentle',
//   reviewStatus: 'reviewed', minimumEntry: true, recall?: { practiceId,
//     contentVersion, durationMinutes, reviewStatus: 'reviewed' } }.
// The exact objective-to-practice relation must itself have been reviewed. Matching
// a topic, day number or generic label is never a substitute. No mappings ship here.
// Review mapping: { mappingVersion, status: 'reviewed', source, curriculumVersion,
//   coversAllSelectedGoals: true, practices: [Practice] }.
// Practice durations include explanation/reflection. Recall is separately budgeted
// within the chosen total load, or explicitly replaces the main practice.
// The adapter owns access, full-result validity, dates/local-day release, saved
// session CAS, content retrieval, review provenance and UI. It must persist exact
// returned slot/binding on attempt, including an explicitly chosen day override.
import { getDefinitionById, provenance } from '../assessments/definitions.js'
import { scoreAssessment } from '../assessments/scoring.js'
import { CURRICULUM_21 } from '../../data/inner-growth/curriculum-21.js'

export const PERSONAL_COURSE_PLAN_VERSION = 'hh-personal-course-plan-21-v2'
const TOPICS = new Set(['energy_agency', 'inner_support', 'connection_boundaries', 'calm_regulation', 'emotional_flexibility', 'attention_clarity'])
const SCREENINGS = new Set(['phq-2', 'phq-4', 'phq-8', 'phq-9', 'phq-15', 'gad-2', 'gad-7', 'k6', 'k10', 'ces-d-20'])
const MIXED = new Set(['hh-money-pressure', 'hh-overthinking-loop', 'hh-screen-saturation'])
const SHAPE = ['min', 'max', 'unit', 'timeframe', 'direction', 'dimensionClass', 'sourceConstruct']
const clone = value => structuredClone(value)
const fail = code => { throw new Error(code) }
const text = value => typeof value === 'string' && value.trim().length > 0
const sameIdentity = (a, b) => Boolean(a && b && Object.keys(b).every(key => a[key] === b[key]))
const uniqueStrings = values => Array.isArray(values) && values.every(text) && new Set(values).size === values.length
const shapes = new Map()
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0

export function personalCourseObjective(day, uiLocale = 'en') {
  if (!Number.isInteger(day) || day < 1 || day > 21) fail('INVALID_LEARNING_DAY')
  if (!['en', 'ru'].includes(uiLocale)) fail('UNSUPPORTED_LOCALE')
  const entry = CURRICULUM_21.route.find(row => row.day === day)
  return { day, week: entry.week, review: entry.review, id: `${CURRICULUM_21.version}/day/${day}`,
    curriculumVersion: CURRICULUM_21.version, skill: entry.skill[uiLocale], objective: entry.objective[uiLocale] }
}
// A selectable 21-day goal needs both ordinary and low-load entry on every
// practice day. The same predicate is used by the profile and enrollment planner.
export function personalCourseReferencesReady(practices, days, locale) {
  if (!Array.isArray(practices)) return false
  const localized = practices.filter(p => p.contentLocale === locale)
  if (new Set(localized.map(p => p.practiceId)).size !== localized.length) return false
  return days.every(day => ['standard', 'short'].every(variant => localized.some(p =>
    p.objectiveId === personalCourseObjective(day, locale).id && p.variant === variant &&
    p.reviewStatus === 'reviewed' && p.minimumEntry === true && p.intensity === 'gentle' &&
    text(p.practiceId) && text(p.contentVersion) && text(p.skillId) && Number.isFinite(p.durationMinutes) &&
    p.durationMinutes > 0 && p.durationMinutes <= (variant === 'short' ? 2 : 5))))
}
function dimensionFor(identity) {
  try {
    const definition = getDefinitionById(identity?.definitionId)
    if (!sameIdentity(identity, provenance(definition))) return null
    if (!shapes.has(definition.id)) shapes.set(definition.id, scoreAssessment(definition,
      Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))).dimensions)
    return shapes.get(definition.id).find(d => d.key === identity.dimensionKey) ?? null
  } catch { return null }
}
function evidenceReason(scale) {
  const dimension = dimensionFor(scale?.identity)
  if (!dimension || scale.scaleId !== `${scale.identity.definitionId}/${scale.identity.dimensionKey}`) return 'identity-unavailable'
  if (scale.resultStatus !== 'completed' || scale.verificationStatus !== 'verified' || !text(scale.resultId) || !Number.isFinite(Date.parse(scale.measurementAt))) return 'result-unverified'
  if (scale.value == null) return 'measurement-missing'
  if (!SHAPE.every(key => scale[key] === dimension[key]) || !Number.isFinite(scale.value) || scale.value < dimension.min || scale.value > dimension.max) return 'measurement-invalid'
  const explanation = scale.interpretation
  if (explanation?.status !== 'available' || !sameIdentity(explanation.identity, scale.identity) ||
      !text(explanation.version) || typeof explanation.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(explanation.contentHash) ||
      !text(explanation.source) || !text(explanation.meaning) || explanation.value !== scale.value || !text(scale.referenceStatus)) return 'interpretation-unavailable'
  if (scale.identity.definitionKey === 'hh-resource-pulse' && scale.identity.dimensionKey === 'resources.overall') return 'aggregate-profile-only-not-a-separate-goal'
  if (SCREENINGS.has(scale.identity.definitionKey)) return 'screening-not-self-treatment'
  if (MIXED.has(scale.identity.definitionKey) || scale.dimensionClass === 'trait' ||
      !/^(higher|lower)-reported-/.test(scale.direction ?? '')) return 'not-a-directional-practice-goal'
  return null
}
function mappingFor(scale, mappings) {
  const matches = mappings.filter(mapping => sameIdentity(mapping?.identity, scale.identity))
  if (matches.length !== 1) return { mapping: null, reason: matches.length ? 'mapping-ambiguous' : 'mapping-unavailable' }
  const mapping = matches[0]
  if (mapping.status !== 'reviewed' || !text(mapping.mappingVersion) || !text(mapping.source) || !TOPICS.has(mapping.topicId) ||
      mapping.curriculumVersion !== CURRICULUM_21.version || !Array.isArray(mapping.practices)) return { mapping: null, reason: 'mapping-unverified' }
  return { mapping, reason: null }
}
// This is a display/eligibility catalog, deliberately never a severity ranking.
// Input order remains stable; no score, ratio or instrument is used as a sort key.
export function personalCourseScaleCatalog({ scales = [], mappings = [] } = {}) {
  if (!Array.isArray(scales) || !Array.isArray(mappings) || !uniqueStrings(scales.map(scale => scale?.scaleId))) fail('INVALID_SCALE_CATALOG')
  return scales.map(scale => {
    const reason = evidenceReason(scale)
    const mapped = reason ? { mapping: null, reason } : mappingFor(scale, mappings)
    const usable = !mapped.reason
    const directional = !reason
    const rawPosition = directional ? (scale.value - scale.min) / (scale.max - scale.min) : null
    return { scaleId: scale.scaleId, identity: clone(scale.identity ?? null), resultId: scale.resultId ?? null,
      measurementAt: scale.measurementAt ?? null, rawValue: scale.value ?? null,
      range: { min: scale.min ?? null, max: scale.max ?? null, unit: scale.unit ?? null },
      source: scale.interpretation?.source ?? null, sourceMetadata: clone(scale.interpretation?.sourceMetadata ?? null), interpretationVersion: scale.interpretation?.version ?? null,
      interpretationContentHash: scale.interpretation?.contentHash ?? null,
      meaning: reason === 'interpretation-unavailable' ? null : scale.interpretation?.meaning ?? null,
      polarity: { direction: scale.direction ?? null, dimensionClass: scale.dimensionClass ?? null },
      referenceStatus: scale.referenceStatus ?? null, rawPosition,
      supportPosition: directional ? (scale.direction.startsWith('lower-') ? 1 - rawPosition : rawPosition) : null,
      positionMeaning: 'within-own-scale-only-not-norm-or-comparable-severity',
      automaticDeficit: false, status: usable ? 'available' : 'unsupported', reason: mapped.reason,
      topicId: mapped.mapping?.topicId ?? null, mappingVersion: mapped.mapping?.mappingVersion ?? null,
      mappingRationale: clone(mapped.mapping?.rationale ?? null), mappingLimitations: clone(mapped.mapping?.limitations ?? null),
      mappingSourceMetadata: clone(mapped.mapping?.sourceMetadata ?? null), familyReuse: clone(mapped.mapping?.familyReuse ?? null) }
  })
}
// Coverage is allocated to DISTINCT topics, before accents. Scale multiplicity
// cannot increase topic weight. Omitted accents use the confirmed user order;
// an explicit secondaryTopicId:null gives remaining accent slots to the primary
// for 3+ topics. The specified two-topic pattern remains balanced and alternating.
export function personalCourseWeekTopics(topicIds, accents = {}) {
  if (!uniqueStrings(topicIds) || topicIds.length < 1 || topicIds.length > 5) fail('INVALID_TOPIC_ORDER')
  const primary = accents.primaryTopicId ?? topicIds[0]
  const secondary = Object.hasOwn(accents, 'secondaryTopicId') ? accents.secondaryTopicId : topicIds.find(id => id !== primary) ?? null
  if (!topicIds.includes(primary) || (secondary !== null && (!topicIds.includes(secondary) || secondary === primary))) fail('INVALID_WEEKLY_ACCENTS')
  const ordered = [primary, ...(secondary ? [secondary] : []), ...topicIds.filter(id => id !== primary && id !== secondary)]
  const result = [...ordered]
  let extra = 0
  while (result.length < 6) {
    result.push(topicIds.length === 2 ? ordered[extra++ % 2] : secondary && extra++ % 2 === 1 ? secondary : primary)
  }
  return result
}
function validPractice(practice, objective, locale) {
  return practice && practice.objectiveId === objective.id && practice.contentLocale === locale &&
    text(practice.skillId) && text(practice.practiceId) && text(practice.contentVersion) &&
    ['standard', 'short', 'alternative'].includes(practice.variant) && practice.reviewStatus === 'reviewed' &&
    practice.minimumEntry === true && practice.intensity === 'gentle' &&
    Number.isFinite(practice.durationMinutes) && practice.durationMinutes > 0 && practice.durationMinutes <= 8
}
function choosePractice(practices, objective, locale, loadMinutes, variant, usedSkills = []) {
  const candidates = practices.filter(p => validPractice(p, objective, locale) && p.durationMinutes <= loadMinutes &&
    (variant ? p.variant === variant : ['standard', 'short'].includes(p.variant)))
  candidates.sort((a, b) => Number(usedSkills.includes(a.skillId)) - Number(usedSkills.includes(b.skillId)) ||
    (variant ? 0 : Number(a.variant !== 'standard') - Number(b.variant !== 'standard')) ||
    compare(a.skillId, b.skillId) || compare(a.practiceId, b.practiceId))
  // Duplicate IDs with different content are ambiguous, not permission to choose.
  if (new Set(candidates.map(p => p.practiceId)).size !== candidates.length) return null
  return candidates[0] ? clone(candidates[0]) : null
}
function baseSlot(day, locale, revision, loadMinutes) {
  const objective = personalCourseObjective(day, locale)
  return { day, week: objective.week, kind: objective.review ? 'review' : 'practice', commonObjective: objective,
    planRevision: revision, loadMinutes, status: 'unsupported', reason: 'practice-unavailable',
    topicId: null, selectedScaleId: null, skillId: null, practiceId: null, practice: null, provenanceBinding: null,
    requiresPreviousCompletion: false, claimsMastery: false, automaticIntensityIncrease: false }
}
function practiceSlot(base, row, mapping, practice) {
  const binding = { identity: clone(row.identity), resultId: row.resultId, measurementAt: row.measurementAt,
    rawValue: row.rawValue, range: clone(row.range), polarity: clone(row.polarity), source: row.source, sourceMetadata: clone(row.sourceMetadata ?? null),
    interpretationVersion: row.interpretationVersion, interpretationContentHash: row.interpretationContentHash, referenceStatus: row.referenceStatus,
    mappingVersion: mapping.mappingVersion, mappingSource: mapping.source,
    mappingRationale: clone(row.mappingRationale ?? null), mappingLimitations: clone(row.mappingLimitations ?? null),
    mappingSourceMetadata: clone(row.mappingSourceMetadata ?? null), familyReuse: clone(row.familyReuse ?? null),
    curriculumVersion: base.commonObjective.curriculumVersion, objectiveId: base.commonObjective.id,
    skillId: practice?.skillId ?? null, practiceId: practice?.practiceId ?? null,
    contentVersion: practice?.contentVersion ?? null, contentLocale: practice?.contentLocale ?? null }
  return { ...base, topicId: row.topicId, selectedScaleId: row.scaleId,
    status: practice ? 'ready' : 'unsupported', reason: practice ? null : 'reviewed-objective-practice-unavailable',
    skillId: practice?.skillId ?? null, practiceId: practice?.practiceId ?? null, practice, provenanceBinding: binding }
}
function reviewSlot(base, selected, reviewMapping, locale, variant = null) {
  const reviewed = reviewMapping?.status === 'reviewed' && text(reviewMapping.mappingVersion) && text(reviewMapping.source) &&
    reviewMapping.curriculumVersion === CURRICULUM_21.version && reviewMapping.coversAllSelectedGoals === true && Array.isArray(reviewMapping.practices)
  const practice = reviewed ? choosePractice(reviewMapping.practices, base.commonObjective, locale, base.loadMinutes, variant) : null
  return { ...base, reviewScaleIds: selected.map(row => row.scaleId),
    status: practice ? 'ready' : 'unsupported', reason: practice ? null : 'review-material-unavailable',
    skillId: practice?.skillId ?? null, practiceId: practice?.practiceId ?? null, practice,
    provenanceBinding: practice ? { mappingVersion: reviewMapping.mappingVersion, mappingSource: reviewMapping.source,
      coversAllSelectedGoals: true,
      objectiveId: base.commonObjective.id, curriculumVersion: CURRICULUM_21.version,
      contentVersion: practice.contentVersion, contentLocale: practice.contentLocale,
      skillId: practice.skillId, practiceId: practice.practiceId,
      goals: selected.map(row => ({ scaleId: row.scaleId, identity: clone(row.identity), resultId: row.resultId, sourceMetadata: clone(row.sourceMetadata ?? null),
        interpretationVersion: row.interpretationVersion, interpretationContentHash: row.interpretationContentHash,
        mappingVersion: row.mappingVersion, mappingRationale: clone(row.mappingRationale ?? null),
        mappingLimitations: clone(row.mappingLimitations ?? null), mappingSourceMetadata: clone(row.mappingSourceMetadata ?? null),
        familyReuse: clone(row.familyReuse ?? null) })) } : null }
}
function summary(slots, selected) {
  return { readySlots: slots.filter(slot => slot.status === 'ready').length,
    unsupportedDays: slots.filter(slot => slot.status !== 'ready').map(slot => ({ day: slot.day, reason: slot.reason })),
    scaleCoverage: selected.map(row => ({ scaleId: row.scaleId,
      practiceDays: slots.filter(slot => slot.status === 'ready' && slot.selectedScaleId === row.scaleId).map(slot => slot.day),
      reviewDays: slots.filter(slot => slot.status === 'ready' && slot.kind === 'review' && slot.reviewScaleIds?.includes(row.scaleId)).map(slot => slot.day) })) }
}
function validateWeeklyAccents(value) {
  const plain = row => row && typeof row === 'object' && !Array.isArray(row) && [Object.prototype, null].includes(Object.getPrototypeOf(row))
  if (!plain(value) || Object.keys(value).some(key => !['1', '2', '3'].includes(key))) fail('INVALID_WEEKLY_ACCENTS')
  for (const row of Object.values(value)) {
    if (!plain(row) || Object.keys(row).some(key => !['primaryTopicId', 'secondaryTopicId'].includes(key)) ||
        (Object.hasOwn(row, 'primaryTopicId') && !TOPICS.has(row.primaryTopicId)) ||
        (Object.hasOwn(row, 'secondaryTopicId') && row.secondaryTopicId !== null && !TOPICS.has(row.secondaryTopicId))) fail('INVALID_WEEKLY_ACCENTS')
  }
}
function buildPersonalCoursePlan({ scales = [], mappings = [], reviewMapping = null, selectedScaleIds,
  weeklyAccents = {}, loadMinutes = 5, uiLocale = 'en', consent = false } = {},
  { preservedSlots = [], revision = 0, sessions = [] } = {}) {
  if (consent !== true) fail('EXPLICIT_PLAN_CONSENT_REQUIRED')
  personalCourseObjective(1, uiLocale)
  validateWeeklyAccents(weeklyAccents)
  if (![2, 5, 8].includes(loadMinutes)) fail('INVALID_CHOSEN_LOAD')
  const catalog = personalCourseScaleCatalog({ scales, mappings })
  if (!uniqueStrings(selectedScaleIds) || !selectedScaleIds.length || selectedScaleIds.length > 5) fail('CHOOSE_ONE_TO_FIVE_EXACT_SCALES')
  const selected = selectedScaleIds.map(id => catalog.find(row => row.scaleId === id) ?? fail('UNKNOWN_SELECTED_SCALE'))
  if (selected.length < Math.min(3, catalog.filter(row => row.status === 'available' && personalCourseReferencesReady(
    mappings.find(mapping => sameIdentity(mapping.identity, row.identity))?.practices,
    Array.from({ length: 21 }, (_, index) => index + 1).filter(day => day % 7 !== 0), uiLocale)).length)) fail('CHOOSE_THREE_TO_FIVE_WHEN_AVAILABLE')
  // An unsupported selected goal blocks the whole personalised plan. It is never
  // silently dropped, mapped by topic, or replaced with generic self-help content.
  const unsupported = selected.filter(row => row.status !== 'available')
  const topics = [...new Set(selected.map(row => row.topicId).filter(Boolean))]
  const scaleUses = Object.fromEntries(selected.map(row => [row.scaleId, 0]))
  const usedSkills = Object.fromEntries(topics.map(topic => [topic, []]))
  const slots = clone(preservedSlots)
  // Count only retained slots, never the hypothetical prefix of a newly generated
  // plan. Saved completed overrides describe the actual chosen scale/skill. Slots
  // remain immutable; these counts allocate opportunities, not claimed mastery.
  const prefix = preservedSlots.map(slot => sessions.find(session => session.day === slot.day && session.status === 'completed')?.slot ?? slot)
  for (const slot of prefix) {
    if (slot.kind !== 'practice' || slot.status !== 'ready') continue
    if (Object.hasOwn(scaleUses, slot.selectedScaleId)) scaleUses[slot.selectedScaleId]++
    if (usedSkills[slot.topicId]) usedSkills[slot.topicId].push(slot.skillId)
  }
  for (let week = 1; week <= 3; week++) {
    if (week * 7 <= preservedSlots.length) continue
    const queue = unsupported.length ? [] : personalCourseWeekTopics(topics, weeklyAccents[week])
    // Remove each retained topic occurrence once from this week's coverage-first
    // queue. Newly introduced topics keep their first slots ahead of accents.
    for (const slot of prefix.filter(slot => slot.week === week && slot.kind === 'practice' && slot.status === 'ready')) {
      const index = queue.indexOf(slot.topicId)
      if (index !== -1) queue.splice(index, 1)
    }
    for (let position = 0; position < 7; position++) {
      const day = (week - 1) * 7 + position + 1
      if (day <= preservedSlots.length) continue
      const base = baseSlot(day, uiLocale, revision, loadMinutes)
      if (unsupported.length) { slots.push({ ...base, reason: 'selected-scale-unsupported', unsupportedScaleIds: unsupported.map(row => row.scaleId) }); continue }
      if (position === 6) { slots.push(reviewSlot(base, selected, reviewMapping, uiLocale)); continue }
      const topic = queue.shift(), withinTopic = selected.filter(row => row.topicId === topic)
      const row = withinTopic.reduce((least, candidate) => scaleUses[candidate.scaleId] < scaleUses[least.scaleId] ? candidate : least)
      const mapping = mappingFor(scales.find(scale => scale.scaleId === row.scaleId), mappings).mapping
      scaleUses[row.scaleId]++
      const practice = choosePractice(mapping.practices, base.commonObjective, uiLocale, loadMinutes, null, usedSkills[topic])
      if (practice) usedSkills[topic].push(practice.skillId)
      slots.push(practiceSlot(base, row, mapping, practice))
    }
  }
  return { version: PERSONAL_COURSE_PLAN_VERSION, revision, durationDays: 21, uiLocale, loadMinutes,
    selectedScaleIds: [...selectedScaleIds], selectedScales: clone(selected), topicOrder: topics,
    weeklyAccents: clone(weeklyAccents), slots, status: slots.every(slot => slot.status === 'ready') ? 'ready' : 'unsupported',
    coverage: summary(slots, selected), unsupportedScales: clone(unsupported),
    clinicalSeverityComparison: false, automaticDiagnosis: false, automaticTreatment: false,
    habitGuarantee: false, productionIntegrated: false, externalTransmission: false }
}
export function createPersonalCoursePlan(input) {
  return buildPersonalCoursePlan(input)
}
function assertPlan(plan) {
  if (plan?.version !== PERSONAL_COURSE_PLAN_VERSION || !Number.isInteger(plan.revision) || plan.revision < 0 ||
      !Array.isArray(plan.slots) || plan.slots.length !== 21 || plan.slots.some((slot, index) => slot.day !== index + 1)) fail('INVALID_PERSONAL_PLAN')
}
// Caller supplies ALL immutable persisted attempts. The adapter must persist the
// chosen slot snapshot; an override is not allowed to masquerade as its old slot.
function checkedSessions(plan, sessions) {
  if (!Array.isArray(sessions) || new Set(sessions.map(s => s.day)).size !== sessions.length) fail('INVALID_SESSION_HISTORY')
  for (const session of sessions) {
    if (!Number.isInteger(session.day) || session.day < 1 || session.day > 21 ||
        !['completed', 'skipped', 'stopped', 'deferred'].includes(session.status)) fail('INVALID_SESSION_HISTORY')
    if (session.status === 'completed' && (session.slot?.status !== 'ready' || session.slot.day !== session.day ||
        !Number.isInteger(session.slot.planRevision) || session.slot.planRevision < 0 || session.slot.planRevision > plan.revision ||
        !session.slot.provenanceBinding || session.practiceId !== session.slot.practiceId || session.skillId !== session.slot.skillId ||
        session.slot.provenanceBinding.practiceId !== session.practiceId || session.slot.provenanceBinding.skillId !== session.skillId ||
        session.slot.provenanceBinding.contentVersion !== session.slot.practice?.contentVersion)) fail('EXACT_COMPLETED_SLOT_REQUIRED')
  }
  return sessions
}
// Confirmed edits only affect days after every saved attempt (including skipped /
// stopped / deferred attempts). Existing sessions remain external and unmodified.
// Existing slots retain exact revision, locale, identity and content. An undo is
// another explicit future revision with the earlier choices, never history edits.
// Revisions require the complete current evidence/content/selection snapshot.
// Omitted locale, load and accents inherit the user's prior choices.
export function revisePersonalCoursePlan(plan, { fromDay, expectedRevision, consent = false, sessions = [], ...input } = {}) {
  assertPlan(plan)
  if (consent !== true) fail('EXPLICIT_REVISION_CONSENT_REQUIRED')
  if (expectedRevision !== plan.revision) fail('STALE_PLAN_REVISION')
  if (!Number.isInteger(fromDay) || fromDay < 1 || fromDay > 21) fail('INVALID_REVISION_DAY')
  if (fromDay < (plan.revisedFromDay ?? 1)) fail('PAST_PLAN_SLOTS_IMMUTABLE')
  checkedSessions(plan, sessions)
  if (sessions.some(session => session.day >= fromDay)) fail('PAST_SESSIONS_IMMUTABLE')
  if (['scales', 'mappings', 'reviewMapping', 'selectedScaleIds'].some(key => !Object.hasOwn(input, key) || input[key] === undefined)) fail('COMPLETE_REVISION_SNAPSHOT_REQUIRED')
  const next = buildPersonalCoursePlan({ ...input, consent: true,
    uiLocale: input.uiLocale === undefined ? plan.uiLocale : input.uiLocale,
    loadMinutes: input.loadMinutes === undefined ? plan.loadMinutes : input.loadMinutes,
    weeklyAccents: input.weeklyAccents === undefined ? plan.weeklyAccents : input.weeklyAccents },
  { preservedSlots: plan.slots.slice(0, fromDay - 1), revision: plan.revision + 1, sessions })
  next.revisedFromDay = fromDay
  next.previousRevision = plan.revision
  return next
}
// A day choice is a preview, not a saved edit, session, or completion. Null/missing
// feedback never changes the plan. Worsening/missed time only offers short/rest;
// it adds neither work nor intensity. Target changes stay within exact chosen goals.
export function choosePersonalCourseDay(plan, { day, mappings = [], reviewMapping = null, targetScaleId = null, choice = 'keep',
  feedback = null, feelingChange = null, missed = false } = {}) {
  assertPlan(plan)
  personalCourseObjective(day, plan.uiLocale)
  if (!['keep', 'short', 'alternative', 'rest'].includes(choice) || ![null, 'better', 'same', 'worse'].includes(feelingChange) || typeof missed !== 'boolean') fail('INVALID_DAY_CHOICE')
  const original = plan.slots[day - 1]
  const offers = { canRest: true, canStop: true, shortOffered: feelingChange === 'worse' || missed ||
    feedback?.difficulty === 'too-hard' || feedback?.comfort === 'uncomfortable', preferenceChangeRequiresConfirmation: true }
  if (choice === 'rest') return { status: 'rest-chosen', day, slot: null, feedback: clone(feedback), ...offers, changesPlan: false, changesProgress: false }
  if (plan.unsupportedScales.length) return { status: 'unsupported', reason: 'selected-scale-unsupported', slot: null,
    ...offers, changesPlan: false, changesProgress: false }
  if (original.kind === 'review' && targetScaleId !== null) return { status: 'unsupported', reason: 'review-target-override-forbidden', slot: null, ...offers, changesPlan: false, changesProgress: false }
  if (targetScaleId === null && choice === 'keep') return { status: original.status, slot: clone(original), feedback: clone(feedback), ...offers, changesPlan: false, changesProgress: false }
  if (original.kind === 'review') {
    const binding = original.provenanceBinding
    const pinned = binding && reviewMapping?.mappingVersion === binding.mappingVersion && reviewMapping?.source === binding.mappingSource &&
      reviewMapping?.curriculumVersion === binding.curriculumVersion && binding.coversAllSelectedGoals === true &&
      reviewMapping?.coversAllSelectedGoals === true && Array.isArray(binding.goals) &&
      binding.goals.length === original.reviewScaleIds.length && binding.goals.every((goal, index) => goal.scaleId === original.reviewScaleIds[index])
    if (!pinned) return { status: 'unsupported', reason: 'pinned-review-mapping-unavailable', slot: null, ...offers, changesPlan: false, changesProgress: false }
    const limit = choice === 'short' ? Math.min(2, original.loadMinutes, original.practice.durationMinutes) : original.loadMinutes
    const slot = reviewSlot({ ...original, loadMinutes: limit }, binding.goals, reviewMapping, original.provenanceBinding.contentLocale, choice)
    return { status: slot.status, slot, feedback: clone(feedback), ...offers, changesPlan: false, changesProgress: false }
  }
  const selectedId = targetScaleId ?? original.selectedScaleId
  const row = plan.selectedScales.find(scale => scale.scaleId === selectedId)
  if (!row) fail('TARGET_NOT_IN_CONFIRMED_SELECTION')
  if (row.status !== 'available') return { status: 'unsupported', reason: row.reason, slot: null, ...offers, changesPlan: false, changesProgress: false }
  const mapped = mappingFor({ identity: row.identity }, mappings)
  if (!mapped.mapping || mapped.mapping.mappingVersion !== row.mappingVersion) return { status: 'unsupported', reason: 'pinned-mapping-unavailable', slot: null, ...offers, changesPlan: false, changesProgress: false }
  const limit = choice === 'short' ? Math.min(2, original.loadMinutes) : original.loadMinutes
  const practice = choosePractice(mapped.mapping.practices, original.commonObjective, plan.uiLocale, limit, choice === 'keep' ? null : choice)
  const slot = practiceSlot({ ...original, loadMinutes: limit }, row, mapped.mapping, practice)
  return { status: slot.status, slot, feedback: clone(feedback), ...offers, changesPlan: false, changesProgress: false }
}
// Optional recall is allowed only 2–3 LEARNING positions after an actual,
// comfortable completed practice. Never infer completion/comfort from a score,
// helpfulness alone, silence, or an elapsed calendar date. No extra debt is added.
export function personalCourseRecall(plan, { day, sessions = [], chosenSlot = null, replaceMain = false } = {}) {
  assertPlan(plan)
  personalCourseObjective(day, plan.uiLocale)
  if (typeof replaceMain !== 'boolean') fail('INVALID_RECALL_CHOICE')
  const main = chosenSlot ?? plan.slots[day - 1]
  if (main.day !== day || main.status !== 'ready' || main.kind === 'review') return null
  const planned = plan.slots[day - 1]
  if (main.planRevision !== planned.planRevision || main.commonObjective?.id !== planned.commonObjective.id ||
      !Number.isFinite(main.loadMinutes) || main.loadMinutes > planned.loadMinutes || main.loadMinutes <= 0 ||
      !main.practice || !Number.isFinite(main.practice.durationMinutes) || main.practice.durationMinutes <= 0 ||
      main.practice.durationMinutes > main.loadMinutes) fail('INVALID_RECALL_MAIN_SLOT')
  const budget = main.loadMinutes - (replaceMain ? 0 : main.practice.durationMinutes)
  const history = checkedSessions(plan, sessions)
  const candidates = history.filter(session => {
    const slot = session.slot, recall = slot?.practice?.recall
    const laterDifficulty = history.some(later => later.day > session.day && later.day < day && later.skillId === session.skillId &&
      (later.feedback?.comfort === 'uncomfortable' || later.feedback?.difficulty === 'too-hard' || later.feedback?.helpfulness === 'not-helpful'))
    return session.status === 'completed' && session.feedback?.comfort === 'comfortable' &&
      session.feedback?.helpfulness !== 'not-helpful' && session.feedback?.difficulty !== 'too-hard' &&
      !laterDifficulty && [2, 3].includes(day - session.day) && slot.kind === 'practice' && plan.selectedScaleIds.includes(slot.selectedScaleId) &&
      recall?.reviewStatus === 'reviewed' && text(recall.practiceId) && text(recall.contentVersion) &&
      Number.isFinite(recall.durationMinutes) && recall.durationMinutes > 0 && recall.durationMinutes <= budget
  }).sort((a, b) => b.day - a.day || compare(a.practiceId, b.practiceId))
  const found = candidates[0]
  return found ? { optional: true, fromDay: found.day, scaleId: found.slot.selectedScaleId, skillId: found.skillId,
    practiceId: found.slot.practice.recall.practiceId, contentVersion: found.slot.practice.recall.contentVersion,
    durationMinutes: found.slot.practice.recall.durationMinutes, sourcePracticeId: found.practiceId,
    sourceProvenanceBinding: clone(found.slot.provenanceBinding), mode: replaceMain ? 'replace-main' : 'within-chosen-load',
    changesProgress: false, claimsMastery: false, totalMinutes: found.slot.practice.recall.durationMinutes + (replaceMain ? 0 : main.practice.durationMinutes) } : null
}
