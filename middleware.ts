import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function privatePath(pathname: string) {
  const decoded = (() => { try { return decodeURIComponent(pathname) } catch { return pathname } })().replace(/\/+/g, '/')
  return /^\/(ru|en)\/prescriptions\//.test(decoded)
    || decoded.startsWith('/api/prescriptions/')
    || decoded.startsWith('/api/prescription-access')
    || decoded.startsWith('/api/admin/')
    || decoded.startsWith('/admin/')
    || decoded.startsWith('/document-preview/')
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const nonce = crypto.randomUUID().replaceAll('-', '')
  const developmentEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentEval}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  if (privatePath(request.nextUrl.pathname)) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    response.headers.set('Content-Security-Policy', csp)
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
  }
  return response
}

export const config = { matcher: ['/ru/:path*', '/en/:path*', '/api/:path*', '/admin/:path*', '/document-preview/:path*'] }
