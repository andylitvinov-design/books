import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { ASSESSMENT_DEFINITIONS, getDefinitionById, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { CURRICULUM_21 } from '../data/inner-growth/curriculum-21.js'
import { createPersonalCoursePlan, personalCourseScaleCatalog } from '../lib/inner-growth/course-personal-plan-v2.js'
import { createPersonalCourseRuntimeAdapter } from '../lib/inner-growth/course-personal-runtime-v2.js'
import {
  PERSONAL_COURSE_PILOT_VERSION, PERSONAL_COURSE_PILOT_INSTRUMENTS,
  PERSONAL_COURSE_PILOT_CONTENT, PERSONAL_COURSE_PILOT_DRAFT_BUNDLE,
} from '../data/inner-growth/course-personal-practices-v2.js'
import {
  PERSONAL_COURSE_SUPPORT_FAMILIES_VERSION as VERSION,
  PERSONAL_COURSE_SUPPORT_FAMILIES_CONTENT_VERSION as CONTENT_VERSION,
  PERSONAL_COURSE_SUPPORT_FAMILIES_STATUS as STATUS,
  PERSONAL_COURSE_SUPPORT_FAMILIES_CURRICULUM_VERSION as CURRICULUM_VERSION,
  PERSONAL_COURSE_SUPPORT_FAMILIES_INSTRUMENTS as INSTRUMENTS,
  PERSONAL_COURSE_SUPPORT_FAMILIES_CONSTRUCTS as CONSTRUCTS,
  PERSONAL_COURSE_SUPPORT_FAMILIES_CONTENT as CONTENT,
  PERSONAL_COURSE_SUPPORT_FAMILIES_MAPPINGS as MAPPINGS,
  PERSONAL_COURSE_SUPPORT_FAMILIES_DRAFT_BUNDLE as BUNDLE,
  getPersonalCourseSupportFamilyContent as getContent,
  getPersonalCourseSupportFamilyMapping as getMapping,
  personalCourseSupportFamilySupport as support,
  personalCourseSupportFamilyVariantAvailability as availability,
  listPersonalCourseSupportFamilyAuditRows as auditRows,
} from '../data/inner-growth/course-personal-support-families-v2.js'

const DAYS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20]
const LOCALES = ['en', 'ru']
const DIMENSIONS = ['weekly.recovery', 'resource.support', 'resource.meaning']
const SKILLS = ['rest-and-rhythm', 'support-access', 'values-and-direction']
const IDENTITIES = ['definitionId', 'definitionKey', 'definitionVersion', 'instrumentLocale', 'translationVersion', 'contentHash', 'scoringKey', 'scoringVersion', 'resultVersion', 'timeframe', 'dimensionKey']
const SHAPE = ['min', 'max', 'unit', 'timeframe', 'direction', 'dimensionClass', 'sourceConstruct']
const REFERENCE = ['objectiveId', 'skillId', 'practiceId', 'contentVersion', 'contentLocale', 'variant', 'durationMinutes', 'intensity', 'reviewStatus', 'minimumEntry']
const unique = values => [...new Set(values)]
const clone = value => structuredClone(value)
const nonempty = value => typeof value === 'string' && value.trim().length > 0
const card = (skillId, day, contentLocale = 'en', variant = 'standard') => CONTENT.find(row => row.skillId === skillId && row.day === day && row.contentLocale === contentLocale && row.variant === variant)
const dimension = (definition, key) => scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))).dimensions.find(row => row.key === key)
const body = row => [row.entry, row.safety, ...row.steps, row.stoppingPoint, row.optionalReflection, row.optionalTransfer, row.finish].filter(Boolean).join('\n')
const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
function fixtureScale(mapping) {
  // Synthetic answers and explanation for negative draft-boundary tests only.
  const definition = getDefinitionById(mapping.identity.definitionId)
  const shape = dimension(definition, mapping.identity.dimensionKey)
  return {
    ...shape, identity: clone(mapping.identity), scaleId: `${definition.id}/${shape.key}`,
    resultId: `synthetic-family-boundary:${definition.id}`, measurementAt: '2026-10-12T12:00:00.000Z',
    resultStatus: 'completed', verificationStatus: 'verified', referenceStatus: 'synthetic-nonclinical-boundary-test',
    interpretation: { identity: clone(mapping.identity), status: 'available', value: shape.value,
      version: 'synthetic-explanation-v1', source: 'synthetic-test-only', contentHash: 'a'.repeat(64),
      meaning: 'Synthetic explanation used only to verify draft refusal.', sourceMetadata: clone(mapping.sourceMetadata) },
  }
}

test('new source covers exactly three original families, six exact mappings and 216 draft cards', () => {
  assert.equal(CONSTRUCTS.length, 3)
  assert.equal(MAPPINGS.length, 6)
  assert.equal(CONTENT.length, 216)
  assert.equal(BUNDLE.scope.constructCount, 3)
  assert.equal(BUNDLE.scope.exactScaleBindingCount, 6)
  assert.equal(BUNDLE.scope.instrumentFormCount, 4)
  assert.deepEqual(BUNDLE.scope.dimensionKeys, DIMENSIONS)
  assert.deepEqual(BUNDLE.scope.skillIds, SKILLS)
  assert.deepEqual(unique(CONTENT.map(row => row.skillId)), SKILLS)
  assert.deepEqual(unique(MAPPINGS.map(row => row.identity.dimensionKey)), DIMENSIONS)
  assert.deepEqual(unique(MAPPINGS.map(row => row.identity.definitionKey)), ['hh-weekly-pulse', 'hh-resource-pulse'])
  assert.equal(BUNDLE.version, VERSION)
  assert.equal(BUNDLE.status, 'draft')
  assert.equal(BUNDLE.contentStatus, STATUS)
  for (const flag of ['productionEligible', 'productionIntegrated', 'clinicalValidation', 'efficacyClaim', 'automaticTreatment']) assert.equal(BUNDLE[flag], false)
  assert.equal(BUNDLE.scope.completeAssessmentBatteryCovered, false)
  assert.equal(BUNDLE.scope.originalPilotReplaced, false)
})

test('four literal instrument identities equal the existing pilot and current registered forms', () => {
  assert.equal(INSTRUMENTS.length, 4)
  assert.deepEqual(INSTRUMENTS, PERSONAL_COURSE_PILOT_INSTRUMENTS)
  for (const identity of INSTRUMENTS) {
    assert.deepEqual(identity, provenance(getDefinitionById(identity.definitionId)))
    assert.match(identity.contentHash, /^sha256:[a-f0-9]{64}$/)
  }
})

test('six exact bindings preserve locale-specific scorer shapes and unchanged registered source metadata', () => {
  for (const mapping of MAPPINGS) {
    const definition = getDefinitionById(mapping.identity.definitionId)
    const scored = dimension(definition, mapping.identity.dimensionKey)
    assert.ok(scored)
    assert.deepEqual(Object.keys(mapping.identity).sort(), IDENTITIES.slice().sort())
    assert.deepEqual(mapping.identity, { ...provenance(definition), dimensionKey: mapping.identity.dimensionKey })
    assert.deepEqual(mapping.expectedDimensionShape, Object.fromEntries(SHAPE.map(key => [key, scored[key]])))
    assert.deepEqual(mapping.sourceMetadata, definition.source)
    assert.equal(mapping.source, `registered-definition:${definition.id}@${definition.contentHash}#${mapping.identity.dimensionKey}`)
    assert.deepEqual(mapping.sourceEvidence.registeredItemIds, [mapping.identity.dimensionKey])
    assert.ok(definition.questions.some(question => question.id === mapping.identity.dimensionKey))
    assert.equal(mapping.sourceEvidence.sourceRecommendsExercise, false)
    assert.deepEqual(getMapping(mapping.identity), mapping)
  }
  for (const [key, en, ru] of [['weekly.recovery', 'weekly.recovery', 'weekly.recovery'], ['resource.support', 'Support', 'Поддержка'], ['resource.meaning', 'Meaning', 'Смысл']]) {
    assert.equal(MAPPINGS.find(m => m.identity.dimensionKey === key && m.identity.instrumentLocale === 'en').expectedDimensionShape.sourceConstruct, en)
    assert.equal(MAPPINGS.find(m => m.identity.dimensionKey === key && m.identity.instrumentLocale === 'ru').expectedDimensionShape.sourceConstruct, ru)
  }
})

test('every identity mutation, omission and extra field fails closed without locale or version inference', () => {
  for (const mapping of MAPPINGS) {
    for (const key of IDENTITIES) {
      assert.equal(getMapping({ ...mapping.identity, [key]: `${mapping.identity[key]}-changed` }), null, key)
      const missing = { ...mapping.identity }; delete missing[key]
      assert.equal(getMapping(missing), null, key)
    }
    assert.equal(getMapping({ ...mapping.identity, extra: true }), null)
    assert.equal(getMapping({ ...mapping.identity, instrumentLocale: mapping.identity.instrumentLocale === 'en' ? 'ru' : 'en' }), null)
  }
  assert.equal(getMapping(), null)
  assert.equal(getMapping(null), null)
  assert.equal(getMapping({ dimensionKey: 'weekly.recovery' }), null)
  assert.equal(support({ ...MAPPINGS[0].identity, contentHash: `sha256:${'0'.repeat(64)}` }).status, 'unsupported')
})

test('all other registered scales, clinical instruments, aggregates and trait measures stay outside this extension', () => {
  const allowed = new Set(MAPPINGS.map(row => `${row.identity.definitionId}/${row.identity.dimensionKey}`))
  let unsupported = 0
  for (const definition of ASSESSMENT_DEFINITIONS) {
    const dimensions = scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))).dimensions
    for (const row of dimensions) {
      const identity = { ...provenance(definition), dimensionKey: row.key }
      if (allowed.has(`${definition.id}/${row.key}`)) assert.ok(getMapping(identity))
      else { assert.equal(getMapping(identity), null); unsupported++ }
    }
  }
  assert.ok(unsupported > 50)
})

test('rationales, scope limits and source claims are distinct bilingual review-required metadata', () => {
  assert.equal(unique(CONSTRUCTS.map(row => row.rationale.en)).length, 3)
  assert.equal(unique(CONSTRUCTS.map(row => row.rationale.ru)).length, 3)
  for (const mapping of MAPPINGS) {
    for (const field of ['rationale', 'limitations', 'limitedFacet', 'sourceClaim']) {
      assert.deepEqual(Object.keys(mapping[field]).sort(), LOCALES)
      assert.ok(LOCALES.every(locale => nonempty(mapping[field][locale])))
      assert.match(mapping[field].ru, /[А-Яа-яЁё]/)
    }
    assert.equal(mapping.status, 'draft')
    assert.equal(mapping.reviewStatus, 'pending-exact-mapping-review')
    assert.equal(mapping.reviewRequired.exactScaleToFamily, true)
    assert.equal(mapping.reviewRequired.allObjectiveBindings, true)
    assert.equal(mapping.reviewRequired.contentSafety, true)
    assert.equal(mapping.reviewRequired.enLanguage, true)
    assert.equal(mapping.reviewRequired.ruLanguage, true)
    assert.equal(mapping.reviewRequired.professionalInstrument, false)
    assert.equal(mapping.completeConstructCoverage, false)
    assert.equal(mapping.clinicalValidation, false)
    assert.equal(mapping.originalSourceExerciseRecommendation, false)
    assert.equal(mapping.familyReuse, undefined)
    assert.match(mapping.sourceClaim.en, /does not recommend or validate/)
    assert.match(mapping.sourceClaim.ru, /не рекомендует и не подтверждает/)
    assert.deepEqual(support(mapping.identity).limitations, mapping.limitations)
    assert.equal(support(mapping.identity).status, 'draft-review-required')
  }
})

test('every mapping has all 18 objective days in both content languages and both genuine variants', () => {
  assert.equal(BUNDLE.scope.contentLocaleIndependentOfInstrumentLocale, true)
  for (const mapping of MAPPINGS) {
    assert.equal(mapping.practices.length, 72)
    for (const locale of LOCALES) for (const variant of ['standard', 'short']) {
      const references = mapping.practices.filter(row => row.contentLocale === locale && row.variant === variant)
      assert.equal(references.length, 18)
      assert.deepEqual(references.map(row => Number(row.objectiveId.split('/').at(-1))), DAYS)
      for (const reference of references) {
        assert.deepEqual(Object.keys(reference).sort(), REFERENCE.slice().sort())
        const prepared = getContent(reference)
        assert.ok(prepared)
        assert.equal(prepared.dimensionKey, mapping.identity.dimensionKey)
        assert.equal(prepared.topicId, mapping.topicId)
        for (const [key, value] of Object.entries(reference)) assert.deepEqual(prepared[key], value)
      }
    }
  }
})

test('practice identity namespace is unique and shares the atomic existing content edition without overwriting pilot cards', () => {
  assert.equal(CONTENT_VERSION, PERSONAL_COURSE_PILOT_VERSION)
  assert.notEqual(VERSION, CONTENT_VERSION)
  const existingIds = new Set(PERSONAL_COURSE_PILOT_CONTENT.map(row => row.practiceId))
  assert.equal(unique(CONTENT.map(row => row.practiceId)).length, CONTENT.length)
  for (const row of CONTENT) {
    assert.match(row.practiceId, /^hh-personal-support-families\//)
    assert.equal(existingIds.has(row.practiceId), false)
    assert.equal(row.contentVersion, CONTENT_VERSION)
    assert.equal(row.familyEditionVersion, VERSION)
  }
})

test('exact common curriculum objective, skill, week and title are preserved for every card', () => {
  assert.equal(CURRICULUM_VERSION, CURRICULUM_21.version)
  for (const row of CONTENT) {
    const route = CURRICULUM_21.route.find(entry => entry.day === row.day)
    assert.equal(route.review, false)
    assert.equal(row.week, route.week)
    assert.equal(row.objectiveId, `${CURRICULUM_21.version}/day/${row.day}`)
    assert.equal(row.curriculumVersion, CURRICULUM_21.version)
    assert.equal(row.sharedObjective, route.objective[row.contentLocale])
    assert.equal(row.sharedSkill, route.skill[row.contentLocale])
    assert.ok(row.title.startsWith(route.skill[row.contentLocale]))
  }
})

test('all cards are complete standalone original educational drafts with bounded total duration', () => {
  for (const row of CONTENT) {
    for (const key of ['practiceId', 'skillId', 'objectiveId', 'title', 'sharedObjective', 'entry', 'safety', 'action', 'stoppingPoint', 'finish', 'source', 'practiceMethod']) assert.ok(nonempty(row[key]), `${row.practiceId}/${key}`)
    assert.ok(row.steps.every(nonempty))
    assert.ok(row.steps.includes(row.action))
    assert.equal(row.kind, 'practice')
    assert.equal(row.reviewStatus, 'draft')
    assert.equal(row.contentStatus, 'ORIGINAL_DRAFT_REVIEW_REQUIRED')
    assert.equal(row.minimumEntry, true)
    assert.equal(row.requiresPreviousCompletion, false)
    assert.equal(row.previousLessonRequired, false)
    assert.equal(row.intensity, 'gentle')
    assert.equal(row.durationMinutes, row.variant === 'standard' ? 5 : 2)
    assert.equal(row.durationIsEstimate, true)
    assert.equal(row.completionTimerRequired, false)
    assert.deepEqual(row.durationIncludes, ['entry', 'explanation', 'action', 'optional-reflection', 'finish'])
    assert.equal(row.sourceType, 'original-educational-content')
    assert.equal(row.executionScope, 'private-individual-practice')
    for (const key of ['clinicalValidation', 'efficacyClaim', 'automaticTreatment', 'contactRequired', 'productionEligible', 'productionIntegrated']) assert.equal(row[key], false)
    assert.ok(Object.values(row.accessibility).every(value => value === true))
    assert.match(row.safety, row.contentLocale === 'en' ? /Skip, stop or rest/i : /пропустить.*(?:прекратить|остановиться)/)
    assert.doesNotMatch(row.action, /as you (?:did|learned) yesterday|must complete (?:the previous|day)|как вы (?:сделали|изучили) вчера|сначала завершите предыдущ/i)
  }
})

test('every short action is separately authored, at least 20 percent shorter, and keeps the same objective', () => {
  for (const standard of CONTENT.filter(row => row.variant === 'standard')) {
    const short = card(standard.skillId, standard.day, standard.contentLocale, 'short')
    assert.ok(short.action.length <= standard.action.length * 0.8, standard.practiceId)
    assert.notEqual(short.action, standard.action)
    assert.equal(short.sharedObjective, standard.sharedObjective)
    assert.equal(short.steps.length, 1)
    assert.equal(standard.steps.length, 2)
    assert.equal(short.optionalReflection, null)
    assert.equal(short.optionalTransfer, null)
    assert.ok(nonempty(standard.optionalReflection))
    assert.ok(nonempty(standard.optionalTransfer))
    assert.ok(body(short).length < body(standard).length * 0.75)
    assert.notEqual(short.entry, standard.entry)
    assert.notEqual(short.finish, standard.finish)
    assert.notEqual(short.stoppingPoint, standard.stoppingPoint)
    // Reading-load guard complements duration estimates, not a reading-speed claim.
    assert.ok(body(short).split(/\s+/).length < 170, short.practiceId)
  }
})

test('all 54 objective actions in each locale and variant are different rather than relabelled generic scripts', () => {
  for (const locale of LOCALES) for (const variant of ['standard', 'short']) {
    const rows = CONTENT.filter(row => row.contentLocale === locale && row.variant === variant)
    assert.equal(rows.length, 54)
    assert.equal(unique(rows.map(row => row.action)).length, 54)
  }
  for (const row of CONTENT.filter(row => row.contentLocale === 'ru')) assert.match(row.action, /[А-Яа-яЁё]/)
})

test('day four uses external attention without requiring relaxation in all family variants', () => {
  for (const skill of SKILLS) for (const locale of LOCALES) for (const variant of ['standard', 'short']) {
    const row = card(skill, 4, locale, variant)
    assert.match(row.action, locale === 'en' ? /eyes open/i : /открытыми глазами/i)
    assert.match(row.action, locale === 'en' ? /detail|edge|colour|shape/ : /детал|край|цвет|форм/)
    assert.match(row.action, locale === 'en' ? /no |not |need not|needn't/ : /не |не требуется/)
  }
})

test('day nine names both a chosen quality and external support instead of substituting a construct', () => {
  for (const skill of SKILLS) for (const variant of ['standard', 'short']) {
    assert.match(card(skill, 9, 'en', variant).action, /quality/i)
    assert.match(card(skill, 9, 'en', variant).action, /support|place|resource/i)
    assert.match(card(skill, 9, 'ru', variant).action, /качеств/i)
    assert.match(card(skill, 9, 'ru', variant).action, /опор|мест|ресурс/i)
  }
})

test('day eleven and twenty provide first-entry return paths without catch-up obligations', () => {
  for (const skill of SKILLS) for (const locale of LOCALES) for (const variant of ['standard', 'short']) {
    const returning = card(skill, 11, locale, variant), revising = card(skill, 20, locale, variant)
    assert.match(returning.action, locale === 'en' ? /invented|imagine/i : /вымышлен|представьте/i)
    assert.match(returning.action, locale === 'en' ? /interrupt|distract/i : /прерв|прерыван|отвле/i)
    assert.match(revising.action, locale === 'en' ? /mild invented mismatch/i : /лёгкий вымышленный пример/i)
    assert.match(revising.action, locale === 'en' ? /stop/i : /останов/i)
    assert.match(revising.action, locale === 'en' ? /rest/i : /отдых/i)
    assert.match(`${revising.action} ${revising.stoppingPoint}`, locale === 'en' ? /catch.?up|catching up/i : /наверстыва/i)
  }
})

test('recovery protects normal rest opportunities and does not prescribe sleep treatment or forced recovery', () => {
  for (const row of CONTENT.filter(row => row.skillId === 'rest-and-rhythm')) {
    assert.match(row.safety, row.contentLocale === 'en' ? /usual sleep opportunities/ : /привычные возможности для сна/)
    assert.match(row.safety, row.contentLocale === 'en' ? /does not set bedtimes or treat sleep problems/ : /не задаёт время сна и не лечит/)
    assert.doesNotMatch(row.action, /restrict (?:your )?sleep|stay awake|fixed bedtime|force (?:yourself|relaxation)|ограничьте сон|не спите|строгое время сна|заставьте себя расслаб/i)
  }
  assert.match(CONSTRUCTS[0].limitations.en, /may be constrained/)
  assert.match(CONSTRUCTS[0].limitations.ru, /могут ограничивать отдых/)
})

test('support cards preserve privacy and actual access limits without requiring contact or spending', () => {
  for (const row of CONTENT.filter(row => row.skillId === 'support-access')) {
    assert.match(row.safety, row.contentLocale === 'en' ? /Contact, disclosure, spending.*not required/ : /Контакт, раскрытие личного, расходы.*не требуются/)
    assert.match(row.safety, row.contentLocale === 'en' ? /unsafe person/ : /небезопасному человеку/)
    assert.equal(row.contactRequired, false)
  }
  for (const variant of ['standard', 'short']) {
    assert.match(card('support-access', 1, 'en', variant).action, /person, place or resource/)
    assert.match(card('support-access', 1, 'en', variant).action, /unavailable|not available/)
    assert.match(card('support-access', 20, 'en', variant).action, /no.*available|nobody suitable is available/i)
  }
  assert.equal(CONSTRUCTS[1].reviewRequired.sensitiveRelationshipContext, true)
})

test('meaning cards allow chosen qualities, uncertainty and rest without prescribing belief or positivity', () => {
  for (const row of CONTENT.filter(row => row.skillId === 'values-and-direction')) {
    assert.match(row.safety, row.contentLocale === 'en' ? /No belief, religion, gratitude or positive interpretation is prescribed/ : /Убеждения, религия, благодарность и положительное объяснение не предписываются/)
    assert.doesNotMatch(row.action, /must find (?:your )?purpose|must feel grateful|find the positive in|обязаны найти предназначение|должны быть благодарны|найдите хорошее в травме/i)
  }
  assert.match(CONSTRUCTS[2].limitations.en, /Uncertainty, disagreement, changing a choice and rest are allowed/)
  for (const variant of ['standard', 'short']) assert.match(card('values-and-direction', 20, 'en', variant).action, /undecided|uncertain/)
})

test('no fabricated alternatives or duplicate review system exist; all review material is delegated to the integrator', () => {
  assert.equal(CONTENT.filter(row => row.kind === 'whole-goal-review').length, 0)
  assert.equal(CONTENT.filter(row => [7, 14, 21].includes(row.day)).length, 0)
  assert.equal(CONTENT.filter(row => row.variant === 'alternative').length, 0)
  assert.equal(BUNDLE.reviewMapping, null)
  assert.equal(BUNDLE.scope.duplicateReviewSystem, false)
  assert.equal(BUNDLE.scope.reviewMaterialSource, 'existing-pilot-whole-goal-reviews-via-integrator')
  assert.equal(BUNDLE.scope.reviewMaterialApprovedForFamilies, false)
  assert.ok(PERSONAL_COURSE_PILOT_DRAFT_BUNDLE.reviewMapping.coversAllSelectedGoals)
  for (const row of CONTENT) {
    assert.equal(row.alternativeAvailability.status, 'unavailable')
    assert.equal(row.alternativeDifference, null)
    assert.deepEqual(availability({ skillId: row.skillId, day: row.day, contentLocale: row.contentLocale, variant: 'alternative' }), { status: 'unavailable', reason: 'exact-variant-not-authored', practice: null })
  }
})

test('content lookup requires exact ID, content edition and language; no fallback to family edition or another day', () => {
  const ref = MAPPINGS[0].practices[0]
  assert.ok(getContent(ref))
  assert.equal(getContent(), null)
  for (const key of ['practiceId', 'contentVersion', 'contentLocale']) {
    const missing = { ...ref }; delete missing[key]
    assert.equal(getContent(missing), null)
    assert.equal(getContent({ ...ref, [key]: '' }), null)
    assert.equal(getContent({ ...ref, [key]: `${ref[key]}-unknown` }), null)
  }
  assert.equal(getContent({ ...ref, contentVersion: VERSION }), null)
  assert.equal(getContent({ ...ref, contentLocale: 'ru' }), null)
  assert.equal(availability().status, 'unavailable')
  for (const day of [0, 7, 14, 21, 22]) assert.equal(availability({ skillId: SKILLS[0], day, contentLocale: 'en', variant: 'standard' }).practice, null)
  assert.equal(availability({ skillId: 'unknown', day: 1, contentLocale: 'en', variant: 'short' }).practice, null)
  assert.equal(availability({ skillId: SKILLS[0], day: '1', contentLocale: 'en', variant: 'standard' }).reason, 'invalid-content-selector')
  assert.equal(availability({ skillId: SKILLS[0], day: 1, contentLocale: 'en', variant: 'standard' }).status, 'draft-review-required')
})

test('draft mappings and content cannot enter the reviewed-only planner or runtime', () => {
  const mappings = MAPPINGS.filter(row => row.identity.instrumentLocale === 'en')
  const scales = mappings.map(fixtureScale)
  const catalog = personalCourseScaleCatalog({ scales, mappings })
  assert.ok(catalog.every(row => row.status === 'unsupported' && row.reason === 'mapping-unverified'))
  const plan = createPersonalCoursePlan({ scales, selectedScaleIds: scales.map(row => row.scaleId), mappings, reviewMapping: null, consent: true })
  assert.ok(plan.slots.every(row => row.status === 'unsupported' && row.practice === null))
  const adapter = createPersonalCourseRuntimeAdapter({ ...clone(BUNDLE), id: 'synthetic-draft-registry', getContent })
  assert.throws(() => adapter.create(), /REVIEWED_REGISTRY_REQUIRED/)
})

test('changing only mapping status does not admit draft references or missing review content', () => {
  const mappings = clone(MAPPINGS.filter(row => row.identity.instrumentLocale === 'en'))
  mappings.forEach(mapping => { mapping.status = 'reviewed' }) // Boundary fixture only, not approval.
  const scales = mappings.map(fixtureScale)
  const plan = createPersonalCoursePlan({ scales, selectedScaleIds: scales.map(row => row.scaleId), mappings, reviewMapping: null, consent: true })
  assert.ok(plan.slots.every(row => row.status === 'unsupported'))
  assert.ok(plan.slots.filter(row => row.kind === 'practice').every(row => row.reason === 'reviewed-objective-practice-unavailable'))
  assert.ok(plan.slots.filter(row => row.kind === 'review').every(row => row.reason === 'review-material-unavailable'))
})

test('audit helper exposes all 54 rows, complete bilingual bodies, exact bindings and absent alternatives', () => {
  const rows = auditRows()
  assert.equal(rows.length, 54)
  assert.equal(unique(rows.map(row => `${row.skillId}/${row.day}`)).length, 54)
  for (const row of rows) {
    assert.equal(row.bindings.length, 2)
    assert.ok(row.bindings.every(binding => binding.identity.dimensionKey === row.dimensionKey))
    for (const locale of LOCALES) {
      assert.ok(nonempty(row.locales[locale].title))
      for (const variant of ['standard', 'short']) {
        const audited = row.locales[locale].variants[variant]
        const { status, ...prepared } = audited
        assert.equal(status, 'draft-review-required')
        assert.deepEqual(prepared, getContent(prepared))
        assert.equal(audited.sharedObjective, row.locales[locale].sharedObjective)
      }
      assert.deepEqual(row.locales[locale].variants.alternative, { status: 'unavailable', reason: 'exact-variant-not-authored' })
    }
  }
})

test('frozen source and cloned helpers preserve draft status and stable reproducible content/mapping audit hashes', () => {
  assert.ok(Object.isFrozen(BUNDLE))
  assert.ok(Object.isFrozen(CONTENT[0].steps))
  assert.ok(Object.isFrozen(MAPPINGS[0].sourceMetadata))
  assert.throws(() => { MAPPINGS[0].status = 'reviewed' }, TypeError)
  const contentHash = sha256(CONTENT), mappingHash = sha256(MAPPINGS), auditHash = sha256(auditRows())
  const prepared = getContent(CONTENT[0]); prepared.action = 'changed'
  const mapping = getMapping(MAPPINGS[0].identity); mapping.status = 'reviewed'
  const rows = auditRows(); rows[0].locales.en.variants.short.action = 'changed'; rows[0].bindings[0].sourceMetadata.title = 'changed'
  assert.equal(sha256(CONTENT), contentHash)
  assert.equal(sha256(MAPPINGS), mappingHash)
  assert.equal(sha256(auditRows()), auditHash)
  assert.match(contentHash, /^[a-f0-9]{64}$/)
  assert.notEqual(contentHash, mappingHash)
  assert.equal(getMapping(MAPPINGS[0].identity).status, 'draft')
  assert.notEqual(getContent(CONTENT[0]).action, 'changed')
})

test('source uses literal pins and no runtime, database, AI, live-definition, clinical approval or private-link dependency', async () => {
  const source = await readFile(new URL('../data/inner-growth/course-personal-support-families-v2.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /from ['"].*(?:definitions|scoring|runtime|supabase|openai|curriculum|course-personal-practices)/i)
  assert.doesNotMatch(source, /provenance\(|scoreAssessment\(/)
  assert.doesNotMatch(source, /reviewStatus:\s*['"]reviewed|contentStatus:\s*['"]REVIEWED/)
  assert.doesNotMatch(source, /https?:\/\/[^\s'"]*(?:chatgpt|notion|docs\.google)/i)
  assert.doesNotMatch(source, /guaranteed recovery|clinically validated|доказанно лечит|гарантированное исцеление/i)
  assert.equal((source.match(/"definitionId":/g) ?? []).length, 10) // 4 forms + 6 binding literals.
  assert.equal((source.match(/"expectedDimensionShape":/g) ?? []).length, 6)
  assert.equal((source.match(/"sourceMetadata":/g) ?? []).length, 6)
})
