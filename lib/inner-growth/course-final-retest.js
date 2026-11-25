import {phaseScaleRole,phaseOrderScales} from './trauma-phase-outcomes.js'
import { verifiedHistoryResult } from '../assessments/verified-history.js'
import { orderAntistressScales, antistressRoleForScale, antistressOutcomeLabel,
  antistressTestWindow } from './anti-stress-measurement-contract.js'
// Pure final-day test replay / score-comparison model.
// No clinical inference: only matching versioned self-reports can be compared.
// Provenance roles explain what a questionnaire contributes to a short
// educational course. They are NOT clinical risk or licence clearances.
const symptomScreeners=new Set(['phq-2','phq-4','phq-8','phq-9','gad-2','gad-7','asrs-6','k6','k10'])
const stableProfile=key=>/^ipip-|^mini-ipip|^big-five-/.test(key)
// Strongly protect the comparison windows for these two short-course measures.
// Other instruments keep their own suggested repeat windows as guidance.
const HARD_MINIMUM_DAYS=Object.freeze({'gad-7':14,'hh-weekly-pulse':7})
export function courseRetestRole(key,primaryTestKey=null){
  if(stableProfile(key))return 'stable_profile'
  if(key===primaryTestKey && !symptomScreeners.has(key))return 'primary_outcome'
  if(symptomScreeners.has(key))return 'symptom_screening'
  return 'supplementary'
}
const validTime = value => {
  const ms = typeof value==='number' ? value : Date.parse(value || '')
  return Number.isFinite(ms) ? ms : null
}
const ownScore = item => Number.isFinite(item?.value) && Number.isFinite(item?.min) &&
  Number.isFinite(item?.max) && item.max > item.min && item.value >= item.min &&
  item.value <= item.max && typeof item.key === 'string'
const compatibleScore = (a, b) => ownScore(a) && ownScore(b) &&
  a.key === b.key && a.min === b.min && a.max === b.max &&
  a.direction === b.direction &&
  ['unit','timeframe','dimensionClass','sourceConstruct','displayKind']
    .every(field=>(a[field]??null)===(b[field]??null))
const provenanceMatches = (a,b) => [
  'definitionId','definitionKey','definitionVersion','instrumentLocale','translationVersion',
  'contentHash','timeframe','scoringKey','scoringVersion','resultVersion',
].every(key=>(a?.[key]??null)===(b?.[key]??null))

export function compareFinalCourseTests(before, after, maxScales = 8, { requireVerifiedResults = false } = {}) {
  if (!before || !after || !provenanceMatches(before, after) ||
      (requireVerifiedResults && (!verifiedHistoryResult(before) || !verifiedHistoryResult(after)))) return null
  const current = new Map((after.dimensions || []).map(item => [item.key, item]))
  const common = (before.dimensions || []).flatMap(old => {
    const now = current.get(old.key)
    if (!compatibleScore(old, now)) return []
    return [{key:old.key, from:old.value, to:now.value, delta:now.value-old.value,
      min:old.min, max:old.max, direction:old.direction}]
  })
  return common.length ? common.slice(0, maxScales) : null
}

export function buildFinalCourseRetest({
  testKeys = [], results = [], metadata = [], startedAt, completedAt,
  primaryTestKey = null, antiStress = false, phaseContext = null, now = Date.now(),
  requireVerifiedResults = false,
} = {}) {
  const startMs = validTime(startedAt), endMs = validTime(completedAt)
  const asOfMs=validTime(now)??endMs
  if (startMs === null || endMs === null || endMs < startMs) return {ready:false, tests:[], completedCount:0, totalCount:0}
  const meta = new Map(metadata.map(item => [item.key, item]))
  const tests = [...new Set(testKeys.filter(key => typeof key === 'string'))].slice(0,12).map(key => {
    const source = meta.get(key) || {}
    const matched = (Array.isArray(results) ? results : [])
      .filter(row => row?.definitionKey === key && validTime(row.measurementAt) !== null &&
        (!requireVerifiedResults || validTime(row.measurementAt) <= asOfMs))
      .sort((a,b) => validTime(b.measurementAt)-validTime(a.measurementAt))
    // The actual cycle timestamp freezes the initial score. No later assessment
    // may silently replace the baseline when the next cycle starts.
    const rawBaseline = matched.find(row => validTime(row.measurementAt) <= startMs) || null
    // In real account history the newest baseline attempt must itself pass
    // the registered source/score contract: an older valid row cannot silently
    // replace a corrupted newer one.
    const baseline = rawBaseline && (!requireVerifiedResults || verifiedHistoryResult(rawBaseline))
      ? rawBaseline : null
    const hardMinimumDays=HARD_MINIMUM_DAYS[key]||null
    const hardDueAt=baseline&&hardMinimumDays
      ? new Date(validTime(baseline.measurementAt)+hardMinimumDays*86400000).toISOString():null
    const hardBlocked=Boolean(hardDueAt && asOfMs<validTime(hardDueAt))
    // Retest is a separate post-completion assessment, never another daily slide.
    // GAD-7 cannot count as a valid two-week comparison before the minimum window.
    const eligibleAfter=hardDueAt?Math.max(endMs,validTime(hardDueAt)):endMs
    const later=matched.filter(row=>validTime(row.measurementAt)>=eligibleAfter)
    // After completing a course a newer corrupted/incompatible attempt cannot
    // be hidden by promoting an earlier result to a supposedly current retest.
    const latestRetest = later[0] || null
    const compatible = baseline && (requireVerifiedResults
      ? latestRetest && verifiedHistoryResult(latestRetest) && provenanceMatches(baseline,latestRetest)
        ? latestRetest : null
      : later.find(row=>provenanceMatches(baseline,row))) || null
    const verificationRequired = Boolean(requireVerifiedResults &&
      ((rawBaseline && !baseline) || (latestRetest && !verifiedHistoryResult(latestRetest))))
    const versionChanged=Boolean(later.length&&!compatible && !verificationRequired)
    const interval=Number.isInteger(source.suggestedRepeatDays)&&source.suggestedRepeatDays>0
      ? source.suggestedRepeatDays:null
    const nextSuggestedAt=baseline&&interval
      ? new Date(validTime(baseline.measurementAt)+interval*86400000).toISOString():null
    const repeatSuggestedLater=Boolean(nextSuggestedAt&&asOfMs<validTime(nextSuggestedAt))
    const role=courseRetestRole(key,phaseContext?phaseContext.primaryTestKey:primaryTestKey)
    // Stable personality profiles are baseline context, not a mandatory
    // two-week outcome. Commercial permissions remain a separate open audit.
    const canRepeat = Boolean(role!=='stable_profile' && source.startable &&
      source.rightsStatus === 'cleared' && baseline &&
      baseline.definitionVersion === source.version && !compatible && !hardBlocked && asOfMs>=endMs)
    return {
      key, title:source.title || key, definitionVersion:baseline?.definitionVersion || source.version || null,
      instrumentLocale:baseline?.instrumentLocale || null,
      baselineResultId:baseline?.id || null,
      baselineDate:baseline?.measurementAt || null,
      afterResultId:compatible?.id || null,
      afterDate:compatible?.measurementAt || null,
      completed:Boolean(compatible), canRepeat, role,
      repeatSuggestedLater, suggestedRepeatDays:interval, nextSuggestedAt,
      hardMinimumDays, hardDueAt, hardBlocked,
      versionChanged, verificationRequired,
      // Every recorded dimension stays in its original units. For Anti-Stress
      // only, display the pre-registered weekly.load outcome before supporting
      // scales and preserve the explicit directions (no composite health score).
      ...(antiStress===true ? {
        timeframe:antistressTestWindow(key),
      }:{}),
      comparison:(()=>{
        const compared=compareFinalCourseTests(baseline,compatible,8,{requireVerifiedResults})
        if(!compared)return null
        const ordered=antiStress===true
          ? (phaseOrderScales(phaseContext,key,compared)||orderAntistressScales(key,compared)):compared
        return ordered.map(scale=>({
          ...scale,
          label:antiStress===true
            ? antistressOutcomeLabel(key,scale.key,source.locale||'en')
              ||source.scaleLabels?.[scale.key]||scale.key
            : source.scaleLabels?.[scale.key]||scale.key,
          ...(antiStress===true
            ? {measureRole:phaseScaleRole(phaseContext,key,scale.key)||antistressRoleForScale(key,scale.key)}:{}),
        }))
      })(),
    }
  })
  const relevant=tests.filter(t=>t.role!=='stable_profile')
  return { ready:true, tests, completedCount:relevant.filter(t=>t.completed).length,
    totalCount:relevant.length,
    fullyRetested:relevant.length>0 && relevant.every(t=>t.completed) }
}
