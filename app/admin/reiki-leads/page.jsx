import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import AdminReikiLeads from '@/components/admin-reiki-leads'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = {
  title: 'Reiki Practitioner · CRM Leads · Holistic House',
  robots: { index: false, follow: false, noarchive: true },
}

export default async function ReikiLeadsPage() {
  if (!await requireAdminRequest()) redirect('/admin/login')
  return <AdminReikiLeads/>
}
