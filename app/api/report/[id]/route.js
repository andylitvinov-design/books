import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { isSameOriginRequest } from '@/lib/prescriptions/session'
import { isClientId } from '@/lib/clients/service'
import {
  createPendingReportClaim,
  publicAssessmentView,
  reportClaimCookieName,
  reportClaimTtlSeconds,
  verifyAssessmentShareSecret,
} from '@/lib/clients/assessment-share'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const headers = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}
const unavailable = () => NextResponse.json({ error: 'Report unavailable' }, { status: 404, headers })

function rateDigest(scope, value) {
  return createHash('sha256').update(scope + '\0' + String(value).slice(0, 160)).digest('hex')
}

export async function POST(request, { params }) {
  try {
    if (!isSameOriginRequest(request)) return unavailable()
    const { id } = await params
    if (!isClientId(id)) return unavailable()
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
      return unavailable()
    const length = Number(request.headers.get('content-length') || 0)
    if (!Number.isFinite(length) || length > 2048) return unavailable()
    const body = await request.json()
    if (!body || Object.keys(body).sort().join(',') !== 'secret' || typeof body.secret !== 'string')
      return unavailable()

    const store = getPrescriptionStore()
    if (!store?.findClientAssessment) return unavailable()
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!await store.consumeAccessAttempt(rateDigest('report-ip', ip), 30, 300)) return unavailable()
    if (!await store.consumeAccessAttempt(rateDigest('report-id', id), 12, 300)) return unavailable()

    const record = await store.findClientAssessment(id)
    if (!record || !verifyAssessmentShareSecret(record, body.secret)) return unavailable()
    const client = await store.findClientById(record.clientId)
    if (!client || client.status !== 'active') return unavailable()
    const report = publicAssessmentView(record)
    const claim = createPendingReportClaim(record)
    if (!report || !claim) return unavailable()

    const response = NextResponse.json({ report }, { headers })
    response.cookies.set(reportClaimCookieName(), claim, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: reportClaimTtlSeconds,
    })
    return response
  } catch {
    return unavailable()
  }
}
