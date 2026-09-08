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
  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title="New prescription" description="Client details, remedies, and instructions — all in one place." /><PrescriptionForm action={createPrescriptionAction} remedies={getPrescriptionRemedyOptions()} /></main>
}
