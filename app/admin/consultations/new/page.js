import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { randomUUID } from 'node:crypto'
import { notFound } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getConsultationRemedyOptions } from '@/lib/remedies/registry'
import { ConsultationForm } from '@/components/consultation-form'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { createConsultationAction } from '../actions'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'New consultation', robots: { index: false, follow: false } }
export default async function NewConsultation({ searchParams }) {
  if (!await requireAdminRequest()) notFound()
  const store = getPrescriptionStore()
  const clients = store ? await store.listClients() : []
  const options = await Promise.all(clients.filter(c => c.status === 'active').map(async c => { const docs = await store.listClientDocuments(c.id); return { id: c.id, fullName: c.fullName, preferredLocale: c.preferredLocale, consultationCount: new Set(docs.map(d => d.consultationId ?? d.id)).size, lastConsultation: docs.map(d => d.dateIssued).sort().at(-1) } }))
  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title={{ ru: "Новая консультация", en: "New consultation" }} description={{ ru: "Клиент → препараты → готовые документы.", en: "Client → remedies → ready documents." }} /><ConsultationForm clients={options} selectedClientId={(await searchParams).clientId} action={createConsultationAction} remedies={getConsultationRemedyOptions()} requestId={randomUUID()} /></main>
}
