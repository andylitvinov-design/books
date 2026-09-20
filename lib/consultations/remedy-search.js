import { normalizeRemedyName } from '../remedies/names.js'

const remedyNames = (remedy) => [remedy.label, remedy.displayName, ...(remedy.importNames ?? []), ...(remedy.aliases ?? [])].filter(Boolean).map(normalizeRemedyName)

// Prefixes narrow suggestions; the owner must explicitly choose the intended remedy.
export function searchConsultationRemedies(remedies, query) {
  const normalized = normalizeRemedyName(query)
  const terms = normalized.split(' ').filter(Boolean)
  if (!terms.length) return []
  return remedies.filter((remedy) => {
    const names = [...remedyNames(remedy), normalizeRemedyName(remedy.searchText)]
    return names.some((name) => terms.every((term) => name.split(' ').some((word) => word.startsWith(term))))
  }).sort((a, b) => Number(remedyNames(b).includes(normalized)) - Number(remedyNames(a).includes(normalized))).slice(0, 8)
}

export function consultationRemedySuggestions(remedies, query) {
  const normalized = normalizeRemedyName(query)
  if (!normalized) return []
  const matches = searchConsultationRemedies(remedies, query)
  const exactKnown = remedies.some((remedy) => remedyNames(remedy).includes(normalized))
  return exactKnown ? matches : [...matches, { id: 'custom', slug: null, label: query.trim(), displayName: query.trim(), sourceStatus: 'custom' }]
}
