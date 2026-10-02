import {validateProvenance, getDefinitionById} from '../assessments/definitions.js'
import {scoreAssessment} from '../assessments/scoring.js'
import {requireUUID, requireDate, fail, deepFreeze} from '../assessments/contracts.js'
const provenanceKeys = ['definitionId','definitionKey','definitionVersion','instrumentLocale','translationVersion','contentHash','scoringKey','scoringVersion','resultVersion','timeframe']
const dimensionKeys = ['key','min','max','unit','timeframe','direction','dimensionClass','sourceConstruct']
export function validateResult(result) {
  requireUUID(result?.id); requireUUID(result?.accountId); requireDate(result?.measurementAt)
  const def = validateProvenance(result)
  if (!Array.isArray(result.dimensions)) fail('INVALID_RESULT')
  const shape = scoreAssessment(def, Object.fromEntries(def.questions.map(q => [q.id,q.min ?? def.answerScale.min]))).dimensions
  if (result.dimensions.length !== shape.length || new Set(result.dimensions.map(d => d.key)).size !== shape.length) fail('INVALID_RESULT')
  for (const expected of shape) {
    const value = result.dimensions.find(d => d.key === expected.key)
    if (!value || dimensionKeys.some(k => value[k] !== expected[k]) || !Number.isFinite(value.value) || value.value < value.min || value.value > value.max || !Number.isInteger(value.value)) fail('INVALID_RESULT')
  }
  return result
}
export function compatibilityKey(result) {
  validateResult(result)
  return provenanceKeys.map(key => result[key]).join('|')
}
export function compareResults(current,prior) {
  validateResult(current); validateResult(prior)
  if (current.accountId !== prior.accountId) fail('OWNER_MISMATCH',403)
  if (compatibilityKey(current) !== compatibilityKey(prior)) fail('INCOMPATIBLE_RESULTS',409)
  return current.dimensions.map(dimension => {
    const before = prior.dimensions.find(d => d.key === dimension.key)
    if (!before || dimensionKeys.some(k => before[k] !== dimension[k])) fail('INCOMPATIBLE_RESULTS',409)
    return {key:dimension.key,current:dimension.value,prior:before.value,delta:dimension.value-before.value,unit:dimension.unit,currentAt:current.measurementAt,priorAt:prior.measurementAt}
  })
}
export function chronological(results) {
  return [...results].sort((a,b) => Date.parse(a.measurementAt)-Date.parse(b.measurementAt) || a.id.localeCompare(b.id))
}
export function seriesFor(results,selected) {
  const key=compatibilityKey(selected)
  return chronological(results.filter(r => r.accountId===selected.accountId && compatibilityKey(r)===key))
}
export function createProfileSnapshot({id,accountId,generatedResult,carriedResults=[],createdAt}) {
  requireUUID(id); requireUUID(accountId); requireDate(createdAt)
  for (const result of [generatedResult,...carriedResults]) {
    validateResult(result)
    if (result.accountId!==accountId) fail('OWNER_MISMATCH',403)
  }
  const byInstrument=new Map()
  for (const result of chronological(carriedResults)) byInstrument.set(result.definitionKey,result)
  byInstrument.set(generatedResult.definitionKey,generatedResult)
  const dimensions=[],seen=new Set()
  for (const result of [...byInstrument.values()].sort((a,b)=>a.definitionKey.localeCompare(b.definitionKey))) {
    const def=getDefinitionById(result.definitionId)
    for (const dimension of result.dimensions) {
      if (seen.has(dimension.key)) fail('DIMENSION_COLLISION')
      seen.add(dimension.key)
      dimensions.push({...dimension,sourceResultId:result.id,sourceDefinitionId:def.id,measurementAt:result.measurementAt,instrumentLocale:result.instrumentLocale,remeasured:result.id===generatedResult.id})
    }
  }
  return deepFreeze({id,accountId,generatingResultId:generatedResult.id,createdAt,dimensions})
}
// End of the snapshot contract. Historical source records are never mutated.
