import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { canonicalRedirectTarget, privateMigrationBridge } from './lib/canonical-redirect'
function privatePath(pathname: string) {
  const decoded = (() => { try { return decodeURIComponent(pathname) } catch { return pathname } })().replace(/\/+/g, '/')
  return /^\/(en|ru|es)\/client(?:\/|$)/.test(decoded)
    || /^\/(ru|en)\/report(?:\/|$)/.test(decoded)
    || /^\/(ru|en)\/prescriptions\//.test(decoded)
    || /^\/(ru|en)\/app(?:\/|$)/.test(decoded)
    || /^\/api\/app(?:\/|$)/.test(decoded)
    || decoded.startsWith('/api/client')
    || decoded.startsWith('/api/prescriptions/')
    || decoded.startsWith('/api/prescription-access')
    || decoded.startsWith('/api/admin/')
    || /^\/admin(?:\/|$)/.test(decoded)
    || decoded.startsWith('/document-preview/')
}
export function middleware(request: NextRequest) {
  const redirectTarget = canonicalRedirectTarget(request.url, request.method)
  if (redirectTarget) return NextResponse.redirect(redirectTarget, 308)
  const bridgeNonce = crypto.randomUUID().replaceAll('-', '')
  const bridge = privateMigrationBridge(request.url, bridgeNonce)
  if (bridge && ['GET', 'HEAD'].includes(request.method)) return new NextResponse(request.method === 'HEAD' ? null : bridge, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${bridgeNonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    'X-Content-Type-Options': 'nosniff',
  } })
  const requestHeaders = new Headers(request.headers)
  // Derive the public document language only from the URL. Private locale gates
  // and all security headers below remain unchanged.
  const pathname = request.nextUrl.pathname
  const urlLocale = pathname.match(/^\/(en|ru|es)(?:\/|$)/)?.[1]
  const requestedLanguage = request.nextUrl.searchParams.get('lang')
  // The unprefixed book routes have their own explicit locale contract:
  // the Maya hub defaults to EN, while individual readers default to RU.
  // Keep the document <html lang> and mobile navigation aligned with the
  // actual page content instead of a remembered public-locale cookie.
  const queryLocale = pathname === '/'
    ? requestedLanguage
    : pathname === '/books/maya-tradition'
      ? (requestedLanguage === 'ru' ? 'ru' : 'en')
      : /^\/books\/[^/]+$/.test(pathname)
        ? (requestedLanguage === 'en' ? 'en' : 'ru')
        : null
  const preference = request.cookies.get('holistic_house_public_locale')?.value === 'es' ? 'es'
    : request.cookies.get('holistic_house_ui_locale')?.value === 'ru' ? 'ru' : 'en'
  const pageLocale = urlLocale ?? (['en', 'ru', 'es'].includes(queryLocale ?? '') ? queryLocale : preference) ?? 'en'
  requestHeaders.set('x-public-page-locale', pageLocale)
  const nonce = crypto.randomUUID().replaceAll('-', '')
  const developmentEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
  const videoManager = pathname === '/admin/videos'
  const academyVideoPage = /^\/(en|ru|es)\/academy(?:\/|$)/.test(pathname)
  const privateDocument = privatePath(pathname)
  const publicDocument = !privateDocument && !pathname.startsWith('/api/')
  const tantraReikiPage = /^\/(en|ru|es)\/academy\/reiki\/tantra-reiki(?:\/|$)/.test(pathname)
  // Public video pages use only these two reviewed embed providers. Keep the
  // cabinet, reports, APIs and document previews on the restrictive policy.
  const publicVideoDocument = publicDocument || videoManager
  // Only the practitioner consultation editor may frame a locally generated PDF blob.
  // Client cabinets and every other private page keep frame-src 'none'.
  const practitionerDraftPreview = pathname === '/admin/consultations/new'
    || /^\/admin\/consultations\/[^/]+\/edit\/?$/.test(pathname)
  const cspClass = videoManager ? 'video-manager'
    : privateDocument ? 'private'
      : tantraReikiPage ? 'tantra-media'
        : publicDocument ? 'public-video'
          : 'restricted'
  const csp = [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com${developmentEval}`, "style-src 'self' 'unsafe-inline'",
    academyVideoPage ? "img-src 'self' data: https://i.ytimg.com https://psitrends.com https://www.psitrends.com https://www.google-analytics.com" : publicVideoDocument ? "img-src 'self' data: https://i.ytimg.com https://psitrends.com https://www.psitrends.com https://www.google-analytics.com" : "img-src 'self' data: https://www.google-analytics.com",
    publicVideoDocument ? "frame-src https://www.youtube-nocookie.com https://app.heygen.com" : practitionerDraftPreview ? "frame-src blob:" : "frame-src 'none'",
    tantraReikiPage ? "media-src 'self' https://psitrends.com" : "media-src 'self'",
    "font-src 'self'", "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
  ].join('; ')
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('x-csp-class', cspClass)
  requestHeaders.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  if (privatePath(request.nextUrl.pathname)) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    response.headers.set('Content-Security-Policy', csp)
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
  }
  return response
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)', '/', '/books/:path*', '/sitemap.xml', '/robots.txt', '/ru/:path*', '/en/:path*', '/api/:path*', '/admin/:path*', '/document-preview/:path*'] }
