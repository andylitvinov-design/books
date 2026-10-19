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

// These are different *constructs*, not opposite answers to the same question.
// Legacy OPORA V6 asked about availability (higher = more available), whereas
// other paired moment ratings ask about difficulty (higher = more difficult).
// Preserve stored 0–10 values and choose interpretation from the pinned cycle version.
export function momentChangeMeaning(change, direction = 'higher_is_more_difficult') {
  if (!Number.isInteger(change) || Math.abs(change) > 10) return null
  if (change === 0) return 'same'
  if (direction === 'higher_is_more_available')
    return change > 0 ? 'more_available' : 'less_available'
  if (direction === 'higher_is_more_difficult')
    return change > 0 ? 'more_difficult' : 'less_difficult'
  return null
}

export function changeAmount(change, locale = 'en') {
  if (!Number.isInteger(change)) return ''
  const value = Math.abs(change), last = value % 10, lastTwo = value % 100
  const unit = locale === 'ru'
    ? (lastTwo >= 11 && lastTwo <= 14 ? 'баллов' : last === 1 ? 'балл' : last >= 2 && last <= 4 ? 'балла' : 'баллов')
    : value === 1 ? 'point' : 'points'
  return value + ' ' + unit
}

export function focusTrendAria(series, words = {}) {
  const before = words.before || 'before', after = words.after || 'after', missing = words.missing || 'not rated'
  return (series?.points || []).map(item =>
    (words.day || 'Day') + ' ' + item.day + ': ' + before + ' ' + (item.before === null ? missing : item.before + '/10') +
    ', ' + after + ' ' + (item.after === null ? missing : item.after + '/10')
  ).join('; ')
}
