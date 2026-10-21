import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { BookOpen, ChevronRight, Headphones } from 'lucide-react'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { uiLocaleCookie } from '@/lib/ui-locale'
import styles from '@/components/materials-audio-folders.module.css'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Courses · Materials · Holistic House',
  robots: { index: false, follow: false, noarchive: true },
}

export default async function MasterMaterialCoursesPage() {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const lang = (await cookies()).get(uiLocaleCookie)?.value
  const ru = lang === 'ru', es = lang === 'es'
  const t = ru ? {
    title:'Материалы / Курсы', sub:'Выберите учебную программу мастера.',
    courses:'Курсы мастера', lesson:'5 уроков · аудиомедитации RU / EN',
    desc:'Выбирайте урок и язык, загружайте записи в приватную папку и публикуйте их только после прослушивания.',
    course:'Практик Рейки',
  } : es ? {
    title:'Materiales / Cursos', sub:'Selecciona un curso del maestro.',
    courses:'Cursos del maestro', lesson:'5 lecciones · audio RU / EN',
    desc:'Elige lección e idioma; guarda grabaciones privadas y publícalas solo después de revisarlas.',
    course:'Practicante de Reiki',
  } : {
    title:'Materials / Courses', sub:'Choose a practitioner course.',
    courses:'Master courses', lesson:'5 lessons · RU / EN audio meditations',
    desc:'Choose a lesson and language, save recordings privately, then publish only after listening.',
    course:'Reiki Practitioner',
  }
  return <main className="prescription-admin-shell" data-master-material-courses>
    <PrescriptionAdminHeader title={t.title} description={t.sub}/>
    <section className={styles.collection}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/admin/materials">{ru?'Материалы':es?'Materiales':'Materials'}</Link>
        <ChevronRight aria-hidden="true"/><span>{ru?'Курсы':es?'Cursos':'Courses'}</span>
      </nav>
      <h2 className={styles.sectionTitle}><BookOpen aria-hidden="true"/>{t.courses}</h2>
      <p className={styles.description}>{t.desc}</p>
      <div className={styles.folderGrid}>
        <Link className={styles.folderLink} href="/admin/materials/courses/reiki-practitioner"
          data-master-course-reiki-practitioner>
          <span className={styles.folderIcon}><Headphones aria-hidden="true"/></span>
          <span className={styles.folderName}><strong>{t.course}</strong><small>{t.lesson}</small></span>
          <ChevronRight className={styles.arrow} aria-hidden="true"/>
        </Link>
      </div>
    </section>
  </main>
}
