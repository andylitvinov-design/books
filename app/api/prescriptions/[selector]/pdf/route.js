import { NextResponse } from 'next/server'

import { metadataBaseFor } from '@/data/site-metadata'
import { isSupportedLocale } from '@/data/remedies'
import { buildPrescriptionPdf } from '@/lib/prescriptions/pdf'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { authorizePrescriptionRequest } from '@/lib/prescriptions/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const { selector } = await params
  const locale = new URL(request.url).searchParams.get('locale') ?? 'en'
  if (!isSupportedLocale(locale)) return new NextResponse(null, { status: 404 })
  const record = await authorizePrescriptionRequest(selector)
  const document = getClientPrescription(record, locale)
  if (!document) return new NextResponse(null, { status: 404 })

  const pdf = buildPrescriptionPdf(document, locale, metadataBaseFor().origin)
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="homeopathic-prescription.pdf"',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
