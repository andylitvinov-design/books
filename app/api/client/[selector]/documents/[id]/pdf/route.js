import { NextResponse } from 'next/server'
import { authorizeCabinetRequest, privateHeaders } from '@/lib/clients/session'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { buildPrescriptionPdf, buildPaymentPdf } from '@/lib/prescriptions/pdf'
import { metadataBaseFor } from '@/data/site-metadata'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request, { params }) {
  const { selector, id } = await params
  const locale = new URL(request.url).searchParams.get('locale') ?? 'en'
  if (!['en', 'ru'].includes(locale)) return new NextResponse(null, { status: 404, headers: privateHeaders })
  const access = await authorizeCabinetRequest(selector, id)
  if (!access || access.record.kind === 'report') return new NextResponse(null, { status: 404, headers: privateHeaders })
  const payment = access.record.kind === 'payment'
  const document = payment ? getClientPaymentDocument(access.record, locale) : getClientPrescription(access.record, locale)
  if (!document) return new NextResponse(null, { status: 404, headers: privateHeaders })
  const pdf = payment ? buildPaymentPdf(document, locale, metadataBaseFor().origin) : buildPrescriptionPdf(document, locale, metadataBaseFor().origin)
  return new NextResponse(pdf, { headers: { ...privateHeaders, 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="private-document.pdf"' } })
}
