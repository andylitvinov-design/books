import { NextResponse } from 'next/server'

import { isSupportedLocale } from '@/data/remedies'
import { buildPrescriptionPdf } from '@/lib/prescriptions/pdf'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { metadataBaseFor } from '@/data/site-metadata'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const { publicId } = await params
  const locale = new URL(request.url).searchParams.get('locale') ?? 'en'
  if (!isSupportedLocale(locale)) return new NextResponse(null, { status: 404 })
  const store = getPrescriptionStore()
  const record = store ? await store.findByPublicId(publicId) : undefined
  const document = getClientPrescription(record, locale)
  if (!document) return new NextResponse(null, { status: 404 })

  const pdf = buildPrescriptionPdf(document, locale, metadataBaseFor().origin)
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="homeopathic-recommendation-${document.dateIssued}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
