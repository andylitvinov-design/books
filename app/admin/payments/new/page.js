import { notFound, redirect } from 'next/navigation'

import { PaymentForm } from '@/components/payment-form'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { createPaymentAction } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'New payment document' }

export default async function NewPaymentPage({ searchParams }) {
  if (!await requireAdminRequest()) notFound()
  const query = await searchParams
  const consultationId = typeof query.consultation === 'string' ? query.consultation : undefined
  const store = getPrescriptionStore()
  const consultation = consultationId && store ? await store.findById(consultationId) : undefined
  if (consultationId && (!consultation || consultation.kind === 'payment')) notFound()
  if (consultation?.paymentDocumentId) redirect(`/admin/payments/${consultation.paymentDocumentId}`)
  return <main className="prescription-admin-shell">
    <h1>New payment document</h1>
    <p>Save an invoice for an unpaid service or a receipt for a payment already received.</p>
    <PaymentForm action={createPaymentAction.bind(null, consultationId)} patientName={consultation?.patientName} dateOfService={consultation?.dateIssued} paymentStatus={query.paymentStatus === 'received' ? 'received' : 'unpaid'} />
  </main>
}
