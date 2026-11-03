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
import { ReportInvitationGate } from '@/components/app/report-invitation-gate'
import { ReportFinalActions } from '@/components/report-final-actions'

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
  const viewer = record.kind === 'payment'
    ? <PaymentDocument document={document} locale={locale} selector={selector} autoPrint={print === '1'} cabinetAction={cabinetAction} />
    : <PrescriptionDocument document={document} locale={locale} selector={selector} autoPrint={print === '1'} cabinetAction={cabinetAction} narration={print === '1' ? null : {scope:'legacy-document',selector}} />
  // Print is an already-authorized, explicit action from the document toolbar.
  if (print === '1') return viewer
  return (
    <ReportInvitationGate
      locale={locale}
      kind="document"
      saveAction={cabinetAction}
      viewPdfHref={record.kind==='payment'?`/api/prescriptions/${selector}/pdf?locale=${locale}&preview=1`:null}
    >
      {viewer}
      {record.kind!=='payment'&&<ReportFinalActions locale={locale} mode="legacy"
        saveControl={record.clientId&&appEnabled()?
          <SavePrivateDocumentControl selector={selector} locale={locale} appAvailable compact/>:null}/>}
    </ReportInvitationGate>
  )
}
