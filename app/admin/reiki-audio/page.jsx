import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { uiLocaleCookie } from '@/lib/ui-locale'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import AdminReikiAudio from '@/components/admin-reiki-audio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Reiki Practitioner · Audio introductions — Holistic House',
  robots: { index: false, follow: false, noarchive: true },
}

export default async function ReikiAudioPage() {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const locale = (await cookies()).get(uiLocaleCookie)?.value === 'ru' ? 'ru' : 'en'
  return <main className="prescription-admin-shell" data-reiki-intro-audio-owner>
    <PrescriptionAdminHeader
      title={{ en: 'Reiki · Intro audio', ru: 'Рейки · Аудиовведения' }}
      description={{
        en: 'Record, upload, preview and personally publish short audio introductions before each meditation.',
        ru: 'Загружайте и прослушивайте ваши аудиовведения перед медитациями и публикуйте их отдельно.',
      }}
    />
    <AdminReikiAudio initialLocale={locale} />
  </main>
}
