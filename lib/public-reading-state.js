export const publicReadingStateKey = 'psialchemy-public-reading-v1'

export function sanitizePublicReadingState(input, knownSlugs) {
  const valid = (value) => typeof value === 'string' && knownSlugs.has(value)
  const savedSlugs = [...new Set(Array.isArray(input?.savedSlugs) ? input.savedSlugs.filter(valid) : [])]
  const recent = (Array.isArray(input?.recent) ? input.recent : [])
    .filter((entry) => valid(entry?.slug) && typeof entry.viewedAt === 'string')
    .filter((entry, index, values) => values.findIndex((candidate) => candidate.slug === entry.slug) === index)
    .slice(0, 20)
  return { version: 1, savedSlugs, recent }
}

export function mergeSavedRemedySlugs(browserSlugs, nativeSlugs, knownSlugs) {
  return [...new Set([...(browserSlugs || []), ...(nativeSlugs || [])])]
    .filter((slug) => typeof slug === 'string' && knownSlugs.has(slug))
}

export function readPublicReadingState(knownSlugs) {
  if (typeof window === 'undefined') return sanitizePublicReadingState({}, knownSlugs)
  try { return sanitizePublicReadingState(JSON.parse(window.localStorage.getItem(publicReadingStateKey) || '{}'), knownSlugs) } catch { return sanitizePublicReadingState({}, knownSlugs) }
}

export function writePublicReadingState(state) {
  if (typeof window !== 'undefined') window.localStorage.setItem(publicReadingStateKey, JSON.stringify(state))
}
