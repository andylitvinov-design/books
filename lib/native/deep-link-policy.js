const publicHosts = new Set(['codex-public-book-library.vercel.app'])
const publicRemedyPattern = /^\/(ru|en)\/homeopathy\/remedies\/([a-z0-9-]+)\/?$/
const privatePattern = /^\/(ru|en)\/prescriptions\//

/**
 * Maps only public remedy URLs into an in-app route. Private prescription
 * links deliberately never receive an in-app/native route.
 */
export function classifyNativeLink(rawUrl) {
  let url
  try { url = new URL(rawUrl) } catch { return { kind: 'invalid' } }

  const isPsiAlchemyScheme = url.protocol === 'psialchemy:'
  const isPublicWebUrl = url.protocol === 'https:' && publicHosts.has(url.host)
  if (!isPsiAlchemyScheme && !isPublicWebUrl) return { kind: 'external', url: url.toString() }

  const pathname = isPsiAlchemyScheme
    ? `/${[url.hostname, ...url.pathname.split('/').filter(Boolean)].filter(Boolean).join('/')}`
    : url.pathname
  if (privatePattern.test(pathname)) return { kind: 'private-blocked' }
  const match = pathname.match(publicRemedyPattern)
  if (!match) return { kind: 'unsupported' }
  return { kind: 'public-remedy', path: `/${match[1]}/homeopathy/remedies/${match[2]}` }
}
