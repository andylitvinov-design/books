import { storedInterpretationForDimension } from './interpretation-storage.js'

export const STORED_INTERPRETATION_VERSION = '2026-10-17.v1'

// A transport projection is issued only after server-side row integrity validation.
// Match the full saved result again: switching locale, version, dimension or score
// must never reuse another report's interpretation.
export function storedResultInterpretation(result, dimension, locale) {
  const payload = result?.interpretationRecords?.[locale]
  const model = storedInterpretationForDimension(payload, result, dimension, locale, STORED_INTERPRETATION_VERSION)
  return model ? {
    ...model,
    registrySource: 'database',
    interpretationVersion: payload.interpretationVersion,
    interpretationSourceCommit: payload.sourceCommit,
  } : null
}
