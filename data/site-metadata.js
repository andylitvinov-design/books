// Versioned with the migration so metadata and generated PDFs use one origin.
// This branch is Preview-only until hostname ownership and cutover are approved.
export const canonicalSiteUrl = 'https://holistichouse.vercel.app'
const fallbackSiteUrl = canonicalSiteUrl

export function canonicalPublicOrigin(value = canonicalSiteUrl) {
  try {
    const origin = new URL(value || fallbackSiteUrl)
    if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password || origin.port) throw new Error('Invalid canonical origin')
    return origin
  } catch {
    return new URL(fallbackSiteUrl)
  }
}

export function metadataBaseFor(siteUrl = canonicalSiteUrl) {
  return canonicalPublicOrigin(siteUrl)
}
