import { NextResponse } from 'next/server'

import { metadataBaseFor } from '@/data/site-metadata'
import { createConsultationDraftPreview } from '@/lib/consultations/draft-preview'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { buildPaymentPdf, buildPrescriptionPdf } from '@/lib/prescriptions/pdf'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
}

const inputKeys = [
  'patientName', 'clientMode', 'clientId', 'consultationId', 'dateIssued',
  'languagePreference', 'amount', 'currency', 'service', 'paymentStatus',
  'paymentMethod', 'documentNumber', 'recommendationNumber',
  'generalInstructions', 'analysis', 'additionalNotes', 'followUp',
]

function errorMessage(error, locale) {
  const message = String(error instanceof Error ? error.message : '')
  const ru = locale === 'ru'
  if (/client|patient/i.test(message)) return ru ? 'Сначала выберите или заполните клиента.' : 'Select or enter a client first.'
  if (/amount|service|currency|payment/i.test(message)) return ru ? 'Проверьте данные счёта и сумму.' : 'Check the invoice service and amount.'
  if (/item|remedy|potency|granules|times per day|essence/i.test(message)) return ru ? 'Проверьте выбранные препараты и их параметры.' : 'Check the selected remedies and their details.'
  return ru ? 'Не удалось сформировать просмотр. Проверьте поля документа.' : 'Could not prepare the preview. Check the document fields.'
}

export async function POST(request) {
  if (!await requireAdminRequest()) return new NextResponse(null, { status: 404, headers: privateHeaders })
  const url = new URL(request.url)
  const kind = url.searchParams.get('kind') ?? 'recommendation'
  if (!['recommendation', 'payment'].includes(kind)) return new NextResponse(null, { status: 400, headers: privateHeaders })

  const origin = request.headers.get('origin')
  if (origin && origin !== url.origin) return new NextResponse(null, { status: 403, headers: privateHeaders })
  const declaredSize = Number(request.headers.get('content-length') || 0)
  if (declaredSize > 200000) return new NextResponse(null, { status: 413, headers: privateHeaders })

  let locale = 'en'
  try {
    const form = await request.formData()
    locale = form.get('languagePreference') === 'ru' ? 'ru' : 'en'
    const itemText = String(form.get('itemsJson') ?? '[]')
    if (itemText.length > 70000) throw new Error('Too many remedy items')
    const items = JSON.parse(itemText)
    if (!Array.isArray(items) || items.length > 60) throw new Error('Too many remedy items')
    const input = Object.fromEntries(inputKeys.map(key => [key, form.get(key) ?? undefined]))
    input.items = items
    input.consultationDate = input.dateIssued
    input.includeRecommendation = form.get('includeRecommendation') === 'on'
    input.includeInvoice = form.get('includeInvoice') === 'on'
    const document = await createConsultationDraftPreview(input, {
      kind,
      locale,
      store: getPrescriptionStore(),
    })
    const pdf = await (kind === 'payment' ? buildPaymentPdf : buildPrescriptionPdf)(
      document, locale, metadataBaseFor().origin,
    )
    const filename = kind === 'recommendation' ? 'client-report-preview.pdf'
      : document.paymentStatus === 'received' ? 'receipt-preview.pdf' : 'invoice-preview.pdf'
    return new NextResponse(pdf, {
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, locale) }, { status: 422, headers: privateHeaders })
  }
}
