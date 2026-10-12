/**
 * Pure, browser-safe, optional goal observations. No score, note, provider, storage,
 * notification, scheduling, diagnosis, intensity or course-progress operations.
 *
 * Trust boundary: application code supplies the actual current runtime slot and
 * its reviewGoals, approved catalog bytes, owner-validated choices, and timestamp.
 * Do not pass request JSON as a slot, catalog, prepared snapshot, or saved history.
 * Ownership, persisted snapshot integrity, encryption and the finish-day CAS are
 * the caller's responsibility. Persist the record with the actual resolved session
 * as session.goalObservations; never regenerate old observations from today's plan.
 * A skipped lesson has no ratings: its caller should omit goalObservations.
 *
 * API:
 * createCourseGoalObservationSnapshot({ day, slot, reviewGoals?, statements?, contentLocale? })
 * recordCourseGoalObservations({ snapshot, choices?, observedAt, localDate })
 *   choices: [{ goalId, statementId, statementKey, seriesId, rating: 1..5 | 'skip' | 'missing' }]
 *   Omitted choice => missing, never zero. No arbitrary submission text is accepted.
 * buildCourseGoalWeeklyReports({ sessions?, resolvedThroughDay })
 *   sessions is the immutable journey.sessions object or an array of sessions.
 *   resolvedThroughDay is the trusted journey.nextDay - 1, not calendar elapsed time.
 *   Reports require the resolved checkpoint session itself. Missing earlier saved
 *   sessions/snapshots remain explicitly unknown; no historical prompts are invented.
 *
 * A series groups the exact goal identity, paraphrase family ID/version and
 * language. Intended close-meaning variants share this series; psychometric
 * equivalence is NOT established. Material meaning changes require a new family
 * version. Exact variant ID/version/hash/text are retained in each observation.
 * statementKey additionally binds full exact variant bytes to reject stale
 * submissions. Neither key is a credential or proof of authenticity. Reports
 * use archived snapshots, without looking up today's mutable catalog.
 */
import {
  COURSE_GOAL_AGREEMENT_ANCHORS,
  COURSE_GOAL_OBSERVATION_COPY,
  COURSE_GOAL_STATEMENTS_V1,
} from '../../data/inner-growth/course-goal-statements-v1.js'

export const COURSE_GOAL_OBSERVATIONS_VERSION = 'hh-course-goal-observations-v1'
export const COURSE_GOAL_WEEKLY_REPORT_VERSION = 'hh-course-goal-weekly-report-v1'
const IDENTITY_KEYS = ['definitionId', 'definitionKey', 'definitionVersion', 'instrumentLocale', 'translationVersion', 'contentHash', 'scoringKey', 'scoringVersion', 'resultVersion', 'timeframe', 'dimensionKey']
const SUPPORTED = Object.freeze({
  'hh-weekly-pulse': ['weekly.tension', 'weekly.load', 'weekly.recovery', 'weekly.energy', 'weekly.mood', 'weekly.clarity', 'weekly.connection', 'weekly.functioning'],
  'hh-resource-pulse': ['resource.energy', 'resource.support', 'resource.agency', 'resource.connection', 'resource.self_support', 'resource.meaning'],
})
const fail = code => { throw new Error(code) }
const clone = value => structuredClone(value)
const plain = value => Boolean(value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)))
const text = (value, max = 400) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const keysWithin = (value, keys) => plain(value) && Object.keys(value).every(key => keys.includes(key))
const hasExactKeys = (value, keys) => keysWithin(value, keys) && Object.keys(value).length === keys.length
const dayValid = day => Number.isInteger(day) && day >= 1 && day <= 21
const localeValid = locale => ['en', 'ru'].includes(locale)
const revisionValid = revision => Number.isInteger(revision) && revision >= 0
const hashValid = value => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value)
const bilingual = value => hasExactKeys(value, ['en', 'ru']) && ['en', 'ru'].every(locale => text(value[locale]))
const deepFreeze = value => {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(deepFreeze) }
  return value
}
const properties = (value, keys) => Object.fromEntries(keys.map(key => [key, value[key]]))
const noEffectFlags = () => ({
  measure: 'optional-subjective-statement-agreement', formalAssessment: false,
  clinicalValidation: false, recoveryMeasure: false, automaticEvaluation: false,
  changesProgress: false, automaticIntensityIncrease: false, changesIntensity: false,
  externalTransmission: false, privateCabinetOnly: true,
})
function identityValid(identity) {
  return hasExactKeys(identity, IDENTITY_KEYS) && IDENTITY_KEYS.every(key => text(identity[key])) &&
    localeValid(identity.instrumentLocale) && hashValid(identity.contentHash) &&
    Object.hasOwn(SUPPORTED, identity.definitionKey) && SUPPORTED[identity.definitionKey].includes(identity.dimensionKey)
}
const sameIdentity = (a, b) => identityValid(a) && identityValid(b) && IDENTITY_KEYS.every(key => a[key] === b[key])
const goalIdFor = identity => `${identity.definitionId}/${identity.dimensionKey}`
const validTime = value => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) && validLocalDate(value.slice(0, 10))
const validLocalDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value

// Browser-safe canonical keys; no hash cache, scoring, async state or I/O.
function seriesKey(row) {
  return `hh-goal-series:${encodeURIComponent(JSON.stringify([
    row.goalId, IDENTITY_KEYS.map(key => row.goalIdentity[key]), row.statementFamilyId,
    row.statementFamilyVersion, row.contentLocale,
  ]))}`
}
function statementKey(row) {
  return `hh-goal-statement:${encodeURIComponent(JSON.stringify([
    row.seriesId, row.statementId, row.statementVersion, row.contentLocale,
    row.statementContentHash, row.statementText,
  ]))}`
}
function exactStatement(identity, locale, day, statements) {
  if (!Array.isArray(statements) || statements.length > 100) fail('INVALID_GOAL_STATEMENT_CATALOG')
  const matches = statements.filter(statement => plain(statement) && statement.definitionKey === identity.definitionKey &&
    statement.dimensionKey === identity.dimensionKey && Array.isArray(statement.identities) &&
    statement.identities.some(binding => sameIdentity(binding, identity)))
  if (matches.length !== 1) fail('EXACT_GOAL_STATEMENT_REQUIRED')
  const found = matches[0]
  if (!text(found.statementFamilyId, 200) || !text(found.version, 200) || !bilingual(found.goalLabel) ||
    found.wordingPolicy !== 'intended-close-meaning-paraphrases' || found.equivalenceEstablished !== false ||
    !Array.isArray(found.variants) || found.variants.length !== 3 ||
    new Set(found.variants.map(variant => variant?.statementId)).size !== found.variants.length ||
    found.variants.some(variant => !text(variant?.statementId, 200) || !text(variant?.version, 200) ||
      !bilingual(variant.text) || !hasExactKeys(variant.contentHash, ['en', 'ru']) ||
      !['en', 'ru'].every(language => hashValid(variant.contentHash[language])))) fail('INVALID_GOAL_STATEMENT_CATALOG')
  // Rotate by learning day, including a block offset so a goal scheduled every
  // three days still encounters different variants. No ratings influence choice.
  const variant = found.variants[((day - 1) + Math.floor((day - 1) / 3)) % found.variants.length]
  return {
    statementFamilyId: found.statementFamilyId, statementFamilyVersion: found.version,
    statementId: variant.statementId, statementVersion: variant.version,
    contentLocale: locale, statementContentHash: variant.contentHash[locale], statementText: variant.text[locale],
    goalLabel: clone(found.goalLabel),
  }
}
function exactGoals(slot, suppliedReviewGoals) {
  const binding = slot.provenanceBinding
  if (slot.kind === 'practice') {
    if (suppliedReviewGoals !== undefined && (!Array.isArray(suppliedReviewGoals) || suppliedReviewGoals.length !== 0)) fail('UNEXPECTED_REVIEW_GOALS')
    if (!identityValid(binding?.identity) || slot.selectedScaleId !== goalIdFor(binding.identity)) fail('EXACT_CHOSEN_GOAL_REQUIRED')
    return [{ goalId: slot.selectedScaleId, identity: binding.identity }]
  }
  if (slot.kind !== 'review' || ![7, 14, 21].includes(slot.day) || slot.selectedScaleId !== null ||
    binding?.coversAllSelectedGoals !== true || !Array.isArray(binding.goals) || !Array.isArray(slot.reviewScaleIds) ||
    binding.goals.length < 1 || binding.goals.length > 5 || new Set(slot.reviewScaleIds).size !== slot.reviewScaleIds.length ||
    binding.goals.length !== slot.reviewScaleIds.length) fail('EXACT_REVIEW_GOALS_REQUIRED')
  const goals = binding.goals
  if (goals.some((goal, index) => !identityValid(goal?.identity) || goal.scaleId !== slot.reviewScaleIds[index] || goal.scaleId !== goalIdFor(goal.identity))) fail('EXACT_REVIEW_GOALS_REQUIRED')
  if (suppliedReviewGoals !== undefined && (!Array.isArray(suppliedReviewGoals) || suppliedReviewGoals.length !== goals.length ||
    suppliedReviewGoals.some((goal, index) => goal?.scaleId !== goals[index].scaleId || !sameIdentity(goal.identity, goals[index].identity)))) fail('EXACT_REVIEW_GOALS_REQUIRED')
  return goals.map(goal => ({ goalId: goal.scaleId, identity: goal.identity }))
}

export function createCourseGoalObservationSnapshot({ day, slot = null, reviewGoals, statements = COURSE_GOAL_STATEMENTS_V1,
  contentLocale = slot?.practice?.contentLocale } = {}) {
  if (!dayValid(day)) fail('INVALID_GOAL_OBSERVATION_DAY')
  // Missing/rest/old runtime material never creates a hypothetical prompt.
  if (slot === null) return null
  if (!plain(slot) || slot.status !== 'ready' || slot.day !== day || !revisionValid(slot.planRevision) ||
    !localeValid(contentLocale) || contentLocale !== slot.practice?.contentLocale ||
    contentLocale !== slot.provenanceBinding?.contentLocale) fail('EXACT_GOAL_OBSERVATION_SLOT_REQUIRED')
  const rows = exactGoals(slot, reviewGoals).map(goal => {
    const row = { goalId: goal.goalId, goalIdentity: properties(goal.identity, IDENTITY_KEYS),
      ...exactStatement(goal.identity, contentLocale, day, statements) }
    const bound = { ...row, seriesId: seriesKey(row) }
    return { ...bound, statementKey: statementKey(bound) }
  })
  return deepFreeze({ version: COURSE_GOAL_OBSERVATIONS_VERSION, day, planRevision: slot.planRevision,
    kind: slot.kind, contentLocale, optional: true, wordingVaries: true, equivalenceEstablished: false, rows, anchors: clone(COURSE_GOAL_AGREEMENT_ANCHORS),
    labels: clone(COURSE_GOAL_OBSERVATION_COPY), ...noEffectFlags() })
}

const SERIES_KEYS = ['goalId', 'goalIdentity', 'goalLabel', 'statementFamilyId', 'statementFamilyVersion', 'contentLocale', 'seriesId']
const VARIANT_KEYS = ['statementId', 'statementVersion', 'statementContentHash', 'statementText', 'statementKey']
const ROW_KEYS = [...SERIES_KEYS, ...VARIANT_KEYS]
function validRow(row, locale) {
  return keysWithin(row, [...ROW_KEYS, 'status', 'rating']) && ROW_KEYS.every(key => Object.hasOwn(row, key)) &&
    identityValid(row.goalIdentity) && row.goalId === goalIdFor(row.goalIdentity) &&
    text(row.statementFamilyId, 200) && text(row.statementFamilyVersion, 200) && text(row.statementId, 200) && text(row.statementVersion, 200) && localeValid(row.contentLocale) && row.contentLocale === locale &&
    hashValid(row.statementContentHash) && text(row.statementText) && bilingual(row.goalLabel) && row.seriesId === seriesKey(row) && row.statementKey === statementKey(row)
}
function validSnapshot(snapshot) {
  return plain(snapshot) && snapshot.version === COURSE_GOAL_OBSERVATIONS_VERSION && dayValid(snapshot.day) &&
    revisionValid(snapshot.planRevision) && localeValid(snapshot.contentLocale) && ['practice', 'review'].includes(snapshot.kind) &&
    (snapshot.kind !== 'review' || [7, 14, 21].includes(snapshot.day)) && Array.isArray(snapshot.rows) &&
    snapshot.rows.length >= 1 && snapshot.rows.length <= (snapshot.kind === 'practice' ? 1 : 5) &&
    new Set(snapshot.rows.map(row => row?.goalId)).size === snapshot.rows.length &&
    snapshot.rows.every(row => validRow(row, snapshot.contentLocale))
}

export function recordCourseGoalObservations({ snapshot = null, choices = [], observedAt, localDate } = {}) {
  if (!Array.isArray(choices) || choices.length > 5) fail('INVALID_GOAL_OBSERVATION_CHOICES')
  if (snapshot === null) {
    if (choices.length) fail('GOAL_OBSERVATION_SNAPSHOT_REQUIRED')
    return null
  }
  if (!validSnapshot(snapshot)) fail('INVALID_GOAL_OBSERVATION_SNAPSHOT')
  if (!validTime(observedAt) || !validLocalDate(localDate)) fail('INVALID_GOAL_OBSERVATION_TIME')
  const selected = new Map()
  for (const choice of choices) {
    if (!hasExactKeys(choice, ['goalId', 'statementId', 'statementKey', 'seriesId', 'rating'])) fail('INVALID_GOAL_OBSERVATION_CHOICE')
    const row = snapshot.rows.find(candidate => candidate.goalId === choice.goalId)
    if (!row || row.statementId !== choice.statementId || row.statementKey !== choice.statementKey || row.seriesId !== choice.seriesId || selected.has(choice.goalId)) fail('UNKNOWN_OR_DUPLICATE_GOAL_OBSERVATION')
    if (!(Number.isInteger(choice.rating) && choice.rating >= 1 && choice.rating <= 5) && !['skip', 'missing'].includes(choice.rating)) fail('INVALID_GOAL_AGREEMENT_RATING')
    selected.set(choice.goalId, choice.rating)
  }
  const rows = snapshot.rows.map(row => {
    const response = selected.get(row.goalId)
    return { ...clone(properties(row, ROW_KEYS)),
      status: response === 'skip' ? 'skipped' : Number.isInteger(response) ? 'rated' : 'missing',
      rating: Number.isInteger(response) ? response : null }
  })
  return deepFreeze({ version: COURSE_GOAL_OBSERVATIONS_VERSION, day: snapshot.day,
    planRevision: snapshot.planRevision, kind: snapshot.kind, contentLocale: snapshot.contentLocale,
    observedAt, localDate, optional: true, wordingVaries: true, equivalenceEstablished: false, rows, anchors: clone(COURSE_GOAL_AGREEMENT_ANCHORS),
    labels: clone(COURSE_GOAL_OBSERVATION_COPY), ...noEffectFlags() })
}

function archiveMatchesSlot(saved, session) {
  const slot = session.slot
  if (!plain(slot) || slot.status !== 'ready' || slot.day !== saved.day || slot.kind !== saved.kind ||
    slot.planRevision !== saved.planRevision || slot.practice?.contentLocale !== saved.contentLocale ||
    slot.provenanceBinding?.contentLocale !== saved.contentLocale) return false
  try {
    const goals = exactGoals(slot)
    return goals.length === saved.rows.length && goals.every((goal, index) =>
      goal.goalId === saved.rows[index].goalId && sameIdentity(goal.identity, saved.rows[index].goalIdentity))
  } catch { return false }
}
function checkedSessions(sessions, resolvedThroughDay) {
  if (!Array.isArray(sessions) && !plain(sessions)) fail('INVALID_GOAL_OBSERVATION_SESSIONS')
  const values = Array.isArray(sessions) ? sessions : Object.values(sessions)
  if (values.length > 21) fail('INVALID_GOAL_OBSERVATION_SESSIONS')
  const byDay = new Map()
  for (const session of values) {
    if (!plain(session) || !dayValid(session.day) || byDay.has(session.day) || !['completed', 'skipped', 'stopped', 'deferred'].includes(session.status)) fail('INVALID_GOAL_OBSERVATION_SESSIONS')
    if (session.day > resolvedThroughDay) continue // Do not inspect unreleased/future observations.
    if (!['completed', 'skipped'].includes(session.status)) fail('UNRESOLVED_GOAL_OBSERVATION_SESSION')
    if (!validTime(session.at) || !validLocalDate(session.localDate)) fail('INVALID_GOAL_OBSERVATION_SESSION_TIME')
    const saved = session.goalObservations
    if (saved !== undefined && saved !== null) {
      if (session.status === 'skipped' || !validSnapshot(saved) || saved.day !== session.day || saved.observedAt !== session.at ||
        saved.localDate !== session.localDate || !validTime(saved.observedAt) || !archiveMatchesSlot(saved, session) ||
        (session.planRevision !== undefined && saved.planRevision !== session.planRevision) || saved.rows.some(row =>
          !['rated', 'skipped', 'missing'].includes(row.status) ||
          (row.status === 'rated' ? !Number.isInteger(row.rating) || row.rating < 1 || row.rating > 5 : row.rating !== null))) fail('INVALID_SAVED_GOAL_OBSERVATIONS')
    }
    byDay.set(session.day, session)
  }
  return byDay
}
const point = (row, saved) => ({ day: saved.day, observedAt: saved.observedAt, localDate: saved.localDate,
  status: row.status, rating: row.rating, contentLocale: row.contentLocale, ...clone(properties(row, VARIANT_KEYS)) })
const ratedPoint = row => row ? properties(row, ['day', 'observedAt', 'localDate', 'rating', 'contentLocale', ...VARIANT_KEYS]) : null
function summarizeSeries(rows) {
  return [...rows.values()].map(series => {
    const rated = series.observations.filter(row => row.status === 'rated')
    const first = ratedPoint(rated[0]), latest = ratedPoint(rated.at(-1))
    return { ...series, wordingVaries: true, equivalenceEstablished: false, count: rated.length, first, latest,
      rawDelta: rated.length >= 2 ? latest.rating - first.rating : null,
      missingCount: series.observations.filter(row => row.status === 'missing').length,
      skippedCount: series.observations.filter(row => row.status === 'skipped').length,
      presentedCount: series.observations.length }
  })
}

export function buildCourseGoalWeeklyReports({ sessions = [], resolvedThroughDay = 0 } = {}) {
  if (!Number.isInteger(resolvedThroughDay) || resolvedThroughDay < 0 || resolvedThroughDay > 21) fail('INVALID_RESOLVED_LEARNING_DAY')
  const history = checkedSessions(sessions, resolvedThroughDay), reports = []
  for (const checkpointDay of [7, 14, 21]) {
    if (checkpointDay > resolvedThroughDay) continue
    const checkpoint = history.get(checkpointDay)
    // A trusted progress pointer alone cannot invent the checkpoint's saved date.
    if (!checkpoint) continue
    const fromDay = checkpointDay - 6, seriesById = new Map(), cumulativeById = new Map()
    for (let day = 1; day <= checkpointDay; day++) {
      const saved = history.get(day)?.goalObservations
      if (!saved) continue
      for (const row of saved.rows) {
        if (!cumulativeById.has(row.seriesId)) cumulativeById.set(row.seriesId, { ...clone(properties(row, SERIES_KEYS)), observations: [] })
        cumulativeById.get(row.seriesId).observations.push(point(row, saved))
      }
    }
    const missingSessionDays = [], missingSnapshotDays = [], skippedLessonDays = [], sessionDates = []
    for (let day = fromDay; day <= checkpointDay; day++) {
      const session = history.get(day)
      if (!session) { missingSessionDays.push(day); continue }
      sessionDates.push({ day, at: session.at, localDate: session.localDate, status: session.status })
      if (session.status === 'skipped') { skippedLessonDays.push(day); continue }
      const saved = session.goalObservations
      if (!saved) { missingSnapshotDays.push(day); continue }
      for (const row of saved.rows) {
        if (!seriesById.has(row.seriesId)) seriesById.set(row.seriesId, { ...clone(properties(row, SERIES_KEYS)), observations: [] })
        seriesById.get(row.seriesId).observations.push(point(row, saved))
      }
    }
    const series = summarizeSeries(seriesById)
    reports.push({ version: COURSE_GOAL_WEEKLY_REPORT_VERSION, reportId: `${COURSE_GOAL_WEEKLY_REPORT_VERSION}/day/${checkpointDay}`,
      status: 'available', week: checkpointDay / 7, checkpointDay, learningDays: { from: fromDay, to: checkpointDay },
      resolvedAt: checkpoint.at, resolvedLocalDate: checkpoint.localDate, sessionDates, series,
      cumulativeLearningDays: { from: 1, to: checkpointDay }, cumulativeSeries: summarizeSeries(cumulativeById),
      coverage: { savedSessionCount: sessionDates.length, missingSessionCount: missingSessionDays.length, missingSessionDays,
        missingSnapshotCount: missingSnapshotDays.length, missingSnapshotDays, skippedLessonCount: skippedLessonDays.length, skippedLessonDays,
        presentedCount: series.reduce((sum, row) => sum + row.presentedCount, 0),
        responseCount: series.reduce((sum, row) => sum + row.count, 0),
        missingResponseCount: series.reduce((sum, row) => sum + row.missingCount, 0),
        skippedResponseCount: series.reduce((sum, row) => sum + row.skippedCount, 0) },
      anchors: clone(COURSE_GOAL_AGREEMENT_ANCHORS), labels: clone(COURSE_GOAL_OBSERVATION_COPY),
      comparisonScope: 'exact-goal-paraphrase-family-language-within-learning-week', wordingVaries: true, equivalenceEstablished: false, interpretation: 'agreement-only-no-clinical-inference', ...noEffectFlags() })
  }
  return deepFreeze(reports)
}
