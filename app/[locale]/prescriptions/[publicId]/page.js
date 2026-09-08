import { notFound } from 'next/navigation'

import { PrescriptionDocument } from '@/components/prescription-document'
import { isSupportedLocale } from '@/data/remedies'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getPrescriptionStore } from '@/lib/prescriptions/store'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Private recommendation', robots: { index: false, follow: false } }
}

export default async function ClientPrescriptionPage({ params, searchParams }) {
  const { locale, publicId } = await params
  if (!isSupportedLocale(locale)) notFound()
  const store = getPrescriptionStore()
  const record = store ? await store.findByPublicId(publicId) : undefined
  const document = getClientPrescription(record, locale)
  if (!document) notFound()
  const { print } = await searchParams
  return <PrescriptionDocument document={document} locale={locale} autoPrint={print === '1'} />
}
