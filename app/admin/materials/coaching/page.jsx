import Link from 'next/link'
import {redirect} from 'next/navigation'
import {cookies} from 'next/headers'
import {FolderOpen,ChevronRight,Headphones} from 'lucide-react'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {uiLocaleCookie} from '@/lib/ui-locale'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import styles from '@/components/materials-audio-folders.module.css'

export const dynamic='force-dynamic'
export const metadata={title:'Coaching · My Materials · Holistic House',robots:{index:false,follow:false,noarchive:true}}
const titles={
 egyptian:{en:'Egyptian planning',ru:'Египетский',es:'Planificación egipcia'},
 greek:{en:'Greek coaching',ru:'Греческий',es:'Coaching griego'},
}
export default async function CoachingMaterials(){
 if(!await requireAdminRequest())redirect('/admin/login')
 const language=(await cookies()).get(uiLocaleCookie)?.value
 const lang=['ru','es'].includes(language)?language:'en'
 return <main className="prescription-admin-shell" data-owner-coaching-folders>
  <PrescriptionAdminHeader title={{en:'My Materials / Coaching',ru:'Мои материалы / Коучинг'}}
   description={{en:'Your own audio lessons, organized by tradition, step and language.',ru:'Ваши авторские аудиозаписи по традициям, вопросам и языкам.'}}/>
  <section className={styles.collection}>
   <nav className={styles.breadcrumb}><Link href="/admin/materials">{lang==='ru'?'Мои материалы':'My Materials'}</Link><ChevronRight aria-hidden="true"/><span>{lang==='ru'?'Коучинг':'Coaching'}</span></nav>
   <h2 className={styles.sectionTitle}><FolderOpen aria-hidden="true"/>{lang==='ru'?'Папки коучинга':'Coaching folders'}</h2>
   <p className={styles.description}>{lang==='ru'?'Запишите аудио на iPhone прямо здесь или добавьте M4A, MP3, WAV из «Файлов». Затем прослушайте и назначьте на конкретный вопрос курса.':'Record on your iPhone or choose an M4A, MP3 or WAV file, listen and assign it to one question.'}</p>
   <div className={styles.folderGrid}>{Object.entries(titles).map(([slug,names])=>
    <Link key={slug} href={'/admin/materials/coaching/'+slug} className={styles.folderLink} data-coaching-folder={slug}>
     <span className={styles.folderIcon}><Headphones aria-hidden="true"/></span>
     <span className={styles.folderName}><strong>{names[lang]}</strong>
      <small>{slug==='egyptian'?'11':'10'} {lang==='ru'?'вопросов · аудио RU / EN / ES':'questions · RU / EN / ES audio'}</small>
     </span><ChevronRight className={styles.arrow} aria-hidden="true"/>
    </Link>)}</div>
  </section>
 </main>
}
