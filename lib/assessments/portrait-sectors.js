// Domain groupings for the measured psychological portrait radar.
// All 17 directional axes appear exactly once. Descriptive personality
// traits are intentionally excluded from favorable/unfavorable ray charts.
export const PORTRAIT_SECTORS = Object.freeze([
  Object.freeze({
    key: 'body',
    label: Object.freeze({ en: 'Body, health & energy', ru: 'Тело, здоровье и энергия', es: 'Cuerpo, salud y energía' }),
    shortLabel: Object.freeze({ en: 'Body / Energy', ru: 'Тело / энергия', es: 'Cuerpo / energía' }),
    radarLabel: Object.freeze({ en: 'Body / Energy', ru: 'Тело / энергия', es: 'Cuerpo / energía' }),
    axes: Object.freeze(['stress', 'anxiety', 'sleep', 'energy', 'embodiment']),
  }),
  Object.freeze({
    key: 'work',
    label: Object.freeze({ en: 'Work, business & money', ru: 'Дело, бизнес и деньги', es: 'Trabajo, negocios y dinero' }),
    shortLabel: Object.freeze({ en: 'Work / Money', ru: 'Дело / деньги', es: 'Trabajo / dinero' }),
    radarLabel: Object.freeze({ en: 'Work', ru: 'Дело', es: 'Trabajo' }),
    axes: Object.freeze(['clarity', 'focus', 'functioning']),
  }),
  Object.freeze({
    key: 'relationships',
    label: Object.freeze({ en: 'Relationships & connection', ru: 'Отношения и близость', es: 'Relaciones y cercanía' }),
    shortLabel: Object.freeze({ en: 'Relationships', ru: 'Отношения', es: 'Relaciones' }),
    radarLabel: Object.freeze({ en: 'Relationships', ru: 'Отношения', es: 'Relaciones' }),
    axes: Object.freeze(['relationships', 'intimacy', 'boundaries', 'sexual_wellbeing']),
  }),
  Object.freeze({
    key: 'growth',
    label: Object.freeze({ en: 'Personality & personal growth', ru: 'Личность и развитие', es: 'Personalidad y crecimiento' }),
    shortLabel: Object.freeze({ en: 'Personal Growth', ru: 'Личность / рост', es: 'Desarrollo personal' }),
    radarLabel: Object.freeze({ en: 'Personal Growth', ru: 'Личность / рост', es: 'Desarrollo personal' }),
    axes: Object.freeze(['mood', 'emotional_regulation', 'resource', 'self_support', 'meaning']),
  }),
])

export const PORTRAIT_SECTOR_KEYS = Object.freeze(PORTRAIT_SECTORS.map((sector) => sector.key))
export const PORTRAIT_AXIS_ORDER = Object.freeze(PORTRAIT_SECTORS.flatMap((sector) => sector.axes))

// Each category occupies its own quarter. A ray keeps its position regardless
// of which checkboxes are visible, so changes do not rotate existing results.
export function portraitAngleForAxis(axis) {
  const sectorIndex = PORTRAIT_SECTORS.findIndex((sector) => sector.axes.includes(axis))
  if (sectorIndex === -1) return null
  const axes = PORTRAIT_SECTORS[sectorIndex].axes
  const index = axes.indexOf(axis)
  return (-Math.PI / 2) + (sectorIndex + (index + 0.5) / axes.length) * Math.PI / 2
}

export function portraitAxesForSectors(sectorKeys) {
  const enabled = new Set(sectorKeys || [])
  return PORTRAIT_SECTORS.filter((sector) => enabled.has(sector.key)).flatMap((sector) => sector.axes)
}

/**
 * Visual-only descriptive sector summary. Each included result is an actual
 * direction-adjusted, within-instrument scale position (0–100). An absent
 * measurement contributes neither a zero nor an invented default.
 *
 * Sector-level score means are intentionally NOT calculated: distinct
 * questionnaires, constructs and time windows cannot form one validated grade.
 * Only the number of safely interpreted, recent dimensions is summarized.
 */
export function summarizePortraitSectors(portrait) {
  return PORTRAIT_SECTORS.map(sector => {
    const values = sector.axes.map(axis=>portrait?.axes?.[axis]).filter(entry=>
      entry && (entry.mode === 'descriptive' ? Number.isFinite(entry.rawValue)
        : Number.isFinite(entry.percent) && entry.percent >= 0 && entry.percent <= 100))
    return {
      key:sector.key, label:sector.label,
      measured:values.length, total:sector.axes.length,
      descriptive:values.filter(entry=>entry.mode==='descriptive').length,
      coveragePercent:Math.round(100*values.length/sector.axes.length),
      // Backwards-compatible field deliberately empty; NEVER average unlike scales.
      percent:null,
    }
  })
}

/**
 * All is a set of four individual, attributed test readings—not a composite
 * of unrelated questionnaire scores and not measurement coverage. Prefer the
 * latest recent directional reading in each category; if only descriptive
 * scores exist, show the raw answer without drawing a favorable-direction ray.
 * buildPsychPortrait() has already enforced source/version/freshness rules.
 */
export function portraitSectorReadouts(portrait, visibleAxes = null) {
  // Display preference only. A hidden axis cannot be picked as the All-view
  // source, but the source result and its provenance are never changed.
  const allowedAxes = visibleAxes == null ? null : new Set(visibleAxes)
  return PORTRAIT_SECTORS.map(sector => {
    const candidates = sector.axes.filter(axis => allowedAxes === null || allowedAxes.has(axis)).map((axis) => ({
      axis, index:sector.axes.indexOf(axis), measurement:portrait?.axes?.[axis],
    })).filter(({measurement}) => measurement &&
      ['directional','descriptive'].includes(measurement.mode) &&
      Number.isFinite(measurement.rawValue) &&
      Number.isFinite(measurement.min) && Number.isFinite(measurement.max) &&
      measurement.max > measurement.min &&
      measurement.rawValue >= measurement.min && measurement.rawValue <= measurement.max &&
      (measurement.mode === 'descriptive' ||
        (Number.isFinite(measurement.percent) && measurement.percent >= 0 && measurement.percent <= 100)))
    const directional = candidates.filter(({measurement}) => measurement.mode === 'directional')
    const recent = directional.length ? directional : candidates
    const timestamp = measurement => {
      const value = Date.parse(measurement?.measuredAt || '')
      return Number.isFinite(value) ? value : -Infinity
    }
    recent.sort((a,b) => timestamp(b.measurement) - timestamp(a.measurement) || a.index - b.index)
    const chosen = recent[0] || null
    return {
      key:sector.key, label:sector.label, radarLabel:sector.radarLabel,
      axis:chosen?.axis || null,
      measurement:chosen?.measurement || null,
      percent:chosen?.measurement.mode === 'directional' ? chosen.measurement.percent : null,
    }
  })
}

export function portraitSectorMidAngle(key) {
  const index = PORTRAIT_SECTOR_KEYS.indexOf(key)
  return index === -1 ? null : -Math.PI / 2 + (index + .5) * Math.PI / 2
}

/**
 * Evenly distributes ALL the original scales of one selected category around
 * the full 360-degree contour. This changes display coordinates only:
 * the user's verified scores, source dates and original quarter mapping
 * remain unchanged. Unmeasured scales still get a place, never a score.
 */
export function portraitFullCircleAngleForAxis(axis, sectorKey) {
  const sector = PORTRAIT_SECTORS.find(item => item.key === sectorKey)
  if (!sector) return null
  const index = sector.axes.indexOf(axis)
  if (index < 0) return null
  return -Math.PI / 2 + index * 2 * Math.PI / sector.axes.length
}
