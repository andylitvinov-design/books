import { NextResponse } from 'next/server'
import { getDocumentSample, samplesEnabled } from '@/lib/documents/samples'
import { buildPaymentPdf, buildPrescriptionPdf } from '@/lib/prescriptions/pdf'
import { canonicalPublicOrigin } from '@/data/site-metadata'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request, { params }) {
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }
  if (!samplesEnabled()) return new NextResponse(null, { status: 404, headers })
  const { kind } = await params
  const locale = new URL(request.url).searchParams.get('locale') ?? 'en'
  const document = getDocumentSample(kind, locale)
  if (!document) return new NextResponse(null, { status: 404, headers })
  const pdf = (kind === 'recommendation' ? buildPrescriptionPdf : buildPaymentPdf)(document, locale, canonicalPublicOrigin().origin)
  return new NextResponse(pdf, { headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="synthetic-${kind}.pdf"` } })
}
