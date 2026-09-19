const normalize = (value) => String(value ?? '').toLowerCase().replaceAll('ё', 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

// Word prefixes support common abbreviations (e.g. nat mur) without guessing a selection.
export function searchConsultationRemedies(remedies, query) {
  const terms = normalize(query).split(' ').filter(Boolean)
  if (!terms.length) return []
  return remedies.filter((remedy) => {
    const names = [remedy.label, remedy.searchText, ...(remedy.importNames ?? [])].map(normalize)
    return names.some((name) => terms.every((term) => name.split(' ').some((word) => word.startsWith(term))))
  }).slice(0, 8)
}
