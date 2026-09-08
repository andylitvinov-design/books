import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PaymentDocument } from '@/components/payment-document'
import { PrescriptionDocument } from '@/components/prescription-document'
import { getDocumentSample, samplesEnabled, sampleKinds } from '@/lib/documents/samples'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Synthetic document review', robots: { index: false, follow: false } }
export default async function DocumentSamplePage({ params, searchParams }) {
  if (!samplesEnabled()) notFound()
  const { kind } = await params
  const { locale = 'en' } = await searchParams
  const document = getDocumentSample(kind, locale)
  if (!document) notFound()
  const Document = kind === 'recommendation' ? PrescriptionDocument : PaymentDocument
  return <><nav className="prescription-toolbar prescription-admin-shell" aria-label="Synthetic document review">
    <span>Synthetic sample</span>
    {sampleKinds.map((name) => <Link href={`/document-preview/${name}?locale=${locale}`} key={name}>{name}</Link>)}
    <Link href={`/document-preview/${kind}?locale=${locale === 'en' ? 'ru' : 'en'}`}>{locale === 'en' ? 'RU' : 'EN'}</Link>
    <a href={`/document-preview/${kind}/pdf?locale=${locale}`} download>Download PDF</a>
  </nav><Document document={document} locale={locale} admin /></>
}
