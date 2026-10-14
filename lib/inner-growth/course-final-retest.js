// Pure final-day test replay / score-comparison model.
// No clinical inference: only matching versioned self-reports can be compared.
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
} = {}) {
  const startMs = validTime(startedAt), endMs = validTime(completedAt)
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
    const elapsedDays = baseline ? Math.floor((endMs - validTime(baseline.measurementAt))/86400000) : null
    const repeatSuggestedLater = Boolean(interval && elapsedDays !== null && elapsedDays < interval)
    const canRepeat = Boolean(source.startable && source.rightsStatus === 'cleared' &&
      baseline && baseline.definitionVersion === source.version && !compatible)
    return {
      key, title:source.title || key, definitionVersion:baseline?.definitionVersion || source.version || null,
      baselineResultId:baseline?.id || null,
      baselineDate:baseline?.measurementAt || null,
      afterResultId:compatible?.id || null,
      afterDate:compatible?.measurementAt || null,
      completed:Boolean(compatible), canRepeat,
      repeatSuggestedLater, suggestedRepeatDays:interval,
      versionChanged,
      comparison:compareFinalCourseTests(baseline,compatible)?.map(scale=>({
        ...scale,label:source.scaleLabels?.[scale.key]||scale.key,
      }))||null,
    }
  })
  return { ready:true, tests, completedCount:tests.filter(t=>t.completed).length,
    totalCount:tests.length, fullyRetested:tests.length>0 && tests.every(t=>t.completed) }
}
