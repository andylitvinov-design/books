import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, Folder, FolderOpen, Headphones } from 'lucide-react'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import styles from '@/components/materials-audio-folders.module.css'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Audio materials · Holistic House',
  robots: { index: false, follow: false, noarchive: true },
}

export default async function AudioMaterialsPage() {
  if (!await requireAdminRequest()) redirect('/admin/login')
  return <main className="prescription-admin-shell" data-master-audio-folder>
    <PrescriptionAdminHeader
      title={{ru:'Материалы / Аудио',en:'Materials / Audio'}}
      description={{ru:'Папки аудиоматериалов по учебным программам.',en:'Audio materials organized by educational program.'}}
    />
    <section className={styles.collection}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/admin/materials">Материалы / Materials</Link><ChevronRight aria-hidden="true" />
        <span>Аудио / Audio</span>
      </nav>
      <h2 className={styles.sectionTitle}><FolderOpen aria-hidden="true"/>Аудио / Audio</h2>
      <p className={styles.description}>Выберите курс / Choose a course.</p>
      <div className={styles.folderGrid}>
        <Link className={styles.folderLink} href="/admin/materials/audio/reiki-practitioner"
          data-reiki-course-folder>
          <span className={styles.folderIcon}><Folder aria-hidden="true"/></span>
          <span className={styles.folderName}>
            <strong>Reiki Practitioner</strong>
            <small>5 уроков · 5 lessons · русский / English</small>
          </span>
          <ChevronRight className={styles.arrow} aria-hidden="true"/>
        </Link>
      </div>
    </section>
  </main>
}
