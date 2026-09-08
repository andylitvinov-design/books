import Link from 'next/link'

import { markPaymentReceivedAction, revokePaymentAccessAction, reactivatePaymentAction } from '@/app/admin/payments/actions'
import { PrescriptionLinkIssuer } from './prescription-link-issuer'

export function AdminDocumentActions({ record, locale = 'en' }) {
  return <div className="document-panel-actions">
    <Link href={`/admin/documents/${record.id}?locale=${locale}`}>Preview / Open</Link>
    <a href={`/admin/api/documents/${record.id}/pdf?locale=${locale}`} download>Download PDF</a>
    <Link href={`/admin/documents/${record.id}?locale=${locale}&print=1`}>Print</Link>
    {record.status === 'active' ? <div><span>Copy client link</span><PrescriptionLinkIssuer recordId={record.id} hasAccess={Boolean(record.access)} /></div> : <p>Activate the document to issue a private client link.</p>}
  </div>
}

export function PaymentPanel({ payment, consultationId }) {
  const query = consultationId ? `consultation=${encodeURIComponent(consultationId)}&` : ''
  return <section className="admin-document-panel" aria-labelledby="payment-heading">
    <h2 id="payment-heading">Payment document</h2>
    {payment ? <>
      <p>{payment.paymentStatus === 'received' ? 'Receipt — payment received' : 'Invoice — payment not received'}</p>
      <Link href={`/admin/payments/${payment.id}#edit-payment`}>Edit payment document</Link>
      {payment.paymentStatus !== 'received' && payment.status === 'active' && <form action={markPaymentReceivedAction.bind(null, payment.id)}><button type="submit">Mark Paid / Create Receipt</button></form>}
      <AdminDocumentActions record={payment} />
      {payment.status === 'active'
        ? <form action={revokePaymentAccessAction.bind(null, payment.id)}><button type="submit">Revoke client access</button></form>
        : <form action={reactivatePaymentAction.bind(null, payment.id)}><p>Client access is disabled. Reactivate, then issue a new private link.</p><button type="submit">Reactivate document</button></form>}
    </> : <div className="document-panel-actions">
      <Link href={`/admin/payments/new?${query}paymentStatus=unpaid`}>Create Invoice</Link>
      <Link href={`/admin/payments/new?${query}paymentStatus=received`}>Mark Paid / Create Receipt</Link>
    </div>}
  </section>
}

export function AdminDocumentPanels({ prescription, payment }) {
  return <div className="admin-document-panels">
    <PaymentPanel payment={payment} consultationId={prescription.id} />
    <section className="admin-document-panel" aria-labelledby="recommendation-heading">
      <h2 id="recommendation-heading">Recommendation</h2>
      <p>{prescription.status === 'active' ? 'Ready to share' : 'Saved document'}</p>
      <a href="#edit-recommendation">Edit</a>
      <AdminDocumentActions record={prescription} />
    </section>
  </div>
}
