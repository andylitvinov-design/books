import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ASSESSMENT_DEFINITIONS, getDefinitionById, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { CURRICULUM_21 } from '../data/inner-growth/curriculum-21.js'
import { createPersonalCoursePlan, personalCourseScaleCatalog } from '../lib/inner-growth/course-personal-plan-v2.js'
import {
  PERSONAL_COURSE_PILOT_DRAFT_BUNDLE as PILOT,
  getPersonalCoursePilotMapping, getPersonalCoursePilotContent,
} from '../data/inner-growth/course-personal-practices-v2.js'
import {
  PERSONAL_COURSE_MAPPING_EXTENSIONS_VERSION,
  PERSONAL_COURSE_MAPPING_EXTENSIONS_STATUS,
  PERSONAL_COURSE_MAPPING_EXTENSION_FAMILIES as FAMILIES,
  PERSONAL_COURSE_MAPPING_EXTENSION_CONSTRUCTS as CONSTRUCTS,
  PERSONAL_COURSE_MAPPING_EXTENSIONS as MAPPINGS,
  PERSONAL_COURSE_MAPPING_EXTENSIONS_DRAFT_BUNDLE as BUNDLE,
  getPersonalCourseMappingExtension, personalCourseMappingExtensionSupport,
} from '../data/inner-growth/course-personal-mapping-extensions-v2.js'

const days = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20]
const locales = ['en', 'ru']
const allowed = ['weekly.load', 'weekly.energy', 'weekly.connection', 'weekly.functioning', 'resource.agency']
const identities = ['definitionId', 'definitionKey', 'definitionVersion', 'instrumentLocale', 'translationVersion', 'contentHash', 'scoringKey', 'scoringVersion', 'resultVersion', 'timeframe', 'dimensionKey']
const shapeKeys = ['min', 'max', 'unit', 'timeframe', 'direction', 'dimensionClass', 'sourceConstruct']
const clone = value => structuredClone(value)
const unique = values => [...new Set(values)]
const nonempty = value => typeof value === 'string' && value.trim().length > 0
function shape(definition, dimensionKey) {
  const answers = Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))
  return scoreAssessment(definition, answers).dimensions.find(d => d.key === dimensionKey)
}
function fixtureScale(mapping) {
  const definition = getDefinitionById(mapping.identity.definitionId)
  const dimension = shape(definition, mapping.identity.dimensionKey)
  return {
    ...dimension, identity: clone(mapping.identity), scaleId: `${definition.id}/${dimension.key}`,
    resultId: `synthetic-draft-boundary:${definition.id}`, measurementAt: '2026-10-12T12:00:00.000Z',
    resultStatus: 'completed', verificationStatus: 'verified', referenceStatus: 'synthetic-nonclinical-boundary-test',
    interpretation: { identity: clone(mapping.identity), status: 'available', value: dimension.value,
      version: 'synthetic-explanation-v1', source: 'synthetic-test-only', contentHash: 'a'.repeat(64),
      meaning: 'Synthetic explanation for verifying draft refusal only.', sourceMetadata: clone(mapping.sourceMetadata) },
  }
}

test('two-test extension is exactly five constructs and ten bindings, alongside the untouched six-construct pilot', () => {
  assert.equal(CONSTRUCTS.length, 5)
  assert.equal(MAPPINGS.length, 10)
  assert.equal(BUNDLE.scope.constructCount, 5)
  assert.equal(BUNDLE.scope.exactScaleBindingCount, 10)
  assert.equal(BUNDLE.scope.instrumentFormCount, 4)
  assert.deepEqual(unique(MAPPINGS.map(m => m.identity.dimensionKey)), allowed)
  assert.deepEqual(unique(MAPPINGS.map(m => m.identity.definitionKey)), ['hh-weekly-pulse', 'hh-resource-pulse'])
  assert.equal(unique(MAPPINGS.map(m => `${m.identity.definitionId}/${m.identity.dimensionKey}`)).length, 10)
  assert.equal(unique(MAPPINGS.map(m => m.identity.definitionId)).length, 4)
  assert.equal(BUNDLE.status, 'draft')
  assert.equal(BUNDLE.contentStatus, PERSONAL_COURSE_MAPPING_EXTENSIONS_STATUS)
  assert.equal(BUNDLE.productionEligible, false)
  assert.equal(BUNDLE.productionIntegrated, false)
  assert.equal(BUNDLE.clinicalValidation, false)
  assert.equal(BUNDLE.scope.completeAssessmentBatteryCovered, false)
  assert.equal(BUNDLE.scope.originalPilotReplaced, false)
  assert.equal(BUNDLE.scope.practiceContentCopiedOrRelabelled, false)
  assert.equal(BUNDLE.scope.reviewMaterialApprovedForExtensions, false)
  assert.equal(BUNDLE.reviewMapping, null)
  assert.equal(PILOT.scope.constructCount, 6)
  assert.equal(PILOT.mappings.length, 12)
  assert.ok(PILOT.mappings.every(m => !allowed.includes(m.identity.dimensionKey)))
})

test('all ten literal identities and locale-specific dimension shapes match current registered definitions', () => {
  for (const mapping of MAPPINGS) {
    assert.deepEqual(Object.keys(mapping.identity).sort(), identities.slice().sort())
    const definition = getDefinitionById(mapping.identity.definitionId)
    assert.deepEqual(mapping.identity, { ...provenance(definition), dimensionKey: mapping.identity.dimensionKey })
    const dimension = shape(definition, mapping.identity.dimensionKey)
    assert.ok(dimension)
    assert.deepEqual(mapping.expectedDimensionShape, Object.fromEntries(shapeKeys.map(key => [key, dimension[key]])))
    assert.equal(mapping.expectedDimensionShape.timeframe, mapping.identity.timeframe)
    assert.match(mapping.identity.contentHash, /^sha256:[a-f0-9]{64}$/)
    assert.deepEqual(getPersonalCourseMappingExtension(mapping.identity), mapping)
    assert.equal(personalCourseMappingExtensionSupport(mapping.identity).status, 'draft-review-required')
  }
  // The source construct is localized in the registered Resource Pulse. Do not
  // copy the English scorer shape onto the Russian binding.
  const agency = MAPPINGS.filter(m => m.identity.dimensionKey === 'resource.agency')
  assert.equal(agency.find(m => m.identity.instrumentLocale === 'en').expectedDimensionShape.sourceConstruct, 'Agency')
  assert.equal(agency.find(m => m.identity.instrumentLocale === 'ru').expectedDimensionShape.sourceConstruct, 'Влияние')
})

test('every identity mutation, missing field, invented locale and version refuses rebinding', () => {
  for (const mapping of MAPPINGS) {
    const original = mapping.identity
    for (const key of identities) {
      assert.equal(getPersonalCourseMappingExtension({ ...original, [key]: `${original[key]}-changed` }), null, key)
      const missing = { ...original }; delete missing[key]
      assert.equal(getPersonalCourseMappingExtension(missing), null, key)
    }
    assert.equal(getPersonalCourseMappingExtension({ ...original, instrumentLocale: original.instrumentLocale === 'en' ? 'ru' : 'en' }), null)
    assert.equal(getPersonalCourseMappingExtension({ ...original, unexpectedIdentity: 'not-pinned' }), null)
  }
  assert.equal(getPersonalCourseMappingExtension(null), null)
  assert.equal(getPersonalCourseMappingExtension({ dimensionKey: 'weekly.energy' }), null)
  assert.equal(personalCourseMappingExtensionSupport({ ...MAPPINGS[0].identity, contentHash: `sha256:${'0'.repeat(64)}` }).status, 'unsupported')
})

test('only the five explicitly selected constructs bind; all clinical, trait, mixed and deferred rows stay outside', () => {
  const bound = new Set(MAPPINGS.map(m => `${m.identity.definitionId}/${m.identity.dimensionKey}`))
  const blockedKeys = new Set(['phq-9', 'mini-ipip-20', 'hh-money-pressure', 'hh-overthinking-loop', 'hh-screen-saturation', 'cbi-personal', 'cbi-work', 'cbi-client', 'rses-10', 'scs-sf'])
  const seen = new Set()
  for (const definition of ASSESSMENT_DEFINITIONS) {
    const dimensions = scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))).dimensions
    for (const dimension of dimensions) {
      const identity = { ...provenance(definition), dimensionKey: dimension.key }
      const mapping = getPersonalCourseMappingExtension(identity)
      if (!bound.has(`${definition.id}/${dimension.key}`)) assert.equal(mapping, null)
      if (blockedKeys.has(definition.key)) { assert.equal(mapping, null); seen.add(definition.key) }
      if (mapping) {
        assert.notEqual(dimension.dimensionClass, 'trait')
        assert.match(dimension.direction, /^(higher|lower)-reported-/)
        assert.equal(mapping.identity.definitionKey.startsWith('hh-'), true)
      }
    }
  }
  assert.deepEqual([...seen].sort(), [...blockedKeys].sort())
  assert.deepEqual(BUNDLE.scope.deferredWithinTwoTestPath, ['weekly.recovery', 'resource.support', 'resource.meaning'])
})

test('each mapping preserves original source metadata, an exact source locator, and bilingual construct-specific limits', () => {
  assert.equal(unique(CONSTRUCTS.map(c => c.rationale.en)).length, 5)
  assert.equal(unique(CONSTRUCTS.map(c => c.rationale.ru)).length, 5)
  for (const mapping of MAPPINGS) {
    const definition = getDefinitionById(mapping.identity.definitionId)
    assert.deepEqual(mapping.sourceMetadata, definition.source)
    assert.equal(mapping.source, `registered-definition:${definition.id}@${definition.contentHash}#${mapping.identity.dimensionKey}`)
    assert.deepEqual(mapping.sourceEvidence.registeredItemIds, [mapping.identity.dimensionKey])
    assert.ok(mapping.sourceEvidence.registeredItemIds.every(id => definition.questions.some(q => q.id === id)))
    assert.equal(mapping.sourceEvidence.auditProposalStatus, 'existing-family-reuse-candidate')
    assert.equal(mapping.sourceEvidence.sourceRecommendsExercise, false)
    for (const field of ['rationale', 'limitations', 'sourceClaim']) {
      assert.deepEqual(Object.keys(mapping[field]).sort(), locales)
      assert.ok(locales.every(locale => nonempty(mapping[field][locale])))
      assert.match(mapping[field].ru, /[А-Яа-яЁё]/)
    }
    assert.match(mapping.sourceClaim.en, /does not recommend or validate/)
    assert.match(mapping.sourceClaim.ru, /не рекомендует и не подтверждает/)
    assert.match(mapping.mappingAuthorship, /editorial proposal/)
    assert.equal(mapping.reviewRequired.exactScaleToFamily, true)
    assert.equal(mapping.reviewRequired.allObjectiveBindings, true)
    assert.equal(mapping.reviewRequired.contentSafety, true)
    assert.equal(mapping.reviewRequired.enLanguage, true)
    assert.equal(mapping.reviewRequired.ruLanguage, true)
    assert.equal(mapping.reviewRequired.professionalInstrument, false)
    assert.equal(mapping.reviewStatus, 'pending-exact-mapping-review')
    assert.equal(mapping.efficacyClaim, false)
    assert.equal(mapping.automaticTreatment, false)
    const support = personalCourseMappingExtensionSupport(mapping.identity)
    assert.deepEqual(support.limitations, mapping.limitations)
    assert.deepEqual(support.reviewRequired, mapping.reviewRequired)
  }
  const connection = MAPPINGS.filter(m => m.identity.dimensionKey === 'weekly.connection')
  assert.ok(connection.every(m => m.reviewRequired.sensitiveRelationshipContext === true))
  assert.ok(connection.every(m => /No contact, disclosure/.test(m.limitations.en)))
  assert.ok(connection.every(m => /отправка сообщения не нужны/.test(m.limitations.ru)))
})

test('family reuse pins source skill, authoring identity, content version, curriculum and all eighteen objectives', () => {
  assert.equal(FAMILIES.length, 3)
  assert.deepEqual(unique(FAMILIES.map(f => f.sourceSkillId)).sort(), ['one-visible-task', 'pace-one-action', 'safe-request'])
  for (const family of FAMILIES) {
    const source = getPersonalCoursePilotMapping(family.sourcePilotIdentity)
    assert.ok(source)
    assert.deepEqual(source.identity, family.sourcePilotIdentity)
    assert.equal(source.mappingVersion, family.sourceMappingVersion)
    assert.equal(source.topicId, family.topicId)
    assert.equal(family.sourceContentVersion, 'hh-personal-practices-21-v2-pilot-2026-10-12')
    assert.equal(family.sourceCurriculumVersion, CURRICULUM_21.version)
    assert.deepEqual(family.sourceObjectiveIds, days.map(day => `${CURRICULUM_21.version}/day/${day}`))
    assert.equal(family.sourceFamilyStatus, 'draft')
  }
  for (const mapping of MAPPINGS) {
    assert.equal(mapping.familyReuse.selectedScaleRemainsExact, true)
    assert.equal(mapping.familyReuse.originalCardDimensionIsAuthoringContext, true)
    assert.equal(mapping.familyReuse.completeConstructCoverage, false)
    assert.equal(mapping.familyReuse.originalSourceExerciseRecommendation, false)
    assert.ok(locales.every(locale => nonempty(mapping.familyReuse.limitedFacet[locale])))
    assert.notEqual(mapping.identity.dimensionKey, mapping.familyReuse.sourcePilotIdentity.dimensionKey)
    assert.equal(mapping.mappingVersion, `${PERSONAL_COURSE_MAPPING_EXTENSIONS_VERSION}/mapping/${mapping.identity.definitionId}/${mapping.identity.dimensionKey}`)
  }
})

test('all referenced existing cards really exist for eighteen days in both UI locales, with their original pilot context intact', () => {
  for (const mapping of MAPPINGS) {
    assert.equal(unique(mapping.practices.map(p => `${p.practiceId}/${p.contentVersion}/${p.contentLocale}`)).length, mapping.practices.length)
    for (const locale of locales) {
      for (const variant of ['standard', 'short']) {
        const references = mapping.practices.filter(p => p.contentLocale === locale && p.variant === variant)
        assert.equal(references.length, 18)
        assert.deepEqual(references.map(p => Number(p.objectiveId.split('/').at(-1))), days)
      }
    }
    for (const reference of mapping.practices) {
      const card = getPersonalCoursePilotContent(reference)
      assert.ok(card, reference.practiceId)
      for (const key of ['objectiveId', 'skillId', 'practiceId', 'contentVersion', 'contentLocale', 'variant', 'durationMinutes', 'intensity', 'minimumEntry']) assert.equal(reference[key], card[key])
      assert.equal(reference.skillId, mapping.familyReuse.sourceSkillId)
      assert.equal(reference.contentVersion, mapping.familyReuse.sourceContentVersion)
      assert.equal(card.curriculumVersion, mapping.curriculumVersion)
      assert.equal(card.topicId, mapping.topicId)
      assert.equal(card.dimensionKey, mapping.familyReuse.sourcePilotIdentity.dimensionKey)
      assert.equal(reference.reviewStatus, 'draft')
      assert.equal(reference.exactMappingReviewStatus, 'pending-exact-mapping-review')
      assert.equal(card.reviewStatus, 'draft')
      assert.equal(card.contactRequired, false)
      assert.equal(getPersonalCoursePilotContent({ ...reference, contentVersion: `${reference.contentVersion}-new` }), null)
      assert.equal(getPersonalCoursePilotContent({ ...reference, contentLocale: 'fr' }), null)
      assert.equal(getPersonalCoursePilotContent({ ...reference, practiceId: `${reference.practiceId}-new` }), null)
    }
  }
})

test('draft extension mappings are rejected by the reviewed-only catalog and planner for every binding and UI locale', () => {
  for (const mapping of MAPPINGS) {
    const scale = fixtureScale(mapping)
    const [catalog] = personalCourseScaleCatalog({ scales: [scale], mappings: MAPPINGS })
    assert.equal(catalog.status, 'unsupported')
    assert.equal(catalog.reason, 'mapping-unverified')
    for (const uiLocale of locales) {
      const plan = createPersonalCoursePlan({ scales: [scale], mappings: MAPPINGS, selectedScaleIds: [scale.scaleId], uiLocale, loadMinutes: 5, consent: true })
      assert.equal(plan.status, 'unsupported')
      assert.ok(plan.slots.every(slot => slot.status === 'unsupported' && slot.practice === null && slot.reason === 'selected-scale-unsupported'))
    }
  }
})

test('changing only a mapping status cannot promote draft practice references or nonexistent extension review approval', () => {
  for (const original of MAPPINGS) {
    const mapping = clone(original)
    mapping.status = 'reviewed' // Synthetic boundary test; no editorial approval.
    const scale = fixtureScale(mapping)
    const plan = createPersonalCoursePlan({ scales: [scale], mappings: [mapping], reviewMapping: BUNDLE.reviewMapping,
      selectedScaleIds: [scale.scaleId], uiLocale: 'en', loadMinutes: 5, consent: true })
    assert.equal(plan.status, 'unsupported')
    assert.ok(plan.slots.filter(slot => slot.kind === 'practice').every(slot => slot.practice === null && slot.reason === 'reviewed-objective-practice-unavailable'))
    assert.ok(plan.slots.filter(slot => slot.kind === 'review').every(slot => slot.reason === 'review-material-unavailable'))
  }
})

test('editorial data is frozen and lookups cannot mutate stored identities, sources or limits', () => {
  assert.equal(Object.isFrozen(BUNDLE), true)
  assert.equal(Object.isFrozen(MAPPINGS), true)
  assert.equal(Object.isFrozen(MAPPINGS[0].identity), true)
  assert.equal(Object.isFrozen(MAPPINGS[0].sourceMetadata), true)
  const copy = getPersonalCourseMappingExtension(MAPPINGS[0].identity)
  copy.limitations.ru = 'changed'
  copy.sourceMetadata.title = 'changed'
  copy.practices[0].reviewStatus = 'reviewed'
  assert.notEqual(MAPPINGS[0].limitations.ru, 'changed')
  assert.notEqual(MAPPINGS[0].sourceMetadata.title, 'changed')
  assert.equal(MAPPINGS[0].practices[0].reviewStatus, 'draft')
})

test('extension module has no runtime definition/hash/guide inference or clinical data reads', async () => {
  const content = await readFile(new URL('../data/inner-growth/course-personal-mapping-extensions-v2.js', import.meta.url), 'utf8')
  assert.doesNotMatch(content, /^import[^\n]*(?:definitions|scoring|scale-guides|course-personal-plan|course-personal-runtime|supabase)/m)
  assert.doesNotMatch(content, /\b(?:getDefinitionById|getAssessmentDefinition|scoreAssessment|provenance|createHash|fetch)\s*\(/)
  assert.doesNotMatch(content, /productionEligible:\s*true|status:\s*'reviewed'|reviewStatus:\s*'reviewed'/)
  assert.equal((content.match(/"definitionId":/g) ?? []).length, 13) // 10 extension + 3 source-family identity pins.
})
