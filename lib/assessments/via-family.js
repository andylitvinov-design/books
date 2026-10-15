// Presentation-only grouping. Never mutate registered definitions, results or catalog rights.
export const VIA_PROFILE_KEY = 'ipip-via-r-strengths-96'

export function isStandaloneViaKey(key) {
  return typeof key === 'string' &&
    /^ipip-via-r-(?!strengths-96$).+-(?:4|6)$/.test(key)
}

export function groupViaRecommendations(entries, selectedKeys = [], expanded = false) {
  const rows = Array.isArray(entries) ? entries : []
  const chosen = selectedKeys instanceof Set ? selectedKeys : new Set(selectedKeys)
  const profile = rows.find((entry) => entry?.key === VIA_PROFILE_KEY) || null
  const individualCount = rows.filter((entry) => isStandaloneViaKey(entry?.key)).length
  const visible = rows.filter((entry) => {
    if (entry?.key === VIA_PROFILE_KEY) return false // one prominent, optional combined card
    if (!isStandaloneViaKey(entry?.key)) return true
    return expanded || chosen.has(entry.key) // never hide an explicit selection
  })
  const collapsedCount = individualCount - visible.filter((entry) => isStandaloneViaKey(entry.key)).length
  return Object.freeze({ profile, individualCount, collapsedCount, visible: Object.freeze(visible) })
}

/**
 * The compact picker ranks short tests and may omit long explicit-opt-in profiles.
 * Offer the complete rights-cleared VIA form separately when matching short VIA
 * scales are present. Respect duration/type filters and explicit selections.
 */
export function resolveViaProfile(group, candidate, selectedKeys = [], { maxMinutes = 0, testKinds = [] } = {}) {
  if (group?.profile) return group.profile
  if (!candidate || candidate.key !== VIA_PROFILE_KEY || candidate.selectable !== true ||
      candidate.rightsStatus !== 'cleared' || candidate.startable !== true) return null
  const selected = selectedKeys instanceof Set ? selectedKeys : new Set(selectedKeys)
  if (!group?.individualCount && !selected.has(VIA_PROFILE_KEY)) return null
  if (selected.has(VIA_PROFILE_KEY)) return candidate
  if (maxMinutes > 0 && (!candidate.durationMinutes || candidate.durationMinutes > maxMinutes)) return null
  if (Array.isArray(testKinds) && testKinds.length && !testKinds.includes('professional')) return null
  return candidate
}
