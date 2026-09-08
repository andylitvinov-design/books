import { notFound } from 'next/navigation'

import { PrescriptionForm } from '@/components/prescription-form'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionRemedyOptions } from '@/lib/prescriptions/service'

import { createPrescriptionAction } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'New recommendation' }

export default async function NewPrescriptionPage() {
  if (!await requireAdminRequest()) notFound()
  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title="New prescription" description="Add the client, date, and remedies. The secure client link is ready immediately after save." /><PrescriptionForm action={createPrescriptionAction} remedies={getPrescriptionRemedyOptions()} submitLabel="Create prescription" /></main>
}
