import { notFound } from 'next/navigation'
import { authorizeCabinetRequest } from '@/lib/clients/session'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { PrescriptionDocument } from '@/components/prescription-document'
import { PaymentDocument } from '@/components/payment-document'
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
  return <><nav className="prescription-toolbar"><a href={`/${locale}/client/${selector}`}>{locale === 'ru' ? 'Кабинет' : 'Cabinet'}</a><a href={`/${locale === 'ru' ? 'en' : 'ru'}/client/${selector}/documents/${id}`}>{locale === 'ru' ? 'EN' : 'RU'}</a><a href={`/api/client/${selector}/documents/${id}/pdf?locale=${locale}`} download>PDF</a></nav>{payment ? <PaymentDocument document={document} locale={locale} /> : <PrescriptionDocument document={document} locale={locale} />}</>
}
