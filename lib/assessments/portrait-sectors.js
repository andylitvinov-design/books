// Domain groupings for the measured psychological portrait radar.
// All 17 directional axes appear exactly once. Descriptive personality
// traits are intentionally excluded from favorable/unfavorable ray charts.
export const PORTRAIT_SECTORS = Object.freeze([
  Object.freeze({
    key: 'body',
    label: Object.freeze({ en: 'Body / Energy', ru: 'Тело / энергия', es: 'Cuerpo / energía' }),
    axes: Object.freeze(['stress', 'anxiety', 'sleep', 'energy', 'embodiment']),
  }),
  Object.freeze({
    key: 'work',
    label: Object.freeze({ en: 'Work', ru: 'Дело', es: 'Trabajo' }),
    axes: Object.freeze(['clarity', 'focus', 'functioning']),
  }),
  Object.freeze({
    key: 'relationships',
    label: Object.freeze({ en: 'Relationships', ru: 'Отношения', es: 'Relaciones' }),
    axes: Object.freeze(['relationships', 'intimacy', 'boundaries', 'sexual_wellbeing']),
  }),
  Object.freeze({
    key: 'growth',
    label: Object.freeze({ en: 'Growth / Realization', ru: 'Развитие / реализация', es: 'Desarrollo / realización' }),
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
