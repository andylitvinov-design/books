const fallbackSiteUrl = 'https://andylitvinov-books.vercel.app'

export function metadataBaseFor(siteUrl = process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    const metadataBase = new URL(siteUrl || fallbackSiteUrl)
    return metadataBase.protocol === 'https:' ? metadataBase : new URL(fallbackSiteUrl)
  } catch {
    return new URL(fallbackSiteUrl)
  }
}
