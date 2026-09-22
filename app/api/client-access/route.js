import { NextResponse } from 'next/server'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { cabinetSessionTtlSeconds } from '@/lib/clients/access'
import { exchangeCabinetAccess, privateHeaders, cabinetCookieName } from '@/lib/clients/session'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request) {
  try {
    const session = await exchangeCabinetAccess(request, getPrescriptionStore())
    if (session) {
      const response = new NextResponse(null, { status: 204, headers: privateHeaders })
      response.cookies.set(cabinetCookieName(), session.token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: cabinetSessionTtlSeconds })
      return response
    }
  } catch { /* Uniform private failure; never log request or bearer. */ }
  return NextResponse.json({ error: 'Private link unavailable' }, { status: 404, headers: privateHeaders })
}
