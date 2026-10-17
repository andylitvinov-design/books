import 'server-only'
import { loadInterpretationRecord } from '../assessments/interpretation-record-integrity.js'
import { storedInterpretationForDimension } from '../assessments/interpretation-storage.js'
import { STORED_INTERPRETATION_VERSION } from '../assessments/interpretation-resolution.js'

export const RESULT_INTERPRETATION_LIMITS = Object.freeze({ reads: 32, responseBytes: 512 * 1024 })

// Enrich response DTOs only. No stored result, answer or questionnaire is changed.
// Queries select exact immutable identities already present in this authorized
// response; the entire interpretation registry is never fetched.
export async function withResultInterpretations(db, results, { approvedDigests } = {}) {
  const cache = new Map()
  let unavailable = false
  let reads = 0
  let responseBytes = 0
  async function load(result, reportLocale) {
    const identity = {
      definitionId: result.definitionId,
      contentHash: result.contentHash,
      interpretationVersion: STORED_INTERPRETATION_VERSION,
      reportLocale,
    }
    const key = JSON.stringify(identity)
    if (cache.has(key)) return cache.get(key)
    if (unavailable || reads >= RESULT_INTERPRETATION_LIMITS.reads || !identity.definitionId || !identity.contentHash) return null
    // PostgreSQL errors abort a transaction. Roll back only this optional read,
    // preserving an otherwise valid bootstrap or submitted assessment.
    reads++
    await db.query('SAVEPOINT assessment_interpretation_read')
    let payload
    try {
      payload = await loadInterpretationRecord(db, identity, { approvedDigests })
    } catch {
      await db.query('ROLLBACK TO SAVEPOINT assessment_interpretation_read')
      unavailable = true
      payload = null
    }
    await db.query('RELEASE SAVEPOINT assessment_interpretation_read')
    cache.set(key, payload)
    return payload
  }
  const output = new Array(results.length)
  // Existing history order/content is untouched; prioritize newest metadata.
  for (let index = results.length - 1; index >= 0; index--) {
    const result = results[index]
    const interpretationRecords = {}
    // Array.every skips holes; require an actual dense array before evaluating
    // renderer results or projecting payload dimensions. Imported malformed
    // history must not prevent an unrelated valid result from being read.
    const dimensions = result?.dimensions
    const denseDimensions = Array.isArray(dimensions) && dimensions.length > 0 &&
      Array.from({ length: dimensions.length }, (_, index) => Object.hasOwn(dimensions, index) &&
        dimensions[index] !== null && typeof dimensions[index] === 'object' && !Array.isArray(dimensions[index])).every(Boolean)
    if (!denseDimensions) {
      output[index] = result && typeof result === 'object' ? { ...result, interpretationRecords } : result
      continue
    }
    for (const locale of ['en', 'ru']) {
      const payload = await load(result, locale)
      if (!payload || !result.dimensions?.length ||
          !result.dimensions.every(dimension => storedInterpretationForDimension(payload, result, dimension, locale, STORED_INTERPRETATION_VERSION))) continue
      // Transfer only this score's variants. In addition to reducing payload size,
      // the projection cannot classify a changed score under a reused result DTO.
      const projected = {
        ...payload,
        transportProjection: 'exact-result-v1',
        dimensions: payload.dimensions.map((dimension, index) => ({
          ...dimension,
          allowedValues: [result.dimensions[index].value],
          variants: dimension.variants.filter(variant => variant.values.includes(result.dimensions[index].value))
            .map(variant => ({ ...variant, values: [result.dimensions[index].value] })),
        })),
      }
      const bytes = new TextEncoder().encode(JSON.stringify(projected)).byteLength
      if (responseBytes + bytes <= RESULT_INTERPRETATION_LIMITS.responseBytes) {
        interpretationRecords[locale] = projected
        responseBytes += bytes
      }
    }
    output[index] = { ...result, interpretationRecords }
  }
  return output
}

export async function withResultInterpretation(db, result, options) {
  return (await withResultInterpretations(db, [result], options))[0]
}
