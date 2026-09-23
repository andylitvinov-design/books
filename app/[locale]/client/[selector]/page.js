import { notFound } from 'next/navigation'
import { PrescriptionAccessGate } from '@/components/prescription-access-gate'
import { ClientCabinet } from '@/components/client-cabinet'
import { authorizeCabinetRequest } from '@/lib/clients/session'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Holistic House · Private cabinet', robots: { index: false, follow: false } }
export default async function CabinetPage({ params }) {
  const { locale, selector } = await params
  if (!['en', 'ru'].includes(locale)) notFound()
  const access = await authorizeCabinetRequest(selector)
  if (!access) return <PrescriptionAccessGate locale={locale} selector={selector} cabinet />
  const records = await access.store.listClientDocuments(access.client.id)
  const ru = locale === 'ru'
  const documents = records.filter(r => r.status === 'active' && r.clientId === access.client.id).map(r => ({ id: r.id, date: r.dateIssued, consultationId: r.consultationId ?? r.id, type: r.kind === 'payment' ? 'payment' : r.kind === 'report' ? 'report' : 'recommendation', title: r.kind === 'payment' ? `${r.paymentStatus === 'received' ? (ru ? 'Квитанция' : 'Receipt') : (ru ? 'Счёт' : 'Invoice')} · ${r.currency} ${(r.amount / 100).toFixed(2)}` : r.kind === 'report' ? (ru ? 'Отчёт' : 'Report') : r.recommendationType === 'bach' ? (ru ? 'Рекомендация по эссенциям Баха' : 'Bach Flower Essence Recommendation') : (ru ? 'Гомеопатическая рекомендация' : 'Homeopathic Recommendation') }))
  return <ClientCabinet name={access.client.fullName} locale={locale} selector={selector} documents={documents} />
}
