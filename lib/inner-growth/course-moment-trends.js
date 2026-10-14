// Pure, non-clinical summaries of optional momentary pre/post lesson ratings.
// Higher = greater difficulty; 0 and skipped observations must remain distinct.
export function momentScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 10 ? value : null
}

export function compareLessonMoments(before, after) {
  const first = momentScore(before), last = momentScore(after)
  if (first === null || last === null) return null
  return { before: first, after: last, change: last - first }
}

// A selected test scale may recur on non-consecutive days. Use its stable ID,
// never concatenate observations from different confirmed scales or cycles.
export function buildLessonFocusTrends(days = [], roadmap = []) {
  const ratings = new Map((Array.isArray(days) ? days : []).map(day => [day.day, day]))
  const series = new Map()
  for (const item of Array.isArray(roadmap) ? roadmap : []) {
    if (!Number.isInteger(item.day) || item.day < 1 || item.day > 14) continue
    const key = item.focusScaleId || item.focusGoal || 'personal-focus'
    if (typeof key !== 'string') continue
    if (!series.has(key)) {
      series.set(key, {
        key, label: item.scaleLabel || item.focusTitle || '',
        points: [], dayCount: 0, ratedDays: 0,
      })
    }
    const group = series.get(key)
    group.dayCount += 1
    const day = ratings.get(item.day)
    if (!day?.sessionCompleted) continue
    const before = momentScore(day.beforeNow), after = momentScore(day.afterNow)
    if (before === null && after === null) continue
    group.points.push({ day: item.day, date: day.date, before, after })
    group.ratedDays += 1
  }
  return [...series.values()]
}

export function focusTrendAria(series, words = {}) {
  const before = words.before || 'before', after = words.after || 'after', missing = words.missing || 'not rated'
  return (series?.points || []).map(item =>
    'Day ' + item.day + ': ' + before + ' ' + (item.before === null ? missing : item.before + '/10') +
    ', ' + after + ' ' + (item.after === null ? missing : item.after + '/10')
  ).join('; ')
}
