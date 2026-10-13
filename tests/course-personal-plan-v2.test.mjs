import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { CURRICULUM_21 } from '../data/inner-growth/curriculum-21.js'
import { PERSONAL_COURSE_PLAN_VERSION, personalCourseObjective, personalCourseScaleCatalog, personalCourseWeekTopics,
  createPersonalCoursePlan, revisePersonalCoursePlan, choosePersonalCourseDay, personalCourseRecall } from '../lib/inner-growth/course-personal-plan-v2.js'

// Synthetic fixtures only. Reviewed flags exercise the contract; these IDs and
// mappings are NOT a professionally reviewed or releasable content registry.
const clone = value => structuredClone(value)
function scale(key, dimensionKey, value, locale = 'ru') {
  const definition = getAssessmentDefinition(key, 'v1', locale)
  const completeAnswers = Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))
  const dimension = scoreAssessment(definition, completeAnswers).dimensions.find(d => d.key === dimensionKey)
  const identity = { ...provenance(definition), dimensionKey }
  return { ...dimension, value, identity, scaleId: `${definition.id}/${dimensionKey}`,
    resultId: `synthetic-result:${definition.id}`, measurementAt: '2026-10-12T12:00:00.000Z',
    resultStatus: 'completed', verificationStatus: 'verified', referenceStatus: 'original-hh-no-clinical-norms',
    interpretation: { identity: clone(identity), value, status: 'available', version: 'synthetic-interpretation-v1',
      contentHash: 'a'.repeat(64), source: 'synthetic-reviewed-fixture-only', meaning: `Synthetic meaning for ${dimensionKey}` } }
}
const dimensions = [
  ['hh-resource-pulse', 'resource.energy', 2, 'energy_agency', 'pace-one-action'],
  ['hh-resource-pulse', 'resource.self_support', 3, 'inner_support', 'fair-self-statement'],
  ['hh-resource-pulse', 'resource.connection', 7, 'connection_boundaries', 'safe-request'],
  ['hh-weekly-pulse', 'weekly.tension', 8, 'calm_regulation', 'external-pause'],
  ['hh-weekly-pulse', 'weekly.clarity', 3, 'attention_clarity', 'one-visible-task'],
  ['hh-weekly-pulse', 'weekly.mood', 3, 'emotional_flexibility', 'name-feeling-and-options'],
]
function practice(day, skillId, variant = 'standard', locale = 'ru') {
  return { objectiveId: personalCourseObjective(day).id, skillId: `synthetic-skill:${skillId}`,
    practiceId: `synthetic-practice:${skillId}:${day}:${variant}:${locale}`, contentVersion: 'synthetic-content-v1',
    contentLocale: locale, variant, durationMinutes: variant === 'standard' ? 4 : variant === 'short' ? 2 : 1,
    intensity: 'gentle', reviewStatus: 'reviewed', minimumEntry: true,
    recall: { practiceId: `synthetic-recall:${skillId}:${day}:${locale}`, contentVersion: 'synthetic-content-v1',
      durationMinutes: 1, reviewStatus: 'reviewed' } }
}
function mapping(row, topicId, skillId, locale = 'ru') {
  return { identity: clone(row.identity), topicId, mappingVersion: `synthetic-map-v1:${row.identity.dimensionKey}`,
    curriculumVersion: CURRICULUM_21.version, status: 'reviewed', source: 'synthetic-review-fixture-only',
    practices: Array.from({ length: 21 }, (_, i) => i + 1).filter(day => day % 7 !== 0)
      .flatMap(day => ['standard', 'short', 'alternative'].map(variant => practice(day, skillId, variant, locale))) }
}
function fixture() {
  const scales = dimensions.map(([key, dim, value]) => scale(key, dim, value))
  const mappings = scales.map((row, i) => mapping(row, dimensions[i][3], dimensions[i][4]))
  const reviewMapping = { mappingVersion: 'synthetic-review-map-v1', status: 'reviewed', source: 'synthetic-review-fixture-only',
    curriculumVersion: CURRICULUM_21.version, coversAllSelectedGoals: true,
    practices: [7, 14, 21].flatMap(day => ['standard', 'short'].map(variant => practice(day, 'review-all-goals', variant))) }
  return { scales, mappings, reviewMapping, selectedScaleIds: [scales[0].scaleId, scales[3].scaleId, scales[1].scaleId],
    consent: true, uiLocale: 'ru', loadMinutes: 2 }
}
function profileB() {
  const input = fixture()
  for (const [index, value] of [[0, 8], [2, 2], [3, 2]]) {
    input.scales[index].value = value
    input.scales[index].interpretation.value = value
  }
  input.selectedScaleIds = [input.scales[2].scaleId, input.scales[4].scaleId, input.scales[5].scaleId]
  input.loadMinutes = 5
  return input
}
function completed(plan, day, feedback = { comfort: 'comfortable', helpfulness: 'helpful' }, slot = plan.slots[day - 1]) {
  return { day, status: 'completed', slot: clone(slot), practiceId: slot.practiceId, skillId: slot.skillId, feedback }
}

for (const [ids, expected] of [
  [['A'], ['A', 'A', 'A', 'A', 'A', 'A']],
  [['A', 'B'], ['A', 'B', 'A', 'B', 'A', 'B']],
  [['A', 'B', 'C'], ['A', 'B', 'C', 'A', 'B', 'A']],
  [['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D', 'A', 'B']],
  [['A', 'B', 'C', 'D', 'E'], ['A', 'B', 'C', 'D', 'E', 'A']],
]) test(`${ids.length} topics get coverage before accents`, () => assert.deepEqual(personalCourseWeekTopics(ids), expected))

test('weekly primary/secondary follow explicit choice; absent second accent can be declined', () => {
  assert.deepEqual(personalCourseWeekTopics(['A', 'B', 'C'], { primaryTopicId: 'C', secondaryTopicId: 'B' }), ['C', 'B', 'A', 'C', 'B', 'C'])
  assert.deepEqual(personalCourseWeekTopics(['A', 'B', 'C'], { primaryTopicId: 'C', secondaryTopicId: null }), ['C', 'A', 'B', 'C', 'C', 'C'])
  assert.throws(() => personalCourseWeekTopics(['A', 'B'], { primaryTopicId: 'outside' }), /INVALID_WEEKLY_ACCENTS/)
})

test('two exact synthetic profiles have distinct skills/content/load and identical 21-day arc', () => {
  const a = createPersonalCoursePlan(fixture()), b = createPersonalCoursePlan(profileB())
  assert.equal(a.version, PERSONAL_COURSE_PLAN_VERSION)
  assert.equal(a.status, 'ready'); assert.equal(b.status, 'ready')
  assert.equal(a.slots.length, 21)
  assert.deepEqual(a.slots.map(s => s.commonObjective), b.slots.map(s => s.commonObjective))
  assert.deepEqual(a.slots.filter(s => s.kind === 'review').map(s => s.day), [7, 14, 21])
  assert.deepEqual(a.slots.slice(0, 6).map(s => s.topicId), ['energy_agency', 'calm_regulation', 'inner_support', 'energy_agency', 'calm_regulation', 'energy_agency'])
  assert.notEqual(a.slots[4].practiceId, b.slots[4].practiceId)
  assert.match(a.slots[4].skillId, /external-pause/)
  assert.match(b.slots[4].skillId, /one-visible-task/)
  assert.ok(a.slots.every(s => s.practice.durationMinutes === 2))
  assert.ok(b.slots.every(s => s.practice.durationMinutes === 4))
  assert.ok(a.slots.every(s => s.loadMinutes === 2 && s.automaticIntensityIncrease === false && s.requiresPreviousCompletion === false))
  for (const p of [a, b]) assert.ok(p.slots.filter(s => s.kind === 'review').every(s => s.reviewScaleIds.length === 3))
  assert.equal(a.productionIntegrated, false); assert.equal(a.automaticTreatment, false)
})

test('score changes never reorder chosen scales or create automatic deficits', () => {
  const input = profileB(), before = createPersonalCoursePlan(input)
  input.scales.forEach(row => { row.value = 10 - row.value; row.interpretation.value = row.value })
  const after = createPersonalCoursePlan(input)
  assert.deepEqual(after.slots.map(s => s.practiceId), before.slots.map(s => s.practiceId))
  assert.deepEqual(after.slots.map(s => s.selectedScaleId), before.slots.map(s => s.selectedScaleId))
  const catalog = personalCourseScaleCatalog(fixture())
  assert.deepEqual(catalog.map(row => row.scaleId), fixture().scales.map(row => row.scaleId))
  assert.ok(catalog.every(row => row.automaticDeficit === false))
  const lowTension = personalCourseScaleCatalog(profileB()).find(row => row.identity.dimensionKey === 'weekly.tension')
  assert.equal(lowTension.rawValue, 2); assert.equal(lowTension.supportPosition, 0.8)
  assert.ok(!before.selectedScaleIds.includes(lowTension.scaleId))
})

test('identity, raw value, source, polarity, references and content remain separately pinned', () => {
  const input = fixture(), binding = createPersonalCoursePlan(input).slots[0].provenanceBinding
  assert.deepEqual(binding.identity, input.scales[0].identity)
  assert.equal(binding.rawValue, 2)
  assert.equal(binding.range.max, 10)
  assert.equal(binding.polarity.direction, 'higher-reported-resource')
  assert.equal(binding.source, 'synthetic-reviewed-fixture-only')
  assert.equal(binding.referenceStatus, 'original-hh-no-clinical-norms')
  assert.equal(binding.contentLocale, 'ru')
  assert.equal(binding.mappingVersion, input.mappings[0].mappingVersion)
  assert.match(binding.practiceId, /pace-one-action/)
})

test('missing values are null, and one unavailable chosen scale blocks the personal plan', () => {
  const input = fixture(); input.scales[0].value = null
  const row = personalCourseScaleCatalog(input)[0]
  assert.equal(row.rawValue, null); assert.equal(row.rawPosition, null)
  assert.equal(row.reason, 'measurement-missing')
  const plan = createPersonalCoursePlan(input)
  assert.equal(plan.status, 'unsupported'); assert.equal(plan.coverage.readySlots, 0)
  assert.ok(plan.slots.every(slot => slot.practiceId === null))
})

test('mismatched assessment/scoring/translation/dimension identities cannot borrow a mapping', () => {
  for (const field of ['definitionId', 'definitionKey', 'definitionVersion', 'scoringKey', 'scoringVersion', 'translationVersion', 'contentHash', 'resultVersion', 'timeframe', 'instrumentLocale', 'dimensionKey']) {
    const input = fixture(); input.mappings[0].identity[field] = 'mismatch'
    assert.equal(personalCourseScaleCatalog(input)[0].reason, 'mapping-unavailable', field)
    assert.equal(createPersonalCoursePlan(input).status, 'unsupported', field)
  }
  const input = fixture(); input.scales[0].identity.scoringVersion = 'v999'
  assert.equal(personalCourseScaleCatalog(input)[0].reason, 'identity-unavailable')
})

test('unreviewed, missing, ambiguous and wrong-curriculum mappings fail closed', () => {
  const input = fixture(); input.mappings[0].status = 'draft'
  assert.equal(personalCourseScaleCatalog(input)[0].reason, 'mapping-unverified')
  const missing = fixture(); missing.mappings = []
  assert.equal(createPersonalCoursePlan(missing).status, 'unsupported')
  const duplicate = fixture(); duplicate.mappings.push(clone(duplicate.mappings[0]))
  assert.equal(personalCourseScaleCatalog(duplicate)[0].reason, 'mapping-ambiguous')
  const old = fixture(); old.mappings[0].curriculumVersion = 'different-objectives'
  assert.equal(personalCourseScaleCatalog(old)[0].reason, 'mapping-unverified')
})

test('incomplete or wrong-objective content is unsupported, with no broad-topic fallback', () => {
  const input = fixture(); input.mappings[0].practices = input.mappings[0].practices.filter(p => p.objectiveId !== personalCourseObjective(1).id)
  const plan = createPersonalCoursePlan(input)
  assert.equal(plan.slots[0].status, 'unsupported')
  assert.equal(plan.slots[0].reason, 'reviewed-objective-practice-unavailable')
  assert.equal(plan.slots[0].practiceId, null)
  assert.equal(plan.slots[1].status, 'ready')
  const wrong = fixture(); wrong.mappings[0].practices.forEach(p => { p.minimumEntry = false })
  assert.equal(createPersonalCoursePlan(wrong).slots[0].status, 'unsupported')
})

test('unreviewed review content never becomes a fabricated all-goals exercise', () => {
  const input = fixture(); input.reviewMapping = null
  const plan = createPersonalCoursePlan(input)
  assert.equal(plan.coverage.readySlots, 18)
  assert.deepEqual(plan.coverage.unsupportedDays.map(s => s.day), [7, 14, 21])
  assert.deepEqual(plan.slots[6].reviewScaleIds, input.selectedScaleIds)
})

test('clinical screenings, descriptive traits and mixed scales remain outside practice goals', () => {
  for (const [key, dimension] of [['phq-9', 'symptoms.phq9.total'], ['mini-ipip-20', 'traits.extraversion']]) {
    const definition = getAssessmentDefinition(key, 'v1', 'en')
    const dimensions = scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))).dimensions
    const actual = dimensions.find(d => d.key === dimension) ?? dimensions[0]
    const row = scale(key, actual.key, actual.value, 'en')
    const catalog = personalCourseScaleCatalog({ scales: [row], mappings: [mapping(row, 'inner_support', 'not-a-treatment', 'en')] })
    assert.equal(catalog[0].status, 'unsupported')
    assert.equal(catalog[0].automaticDeficit, false)
    assert.match(catalog[0].reason, /screening|not-a-directional/)
  }
  const definition = getAssessmentDefinition('hh-money-pressure', 'v1', 'en')
  const d = scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))).dimensions[0]
  const row = scale('hh-money-pressure', d.key, d.value, 'en')
  assert.equal(personalCourseScaleCatalog({ scales: [row] })[0].reason, 'not-a-directional-practice-goal')
})

test('exact explanation, result verification, shape and separate display language are required', () => {
  for (const mutate of [
    input => { input.scales[0].interpretation.identity.dimensionKey = 'wrong' },
    input => { input.scales[0].interpretation.value = 99 },
    input => { input.scales[0].interpretation.source = '' },
    input => { input.scales[0].verificationStatus = 'unchecked' },
    input => { input.scales[0].direction = 'lower-reported-resource' },
  ]) { const input = fixture(); mutate(input); assert.equal(createPersonalCoursePlan(input).status, 'unsupported') }
  const input = fixture(); input.uiLocale = 'en'
  const plan = createPersonalCoursePlan(input)
  assert.equal(plan.status, 'unsupported')
  assert.equal(plan.selectedScales[0].identity.instrumentLocale, 'ru')
  assert.equal(plan.slots[0].commonObjective.objective, personalCourseObjective(1, 'en').objective)
})

test('only 1–2 available scales permit fewer than three; no fabricated fillers', () => {
  const input = fixture(); input.selectedScaleIds = [input.scales[0].scaleId]
  assert.throws(() => createPersonalCoursePlan(input), /CHOOSE_THREE_TO_FIVE_WHEN_AVAILABLE/)
  input.scales = input.scales.slice(0, 1)
  assert.equal(createPersonalCoursePlan(input).status, 'ready')
  const two = fixture(); two.scales = two.scales.slice(0, 2); two.selectedScaleIds = two.scales.map(row => row.scaleId)
  assert.equal(createPersonalCoursePlan(two).topicOrder.length, 2)
  assert.throws(() => createPersonalCoursePlan({ ...two, consent: 'yes' }), /CONSENT/)
  assert.throws(() => createPersonalCoursePlan({ ...two, selectedScaleIds: [two.scales[0].scaleId, two.scales[0].scaleId] }), /CHOOSE/)
})

test('same-topic scales rotate exact distinct skills without increasing topic weight', () => {
  const input = fixture(), agency = scale('hh-resource-pulse', 'resource.agency', 4)
  input.scales.push(agency); input.mappings.push(mapping(agency, 'energy_agency', 'choose-next-step'))
  input.selectedScaleIds = [input.scales[0].scaleId, agency.scaleId, input.scales[3].scaleId]
  const plan = createPersonalCoursePlan(input)
  assert.deepEqual(plan.slots.slice(0, 6).map(slot => slot.topicId), ['energy_agency', 'calm_regulation', 'energy_agency', 'calm_regulation', 'energy_agency', 'calm_regulation'])
  assert.deepEqual(plan.slots.slice(0, 6).filter(slot => slot.topicId === 'energy_agency').map(slot => slot.selectedScaleId), [input.scales[0].scaleId, agency.scaleId, input.scales[0].scaleId])
  assert.notEqual(plan.slots[0].skillId, plan.slots[2].skillId)
  assert.deepEqual(plan.slots[6].reviewScaleIds, input.selectedScaleIds)
})

test('selection is deterministic and neither inputs nor exported objectives are mutated', () => {
  const input = fixture(), before = clone(input)
  const first = createPersonalCoursePlan(input), second = createPersonalCoursePlan(input)
  assert.deepEqual(first, second); assert.deepEqual(input, before)
  first.slots[0].provenanceBinding.identity.dimensionKey = 'changed'
  assert.deepEqual(input, before)
  const reordered = clone(input); reordered.mappings.reverse(); reordered.mappings.forEach(m => m.practices.reverse())
  assert.deepEqual(createPersonalCoursePlan(reordered), second)
})

test('only a confirmed future revision changes goals; prior slots and sessions stay exact', () => {
  const input = fixture(), prior = createPersonalCoursePlan(input)
  const sessions = [completed(prior, 1), { day: 2, status: 'skipped', feedback: null }], beforeSessions = clone(sessions)
  const nextInput = profileB()
  const next = revisePersonalCoursePlan(prior, { ...nextInput, fromDay: 8, expectedRevision: 0, sessions })
  assert.equal(next.revision, 1); assert.deepEqual(next.slots.slice(0, 7), prior.slots.slice(0, 7))
  assert.equal(next.slots[7].planRevision, 1)
  assert.notEqual(next.slots[7].practiceId, prior.slots[7].practiceId)
  assert.deepEqual(sessions, beforeSessions)
  assert.deepEqual(prior, createPersonalCoursePlan(input))
  assert.throws(() => revisePersonalCoursePlan(prior, { ...nextInput, fromDay: 2, expectedRevision: 0, sessions }), /PAST_SESSIONS_IMMUTABLE/)
  assert.throws(() => revisePersonalCoursePlan(prior, { ...nextInput, fromDay: 8, expectedRevision: 9, sessions }), /STALE_PLAN_REVISION/)
  assert.throws(() => revisePersonalCoursePlan(prior, { ...nextInput, consent: false, fromDay: 8, expectedRevision: 0 }), /CONSENT/)
})

test('explicit today target, short, alternative and rest choices are bounded previews', () => {
  const input = profileB(), plan = createPersonalCoursePlan(input), before = clone(plan)
  const changed = choosePersonalCourseDay(plan, { day: 5, mappings: input.mappings, targetScaleId: input.selectedScaleIds[0] })
  assert.equal(changed.slot.commonObjective.id, plan.slots[4].commonObjective.id)
  assert.match(changed.slot.skillId, /safe-request/)
  assert.equal(changed.changesPlan, false)
  const short = choosePersonalCourseDay(plan, { day: 5, mappings: input.mappings, choice: 'short' })
  assert.equal(short.slot.practice.durationMinutes, 2); assert.equal(short.slot.practice.variant, 'short')
  assert.equal(choosePersonalCourseDay(plan, { day: 5, mappings: input.mappings, choice: 'alternative' }).slot.practice.variant, 'alternative')
  assert.equal(choosePersonalCourseDay(plan, { day: 5, choice: 'rest' }).slot, null)
  assert.deepEqual(plan, before)
  assert.throws(() => choosePersonalCourseDay(plan, { day: 5, mappings: input.mappings, targetScaleId: input.scales[0].scaleId }), /TARGET_NOT_IN_CONFIRMED_SELECTION/)
  const missing = clone(input.mappings); missing.forEach(m => { m.practices = m.practices.filter(p => p.variant !== 'alternative') })
  assert.equal(choosePersonalCourseDay(plan, { day: 5, mappings: missing, choice: 'alternative' }).status, 'unsupported')
})

test('null feedback is unchanged; worse or missed days do not add load or infer mastery', () => {
  const plan = createPersonalCoursePlan(profileB())
  const untouched = choosePersonalCourseDay(plan, { day: 5 })
  assert.deepEqual(untouched, choosePersonalCourseDay(plan, { day: 5, feedback: null }))
  assert.equal(untouched.feedback, null)
  const worse = choosePersonalCourseDay(plan, { day: 5, feelingChange: 'worse', missed: true })
  assert.deepEqual(worse.slot, plan.slots[4]); assert.equal(worse.shortOffered, true)
  assert.equal(worse.slot.claimsMastery, false)
})

test('recall is optional, actually completed and comfortable, 2–3 learning days later', () => {
  const plan = createPersonalCoursePlan(profileB()), sessions = [completed(plan, 1)]
  assert.equal(personalCourseRecall(plan, { day: 2, sessions }), null)
  const recall = personalCourseRecall(plan, { day: 3, sessions })
  assert.equal(recall.fromDay, 1); assert.equal(recall.optional, true)
  assert.equal(recall.sourcePracticeId, plan.slots[0].practiceId)
  assert.equal(recall.totalMinutes, 5)
  assert.equal(personalCourseRecall(plan, { day: 4, sessions }).fromDay, 1)
  assert.equal(personalCourseRecall(plan, { day: 5, sessions }), null)
  assert.equal(personalCourseRecall(plan, { day: 7, sessions }), null)
})

test('skips, stops, null feedback, discomfort and false lesson identity never count as recall', () => {
  const plan = createPersonalCoursePlan(profileB())
  for (const status of ['skipped', 'stopped', 'deferred']) {
    assert.equal(personalCourseRecall(plan, { day: 3, sessions: [{ ...completed(plan, 1), status }] }), null)
  }
  for (const feedback of [null, {}, { helpfulness: 'helpful' }, { comfort: 'uncomfortable' }, { comfort: 'comfortable', helpfulness: 'not-helpful' }]) {
    assert.equal(personalCourseRecall(plan, { day: 3, sessions: [completed(plan, 1, feedback)] }), null)
  }
  assert.throws(() => personalCourseRecall(plan, { day: 3, sessions: [{ ...completed(plan, 1), practiceId: 'invented' }] }), /EXACT_COMPLETED_SLOT_REQUIRED/)
})

test('recall fits the chosen load or explicitly replaces the main practice, without added debt', () => {
  const plan = createPersonalCoursePlan(fixture()), sessions = [completed(plan, 1)]
  assert.equal(personalCourseRecall(plan, { day: 3, sessions }), null)
  const recall = personalCourseRecall(plan, { day: 3, sessions, replaceMain: true })
  assert.equal(recall.mode, 'replace-main'); assert.equal(recall.totalMinutes, 1)
  assert.equal(recall.changesProgress, false); assert.equal(recall.claimsMastery, false)
  const forged = clone(sessions); forged[0].slot.practice.recall.durationMinutes = 20
  assert.equal(personalCourseRecall(plan, { day: 3, sessions: forged, replaceMain: true }), null)
})

test('an unavailable chosen goal cannot bypass the launch boundary via a day target override', () => {
  const input = fixture(); input.scales[0].value = null
  const plan = createPersonalCoursePlan(input)
  const choice = choosePersonalCourseDay(plan, { day: 1, mappings: input.mappings, targetScaleId: input.selectedScaleIds[1] })
  assert.equal(choice.status, 'unsupported'); assert.equal(choice.slot, null)
  assert.equal(choosePersonalCourseDay(plan, { day: 1, choice: 'rest' }).status, 'rest-chosen')
})

test('later discomfort with the same skill prevents recalling an earlier comfortable attempt', () => {
  const input = profileB(), plan = createPersonalCoursePlan(input)
  const later = choosePersonalCourseDay(plan, { day: 2, mappings: input.mappings, targetScaleId: input.selectedScaleIds[0] }).slot
  const sessions = [completed(plan, 1), completed(plan, 2, { comfort: 'uncomfortable' }, later)]
  assert.equal(personalCourseRecall(plan, { day: 3, sessions }), null)
})

test('recall rejects a mismatched provenance snapshot or an increased chosen load', () => {
  const plan = createPersonalCoursePlan(profileB()), session = completed(plan, 1)
  session.slot.provenanceBinding.contentVersion = 'unrelated-version'
  assert.throws(() => personalCourseRecall(plan, { day: 3, sessions: [session] }), /EXACT_COMPLETED_SLOT_REQUIRED/)
  const main = clone(plan.slots[2]); main.loadMinutes = 99
  assert.throws(() => personalCourseRecall(plan, { day: 3, sessions: [completed(plan, 1)], chosenSlot: main }), /INVALID_RECALL_MAIN_SLOT/)
})

test('unavailable reviews do not count as delivered review coverage', () => {
  const input = fixture(); input.reviewMapping = null
  assert.ok(createPersonalCoursePlan(input).coverage.scaleCoverage.every(row => row.reviewDays.length === 0))
})

test('a later revision cannot reopen an already preserved prefix even with no new sessions', () => {
  const input = fixture(), plan = createPersonalCoursePlan(input)
  const revision = revisePersonalCoursePlan(plan, { ...profileB(), fromDay: 8, expectedRevision: 0 })
  assert.throws(() => revisePersonalCoursePlan(revision, { ...input, fromDay: 1, expectedRevision: 1 }), /PAST_PLAN_SLOTS_IMMUTABLE/)
  const undone = revisePersonalCoursePlan(revision, { ...input, fromDay: 8, expectedRevision: 1 })
  assert.equal(undone.revision, 2)
  assert.deepEqual(undone.slots.slice(0, 7), plan.slots.slice(0, 7))
  assert.equal(undone.slots[7].practiceId, plan.slots[7].practiceId)
})

test('reviews offer a genuinely short reviewed variant with the exact pinned all-goal mapping', () => {
  const input = profileB(), plan = createPersonalCoursePlan(input)
  for (const day of [7, 14, 21]) {
    const result = choosePersonalCourseDay(plan, { day, choice: 'short', reviewMapping: input.reviewMapping })
    assert.equal(result.status, 'ready')
    assert.equal(result.slot.practice.variant, 'short')
    assert.equal(result.slot.practice.durationMinutes, 2)
    assert.ok(result.slot.practice.durationMinutes < plan.slots[day - 1].practice.durationMinutes)
    assert.equal(result.slot.provenanceBinding.mappingVersion, plan.slots[day - 1].provenanceBinding.mappingVersion)
    assert.deepEqual(result.slot.provenanceBinding.goals, plan.slots[day - 1].provenanceBinding.goals)
    assert.deepEqual(result.slot.reviewScaleIds, input.selectedScaleIds)
    assert.equal(result.changesPlan, false)
  }
  assert.equal(choosePersonalCourseDay(plan, { day: 7, choice: 'rest' }).status, 'rest-chosen')
  assert.equal(choosePersonalCourseDay(plan, { day: 7, targetScaleId: input.selectedScaleIds[0], reviewMapping: input.reviewMapping }).reason, 'review-target-override-forbidden')
  assert.equal(choosePersonalCourseDay(plan, { day: 7, choice: 'short' }).status, 'unsupported')
})

test('review variants reject wrong versions, sources, curricula, goal scope, draft and absent content', () => {
  const input = profileB(), plan = createPersonalCoursePlan(input)
  for (const [field, value] of [['mappingVersion', 'changed'], ['source', 'changed'], ['curriculumVersion', 'changed'], ['coversAllSelectedGoals', false], ['status', 'draft']]) {
    const reviewMapping = { ...clone(input.reviewMapping), [field]: value }
    assert.equal(choosePersonalCourseDay(plan, { day: 7, choice: 'short', reviewMapping }).status, 'unsupported', field)
  }
  const noShort = clone(input.reviewMapping); noShort.practices = noShort.practices.filter(p => p.variant !== 'short')
  assert.equal(choosePersonalCourseDay(plan, { day: 7, choice: 'short', reviewMapping: noShort }).status, 'unsupported')
  const draft = clone(input.reviewMapping); draft.practices.forEach(p => { p.reviewStatus = 'draft' })
  assert.equal(choosePersonalCourseDay(plan, { day: 7, choice: 'short', reviewMapping: draft }).status, 'unsupported')
  const oneMinute = clone(input); oneMinute.reviewMapping.practices.filter(p => p.variant === 'standard').forEach(p => { p.durationMinutes = 1 })
  const shorterPlan = createPersonalCoursePlan(oneMinute)
  assert.equal(choosePersonalCourseDay(shorterPlan, { day: 7, choice: 'short', reviewMapping: oneMinute.reviewMapping }).status, 'unsupported')
})

test('revision requires every current snapshot field and inherits omitted chosen preferences', () => {
  const input = fixture()
  input.weeklyAccents = { 2: { primaryTopicId: 'inner_support', secondaryTopicId: 'energy_agency' } }
  const plan = createPersonalCoursePlan(input)
  const snapshot = { scales: input.scales, mappings: input.mappings, reviewMapping: input.reviewMapping, selectedScaleIds: input.selectedScaleIds }
  const next = revisePersonalCoursePlan(plan, { ...snapshot, consent: true, fromDay: 8, expectedRevision: 0 })
  assert.equal(next.uiLocale, 'ru'); assert.equal(next.loadMinutes, 2)
  assert.deepEqual(next.weeklyAccents, plan.weeklyAccents)
  assert.ok(next.slots.slice(7).every(slot => slot.practice.contentLocale === 'ru' && slot.practice.durationMinutes <= 2))
  for (const key of Object.keys(snapshot)) {
    const missing = { ...snapshot }; delete missing[key]
    assert.throws(() => revisePersonalCoursePlan(plan, { ...missing, consent: true, fromDay: 8, expectedRevision: 0 }), /COMPLETE_REVISION_SNAPSHOT_REQUIRED/, key)
    assert.throws(() => revisePersonalCoursePlan(plan, { ...snapshot, [key]: undefined, consent: true, fromDay: 8, expectedRevision: 0 }), /COMPLETE_REVISION_SNAPSHOT_REQUIRED/, key)
  }
})

test('midweek new goals receive remaining topic coverage before accents, preserving exact history', () => {
  const input = fixture(), plan = createPersonalCoursePlan(input)
  const sessions = [1, 2, 3].map(day => completed(plan, day)), saved = clone(sessions)
  const changed = profileB()
  const next = revisePersonalCoursePlan(plan, { ...changed, fromDay: 4, expectedRevision: 0, sessions })
  assert.deepEqual(next.slots.slice(0, 3), plan.slots.slice(0, 3))
  assert.deepEqual(next.slots.slice(3, 6).map(slot => slot.topicId), ['connection_boundaries', 'attention_clarity', 'emotional_flexibility'])
  assert.deepEqual(sessions, saved)
  assert.ok(next.coverage.scaleCoverage.every(row => row.practiceDays.some(day => day >= 4 && day <= 6)))
  assert.deepEqual(next.slots[6].reviewScaleIds, changed.selectedScaleIds)
})

test('midweek retained topic occurrences and actual completed target overrides reduce coverage once each', () => {
  const input = fixture(), plan = createPersonalCoursePlan(input)
  const overridden = choosePersonalCourseDay(plan, { day: 1, mappings: input.mappings, targetScaleId: input.selectedScaleIds[2] }).slot
  const sessions = [completed(plan, 1, { comfort: 'comfortable' }, overridden), completed(plan, 2)]
  const next = revisePersonalCoursePlan(plan, { ...input, fromDay: 3, expectedRevision: 0, sessions })
  assert.deepEqual(next.slots.slice(0, 2), plan.slots.slice(0, 2))
  // Actual C,B covers those topics once; A remains the first unmet topic.
  assert.deepEqual(next.slots.slice(2, 6).map(slot => slot.topicId), ['energy_agency', 'energy_agency', 'calm_regulation', 'energy_agency'])
  const duplicatePrefix = createPersonalCoursePlan({ ...input, weeklyAccents: { 1: { primaryTopicId: 'energy_agency', secondaryTopicId: null } } })
  const retained = [1, 2, 3, 4].map(day => completed(duplicatePrefix, day))
  const after = revisePersonalCoursePlan(duplicatePrefix, { ...input, weeklyAccents: {}, fromDay: 5, expectedRevision: 0, sessions: retained })
  assert.deepEqual(after.slots.slice(4, 6).map(slot => slot.topicId), ['calm_regulation', 'energy_agency'])
})

test('a newly selected exact scale in an existing topic is not starved by fictitious prefix visits', () => {
  const input = fixture(), plan = createPersonalCoursePlan(input)
  const agency = scale('hh-resource-pulse', 'resource.agency', 4)
  input.scales.push(agency); input.mappings.push(mapping(agency, 'energy_agency', 'choose-next-step'))
  input.selectedScaleIds = [input.selectedScaleIds[0], agency.scaleId, input.selectedScaleIds[1]]
  const next = revisePersonalCoursePlan(plan, { ...input, fromDay: 4, expectedRevision: 0, sessions: [1, 2, 3].map(day => completed(plan, day)) })
  const firstFutureEnergy = next.slots.slice(3).find(slot => slot.topicId === 'energy_agency')
  assert.equal(firstFutureEnergy.selectedScaleId, agency.scaleId)
  assert.match(firstFutureEnergy.skillId, /choose-next-step/)
})

test('interpretation report hash is mandatory lowercase 64 hex and stays separate from instrument hash', () => {
  for (const hash of [undefined, null, '', 'a'.repeat(63), 'a'.repeat(65), 'A'.repeat(64), `sha256:${'a'.repeat(64)}`, 'g'.repeat(64), ['a'.repeat(64)]]) {
    const input = fixture(); input.scales[0].interpretation.contentHash = hash
    assert.equal(personalCourseScaleCatalog(input)[0].reason, 'interpretation-unavailable')
    assert.equal(createPersonalCoursePlan(input).status, 'unsupported')
  }
  const firstInput = fixture(), secondInput = fixture()
  secondInput.scales[0].interpretation.contentHash = 'b'.repeat(64)
  const first = createPersonalCoursePlan(firstInput), second = createPersonalCoursePlan(secondInput)
  for (const plan of [first, second]) {
    assert.equal(plan.slots[0].provenanceBinding.interpretationContentHash, plan.selectedScales[0].interpretationContentHash)
    assert.equal(plan.slots[6].provenanceBinding.goals[0].interpretationContentHash, plan.selectedScales[0].interpretationContentHash)
    assert.equal(plan.slots[0].provenanceBinding.identity.contentHash, firstInput.scales[0].identity.contentHash)
    assert.ok(plan.slots[0].provenanceBinding.identity.contentHash.startsWith('sha256:'))
  }
  assert.equal(first.selectedScales[0].interpretationContentHash, 'a'.repeat(64))
  assert.equal(second.selectedScales[0].interpretationContentHash, 'b'.repeat(64))
  assert.equal(first.slots[0].practiceId, second.slots[0].practiceId)
  assert.notDeepEqual(first.slots[0].provenanceBinding, second.slots[0].provenanceBinding)
})


test('prepared source metadata survives catalog, practice and all-goal review without sharing references', () => {
  const input = fixture(), source = { title: 'Synthetic original source', url: 'https://example.org/synthetic', evidence: 'Synthetic metadata' }
  input.scales.forEach(row => { row.interpretation.sourceMetadata = structuredClone(source) })
  const plan = createPersonalCoursePlan(input)
  assert.deepEqual(plan.selectedScales[0].sourceMetadata, source)
  assert.deepEqual(plan.slots[0].provenanceBinding.sourceMetadata, source)
  assert.deepEqual(plan.slots[6].provenanceBinding.goals[0].sourceMetadata, source)
  input.scales[0].interpretation.sourceMetadata.title = 'Later external mutation'
  assert.deepEqual(plan.slots[0].provenanceBinding.sourceMetadata, source)
  const shortened = choosePersonalCourseDay(plan, { day: 7, choice: 'short', reviewMapping: input.reviewMapping })
  assert.deepEqual(shortened.slot.provenanceBinding.goals[0].sourceMetadata, source)
})

test('explicit family reuse retains the selected scale, limited facet and original source through review', () => {
  const input = fixture(), rationale = { en: 'Synthetic limited facet', ru: 'Условный узкий аспект' }, limitations = { en: 'Not the entire composite', ru: 'Не весь составной показатель' }
  const familyReuse = { sourceSkillId: 'synthetic-family', sourcePilotIdentity: { dimensionKey: 'other-pilot-context' }, limitedFacet: rationale }
  input.mappings.forEach(mapping => Object.assign(mapping, { rationale: structuredClone(rationale), limitations: structuredClone(limitations), familyReuse: structuredClone(familyReuse), sourceMetadata: { title: 'Synthetic mapping source' } }))
  const plan = createPersonalCoursePlan(input), binding = plan.slots[0].provenanceBinding
  assert.deepEqual(binding.identity, input.scales[0].identity)
  assert.notEqual(binding.identity.dimensionKey, binding.familyReuse.sourcePilotIdentity.dimensionKey)
  assert.deepEqual(binding.mappingRationale, rationale); assert.deepEqual(binding.mappingLimitations, limitations)
  assert.deepEqual(binding.mappingSourceMetadata, { title: 'Synthetic mapping source' })
  assert.deepEqual(plan.slots[6].provenanceBinding.goals[0].familyReuse, familyReuse)
  const shortened = choosePersonalCourseDay(plan, { day: 7, choice: 'short', reviewMapping: input.reviewMapping })
  assert.deepEqual(shortened.slot.provenanceBinding.goals[0].mappingLimitations, limitations)
  input.mappings[0].limitations.en = 'Changed later'
  assert.deepEqual(binding.mappingLimitations, limitations)
})


test('overall resource remains profile-only even with an injected reviewed mapping', () => {
 const aggregate = scale('hh-resource-pulse', 'resources.overall', 3), input = fixture()
 input.scales.push(aggregate); input.mappings.push(mapping(aggregate, 'energy_agency', 'synthetic-aggregate'))
 assert.equal(personalCourseScaleCatalog(input).at(-1).reason, 'aggregate-profile-only-not-a-separate-goal')
 input.selectedScaleIds = [input.scales[0].scaleId, input.scales[1].scaleId, aggregate.scaleId]
 assert.equal(createPersonalCoursePlan(input).status, 'unsupported')
})


test('weekly accents accept only bounded topic IDs, never arbitrary journal text or unknown fields', () => {
 for(const weeklyAccents of ['synthetic private text', [], null, {privateNote:'synthetic'}, {1:{comment:'synthetic'}}, {4:{}}, {1:[]}, {1:{primaryTopicId:'synthetic private text'}}, {1:{secondaryTopicId:'synthetic private text'}}]) {
  assert.throws(()=>createPersonalCoursePlan({...fixture(),weeklyAccents}),/INVALID_WEEKLY_ACCENTS/)
 }
 const input=fixture(), plan=createPersonalCoursePlan(input)
 assert.throws(()=>revisePersonalCoursePlan(plan,{...input,fromDay:8,expectedRevision:0,consent:true,weeklyAccents:{1:{privateNote:'synthetic'}}}),/INVALID_WEEKLY_ACCENTS/)
})
