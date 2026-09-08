import { mkdirSync, writeFileSync } from 'node:fs'
import { createPaymentDocument, getClientPaymentDocument } from '../lib/documents/payment.js'
import { createPrescription, getClientPrescription } from '../lib/prescriptions/service.js'
import { buildPaymentPdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'
const directory = 'output/pdf'
mkdirSync(directory, { recursive: true })
const now = '2026-09-08T12:00:00.000Z'
const payment = { patientName: 'Alex Example - SYNTHETIC', dateOfService: '2026-09-04', dateIssued: '2026-09-08', amount: '150.00', currency: 'CAD', service: 'Individual consultation', consultations: 1, status: 'active', documentNumber: 'TEST-2026-001' }
for (const [name, paymentStatus] of [['receipt', 'received'], ['invoice', 'unpaid']]) {
  const record = createPaymentDocument({ ...payment, paymentStatus }, now)
  writeFileSync(`${directory}/synthetic-${name}.pdf`, buildPaymentPdf(getClientPaymentDocument(record, 'en'), 'en', 'https://psialchemy.vercel.app'))
  writeFileSync(`${directory}/synthetic-${name}-ru.pdf`, buildPaymentPdf(getClientPaymentDocument({ ...record, patientName: 'Алексей Пример — ТЕСТ' }, 'ru'), 'ru', 'https://psialchemy.vercel.app'))
}
const recommendation = createPrescription({ patientName: 'Alex Example - SYNTHETIC', practitionerName: 'Andrii Litvinov', dateIssued: '2026-09-08', recommendationNumber: 'HR-TEST-001', status: 'active', items: [{ remedySlug: 'arsenicum-album', potency: 'TEST potency', purpose: 'Synthetic practitioner-entered purpose', dosage: 'TEST dosage - not clinical guidance', frequency: 'TEST frequency', duration: 'TEST duration', sequence: 'TEST stage', instructions: 'Synthetic individual instructions.' }], generalInstructions: 'Synthetic practitioner-entered general recommendations.', followUp: 'Synthetic follow-up guidance.' }, now)
for (const locale of ['en', 'ru']) {
  const record = locale === 'ru' ? { ...recommendation, patientName: 'Алексей Пример — ТЕСТ', generalInstructions: 'Тестовые рекомендации. Только синтетический образец.' } : recommendation
  writeFileSync(`${directory}/synthetic-recommendation${locale === 'ru' ? '-ru' : ''}.pdf`, buildPrescriptionPdf(getClientPrescription(record, locale), locale, 'https://psialchemy.vercel.app'))
}
const long = { ...recommendation, items: Array.from({ length: 24 }, (_, i) => ({ ...recommendation.items[0], instructions: `Synthetic item ${i + 1}. ` + 'Long practitioner-entered test instruction. '.repeat(12) })) }
writeFileSync(`${directory}/synthetic-recommendation-long.pdf`, buildPrescriptionPdf(getClientPrescription(long, 'ru'), 'ru', 'https://psialchemy.vercel.app'))
console.log('Generated seven synthetic PDFs in output/pdf; no patient data.')
