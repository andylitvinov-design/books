import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { requireAdminRequest } from '@/lib/prescriptions/admin'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Practitioner Cabinet', robots: { index: false, follow: false } }

export default async function PractitionerCabinet() {
  if (!await requireAdminRequest()) redirect('/admin/login')

  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title="PRACTITIONER CABINET" description="Daily client and consultation work." /><section aria-label="Practitioner actions" className="practitioner-cabinet-actions"><Link href="/admin/consultations/new"><span>01</span><div><h2>New consultation</h2><p>Create a consultation and its client documents.</p></div></Link><Link href="/admin/clients"><span>02</span><div><h2>Clients</h2><p>Open client history and manage private cabinet access.</p></div></Link><Link href="/admin/clients/legacy"><span>03</span><div><h2>Unassigned legacy documents</h2><p>Assign only after an explicit owner decision.</p></div></Link></section></main>
}
