import { exactInterpretationDefinition } from './interpretation-context.js'
import { exactAsrs6DefinitionForResult } from './interpretation-registry.js'
import { exactTraumaResultDefinition, isTraumaResult } from './trauma-report.js'
import { buildBachResultReport, isBachResult } from './bach-guidance.js'
import { getDefinitionById } from './definitions.js'

// Check the original container before rendering/filtering. Sparse holes are
// missing data, not evidence of a complete score. Never repair stored values.
export const hasDenseDimensions = result => Array.isArray(result?.dimensions) && result.dimensions.length > 0 &&
  Array.from(result.dimensions).every(d => d && typeof d === 'object' && !Array.isArray(d) && typeof d.key === 'string')
export const savedDimensionRows = result => Array.isArray(result?.dimensions)
  ? Array.from(result.dimensions).filter(d => d && typeof d === 'object' && !Array.isArray(d)) : []
export function verifiedHistoryResult(result) {
  if (!hasDenseDimensions(result)) return false
  if (isBachResult(result)) return buildBachResultReport(result, 'en').verified === true
  if (isTraumaResult(result)) return Boolean(exactTraumaResultDefinition(result))
  if (result.definitionKey === 'asrs-6' || result.scoringKey === 'asrs-v1-6-classic' ||
      result.dimensions.some(d => d.key === 'symptoms.asrs6.shaded_count')) return Boolean(exactAsrs6DefinitionForResult(result))
  return Boolean(exactInterpretationDefinition(result))
}
const sorted = results => (Array.isArray(results) ? results : []).filter(r => r?.id && Number.isFinite(Date.parse(r.measurementAt)))
  .slice().sort((a,b) => Date.parse(b.measurementAt) - Date.parse(a.measurementAt) || String(b.id).localeCompare(String(a.id)))
const instrumentKey = (result, key = result.definitionKey) => `${result.accountId || ''}::${key}`
function claimedInstrumentKeys(result) {
  let known
  try { known = getDefinitionById(result.definitionId).key } catch { /* Unknown identities remain raw records. */ }
  return [...new Set([result.definitionKey, known].filter(Boolean))].map(key => instrumentKey(result, key))
}
export function verifiedHistoryView(results = []) {
  const ordered = sorted(results), latest = new Map(), familyLatest = new Map(), validity = new Map()
  for (const result of ordered) {
    validity.set(result, verifiedHistoryResult(result))
    for (const key of claimedInstrumentKeys(result)) {
      if (!latest.has(key)) latest.set(key, result)
      const family = key.slice(key.indexOf('::') + 2)
      if (!familyLatest.has(family)) familyLatest.set(family, result)
    }
  }
  // Evaluate latest from all raw attempts first. A rejected latest record must
  // not silently promote an older genuine score into the current profile.
  const latestFor = result => sorted([latest.get(instrumentKey(result)),
    result.accountId ? latest.get(`::${result.definitionKey}`) : familyLatest.get(result.definitionKey)])[0]
  const eligible = ordered.filter(r => validity.get(r) && validity.get(latestFor(r)))
  return { ordered, eligible, rejected: ordered.filter(r => !validity.get(r)),
    current: eligible.filter(r => latestFor(r) === r) }
}
const provenanceKeys = ['definitionId','definitionKey','definitionVersion','contentHash','instrumentLocale','translationVersion','scoringKey','scoringVersion','resultVersion','timeframe']
export function verifiedPreviousResult(current, results = []) {
  if (!verifiedHistoryResult(current)) return null
  return sorted(results).find(r => r.id !== current.id && (r.accountId || null) === (current.accountId || null) &&
    provenanceKeys.every(key => r[key] === current[key]) && Date.parse(r.measurementAt) <= Date.parse(current.measurementAt) && verifiedHistoryResult(r)) || null
}
const dimensionFields = ['key','value','min','max','unit','timeframe','direction','dimensionClass','sourceConstruct','displayKind','responseState']
export function verifiedSnapshotRows(snapshot, current) {
  const dimensions = Array.isArray(snapshot?.dimensions) ? Array.from(snapshot.dimensions) : []
  return dimensions.filter(row => {
    if (!row || typeof row !== 'object') return false
    const source = current.find(r => (!snapshot?.accountId || snapshot.accountId === r.accountId) && r.id === row.sourceResultId && r.definitionId === row.sourceDefinitionId &&
      r.measurementAt === row.measurementAt && r.instrumentLocale === row.instrumentLocale)
    const dimension = source?.dimensions.find(d => d.key === row.key)
    return dimension && dimensionFields.every(key => row[key] === dimension[key])
  })
}
