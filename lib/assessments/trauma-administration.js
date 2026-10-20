import { isPcPtsd5Definition, pcPtsd5AdministrationPolicy, pcPtsd5DimensionShape } from './pc-ptsd5-runtime.js'
import { onlyKeys, text, fail, canonicalJSON } from './contracts.js'
export const TRAUMA_SCREENING_RELEASED = true
export const traumaAdministrationPolicy = definition => pcPtsd5AdministrationPolicy(definition) || definition?.administration
export const hasTraumaAdministration = definition => traumaAdministrationPolicy(definition)?.kind === 'trauma-front-matter-v1'
export function validateTraumaContext(definition, context = {}, { requireComplete = false } = {}) {
  if (!hasTraumaAdministration(definition)) return context
  const administration = traumaAdministrationPolicy(definition)
  const fields = [...administration.fields, ...administration.acknowledgements]
  onlyKeys(context, fields.map(field => field.id))
  const valid = {}
  for (const field of fields) {
    if (!Object.hasOwn(context, field.id)) {
      if (requireComplete && field.required) fail('REQUIRED_CONTEXT')
      continue
    }
    const value = text(context[field.id], 1000)
    if (value === '') {
      if (requireComplete && field.required) fail('REQUIRED_CONTEXT')
      valid[field.id] = value
      continue
    }
    if (field.kind === 'select' && !field.options.includes(value)) fail('INVALID_CONTEXT')
    if (field.kind === 'multiple') {
      let choices
      try { choices = JSON.parse(value) } catch { fail('INVALID_CONTEXT') }
      if (!Array.isArray(choices) || new Set(choices).size !== choices.length || choices.some(choice => !field.options.includes(choice))) fail('INVALID_CONTEXT')
      if (requireComplete && field.required && choices.length === 0) fail('REQUIRED_CONTEXT')
      valid[field.id] = JSON.stringify(field.options.filter(option => choices.includes(option)))
    } else valid[field.id] = value
  }
  return valid
}
export function traumaContextReady(definition, context) {
  if (!hasTraumaAdministration(definition)) return true
  try { validateTraumaContext(definition, context, { requireComplete: true }); return true } catch { return false }
}
// Front matter must already have been saved before any symptom answers are accepted.
// Once answers exist, the event cannot be silently changed under those answers.
export function assertTraumaSave(definition, previousAnswers, previousContext, nextContext, answerPatch) {
  if (!hasTraumaAdministration(definition)) return
  const before = validateTraumaContext(definition, previousContext)
  const after = validateTraumaContext(definition, nextContext)
  if (Object.keys(previousAnswers || {}).length && canonicalJSON(before) !== canonicalJSON(after)) fail('TRAUMA_CONTEXT_LOCKED')
  if (Object.values(answerPatch || {}).some(value => value !== null)) validateTraumaContext(definition, before, { requireComplete: true })
}

// Result validation needs only the immutable dimension contract, not fabricated
// trauma context or synthetic scoring. Context is enforced at actual scoring.
export function traumaDimensionShape(definition) {
  if (isPcPtsd5Definition(definition)) return [pcPtsd5DimensionShape(definition)]
  if (!hasTraumaAdministration(definition)) return null
  return definition.scoring.dimensions.map(spec => ({
    key: spec.key, min: spec.min, max: spec.max, unit: 'points',
    timeframe: spec.timeframe || definition.timeframe,
    direction: spec.direction || 'non-normative',
    dimensionClass: spec.dimensionClass || 'state',
    sourceConstruct: spec.sourceConstruct || spec.key,
  }))
}
