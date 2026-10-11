import { NextResponse } from 'next/server'
import { authorizeCabinetRequest, privateHeaders } from '@/lib/clients/session'
import { clientAssessmentDetail } from '@/lib/clients/assessments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Returns only one already-shared report, only to the matching private cabinet session.
// Neither client names nor internal notes/related-document IDs are exposed.
export async function GET(_request, { params }) {
  const { selector, assessmentId } = await params
  const access = await authorizeCabinetRequest(selector)
  if (!access) return new NextResponse(null, { status: 404, headers: privateHeaders })
  const detail = await clientAssessmentDetail(access.store, access.client.id, assessmentId)
  if (!detail) return new NextResponse(null, { status: 404, headers: privateHeaders })
  const { relatedDocuments: _relatedDocuments, ...report } = detail
  return NextResponse.json({ report }, { headers: { ...privateHeaders, Vary: 'Cookie' } })
}
