import { canonicalSiteUrl } from '../data/site-metadata.js'

export const legacyPublicHost = 'codex-public-book-library.vercel.app'
// Enable only in a separately approved release after the target host is attached.
export const canonicalRedirectEnabled = false

export function canonicalRedirectTarget(rawUrl, method = 'GET', enabled = canonicalRedirectEnabled) {
  if (!enabled || !['GET', 'HEAD'].includes(method)) return undefined
  const url = new URL(rawUrl)
  if (url.hostname !== legacyPublicHost) return undefined
  let path
  try { path = decodeURIComponent(url.pathname).replace(/\/+/g, '/') } catch { return undefined }
  // Existing host-only private sessions must keep working on their own origin.
  // Also keep association documents, PWA runtime and assets available on both hosts.
  if (!(path === '/' || path === '/books' || path.startsWith('/books/')
      || /^\/(ru|en)\/homeopathy(?:\/|$)/.test(path)
      || path === '/sitemap.xml' || path === '/robots.txt')) return undefined
  const target = new URL(canonicalSiteUrl)
  target.pathname = url.pathname
  target.search = url.search
  target.hash = url.hash
  return target.toString()
}
