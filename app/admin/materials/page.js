import {redirect} from 'next/navigation'
import Link from 'next/link'
import {cookies} from 'next/headers'
import {uiLocaleCookie} from '@/lib/ui-locale'
import { FolderOpen, ChevronRight, FileText, Leaf, BookOpen, Headphones, Film } from 'lucide-react'
import folders from '@/components/materials-audio-folders.module.css'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {PractitionerMaterialsCabinet} from '@/components/practitioner-materials-cabinet'
export const dynamic='force-dynamic'
export const metadata={title:'Materials · Holistic House',robots:{index:false,follow:false}}
export default async function MaterialsPage(){
  if(!await requireAdminRequest())redirect('/admin/login')
  const ru=(await cookies()).get(uiLocaleCookie)?.value==='ru'
  const workspace='/' +(ru?'ru':'en')+ '/app/practice?panel=materials&materialTab='
  return <main className="prescription-admin-shell practitioner-materials-shell" data-admin-v4-materials>
    <PrescriptionAdminHeader title={{ru:'Материалы',en:'Materials'}} description={{
      ru:'Курсы и аудиомедитации мастера, а также фото, видео и ссылки для клиентских отчётов.',
      en:'Manage course meditations alongside private report materials, photos and videos.'
    }}/>
    <nav className="hh-admin-material-v4-tabs" aria-label={ru?'Тип материалов':'Material category'} data-admin-material-v4-tabs>
      <Link href={workspace+'articles'}><FileText aria-hidden="true"/>{ru?'Статьи':'Articles'}</Link>
      <Link href={workspace+'services'}><Leaf aria-hidden="true"/>{ru?'Услуги':'Services'}</Link>
      <Link href="/admin/materials/courses"><BookOpen aria-hidden="true"/>{ru?'Курсы':'Courses'}</Link>
      <Link href="/admin/materials/courses/reiki-practitioner"><Headphones aria-hidden="true"/>{ru?'Аудио':'Audio'}</Link>
      <Link href={workspace+'videos'}><Film aria-hidden="true"/>{ru?'Видео':'Video'}</Link>
    </nav>
    <section className={folders.collection} aria-labelledby="materials-course-folders" data-materials-course-folder>
      <h2 className={folders.sectionTitle} id="materials-course-folders">
        <FolderOpen aria-hidden="true" />{ru?'Курсы':'Courses'}
      </h2>
      <p className={folders.description}>{ru?'Выберите курс мастера. Записи хранятся по урокам и языкам.':'Choose a course. Audio recordings are organized by lesson and language.'}</p>
      <div className={folders.folderGrid}>
        <Link href="/admin/materials/courses" className={folders.folderLink} data-master-audio-folder-link>
          <span className={folders.folderIcon}><FolderOpen aria-hidden="true"/></span>
          <span className={folders.folderName}>
            <strong>{ru?'Курсы мастера':'Master courses'}</strong>
            <small>{ru?'Reiki Practitioner · 5 уроков · записи RU / EN':'Reiki Practitioner · 5 lessons · RU / EN recordings'}</small>
          </span>
          <ChevronRight className={folders.arrow} aria-hidden="true"/>
        </Link>
      </div>
    </section>
    <details className="hh-admin-private-materials-v4" data-admin-private-report-library>
      <summary><FolderOpen aria-hidden="true"/><span>{ru?'Фото, видео и YouTube для клиентских отчётов':'Private photos, videos and YouTube for client reports'}</span><ChevronRight aria-hidden="true"/></summary>
      <PractitionerMaterialsCabinet/>
    </details>
  </main>
}
