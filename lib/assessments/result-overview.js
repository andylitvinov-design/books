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
  const preview = [...review, ...sections.filter(section => section.recommendedReview !== true)]
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

// A display starting point only: do not invert symptom scores or interpret this
// within-range fraction as health, severity, a percentile, or a deficit ranking.
export function initialAssessmentSection(report) {
  const sections = Array.isArray(report?.sections) ? report.sections : []
  const review = sections.findIndex(section => section?.recommendedReview === true)
  if (review >= 0) return review
  if (report?.verified === false || report?.reportKind === 'bach') return 0
  let selected = 0, lowest = Infinity
  sections.forEach((section, index) => {
    if (!section || typeof section !== 'object' || section.bandBasis === 'unavailable') return
    const { value, min, max } = section
    if (![value, min, max].every(Number.isFinite) || max <= min || value < min || value > max) return
    const width = max - min
    if (!Number.isFinite(width)) return
    const fraction = (value - min) / width
    if (Number.isFinite(fraction) && fraction < lowest) {
      selected = index
      lowest = fraction
    }
  })
  return selected
}
