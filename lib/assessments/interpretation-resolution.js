import { storedInterpretationForDimension } from './interpretation-storage.js'

export const STORED_INTERPRETATION_VERSION = '2026-10-17.v3'
export const STORED_INTERPRETATION_RULES_VERSION = '2026-10-17.v13'

// v1/v10 remains an immutable historical receipt, but has superseded prose.
// Missing v2 records use verified current code; never relabel v1 as v2.
// A transport projection is issued only after server-side row integrity validation.
// Match the full saved result again: switching locale, version, dimension or score
// must never reuse another report's interpretation.
export function storedResultInterpretation(result, dimension, locale) {
  const payload = result?.interpretationRecords?.[locale]
  if (payload?.rulesEngineVersion !== STORED_INTERPRETATION_RULES_VERSION) return null
  const model = storedInterpretationForDimension(payload, result, dimension, locale, STORED_INTERPRETATION_VERSION)
  return model ? {
    ...model,
    registrySource: 'database',
    interpretationVersion: payload.interpretationVersion,
    interpretationSourceCommit: payload.sourceCommit,
  } : null
}
