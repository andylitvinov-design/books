import { notFound } from 'next/navigation'

import { PrescriptionAccessGate } from '@/components/prescription-access-gate'
import { PaymentDocument } from '@/components/payment-document'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { PrescriptionDocument } from '@/components/prescription-document'
import { isSupportedLocale } from '@/data/remedies'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { authorizePrescriptionRequest } from '@/lib/prescriptions/session'

import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { appEnabled } from '@/lib/app/config'
import { SavePrivateDocumentControl } from '@/components/app/save-private-document-control'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Private recommendation', robots: { index: false, follow: false } }
}

export default async function ClientPrescriptionPage({ params, searchParams }) {
  const { locale, selector } = await params
  if (!isSupportedLocale(locale)) notFound()
  const store = getPrescriptionStore()
  if (!store || !(await store.findBySelector(selector))) notFound()
  const record = await authorizePrescriptionRequest(selector)
  const document = record?.kind === 'payment' ? getClientPaymentDocument(record, locale) : getClientPrescription(record, locale)
  if (!document) return <PrescriptionAccessGate locale={locale} selector={selector} />
  const { print } = await searchParams
  const cabinetAction = record.clientId && appEnabled()
    ? <SavePrivateDocumentControl selector={selector} locale={locale} appAvailable />
    : null
  if (record.kind === 'payment') return <PaymentDocument document={document} locale={locale} selector={selector} autoPrint={print === '1'} cabinetAction={cabinetAction} />
  return <PrescriptionDocument document={document} locale={locale} selector={selector} autoPrint={print === '1'} cabinetAction={cabinetAction} />
}
