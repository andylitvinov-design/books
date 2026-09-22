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
  if (/^\/(ru|en)\/(prescriptions|client)(?:\/|$)/.test(path)
      || /^\/(api|admin|document-preview|\.well-known|_next)(?:\/|$)/.test(path)
      || ['/sw.js', '/manifest.webmanifest'].includes(path)) return undefined
  const target = new URL(canonicalSiteUrl)
  target.pathname = url.pathname
  target.search = url.search
  target.hash = url.hash
  return target.toString()
}

// Server emits no URL-derived content. The fragment is read only in the browser.
export function privateMigrationBridge(rawUrl, nonce, enabled = canonicalRedirectEnabled) {
  const url = new URL(rawUrl)
  let path
  try { path = decodeURIComponent(url.pathname).replace(/\/+/g, '/') } catch { return undefined }
  if (!enabled || url.hostname !== legacyPublicHost || !/^\/(en|ru)\/(prescriptions|client)\//.test(path)) return undefined
  const target = JSON.stringify(canonicalSiteUrl).replace(/</g, '\\u003c')
  const safeNonce = nonce.replace(/[^a-zA-Z0-9]/g, '')
  return `<!doctype html><html><head><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><title>Private link</title></head><body><p>Opening your private link…</p><script nonce="${safeNonce}">location.replace(${target}+location.pathname+location.search+location.hash)</script><noscript>Enable JavaScript to open your original private link.</noscript></body></html>`
}
