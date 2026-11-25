import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const revalidate = 3600

// The files are produced from the completed Next build. Generating these
// params during `next build` would cache the pre-generation fallback.
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
          /^\/images\/holistic-house\/[A-Za-z0-9._-]+\.(?:webp|avif|png|jpg)$/.test(snapshot.portrait)
          ? snapshot.portrait : null
        const compressed = gzip && typeof snapshot.gzip === 'string' && snapshot.gzip.length > 0
        const body = compressed ? Buffer.from(snapshot.gzip, 'base64') : snapshot.html
        return new Response(body, { headers: {
          ...(compressed ? { 'Content-Encoding': 'gzip' } : {}),
          ...(portrait ? { Link: `<${portrait}>; rel=preload; as="image"; fetchpriority="high"` } : {}),
          'Content-Type': 'text/html; charset=utf-8',
          'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
          'Content-Security-Policy': snapshot.policy,
          'Cache-Control': 'public, max-age=0, s-maxage=3600, must-revalidate',
          'Vary': 'Accept, Accept-Encoding, Cookie, Authorization, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Next-Url',
        } })
      }
    } catch {
      // An unavailable or incomplete build artifact must never replace SSR.
    }
  }
  return fullHome(locale)
}
