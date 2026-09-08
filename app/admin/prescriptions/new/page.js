import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PrescriptionForm } from '@/components/prescription-form'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionRemedyOptions } from '@/lib/prescriptions/service'

import { createPrescriptionAction } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'New recommendation' }

export default async function NewPrescriptionPage() {
  if (!await requireAdminRequest()) notFound()
  return <main className="prescription-admin-shell"><h1>New recommendation</h1><p><Link href="/admin/payments/new">Create a payment document</Link></p><PrescriptionForm action={createPrescriptionAction} remedies={getPrescriptionRemedyOptions()} /></main>
}
