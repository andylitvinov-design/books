import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdminDocumentActions } from '@/components/admin-document-panels'
import { PaymentDocument } from '@/components/payment-document'
import { PrescriptionDocument } from '@/components/prescription-document'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Document preview' }

export default async function AdminDocumentPreview({ params, searchParams }) {
  if (!await requireAdminRequest()) notFound()
  const { id } = await params
  const query = await searchParams
  const locale = query.locale ?? 'en'
  if (!['en', 'ru'].includes(locale)) notFound()
  const store = getPrescriptionStore()
  const record = store ? await store.findById(id) : undefined
  if (!record) notFound()
  const payment = record.kind === 'payment'
  const document = payment ? getClientPaymentDocument({ ...record, status: 'active' }, locale) : getClientPrescription({ ...record, status: 'active' }, locale)
  if (!document) notFound()
  const Document = payment ? PaymentDocument : PrescriptionDocument
  return <>
    <nav className="prescription-admin-shell prescription-toolbar" aria-label="Admin document actions">
      <Link href={`/admin/${payment ? 'payments' : 'prescriptions'}/${record.id}`}>Back to document</Link>
      <Link href={`/admin/documents/${record.id}?locale=${locale === 'en' ? 'ru' : 'en'}`}>{locale === 'en' ? 'RU' : 'EN'}</Link>
      <AdminDocumentActions record={record} locale={locale} />
    </nav>
    <Document document={document} locale={locale} admin autoPrint={query.print === '1'} />
  </>
}
