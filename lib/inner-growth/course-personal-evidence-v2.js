// Pure bridge for already-authorised persisted results. No result lookup, generated
// prose or interpretation fallback. The server must verify prepared payload bytes
// before attaching reports; the existing adapter checks the resulting DTO contract.
import { getDefinitionById, provenance } from '../assessments/definitions.js'
import { scoreAssessment } from '../assessments/scoring.js'
import { usableCourseResult } from './course-21-evidence.js'
import { courseInterpretationFromResult } from './course-interpretation-adapter.js'

const fail = code => { throw new Error(code) }
const clone = value => structuredClone(value)
const shapes = new Map()
function shape(definition) {
  if (!shapes.has(definition.id)) shapes.set(definition.id, scoreAssessment(definition,
    Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))).dimensions)
  return shapes.get(definition.id)
}
function exactSelectedForm(selected) {
  const definition = getDefinitionById(selected?.definitionId)
  if (selected.definitionKey !== definition.key || Object.entries(provenance(definition)).some(([key, value]) => selected.identity?.[key] !== value)) fail('INVALID_SELECTION_IDENTITY')
  return definition
}
export function personalCourseEvidenceFromResults({ selection, ownerId, results = [], locale = 'en', now } = {}) {
  if (!ownerId || typeof ownerId !== 'string') fail('COURSE_OWNER_REQUIRED')
  if (!['en', 'ru'].includes(locale)) fail('UNSUPPORTED_LOCALE')
  if (!Number.isFinite(Date.parse(now))) fail('INVALID_TIME')
  if (selection?.confirmed !== true || !Array.isArray(selection.selected) || !selection.selected.length) fail('TEST_SELECTION_NOT_CONFIRMED')
  if (!Array.isArray(results)) fail('INVALID_RESULT_LIST')
  const definitions = selection.selected.map(exactSelectedForm)
  if (new Set(definitions.map(d => d.id)).size !== definitions.length) fail('DUPLICATE_SELECTED_FORM')
  const owned = results.filter(result => usableCourseResult(result, ownerId, now))
  if (new Set(owned.map(result => result.id)).size !== owned.length) fail('AMBIGUOUS_RESULT_ID')
  owned.sort((a, b) => Date.parse(b.measurementAt) - Date.parse(a.measurementAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const scales = [], missingDefinitionIds = [], unavailableInterpretationResultIds = []
  for (const definition of definitions) {
    const result = owned.find(row => row.definitionId === definition.id)
    if (!result) { missingDefinitionIds.push(definition.id); continue }
    const report = courseInterpretationFromResult(result, locale)
    if (!report) unavailableInterpretationResultIds.push(result.id)
    // Registered dimension order is stable even when an authorised DTO was shuffled.
    for (const expected of shape(definition)) {
      const dimension = result.dimensions.find(row => row.key === expected.key)
      const identity = { ...provenance(definition), dimensionKey: dimension.key }
      const section = report?.sections.find(row => row.key === dimension.key)
      // Source identifies the exact prepared content record, not an invented
      // original-author citation. Actual source metadata remains separately intact.
      const source = report ? `database:sha256:${report.contentHash}#${dimension.key}` : null
      scales.push({ ...clone(dimension), identity, scaleId: `${definition.id}/${dimension.key}`,
        resultId: result.id, measurementAt: result.measurementAt, resultStatus: 'completed', verificationStatus: 'verified',
        referenceStatus: 'prepared-report-reference-not-inferred-from-score',
        interpretation: report ? { status: 'available', origin: 'database', identity: clone(identity),
          uiLocale: locale, version: report.revision, contentHash: report.contentHash, source,
          sourceMetadata: clone(section.source), meaning: section.compact.meaning, value: dimension.value }
          : { status: 'unavailable', identity: clone(identity), uiLocale: locale },
      })
    }
  }
  return { status: missingDefinitionIds.length ? 'tests-remaining' : unavailableInterpretationResultIds.length ? 'interpretations-unavailable' : 'ready',
    scales, missingDefinitionIds, unavailableInterpretationResultIds,
    selectedForms: definitions.map(d => ({ definitionId: d.id, definitionKey: d.key, identity: provenance(d) })),
    uiLocale: locale, clinicalSeverityComparison: false, externalTransmission: false }
}
