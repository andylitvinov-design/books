const fallbackSiteUrl = 'https://codex-public-book-library.vercel.app'

export function canonicalPublicOrigin(value = process.env.PSIALCHEMY_CANONICAL_HOST || process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    const origin = new URL(value || fallbackSiteUrl)
    if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Invalid canonical origin')
    return origin
  } catch {
    return new URL(fallbackSiteUrl)
  }
}

export function metadataBaseFor(siteUrl = process.env.NEXT_PUBLIC_SITE_URL) {
  return canonicalPublicOrigin(siteUrl)
}
