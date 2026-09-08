import { notFound } from 'next/navigation'

import { PaymentPanel } from '@/components/admin-document-panels'
import { PaymentForm } from '@/components/payment-form'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { updatePaymentAction } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Payment document' }

export default async function PaymentPage({ params }) {
  if (!await requireAdminRequest()) notFound()
  const { id } = await params
  const store = getPrescriptionStore()
  const payment = store ? await store.findById(id) : undefined
  if (!payment || payment.kind !== 'payment') notFound()
  return <main className="prescription-admin-shell">
    <h1>Payment document saved</h1>
    <PaymentPanel payment={payment} />
    <section id="edit-payment"><h2>Edit payment document</h2><PaymentForm action={updatePaymentAction.bind(null, payment.id)} payment={payment} /></section>
  </main>
}
