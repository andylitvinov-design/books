// Presentation only: never manufacture clinical thresholds or a cross-test "health percentage".
const comparableResultFields = [
  'accountId', 'definitionId', 'definitionKey', 'definitionVersion', 'contentHash',
  'instrumentLocale', 'translationVersion', 'scoringKey', 'scoringVersion', 'resultVersion', 'timeframe',
]
const comparableDimensionFields = [
  'key', 'min', 'max', 'unit', 'timeframe', 'direction', 'dimensionClass', 'sourceConstruct',
]

export function gaugeModel(dimension) {
  if (!dimension || !Number.isFinite(dimension.value) || !Number.isFinite(dimension.min) ||
      !Number.isFinite(dimension.max) || dimension.max <= dimension.min ||
      dimension.value < dimension.min || dimension.value > dimension.max) return null
  const trait = dimension.dimensionClass === 'trait' || dimension.direction === 'non-normative'
  const higherResource = typeof dimension.direction === 'string' && dimension.direction.startsWith('higher-reported-')
  const lowerDifficulty = typeof dimension.direction === 'string' && dimension.direction.startsWith('lower-reported-')
  const orientation = trait ? 'neutral' : higherResource ? 'resource' : lowerDifficulty ? 'difficulty' : 'neutral'
  const rawFraction = (dimension.value - dimension.min) / (dimension.max - dimension.min)
  // For oriented scales, left/red means less favourable reported answers;
  // for neutral traits the gauge is monochrome, with no health value judgement.
  const fraction = orientation === 'difficulty' ? 1 - rawFraction : rawFraction
  return { fraction: Math.max(0, Math.min(1, fraction)), rawFraction, orientation }
}

export function gaugeChange(current, previous, dimensionKey) {
  const currentDimension = current?.dimensions?.find(item => item.key === dimensionKey)
  const former = previous?.dimensions?.find(item => item.key === dimensionKey)
  const presentation = gaugeModel(currentDimension)
  if (!presentation || !former || !previous || !current ||
      comparableResultFields.some(key => !current[key] || !previous[key] || current[key] !== previous[key]) ||
      comparableDimensionFields.some(key => currentDimension[key] !== former[key]) ||
      !Number.isFinite(former.value) || former.value < former.min || former.value > former.max ||
      !(Date.parse(previous.measurementAt) < Date.parse(current.measurementAt))) {
    return { state: 'baseline', delta: null }
  }
  const delta = Number((currentDimension.value - former.value).toFixed(4))
  if (delta === 0) return { state: 'unchanged', delta: 0 }
  if (presentation.orientation === 'neutral') return { state: 'changed', delta }
  const favorable = presentation.orientation === 'resource' ? delta > 0 : delta < 0
  return { state: favorable ? 'improved' : 'worsened', delta }
}

export function validCalendarDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T12:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function periodWindow(period = 'all', start = '', end = '', now = new Date()) {
  if (period === 'all') return { valid: true, from: -Infinity, to: Infinity }
  if (period === 'custom') {
    if (!validCalendarDay(start) || !validCalendarDay(end) || start > end)
      return { valid: false, from: 0, to: 0 }
    const from = new Date(start + 'T00:00:00').getTime()
    const to = new Date(end + 'T23:59:59.999').getTime()
    return { valid: Number.isFinite(from) && Number.isFinite(to), from, to }
  }
  const days = { week: 7, month: 30, quarter: 90 }[period]
  if (!days || !Number.isFinite(now?.getTime?.())) return { valid: false, from: 0, to: 0 }
  return { valid: true, from: now.getTime() - days * 86400000, to: now.getTime() }
}

export function resultsForPeriod(results = [], period = 'all', start = '', end = '', now = new Date()) {
  const window = periodWindow(period, start, end, now)
  if (!window.valid) return []
  return (Array.isArray(results) ? results : []).filter(result => {
    const at = Date.parse(result?.measurementAt)
    return Number.isFinite(at) && at >= window.from && at <= window.to
  })
}

// The most recent result is the current measurement. Baseline is the earliest
// *compatible* measurement within the selected time period, never a different test/version.
export function periodComparison(results = []) {
  const ordered = [...results].filter(result => Number.isFinite(Date.parse(result?.measurementAt)))
    .sort((a, b) => Date.parse(a.measurementAt) - Date.parse(b.measurementAt) || String(a.id).localeCompare(String(b.id)))
  const current = ordered.at(-1) || null
  if (!current) return { current: null, previous: null }
  const prior = ordered.find(candidate =>
    candidate.id !== current.id &&
    comparableResultFields.every(key => current[key] && candidate[key] && current[key] === candidate[key]) &&
    candidate.dimensions?.length === current.dimensions?.length &&
    current.dimensions?.every(d => candidate.dimensions.some(other =>
      comparableDimensionFields.every(field => other[field] === d[field]))) &&
    Date.parse(candidate.measurementAt) < Date.parse(current.measurementAt)
  ) || null
  return { current, previous: prior }
}
