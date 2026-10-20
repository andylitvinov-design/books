import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { uiLocaleCookie } from '@/lib/ui-locale'
import { REIKI_INTRO_LESSONS } from '@/lib/academy/reiki-intro-audio-model'
import AdminReikiAudio from '@/components/admin-reiki-audio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Audio / Reiki Practitioner · Materials · Holistic House',
  robots: { index: false, follow: false, noarchive: true },
}

export default async function ReikiAudioMaterialsPage({searchParams}) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const query = await searchParams
  const storedLanguage = (await cookies()).get(uiLocaleCookie)?.value === 'ru' ? 'ru' : 'en'
  const language = ['ru','en'].includes(query?.lang) ? query.lang : storedLanguage
  const lesson = REIKI_INTRO_LESSONS.includes(query?.lesson) ? query.lesson : 'flight'
  return <main className="prescription-admin-shell" data-master-reiki-lesson-audio-folders>
    <PrescriptionAdminHeader
      title={{ru:'Материалы / Аудио / Практик Рейки',en:'Materials / Audio / Reiki Practitioner'}}
      description={{
        ru:'Выберите урок и язык записи. Внутри папки можно загрузить несколько файлов и назначить один для прослушивания учеником.',
        en:'Select a lesson folder and recording language. Upload multiple files and choose one for the learner slide.',
      }}
    />
    <AdminReikiAudio initialLocale={language} initialLesson={lesson}/>
  </main>
}
