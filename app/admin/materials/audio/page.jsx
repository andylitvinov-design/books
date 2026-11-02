import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false, noarchive: true } }

// Preserve existing bookmarks with the course catalog as the single editor entry.
export default async function LegacyAudioMaterialsPage() {
  if (!await requireAdminRequest()) redirect('/admin/login')
  redirect('/admin/materials/courses')
}
