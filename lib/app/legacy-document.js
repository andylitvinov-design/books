import { createHash } from 'node:crypto'
import { canonicalJSON } from '../assessments/contracts.js'
import { getClientPaymentDocument } from '../documents/payment.js'
import { getClientPrescription } from '../prescriptions/service.js'

export function legacyDocumentProjection(record, locale = 'en') {
  if (!record || record.status !== 'active' || !record.clientId) return undefined
  if (record.kind === 'report') return undefined
  if (record.kind === 'payment') return getClientPaymentDocument(record, locale)
  return getClientPrescription(record, locale)
}

export function legacyDocumentMeta(record) {
  const document = legacyDocumentProjection(record, 'en')
  if (!document) return undefined
  const kind =
    record.kind === 'payment'
      ? record.paymentStatus === 'received'
        ? 'receipt'
        : 'invoice'
      : 'recommendation'
  return {
    id: record.id,
    legacyClientId: record.clientId,
    kind,
    occurredOn: record.dateIssued,
    title:
      kind === 'receipt'
        ? 'Receipt'
        : kind === 'invoice'
          ? 'Invoice'
          : 'Homeopathic recommendation',
  }
}

export function legacyDocumentSourceHash(record) {
  const document = legacyDocumentProjection(record, 'en')
  if (!document) return undefined
  return (
    'sha256:' +
    createHash('sha256')
      .update(
        canonicalJSON({
          id: record.id,
          clientId: record.clientId,
          updatedAt: record.updatedAt || null,
          document,
        }),
      )
      .digest('hex')
  )
}
