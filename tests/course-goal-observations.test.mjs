import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import {
  COURSE_GOAL_STATEMENTS_VERSION, COURSE_GOAL_STATEMENTS_V1 as STATEMENTS,
  COURSE_GOAL_AGREEMENT_ANCHORS as ANCHORS, COURSE_GOAL_OBSERVATION_COPY as COPY,
} from '../data/inner-growth/course-goal-statements-v1.js'
import {
  COURSE_GOAL_OBSERVATIONS_VERSION, COURSE_GOAL_WEEKLY_REPORT_VERSION,
  createCourseGoalObservationSnapshot as prepare,
  recordCourseGoalObservations as record,
  buildCourseGoalWeeklyReports as reports,
} from '../lib/inner-growth/course-goal-observations.js'
import { PERSONAL_COURSE_PILOT_DRAFT_BUNDLE as PILOT } from '../data/inner-growth/course-personal-practices-v2.js'
import { PERSONAL_COURSE_MAPPING_EXTENSIONS as EXTENSIONS } from '../data/inner-growth/course-personal-mapping-extensions-v2.js'
import { PERSONAL_COURSE_SUPPORT_FAMILIES_MAPPINGS as SUPPORT } from '../data/inner-growth/course-personal-support-families-v2.js'

// Synthetic sessions only. No result records, owners, databases or providers.
const clone = value => structuredClone(value)
const identity = (dimension = 'weekly.tension', locale = 'en') => clone(STATEMENTS.find(row => row.dimensionKey === dimension).identities.find(row => row.instrumentLocale === locale))
const goal = (dimension, locale = 'en') => {
  const chosen = identity(dimension, locale)
  return { scaleId: `${chosen.definitionId}/${chosen.dimensionKey}`, identity: chosen }
}
const at = day => new Date(Date.UTC(2026, 9, day * 2, 11)).toISOString() // Gaps are deliberate.
const local = day => at(day).slice(0, 10)
function slot(day, { dimension = 'weekly.tension', instrumentLocale = 'en', locale = 'en', revision = 0,
  reviewDimensions = [dimension] } = {}) {
  const goals = reviewDimensions.map(key => goal(key, instrumentLocale)), current = goal(dimension, instrumentLocale)
  const review = [7, 14, 21].includes(day)
  return { status: 'ready', day, planRevision: revision, kind: review ? 'review' : 'practice',
    selectedScaleId: review ? null : current.scaleId, practice: { contentLocale: locale },
    ...(review ? { reviewScaleIds: goals.map(row => row.scaleId) } : {}),
    provenanceBinding: { contentLocale: locale, ...(review ? { coversAllSelectedGoals: true, goals } : { identity: current.identity }) },
    // Deliberately sensitive-looking synthetic fields must never be extracted.
    rawValue: 987, privateNote: 'SYNTHETIC_NOTE_MUST_NOT_ESCAPE', topicId: 'calm_regulation',
  }
}
function choice(row, rating) {
  return { goalId: row.goalId, statementId: row.statementId, statementKey: row.statementKey, seriesId: row.seriesId, rating }
}
function session(day, { rating = 3, choices, statements = STATEMENTS, ...options } = {}) {
  const current = slot(day, options), snapshot = prepare({ day, slot: current, statements })
  return { day, at: at(day), localDate: local(day), status: 'completed', planRevision: current.planRevision, slot: current,
    goalObservations: record({ snapshot, choices: choices ?? snapshot.rows.map(row => choice(row, rating)), observedAt: at(day), localDate: local(day) }) }
}
const through = end => Array.from({ length: end }, (_, index) => session(index + 1))
const one = (day = 1) => prepare({ day, slot: slot(day) })
const hash = row => Object.fromEntries(['en', 'ru'].map(locale => [locale,
  `sha256:${createHash('sha256').update(JSON.stringify([row.statementId, row.version, locale, row.text[locale]])).digest('hex')}`]))
function changedStatements(edit) {
  const rows = clone(STATEMENTS)
  edit(rows.find(row => row.dimensionKey === 'weekly.tension'))
  return rows
}

// Editorial scope and static hashes are tested against the existing exact slice.
test('exactly 14 construct families, three bilingual variants each, 28 exact bindings, and no overall duplicate', () => {
  const bindings = [...PILOT.mappings, ...EXTENSIONS, ...SUPPORT].map(row => row.identity)
  assert.equal(STATEMENTS.length, 14)
  assert.equal(new Set(STATEMENTS.map(row => row.dimensionKey)).size, 14)
  assert.equal(new Set(STATEMENTS.map(row => row.statementFamilyId)).size, 14)
  assert.equal(STATEMENTS.flatMap(row => row.identities).length, 28)
  assert.deepEqual(STATEMENTS.flatMap(row => row.identities).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    bindings.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))
  assert.ok(STATEMENTS.every(row => row.dimensionKey !== 'resources.overall'))
  assert.equal(Object.isFrozen(STATEMENTS), true)
  for (const statement of STATEMENTS) {
    assert.equal(statement.version, COURSE_GOAL_STATEMENTS_VERSION)
    assert.equal(statement.variants.length, 3)
    assert.equal(new Set(statement.variants.map(row => row.statementId)).size, 3)
    assert.equal(statement.equivalenceEstablished, false)
    for (const variant of statement.variants) {
      assert.deepEqual(variant.contentHash, hash(variant))
      assert.equal(Object.isFrozen(variant.text), true)
      for (const locale of ['en', 'ru']) {
        assert.ok(variant.text[locale].length > 25 && variant.text[locale].length < 150)
        assert.ok(statement.goalLabel[locale].length > 3)
        assert.doesNotMatch(variant.text[locale], /\b(heal|cure|recovered|recovery|treatment|diagnos|must|should)\b|выздоров|исцел|лечени|диагноз|обязан|должен/iu)
      }
    }
  }
})

test('anchors are integer agreement 1–5, with bilingual optionality and neutral limitations', () => {
  assert.deepEqual(ANCHORS.map(row => row.value), [1, 2, 3, 4, 5])
  assert.equal(ANCHORS[0].label.en, 'Strongly disagree')
  assert.equal(ANCHORS[4].label.en, 'Strongly agree')
  for (const anchor of ANCHORS) assert.ok(anchor.label.ru.length)
  assert.match(COPY.optional.en, /no preferred answer/)
  assert.match(COPY.optional.ru, /Предпочтительного ответа нет/)
  assert.match(COPY.limitation.en, /not a validated test/)
  assert.match(COPY.reportLimitation.en, /Missing answers are not zero/)
  assert.match(COPY.reportLimitation.ru, /не равен нулю/)
})

test('all exact selected forms and statement languages are supported without changing goal identity', () => {
  for (const statement of STATEMENTS) for (const instrumentLocale of ['en', 'ru']) for (const locale of ['en', 'ru']) {
    const chosen = slot(1, { dimension: statement.dimensionKey, instrumentLocale, locale })
    const view = prepare({ day: 1, slot: chosen })
    assert.equal(view.rows.length, 1)
    assert.equal(view.rows[0].goalId, chosen.selectedScaleId)
    assert.deepEqual(view.rows[0].goalIdentity, chosen.provenanceBinding.identity)
    assert.equal(view.rows[0].statementText, statement.variants[0].text[locale])
    assert.equal(view.rows[0].statementContentHash, statement.variants[0].contentHash[locale])
    assert.equal(view.rows[0].contentLocale, locale)
    assert.equal(view.automaticEvaluation, false)
    assert.equal(view.changesIntensity, false)
    assert.equal(view.recoveryMeasure, false)
  }
})

test('daily prompts follow the actual chosen slot, never the topic or assessment raw value', () => {
  const actual = slot(4, { dimension: 'resource.agency' })
  actual.topicId = 'unrelated-synthetic-topic'
  actual.provenanceBinding.rawValue = 0
  const view = prepare({ day: 4, slot: actual })
  assert.equal(view.rows[0].goalIdentity.dimensionKey, 'resource.agency')
  assert.doesNotMatch(JSON.stringify(view), /rawValue|987|SYNTHETIC_NOTE|unrelated-synthetic-topic/)
  const changed = clone(actual)
  changed.rawValue = 5
  changed.provenanceBinding.rawValue = 999
  assert.deepEqual(prepare({ day: 4, slot: changed }), view)
})

test('review snapshots include every exact reviewed chosen goal without a fabricated overall goal', () => {
  const chosen = slot(7, { reviewDimensions: ['weekly.tension', 'resource.energy', 'resource.support'] })
  const view = prepare({ day: 7, slot: chosen, reviewGoals: clone(chosen.provenanceBinding.goals) })
  assert.deepEqual(view.rows.map(row => row.goalId), chosen.reviewScaleIds)
  assert.equal(view.rows.length, 3)
  assert.ok(view.rows.every(row => row.goalIdentity.dimensionKey !== 'resources.overall'))
  const injected = clone(chosen.provenanceBinding.goals)
  injected[0] = goal('resource.meaning')
  assert.throws(() => prepare({ day: 7, slot: chosen, reviewGoals: injected }), /EXACT_REVIEW_GOALS_REQUIRED/)
  const reordered = clone(chosen)
  reordered.reviewScaleIds.reverse()
  assert.throws(() => prepare({ day: 7, slot: reordered }), /EXACT_REVIEW_GOALS_REQUIRED/)
  const duplicate = clone(chosen)
  duplicate.provenanceBinding.goals.push(clone(duplicate.provenanceBinding.goals[0]))
  duplicate.reviewScaleIds.push(duplicate.reviewScaleIds[0])
  assert.throws(() => prepare({ day: 7, slot: duplicate }), /EXACT_REVIEW_GOALS_REQUIRED/)
})

test('unsupported, changed or incomplete exact identities fail closed, with no topic fallback', () => {
  for (const key of Object.keys(identity())) {
    const current = slot(1)
    current.provenanceBinding.identity[key] += '-changed'
    if (key === 'definitionId' || key === 'dimensionKey') current.selectedScaleId = `${current.provenanceBinding.identity.definitionId}/${current.provenanceBinding.identity.dimensionKey}`
    assert.throws(() => prepare({ day: 1, slot: current }), /EXACT_CHOSEN_GOAL_REQUIRED|EXACT_GOAL_STATEMENT_REQUIRED/)
    const missing = slot(1)
    delete missing.provenanceBinding.identity[key]
    assert.throws(() => prepare({ day: 1, slot: missing }), /EXACT_CHOSEN_GOAL_REQUIRED/)
  }
  for (const dimension of ['resources.overall', 'phq.total', 'unknown']) {
    const current = slot(1, { dimension: 'resource.energy' })
    current.provenanceBinding.identity.dimensionKey = dimension
    current.selectedScaleId = `${current.provenanceBinding.identity.definitionId}/${dimension}`
    assert.throws(() => prepare({ day: 1, slot: current }), /EXACT_CHOSEN_GOAL_REQUIRED/)
  }
  const extra = slot(1)
  extra.provenanceBinding.identity.extra = 'not-an-identity-field'
  assert.throws(() => prepare({ day: 1, slot: extra }), /EXACT_CHOSEN_GOAL_REQUIRED/)
  const prototypeName = slot(1)
  prototypeName.provenanceBinding.identity.definitionKey = '__proto__'
  assert.throws(() => prepare({ day: 1, slot: prototypeName }), /EXACT_CHOSEN_GOAL_REQUIRED/)
})

test('current day, ready slot, pinned language, revision and review context are required', () => {
  assert.throws(() => prepare({ day: 2, slot: slot(1) }), /EXACT_GOAL_OBSERVATION_SLOT_REQUIRED/)
  assert.throws(() => prepare({ day: 1, slot: slot(1), contentLocale: 'ru' }), /EXACT_GOAL_OBSERVATION_SLOT_REQUIRED/)
  assert.throws(() => prepare({ day: 1, slot: { ...slot(1), status: 'unsupported' } }), /EXACT_GOAL_OBSERVATION_SLOT_REQUIRED/)
  assert.throws(() => prepare({ day: 1, slot: slot(1, { revision: -1 }) }), /EXACT_GOAL_OBSERVATION_SLOT_REQUIRED/)
  assert.throws(() => prepare({ day: 1, slot: slot(1), reviewGoals: [goal('resource.energy')] }), /UNEXPECTED_REVIEW_GOALS/)
  assert.throws(() => prepare({ day: 22, slot: null }), /INVALID_GOAL_OBSERVATION_DAY/)
  const mismatched = slot(1)
  mismatched.provenanceBinding.contentLocale = 'ru'
  assert.throws(() => prepare({ day: 1, slot: mismatched }), /EXACT_GOAL_OBSERVATION_SLOT_REQUIRED/)
  const wrongReview = { ...slot(7), day: 6 }
  assert.throws(() => prepare({ day: 6, slot: wrongReview }), /EXACT_REVIEW_GOALS_REQUIRED/)
})

test('null old/rest material stays absent and cannot accept invented choices', () => {
  assert.equal(prepare({ day: 3, slot: null }), null)
  assert.equal(record({ snapshot: null, choices: [] }), null)
  assert.throws(() => record({ snapshot: null, choices: [choice(one().rows[0], 3)] }), /GOAL_OBSERVATION_SNAPSHOT_REQUIRED/)
  assert.deepEqual(reports(), [])
  assert.deepEqual(reports({ sessions: [], resolvedThroughDay: 21 }), [])
})

test('known integer responses, explicit skip and omitted/missing responses remain distinct', () => {
  const snapshot = prepare({ day: 7, slot: slot(7, { reviewDimensions: ['weekly.tension', 'resource.energy', 'resource.support'] }) })
  const saved = record({ snapshot, choices: [choice(snapshot.rows[0], 1), choice(snapshot.rows[1], 'skip')], observedAt: at(7), localDate: local(7) })
  assert.deepEqual(saved.rows.map(row => [row.status, row.rating]), [['rated', 1], ['skipped', null], ['missing', null]])
  const explicitMissing = record({ snapshot: one(), choices: [choice(one().rows[0], 'missing')], observedAt: at(1), localDate: local(1) })
  assert.equal(explicitMissing.rows[0].status, 'missing')
  assert.equal(explicitMissing.rows[0].rating, null)
  for (const rating of [1, 2, 3, 4, 5]) {
    const value = record({ snapshot: one(), choices: [choice(one().rows[0], rating)], observedAt: at(1), localDate: local(1) })
    assert.equal(value.rows[0].rating, rating)
  }
})

test('invalid, coerced, nonfinite and injected ratings never become observations', () => {
  const snapshot = one(), row = snapshot.rows[0]
  for (const rating of [0, 6, -1, 1.5, NaN, Infinity, -Infinity, '3', '', 'null', true, false, null, undefined, [3], { value: 3 }]) {
    assert.throws(() => record({ snapshot, choices: [choice(row, rating)], observedAt: at(1), localDate: local(1) }), /INVALID_GOAL_AGREEMENT_RATING/)
  }
  for (const extra of [{ statementText: 'injected text' }, { note: 'private journal' }, { score: 5 }, { status: 'rated' }, { statementVersion: 'new-version' }]) {
    assert.throws(() => record({ snapshot, choices: [{ ...choice(row, 3), ...extra }], observedAt: at(1), localDate: local(1) }), /INVALID_GOAL_OBSERVATION_CHOICE/)
  }
  const prototypeChoice = Object.assign(Object.create({ hidden: true }), choice(row, 3))
  assert.throws(() => record({ snapshot, choices: [prototypeChoice], observedAt: at(1), localDate: local(1) }), /INVALID_GOAL_OBSERVATION_CHOICE/)
  assert.throws(() => record({ snapshot, choices: {}, observedAt: at(1), localDate: local(1) }), /INVALID_GOAL_OBSERVATION_CHOICES/)
})

test('unknown, duplicated, stale-language and stale-text references are rejected', () => {
  const snapshot = one(), row = snapshot.rows[0]
  for (const key of ['goalId', 'statementId', 'statementKey', 'seriesId']) {
    assert.throws(() => record({ snapshot, choices: [{ ...choice(row, 3), [key]: 'injected' }], observedAt: at(1), localDate: local(1) }), /UNKNOWN_OR_DUPLICATE_GOAL_OBSERVATION/)
  }
  assert.throws(() => record({ snapshot, choices: [choice(row, 3), choice(row, 4)], observedAt: at(1), localDate: local(1) }), /UNKNOWN_OR_DUPLICATE_GOAL_OBSERVATION/)
  const russian = prepare({ day: 1, slot: slot(1, { locale: 'ru' }) })
  assert.throws(() => record({ snapshot: russian, choices: [choice(row, 3)], observedAt: at(1), localDate: local(1) }), /UNKNOWN_OR_DUPLICATE_GOAL_OBSERVATION/)
  const edited = prepare({ day: 1, slot: slot(1), statements: changedStatements(item => { item.variants[0].text.en += ' Synthetic edit.' }) })
  assert.throws(() => record({ snapshot: edited, choices: [choice(row, 3)], observedAt: at(1), localDate: local(1) }), /UNKNOWN_OR_DUPLICATE_GOAL_OBSERVATION/)
})

test('date validation preserves actual dates and never uses elapsed time as a lesson index', () => {
  for (const observedAt of ['not-a-date', '2026-10-02', '2026-02-31T11:00:00.000Z', '2026-10-02T25:00:00.000Z']) {
    assert.throws(() => record({ snapshot: one(), observedAt, localDate: local(1) }), /INVALID_GOAL_OBSERVATION_TIME/)
  }
  for (const localDate of ['2026-02-31', '2026-2-02', '2026-10-02T00:00:00Z', 'injected']) {
    assert.throws(() => record({ snapshot: one(), observedAt: at(1), localDate }), /INVALID_GOAL_OBSERVATION_TIME/)
  }
  const saved = session(3)
  assert.equal(saved.goalObservations.day, 3)
  assert.equal(saved.goalObservations.localDate, '2026-10-06')
})

test('snapshots and reports are pure, detached and immutable, without note/score extraction', () => {
  const chosen = slot(1), before = clone(chosen), snapshot = prepare({ day: 1, slot: chosen })
  assert.deepEqual(chosen, before)
  assert.equal(Object.isFrozen(snapshot.rows[0].goalIdentity), true)
  assert.throws(() => { snapshot.rows[0].statementText = 'rewrite' }, TypeError)
  const input = choice(snapshot.rows[0], 3)
  const saved = record({ snapshot, choices: [input], observedAt: at(1), localDate: local(1) })
  input.rating = 5
  assert.equal(saved.rows[0].rating, 3)
  assert.equal(Object.isFrozen(saved.rows), true)
  const history = through(7), old = clone(history), result = reports({ sessions: history, resolvedThroughDay: 7 })
  assert.deepEqual(history, old)
  assert.equal(Object.isFrozen(result[0].series[0].observations), true)
  history[0].at = 'edited outside result'
  assert.equal(result[0].series[0].first.observedAt, at(1))
  assert.doesNotMatch(JSON.stringify({ saved, result }), /rawValue|SYNTHETIC_NOTE/)
})

test('partial learning weeks are not delivered; exactly days 7, 14 and 21 produce reports', () => {
  const history = through(21)
  for (const resolvedThroughDay of [0, 1, 6]) assert.deepEqual(reports({ sessions: history, resolvedThroughDay }), [])
  for (const [resolvedThroughDay, expected] of [[7, [7]], [8, [7]], [13, [7]], [14, [7, 14]], [20, [7, 14]], [21, [7, 14, 21]]]) {
    const result = reports({ sessions: Object.fromEntries(history.map(row => [row.day, row])), resolvedThroughDay })
    assert.deepEqual(result.map(row => row.checkpointDay), expected)
    for (const report of result) {
      assert.equal(report.version, COURSE_GOAL_WEEKLY_REPORT_VERSION)
      assert.equal(report.week, report.checkpointDay / 7)
      assert.deepEqual(report.learningDays, { from: report.checkpointDay - 6, to: report.checkpointDay })
      assert.equal(report.resolvedAt, at(report.checkpointDay))
      assert.equal(report.resolvedLocalDate, local(report.checkpointDay))
      assert.equal(report.coverage.savedSessionCount, 7)
      assert.equal(report.series[0].count, 7)
    }
  }
})

test('reports use neutral raw count/first/latest/difference with actual learning days and dates', () => {
  const history = through(7)
  history[0] = session(1, { rating: 5 })
  history[3] = session(4, { rating: 2 })
  history[6] = session(7, { rating: 1 })
  const [report] = reports({ sessions: history, resolvedThroughDay: 7 }), series = report.series[0]
  assert.equal(series.count, 7)
  assert.deepEqual([series.first.day, series.first.observedAt, series.first.localDate, series.first.rating], [1, at(1), local(1), 5])
  assert.deepEqual([series.latest.day, series.latest.observedAt, series.latest.localDate, series.latest.rating], [7, at(7), local(7), 1])
  assert.equal(series.first.statementText, history[0].goalObservations.rows[0].statementText)
  assert.equal(series.latest.statementText, history[6].goalObservations.rows[0].statementText)
  assert.equal(Object.hasOwn(series, 'statementText'), false)
  assert.equal(series.rawDelta, -4)
  assert.equal(series.observations.length, 7)
  assert.deepEqual(series.observations.map(row => row.day), [1, 2, 3, 4, 5, 6, 7])
  assert.equal(report.privateCabinetOnly, true)
  assert.equal(report.externalTransmission, false)
  assert.equal(report.changesIntensity, false)
  for (const key of ['wellnessPercentage', 'overallHealthRank', 'healthScore', 'improved', 'recovered', 'treatmentEffect', 'mean', 'trend']) {
    assert.equal(Object.hasOwn(report, key), false)
    assert.equal(Object.hasOwn(series, key), false)
  }
})

test('missing is never zero; explicit statement skips and skipped lessons have separate counts', () => {
  const history = through(7)
  history[0] = session(1, { choices: [] })
  history[1] = session(2, { rating: 'skip' })
  history[2] = session(3, { rating: 4 })
  history[3] = session(4, { rating: 'missing' })
  history[4] = session(5, { rating: 2 })
  history[5] = { day: 6, at: at(6), localDate: local(6), status: 'skipped', slot: null }
  history[6] = session(7, { choices: [] })
  const [report] = reports({ sessions: history, resolvedThroughDay: 7 }), series = report.series[0]
  assert.equal(series.count, 2)
  assert.equal(series.presentedCount, 6)
  assert.equal(series.missingCount, 3)
  assert.equal(series.skippedCount, 1)
  assert.equal(series.first.day, 3)
  assert.equal(series.first.rating, 4)
  assert.equal(series.latest.day, 5)
  assert.equal(series.rawDelta, -2)
  assert.deepEqual(series.observations.filter(row => row.status !== 'rated').map(row => row.rating), [null, null, null, null])
  assert.equal(report.coverage.missingResponseCount, 3)
  assert.equal(report.coverage.skippedResponseCount, 1)
  assert.deepEqual(report.coverage.skippedLessonDays, [6])
  assert.deepEqual(report.coverage.missingSnapshotDays, [])
})

test('zero or one rated response yields null delta and no invented baseline', () => {
  let history = through(7).map(row => session(row.day, { choices: [] }))
  let [report] = reports({ sessions: history, resolvedThroughDay: 7 })
  assert.equal(report.series[0].count, 0)
  assert.equal(report.series[0].first, null)
  assert.equal(report.series[0].latest, null)
  assert.equal(report.series[0].rawDelta, null)
  history[4] = session(5, { rating: 2 })
  ;[report] = reports({ sessions: history, resolvedThroughDay: 7 })
  assert.equal(report.series[0].count, 1)
  assert.equal(report.series[0].first.rating, 2)
  assert.equal(report.series[0].latest.rating, 2)
  assert.equal(report.series[0].rawDelta, null)
})

test('material family/version, language and exact goal identity changes each start a separate series', () => {
  const version2 = changedStatements(row => { row.version += '-v2' })
  // Material meaning changes require an explicit new family version.
  const editedText = changedStatements(row => { row.version += '-material-v2'; for (const variant of row.variants) { variant.text.en += ' Synthetic material change.'; variant.contentHash = hash(variant) } })
  const history = [session(1, { rating: 1 }), session(2, { rating: 3 }), session(3, { rating: 5, statements: version2 }),
    session(4, { rating: 2, locale: 'ru' }), session(5, { rating: 4, statements: editedText }),
    session(6, { rating: 1, instrumentLocale: 'ru' }), session(7, { rating: 5 })]
  const [report] = reports({ sessions: history, resolvedThroughDay: 7 })
  assert.equal(report.series.length, 5)
  const main = report.series.find(row => row.seriesId === history[0].goalObservations.rows[0].seriesId)
  assert.equal(main.count, 3)
  assert.equal(main.rawDelta, 4)
  assert.deepEqual(main.observations.map(row => row.day), [1, 2, 7])
  for (const separate of report.series.filter(row => row !== main)) {
    assert.equal(separate.count, 1)
    assert.equal(separate.rawDelta, null)
  }
  assert.ok(report.series.some(row => row.contentLocale === 'ru' && row.observations.some(point => /Сегодня/.test(point.statementText))))
  assert.ok(report.series.some(row => row.observations.some(point => /Synthetic material change/.test(point.statementText))))
})

test('different selected constructs never merge despite sharing a skill family or equal ratings', () => {
  const history = through(7)
  history[1] = session(2, { dimension: 'weekly.energy' })
  history[2] = session(3, { dimension: 'resource.energy' })
  history[3] = session(4, { dimension: 'weekly.load' })
  const [report] = reports({ sessions: history, resolvedThroughDay: 7 })
  assert.equal(report.series.length, 4)
  assert.equal(new Set(report.series.map(row => row.goalId)).size, 4)
})

test('legacy missing sessions and snapshots are unknown, not generated or counted as missing ratings', () => {
  const history = through(7).filter(row => row.day !== 2)
  for (const row of history) if ([1, 3, 4].includes(row.day)) delete row.goalObservations
  const [report] = reports({ sessions: history, resolvedThroughDay: 7 })
  assert.deepEqual(report.coverage.missingSessionDays, [2])
  assert.deepEqual(report.coverage.missingSnapshotDays, [1, 3, 4])
  assert.equal(report.coverage.missingResponseCount, 0)
  assert.equal(report.coverage.presentedCount, 3)
  assert.equal(report.series[0].count, 3)
  assert.deepEqual(report.series[0].observations.map(row => row.day), [5, 6, 7])
  for (const row of history) delete row.goalObservations
  const [legacy] = reports({ sessions: history, resolvedThroughDay: 7 })
  assert.deepEqual(legacy.series, [])
  assert.equal(legacy.coverage.missingSnapshotCount, 6)
  assert.equal(legacy.coverage.missingSessionCount, 1)
  assert.equal(legacy.coverage.responseCount, 0)
  assert.equal(legacy.coverage.missingResponseCount, 0)
})

test('skipped resolved checkpoint permits a report; absent/unresolved checkpoint cannot be fabricated', () => {
  const history = through(7)
  history[6] = { day: 7, status: 'skipped', at: at(7), localDate: local(7), slot: null }
  const [report] = reports({ sessions: history, resolvedThroughDay: 7 })
  assert.equal(report.checkpointDay, 7)
  assert.deepEqual(report.coverage.skippedLessonDays, [7])
  assert.deepEqual(reports({ sessions: history.slice(0, 6), resolvedThroughDay: 7 }), [])
  history[6].status = 'deferred'
  assert.throws(() => reports({ sessions: history, resolvedThroughDay: 7 }), /UNRESOLVED_GOAL_OBSERVATION_SESSION/)
  assert.deepEqual(reports({ sessions: history, resolvedThroughDay: 6 }), [])
})

test('reports reject corrupted rating, dates, references, duplicate sessions and wrong archived slots', () => {
  const changes = [
    row => { row.goalObservations.rows[0].rating = 0 },
    row => { row.goalObservations.rows[0].rating = '4' },
    row => { row.goalObservations.rows[0].status = 'missing'; row.goalObservations.rows[0].rating = 0 },
    row => { row.goalObservations.rows[0].statementText += ' injected' },
    row => { row.goalObservations.rows[0].seriesId = 'injected' },
    row => { row.goalObservations.rows[0].note = 'injected text' },
    row => { row.goalObservations.day = 2 },
    row => { row.goalObservations.observedAt = at(2) },
    row => { row.goalObservations.localDate = local(2) },
    row => { row.goalObservations.planRevision = 2 },
    row => { row.slot = slot(1, { dimension: 'resource.support' }) },
    row => { delete row.slot },
    row => { row.status = 'skipped' },
  ]
  for (const edit of changes) {
    const history = clone(through(7))
    edit(history[0])
    assert.throws(() => reports({ sessions: history, resolvedThroughDay: 7 }), /INVALID_SAVED_GOAL_OBSERVATIONS/)
  }
  const duplicate = through(7)
  duplicate[1] = clone(duplicate[0])
  assert.throws(() => reports({ sessions: duplicate, resolvedThroughDay: 7 }), /INVALID_GOAL_OBSERVATION_SESSIONS/)
  for (const resolvedThroughDay of [-1, 22, 2.5, '7', null]) assert.throws(() => reports({ sessions: [], resolvedThroughDay }), /INVALID_RESOLVED_LEARNING_DAY/)
})

test('prepared snapshots require exact valid series references and cannot carry client text additions', () => {
  for (const edit of [snapshot => { snapshot.rows[0].statementText = 'injected' },
    snapshot => { snapshot.rows[0].seriesId = 'fake' },
    snapshot => { snapshot.rows[0].journal = 'private' },
    snapshot => { snapshot.rows.push(clone(snapshot.rows[0])) },
    snapshot => { snapshot.contentLocale = 'unknown' }]) {
    const snapshot = clone(one())
    edit(snapshot)
    assert.throws(() => record({ snapshot, observedAt: at(1), localDate: local(1) }), /INVALID_GOAL_OBSERVATION_SNAPSHOT/)
  }
})

test('ambiguous catalog entries or absent localized text do not silently fallback', () => {
  assert.throws(() => prepare({ day: 1, slot: slot(1), statements: [...STATEMENTS, STATEMENTS[0]] }), /EXACT_GOAL_STATEMENT_REQUIRED/)
  assert.throws(() => prepare({ day: 1, slot: slot(1), statements: [] }), /EXACT_GOAL_STATEMENT_REQUIRED/)
  const invalid = changedStatements(row => { delete row.variants[0].text.ru })
  assert.throws(() => prepare({ day: 1, slot: slot(1), statements: invalid }), /INVALID_GOAL_STATEMENT_CATALOG/)
  const invalidHash = changedStatements(row => { row.variants[0].contentHash.en = 'fake' })
  assert.throws(() => prepare({ day: 1, slot: slot(1), statements: invalidHash }), /INVALID_GOAL_STATEMENT_CATALOG/)
})

test('observation code is independent of scoring, notes, I/O and activation decisions', async () => {
  const code = await readFile(new URL('../lib/inner-growth/course-goal-observations.js', import.meta.url), 'utf8')
  assert.doesNotMatch(code, /from ['"].*(?:scoring|repository|supabase|provider|node:)|\bfetch\(|\bsetInterval\(|\bsetTimeout\(|process\.env|localStorage|rawValue|reflectionAnswer/)
  assert.equal(COURSE_GOAL_OBSERVATIONS_VERSION, 'hh-course-goal-observations-v1')
})

test('close-meaning paraphrases rotate deterministically while remaining in one goal/family/language series', () => {
  for (const family of STATEMENTS) for (const locale of ['en', 'ru']) {
    const views = Array.from({ length: 21 }, (_, index) => prepare({ day: index + 1,
      slot: slot(index + 1, { dimension: family.dimensionKey, locale }) }))
    assert.equal(new Set(views.map(view => view.rows[0].statementId)).size, 3)
    assert.equal(new Set(views.map(view => view.rows[0].statementText)).size, 3)
    assert.equal(new Set(views.map(view => view.rows[0].seriesId)).size, 1)
    assert.equal(new Set(views.map(view => view.rows[0].statementKey)).size, 3)
    assert.equal(new Set([views[0], views[3], views[6]].map(view => view.rows[0].statementId)).size, 3)
    for (let index = 0; index < views.length; index++) {
      assert.deepEqual(views[index], prepare({ day: index + 1, slot: slot(index + 1, { dimension: family.dimensionKey, locale }) }))
      assert.equal(views[index].rows[0].statementFamilyId, family.statementFamilyId)
      assert.equal(views[index].rows[0].statementFamilyVersion, family.version)
      assert.equal(views[index].wordingVaries, true)
      assert.equal(views[index].equivalenceEstablished, false)
    }
  }
  const history = through(7), [report] = reports({ sessions: history, resolvedThroughDay: 7 })
  assert.equal(report.series.length, 1)
  assert.equal(report.series[0].count, 7)
  assert.equal(new Set(report.series[0].observations.map(row => row.statementText)).size, 3)
  assert.equal(report.series[0].wordingVaries, true)
  assert.equal(report.series[0].equivalenceEstablished, false)
  assert.match(report.labels.reportLimitation.en, /Wording varies.*equivalence.*has not been established/)
  assert.match(report.labels.reportLimitation.ru, /Формулировки меняются; равнозначность вариантов не установлена/)
  for (const point of report.series[0].observations) {
    const archived = history[point.day - 1].goalObservations.rows[0]
    for (const key of ['statementId', 'statementVersion', 'statementContentHash', 'statementText', 'statementKey', 'contentLocale']) {
      assert.equal(point[key], archived[key])
    }
  }
})

test('same-series stale paraphrase choices are rejected by the exact variant key', () => {
  const day1 = one(1), day2 = one(2)
  assert.equal(day1.rows[0].seriesId, day2.rows[0].seriesId)
  assert.notEqual(day1.rows[0].statementKey, day2.rows[0].statementKey)
  assert.throws(() => record({ snapshot: day2, choices: [choice(day1.rows[0], 4)], observedAt: at(2), localDate: local(2) }), /UNKNOWN_OR_DUPLICATE_GOAL_OBSERVATION/)
  const changed = choice(day2.rows[0], 4)
  changed.statementKey = day1.rows[0].statementKey
  assert.throws(() => record({ snapshot: day2, choices: [changed], observedAt: at(2), localDate: local(2) }), /UNKNOWN_OR_DUPLICATE_GOAL_OBSERVATION/)
  const missing = choice(day2.rows[0], 4)
  delete missing.statementKey
  assert.throws(() => record({ snapshot: day2, choices: [missing], observedAt: at(2), localDate: local(2) }), /INVALID_GOAL_OBSERVATION_CHOICE/)
})

test('cumulative series retain course-start dynamics without replacing the within-week series', () => {
  const history = through(21)
  history[0] = session(1, { rating: 1 })
  history[6] = session(7, { rating: 2 })
  history[7] = session(8, { rating: 4 })
  history[13] = session(14, { rating: 5 })
  history[14] = session(15, { rating: 2 })
  history[20] = session(21, { rating: 4 })
  const result = reports({ sessions: history, resolvedThroughDay: 21 })
  assert.deepEqual(result.map(report => report.cumulativeSeries[0].count), [7, 14, 21])
  assert.deepEqual(result.map(report => report.cumulativeSeries[0].rawDelta), [1, 4, 3])
  assert.deepEqual(result.map(report => report.series[0].count), [7, 7, 7])
  assert.deepEqual(result.map(report => report.series[0].rawDelta), [1, 1, 2])
  for (const report of result) {
    assert.deepEqual(report.cumulativeLearningDays, { from: 1, to: report.checkpointDay })
    assert.equal(report.cumulativeSeries[0].first.day, 1)
    assert.equal(report.cumulativeSeries[0].latest.day, report.checkpointDay)
    assert.equal(report.cumulativeSeries[0].observations.length, report.checkpointDay)
    assert.equal(report.cumulativeSeries[0].first.statementText, history[0].goalObservations.rows[0].statementText)
    assert.equal(Object.isFrozen(report.cumulativeSeries[0].observations), true)
  }
})

test('cumulative dynamics do not bridge language/material-family changes or invent missing earlier answers', () => {
  const material = changedStatements(family => { family.version += '-new-construct-edition' })
  const history = through(21)
  delete history[0].goalObservations
  history[1] = session(2, { choices: [] })
  for (let day = 8; day <= 14; day++) history[day - 1] = session(day, { locale: 'ru' })
  for (let day = 15; day <= 21; day++) history[day - 1] = session(day, { statements: material })
  const result = reports({ sessions: history, resolvedThroughDay: 21 })
  assert.deepEqual(result.map(report => report.cumulativeSeries.length), [1, 2, 3])
  const last = result.at(-1)
  const original = last.cumulativeSeries.find(row => row.statementFamilyVersion === COURSE_GOAL_STATEMENTS_VERSION && row.contentLocale === 'en')
  assert.equal(original.first.day, 3)
  assert.equal(original.count, 5)
  assert.equal(original.missingCount, 1)
  assert.equal(original.presentedCount, 6)
  assert.equal(original.observations.some(row => row.day === 1), false)
  assert.equal(last.cumulativeSeries.find(row => row.contentLocale === 'ru').first.day, 8)
  assert.equal(last.cumulativeSeries.find(row => row.statementFamilyVersion.endsWith('-new-construct-edition')).first.day, 15)
})
