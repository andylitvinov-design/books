import { NextResponse } from 'next/server'

import { metadataBaseFor } from '@/data/site-metadata'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { buildPaymentPdf, buildPrescriptionPdf } from '@/lib/prescriptions/pdf'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

export async function GET(request, { params }) {
  if (!await requireAdminRequest()) return new NextResponse(null, { status: 404, headers: privateHeaders })
  const { id } = await params
  const locale = new URL(request.url).searchParams.get('locale') ?? 'en'
  if (!['en', 'ru'].includes(locale)) return new NextResponse(null, { status: 404, headers: privateHeaders })
  const store = getPrescriptionStore()
  const record = store ? await store.findById(id) : undefined
  if (!record) return new NextResponse(null, { status: 404, headers: privateHeaders })
  const payment = record.kind === 'payment'
  const document = payment ? getClientPaymentDocument({ ...record, status: 'active' }, locale) : getClientPrescription({ ...record, status: 'active' }, locale)
  if (!document) return new NextResponse(null, { status: 404, headers: privateHeaders })
  const pdf = await (payment ? buildPaymentPdf : buildPrescriptionPdf)(document, locale, metadataBaseFor().origin)
  const filename = payment ? (record.paymentStatus === 'received' ? 'receipt.pdf' : 'invoice.pdf') : 'homeopathic-recommendation.pdf'
  return new NextResponse(pdf, { headers: { ...privateHeaders, 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"` } })
}
