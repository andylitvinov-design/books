// Pure final-day test replay / score-comparison model.
// No clinical inference: only matching versioned self-reports can be compared.
// Provenance roles explain what a questionnaire contributes to a short
// educational course. They are NOT clinical risk or licence clearances.
const symptomScreeners=new Set(['phq-2','phq-4','phq-8','phq-9','gad-2','gad-7','asrs-6','k6','k10'])
const stableProfile=key=>/^ipip-|^mini-ipip|^big-five-/.test(key)
export function courseRetestRole(key,primaryTestKey=null){
  if(stableProfile(key))return 'stable_profile'
  if(key===primaryTestKey && !symptomScreeners.has(key))return 'primary_outcome'
  if(symptomScreeners.has(key))return 'symptom_screening'
  return 'supplementary'
}
const validTime = value => {
  const ms = Date.parse(value || '')
  return Number.isFinite(ms) ? ms : null
}
const ownScore = item => Number.isFinite(item?.value) && Number.isFinite(item?.min) &&
  Number.isFinite(item?.max) && item.max > item.min && item.value >= item.min &&
  item.value <= item.max && typeof item.key === 'string'
const compatibleScore = (a, b) => ownScore(a) && ownScore(b) &&
  a.key === b.key && a.min === b.min && a.max === b.max &&
  a.direction === b.direction
const provenanceMatches = (a, b) =>
  a?.definitionKey === b?.definitionKey &&
  a?.definitionVersion === b?.definitionVersion &&
  a?.instrumentLocale === b?.instrumentLocale &&
  (a?.scoringKey || '') === (b?.scoringKey || '') &&
  (a?.scoringVersion || '') === (b?.scoringVersion || '')

export function compareFinalCourseTests(before, after, maxScales = 4) {
  if (!before || !after || !provenanceMatches(before, after)) return null
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
  primaryTestKey = null, now = Date.now(),
} = {}) {
  const startMs = validTime(startedAt), endMs = validTime(completedAt)
  const asOfMs=validTime(now)??endMs
  if (startMs === null || endMs === null || endMs < startMs) return {ready:false, tests:[], completedCount:0, totalCount:0}
  const meta = new Map(metadata.map(item => [item.key, item]))
  const tests = [...new Set(testKeys.filter(key => typeof key === 'string'))].slice(0,12).map(key => {
    const source = meta.get(key) || {}
    const matched = results.filter(row => row?.definitionKey === key && validTime(row.measurementAt) !== null)
      .sort((a,b) => validTime(b.measurementAt)-validTime(a.measurementAt))
    // The actual cycle timestamp freezes the initial score. No later assessment
    // may silently replace the baseline when the next cycle starts.
    const baseline = matched.find(row => validTime(row.measurementAt) <= startMs) || null
    const later = matched.filter(row => validTime(row.measurementAt) >= endMs)
    const compatible = baseline && later.find(row => provenanceMatches(baseline,row)) || null
    const versionChanged = Boolean(later.length && !compatible)
    const interval = Number.isInteger(source.suggestedRepeatDays) && source.suggestedRepeatDays > 0
      ? source.suggestedRepeatDays : null
    const nextSuggestedAt=baseline&&interval
      ? new Date(validTime(baseline.measurementAt)+interval*86400000).toISOString() : null
    const repeatSuggestedLater = Boolean(nextSuggestedAt && asOfMs < validTime(nextSuggestedAt))
    const role=courseRetestRole(key,primaryTestKey)
    // Stable personality profiles are baseline context, not a mandatory
    // two-week outcome. Commercial permissions remain a separate open audit.
    const canRepeat = Boolean(role!=='stable_profile' && source.startable &&
      source.rightsStatus === 'cleared' && baseline &&
      baseline.definitionVersion === source.version && !compatible)
    return {
      key, title:source.title || key, definitionVersion:baseline?.definitionVersion || source.version || null,
      instrumentLocale:baseline?.instrumentLocale || null,
      baselineResultId:baseline?.id || null,
      baselineDate:baseline?.measurementAt || null,
      afterResultId:compatible?.id || null,
      afterDate:compatible?.measurementAt || null,
      completed:Boolean(compatible), canRepeat, role,
      repeatSuggestedLater, suggestedRepeatDays:interval, nextSuggestedAt,
      versionChanged,
      comparison:compareFinalCourseTests(baseline,compatible)?.map(scale=>({
        ...scale,label:source.scaleLabels?.[scale.key]||scale.key,
      }))||null,
    }
  })
  const relevant=tests.filter(t=>t.role!=='stable_profile')
  return { ready:true, tests, completedCount:relevant.filter(t=>t.completed).length,
    totalCount:relevant.length,
    fullyRetested:relevant.length>0 && relevant.every(t=>t.completed) }
}
