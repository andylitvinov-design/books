import { NextResponse } from 'next/server'

import { metadataBaseFor } from '@/data/site-metadata'
import { createConsultationDraftPreview } from '@/lib/consultations/draft-preview'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { buildPaymentPdf, buildPrescriptionPdf } from '@/lib/prescriptions/pdf'
import { reportPdfFilename } from '@/lib/documents/report-filename'
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
  'generalInstructions', 'analysis', 'additionalNotes', 'followUp', 'followUpDate', 'patientDob', 'internalNotes', 'daoResourceScore',
]

function errorMessage(error, locale) {
  const message = String(error instanceof Error ? error.message : '')
  const ru = locale === 'ru'
  if (/INVALID_DAO_RESOURCE_SCORE/.test(message)) return ru ? 'Укажите балл У-син от 0 до 10 с одним знаком после запятой.' : 'Enter a Wu Xing score from 0 to 10 with at most one decimal place.'
  if (/language/i.test(message)) return ru ? 'Выберите язык отчёта: английский или русский.' : 'Choose the report language: English or Russian.'
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
    const selectedLanguage = form.get('languagePreference')
    if (!['en', 'ru'].includes(selectedLanguage)) throw new Error('Choose report language')
    locale = selectedLanguage
    const itemText = String(form.get('itemsJson') ?? '[]')
    if (itemText.length > 70000) throw new Error('Too many remedy items')
    const items = JSON.parse(itemText)
    if (!Array.isArray(items) || items.length > 60) throw new Error('Too many remedy items')
    const input = Object.fromEntries(inputKeys.map(key => [key, form.get(key) ?? undefined]))
    input.items = items
    const testsJson = String(form.get('recommendedTestsJson') ?? '[]')
    if (testsJson.length > 4000) throw new Error('Invalid recommended tests')
    input.recommendedTestKeys = JSON.parse(testsJson)
    input.consultationDate = input.dateIssued
    input.includeRecommendation = form.get('includeRecommendation') === 'on'
    input.includeInvoice = form.get('includeInvoice') === 'on'
    input.includeDistanceHomeopathy = form.get('includeDistanceHomeopathy') === 'on'
    const document = await createConsultationDraftPreview(input, {
      kind,
      locale,
      store: getPrescriptionStore(),
    })
    const pdf = await (kind === 'payment' ? buildPaymentPdf : buildPrescriptionPdf)(
      document, locale, metadataBaseFor().origin,
    )
    const filename = kind === 'recommendation' ? reportPdfFilename(document, { preview: true })
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
