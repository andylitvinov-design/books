import { interpretationRecordApprovalKey } from '../../lib/assessments/interpretation-record-integrity.js'

// Historical approval is exact-form, score-source, release-version and report-locale
// specific. New registered assessments MUST NOT inherit an old digest or rewrite
// immutable C1/C2/C3 release payloads to make an older test expect more rows.
export function historicalInterpretationCoverage(definitions, approvedDigests, releaseVersion) {
  if (!Array.isArray(definitions) || !approvedDigests ||
      typeof approvedDigests !== 'object' || !releaseVersion)
    throw new Error('INVALID_HISTORICAL_INTERPRETATION_COVERAGE')
  const historical = [], newer = []
  const includedKeys = new Set()
  for (const definition of definitions) {
    const keys = ['en','ru'].map(reportLocale => interpretationRecordApprovalKey({
      definitionId: definition.id,
      contentHash: definition.contentHash,
      interpretationVersion: releaseVersion,
      reportLocale,
    }))
    const covered = keys.map(key => Object.hasOwn(approvedDigests, key))
    if (covered.some(Boolean) && !covered.every(Boolean))
      throw new Error('INCOMPLETE_APPROVED_LOCALE_PAIR')
    if (covered.every(Boolean)) {
      historical.push(definition)
      keys.forEach(key => includedKeys.add(key))
    } else {
      newer.push(definition)
    }
  }
  const actual = Object.keys(approvedDigests)
  if (includedKeys.size !== actual.length || actual.some(key => !includedKeys.has(key)))
    throw new Error('APPROVED_DIGEST_MISSING_SOURCE')
  return Object.freeze({ historical: Object.freeze(historical),
    newer: Object.freeze(newer), approvedRowCount: includedKeys.size })
}
