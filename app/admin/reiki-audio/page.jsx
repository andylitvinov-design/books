import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false, noarchive: true } }
export default async function LegacyReikiAudioPage() {
  if (!await requireAdminRequest()) redirect('/admin/login')
  redirect('/admin/materials/courses/reiki-practitioner')
}
