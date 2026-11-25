// Ranks already-cleared public questionnaires by the actual axes they measure.
// This is a coverage heuristic, not a psychometric score, clinical judgment,
// financial profile, or auto-prescription. Never uses personal answers.
export function recommendProfileBattery(entries = [], axes = [], limit = 5) {
  const wanted = [...new Set((Array.isArray(axes) ? axes : [])
    .filter(axis => typeof axis === 'string' && axis.length > 0))]
  const remaining = new Set(wanted)
  const cap = Number.isInteger(limit) ? Math.max(0, Math.min(12, limit)) : 0
  const options = (Array.isArray(entries) ? entries : [])
    .filter(entry => entry && typeof entry.key === 'string' &&
      Array.isArray(entry.axes) && entry.axes.some(axis => remaining.has(axis)) &&
      !('selectable' in entry && entry.selectable !== true) &&
      !('free' in entry && entry.free !== true) &&
      !('startable' in entry && entry.startable !== true) &&
      !('rightsStatus' in entry && entry.rightsStatus !== 'cleared') &&
      !('explicitOptIn' in entry && entry.explicitOptIn === true))
  const chosen = []
  while (remaining.size && chosen.length < cap) {
    const best = options.filter(entry => !chosen.includes(entry.key))
      .map(entry => ({ entry, gain: [...new Set(entry.axes)].filter(axis => remaining.has(axis)) }))
      .filter(item => item.gain.length)
      .sort((a, b) => b.gain.length - a.gain.length ||
        (a.entry.minutes ?? 99) - (b.entry.minutes ?? 99) ||
        a.entry.key.localeCompare(b.entry.key))[0]
    if (!best) break
    chosen.push(best.entry.key)
    best.gain.forEach(axis => remaining.delete(axis))
  }
  return Object.freeze(chosen)
}
