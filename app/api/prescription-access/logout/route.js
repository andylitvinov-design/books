import { NextResponse } from 'next/server'

import { deletePrescriptionRequestSession, isSameOriginRequest } from '@/lib/prescriptions/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  if (!isSameOriginRequest(request)) return new NextResponse(null, { status: 404 })
  await deletePrescriptionRequestSession()
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer',
    },
  })
}
