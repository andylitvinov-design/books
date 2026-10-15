import { NextResponse } from 'next/server'

import { metadataBaseFor } from '@/data/site-metadata'
import { isSupportedLocale } from '@/data/remedies'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { buildPrescriptionPdf, buildPaymentPdf } from '@/lib/prescriptions/pdf'
import { reportPdfFilename } from '@/lib/documents/report-filename'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { authorizePrescriptionRequest } from '@/lib/prescriptions/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const { selector } = await params
  const locale = new URL(request.url).searchParams.get('locale') ?? 'en'
  if (!isSupportedLocale(locale)) return new NextResponse(null, { status: 404 })
  const record = await authorizePrescriptionRequest(selector)
  const document = record?.kind === 'payment' ? getClientPaymentDocument(record, locale) : getClientPrescription(record, locale)
  if (!document) return new NextResponse(null, { status: 404 })

  const pdf = record.kind === 'payment' ? buildPaymentPdf(document, locale, metadataBaseFor().origin) : buildPrescriptionPdf(document, locale, metadataBaseFor().origin)
  // The invitation's 'view without saving' action is an inline PDF, not
  // the HTML reader. Authorization still requires the scoped HttpOnly session.
  const inlinePreview = new URL(request.url).searchParams.get('preview') === '1'
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inlinePreview ? 'inline' : 'attachment'}; filename="${record.kind === 'payment' ? (document.paymentStatus === 'received' ? 'receipt.pdf' : 'invoice.pdf') : reportPdfFilename(document)}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
