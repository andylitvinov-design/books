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
  title: 'Reiki Practitioner · Courses · Holistic House',
  robots: { index: false, follow: false, noarchive: true },
}

export default async function MasterReikiCourseMaterials({searchParams}) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const query = await searchParams
  const lang = (await cookies()).get(uiLocaleCookie)?.value
  const language = ['ru','en'].includes(query?.lang) ? query.lang : lang === 'ru' ? 'ru' : 'en'
  const lesson = REIKI_INTRO_LESSONS.includes(query?.lesson) ? query.lesson : 'flight'
  return <main className="prescription-admin-shell" data-master-reiki-lesson-audio-folders>
    <PrescriptionAdminHeader
      title={{ru:'Материалы / Курсы / Практик Рейки',en:'Materials / Courses / Reiki Practitioner'}}
      description={{
        ru:'Выберите урок и язык. Загрузите несколько аудиомедитаций приватно, прослушайте и вручную назначьте запись на слайд.',
        en:'Choose a lesson and language. Upload meditations privately, listen first and explicitly assign a recording to its slide.',
      }}
    />
    <AdminReikiAudio initialLocale={language} initialLesson={lesson} initialMode={query?.mode==='record'?'record':'upload'}/>
  </main>
}
