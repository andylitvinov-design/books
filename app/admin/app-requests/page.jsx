import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import AppInbox from '@/components/app/app-inbox'
import '../../[locale]/app/[[...path]]/workspace.css'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = {
  title: 'App requests | Holistic House',
  robots: { index: false, follow: false },
}
export default async function AppRequestsPage() {
  if (!(await requireAdminRequest())) redirect('/admin/login')
  return <AppInbox />
}
