import { NextResponse } from 'next/server'

import { getPrescriptionStore } from '@/lib/prescriptions/store'
import {
  exchangePrescriptionAccess,
  prescriptionAccessFailure,
  prescriptionAccessFailureBody,
  prescriptionSessionCookieName,
} from '@/lib/prescriptions/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

export async function POST(request) {
  let session = prescriptionAccessFailure
  try {
    session = await exchangePrescriptionAccess({
      request,
      store: getPrescriptionStore(),
      ip: request.headers.get('x-real-ip') ?? 'unknown',
    })
  } catch {
    session = prescriptionAccessFailure
  }
  if (session === prescriptionAccessFailure) {
    return NextResponse.json(prescriptionAccessFailureBody, { status: 404, headers: privateHeaders })
  }

  const response = new NextResponse(null, { status: 204, headers: privateHeaders })
  response.cookies.set(prescriptionSessionCookieName(), session.token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
  return response
}
