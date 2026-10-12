import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getAssessmentDefinition, getDefinitionById, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { CURRICULUM_21 } from '../data/inner-growth/curriculum-21.js'
import { createPersonalCoursePlan, personalCourseScaleCatalog } from '../lib/inner-growth/course-personal-plan-v2.js'
import {
  PERSONAL_COURSE_PILOT_VERSION, PERSONAL_COURSE_PILOT_STATUS, PERSONAL_COURSE_PILOT_CURRICULUM_VERSION,
  PERSONAL_COURSE_PILOT_INSTRUMENTS, PERSONAL_COURSE_PILOT_DRAFT_BUNDLE as BUNDLE,
  PERSONAL_COURSE_PILOT_CONTENT as CONTENT, getPersonalCoursePilotContent,
  getPersonalCoursePilotMapping, personalCoursePilotSupport, personalCoursePilotVariantAvailability,
  listPersonalCoursePilotAuditRows,
} from '../data/inner-growth/course-personal-practices-v2.js'

const practiceDays = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20]
const reviewDays = [7, 14, 21]
const localeList = ['en', 'ru']
const clone = value => structuredClone(value)
const unique = values => [...new Set(values)]
const text = value => typeof value === 'string' && value.trim().length > 0
const dimensions = ['resource.energy', 'resource.self_support', 'resource.connection', 'weekly.tension', 'weekly.clarity', 'weekly.mood']
const identityKeys = ['definitionId', 'definitionKey', 'definitionVersion', 'instrumentLocale', 'translationVersion', 'contentHash', 'scoringKey', 'scoringVersion', 'resultVersion', 'timeframe', 'dimensionKey']
function card(dimensionKey, day, locale = 'en', variant = 'standard') {
  return CONTENT.find(entry => entry.dimensionKey === dimensionKey && entry.day === day && entry.contentLocale === locale && entry.variant === variant)
}
function fixtureScale(mapping) {
  // Synthetic result and explanation ONLY for asserting draft refusal.
  const definition = getDefinitionById(mapping.identity.definitionId)
  const score = scoreAssessment(definition, Object.fromEntries(definition.questions.map(question => [question.id, question.min ?? definition.answerScale.min])))
  const dimension = score.dimensions.find(d => d.key === mapping.identity.dimensionKey)
  return {
    ...dimension, value: 2, identity: clone(mapping.identity), scaleId: `${definition.id}/${dimension.key}`,
    resultId: `synthetic-content-test:${definition.id}`, measurementAt: '2026-10-12T12:00:00.000Z',
    resultStatus: 'completed', verificationStatus: 'verified', referenceStatus: 'original-hh-no-clinical-norms',
    interpretation: { identity: clone(mapping.identity), status: 'available', value: 2,
      version: 'synthetic-explanation-v1', source: 'synthetic-unit-test-only',
      contentHash: 'a'.repeat(64), meaning: 'Synthetic explanation for draft-refusal testing only.' },
  }
}

test('pilot explicitly declares six constructs, twelve exact bindings, four forms and no whole-battery coverage', () => {
  assert.equal(BUNDLE.scope.constructCount, 6)
  assert.equal(BUNDLE.scope.exactScaleBindingCount, 12)
  assert.equal(BUNDLE.scope.instrumentFormCount, 4)
  assert.equal(BUNDLE.mappings.length, 12)
  assert.equal(PERSONAL_COURSE_PILOT_INSTRUMENTS.length, 4)
  assert.deepEqual(unique(BUNDLE.mappings.map(m => m.identity.dimensionKey)).sort(), dimensions.slice().sort())
  assert.equal(BUNDLE.scope.completeAssessmentBatteryCovered, false)
  assert.equal(BUNDLE.scope.otherScales, 'unsupported-outside-this-pilot')
  assert.equal(BUNDLE.productionEligible, false)
  assert.equal(BUNDLE.productionIntegrated, false)
  assert.equal(BUNDLE.clinicalValidation, false)
})

test('literal provenance pins exactly match currently registered EN/RU forms and dimension keys', () => {
  for (const identity of PERSONAL_COURSE_PILOT_INSTRUMENTS) {
    const current = getDefinitionById(identity.definitionId)
    assert.deepEqual(identity, provenance(current))
    assert.equal(identity.definitionVersion, 'v1')
    assert.match(identity.contentHash, /^sha256:[a-f0-9]{64}$/)
  }
  for (const mapping of BUNDLE.mappings) {
    assert.deepEqual(Object.keys(mapping.identity).sort(), identityKeys.slice().sort())
    const definition = getDefinitionById(mapping.identity.definitionId)
    const dimensions = scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))).dimensions
    assert.ok(dimensions.some(d => d.key === mapping.identity.dimensionKey))
    assert.deepEqual(getPersonalCoursePilotMapping(mapping.identity), mapping)
    assert.equal(personalCoursePilotSupport(mapping.identity).status, 'draft-review-required')
  }
})

test('every provenance mutation and every missing identity field refuses rebinding', () => {
  const original = BUNDLE.mappings[0].identity
  for (const key of identityKeys) {
    assert.equal(getPersonalCoursePilotMapping({ ...original, [key]: `${original[key]}-changed` }), null, key)
    const missing = { ...original }; delete missing[key]
    assert.equal(getPersonalCoursePilotMapping(missing), null, key)
  }
  assert.equal(getPersonalCoursePilotMapping(null), null)
  assert.equal(getPersonalCoursePilotMapping({ dimensionKey: original.dimensionKey }), null)
  assert.equal(personalCoursePilotSupport({ ...original, contentHash: `sha256:${'0'.repeat(64)}` }).status, 'unsupported')
})

test('actual other dimensions in the pilot instruments remain unsupported', () => {
  for (const [definitionKey, dimensionKeys] of Object.entries(BUNDLE.scope.unboundDimensionsInPilotInstruments)) {
    for (const locale of localeList) {
      const definition = getAssessmentDefinition(definitionKey, 'v1', locale)
      const current = scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))).dimensions
      for (const dimensionKey of dimensionKeys) {
        assert.ok(current.some(d => d.key === dimensionKey), dimensionKey)
        const identity = { ...provenance(definition), dimensionKey }
        assert.equal(getPersonalCoursePilotMapping(identity), null)
        assert.equal(personalCoursePilotSupport(identity).status, 'unsupported')
      }
    }
  }
  const screening = getAssessmentDefinition('phq-9', 'v1', 'en')
  const shape = scoreAssessment(screening, Object.fromEntries(screening.questions.map(q => [q.id, q.min ?? screening.answerScale.min]))).dimensions[0]
  assert.equal(personalCoursePilotSupport({ ...provenance(screening), dimensionKey: shape.key }).status, 'unsupported')
})

test('draft mappings, references, and review material can never enter the reviewed-only planner', () => {
  const mappings = BUNDLE.mappings.filter(m => m.identity.instrumentLocale === 'en').slice(0, 3)
  const scales = mappings.map(fixtureScale)
  const catalog = personalCourseScaleCatalog({ scales, mappings })
  assert.ok(catalog.every(row => row.status === 'unsupported' && row.reason === 'mapping-unverified'))
  const plan = createPersonalCoursePlan({ scales, mappings, reviewMapping: BUNDLE.reviewMapping,
    selectedScaleIds: scales.map(s => s.scaleId), uiLocale: 'ru', loadMinutes: 5, consent: true })
  assert.ok(plan.slots.every(slot => slot.status === 'unsupported' && slot.practice === null))
  assert.ok(plan.slots.every(slot => slot.reason === 'selected-scale-unsupported'))
})

test('changing only mapping status is insufficient to admit draft practices or draft reviews', () => {
  const mappings = clone(BUNDLE.mappings.filter(m => m.identity.instrumentLocale === 'en').slice(0, 3))
  // This synthetic mutation tests a boundary; it is not an editorial approval.
  mappings.forEach(mapping => { mapping.status = 'reviewed' })
  const scales = mappings.map(fixtureScale)
  const plan = createPersonalCoursePlan({ scales, mappings, reviewMapping: BUNDLE.reviewMapping,
    selectedScaleIds: scales.map(s => s.scaleId), uiLocale: 'en', loadMinutes: 5, consent: true })
  assert.ok(plan.slots.every(slot => slot.status === 'unsupported'))
  assert.ok(plan.slots.filter(slot => slot.kind === 'practice').every(slot => slot.reason === 'reviewed-objective-practice-unavailable'))
  assert.ok(plan.slots.filter(slot => slot.kind === 'review').every(slot => slot.reason === 'review-material-unavailable'))
})

test('all six skills have 18 exact objective days with EN/RU standard and short content', () => {
  assert.equal(CONTENT.filter(c => c.kind === 'practice' && c.variant === 'standard').length, 216)
  assert.equal(CONTENT.filter(c => c.kind === 'practice' && c.variant === 'short').length, 216)
  for (const mapping of BUNDLE.mappings) {
    for (const locale of localeList) {
      for (const variant of ['standard', 'short']) {
        const practices = mapping.practices.filter(p => p.contentLocale === locale && p.variant === variant)
        assert.equal(practices.length, 18)
        assert.deepEqual(practices.map(p => Number(p.objectiveId.split('/').at(-1))), practiceDays)
        for (const reference of practices) {
          const content = getPersonalCoursePilotContent(reference)
          assert.equal(content.dimensionKey, mapping.identity.dimensionKey)
          assert.equal(content.topicId, mapping.topicId)
          assert.equal(content.skillId, reference.skillId)
        }
      }
    }
  }
})

test('instrument locale and content locale are independent for every exact binding', () => {
  assert.equal(BUNDLE.scope.contentLocaleIndependentOfInstrumentLocale, true)
  for (const mapping of BUNDLE.mappings) {
    assert.deepEqual(unique(mapping.practices.map(p => p.contentLocale)).sort(), localeList)
    for (const locale of localeList) {
      const selected = mapping.practices.find(p => p.contentLocale === locale && p.variant === 'standard')
      assert.ok(selected)
      assert.equal(getPersonalCoursePilotContent(selected).contentLocale, locale)
    }
  }
})

test('every draft card is complete, standalone, gentle, duration-bounded and original', () => {
  assert.equal(CONTENT.length, 456)
  for (const content of CONTENT) {
    for (const key of ['practiceId', 'skillId', 'objectiveId', 'title', 'sharedObjective', 'entry', 'safety', 'action', 'stoppingPoint', 'finish', 'source']) assert.ok(text(content[key]), `${content.practiceId}/${key}`)
    assert.ok(content.steps.length > 0 && content.steps.every(text))
    assert.ok(content.steps.includes(content.action))
    assert.equal(content.contentVersion, PERSONAL_COURSE_PILOT_VERSION)
    assert.equal(content.reviewStatus, 'draft')
    assert.equal(content.contentStatus, 'ORIGINAL_DRAFT_REVIEW_REQUIRED')
    assert.equal(content.minimumEntry, true)
    assert.equal(content.requiresPreviousCompletion, false)
    assert.equal(content.previousLessonRequired, false)
    assert.equal(content.intensity, 'gentle')
    assert.ok(content.durationMinutes > 0 && content.durationMinutes <= 8)
    assert.equal(content.durationMinutes, content.variant === 'standard' ? 5 : 2)
    assert.equal(content.durationIsEstimate, true)
    assert.equal(content.completionTimerRequired, false)
    assert.equal(content.clinicalValidation, false)
    assert.equal(content.efficacyClaim, false)
    assert.equal(content.automaticTreatment, false)
    assert.equal(content.contactRequired, false)
    assert.equal(content.sourceType, 'original-educational-content')
    assert.ok(Object.values(content.accessibility).every(flag => flag === true))
  }
})

test('the common arc, objective text and titles match the literal editorial curriculum snapshot', () => {
  assert.equal(PERSONAL_COURSE_PILOT_CURRICULUM_VERSION, CURRICULUM_21.version)
  for (const content of CONTENT) {
    const route = CURRICULUM_21.route.find(row => row.day === content.day)
    assert.equal(content.week, route.week)
    assert.equal(content.objectiveId, `${CURRICULUM_21.version}/day/${content.day}`)
    assert.equal(content.sharedObjective, route.objective[content.contentLocale])
    assert.equal(content.sharedSkill, route.skill[content.contentLocale])
    assert.ok(content.title.startsWith(route.skill[content.contentLocale]))
    assert.equal(content.kind === 'whole-goal-review', route.review)
  }
})

test('short cards reduce instructions and omit optional reflection/transfer rather than relabel a timer', () => {
  for (const standard of CONTENT.filter(c => c.kind === 'practice' && c.variant === 'standard')) {
    const short = card(standard.dimensionKey, standard.day, standard.contentLocale, 'short')
    assert.ok(short.steps.length < standard.steps.length)
    assert.equal(short.optionalReflection, null)
    assert.equal(short.optionalTransfer, null)
    assert.ok(text(standard.optionalReflection))
    assert.ok(text(standard.optionalTransfer))
    assert.notEqual(short.finish, standard.finish)
    assert.notEqual(short.safety, standard.safety)
    assert.ok(JSON.stringify(short).length < JSON.stringify(standard).length)
  }
})

test('same numeric low values have six different concrete day-five actions', () => {
  const examples = dimensions.map(dimension => card(dimension, 5))
  assert.equal(unique(examples.map(c => c.skillId)).length, 6)
  assert.equal(unique(examples.map(c => c.action)).length, 6)
  assert.match(card('resource.energy', 5).action, /only the chosen action, then stop/)
  assert.match(card('resource.self_support', 5).action, /one fair sentence/)
  assert.match(card('resource.connection', 5).action, /Privately rehearse/)
  assert.match(card('resource.connection', 5).action, /Do not send/)
  assert.match(card('weekly.tension', 5).action, /one visible neutral detail/)
  assert.match(card('weekly.clarity', 5).action, /one tiny task/)
  assert.match(card('weekly.clarity', 5).action, /return marker/)
  assert.match(card('weekly.mood', 5).action, /feeling word/)
  const russian = dimensions.map(dimension => card(dimension, 5, 'ru'))
  assert.equal(unique(russian.map(c => c.action)).length, 6)
  for (const content of russian) assert.match(content.action, /[А-Яа-яЁё]/)
})

test('all day-eleven practices return after interruption without an unrelated topic or catch-up', () => {
  for (const dimension of dimensions) {
    const content = card(dimension, 11)
    assert.equal(content.sharedSkill, 'Return after distraction')
    assert.match(content.action, /interrupted|distract|drifted|missed|did not finish|naturally left/i)
    assert.match(content.action, /no |do not |without /i)
    assert.notEqual(content.action, card(dimension, 5).action)
  }
})

test('every rendered day-twenty short card explicitly allows first entry through a mild invented mismatch', () => {
  for (const dimension of dimensions) for (const locale of localeList) {
    const short = card(dimension, 20, locale, 'short')
    assert.ok(short)
    assert.equal(short.minimumEntry, true)
    assert.equal(short.previousLessonRequired, false)
    // Assert the actual short action, not shared standard-only preparation text.
    const firstEntry = locale === 'en' ? /mild invented (?:example|mismatch)/ : /лёгкий вымышленный пример/
    assert.match(short.action, firstEntry, `${dimension}/${locale}`)
    assert.ok(short.steps.includes(short.action))
    const renderedShort = [short.entry, short.safety, ...short.steps, short.stoppingPoint, short.finish].join(' ')
    assert.match(renderedShort, firstEntry, `${dimension}/${locale}`)
  }
})

test('separately written alternatives have distinct methods and actions; all other alternatives stay unavailable', () => {
  const alternatives = CONTENT.filter(c => c.variant === 'alternative')
  assert.equal(alternatives.length, 12)
  for (const alternative of alternatives) {
    const standard = card(alternative.dimensionKey, alternative.day, alternative.contentLocale)
    assert.notEqual(alternative.action, standard.action)
    assert.notEqual(alternative.practiceMethod, standard.practiceMethod)
    assert.ok(text(alternative.alternativeDifference))
    assert.equal(alternative.day, 5)
  }
  for (const mapping of BUNDLE.mappings) {
    const skillId = mapping.practices[0].skillId
    for (const day of practiceDays.filter(d => d !== 5)) {
      for (const contentLocale of localeList) {
        const result = personalCoursePilotVariantAvailability({ skillId, day, contentLocale, variant: 'alternative' })
        assert.equal(result.status, 'unavailable')
        assert.equal(result.practice, null)
        assert.equal(card(mapping.identity.dimensionKey, day, contentLocale).alternativeAvailability.status, 'unavailable')
      }
    }
  }
})

test('whole-goal review on 7/14/21 covers every selected goal, including untried goals, in both locales and loads', () => {
  assert.equal(BUNDLE.reviewMapping.status, 'draft')
  assert.equal(BUNDLE.reviewMapping.coversAllSelectedGoals, true)
  assert.equal(BUNDLE.reviewMapping.practices.length, 12)
  for (const day of reviewDays) for (const contentLocale of localeList) for (const variant of ['standard', 'short']) {
    const review = CONTENT.find(c => c.kind === 'whole-goal-review' && c.day === day && c.contentLocale === contentLocale && c.variant === variant)
    assert.ok(review)
    assert.equal(review.reviewScope, 'all-selected-goals')
    assert.equal(review.goalListSource, 'plan.selectedScaleIds')
    assert.equal(review.includesUnpractisedGoals, true)
    assert.equal(review.updatesPlanAutomatically, false)
    assert.equal(review.retestRequired, false)
    assert.match(review.action, contentLocale === 'en' ? /each selected goal|every selected goal/i : /кажд[а-я]+ выбранн[а-я]+ цел/)
    assert.equal(personalCoursePilotVariantAvailability({ skillId: review.skillId, day, contentLocale, variant: 'alternative' }).status, 'unavailable')
  }
})

test('lookup requires exact ID/version/locale with no empty, locale, revision or variant fallback', () => {
  const reference = BUNDLE.mappings[0].practices[0]
  assert.ok(getPersonalCoursePilotContent(reference))
  assert.equal(getPersonalCoursePilotContent(), null)
  for (const key of ['practiceId', 'contentVersion', 'contentLocale']) {
    const incomplete = { ...reference }; delete incomplete[key]
    assert.equal(getPersonalCoursePilotContent(incomplete), null)
    assert.equal(getPersonalCoursePilotContent({ ...reference, [key]: '' }), null)
    assert.equal(getPersonalCoursePilotContent({ ...reference, [key]: `${reference[key]}-unknown` }), null)
  }
  assert.equal(getPersonalCoursePilotContent({ ...reference, contentLocale: reference.contentLocale === 'en' ? 'ru' : 'en' }), null)
  assert.equal(personalCoursePilotVariantAvailability().status, 'unavailable')
  assert.equal(personalCoursePilotVariantAvailability({ skillId: 'pace-one-action', day: 7, contentLocale: 'en', variant: 'standard' }).practice, null)
})

test('all content identities are unique and mapping references resolve without extra unbound practice days', () => {
  assert.equal(unique(CONTENT.map(c => c.practiceId)).length, CONTENT.length)
  for (const reference of [...BUNDLE.mappings.flatMap(m => m.practices), ...BUNDLE.reviewMapping.practices]) {
    const content = getPersonalCoursePilotContent(reference)
    assert.ok(content)
    assert.equal(reference.reviewStatus, 'draft')
    for (const [key, value] of Object.entries(reference)) assert.deepEqual(content[key], value)
  }
})

test('audit exposes all 111 skill/day rows and exact full bodies for EN/RU and each variant', () => {
  const rows = listPersonalCoursePilotAuditRows()
  assert.equal(rows.length, 111)
  assert.equal(rows.filter(row => row.kind === 'practice').length, 108)
  assert.equal(rows.filter(row => row.kind === 'whole-goal-review').length, 3)
  assert.equal(unique(rows.map(row => `${row.skillId}/${row.day}`)).length, 111)
  for (const row of rows) for (const locale of localeList) {
    assert.ok(text(row.locales[locale].title))
    for (const variant of ['standard', 'short', 'alternative']) {
      const result = row.locales[locale].variants[variant]
      if (result.status === 'unavailable') { assert.equal(variant, 'alternative'); continue }
      assert.equal(result.reviewStatus, 'draft')
      assert.deepEqual(getPersonalCoursePilotContent(result).action, result.action)
      assert.deepEqual(getPersonalCoursePilotContent(result).steps, result.steps)
    }
  }
})

test('frozen bundles and isolated lookup/audit copies cannot silently acquire reviewed status', () => {
  assert.ok(Object.isFrozen(BUNDLE))
  assert.ok(Object.isFrozen(BUNDLE.mappings[0].identity))
  assert.ok(Object.isFrozen(CONTENT[0].steps))
  assert.throws(() => { BUNDLE.mappings[0].status = 'reviewed' }, TypeError)
  const copy = getPersonalCoursePilotMapping(BUNDLE.mappings[0].identity)
  copy.status = 'reviewed'
  assert.equal(BUNDLE.mappings[0].status, 'draft')
  const audit = listPersonalCoursePilotAuditRows()
  audit[0].locales.en.variants.standard.action = 'changed'
  assert.notEqual(listPersonalCoursePilotAuditRows()[0].locales.en.variants.standard.action, 'changed')
  assert.equal(PERSONAL_COURSE_PILOT_STATUS, 'ORIGINAL_DRAFT_REVIEW_REQUIRED')
})

test('registry stays isolated from legacy cards, live definition rebinding, private page links and clinical promises', async () => {
  const source = await readFile(new URL('../data/inner-growth/course-personal-practices-v2.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /from ['"].*(?:lesson-library|definitions|scoring|course-personal-plan)/)
  assert.doesNotMatch(source, /provenance\(/)
  assert.doesNotMatch(source, /https?:\/\/[^\s'"]*(?:chatgpt|notion|docs\.google)/i)
  assert.doesNotMatch(source, /(?:guaranteed|cure|clinically validated|доказанно лечит|гарантированное исцеление)/i)
  const plannerSource = await readFile(new URL('../lib/inner-growth/course-personal-plan-v2.js', import.meta.url), 'utf8')
  assert.doesNotMatch(plannerSource, /from ['"].*course-personal-practices-v2/)
})
