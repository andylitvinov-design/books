import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isSameOriginRequest } from '@/lib/prescriptions/session'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { digestSessionToken } from '@/lib/clients/access'
import { privateHeaders, cabinetCookieName } from '@/lib/clients/session'
export async function POST(request) {
  if (!isSameOriginRequest(request)) return new NextResponse(null, { status: 404, headers: privateHeaders })
  const jar = await cookies()
  const digest = digestSessionToken(jar.get(cabinetCookieName())?.value)
  jar.delete(cabinetCookieName())
  if (digest) await getPrescriptionStore()?.deleteCabinetSession(digest)
  return new NextResponse(null, { status: 204, headers: privateHeaders })
}
