import { randomUUID } from 'node:crypto'
import { notFound } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getConsultationRemedyOptions } from '@/lib/remedies/registry'
import { ConsultationForm } from '@/components/consultation-form'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { createConsultationAction } from '../actions'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'New consultation', robots: { index: false, follow: false } }
export default async function NewConsultation() {
  if (!await requireAdminRequest()) notFound()
  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title="New consultation" description="Client and remedies → two ready documents." /><ConsultationForm action={createConsultationAction} remedies={getConsultationRemedyOptions()} requestId={randomUUID()} /></main>
}
