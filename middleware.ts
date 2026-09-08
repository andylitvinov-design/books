import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function privatePath(pathname: string) {
  const decoded = (() => { try { return decodeURIComponent(pathname) } catch { return pathname } })().replace(/\/+/g, '/')
  return /^\/(ru|en)\/prescriptions\//.test(decoded) || decoded.startsWith('/api/prescriptions/') || decoded.startsWith('/admin/')
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  if (privatePath(request.nextUrl.pathname)) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  }
  return response
}

export const config = { matcher: ['/ru/:path*', '/en/:path*', '/api/:path*', '/admin/:path*'] }
