import {redirect} from 'next/navigation'
import Link from 'next/link'
import {cookies} from 'next/headers'
import {uiLocaleCookie} from '@/lib/ui-locale'
import { FolderOpen, ChevronRight } from 'lucide-react'
import folders from '@/components/materials-audio-folders.module.css'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {PractitionerMaterialsCabinet} from '@/components/practitioner-materials-cabinet'
export const dynamic='force-dynamic'
export const metadata={title:'Materials · Holistic House',robots:{index:false,follow:false}}
export default async function MaterialsPage(){
  if(!await requireAdminRequest())redirect('/admin/login')
  const ru=(await cookies()).get(uiLocaleCookie)?.value==='ru'
  return <main className="prescription-admin-shell practitioner-materials-shell">
    <PrescriptionAdminHeader title={{ru:'Материалы',en:'Materials'}} description={{
      ru:'Материалы программ по папкам: аудио Рейки, фото, видео и учебные ссылки для клиентов.',
      en:'Organize course audio in folders alongside photos, videos and educational links.'
    }}/>
    <section className={folders.collection} aria-labelledby="materials-course-folders" data-materials-audio-folder>
      <h2 className={folders.sectionTitle} id="materials-course-folders">
        <FolderOpen aria-hidden="true" />{ru?'Аудио':'Audio'}
      </h2>
      <p className={folders.description}>{ru?'Папки учебных аудиоматериалов.':'Organize educational audio by course and lesson.'}</p>
      <div className={folders.folderGrid}>
        <Link href="/admin/materials/audio" className={folders.folderLink} data-master-audio-folder-link>
          <span className={folders.folderIcon}><FolderOpen aria-hidden="true"/></span>
          <span className={folders.folderName}>
            <strong>{ru?'Аудио':'Audio'}</strong>
            <small>{ru?'Reiki Practitioner · 5 уроков · записи RU / EN':'Reiki Practitioner · 5 lessons · RU / EN recordings'}</small>
          </span>
          <ChevronRight className={folders.arrow} aria-hidden="true"/>
        </Link>
      </div>
    </section>
    <PractitionerMaterialsCabinet/>
  </main>
}
