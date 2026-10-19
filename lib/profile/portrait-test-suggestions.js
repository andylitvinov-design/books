// Suggested questionnaires for currently unmeasured psychological portrait axes.
// Suggestions are informational, never deficits, diagnoses or clinical targets.
import { PORTRAIT_AXIS_ORDER } from '../assessments/portrait-sectors.js'

const PORTRAIT_AXES = new Set(PORTRAIT_AXIS_ORDER)

export function recommendUnmeasuredPortraitTests({
  entries = [], results = [], missingAxes = [], limit = PORTRAIT_AXIS_ORDER.length,
} = {}) {
  const uncovered = new Set((Array.isArray(missingAxes) ? missingAxes : [])
    .filter(axis => PORTRAIT_AXES.has(axis)))
  if (!uncovered.size) return []

  // Even an older completed test is not silently prescribed a second time.
  const completed = new Set((Array.isArray(results) ? results : [])
    .map(result => result?.definitionKey).filter(Boolean))

  const options = (Array.isArray(entries) ? entries : [])
    .filter(entry => entry?.selectable === true && entry.startable === true &&
      entry.rightsStatus === 'cleared' && entry.free === true &&
      entry.explicitOptIn !== true && !completed.has(entry.key))
    .map(entry => {
      // An instrument must have an audited portrait source rule. A topic tag
      // alone cannot be used to promise a measurement.
      const axes = [...new Set((entry.scaleGuide?.scales || [])
        .filter(scale => (scale.portraitMode === 'directional' || scale.portraitMode === 'descriptive') &&
          PORTRAIT_AXES.has(scale.axis))
        .map(scale => scale.axis))]
      return { entry, axes }
    })
    .filter(candidate => candidate.axes.some(axis => uncovered.has(axis)))

  const chosen = []
  const used = new Set()
  const cap = Number.isFinite(limit) ? Math.max(0, Math.min(PORTRAIT_AXIS_ORDER.length, Math.floor(limit))) : 0

  while (uncovered.size && chosen.length < cap) {
    const best = options
      .filter(candidate => !used.has(candidate.entry.key))
      .map(candidate => ({
        ...candidate,
        covers: candidate.axes.filter(axis => uncovered.has(axis)),
      }))
      .filter(candidate => candidate.covers.length)
      .sort((a, b) =>
        b.covers.length - a.covers.length ||
        Number(a.entry.starterEligible === false) - Number(b.entry.starterEligible === false) ||
        (a.entry.durationMinutes ?? 999) - (b.entry.durationMinutes ?? 999) ||
        a.entry.key.localeCompare(b.entry.key))[0]

    if (!best) break
    used.add(best.entry.key)
    best.covers.forEach(axis => uncovered.delete(axis))
    chosen.push({
      key: best.entry.key,
      title: best.entry.title,
      questionCount: best.entry.questionCount,
      durationMinutes: best.entry.durationMinutes,
      covers: best.covers,
    })
  }

  return chosen
}
