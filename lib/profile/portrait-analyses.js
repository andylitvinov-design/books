import { buildPortraitRecommendations } from './portrait-recommendations.js'

// This is an editorial ordering of verified, direction-adjusted answers within
// ONE saved questionnaire. Never rank measurements from different instruments,
// infer norms/diagnoses, or turn missing/descriptive values into weaknesses.
export function rankPortraitAnalyses(measurements = []) {
  const groups = new Map()
  for (const row of Array.isArray(measurements) ? measurements : []) {
    if (!row || row.mode !== 'directional' ||
        !Number.isFinite(row.position) || row.position < 0 || row.position > 100 ||
        typeof row.resultId !== 'string' || !row.resultId ||
        typeof row.dimensionKey !== 'string' || !row.dimensionKey) continue
    if (!groups.has(row.resultId)) groups.set(row.resultId, new Map())
    groups.get(row.resultId).set(row.dimensionKey, row)
  }

  const candidates = [...groups.entries()]
    .map(([resultId, dimensions]) => ({ resultId, rows: [...dimensions.values()] }))
    .filter(group => group.rows.length >= 2)
    .sort((a, b) => b.rows.length - a.rows.length ||
      Math.max(...b.rows.map(item => Date.parse(item.measuredAt) || 0)) -
        Math.max(...a.rows.map(item => Date.parse(item.measuredAt) || 0)) ||
      a.resultId.localeCompare(b.resultId))
  const selected = candidates[0]
  if (!selected) return { sourceResultId: null, sourceTitle: null, measuredAt: null, measuredCount: 0, strongest: [], weakest: [] }

  const ordered = selected.rows.sort((a, b) => b.position - a.position ||
    a.key.localeCompare(b.key))
  const strongCount = Math.min(4, Math.ceil(ordered.length / 2))
  const weakCount = Math.min(4, ordered.length - strongCount)
  return {
    sourceResultId: selected.resultId,
    sourceTitle: ordered[0].sourceTitle,
    measuredAt: ordered[0].measuredAt,
    measuredCount: ordered.length,
    strongest: ordered.slice(0, strongCount),
    weakest: ordered.slice(-weakCount).reverse(),
  }
}

export function buildPortraitAnalyses(results = [], locale = 'en') {
  const verified = buildPortraitRecommendations(results, locale)
  return {
    ...rankPortraitAnalyses(verified.measurements),
    rejectedCount: verified.rejectedCount,
  }
}
