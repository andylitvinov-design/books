// These are all-time counts of individual assessments and scales, never a combined health score.
export function buildInsightsSummary(groups = []) {
  const completed = groups.filter(group => group?.latest)
  const scales = new Set()
  let attempts = 0
  let newest = -Infinity
  let latestAt = null
  for (const group of completed) {
    attempts += Array.isArray(group.history) && group.history.length ? group.history.length : 1
    for (const dimension of group.latest.dimensions || []) {
      if (dimension?.key && Number.isFinite(dimension.value)) scales.add(String(group.key) + ':' + dimension.key)
    }
    const time = Date.parse(group.latest.measurementAt || '')
    if (Number.isFinite(time) && time > newest) { newest = time; latestAt = group.latest.measurementAt }
  }
  return { tests: completed.length, attempts, scales: scales.size, latestAt }
}
