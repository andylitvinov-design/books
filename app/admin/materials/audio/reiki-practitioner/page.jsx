import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { REIKI_INTRO_LESSONS } from '@/lib/academy/reiki-intro-audio-model'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false, noarchive: true } }

// Existing saved lesson/language links continue to open the same audio editor.
export default async function LegacyReikiAudioPage({searchParams}) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const input = await searchParams
  const query = new URLSearchParams()
  if (REIKI_INTRO_LESSONS.includes(input?.lesson)) query.set('lesson', input.lesson)
  if (['ru','en'].includes(input?.lang)) query.set('lang', input.lang)
  const suffix = query.size ? '?'+query.toString() : ''
  redirect('/admin/materials/courses/reiki-practitioner'+suffix)
}
