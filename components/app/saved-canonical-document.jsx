'use client'

// The Google Cabinet must display the SAME canonical document as the
// practitioner's approved private viewer, not a lossy "saved item" summary.
// The server already projects only the account-authorized client data.
import { PaymentDocument } from '@/components/payment-document'
import { PrescriptionDocument } from '@/components/prescription-document'

export function SavedCanonicalDocument({ document, kind, locale }) {
  return kind === 'invoice' || kind === 'receipt'
    ? <PaymentDocument document={document} locale={locale} embedded />
    : <PrescriptionDocument document={document} locale={locale} embedded />
}
