import { redirect } from 'next/navigation'
 import { requireAdminRequest } from '@/lib/prescriptions/admin'
  
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Reiki Practitioner · Audio introductions — Holistic House',
  robots: { index: false, follow: false, noarchive: true },
}

export default async function ReikiAudioPage() {
  if (!await requireAdminRequest()) redirect('/admin/login')
  redirect('/admin/materials/audio/reiki-practitioner')
}
