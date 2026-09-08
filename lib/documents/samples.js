import { createPaymentDocument, getClientPaymentDocument } from './payment.js'
import { createPrescription, getClientPrescription } from '../prescriptions/service.js'
export const sampleKinds = ['receipt', 'invoice', 'recommendation']
export function samplesEnabled(environment = process.env) { return environment.VERCEL_ENV === 'preview' || (environment.NODE_ENV === 'development' && !environment.VERCEL_ENV) }
export function getDocumentSample(kind, locale = 'en') {
  if (!sampleKinds.includes(kind) || !['en', 'ru'].includes(locale)) return undefined
  const patientName = locale === 'ru' ? 'Алексей Пример — ТЕСТ' : 'Alex Example - SYNTHETIC'
  const now = '2026-09-08T12:00:00.000Z'
  if (kind !== 'recommendation') return getClientPaymentDocument(createPaymentDocument({ patientName, dateOfService: '2026-09-04', dateIssued: '2026-09-08', amount: '150.00', currency: 'CAD', service: 'Individual consultation', consultations: 1, status: 'active', documentNumber: 'TEST-2026-001', paymentStatus: kind === 'receipt' ? 'received' : 'unpaid' }, now), locale)
  return getClientPrescription(createPrescription({ patientName, practitionerName: 'Andrii Litvinov', dateIssued: '2026-09-08', recommendationNumber: 'HR-TEST-001', status: 'active', items: [{ remedySlug: 'arsenicum-album', potency: 'TEST potency', purpose: 'Synthetic practitioner-entered purpose', dosage: 'TEST dosage - not clinical guidance', frequency: 'TEST frequency', duration: 'TEST duration', sequence: 'TEST stage', instructions: 'Synthetic individual instructions.' }], generalInstructions: locale === 'ru' ? 'Тестовые рекомендации. Только синтетический образец.' : 'Synthetic practitioner-entered general recommendations.', followUp: 'Synthetic follow-up guidance.' }, now), locale)
}
