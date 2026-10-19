// Source-bound, deliberately non-diagnostic summary for an existing scored report.
// A short preview never replaces the original scale interpretation or changes scoring.
const text = value => typeof value === 'string' ? value.trim() : ''

export function assessmentResultOverview(report, result, locale = 'en') {
  const language = locale === 'ru' ? 'ru-RU' : 'en-CA'
  const sections = Array.isArray(report?.sections)
    ? report.sections.filter(section => section && typeof section === 'object')
    : []
  // Published "recommendedReview" signals take precedence in the preview, not
  // because we infer severity, but so existing professional follow-up copy
  // cannot be buried below a long trait/strength list.
  const review = sections.filter(section => section.recommendedReview === true)
  const preview = rankedSectionRows(report).map(row => row.section)
    .slice(0, 3).map((section, index) => {
      const raw = [section.value, section.min, section.max]
      const validRange = raw.every(value => typeof value === 'number' && Number.isFinite(value)) &&
        section.max >= section.min && section.value >= section.min && section.value <= section.max
      return {
        key: text(section.key) || String(index),
        label: text(section.construct) || text(section.title),
        band: text(section.band),
        // Instrument points and bounds only; never a percentile or health %.
        score: validRange ? String(section.value) + ' / ' + section.min + '–' + section.max : null,
        needsReview: section.recommendedReview === true,
      }
    })
  const rawDate = result?.measurementAt || result?.completedAt || null
  const ms = typeof rawDate === 'string' ? Date.parse(rawDate) : NaN
  const measurementDate = Number.isFinite(ms) ? new Date(ms) : null
  return {
    initialIndex: initialAssessmentSection(report),
    purpose: text(report?.purpose) || text(report?.intro),
    preview,
    additionalCount: Math.max(0, sections.length - preview.length),
    reviewNote: text(review[0]?.followUp) || null,
    measurementDateIso: measurementDate?.toISOString() || null,
    measurementDateLabel: measurementDate
      ? new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' }).format(measurementDate)
      : null,
  }
}

// Display priority is not a clinical score. First preserve verified published
// review flags, then consider *each scale's own direction*. A high anxiety or
// fatigue score is not equivalent to a high resource score; a neutral trait has
// no implied ideal end. Fractions only order the screen, never claim severity.
function displayAttention(section) {
  if (!section || section.bandBasis === 'unavailable' ||
      !['difficulty', 'resource'].includes(section.presentationDirection)) return null
  const { value, min, max } = section
  if (![value, min, max].every(Number.isFinite) || max <= min ||
      value < min || value > max) return null
  const part = (value - min) / (max - min)
  return section.presentationDirection === 'difficulty' ? part : 1 - part
}

function rankedSectionRows(report) {
  const sections = Array.isArray(report?.sections) ? report.sections : []
  const rows = sections.map((section, index) => ({ section, index }))
    .filter(row => row.section && typeof row.section === 'object' && !Array.isArray(row.section))
  if (report?.verified === false || report?.reportKind === 'bach') return rows
  return rows.sort((a, b) => {
    if (a.section?.recommendedReview === true && b.section?.recommendedReview !== true) return -1
    if (b.section?.recommendedReview === true && a.section?.recommendedReview !== true) return 1
    const left = displayAttention(a.section)
    const right = displayAttention(b.section)
    if (left === null && right !== null) return 1
    if (right === null && left !== null) return -1
    if (left !== null && right !== null && left !== right) return right - left
    // When observed positions tie, give everyday functioning a useful place
    // before alphabetic or arbitrary score-code order.
    const f = Number(b.section?.domain === 'function') - Number(a.section?.domain === 'function')
    return f || a.index - b.index
  })
}

export function initialAssessmentSection(report) {
  return rankedSectionRows(report)[0]?.index ?? 0
}
