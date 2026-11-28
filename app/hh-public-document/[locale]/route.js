import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const runtime = 'nodejs'
// Phase one changes CSS delivery only. Keep the current no-store contract;
// CDN/ISR caching of HTML is a separate release, not part of this fix.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateStaticParams() { return [] }

const locales = new Set(['en', 'ru', 'es'])
const privateHeaders = { 'Cache-Control': 'private, no-store' }

function fullHome(locale) {
  return new Response('Continue to the full homepage.', { status: 307, headers: {
    ...privateHeaders, Location: `${locale === 'en' ? '/' : `/${locale}`}?full=1`,
  } })
}

export async function GET(_request, { params }) {
  const { locale: key } = await params
  if (key.endsWith('-full') && locales.has(key.slice(0, -5))) return fullHome(key.slice(0, -5))
  const gzip = key.endsWith('-gzip')
  const locale = gzip ? key.slice(0, -5) : key
  if (!locales.has(locale)) return new Response(null, { status: 404, headers: privateHeaders })
  const expected = process.env.HH_COMPILED_PUBLIC_HOME_BUILD_ID
  if (expected) {
    try {
      const path = join(process.cwd(), '.home-documents', `${locale}.json`)
      const snapshot = JSON.parse(await readFile(path, 'utf8'))
      if (snapshot.buildId === expected && typeof snapshot.html === 'string' &&
          snapshot.html.startsWith('<!DOCTYPE html>') && typeof snapshot.policy === 'string' &&
          snapshot.policy.includes("'strict-dynamic'") && snapshot.policy.includes("'sha256-")) {
        const portrait = typeof snapshot.portrait === 'string' &&
          /^\/images\/holistic-house\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9._-]+\.(?:webp|avif|png|jpg)$/.test(snapshot.portrait)
          ? snapshot.portrait : null
        const compressed = gzip && typeof snapshot.gzip === 'string' && snapshot.gzip.length > 0
        const body = compressed ? Buffer.from(snapshot.gzip, 'base64') : snapshot.html
        return new Response(body, { headers: {
          ...(compressed ? { 'Content-Encoding': 'gzip' } : {}),
          ...(portrait ? { Link: `<${portrait}>; rel=preload; as="image"; fetchpriority="high"` } : {}),
          'Content-Type': 'text/html; charset=utf-8',
          'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
          'Content-Security-Policy': snapshot.policy,
          ...privateHeaders,
          // The compiled guest HTML remains build-bound, not CDN/ISR cached.
          // Middleware still isolates non-canonical and personalized requests.
          'Vary': 'Accept, Accept-Encoding, X-HH-Public-Home-Encoding, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Next-Url',
        } })
      }
    } catch {
      // An unavailable or incomplete build artifact must never replace SSR.
    }
  }
  return fullHome(locale)
}
