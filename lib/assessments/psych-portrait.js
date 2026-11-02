import { PORTRAIT_AXIS_ORDER } from './portrait-sectors.js'
import { PORTRAIT_SOURCE_RULES, portraitSourceRule, uniquePortraitRuleForDimension, portraitAxisChoices } from './portrait-constructs.js'
import { verifiedHistoryView } from './verified-history.js'
import { exactInterpretationDefinition } from './interpretation-context.js'
import { monitoringCatalogItem } from '../../data/assessments/catalog.js'

// A position within an individual questionnaire's possible answer range.
// Not a health %, normative percentile, probability, severity grade or
// comparable score across distinct questionnaires.
export function scorePortraitDimension(dimension, result = null) {
  if (!dimension || typeof dimension !== 'object' || !Number.isFinite(dimension.value) ||
      !Number.isFinite(dimension.min) || !Number.isFinite(dimension.max) ||
      dimension.max <= dimension.min || dimension.value < dimension.min ||
      dimension.value > dimension.max) return null
  const rule = result
    ? portraitSourceRule(result.definitionKey,dimension.key,result.definitionVersion)
    : uniquePortraitRuleForDimension(dimension.key)
  if (!rule || !rule.axis || rule.mode === 'excluded' || !PORTRAIT_AXIS_ORDER.includes(rule.axis)) return null
  if (result && result.scoringVersion !== rule.scoringVersion) return null
  const direction = typeof dimension.direction === 'string'
    ? dimension.direction.startsWith('higher-reported-') ? 'higher'
      : dimension.direction.startsWith('lower-reported-') ? 'lower' : null
    : null
  if (!direction && rule.mode === 'directional') return null
  // Some intimacy and self-acceptance reflections have numeric answers but
  // never represent a preferable level of intimacy, desire or consent.
  const relative = (dimension.value - dimension.min) / (dimension.max - dimension.min)
  return {
    axis:rule.axis, mode:rule.mode,
    percent:rule.mode === 'directional' ? Math.round(100 * (direction === 'lower' ? 1 - relative : relative)) : null,
    rawValue:dimension.value, min:dimension.min, max:dimension.max, unit:dimension.unit || 'points',
    dimensionKey:dimension.key, direction, rule,
  }
}
const instant = value => typeof value === 'string' && value.trim() &&
  Number.isFinite(Date.parse(value)) ? Date.parse(value) : null
const sameInstrument = (result, measured) => [
  result.accountId || '', result.definitionId, result.definitionVersion, result.contentHash,
  result.scoringKey, result.scoringVersion, result.instrumentLocale, result.translationVersion,
  result.timeframe, result.resultVersion, measured.dimensionKey, measured.unit,
  measured.min, measured.max, measured.direction,
].join('|')

export function buildPsychPortrait(results = [], {now=Date.now()} = {}) {
  const axes = Object.fromEntries(PORTRAIT_AXIS_ORDER.map(axis=>[axis,null]))
  const staleAxes = Object.fromEntries(PORTRAIT_AXIS_ORDER.map(axis=>[axis,null]))
  const byAxis = new Map(), staleByAxis = new Map(), lastCompatible = new Map()
  const clock = Number.isFinite(now) ? now : Date.now()
  // Verify the latest raw attempt before allowing an older score to pose as
  // current. Include all attempts for known instruments even when malformed.
  // Limit the expensive source-validation pass to instruments that can
  // legitimately provide a portrait dimension.
  const keys=new Set(PORTRAIT_SOURCE_RULES.map(row=>row.testKey))
  const relevant=(Array.isArray(results) ? results : []).filter(item=>keys.has(item?.definitionKey))
  const sorted = verifiedHistoryView(relevant).eligible
    .filter(result=>typeof result.id==='string' && result.id.length>0 &&
      Array.isArray(result.dimensions) && instant(result.measurementAt)!==null)
    .sort((a,b)=>instant(a.measurementAt)-instant(b.measurementAt) ||
      String(a.id).localeCompare(String(b.id)))
  for (const result of sorted) {
    const timestamp=instant(result.measurementAt)
    if (timestamp > clock + 86400000) continue
    const catalog=monitoringCatalogItem(result.definitionKey)
    if (!catalog?.startable || catalog.rightsStatus !== 'cleared') continue
    for (const dimension of result.dimensions) {
      const measured=scorePortraitDimension(dimension,result)
      if(!measured) continue
      // Full instrument identity and all scored dimensions must agree with the
      // immutable original. A same-named or tampered result cannot color a ray.
      const definition=exactInterpretationDefinition(result,dimension)
      if(!definition) continue
      const sourceKey=sameInstrument(result,measured)
      const previous=lastCompatible.get(sourceKey) || null
      const entry={
        ...measured,
        resultId:result.id, definitionKey:result.definitionKey, definitionVersion:result.definitionVersion,
        instrumentLocale:result.instrumentLocale, measuredAt:result.measurementAt,
        timeframe:result.timeframe, source:dimension.sourceConstruct || dimension.key,
        sourceTitle:definition.source?.title || definition.title, sourceStatus:definition.source?.status || '',
        previousPercent:measured.mode==='directional' ? previous?.percent ?? null : null,
        previousAt:measured.mode==='directional' ? previous?.measuredAt ?? null : null,
        previousResultId:measured.mode==='directional' ? previous?.resultId ?? null : null,
        change:measured.mode==='directional' && previous?.percent != null
          ? measured.percent - previous.percent : null,
      }
      lastCompatible.set(sourceKey,entry)
      const fresh=timestamp >= clock - measured.rule.freshnessDays*86400000
      const bucket=fresh ? byAxis : staleByAxis
      const incumbent=bucket.get(measured.axis)
      // A stable, source-reviewed representative takes precedence while fresh.
      // New results from unrelated questionnaires are never spliced into its trend.
      if (!incumbent || measured.rule.priority < incumbent.rule.priority ||
          (measured.rule.priority===incumbent.rule.priority &&
            timestamp > instant(incumbent.measuredAt))) bucket.set(measured.axis,entry)
    }
  }
  for(const axis of PORTRAIT_AXIS_ORDER){
    axes[axis]=byAxis.get(axis) || null
    staleAxes[axis]=!axes[axis] ? staleByAxis.get(axis) || null : null
  }
  const active=Object.values(axes).filter(Boolean)
  return {
    axes, staleAxes, axisCandidates:portraitAxisChoices(),
    measuredCount:active.filter(entry=>entry.mode==='directional').length,
    answeredCount:active.length,
    descriptiveCount:active.filter(entry=>entry.mode==='descriptive').length,
    historicalCount:Object.values(staleAxes).filter(Boolean).length,
    totalCount:PORTRAIT_AXIS_ORDER.length,
    latestAt:active.map(entry=>entry.measuredAt).sort().at(-1) || null,
  }
}
