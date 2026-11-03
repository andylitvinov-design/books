import { notFound } from 'next/navigation'
import { authorizeCabinetRequest } from '@/lib/clients/session'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { PrescriptionDocument } from '@/components/prescription-document'
import { PaymentDocument } from '@/components/payment-document'
import { SavePrivateDocumentControl } from '@/components/app/save-private-document-control'
import { appEnabled } from '@/lib/app/config'
import { ReportFinalActions } from '@/components/report-final-actions'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Private document', robots: { index: false, follow: false } }
export default async function CabinetDocument({ params }) {
  const { locale, selector, id } = await params
  if (!['en', 'ru'].includes(locale)) notFound()
  const access = await authorizeCabinetRequest(selector, id)
  if (!access || access.record.kind === 'report') notFound()
  const payment = access.record.kind === 'payment'
  const document = payment ? getClientPaymentDocument(access.record, locale) : getClientPrescription(access.record, locale)
  if (!document) notFound()
  return <><nav className="prescription-toolbar"><a href={`/${locale}/client/${selector}`}>{locale === 'ru' ? 'Кабинет' : 'Cabinet'}</a><a href={`/${locale === 'ru' ? 'en' : 'ru'}/client/${selector}/documents/${id}`}>{locale === 'ru' ? 'EN' : 'RU'}</a><a href={`/api/client/${selector}/documents/${id}/pdf?locale=${locale}`} download>PDF</a></nav>{appEnabled() && <section className="client-document-save-callout" aria-label={locale === 'ru' ? 'Сохранение документа в Google-кабинете' : 'Save document to Google Cabinet'}><strong>{locale === 'ru' ? 'Сохранить этот документ в личном кабинете' : 'Keep this document in your personal Cabinet'}</strong><SavePrivateDocumentControl selector={selector} documentId={id} locale={locale} appAvailable /></section>}{payment ? <PaymentDocument document={document} locale={locale} /> : <PrescriptionDocument document={document} locale={locale} narration={{scope:'cabinet-document',selector,id}} />}
    {!payment&&<ReportFinalActions locale={locale} mode="legacy"
      saveControl={appEnabled()?
        <SavePrivateDocumentControl selector={selector} documentId={id} locale={locale} appAvailable compact/>:null}/>}</>
}
